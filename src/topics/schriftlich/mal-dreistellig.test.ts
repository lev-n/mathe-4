import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import { malDreistelligSkill } from './mal-dreistellig';
import { NRW, digits, len, samples, stepTexts } from './test-helpers';

describeSkill(malDreistelligSkill, { minDistinct: 20 });

describe('schriftlich.mal-dreistellig (NRW extra)', () => {
  it('is an optional NRW skill', () => {
    expect(malDreistelligSkill.optional).toBe('nrw');
  });

  it('Stufe 1: three-digit · three-digit without zeros in the second factor', () => {
    for (const ex of samples(malDreistelligSkill, 1, NRW)) {
      if (ex.answer.kind !== 'written') throw new Error('written expected');
      const [a, b] = ex.answer.operands;
      expect(len(a)).toBe(3);
      expect(len(b)).toBe(3);
      expect(digits(b).includes(0)).toBe(false);
      expect(ex.answer.result).toBe(a * b);
      expect(stepTexts(ex).filter((t) => /Teilprodukt:/.test(t))).toHaveLength(3);
    }
  });

  it('Stufe 2: zeros in the second factor, product ≤ 1 000 000', () => {
    for (const ex of samples(malDreistelligSkill, 2, NRW)) {
      if (ex.answer.kind !== 'written') throw new Error('written expected');
      const [a, b] = ex.answer.operands;
      expect(len(b)).toBe(3);
      expect(digits(b).includes(0)).toBe(true);
      expect(a * b).toBeLessThanOrEqual(1_000_000);
      expect(ex.answer.result).toBe(a * b);
    }
  });

  it('Stufe 3: large products or Knobel items with correct answers', () => {
    for (const ex of samples(malDreistelligSkill, 3, NRW)) {
      if (ex.answer.kind === 'written') {
        const [a, b] = ex.answer.operands;
        expect(a * b).toBeGreaterThanOrEqual(400_000);
        expect(a * b).toBeLessThanOrEqual(1_000_000);
      } else if (ex.answer.kind === 'number') {
        const [, a, , m2] = ex.key.match(/nutzen:(\d+)x(\d+)>(\d+)/)!.map(Number);
        expect(ex.answer.value).toBe(a * m2);
      }
    }
  });
});
