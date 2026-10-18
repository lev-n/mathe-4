import { describe, expect, it } from 'vitest';
import { checkAnswer } from '../../core/check';
import { describeSkill } from '../../core/testing';
import type { Exercise } from '../../core/types';
import { clock, fahrplaeneSkill, hundredMinutes, minutesSpan } from './fahrplaene';
import { byMode, keyPart, samples } from './testUtils';

describeSkill(fahrplaeneSkill, { minDistinct: 40 });

const rows = (e: Exercise) => {
  if (e.visual?.type !== 'table') throw new Error('table expected');
  return e.visual.rows;
};
/** '7:48' → minutes since midnight */
const minutes = (s: string) => {
  const m = s.match(/(\d{1,2}):(\d{2})/);
  if (!m) throw new Error(`no time in ${s}`);
  return Number(m[1]) * 60 + Number(m[2]);
};
/** '1,60 €' → 160 */
const cents = (s: string) => Math.round(Number(s.replace(/[^\d,]/g, '').replace(',', '.')) * 100);
const numValue = (e: Exercise) => {
  if (e.answer.kind !== 'number') throw new Error('number expected');
  return e.answer.value!;
};

describe('daten.fahrplaene – Fahrplan answers recomputed from the table', () => {
  it('travel time: Stufe 1 within one hour, Stufe 2 across the full hour', () => {
    for (const stufe of [1, 2] as const) {
      const list = byMode(samples(fahrplaeneSkill, stufe), 'fahrzeit');
      expect(list.length).toBeGreaterThan(50);
      for (const e of list) {
        const r = rows(e);
        const bus = Number(keyPart(e, 4));
        const from = Number(keyPart(e, 5));
        const to = Number(keyPart(e, 6));
        const t1 = minutes(r[from][bus + 1]);
        const t2 = minutes(r[to][bus + 1]);
        expect(numValue(e)).toBe(t2 - t1);
        expect(Math.floor(t1 / 60) !== Math.floor(t2 / 60)).toBe(stufe === 2);
        expect(r.length).toBeGreaterThanOrEqual(4);
        expect(r.length).toBeLessThanOrEqual(5);
        expect(r[0].length - 1).toBe(3);
      }
    }
  });

  it('latest bus: the last bus that arrives on time', () => {
    for (const e of byMode(samples(fahrplaeneSkill, 2), 'spaetestens')) {
      const r = rows(e);
      const to = Number(keyPart(e, 5));
      const deadline = minutes(e.context!.split('spätestens')[1]);
      const arrivals = r[to].slice(1).map(minutes);
      const expected = arrivals.filter((t) => t <= deadline).length - 1;
      if (e.answer.kind !== 'choice') throw new Error('choice');
      expect(e.answer.correct).toBe(expected);
      expect(expected).toBeGreaterThanOrEqual(0);
      expect(expected).toBeLessThan(2);
    }
  });

  it('next bus beyond the table and waiting time', () => {
    const list = samples(fahrplaeneSkill, 3);
    for (const e of byMode(list, 'naechster')) {
      const r = rows(e);
      const stop = Number(keyPart(e, 4));
      const which = Number(keyPart(e, 5));
      const times = r[stop].slice(1).map(minutes);
      const interval = times[1] - times[0];
      expect(times[2] - times[1]).toBe(interval);
      if (e.answer.kind !== 'choice') throw new Error('choice');
      expect(minutes(e.answer.options[e.answer.correct].label)).toBe(times[2] + (which - 3) * interval);
    }
    for (const e of byMode(list, 'warten')) {
      const r = rows(e);
      const stop = Number(keyPart(e, 4));
      const arrive = minutes(e.context!);
      const next = r[stop].slice(1).map(minutes).find((t) => t > arrive)!;
      expect(numValue(e)).toBe(next - arrive);
    }
  });
});

