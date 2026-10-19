import { NBSP, fmt } from './format';
import { parseDigits, parseNumber } from './parse';
import type { Answer, Bug, Cell, CheckResult, MultiField, Response } from './types';

const EPS = 1e-9;
const same = (a: number, b: number) => Math.abs(a - b) < EPS;
const cellKey = (c: Cell) => `${c[0]},${c[1]}`;

function bugFor(bugs: Bug[] | undefined, value: number | Record<string, number>): Bug | undefined {
  if (!bugs) return undefined;
  for (const bug of bugs) {
    if (bug.remainder !== undefined || Array.isArray(bug.match)) continue;
    if (typeof bug.match === 'number' && typeof value === 'number' && same(bug.match, value)) return bug;
    if (typeof bug.match === 'object' && typeof value === 'object') {
      const m = bug.match;
      const keys = Object.keys(m);
      if (keys.length > 0 && keys.every((k) => k in value && same(m[k], value[k]))) return bug;
    }
  }
  return undefined;
}

/** Written div: a bug with `remainder` needs quotient and remainder to match; others match the quotient only. */
function writtenDivBug(bugs: Bug[] | undefined, quotient: number, remainder: number | null): Bug | undefined {
  if (!bugs) return undefined;
  const withRest = bugs.find((b) => b.remainder !== undefined && typeof b.match === 'number' && same(b.match, quotient) && remainder !== null && same(b.remainder, remainder));
  return withRest ?? bugFor(bugs, quotient);
}

/** A wrong result with the matched bug's hint and id (the id feeds the improvement tracking, src/state/growth.ts). */
function wrong(bug: Bug | undefined, extra: Omit<CheckResult, 'correct' | 'bugHint' | 'bugId'> = {}): CheckResult {
  const result: CheckResult = { correct: false, ...extra, bugHint: bug?.hint };
  if (bug) result.bugId = bug.id;
  return result;
}

/** Shown (not counted as an attempt) when a written task with an Überschlag is checked without one. */
export const UEBERSCHLAG_MISSING = 'Mach zuerst den Überschlag und schreib ihn in das Feld „Überschlag“.';

/** A rough value fits an exact one: at most 25 % apart (the tolerance of a sensible Überschlag). */
export function roughlyEqual(a: number, b: number): boolean {
  return Math.abs(a - b) <= 0.25 * Math.max(Math.abs(a), Math.abs(b));
}

/** Order answers: a bug whose match is exactly the given index order. */
function orderBug(bugs: Bug[] | undefined, order: readonly number[]): Bug | undefined {
  if (!bugs) return undefined;
  return bugs.find((b) => Array.isArray(b.match) && b.match.length === order.length && b.match.every((v, i) => v === order[i]));
}

/**
 * Compare a child's response with the answer spec.
 * Invalid input (cannot be parsed) yields { correct: false, invalid: reason } and must not count as an attempt.
 */
