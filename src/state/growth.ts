/**
 * Improvement detection (docs/research.md M16): did the child get better than their own earlier self?
 * Pure functions only. The store calls applyGrowth() after the mastery reducer; the round summary uses roundNotes();
 * the progress page uses growthView().
 *
 * Five kinds of improvement, from small to large:
 *   1. selbst   – an item solved on the 2nd attempt, after the 1st wrong attempt showed a hint. Round only.
 *   2. zwilling – a Zwillingsaufgabe (inserted only after a revealed solution) solved first try. Round only.
 *   3. fehler   – a typical error (an error-library tag) that happened in ERROR_MIN_SEEN tasks of a skill did not
 *                 happen again: the next OVERCOME_RUN tasks of that skill that offer the same error were solved first
 *                 try, the last of them on a later day than the error. Once per skill and error.
 *   4. besser   – a hard start (≤ HARD_START_MAX of the first 10 first-try correct, with ≥ HARD_START_MIN_WRONG wrong
 *                 attempts) and, on a later day than the end of that early window, either the last 10 (not
 *                 overlapping the first 10) are ≥ IMPROVE_MIN_GAIN better and ≥ IMPROVE_MIN_RECENT, or a first-try
 *                 answer at 'sicher'/'gemeistert'. Once per skill-Stufe.
 *   5. behalten – a task type the child once got wrong (the skill-Stufe, or the Einmaleins fact) solved first try in
 *                 a spaced review (the scheduler picks those items) ≥ LASTING_MIN_DAYS after the last miss.
 *
 * Anti-farming: kinds 1–2 are only acknowledged, at most a few times per round; kinds 3–5 need evidence from a
 * later day or from a review the child cannot start at will, and real wrong attempts (pressing 'Tipp' is never a
 * mistake to recover from); a miss on a Stufe that is already 'sicher' arms kind 5 only when it cost a Leitner
 * box; every badge is earned once. Nothing compares the child with anyone else. Thresholds are heuristics to tune
 * in a pilot (docs/research.md §7.2).
 *
 * Stored data (ProgressState.growth) is aggregate only: first-try flags, counts and days (P1).
 */
import type { Stufe } from '../core/types';
import { daysBetween } from './dates';
import { normalizeFactKey } from './facts';
import { RECENT_SIZE, feedsRecent, isAtLeastSicher, parseSkillKey } from './mastery';
import type { AnswerEvent, Day, ErrorTrack, Growth, GrowthEvent, GrowthStufe, MasteryState, ProgressState, RoundPurpose } from './types';

/** Size of the early window (the first answers) and of the recent window it is compared with. */
export const GROWTH_WINDOW = RECENT_SIZE;
/** A start with at most this many of the first 10 first-try correct counts as "knifflig am Anfang" … */
export const HARD_START_MAX = 6;
/** … if at least this many of them had a wrong attempt (help alone does not make a start hard). */
export const HARD_START_MIN_WRONG = 3;
/** "Besser geworden": the last 10 are at least this much better than the first 10 … */
export const IMPROVE_MIN_GAIN = 3;
/** … and at least this many of the last 10 are first-try correct. */
export const IMPROVE_MIN_RECENT = 7;
/** The progress view shows a gain from this size on (gentler than the badge, never a decline). */
export const VIEW_MIN_GAIN = 2;
/** Tasks in which an error must have happened before it can be overcome (one slip is not an error pattern). */
export const ERROR_MIN_SEEN = 2;
/** First-try tasks in a row that offered the error before it counts as overcome. */
export const OVERCOME_RUN = 5;
/** Days between the last miss and the spaced review for a lasting improvement (= the spaced-check gap). */
export const LASTING_MIN_DAYS = 3;
/** Tags kept per skill (the oldest are dropped first). */
export const MAX_TAGS_PER_SKILL = 8;
/** Tags taken from one exercise. */
export const MAX_TAGS_PER_ANSWER = 12;
/** Known mistakes recorded per item (1st and 2nd attempt). */
export const MAX_BUGS_PER_ITEM = 2;
/** Notes in the round summary ("Das hast du verbessert") … */
export const MAX_ROUND_NOTES = 4;
/** … and in-item acknowledgements of kinds 1–2 per round (effort line after a 2nd try, twin line). */
export const SMALL_ACKS_PER_ROUND = 3;

