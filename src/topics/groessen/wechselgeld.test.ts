import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import { checkAnswer } from '../../core/check';
import { fmtMoney } from '../../core/format';
import { changeBugs, changeSteps, wechselgeldSkill } from './wechselgeld';
import { cents, samples } from './test-utils';

describeSkill(wechselgeldSkill, { minDistinct: 30 });

function prices(context: string): number[] {
  return [...context.matchAll(/für (\d+,\d\d)\u00A0€/g)].map((m) => cents(m[1]));
}
function note(context: string): number {
  return Number(context.match(/mit einem (\d+)-€-Schein/)![1]) * 100;
}

describe('groessen.wechselgeld specifics', () => {
  it('Stufe 1: prices in 10-ct steps, notes 5/10/20 €, change recomputed', () => {
    for (const ex of samples(wechselgeldSkill, 1)) {
      const ps = prices(ex.context!);
      const n = note(ex.context!);
      expect(ps).toHaveLength(1);
      expect(ps[0] % 10).toBe(0);
      expect([500, 1000, 2000]).toContain(n);
      expect(Math.round((ex.answer as { value: number }).value * 100)).toBe(n - ps[0]);
    }
  });

  it('Stufe 2: one or two items, notes 20/50/100 €, change recomputed', () => {
    for (const ex of samples(wechselgeldSkill, 2)) {
      if (!ex.context!.includes('-€-Schein')) continue;
      const ps = prices(ex.context!);
      const n = note(ex.context!);
      expect([2000, 5000, 10000]).toContain(n);
      const sum = ps.reduce((a, b) => a + b, 0);
      expect(sum).toBeLessThan(n);
      expect(Math.round((ex.answer as { value: number }).value * 100)).toBe(n - sum);
    }
  });

  it('Stufe 3: Einkaufszettel change equals note minus the sum of the table', () => {
    let seen = 0;
    for (const ex of samples(wechselgeldSkill, 3)) {
      if (ex.visual?.type !== 'table') continue;
      seen++;
      const sum = ex.visual.rows.reduce((a, r) => a + cents(r[1]), 0);
      expect(Math.round((ex.answer as { value: number }).value * 100)).toBe(note(ex.context!) - sum);
    }
    expect(seen).toBeGreaterThan(20);
  });

  it('bug values on a known example: 5 € for 3,70 €', () => {
    const bugs = changeBugs(370, 500).filter(Boolean) as { id: string; match: number }[];
    expect(bugs.find((b) => b.id === 'euro-nicht-entbuendelt')?.match).toBe(2.3); // 5 − 3 = 2 € and 30 ct
    expect(bugs.find((b) => b.id === 'addiert')?.match).toBe(8.7);
    const digit = changeBugs(1345, 2000).filter(Boolean) as { id: string; match: number }[];
    expect(digit.find((b) => b.id === 'ziffern-zu-10')?.match).toBe(6.65); // 100 − 45 computed digit-wise as 65
  });

  it('worked steps: ergänzen in hops', () => {
    expect(changeSteps(1345, 2000).map(String)).toEqual([
      `${fmtMoney(1345)} + ${fmtMoney(5)} = ${fmtMoney(1350)}`,
      `${fmtMoney(1350)} + ${fmtMoney(50)} = ${fmtMoney(1400)}`,
      `${fmtMoney(1400)} + ${fmtMoney(600)} = ${fmtMoney(2000)}`,
      `Rückgeld: ${fmtMoney(5)} + ${fmtMoney(50)} + ${fmtMoney(600)} = ${fmtMoney(655)}`,
    ]);
  });

  it('a generated "not regrouped" answer gets the targeted hint', () => {
    const ex = samples(wechselgeldSkill, 1).find((e) => (e.bugs ?? []).some((b) => b.id === 'euro-nicht-entbuendelt'))!;
    const bug = ex.bugs!.find((b) => b.id === 'euro-nicht-entbuendelt')!;
    const r = checkAnswer(ex.answer, { kind: 'number', text: String(bug.match).replace('.', ',') }, ex.bugs);
    expect(r.bugHint).toMatch(/Euro angebrochen/);
  });
});
