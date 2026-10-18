import { describe, expect, it } from 'vitest';
import { createRng } from '../../core/rng';
import {
  diffPlaces,
  digitAt,
  firstDiffPlace,
  layoutAdd,
  layoutDiv,
  layoutMul,
  layoutSub,
  numLength,
  placeDative,
  placeName,
  placeOne,
  placeShort,
  placeStelle,
  visualExtras,
  writtenVisual,
} from './layout';

describe('place names', () => {
  it('names the places in German', () => {
    expect([0, 1, 2, 3, 4, 5].map(placeName)).toEqual(['Einer', 'Zehner', 'Hunderter', 'Tausender', 'Zehntausender', 'Hunderttausender']);
    expect(placeDative(1)).toBe('Zehnern');
    expect(placeStelle(2)).toBe('Hunderterstelle');
    expect(placeOne(3)).toBe('einen Tausender');
    expect([0, 1, 2, 3, 4, 5, 6].map(placeShort)).toEqual(['E', 'Z', 'H', 'T', 'ZT', 'HT', 'M']);
  });
});

describe('layoutAdd', () => {
  it('computes carries and column sums (4567 + 2845)', () => {
    const lay = layoutAdd([4567, 2845]);
    expect(lay.columnSums).toEqual([12, 11, 14, 7]);
    expect(lay.carries).toEqual([0, 1, 1, 1]);
    expect(lay.result).toBe(7412);
    expect(lay.width).toBe(4);
  });
  it('adds a column for the last carry and supports carries ≥ 2', () => {
    expect(layoutAdd([6000, 5000]).width).toBe(5);
    const lay = layoutAdd([999, 999, 999]);
    expect(lay.carries).toEqual([0, 2, 2, 2]);
    expect(lay.result).toBe(2997);
  });
  it('result digits always match the sum (random)', () => {
    const rng = createRng(7);
    for (let i = 0; i < 300; i++) {
      const ops = Array.from({ length: rng.int(2, 4) }, () => rng.int(1, 999_999));
      const lay = layoutAdd(ops);
      const digits = lay.columnSums.map((s) => s % 10);
      expect(digits.reduce((acc, d, p) => acc + d * 10 ** p, 0)).toBe(ops.reduce((a, b) => a + b, 0));
    }
  });
});

describe('layoutSub', () => {
  it('Abziehen mit Entbündeln across a zero (805 − 328)', () => {
    const lay = layoutSub(805, 328, 'abziehen');
    expect(lay.columns.map((c) => c.top)).toEqual([15, 9, 7]);
    expect(lay.columns[0].regrouped).toBe(true);
    expect(lay.columns[0].regroupFrom).toBe(2);
    expect(lay.acrossZero).toBe(true);
    expect(lay.regroupings).toBe(1);
    expect(lay.columns.map((c) => c.r)).toEqual([7, 7, 4]);
  });
  it('Ergänzen mit Erweitern (805 − 328)', () => {
    const lay = layoutSub(805, 328, 'ergaenzen');
    expect(lay.columns.map((c) => c.carryIn)).toEqual([0, 1, 1]);
    expect(lay.columns.map((c) => c.extended)).toEqual([true, true, false]);
    expect(lay.regroupings).toBe(2);
    expect(lay.acrossZero).toBe(true);
    expect(lay.columns.map((c) => c.r)).toEqual([7, 7, 4]);
  });
  it('both methods give the difference (random)', () => {
    const rng = createRng(11);
    for (let i = 0; i < 400; i++) {
      const a = rng.int(100, 999_999);
      const b = rng.int(0, a);
      for (const method of ['abziehen', 'ergaenzen'] as const) {
        const lay = layoutSub(a, b, method);
        expect(lay.columns.reduce((acc, c) => acc + c.r * 10 ** c.place, 0)).toBe(a - b);
        lay.columns.forEach((c) => {
          expect(c.r).toBeGreaterThanOrEqual(0);
          expect(c.r).toBeLessThanOrEqual(9);
        });
        // Ergänzen extends exactly where a borrow is needed
        if (method === 'ergaenzen') {
          const borrows = lay.columns.filter((c) => a % 10 ** (c.place + 1) < b % 10 ** (c.place + 1)).length;
          expect(lay.regroupings).toBe(borrows);
        }
      }
    }
  });
  it('rejects negative differences', () => {
    expect(() => layoutSub(3, 5, 'abziehen')).toThrow(RangeError);
  });
});

describe('layoutMul', () => {
  it('partial products in German order (1254 · 37)', () => {
    const lay = layoutMul(1254, 37);
    expect(lay.partials.map((p) => [p.digit, p.shift, p.value])).toEqual([
      [3, 1, 3762],
      [7, 0, 8778],
    ]);
    expect(lay.result).toBe(46398);
    expect(lay.partials[0].value * 10 + lay.partials[1].value).toBe(46398);
  });
  it('carries of one partial product (4738 · 6)', () => {
    const lay = layoutMul(4738, 6);
    expect(lay.partials[0].carries).toEqual([0, 4, 2, 4, 2]);
    expect(lay.carryCount).toBe(3);
  });
});

describe('layoutDiv', () => {
  it('steps of 5432 : 4', () => {
    const lay = layoutDiv(5432, 4);
    expect(lay.steps.map((s) => [s.partial, s.q, s.product, s.diff])).toEqual([
      [5, 1, 4, 1],
      [14, 3, 12, 2],
      [23, 5, 20, 3],
      [32, 8, 32, 0],
    ]);
    expect(lay.quotient).toBe(1358);
    expect(lay.remainder).toBe(0);
    expect(lay.firstTwoDigits).toBe(false);
  });
  it('first partial dividend smaller than the divisor (2345 : 5) and zeros in the quotient (4230 : 6)', () => {
    expect(layoutDiv(2345, 5).firstTwoDigits).toBe(true);
    expect(layoutDiv(2345, 5).steps[0].partial).toBe(23);
    const z = layoutDiv(4230, 6);
    expect(z.quotient).toBe(705);
    expect(z.quotientZeros).toBe(1);
    expect(z.steps.map((s) => s.q)).toEqual([7, 0, 5]);
  });
  it('quotient digits, products and remainders are consistent (random)', () => {
    const rng = createRng(3);
    for (let i = 0; i < 400; i++) {
      const d = rng.int(2, 10);
      const a = rng.int(100, 999_999);
      const lay = layoutDiv(a, d);
      expect(Number(lay.steps.map((s) => s.q).join(''))).toBe(Math.floor(a / d));
      lay.steps.forEach((s) => {
        expect(s.product).toBe(s.q * d);
        expect(s.diff).toBeGreaterThanOrEqual(0);
        expect(s.diff).toBeLessThan(d);
      });
      expect(lay.steps[lay.steps.length - 1].diff).toBe(a % d);
    }
  });
});

describe('helpers', () => {
  it('digits and differences', () => {
    expect(numLength(0)).toBe(1);
    expect(numLength(100000)).toBe(6);
    expect(digitAt(5432, 2)).toBe(4);
    expect(firstDiffPlace(7412, 7402)).toBe(1);
    expect(firstDiffPlace(705, 75)).toBe(1);
    expect(firstDiffPlace(12, 12)).toBe(-1);
    expect(diffPlaces(7412, 7302)).toEqual([1, 2]);
  });
  it('writtenVisual drops undefined fields and keeps extras', () => {
    const v = writtenVisual({ type: 'written', op: 'add', operands: [1, 2], method: undefined, showSolution: false, shownResult: 4 });
    expect(Object.keys(v)).not.toContain('method');
    expect(visualExtras(v).shownResult).toBe(4);
  });
});