export function checkAnswer(answer: Answer, response: Response, bugs?: Bug[]): CheckResult {
  if (response.kind !== answer.kind) {
    throw new TypeError(`checkAnswer: response kind ${response.kind} does not match answer kind ${answer.kind}`);
  }
  switch (answer.kind) {
    case 'number': {
      const r = response as Extract<Response, { kind: 'number' }>;
      if (r.unsolvable) {
        return answer.value === null
          ? { correct: true }
          : { correct: false, bugHint: 'Lies noch einmal genau: Alle Angaben, die du brauchst, stehen in der Aufgabe.' };
      }
      const parsed = parseNumber(r.text, answer.decimals ?? 0);
      if (!parsed.ok) return { correct: false, invalid: parsed.reason };
      if (answer.value === null) {
        const bug = bugFor(bugs, parsed.value);
        return bug ? wrong(bug) : { correct: false, bugHint: 'Prüfe, ob du wirklich alle Angaben hast, die du zum Rechnen brauchst.' };
      }
      if (same(parsed.value, answer.value)) return { correct: true };
      return wrong(bugFor(bugs, parsed.value));
    }
    case 'choice': {
      const r = response as Extract<Response, { kind: 'choice' }>;
      if (r.index < 0 || r.index >= answer.options.length) return { correct: false, invalid: 'Wähle zuerst eine Antwort aus.' };
      if (r.index === answer.correct) return { correct: true };
      return { correct: false, bugHint: answer.options[r.index].whyWrong };
    }
    case 'multi': {
      const r = response as Extract<Response, { kind: 'multi' }>;
      const values: Record<string, number> = {};
      const fieldCorrect: Record<string, boolean> = {};
      for (const field of answer.fields) {
        const parsed = parseNumber(r.values[field.id] ?? '', field.decimals ?? 0);
        if (!parsed.ok) {
          const where = answer.fields.length > 1 ? ' (in einem der Felder)' : '';
          return { correct: false, invalid: parsed.reason.replace(/\.$/, '') + where + '.' };
        }
        values[field.id] = parsed.value;
        fieldCorrect[field.id] = same(parsed.value, field.value);
      }
      const correct = Object.values(fieldCorrect).every(Boolean);
      return correct ? { correct, fieldCorrect } : wrong(bugFor(bugs, values), { fieldCorrect });
    }
    case 'written': {
      const r = response as Extract<Response, { kind: 'written' }>;
      const parsed = parseDigits(r.result);
      if (!parsed.ok) return { correct: false, invalid: parsed.reason };
      let givenUeberschlag: number | undefined;
      if (answer.ueberschlag !== undefined) {
        const text = (r.ueberschlag ?? '').trim();
        if (text === '') return { correct: false, invalid: UEBERSCHLAG_MISSING };
        const u = parseNumber(text, 0);
        if (!u.ok) return { correct: false, invalid: 'Beim Überschlag darf nur eine Zahl stehen.' };
        givenUeberschlag = u.value;
      }
      const expected = String(answer.result);
      const given = String(parsed.value);
      const wrongColumns: number[] = [];
      for (let i = 0; i < Math.max(expected.length, given.length); i++) {
        const e = expected[expected.length - 1 - i];
        const g = given[given.length - 1 - i];
        if (e !== g) wrongColumns.push(i);
      }
      let remainderCorrect: boolean | undefined;
      let givenRem: number | null = null;
      if (answer.op === 'div') {
        const remText = (r.remainder ?? '').trim();
        const expectedRem = answer.remainder ?? 0;
        if (remText === '') {
          givenRem = 0;
          remainderCorrect = expectedRem === 0;
        } else {
          const rem = parseDigits(remText);
          if (!rem.ok) return { correct: false, invalid: 'Beim Rest darf nur eine Zahl stehen.' };
          givenRem = rem.value;
          remainderCorrect = rem.value === expectedRem;
        }
      }
      const correct = wrongColumns.length === 0 && remainderCorrect !== false;
      const result: CheckResult = { correct, wrongColumns };
      if (remainderCorrect !== undefined) result.remainderCorrect = remainderCorrect;
      if (answer.ueberschlag !== undefined && givenUeberschlag !== undefined) {
        result.ueberschlagOk = roughlyEqual(givenUeberschlag, answer.ueberschlag);
      }
      if (!correct) {
        const bug = answer.op === 'div' ? writtenDivBug(bugs, parsed.value, givenRem) : bugFor(bugs, parsed.value);
        result.bugHint = bug?.hint;
        if (bug) result.bugId = bug.id;
        // No known mistake: use the child's own Überschlag as the check (the reason it is made first).
        if (!result.bugHint && result.ueberschlagOk && givenUeberschlag !== undefined && !roughlyEqual(parsed.value, givenUeberschlag)) {
          result.bugHint = 'Dein Ergebnis passt nicht zu deinem Überschlag. Rechne noch einmal Stelle für Stelle nach.';
        }
      }
      return result;
    }
    case 'cells': {
      const r = response as Extract<Response, { kind: 'cells' }>;
      const want = new Set(answer.solution.map(cellKey));
      const given = new Set(answer.given.map(cellKey));
      const have = new Set(r.cells.map(cellKey).filter((k) => !given.has(k)));
      const extraCells = r.cells.filter((c) => !want.has(cellKey(c)) && !given.has(cellKey(c)));
      const missingCells = answer.solution.filter((c) => !have.has(cellKey(c)));
      if (have.size === 0) return { correct: false, invalid: 'Tippe zuerst Kästchen an, um sie anzumalen.' };
      const correct = extraCells.length === 0 && missingCells.length === 0;
      return correct ? { correct } : { correct, extraCells, missingCells };
    }
    case 'numberline': {
      const r = response as Extract<Response, { kind: 'numberline' }>;
      if (!Number.isFinite(r.value)) return { correct: false, invalid: 'Setze zuerst den Pfeil auf den Zahlenstrahl.' };
      if (Math.abs(r.value - answer.value) <= answer.tolerance + EPS) return { correct: true };
      return wrong(bugFor(bugs, r.value));
    }
    case 'order': {
      const r = response as Extract<Response, { kind: 'order' }>;
      if (r.order.length !== answer.items.length) return { correct: false, invalid: 'Tippe alle Zahlen der Reihe nach an.' };
      const correct = r.order.every((v, i) => v === answer.correct[i]);
      return correct ? { correct } : wrong(orderBug(bugs, r.order));
    }
  }
}

/** The response a child would give if everything is right (used for tests, solution display and answer keys). */
export function correctResponse(answer: Answer): Response {
  switch (answer.kind) {
    case 'number':
      return answer.value === null
        ? { kind: 'number', text: '', unsolvable: true }
        : { kind: 'number', text: fmt(answer.value, answer.decimals && !Number.isInteger(answer.value) ? answer.decimals : undefined) };
    case 'choice':
      return { kind: 'choice', index: answer.correct };
    case 'multi':
      return {
        kind: 'multi',
        values: Object.fromEntries(answer.fields.map((f) => [f.id, fmt(f.value, f.decimals && !Number.isInteger(f.value) ? f.decimals : undefined)])),
      };
    case 'written': {
      const r: Extract<Response, { kind: 'written' }> =
        answer.op === 'div'
          ? { kind: 'written', result: String(answer.result), remainder: answer.remainder ? String(answer.remainder) : '' }
          : { kind: 'written', result: String(answer.result) };
      if (answer.ueberschlag !== undefined) r.ueberschlag = String(answer.ueberschlag);
      return r;
    }
    case 'cells':
      return { kind: 'cells', cells: answer.solution.slice() };
    case 'numberline':
      return { kind: 'numberline', value: answer.value };
    case 'order':
      return { kind: 'order', order: answer.correct.slice() };
  }
}

