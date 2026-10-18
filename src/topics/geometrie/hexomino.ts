/**
 * Hexominoes and cube nets.
 * - All 35 free hexominoes are enumerated programmatically (grow from the monomino, canonicalise
 *   under the 8 grid symmetries).
 * - Whether a hexomino folds into a cube is decided by a folding simulation: a cube is rolled
 *   across the cells; each cell receives the cube face that touches it. A net folds into a cube
 *   iff the six cells receive six different faces.
 */
import type { Cell } from '../../core/types';
import { cellSet, cellsId, ck, normalize, transform } from './grid';

/** Canonical id of a free polyomino: smallest normalised cell list over all 8 symmetries. */
export function canonicalId(cells: readonly Cell[]): string {
  let best = '';
  for (let t = 0; t < 8; t++) {
    const id = cellsId(transform(cells, t));
    if (best === '' || id < best) best = id;
  }
  return best;
}

function parseId(id: string): Cell[] {
  return id.split('-').map((p) => {
    const [x, y] = p.split('.').map(Number);
    return [x, y] as Cell;
  });
}

const DIRS: readonly Cell[] = [[1, 0], [-1, 0], [0, 1], [0, -1]];

/** All free polyominoes with n cells (n ≤ 7 is fast). Each as normalised canonical cell list. */
export function freePolyominoes(n: number): Cell[][] {
  let level = new Set<string>([cellsId([[0, 0]])]);
  for (let size = 1; size < n; size++) {
    const nextLevel = new Set<string>();
    for (const id of level) {
      const cells = parseId(id);
      const set = cellSet(cells);
      for (const [x, y] of cells) {
        for (const [dx, dy] of DIRS) {
          const c: Cell = [x + dx, y + dy];
          if (set.has(ck(c))) continue;
          nextLevel.add(canonicalId([...cells, c]));
        }
      }
    }
    level = nextLevel;
  }
  return [...level].sort().map(parseId);
}

// ─── Folding simulation ─────────────────────────────────────────────────────

type Vec = readonly [number, number, number];

/** Body faces of the cube and their initial outward normals (z = up, the cube sits on cell 0). */
const FACE_NORMALS: readonly Vec[] = [
  [1, 0, 0], // 0 east
  [-1, 0, 0], // 1 west
  [0, 1, 0], // 2 south (grid y grows downwards)
  [0, -1, 0], // 3 north
  [0, 0, 1], // 4 top
  [0, 0, -1], // 5 bottom
];

/**
 * For a cube net and three cells whose sides meet at a corner: true if the cube folded from the drawn net
 * (printed side outside) can be turned so that `front` faces the viewer, `top` is on top and `side` is on
 * the right (seen from front-right-above, like SolidVisual draws a Würfel). Otherwise the mirror order fits
 * (swap two of them).
 *
 * foldFaces rolls a cube over the drawing like a stamp. That cube is the mirror image of the paper cube
 * (unfolding a stamped cube with the colours on top gives the mirrored net), and its frame (x east,
 * y south, z up) is left-handed. Both flips together: the paper cube shows the order iff side × top = front
 * in this frame. (Checked against an independent paper-folding model in wuerfelnetze.test.ts.)
 */
export function cornerFits(cells: readonly Cell[], front: number, top: number, side: number): boolean {
  const faces = foldFaces(cells);
  const [f, t, s] = [FACE_NORMALS[faces[front]], FACE_NORMALS[faces[top]], FACE_NORMALS[faces[side]]];
  const cross: Vec = [s[1] * t[2] - s[2] * t[1], s[2] * t[0] - s[0] * t[2], s[0] * t[1] - s[1] * t[0]];
  return cross[0] === f[0] && cross[1] === f[1] && cross[2] === f[2];
}

/** Face ids that are opposite on the cube. */
export const OPPOSITE: readonly number[] = [1, 0, 3, 2, 5, 4];

