/**
 * Flächeninhalt durch Auslegen/Zählen von Einheitsquadraten (Kästchen). No formula, no cm².
 * Stufe 1: rectangles (4–40 Kästchen), counted row by row.
 * Stufe 2: L-, T-, U-shapes and free polyominoes (8–40 Kästchen), decomposed into parts.
 * Stufe 3: figures with half Kästchen (always an even number, so the area is whole); rectangle with a
 *          gap ("Reihen · Spalten" as a strategy hint); how many Kästchen are missing to a rectangle.
 */
import { fmt } from '../../core/format';
import type { Cell, Exercise, Rng, SkillDef, Stufe } from '../../core/types';
import {
  bounds,
  borderCellCount,
  cellSet,
  cellsId,
  ck,
  describeCells,
  describeHalfCells,
  emptyNeighbours,
  lFigure,
  perimeterOf,
  randomPolyomino,
  rectCells,
  rowsOf,
  tFigure,
  transformFigure,
  uFigure,
  type Bounds,
  type Figure,
  type HalfCell,
  type HalfCorner,
  type Rect,
} from './grid';
import { BugList, kaestchen, placeOnGrid, praiseFrom, sumText } from './shared';

const ID = 'geometrie.flaeche';

const PERIMETER_HINT = 'Du hast die Kästchenlängen am Rand gezählt – das ist der Umfang. Für den Flächeninhalt zählst du die Kästchen innen.';
const BORDER_HINT = 'Du hast nur die Kästchen am Rand gezählt. Zähle auch die Kästchen in der Mitte.';

function base(stufe: Stufe, key: string): Pick<Exercise, 'key' | 'topicId' | 'skillId' | 'stufe' | 'kmk'> {
  return { key: `${ID}:${stufe}:${key}`, topicId: 'geometrie', skillId: ID, stufe, kmk: ['RF.flaeche'] };
}

function areaAnswer(value: number) {
  return { kind: 'number' as const, value, unit: 'Kästchen', before: 'Flächeninhalt:' };
}

// ─── Stufe 1: rectangles ────────────────────────────────────────────────────

function rectangle(rng: Rng): Exercise {
  let w = 0;
  let h = 0;
  do {
    w = rng.int(2, 8);
    h = rng.int(2, 5);
  } while (w * h < 4 || w * h > 40);
  const area = w * h;
  const { visual } = placeOnGrid(rectCells({ x: 0, y: 0, w, h }));
  const bugs = new BugList(area)
    .add('umfang', 2 * (w + h), PERIMETER_HINT)
    .add('randkaestchen', 2 * (w + h) - 4, BORDER_HINT)
    .add('breite-plus-hoehe', w + h, 'Du hast eine Reihe und eine Spalte gezählt. Zähle die Kästchen in allen Reihen.');
  const rowSum = Array.from({ length: h }, () => w);
  return {
    ...base(1, `rechteck:${w}x${h}`),
    ab: 1,
    prompt: 'Wie groß ist der Flächeninhalt? Zähle die Kästchen.',
    visual,
    answer: areaAnswer(area),
    hints: [
      'Zähle die Kästchen in der obersten Reihe.',
      'Zähle, wie viele Reihen es sind. Jede Reihe hat gleich viele Kästchen.',
      'Addiere die Kästchen aller Reihen.',
    ],
    steps: [
      `In jeder Reihe sind ${kaestchen(w)}.`,
      `Es sind ${fmt(h)} Reihen.`,
      `${sumText(rowSum)} = ${fmt(area)}`,
      `Der Flächeninhalt ist ${kaestchen(area)}.`,
    ],
    bugs: bugs.list,
    praise: praiseFrom(rng, ['Du hast Reihe für Reihe gezählt.', 'Du hast jedes Kästchen genau einmal gezählt.', 'Du hast die gleich langen Reihen geschickt zusammengezählt.']),
    srText: `Ein Rechteck im Kästchengitter, ${fmt(w)} Kästchen breit und ${fmt(h)} Kästchen hoch. Wie viele Kästchen groß ist der Flächeninhalt?`,
  };
}

