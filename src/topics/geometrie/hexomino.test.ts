import { describe, expect, it } from 'vitest';
import type { Cell } from '../../core/types';
import { canonicalId, foldFaces, freePolyominoes, hasSquareBlock, hexominoes, isCubeNet, longestLine, oppositeCells, overlappingPairs } from './hexomino';
import { transform } from './grid';

describe('polyomino enumeration', () => {
  it('finds the known numbers of free polyominoes (1, 1, 2, 5, 12, 35)', () => {
    expect([1, 2, 3, 4, 5, 6].map((n) => freePolyominoes(n).length)).toEqual([1, 1, 2, 5, 12, 35]);
  });

  it('canonical ids are invariant under all 8 symmetries', () => {
    for (const h of hexominoes()) {
      const id = canonicalId(h.cells);
      for (let t = 0; t < 8; t++) expect(canonicalId(transform(h.cells, t))).toBe(id);
    }
  });
});

describe('cube-net folding simulation', () => {
  it('exactly 11 of the 35 hexominoes fold into a cube', () => {
    expect(hexominoes().filter((h) => h.net).length).toBe(11);
  });

  it('the cross is a net, the 2×3 block and the straight line are not', () => {
    const cross: Cell[] = [[1, 0], [0, 1], [1, 1], [2, 1], [3, 1], [1, 2]];
    const block: Cell[] = [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1]];
    const line: Cell[] = [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0]];
    expect(isCubeNet(cross)).toBe(true);
    expect(isCubeNet(block)).toBe(false);
    expect(isCubeNet(line)).toBe(false);
  });

  it('net-ness does not depend on orientation', () => {
    for (const h of hexominoes()) {
      for (let t = 0; t < 8; t++) expect(isCubeNet(transform(h.cells, t))).toBe(h.net);
    }
  });

  it('every net has the 1-4-1, 2-3-1, 2-2-2 or 3-3 structure (longest line 2–4) and no 2×2 block', () => {
    const nets = hexominoes().filter((h) => h.net);
    nets.forEach((h) => {
      expect(hasSquareBlock(h.cells)).toBe(false);
      expect(longestLine(h.cells)).toBeGreaterThanOrEqual(2);
      expect(longestLine(h.cells)).toBeLessThanOrEqual(4);
    });
    // 6 nets of type 1-4-1 (row of four)
    expect(nets.filter((h) => longestLine(h.cells) === 4).length).toBe(6);
  });

  it('in the cross net, the arms opposite each other land on opposite faces', () => {
    // .X..
    // XXXX
    // .X..
    const cross: Cell[] = [[1, 0], [0, 1], [1, 1], [2, 1], [3, 1], [1, 2]];
    const opp = oppositeCells(cross);
    // centre (index 2) is opposite to the far end of the row (index 4)
    expect(opp[2]).toBe(4);
    // top arm (0) opposite bottom arm (5)
    expect(opp[0]).toBe(5);
    // left arm (1) opposite the cell right of the centre (3)
    expect(opp[1]).toBe(3);
  });

  it('a 5-in-a-row shape makes the first and fifth square overlap', () => {
    const cells: Cell[] = [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [0, 1]];
    const pairs = overlappingPairs(cells);
    expect(pairs).toContainEqual([0, 4]);
    expect(new Set(foldFaces(cells)).size).toBeLessThan(6);
  });
});
