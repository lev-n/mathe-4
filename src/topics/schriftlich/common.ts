/**
 * Shared helpers for the 'schriftlich' generators: number construction, Überschlag,
 * worked steps in the school Sprechweise, and a builder for written-algorithm exercises.
 */
import { DIV, MINUS, TIMES, fmt, toSpeech } from '../../core/format';
import type { AnswerOf, Bug, Exercise, Rng, Step, Stufe, SubtractionMethod, WrittenOp } from '../../core/types';
import { bugsFor, remainderBugs } from './bugs';
import {
  correctResult,
  digitAt,
  digitsOf,
  layoutAdd,
  layoutDiv,
  layoutMul,
  layoutSub,
  numLength,
  placeDative,
  placeName,
  placeOne,
  writtenVisual,
} from './layout';

export const TOPIC = 'schriftlich' as const;

/** Neutral first names for short stories (no real people). */
export const NAMES = ['Mia', 'Ben', 'Lea', 'Tim', 'Emil', 'Lina', 'Noah', 'Ella', 'Paul', 'Mila', 'Finn', 'Ida', 'Can', 'Aylin', 'Jonas', 'Sofia', 'Luca', 'Nele'];

// ─── Numbers ─────────────────────────────────────────────────────────────────

/** Random integer with exactly `len` digits. */
export function randLen(rng: Rng, len: number): number {
  return len === 1 ? rng.int(1, 9) : rng.int(10 ** (len - 1), 10 ** len - 1);
}

/** Number from big-endian digits. */
export function fromDigits(ds: readonly number[]): number {
  return ds.reduce((n, d) => n * 10 + d, 0);
}

/** Try `make` until it returns a value (deterministic for a given rng); `fallback` after maxTries. */
export function attempt<T>(make: () => T | null, fallback: () => T, maxTries = 400): T {
  for (let i = 0; i < maxTries; i++) {
    const v = make();
    if (v !== null) return v;
  }
  return fallback();
}

/** Weighted pick: [[value, weight], …]. */
export function weighted<T>(rng: Rng, items: readonly (readonly [T, number])[]): T {
  const total = items.reduce((s, [, w]) => s + w, 0);
  let x = rng.next() * total;
  for (const [v, w] of items) {
    x -= w;
    if (x < 0) return v;
  }
  return items[items.length - 1][0];
}

/** Drop bugs that equal the correct value or repeat an earlier bug's match (first one wins). */
export function uniqueBugs(correct: number, bugs: readonly Bug[]): Bug[] {
  const seen = new Set<number>([correct]);
  const out: Bug[] = [];
  for (const b of bugs) {
    if (typeof b.match !== 'number' || !Number.isSafeInteger(b.match) || b.match < 0 || seen.has(b.match)) continue;
    seen.add(b.match);
    out.push(b);
  }
  return out;
}

// ─── Notation ────────────────────────────────────────────────────────────────

export function opSign(op: WrittenOp): string {
  return op === 'add' ? '+' : op === 'sub' ? MINUS : op === 'mul' ? TIMES : DIV;
}

/** '4 567 + 2 845 + 312' */
export function expressionOf(op: WrittenOp, operands: readonly number[]): string {
  return operands.map((n) => fmt(n)).join(` ${opSign(op)} `);
}

/** '5 435 : 4 = 1 358 R 3', '805 − 328 = 477' */
export function equationOf(op: WrittenOp, operands: readonly number[]): string {
  const res = correctResult(op, operands);
  const rem = op === 'div' ? operands[0] % operands[1] : 0;
  return `${expressionOf(op, operands)} = ${fmt(res)}${rem ? ` R ${fmt(rem)}` : ''}`;
}

/** Canonical key part: 'add:4567+2845', 'sub:805-328', 'mul:1254x37', 'div:5432/4'. */
export function canon(op: WrittenOp, operands: readonly number[]): string {
  const sep = op === 'add' ? '+' : op === 'sub' ? '-' : op === 'mul' ? 'x' : '/';
  return `${op}:${operands.join(sep)}`;
}

// ─── Überschlag ──────────────────────────────────────────────────────────────

/** Round to the highest place (auf die höchste Stelle runden): 4 873 → 5 000, 37 → 40, 6 → 6. */
export function roundLead(n: number): number {
  if (n < 10) return n;
  const p = 10 ** (numLength(n) - 1);
  return Math.round(n / p) * p;
}

