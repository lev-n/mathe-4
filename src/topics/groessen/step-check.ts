/**
 * Test support (imported only by *.test.ts): an independent, unit-aware evaluator for the
 * arithmetic lines in worked solutions, e.g. '4 m = 4 · 100 cm = 400 cm', 'Bus pro Kind: 360 € : 24 = 15 €',
 * '95 : 8 = 11 Rest 7'. Every side of an equation is evaluated in base units (mm, g, ml, ct, s);
 * lines that contain words, clock times or placeholders are skipped.
 */
import { fmt } from '../../core/format';
import type { Exercise, Step } from '../../core/types';

const UNIT_BASE: Record<string, number> = {
  mm: 1, cm: 10, m: 1000, km: 1_000_000,
  g: 1, kg: 1000, t: 1_000_000,
  ml: 1, l: 1000,
  ct: 1, '€': 100,
  s: 1, min: 60, h: 3600, Tage: 86_400, Wochen: 604_800,
  Monate: 1, Jahre: 12,
};

const FRACTIONS: Record<string, number> = { '½': 0.5, '¼': 0.25, '¾': 0.75 };

type Tok = { k: 'num'; v: number; unit: boolean } | { k: 'op'; v: string } | { k: 'paren'; v: '(' | ')' };

/** Tokenise; returns null if the text contains anything that is not a number, unit, operator or parenthesis. */
function tokenize(src: string): Tok[] | null {
  const s = src.replace(/\u202F/g, '').replace(/\u00A0/g, ' ').trim();
  const toks: Tok[] = [];
  let i = 0;
  const re = /^(?:(\d+(?:,\d+)?)(?:\s?([½¼¾]))?|([½¼¾]))(?:\s?(mm|cm|km|kg|ml|ct|min|m|g|t|l|€|h|s|Tage|Wochen|Monate|Jahre)(?![A-Za-zÄÖÜäöüß]))?/;
  while (i < s.length) {
    const c = s[i];
    if (c === ' ') { i++; continue; }
    if ('+−·:'.includes(c)) { toks.push({ k: 'op', v: c }); i++; continue; }
    if (c === '(' || c === ')') { toks.push({ k: 'paren', v: c }); i++; continue; }
    const m = s.slice(i).match(re);
    if (!m || m[0].length === 0) return null;
    let v = m[3] ? FRACTIONS[m[3]] : Number(m[1].replace(',', '.')) + (m[2] ? FRACTIONS[m[2]] : 0);
    const unit = m[4];
    if (unit) v *= UNIT_BASE[unit];
    // mixed notation '2 km 50 m' / '1 h 25 min': juxtaposed quantities are added
    const prev = toks[toks.length - 1];
    if (prev && prev.k === 'num') toks.push({ k: 'op', v: '+' });
    toks.push({ k: 'num', v, unit: !!unit });
    i += m[0].length;
  }
  return toks;
}

/** Evaluate with · and : before + and −. */
function evaluate(toks: Tok[]): number | null {
  let pos = 0;
  const peek = () => toks[pos];
  const atom = (): number | null => {
    const t = toks[pos++];
    if (!t) return null;
    if (t.k === 'num') return t.v;
    if (t.k === 'paren' && t.v === '(') {
      const v = sum();
      const close = toks[pos++];
      return close && close.k === 'paren' && close.v === ')' ? v : null;
    }
    return null;
  };
  const product = (): number | null => {
    let v = atom();
    while (v !== null && peek() && peek().k === 'op' && (peek().v === '·' || peek().v === ':')) {
      const op = toks[pos++].v;
      const r = atom();
      if (r === null) return null;
      v = op === '·' ? v * r : v / r;
    }
    return v;
  };
  const sum = (): number | null => {
    let v = product();
    while (v !== null && peek() && peek().k === 'op' && (peek().v === '+' || peek().v === '−')) {
      const op = toks[pos++].v;
      const r = product();
      if (r === null) return null;
      v = op === '+' ? v + r : v - r;
    }
    return v;
  };
  const v = sum();
  return pos === toks.length ? v : null;
}

export interface SideValue { value: number; hasUnit: boolean }

