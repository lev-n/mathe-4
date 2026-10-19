import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import { createRng } from '../../core/rng';
import type { Exercise, Stufe } from '../../core/types';
import { geteiltAnalog, gleichesErgebnis, malAnalog, platzhalter, plusMinus, stufenzahlenSkill } from './stufenzahlen';

describeSkill(stufenzahlenSkill, { minDistinct: 20 });

const ctx = { subtractionMethod: 'abziehen', nrwExtras: false } as const;
const sample = (stufe: Stufe): Exercise[] => Array.from({ length: 300 }, (_, i) => stufenzahlenSkill.generate(createRng(808 + i), stufe, ctx));
const bug = (ex: Exercise, id: string) => ex.bugs?.find((b) => b.id === id)?.match;
const num = (s: string) => Number(s.replace(/\D/g, ''));
const zerosOf = (n: number) => (String(n).match(/0+$/)?.[0].length ?? 0);

describe('kopfrechnen.stufenzahlen', () => {
  it('answers recomputed from the key', () => {
    for (const stufe of [1, 2, 3] as Stufe[]) {
      for (const ex of sample(stufe)) {
        const [, , kind, ...p] = ex.key.split(':');
        const v = ex.answer.kind === 'number' ? ex.answer.value : null;
        if (kind === 'mal') expect(v).toBe(Number(p[0]) * Number(p[1]));
        else if (kind === 'geteilt') expect((v ?? 0) * Number(p[1])).toBe(Number(p[0]));
        else if (kind === 'plus') expect(v).toBe(Number(p[0]) + Number(p[1]));
        else if (kind === 'minus') expect(v).toBe(Number(p[0]) - Number(p[1]));
        else if (kind === 'platz') {
          const [x, y] = [Number(p[1]), Number(p[2])];
          expect(v).toBe({ faktor1: x, faktor2: y, divisor: y, dividend: x * y }[p[0]]);
        } else {
          expect(kind).toBe('gleich');
          if (ex.answer.kind !== 'choice') throw new Error('choice');
          const target = Number(p[0]) * Number(p[1]);
          const correct = ex.answer.correct;
          ex.answer.options.forEach((o, i) => {
            const [l, r] = o.label.split('·').map(num);
            expect(l * r === target).toBe(i === correct);
          });
        }
        if (v !== null) expect(v).toBeLessThanOrEqual(1_000_000);
      }
    }
  });

  it('Stufe 1 uses one zero, Stufe 2 up to three zeros', () => {
    for (const ex of sample(1)) {
      const [, , kind, a, b] = ex.key.split(':');
      if (kind === 'mal') expect(zerosOf(Number(a)) + zerosOf(Number(b))).toBe(1);
    }
    for (const ex of sample(2)) {
      const [, , kind, a, b] = ex.key.split(':');
      if (kind === 'mal') expect(zerosOf(Number(a)) + zerosOf(Number(b))).toBeLessThanOrEqual(3);
    }
  });

  it('bugs on known examples', () => {
    const m = malAnalog(5, 1, 8, 1, 2); // 50 · 80
    expect(m.answer).toMatchObject({ value: 4_000 });
    expect(bug(m, 'null-zu-wenig')).toBe(400);
    const g = geteiltAnalog(7, 5, 2, 0, 2); // 3 500 : 7
    expect(g.expression).toBe('3500 : 7 = □');
    expect(g.answer).toMatchObject({ value: 500 });
    expect(bug(g, 'null-zu-viel')).toBe(5_000);
    const minus = plusMinus(7_300, '-', 400, 100, 2);
    expect(minus.answer).toMatchObject({ value: 6_900 });
    expect(bug(minus, 'entbuendeln-vergessen')).toBe(7_900);
    expect(bug(minus, 'uebertrag-vergessen')).toBeUndefined();
    expect(bug(minus, 'kleiner-minus-groesser')).toBe(7_100);
    const plus = plusMinus(45_000, '+', 5_000, 1000, 2);
    expect(bug(plus, 'uebertrag-vergessen')).toBe(40_000);
    const pl = platzhalter('faktor1', 7, 1, 7, 0); // □ · 7 = 490
    expect(pl.answer).toMatchObject({ value: 70 });
    expect(bug(pl, 'null-zu-wenig')).toBe(7);
  });

  it('equal-result choice has exactly one correct option', () => {
    for (let s = 1; s < 50; s++) {
      const ex = gleichesErgebnis(createRng(s), 6, 2, 8, 0);
      if (ex.answer.kind !== 'choice') throw new Error('choice');
      const values = ex.answer.options.map((o) => o.label.split('·').map(num).reduce((x, y) => x * y, 1));
      expect(values.filter((v) => v === 4_800)).toHaveLength(1);
    }
  });

  it('gap hints never state the missing number (not even without zeros)', () => {
    const f2 = platzhalter('faktor2', 7, 3, 2, 0); // 7000 · □ = 14 000
    expect(f2.answer).toMatchObject({ value: 2 });
    expect(f2.hints[0]).toBe('Denke an die Einmaleins-Aufgabe 7 · □ = 14.');
    expect(platzhalter('faktor1', 7, 1, 7, 0).hints[0]).toBe('Denke an die Einmaleins-Aufgabe □ · 7 = 49.');
    for (const ex of Array.from({ length: 400 }, (_, i) => stufenzahlenSkill.generate(createRng(77 + i), 3, ctx))) {
      if (!ex.key.includes(':platz:') || ex.answer.kind !== 'number') continue;
      const form = ex.key.split(':')[3];
      // the Einmaleins fact in the first hint has its gap where the task has its gap (or no result for 'dividend')
      if (form === 'dividend') expect(ex.hints[0]).toMatch(/^Rechne zuerst die Einmaleins-Aufgabe \d · \d\.$/);
      else expect(ex.hints[0]).toMatch(form === 'faktor1' ? /□ · \d = \d+\.$/ : /\d · □ = \d+\.$/);
    }
  });

  it('regroup bug in minus names what was forgotten', () => {
    const minus = plusMinus(1_100, '-', 300, 100, 1);
    expect(minus.bugs?.find((b) => b.id === 'entbuendeln-vergessen')).toMatchObject({ match: 1_800, hint: 'Du hast einen Tausender entbündelt. Dann ist bei den Tausendern einer weniger.' });
  });
});

