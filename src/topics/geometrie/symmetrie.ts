/**
 * Achsensymmetrie erkennen.
 * Stufe 1: grid figure with a vertical dashed line – symmetric? (Ja/Nein)
 * Stufe 2: vertical or horizontal line; number of Symmetrieachsen of Quadrat (4), Rechteck (2),
 *          gleichseitiges Dreieck (3); Bandornamente fortsetzen (verschoben or abwechselnd gespiegelt).
 * Stufe 3: diagonal line; axes of regular Sechseck/Achteck, Parallelogramm, Kreis; "Welche Figur hat …?".
 * Non-symmetric figures are near misses (one Kästchen too many/too few) or shifted instead of mirrored.
 */
import { fmt } from '../../core/format';
import type { Axis, Cell, ChoiceOption, Exercise, Rng, ShapeKind, SkillDef, Stufe, Visual } from '../../core/types';
import {
  bounds,
  cellSet,
  cellsId,
  ck,
  describeCells,
  emptyNeighbours,
  isSimpleFigure,
  isSymmetric,
  mirrorCell,
  randomPolyomino,
  shift,
  sortCells,
} from './grid';
import { BugList, letter, makeChoice, praiseFrom } from './shared';
import { SHAPES } from './shapes';

const ID = 'geometrie.symmetrie';

function base(stufe: Stufe, key: string, kmk: string[] = ['RF.symmetrie']): Pick<Exercise, 'key' | 'topicId' | 'skillId' | 'stufe' | 'kmk'> {
  return { key: `${ID}:${stufe}:${key}`, topicId: 'geometrie', skillId: ID, stufe, kmk };
}

type Orientation = Axis['orientation'];
type Variant = 'sym' | 'fehlt' | 'extra' | 'verschoben';

interface GridFigure {
  cells: Cell[];
  variant: Variant;
  /** Axis position in figure coordinates (vertical: between column at−1 and at). */
  at: number;
}

/** Build a figure around a vertical axis at x = k (or around the main diagonal). */
function buildFigure(rng: Rng, orientation: 'vertical' | 'diagonal', nHalf: [number, number], variant: Variant): GridFigure | null {
  const n = rng.int(nHalf[0], nHalf[1]);
  let half: Cell[];
  let at = 0;
  let size = 0;
  if (orientation === 'vertical') {
    const k = rng.int(3, 4);
    const H = rng.int(3, 5);
    half = randomPolyomino(rng, n, k, H);
    const b = bounds(half);
    half = shift(half, k - 1 - b.maxX, 0); // touch the axis
    at = k;
  } else {
    size = rng.int(4, 5);
    // cells on or below the diagonal (y ≥ x), at least one on the diagonal
    const pool: Cell[] = [];
    for (let y = 0; y < size; y++) for (let x = 0; x <= y; x++) pool.push([x, y]);
    const set = new Set<string>();
    const start = rng.pick(pool.filter((c) => c[0] === c[1]));
    set.add(ck(start));
    half = [start];
    let guard = 0;
    while (half.length < n && guard++ < 200) {
      const cand = emptyNeighbours(half).filter((c) => c[0] >= 0 && c[1] < size && c[0] <= c[1] && !set.has(ck(c)));
      if (cand.length === 0) break;
      const c = rng.pick(cand);
      set.add(ck(c));
      half.push(c);
    }
  }
  const o = orientation === 'vertical' ? 'vertical' : 'diagonal';
  const mirrored = half.map((c) => mirrorCell(c, o, at));
  const symSet = new Map<string, Cell>();
  [...half, ...mirrored].forEach((c) => symSet.set(ck(c), c));
  let cells = [...symSet.values()];
  if (variant === 'verschoben') {
    if (orientation !== 'vertical') return null;
    cells = [...half, ...half.map(([x, y]) => [x + at, y] as Cell)];
  } else if (variant === 'fehlt') {
    const right = cells.filter((c) => (o === 'vertical' ? c[0] >= at : c[0] > c[1]));
    const candidates = rng.shuffle(right).filter((c) => {
      const rest = cells.filter((d) => ck(d) !== ck(c));
      return rest.length >= 3 && isSimpleFigure(rest);
    });
    if (candidates.length === 0) return null;
    const drop = candidates[0];
    cells = cells.filter((d) => ck(d) !== ck(drop));
  } else if (variant === 'extra') {
    const b = bounds(cells);
    const candidates = rng.shuffle(emptyNeighbours(cells)).filter((c) =>
      o === 'vertical'
        ? c[0] >= at && c[0] <= 2 * at - 1 && c[1] >= b.minY - 1 && c[1] <= b.maxY + 1
        : c[0] > c[1] && c[1] >= 0 && c[0] < size,
    );
    const ok = candidates.find((c) => isSimpleFigure([...cells, c]));
    if (!ok) return null;
    cells = [...cells, ok];
  }
  if (!isSimpleFigure(cells)) return null;
  if (isSymmetric(cells, o, at) !== (variant === 'sym')) return null;
  return { cells: sortCells(cells), variant, at };
}

