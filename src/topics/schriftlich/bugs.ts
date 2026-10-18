/**
 * Bug library for the written algorithms (docs/research.md L13, decision "Bug library for written algorithms").
 *
 * Each bug computes the wrong result a child with that misconception would get, plus a kind,
 * column-specific hint ("Schau dir die Zehnerstelle noch einmal an: …"). Hints never say "falsch".
 * Division bugs return the wrong quotient (CheckResult compares the quotient; the remainder separately).
 */
import type { Bug, SubtractionMethod, WrittenOp } from '../../core/types';
import {
  correctResult,
  digitAt,
  digitsOf,
  firstDiffPlace,
  layoutAdd,
  layoutDiv,
  layoutSub,
  numLength,
  placeDative,
  placeName,
  placeStelle,
} from './layout';

export interface BugDef {
  id: string;
  op: WrittenOp;
  /** Subtraction: only for these methods (default: both). */
  methods?: readonly SubtractionMethod[];
  /** Short description of the misconception (Fehlerdetektiv option), e.g. 'Der Übertrag wurde vergessen.' */
  label(method: SubtractionMethod): string;
  /** Expected wrong result (div: quotient), or null if the misconception does not show with these operands. */
  compute(operands: readonly number[], method: SubtractionMethod): number | null;
  /** Targeted, column-specific hint for this wrong result. */
  hint(operands: readonly number[], method: SubtractionMethod, wrong: number): string;
  /**
   * Column (place) where the misconception happens, if the bug is column-local. It can lie to the right of the
   * first wrong digit when the faulty column gives the right digit by chance (0 − 5 → 5).
   */
  place?(operands: readonly number[], method: SubtractionMethod): number | null;
}

const pow10 = (p: number) => 10 ** p;
const lookAt = (p: number) => `Schau dir die ${placeStelle(p)} noch einmal an:`;

// ─── Addition ────────────────────────────────────────────────────────────────

function digitSums(ops: readonly number[]): number[] {
  const maxLen = Math.max(...ops.map(numLength));
  return Array.from({ length: maxLen }, (_, p) => ops.reduce((s, n) => s + (numLength(n) > p ? digitAt(n, p) : 0), 0));
}

/** Simulate column addition with a custom carry rule: (column sum incl. carry) → [written digit(s), next carry]. */
function addWith(ops: readonly number[], rule: (s: number, carry: number) => { digit: number; carry: number; s?: number }): number | null {
  const sums = digitSums(ops);
  let carry = 0;
  let res = 0;
  for (let p = 0; p < sums.length || carry > 0; p++) {
    if (p > 12) return null;
    const { digit, carry: next } = rule(sums[p] ?? 0, carry);
    if (digit > 9 && p < sums.length - 1) return null;
    res += digit * pow10(p);
    carry = next;
  }
  return res;
}

/** Column addition without any carry. The leftmost column is written in full (8 + 5 → 13), like on paper. */
function addNoCarry(ops: readonly number[], fullLast: boolean): number | null {
  const sums = digitSums(ops);
  if (sums.slice(0, -1).every((s) => s < 10)) return null;
  const last = sums.length - 1;
  return sums.reduce((acc, s, p) => acc + (fullLast && p === last ? s : s % 10) * pow10(p), 0);
}

const noCarryHint = (ops: readonly number[], wrong: number) => {
  const p = firstDiffPlace(correctResult('add', ops), wrong);
  return `${lookAt(p)} Von den ${placeDative(p - 1)} kommt noch ein Übertrag dazu.`;
};

