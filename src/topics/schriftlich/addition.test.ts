import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import { checkAnswer } from '../../core/check';
import { createRng } from '../../core/rng';
import { additionSkill } from './addition';
import { ABZ, carries, len, samples, stepTexts } from './test-helpers';

describeSkill(additionSkill, { minDistinct: 20 });

const written = (stufe: 1 | 2 | 3) => samples(additionSkill, stufe).filter((e) => e.answer.kind === 'written');

describe('schriftlich.addition: Stufe bounds and correctness', () => {
  it('Stufe 1: two Summanden with 3–4 digits, at most one carry, no new place', () => {
    for (const ex of written(1)) {
      if (ex.answer.kind !== 'written') continue;
      const ops = ex.answer.operands;
      expect(ops).toHaveLength(2);
      ops.forEach((n) => expect(len(n)).toBeGreaterThanOrEqual(3));
      ops.forEach((n) => expect(len(n)).toBeLessThanOrEqual(4));
      expect(carries(ops).filter((c) => c > 0).length).toBeLessThanOrEqual(1);
      expect(ex.answer.result).toBe(ops[0] + ops[1]);
      expect(len(ex.answer.result)).toBe(Math.max(...ops.map(len)));
      expect(ex.ab).toBe(1);
    }
  });

  it('Stufe 2: 2–4 Summanden up to 6 digits, at least two carries, sum ≤ 1 000 000, with Überschlag', () => {
    const exs = written(2);
    expect(exs.length).toBe(250);
    const counts = new Set<number>();
    for (const ex of exs) {
      if (ex.answer.kind !== 'written') continue;
      const ops = ex.answer.operands;
      counts.add(ops.length);
      expect(Math.max(...ops.map(len))).toBeGreaterThanOrEqual(5);
      expect(Math.max(...ops.map(len))).toBeLessThanOrEqual(6);
      expect(carries(ops).filter((c) => c > 0).length).toBeGreaterThanOrEqual(2);
      const sum = ops.reduce((a, b) => a + b, 0);
      expect(ex.answer.result).toBe(sum);
      expect(sum).toBeLessThanOrEqual(1_000_000);
      expect(stepTexts(ex)[0]).toMatch(/^Überschlag: /);
    }
    expect([...counts].sort()).toEqual([2, 3, 4]);
  });

  it('Stufe 3: written items have 3–4 Summanden and a carry of at least 2; Knobel items are correct', () => {
    for (const ex of samples(additionSkill, 3)) {
      if (ex.answer.kind === 'written') {
        const ops = ex.answer.operands;
        expect(ops.length).toBeGreaterThanOrEqual(3);
        expect(Math.max(...carries(ops))).toBeGreaterThanOrEqual(2);
        expect(ops.reduce((a, b) => a + b, 0)).toBeLessThanOrEqual(1_000_000);
      } else if (ex.key.includes(':luecke:')) {
        const [, a, s] = ex.key.match(/luecke:(\d+)\+\?=(\d+)/)!.map(Number);
        expect(ex.answer.kind === 'number' && a + (ex.answer.value ?? 0)).toBe(s);
        expect(ex.knobel).toBe(true);
      } else {
        // largest sum of two 3-digit numbers from six digit cards: brute force
        const ds = ex.key.split(':').pop()!.split('').map(Number);
        let best = 0;
        const perm = (rest: number[], picked: number[]) => {
          if (picked.length === 6) {
            best = Math.max(best, picked[0] * 100 + picked[1] * 10 + picked[2] + picked[3] * 100 + picked[4] * 10 + picked[5]);
            return;
          }
          rest.forEach((d, i) => perm(rest.filter((_, j) => j !== i), [...picked, d]));
        };
        perm(ds, []);
        expect(ex.answer.kind === 'number' && ex.answer.value).toBe(best);
      }
    }
  });

  it('worked steps use the child’s numbers column by column and end with the result', () => {
    const ex = additionSkill.generate(createRng(42), 1, ABZ);
    const texts = stepTexts(ex);
    expect(texts[0]).toMatch(/^Einer: /);
    expect(texts[texts.length - 1]).toMatch(/^Ergebnis: /);
  });

  it('typical wrong answers trigger the targeted hint', () => {
    for (const ex of written(2).slice(0, 50)) {
      if (ex.answer.kind !== 'written') continue;
      for (const bug of ex.bugs ?? []) {
        const r = checkAnswer(ex.answer, { kind: 'written', result: String(bug.match), ueberschlag: String(ex.answer.ueberschlag ?? '') }, ex.bugs);
        expect(r.correct).toBe(false);
        expect(r.bugHint).toBe(bug.hint);
      }
    }
  });
});

