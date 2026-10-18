import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import { hohlmasseSkill } from './hohlmasse';
import { checkConversion, evalSide } from './step-check';
import { samples } from './test-utils';

describeSkill(hohlmasseSkill, { minDistinct: 40 });

describe('groessen.hohlmasse specifics', () => {
  it('every conversion matches an independent evaluation', () => {
    for (const stufe of [1, 2, 3] as const) {
      expect(samples(hohlmasseSkill, stufe).map(checkConversion).filter(Boolean)).toEqual([]);
    }
  });

  it('Messbecher: the answer is the fill level, a whole number of steps', () => {
    for (const stufe of [1, 2] as const) {
      for (const ex of samples(hohlmasseSkill, stufe)) {
        if (ex.visual?.type !== 'container') continue;
        expect(ex.visual.fillMl % ex.visual.stepMl).toBe(0);
        expect(ex.visual.fillMl).toBeLessThan(ex.visual.capacityMl);
        expect(ex.answer.kind === 'number' && ex.answer.value).toBe(ex.visual.fillMl);
      }
    }
  });

  it('glasses: number of full glasses = liters · 1000 : glass size', () => {
    let seen = 0;
    for (const ex of samples(hohlmasseSkill, 2)) {
      const m = ex.context?.match(/hat (\d+)\u00A0l .*?In jedes Glas (?:passt|passen) (.+?)\.$/);
      if (!m) continue;
      seen++;
      const glass = evalSide(m[2])!.value;
      expect(ex.answer.kind === 'number' && ex.answer.value).toBe((Number(m[1]) * 1000) / glass);
    }
    expect(seen).toBeGreaterThan(20);
  });

  it('½ ¼ ¾ l appear on Stufe 2 and l with comma only on Stufe 3', () => {
    expect(samples(hohlmasseSkill, 2).some((e) => /[½¼¾]/.test(e.expression ?? ''))).toBe(true);
    for (const ex of samples(hohlmasseSkill, 2)) expect(ex.expression ?? '').not.toMatch(/\d,\d+\u00A0l\b/);
    expect(samples(hohlmasseSkill, 3).some((e) => /\d,\d+\u00A0l\b/.test(e.expression ?? '') || (e.answer.kind === 'number' && e.answer.unit === 'l'))).toBe(true);
  });
});
