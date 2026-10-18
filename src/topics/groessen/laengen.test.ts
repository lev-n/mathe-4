import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import { checkAnswer } from '../../core/check';
import { laengenSkill } from './laengen';
import { commaToSmall, mixedToSmall, smallToComma, convDown } from './conversions';
import { checkConversion } from './step-check';
import { samples } from './test-utils';

describeSkill(laengenSkill, { minDistinct: 40 });

describe('groessen.laengen specifics', () => {
  it('every conversion matches an independent evaluation', () => {
    for (const stufe of [1, 2, 3] as const) {
      expect(samples(laengenSkill, stufe).map(checkConversion).filter(Boolean)).toEqual([]);
    }
  });

  it('Stufe bounds: no comma on Stufe 1, comma only with m (≤ 2 places) on Stufe 2, km with 3 places on Stufe 3', () => {
    for (const ex of samples(laengenSkill, 1)) {
      expect(ex.expression ?? '').not.toMatch(/,/);
      if (ex.answer.kind === 'number') expect(ex.answer.decimals ?? 0).toBe(0);
    }
    for (const ex of samples(laengenSkill, 2)) {
      for (const m of (ex.expression ?? '').matchAll(/\d+,(\d+)\u00A0(\w+)/g)) {
        expect(m[2]).toBe('m');
        expect(m[1].length).toBeLessThanOrEqual(2);
      }
    }
    const km3 = samples(laengenSkill, 3).filter((e) => /\d,\d{3}\u00A0km/.test(e.expression ?? '') || (e.answer.kind === 'number' && e.answer.unit === 'km'));
    expect(km3.length).toBeGreaterThan(10);
  });

  it('ruler items: the answer is the length of the bar', () => {
    for (const stufe of [1, 2, 3] as const) {
      for (const ex of samples(laengenSkill, stufe)) {
        if (ex.visual?.type !== 'ruler') continue;
        const { lengthMm, startMm, maxCm } = ex.visual;
        expect(startMm + lengthMm).toBeLessThanOrEqual(maxCm * 10);
        if (stufe === 1) expect(startMm).toBe(0);
        if (ex.answer.kind === 'number') expect(ex.answer.value).toBe(ex.answer.unit === 'cm' ? lengthMm / 10 : lengthMm);
        else if (ex.answer.kind === 'multi') expect(ex.answer.fields[0].value * 10 + ex.answer.fields[1].value).toBe(lengthMm);
      }
    }
  });

  it('typical bugs give the predicted wrong numbers', () => {
    // 1,5 m = 15 cm (comma misplaced)
    const a = commaToSmall('m', 'cm', 1.5, 1);
    expect(a.bugs.find((b) => b.id === 'komma-weg')?.match).toBe(15);
    // 2 km 50 m = 250 m (missing placeholder zero)
    const b = mixedToSmall('km', 'm', 2, 50);
    expect(b.bugs.find((x) => x.id === 'null-fehlt')?.match).toBe(250);
    // 4 m = 40 cm / 4000 cm (wrong conversion factor)
    const c = convDown('m', 'cm', 4);
    expect(c.bugs.map((x) => x.match)).toEqual(expect.arrayContaining([40, 4000]));
    // 205 cm = 2,5 m (zero after the comma forgotten)
    const d = smallToComma('m', 'cm', 205);
    expect(d.bugs.find((x) => x.id === 'null-fehlt')?.match).toBe(2.5);
    const r = checkAnswer(d.answer, { kind: 'number', text: '2,5' }, d.bugs);
    expect(r.correct).toBe(false);
    expect(r.bugHint).toMatch(/0/);
  });
});
