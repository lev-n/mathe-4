import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import type { Cell, Exercise } from '../../core/types';
import { hasSquareBlock, hexominoes, longestLine, overlappingPairs } from './hexomino';
import { wuerfelnetzeSkill } from './wuerfelnetze';
import { numberValue, samples } from './test-utils';

describeSkill(wuerfelnetzeSkill, { minDistinct: { 1: 40, 2: 60, 3: 80 } });

/**
 * Independent cube-net check (different method from the generator): place the cube on the first
 * square and track the face labels on the six sides as a tuple [bottom, top, north, south, west, east].
 */
function independentNet(cells: readonly Cell[]): { ok: boolean; faceOf: number[] } {
  type State = [number, number, number, number, number, number]; // B T N S W E
  const roll = (s: State, dx: number, dy: number): State => {
    const [B, T, N, S, W, E] = s;
    if (dx === 1) return [E, W, N, S, B, T];
    if (dx === -1) return [W, E, N, S, T, B];
    if (dy === 1) return [S, N, B, T, W, E];
    return [N, S, T, B, W, E];
  };
  const idx = new Map(cells.map((c, i) => [c.join(), i]));
  const state: (State | null)[] = cells.map(() => null);
  state[0] = [0, 1, 2, 3, 4, 5];
  const queue = [0];
  while (queue.length) {
    const i = queue.shift()!;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const j = idx.get(`${cells[i][0] + dx},${cells[i][1] + dy}`);
      if (j === undefined || state[j]) continue;
      state[j] = roll(state[i]!, dx, dy);
      queue.push(j);
    }
  }
  const faceOf = state.map((s) => s![0]);
  return { ok: new Set(faceOf).size === 6, faceOf };
}
const OPP = [1, 0, 3, 2, 5, 4];

type V3 = [number, number, number];
const neg = (v: V3): V3 => [0 - v[0], 0 - v[1], 0 - v[2]];
const same = (a: V3, b: V3) => a.every((x, i) => x === b[i]);

/**
 * Paper model, independent of the generator's rolling stamp: hold the printed net in front of you with cell 0
 * facing you and fold every flap backwards, so the print stays outside. Right-handed frame: x right, y up,
 * z towards the viewer. Returns the outward normal of every cell (drawing y grows downwards).
 */
function paperFold(cells: readonly Cell[]): V3[] {
  const idx = new Map(cells.map((c, i) => [c.join(), i]));
  const frame: ({ n: V3; r: V3; u: V3 } | null)[] = cells.map(() => null);
  frame[0] = { n: [0, 0, 1], r: [1, 0, 0], u: [0, 1, 0] };
  const queue = [0];
  while (queue.length) {
    const i = queue.shift()!;
    const { n, r, u } = frame[i]!;
    const moves: [number, number, { n: V3; r: V3; u: V3 }][] = [
      [1, 0, { n: r, r: neg(n), u }],
      [-1, 0, { n: neg(r), r: n, u }],
      [0, -1, { n: u, r, u: neg(n) }],
      [0, 1, { n: neg(u), r, u: n }],
    ];
    for (const [dx, dy, next] of moves) {
      const j = idx.get(`${cells[i][0] + dx},${cells[i][1] + dy}`);
      if (j === undefined || frame[j]) continue;
      frame[j] = next;
      queue.push(j);
    }
  }
  return frame.map((f) => f!.n);
}

/** The 24 rotations of the cube as signed permutation matrices with determinant +1. */
const ROTATIONS: ((v: V3) => V3)[] = (() => {
  const out: ((v: V3) => V3)[] = [];
  const perms = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]];
  const parity = [1, -1, -1, 1, 1, -1];
  perms.forEach((p, k) => {
    for (let signs = 0; signs < 8; signs++) {
      const sg = [signs & 1 ? -1 : 1, signs & 2 ? -1 : 1, signs & 4 ? -1 : 1];
      if (parity[k] * sg[0] * sg[1] * sg[2] !== 1) continue;
      out.push((v) => [sg[0] * v[p[0]], sg[1] * v[p[1]], sg[2] * v[p[2]]]);
    }
  });
  return out;
})();