export const ADD_BUGS: BugDef[] = [
  {
    id: 'add.no-carry',
    op: 'add',
    label: () => 'Der Übertrag wurde vergessen.',
    compute: (ops) => addNoCarry(ops, true),
    hint: (ops, _m, wrong) => noCarryHint(ops, wrong),
  },
  {
    id: 'add.carry-twice',
    op: 'add',
    label: () => 'Der Übertrag wurde doppelt gezählt.',
    compute: (ops) => addWith(ops, (s, c) => ({ digit: (s + 2 * c) % 10, carry: Math.floor((s + 2 * c) / 10) })),
    hint: (ops, _m, wrong) => {
      const p = firstDiffPlace(correctResult('add', ops), wrong);
      return `${lookAt(p)} Den Übertrag zählst du nur einmal dazu.`;
    },
  },
  {
    id: 'add.carry-too-small',
    op: 'add',
    label: () => 'Als Übertrag wurde nur 1 gemerkt, obwohl der Übertrag größer war.',
    compute: (ops) => {
      if (!layoutAdd(ops).carries.some((c) => c >= 2)) return null;
      return addWith(ops, (s, c) => ({ digit: (s + c) % 10, carry: Math.min(1, Math.floor((s + c) / 10)) }));
    },
    hint: (ops) => {
      const lay = layoutAdd(ops);
      const p = lay.carries.findIndex((c) => c >= 2) - 1;
      // 23 Zehntausender are 2 Hunderttausender and 3 Zehntausender: ask for the next place, not for "Zehner"
      return `${lookAt(p + 1)} Die ${placeName(p)} ergeben zusammen ${lay.columnSums[p]}. Wie viele volle ${placeName(p + 1)} sind das? So groß ist der Übertrag.`;
    },
    place: (ops) => {
      const i = layoutAdd(ops).carries.findIndex((c) => c >= 2);
      return i < 0 ? null : i;
    },
  },
  {
    id: 'add.carry-swapped',
    op: 'add',
    label: () => 'Ziffer und Übertrag wurden vertauscht.',
    compute: (ops) => {
      const sums = digitSums(ops);
      let carry = 0;
      let res = 0;
      let swapped = false;
      for (let p = 0; p < sums.length || carry > 0; p++) {
        const s = (sums[p] ?? 0) + carry;
        if (s >= 10) {
          swapped = true;
          res += Math.floor(s / 10) * pow10(p);
          carry = s % 10;
        } else {
          res += s * pow10(p);
          carry = 0;
        }
        if (p > 12) return null;
      }
      return swapped ? res : null;
    },
    hint: (ops, _m, wrong) => {
      const p = firstDiffPlace(correctResult('add', ops), wrong);
      return `${lookAt(p)} Die Einer der Spaltensumme schreibst du hin. Die Zehner kommen als Übertrag in die nächste Spalte.`;
    },
  },
  {
    id: 'add.last-carry',
    op: 'add',
    label: () => 'Vorne fehlt der letzte Übertrag.',
    compute: (ops) => {
      const maxLen = Math.max(...ops.map(numLength));
      const sum = correctResult('add', ops);
      return numLength(sum) > maxLen ? sum % pow10(maxLen) : null;
    },
    hint: () => 'Schau ganz nach links: Der letzte Übertrag kommt als neue Ziffer vorne ins Ergebnis.',
  },
  {
    id: 'add.misaligned',
    op: 'add',
    label: () => 'Die Zahlen stehen nicht stellengerecht untereinander.',
    compute: (ops) => {
      const maxLen = Math.max(...ops.map(numLength));
      if (ops.every((n) => numLength(n) === maxLen)) return null;
      return ops.reduce((acc, n) => acc + n * pow10(maxLen - numLength(n)), 0);
    },
    hint: () => 'Schreibe die Zahlen stellengerecht untereinander: Einer unter Einer, Zehner unter Zehner.',
  },
  {
    // the rarer variant of "no carry": also the leftmost column keeps only its Einer (8 + 5 → 3)
    id: 'add.no-carry-cut',
    op: 'add',
    label: () => 'Der Übertrag wurde vergessen.',
    compute: (ops) => addNoCarry(ops, false),
    hint: (ops, _m, wrong) => noCarryHint(ops, wrong),
  },
];

// ─── Subtraction ─────────────────────────────────────────────────────────────

/** First place (from the right) where the Minuend digit is smaller than the Subtrahend digit. */
function firstNeedPlace(a: number, b: number): number {
  const len = numLength(a);
  for (let p = 0; p < len; p++) if (digitAt(a, p) < (p < numLength(b) ? digitAt(b, p) : 0)) return p;
  return -1;
}

