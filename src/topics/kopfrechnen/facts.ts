/**
 * Einmaleins facts (1 · 1 … 10 · 10), their introduction order and the Leitner-based choice of the next fact.
 * Tauschaufgaben share one fact key: '3x7' (smaller factor first).
 */
import type { GenContext, Rng } from '../../core/types';

export const KERN = [1, 2, 5, 10] as const;

export function factKey(a: number, b: number): string {
  return `${Math.min(a, b)}x${Math.max(a, b)}`;
}

export function parseFactKey(key: string): [number, number] {
  const [a, b] = key.split('x').map(Number);
  return [a, b];
}

export type FactKind = 'kern' | 'quadrat' | 'abgeleitet';

export function factKind(a: number, b: number): FactKind {
  if ((KERN as readonly number[]).includes(a) || (KERN as readonly number[]).includes(b)) return 'kern';
  if (a === b) return 'quadrat';
  return 'abgeleitet';
}

/** Distance of a factor to the nearest useful Kernzahl (2, 5, 10; 1 counts only for 2). */
export function kernDistance(x: number): number {
  return Math.min(...[2, 5, 10].map((k) => Math.abs(x - k)), x === 1 ? 0 : 99);
}

/** Order in which the Kernaufgaben are introduced: ·2 and ·10, then ·5, then ·1 (mixed, never row by row). */
const OTHER_ORDER = [3, 7, 4, 9, 6, 8, 2, 5, 10, 1];

function kernTier(a: number, b: number): number {
  const has = (k: number) => a === k || b === k;
  if (has(2) || has(10)) return 0;
  if (has(5)) return 1;
  return 2;
}

/**
 * All 55 fact keys in introduction order: Kernaufgaben → Quadrataufgaben → abgeleitete Aufgaben
 * (closest to a Kernaufgabe first).
 */
export const INTRO_ORDER: readonly string[] = (() => {
  const facts: [number, number][] = [];
  for (let a = 1; a <= 10; a++) for (let b = a; b <= 10; b++) facts.push([a, b]);
  const kind = (f: [number, number]) => ['kern', 'quadrat', 'abgeleitet'].indexOf(factKind(f[0], f[1]));
  const other = (f: [number, number]) => {
    const [a, b] = f;
    const kern = [2, 10, 5, 1].find((k) => a === k || b === k) ?? a;
    return OTHER_ORDER.indexOf(a === kern ? b : a);
  };
  facts.sort((x, y) => {
    const kx = kind(x);
    const ky = kind(y);
    if (kx !== ky) return kx - ky;
    if (kx === 0) return kernTier(x[0], x[1]) - kernTier(y[0], y[1]) || other(x) - other(y) || x[0] - y[0];
    if (kx === 1) return OTHER_ORDER.indexOf(x[0]) - OTHER_ORDER.indexOf(y[0]);
    const dx = Math.min(kernDistance(x[0]), kernDistance(x[1]));
    const dy = Math.min(kernDistance(y[0]), kernDistance(y[1]));
    return dx - dy || x[0] * x[1] - y[0] * y[1] || x[0] - y[0];
  });
  return facts.map(([a, b]) => factKey(a, b));
})();

/** true if the fact has not been practised yet (or fell back to box 0). Unknown without fact data. */
export function isNewFact(key: string, ctx: GenContext): boolean | null {
  if (!ctx.facts) return null;
  const f = ctx.facts[key];
  return !f || f.box === 0;
}

/** Facts in box 0 (new and missed, not yet answered right) that may be open at once before new facts wait. */
export const MAX_LEARNING = 4;

/**
 * Choose the next fact.
 * - Without fact data (worksheets, first visit without storage) every fact is equally likely.
 * - With fact data:
 *   1. Facts due by date (the scheduler's "Heute wiederholen" facts) always come first, most overdue first.
 *      A fact answered today is due again tomorrow at the earliest, so it is not drilled again the same day.
 *   2. Otherwise the next new facts in INTRO_ORDER, mixed with box-0 facts (missed today, consolidated in the
 *      same session) and now and then a known fact. New facts wait while MAX_LEARNING facts are in box 0.
 */