/** Cut to the highest place (the "abschneiden" misconception): 4 873 → 4 000. */
export function truncLead(n: number): number {
  if (n < 10) return n;
  const p = 10 ** (numLength(n) - 1);
  return Math.floor(n / p) * p;
}

/**
 * The Überschlag really helps as a check: the exact result lies within 25 % of it
 * (result : Überschlag between 0.75 and 1.33). Only then may a solution say "Das passt zum Überschlag".
 */
export function ueberschlagFits(op: WrittenOp, operands: readonly number[]): boolean {
  const u = ueberschlag(op, operands).value;
  const res = correctResult(op, operands);
  return u > 0 && Math.abs(res - u) <= 0.25 * Math.max(res, u);
}

/** The Überschlag stays inside the Klasse-4 Zahlenraum (0 < value ≤ 1 000 000) and fits the exact result. */
export function ueberschlagOk(op: WrittenOp, operands: readonly number[]): boolean {
  const v = ueberschlag(op, operands).value;
  return v > 0 && v <= 1_000_000 && ueberschlagFits(op, operands);
}

export interface Ueberschlag {
  /** The rounded calculation, e.g. '5 000 + 3 000'. */
  expression: string;
  value: number;
  /** 'Überschlag: 5 000 + 3 000 = 8 000.' */
  text: string;
}

/**
 * Überschlag in school style: + − · round each number to its highest place; : uses a nearby
 * Einmaleins number (5 432 : 4 → 5 600 : 4 = 1 400).
 */
export function ueberschlag(op: WrittenOp, operands: readonly number[]): Ueberschlag {
  let terms: number[];
  let value: number;
  if (op === 'div') {
    const [a, d] = operands;
    const len = numLength(a);
    const shift = Math.max(0, len - 2);
    const lead = Math.floor(a / 10 ** shift);
    const near = Math.max(1, Math.round(lead / d)) * d;
    terms = [near * 10 ** shift, d];
    value = terms[0] / d;
  } else {
    terms = operands.map(roundLead);
    value = op === 'add' ? terms.reduce((s, t) => s + t, 0) : op === 'sub' ? terms[0] - terms[1] : terms[0] * terms[1];
  }
  const expression = expressionOf(op, terms);
  return { expression, value, text: `Überschlag: ${expression} = ${fmt(value)}.` };
}

// ─── Worked steps (Sprechweise) ──────────────────────────────────────────────

const ORDINAL = ['Erstes', 'Zweites', 'Drittes', 'Viertes'];

/** One step per place (index = place). */
export function addColumnSteps(operands: readonly number[]): string[] {
  const lay = layoutAdd(operands);
  return lay.columnSums.map((s, p) => {
    const ds = operands.filter((n) => numLength(n) > p).map((n) => digitAt(n, p));
    const cin = lay.carries[p];
    const isLast = p === lay.width - 1;
    let calc: string;
    if (ds.length === 0) calc = `Nur der Übertrag ${cin}`;
    else if (ds.length === 1 && cin === 0) calc = `Nur die ${ds[0]}`;
    else calc = `${ds.join(' + ')}${cin ? ` + ${cin} (Übertrag)` : ''} = ${s}`;
    const write = !isLast && s >= 10 ? `Schreibe ${s % 10}, Übertrag ${Math.floor(s / 10)}.` : `Schreibe ${s}.`;
    return `${placeName(p)}: ${calc}. ${write}`;
  });
}