function figureFor(rng: Rng, orientation: 'vertical' | 'diagonal', nHalf: [number, number], variant: Variant): GridFigure {
  for (let i = 0; i < 500; i++) {
    const f = buildFigure(rng, orientation, nHalf, i < 400 ? variant : 'sym');
    if (f) return f;
  }
  throw new Error('symmetrie: no figure');
}

const ORIENT_WORD: Record<Orientation, string> = { vertical: 'senkrechten', horizontal: 'waagerechten', diagonal: 'schrägen' };

function axisSpeech(axis: Axis): string {
  if (axis.orientation === 'vertical') return `Eine gestrichelte senkrechte Linie liegt zwischen Spalte ${axis.at} und Spalte ${axis.at + 1}.`;
  if (axis.orientation === 'horizontal') return `Eine gestrichelte waagerechte Linie liegt zwischen Zeile ${axis.at} und Zeile ${axis.at + 1}.`;
  return 'Eine gestrichelte schräge Linie geht von der Ecke oben links zur Ecke unten rechts.';
}

function gridTask(rng: Rng, stufe: Stufe, orientation: Orientation, nHalf: [number, number]): Exercise {
  const variant = rng.pick<Variant>(
    orientation === 'diagonal' ? ['sym', 'sym', 'fehlt', 'extra'] : ['sym', 'sym', 'sym', 'fehlt', 'extra', 'verschoben'],
  );
  const f = figureFor(rng, orientation === 'diagonal' ? 'diagonal' : 'vertical', nHalf, variant);
  // place on a grid with a margin of 1; for diagonal axes the grid must be square and aligned
  let cells: Cell[];
  let width: number;
  let height: number;
  let axis: Axis;
  if (orientation === 'diagonal') {
    const b = bounds(f.cells);
    const size = Math.max(b.maxX, b.maxY) + 1;
    cells = shift(f.cells, 1, 1);
    width = height = size + 2;
    axis = { orientation: 'diagonal', at: 0 };
  } else {
    const b = bounds(f.cells);
    cells = shift(f.cells, 1, 1 - b.minY);
    width = 2 * f.at + 2;
    height = b.h + 2;
    axis = { orientation: 'vertical', at: f.at + 1 };
    if (orientation === 'horizontal') {
      cells = cells.map(([x, y]) => [y, x] as Cell);
      [width, height] = [height, width];
      axis = { orientation: 'horizontal', at: f.at + 1 };
    }
  }
  cells = sortCells(cells);
  const symmetric = f.variant === 'sym';
  if (isSymmetric(cells, axis.orientation, axis.at) !== symmetric) throw new Error('symmetrie: axis mismatch');
  const visual: Visual = { type: 'grid', width, height, cells, axis, showOutline: true };

  // first mismatching line (for targeted feedback)
  const set = cellSet(cells);
  const lonely = cells.find((c) => !set.has(ck(mirrorCell(c, axis.orientation, axis.at))));
  const fb = bounds(cells);
  let where = '';
  if (lonely && axis.orientation === 'vertical') where = `in der ${lonely[1] - fb.minY + 1}. Reihe der Figur von oben`;
  if (lonely && axis.orientation === 'horizontal') where = `in der ${lonely[0] - fb.minX + 1}. Spalte der Figur von links`;

  const line = `${ORIENT_WORD[axis.orientation]} Linie`;
  const yes: ChoiceOption = { label: 'Ja, achsensymmetrisch' };
  const no: ChoiceOption = { label: 'Nein, nicht achsensymmetrisch' };
  let whyYes = '';
  if (f.variant === 'verschoben') {
    whyYes = axis.orientation === 'horizontal'
      ? 'Die eine Hälfte ist nur verschoben, nicht gespiegelt. Beim Spiegeln kommt, was oben außen liegt, nach unten außen.'
      : 'Die eine Hälfte ist nur verschoben, nicht gespiegelt. Beim Spiegeln kommt, was links außen liegt, nach rechts außen.';
  }
  else if (where) whyYes = `Prüfe noch einmal ${where}: Dort hat ein Kästchen keinen Partner auf der anderen Seite.`;
  else whyYes = 'Falte in Gedanken an der schrägen Linie. Ein Kästchen landet auf einem leeren Platz.';
  const whyNo = 'Prüfe jedes Kästchen: Auf der anderen Seite der Linie liegt jeweils ein Partner, genauso weit entfernt.';
  const answer = symmetric
    ? makeChoice(rng, yes, [{ ...no, whyWrong: whyNo }], { keepOrder: true, correctIndex: 0 })
    : makeChoice(rng, no, [{ ...yes, whyWrong: whyYes }], { keepOrder: true, correctIndex: 1 });

  const result = symmetric
    ? `Jedes Kästchen hat einen Partner. Die Figur ist achsensymmetrisch zur ${line}.`
    : f.variant === 'verschoben'
      ? `Die Hälften sind verschoben, nicht gespiegelt. Die Figur ist nicht achsensymmetrisch zur ${line}.`
      : `${where ? `${where[0].toUpperCase()}${where.slice(1)}` : 'Bei einem Kästchen'} fehlt ein Partner. Die Figur ist nicht achsensymmetrisch zur ${line}.`;
  const ab = stufe === 1 ? 1 : stufe === 2 ? 2 : 3;
  return {
    ...base(stufe, `${axis.orientation}:${cellsId(cells)}`),
    ab,
    knobel: orientation === 'diagonal' ? true : undefined,
    prompt: `Ist die Figur achsensymmetrisch zur gestrichelten Linie?`,
    visual,
    answer,
    hints: [
      'Falte die Figur in Gedanken an der gestrichelten Linie.',
      orientation === 'diagonal'
        ? 'Prüfe jedes Kästchen: Liegt sein Spiegelbild schräg gegenüber, gleich weit von der Linie?'
        : orientation === 'vertical'
          ? 'Prüfe Reihe für Reihe: Hat jedes Kästchen auf der anderen Seite einen Partner, gleich weit von der Linie?'
          : 'Prüfe Spalte für Spalte: Hat jedes Kästchen auf der anderen Seite einen Partner, gleich weit von der Linie?',
    ],
    steps: [
      'Falte die Figur in Gedanken an der gestrichelten Linie.',
      'Jedes Kästchen braucht auf der anderen Seite einen Partner. Der Partner ist genauso weit von der Linie entfernt.',
      result,
    ],
    praise: praiseFrom(rng, ['Du hast Kästchen für Kästchen auf beiden Seiten verglichen.', 'Du hast genau auf die Abstände zur Linie geachtet.']),
    srText: `Eine Figur im Kästchengitter mit ${fmt(width)} Spalten und ${fmt(height)} Zeilen. Angemalt sind: ${describeCells(cells)}. ${axisSpeech(axis)} Ist die Figur achsensymmetrisch zu dieser Linie?`,
  };
}

