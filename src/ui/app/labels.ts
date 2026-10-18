/** German UI labels and small formatters shared by the pages. */
import { fmt } from '../../core/format';
import type { Stufe } from '../../core/types';
import type { Day, MasteryState } from '../../state/types';

/**
 * Status words for the mastery stars (docs/research.md L8, M15 "Status labels"); the only wording for
 * them in the app (star legend, topic and progress pages, round summary).
 */
export const MASTERY_LABEL: Record<MasteryState, string> = {
  neu: 'Noch nicht geübt',
  geuebt: 'Geübt',
  sicher: 'Sicher',
  gemeistert: 'Gemeistert',
};

export const stufeLabel = (s: Stufe): string => `Stufe ${s}`;

const MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

/** '2026-10-18' → '18. Oktober 2026' (falls back to the raw text for malformed input). */
export function formatDay(day: Day): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
  if (!m) return day;
  const month = MONTHS[Number(m[2]) - 1];
  if (!month) return day;
  return `${Number(m[3])}.\u00A0${month} ${m[1]}`;
}

/** 'an 1 Tag' → 'an einem Tag', otherwise 'an 12 Tagen'. */
export function daysPhrase(n: number): string {
  return n === 1 ? 'an einem Tag' : `an ${fmt(n)} Tagen`;
}

/** 1 → '1 Aufgabe', 5 → '5 Aufgaben'. */
export function tasksPhrase(n: number): string {
  return n === 1 ? '1 Aufgabe' : `${fmt(n)} Aufgaben`;
}