export function pickFact(rng: Rng, ctx: GenContext): string {
  const facts = ctx.facts;
  if (!facts) return rng.pick(INTRO_ORDER);
  const today = ctx.today;
  const introduced = INTRO_ORDER.filter((k) => k in facts);
  const due = introduced
    .filter((k) => {
      const d = facts[k].due;
      return !d || (today !== undefined && d <= today);
    })
    .sort((x, y) => (facts[x].due ?? '').localeCompare(facts[y].due ?? '') || facts[x].box - facts[y].box);
  if (due.length > 0) return rng.pick(due.slice(0, 4));
  const learning = introduced.filter((k) => facts[k].box === 0);
  const known = introduced.filter((k) => facts[k].box >= 1);
  const fresh = learning.length < MAX_LEARNING ? INTRO_ORDER.filter((k) => !(k in facts)).slice(0, 3) : [];
  const roll = rng.next();
  if (fresh.length > 0) {
    if (learning.length > 0 && roll < 0.4) return rng.pick(learning);
    if (known.length > 0 && roll >= 0.9) return rng.pick(known);
    return rng.pick(fresh);
  }
  // No new facts (all introduced, or too many open): consolidate box 0, with known facts in between.
  if (learning.length > 0 && (known.length === 0 || roll < 0.7)) return rng.pick(learning);
  if (known.length > 0) return rng.pick(known);
  return rng.pick(INTRO_ORDER);
}

// ─── Derivation from the nearest Kernaufgabe ──────────────────────────────────

export interface Derivation {
  /** Which displayed factor is varied: 'a' (first) or 'b' (second). */
  vary: 'a' | 'b';
  /** Factor used instead of the varied factor (a Kernzahl, or the other factor for a Quadrataufgabe). */
  kern: number;
  /** varied factor − kern (−2 … 2). */
  diff: number;
  /** The known task to start from: a Kernaufgabe (5 · 7) or a Quadrataufgabe (7 · 7 for 7 · 8). */
  anchor: 'kern' | 'quadrat';
}

const NEAREST: Record<number, number> = { 3: 2, 4: 5, 6: 5, 7: 5, 8: 10, 9: 10 };

/**
 * Nearest known task for a · b (display order kept). null for Kernaufgaben themselves.
 * Usually a Kernaufgabe; when both factors are two steps from a Kernzahl (7 · 8), the neighbouring
 * Quadrataufgabe (7 · 7, introduced right after the Kernaufgaben) is one row away and is used instead.
 */
export function derivation(a: number, b: number): Derivation | null {
  if (factKind(a, b) === 'kern') return null;
  const da = Math.abs(a - NEAREST[a]);
  const db = Math.abs(b - NEAREST[b]);
  if (Math.min(da, db) >= 2 && Math.abs(a - b) === 1) {
    const sq = Math.min(a, b);
    return a === sq ? { vary: 'b', kern: sq, diff: b - sq, anchor: 'quadrat' } : { vary: 'a', kern: sq, diff: a - sq, anchor: 'quadrat' };
  }
  if (da <= db) return { vary: 'a', kern: NEAREST[a], diff: a - NEAREST[a], anchor: 'kern' };
  return { vary: 'b', kern: NEAREST[b], diff: b - NEAREST[b], anchor: 'kern' };
}

const anchorName = (d: Derivation) => (d.anchor === 'quadrat' ? 'Quadrataufgabe' : 'Kernaufgabe');

/** '5 · 7' style term with the varied factor replaced. */
function term(a: number, b: number, d: Derivation, factor: number): string {
  return d.vary === 'a' ? `${factor} · ${b}` : `${a} · ${factor}`;
}