// ─── Stufe 2: composite figures ─────────────────────────────────────────────

function compositeFigure(rng: Rng): Figure {
  for (;;) {
    const kind = rng.pick(['L', 'T', 'U', 'frei'] as const);
    let f: Figure;
    if (kind === 'L') {
      const W = rng.int(3, 7);
      const H = rng.int(3, 6);
      f = lFigure(W, H, rng.int(1, W - 1), rng.int(1, H - 1));
    } else if (kind === 'T') {
      const W = rng.int(3, 7);
      const stems = [1, 2, 3].filter((s) => s <= W - 2 && (W - s) % 2 === 0);
      f = tFigure(W, rng.int(1, 2), rng.pick(stems), rng.int(2, 4));
    } else if (kind === 'U') {
      const H = rng.int(3, 5);
      f = uFigure(rng.int(1, 2), rng.int(1, 3), rng.int(1, 2), H, rng.int(1, H - 1));
    } else {
      const cells = randomPolyomino(rng, rng.int(8, 20), 6, 5);
      f = { kind: 'frei', cells, parts: [] };
    }
    const n = f.cells.length;
    if (n < 8 || n > 40) continue;
    return f.kind === 'frei' ? f : transformFigure(f, rng.int(0, 7));
  }
}

/**
 * Where a part lies in the figure, from the edges it touches: a part over the full height is 'links'/'rechts',
 * over the full width 'oben'/'unten'; otherwise both directions ('unten rechts', 'unten in der Mitte').
 * So the bar of a U is 'unten in der Mitte' and never shares a label with a pillar.
 */
export function where(p: Rect, fig: Figure): string {
  const b = bounds(fig.cells);
  const horiz = p.x === 0 && p.x + p.w === b.w ? '' : p.x === 0 ? 'links' : p.x + p.w === b.w ? 'rechts' : 'in der Mitte';
  const vert = p.y === 0 && p.y + p.h === b.h ? '' : p.y === 0 ? 'oben' : p.y + p.h === b.h ? 'unten' : 'in der Mitte';
  if (!vert) return horiz || 'in der Mitte';
  if (!horiz) return vert;
  if (vert === 'in der Mitte' && horiz === 'in der Mitte') return 'in der Mitte';
  if (horiz === 'in der Mitte') return `${vert} in der Mitte`;
  if (vert === 'in der Mitte') return `${horiz} in der Mitte`;
  return `${vert} ${horiz}`;
}

function partText(p: Rect): string {
  const rows = p.h === 1 ? '1 Reihe' : `${fmt(p.h)} Reihen`;
  return `${rows} mit je ${kaestchen(p.w)}, also ${kaestchen(p.w * p.h)}`;
}

