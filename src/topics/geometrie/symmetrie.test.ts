import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import type { Axis, Cell } from '../../core/types';
import { symmetrieSkill } from './symmetrie';
import { bugValue, gridOf, numberValue, samples } from './test-utils';

// Stufe 3 contains a few fixed shape questions, but the diagonal grid figures are many.
describeSkill(symmetrieSkill, { minDistinct: { 1: 40, 2: 40, 3: 30 } });

/** Independent symmetry check. */
function symmetric(cells: readonly Cell[], axis: Axis): boolean {
  const set = new Set(cells.map((c) => c.join()));
  return cells.every(([x, y]) => {
    const m = axis.orientation === 'vertical' ? [2 * axis.at - 1 - x, y] : axis.orientation === 'horizontal' ? [x, 2 * axis.at - 1 - y] : [y, x];
    return set.has(m.join());
  });
}

describe('Achsensymmetrie – independent checks', () => {
  it('grid tasks: Ja is correct exactly when the figure is symmetric', () => {
    for (const stufe of [1, 2, 3] as const) {
      for (const ex of samples(symmetrieSkill, stufe)) {
        if (!ex.visual || ex.visual.type !== 'grid' || ex.key.includes(':band:')) continue;
        const g = gridOf(ex);
        expect(g.axis).toBeDefined();
        if (ex.answer.kind !== 'choice') throw new Error('choice expected');
        const label = ex.answer.options[ex.answer.correct].label;
        expect(label.startsWith('Ja')).toBe(symmetric(g.cells, g.axis!));
        // axis orientation per Stufe
        if (stufe === 1) expect(g.axis!.orientation).toBe('vertical');
        if (stufe === 2) expect(['vertical', 'horizontal']).toContain(g.axis!.orientation);
        if (stufe === 3) {
          expect(g.axis!.orientation).toBe('diagonal');
          expect(g.width).toBe(g.height);
        }
        // the axis lies inside the grid and the figure touches it
        if (g.axis!.orientation === 'vertical') {
          expect(g.axis!.at).toBeGreaterThan(0);
          expect(g.axis!.at).toBeLessThan(g.width);
        }
      }
    }
  });

  it('both answers occur on every Stufe', () => {
    for (const stufe of [1, 2, 3] as const) {
      const labels = samples(symmetrieSkill, stufe)
        .filter((e) => e.visual?.type === 'grid' && e.answer.kind === 'choice' && !e.key.includes(':band:'))
        .map((e) => (e.answer.kind === 'choice' ? e.answer.options[e.answer.correct].label.slice(0, 2) : ''));
      expect(new Set(labels)).toEqual(new Set(['Ja', 'Ne']));
    }
  });

  it('number of axes: Quadrat 4, Rechteck 2, gleichseitiges Dreieck 3, Sechseck 6, Achteck 8, Parallelogramm 0', () => {
    const expected: Record<string, number> = { quadrat: 4, rechteck: 2, 'gleichseitiges-dreieck': 3, sechseck: 6, achteck: 8, parallelogramm: 0 };
    const seen = new Set<string>();
    for (const stufe of [2, 3] as const) {
      for (const ex of samples(symmetrieSkill, stufe)) {
        const m = /:achsen:(.+)$/.exec(ex.key);
        if (!m || m[1] === 'kreis') continue;
        seen.add(m[1]);
        expect(numberValue(ex)).toBe(expected[m[1]]);
      }
    }
    expect(seen).toEqual(new Set(Object.keys(expected)));
  });

  it('typical wrong axis counts trigger targeted hints (Rechteck → 4: diagonals are no axes)', () => {
    const ex = samples(symmetrieSkill, 2).find((e) => e.key.endsWith(':achsen:rechteck'))!;
    expect(bugValue(ex, 'achsen-0')).toBe(4);
    expect(ex.bugs![0].hint).toMatch(/Diagonale/);
    const sq = samples(symmetrieSkill, 2).find((e) => e.key.endsWith(':achsen:quadrat'))!;
    expect(bugValue(sq, 'achsen-0')).toBe(2);
  });

  it('"verschoben" feedback names the right directions: links/rechts for a senkrechte, oben/unten for a waagerechte Linie', () => {
    const seen = new Set<string>();
    for (const ex of samples(symmetrieSkill, 2, 600)) {
      if (ex.answer.kind !== 'choice' || !/:(vertical|horizontal):/.test(ex.key)) continue;
      const why = ex.answer.options.map((o) => o.whyWrong ?? '').find((w) => w.includes('verschoben'));
      if (!why) continue;
      const o = gridOf(ex).axis!.orientation;
      seen.add(o);
      if (o === 'horizontal') expect(why).toMatch(/oben außen.*unten außen/);
      else expect(why).toMatch(/links außen.*rechts außen/);
    }
    expect(seen).toEqual(new Set(['vertical', 'horizontal']));
  });

  it('Bandornament: the correct pattern continues the rule; the wrong ones are mirrored or upside down', () => {
    const kinds = new Set<string>();
    const norm = (cells: readonly Cell[]) => {
      const mx = Math.min(...cells.map((c) => c[0]));
      const my = Math.min(...cells.map((c) => c[1]));
      return cells.map(([x, y]) => [x - mx, y - my]).sort((a, b) => a[1] - b[1] || a[0] - b[0]).map((c) => c.join('.')).join('-');
    };
    for (const ex of samples(symmetrieSkill, 2, 600)) {
      if (!ex.key.includes(':band:')) continue;
      const kind = ex.key.split(':')[3];
      kinds.add(kind);
      if (ex.answer.kind !== 'choice') throw new Error('choice');
      // recover the three motifs from the band: columns are separated by empty columns
      const band = gridOf(ex).cells;
      const xs = [...new Set(band.map((c) => c[0]))].sort((a, b) => a - b);
      const groups: number[][] = [];
      xs.forEach((x) => (groups.length && x === groups[groups.length - 1].at(-1)! + 1 ? groups[groups.length - 1].push(x) : groups.push([x])));
      const motifs = groups.map((g) => norm(band.filter((c) => g.includes(c[0]))));
      expect(motifs.length).toBe(3);
      expect(motifs[2]).toBe(motifs[0]);
      if (kind === 'verschieben') expect(motifs[1]).toBe(motifs[0]);
      else expect(motifs[1]).not.toBe(motifs[0]);
      const all = ex.answer.options.map((o) => {
        if (o.visual?.type !== 'grid') throw new Error('grid option expected');
        return norm(o.visual.cells);
      });
      // the fourth motif is like the second (verschieben: all equal; spiegeln: every other one mirrored)
      expect(all[ex.answer.correct]).toBe(motifs[1]);
      expect(new Set(all).size).toBe(3);
    }
    expect(kinds).toEqual(new Set(['verschieben', 'spiegeln']));
  });

  it('Kreis: "Unendlich viele" is correct', () => {
    const ex = samples(symmetrieSkill, 3, 600).find((e) => e.key.endsWith(':achsen:kreis'))!;
    if (ex.answer.kind !== 'choice') throw new Error('choice');
    expect(ex.answer.options[ex.answer.correct].label).toBe('Unendlich viele');
  });
});
