import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import { createRng } from '../../core/rng';
import type { Exercise, Stufe } from '../../core/types';
import { buendelnSkill, gemischt, insgesamt, sachBuendeln, umrechnen, zerlegen } from './buendeln';

describeSkill(buendelnSkill, { minDistinct: 20 });

const PV: Record<string, number> = { M: 1e6, HT: 1e5, ZT: 1e4, T: 1e3, H: 100, Z: 10, E: 1 };
const ctx = { subtractionMethod: 'abziehen', nrwExtras: false } as const;
const sample = (stufe: Stufe): Exercise[] => Array.from({ length: 300 }, (_, i) => buendelnSkill.generate(createRng(77 + i), stufe, ctx));
const bug = (ex: Exercise, id: string) => ex.bugs?.find((b) => b.id === id)?.match;

describe('zahlen.buendeln', () => {
  it('answers recomputed from the key', () => {
    for (const stufe of [1, 2, 3] as Stufe[]) {
      for (const ex of sample(stufe)) {
        const [, , kind, ...p] = ex.key.split(':');
        const value = ex.answer.kind === 'number' ? ex.answer.value : null;
        if (kind === 'zerlegen') {
          const k = Number(p[0]);
          if (ex.answer.kind !== 'multi') throw new Error('multi');
          const [g, r] = ex.answer.fields.map((f) => f.value);
          expect(g * 10 + r).toBe(k);
          expect(r).toBeLessThan(10);
        } else if (kind === 'umrechnen') {
          const total = p[1] === 'zahl' ? Number(p[0]) : Number(p[0]) * PV[p[1]];
          expect((value ?? 0) * PV[p[2]]).toBe(total);
        } else if (kind === 'gemischt') {
          const counts = p[0].split('-').map(Number);
          const cols = p[1].match(/HT|ZT|T|H|Z|E/g) ?? [];
          expect(value).toBe(counts.reduce((s, c, i) => s + c * PV[cols[i]], 0));
          expect(counts.some((c) => c >= 10)).toBe(true);
        } else if (kind === 'insgesamt') {
          expect(value).toBe(Math.floor(Number(p[0]) / PV[p[1]]));
        } else if (kind === 'sach') {
          expect(value).toBe(Math.floor(Number(p[0]) / [10, 100, 1000, 100][Number(p[1])]));
        } else {
          expect(kind).toBe('stimmt');
          if (ex.answer.kind !== 'choice') throw new Error('choice');
          const isTrue = Number(p[0]) * PV[p[1]] > Number(p[2]) * PV[p[3]];
          expect(ex.answer.options[ex.answer.correct].label.startsWith(isTrue ? 'Stimmt,' : 'Stimmt nicht')).toBe(true);
        }
      }
    }
  });

  it('Stufe 1 stays within thousands', () => {
    for (const ex of sample(1)) {
      const value = ex.answer.kind === 'number' ? ex.answer.value ?? 0 : 0;
      expect(value).toBeLessThanOrEqual(9000);
    }
  });

  it('bugs on known examples', () => {
    expect(bug(zerlegen(14, 'Z', 'H', 1), 'vertauscht')).toEqual({ gross: 4, klein: 1 });
    const u = umrechnen(3, 'T', 'Z', 1);
    expect(u.answer).toMatchObject({ value: 300 });
    expect(bug(u, 'eine-stelle-zu-viel')).toBe(3000);
    expect(bug(u, 'eine-stelle-zu-wenig')).toBe(30);
    const g = gemischt([2, 13, 5], ['T', 'H', 'Z']);
    expect(g.answer).toMatchObject({ value: 3350 });
    expect(bug(g, 'abgeschrieben')).toBe(21_350);
    const i = insgesamt(345_678, 'H');
    expect(i.answer).toMatchObject({ value: 3456 });
    expect(bug(i, 'nur-ziffer')).toBe(6);
    const s = sachBuendeln(34_567, 1);
    expect(s.answer).toMatchObject({ value: 345 });
    expect(bug(s, 'aufgerundet')).toBe(346);
  });

  it('gemischt stays in the Zahlenraum bis 1 000 000 (also for the reviewer seeds 2014, 2696, 5649)', () => {
    const seeds = [2014, 2696, 5649, ...Array.from({ length: 3000 }, (_, i) => 10_000 + i)];
    for (const seed of seeds) {
      const ex = buendelnSkill.generate(createRng(seed), 2, ctx);
      if (!ex.key.includes(':gemischt:') || ex.answer.kind !== 'number') continue;
      expect(ex.answer.value).toBeLessThanOrEqual(1_000_000);
      expect(Number(ex.key.split(':')[3].split('-')[0])).toBeGreaterThanOrEqual(1);
    }
  });
});