function composite(rng: Rng): Exercise {
  const fig = compositeFigure(rng);
  const area = fig.cells.length;
  const b = bounds(fig.cells);
  const { visual, cells } = placeOnGrid(fig.cells);
  const bugs = new BugList(area)
    .add('umfang', perimeterOf(fig.cells), PERIMETER_HINT)
    .add('rechteck-drumherum', b.w * b.h, 'Du hast das ganze Rechteck um die Figur gezählt. Ein Teil davon ist aber leer.')
    .add('randkaestchen', borderCellCount(fig.cells), BORDER_HINT);
  let steps: string[];
  let hints: string[];
  if (fig.parts.length > 1) {
    const sizes = fig.parts.map((p) => p.w * p.h);
    steps = [
      `Zerlege die Figur in ${fmt(fig.parts.length)} Rechtecke.`,
      ...fig.parts.map((p, i) => `Teil ${i + 1} (${where(p, fig)}): ${partText(p)}.`),
      `${sumText(sizes)} = ${fmt(area)}`,
      `Der Flächeninhalt ist ${kaestchen(area)}.`,
    ];
    hints = [
      'Zerlege die Figur in Rechtecke.',
      'Zähle in jedem Rechteck die Reihen und die Kästchen pro Reihe.',
      'Addiere die Kästchen aller Teile.',
    ];
  } else {
    const rowCounts = rowsOf(fig.cells).map((r) => r.xs.length);
    steps = [
      'Zähle Reihe für Reihe.',
      ...rowCounts.map((n, i) => `Reihe ${i + 1}: ${kaestchen(n)}`),
      `${sumText(rowCounts)} = ${fmt(area)}`,
      `Der Flächeninhalt ist ${kaestchen(area)}.`,
    ];
    hints = [
      'Zähle Reihe für Reihe von oben nach unten.',
      'Schreibe dir die Anzahl jeder Reihe auf.',
      'Addiere die Zahlen aller Reihen.',
    ];
  }
  return {
    ...base(2, `${fig.kind}:${cellsId(fig.cells)}`),
    ab: 2,
    prompt: 'Wie groß ist der Flächeninhalt der Figur? Zähle die Kästchen.',
    visual,
    answer: areaAnswer(area),
    hints,
    steps,
    bugs: bugs.list,
    praise: fig.parts.length > 1
      ? praiseFrom(rng, ['Du hast die Figur geschickt in Rechtecke zerlegt.', 'Du hast die Teile einzeln gezählt und dann addiert.'])
      : praiseFrom(rng, ['Du hast Reihe für Reihe gezählt.', 'Du hast jedes Kästchen genau einmal gezählt.']),
    srText: `Eine Figur im Kästchengitter. Angemalt sind: ${describeCells(cells)}. Wie viele Kästchen groß ist der Flächeninhalt?`,
  };
}

// ─── Stufe 3 ────────────────────────────────────────────────────────────────

const CORNERS_FOR: Record<'below' | 'above' | 'left' | 'right', HalfCorner[]> = {
  below: ['bl', 'br'],
  above: ['tl', 'tr'],
  left: ['tl', 'bl'],
  right: ['tr', 'br'],
};

/** Attach k half cells (triangles) whose legs lie on the figure's edges. */
function attachHalves(rng: Rng, cells: Cell[], k: number): HalfCell[] | null {
  const set = cellSet(cells);
  const options: HalfCell[][] = [];
  for (const c of emptyNeighbours(cells)) {
    const [x, y] = c;
    const sides: (keyof typeof CORNERS_FOR)[] = [];
    if (set.has(ck([x, y + 1]))) sides.push('below');
    if (set.has(ck([x, y - 1]))) sides.push('above');
    if (set.has(ck([x - 1, y]))) sides.push('left');
    if (set.has(ck([x + 1, y]))) sides.push('right');
    let corners = CORNERS_FOR[sides[0]];
    for (const s of sides.slice(1)) corners = corners.filter((cn) => CORNERS_FOR[s].includes(cn));
    if (corners.length === 0) continue;
    options.push(corners.map((corner) => ({ cell: c, corner })));
  }
  if (options.length < k) return null;
  return rng.sample(options, k).map((o) => rng.pick(o));
}