// ─── Number of axes ─────────────────────────────────────────────────────────

interface AxesItem {
  shape: ShapeKind;
  bugs: [number, string][];
  extra?: string;
}

const AXES_S2: AxesItem[] = [
  { shape: 'quadrat', bugs: [[2, 'Denk auch an die schrägen Achsen von Ecke zu Ecke.'], [1, 'Falte das Quadrat auch waagerecht und schräg von Ecke zu Ecke.']] },
  { shape: 'rechteck', bugs: [[4, 'Falte das Rechteck in Gedanken an einer Diagonale: Die Hälften passen nicht aufeinander.'], [1, 'Du kannst das Rechteck senkrecht und waagerecht falten.']] },
  { shape: 'gleichseitiges-dreieck', bugs: [[1, 'Jede Ecke hat eine eigene Achse: von der Ecke zur Mitte der gegenüberliegenden Seite.'], [0, 'Falte das Dreieck in Gedanken von einer Ecke zur Mitte der gegenüberliegenden Seite.']] },
];

const AXES_S3: AxesItem[] = [
  { shape: 'sechseck', extra: 'Alle Seiten sind gleich lang.', bugs: [[3, 'Es gibt auch Achsen durch die Mitten von gegenüberliegenden Seiten.']] },
  { shape: 'achteck', extra: 'Alle Seiten sind gleich lang.', bugs: [[4, 'Es gibt auch Achsen durch gegenüberliegende Ecken.']] },
  { shape: 'parallelogramm', bugs: [[2, 'Falte das Parallelogramm in Gedanken: Die Hälften passen nicht genau aufeinander. Auch die Diagonalen sind keine Achsen.'], [1, 'Falte das Parallelogramm in Gedanken senkrecht: Die Hälften sind schief und passen nicht aufeinander.']] },
];

