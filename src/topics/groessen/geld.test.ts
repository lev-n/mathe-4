import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import { checkAnswer } from '../../core/check';
import { createRng } from '../../core/rng';
import { DEFAULT_CONTEXT } from '../../core/generate';
import type { Exercise, Stufe } from '../../core/types';
import { describeMoney, fewestPieces, geldSkill } from './geld';
import { checkConversion } from './step-check';

describeSkill(geldSkill, { minDistinct: 40 });

function samples(stufe: Stufe, n = 300): Exercise[] {
  return Array.from({ length: n }, (_, i) => geldSkill.generate(createRng(i * 31 + 7), stufe, DEFAULT_CONTEXT));
}

describe('groessen.geld specifics', () => {
  it('money visuals: the answer is the sum of the coins and notes (independent recomputation)', () => {
    for (const stufe of [1, 2] as Stufe[]) {
      for (const ex of samples(stufe)) {
        if (ex.visual?.type !== 'money' || ex.answer.kind !== 'number') continue;
        const cents = ex.visual.items.reduce((a, b) => a + b, 0);
        expect(Math.round((ex.answer.value ?? 0) * 100)).toBe(cents);
        if (stufe === 1) expect(cents).toBeLessThanOrEqual(5000 + 4 * 200);
        else expect(cents).toBeLessThanOrEqual(50000);
      }
    }
  });

  it('euro → cent conversions are exact', () => {
    for (const ex of samples(1)) {
      const m = ex.expression?.match(/^(\d+),(\d\d)\u00A0€ = □\u00A0ct$/);
      if (!m || ex.answer.kind !== 'number') continue;
      expect(ex.answer.value).toBe(Number(m[1]) * 100 + Number(m[2]));
      expect(Number(m[1])).toBeLessThanOrEqual(20);
    }
  });

  it('cent → euro conversions use two decimals', () => {
    for (const ex of samples(2)) {
      const m = ex.expression?.match(/^(\d+)\u00A0ct = □\u00A0€$/);
      if (!m || ex.answer.kind !== 'number') continue;
      expect(ex.answer.decimals).toBe(2);
      expect(Math.round((ex.answer.value ?? 0) * 100)).toBe(Number(m[1]));
    }
  });

  it('bug "3 € 5 ct = 3,5 €" is detected', () => {
    const ex = samples(2).find((e) => /^\d+\u00A0€ \d\u00A0ct = □\u00A0€$/.test(e.expression ?? ''));
    expect(ex).toBeDefined();
    const [, e, c] = ex!.expression!.match(/^(\d+)\u00A0€ (\d)\u00A0ct/)!;
    const r = checkAnswer(ex!.answer, { kind: 'number', text: `${e},${c}` }, ex!.bugs);
    expect(r.correct).toBe(false);
    expect(r.bugHint).toMatch(/0/);
  });

  it('bug "4,05 € = 45 ct" (missing zero) is detected', () => {
    const ex = samples(1).find((e) => /^\d+,0[1-9]\u00A0€ = □\u00A0ct$/.test(e.expression ?? ''));
    expect(ex).toBeDefined();
    const [, e, c] = ex!.expression!.match(/^(\d+),0(\d)/)!;
    const r = checkAnswer(ex!.answer, { kind: 'number', text: `${e}${c}` }, ex!.bugs);
    expect(r.bugHint).toMatch(/0 nach dem Komma/);
  });

  it('fewest pieces is greedy-optimal and matches the answer', () => {
    expect(fewestPieces(8765)).toEqual([5000, 2000, 1000, 500, 200, 50, 10, 5]);
    expect(fewestPieces(40)).toEqual([20, 20]);
    for (const ex of samples(3)) {
      const m = ex.prompt.match(/^Lege (\d+),(\d\d)/);
      if (!m || ex.answer.kind !== 'number') continue;
      const cents = Number(m[1]) * 100 + Number(m[2]);
      // independent DP for the minimum number of pieces
      const coins = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000];
      const best = new Array(cents + 1).fill(Infinity);
      best[0] = 0;
      for (let v = 1; v <= cents; v++) for (const c of coins) if (c <= v) best[v] = Math.min(best[v], best[v - c] + 1);
      expect(ex.answer.value).toBe(best[cents]);
      expect(ex.knobel).toBe(true);
    }
  });

  it('every conversion item matches an independent evaluation of the left side', () => {
    for (const stufe of [1, 2, 3] as Stufe[]) {
      const errors = samples(stufe).map(checkConversion).filter(Boolean);
      expect(errors).toEqual([]);
    }
  });

  it('Stufe bounds: Stufe 1 ≤ 50 € counted or ≤ 20 € converted, Stufe 3 up to 1000 €', () => {
    for (const ex of samples(1)) {
      if (ex.answer.kind === 'number' && ex.answer.unit === '€') expect(ex.answer.value!).toBeLessThanOrEqual(58);
      if (ex.answer.kind === 'number' && ex.answer.unit === 'ct') expect(ex.answer.value!).toBeLessThanOrEqual(2000);
    }
    for (const ex of samples(3)) {
      if (ex.answer.kind === 'number' && ex.answer.unit === 'ct') expect(ex.answer.value!).toBeLessThanOrEqual(100000);
    }
  });

  it('describes money for screen readers', () => {
    expect(describeMoney([2000, 100, 100, 50])).toBe('1 Schein zu 20 Euro, 2 Münzen zu 1 Euro, 1 Münze zu 50 Cent');
  });

  it('Stufe 3 "Stimmt das?" has exactly one correct option and explanations for the others', () => {
    for (const ex of samples(3)) {
      if (ex.answer.kind !== 'choice') continue;
      ex.answer.options.forEach((o, i) => {
        if (i === (ex.answer as { correct: number }).correct) expect(o.whyWrong).toBeUndefined();
        else expect(o.whyWrong).toBeTruthy();
      });
    }
  });
});