/** Abziehen with a custom rule for untouched zeros in the Minuend and for the zeros crossed when Entbündeln. */
function subAbziehenWith(
  a: number,
  b: number,
  opts: { zeroRule?: (bDigit: number) => number; crossedZero?: number },
): { value: number; applied: boolean; firstAt: number } | null {
  const width = numLength(a);
  const t = Array.from({ length: width }, (_, p) => digitAt(a, p));
  const touched = new Array<boolean>(width).fill(false);
  let res = 0;
  let applied = false;
  let firstAt = -1;
  const mark = (p: number) => {
    if (!applied) firstAt = p;
    applied = true;
  };
  for (let p = 0; p < width; p++) {
    const bd = p < numLength(b) ? digitAt(b, p) : 0;
    if (opts.zeroRule && digitAt(a, p) === 0 && !touched[p] && bd > 0) {
      res += opts.zeroRule(bd) * pow10(p);
      mark(p);
      continue;
    }
    if (t[p] < bd) {
      let j = p + 1;
      while (j < width && t[j] === 0) j++;
      if (j >= width) return null;
      t[j] -= 1;
      touched[j] = true;
      for (let k = p + 1; k < j; k++) {
        t[k] = opts.crossedZero ?? 9;
        touched[k] = true;
        if (opts.crossedZero !== undefined) {
          mark(k);
          const bk = k < numLength(b) ? digitAt(b, k) : 0;
          if (bk === 0) return null;
        }
      }
      t[p] += 10;
    }
    const r = t[p] - bd;
    if (r < 0 || r > 9) return null;
    res += r * pow10(p);
  }
  return { value: res, applied, firstAt };
}

/** Place where a zero rule first fires (null if it never does). */
function zeroRulePlace(a: number, b: number, opts: { zeroRule?: (bDigit: number) => number; crossedZero?: number }): number | null {
  const r = subAbziehenWith(a, b, opts);
  return r && r.applied ? r.firstAt : null;
}

const ZERO_COPY = { zeroRule: (bd: number) => bd };
const ZERO_ZERO = { zeroRule: () => 0 };
const ZERO_TEN = { crossedZero: 10 };

/** Places for the bugs that act at the first column needing Entbündeln/Erweitern (or one place further left). */
function needPlace(a: number, b: number, shift: 0 | 1): number | null {
  const p = firstNeedPlace(a, b);
  return p < 0 ? null : p + shift;
}

