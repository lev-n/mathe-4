import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import { checkAnswer } from '../../core/check';
import { decimalSpan, spanSteps, zeitspannenSkill } from './zeitspannen';
import { evalSide } from './step-check';
import { samples, times } from './test-utils';

describeSkill(zeitspannenSkill, { minDistinct: 30 });

type Fields = { fields: { id: string; value: number }[] };
const asMinutes = (ex: { answer: unknown }) => {
  const f = (ex.answer as Fields).fields;
  return f[0].value * 60 + f[1].value;
};

describe('groessen.zeitspannen specifics', () => {
  it('durations are end − start (over midnight on Stufe 3), never decimal hours', () => {
    let seen = 0;
    for (const stufe of [2, 3] as const) {
      for (const ex of samples(zeitspannenSkill, stufe)) {
        if (!/:dauer:/.test(ex.key)) continue;
        seen++;
        const [a, b] = times(ex.context!);
        const expected = (b - a + 1440) % 1440;
        expect(asMinutes(ex)).toBe(expected);
        expect((ex.answer as Fields).fields[1].value).toBeLessThan(60);
        if (stufe === 2) expect(expected).toBeGreaterThanOrEqual(60);
      }
    }
    expect(seen).toBeGreaterThan(30);
    for (const stufe of [1, 2, 3] as const) {
      for (const ex of samples(zeitspannenSkill, stufe, 100)) expect(JSON.stringify(ex)).not.toMatch(/\d,\d+\u00A0h/);
    }
  });

  it('end and start times: start + duration = end', () => {
    let seen = 0;
    for (const ex of samples(zeitspannenSkill, 2)) {
      const kind = ex.key.match(/:(ende|anfang):/)?.[1];
      if (!kind) continue;
      seen++;
      const durText = ex.context!.match(/(\d+\u00A0h(?: \d+\u00A0min)?|\d+\u00A0min)/)![1];
      const dur = evalSide(durText)!.value / 60;
      const [given] = times(ex.context!);
      expect(asMinutes(ex)).toBe(kind === 'ende' ? given + dur : given - dur);
    }
    expect(seen).toBeGreaterThan(30);
  });

  it('short spans on Stufe 1 stay within one hour or end at the full hour', () => {
    for (const ex of samples(zeitspannenSkill, 1)) {
      if (!ex.context) continue;
      const [a, b] = times(ex.context);
      expect(ex.answer.kind === 'number' && ex.answer.value).toBe(b - a);
      expect(b - a).toBeLessThanOrEqual(60);
    }
  });

  it('the "100-minute hour" bug: 8:45 → 10:20 read as 1 h 75 min', () => {
    expect(decimalSpan(8 * 60 + 45, 10 * 60 + 20)).toEqual({ h: 1, min: 75 });
    const ex = samples(zeitspannenSkill, 2).find((e) => /:dauer:/.test(e.key) && e.bugs?.some((b) => b.id === 'hundert'))!;
    const bug = ex.bugs!.find((b) => b.id === 'hundert')!;
    const m = bug.match as { h: number; min: number };
    const r = checkAnswer(ex.answer, { kind: 'multi', values: { h: String(m.h), min: String(m.min) } }, ex.bugs);
    expect(r.bugHint).toMatch(/60 Minuten, nicht 100/);
  });

  it('unit conversions: 3 h = 300 min is caught', () => {
    const ex = samples(zeitspannenSkill, 1).find((e) => /^\d\u00A0h = □\u00A0min$/.test(e.expression ?? ''))!;
    const n = Number(ex.expression![0]);
    expect(ex.answer.kind === 'number' && ex.answer.value).toBe(n * 60);
    expect(checkAnswer(ex.answer, { kind: 'number', text: String(n * 100) }, ex.bugs).bugHint).toMatch(/60 Minuten/);
  });

  it('worked steps go via the full hour', () => {
    expect(spanSteps(8 * 60 + 45, 10 * 60 + 20).map(String)).toEqual([
      '8:45\u00A0Uhr → 9:00\u00A0Uhr: 15\u00A0min',
      '9:00\u00A0Uhr → 10:00\u00A0Uhr: 1\u00A0h',
      '10:00\u00A0Uhr → 10:20\u00A0Uhr: 20\u00A0min',
      '15\u00A0min + 1\u00A0h + 20\u00A0min = 1\u00A0h 35\u00A0min',
    ]);
  });
});
