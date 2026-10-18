import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import { createRng } from '../../core/rng';
import type { Exercise, Stufe } from '../../core/types';
import { binaerSkill, bitsOf, knobel, lesen, legen } from './binaer';
import { formatAnswer } from '../../core/check';

describeSkill(binaerSkill, { minDistinct: { 1: 15, 2: 25, 3: 20 } });

const ctx = { subtractionMethod: 'abziehen', nrwExtras: true } as const;
const sample = (stufe: Stufe): Exercise[] => Array.from({ length: 200 }, (_, i) => binaerSkill.generate(createRng(13 + i), stufe, ctx));

describe('zahlen.binaer (optional NRW)', () => {
  it('is marked as optional NRW extra', () => {
    expect(binaerSkill.optional).toBe('nrw');
  });

  it('bits are the binary digits (checked with toString(2))', () => {
    for (let n = 0; n <= 31; n++) expect(bitsOf(n).join('')).toBe(n.toString(2).padStart(5, '0'));
  });

  it('answers recomputed from the key', () => {
    for (const stufe of [1, 2, 3] as Stufe[]) {
      for (const ex of sample(stufe)) {
        const [, , kind, a, b] = ex.key.split(':');
        const n = Number(a);
        expect(n).toBeGreaterThanOrEqual(0);
        expect(n).toBeLessThanOrEqual(31);
        if (kind === 'lesen') expect(ex.answer).toMatchObject({ value: n });
        else if (kind === 'legen') {
          if (ex.answer.kind !== 'multi') throw new Error('multi');
          expect(parseInt(ex.answer.fields.map((f) => f.value).join(''), 2)).toBe(n);
        } else if (kind === 'anzahl') expect(ex.answer).toMatchObject({ value: n.toString(2).split('').filter((d) => d === '1').length });
        else if (kind === 'dazu') {
          expect(ex.answer).toMatchObject({ value: n + Number(b) });
          expect(n & Number(b)).toBe(0);
        } else expect(ex.answer).toMatchObject({ value: 2 ** n - 1 });
      }
    }
  });

  it('bugs on known examples', () => {
    const ex = lesen(22); // 10110
    const byId = Object.fromEntries((ex.bugs ?? []).map((x) => [x.id, x.match]));
    expect(byId['karten-gezaehlt']).toBe(3);
    expect(byId['umgedreht']).toBe(13); // 01101
    expect(byId['ziffern-gelesen']).toBe(10_110);
    const l = legen(6); // 00110
    expect(l.bugs?.[0].match).toEqual({ k16: 0, k8: 1, k4: 1, k2: 0, k1: 0 });
  });

  it('singular for one card or one point; a card is „aufgedeckt“, not „umgedreht“', () => {
    const one = knobel('anzahl', 16, 0);
    expect(one.steps[one.steps.length - 1]).toBe('Es ist 1 Karte offen.');
    expect(formatAnswer(one.answer)).toBe('Offene Karten: 1');
    const dazu = knobel('dazu', 10, 1);
    expect(dazu.prompt).toBe('Die Karten zeigen 10. Du deckst zusätzlich die Karte 1 auf. Welche Zahl entsteht?');
    expect(dazu.srText).toContain('die Karte mit 1 Punkt auf');
    for (const stufe of [1, 2, 3] as Stufe[]) {
      for (let i = 0; i < 200; i++) {
        const ex = binaerSkill.generate(createRng(40 + i), stufe, { subtractionMethod: 'abziehen', nrwExtras: false });
        const texts = [ex.prompt, ex.srText, ...ex.steps.map(String), ...ex.hints];
        for (const t of texts) expect(t).not.toMatch(/\b1 (Karten|Punkten)\b/);
      }
    }
  });
});

