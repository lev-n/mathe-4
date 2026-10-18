/**
 * One practice visit ("Sitzung"): everything that must survive navigation between skills, topics and
 * Stufen while the child keeps practising (docs/research.md M12, M15):
 * - the 20-minute break suggestion counts continuous practice, not time on one page,
 * - the normalising sentence appears at most once per visit,
 * - intro examples / Einstiegs-Checks and recently used exercise keys.
 *
 * A visit ends after a real pause (VISIT_GAP_MS without any practice activity) or a page reload
 * (this is module state in memory only; nothing is written to storage).
 */
import type { EntryCheck } from './session';

/** Longer than this without practice activity counts as a real pause: a new visit starts. */
export const VISIT_GAP_MS = 10 * 60 * 1000;

export interface PracticeVisit {
  /** Start of continuous practice (reset after a real pause). */
  startedAt: number;
  /** Last practice activity (answer checked, item shown). */
  lastActiveAt: number;
  normalisedUsed: boolean;
  introduced: string[];
  entry: Record<string, EntryCheck>;
  breakOffered: boolean;
  recentKeys: Set<string>;
  praiseCounter: number;
}

function newVisit(now: number): PracticeVisit {
  return {
    startedAt: now,
    lastActiveAt: now,
    normalisedUsed: false,
    introduced: [],
    entry: {},
    breakOffered: false,
    recentKeys: new Set(),
    praiseCounter: 0,
  };
}

let current: PracticeVisit | null = null;

function isStale(visit: PracticeVisit, now: number): boolean {
  // A clock that went backwards also starts a new visit.
  return now < visit.lastActiveAt || now - visit.lastActiveAt > VISIT_GAP_MS;
}

/** The running visit, or a new one after a real pause. */
export function practiceVisit(now: number): PracticeVisit {
  if (!current || isStale(current, now)) current = newVisit(now);
  return current;
}

/**
 * Record practice activity. After a real pause inside the same page (the child left the tablet lying
 * around), continuous practice starts again: the break timer restarts.
 */
export function touchVisit(visit: PracticeVisit, now: number): void {
  if (isStale(visit, now)) {
    visit.startedAt = now;
    visit.breakOffered = false;
  }
  visit.lastActiveAt = now;
}

/** Forget the running visit (tests). */
export function resetPracticeVisit(): void {
  current = null;
}
