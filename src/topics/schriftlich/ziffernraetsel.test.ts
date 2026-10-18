import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import { checkAnswer } from '../../core/check';
import type { VisualOf } from '../../core/types';
import { visualExtras } from './layout';
import { countSolutions, makePuzzle, puzzleBugs, type Puzzle } from './ziffernraetsel';
import { ziffernraetselSkill } from './ziffernraetsel';
import { createRng } from '../../core/rng';
import { ERG, samples } from './test-helpers';

describeSkill(ziffernraetselSkill, { minDistinct: 20 });

/** Independent brute force over the masked digits of the shown calculation (`leadingZero`: a gap in front may be 0). */
function solutions(v: VisualOf<'written'>, leadingZero = false): number[][] {
  const { masks = [], shownResult } = visualExtras(v);
  const out: number[][] = [];
  const k = masks.length;
  for (let code = 0; code < 10 ** k; code++) {
    const vals = String(code).padStart(k, '0').split('').map(Number);
    const nums = [...v.operands.map(String), String(shownResult)].map((s) => s.split(''));
    let ok = true;
    masks.forEach((m, i) => {
      const row = m.row === 'result' ? nums.length - 1 : m.index ?? 0;
      const s = nums[row];
      const idx = s.length - 1 - m.place;
      if (!leadingZero && idx === 0 && vals[i] === 0 && s.length > 1) ok = false;
      s[idx] = String(vals[i]);
    });
    if (!ok) continue;
    const ns = nums.map((d) => Number(d.join('')));
    const res = ns.pop()!;
    const lhs = v.op === 'add' ? ns.reduce((a, b) => a + b, 0) : v.op === 'sub' ? ns[0] - ns[1] : ns[0] * ns[1];
    if (lhs === res) out.push(vals);
  }
  return out;
}

describe('schriftlich.ziffernraetsel', () => {
  it('every puzzle has exactly one solution, equal to the answer fields; k gaps on Stufe k', () => {
    for (const stufe of [1, 2, 3] as const) {
      for (const ex of samples(ziffernraetselSkill, stufe, undefined, 120)) {
        const v = ex.visual as VisualOf<'written'>;
        const sols = solutions(v);
        expect(sols).toHaveLength(1);
        if (ex.answer.kind !== 'multi') throw new Error('multi expected');
        expect(ex.answer.fields.map((f) => f.value)).toEqual(sols[0]);
        expect(ex.answer.fields).toHaveLength(stufe);
        if (stufe < 3) expect(new Set(visualExtras(v).masks!.map((m) => m.place)).size).toBe(stufe);
      }
    }
  });

  it('the solution is unique without the unstated rule "a number never starts with 0"', () => {
    for (const stufe of [1, 2, 3] as const) {
      for (const ex of samples(ziffernraetselSkill, stufe, undefined, 120)) expect(solutions(ex.visual as VisualOf<'written'>, true)).toHaveLength(1);
    }
  });

  it('countSolutions detects ambiguous puzzles', () => {
    const ambiguous: Puzzle = {
      op: 'add', operands: [456, 378], result: 834,
      masks: [{ row: 'operand', index: 0, place: 0, label: 'A' }, { row: 'operand', index: 1, place: 0, label: 'B' }],
      values: [6, 8],
    };
    expect(countSolutions(ambiguous)).toBe(2);
    const p = makePuzzle(createRng(3), 2, 'add', 2);
    expect(countSolutions(p)).toBe(1);
  });

  it('bug: forgetting the carry gives the predicted digit (814 + 87 = 901, gap in the Zehner of 814)', () => {
    const p: Puzzle = { op: 'add', operands: [814, 87], result: 901, masks: [{ row: 'operand', index: 0, place: 1, label: 'A' }], values: [1] };
    const bugs = puzzleBugs(p, 'abziehen');
    // 1 + 8 + 1 (Übertrag) = 10 → A = 1; without the carry: A + 8 = 10 → A = 2
    expect(bugs).toEqual([{ id: 'zr.carry-A', match: { A: 2 }, hint: 'Denk bei A an den Übertrag von den Einern.' }]);
    const answer = { kind: 'multi' as const, fields: [{ id: 'A', value: 1 }] };
    expect(checkAnswer(answer, { kind: 'multi', values: { A: '2' } }, bugs).bugHint).toBe('Denk bei A an den Übertrag von den Einern.');
  });

  it('subtraction gaps: borrow-ignoring digit with a method-specific hint', () => {
    const p: Puzzle = { op: 'sub', operands: [652, 237], result: 415, masks: [{ row: 'result', place: 1, label: 'A' }], values: [1] };
    expect(puzzleBugs(p, 'ergaenzen')).toEqual([{ id: 'zr.carry-A', match: { A: 2 }, hint: 'Denk bei A an die gemerkte 1 von den Einern.' }]);
    expect(samples(ziffernraetselSkill, 2, ERG, 20).every((e) => e.answer.kind === 'multi')).toBe(true);
  });
});