/** Rolling the cube one cell in direction (dx, dy): the face pointing that way becomes the bottom. */
function roll(v: Vec, dx: number, dy: number): Vec {
  const [x, y, z] = v;
  if (dx === 1) return [z, y, -x]; // +x → −z, −z → −x, +z → +x
  if (dx === -1) return [-z, y, x];
  if (dy === 1) return [x, z, -y];
  return [x, -z, y];
}

function faceDown(normals: readonly Vec[]): number {
  return normals.findIndex((n) => n[0] === 0 && n[1] === 0 && n[2] === -1);
}

/**
 * Fold: returns the cube face id (0–5) that each cell lands on, in the order of `cells`.
 * Cells are visited breadth-first from cells[0]; with a cycle (2×2 block) the first visit wins.
 */
export function foldFaces(cells: readonly Cell[]): number[] {
  const index = new Map(cells.map((c, i) => [ck(c), i]));
  const faces: number[] = new Array(cells.length).fill(-1);
  const orient: (readonly Vec[] | null)[] = new Array(cells.length).fill(null);
  orient[0] = FACE_NORMALS;
  faces[0] = faceDown(FACE_NORMALS);
  const queue = [0];
  while (queue.length) {
    const i = queue.shift()!;
    const [x, y] = cells[i];
    for (const [dx, dy] of DIRS) {
      const j = index.get(ck([x + dx, y + dy]));
      if (j === undefined || orient[j]) continue;
      const o = orient[i]!.map((n) => roll(n, dx, dy));
      orient[j] = o;
      faces[j] = faceDown(o);
      queue.push(j);
    }
  }
  return faces;
}

/** true iff the hexomino folds into a cube (six different faces). */
export function isCubeNet(cells: readonly Cell[]): boolean {
  if (cells.length !== 6) return false;
  return new Set(foldFaces(cells)).size === 6;
}

/** Pairs of cell indices that land on the same cube face (overlap when folding). */
export function overlappingPairs(cells: readonly Cell[]): [number, number][] {
  const faces = foldFaces(cells);
  const out: [number, number][] = [];
  for (let i = 0; i < faces.length; i++) for (let j = i + 1; j < faces.length; j++) if (faces[i] === faces[j]) out.push([i, j]);
  return out;
}

/** For a cube net: index of the cell opposite to each cell. */
export function oppositeCells(cells: readonly Cell[]): number[] {
  const faces = foldFaces(cells);
  return faces.map((f) => faces.indexOf(OPPOSITE[f]));
}

/** Longest straight line of cells (row or column). */
export function longestLine(cells: readonly Cell[]): number {
  const set = cellSet(cells);
  let best = 0;
  for (const [x, y] of cells) {
    for (const [dx, dy] of [[1, 0], [0, 1]] as const) {
      if (set.has(ck([x - dx, y - dy]))) continue;
      let len = 0;
      while (set.has(ck([x + dx * len, y + dy * len]))) len++;
      best = Math.max(best, len);
    }
  }
  return best;
}

export function hasSquareBlock(cells: readonly Cell[]): boolean {
  const set = cellSet(cells);
  return cells.some(([x, y]) => set.has(ck([x + 1, y])) && set.has(ck([x, y + 1])) && set.has(ck([x + 1, y + 1])));
}

export interface Hexomino {
  /** Stable index 0–34 (sorted canonical ids). */
  id: number;
  cells: Cell[];
  net: boolean;
}

let cache: Hexomino[] | null = null;

/** The 35 free hexominoes with their cube-net flag (computed once). */
export function hexominoes(): Hexomino[] {
  if (!cache) {
    cache = freePolyominoes(6).map((cells, id) => ({ id, cells, net: isCubeNet(cells) }));
  }
  return cache;
}

/** A hexomino in orientation t (0–7), normalised. */
export function oriented(h: Hexomino, t: number): Cell[] {
  return normalize(transform(h.cells, t));
}
