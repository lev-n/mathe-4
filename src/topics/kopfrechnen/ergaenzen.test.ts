import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import { createRng } from '../../core/rng';
import type { Exercise, Stufe } from '../../core/types';
import { complementTo10, ergaenzen, ergaenzenSkill, jumps, naechsteStufe } from './ergaenzen';

describeSkill(ergaenzenSkill, { minDistinct: 20 });

const ctx = { subtractionMethod: 'abziehen', nrwExtras: false } as const;
const sample = (stufe: Stufe): Exercise[] => Array.from({ length: 300 }, (_, i) => ergaenzenSkill.generate(createRng(4040 + i), stufe, ctx));
const bug = (ex: Exercise, id: string) => ex.bugs?.find((b) => b.id === id)?.match;
const num = (s: string) => Number(s.replace(/\D/g, ''));

describe('kopfrechnen.ergaenzen', () => {
  it('answers recomputed from the key; targets per Stufe', () => {
    for (const stufe of [1, 2, 3] as Stufe[]) {
      for (const ex of sample(stufe)) {
        const p = ex.key.split(':').slice(2);
        if (/^\d+$/.test(p[0])) {
          const [n, target] = [Number(p[0]), Number(p[1])];
          expect(ex.answer).toMatchObject({ value: target - n });
          expect(n).toBeLessThan(target);
          if (stufe === 1) expect([1000, 10_000]).toContain(target);
          if (stufe === 2) expect([100_000, 1_000_000]).toContain(target);
        } else if (p[0] === 'paar') {
          if (ex.answer.kind !== 'choice') throw new Error('choice');
          const target = Number(p[2]);
          const correct = ex.answer.correct;
          ex.answer.options.forEach((o, i) => {
            const [a, b] = o.label.split(' und ').map(num);
            expect(a + b === target).toBe(i === correct);
          });
        } else {
          expect(p[0]).toBe('naechste');
          const [n, step] = [Number(p[1]), Number(p[2])];
          const v = (ex.answer as { value: number }).value;
          expect((n + v) % step).toBe(0);
          expect(v).toBeGreaterThan(0);
          expect(v).toBeLessThanOrEqual(step);
        }
      }
    }
  });

  it('jumps go via the next Stufenzahlen', () => {
    expect(jumps(370, 1000)).toEqual([[370, 400], [400, 1000]]);
    expect(jumps(67_380, 100_000)).toEqual([[67_380, 67_400], [67_400, 68_000], [68_000, 70_000], [70_000, 100_000]]);
    // a round intermediate number jumps on from its own zeros (no detours like 100 000 → 100 100)
    expect(jumps(99_999, 1_000_000)).toEqual([[99_999, 100_000], [100_000, 1_000_000]]);
    expect(jumps(199_400, 1_000_000)).toEqual([[199_400, 200_000], [200_000, 1_000_000]]);
    expect(jumps(389_995, 400_000)).toEqual([[389_995, 390_000], [390_000, 400_000]]);
  });

  it('every jump lands on a rounder number than the one before (worked steps model the strategy)', () => {
    const zeros = (x: number) => String(x).match(/0+$/)?.[0].length ?? 0;
    for (const stufe of [1, 2, 3] as Stufe[]) {
      for (const ex of sample(stufe)) {
        const p = ex.key.split(':').slice(2);
        const [n, target] = /^\d+$/.test(p[0]) ? [Number(p[0]), Number(p[1])] : p[0] === 'naechste' ? [Number(p[1]), (Math.floor(Number(p[1]) / Number(p[2])) + 1) * Number(p[2])] : [0, 0];
        if (!target) continue;
        const js = jumps(n, target);
        expect(js[0][0]).toBe(n);
        expect(js[js.length - 1][1]).toBe(target);
        for (let i = 1; i < js.length; i++) {
          expect(js[i][0]).toBe(js[i - 1][1]);
          if (js[i][1] !== target) expect(zeros(js[i][1])).toBeGreaterThan(zeros(js[i][0]));
        }
      }
    }
  });

  it('digit-rule bug hints name the last digit that is not 0', () => {
    const ex = ergaenzen(1100, 10_000, 1);
    expect(ex.answer).toMatchObject({ value: 8900 });
    const hint = (id: string) => ex.bugs?.find((b) => b.id === id)?.hint ?? '';
    expect(bug(ex, 'jede-ziffer-zu-10')).toBe(9900);
    expect(hint('jede-ziffer-zu-10')).toContain('die 1 an der Hunderterstelle ergänzt du zu 10');
    expect(hint('jede-ziffer-zu-10')).toContain('Die Nullen am Ende bleiben 0.');
    expect(bug(ex, 'eins-zu-wenig')).toBe(8899);
    expect(hint('eins-zu-wenig')).toBe('Fast! Prüfe die Hunderterstelle: Die 1 ergänzt du zu 10, nicht zu 9. Die Nullen am Ende bleiben 0.');
    const z = ergaenzen(370, 1000, 1).bugs?.find((b) => b.id === 'eins-zu-wenig')?.hint;
    expect(z).toBe('Fast! Prüfe die Zehnerstelle: Die 7 ergänzt du zu 10, nicht zu 9. Die Null am Ende bleibt 0.');
    const e = ergaenzen(99_999, 1_000_000, 3).bugs?.find((b) => b.id === 'jede-ziffer-zu-10')?.hint;
    expect(e).toBe('Du hast jede Ziffer zu 10 ergänzt. Nur die 9 an der Einerstelle ergänzt du zu 10, die Ziffern davor zu 9.');
    // the named digit is the last digit of the start number that is not 0, and it adds up to 10 with the answer's digit
    for (const stufe of [1, 2, 3] as Stufe[]) {
      for (const x of sample(stufe)) {
        const h = x.bugs?.find((b) => b.id === 'eins-zu-wenig')?.hint;
        if (!h || x.answer.kind !== 'number') continue;
        const p = x.key.split(':').slice(2);
        const start = p[0] === 'naechste' ? Number(p[1]) % Number(p[2]) : Number(p[0]);
        const zeros = String(start).match(/0+$/)?.[0].length ?? 0;
        const d = Math.floor(start / 10 ** zeros) % 10;
        expect(h).toContain(`Die ${d} ergänzt du zu 10`);
        expect(d + (Math.floor((x.answer.value ?? 0) / 10 ** zeros) % 10)).toBe(10);
      }
    }
  });

  it('bugs on known examples', () => {
    expect(complementTo10(370, 1000)).toBe(730);
    expect(complementTo10(3_400, 10_000)).toBe(7_600);
    const ex = ergaenzen(370, 1000, 1);
    expect(ex.answer).toMatchObject({ value: 630 });
    expect(bug(ex, 'jede-ziffer-zu-10')).toBe(730);
    expect(bug(ex, 'eins-zu-wenig')).toBe(629);
    const nines = ergaenzen(99_999, 1_000_000, 3);
    expect(nines.answer).toMatchObject({ value: 900_001 });
    expect(bug(nines, 'eins-zu-wenig')).toBe(900_000);
    const nx = naechsteStufe(345_678, 10_000);
    expect(nx.answer).toMatchObject({ value: 4_322 });
    expect(bug(nx, 'jede-ziffer-zu-10')).toBe(5_432);
  });
});
