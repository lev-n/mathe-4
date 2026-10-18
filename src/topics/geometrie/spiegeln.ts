/**
 * Spiegelbild ergänzen: the child switches on Kästchen in a toggle grid (answer kind 'cells').
 * Stufe 1: vertical axis, 3–5 given Kästchen touching the axis.
 * Stufe 2: vertical or horizontal axis, 5–8 Kästchen, given half on either side, sometimes with a gap to the axis.
 * Stufe 3: diagonal axis (Zeile und Spalte tauschen), or both halves partly given ("fehlende Kästchen").
 */
import { fmt } from '../../core/format';
import type { Axis, Cell, Exercise, Rng, SkillDef, Stufe, Visual } from '../../core/types';
import { bounds, cellSet, cellsId, ck, describeCells, emptyNeighbours, mirrorCell, randomPolyomino, shift, sortCells } from './grid';
import { praiseFrom } from './shared';

const ID = 'geometrie.spiegeln';

interface Task {
  width: number;
  height: number;
  axis: Axis;
  given: Cell[];
  solution: Cell[];
  mode: 'haelfte' | 'luecken';
}

function transpose(cells: readonly Cell[]): Cell[] {
  return cells.map(([x, y]) => [y, x] as Cell);
}

/** Half figure left of a vertical axis at x = k, in a 2k × H grid. */
function verticalHalf(rng: Rng, k: number, H: number, n: number, touch: boolean): Cell[] {
  const maxW = touch ? k : k - 1;
  let half = randomPolyomino(rng, n, maxW, H);
  const b = bounds(half);
  const dx = (touch ? k - 1 : rng.int(b.w - 1, k - 2)) - b.maxX;
  const dy = rng.int(0, H - b.h) - b.minY;
  half = shift(half, dx, dy);
  return half;
}

function halfTask(rng: Rng, stufe: 1 | 2): Task {
  const k = rng.int(3, 4);
  const H = stufe === 1 ? rng.int(4, 5) : rng.int(4, 6);
  const n = stufe === 1 ? rng.int(3, 5) : rng.int(5, 8);
  const touch = stufe === 1 || rng.chance(0.6);
  const left = verticalHalf(rng, k, H, Math.min(n, (touch ? k : k - 1) * H), touch);
  const right = left.map((c) => mirrorCell(c, 'vertical', k));
  const givenRight = stufe === 2 && rng.chance(0.5);
  let given = givenRight ? right : left;
  let solution = givenRight ? left : right;
  let width = 2 * k;
  let height = H;
  let axis: Axis = { orientation: 'vertical', at: k };
  if (stufe === 2 && rng.chance(0.5)) {
    given = transpose(given);
    solution = transpose(solution);
    [width, height] = [height, width];
    axis = { orientation: 'horizontal', at: k };
  }
  return { width, height, axis, given: sortCells(given), solution: sortCells(solution), mode: 'haelfte' };
}

function diagonalTask(rng: Rng): Task {
  const size = rng.int(5, 6);
  const n = rng.int(4, 7);
  for (;;) {
    const set = new Set<string>();
    const d = rng.int(0, size - 1);
    const cells: Cell[] = [[d, d]];
    set.add(ck(cells[0]));
    let guard = 0;
    while (cells.length < n && guard++ < 200) {
      const cand = emptyNeighbours(cells).filter((c) => c[0] >= 0 && c[1] < size && c[0] <= c[1] && !set.has(ck(c)));
      if (cand.length === 0) break;
      const c = rng.pick(cand);
      set.add(ck(c));
      cells.push(c);
    }
    const solution = cells.filter((c) => c[0] !== c[1]).map((c) => mirrorCell(c, 'diagonal', 0));
    if (solution.length < 3) continue;
    return { width: size, height: size, axis: { orientation: 'diagonal', at: 0 }, given: sortCells(cells), solution: sortCells(solution), mode: 'haelfte' };
  }
}

/** Both halves partly given; for every missing Kästchen its mirror partner is shown. */
function gapsTask(rng: Rng): Task {
  const k = rng.int(3, 4);
  const H = rng.int(4, 5);
  const left = verticalHalf(rng, k, H, rng.int(5, 8), true);
  const full = [...left, ...left.map((c) => mirrorCell(c, 'vertical', k))];
  // choose missing cells: at most one of each mirror pair, from both sides
  const pairs = left.map((c) => [c, mirrorCell(c, 'vertical', k)] as const);
  const count = Math.min(pairs.length - 1, rng.int(3, 5));
  const chosen = rng.sample(pairs, count).map((p, i) => (i === 0 ? p[0] : i === 1 ? p[1] : rng.pick(p)));
  const missing = cellSet(chosen);
  let given = full.filter((c) => !missing.has(ck(c)));
  let solution = chosen;
  let width = 2 * k;
  let height = H;
  let axis: Axis = { orientation: 'vertical', at: k };
  if (rng.chance(0.5)) {
    given = transpose(given);
    solution = transpose(solution);
    [width, height] = [height, width];
    axis = { orientation: 'horizontal', at: k };
  }
  return { width, height, axis, given: sortCells(given), solution: sortCells(solution), mode: 'luecken' };
}

function axisSpeech(axis: Axis): string {
  if (axis.orientation === 'vertical') return `Die Spiegelachse ist senkrecht, zwischen Spalte ${axis.at} und Spalte ${axis.at + 1}.`;
  if (axis.orientation === 'horizontal') return `Die Spiegelachse ist waagerecht, zwischen Zeile ${axis.at} und Zeile ${axis.at + 1}.`;
  return 'Die Spiegelachse ist schräg, von der Ecke oben links zur Ecke unten rechts.';
}