export function evalSide(src: string): SideValue | null {
  const toks = tokenize(src);
  if (!toks || toks.length === 0) return null;
  const value = evaluate(toks);
  if (value === null || !Number.isFinite(value)) return null;
  return { value, hasUnit: toks.some((t) => t.k === 'num' && t.unit) };
}

/** Check one step text. Returns an error message or null (also null when the line is not checkable). */
export function checkStepText(text: string): string | null {
  if (/Uhr|□|\?/.test(text)) return null;
  for (const part of text.split(/;\s|\.\s/)) {
    const body = part.replace(/^[^=]*?[A-Za-zÄÖÜäöüß]:\s/, '').replace(/\.$/, '').trim();
    // 'a : b = q Rest r'
    const rest = body.match(/^([\d\u202F]+) : (\d+) = ([\d\u202F]+) Rest (\d+)$/);
    if (rest) {
      const [a, b, q, r] = rest.slice(1).map((x) => Number(x.replace(/\u202F/g, '')));
      if (q * b + r !== a || r >= b) return `wrong division with remainder: "${part}"`;
      continue;
    }
    if (!body.includes(' = ')) continue;
    const sides = body.split(' = ').map(evalSide);
    if (sides.some((x) => x === null)) continue;
    const vals = sides as SideValue[];
    if (vals.some((x) => x.hasUnit) && vals.some((x) => !x.hasUnit)) continue;
    for (const v of vals) {
      if (Math.abs(v.value - vals[0].value) > 1e-6 * Math.max(1, Math.abs(vals[0].value))) return `arithmetic mismatch in "${part}": ${vals.map((x) => x.value).join(' vs ')}`;
    }
  }
  return null;
}

function stepText(s: Step): string {
  return typeof s === 'string' ? s : s.text;
}

/** All arithmetic problems in an exercise's worked solution + "last step states the result" for number/multi answers. */
export function checkWorkedSolution(ex: Exercise): string[] {
  const errors: string[] = [];
  for (const s of ex.steps) {
    const e = checkStepText(stepText(s));
    if (e) errors.push(`${ex.key}: ${e}`);
  }
  const last = stepText(ex.steps[ex.steps.length - 1]);
  if (ex.answer.kind === 'number') {
    if (ex.answer.value === null) {
      if (!/nicht lösbar/i.test(last)) errors.push(`${ex.key}: last step should say the task is not solvable`);
    } else {
      const forms = [fmt(ex.answer.value), ex.answer.decimals ? fmt(ex.answer.value, ex.answer.decimals) : ''].filter(Boolean);
      if (!forms.some((f) => last.includes(f))) errors.push(`${ex.key}: last step "${last}" does not state ${forms[0]}`);
    }
  } else if (ex.answer.kind === 'multi') {
    for (const f of ex.answer.fields) {
      if (!last.includes(String(f.value)) && !(f.value === 0)) errors.push(`${ex.key}: last step "${last}" does not contain field ${f.id}=${f.value}`);
    }
  }
  return errors;
}

/**
 * For conversion items 'LHS = □ unit' or 'LHS = □ big □ small': evaluate the left side independently
 * and compare it with the answer (in base units). Returns an error, or null if fine / not applicable.
 */
export function checkConversion(ex: Exercise): string | null {
  const m = ex.expression?.match(/^(.*) = (□.*)$/);
  if (!m) return null;
  const lhs = evalSide(m[1]);
  if (!lhs || !lhs.hasUnit) return null;
  let rhs: number;
  if (ex.answer.kind === 'number' && ex.answer.unit && ex.answer.value !== null) {
    const r = evalSide(`${fmt(ex.answer.value)}\u00A0${ex.answer.unit}`);
    if (!r) return null;
    rhs = r.value;
  } else if (ex.answer.kind === 'multi') {
    let sum = 0;
    for (const f of ex.answer.fields) {
      const r = evalSide(`${fmt(f.value)}\u00A0${f.after ?? ''}`);
      if (!r || !r.hasUnit) return null;
      sum += r.value;
    }
    rhs = sum;
  } else {
    return null;
  }
  return Math.abs(lhs.value - rhs) < 1e-6 ? null : `${ex.key}: ${ex.expression} → ${lhs.value} ≠ ${rhs}`;
}
