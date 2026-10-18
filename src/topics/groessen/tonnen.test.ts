import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import { tonnenSkill } from './tonnen';
import { checkConversion } from './step-check';
import { samples } from './test-utils';

describeSkill(tonnenSkill, { minDistinct: { 1: 25, 2: 30, 3: 30 } });

describe('groessen.tonnen specifics (NRW option)', () => {
  it('is an optional NRW extra', () => {
    expect(tonnenSkill.optional).toBe('nrw');
  });

  it('every conversion matches an independent evaluation', () => {
    for (const stufe of [1, 2, 3] as const) {
      expect(samples(tonnenSkill, stufe).map(checkConversion).filter(Boolean)).toEqual([]);
    }
  });

  it('truck: rest = limit · 1000 − boxes · weight', () => {
    let seen = 0;
    for (const ex of samples(tonnenSkill, 3)) {
      const m = ex.context?.match(/darf (\d+)\u00A0t laden\. Er hat schon (\d+) Kisten mit je (\d+)\u00A0kg/);
      if (!m) continue;
      seen++;
      expect(ex.answer.kind === 'number' && ex.answer.value).toBe(Number(m[1]) * 1000 - Number(m[2]) * Number(m[3]));
      expect(ex.answer.kind === 'number' && ex.answer.value).toBeGreaterThan(0);
    }
    expect(seen).toBeGreaterThan(20);
  });
});