export const SUB_BUGS: BugDef[] = [
  {
    id: 'sub.smaller-from-larger',
    op: 'sub',
    label: (m) =>
      m === 'abziehen'
        ? 'Es wurde unten minus oben gerechnet, statt zu entbündeln.'
        : 'Es wurde von oben nach unten ergänzt, statt zu erweitern.',
    compute: ([a, b]) => {
      if (firstNeedPlace(a, b) < 0) return null;
      const width = numLength(a);
      let res = 0;
      for (let p = 0; p < width; p++) res += Math.abs(digitAt(a, p) - (p < numLength(b) ? digitAt(b, p) : 0)) * pow10(p);
      return res;
    },
    hint: ([a, b], m) => {
      const p = firstNeedPlace(a, b);
      const ad = digitAt(a, p);
      const bd = digitAt(b, p);
      return m === 'abziehen'
        ? `${lookAt(p)} Oben steht ${ad}, unten ${bd}. ${ad} minus ${bd} geht nicht. Du musst entbündeln.`
        : `${lookAt(p)} Von ${bd} bis ${ad} geht nicht. Erweitere oben um 10: Rechne von ${bd} bis ${ad + 10}.`;
    },
    place: ([a, b]) => needPlace(a, b, 0),
  },
  {
    id: 'sub.no-reduce',
    op: 'sub',
    label: (m) =>
      m === 'abziehen'
        ? 'Nach dem Entbündeln wurde die Ziffer links daneben nicht kleiner gemacht.'
        : 'Die gemerkte 1 wurde vergessen.',
    compute: ([a, b]) => {
      if (firstNeedPlace(a, b) < 0) return null;
      const width = numLength(a);
      let res = 0;
      for (let p = 0; p < width; p++) res += ((digitAt(a, p) - (p < numLength(b) ? digitAt(b, p) : 0) + 10) % 10) * pow10(p);
      return res;
    },
    hint: ([a, b], m) => {
      const p = firstNeedPlace(a, b);
      return m === 'abziehen'
        ? `${lookAt(p + 1)} Du hast bei den ${placeDative(p)} entbündelt. Dann ist bei den ${placeDative(p + 1)} einer weniger da.`
        : `${lookAt(p + 1)} Denk an die gemerkte 1 von den ${placeDative(p)}. Sie kommt unten dazu.`;
    },
    place: ([a, b]) => needPlace(a, b, 1),
  },
  {
    id: 'sub.zero-minus-n',
    op: 'sub',
    methods: ['abziehen'],
    label: () => 'Bei 0 minus eine Zahl wurde einfach die untere Ziffer hingeschrieben.',
    compute: ([a, b]) => {
      const r = subAbziehenWith(a, b, ZERO_COPY);
      return r && r.applied ? r.value : null;
    },
    hint: ([a, b], _m, wrong) => {
      // the column where 0 − n happened (its digit may be right by chance: 0 − 5 → 5)
      const p = zeroRulePlace(a, b, ZERO_COPY) ?? firstDiffPlace(a - b, wrong);
      return `${lookAt(p)} Oben steht 0. 0 minus ${digitAt(b, p)} geht nicht. Du musst entbündeln.`;
    },
    place: ([a, b]) => zeroRulePlace(a, b, ZERO_COPY),
  },
  {
    id: 'sub.zero-minus-n-zero',
    op: 'sub',
    methods: ['abziehen'],
    label: () => 'Bei 0 minus eine Zahl wurde 0 hingeschrieben.',
    compute: ([a, b]) => {
      const r = subAbziehenWith(a, b, ZERO_ZERO);
      return r && r.applied ? r.value : null;
    },
    hint: ([a, b], _m, wrong) => {
      const p = zeroRulePlace(a, b, ZERO_ZERO) ?? firstDiffPlace(a - b, wrong);
      return `${lookAt(p)} 0 minus ${digitAt(b, p)} ist nicht 0. Entbündele zuerst, dann ziehst du ab.`;
    },
    place: ([a, b]) => zeroRulePlace(a, b, ZERO_ZERO),
  },
  {
    id: 'sub.across-zero',
    op: 'sub',
    methods: ['abziehen'],
    label: () => 'Beim Entbündeln über die 0 wurde aus der 0 eine 10 statt einer 9.',
    compute: ([a, b]) => {
      const r = subAbziehenWith(a, b, ZERO_TEN);
      return r && r.applied ? r.value : null;
    },
    hint: ([a, b], _m, wrong) => {
      const p = zeroRulePlace(a, b, ZERO_TEN) ?? firstDiffPlace(a - b, wrong);
      return `${lookAt(p)} Aus der 0 wird beim Entbündeln erst 10. Einen gibst du weiter, es bleiben 9.`;
    },
    place: ([a, b]) => zeroRulePlace(a, b, ZERO_TEN),
  },
  {
    id: 'sub.borrow-added',
    op: 'sub',
    label: (m) =>
      m === 'abziehen'
        ? 'Nach dem Entbündeln wurde die Ziffer links daneben größer statt kleiner gemacht.'
        : 'Die gemerkte 1 wurde oben statt unten dazugezählt.',
    compute: ([a, b]) => {
      if (firstNeedPlace(a, b) < 0) return null;
      const width = numLength(a);
      let c = 0;
      let res = 0;
      for (let p = 0; p < width; p++) {
        const v = digitAt(a, p) + c - (p < numLength(b) ? digitAt(b, p) : 0);
        if (v >= 10) return null;
        if (v < 0) {
          res += (v + 10) * pow10(p);
          c = 1;
        } else {
          res += v * pow10(p);
          c = 0;
        }
      }
      return c === 0 ? res : null;
    },
    hint: ([a, b], m) => {
      const p = firstNeedPlace(a, b);
      return m === 'abziehen'
        ? `${lookAt(p + 1)} Dort wird es beim Entbündeln einer weniger.`
        : `${lookAt(p + 1)} Die gemerkte 1 kommt zur unteren Ziffer.`;
    },
    place: ([a, b]) => needPlace(a, b, 1),
  },
  {
    id: 'sub.added',
    op: 'sub',
    label: () => 'Es wurde plus statt minus gerechnet.',
    compute: ([a, b]) => a + b,
    hint: () => 'Schau auf das Rechenzeichen: Hier steht minus. Du ziehst die untere Zahl ab.',
  },
];

