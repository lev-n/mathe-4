import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import type { Exercise } from '../../core/types';
import { frontView, hiddenCubes, sideView, wuerfelgebaeudeSkill } from './wuerfelgebaeude';
import { bugValue, numberValue, samples } from './test-utils';

describeSkill(wuerfelgebaeudeSkill, { minDistinct: { 1: 40, 2: 60, 3: 60 } });

function heightsOf(ex: Exercise): number[][] {
  if (!ex.visual || ex.visual.type !== 'cubeBuilding') throw new Error('cubeBuilding visual expected');
  return ex.visual.heights;
}
const sum = (h: number[][]) => h.flat().reduce((a, b) => a + b, 0);

/** Independent visibility: a cube is hidden iff the cubes in front, to the right and on top exist. */
function hiddenIndependent(h: number[][]): number {
  let n = 0;
  h.forEach((row, r) => row.forEach((t, c) => {
    for (let z = 0; z < t; z++) {
      const covered = (h[r + 1]?.[c] ?? 0) > z && (row[c + 1] ?? 0) > z && z < t - 1;
      if (covered) n++;
    }
  }));
  return n;
}

describe('Würfelgebäude – independent checks', () => {
  it('views: front = highest per column, side (von rechts) = highest per row from front to back', () => {
    const h = [[3, 0, 1], [1, 2, 0]];
    expect(frontView(h)).toEqual([3, 2, 1]);
    expect(sideView(h)).toEqual([2, 3]);
    expect(hiddenCubes([[3, 2], [2, 1]])).toBe(2); // the two lower cubes of the back-left tower
    expect(hiddenCubes([[3, 3], [3, 3]])).toBe(2);
  });

  it('Stufe 1 and 2: counts equal the sum of the heights', () => {
    for (const stufe of [1, 2] as const) {
      for (const ex of samples(wuerfelgebaeudeSkill, stufe)) {
        const h = heightsOf(ex);
        if (ex.key.includes(':bauplan-lesen:')) {
          const [, rc] = /:(\d+\.\d+)$/.exec(ex.key)!;
          const [r, c] = rc.split('.').map(Number);
          expect(numberValue(ex)).toBe(h[r][c]);
          continue;
        }
        expect(numberValue(ex)).toBe(sum(h));
        if (stufe === 1) h.flat().forEach((v) => expect(v).toBeGreaterThanOrEqual(1));
      }
    }
  });

  it('Stufe 2: drawn buildings never grow towards the front or the right and hide at least one cube', () => {
    for (const ex of samples(wuerfelgebaeudeSkill, 2)) {
      if (!ex.key.includes(':versteckt:')) continue;
      const h = heightsOf(ex);
      h.forEach((row, r) => row.forEach((v, c) => {
        if (r + 1 < h.length) expect(h[r + 1][c]).toBeLessThanOrEqual(v);
        if (c + 1 < row.length) expect(row[c + 1]).toBeLessThanOrEqual(v);
      }));
      const hidden = hiddenIndependent(h);
      expect(hidden).toBeGreaterThanOrEqual(1);
      expect(bugValue(ex, 'nur-sichtbare')).toBe(sum(h) - hidden);
    }
  });

  it('Stufe 3: the right view / plan / missing count', () => {
    const kinds = new Set<string>();
    for (const ex of samples(wuerfelgebaeudeSkill, 3)) {
      const kind = ex.key.split(':')[2];
      kinds.add(kind);
      const h = heightsOf(ex);
      if (kind === 'ansicht') {
        if (ex.answer.kind !== 'choice') throw new Error('choice');
        const side = ex.key.split(':')[3] === 'side';
        const want = side ? h.map((row) => Math.max(...row)).reverse() : h[0].map((_, c) => Math.max(...h.map((row) => row[c])));
        const silhouettes = ex.answer.options.map((o) => {
          const v = o.visual!;
          if (v.type !== 'cubeBuilding') throw new Error('view');
          return side ? v.heights.map((r) => r[0]).reverse() : v.heights[0];
        });
        expect(silhouettes[ex.answer.correct]).toEqual(want);
        expect(new Set(silhouettes.map((s) => s.join())).size).toBe(silhouettes.length);
      } else if (kind === 'ansicht-oben') {
        if (ex.answer.kind !== 'choice') throw new Error('choice');
        // independent: from above you see exactly the fields with at least one cube
        const want = h.map((row) => row.map((v) => (v > 0 ? 1 : 0)));
        const tops = ex.answer.options.map((o) => {
          const v = o.visual!;
          if (v.type !== 'cubeBuilding' || v.view !== 'top') throw new Error('top view expected');
          return v.heights.map((row) => row.map((x) => (x > 0 ? 1 : 0)));
        });
        expect(tops[ex.answer.correct]).toEqual(want);
        expect(new Set(tops.map((t) => JSON.stringify(t))).size).toBe(tops.length);
        expect(h.flat().some((v) => v === 0)).toBe(true);
      } else if (kind === 'bauplan-finden') {
        if (ex.answer.kind !== 'choice') throw new Error('choice');
        const v = ex.answer.options[ex.answer.correct].visual!;
        expect(v.type === 'cubeBuilding' && v.heights).toEqual(h);
      } else if (kind === 'quader') {
        const R = h.length;
        const C = h[0].length;
        const H = Math.max(...h.flat());
        expect(ex.prompt).toContain(`${H} Schichten`);
        expect(numberValue(ex)).toBe(R * C * H - sum(h));
        expect(numberValue(ex)).toBeGreaterThan(0);
      }
    }
    expect(kinds).toEqual(new Set(['ansicht', 'ansicht-oben', 'bauplan-finden', 'quader']));
  });

  it('bug "nur die Türme gezählt" on a known Bauplan', () => {
    const ex = samples(wuerfelgebaeudeSkill, 1, 400).find((e) => e.key.includes(':bauplan:'))!;
    const h = heightsOf(ex);
    const fields = h.flat().length;
    expect(bugValue(ex, 'felder')).toBe(fields === sum(h) ? undefined : fields);
  });
});
