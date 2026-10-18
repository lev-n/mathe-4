import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import { umfangSkill } from './umfang';
import { outlineSides } from './grid';
import { bugValue, countPerimeter, gridOf, numberValue, samples } from './test-utils';

describeSkill(umfangSkill, { minDistinct: { 1: 20, 2: 40, 3: 30 } });

describe('Umfang – independent checks', () => {
  it('Stufe 1: rectangles; answer = 2 · (Breite + Höhe) counted from the drawing', () => {
    for (const ex of samples(umfangSkill, 1)) {
      const g = gridOf(ex);
      const xs = g.cells.map((c) => c[0]);
      const ys = g.cells.map((c) => c[1]);
      const w = Math.max(...xs) - Math.min(...xs) + 1;
      const h = Math.max(...ys) - Math.min(...ys) + 1;
      expect(g.cells.length).toBe(w * h);
      expect(numberValue(ex)).toBe(2 * (w + h));
      expect(numberValue(ex)).toBe(countPerimeter(g.cells));
      expect(w).toBeLessThanOrEqual(7);
      expect(h).toBeLessThanOrEqual(5);
    }
  });

  it('Stufe 2: answer = number of boundary edges; the walk-around steps add up', () => {
    for (const ex of samples(umfangSkill, 2)) {
      const g = gridOf(ex);
      const p = countPerimeter(g.cells);
      expect(numberValue(ex)).toBe(p);
      expect(outlineSides(g.cells).reduce((a, b) => a + b, 0)).toBe(p);
      expect(g.cells.length).toBeLessThanOrEqual(30);
      if (bugValue(ex, 'flaeche') !== undefined) expect(bugValue(ex, 'flaeche')).toBe(g.cells.length);
    }
  });

  it('Stufe 3: the chosen option matches an independent perimeter comparison', () => {
    for (const ex of samples(umfangSkill, 3)) {
      expect(ex.answer.kind).toBe('choice');
      if (ex.answer.kind !== 'choice') continue;
      const label = ex.answer.options[ex.answer.correct].label;
      if (ex.key.includes(':vergleich:') || ex.key.includes(':aendern:') || ex.key.includes(':gleicher-umfang:')) {
        const g = gridOf(ex);
        // split the two figures by the empty gap columns
        const xs = [...new Set(g.cells.map((c) => c[0]))].sort((a, b) => a - b);
        const gapAt = xs.findIndex((x, i) => i > 0 && x - xs[i - 1] > 1);
        const leftCells = g.cells.filter((c) => c[0] < xs[gapAt]);
        const rightCells = g.cells.filter((c) => c[0] >= xs[gapAt]);
        const pl = countPerimeter(leftCells);
        const pr = countPerimeter(rightCells);
        if (ex.key.includes(':gleicher-umfang:')) {
          // same Umfang, different Flächeninhalt: the figure with more Kästchen wins
          expect(pl).toBe(pr);
          expect(Math.abs(leftCells.length - rightCells.length)).toBeGreaterThanOrEqual(2);
          expect(label).toBe(leftCells.length > rightCells.length ? 'Figur A' : 'Figur B');
        } else if (ex.key.includes(':vergleich:')) {
          expect(leftCells.length).toBe(rightCells.length);
          if (pl === pr) expect(label).toMatch(/gleichen Umfang/);
          else expect(label).toBe(pl > pr ? 'Figur A' : 'Figur B');
        } else {
          if (pl === pr) expect(label).toMatch(/gleich/);
          else expect(label).toMatch(pr > pl ? /größer/ : /kleiner/);
        }
      } else {
        // rectangles from n Kästchen
        const m = /:rechtecke:(\d+):(max|min):/.exec(ex.key)!;
        const n = Number(m[1]);
        const per = (l: string) => {
          const one = /^1 Reihe mit (\d+)/.exec(l);
          if (one) return 2 * (1 + Number(one[1]));
          const k = /^(\d+) Reihen mit je (\d+)/.exec(l)!;
          expect(Number(k[1]) * Number(k[2])).toBe(n);
          return 2 * (Number(k[1]) + Number(k[2]));
        };
        const ps = ex.answer.options.map((o) => per(o.label));
        const target = m[2] === 'max' ? Math.max(...ps) : Math.min(...ps);
        expect(per(label)).toBe(target);
        expect(ps.filter((p) => p === target).length).toBe(1);
      }
    }
  });

  it('known example: 5 × 3 rectangle → 16; area bug 15, two sides 8, border cells 12', () => {
    const ex = samples(umfangSkill, 1, 3000).find((e) => e.key.includes(':5x3:'));
    expect(ex).toBeDefined();
    expect(numberValue(ex!)).toBe(16);
    expect(bugValue(ex!, 'flaeche')).toBe(15);
    expect(bugValue(ex!, 'zwei-seiten')).toBe(8);
    expect(bugValue(ex!, 'randkaestchen')).toBe(12);
  });

  it('removing a corner Kästchen keeps the Umfang', () => {
    const ex = samples(umfangSkill, 3, 400).find((e) => e.key.includes(':ecke-weg:'));
    expect(ex).toBeDefined();
    if (ex!.answer.kind === 'choice') expect(ex!.answer.options[ex!.answer.correct].label).toBe('Der Umfang bleibt gleich.');
  });

  it('Stufe 3 also compares figures with the same Umfang but a different Flächeninhalt', () => {
    const ex = samples(umfangSkill, 3, 300).filter((e) => e.key.includes(':gleicher-umfang:'));
    expect(ex.length).toBeGreaterThan(20);
    ex.forEach((e) => expect(e.prompt).toMatch(/gleichen Umfang.*größeren Flächeninhalt/));
  });
});
