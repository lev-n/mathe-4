import { describe, expect, it } from 'vitest';
import { checkAnswer } from '../../core/check';
import { describeSkill } from '../../core/testing';
import type { Exercise } from '../../core/types';
import { saeulendiagrammeSkill } from './saeulendiagramme';
import { byMode, keyPart, nums, samples } from './testUtils';

describeSkill(saeulendiagrammeSkill, { minDistinct: 40 });

const chart = (e: Exercise) => {
  if (e.visual?.type !== 'barChart') throw new Error('barChart expected');
  return e.visual;
};
const numValue = (e: Exercise) => {
  if (e.answer.kind !== 'number') throw new Error('number expected');
  return e.answer.value!;
};

describe('daten.saeulendiagramme – parameter bounds', () => {
  const per = { 1: samples(saeulendiagrammeSkill, 1), 2: samples(saeulendiagrammeSkill, 2), 3: samples(saeulendiagrammeSkill, 3) };

  it('every chart: ≤ 6 categories, values ≤ 100, axis from 0 with steps 1/2/5/10 and ≤ 12 grid lines', () => {
    for (const list of Object.values(per)) {
      for (const e of list) {
        const v = chart(e);
        expect(v.categories.length).toBeLessThanOrEqual(6);
        expect(v.axisStart ?? 0).toBe(0);
        expect([1, 2, 5, 10]).toContain(v.axisStep);
        expect(v.axisMax / v.axisStep).toBeLessThanOrEqual(12);
        expect(v.axisMax % v.axisStep).toBe(0);
        v.values.forEach((x) => {
          expect(x).toBeGreaterThan(0);
          expect(x).toBeLessThanOrEqual(100);
          expect(x).toBeLessThan(v.axisMax);
        });
      }
    }
  });

  it('Stufe 1: values sit exactly on grid lines (steps 1, 2, 5)', () => {
    for (const e of per[1]) {
      const v = chart(e);
      expect([1, 2, 5]).toContain(v.axisStep);
      v.values.forEach((x) => expect(x % v.axisStep).toBe(0));
    }
  });

  it('Stufe 2: values on a grid line or exactly halfway (steps 2, 5, 10)', () => {
    for (const e of per[2]) {
      const v = chart(e);
      expect([2, 5, 10]).toContain(v.axisStep);
      v.values.forEach((x) => expect((2 * x) % v.axisStep).toBe(0));
    }
  });

  it('Stufe 3: step 10 with values in steps of 5', () => {
    for (const e of per[3]) {
      const v = chart(e);
      expect(v.axisStep).toBe(10);
      v.values.forEach((x) => expect(x % 5).toBe(0));
    }
  });
});

describe('daten.saeulendiagramme – answers recomputed', () => {
  it('Stufe 1: read value / highest / lowest', () => {
    for (const e of samples(saeulendiagrammeSkill, 1)) {
      const v = chart(e);
      const mode = keyPart(e, 2);
      if (mode === 'lesen') {
        const idx = v.categories.findIndex((c) => e.prompt.includes(c));
        expect(numValue(e)).toBe(v.values[idx]);
      } else {
        if (e.answer.kind !== 'choice') throw new Error('choice');
        const target = mode === 'max' ? Math.max(...v.values) : Math.min(...v.values);
        expect(e.answer.options[e.answer.correct].label).toBe(v.categories[v.values.indexOf(target)]);
      }
    }
  });

  it('Stufe 2: difference, sum and total', () => {
    for (const e of samples(saeulendiagrammeSkill, 2)) {
      const v = chart(e);
      const mode = keyPart(e, 2);
      if (mode === 'total') expect(numValue(e)).toBe(v.values.reduce((a, b) => a + b, 0));
      else {
        const a = v.values[Number(keyPart(e, 8))];
        const b = v.values[Number(keyPart(e, 9))];
        expect(e.prompt).toContain(v.categories[Number(keyPart(e, 8))]);
        expect(numValue(e)).toBe(mode === 'diff' ? a - b : a + b);
      }
    }
  });

  it('Stufe 3: missing bar, spread and comparison with two bars together', () => {
    const list = samples(saeulendiagrammeSkill, 3);
    for (const e of byMode(list, 'fehlt')) {
      const all = nums(keyPart(e, 6));
      const t = Number(keyPart(e, 7));
      const total = all.reduce((a, b) => a + b, 0);
      expect(numValue(e)).toBe(total - chart(e).values.reduce((a, b) => a + b, 0));
      expect(numValue(e)).toBe(all[t]);
      expect(e.context).toContain(String(total));
      expect(chart(e).values).toHaveLength(all.length - 1);
    }
    for (const e of byMode(list, 'spanne')) {
      const vals = chart(e).values;
      expect(numValue(e)).toBe(Math.max(...vals) - Math.min(...vals));
    }
    const more = byMode(list, 'mehr2');
    expect(more.length).toBeGreaterThan(30);
    for (const e of more) {
      const s = [...chart(e).values].sort((a, b) => a - b);
      expect(numValue(e)).toBe(s[s.length - 1] - s[0] - s[1]);
      expect(numValue(e)).toBeGreaterThanOrEqual(10);
    }
  });
});

describe('daten.saeulendiagramme – misconceptions', () => {
  it('counting grid lines instead of reading the scale is recognised', () => {
    const e = samples(saeulendiagrammeSkill, 1).find((x) => keyPart(x, 2) === 'lesen' && chart(x).axisStep === 5)!;
    const v = numValue(e);
    const res = checkAnswer(e.answer, { kind: 'number', text: String(v / 5) }, e.bugs);
    expect(res.correct).toBe(false);
    expect(res.bugHint).toMatch(/5er-Schritten/);
  });

  it('spread: using the second smallest bar gives the predicted wrong value', () => {
    const e = byMode(samples(saeulendiagrammeSkill, 3), 'spanne')[0];
    const s = [...chart(e).values].sort((a, b) => a - b);
    const res = checkAnswer(e.answer, { kind: 'number', text: String(s[s.length - 1] - s[1]) }, e.bugs);
    expect(res.bugHint).toMatch(/Prüfe noch einmal/);
  });
});
