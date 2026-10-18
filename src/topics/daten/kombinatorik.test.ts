import { describe, expect, it } from 'vitest';
import { checkAnswer } from '../../core/check';
import { describeSkill } from '../../core/testing';
import type { Exercise } from '../../core/types';
import { combinations, handshakes, kombinatorikSkill, MAX_TREE_ENDS, permutations3, threeSetSteps } from './kombinatorik';
import { byMode, keyPart, samples } from './testUtils';

describeSkill(kombinatorikSkill, { minDistinct: { 1: 40, 2: 40, 3: 40 } });

const numValue = (e: Exercise) => {
  if (e.answer.kind !== 'number') throw new Error('number expected');
  return e.answer.value!;
};
const optsOf = (e: Exercise) => keyPart(e, 4).split('_').map((l) => l.split('-'));

/** Brute force: count all tuples by nested enumeration. */
function countTuples(levels: string[][]): number {
  let count = 0;
  const walk = (depth: number) => {
    if (depth === levels.length) {
      count++;
      return;
    }
    for (let i = 0; i < levels[depth].length; i++) walk(depth + 1);
  };
  walk(0);
  return count;
}

describe('daten.kombinatorik – answers recomputed by enumeration', () => {
  it('Stufe 1: two sets (≤ 3 · 4) with the full Baumdiagramm', () => {
    for (const e of samples(kombinatorikSkill, 1)) {
      const opts = optsOf(e);
      expect(opts).toHaveLength(2);
      expect(opts[0].length).toBeLessThanOrEqual(3);
      expect(opts[1].length).toBeLessThanOrEqual(4);
      expect(numValue(e)).toBe(countTuples(opts));
      expect(e.visual).toEqual({ type: 'tree', levels: opts });
      opts.forEach((o) => expect(new Set(o).size).toBe(o.length));
    }
  });

  it('Stufe 2: products ≤ 4 · 4, orders of 3 things, handshakes for 3–5 children', () => {
    const list = samples(kombinatorikSkill, 2);
    for (const e of byMode(list, 'produkt')) {
      const opts = optsOf(e);
      opts.forEach((o) => expect(o.length).toBeLessThanOrEqual(4));
      expect(numValue(e)).toBe(countTuples(opts));
      expect(e.visual).toBeUndefined();
    }
    for (const e of byMode(list, 'reihenfolge')) {
      const items = keyPart(e, 4).split('-') as [string, string, string];
      const distinct = new Set(permutations3(items).map((p) => p.join('|')));
      expect(numValue(e)).toBe(distinct.size);
      expect(distinct.size).toBe(6);
    }
    for (const e of byMode(list, 'paare')) {
      const n = keyPart(e, 4).split('-').length;
      expect(n).toBeGreaterThanOrEqual(3);
      expect(n).toBeLessThanOrEqual(5);
      let count = 0;
      for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) count++;
      expect(numValue(e)).toBe(count);
    }
  });

  it('Stufe 3: three sets ≤ 36 (tree up to 18 ends), backwards, one more option, 5–6 children', () => {
    const list = samples(kombinatorikSkill, 3);
    const triples = byMode(list, 'produkt');
    expect(triples.length).toBeGreaterThan(50);
    for (const e of triples) {
      const opts = optsOf(e);
      expect(opts).toHaveLength(3);
      opts.forEach((o) => expect(o.length).toBeLessThanOrEqual(4));
      const total = countTuples(opts);
      expect(total).toBeLessThanOrEqual(36);
      expect(numValue(e)).toBe(total);
      expect(e.visual !== undefined).toBe(total <= MAX_TREE_ENDS);
    }
    for (const e of byMode(list, 'rueckwaerts')) {
      const a = Number(keyPart(e, 4));
      const total = Number(e.context!.match(/So gibt es (\d+)/)![1]);
      expect(a * numValue(e)).toBe(total);
    }
    for (const e of byMode(list, 'dazu')) {
      const opts = optsOf(e);
      const before = countTuples(opts);
      const after = countTuples([[...opts[0], keyPart(e, 5)], opts[1]]);
      expect(numValue(e)).toBe(after - before);
    }
    for (const e of byMode(list, 'paare')) {
      const n = keyPart(e, 4).split('-').length;
      expect([5, 6]).toContain(n);
      expect(numValue(e)).toBe(handshakes(n));
    }
  });

  it('Stufe 3 worked steps: the step tree fits on one screen and the first split is named', () => {
    const triples = byMode(samples(kombinatorikSkill, 3), 'produkt');
    let partial = 0;
    for (const e of triples) {
      const opts = optsOf(e);
      const total = countTuples(opts);
      const first = e.steps[0];
      if (typeof first === 'string' || first.visual?.type !== 'tree') throw new Error('tree step expected');
      const stepLevels = first.visual.levels;
      expect(countTuples(stepLevels), e.key).toBeLessThanOrEqual(MAX_TREE_ENDS);
      // The 4 (or 2, 3) branches from the start are mentioned, not only the later splits.
      expect(first.text).toContain(`Vom Start gehen ${opts[0].length} Äste aus.`);
      if (e.visual) {
        expect(stepLevels).toEqual(opts);
      } else {
        partial++;
        // Only the first choice of the first set is drawn; the text carries the factor for the other branches.
        expect(stepLevels).toEqual([[opts[0][0]], opts[1], opts[2]]);
        expect(first.text).toContain(`nur den Ast „${opts[0][0]}“`);
        expect(e.steps).toContain(`Bei „${opts[0][0]}“ gibt es ${opts[1].length} · ${opts[2].length} = ${opts[1].length * opts[2].length} Wege.`);
        expect(e.steps.some((s) => typeof s === 'string' && s.endsWith(`${opts[0].length} · ${opts[1].length * opts[2].length} = ${total}`))).toBe(true);
      }
    }
    expect(partial).toBeGreaterThan(10);
  });

  it('threeSetSteps for the full tree: 4 · 3 = 12 und 12 · 3 = 36 after naming all three splits', () => {
    const dims = [{ title: 'Brotsorten', acc: '', nom: '', opts: [] }, { title: 'Beläge', acc: '', nom: '', opts: [] }, { title: 'Getränke', acc: '', nom: '', opts: [] }];
    const steps = threeSetSteps(dims, [['a', 'b', 'c', 'd'], ['x', 'y', 'z'], ['1', '2', '3']], true);
    expect(steps[0]).toMatchObject({ text: 'Vom Start gehen 4 Äste aus. Jeder teilt sich in 3 Äste und jeder davon noch einmal in 3 Äste.' });
    expect(steps[1]).toBe('4 · 3 = 12 und 12 · 3 = 36');
  });

  it('combinations() lists every path once', () => {
    expect(combinations([['a', 'b'], ['x', 'y', 'z']])).toEqual(['a – x', 'a – y', 'a – z', 'b – x', 'b – y', 'b – z']);
  });
});

describe('daten.kombinatorik – misconceptions', () => {
  it('adding instead of multiplying (3 + 4 = 7 instead of 12)', () => {
    const e = samples(kombinatorikSkill, 1).find((x) => optsOf(x)[0].length === 3 && optsOf(x)[1].length === 4)!;
    const res = checkAnswer(e.answer, { kind: 'number', text: '7' }, e.bugs);
    expect(res.bugHint).toMatch(/mal, nicht plus/);
  });

  it('counting each handshake twice (4 children → 12 instead of 6)', () => {
    const e = byMode(samples(kombinatorikSkill, 2), 'paare').find((x) => keyPart(x, 4).split('-').length === 4)!;
    expect(numValue(e)).toBe(6);
    const res = checkAnswer(e.answer, { kind: 'number', text: '12' }, e.bugs);
    expect(res.bugHint).toMatch(/doppelt/);
  });

  it('orders with repetition (3 · 3 = 9)', () => {
    const e = byMode(samples(kombinatorikSkill, 2), 'reihenfolge')[0];
    const res = checkAnswer(e.answer, { kind: 'number', text: '9' }, e.bugs);
    expect(res.bugHint).toMatch(/nur einmal/);
  });
});
