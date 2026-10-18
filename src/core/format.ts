/**
 * German school notation (see docs/research.md, "Notation conventions"):
 * - numbers with ≥ 5 digits grouped in threes with U+202F (12 345; 1 000 000), 4-digit numbers ungrouped (2500)
 * - decimal comma; money '3,45 €'; quantities 'number + space + unit'
 * - operators + − · : and the placeholder □
 */

/** Narrow no-break space used for digit grouping. */
export const GROUP = '\u202F';
/** No-break space between number and unit. */
export const NBSP = '\u00A0';

export const PLUS = '+';
export const MINUS = '\u2212';
export const TIMES = '\u00B7';
export const DIV = ':';
export const BOX = '\u25A1';
export const APPROX = '\u2248';

function groupDigits(digits: string): string {
  if (digits.length < 5) return digits;
  let out = '';
  for (let i = 0; i < digits.length; i++) {
    if (i > 0 && (digits.length - i) % 3 === 0) out += GROUP;
    out += digits[i];
  }
  return out;
}

/**
 * Format a number in German school notation.
 * fmt(345678) → '345 678', fmt(2500) → '2500', fmt(2.5, 2) → '2,50', fmt(-3) → '−3'
 * @param decimals fixed number of decimal places (default: as needed, max 3)
 */
export function fmt(n: number, decimals?: number): string {
  if (!Number.isFinite(n)) throw new RangeError(`fmt: not a finite number: ${n}`);
  const neg = n < 0;
  const abs = Math.abs(n);
  let text: string;
  if (decimals !== undefined) {
    text = abs.toFixed(decimals);
  } else {
    text = String(Math.round(abs * 1000) / 1000);
  }
  const [intPart, frac] = text.split('.');
  const body = groupDigits(intPart) + (frac ? ',' + frac : '');
  return (neg ? MINUS : '') + body;
}

/** Money from Cent: fmtMoney(345) → '3,45 €', fmtMoney(1200000) → '12 000,00 €' */
export function fmtMoney(cents: number): string {
  if (!Number.isInteger(cents)) throw new RangeError(`fmtMoney: cents must be an integer: ${cents}`);
  return `${fmt(cents / 100, 2)}${NBSP}€`;
}

/** Quantity with unit: fmtQty(5, 'kg') → '5 kg', fmtQty(1.05, 'm', 2) → '1,05 m' */
export function fmtQty(n: number, unit: string, decimals?: number): string {
  return `${fmt(n, decimals)}${NBSP}${unit}`;
}

/** Clock time: fmtTime(14, 5) → '14:05 Uhr' */
export function fmtTime(hours: number, minutes: number, withUhr = true): string {
  const t = `${hours}:${String(minutes).padStart(2, '0')}`;
  return withUhr ? `${t}${NBSP}Uhr` : t;
}

/** Time span in mixed notation: fmtDuration(85) → '1 h 25 min', fmtDuration(60) → '1 h', fmtDuration(45) → '45 min' */
export function fmtDuration(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m}${NBSP}min`;
  if (m === 0) return `${h}${NBSP}h`;
  return `${h}${NBSP}h ${m}${NBSP}min`;
}

// ─── Zahlwörter ──────────────────────────────────────────────────────────────

const ONES = ['', 'ein', 'zwei', 'drei', 'vier', 'fünf', 'sechs', 'sieben', 'acht', 'neun'];
const TEENS = ['zehn', 'elf', 'zwölf', 'dreizehn', 'vierzehn', 'fünfzehn', 'sechzehn', 'siebzehn', 'achtzehn', 'neunzehn'];
const TENS = ['', '', 'zwanzig', 'dreißig', 'vierzig', 'fünfzig', 'sechzig', 'siebzig', 'achtzig', 'neunzig'];

/** 1–999 as a word stem (1 → 'ein', used inside compounds). */
function below1000(n: number): string {
  const h = Math.floor(n / 100);
  const rest = n % 100;
  let out = h > 0 ? ONES[h] + 'hundert' : '';
  if (rest === 0) return out;
  if (rest < 10) out += ONES[rest];
  else if (rest < 20) out += TEENS[rest - 10];
  else {
    const t = Math.floor(rest / 10);
    const o = rest % 10;
    out += (o > 0 ? ONES[o] + 'und' : '') + TENS[t];
  }
  return out;
}

/**
 * German number word for 0 ≤ n ≤ 1 000 000.
 * numberWord(304020) → 'dreihundertviertausendzwanzig', numberWord(1) → 'eins', numberWord(1000000) → 'eine Million'
 */
export function numberWord(n: number): string {
  if (!Number.isInteger(n) || n < 0 || n > 1_000_000) throw new RangeError(`numberWord: out of range: ${n}`);
  if (n === 0) return 'null';
  if (n === 1_000_000) return 'eine Million';
  const th = Math.floor(n / 1000);
  const rest = n % 1000;
  let out = th > 0 ? below1000(th) + 'tausend' : '';
  if (rest > 0) out += below1000(rest);
  // standalone 'ein' at the very end becomes 'eins' (101 → 'einhunderteins'), but not in 'einundzwanzig'
  if (out.endsWith('ein') && rest % 100 === 1) out += 's';
  return out;
}

// ─── Screen-reader text ──────────────────────────────────────────────────────

/**
 * Turn displayed maths into speakable German text:
 * '7 · 8 = □' → '7 mal 8 gleich Lücke'; '345 678' → '345678' (so it is read as one number).
 * A clock time stays a clock time: '14:30 Uhr' as is, and a spaced '21 : 0 Uhr' becomes '21:00 Uhr'
 * (never 'geteilt durch').
 */
export function toSpeech(text: string): string {
  return text
    .replace(/(\d)\u202F(?=\d{3})/g, '$1')
    .replace(/\b(\d{1,2})\s+:\s+(\d{1,2})(?=[\s\u00A0]+Uhr\b)/g, (_all, h: string, m: string) => `${h}:${m.padStart(2, '0')}`)
    .replace(/\u00B7/g, ' mal ')
    .replace(/\s:\s/g, ' geteilt durch ')
    .replace(/\u2212/g, ' minus ')
    .replace(/\s\+\s/g, ' plus ')
    .replace(/\u2248/g, ' ist ungefähr ')
    .replace(/\u25A1/g, ' Lücke ')
    .replace(/\s=\s/g, ' gleich ')
    .replace(/\s<\s/g, ' ist kleiner als ')
    .replace(/\s>\s/g, ' ist größer als ')
    .replace(/\u00A0/g, ' ')
    .replace(/\s+/g, ' ')
    // No space before punctuation ('… etwa 1 Lücke .' → '… etwa 1 Lücke.').
    .replace(/\s+([.,;!?])(?=\s|$)/g, '$1')
    .trim();
}