/** Letters, digits and the few symbols bug ids use ('rechenart-+', 'rechenart-:'). */
const TAG_RE = /^[A-Za-z0-9][A-Za-z0-9._:+*-]{0,47}$/;
/** Index segments that only number the variants of one error ('vier-2', 'zeile-0-vergessen', 'faktor-1000'). */
const INDEX_SEGMENT = /-\d+(?=-|$)/g;
/** A capital letter at the end that names a variant ('zr.carry-A'); lower-case endings are words ('sub.zero-minus-n'). */
const LETTER_SUFFIX = /-[A-Z]$/;

/**
 * Error-library tag of a Bug id: the id without index segments, or null if it is not a usable tag.
 * Ids are only unique within a skill, so tags are always stored per skill.
 */
export function normalizeTag(id: unknown): string | null {
  if (typeof id !== 'string') return null;
  const tag = id.trim().replace(INDEX_SEGMENT, '').replace(LETTER_SUFFIX, '');
  return TAG_RE.test(tag) ? tag : null;
}

/**
 * The answer had at least one wrong attempt (not only help). Older callers without `wrongAttempt`: an unsolved
 * item, or not first try without any help, counts; solved with help is assumed to be help only (no reward armed).
 */
export function hadWrongAttempt(event: Pick<AnswerEvent, 'wrongAttempt' | 'solved' | 'firstTry' | 'usedHint'>): boolean {
  return event.wrongAttempt ?? (!event.solved || (!event.firstTry && !event.usedHint));
}

/** Distinct tags of an exercise's bug ids (at most MAX_TAGS_PER_ANSWER). */
export function tagsOf(ids: readonly unknown[] | undefined): string[] {
  const out: string[] = [];
  for (const id of ids ?? []) {
    const tag = normalizeTag(id);
    if (tag && !out.includes(tag)) out.push(tag);
    if (out.length >= MAX_TAGS_PER_ANSWER) break;
  }
  return out;
}

export function emptyGrowth(): Growth {
  return { stufen: {}, errors: {}, facts: {} };
}

const countTrue = (xs: readonly boolean[]) => xs.filter(Boolean).length;
/** Own entries only (tags such as 'constructor' must not find inherited properties). */
const own = <T>(record: Record<string, T>, key: string): T | undefined => (Object.prototype.hasOwnProperty.call(record, key) ? record[key] : undefined);
const laterDay = (a: Day | undefined, b: Day): Day => (a !== undefined && a > b ? a : b);

/**
 * At most MAX_TAGS_PER_SKILL tracks. Open tracks with the oldest error go first (never one just updated by
 * `keep`); overcome ones only when nothing else is left, so an overcome error does not become earnable again.
 */
export function capTracks(tracks: Record<string, ErrorTrack>, keep: readonly string[] = []): Record<string, ErrorTrack> {
  const keys = Object.keys(tracks);
  if (keys.length <= MAX_TAGS_PER_SKILL) return tracks;
  const priority = (k: string) => (keep.includes(k) ? 2 : tracks[k].done ? 1 : 0);
  const order = [...keys].sort((a, b) => priority(b) - priority(a) || (tracks[a].day < tracks[b].day ? 1 : tracks[a].day > tracks[b].day ? -1 : 0));
  return Object.fromEntries(order.slice(0, MAX_TAGS_PER_SKILL).map((k) => [k, tracks[k]]));
}

