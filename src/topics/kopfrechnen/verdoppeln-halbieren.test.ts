import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import { createRng } from '../../core/rng';
import type { Exercise, Stufe } from '../../core/types';
import { doubleNoCarry, geschickt, halbieren, halfSteps, halveNoCarry, rueckwaerts, verdoppeln, verdoppelnHalbierenSkill } from './verdoppeln-halbieren';

describeSkill(verdoppelnHalbierenSkill, { minDistinct: 20 });

const ctx = { subtractionMethod: 'abziehen', nrwExtras: false } as const;
const sample = (stufe: Stufe): Exercise[] => Array.from({ length: 300 }, (_, i) => verdoppelnHalbierenSkill.generate(createRng(707 + i), stufe, ctx));
const bug = (ex: Exercise, id: string) => ex.bugs?.find((b) => b.id === id)?.match;

describe('kopfrechnen.verdoppeln-halbieren', () => {
  it('answers recomputed from the key and Stufe bounds', () => {
    for (const stufe of [1, 2, 3] as Stufe[]) {
      for (const ex of sample(stufe)) {
        const [, , kind, ...p] = ex.key.split(':');
        const v = ex.answer.kind === 'number' ? ex.answer.value : null;
        const n = Number(p[p.length - 1]);
        if (kind === 'doppelt') expect(v).toBe(n + n);
        else if (kind === 'haelfte') expect((v ?? 0) + (v ?? 0)).toBe(n);
        else if (kind === 'rueck') expect(p[0] === 'verdoppelt' ? (v ?? 0) * 2 : (v ?? 0) / 2).toBe(n);
        else if (kind === 'zweimal') {
          if (ex.answer.kind !== 'multi') throw new Error('multi');
          expect(ex.answer.fields[1].value * 4).toBe(n);
        } else {
          expect(kind).toBe('geschickt');
          expect(v).toBe(Number(p[0]) * Number(p[1]));
        }
        const limit = stufe === 1 ? 1000 : stufe === 2 ? 100_000 : 1_000_000;
        if (kind === 'doppelt' || kind === 'haelfte') {
          expect(Math.max(n, v ?? 0)).toBeLessThanOrEqual(limit);
        }
      }
    }
  });

  it('bugs on known examples', () => {
    expect(doubleNoCarry(4_750)).toBe(8_400);
    expect(halveNoCarry(37_800)).toBe(13_400);
    const d = verdoppeln(4_750, 2);
    expect(d.answer).toMatchObject({ value: 9_500 });
    expect(bug(d, 'uebertrag-vergessen')).toBe(8_400);
    const h = halbieren(37_800, 2);
    expect(h.answer).toMatchObject({ value: 18_900 });
    expect(bug(h, 'rest-vergessen')).toBe(13_400);
    expect(bug(h, 'verdoppelt')).toBe(75_600);
    const r = rueckwaerts(74_000, 'verdoppelt');
    expect(r.answer).toMatchObject({ value: 37_000 });
    expect(bug(r, 'vorwaerts')).toBe(148_000);
    const g = geschickt(25, 16);
    expect(g.answer).toMatchObject({ value: 400 });
    expect(g.steps[0]).toBe('25 · 16 = 50 · 8 = 100 · 4');
  });

  it('halving steps show a strategy even for a single place-value part', () => {
    expect(halbieren(90, 1).steps).toEqual(['Zerlege: 90 = 80 + 10', 'Halbiere jeden Teil: 40 + 5', 'Zusammen: 45']);
    expect(halfSteps(700)).toEqual(['Zerlege: 700 = 600 + 100', 'Halbiere jeden Teil: 300 + 50', 'Zusammen: 350']);
    expect(halfSteps(1000)).toEqual(['1000 sind 10 Hunderter.', 'Die Hälfte davon sind 5 Hunderter.', 'Die Hälfte von 1000 ist 500.']);
    expect(halfSteps(800)[1]).toBe('Die Hälfte davon sind 4 Hunderter.');
    // no step of the form 'Zerlege: n = n'
    for (const stufe of [1, 2] as Stufe[]) {
      for (let i = 0; i < 400; i++) {
        const ex = verdoppelnHalbierenSkill.generate(createRng(5000 + i), stufe, { subtractionMethod: 'abziehen', nrwExtras: false });
        const first = String(ex.steps[0]);
        const m = /^Zerlege: (.+) = (.+)$/.exec(first);
        if (m) expect(m[2]).not.toBe(m[1]);
      }
    }
  });
});