function halfCells(rng: Rng): Exercise {
  let cells: Cell[];
  let halves: HalfCell[] | null = null;
  do {
    if (rng.chance(0.5)) {
      cells = rectCells({ x: 0, y: 0, w: rng.int(2, 5), h: rng.int(2, 4) });
    } else {
      const W = rng.int(3, 5);
      const H = rng.int(3, 4);
      cells = transformFigure(lFigure(W, H, rng.int(1, W - 1), rng.int(1, H - 1)), rng.int(0, 7)).cells;
    }
    halves = attachHalves(rng, cells, rng.pick([2, 4, 6]));
  } while (!halves);
  const full = cells.length;
  const k = halves.length;
  const area = full + k / 2;
  const placed = placeOnGrid(cells, { halves });
  const halfKey = placed.halves.map((h) => `${h.cell[0]}.${h.cell[1]}${h.corner}`).sort().join('-');
  const bugs = new BugList(area)
    .add('halbe-als-ganze', full + k, 'Schau genau: Die schrägen Stücke sind nur halbe Kästchen. Zwei halbe Kästchen sind zusammen ein ganzes.')
    .add('halbe-vergessen', full, 'Du hast die halben Kästchen vergessen. Zwei halbe Kästchen ergeben zusammen ein ganzes Kästchen.');
  return {
    ...base(3, `halb:${cellsId(placed.cells)}:${halfKey}`),
    ab: 3,
    prompt: 'Wie groß ist der Flächeninhalt? Achte auf die halben Kästchen.',
    visual: placed.visual,
    answer: areaAnswer(area),
    hints: [
      'Zähle zuerst nur die ganzen Kästchen.',
      'Zähle dann die halben Kästchen. Je zwei halbe Kästchen ergeben ein ganzes.',
      'Addiere die ganzen Kästchen und die zusammengesetzten Kästchen.',
    ],
    steps: [
      `Ganze Kästchen: ${fmt(full)}.`,
      `Halbe Kästchen: ${fmt(k)}.`,
      `Zwei halbe Kästchen sind ein ganzes. ${fmt(k)} halbe Kästchen sind ${kaestchen(k / 2)}.`,
      `${fmt(full)} + ${fmt(k / 2)} = ${fmt(area)}`,
      `Der Flächeninhalt ist ${kaestchen(area)}.`,
    ],
    bugs: bugs.list,
    praise: praiseFrom(rng, ['Du hast je zwei halbe Kästchen zu einem ganzen zusammengefasst.', 'Du hast ganze und halbe Kästchen getrennt gezählt.']),
    srText: `Eine Figur im Kästchengitter. Ganze Kästchen: ${describeCells(placed.cells)}. Halbe Kästchen, als Dreiecke: ${describeHalfCells(placed.halves)}. Wie viele Kästchen groß ist der Flächeninhalt?`,
  };
}

function rectangleWithGap(rng: Rng): Exercise {
  let W = 0;
  let H = 0;
  let gap: Rect = { x: 0, y: 0, w: 1, h: 1 };
  let area = 0;
  do {
    W = rng.int(5, 8);
    H = rng.int(4, 6);
    const gw = rng.int(1, 3);
    const gh = rng.int(1, 2);
    // a hole inside, or a notch at the top/bottom edge
    const inside = rng.chance(0.5);
    const gx = rng.int(1, W - gw - 1);
    const gy = inside ? rng.int(1, H - gh - 1) : rng.pick([0, H - gh]);
    gap = { x: gx, y: gy, w: gw, h: gh };
    area = W * H - gw * gh;
  } while (area > 40 || gap.y < 0 || gap.x < 1);
  const gapSet = new Set(rectCells(gap).map(ck));
  const cells = rectCells({ x: 0, y: 0, w: W, h: H }).filter((c) => !gapSet.has(ck(c)));
  const missing = gap.w * gap.h;
  const { visual, cells: placed } = placeOnGrid(cells);
  const bugs = new BugList(area)
    .add('nicht-abgezogen', W * H, 'Du hast das ganze Rechteck gezählt. Ziehe die leeren Kästchen noch ab.')
    .add('umfang', perimeterOf(cells), PERIMETER_HINT);
  if (missing > 1) bugs.add('luecke-als-eins', W * H - 1, `Die Lücke besteht aus ${kaestchen(missing)}. Ziehe alle davon ab.`);
  return {
    ...base(3, `luecke:${W}x${H}:${gap.x}.${gap.y}.${gap.w}.${gap.h}`),
    ab: 3,
    prompt: 'Wie groß ist der Flächeninhalt? Zähle geschickt.',
    visual,
    answer: areaAnswer(area),
    hints: [
      'Stell dir das Rechteck ohne Lücke vor.',
      'Rechne Reihen · Spalten für das ganze Rechteck.',
      'Ziehe dann die leeren Kästchen ab.',
    ],
    steps: [
      `Das ganze Rechteck hat ${fmt(H)} Reihen mit je ${kaestchen(W)}: ${fmt(H)} · ${fmt(W)} = ${fmt(W * H)}.`,
      `Es fehlen ${kaestchen(missing)}.`,
      `${fmt(W * H)} − ${fmt(missing)} = ${fmt(area)}`,
      `Der Flächeninhalt ist ${kaestchen(area)}.`,
    ],
    bugs: bugs.list,
    praise: praiseFrom(rng, ['Du hast das ganze Rechteck gerechnet und die Lücke abgezogen.', 'Du hast Reihen und Spalten geschickt genutzt.']),
    srText: `Ein Rechteck im Kästchengitter, ${fmt(W)} Kästchen breit und ${fmt(H)} Kästchen hoch. Es hat eine Lücke aus ${fmt(gap.h)} Reihe${gap.h > 1 ? 'n' : ''} mit je ${kaestchen(gap.w)}. Angemalt sind: ${describeCells(placed)}. Wie viele Kästchen groß ist der Flächeninhalt?`,
  };
}