/** Build the response that corresponds to a bug match (for tests). */
export function responseForBug(answer: Answer, bug: Bug): Response | null {
  if (Array.isArray(bug.match)) {
    return answer.kind === 'order' ? { kind: 'order', order: bug.match.slice() } : null;
  }
  if (typeof bug.match === 'number') {
    if (answer.kind === 'number') return { kind: 'number', text: fmt(bug.match, answer.decimals && !Number.isInteger(bug.match) ? answer.decimals : undefined) };
    if (answer.kind === 'written') {
      if (!Number.isInteger(bug.match) || bug.match < 0) return null;
      // (a typical mistake in the calculation, with a sensible Überschlag)
      const ueb = answer.ueberschlag !== undefined ? { ueberschlag: String(answer.ueberschlag) } : {};
      if (answer.op !== 'div') return { kind: 'written', result: String(bug.match), ...ueb };
      const rem = bug.remainder ?? answer.remainder ?? 0;
      return { kind: 'written', result: String(bug.match), remainder: rem ? String(rem) : '', ...ueb };
    }
    if (answer.kind === 'numberline') return { kind: 'numberline', value: bug.match };
    return null;
  }
  if (answer.kind === 'multi') {
    const m = bug.match;
    return {
      kind: 'multi',
      values: Object.fromEntries(answer.fields.map((f) => {
        const v = f.id in m ? m[f.id] : f.value;
        return [f.id, fmt(v, f.decimals && !Number.isInteger(v) ? f.decimals : undefined)];
      })),
    };
  }
  return null;
}

/** A field followed by ':' and another field is a clock time (hours : minutes). */
export function isClockTimeStart(fields: readonly MultiField[], i: number): boolean {
  return fields[i].after?.trim() === ':' && i + 1 < fields.length;
}

/**
 * Multi fields as one line: '3 € 45 ct', '17:05 Uhr'. A clock time is written in school notation with
 * zero-padded minutes ('21:00 Uhr'), never '21 : 0 Uhr' (which also reads as a division).
 */
function formatMultiFields(fields: readonly MultiField[]): string {
  const parts: string[] = [];
  for (let i = 0; i < fields.length; i++) {
    const f = fields[i];
    if (isClockTimeStart(fields, i)) {
      const m = fields[i + 1];
      const time = `${f.value}:${String(m.value).padStart(2, '0')}`;
      parts.push([f.before, m.after ? `${time}${NBSP}${m.after}` : time].filter(Boolean).join(' '));
      i++;
      continue;
    }
    parts.push([f.before, fmt(f.value, f.decimals && !Number.isInteger(f.value) ? f.decimals : undefined), f.after].filter(Boolean).join(' '));
  }
  return parts.join(' ');
}

/** Human-readable correct answer, e.g. '345 678', '3 € 45 ct', '17:05 Uhr', '4 R 3', 'Würfel'. */
export function formatAnswer(answer: Answer): string {
  const unit = (u?: string) => (u ? ` ${u}` : '');
  switch (answer.kind) {
    case 'number':
      if (answer.value === null) return 'Nicht lösbar – es fehlt eine Angabe.';
      return [answer.before, fmt(answer.value, answer.decimals && !Number.isInteger(answer.value) ? answer.decimals : undefined) + unit(answer.unit), answer.after]
        .filter(Boolean)
        .join(' ');
    case 'choice':
      return answer.options[answer.correct].label;
    case 'multi':
      return formatMultiFields(answer.fields);
    case 'written':
      return answer.op === 'div' && answer.remainder ? `${fmt(answer.result)} R ${fmt(answer.remainder)}` : fmt(answer.result);
    case 'cells':
      return 'siehe Lösungsbild';
    case 'numberline':
      return fmt(answer.value);
    case 'order':
      return answer.correct.map((i) => answer.items[i]).join(answer.direction === 'aufsteigend' ? ' < ' : ' > ');
  }
}

/** true if the child has not entered anything yet (Prüfen stays disabled). */
export function isEmptyResponse(response: Response | null): boolean {
  if (!response) return true;
  switch (response.kind) {
    case 'number':
      return !response.unsolvable && response.text.trim() === '';
    case 'choice':
      return response.index < 0;
    case 'multi':
      return Object.values(response.values).every((v) => v.trim() === '');
    case 'written':
      return response.result.trim() === '';
    case 'cells':
      return response.cells.length === 0;
    case 'numberline':
      return !Number.isFinite(response.value);
    case 'order':
      return response.order.length === 0;
  }
}