function axesNumber(rng: Rng, stufe: Stufe, item: AxesItem): Exercise {
  const facts = SHAPES[item.shape];
  const value = facts.axes;
  const bugs = new BugList(value);
  item.bugs.forEach(([v, h], i) => bugs.add(`achsen-${i}`, v, h));
  const visual: Visual = { type: 'shape', shape: item.shape };
  const shown: Visual = { type: 'shape', shape: item.shape, showAxes: true };
  const nameCap = facts.nom[0].toUpperCase() + facts.nom.slice(1);
  return {
    ...base(stufe, `achsen:${item.shape}`),
    ab: stufe === 3 ? 3 : 2,
    knobel: stufe === 3 ? true : undefined,
    prompt: `Wie viele Symmetrieachsen hat ${facts.nom}?${item.extra ? ` ${item.extra}` : ''}`,
    visual,
    answer: { kind: 'number', value, unit: value === 1 ? 'Symmetrieachse' : 'Symmetrieachsen' },
    hints: [
      'Stell dir vor, du faltest die Figur. Wo passen beide Hälften genau aufeinander?',
      'Probiere senkrecht, waagerecht und schräg von Ecke zu Ecke.',
    ],
    steps: [
      'Falte die Figur in Gedanken: senkrecht, waagerecht und schräg.',
      { text: value === 0 ? `Bei keiner Faltung passen die Hälften genau aufeinander.` : `So passen die Hälften genau aufeinander:`, visual: shown },
      value === 0 ? `${nameCap} hat keine Symmetrieachse.` : `${nameCap} hat ${fmt(value)} ${value === 1 ? 'Symmetrieachse' : 'Symmetrieachsen'}.`,
    ],
    bugs: bugs.list,
    praise: praiseFrom(rng, ['Du hast in Gedanken in alle Richtungen gefaltet.', 'Du hast auch an die schrägen Achsen gedacht.']),
    srText: `${nameCap}.${item.extra ? ` ${item.extra}` : ''} Wie viele Symmetrieachsen hat ${facts.nom}?`,
  };
}

function circleAxes(rng: Rng): Exercise {
  const answer = makeChoice(rng, { label: 'Unendlich viele' }, [
    { label: '1', whyWrong: 'Du kannst den Kreis an jeder Linie durch den Mittelpunkt falten.' },
    { label: '2', whyWrong: 'Nicht nur senkrecht und waagerecht: Jede Linie durch den Mittelpunkt ist eine Achse.' },
    { label: '4', whyWrong: 'Auch zwischen diesen Achsen passt es: Jede Linie durch den Mittelpunkt ist eine Achse.' },
  ]);
  return {
    ...base(3, 'achsen:kreis'),
    ab: 3,
    knobel: true,
    prompt: 'Wie viele Symmetrieachsen hat ein Kreis?',
    visual: { type: 'shape', shape: 'kreis' },
    answer,
    hints: ['Falte den Kreis in Gedanken. Wo passen die Hälften aufeinander?', 'Probiere viele verschiedene Linien durch den Mittelpunkt.'],
    steps: [
      { text: 'Jede Linie durch den Mittelpunkt teilt den Kreis in zwei gleiche Hälften.', visual: { type: 'shape', shape: 'kreis', showAxes: true } },
      'Solche Linien gibt es unendlich viele. Der Kreis hat unendlich viele Symmetrieachsen.',
    ],
    praise: 'Du hast gemerkt, dass jede Linie durch den Mittelpunkt passt.',
    srText: 'Ein Kreis. Wie viele Symmetrieachsen hat ein Kreis?',
  };
}

