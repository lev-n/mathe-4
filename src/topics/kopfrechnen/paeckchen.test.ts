import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import { createRng } from '../../core/rng';
import { fmt } from '../../core/format';
import type { Exercise, Stufe } from '../../core/types';
import { evalRow, fortsetzen, gleicherTerm, paeckchenSkill, rowsFor, rule, termErgaenzen, type Pattern } from './paeckchen';

describeSkill(paeckchenSkill, { minDistinct: 20 });

const ctx = { subtractionMethod: 'abziehen', nrwExtras: false } as const;
const sample = (stufe: Stufe): Exercise[] => Array.from({ length: 300 }, (_, i) => paeckchenSkill.generate(createRng(6060 + i), stufe, ctx));
const bug = (ex: Exercise, id: string) => ex.bugs?.find((b) => b.id === id)?.match;
const num = (s: string) => Number(s.replace(/\D/g, ''));
/** Evaluate 'a · b', 'a + b' or 'a − b' independently. */
function evalText(s: string): number {
  const m = s.match(/^([\d\u202F]+) ([+−·]) ([\d\u202F]+)$/);
  if (!m) throw new Error(`cannot parse ${s}`);
  const [a, b] = [num(m[1]), num(m[3])];
  return m[2] === '+' ? a + b : m[2] === '−' ? a - b : a * b;
}

describe('kopfrechnen.paeckchen', () => {
  it('shown Päckchen rows are correct and the answer continues them', () => {
    for (const stufe of [1, 2, 3] as Stufe[]) {
      for (const ex of sample(stufe)) {
        const [, , kind, ...p] = ex.key.split(':');
        if (ex.visual?.type === 'table') {
          for (const row of ex.visual.rows) if (row[1] !== '□') expect(num(row[1])).toBe(evalText(row[0]));
        }
        if (kind === 'gleich') {
          if (ex.answer.kind !== 'choice') throw new Error('choice');
          const target = p[0] === '+' ? Number(p[1]) + Number(p[2]) : Number(p[1]) * Number(p[2]);
          const correct = ex.answer.correct;
          ex.answer.options.forEach((o, i) => expect(evalText(o.label) === target).toBe(i === correct));
        } else if (kind === 'term') {
          const [a, b] = [Number(p[0]), Number(p[1])];
          const na = p[2] === 'halb' ? a / 2 : a * 2;
          expect(na * (ex.answer as { value: number }).value).toBe(a * b);
        } else if (kind === 'erklaeren') {
          expect(ex.answer.kind).toBe('choice');
        } else {
          const rows = rowsFor(kind as Pattern, Number(p[0]), Number(p[1]));
          expect(ex.answer).toMatchObject({ value: evalRow(rows[rows.length - 1]) });
          expect(evalText((ex.expression ?? '').replace(' = □', ''))).toBe(evalRow(rows[rows.length - 1]));
        }
      }
    }
  });

  it('bugs on known examples', () => {
    const m = fortsetzen('mal-null', 7, 8, 1);
    expect(m.answer).toMatchObject({ value: 56_000 });
    expect(bug(m, 'null-zu-wenig')).toBe(5_600);
    expect(bug(m, 'gleicher-schritt')).toBe(10_640);
    const t = termErgaenzen(6, 8, 'halb');
    expect(t.expression).toBe('6 · 8 = 3 · □');
    expect(t.answer).toMatchObject({ value: 16 });
    expect(bug(t, 'gleichsinnig')).toBe(4);
    expect(bug(t, 'plus-ausgleich')).toBe(11);
    const g = gleicherTerm(createRng(2), '*', 6, 8, 0);
    if (g.answer.kind !== 'choice') throw new Error('choice');
    expect(g.answer.options[g.answer.correct].label).toBe('3 · 16');
  });

  it('rule text states how the numbers really change (Päckchen with two changes)', () => {
    const t = fortsetzen('tausend-minus', 1000, 5, 2);
    expect(t.steps[0]).toBe('Die erste Zahl wird immer um 1000 größer, die zweite immer um 5. Das Ergebnis wird also immer um 1000 − 5 = 995 größer.');
    expect(rule('faktor-plus', 25, 4)).toBe('Der zweite Faktor wird immer um 4 größer. Das Ergebnis wird also immer um 25 · 4 = 100 größer.');
    // the stated change of the result matches the rows
    for (const ex of sample(2)) {
      const [, , kind, a, b] = ex.key.split(':');
      if (kind !== 'tausend-minus' && kind !== 'faktor-plus') continue;
      const rows = rowsFor(kind, Number(a), Number(b));
      const step = evalRow(rows[1]) - evalRow(rows[0]);
      expect(String(ex.steps[0]).endsWith(`= ${fmt(step)} größer.`)).toBe(true);
    }
  });

  it('Neuner Päckchen show the strategy · 10 000 − a in the steps', () => {
    const n = fortsetzen('neuner', 2, 9, 2);
    expect(n.answer).toMatchObject({ value: 19_998 });
    expect(n.steps[n.steps.length - 1]).toBe('2 · 9999 = 2 · 10\u202F000 − 2 = 20\u202F000 − 2 = 19\u202F998');
    expect(n.hints[1]).toBe('9999 ist 10\u202F000 − 1. Rechne mit 10\u202F000 und nimm dann einmal 2 weg.');
  });
});