/** The paper cube can be turned so that these cells are in front, on top and on the right. */
function paperShows(cells: readonly Cell[], front: number, top: number, side: number): boolean {
  const n = paperFold(cells);
  return ROTATIONS.some((R) => same(R(n[front]), [0, 0, 1]) && same(R(n[top]), [0, 1, 0]) && same(R(n[side]), [1, 0, 0]));
}

function netCells(ex: Exercise): Cell[] {
  if (!ex.visual || ex.visual.type !== 'net') throw new Error('net visual expected');
  return ex.visual.cells;
}

describe('Würfelnetze – independent checks', () => {
  it('paper model: a cross folded backwards shows the drawn neighbours on top and on the right', () => {
    //    U
    //  L C R
    //    D
    //    B
    const cells: Cell[] = [[1, 1], [1, 0], [0, 1], [2, 1], [1, 2], [1, 3]];
    expect(paperFold(cells)).toEqual([[0, 0, 1], [0, 1, 0], [-1, 0, 0], [1, 0, 0], [0, -1, 0], [0, 0, -1]]);
    expect(paperShows(cells, 0, 1, 3)).toBe(true); // C front, U top, R right
    expect(paperShows(cells, 0, 1, 2)).toBe(false); // the mirror image
  });

  it('the independent rolling check also finds exactly 11 nets', () => {
    expect(hexominoes().filter((h) => independentNet(h.cells).ok).length).toBe(11);
    hexominoes().forEach((h) => expect(independentNet(h.cells).ok).toBe(h.net));
  });

  it('Stufe 1 and 2: Ja exactly for nets; Stufe 1 only uses the easy cases', () => {
    for (const stufe of [1, 2] as const) {
      for (const ex of samples(wuerfelnetzeSkill, stufe)) {
        if (ex.answer.kind !== 'choice') throw new Error('choice');
        if (ex.key.includes(':janein:')) {
          const cells = netCells(ex);
          expect(cells.length).toBe(6);
          const net = independentNet(cells).ok;
          expect(ex.answer.options[ex.answer.correct].label.startsWith('Ja')).toBe(net);
          if (stufe === 1) {
            if (net) expect(longestLine(cells)).toBe(4);
            else expect(hasSquareBlock(cells) || longestLine(cells) >= 5).toBe(true);
          }
        } else {
          // pick the one net out of three
          const nets = ex.answer.options.map((o) => (o.visual && o.visual.type === 'net' ? independentNet(o.visual.cells).ok : false));
          expect(nets.filter(Boolean).length).toBe(1);
          expect(nets[ex.answer.correct]).toBe(true);
        }
      }
    }
  });

  it('both answers occur on Stufe 1, and shapes appear in different orientations', () => {
    const ex = samples(wuerfelnetzeSkill, 1);
    const labels = new Set(ex.map((e) => (e.answer.kind === 'choice' ? e.answer.options[e.answer.correct].label.slice(0, 2) : '')));
    expect(labels).toEqual(new Set(['Ja', 'Ne']));
    const shapes = new Set(ex.map((e) => JSON.stringify(netCells(e))));
    expect(shapes.size).toBeGreaterThan(40);
  });

  it('Stufe 3: opposite faces, dice (sum 7) and overlapping squares agree with the independent fold', () => {
    const kinds = new Set<string>();
    for (const ex of samples(wuerfelnetzeSkill, 3, 400)) {
      const kind = ex.key.split(':')[2];
      kinds.add(kind);
      if (kind === 'farbwuerfel') {
        // net ↔ coloured cube: only the correct net folds so that the three seen colours meet at a corner
        if (ex.answer.kind !== 'choice') throw new Error('choice');
        const seenColours = /siehst du (\S+), (\S+) und (\S+) zugleich/.exec(ex.context ?? '')!.slice(1);
        const WORD: Record<string, string> = { rot: 'Rot', blau: 'Blau', gelb: 'Gelb', gruen: 'Grün', lila: 'Lila', orange: 'Orange' };
        const fits = ex.answer.options.map((o) => {
          if (o.visual?.type !== 'net') throw new Error('net option');
          const { ok, faceOf: f } = independentNet(o.visual.cells);
          expect(ok).toBe(true);
          const idx = seenColours.map((w) => o.visual!.type === 'net' ? o.visual!.faces!.findIndex((c) => WORD[c!] === w) : -1);
          idx.forEach((i) => expect(i).toBeGreaterThanOrEqual(0));
          // pairwise not opposite ⇔ the three sides meet at a corner
          return idx.every((i, a) => idx.every((j, b) => a === b || OPP[f[i]] !== f[j]));
        });
        expect(fits.filter(Boolean).length).toBe(1);
        expect(fits[ex.answer.correct]).toBe(true);
        // the coloured cube in the picture is exactly what the correct net folds into (not its mirror image)
        if (ex.visual?.type !== 'solid' || !ex.visual.faceColors) throw new Error('coloured cube picture expected');
        const { front, top, side } = ex.visual.faceColors;
        const correct = ex.answer.options[ex.answer.correct].visual!;
        if (correct.type !== 'net') throw new Error('net');
        const cellOf = (c: string) => correct.faces!.indexOf(c);
        expect(new Set([front, top, side].map((c) => WORD[c]))).toEqual(new Set(seenColours));
        expect(paperShows(correct.cells, cellOf(front), cellOf(top), cellOf(side))).toBe(true);
        expect(paperShows(correct.cells, cellOf(front), cellOf(side), cellOf(top))).toBe(false);
        continue;
      }
      const cells = netCells(ex);
      const { faceOf } = independentNet(cells);
      const faces = ex.visual?.type === 'net' ? ex.visual.faces! : [];
      if (kind === 'gegenueber') {
        if (ex.answer.kind !== 'choice') throw new Error('choice');
        const asked = ex.visual?.type === 'net' ? ex.visual.highlight![0] : -1;
        const opp = faceOf.indexOf(OPP[faceOf[asked]]);
        const correctLabel = ex.answer.options[ex.answer.correct].label;
        const name = faces[opp]!;
        const shown = name.length === 1 ? name : name === 'gruen' ? 'Grün' : name[0].toUpperCase() + name.slice(1);
        expect(correctLabel).toBe(shown);
      } else if (kind === 'wuerfel') {
        const q = faces.indexOf('?');
        const opp = faceOf.indexOf(OPP[faceOf[q]]);
        expect(faces[opp]).not.toBeNull();
        expect(numberValue(ex)).toBe(7 - Number(faces[opp]));
        // the shown numbers are consistent with a real die: opposite shown numbers sum to 7
        faces.forEach((f, i) => {
          const j = faceOf.indexOf(OPP[faceOf[i]]);
          if (f && f !== '?' && faces[j] && faces[j] !== '?') expect(Number(f) + Number(faces[j])).toBe(7);
        });
      } else if (kind === 'aufeinander') {
        if (ex.answer.kind !== 'choice') throw new Error('choice');
        const pairs: [number, number][] = [];
        for (let i = 0; i < 6; i++) for (let j = i + 1; j < 6; j++) if (faceOf[i] === faceOf[j]) pairs.push([i, j]);
        expect(pairs.length).toBe(1);
        const label = [faces[pairs[0][0]], faces[pairs[0][1]]].sort().join(' und ');
        expect(ex.answer.options[ex.answer.correct].label).toBe(label);
      } else if (kind === 'warum') {
        expect(independentNet(cells).ok).toBe(false);
      }
    }
    expect(kinds).toEqual(new Set(['gegenueber', 'wuerfel', 'farbwuerfel', 'aufeinander', 'warum']));
  });

  it('there are tree-shaped non-nets with exactly one overlapping pair', () => {
    const pool = hexominoes().filter((h) => !h.net && !hasSquareBlock(h.cells) && overlappingPairs(h.cells).length === 1);
    expect(pool.length).toBeGreaterThanOrEqual(3);
  });

  it('the overlap texts match the marked picture (also for the straight strip and the U shape: 2 pairs, 2 open sides)', () => {
    const WORD: Record<string, number> = { Eine: 1, Zwei: 2, Drei: 3 };
    const seen = new Set<string>();
    const all = [...samples(wuerfelnetzeSkill, 1, 400), ...samples(wuerfelnetzeSkill, 2, 400), ...samples(wuerfelnetzeSkill, 3, 400)];
    for (const ex of all) {
      if (ex.answer.kind !== 'choice') continue;
      const kind = ex.key.split(':')[2];
      if (kind !== 'janein' && kind !== 'warum') continue;
      const step = ex.steps.find((st) => typeof st !== 'string' && st.visual?.type === 'net');
      if (!step || typeof step === 'string' || step.visual?.type !== 'net') throw new Error('net step expected');
      const labels = step.visual.faces!;
      if (new Set(labels).size === 6) continue; // a real net
      const marked = step.visual.highlight ?? [];
      const open = 6 - new Set(labels).size;
      const text = [...ex.steps.map((st) => (typeof st === 'string' ? st : st.text)), ex.answer.options[ex.answer.correct].label].join(' ');
      const openMatch = /(Eine|Zwei|Drei) (?:Würfelseite|Seite)n? (?:bleibt|bleiben) offen/.exec(text);
      expect(openMatch, text).not.toBeNull();
      expect(WORD[openMatch![1]], text).toBe(open);
      if (kind === 'janein') {
        expect(text).toContain(marked.length === 4 ? 'Zwei Paare von Quadraten' : marked.length === 3 ? 'Drei Quadrate' : 'Zwei Quadrate');
      } else {
        // the chosen reason is true for this shape
        expect(ex.answer.options[ex.answer.correct].label).toContain(open === 1 ? 'Eine Würfelseite bleibt offen' : `${open === 2 ? 'Zwei' : 'Drei'} Würfelseiten bleiben offen`);
      }
      seen.add(String(open));
    }
    expect(seen).toEqual(new Set(['1', '2']));
  });

  it('a row of six is called a row of six, not five', () => {
    const strip = samples(wuerfelnetzeSkill, 1, 600).find((e) => e.key.includes(':janein:') && longestLine(netCells(e)) === 6)!;
    if (strip.answer.kind !== 'choice') throw new Error('choice');
    const why = strip.answer.options.find((o) => o.whyWrong)!.whyWrong!;
    expect(why).toMatch(/^Sechs Quadrate liegen in einer Reihe/);
  });

  it('overlap task: wrong pairs never share an edge (those can never lie on each other)', () => {
    let n = 0;
    for (const ex of samples(wuerfelnetzeSkill, 3, 400)) {
      if (!ex.key.includes(':aufeinander:') || ex.answer.kind !== 'choice' || ex.visual?.type !== 'net') continue;
      const v = ex.visual;
      for (const o of ex.answer.options) {
        if (!o.whyWrong) continue;
        const [a, b] = o.label.split(' und ').map((l) => v.cells[v.faces!.indexOf(l)]);
        expect(Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]), o.label).toBeGreaterThan(1);
        n++;
      }
    }
    expect(n).toBeGreaterThan(30);
  });

  it('dice bug: answering 7 − (a neighbouring number) gives a targeted hint', () => {
    const ex = samples(wuerfelnetzeSkill, 3, 400).find((e) => e.key.includes(':wuerfel:') && (e.bugs ?? []).some((b) => b.id.startsWith('nachbar-')))!;
    const bug = ex.bugs!.find((b) => b.id.startsWith('nachbar-'))!;
    const n = Number(bug.id.split('-')[1]);
    expect(bug.match).toBe(7 - n);
    expect(bug.hint).toMatch(/gegenüber/);
  });
});
