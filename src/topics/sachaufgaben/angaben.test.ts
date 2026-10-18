import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import { checkAnswer } from '../../core/check';
import { angabenSkill } from './angaben';
import { samples } from '../groessen/test-utils';

describeSkill(angabenSkill, { minDistinct: 30 });

describe('sachaufgaben.angaben specifics', () => {
  it('every number item offers "Nicht lösbar", so the button gives nothing away', () => {
    for (const stufe of [1, 2, 3] as const) {
      for (const ex of samples(angabenSkill, stufe)) {
        if (ex.answer.kind === 'number') expect(ex.answer.offerUnsolvable).toBe(true);
      }
    }
  });

  it('share of unsolvable items grows with the Stufe', () => {
    const share = (stufe: 1 | 2 | 3) => {
      const nums = samples(angabenSkill, stufe).filter((e) => e.answer.kind === 'number');
      return nums.filter((e) => e.answer.kind === 'number' && e.answer.value === null).length / nums.length;
    };
    expect(share(1)).toBeLessThan(0.3);
    expect(share(3)).toBeGreaterThan(0.35);
    expect(share(3)).toBeLessThan(0.65);
  });

  it('solvable items contain an unnecessary fact; using it is caught', () => {
    const ex = samples(angabenSkill, 1).find((e) => /Malblöcke/.test(e.context ?? '') && e.answer.kind === 'number' && e.answer.value !== null)!;
    const [n, p, m] = [...ex.context!.matchAll(/(\d+)/g)].map((x) => Number(x[1]));
    expect(ex.answer.kind === 'number' && ex.answer.value).toBe(n * p);
    const r = checkAnswer(ex.answer, { kind: 'number', text: String(m - n * p) }, ex.bugs);
    if (m - n * p > 0) expect(r.bugHint).toMatch(/alle Zahlen/);
  });

  it('Kapitänsaufgaben: not solvable; adding the numbers gets a hint about the situation', () => {
    const ex = samples(angabenSkill, 3).find((e) => /Kapitän/.test(e.prompt))!;
    expect(ex.answer.kind === 'number' && ex.answer.value).toBeNull();
    const [a, b] = [...ex.context!.matchAll(/(\d+)/g)].map((x) => Number(x[1]));
    const r = checkAnswer(ex.answer, { kind: 'number', text: String(a + b) }, ex.bugs);
    expect(r.correct).toBe(false);
    expect(r.bugHint).toMatch(/Alter des Kapitäns/);
    expect(checkAnswer(ex.answer, { kind: 'number', text: '', unsolvable: true }).correct).toBe(true);
  });

  it('Stufe 2 choice items: exactly one fact is unnecessary / missing', () => {
    for (const ex of samples(angabenSkill, 2)) {
      if (ex.answer.kind !== 'choice') continue;
      if (/brauchst du dafür nicht/.test(ex.prompt)) {
        const right = ex.answer.options[ex.answer.correct].label;
        expect(ex.context).toContain(right);
        expect(String(ex.steps[ex.steps.length - 1])).toContain(right);
      } else {
        expect(ex.prompt).toMatch(/fehlt dir/);
        expect(ex.answer.options.length).toBe(4);
      }
    }
  });
});