/** One step per place (index = place), in the Sprechweise of the method. */
export function subColumnSteps(minuend: number, subtrahend: number, method: SubtractionMethod): string[] {
  const lay = layoutSub(minuend, subtrahend, method);
  const resLen = numLength(lay.result);
  return lay.columns.map((c) => {
    const p = c.place;
    const leadingZero = p >= resLen && c.r === 0;
    const tail = leadingZero ? ' Vorne schreibst du keine 0.' : '';
    const name = placeName(p);
    if (method === 'abziehen') {
      const pre =
        c.before === c.a
          ? ''
          : c.a === 0 && c.before === 9
            ? 'Hier sind jetzt 9. '
            : c.before === 0
              ? 'Jetzt steht hier 0. '
              : c.before === 1
                ? 'Jetzt ist es noch 1. '
                : `Jetzt sind es noch ${c.before}. `;
      if (c.b === null) {
        if (leadingZero) return `${name}: Jetzt ist hier 0. Vorne schreibst du keine 0.`;
        return `${name}: ${pre}Hier wird nichts abgezogen. Schreibe ${c.r}.`;
      }
      if (c.regrouped) {
        const from = c.regroupFrom ?? p + 1;
        if (from === p + 1) {
          return `${name}: ${pre}${c.before} minus ${c.b} geht nicht, ich entbündele ${placeOne(p + 1)}. ${c.top} minus ${c.b} gleich ${c.r}.${tail}`;
        }
        const zeros: number[] = [];
        for (let k = p + 1; k < from; k++) zeros.push(k);
        const zeroText =
          zeros.length === 1
            ? `Bei den ${placeDative(zeros[0])} steht 0`
            : zeros.length === 2
              ? `Bei den ${placeDative(zeros[0])} und ${placeDative(zeros[1])} steht 0`
              : `Von den ${placeDative(zeros[0])} bis zu den ${placeDative(zeros[zeros.length - 1])} steht überall 0`;
        return (
          `${name}: ${pre}${c.before} minus ${c.b} geht nicht. ${zeroText}. ` +
          `Ich entbündele ${placeOne(from)}. ${zeros.length === 1 ? 'Aus der 0 wird 9' : 'Aus jeder 0 wird 9'}, hier sind es ${c.top}. ` +
          `${c.top} minus ${c.b} gleich ${c.r}.${tail}`
        );
      }
      return `${name}: ${pre}${c.before} minus ${c.b} gleich ${c.r}.${tail}`;
    }
    // Ergänzen mit Erweitern
    if (c.b === null && c.carryIn === 0) return `${name}: Unten steht nichts. Schreibe ${c.r}.`;
    const lower = (c.b ?? 0) + c.carryIn;
    const pre = c.carryIn ? (c.b === null ? 'Unten steht nur die gemerkte 1. ' : `${c.b} plus 1 gleich ${lower}. `) : '';
    const target = c.extended ? c.a + 10 : c.a;
    return `${name}: ${pre}Von ${lower} bis ${target} ${c.r === 1 ? 'fehlt' : 'fehlen'} ${c.r}${c.extended ? ', 1 gemerkt.' : '.'}${tail}`;
  });
}

/** × 1-digit: one step per place of the first factor (index = place). */
export function mulDigitSteps(a: number, m: number): string[] {
  const la = numLength(a);
  const steps: string[] = [];
  let c = 0;
  for (let p = 0; p < la; p++) {
    const d = digitAt(a, p);
    const v = d * m + c;
    const calc = c ? `${m} ${TIMES} ${d} = ${d * m}, dazu der Übertrag ${c}: ${v}` : `${m} ${TIMES} ${d} = ${v}`;
    const write = p === la - 1 || v < 10 ? `Schreibe ${v}.` : `Schreibe ${v % 10}, Übertrag ${Math.floor(v / 10)}.`;
    steps.push(`${placeName(p)}: ${calc}. ${write}`);
    c = Math.floor(v / 10);
  }
  return steps;
}

/** Multi-digit second factor: one step per partial product + the addition. */
export function mulPartialSteps(a: number, b: number): string[] {
  const lay = layoutMul(a, b);
  const steps = lay.partials.map((part, i) => {
    const ord = ORDINAL[i] ?? `${i + 1}.`;
    if (part.digit === 0) return `${ord} Teilprodukt: ${fmt(a)} ${TIMES} 0 = 0. Schreibe die 0 unter die 0 (${placeName(part.shift)}).`;
    return `${ord} Teilprodukt: ${fmt(a)} ${TIMES} ${part.digit} = ${fmt(part.value)}. Die letzte Ziffer kommt unter die ${part.digit} (${placeName(part.shift)}).`;
  });
  const shifted = lay.partials.map((part) => fmt(part.value * 10 ** part.shift));
  steps.push(`Addiere die Teilprodukte stellengerecht: ${shifted.join(' + ')} = ${fmt(lay.result)}.`);
  return steps;
}

