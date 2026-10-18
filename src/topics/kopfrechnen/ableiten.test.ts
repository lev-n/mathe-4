import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import { createRng } from '../../core/rng';
import type { Exercise, Stufe } from '../../core/types';
import { ableitenSkill, grossesEinmaleins, nachbaraufgabe, nachbarLuecke, verdoppeln, welcheZerlegung, zerlegen } from './ableiten';

describeSkill(ableitenSkill, { minDistinct: 20 });

const ctx = { subtractionMethod: 'abziehen', nrwExtras: false } as const;
const sample = (stufe: Stufe): Exercise[] => Array.from({ length: 300 }, (_, i) => ableitenSkill.generate(createRng(321 + i), stufe, ctx));
const bug = (ex: Exercise, id: string) => ex.bugs?.find((b) => b.id === id)?.match;
/** Evaluate 'a · b + c · d' style terms (· before + and −). */
function evalTerm(s: string): number {
  // sum of products, e.g. '10 · 7 − 2 · 7'
  return s
    .replace(/−/g, '-')
    .replace(/\s/g, '')
    .split(/(?=[+-])/)
    .reduce((sum, part) => {
      const sign = part.startsWith('-') ? -1 : 1;
      const prod = part.replace(/^[+-]/, '').split('·').map(Number).reduce((x, y) => x * y, 1);
      return sum + sign * prod;
    }, 0);
}

describe('kopfrechnen.ableiten', () => {
  it('evaluates terms', () => {
    expect(evalTerm('10 · 7 − 2 · 7')).toBe(56);
    expect(evalTerm('5 · 8 + 2 · 8')).toBe(56);
  });

  it('answers recomputed from the key', () => {
    for (const stufe of [1, 2, 3] as Stufe[]) {
      for (const ex of sample(stufe)) {
        const [, , kind, ...p] = ex.key.split(':');
        const n = p.map(Number);
        if (kind === 'nachbar') expect(ex.answer).toMatchObject({ value: n[1] * n[2] });
        else if (kind === 'luecke') expect(ex.answer).toMatchObject({ value: n[2] });
        else if (kind === 'doppelt') expect(ex.answer).toMatchObject({ value: 2 * n[0] * n[1] });
        else if (kind === 'zerlegen') {
          if (ex.answer.kind !== 'multi') throw new Error('multi');
          const [m, mb, e] = ex.answer.fields.map((f) => f.value);
          expect(e).toBe(n[0] * n[1]);
          expect(mb).toBe(m * n[1]);
          expect(Math.abs(n[0] - n[2])).toBe(m);
        } else if (kind === 'gross') {
          expect(ex.answer).toMatchObject({ value: n[0] * n[1] });
          expect(n[0]).toBeGreaterThanOrEqual(11);
          expect(n[0]).toBeLessThanOrEqual(19);
        } else {
          expect(kind).toBe('welche');
          if (ex.answer.kind !== 'choice') throw new Error('choice');
          const target = n[0] * n[1];
          const correct = ex.answer.correct;
          ex.answer.options.forEach((o, i) => expect(evalTerm(o.label) === target).toBe(i === correct));
        }
        if (stufe === 1) expect([2, 5, 10]).toContain(n[0]);
      }
    }
  });

  it('bugs on known examples', () => {
    const nb = nachbaraufgabe(5, 6, 7);
    expect(nb.answer).toMatchObject({ value: 42 });
    expect(bug(nb, 'nur-eins')).toBe(36);
    expect(bug(nb, 'falscher-faktor')).toBe(40);
    const d = verdoppeln(3, 8);
    expect(d.answer).toMatchObject({ value: 48 });
    expect(bug(d, 'nachbar')).toBe(32);
    const z = zerlegen(7, 8, 5);
    expect(bug(z, 'nicht-malgenommen')).toEqual({ m: 2, mb: 2, e: 42 });
    const g = grossesEinmaleins(16, 7);
    expect(g.answer).toMatchObject({ value: 112 });
    expect(bug(g, 'einer-vergessen')).toBe(76);
    expect(bug(g, 'zehner-als-eins')).toBe(49);
    const w = welcheZerlegung(createRng(1), 8, 7, 10);
    if (w.answer.kind !== 'choice') throw new Error('choice');
    expect(w.answer.options[w.answer.correct].label).toBe('10 · 7 − 2 · 7');
  });

  it('gap bug hints do not state the number that belongs in the gap', () => {
    const ex = nachbarLuecke(5, 4, 6); // 4 · 6 = 5 · 6 − □
    expect(ex.answer).toMatchObject({ value: 6 });
    for (const b of ex.bugs ?? []) expect(b.hint).not.toMatch(/eine (ganze )?6\b/);
    expect(ex.bugs?.find((b) => b.id === 'falscher-faktor')?.hint).toBe('Es ändert sich die Anzahl der 6er, nicht der Faktor 5. Wie viel fällt dann weg?');
    for (const x of sample(1)) {
      if (!x.key.includes(':luecke:') || x.answer.kind !== 'number') continue;
      for (const b of x.bugs ?? []) expect(b.hint).not.toMatch(new RegExp(`eine (ganze )?${x.answer.value}\\b`));
    }
  });
});

