import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import { checkAnswer } from '../../core/check';
import { multiplikationSkill } from './multiplikation';
import { ABZ, NRW, digits, len, samples, stepTexts } from './test-helpers';

describeSkill(multiplikationSkill, { minDistinct: 20 });

describe('schriftlich.multiplikation: Stufe bounds and correctness', () => {
  it('Stufe 1: 2–4 digits times one digit (3–9), at least one carry', () => {
    for (const ex of samples(multiplikationSkill, 1)) {
      if (ex.answer.kind !== 'written') throw new Error('written expected');
      const [a, b] = ex.answer.operands;
      expect(len(a)).toBeGreaterThanOrEqual(2);
      expect(len(a)).toBeLessThanOrEqual(4);
      expect(b).toBeGreaterThanOrEqual(3);
      expect(b).toBeLessThanOrEqual(9);
      expect(ex.answer.result).toBe(a * b);
      expect(digits(a).some((d) => d * b >= 10)).toBe(true);
    }
  });

  it('Stufe 2: times a two-digit number, product ≤ 1 000 000, partial products in the steps', () => {
    let round = 0;
    for (const ex of samples(multiplikationSkill, 2)) {
      if (ex.answer.kind !== 'written') throw new Error('written expected');
      const [a, b] = ex.answer.operands;
      expect(len(b)).toBe(2);
      expect(ex.answer.result).toBe(a * b);
      expect(a * b).toBeLessThanOrEqual(1_000_000);
      if (b % 10 === 0) round++;
      const texts = stepTexts(ex);
      expect(texts[0]).toMatch(/^Überschlag: /);
      expect(texts.some((t) => t.startsWith('Erstes Teilprodukt'))).toBe(true);
    }
    expect(round).toBeGreaterThan(0); // factors with zeros (· 40)
  });

  it('Stufe 3: zeros in the factors; × 3-digit only with NRW extras; Knobel answers are correct', () => {
    for (const [ctx, allowThree] of [[ABZ, false], [NRW, true]] as const) {
      let three = 0;
      for (const ex of samples(multiplikationSkill, 3, ctx)) {
        if (ex.answer.kind === 'written') {
          const [a, b] = ex.answer.operands;
          if (len(b) === 3) three++;
          else expect(digits(a).includes(0)).toBe(true);
          expect(ex.answer.result).toBe(a * b);
          expect(a * b).toBeLessThanOrEqual(1_000_000);
        } else if (ex.answer.kind === 'number') {
          const [, a, , m2] = ex.key.match(/nutzen:(\d+)x(\d+)>(\d+)/)!.map(Number);
          expect(ex.answer.value).toBe(a * m2);
          expect(ex.knobel).toBe(true);
        }
      }
      if (allowThree) expect(three).toBeGreaterThan(0);
      else expect(three).toBe(0);
    }
  });

  it('bug: unshifted partial products (1254 · 37 → 12 540)', () => {
    const ex = samples(multiplikationSkill, 2).find((e) => e.answer.kind === 'written' && e.bugs?.some((b) => b.id === 'mul.unshifted'));
    if (!ex || ex.answer.kind !== 'written') throw new Error('no item with mul.unshifted');
    const [a, b] = ex.answer.operands;
    const wrong = digits(b).reduce((s, d) => s + a * d, 0);
    const r = checkAnswer(ex.answer, { kind: 'written', result: String(wrong), ueberschlag: String(ex.answer.ueberschlag ?? '') }, ex.bugs);
    expect(r.bugHint).toContain('Teilprodukte');
  });
});