/** Division: one step per quotient digit. */
export function divSteps(a: number, d: number): string[] {
  const lay = layoutDiv(a, d);
  const ds = digitsOf(a);
  return lay.steps.map((s, k) => {
    let text = '';
    if (k === 0 && lay.firstTwoDigits) text += `${ds[0]} : ${d} geht nicht. Ich nehme die ersten zwei Ziffern: ${s.partial}. `;
    if (s.q === 0) {
      text += s.partial === 0 ? `0 : ${d} = 0. Schreibe 0 ins Ergebnis.` : `${s.partial} ist kleiner als ${d}. Schreibe 0 ins Ergebnis.`;
    } else {
      // 'x : d = q' only when it is a true equation; with a remainder: 'Wie oft passt d in x? q-mal.'
      text += s.diff === 0 ? `${fmt(s.partial)} : ${d} = ${s.q}. ` : `Wie oft passt ${d} in ${fmt(s.partial)}? ${s.q}-mal. `;
      text += `${s.q} ${TIMES} ${d} = ${fmt(s.product)}. ${fmt(s.partial)} ${MINUS} ${fmt(s.product)} = ${s.diff}.`;
    }
    if (k < lay.steps.length - 1) {
      const next = ds[s.end + 1];
      text += ` Hole die ${next} herunter: ${s.diff * 10 + next}.`;
    } else {
      text += s.diff === 0 ? ' Es bleibt kein Rest.' : ` Es bleibt der Rest ${s.diff}.`;
    }
    return text;
  });
}

/** All Sprechweise steps of a written calculation (without Überschlag and result line). */
export function algorithmSteps(op: WrittenOp, operands: readonly number[], method: SubtractionMethod): string[] {
  switch (op) {
    case 'add':
      return addColumnSteps(operands);
    case 'sub':
      return subColumnSteps(operands[0], operands[1], method);
    case 'mul':
      return numLength(operands[1]) === 1 ? mulDigitSteps(operands[0], operands[1]) : mulPartialSteps(operands[0], operands[1]);
    case 'div':
      return divSteps(operands[0], operands[1]);
  }
}

/** The Probe (Umkehraufgabe) of a written calculation, or null for × (checked with the Überschlag). */
export function probeText(op: WrittenOp, operands: readonly number[]): string | null {
  const res = correctResult(op, operands);
  switch (op) {
    case 'add':
      return operands.length === 2
        ? `Probe: ${fmt(res)} ${MINUS} ${fmt(operands[1])} = ${fmt(operands[0])}.`
        : `Probe: Rechne von unten nach oben: ${expressionOf('add', operands.slice().reverse())} = ${fmt(res)}.`;
    case 'sub':
      return `Probe: ${fmt(res)} + ${fmt(operands[1])} = ${fmt(operands[0])}.`;
    case 'mul':
      return null;
    case 'div': {
      const [a, d] = operands;
      const r = a % d;
      return r ? `Probe: ${fmt(res)} ${TIMES} ${d} + ${r} = ${fmt(a)}.` : `Probe: ${fmt(res)} ${TIMES} ${d} = ${fmt(a)}.`;
    }
  }
}

/** The closing line: result, the comparison with the Überschlag (+ − ·) and the Probe (+ − :). */
export function resultLine(op: WrittenOp, operands: readonly number[], withUeberschlag: boolean): string {
  let text = `Ergebnis: ${equationOf(op, operands)}.`;
  if (withUeberschlag && op !== 'div') {
    const u = fmt(ueberschlag(op, operands).value);
    // only claim that it fits when it really does (generators pick operands with ueberschlagOk)
    text += ueberschlagFits(op, operands)
      ? ` Das passt zum Überschlag ${u}.`
      : ` Der Überschlag ${u} ist hier nur grob, weil sich die Zahlen beim Runden stark verändert haben.`;
  }
  const probe = probeText(op, operands);
  if (probe) text += ` ${probe}`;
  return text;
}

/** Full worked solution: [Überschlag], Sprechweise steps, result with the solved layout. */
export function solutionSteps(op: WrittenOp, operands: readonly number[], method: SubtractionMethod, withUeberschlag: boolean): Step[] {
  const steps: Step[] = [];
  if (withUeberschlag) steps.push(ueberschlag(op, operands).text);
  steps.push(...algorithmSteps(op, operands, method));
  steps.push({
    text: resultLine(op, operands, withUeberschlag),
    visual: writtenVisual({ type: 'written', op, operands: operands.slice(), method: op === 'sub' ? method : undefined, showSolution: true }),
  });
  return steps;
}

// ─── Hints and praise ────────────────────────────────────────────────────────

