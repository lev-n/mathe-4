/**
 * Helpers for the Sachaufgaben generators (re-exports the generic helpers from the Größen topic).
 */
import { fmt, TIMES } from '../../core/format';
import type { NumberAnswer } from '../../core/types';
import type { Op } from './stories';

export {
  build, joinList, makeChoice, multiBugs, numberBugs, pickPerson, pickTwo, plural, Pron, poss, roundTo, safeHints, speak, PEOPLE,
  type Person,
} from '../groessen/helpers';

/** Round to the leading digit's place: 1234 → 1000, 567 → 600, 48 → 50. */
export function roundLeading(n: number): number {
  if (n < 10) return n;
  const p = 10 ** Math.floor(Math.log10(n));
  return Math.round(n / p) * p;
}

/** Überschlag line for a one-step calculation, or a Probe for division. */
export function checkLine(op: Op, a: number, b: number, value: number): string {
  if (op === ':') return `Probe: ${fmt(value)} ${TIMES} ${fmt(b)} = ${fmt(a)}`;
  if (op === '*') {
    const [x, y] = a >= b ? [roundLeading(a), b < 10 ? b : roundLeading(b)] : [a < 10 ? a : roundLeading(a), roundLeading(b)];
    return `Überschlag: ${fmt(x)} ${TIMES} ${fmt(y)} = ${fmt(x * y)}`;
  }
  const x = roundLeading(a);
  const y = roundLeading(b);
  return op === '+' ? `Überschlag: ${fmt(x)} + ${fmt(y)} = ${fmt(x + y)}` : `Überschlag: ${fmt(x)} − ${fmt(y)} = ${fmt(x - y)}`;
}

/** Hint for choosing a wrong operation, phrased as a question about the situation. */
export const WRONG_OP_HINT: Record<Op, string> = {
  '+': 'Prüfe: Kommt in der Geschichte wirklich etwas dazu? Wird es mehr?',
  '-': 'Prüfe: Wird in der Geschichte wirklich etwas weggenommen oder verglichen?',
  '*': 'Prüfe: Gibt es in der Geschichte gleich große Gruppen, die mehrmals vorkommen?',
  ':': 'Prüfe: Wird in der Geschichte wirklich etwas gerecht verteilt oder eingeteilt?',
};

/** Number answer embedded in an Antwortsatz. */
export function sentenceAnswer(value: number | null, before: string, after: string, label: string, extra: Partial<NumberAnswer> = {}): NumberAnswer {
  const a: NumberAnswer = { kind: 'number', value, after, label, ...extra };
  if (before) a.before = before;
  return a;
}

/** Antwortsatz text for steps: 'Die Klasse braucht 5 Autos.' */
export function answerSentence(before: string, value: string, after: string): string {
  return [before, value, after].filter(Boolean).join(' ').replace(/^./, (c) => c.toUpperCase());
}
