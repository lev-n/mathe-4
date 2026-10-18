import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import { checkAnswer } from '../../core/check';
import { createRng } from '../../core/rng';
import { subtraktionSkill } from './subtraktion';
import { ABZ, ERG, borrows, digits, len, samples, stepTexts } from './test-helpers';

describeSkill(subtraktionSkill, { minDistinct: 20 });

describe('schriftlich.subtraktion: Stufe bounds and correctness', () => {
  for (const ctx of [ABZ, ERG]) {
    const m = ctx.subtractionMethod;

    it(`Stufe 1 (${m}): 3–4 digits, at most one regrouping, method set`, () => {
      for (const ex of samples(subtraktionSkill, 1, ctx)) {
        expect(ex.answer.kind).toBe('written');
        if (ex.answer.kind !== 'written') continue;
        const [a, b] = ex.answer.operands;
        expect(len(a)).toBeGreaterThanOrEqual(3);
        expect(len(a)).toBeLessThanOrEqual(4);
        expect(len(b)).toBeGreaterThanOrEqual(3);
        expect(b).toBeLessThan(a);
        expect(borrows(a, b)).toBeLessThanOrEqual(1);
        expect(ex.answer.result).toBe(a - b);
        expect(ex.answer.method).toBe(m);
      }
    });

    it(`Stufe 2 (${m}): 5–6 digits, 2–5 regroupings, mostly zeros in the Minuend`, () => {
      const exs = samples(subtraktionSkill, 2, ctx);
      let withZero = 0;
      for (const ex of exs) {
        if (ex.answer.kind !== 'written') continue;
        const [a, b] = ex.answer.operands;
        expect(len(a)).toBeGreaterThanOrEqual(5);
        expect(len(a)).toBeLessThanOrEqual(6);
        expect(ex.answer.result).toBe(a - b);
        // abziehen counts one Entbündeln per chain, ergänzen one Erweitern per column
        expect(borrows(a, b)).toBeGreaterThanOrEqual(2);
        if (digits(a).slice(1).includes(0)) withZero++;
        expect(stepTexts(ex)[0]).toMatch(/^Überschlag: /);
      }
      expect(withZero / exs.length).toBeGreaterThan(0.5);
    });

    it(`Stufe 3 (${m}): Minuends with at least two zeros; Knobel answers are correct`, () => {
      for (const ex of samples(subtraktionSkill, 3, ctx)) {
        if (ex.answer.kind === 'written') {
          const [a, b] = ex.answer.operands;
          expect(digits(a).filter((d) => d === 0).length).toBeGreaterThanOrEqual(2);
          expect(borrows(a, b)).toBeGreaterThanOrEqual(3);
          expect(ex.answer.result).toBe(a - b);
        } else if (ex.answer.kind === 'number') {
          const v = ex.answer.value ?? NaN;
          const k1 = ex.key.match(/luecke:(\d+)-\?=(\d+)/);
          const k2 = ex.key.match(/luecke:\?-(\d+)=(\d+)/);
          const k3 = ex.key.match(/max-diff:(\d+)/);
          if (k1) expect(Number(k1[1]) - v).toBe(Number(k1[2]));
          else if (k2) expect(v - Number(k2[1])).toBe(Number(k2[2]));
          else if (k3) {
            const ds = k3[1].split('').map(Number);
            let best = 0;
            const perm = (rest: number[], picked: number[]) => {
              if (picked.length === 6) {
                const x = picked[0] * 100 + picked[1] * 10 + picked[2];
                const y = picked[3] * 100 + picked[4] * 10 + picked[5];
                best = Math.max(best, x - y);
                return;
              }
              rest.forEach((d, i) => perm(rest.filter((_, j) => j !== i), [...picked, d]));
            };
            perm(ds, []);
            expect(v).toBe(best);
          } else throw new Error(`unexpected key ${ex.key}`);
        }
      }
    });
  }

  it('uses the Sprechweise of the chosen method', () => {
    const a = subtraktionSkill.generate(createRng(5), 2, ABZ);
    const e = subtraktionSkill.generate(createRng(5), 2, ERG);
    expect(stepTexts(a).join(' ')).toMatch(/entbündele/);
    expect(stepTexts(e).join(' ')).toMatch(/Von \d+ bis \d+ fehlen \d+, 1 gemerkt\./);
    expect(stepTexts(e).join(' ')).not.toMatch(/entbündele/);
  });

  it('bug hints point to the column: 742 − 358 typed as 416 (smaller from larger)', () => {
    const exs = samples(subtraktionSkill, 1, ABZ, 400).filter((e) => e.answer.kind === 'written');
    const hit = exs.find((e) => e.bugs?.some((b) => b.id === 'sub.smaller-from-larger'));
    expect(hit).toBeDefined();
    if (!hit || hit.answer.kind !== 'written') return;
    const [a, b] = hit.answer.operands;
    let wrong = 0;
    for (let p = 0; p < len(a); p++) wrong += Math.abs((Math.floor(a / 10 ** p) % 10) - (Math.floor(b / 10 ** p) % 10)) * 10 ** p;
    const r = checkAnswer(hit.answer, { kind: 'written', result: String(wrong) }, hit.bugs);
    expect(r.bugHint).toMatch(/^Schau dir die \w+stelle noch einmal an: Oben steht \d, unten \d\./);
  });
});
