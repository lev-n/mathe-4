/** Small helpers shared by the geometry generators. */
import { NBSP, fmt } from '../../core/format';
import type { Bug, Cell, ChoiceAnswer, ChoiceOption, Rng, Visual } from '../../core/types';
import { bounds, shift, type HalfCell } from './grid';

/**
 * Build a choice answer from one correct and several wrong options, shuffled with rng.
 * `relabel` (optional) renames options by their final position (e.g. 'A', 'B', 'C').
 * `keepOrder` keeps the given order (used for Ja/Nein, which children expect in a fixed order).
 */
export function makeChoice(
  rng: Rng,
  correct: ChoiceOption,
  wrong: ChoiceOption[],
  opts: { layout?: ChoiceAnswer['layout']; relabel?: (index: number) => string; keepOrder?: boolean; correctIndex?: number } = {},
): ChoiceAnswer {
  const all = [correct, ...wrong];
  let order: number[];
  if (opts.keepOrder) {
    order = wrong.map((_, i) => i + 1);
    order.splice(Math.min(opts.correctIndex ?? 0, order.length), 0, 0);
  } else {
    order = rng.shuffle(all.map((_, i) => i));
  }
  const options: ChoiceOption[] = order.map((i, pos) => {
    const o = all[i];
    const out: ChoiceOption = { label: opts.relabel ? opts.relabel(pos) : o.label };
    if (o.visual) out.visual = o.visual;
    if (i !== 0 && o.whyWrong) out.whyWrong = o.whyWrong;
    return out;
  });
  const answer: ChoiceAnswer = { kind: 'choice', options, correct: order.indexOf(0) };
  if (opts.layout) answer.layout = opts.layout;
  return answer;
}

/**
 * Spoken list of choice labels for srText ('Zur Wahl: …'). Labels that are whole sentences lose their final
 * period and are separated by semicolons, so the screen reader never hears '..' or a comma inside a sentence
 * as a list separator.
 */
export function choiceList(labels: readonly string[]): string {
  const clean = labels.map((l) => l.replace(/\.$/, ''));
  const sentences = labels.some((l) => /[.,]/.test(l));
  return `${clean.join(sentences ? '; ' : ', ')}.`;
}

/** 'A', 'B', 'C' … */
export const letter = (i: number): string => String.fromCharCode(65 + i);

/** Choose one of several praise sentences (all specific process praise). */
export function praiseFrom(rng: Rng, options: readonly string[]): string {
  return rng.pick(options);
}

/** '1 Kästchen' / '5 Kästchen'; '1 Kästchenlänge' / '5 Kästchenlängen'. */
export const kaestchen = (n: number): string => `${fmt(n)}${NBSP}Kästchen`;
export const laengen = (n: number): string => `${fmt(n)}${NBSP}${n === 1 ? 'Kästchenlänge' : 'Kästchenlängen'}`;

/** '3 + 4 + 5' */
export const sumText = (parts: readonly number[]): string => parts.map((p) => fmt(p)).join(' + ');

/** Collects typical wrong answers; skips values equal to the correct answer, duplicates and negative values. */
export class BugList {
  readonly list: Bug[] = [];
  private readonly correct: number;
  constructor(correct: number) {
    this.correct = correct;
  }
  add(id: string, value: number, hint: string): this {
    if (!Number.isFinite(value) || value < 0 || value === this.correct) return this;
    if (this.list.some((b) => b.match === value)) return this;
    this.list.push({ id, match: value, hint });
    return this;
  }
}

/** Place a figure on a grid with `margin` empty cells around it. Returns the grid visual and the shifted cells. */
export function placeOnGrid(
  cells: readonly Cell[],
  opts: { halves?: readonly HalfCell[]; margin?: number; showOutline?: boolean; caption?: string } = {},
): { visual: Extract<Visual, { type: 'grid' }>; cells: Cell[]; halves: HalfCell[] } {
  const margin = opts.margin ?? 1;
  const all = [...cells, ...(opts.halves ?? []).map((h) => h.cell)];
  const b = bounds(all);
  const dx = margin - b.minX;
  const dy = margin - b.minY;
  const moved = shift(cells, dx, dy);
  const halves = (opts.halves ?? []).map((h) => ({ cell: [h.cell[0] + dx, h.cell[1] + dy] as Cell, corner: h.corner }));
  const visual: Extract<Visual, { type: 'grid' }> = {
    type: 'grid',
    width: b.w + 2 * margin,
    height: b.h + 2 * margin,
    cells: moved,
  };
  if (halves.length) visual.halfCells = halves;
  if (opts.showOutline ?? true) visual.showOutline = true;
  if (opts.caption) visual.caption = opts.caption;
  return { visual, cells: moved, halves };
}

/** Two figures side by side on one grid ("Figur A" left, "Figur B" right), separated by `gap` empty columns. */
export function twoFiguresGrid(
  a: readonly Cell[],
  b: readonly Cell[],
  caption: string,
  gap = 2,
): { visual: Extract<Visual, { type: 'grid' }>; a: Cell[]; b: Cell[] } {
  const ba = bounds(a);
  const bb = bounds(b);
  const h = Math.max(ba.h, bb.h);
  const A = shift(a, 1 - ba.minX, 1 - ba.minY + Math.floor((h - ba.h) / 2));
  const B = shift(b, 1 + ba.w + gap - bb.minX, 1 - bb.minY + Math.floor((h - bb.h) / 2));
  return {
    visual: { type: 'grid', width: ba.w + gap + bb.w + 2, height: h + 2, cells: [...A, ...B], showOutline: true, caption },
    a: A,
    b: B,
  };
}
