/**
 * Blitzrunde tasks (docs/research.md decision "Timers and Blitzrunde"): only Einmaleins facts the child
 * has already mastered, 2 minutes, own best only, never affects mastery or badges.
 *
 * Tasks are built here from fact keys ('3x7') so the Blitzrunde does not depend on generator internals.
 * Pure: the rng parameter is the only source of randomness.
 */
import { BOX, DIV, TIMES, fmt } from '../../core/format';
import type { NumberAnswer, Rng } from '../../core/types';
import type { ProgressState } from '../../state/types';
import { factFactors, isFactKey } from '../../state/facts';
import { blitzFacts } from '../../state/selectors';

export const BLITZ_MS = 2 * 60 * 1000;

export interface BlitzTask {
  key: string;
  factKey: string;
  expression: string;
  srText: string;
  answer: NumberAnswer;
}

/** Factors of a canonical small-Einmaleins key: '3x7' → [3, 7]; null for anything else (state/facts rules). */
export function parseFactKey(key: string): [number, number] | null {
  if (!isFactKey(key)) return null;
  const [a, b] = factFactors(key);
  return a <= 10 && b <= 10 ? [a, b] : null;
}

/** One Blitz task: a multiplication fact in random order, or its division Umkehraufgabe. */
export function blitzTask(rng: Rng, factKeys: readonly string[], recent: ReadonlySet<string> = new Set()): BlitzTask | null {
  const facts = factKeys.map((k) => [k, parseFactKey(k)] as const).filter((f): f is readonly [string, [number, number]] => f[1] !== null);
  if (facts.length === 0) return null;
  let task: BlitzTask | null = null;
  for (let attempt = 0; attempt < 8; attempt++) {
    const [factKey, [x, y]] = rng.pick(facts);
    const [a, b] = rng.chance(0.5) ? [x, y] : [y, x];
    const product = a * b;
    const division = a > 0 && rng.chance(0.3);
    task = division
      ? {
          key: `${product}:${a}`,
          factKey,
          expression: `${fmt(product)} ${DIV} ${fmt(a)} = ${BOX}`,
          srText: `Wie viel ist ${product} geteilt durch ${a}?`,
          answer: { kind: 'number', value: b, label: 'Ergebnis' },
        }
      : {
          key: `${a}·${b}`,
          factKey,
          expression: `${fmt(a)} ${TIMES} ${fmt(b)} = ${BOX}`,
          srText: `Wie viel ist ${a} mal ${b}?`,
          answer: { kind: 'number', value: product, label: 'Ergebnis' },
        };
    if (!recent.has(task.key) || facts.length === 1) break;
  }
  return task;
}

/**
 * Facts available for the Blitzrunde: `blitzFacts(state)` (box ≥ 4), keeping only well-formed fact keys.
 */
export function availableBlitzFacts(state: ProgressState): string[] {
  try {
    return blitzFacts(state).filter((k) => parseFactKey(k) !== null);
  } catch {
    return [];
  }
}

/** Calm remaining-time text in 30-second steps (no countdown of seconds). */
export function remainingText(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  if (s > 90) return 'Noch 2 Minuten';
  if (s > 60) return 'Noch 1½ Minuten';
  if (s > 30) return 'Noch 1 Minute';
  if (s > 0) return 'Noch eine halbe Minute';
  return 'Die Zeit ist um.';
}
