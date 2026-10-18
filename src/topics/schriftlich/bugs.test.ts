import { describe, expect, it } from 'vitest';
import { BANNED_PHRASES } from '../../core/testing';
import { createRng } from '../../core/rng';
import type { SubtractionMethod, WrittenOp } from '../../core/types';
import { BUG_LIBRARY, bugCandidates, bugsFor, buggyPartials, mulByDigit } from './bugs';

function value(id: string, op: WrittenOp, operands: number[], method: SubtractionMethod = 'abziehen'): number | null {
  const def = BUG_LIBRARY[op].find((d) => d.id === id);
  if (!def) throw new Error(`unknown bug ${id}`);
  return def.compute(operands, method);
}

describe('bug library: each misconception on a known example', () => {
  it.each([
    // Addition
    ['add.no-carry', 'add', [4567, 2845], 6302],
    ['add.carry-twice', 'add', [4567, 2845], 8522],
    ['add.carry-too-small', 'add', [999, 999, 999], 1887],
    ['add.carry-swapped', 'add', [58, 67], 611],
    ['add.last-carry', 'add', [6000, 5000], 1000],
    ['add.misaligned', 'add', [4567, 89], 13467],
    // Subtraction (Abziehen)
    ['sub.smaller-from-larger', 'sub', [742, 358], 416],
    ['sub.no-reduce', 'sub', [742, 358], 494],
    ['sub.zero-minus-n', 'sub', [705, 123], 622],
    ['sub.zero-minus-n-zero', 'sub', [705, 123], 602],
    ['sub.across-zero', 'sub', [805, 328], 487],
    ['sub.borrow-added', 'sub', [742, 358], 404],
    ['sub.added', 'sub', [742, 358], 1100],
    // Multiplication
    ['mul.no-carry', 'mul', [4738, 6], 24288],
    ['mul.carry-before', 'mul', [4738, 6], 60628],
    ['mul.last-carry', 'mul', [4738, 6], 8428],
    ['mul.unshifted', 'mul', [1254, 37], 12540],
    ['mul.zero-skipped', 'mul', [624, 305], 21840],
    ['mul.ones-only', 'mul', [1254, 37], 8778],
    ['mul.sum-no-carry', 'mul', [1254, 37], 35398],
    // Division (wrong quotient)
    ['div.missing-zero', 'div', [4230, 6], 75],
    ['div.missing-end-zero', 'div', [4200, 6], 7],
    ['div.digitwise', 'div', [5432, 4], 1100],
    ['div.drop-first', 'div', [2345, 5], 69],
    ['div.rest-too-big', 'div', [5435, 4], 1357],
  ] as const)('%s: %s %j → %d', (id, op, operands, expected) => {
    expect(value(id, op, [...operands])).toBe(expected);
  });

  it('Ergänzen variants give the same wrong numbers with method-specific hints', () => {
    expect(value('sub.no-reduce', 'sub', [742, 358], 'ergaenzen')).toBe(494);
    expect(value('sub.borrow-added', 'sub', [742, 358], 'ergaenzen')).toBe(404);
    const hints = bugsFor('sub', [742, 358], 'ergaenzen').map((b) => b.hint).join(' ');
    expect(hints).toContain('gemerkte 1');
    expect(hints).not.toContain('entbündel');
    // Abziehen-only bugs are not offered for Ergänzen
    expect(bugsFor('sub', [805, 328], 'ergaenzen').map((b) => b.id)).not.toContain('sub.across-zero');
  });

  it('returns null when the misconception does not show', () => {
    expect(value('add.no-carry', 'add', [1234, 4321])).toBeNull();
    expect(value('add.last-carry', 'add', [1234, 4321])).toBeNull();
    expect(value('sub.smaller-from-larger', 'sub', [987, 123])).toBeNull();
    expect(value('mul.unshifted', 'mul', [473, 6])).toBeNull();
    expect(value('mul.zero-skipped', 'mul', [473, 36])).toBeNull();
    expect(value('div.missing-zero', 'div', [5432, 4])).toBeNull();
    expect(value('div.drop-first', 'div', [5432, 4])).toBeNull();
  });

  it('no-carry writes the leftmost column in full (8 + 5 → 13); the cut variant is a second bug with the same hint', () => {
    // 78 613 + 6879 + 66 776 + 11 663 = 163 931; column sums without carries: Einer 21, …, Zehntausender 14
    const bugs = bugsFor('add', [78613, 6879, 66776, 11663]);
    const full = bugs.find((b) => b.id === 'add.no-carry')!;
    const cut = bugs.find((b) => b.id === 'add.no-carry-cut')!;
    expect(full.match).toBe(141711);
    expect(cut.match).toBe(41711);
    expect(cut.hint).toBe(full.hint);
  });

  it('carry-too-small asks for the next place, not always for "Zehner"', () => {
    // 90 + 90 + 90: the Zehner give 27 → Übertrag 2 into the Hunderter
    const hint = bugsFor('add', [90, 90, 90]).find((b) => b.id === 'add.carry-too-small')!.hint;
    expect(hint).toBe('Schau dir die Hunderterstelle noch einmal an: Die Zehner ergeben zusammen 27. Wie viele volle Hunderter sind das? So groß ist der Übertrag.');
    expect(BUG_LIBRARY.add.find((d) => d.id === 'add.carry-too-small')!.label('abziehen')).not.toContain('Zehner');
  });

  it('zero bugs point to the column with the 0, even when its digit is right by chance (0 − 5 → 5)', () => {
    // 308 554 − 55 581: at the Zehntausender 0 − 5 is written as 5 (right by chance); the first wrong digit is
    // the Hunderttausender, but the hint must talk about the 0
    const zero = bugsFor('sub', [308554, 55581]).find((b) => b.id === 'sub.zero-minus-n')!;
    expect(zero.hint).toBe('Schau dir die Zehntausenderstelle noch einmal an: Oben steht 0. 0 minus 5 geht nicht. Du musst entbündeln.');
    const def = BUG_LIBRARY.sub.find((d) => d.id === 'sub.zero-minus-n')!;
    expect(def.place!([308554, 55581], 'abziehen')).toBe(4);
    // the hint never claims "0 minus 0" or a 0 where the Minuend has none
    const rng = createRng(17);
    for (let i = 0; i < 400; i++) {
      const a = rng.int(10_000, 999_999);
      const b = rng.int(100, a);
      for (const bug of bugsFor('sub', [a, b]).filter((x) => x.id === 'sub.zero-minus-n' || x.id === 'sub.zero-minus-n-zero')) {
        expect(bug.hint).not.toMatch(/0 minus 0/);
        const place = ['Einer', 'Zehner', 'Hunderter', 'Tausender', 'Zehntausender', 'Hunderttausender'].findIndex((n) => bug.hint.startsWith(`Schau dir die ${n}stelle`));
        expect(Math.floor(a / 10 ** place) % 10).toBe(0);
      }
    }
  });

  it('hints are column-specific', () => {
    const hint = bugsFor('add', [4567, 2845]).find((b) => b.id === 'add.no-carry')!.hint;
    expect(hint).toBe('Schau dir die Zehnerstelle noch einmal an: Von den Einern kommt noch ein Übertrag dazu.');
    const sub = bugsFor('sub', [742, 358]).find((b) => b.id === 'sub.smaller-from-larger')!.hint;
    expect(sub).toBe('Schau dir die Einerstelle noch einmal an: Oben steht 2, unten 8. 2 minus 8 geht nicht. Du musst entbündeln.');
  });
});