describe('daten.fahrplaene – Preislisten answers recomputed from the table', () => {
  it('reading and multiplying a price', () => {
    for (const e of byMode(samples(fahrplaeneSkill, 1), 'preis')) {
      const t = Number(keyPart(e, 5));
      const q = Number(keyPart(e, 6));
      expect(Math.round(numValue(e) * 100)).toBe(q * cents(rows(e)[t][1]));
      expect(e.answer.kind === 'number' && e.answer.decimals).toBe(2);
    }
  });

  it('shopping total', () => {
    for (const e of byMode(samples(fahrplaeneSkill, 2), 'einkauf')) {
      const r = rows(e);
      const a = Number(keyPart(e, 5));
      const b = Number(keyPart(e, 6));
      const q = Number(keyPart(e, 7));
      expect(Math.round(numValue(e) * 100)).toBe(q * cents(r[a][1]) + cents(r[b][1]));
    }
  });

  it('Familienkarte saving and maximum number of Kugeln', () => {
    const list = samples(fahrplaeneSkill, 3);
    for (const e of byMode(list, 'familie')) {
      const r = rows(e);
      const [child, adult, family] = r.map((x) => cents(x[1]));
      expect(Math.round(numValue(e) * 100)).toBe(2 * adult + 2 * child - family);
      expect(numValue(e)).toBeGreaterThan(0);
    }
    for (const e of byMode(list, 'eis')) {
      const scoop = cents(rows(e)[0][1]);
      const budget = cents(e.context!.match(/[\d,]+\s€/)![0]);
      expect(numValue(e)).toBe(Math.floor(budget / scoop));
      expect(budget % scoop).not.toBe(0);
    }
  });
});

describe('daten.fahrplaene – worked steps across the full hour', () => {
  it('singular for 1 minute and no empty "bis 11:00 Uhr bis 11:00 Uhr" step', () => {
    expect(minutesSpan(1)).toBe('ist es 1 Minute');
    expect(minutesSpan(12)).toBe('sind es 12 Minuten');
    const items = byMode(samples(fahrplaeneSkill, 2, 600), 'fahrzeit');
    let atFullHour = 0;
    for (const e of items) {
      const steps = e.steps.map((s) => (typeof s === 'string' ? s : s.text));
      for (const s of steps) {
        const m = s.match(/^Von (\S+) Uhr bis (\S+) Uhr/);
        if (m) expect(m[1], `${e.key}: ${s}`).not.toBe(m[2]);
        expect(s, e.key).not.toMatch(/ 0 Minuten| 1 Minuten|\+ 0 =/);
      }
      if (steps.length === 3) atFullHour++;
    }
    expect(atFullHour).toBeGreaterThan(0);
  });
});

describe('daten.fahrplaene – misconceptions', () => {
  it('subtracting times like decimal numbers gives the 100-minute error', () => {
    expect(hundredMinutes(7 * 60 + 50, 8 * 60 + 5)).toBe(55);
    expect(clock(8 * 60 + 5)).toBe('8:05');
  });

  it('a cross-hour travel item recognises the 100-minute error', () => {
    const e = byMode(samples(fahrplaeneSkill, 2), 'fahrzeit')[0];
    const r = rows(e);
    const bus = Number(keyPart(e, 4));
    const t1 = minutes(r[Number(keyPart(e, 5))][bus + 1]);
    const t2 = minutes(r[Number(keyPart(e, 6))][bus + 1]);
    const res = checkAnswer(e.answer, { kind: 'number', text: String(hundredMinutes(t1, t2)) }, e.bugs);
    expect(res.bugHint).toMatch(/60 Minuten/);
  });

  it('shopping: forgetting the quantity is recognised', () => {
    const e = byMode(samples(fahrplaeneSkill, 2), 'einkauf')[0];
    const r = rows(e);
    const wrong = (cents(r[Number(keyPart(e, 5))][1]) + cents(r[Number(keyPart(e, 6))][1])) / 100;
    const res = checkAnswer(e.answer, { kind: 'number', text: String(wrong).replace('.', ',') }, e.bugs);
    expect(res.bugHint).toMatch(/Nimm diesen Preis/);
  });
});