// ─── Multiplication ──────────────────────────────────────────────────────────

type MulMode = 'correct' | 'noCarry' | 'carryBefore' | 'dropLastCarry';

/** First factor · one digit, computed digit by digit with a (possibly wrong) carry rule. */
export function mulByDigit(a: number, m: number, mode: MulMode): number {
  const la = numLength(a);
  let c = 0;
  let res = 0;
  for (let p = 0; p < la; p++) {
    const d = digitAt(a, p);
    if (mode === 'noCarry') {
      // the last digit's product is written in full (4 · 6 = 24)
      res += (p === la - 1 ? d * m : (d * m) % 10) * pow10(p);
      continue;
    }
    const v = mode === 'carryBefore' ? (d + c) * m : d * m + c;
    res += (v % 10) * pow10(p);
    c = Math.floor(v / 10);
  }
  if (mode !== 'noCarry' && mode !== 'dropLastCarry') res += c * pow10(la);
  return res;
}

function mulPartialsWith(a: number, b: number, mode: MulMode): number {
  return digitsOf(b)
    .reverse()
    .reduce((acc, digit, shift) => acc + mulByDigit(a, digit, mode) * pow10(shift), 0);
}

const multiDigit = (b: number) => numLength(b) >= 2;

export const MUL_BUGS: BugDef[] = [
  {
    id: 'mul.no-carry',
    op: 'mul',
    label: () => 'Der Übertrag wurde vergessen.',
    compute: ([a, b]) => mulPartialsWith(a, b, 'noCarry'),
    hint: ([a, b], _m, wrong) => {
      if (multiDigit(b)) return 'Schau auf die Teilprodukte: Denk beim Malnehmen an den Übertrag.';
      const p = firstDiffPlace(a * b, wrong);
      return `${lookAt(p)} Denk an den Übertrag von den ${placeDative(p - 1)}.`;
    },
  },
  {
    id: 'mul.carry-before',
    op: 'mul',
    label: () => 'Der Übertrag wurde vor dem Malnehmen dazugezählt.',
    compute: ([a, b]) => mulPartialsWith(a, b, 'carryBefore'),
    hint: ([a, b], _m, wrong) => {
      if (multiDigit(b)) return 'Schau auf die Teilprodukte: Erst malnehmen, dann den Übertrag dazuzählen.';
      const p = firstDiffPlace(a * b, wrong);
      return `${lookAt(p)} Erst malnehmen, dann den Übertrag dazuzählen.`;
    },
  },
  {
    id: 'mul.last-carry',
    op: 'mul',
    label: () => 'Vorne fehlt der letzte Übertrag.',
    compute: ([a, b]) => mulPartialsWith(a, b, 'dropLastCarry'),
    hint: () => 'Schau ganz nach links: Den letzten Übertrag schreibst du vorne mit hin.',
  },
  {
    id: 'mul.unshifted',
    op: 'mul',
    label: () => 'Die Teilprodukte sind nicht stellengerecht eingerückt.',
    compute: ([a, b]) => (multiDigit(b) ? digitsOf(b).reduce((acc, d) => acc + a * d, 0) : null),
    hint: () => 'Schau auf die Teilprodukte: Jedes endet genau unter der Ziffer, mit der du malnimmst.',
  },
  {
    id: 'mul.zero-skipped',
    op: 'mul',
    label: () => 'Die 0 im zweiten Faktor wurde übersprungen.',
    compute: ([a, b]) => {
      if (!multiDigit(b) || !String(b).includes('0')) return null;
      return a * Number(String(b).replace(/0/g, ''));
    },
    hint: () => 'Schau auf die 0 im zweiten Faktor: Auch für die 0 rückst du eine Stelle weiter.',
  },
  {
    id: 'mul.ones-only',
    op: 'mul',
    label: () => 'Es wurde nur mit der Einerziffer des zweiten Faktors malgenommen.',
    compute: ([a, b]) => (multiDigit(b) && b % 10 !== 0 ? a * (b % 10) : null),
    hint: () => 'Du hast nur mit der Einerziffer malgenommen. Nimm auch mit den anderen Ziffern des zweiten Faktors mal.',
  },
  {
    id: 'mul.sum-no-carry',
    op: 'mul',
    label: () => 'Beim Addieren der Teilprodukte wurde der Übertrag vergessen.',
    compute: ([a, b]) => {
      if (!multiDigit(b)) return null;
      const parts = digitsOf(b)
        .reverse()
        .map((d, shift) => a * d * pow10(shift));
      const len = numLength(a * b);
      let res = 0;
      for (let p = 0; p < len; p++) res += (parts.reduce((s, v) => s + digitAt(v, p), 0) % 10) * pow10(p);
      return res;
    },
    hint: ([a, b], _m, wrong) => {
      const p = firstDiffPlace(a * b, wrong);
      return `${lookAt(p)} Denk beim Addieren der Teilprodukte an den Übertrag.`;
    },
  },
];

