/**
 * Small helpers shared by the generators of the topics 'zahlen' and 'kopfrechnen'.
 * Pure functions only (no React, no randomness except through the Rng parameter).
 */
import { fmt } from '../../core/format';
import type { Bug, ChoiceAnswer, ChoiceOption, OrderAnswer, PlaceColumn, Rng } from '../../core/types';

// ─── Place value ─────────────────────────────────────────────────────────────

export const PV: Record<PlaceColumn, number> = { M: 1_000_000, HT: 100_000, ZT: 10_000, T: 1000, H: 100, Z: 10, E: 1 };

/** Columns from left (largest) to right (Einer). */
export const COLUMNS: readonly PlaceColumn[] = ['M', 'HT', 'ZT', 'T', 'H', 'Z', 'E'];

/** Plural name of a place ('Hunderter'); also used after 'auf' ('Runde auf Hunderter'). */
export const PLACE_NAME: Record<PlaceColumn, string> = {
  M: 'Millionen',
  HT: 'Hunderttausender',
  ZT: 'Zehntausender',
  T: 'Tausender',
  H: 'Hunderter',
  Z: 'Zehner',
  E: 'Einer',
};

/** 'Hunderterstelle' */
export function stelle(c: PlaceColumn): string {
  return c === 'M' ? 'Millionenstelle' : `${PLACE_NAME[c]}stelle`;
}

/** 'Nachbarhunderter' */
export function nachbar(c: PlaceColumn): string {
  return `Nachbar${PLACE_NAME[c].toLowerCase()}`;
}

/** Dative plural after 'zwischen den', 'mit den' …: 'Nachbarhundertern' (Millionen stays). */
export function nachbarDativ(c: PlaceColumn): string {
  const name = nachbar(c);
  return name.endsWith('n') ? name : `${name}n`;
}

export function colOf(placeValue: number): PlaceColumn {
  const c = COLUMNS.find((k) => PV[k] === placeValue);
  if (!c) throw new RangeError(`colOf: not a place value: ${placeValue}`);
  return c;
}

/** Column one place to the right (smaller), or null for E. */
export function smallerCol(c: PlaceColumn): PlaceColumn | null {
  const i = COLUMNS.indexOf(c);
  return i < COLUMNS.length - 1 ? COLUMNS[i + 1] : null;
}

/** Column one place to the left (bigger), or null for M. */
export function biggerCol(c: PlaceColumn): PlaceColumn | null {
  const i = COLUMNS.indexOf(c);
  return i > 0 ? COLUMNS[i - 1] : null;
}

export function digitAt(n: number, c: PlaceColumn): number {
  return Math.floor(n / PV[c]) % 10;
}

/** Columns from the highest digit of n (at least `minCount` columns) down to E. */
export function columnsFor(n: number, minCount = 1): PlaceColumn[] {
  const count = Math.max(String(n).length, minCount);
  return COLUMNS.slice(COLUMNS.length - count);
}

/** Round half up to a multiple of p (integer arithmetic). */
export function roundTo(n: number, p: number): number {
  const q = Math.floor(n / p);
  const r = n - q * p;
  return (2 * r >= p ? q + 1 : q) * p;
}

export function floorTo(n: number, p: number): number {
  return Math.floor(n / p) * p;
}

/** Random integer with exactly `digits` digits; `zeros` of the non-leading digits are 0, the others 1–9. */
export function randomDigits(rng: Rng, digits: number, zeros = 0): number {
  const positions = Array.from({ length: digits - 1 }, (_, i) => i + 1);
  const zeroAt = new Set(rng.sample(positions, Math.min(zeros, digits - 1)));
  let s = String(rng.int(1, 9));
  for (let i = 1; i < digits; i++) s += zeroAt.has(i) ? '0' : String(rng.int(1, 9));
  return Number(s);
}

/** Number of '0' digits in n. */
export function zeroCount(n: number): number {
  return (String(n).match(/0/g) ?? []).length;
}

/** Digits of n without its zeros, read as a number ('Null vergessen'): 40 302 → 432. */
export function dropZeros(n: number): number {
  const s = String(n).replace(/0/g, '');
  return s === '' ? 0 : Number(s);
}

// ─── Text helpers ────────────────────────────────────────────────────────────