// ─── Bandornamente ──────────────────────────────────────────────────────────

type BandKind = 'verschieben' | 'spiegeln';

const flipX = (cells: readonly Cell[]): Cell[] => {
  const b = bounds(cells);
  return sortCells(cells.map(([x, y]) => [b.maxX - x + b.minX, y] as Cell));
};
const flipY = (cells: readonly Cell[]): Cell[] => {
  const b = bounds(cells);
  return sortCells(cells.map(([x, y]) => [x, b.maxY - y + b.minY] as Cell));
};

/** A small motif that changes under every flip, so "verschoben", "gespiegelt" and "auf dem Kopf" all look different. */
function bandMotif(rng: Rng): Cell[] {
  for (;;) {
    const m = sortCells(randomPolyomino(rng, rng.int(3, 5), 3, 3));
    const b = bounds(m);
    if (b.w < 2 || b.h < 2) continue;
    const ids = new Set([m, flipX(m), flipY(m), flipY(flipX(m))].map(cellsId));
    if (ids.size === 4) return m;
  }
}

/**
 * Bandornament fortsetzen: three copies of a motif in a row (each shifted, or each the mirror image of the one
 * before), an empty place for the fourth. Which motif comes next?
 */
function bandTask(rng: Rng): Exercise {
  const kind = rng.pick<BandKind>(['verschieben', 'spiegeln']);
  const motif = bandMotif(rng);
  const { w, h } = bounds(motif);
  const mirrored = flipX(motif);
  const copy = (i: number) => (kind === 'spiegeln' && i % 2 === 1 ? mirrored : motif);
  const place = (cells: readonly Cell[], i: number) => shift(cells, 1 + i * (w + 1), 1);
  const width = 4 * w + 3 + 2;
  const height = h + 2;
  const shown = sortCells([0, 1, 2].flatMap((i) => place(copy(i), i)));
  const next = copy(3);
  const other = kind === 'spiegeln' ? motif : mirrored;
  const small = (cells: readonly Cell[]): Visual => ({ type: 'grid', width: w + 2, height: h + 2, cells: shift(cells, 1, 1), showOutline: true });
  const answer = makeChoice(
    rng,
    { label: '', visual: small(next) },
    [
      {
        label: '',
        visual: small(other),
        whyWrong: kind === 'spiegeln'
          ? 'Schau genau: Jedes Muster ist das Spiegelbild des Musters davor. Das nächste ist wieder gespiegelt.'
          : 'In diesem Band wird das Muster nur verschoben. Es wird nicht gespiegelt.',
      },
      { label: '', visual: small(flipY(next)), whyWrong: 'Dieses Muster steht auf dem Kopf. Im Band bleibt oben immer oben.' },
    ],
    { layout: 'grid', relabel: (i) => `Muster ${letter(i)}` },
  );
  const correctLabel = answer.options[answer.correct].label;
  const prompt = 'Wie geht das Bandornament weiter? Wähle das nächste Muster.';
  const full: Visual = { type: 'grid', width, height, cells: sortCells([0, 1, 2, 3].flatMap((i) => place(copy(i), i))), showOutline: true };
  return {
    ...base(2, `band:${kind}:${cellsId(motif)}`, ['RF.symmetrie', 'MS.muster']),
    ab: 2,
    prompt,
    visual: { type: 'grid', width, height, cells: shown, showOutline: true },
    answer,
    hints: [
      'Vergleiche das erste und das zweite Muster. Was hat sich verändert?',
      'Wird das Muster nur verschoben – oder umgeklappt wie ein Spiegelbild?',
    ],
    steps: [
      kind === 'spiegeln'
        ? 'Jedes Muster ist das Spiegelbild des Musters davor: Es ist an einer senkrechten Linie umgeklappt.'
        : 'Jedes Muster ist genau gleich wie das davor. Es wird nur nach rechts verschoben.',
      kind === 'spiegeln' ? 'Das dritte Muster ist wie das erste. Das vierte ist wieder gespiegelt, wie das zweite.' : 'Auch das vierte Muster ist genau gleich.',
      { text: `So geht das Band weiter. Richtig ist ${correctLabel}.`, visual: full },
    ],
    praise: praiseFrom(rng, ['Du hast die Regel im Bandornament erkannt.', 'Du hast genau verglichen: verschoben oder gespiegelt.']),
    srText: `Ein Bandornament im Kästchengitter mit drei Mustern nebeneinander, rechts ist Platz für ein viertes. Angemalt sind: ${describeCells(shown)}. ${prompt} ${answer.options
      .map((o) => `${o.label}: ${describeCells((o.visual as { cells: Cell[] }).cells)}`)
      .join('. ')}.`,
  };
}

