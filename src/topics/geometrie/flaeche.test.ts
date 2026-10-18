import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import { flaecheSkill, where } from './flaeche';
import { lFigure, tFigure, transformFigure, uFigure } from './grid';
import { bugValue, countPerimeter, gridOf, numberValue, samples } from './test-utils';

describeSkill(flaecheSkill, { minDistinct: { 1: 20, 2: 40, 3: 40 } });

describe('Flächeninhalt – independent checks', () => {
  it('Stufe 1: rectangles with 4–40 Kästchen; answer = number of filled cells', () => {
    for (const ex of samples(flaecheSkill, 1)) {
      const g = gridOf(ex);
      const xs = g.cells.map((c) => c[0]);
      const ys = g.cells.map((c) => c[1]);
      const w = Math.max(...xs) - Math.min(...xs) + 1;
      const h = Math.max(...ys) - Math.min(...ys) + 1;
      expect(g.cells.length).toBe(w * h); // a full rectangle
      expect(numberValue(ex)).toBe(g.cells.length);
      expect(g.cells.length).toBeGreaterThanOrEqual(4);
      expect(g.cells.length).toBeLessThanOrEqual(40);
      expect(g.halfCells ?? []).toEqual([]);
      expect(ex.hints.join(' ')).not.toMatch(/·/); // no 'Reihen · Spalten' before Stufe 3
    }
  });

  it('Stufe 2: composite figures with 8–40 Kästchen', () => {
    for (const ex of samples(flaecheSkill, 2)) {
      const g = gridOf(ex);
      expect(numberValue(ex)).toBe(g.cells.length);
      expect(g.cells.length).toBeGreaterThanOrEqual(8);
      expect(g.cells.length).toBeLessThanOrEqual(40);
      expect(ex.hints.join(' ')).not.toMatch(/·/);
    }
  });

  it('Stufe 3: area = whole cells + half cells / 2 (always whole), ≤ 40', () => {
    for (const ex of samples(flaecheSkill, 3)) {
      const g = gridOf(ex);
      const halves = g.halfCells ?? [];
      expect(halves.length % 2).toBe(0);
      if (ex.key.includes(':ergaenzen:')) {
        const xs = g.cells.map((c) => c[0]);
        const ys = g.cells.map((c) => c[1]);
        const box = (Math.max(...xs) - Math.min(...xs) + 1) * (Math.max(...ys) - Math.min(...ys) + 1);
        expect(numberValue(ex)).toBe(box - g.cells.length);
      } else {
        expect(numberValue(ex)).toBe(g.cells.length + halves.length / 2);
        expect(numberValue(ex)).toBeLessThanOrEqual(40);
      }
      // half cells never overlap whole cells
      const full = new Set(g.cells.map((c) => c.join()));
      halves.forEach((h) => expect(full.has(h.cell.join())).toBe(false));
    }
  });

  it('bug values reproduce the misconceptions', () => {
    for (const ex of samples(flaecheSkill, 1, 100)) {
      const g = gridOf(ex);
      const p = countPerimeter(g.cells);
      if (p !== g.cells.length) expect(bugValue(ex, 'umfang')).toBe(p);
    }
    for (const ex of samples(flaecheSkill, 3, 200).filter((e) => e.key.includes(':halb:'))) {
      const g = gridOf(ex);
      const k = g.halfCells!.length;
      expect(bugValue(ex, 'halbe-als-ganze')).toBe(g.cells.length + k);
      expect(bugValue(ex, 'halbe-vergessen')).toBe(g.cells.length);
    }
  });

  it('known example: 6 × 4 rectangle', () => {
    // find a 6x4 rectangle exercise among the samples
    const ex = samples(flaecheSkill, 1, 2000).find((e) => e.key.endsWith(':rechteck:6x4'));
    expect(ex).toBeDefined();
    expect(numberValue(ex!)).toBe(24);
    expect(bugValue(ex!, 'umfang')).toBe(20);
    expect(bugValue(ex!, 'randkaestchen')).toBe(16);
    expect(bugValue(ex!, 'breite-plus-hoehe')).toBe(10);
    expect(ex!.steps[ex!.steps.length - 1]).toContain('24');
  });

  it('composite steps label every part uniquely and by where it lies (the bar of a U is "unten in der Mitte")', () => {
    const labels = (f: ReturnType<typeof uFigure>) => f.parts.map((p) => where(p, f));
    expect(labels(uFigure(1, 2, 2, 4, 2))).toEqual(['links', 'unten in der Mitte', 'rechts']);
    expect(labels(lFigure(5, 4, 2, 1))).toEqual(['links', 'unten rechts']);
    expect(labels(tFigure(5, 1, 1, 3))).toEqual(['oben', 'unten in der Mitte']);
    // rotated U ((x, y) → (−y, x): the opening points right, the bar lies on the left)
    expect(labels(transformFigure(uFigure(1, 2, 1, 3, 1), 1))).toEqual(['oben', 'links in der Mitte', 'unten']);
    let checked = 0;
    for (const ex of samples(flaecheSkill, 2, 600)) {
      const found = ex.steps.map((st) => (typeof st === 'string' ? /^Teil \d+ \(([^)]*)\)/.exec(st)?.[1] : undefined)).filter(Boolean);
      if (found.length < 2) continue;
      checked++;
      expect(new Set(found).size, `${ex.key}: ${found.join(' | ')}`).toBe(found.length);
    }
    expect(checked).toBeGreaterThan(100);
  });
});
