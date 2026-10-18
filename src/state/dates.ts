/**
 * Day helpers. A Day is an ISO calendar date 'YYYY-MM-DD' in the child's local time.
 *
 * Only `today()` looks at the local clock. All arithmetic on Days is done on the
 * calendar date itself (via UTC), so it is independent of time zones and DST.
 */
import type { Day } from './types';

const DAY_MS = 86_400_000;
const DAY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function fromUtc(ms: number): Day {
  const d = new Date(ms);
  return `${String(d.getUTCFullYear()).padStart(4, '0')}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

/** Calendar date of a Day as UTC midnight (ms). Throws on malformed input. */
function toUtc(day: Day): number {
  const m = DAY_RE.exec(day);
  if (!m) throw new RangeError(`Not a day: ${day}`);
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

/** Today as local ISO day 'YYYY-MM-DD'. */
export function today(now: Date = new Date()): Day {
  return `${String(now.getFullYear()).padStart(4, '0')}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
}

/** true for a real calendar date in the form 'YYYY-MM-DD' (e.g. not '2026-02-30'). */
export function isDay(value: unknown): value is Day {
  if (typeof value !== 'string') return false;
  const m = DAY_RE.exec(value);
  if (!m) return false;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (y < 1900 || mo < 1 || mo > 12 || d < 1 || d > 31) return false;
  return fromUtc(Date.UTC(y, mo - 1, d)) === value;
}

/** day + n days (n may be negative). */
export function addDays(day: Day, n: number): Day {
  return fromUtc(toUtc(day) + Math.trunc(n) * DAY_MS);
}

/** Whole days from a to b (b − a). */
export function daysBetween(a: Day, b: Day): number {
  return Math.round((toUtc(b) - toUtc(a)) / DAY_MS);
}

/** 0 = Monday … 6 = Sunday. */
export function weekdayIndex(day: Day): number {
  return (new Date(toUtc(day)).getUTCDay() + 6) % 7;
}

/** Monday of the week containing `day`. */
export function weekStart(day: Day): Day {
  return addDays(day, -weekdayIndex(day));
}

/** Insert `day` into a sorted list of distinct days (returns the same array if already present). */
export function insertDay(days: readonly Day[], day: Day): Day[] {
  if (days.includes(day)) return days as Day[];
  return [...days, day].sort();
}
