import { describe, expect, it } from 'vitest';
import { checkAnswer } from '../../core/check';
import { describeSkill } from '../../core/testing';
import type { Axis, Cell } from '../../core/types';
import { spiegelnSkill } from './spiegeln';
import { samples } from './test-utils';

describeSkill(spiegelnSkill, { minDistinct: { 1: 40, 2: 60, 3: 60 } });

function mirror([x, y]: Cell, axis: Axis): string {
  if (axis.orientation === 'vertical') return `${2 * axis.at - 1 - x},${y}`;
  if (axis.orientation === 'horizontal') return `${x},${2 * axis.at - 1 - y}`;
  return `${y},${x}`;
}

describe('Spiegelbild ergänzen – independent checks', () => {
  it('given ∪ solution is symmetric, solution is exactly the missing mirror images', () => {
    for (const stufe of [1, 2, 3] as const) {
      for (const ex of samples(spiegelnSkill, stufe)) {
        if (ex.answer.kind !== 'cells') throw new Error('cells expected');
        const { given, solution, axis } = ex.answer;
        expect(axis).toBeDefined();
        const g = new Set(given.map((c) => c.join()));
        // independent solution: mirror images of given cells that are not given
        const expected = new Set(given.map((c) => mirror(c, axis!)).filter((k) => !g.has(k)));
        expect(new Set(solution.map((c) => c.join()))).toEqual(expected);
        const all = new Set([...given, ...solution].map((c) => c.join()));
        [...given, ...solution].forEach((c) => expect(all.has(mirror(c, axis!))).toBe(true));
      }
    }
  });

  it('Stufe parameters: axis orientation and number of Kästchen', () => {
    for (const ex of samples(spiegelnSkill, 1)) {
      const a = ex.answer;
      if (a.kind !== 'cells') continue;
      expect(a.axis!.orientation).toBe('vertical');
      expect(a.given.length).toBeGreaterThanOrEqual(3);
      expect(a.given.length).toBeLessThanOrEqual(5);
      // given half lies left of the axis and touches it
      a.given.forEach((c) => expect(c[0]).toBeLessThan(a.axis!.at));
      expect(a.given.some((c) => c[0] === a.axis!.at - 1)).toBe(true);
    }
    const orientations2 = new Set(samples(spiegelnSkill, 2).map((e) => (e.answer.kind === 'cells' ? e.answer.axis!.orientation : '')));
    expect(orientations2).toEqual(new Set(['vertical', 'horizontal']));
    for (const ex of samples(spiegelnSkill, 3)) {
      if (ex.answer.kind !== 'cells') continue;
      if (ex.answer.axis!.orientation === 'diagonal') expect(ex.answer.width).toBe(ex.answer.height);
      expect(ex.knobel).toBe(true);
    }
  });

  it('checkAnswer reports extra and missing cells', () => {
    const ex = samples(spiegelnSkill, 1, 1)[0];
    if (ex.answer.kind !== 'cells') throw new Error('cells expected');
    const [first, ...rest] = ex.answer.solution;
    const wrongCell: Cell = [ex.answer.width - 1, ex.answer.height - 1];
    const extra = ex.answer.solution.some((c) => c.join() === wrongCell.join()) ? ([0, 0] as Cell) : wrongCell;
    const res = checkAnswer(ex.answer, { kind: 'cells', cells: [...rest, extra] });
    expect(res.correct).toBe(false);
    expect(res.missingCells).toEqual([first]);
    expect(res.extraCells).toEqual([extra]);
  });

  it('the worked example names a mirrored cell correctly', () => {
    for (const ex of samples(spiegelnSkill, 2, 50)) {
      if (ex.answer.kind !== 'cells') continue;
      const step = String(ex.steps[1]);
      const m = /Zeile (\d+), Spalte (\d+)[^:]*: Zeile (\d+), Spalte (\d+)/.exec(step);
      if (!m) continue;
      const src: Cell = [Number(m[2]) - 1, Number(m[1]) - 1];
      expect(mirror(src, ex.answer.axis!)).toBe(`${Number(m[4]) - 1},${Number(m[3]) - 1}`);
    }
  });

  it('the worked example counts from the axis with ordinals (the Kästchen at the axis is the 1st), never "… entfernt"', () => {
    const seen = new Set<string>();
    for (const stufe of [1, 2, 3] as const) {
      for (const ex of samples(spiegelnSkill, stufe, 120)) {
        if (ex.answer.kind !== 'cells' || ex.answer.axis!.orientation === 'diagonal') continue;
        const step = String(ex.steps[1]);
        expect(step).not.toMatch(/entfernt/);
        const m = /Zeile (\d+), Spalte (\d+) (?:ist das (\d+)\. Kästchen|liegt (?:links|rechts|oben|unten) direkt an der Achse)/.exec(step);
        expect(m, step).not.toBeNull();
        const [x, y] = [Number(m![2]) - 1, Number(m![1]) - 1];
        const a = ex.answer.axis!;
        const p = a.orientation === 'vertical' ? x : y;
        const pos = p < a.at ? a.at - p : p - a.at + 1; // independent: 1 = touching the axis
        if (pos === 1) {
          expect(step).toMatch(/direkt an der Achse/);
          seen.add('direkt');
        } else {
          expect(Number(m![3])).toBe(pos);
          seen.add('ordinal');
        }
      }
    }
    expect(seen).toEqual(new Set(['direkt', 'ordinal']));
  });
});
