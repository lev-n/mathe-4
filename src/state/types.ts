/**
 * Progress state contracts (docs/research.md §6: mastery, Leitner, motivation, § 25 TDDDG opt-in).
 * Everything here is aggregate data only: no ids, no names, no free text, dates at day granularity.
 */
import type { Stufe, TopicId } from '../core/types';

/** "Noch nicht geübt" → "Geübt" (1★) → "Sicher" (2★) → "Gemeistert" (3★). */
export type MasteryState = 'neu' | 'geuebt' | 'sicher' | 'gemeistert';

/** Storage opt-in. Nothing is written to localStorage unless 'granted'. 'denied' is not persisted. */
export type Consent = 'unknown' | 'granted' | 'denied';

/** ISO day 'YYYY-MM-DD' in local time. */
export type Day = string;

export interface StufeProgress {
  attempts: number;
  /** Last ≤ 10 first-try results (true = correct on first try without hint), newest last. */
  recent: boolean[];
  /**
   * Distinct days on which this Stufe was practised (L1: 'Gemeistert' needs ≥ 3). A plain count:
   * no session ids or times are stored (P1).
   */
  practiceDays: number;
  state: MasteryState;
  sicherSince?: Day;
  /** Leitner box: 0 = not scheduled; 1–5 → review after 1, 3, 7, 14, 28 days. */
  box: number;
  due?: Day;
  /** Results of spaced checks (review items ≥ 3 days after becoming 'sicher'), last ≤ 5. */
  checks: boolean[];
  last?: Day;
  /** Set for NRW-optional skills: badges and topic aggregates skip these entries. */
  optional?: true;
}

export interface FactProgress {
  /** 0 = new; 1–5 like StufeProgress.box. */
  box: number;
  due?: Day;
  seen: number;
  correct: number;
}

export interface Settings {
  /** Länder setting for written subtraction (default 'abziehen'). */
  subtractionMethod: 'abziehen' | 'ergaenzen';
  /** Show optional NRW extras (Tonne, × 3-stellig, Binärzahlen, Datenmengen). */
  nrwExtras: boolean;
  /** Allow the optional 2-minute Blitzrunde (default false, adults can enable). */
  blitzrunde: boolean;
  /** Übungstage pro Woche, 1–5 (default 3). */
  weeklyGoal: number;
  /** 'Schrift größer' (+25 %). */
  largeText: boolean;
  /** 'Mehr Abstand'. */
  wideSpacing: boolean;
  /** 'Animationen aus' (also follows prefers-reduced-motion). */
  reduceMotion: boolean;
  /** Andika as "Schulschrift". */
  schoolFont: boolean;
  /** On-screen Ziffernblock: 'auto' = on touch devices. */
  keypad: 'auto' | 'on' | 'off';
}

export const DEFAULT_SETTINGS: Settings = {
  subtractionMethod: 'abziehen',
  nrwExtras: false,
  blitzrunde: false,
  weeklyGoal: 3,
  largeText: false,
  wideSpacing: false,
  reduceMotion: false,
  schoolFont: false,
  keypad: 'auto',
};

/**
 * Improvement tracking of one skill-Stufe (docs/research.md M16; src/state/growth.ts). Counts only: the early window
 * is compared with StufeProgress.recent, so its sum is all that is needed.
 */
export interface GrowthStufe {
  /** Answers in the early window (the first answers since tracking began, same purposes as `recent`), 0 … 10. */
  earlyN: number;
  /** Of them first-try correct. */
  earlyOk: number;
  /** Of them with a wrong attempt (help alone is not one): a hard start needs real mistakes. */
  earlyWrong: number;
  /** Day the early window became full. */
  earlyDay?: Day;
  /** The early window was taken over from older saved progress (v2) and is not the real start ("Früher …"). */
  carried?: true;
  /** Answers that fed `recent` after the early window was full, capped at 10 (10 = the two windows do not overlap). */
  after: number;
  /** Most first-try correct among the last 10 once the windows did not overlap (never goes down). */
  best?: number;
  /**
   * Last day of a wrong attempt here while the Stufe was still being learned (not yet 'sicher') or that cost a
   * Leitner box. Einmaleins facts use Growth.facts instead.
   */
  miss?: Day;
  /** "Besser geworden" was detected (at most once per skill-Stufe). */
  improved?: true;
  /** Lasting improvements here: once-missed tasks solved first try in a spaced review days later. */
  kept?: number;
}

/** An error-library tag (normalised Bug id) that happened in a skill. */
export interface ErrorTrack {
  /** Last day the error happened. */
  day: Day;
  /** Tasks in which it happened, capped at 2 (a single slip is not yet an error to overcome). */
  seen: number;
  /** Later tasks of the skill that offered this error and were solved first try in a row (0 … 5). */
  run: number;
  /** Day it was overcome (5 in a row, the last of them on a later day than the error). Never undone. */
  done?: Day;
}

export interface Growth {
  /** key `${skillId}#${stufe}` */
  stufen: Record<string, GrowthStufe>;
  /** skillId → tag → track, at most 8 tags per skill. */
  errors: Record<string, Record<string, ErrorTrack>>;
  /** Einmaleins fact ('3x7') → last day it was missed. */
  facts: Record<string, Day>;
}