/** Worked derivation steps for a · b, e.g. ['Kernaufgabe: 5 · 7 = 35', '6 · 7 = 35 + 7 = 42']. */
export function derivationSteps(a: number, b: number): string[] {
  const p = a * b;
  const d = derivation(a, b);
  if (!d) {
    const k = (KERN as readonly number[]).includes(a) ? a : b;
    const other = k === a ? b : a;
    const swap = k !== a ? [`Tauschaufgabe: ${a} · ${b} = ${b} · ${a}.`] : [];
    // (the last step states 'a · b = p', so the strategy line does not repeat that equation)
    const how =
      k === 2
        ? `2 · ${other} heißt verdoppeln: ${other} + ${other} = ${p}.`
        : k === 10
          ? `Bei mal 10 hängst du an die ${other} eine Null an: ${p}.`
          : k === 5
            ? `10 · ${other} = ${10 * other}. 5 · ${other} ist die Hälfte davon: ${p}.`
            : `Mal 1 heißt: Du nimmst die ${other} genau einmal.`;
    return [...swap, how, `Also: ${a} · ${b} = ${p}.`];
  }
  const other = d.vary === 'a' ? b : a;
  const kp = d.kern * other;
  const sign = d.diff > 0 ? '+' : '−';
  const absd = Math.abs(d.diff);
  const lines = [`${anchorName(d)}: ${term(a, b, d, d.kern)} = ${kp}`];
  if (absd === 1) lines.push(`${term(a, b, d, d.kern)} = ${kp} → ${a} · ${b} = ${kp} ${sign} ${other} = ${p}`);
  else lines.push(`${a} · ${b} = ${term(a, b, d, d.kern)} ${sign} ${term(a, b, d, absd)} = ${kp} ${sign} ${absd * other} = ${p}`);
  lines.push(`Also: ${a} · ${b} = ${p}.`);
  return lines;
}

/** Strategy hint for a · b that never contains the product. */
export function factHint(a: number, b: number): string {
  const d = derivation(a, b);
  if (!d) {
    const k = (KERN as readonly number[]).includes(a) ? a : b;
    const other = k === a ? b : a;
    const tausch = k === a ? '' : `Tausche: ${b} · ${a}. `;
    if (k === 2) return `${tausch}Verdopple ${other}.`;
    if (k === 10) return `${tausch}Mal 10: Hänge an ${other} eine Null an.`;
    if (k === 5) return `${tausch}5 · ${other} ist die Hälfte von 10 · ${other}.`;
    return `${tausch}1 · ${other}: Du nimmst ${other} genau einmal.`;
  }
  const other = d.vary === 'a' ? b : a;
  const absd = Math.abs(d.diff);
  const kp = d.kern * other;
  const change = absd === 1 ? `${other}` : `${absd} · ${other}`;
  return `Nutze die ${anchorName(d)} ${term(a, b, d, d.kern)} = ${kp}. Rechne dann ${change} ${d.diff > 0 ? 'dazu' : 'weg'}.`;
}

// ─── Finding an unknown factor (Geteilt- and Platzhalteraufgaben) ─────────────

/** Kernzahl to start the search for an unknown factor q (never q itself unless q is a Kernzahl). */
export function searchStart(q: number): number {
  return (KERN as readonly number[]).includes(q) ? q : NEAREST[q];
}

/**
 * Steps to find the unknown factor q of q · d = p from the known factor d: start with a Kernaufgabe of d and
 * correct by whole d's. The unknown q is never used as a known starting point (unlike derivationSteps).
 * The last step states the fact; unknownFirst = false writes it as d · q (e.g. for 'a · □ = p').
 */
export function searchSteps(q: number, d: number, unknownFirst = true): string[] {
  const p = q * d;
  const t = (x: number) => (unknownFirst ? `${x} · ${d}` : `${d} · ${x}`);
  if (d === 1) return [`Mal 1 ändert eine Zahl nicht: ${t(q)} = ${p}.`];
  const k = searchStart(q);
  if (k === q) return [`Probiere die Kernaufgabe ${t(q)} = ${p}. Das passt genau.`];
  const kp = k * d;
  const absd = Math.abs(q - k);
  const rows = absd === 1 ? `einmal die ${d}` : `${absd}-mal die ${d}`;
  return [
    `Probiere eine Kernaufgabe: ${t(k)} = ${kp}. Das ist zu ${kp < p ? 'wenig' : 'viel'}.`,
    kp < p ? `Bis ${p} fehlen ${p - kp}. Das ist noch ${rows}: ${t(q)} = ${p}.` : `${kp} − ${p} = ${kp - p}. Das ist ${rows} zu viel: ${t(q)} = ${p}.`,
  ];
}