function missingToRectangle(rng: Rng): Exercise {
  let cells: Cell[];
  let b: Bounds;
  do {
    cells = randomPolyomino(rng, rng.int(7, 18), rng.int(4, 6), rng.int(3, 5));
    b = bounds(cells);
  } while (b.w * b.h - cells.length < 3 || b.w < 3 || b.h < 3);
  const n = cells.length;
  const full = b.w * b.h;
  const answer = full - n;
  const { visual, cells: placed } = placeOnGrid(cells);
  const bugs = new BugList(answer)
    .add('flaeche-der-figur', n, 'Das ist der Flächeninhalt der Figur. Gefragt ist, wie viele Kästchen noch fehlen.')
    .add('ganzes-rechteck', full, 'So viele Kästchen hat das ganze Rechteck. Ziehe die angemalten Kästchen ab.');
  return {
    ...base(3, `ergaenzen:${cellsId(cells)}`),
    ab: 3,
    knobel: true,
    prompt: `Die Figur soll ein Rechteck mit ${fmt(b.h)} Reihen und ${fmt(b.w)} Spalten werden. Wie viele Kästchen fehlen noch?`,
    visual,
    answer: { kind: 'number', value: answer, unit: 'Kästchen', before: 'Es fehlen' },
    hints: [
      'Wie viele Kästchen hat das ganze Rechteck? Rechne Reihen · Spalten.',
      'Zähle die angemalten Kästchen.',
      'Ziehe die angemalten Kästchen vom ganzen Rechteck ab.',
    ],
    steps: [
      `Das ganze Rechteck: ${fmt(b.h)} · ${fmt(b.w)} = ${kaestchen(full)}.`,
      `Angemalt sind ${kaestchen(n)}.`,
      `${fmt(full)} − ${fmt(n)} = ${fmt(answer)}`,
      `Es fehlen noch ${kaestchen(answer)}.`,
    ],
    bugs: bugs.list,
    praise: praiseFrom(rng, ['Du hast das ganze Rechteck berechnet und die Figur abgezogen.', 'Du hast geschickt ergänzt statt einzeln zu zählen.']),
    srText: `Eine Figur im Kästchengitter. Angemalt sind: ${describeCells(placed)}. Die Figur soll ein Rechteck mit ${fmt(b.h)} Reihen und ${fmt(b.w)} Spalten werden. Wie viele Kästchen fehlen noch?`,
  };
}

export const flaecheSkill: SkillDef = {
  id: ID,
  topicId: 'geometrie',
  title: 'Flächeninhalt',
  description: 'Du zählst, wie viele Kästchen eine Figur bedeckt.',
  stufen: {
    1: 'Kästchen in Rechtecken zählen',
    2: 'Zusammengesetzte Figuren zerlegen und zählen',
    3: 'Halbe Kästchen, Lücken und Ergänzen',
  },
  kmk: ['RF.flaeche'],
  generate(rng, stufe) {
    if (stufe === 1) return rectangle(rng);
    if (stufe === 2) return composite(rng);
    const r = rng.next();
    if (r < 0.5) return halfCells(rng);
    if (r < 0.8) return rectangleWithGap(rng);
    return missingToRectangle(rng);
  },
};