describe('bugsFor', () => {
  const methods: SubtractionMethod[] = ['abziehen', 'ergaenzen'];
  it('never contains the correct result, values are unique non-negative integers (random)', () => {
    const rng = createRng(99);
    for (let i = 0; i < 400; i++) {
      const cases: [WrittenOp, number[], number][] = [];
      const a = rng.int(100, 99_999);
      const b = rng.int(10, a);
      cases.push(['add', [a, b, rng.int(1, 9999)], 0]);
      cases.push(['sub', [a, b], 0]);
      cases.push(['mul', [rng.int(10, 9999), rng.int(2, 99)], 0]);
      const d = rng.int(2, 10);
      cases.push(['div', [rng.int(100, 999_999), d], 0]);
      for (const [op, ops] of cases) {
        for (const m of methods) {
          const correct = op === 'add' ? ops.reduce((x, y) => x + y, 0) : op === 'sub' ? ops[0] - ops[1] : op === 'mul' ? ops[0] * ops[1] : Math.floor(ops[0] / ops[1]);
          const bugs = bugsFor(op, ops, m);
          const values = bugs.map((x) => x.match as number);
          expect(values).not.toContain(correct);
          expect(new Set(values).size).toBe(values.length);
          values.forEach((v) => expect(Number.isInteger(v) && v >= 0).toBe(true));
        }
      }
    }
  });

  it('labels and hints are kind German (no banned phrases)', () => {
    const texts: string[] = [];
    for (const op of ['add', 'sub', 'mul', 'div'] as const) {
      for (const def of BUG_LIBRARY[op]) for (const m of methods) texts.push(def.label(m));
    }
    texts.push(...bugCandidates('sub', [805, 328]).map((c) => c.hint), ...bugCandidates('add', [999, 999, 999]).map((c) => c.hint));
    for (const t of texts) {
      for (const banned of BANNED_PHRASES) expect(t.toLowerCase()).not.toContain(banned);
    }
  });

  it('5–8 bugs per operation', () => {
    for (const op of ['add', 'sub', 'mul', 'div'] as const) {
      expect(BUG_LIBRARY[op].length).toBeGreaterThanOrEqual(5);
      expect(BUG_LIBRARY[op].length).toBeLessThanOrEqual(8);
    }
  });
});

describe('buggyPartials', () => {
  it('the shown partial products add up to the bug result', () => {
    const rng = createRng(5);
    for (let i = 0; i < 200; i++) {
      const a = rng.int(100, 9999);
      const b = rng.int(11, 999);
      for (const id of ['mul.no-carry', 'mul.carry-before', 'mul.last-carry', 'mul.unshifted', 'mul.zero-skipped']) {
        const parts = buggyPartials(id, a, b);
        const v = value(id, 'mul', [a, b]);
        if (!parts || v === null) continue;
        expect(parts.reduce((s, p) => s + p.value * 10 ** p.shift, 0)).toBe(v);
      }
    }
  });
  it('mulByDigit modes', () => {
    expect(mulByDigit(4738, 6, 'correct')).toBe(28428);
    expect(mulByDigit(4738, 6, 'dropLastCarry')).toBe(8428);
  });
});