/** An improvement detected while recording one answer (types 3–5 of docs/research.md M16). */
export type GrowthEvent =
  /** Error overcome: a typical error did not happen again in 5 later tasks of the skill. */
  | { kind: 'fehler'; skillId: string; stufe: Stufe; tag: string; run: number }
  /**
   * Skill improved after a hard start: `recent` is the last 10 first-try results when the windows do not overlap;
   * `level` is set when the Stufe is 'sicher'/'gemeistert'; `carried` when the early window came from older saved
   * progress (not the real start: "Früher …").
   */
  | { kind: 'besser'; skillId: string; stufe: Stufe; early: number; recent?: number; level?: 'sicher' | 'gemeistert'; carried?: true }
  /** Lasting improvement: a once-missed task type solved first try in a spaced review `days` after the miss. */
  | { kind: 'behalten'; skillId: string; stufe: Stufe; days: number; factKey?: string };

export interface ProgressState {
  version: 3;
  /** key `${skillId}#${stufe}` */
  skills: Record<string, StufeProgress>;
  /** Einmaleins facts, key '3x7' (smaller factor first). */
  facts: Record<string, FactProgress>;
  /** Distinct days with ≥ 1 answered item, sorted ascending (lifetime "Übungstage"). */
  days: Day[];
  /** badgeId → day earned */
  badges: Record<string, Day>;
  totals: {
    answered: number;
    firstTry: number;
    /**
     * Solved, but not first try ("drangeblieben"): on the 2nd attempt after the hint, or with 'Tipp' / the
     * example. Help alone counts too, so it is not used for the improvement tracking (src/state/growth.ts).
     */
    afterHint: number;
    rounds: number;
    checksPassed: number;
  };
  /** Best Blitzrunde score (own best only, never compared with others). */
  blitzBest?: number;
  /**
   * Review answers ("Heute wiederholen") given on `day`; only the latest day is kept.
   * Caps the review queue at 8 items a day, not per round (L2).
   */
  reviewed?: { day: Day; count: number };
  /**
   * Skill and Stufe of the last answer in a practice round ("Weiter üben" after a reload).
   * No time and no id (P1); review, mixed and Blitz answers leave it unchanged.
   */
  lastPlayed?: { skillId: string; stufe: Stufe };
  /** Improvement tracking (docs/research.md M16). */
  growth: Growth;
  settings: Settings;
}

/**
 * Result of the last write to storage while consent is 'granted': 'failed' when storage is missing,
 * blocked or full (progress then lives in memory only and is lost on reload).
 */
export type SaveStatus = 'ok' | 'failed';

export type RoundPurpose = 'practice' | 'mixed' | 'review' | 'twin' | 'blitz';

/** What the practice page should run. */
export type PracticePlan =
  | { mode: 'skill'; skillId: string; stufe: Stufe }
  | { mode: 'mixed'; topicId: TopicId }
  | { mode: 'review' }
  | { mode: 'blitz' };

export interface RoundSlot {
  skillId: string;
  stufe: Stufe;
  purpose: RoundPurpose;
}

export interface AnswerEvent {
  skillId: string;
  topicId: TopicId;
  stufe: Stufe;
  /** Correct on the first try without using a hint. */
  firstTry: boolean;
  /** Solved within the allowed tries. */
  solved: boolean;
  usedHint: boolean;
  purpose: RoundPurpose;
  /** Einmaleins fact ('3x7') if the exercise had one. */
  factKey?: string;
  /** Time from showing the item to the first check (recorded silently, never shown). */
  latencyMs?: number;
  day: Day;
  /** Optional NRW extra: does not count toward badges. */
  optional?: boolean;
  /** Ids of the exercise's bugs (the typical errors it offers; normalised to tags by src/state/growth.ts). */
  bugTags?: string[];
  /** Ids of the known mistakes (matched Bugs) the child made in this item, at most 2. */
  bugIds?: string[];
  /**
   * At least one wrong attempt (not only help). Missing in older callers: then derived conservatively
   * from solved/firstTry/usedHint (src/state/growth.ts hadWrongAttempt).
   */
  wrongAttempt?: boolean;
}

export interface BadgeDef {
  id: string;
  /** Competence-based name, e.g. 'Stellenwert-Profi'. */
  title: string;
  /** How it was earned, e.g. 'Du kannst Zahlen bis 1 000 000 sicher in der Stellentafel darstellen.' */
  description: string;
  /** Single emoji used as the badge picture (aria-hidden; title is the accessible name). */
  icon: string;
  /** Rewards getting better than one's own earlier self (docs/research.md M16), not mastery. */
  improvement?: true;
}

export interface AnswerOutcome {
  before: MasteryState;
  after: MasteryState;
  /** Badges earned by this answer (shown at round end, never as a pop-up mid-round). */
  newBadges: BadgeDef[];
  /** 5 first-try correct in a row at this Stufe and Stufe < 3 → suggest the next Stufe. */
  suggestNextStufe: boolean;
  /** Improvements detected by this answer (shown in the round summary only). */
  growth: GrowthEvent[];
}

export interface ReviewItem {
  skillId: string;
  stufe: Stufe;
  due: Day;
}