// ─── Division ────────────────────────────────────────────────────────────────

export const DIV_BUGS: BugDef[] = [
  {
    id: 'div.missing-zero',
    op: 'div',
    label: () => 'Die 0 im Ergebnis fehlt.',
    compute: ([a, d]) => {
      // remove the zeros between non-zero digits (4 230 : 6 = 705 → 75), keep trailing zeros
      const q = String(Math.floor(a / d));
      const lastNonZero = q.search(/[1-9]0*$/);
      const head = q.slice(0, lastNonZero + 1);
      const tail = q.slice(lastNonZero + 1);
      if (!head.includes('0')) return null;
      return Number(head.replace(/0/g, '') + tail);
    },
    hint: ([, d]) =>
      `Schau auf das Ergebnis: Ist eine Zahl kleiner als ${d}, passt ${d} 0-mal hinein. Dann schreibst du eine 0 ins Ergebnis.`,
  },
  {
    id: 'div.missing-end-zero',
    op: 'div',
    label: () => 'Die 0 am Ende des Ergebnisses fehlt.',
    compute: ([a, d]) => {
      let q = Math.floor(a / d);
      if (q === 0 || q % 10 !== 0) return null;
      while (q % 10 === 0) q /= 10;
      return q;
    },
    hint: ([, d]) =>
      `Schau auf den letzten Schritt: Auch die letzte Ziffer musst du teilen. Passt ${d} nicht hinein, schreibst du eine 0 ins Ergebnis.`,
  },
  {
    id: 'div.digitwise',
    op: 'div',
    label: () => 'Der Rest eines Schritts wurde nicht zur nächsten Ziffer mitgenommen.',
    compute: ([a, d]) => {
      // only plausible when the first digit is at least the divisor (otherwise the child would notice)
      if (digitsOf(a)[0] < d) return null;
      const v = Number(digitsOf(a).map((x) => Math.floor(x / d)).join(''));
      return v > 0 ? v : null;
    },
    hint: () => 'Schau auf die Schritte: Was übrig bleibt, nimmst du mit zur nächsten Ziffer.',
  },
  {
    id: 'div.drop-first',
    op: 'div',
    label: () => 'Die erste Ziffer wurde weggelassen.',
    compute: ([a, d]) => {
      const ds = digitsOf(a);
      if (ds.length < 3 || ds[0] >= d) return null;
      return Math.floor((a % pow10(ds.length - 1)) / d);
    },
    hint: ([a, d]) =>
      `Schau auf den Anfang: ${digitsOf(a)[0]} ist kleiner als ${d}. Dann nimmst du die ersten zwei Ziffern zusammen.`,
  },
  {
    id: 'div.rest-too-big',
    op: 'div',
    label: () => 'Der Rest ist größer als der Divisor.',
    compute: ([a, d]) => {
      const q = Math.floor(a / d);
      return q >= 1 ? q - 1 : null;
    },
    hint: ([, d]) => `Prüfe den letzten Schritt: Der Rest muss kleiner sein als ${d}. Passt ${d} noch einmal hinein?`,
  },
];