/** Kind 3: the error tracks of the answer's skill. */
function updateErrors(tracks: Record<string, ErrorTrack>, event: AnswerEvent, day: Day, events: GrowthEvent[]): Record<string, ErrorTrack> {
  const offered = tagsOf(event.bugTags);
  const hits = tagsOf(event.bugIds).slice(0, MAX_BUGS_PER_ITEM);
  if (hits.length === 0 && !offered.some((t) => own(tracks, t))) return tracks;
  const next: Record<string, ErrorTrack> = { ...tracks };
  for (const hit of hits) {
    const t = own(next, hit);
    // Overcome stays overcome (no second note or badge for the same error); otherwise count from here.
    if (t?.done) continue;
    next[hit] = { day: laterDay(t?.day, day), seen: Math.min(ERROR_MIN_SEEN, (t?.seen ?? 0) + 1), run: 0 };
  }
  const wrong = hadWrongAttempt(event);
  for (const tag of offered) {
    const t = own(next, tag);
    if (hits.includes(tag) || !t || t.done || t.seen < ERROR_MIN_SEEN) continue;
    // First try: one more clean task. A wrong attempt (another mistake) breaks the run; help alone neither counts
    // nor breaks it (the error itself did not happen).
    const run = event.firstTry ? Math.min(OVERCOME_RUN, t.run + 1) : wrong ? 0 : t.run;
    const updated: ErrorTrack = { ...t, run };
    if (run >= OVERCOME_RUN && day > t.day) {
      updated.done = day;
      events.push({ kind: 'fehler', skillId: event.skillId, stufe: event.stufe, tag, run });
    }
    next[tag] = updated;
  }
  return capTracks(next, hits);
}

/** Kinds 4 and 5 for the answer's skill-Stufe; `facts` is updated in place (a copy made by the caller). */
function updateStufe(
  prev: GrowthStufe | undefined,
  event: AnswerEvent,
  day: Day,
  before: MasteryState,
  prevBox: number,
  after: MasteryState,
  recent: readonly boolean[],
  facts: Record<string, Day>,
  events: GrowthEvent[],
): GrowthStufe {
  const g: GrowthStufe = prev ? { ...prev, early: [...prev.early] } : { early: [], after: 0 };
  const wrong = hadWrongAttempt(event);
  if (feedsRecent(event.purpose)) {
    if (g.early.length < GROWTH_WINDOW) {
      g.early.push(event.firstTry);
      if (wrong) g.earlyWrong = (g.earlyWrong ?? 0) + 1;
      if (g.early.length === GROWTH_WINDOW) g.earlyDay = day;
    } else {
      g.after = Math.min(GROWTH_WINDOW, g.after + 1);
    }
  }

  // Kind 4: a hard start, then clearly better on a later day (or a first-try answer at a new mastery level:
  // 'sicher' reached on the day of the hard start counts once the next day confirms it).
  if (!g.improved && isHardStart(g) && g.earlyDay !== undefined && day > g.earlyDay) {
    const early = countTrue(g.early);
    const disjoint = g.after >= GROWTH_WINDOW && recent.length >= GROWTH_WINDOW;
    const last = disjoint ? countTrue(recent.slice(-GROWTH_WINDOW)) : undefined;
    const gain = last !== undefined && last >= early + IMPROVE_MIN_GAIN && last >= IMPROVE_MIN_RECENT;
    const rose = event.firstTry && isAtLeastSicher(after);
    if (gain || rose) {
      g.improved = day;
      const e: GrowthEvent = { kind: 'besser', skillId: event.skillId, stufe: event.stufe, early };
      if (last !== undefined) e.recent = last;
      if (rose) e.level = after as 'sicher' | 'gemeistert';
      events.push(e);
    }
  }

  // Kind 5: a once-missed task type solved first try in a spaced review days later.
  const factKey = normalizeFactKey(event.factKey);
  const missed = factKey ? own(facts, factKey) : g.miss;
  const review = event.purpose === 'review';
  // A wrong attempt arms it while the Stufe is still being learned, or when it cost a Leitner box (a review or a
  // mixed answer on a scheduled Stufe; every fact miss lowers the fact's box). A slip in a practice round on a Stufe
  // that is already 'sicher' costs nothing, so it cannot be turned into a reward.
  const arms = wrong && (factKey !== null || !isAtLeastSicher(before) || ((review || event.purpose === 'mixed') && prevBox >= 1));
  if (review && event.firstTry && missed !== undefined && daysBetween(missed, day) >= LASTING_MIN_DAYS) {
    const e: GrowthEvent = { kind: 'behalten', skillId: event.skillId, stufe: event.stufe, days: daysBetween(missed, day) };
    if (factKey) {
      e.factKey = factKey;
      delete facts[factKey];
    } else {
      delete g.miss;
    }
    g.kept = (g.kept ?? 0) + 1;
    events.push(e);
  } else if (arms) {
    if (factKey) facts[factKey] = laterDay(own(facts, factKey), day);
    else g.miss = laterDay(g.miss, day);
  }
  return g;
}

