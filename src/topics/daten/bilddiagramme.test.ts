import { describe, expect, it } from 'vitest';
import { checkAnswer } from '../../core/check';
import { describeSkill } from '../../core/testing';
import type { Exercise } from '../../core/types';
import { bilddiagrammeSkill, pictureCounts, readSteps, totalSteps } from './bilddiagramme';
import { byMode, keyPart, samples } from './testUtils';

describeSkill(bilddiagrammeSkill, { minDistinct: 40 });

const picto = (e: Exercise) => {
  if (e.visual?.type !== 'pictogram') throw new Error('pictogram expected');
  return e.visual;
};
const numValue = (e: Exercise) => {
  if (e.answer.kind !== 'number') throw new Error('number expected');
  return e.answer.value!;
};
/** Number of pictures in halves (3 ½ pictures → 7). */
const halves = (value: number, iv: number) => (2 * value) / iv;

describe('daten.bilddiagramme – parameter bounds', () => {
  it('icon values are 2, 5 or 10, rows are whole or half pictures, ≤ 6 categories, values ≤ 100', () => {
    for (const stufe of [1, 2, 3] as const) {
      for (const e of samples(bilddiagrammeSkill, stufe)) {
        if (!e.visual) continue;
        const v = picto(e);
        expect([2, 5, 10]).toContain(v.iconValue);
        expect(v.categories.length).toBeLessThanOrEqual(6);
        v.values.forEach((x) => {
          expect(Number.isInteger(halves(x, v.iconValue))).toBe(true);
          expect(x).toBeLessThanOrEqual(100);
          expect(x).toBeGreaterThan(0);
          expect(x / v.iconValue).toBeLessThanOrEqual(10);
        });
        if (stufe === 1) v.values.forEach((x) => expect(x % v.iconValue).toBe(0));
        if (v.iconValue === 5) v.values.forEach((x) => expect(x % 5).toBe(0));
      }
    }
  });
});