/**
 * Partial products as a child with this misconception would write them (multi-digit second factor),
 * in German order (highest digit first). Used to show a planted mistake in the Fehlerdetektiv.
 */
export function buggyPartials(id: string, a: number, b: number): { value: number; shift: number }[] | null {
  const ds = digitsOf(b);
  if (ds.length < 2) return null;
  const parts = ds.map((digit, i) => ({ digit, shift: ds.length - 1 - i }));
  const mode: MulMode | null = id === 'mul.no-carry' ? 'noCarry' : id === 'mul.carry-before' ? 'carryBefore' : id === 'mul.last-carry' ? 'dropLastCarry' : null;
  if (mode) return parts.map((p) => ({ value: mulByDigit(a, p.digit, mode), shift: p.shift }));
  if (id === 'mul.unshifted') return parts.map((p) => ({ value: a * p.digit, shift: 0 }));
  if (id === 'mul.zero-skipped') {
    const nz = parts.filter((p) => p.digit !== 0);
    return nz.map((p, i) => ({ value: a * p.digit, shift: nz.length - 1 - i }));
  }
  if (id === 'mul.sum-no-carry' || id === 'mul.ones-only') return id === 'mul.ones-only' ? [{ value: a * (b % 10), shift: 0 }] : parts.map((p) => ({ value: a * p.digit, shift: p.shift }));
  return null;
}

export const BUG_LIBRARY: Record<WrittenOp, BugDef[]> = { add: ADD_BUGS, sub: SUB_BUGS, mul: MUL_BUGS, div: DIV_BUGS };

export interface BugCandidate {
  def: BugDef;
  value: number;
  hint: string;
}

/**
 * All bugs of the library that show with these operands: wrong value ≠ correct result, non-negative integer,
 * and distinct from earlier bugs (first one wins).
 */
export function bugCandidates(op: WrittenOp, operands: readonly number[], method: SubtractionMethod = 'abziehen'): BugCandidate[] {
  const correct = correctResult(op, operands);
  const seen = new Set<number>([correct]);
  const out: BugCandidate[] = [];
  for (const def of BUG_LIBRARY[op]) {
    if (def.methods && !def.methods.includes(method)) continue;
    const value = def.compute(operands, method);
    if (value === null || !Number.isSafeInteger(value) || value < 0 || seen.has(value)) continue;
    seen.add(value);
    out.push({ def, value, hint: def.hint(operands, method, value) });
  }
  return out;
}

/** Exercise.bugs for a written calculation. */
export function bugsFor(op: WrittenOp, operands: readonly number[], method: SubtractionMethod = 'abziehen'): Bug[] {
  return bugCandidates(op, operands, method).map((c) => ({ id: c.def.id, match: c.value, hint: c.hint }));
}

/**
 * Remainder mistakes with a correct quotient (Bug.remainder): 'Rest vergessen' when something is left over.
 * Kept apart from bugsFor() because their quotient equals the correct one.
 */
export function remainderBugs([a, d]: readonly number[]): Bug[] {
  const q = Math.floor(a / d);
  const r = a % d;
  if (r === 0) return [];
  return [{ id: 'div.rest-vergessen', match: q, remainder: 0, hint: 'Schau auf den letzten Schritt: Es bleibt noch etwas übrig. Schreibe den Rest hinter das R.' }];
}

/** Quotient check used by tests: the division layout agrees with plain arithmetic. */
export function divQuotient(a: number, d: number): number {
  return layoutDiv(a, d).quotient;
}

/** Used by tests and the Fehlerdetektiv: the subtraction layout result for a method. */
export function subResult(a: number, b: number, method: SubtractionMethod): number {
  const lay = layoutSub(a, b, method);
  return lay.columns.reduce((acc, c) => acc + c.r * pow10(c.place), 0);
}
