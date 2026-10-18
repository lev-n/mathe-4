/**
 * Einmaleins fact keys: 'axb' with the smaller factor first (Tauschaufgaben share one key).
 * The small Einmaleins 1 · 1 … 10 · 10 has 55 such keys.
 */

/** Largest factor accepted in a stored fact key (defensive: generators may use · 0 or · 20 analogues). */
export const MAX_FACTOR = 20;

const FACT_RE = /^\s*(\d{1,2})\s*[x×·*]\s*(\d{1,2})\s*$/i;

/** Canonical key ('7x3' → '3x7'), or null if the key is not a valid fact. */
export function normalizeFactKey(key: unknown): string | null {
  if (typeof key !== 'string') return null;
  const m = FACT_RE.exec(key);
  if (!m) return null;
  const a = Number(m[1]);
  const b = Number(m[2]);
  if (a > MAX_FACTOR || b > MAX_FACTOR) return null;
  return a <= b ? `${a}x${b}` : `${b}x${a}`;
}

/** true if `key` is already in canonical form. */
export function isFactKey(key: unknown): key is string {
  return typeof key === 'string' && normalizeFactKey(key) === key;
}

/** Factors of a canonical key, smaller first. */
export function factFactors(key: string): [number, number] {
  const [a, b] = key.split('x').map(Number);
  return [a, b];
}

/** All 55 keys of the small Einmaleins (1 · 1 … 10 · 10), ordered by factors. */
export const ALL_FACT_KEYS: readonly string[] = (() => {
  const out: string[] = [];
  for (let a = 1; a <= 10; a++) for (let b = a; b <= 10; b++) out.push(`${a}x${b}`);
  return out;
})();

/** Kernaufgaben: facts with a factor 1, 2, 5 or 10 (34 keys). */
export const KERN_FACT_KEYS: readonly string[] = ALL_FACT_KEYS.filter((k) => factFactors(k).some((f) => f === 1 || f === 2 || f === 5 || f === 10));

/** Numeric ordering of fact keys (1x1, 1x2, …, 2x2, …). */
export function compareFactKeys(a: string, b: string): number {
  const [a1, a2] = factFactors(a);
  const [b1, b2] = factFactors(b);
  return a1 - b1 || a2 - b2;
}