describe('daten.bilddiagramme – answers recomputed', () => {
  it('Stufe 1: reading and comparing', () => {
    for (const e of samples(bilddiagrammeSkill, 1)) {
      const v = picto(e);
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

  it('Stufe 2: half pictures, differences, sums and totals', () => {
    const list = samples(bilddiagrammeSkill, 2);
    expect(byMode(list, 'halb').length).toBeGreaterThan(20);
    for (const e of list) {
      const v = picto(e);
      const mode = keyPart(e, 2);
      if (mode === 'halb') {
        const t = Number(keyPart(e, 7));
        expect(v.values[t] % v.iconValue).toBe(v.iconValue / 2);
        expect(numValue(e)).toBe(v.values[t]);
      } else if (mode === 'total') {
        expect(numValue(e)).toBe(v.values.reduce((a, b) => a + b, 0));
      } else {
        const a = v.values[Number(keyPart(e, 7))];
        const b = v.values[Number(keyPart(e, 8))];
        expect(numValue(e)).toBe(mode === 'diff' ? a - b : a + b);
      }
    }
  });

  it('Stufe 3: inferring the legend, redrawing, totals with half pictures', () => {
    const list = samples(bilddiagrammeSkill, 3);
    for (const e of byMode(list, 'legende')) {
      const iv = Number(keyPart(e, 3));
      const k = Number(keyPart(e, 7));
      const m = Number(keyPart(e, 8));
      expect(e.context).toContain(`${k * iv} `);
      expect(numValue(e)).toBe(m * iv);
      // The diagram is shown without its legend (showKey false): k and m pictures, value of one picture hidden.
      expect(e.visual).toMatchObject({ type: 'pictogram', showKey: false, iconValue: iv, values: [k * iv, m * iv] });
    }
    const redraw = byMode(list, 'neu');
    expect(redraw.length).toBeGreaterThan(30);
    for (const e of redraw) {
      const v = picto(e);
      const newIv = Number(keyPart(e, 4));
      const t = Number(keyPart(e, 8));
      expect(v.iconValue).toBe(Number(keyPart(e, 3)));
      expect(numValue(e) * newIv).toBe(v.values[t]);
      expect(Number.isInteger(numValue(e))).toBe(true);
    }
    for (const e of byMode(list, 'gesamt')) {
      const v = picto(e);
      expect(v.values.some((x) => x % v.iconValue !== 0)).toBe(true);
      expect(numValue(e)).toBe(v.values.reduce((a, b) => a + b, 0));
    }
  });
});

describe('daten.bilddiagramme – misconceptions', () => {
  it('counting pictures instead of using the legend', () => {
    const e = samples(bilddiagrammeSkill, 1).find((x) => keyPart(x, 2) === 'lesen')!;
    const v = picto(e);
    const res = checkAnswer(e.answer, { kind: 'number', text: String(numValue(e) / v.iconValue) }, e.bugs);
    expect(res.bugHint).toMatch(/nicht 1/);
  });

  it('half picture counted as a whole picture', () => {
    const e = byMode(samples(bilddiagrammeSkill, 2), 'halb')[0];
    const iv = picto(e).iconValue;
    const res = checkAnswer(e.answer, { kind: 'number', text: String(numValue(e) + iv / 2) }, e.bugs);
    expect(res.bugHint).toMatch(/nur halb/);
  });

  it('redraw: keeping the old number of pictures is recognised', () => {
    const e = byMode(samples(bilddiagrammeSkill, 3), 'neu')[0];
    const v = picto(e);
    const t = Number(keyPart(e, 8));
    const res = checkAnswer(e.answer, { kind: 'number', text: String(v.values[t] / v.iconValue) }, e.bugs);
    if (v.values[t] / v.iconValue !== numValue(e)) expect(res.bugHint).toMatch(/alten Diagramm/);
  });

  it('Stufe 3 total with half pictures: whole and half pictures counted separately, no decimal numbers', () => {
    const list = byMode(samples(bilddiagrammeSkill, 3), 'gesamt');
    expect(list.length).toBeGreaterThan(20);
    let oddHalves = 0;
    for (const e of list) {
      const v = picto(e);
      const iv = v.iconValue;
      const total = numValue(e);
      const { whole, halves } = pictureCounts(v.values, iv);
      if (halves % 2 === 1) oddHalves++;
      const texts = [...e.hints, ...e.steps.map((s) => (typeof s === 'string' ? s : s.text)), ...(e.bugs ?? []).map((b) => b.hint)];
      texts.forEach((t) => expect(t, `${e.key}: ${t}`).not.toMatch(/\d,\d/));
      expect(e.steps).toContain(`${whole * iv} + ${(halves * iv) / 2} = ${total}`);
      // The most likely wrong answers get a hint: half pictures counted as whole ones or forgotten, pictures counted.
      for (const [wrong, re] of [
        [(whole + halves) * iv, /nur die Hälfte/],
        [whole * iv, /halben Bilder nicht/],
        [whole + halves, /Zahl der Bilder/],
      ] as const) {
        const res = checkAnswer(e.answer, { kind: 'number', text: String(wrong) }, e.bugs);
        expect(res.bugHint, `${e.key}: ${wrong}`).toMatch(re);
      }
    }
    expect(oddHalves).toBeGreaterThan(0);
  });

  it('total steps: 17 ganze Bilder and 1 halbes Bild (instead of 17,5 · 2)', () => {
    expect(totalSteps([10, 8, 14, 3], 2)).toEqual([
      'Zähle die ganzen Bilder: 17 Bilder. 17 · 2 = 34',
      'Dazu kommt 1 halbes Bild. Es bedeutet 1.',
      '34 + 1 = 35',
    ]);
    expect(totalSteps([25, 15, 70, 30], 10)).toEqual([
      'Zähle die ganzen Bilder: 13 Bilder. 13 · 10 = 130',
      'Dazu kommen 2 halbe Bilder. Ein halbes Bild bedeutet 5: 2 · 5 = 10',
      '130 + 10 = 140',
    ]);
  });

  it('worked steps for a row with only a half picture: singular, no 0 · 10 step', () => {
    expect(readSteps('Samstag', 5, 10)).toEqual(['In der Zeile „Samstag“ ist nur ein halbes Bild.', 'Ein halbes Bild bedeutet die Hälfte von 10: 10 : 2 = 5']);
    for (const stufe of [1, 2, 3] as const) {
      for (const e of samples(bilddiagrammeSkill, stufe)) {
        e.steps.forEach((s) => expect(typeof s === 'string' ? s : s.text, e.key).not.toMatch(/sind ein halbes Bild|(^|\D)0 · /));
      }
    }
  });

  it('worked steps for a half picture', () => {
    expect(readSteps('Kiwis', 25, 10)).toEqual([
      'In der Zeile „Kiwis“ sind 2 Bilder und ein halbes Bild.',
      '2 · 10 = 20. Das halbe Bild bedeutet 5.',
      '20 + 5 = 25',
    ]);
  });
});