/** German list: ['a', 'b', 'c'] → 'a, b und c'. */
export function joinDe(items: string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} und ${items[items.length - 1]}`;
}

/** Soft hyphens after 'tausend' and 'hundert' so long number words can wrap on small screens. */
export function softWord(word: string): string {
  return word.replace(/(tausend|hundert)(?=[a-zäöüß])/g, '$1\u00AD');
}

/** Stufenschrift in Bayern style: '4ZT 5T 3H 2E' (zero places omitted). */
export function stufenschrift(n: number): string {
  return columnsFor(n)
    .filter((c) => digitAt(n, c) !== 0)
    .map((c) => `${digitAt(n, c)}${c}`)
    .join(' ');
}

/** Spoken Stufenschrift: '4 Zehntausender, 5 Tausender und 2 Einer'. */
export function stufenSpeech(n: number): string {
  return joinDe(
    columnsFor(n)
      .filter((c) => digitAt(n, c) !== 0)
      .map((c) => `${digitAt(n, c)} ${placeWord(c, digitAt(n, c))}`),
  );
}

/** Place name with number agreement: 1 Million / 2 Millionen, otherwise invariant. */
export function placeWord(c: PlaceColumn, count: number): string {
  if (c === 'M') return count === 1 ? 'Million' : 'Millionen';
  return PLACE_NAME[c];
}

// ─── Answer builders ─────────────────────────────────────────────────────────

export interface WrongOption {
  label: string;
  whyWrong: string;
}

/**
 * Choice answer with the correct label plus up to `max - 1` distinct wrong options.
 * Options are shuffled with rng unless `shuffle` is false (e.g. the symbols <, =, >).
 */
export function choiceAnswer(
  rng: Rng,
  correct: string,
  wrong: WrongOption[],
  opts: { max?: number; layout?: ChoiceAnswer['layout']; shuffle?: boolean } = {},
): ChoiceAnswer {
  const seen = new Set([correct]);
  const unique: WrongOption[] = [];
  for (const w of wrong) {
    if (seen.has(w.label)) continue;
    seen.add(w.label);
    unique.push(w);
  }
  const options: ChoiceOption[] = [
    { label: correct },
    ...unique.slice(0, (opts.max ?? 4) - 1).map((w) => ({ label: w.label, whyWrong: w.whyWrong })),
  ];
  const order = opts.shuffle === false ? options.map((_, i) => i) : rng.shuffle(options.map((_, i) => i));
  const answer: ChoiceAnswer = { kind: 'choice', options: order.map((i) => options[i]), correct: order.indexOf(0) };
  if (opts.layout) answer.layout = opts.layout;
  return answer;
}

/** Order answer for distinct numbers, shown shuffled (never already in the target order). */
export function orderAnswer(rng: Rng, values: number[], direction: 'aufsteigend' | 'absteigend'): OrderAnswer {
  const sorted = [...values].sort((a, b) => (direction === 'aufsteigend' ? a - b : b - a));
  let shown = rng.shuffle(values);
  if (shown.every((v, i) => v === sorted[i])) shown = [...shown.slice(1), shown[0]];
  return {
    kind: 'order',
    items: shown.map((v) => fmt(v)),
    correct: sorted.map((v) => shown.indexOf(v)),
    direction,
  };
}

type BugMatch = number | Record<string, number>;

function sameMatch(a: Bug['match'], b: BugMatch): boolean {
  if (Array.isArray(a)) return false;
  if (typeof a === 'number' || typeof b === 'number') return a === b;
  const keys = Object.keys(a);
  return keys.length === Object.keys(b).length && keys.every((k) => a[k] === b[k]);
}

/**
 * Build a bug list: skips missing/invalid matches, matches equal to the correct answer and duplicates.
 * For record matches, `correct` must hold all field values.
 */
export function bugList(correct: BugMatch, candidates: [id: string, match: BugMatch | null | undefined, hint: string][]): Bug[] {
  const out: Bug[] = [];
  for (const [id, match, hint] of candidates) {
    if (match === null || match === undefined) continue;
    if (typeof match === 'number' && (!Number.isFinite(match) || match < 0 || !Number.isInteger(match))) continue;
    if (sameMatch(match, correct)) continue;
    if (out.some((b) => sameMatch(b.match, match))) continue;
    out.push({ id, match, hint });
  }
  return out;
}
