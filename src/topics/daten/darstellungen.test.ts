import { describe, expect, it } from 'vitest';
import { checkAnswer } from '../../core/check';
import { describeSkill } from '../../core/testing';
import type { ChoiceAnswer, Exercise, Visual } from '../../core/types';
import { darstellungenSkill } from './darstellungen';
import { byMode, samples } from './testUtils';

describeSkill(darstellungenSkill, { minDistinct: 40 });

const choice = (e: Exercise): ChoiceAnswer => {
  if (e.answer.kind !== 'choice') throw new Error('choice expected');
  return e.answer;
};
const parseDe = (s: string) => Number(s.replace(',', '.'));

/** The numbers a visual shows, independent of the generator. */
function dataOf(v: Visual | undefined): number[] {
  if (!v) throw new Error('visual expected');
  switch (v.type) {
    case 'tally':
      return v.rows.map((r) => r.count);
    case 'table':
      return v.rows.map((r) => parseDe(r[1]));
    case 'barChart':
    case 'pictogram':
      return v.values;
    default:
      throw new Error(`unexpected visual ${v.type}`);
  }
}

describe('daten.darstellungen – the correct representation shows the same data', () => {
  it('Stufe 1: Strichliste → Tabelle (multi) and Tabelle → Strichliste (choice)', () => {
    const list = samples(darstellungenSkill, 1);
    const multi = byMode(list, 'tabelle');
    expect(multi.length).toBeGreaterThan(50);
    for (const e of multi) {
      if (e.answer.kind !== 'multi') throw new Error('multi');
      expect(e.answer.fields.map((f) => f.value)).toEqual(dataOf(e.visual));
    }
    for (const e of byMode(list, 'strichliste')) {
      const a = choice(e);
      expect(a.options.length).toBeGreaterThanOrEqual(3);
      expect(dataOf(a.options[a.correct].visual)).toEqual(dataOf(e.visual));
      a.options.forEach((o, i) => {
        if (i !== a.correct) expect(dataOf(o.visual)).not.toEqual(dataOf(e.visual));
      });
    }
  });

  it('Stufe 2: Strichliste → Säulendiagramm with a shared axis; Tabelle → Bilddiagramm', () => {
    const list = samples(darstellungenSkill, 2);
    for (const e of byMode(list, 'saeulen')) {
      const a = choice(e);
      expect(dataOf(a.options[a.correct].visual)).toEqual(dataOf(e.visual));
      const axes = new Set(a.options.map((o) => (o.visual?.type === 'barChart' ? o.visual.axisMax : -1)));
      expect(axes.size).toBe(1);
      a.options.forEach((o, i) => {
        if (i !== a.correct) expect(dataOf(o.visual)).not.toEqual(dataOf(e.visual));
      });
    }
    for (const e of byMode(list, 'bild')) {
      const a = choice(e);
      const correct = a.options[a.correct].visual;
      expect(dataOf(correct)).toEqual(dataOf(e.visual));
      if (correct?.type !== 'pictogram') throw new Error('pictogram');
      expect([2, 10]).toContain(correct.iconValue);
      a.options.forEach((o, i) => {
        if (i === a.correct || o.visual?.type !== 'pictogram') return;
        expect(dataOf(o.visual)).not.toEqual(dataOf(e.visual));
        o.visual.values.forEach((v) => expect(Number.isInteger((2 * v) / (o.visual as { iconValue: number }).iconValue)).toBe(true));
      });
    }
  });

  it('Stufe 3: bars → pictures, pictures → table, axis check', () => {
    const list = samples(darstellungenSkill, 3);
    for (const e of byMode(list, 'saeule-bild')) {
      const a = choice(e);
      expect(dataOf(a.options[a.correct].visual)).toEqual(dataOf(e.visual));
      expect(dataOf(e.visual).some((v) => v % 10 === 5)).toBe(true);
    }
    for (const e of byMode(list, 'bild-tabelle')) {
      const a = choice(e);
      expect(dataOf(a.options[a.correct].visual)).toEqual(dataOf(e.visual));
    }
    const axis = byMode(list, 'achse');
    expect(axis.length).toBeGreaterThan(20);
    for (const e of axis) {
      const a = choice(e);
      const correct = a.options[a.correct].visual;
      if (correct?.type !== 'barChart') throw new Error('barChart');
      expect(correct.values).toEqual(dataOf(e.visual));
      expect(correct.axisStep).toBe(5);
      // The scale trap: a chart with identical bar lengths but doubled numbers.
      const trap = a.options.map((o) => o.visual).find((v) => v?.type === 'barChart' && v.axisStep === 10);
      if (trap?.type !== 'barChart') throw new Error('trap expected');
      trap.values.forEach((v, i) => expect(v / trap.axisMax).toBeCloseTo(correct.values[i] / correct.axisMax));
    }
  });
});

describe('daten.darstellungen – misconceptions', () => {
  it('Strichliste → Tabelle: a bundle counted as 4 is named for the row', () => {
    const e = byMode(samples(darstellungenSkill, 1), 'tabelle').find((x) => dataOf(x.visual).some((v) => v >= 5))!;
    if (e.answer.kind !== 'multi') throw new Error('multi');
    const values = Object.fromEntries(e.answer.fields.map((f) => [f.id, String(f.value)]));
    const idx = e.answer.fields.findIndex((f) => f.value >= 5);
    const f = e.answer.fields[idx];
    values[f.id] = String(f.value - Math.floor(f.value / 5));
    const res = checkAnswer(e.answer, { kind: 'multi', values }, e.bugs);
    expect(res.correct).toBe(false);
    expect(res.bugHint).toContain('4 senkrechte');
    expect(res.fieldCorrect?.[f.id]).toBe(false);
  });

  it('every wrong picture option explains its error', () => {
    for (const stufe of [1, 2, 3] as const) {
      for (const e of samples(darstellungenSkill, stufe, 100)) {
        if (e.answer.kind !== 'choice') continue;
        e.answer.options.forEach((o, i) => {
          if (i !== (e.answer as ChoiceAnswer).correct) expect(o.whyWrong).toBeTruthy();
        });
      }
    }
  });
});