export function writtenHints(op: WrittenOp, operands: readonly number[], method: SubtractionMethod, withUeberschlag: boolean): string[] {
  const hints: string[] = [];
  if (withUeberschlag) hints.push(op === 'div'
    ? 'Mach zuerst einen Überschlag: Nimm eine Zahl in der Nähe, die gut zu teilen ist.'
    : 'Mach zuerst einen Überschlag: Runde jede Zahl auf die höchste Stelle.');
  switch (op) {
    case 'add': {
      const e = operands.filter((n) => n > 0).map((n) => digitAt(n, 0));
      hints.push('Fang bei den Einern an und rechne Spalte für Spalte nach links.');
      hints.push(`Ist eine Spalte 10 oder mehr? Dann schreibst du die Einer hin und merkst dir den Übertrag. Bei den Einern: ${e.join(' + ')}.`);
      break;
    }
    case 'sub': {
      const [a, b] = operands;
      hints.push(
        method === 'abziehen'
          ? 'Fang bei den Einern an: oben minus unten. Ist oben zu wenig, entbündelst du.'
          : 'Fang bei den Einern an: Ergänze von unten bis oben. Geht das nicht, erweiterst du.',
      );
      const lay = layoutSub(a, b, method);
      if (method === 'abziehen' && lay.acrossZero) hints.push('Steht links daneben eine 0? Dann entbündelst du zuerst bei der nächsten Stelle, die keine 0 ist.');
      else if (method === 'abziehen') hints.push(`Bei den Einern: ${digitAt(a, 0)} minus ${digitAt(b, 0)}. Geht das?`);
      else hints.push('Erweitern heißt: oben 10 dazu, unten in der nächsten Spalte 1 gemerkt.');
      break;
    }
    case 'mul':
      hints.push('Nimm jede Ziffer des ersten Faktors mal, von rechts nach links. Zähle den Übertrag erst nach dem Malnehmen dazu.');
      if (numLength(operands[1]) > 1) hints.push('Rechne für jede Ziffer des zweiten Faktors ein Teilprodukt. Es endet unter dieser Ziffer. Dann addierst du.');
      else hints.push(`Bei den Einern: ${operands[1]} ${TIMES} ${digitAt(operands[0], 0)}. Was schreibst du hin, was merkst du dir?`);
      break;
    case 'div': {
      const lay = layoutDiv(operands[0], operands[1]);
      hints.push('Fang vorne an. Rechne immer: teilen, malnehmen, abziehen, nächste Ziffer herunterholen.');
      if (lay.quotientZeros > 0) hints.push(`Ist eine Zahl kleiner als ${operands[1]}, schreibst du eine 0 ins Ergebnis.`);
      else if (lay.remainder > 0) hints.push(`Was am Ende übrig bleibt, ist der Rest. Er ist kleiner als ${operands[1]}.`);
      else if (lay.firstTwoDigits) hints.push(`Ist die erste Ziffer kleiner als ${operands[1]}, nimmst du die ersten zwei Ziffern.`);
      else hints.push(`Wie oft passt ${operands[1]} in ${digitsOf(operands[0])[0]}?`);
      break;
    }
  }
  return hints.slice(0, 3);
}

export function writtenPraise(rng: Rng, op: WrittenOp, operands: readonly number[], method: SubtractionMethod): string {
  const options: string[] = [];
  switch (op) {
    case 'add': {
      const lay = layoutAdd(operands);
      if (lay.carries.some((c) => c >= 2)) options.push('Du hast auch den großen Übertrag richtig mitgezählt.');
      if (lay.carries.some((c) => c > 0)) options.push('Du hast an den Übertrag gedacht.');
      if (new Set(operands.map(numLength)).size > 1) options.push('Du hast die Zahlen stellengerecht untereinander gerechnet.');
      if (operands.length > 2) options.push('Du hast alle Zahlen Spalte für Spalte addiert.');
      options.push('Du hast sauber Spalte für Spalte gerechnet.');
      break;
    }
    case 'sub': {
      const lay = layoutSub(operands[0], operands[1], method);
      if (method === 'abziehen') {
        if (lay.acrossZero) options.push('Du hast auch über die Null richtig entbündelt.');
        if (lay.regroupings > 0) options.push('Du hast richtig entbündelt.');
      } else {
        if (lay.acrossZero) options.push('Du hast auch bei der Null richtig erweitert.');
        if (lay.regroupings > 0) options.push('Du hast richtig erweitert und an die gemerkte 1 gedacht.');
      }
      options.push('Du hast Spalte für Spalte sauber gerechnet.');
      break;
    }
    case 'mul': {
      const multi = numLength(operands[1]) > 1;
      if (multi) options.push('Du hast die Teilprodukte stellengerecht eingerückt.');
      if (/0/.test(String(operands[1])) && multi) options.push('Du hast an die 0 im zweiten Faktor gedacht.');
      if (layoutMul(operands[0], operands[1]).carryCount > 0) options.push('Du hast die Überträge erst nach dem Malnehmen dazugezählt.');
      options.push('Du hast Ziffer für Ziffer sauber malgenommen.');
      break;
    }
    case 'div': {
      const lay = layoutDiv(operands[0], operands[1]);
      if (lay.quotientZeros > 0) options.push('Du hast an die 0 im Ergebnis gedacht.');
      if (lay.remainder > 0) options.push('Du hast den Rest richtig bestimmt.');
      if (lay.firstTwoDigits) options.push('Du hast richtig mit den ersten zwei Ziffern angefangen.');
      options.push('Du hast Schritt für Schritt geteilt und heruntergeholt.');
      break;
    }
  }
  // the most specific praise is first; pick among the two most specific for variety
  return rng.pick(options.slice(0, Math.min(2, options.length)));
}

