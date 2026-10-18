import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import { createRng } from '../../core/rng';
import type { Exercise, Stufe } from '../../core/types';
import { folge, knobelFolge, patternTerms, zahlenfolgenSkill } from './zahlenfolgen';

describeSkill(zahlenfolgenSkill, { minDistinct: 20 });

const ctx = { subtractionMethod: 'abziehen', nrwExtras: false } as const;
const sample = (stufe: Stufe): Exercise[] => Array.from({ length: 300 }, (_, i) => zahlenfolgenSkill.generate(createRng(606 + i), stufe, ctx));
const nums = (expr: string) => expr.split(', ').map((t) => (t === '□' ? null : Number(t.replace(/\D/g, ''))));

describe('zahlen.zahlenfolgen', () => {
  it('answers continue the shown sequence (recomputed from the displayed terms)', () => {
    for (const stufe of [1, 2, 3] as Stufe[]) {
      for (const ex of sample(stufe)) {
        const [, , kind, ...p] = ex.key.split(':');
        const shown = nums(ex.expression ?? '');
        if (kind === 'folge') {
          const step = Number(p[1]);
          const known = shown.map((v, i) => [v, i] as const).filter(([v]) => v !== null) as [number, number][];
          // all known terms follow start + i·step
          known.forEach(([v, i]) => expect(v).toBe(known[0][0] + (i - known[0][1]) * step));
          if (ex.answer.kind === 'number') {
            const gap = shown.indexOf(null);
            expect(ex.answer.value).toBe(known[0][0] + (gap - known[0][1]) * step);
          } else if (ex.answer.kind === 'multi') {
            const last = known[known.length - 1][0];
            expect(ex.answer.fields.map((f) => f.value)).toEqual([last + step, last + 2 * step]);
          }
          const all = [...known.map(([v]) => v), ...(ex.answer.kind === 'multi' ? ex.answer.fields.map((f) => f.value) : [])];
          all.forEach((v) => expect(v).toBeLessThanOrEqual(stufe === 1 ? 100_000 : 1_000_000));
          all.forEach((v) => expect(v).toBeGreaterThan(0));
          if (stufe === 1) expect(step).toBeGreaterThan(0);
        } else if (kind === 'regel') {
          if (ex.answer.kind !== 'choice') throw new Error('choice');
          const [a, b] = shown as number[];
          const label = ex.answer.options[ex.answer.correct].label;
          const d = Number(label.replace(/\D/g, '')) * (label.startsWith('−') ? -1 : 1);
          expect(a + d).toBe(b);
        } else {
          expect(kind).toBe('knobel');
          const terms = patternTerms(p[0] as 'wachsend', Number(p[1]), Number(p[2]), Number(p[3]));
          const known = shown.filter((v): v is number => v !== null);
          expect(known).toEqual(terms.slice(0, known.length));
          expect(ex.answer).toMatchObject({ value: terms[known.length] });
        }
      }
    }
  });

  it('known patterns and their bugs', () => {
    expect(patternTerms('verdoppeln', 3_125, 0, 0).slice(0, 5)).toEqual([3_125, 6_250, 12_500, 25_000, 50_000]);
    const v = knobelFolge('verdoppeln', 3_125, 0, 0);
    expect(v.answer).toMatchObject({ value: 50_000 });
    expect(v.bugs?.[0].match).toBe(37_500);
    const w = knobelFolge('wachsend', 10_000, 1_000, 1_000);
    expect(w.expression).toBe('10\u202F000, 11\u202F000, 13\u202F000, 16\u202F000, □');
    expect(w.answer).toMatchObject({ value: 20_000 });
    expect(w.bugs?.[0].match).toBe(19_000);
    const back = folge(450_000, -25_000, 5, 4, 2);
    expect(back.answer).toMatchObject({ value: 350_000 });
    expect(back.bugs?.find((b) => b.id === 'richtung')?.match).toBe(400_000);
  });
});
