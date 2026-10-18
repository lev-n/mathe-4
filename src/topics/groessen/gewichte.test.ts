import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import { gewichteSkill } from './gewichte';
import { checkConversion } from './step-check';
import { num, samples } from './test-utils';

describeSkill(gewichteSkill, { minDistinct: 40 });

describe('groessen.gewichte specifics', () => {
  it('every conversion matches an independent evaluation', () => {
    for (const stufe of [1, 2, 3] as const) {
      expect(samples(gewichteSkill, stufe).map(checkConversion).filter(Boolean)).toEqual([]);
    }
  });

  it('scale items: the answer is what the pointer shows; Stufe 1 scales go to 1 kg', () => {
    for (const stufe of [1, 2] as const) {
      for (const ex of samples(gewichteSkill, stufe)) {
        if (ex.visual?.type !== 'scale') continue;
        const { grams, stepGrams, maxGrams } = ex.visual;
        expect(grams % stepGrams).toBe(0);
        expect(grams).toBeLessThan(maxGrams);
        if (stufe === 1) expect(maxGrams).toBe(1000);
        if (ex.answer.kind === 'number') expect(ex.answer.value).toBe(grams);
        else if (ex.answer.kind === 'multi') expect(ex.answer.fields[0].value * 1000 + ex.answer.fields[1].value).toBe(grams);
      }
    }
  });

  it('no comma with kg before Stufe 3, no tonnes at all', () => {
    for (const stufe of [1, 2] as const) {
      for (const ex of samples(gewichteSkill, stufe)) expect(ex.expression ?? '').not.toMatch(/\d,\d+\u00A0kg/);
    }
    for (const stufe of [1, 2, 3] as const) {
      for (const ex of samples(gewichteSkill, stufe, 100)) expect(JSON.stringify(ex)).not.toMatch(/\d\u00A0t\b/);
    }
  });

  it('recipes: rest = package − times · amount (recomputed from the story)', () => {
    let seen = 0;
    for (const ex of samples(gewichteSkill, 3)) {
      const m = ex.context?.match(/braucht man (\d+)\u00A0g .*?backt (\d+)-mal.*?mit (\d+)\u00A0kg/);
      if (!m) continue;
      seen++;
      expect(ex.answer.kind === 'number' && ex.answer.value).toBe(num(m[3]) * 1000 - num(m[2]) * num(m[1]));
    }
    expect(seen).toBeGreaterThan(20);
  });

  it('fraction bug: ¼ kg = 400 g ("4" read as the amount) is caught', () => {
    const ex = samples(gewichteSkill, 2).find((e) => e.expression?.startsWith('¼'))!;
    expect(ex.answer.kind === 'number' && ex.answer.value).toBe(250);
    expect(ex.bugs!.map((b) => b.match)).toEqual(expect.arrayContaining([25, 400]));
  });
});