const WHICH: { count: number; shape: ShapeKind }[] = [
  { count: 3, shape: 'gleichseitiges-dreieck' },
  { count: 4, shape: 'quadrat' },
  { count: 2, shape: 'rechteck' },
  { count: 0, shape: 'parallelogramm' },
];

function whichShape(rng: Rng): Exercise {
  const target = rng.pick(WHICH);
  const others = WHICH.filter((w) => w !== target);
  const label = (s: ShapeKind) => SHAPES[s].name;
  const countText = (n: number) => (n === 0 ? 'keine Symmetrieachse' : n === 1 ? '1 Symmetrieachse' : `${fmt(n)} Symmetrieachsen`);
  const question = target.count === 0 ? 'Welche Figur hat keine Symmetrieachse?' : `Welche Figur hat genau ${fmt(target.count)} Symmetrieachsen?`;
  const answer = makeChoice(
    rng,
    { label: label(target.shape), visual: { type: 'shape', shape: target.shape } },
    others.map((o) => ({ label: label(o.shape), visual: { type: 'shape', shape: o.shape }, whyWrong: `${SHAPES[o.shape].nom[0].toUpperCase()}${SHAPES[o.shape].nom.slice(1)} hat ${countText(o.count)}.` })),
    { layout: 'grid' },
  );
  return {
    ...base(3, `welche:${target.count}`),
    ab: 3,
    prompt: question,
    answer,
    hints: ['Falte jede Figur in Gedanken: senkrecht, waagerecht und schräg.', 'Zähle bei jeder Figur, wie oft die Hälften genau aufeinander passen.'],
    steps: [
      ...WHICH.map((w) => `${SHAPES[w.shape].name}: ${countText(w.count)}.`),
      { text: `Also: ${SHAPES[target.shape].nom} hat ${countText(target.count)}.`, visual: { type: 'shape', shape: target.shape, showAxes: true } },
    ],
    praise: praiseFrom(rng, ['Du hast jede Figur in Gedanken gefaltet und verglichen.', 'Du hast die Symmetrieachsen jeder Figur sorgfältig gezählt.']),
    srText: `${question} Zur Wahl stehen: ${[target, ...others].map((w) => SHAPES[w.shape].name).join(', ')}.`,
  };
}

export const symmetrieSkill: SkillDef = {
  id: ID,
  topicId: 'geometrie',
  title: 'Achsensymmetrie',
  description: 'Du prüfst, ob beide Hälften einer Figur genau aufeinander passen.',
  stufen: {
    1: 'Senkrechte Achse: symmetrisch oder nicht?',
    2: 'Waagerechte Achsen, Achsen zählen, Bandornamente',
    3: 'Schräge Achsen und knifflige Figuren',
  },
  kmk: ['RF.symmetrie'],
  generate(rng, stufe) {
    if (stufe === 1) return gridTask(rng, 1, 'vertical', [3, 6]);
    if (stufe === 2) {
      const r = rng.next();
      if (r < 0.25) return axesNumber(rng, 2, rng.pick(AXES_S2));
      if (r < 0.45) return bandTask(rng);
      return gridTask(rng, 2, rng.pick(['vertical', 'horizontal'] as const), [4, 8]);
    }
    const r = rng.next();
    if (r < 0.5) return gridTask(rng, 3, 'diagonal', [4, 7]);
    if (r < 0.75) return axesNumber(rng, 3, rng.pick(AXES_S3));
    if (r < 0.85) return circleAxes(rng);
    return whichShape(rng);
  },
};