/** Position of a cell counted from a vertical/horizontal axis: 1 = the Kästchen directly at the axis. */
function position(c: Cell, axis: Axis): number {
  const p = axis.orientation === 'vertical' ? c[0] : c[1];
  return p < axis.at ? axis.at - p : p - axis.at + 1;
}

const SIDE_WORD = { links: 'links von der Achse', rechts: 'rechts von der Achse', oben: 'über der Achse', unten: 'unter der Achse' } as const;

function sideOf(c: Cell, axis: Axis): keyof typeof SIDE_WORD {
  if (axis.orientation === 'vertical') return c[0] < axis.at ? 'links' : 'rechts';
  return c[1] < axis.at ? 'oben' : 'unten';
}

/**
 * Worked example for one Kästchen. Counted with ordinals from the axis ("das 3. Kästchen links von der Achse"),
 * so it is clear that the Kästchen itself is counted – "3 Kästchen entfernt" would suggest 3 Kästchen in between.
 */
function exampleStep(task: Task): string {
  const { axis } = task;
  const src = task.mode === 'luecken'
    ? task.given.find((c) => task.solution.some((s) => ck(mirrorCell(s, axis.orientation, axis.at)) === ck(c)))!
    : task.given.find((c) => ck(mirrorCell(c, axis.orientation, axis.at)) !== ck(c))!;
  const m = mirrorCell(src, axis.orientation, axis.at);
  const at = (c: Cell) => `Zeile ${c[1] + 1}, Spalte ${c[0] + 1}`;
  if (axis.orientation === 'diagonal') {
    return `Bei der schrägen Achse tauschen Zeile und Spalte: Das Kästchen in ${at(src)} hat sein Spiegelbild in ${at(m)}.`;
  }
  const d = position(src, axis);
  const from = SIDE_WORD[sideOf(src, axis)];
  const to = SIDE_WORD[sideOf(m, axis)];
  if (d === 1) {
    return `Beispiel: Das Kästchen in ${at(src)} liegt ${sideOf(src, axis)} direkt an der Achse. Sein Spiegelbild liegt ${sideOf(m, axis)} direkt an der Achse: ${at(m)}.`;
  }
  return `Beispiel: Das Kästchen in ${at(src)} ist das ${fmt(d)}. Kästchen ${from}. Sein Spiegelbild ist das ${fmt(d)}. Kästchen ${to}: ${at(m)}.`;
}

function build(rng: Rng, stufe: Stufe, task: Task): Exercise {
  const { width, height, axis, given, solution } = task;
  const n = solution.length;
  const done: Visual = { type: 'grid', width, height, cells: sortCells([...given, ...solution]), axis };
  const prompt = task.mode === 'luecken'
    ? 'Male die fehlenden Kästchen an, damit die Figur achsensymmetrisch wird.'
    : 'Male das Spiegelbild an. Die gestrichelte Linie ist die Spiegelachse.';
  const rowWise = axis.orientation === 'horizontal' ? 'Gehe Spalte für Spalte vor.' : 'Gehe Reihe für Reihe vor.';
  return {
    key: `${ID}:${stufe}:${task.mode}:${axis.orientation}${axis.at}:${width}x${height}:${cellsId(given)}`,
    topicId: 'geometrie',
    skillId: ID,
    stufe,
    ab: stufe,
    knobel: stufe === 3 ? true : undefined,
    prompt,
    answer: { kind: 'cells', width, height, given, solution, axis },
    hints: axis.orientation === 'diagonal'
      ? [
          'Spiegle ein Kästchen nach dem anderen an der schrägen Linie.',
          'Bei dieser schrägen Linie tauschen Zeile und Spalte: Aus Zeile 4, Spalte 2 wird Zeile 2, Spalte 4.',
        ]
      : [
          'Zähle, wie weit ein Kästchen von der Spiegelachse entfernt ist.',
          'Das Spiegelbild liegt genauso weit entfernt – auf der anderen Seite der Achse.',
          rowWise,
        ],
    steps: [
      task.mode === 'luecken'
        ? 'Suche Kästchen, die auf der anderen Seite der Achse keinen Partner haben.'
        : 'Spiegle ein Kästchen nach dem anderen.',
      exampleStep(task),
      { text: `Du malst ${n === 1 ? '1 Kästchen' : `${fmt(n)} Kästchen`} an. So sieht die fertige Figur aus:`, visual: done },
    ],
    praise: praiseFrom(rng, [
      'Du hast die Abstände zur Spiegelachse genau übertragen.',
      axis.orientation === 'diagonal' ? 'Du hast Zeile und Spalte geschickt getauscht.' : 'Du hast Reihe für Reihe sorgfältig gespiegelt.',
    ]),
    srText: `Ein Kästchengitter mit ${fmt(width)} Spalten und ${fmt(height)} Zeilen. ${axisSpeech(axis)} Schon angemalt sind: ${describeCells(given)}. ${prompt}`,
    kmk: stufe === 3 ? ['RF.symmetrie', 'PK.problemloesen'] : ['RF.symmetrie'],
  };
}

export const spiegelnSkill: SkillDef = {
  id: ID,
  topicId: 'geometrie',
  title: 'Spiegelbild ergänzen',
  description: 'Du malst das Spiegelbild einer Figur auf die andere Seite der Achse.',
  stufen: {
    1: 'An einer senkrechten Achse spiegeln',
    2: 'Senkrecht und waagerecht spiegeln',
    3: 'Schräge Achse und fehlende Kästchen',
  },
  kmk: ['RF.symmetrie'],
  generate(rng, stufe) {
    if (stufe === 1) return build(rng, 1, halfTask(rng, 1));
    if (stufe === 2) return build(rng, 2, halfTask(rng, 2));
    return build(rng, 3, rng.chance(0.55) ? diagonalTask(rng) : gapsTask(rng));
  },
};