/** "Knifflig am Anfang": the first 10 had at most HARD_START_MAX first-try correct and real wrong attempts. */
export function isHardStart(g: GrowthStufe): boolean {
  return g.early.length === GROWTH_WINDOW && countTrue(g.early) <= HARD_START_MAX && (g.earlyWrong ?? 0) >= HARD_START_MIN_WRONG;
}

export interface AppliedGrowth {
  state: ProgressState;
  events: GrowthEvent[];
}

/**
 * Update the improvement tracking for one answer and detect kinds 3–5.
 * @param prev the state before the answer, @param next the state after applyAnswer() (mastery already updated).
 * `day` must be a valid Day. Blitz answers and malformed skill keys leave everything unchanged.
 */
export function applyGrowth(prev: ProgressState, next: ProgressState, event: AnswerEvent, day: Day): AppliedGrowth {
  const key = `${event.skillId}#${event.stufe}`;
  const entry = next.skills[key];
  if (event.purpose === 'blitz' || !parseSkillKey(key) || !entry) return { state: next, events: [] };
  const events: GrowthEvent[] = [];
  const growth = next.growth;
  const facts = { ...growth.facts };
  const was = prev.skills[key];
  const stufe = updateStufe(own(growth.stufen, key), event, day, was?.state ?? 'neu', was?.box ?? 0, entry.state, entry.recent, facts, events);
  const oldTracks = own(growth.errors, event.skillId) ?? {};
  const tracks = updateErrors(oldTracks, event, day, events);
  const errors = tracks === oldTracks ? growth.errors : { ...growth.errors, [event.skillId]: tracks };
  return { state: { ...next, growth: { stufen: { ...growth.stufen, [key]: stufe }, errors, facts } }, events };
}

// ─── Badges ─────────────────────────────────────────────────────────────────

/** Improvement counts for the badges (NRW extras never count). */
export interface GrowthFacts {
  /** Errors overcome (skill + tag). */
  overcome: number;
  /** Skill-Stufen with "besser geworden". */
  improved: number;
  /** Lasting improvements in total. */
  kept: number;
  /** Distinct skills with at least one lasting improvement. */
  keptSkills: number;
}

function optionalSkill(state: ProgressState, skillId: string): boolean {
  return ([1, 2, 3] as Stufe[]).some((s) => state.skills[`${skillId}#${s}`]?.optional === true);
}

export function growthFacts(state: ProgressState): GrowthFacts {
  let improved = 0;
  let kept = 0;
  const keptSkills = new Set<string>();
  for (const [key, g] of Object.entries(state.growth.stufen)) {
    const parsed = parseSkillKey(key);
    if (!parsed || state.skills[key]?.optional === true) continue;
    if (g.improved) improved += 1;
    if ((g.kept ?? 0) > 0) {
      kept += g.kept ?? 0;
      keptSkills.add(parsed.skillId);
    }
  }
  let overcome = 0;
  for (const [skillId, tracks] of Object.entries(state.growth.errors)) {
    if (optionalSkill(state, skillId)) continue;
    overcome += Object.values(tracks).filter((t) => t.done !== undefined).length;
  }
  return { overcome, improved, kept, keptSkills: keptSkills.size };
}

// ─── Round summary ──────────────────────────────────────────────────────────

/** A line of "Das hast du verbessert" in the round summary ('fakten': several Einmaleins facts kept, in one line). */
export type RoundNote =
  | GrowthEvent
  | { kind: 'fakten'; count: number; days: number }
  | { kind: 'zwilling'; count: number }
  | { kind: 'selbst'; count: number };

/** What roundNotes() needs from a finished item. */
export interface NoteItem {
  purpose: RoundPurpose;
  firstTry: boolean;
  /** Solved on the 2nd attempt. */
  secondTry: boolean;
}

/** Larger improvements first: lasting improvement is the strongest evidence of learning. */
const NOTE_RANK: Record<RoundNote['kind'], number> = { behalten: 0, besser: 1, fakten: 2, fehler: 3, zwilling: 4, selbst: 5 };