// ─── Written exercise builder ────────────────────────────────────────────────

export interface WrittenItemSpec {
  skillId: string;
  stufe: Stufe;
  ab: 1 | 2 | 3;
  op: WrittenOp;
  operands: number[];
  method: SubtractionMethod;
  withUeberschlag: boolean;
  kmk: string[];
  rng: Rng;
  prompt?: string;
  context?: string;
  emoji?: string;
  knobel?: boolean;
  keySuffix?: string;
}

export function defaultPrompt(op: WrittenOp, withUeberschlag: boolean): string {
  if (withUeberschlag) return op === 'div' ? 'Mach zuerst einen Überschlag. Dann teile schriftlich.' : 'Mach zuerst einen Überschlag. Dann rechne schriftlich.';
  return op === 'div' ? 'Teile schriftlich. Fang vorne an.' : 'Rechne schriftlich. Fang bei den Einern an.';
}

export function writtenSrText(op: WrittenOp, operands: readonly number[], context?: string): string {
  const task = op === 'div'
    ? `Teile schriftlich: ${toSpeech(expressionOf(op, operands))}. Schreibe das Ergebnis und, wenn etwas übrig bleibt, den Rest.`
    : `Rechne schriftlich: ${toSpeech(expressionOf(op, operands))}.`;
  return context ? `${toSpeech(context)} ${task}` : task;
}

/** A complete exercise for one written calculation (answer kind 'written'). */
export function writtenItem(spec: WrittenItemSpec): Exercise {
  const { op, operands, method } = spec;
  const result = correctResult(op, operands);
  const answer: AnswerOf<'written'> =
    op === 'div'
      ? { kind: 'written', op, operands: operands.slice(), result, remainder: operands[0] % operands[1] }
      : op === 'sub'
        ? { kind: 'written', op, operands: operands.slice(), result, method }
        : { kind: 'written', op, operands: operands.slice(), result };
  // "Mach zuerst einen Überschlag": the child writes it into its own field (checked loosely, never graded).
  if (spec.withUeberschlag) answer.ueberschlag = ueberschlag(op, operands).value;
  const ex: Exercise = {
    key: `${spec.skillId}:${spec.stufe}:${canon(op, operands)}${op === 'sub' ? `:${method[0]}` : ''}${spec.keySuffix ?? ''}`,
    topicId: TOPIC,
    skillId: spec.skillId,
    stufe: spec.stufe,
    ab: spec.ab,
    prompt: spec.prompt ?? defaultPrompt(op, spec.withUeberschlag),
    answer,
    hints: writtenHints(op, operands, method, spec.withUeberschlag),
    steps: solutionSteps(op, operands, method, spec.withUeberschlag),
    bugs: op === 'div' ? [...bugsFor(op, operands, method), ...remainderBugs(operands)] : bugsFor(op, operands, method),
    praise: writtenPraise(spec.rng, op, operands, method),
    srText: writtenSrText(op, operands, spec.context),
    kmk: spec.kmk,
  };
  if (spec.context) ex.context = spec.context;
  if (spec.emoji) ex.emoji = spec.emoji;
  if (spec.knobel) ex.knobel = true;
  return ex;
}
