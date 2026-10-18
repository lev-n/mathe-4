import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import type { Exercise, VisualOf } from '../../core/types';
import { BUG_LIBRARY } from './bugs';
import { fehlerdetektivSkill } from './fehlerdetektiv';
import { visualExtras } from './layout';
import { ABZ, ERG, samples } from './test-helpers';

describeSkill(fehlerdetektivSkill, { minDistinct: 20 });

const exact = (v: VisualOf<'written'>) => {
  const [a, b] = v.operands;
  return v.op === 'add' ? v.operands.reduce((x, y) => x + y, 0) : v.op === 'sub' ? a - b : v.op === 'mul' ? a * b : Math.floor(a / b);
};
const PLACES = ['Einern', 'Zehnern', 'Hundertern', 'Tausendern', 'Zehntausendern', 'Hunderttausendern', 'Millionen'];

function rightmostDiff(x: number, y: number): number {
  const sx = String(x).split('').reverse();
  const sy = String(y).split('').reverse();
  for (let p = 0; p < Math.max(sx.length, sy.length); p++) if ((sx[p] ?? '0') !== (sy[p] ?? '0')) return p;
  return -1;
}

function check(ex: Exercise, method: 'abziehen' | 'ergaenzen') {
  expect(ex.prompt.startsWith('Wo steckt der Fehler?')).toBe(true);
  const v = ex.visual as VisualOf<'written'>;
  expect(v.type).toBe('written');
  const shown = visualExtras(v).shownResult!;
  const correct = exact(v);
  expect(shown).not.toBe(correct);
  // the shown wrong result is what one misconception of the library produces
  const producing = BUG_LIBRARY[v.op].filter((d) => (!d.methods || d.methods.includes(method)) && d.compute(v.operands, method) === shown);
  expect(producing.length).toBeGreaterThan(0);
  if (ex.key.includes(':wo:') && ex.answer.kind === 'choice') {
    const p = rightmostDiff(correct, shown);
    expect(ex.answer.options[ex.answer.correct].label).toBe(`Bei den ${PLACES[p]}`);
  } else if (ex.key.includes(':warum') && ex.answer.kind === 'choice') {
    const label = ex.answer.options[ex.answer.correct].label;
    expect(producing.map((d) => d.label(method))).toContain(label);
    if (ex.key.includes(':warum-m:')) expect(v.highlightColumn).toBe(rightmostDiff(correct, shown));
    expect(ex.answer.options.length).toBeGreaterThanOrEqual(3);
  } else if (ex.answer.kind === 'written') {
    expect(ex.answer.result).toBe(correct);
    expect(ex.bugs?.some((b) => b.match === shown)).toBe(true);
  } else throw new Error(`unexpected item ${ex.key}`);
}

describe('schriftlich.fehlerdetektiv', () => {
  for (const ctx of [ABZ, ERG]) {
    it(`every planted mistake is real and the answer points to it (${ctx.subtractionMethod})`, () => {
      for (const stufe of [1, 2, 3] as const) for (const ex of samples(fehlerdetektivSkill, stufe, ctx, 150)) check(ex, ctx.subtractionMethod);
    });
  }

  it('Stufe 1 asks only for the column in + and − ; Stufe 3 covers all four operations', () => {
    const s1 = samples(fehlerdetektivSkill, 1);
    s1.forEach((ex) => {
      expect(ex.key).toMatch(/:wo:(add|sub):/);
    });
    const ops = new Set(samples(fehlerdetektivSkill, 3).map((ex) => (ex.visual as VisualOf<'written'>).op));
    expect([...ops].sort()).toEqual(['add', 'div', 'mul', 'sub']);
  });

  for (const ctx of [ABZ, ERG]) {
    it(`the marked/answered column is where the misconception happened (${ctx.subtractionMethod})`, () => {
      for (const stufe of [1, 2, 3] as const) {
        for (const ex of samples(fehlerdetektivSkill, stufe, ctx, 200)) {
          const v = ex.visual as VisualOf<'written'>;
          const id = ex.key.match(/:((?:add|sub|mul|div)\.[a-z-]+)/)![1];
          const def = BUG_LIBRARY[v.op].find((d) => d.id === id)!;
          const where = def.place?.(v.operands, ctx.subtractionMethod);
          if (where === undefined || where === null) continue;
          expect(where, ex.key).toBe(rightmostDiff(exact(v), visualExtras(v).shownResult!));
          if (v.highlightColumn !== undefined) expect(v.highlightColumn).toBe(where);
        }
      }
    });
  }

  it('screen readers hear the partial products of a multi-digit multiplication', () => {
    const exs = samples(fehlerdetektivSkill, 3, ABZ, 300).filter((e) => {
      const v = e.visual as VisualOf<'written'>;
      return v.op === 'mul' && String(v.operands[1]).length > 1 && visualExtras(v).shownPartials;
    });
    expect(exs.length).toBeGreaterThan(0);
    for (const ex of exs) expect(ex.srText).toMatch(/Teilprodukte?: /);
  });

  it('division "why" items do not refer to a marked digit', () => {
    for (const ex of samples(fehlerdetektivSkill, 3, ABZ, 300)) {
      if (!ex.key.includes(':warum:div:')) continue;
      expect(ex.hints.join(' ')).not.toMatch(/Ziffer, die dort steht/);
    }
  });

  it('multi-digit multiplication shows the child’s partial products', () => {
    const ex = samples(fehlerdetektivSkill, 3).find((e) => {
      const v = e.visual as VisualOf<'written'>;
      return v.op === 'mul' && String(v.operands[1]).length > 1;
    });
    expect(ex).toBeDefined();
    const v = ex!.visual as VisualOf<'written'>;
    const parts = visualExtras(v).shownPartials;
    expect(parts && parts.length).toBeGreaterThan(0);
    expect(parts!.reduce((s, p) => s + p.value * 10 ** p.shift, 0)).toBe(visualExtras(v).shownResult);
  });
});