/** Rank of a note; a single kept Einmaleins fact ranks with the merged facts, below a kept skill-Stufe. */
const rankOf = (n: RoundNote) => (n.kind === 'behalten' && n.factKey ? NOTE_RANK.fakten : NOTE_RANK[n.kind]);

function noteKey(n: GrowthEvent): string {
  switch (n.kind) {
    case 'fehler':
      return `fehler:${n.skillId}:${n.tag}`;
    case 'besser':
      return `besser:${n.skillId}#${n.stufe}`;
    case 'behalten':
      return `behalten:${n.skillId}#${n.stufe}:${n.factKey ?? ''}`;
  }
}

/**
 * The notes of one round: kinds 3–5 from the recorded answers (largest first, each once; several kept Einmaleins
 * facts in one line), then at most one aggregated line each for twins solved first try and items solved on the
 * 2nd attempt; at most MAX_ROUND_NOTES.
 */
export function roundNotes(finished: readonly NoteItem[], events: readonly GrowthEvent[]): RoundNote[] {
  const seen = new Set<string>();
  const big: RoundNote[] = [];
  const facts: Extract<GrowthEvent, { kind: 'behalten' }>[] = [];
  for (const e of events) {
    const k = noteKey(e);
    if (seen.has(k)) continue;
    seen.add(k);
    if (e.kind === 'behalten' && e.factKey) facts.push(e);
    else big.push(e);
  }
  if (facts.length === 1) big.push(facts[0]);
  else if (facts.length > 1) big.push({ kind: 'fakten', count: facts.length, days: Math.min(...facts.map((f) => f.days)) });
  const notes: RoundNote[] = big.sort((a, b) => rankOf(a) - rankOf(b));
  const twins = finished.filter((f) => f.purpose === 'twin' && f.firstTry).length;
  const selbst = finished.filter((f) => f.secondTry).length;
  if (twins > 0) notes.push({ kind: 'zwilling', count: twins });
  if (selbst > 0) notes.push({ kind: 'selbst', count: selbst });
  return notes.slice(0, MAX_ROUND_NOTES);
}

// ─── Progress view ("So hast du dich verbessert") ─────────────────────────────

export interface StufeGrowthView {
  stufe: Stufe;
  /** First 10 vs last 10 (not overlapping), shown only when the last 10 are ≥ VIEW_MIN_GAIN better. */
  window?: { early: number; recent: number };
  /** A hard start and now this mastery state. */
  level?: 'sicher' | 'gemeistert';
  /** First-try correct answers of the hard start (with `level`). */
  early?: number;
  /** Lasting improvements. */
  kept: number;
}

export interface SkillGrowthView {
  stufen: StufeGrowthView[];
  /** Overcome error tags, most recent first. */
  overcome: string[];
}

/** Only improvements, never a decline; null when there is nothing to show for this skill. */
export function growthView(state: ProgressState, skillId: string): SkillGrowthView | null {
  const stufen: StufeGrowthView[] = [];
  for (const s of [1, 2, 3] as Stufe[]) {
    const key = `${skillId}#${s}`;
    const g = state.growth.stufen[key];
    const p = state.skills[key];
    if (!g || !p) continue;
    const view: StufeGrowthView = { stufe: s, kept: g.kept ?? 0 };
    const full = g.early.length === GROWTH_WINDOW;
    const early = countTrue(g.early);
    if (full && g.after >= GROWTH_WINDOW && p.recent.length >= GROWTH_WINDOW) {
      const recent = countTrue(p.recent.slice(-GROWTH_WINDOW));
      if (recent >= early + VIEW_MIN_GAIN) view.window = { early, recent };
    }
    if (isHardStart(g) && isAtLeastSicher(p.state)) {
      view.level = p.state as 'sicher' | 'gemeistert';
      view.early = early;
    }
    if (view.window || view.level || view.kept > 0) stufen.push(view);
  }
  const tracks = state.growth.errors[skillId] ?? {};
  const overcome = Object.entries(tracks)
    .filter(([, t]) => t.done !== undefined)
    .sort(([, a], [, b]) => (a.done! < b.done! ? 1 : a.done! > b.done! ? -1 : 0))
    .map(([tag]) => tag);
  return stufen.length > 0 || overcome.length > 0 ? { stufen, overcome } : null;
}
