import { describe, expect, it } from 'vitest';
import { checkAnswer } from '../../core/check';
import { describeSkill } from '../../core/testing';
import type { ChoiceAnswer, Exercise } from '../../core/types';
import { diagrammePruefenSkill } from './diagramme-pruefen';
import { cap, qty, themeById } from './shared';
import { byMode, keyPart, samples } from './testUtils';

describeSkill(diagrammePruefenSkill, { minDistinct: 40 });

const choice = (e: Exercise): ChoiceAnswer => {
  if (e.answer.kind !== 'choice') throw new Error('choice expected');
  return e.answer;
};

function data(e: Exercise): { cats: string[]; values: number[] } {
  const v = e.visual;
  if (v?.type === 'barChart' || v?.type === 'pictogram') return { cats: v.categories, values: v.values };
  throw new Error('chart expected');
}

/** All statements the templates can produce for this data, mapped to whether they are true. */
function truthTable(themeId: string, cats: string[], values: number[]): Map<string, boolean> {
  const t = themeById(themeId);
  const m = new Map<string, boolean>();
  const max = Math.max(...values);
  const min = Math.min(...values);
  cats.forEach((x, i) => {
    m.set(t.mostIs(x), values[i] === max);
    m.set(t.leastIs(x), values[i] === min);
    for (let n = 1; n <= 200; n++) m.set(t.says(x, n), values[i] === n);
    cats.forEach((y, j) => {
      if (i === j) return;
      m.set(t.moreThan(x, y), values[i] > values[j]);
      m.set(t.twice(x, y), values[i] === 2 * values[j]);
      for (let n = 1; n <= 300; n++) m.set(t.sumIs(x, y, n), values[i] + values[j] === n);
      for (let d = 1; d <= 100; d++) m.set(`${cap(t.at(x))} sind es ${qty(d, t)} mehr als ${t.at(y)}.`, values[i] - values[j] === d);
    });
  });
  return m;
}

describe('daten.diagramme-pruefen – statements are evaluated independently', () => {
  it('Stufe 1 and 2: exactly one option is a true statement, and it is marked correct', () => {
    for (const stufe of [1, 2] as const) {
      for (const e of samples(diagrammePruefenSkill, stufe, 200)) {
        const { cats, values } = data(e);
        const themeId = keyPart(e, stufe === 1 ? 5 : 4);
        const truth = truthTable(themeId, cats, values);
        const a = choice(e);
        expect(a.options).toHaveLength(3);
        a.options.forEach((o, i) => {
          expect(truth.has(o.label), `unknown statement: ${o.label}`).toBe(true);
          expect(truth.get(o.label), o.label).toBe(i === a.correct);
        });
      }
    }
  });

  it('Stufe 1 and 2: charts have ≤ 6 categories, values ≤ 100 and an axis from 0', () => {
    for (const stufe of [1, 2] as const) {
      for (const e of samples(diagrammePruefenSkill, stufe)) {
        const { cats, values } = data(e);
        expect(cats.length).toBeLessThanOrEqual(6);
        values.forEach((v) => expect(v).toBeLessThanOrEqual(100));
        if (e.visual?.type === 'barChart') expect(e.visual.axisStart ?? 0).toBe(0);
      }
    }
  });
});

describe('daten.diagramme-pruefen – misleading diagrams (Stufe 3)', () => {
  const list = samples(diagrammePruefenSkill, 3);

  it('truncated axis: bar heights suggest k times as many, but the values do not', () => {
    const claims = byMode(list, 'achse');
    expect(claims.length).toBeGreaterThan(50);
    for (const e of claims) {
      const v = e.visual;
      if (v?.type !== 'barChart') throw new Error('barChart');
      const s = v.axisStart!;
      expect(s).toBeGreaterThan(0);
      expect(v.values.every((x) => x > s && x <= 100)).toBe(true);
      const a = choice(e);
      const nums = a.options[a.correct].label.match(/\d+/g)!.map(Number);
      expect(nums[0]).toBe(s);
      // 'Nein. Die Achse beginnt bei s, nicht bei 0. Es sind va und vb.'
      const [va, vb] = [nums[2], nums[3]];
      const k = (va - s) / (vb - s);
      expect(Number.isInteger(k) && k >= 2).toBe(true);
      expect(va).not.toBe(k * vb);
      expect(v.values).toContain(va);
      expect(v.values).toContain(vb);
      expect(e.knobel).toBe(true);
    }
  });

  it('truncated axis: reading a value; counting from 0 is recognised', () => {
    for (const e of byMode(list, 'achse-wert')) {
      const v = e.visual;
      if (v?.type !== 'barChart' || e.answer.kind !== 'number') throw new Error('shape');
      const idx = v.categories.findIndex((c) => e.prompt.includes(c));
      expect(e.answer.value).toBe(v.values[idx]);
      const res = checkAnswer(e.answer, { kind: 'number', text: String(v.values[idx] - v.axisStart!) }, e.bugs);
      expect(res.bugHint).toMatch(/nicht bei 0/);
    }
  });

  it('different legends: more pictures in 4a, but at least as many children in 4b', () => {
    const items = byMode(list, 'bilder');
    expect(items.length).toBeGreaterThan(50);
    for (const e of items) {
      const v = e.visual;
      if (v?.type !== 'pictogram') throw new Error('pictogram');
      const t = Number(keyPart(e, 6));
      const ivB = Number(keyPart(e, 7));
      const nb = Number(keyPart(e, 8));
      const na = v.values[t] / v.iconValue;
      expect(na).toBeGreaterThan(nb);
      expect(nb * ivB).toBeGreaterThanOrEqual(v.values[t]);
      const a = choice(e);
      const correct = a.options[a.correct].label;
      expect(correct.startsWith('Nein')).toBe(true);
      if (nb * ivB === v.values[t]) expect(correct).toContain('beiden');
      else expect(correct).toContain(String(nb * ivB));
    }
  });
});
