/**
 * Pure helpers for figures on a square grid (polyominoes): normalising, transforming,
 * area/perimeter, outline tracing and spoken descriptions. Used by the geometry generators.
 * Coordinates: x = column (0 = left), y = row (0 = top), like Cell in core/types.
 */
import type { Cell, Rng } from '../../core/types';

export type HalfCorner = 'tl' | 'tr' | 'bl' | 'br';
export interface HalfCell {
  cell: Cell;
  corner: HalfCorner;
}

export const ck = (c: Cell): string => `${c[0]},${c[1]}`;

export function cellSet(cells: readonly Cell[]): Set<string> {
  return new Set(cells.map(ck));
}

/** Sorted by row, then column. */
export function sortCells(cells: readonly Cell[]): Cell[] {
  return [...cells].sort((a, b) => a[1] - b[1] || a[0] - b[0]);
}

/** Compact canonical text for exercise keys, e.g. '0.0-1.0-1.1'. */
export function cellsId(cells: readonly Cell[]): string {
  return sortCells(cells)
    .map((c) => `${c[0]}.${c[1]}`)
    .join('-');
}

export interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  w: number;
  h: number;
}

export function bounds(cells: readonly Cell[]): Bounds {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [x, y] of cells) {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
  return { minX, minY, maxX, maxY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

export function shift(cells: readonly Cell[], dx: number, dy: number): Cell[] {
  return cells.map(([x, y]) => [x + dx, y + dy] as Cell);
}

/** Move to the origin and sort. */
export function normalize(cells: readonly Cell[]): Cell[] {
  const b = bounds(cells);
  return sortCells(shift(cells, -b.minX, -b.minY));
}

/** The 8 symmetries of the square grid (t = 0 … 7), followed by normalisation. */
export function transform(cells: readonly Cell[], t: number): Cell[] {
  const f = (x: number, y: number): Cell => {
    switch (t % 8) {
      case 0: return [x, y];
      case 1: return [-y, x];
      case 2: return [-x, -y];
      case 3: return [y, -x];
      case 4: return [-x, y];
      case 5: return [x, -y];
      case 6: return [y, x];
      default: return [-y, -x];
    }
  };
  return normalize(cells.map(([x, y]) => f(x, y)));
}

const DIRS: readonly Cell[] = [[1, 0], [-1, 0], [0, 1], [0, -1]];

export function isConnected(cells: readonly Cell[]): boolean {
  if (cells.length === 0) return false;
  const set = cellSet(cells);
  const seen = new Set<string>([ck(cells[0])]);
  const stack: Cell[] = [cells[0]];
  while (stack.length) {
    const [x, y] = stack.pop()!;
    for (const [dx, dy] of DIRS) {
      const n: Cell = [x + dx, y + dy];
      const k = ck(n);
      if (set.has(k) && !seen.has(k)) {
        seen.add(k);
        stack.push(n);
      }
    }
  }
  return seen.size === set.size;
}

/** true if some empty cell is enclosed by the figure (not reachable from outside the bounding box). */
export function hasHole(cells: readonly Cell[]): boolean {
  const set = cellSet(cells);
  const b = bounds(cells);
  const inBox = (x: number, y: number) => x >= b.minX - 1 && x <= b.maxX + 1 && y >= b.minY - 1 && y <= b.maxY + 1;
  const start: Cell = [b.minX - 1, b.minY - 1];
  const seen = new Set<string>([ck(start)]);
  const stack: Cell[] = [start];
  while (stack.length) {
    const [x, y] = stack.pop()!;
    for (const [dx, dy] of DIRS) {
      const n: Cell = [x + dx, y + dy];
      const k = ck(n);
      if (inBox(n[0], n[1]) && !set.has(k) && !seen.has(k)) {
        seen.add(k);
        stack.push(n);
      }
    }
  }
  const boxCells = (b.w + 2) * (b.h + 2);
  return seen.size + set.size < boxCells;
}

/** true if two cells touch only at a corner without a shared neighbour (makes outlines ambiguous). */
export function hasPinch(cells: readonly Cell[]): boolean {
  const set = cellSet(cells);
  for (const [x, y] of cells) {
    const a = set.has(ck([x + 1, y]));
    const b = set.has(ck([x, y + 1]));
    if (set.has(ck([x + 1, y + 1])) && !a && !b) return true;
    if (set.has(ck([x - 1, y + 1])) && !set.has(ck([x - 1, y])) && !b) return true;
  }
  return false;
}

/** A "nice" figure: connected, no holes, no corner-only contacts. */
export function isSimpleFigure(cells: readonly Cell[]): boolean {
  return isConnected(cells) && !hasHole(cells) && !hasPinch(cells);
}

/** Perimeter in Kästchenlängen: 4 per cell minus 2 per shared edge. */
export function perimeterOf(cells: readonly Cell[]): number {
  const set = cellSet(cells);
  let p = 0;
  for (const [x, y] of cells) {
    for (const [dx, dy] of DIRS) if (!set.has(ck([x + dx, y + dy]))) p++;
  }
  return p;
}

/** Number of cells that touch the outside with at least one edge ("Randkästchen"). */
export function borderCellCount(cells: readonly Cell[]): number {
  const set = cellSet(cells);
  return cells.filter(([x, y]) => DIRS.some(([dx, dy]) => !set.has(ck([x + dx, y + dy])))).length;
}

/**
 * Side lengths when walking once clockwise around a simple figure, starting at the top-left corner
 * of the first cell in the top row. Collinear unit edges are merged. Sum = perimeter.
 */
export function outlineSides(cells: readonly Cell[]): number[] {
  const set = cellSet(cells);
  // Directed unit edges, clockwise around each cell (y grows downwards).
  const next = new Map<string, { to: [number, number]; dir: number }>();
  const add = (fx: number, fy: number, tx: number, ty: number, dir: number) => next.set(`${fx},${fy}`, { to: [tx, ty], dir });
  for (const [x, y] of cells) {
    if (!set.has(ck([x, y - 1]))) add(x, y, x + 1, y, 0); // top, heading right
    if (!set.has(ck([x + 1, y]))) add(x + 1, y, x + 1, y + 1, 1); // right, heading down
    if (!set.has(ck([x, y + 1]))) add(x + 1, y + 1, x, y + 1, 2); // bottom, heading left
    if (!set.has(ck([x - 1, y]))) add(x, y + 1, x, y, 3); // left, heading up
  }
  const first = sortCells(cells)[0];
  const start = `${first[0]},${first[1]}`;
  const sides: number[] = [];
  let cur = start;
  let lastDir = -1;
  let guard = 0;
  do {
    const e = next.get(cur);
    if (!e) throw new Error('outlineSides: figure is not simple');
    if (e.dir === lastDir) sides[sides.length - 1]++;
    else sides.push(1);
    lastDir = e.dir;
    cur = `${e.to[0]},${e.to[1]}`;
    if (++guard > 10000) throw new Error('outlineSides: loop');
  } while (cur !== start);
  return sides;
}

/** Cells per row: [{ y, xs }] sorted top to bottom. */
export function rowsOf(cells: readonly Cell[]): { y: number; xs: number[] }[] {
  const map = new Map<number, number[]>();
  for (const [x, y] of cells) {
    if (!map.has(y)) map.set(y, []);
    map.get(y)!.push(x);
  }
  return [...map.entries()].sort((a, b) => a[0] - b[0]).map(([y, xs]) => ({ y, xs: xs.sort((a, b) => a - b) }));
}

/** Runs of consecutive numbers: [1,2,3,6] → [[1,3],[6,6]]. */
export function runs(xs: readonly number[]): [number, number][] {
  const out: [number, number][] = [];
  for (const x of xs) {
    const last = out[out.length - 1];
    if (last && x === last[1] + 1) last[1] = x;
    else out.push([x, x]);
  }
  return out;
}

function runText([a, b]: [number, number]): string {
  if (a === b) return `Spalte ${a + 1}`;
  if (b === a + 1) return `Spalte ${a + 1} und ${b + 1}`;
  return `Spalte ${a + 1} bis ${b + 1}`;
}

/** Spoken description, row by row (1-based): 'Zeile 1: Spalte 2 bis 5. Zeile 2: Spalte 2 und 3.' */
export function describeCells(cells: readonly Cell[]): string {
  return rowsOf(cells)
    .map(({ y, xs }) => `Zeile ${y + 1}: ${runs(xs).map(runText).join(', ')}`)
    .join('. ');
}

export function describeHalfCells(halves: readonly HalfCell[]): string {
  const where: Record<HalfCorner, string> = { tl: 'oben links', tr: 'oben rechts', bl: 'unten links', br: 'unten rechts' };
  return sortCells(halves.map((h) => h.cell))
    .map((c) => {
      const h = halves.find((x) => x.cell[0] === c[0] && x.cell[1] === c[1])!;
      return `Zeile ${c[1] + 1}, Spalte ${c[0] + 1} (${where[h.corner]})`;
    })
    .join('; ');
}

// ─── Figure builders ────────────────────────────────────────────────────────

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function rectCells(r: Rect): Cell[] {
  const out: Cell[] = [];
  for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) out.push([x, y]);
  return out;
}

export type FigureKind = 'rechteck' | 'L' | 'T' | 'U' | 'frei';

/** A figure made of disjoint rectangles (parts) – used for "zerlegen" steps. */
export interface Figure {
  kind: FigureKind;
  cells: Cell[];
  parts: Rect[];
}

function figureOf(kind: FigureKind, parts: Rect[]): Figure {
  return { kind, parts, cells: normalize(parts.flatMap(rectCells)) };
}

/** Apply a grid symmetry to a figure (cells and parts) and normalise. */
export function transformFigure(f: Figure, t: number): Figure {
  const all = f.parts.flatMap(rectCells);
  const tr = (cells: Cell[]): Cell[] => {
    const map = (x: number, y: number): Cell => {
      switch (t % 8) {
        case 0: return [x, y];
        case 1: return [-y, x];
        case 2: return [-x, -y];
        case 3: return [y, -x];
        case 4: return [-x, y];
        case 5: return [x, -y];
        case 6: return [y, x];
        default: return [-y, -x];
      }
    };
    return cells.map(([x, y]) => map(x, y));
  };
  const moved = tr(all);
  const b = bounds(moved);
  const parts = f.parts.map((p) => {
    const pb = bounds(tr(rectCells(p)));
    return { x: pb.minX - b.minX, y: pb.minY - b.minY, w: pb.w, h: pb.h };
  });
  return { kind: f.kind, parts, cells: normalize(moved) };
}

/** L: W×H rectangle with an a×b corner cut away (top-right before transformation). */
export function lFigure(W: number, H: number, a: number, b: number): Figure {
  // Left block (W−a)×H, right lower block a×(H−b).
  return figureOf('L', [
    { x: 0, y: 0, w: W - a, h: H },
    { x: W - a, y: b, w: a, h: H - b },
  ]);
}

/** T: a bar W×t on top and a centred stem s×h below. */
export function tFigure(W: number, t: number, s: number, h: number): Figure {
  const left = Math.floor((W - s) / 2);
  return figureOf('T', [
    { x: 0, y: 0, w: W, h: t },
    { x: left, y: t, w: s, h },
  ]);
}

/** U: two pillars (p1, p2 wide, H high) and a bottom bar of width a and height H−b between them. */
export function uFigure(p1: number, a: number, p2: number, H: number, b: number): Figure {
  return figureOf('U', [
    { x: 0, y: 0, w: p1, h: H },
    { x: p1, y: b, w: a, h: H - b },
    { x: p1 + a, y: 0, w: p2, h: H },
  ]);
}

export function rectFigure(w: number, h: number): Figure {
  return figureOf('rechteck', [{ x: 0, y: 0, w, h }]);
}

/**
 * Random simple polyomino with n cells inside a maxW × maxH box (grown cell by cell,
 * preferring cells with several neighbours so that figures stay compact).
 */
export function randomPolyomino(rng: Rng, n: number, maxW: number, maxH: number): Cell[] {
  for (let attempt = 0; attempt < 200; attempt++) {
    const cells: Cell[] = [[0, 0]];
    const set = new Set([ck([0, 0])]);
    let ok = true;
    while (cells.length < n) {
      const cand = new Map<string, { c: Cell; nb: number }>();
      for (const [x, y] of cells) {
        for (const [dx, dy] of DIRS) {
          const c: Cell = [x + dx, y + dy];
          const k = ck(c);
          if (set.has(k)) continue;
          const b = bounds([...cells, c]);
          if (b.w > maxW || b.h > maxH) continue;
          const nb = DIRS.filter(([ex, ey]) => set.has(ck([c[0] + ex, c[1] + ey]))).length;
          cand.set(k, { c, nb });
        }
      }
      if (cand.size === 0) {
        ok = false;
        break;
      }
      const list = [...cand.values()];
      const compact = list.filter((v) => v.nb >= 2);
      const pool = compact.length > 0 && rng.chance(0.55) ? compact : list;
      const pick = rng.pick(pool).c;
      cells.push(pick);
      set.add(ck(pick));
    }
    if (ok && isSimpleFigure(cells)) return normalize(cells);
  }
  // Fallback: a compact block (always simple).
  const w = Math.min(maxW, Math.ceil(Math.sqrt(n)));
  const cells: Cell[] = [];
  for (let i = 0; i < n; i++) cells.push([i % w, Math.floor(i / w)]);
  return normalize(cells);
}

/** Mirror a cell across an axis on a grid. */
export function mirrorCell(c: Cell, orientation: 'vertical' | 'horizontal' | 'diagonal', at: number): Cell {
  if (orientation === 'vertical') return [2 * at - 1 - c[0], c[1]];
  if (orientation === 'horizontal') return [c[0], 2 * at - 1 - c[1]];
  return [c[1], c[0]];
}

export function isSymmetric(cells: readonly Cell[], orientation: 'vertical' | 'horizontal' | 'diagonal', at: number): boolean {
  const set = cellSet(cells);
  return cells.every((c) => set.has(ck(mirrorCell(c, orientation, at))));
}

/** Number of cells adjacent (by edge) to the figure that are empty – candidate positions. */
export function emptyNeighbours(cells: readonly Cell[]): Cell[] {
  const set = cellSet(cells);
  const out = new Map<string, Cell>();
  for (const [x, y] of cells) {
    for (const [dx, dy] of DIRS) {
      const c: Cell = [x + dx, y + dy];
      if (!set.has(ck(c))) out.set(ck(c), c);
    }
  }
  return sortCells([...out.values()]);
}
