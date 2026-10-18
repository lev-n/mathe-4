import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import { createRng } from '../../core/rng';
import type { Exercise, Stufe } from '../../core/types';
import { mitte, nachbarn, nachbarzahlenSkill, vorNach, zwischen } from './nachbarzahlen';

describeSkill(nachbarzahlenSkill, { minDistinct: 20 });

const PV: Record<string, number> = { HT: 1e5, ZT: 1e4, T: 1e3, H: 100, Z: 10 };
const ctx = { subtractionMethod: 'abziehen', nrwExtras: false } as const;
const sample = (stufe: Stufe): Exercise[] => Array.from({ length: 300 }, (_, i) => nachbarzahlenSkill.generate(createRng(31 + i), stufe, ctx));
const bug = (ex: Exercise, id: string) => ex.bugs?.find((b) => b.id === id)?.match;

describe('zahlen.nachbarzahlen', () => {
  it('answers recomputed from the key', () => {
    for (const stufe of [1, 2, 3] as Stufe[]) {
      for (const ex of sample(stufe)) {
        const [, , kind, ...p] = ex.key.split(':');
        const value = ex.answer.kind === 'number' ? ex.answer.value : null;
        const n = Number(p[0]);
        switch (kind) {
          case 'vorgaenger':
            expect(value).toBe(n - 1);
            break;
          case 'nachfolger':
            expect(value).toBe(n + 1);
            break;
          case 'nachbarn': {
            if (ex.answer.kind !== 'multi') throw new Error('multi');
            const [u, o] = ex.answer.fields.map((f) => f.value);
            const step = PV[p[1]];
            expect(u % step).toBe(0);
            expect(o - u).toBe(step);
            expect(u < n && n < o).toBe(true);
            break;
          }
          case 'raetsel':
            expect(value).toBe(p[1] === 'vorgaenger' ? n + 2 : n - 2);
            break;
          case 'mitte':
            expect(value).toBe(Math.floor(n / PV[p[1]]) * PV[p[1]] + PV[p[1]] / 2);
            break;
          case 'zwischen':
            expect(value).toBe(PV[p[1]] - 1);
            break;
          case 'welche': {
            if (ex.answer.kind !== 'choice') throw new Error('choice');
            const step = PV[p[1]];
            for (const [i, o] of ex.answer.options.entries()) {
              const x = Number(o.label.replace(/\D/g, ''));
              const inside = x > n && x < n + step;
              expect(inside).toBe(i === ex.answer.correct);
            }
            break;
          }
          default:
            throw new Error(kind);
        }
      }
    }
  });

  it('Stufe bounds: Stufe 1 ≤ 100 000 with Z/H/T, Stufe 2 six digits with T/ZT/HT', () => {
    for (const ex of sample(1)) {
      expect(Number(ex.key.split(':')[3])).toBeLessThan(100_000);
      if (ex.key.includes(':nachbarn:')) expect(['Z', 'H', 'T']).toContain(ex.key.split(':')[4]);
    }
    for (const ex of sample(2)) {
      expect(String(Number(ex.key.split(':')[3]))).toHaveLength(6);
      if (ex.key.includes(':nachbarn:')) expect(['T', 'ZT', 'HT']).toContain(ex.key.split(':')[4]);
    }
  });

  it('bugs on known examples', () => {
    const v = vorNach(70_000, 'vorgaenger', 1);
    expect(v.answer).toMatchObject({ value: 69_999 });
    expect(bug(v, 'verwechselt')).toBe(70_001);
    expect(bug(v, 'uebergang')).toBe(79_999);
    const nf = vorNach(39_999, 'nachfolger', 1);
    expect(bug(nf, 'uebergang')).toBe(30_000);
    const nb = nachbarn(4_567, 'Z', 1);
    expect(bug(nb, 'vorgaenger-nachfolger')).toEqual({ u: 4_566, o: 4_568 });
    expect(bug(nb, 'stelle-zu-gross')).toEqual({ u: 4_500, o: 4_600 });
    const m = mitte(45_678, 'T');
    expect(m.answer).toMatchObject({ value: 45_500 });
    expect(bug(m, 'halber-abstand')).toBe(500);
    expect(bug(m, 'gerundet')).toBe(46_000);
    const z = zwischen(34_500, 'H');
    expect(z.answer).toMatchObject({ value: 99 });
    expect(bug(z, 'abstand')).toBe(100);
  });

  it('German: dative plural after „zwischen den“, steps say what happens to the digits', () => {
    const m = mitte(571_903, 'H');
    expect(m.prompt).toContain('zwischen den Nachbarhundertern von');
    expect(m.srText).toContain('zwischen den Nachbarhundertern von');
    for (const ex of sample(3)) if (ex.key.includes(':mitte:')) expect(ex.prompt).toMatch(/zwischen den Nachbar\w+ern von/);
    const n = nachbarn(59_387, 'Z', 1);
    expect(n.steps[0]).toBe('Ersetze alle Ziffern rechts von der Z-Stelle durch 0: 59\u202F380.');
  });
});

