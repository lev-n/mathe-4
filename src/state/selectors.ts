/**
 * Read-only views on ProgressState for the UI. All functions are pure.
 */
import type { SkillDef, Stufe, TopicId } from '../core/types';
import { addDays, weekStart } from './dates';
import { compareFactKeys } from './facts';
import { TOPIC_IDS, isAtLeastSicher, isOptionalEntry, parseSkillKey } from './mastery';
import type { Day, MasteryState, ProgressState, ReviewItem, StufeProgress } from './types';

export const skillKey = (skillId: string, stufe: Stufe) => `${skillId}#${stufe}`;

export function stufeProgress(state: ProgressState, skillId: string, stufe: Stufe): StufeProgress | undefined {
  return state.skills[skillKey(skillId, stufe)];
}

export function masteryOf(state: ProgressState, skillId: string, stufe: Stufe): MasteryState {
  return stufeProgress(state, skillId, stufe)?.state ?? 'neu';
}

/** Stars per mastery state: 0 = neu, 1 = geübt, 2 = sicher, 3 = gemeistert. */
export const MASTERY_STARS: Readonly<Record<MasteryState, 0 | 1 | 2 | 3>> = { neu: 0, geuebt: 1, sicher: 2, gemeistert: 3 };

/** 0 = neu, 1 = geübt, 2 = sicher, 3 = gemeistert */
export function starsOf(state: ProgressState, skillId: string, stufe: Stufe): 0 | 1 | 2 | 3 {
  return MASTERY_STARS[masteryOf(state, skillId, stufe)];
}

/** Suggested Stufe for a skill the child has not worked on yet (C4). */
export const DEFAULT_STUFE: Stufe = 2;

/**
 * The recommended Stufe ("Empfohlen"). For an untouched skill it is Stufe 2, about the Regelstandard
 * (docs/research.md C4); Stufe 1 with its scaffolds stays one tap away. Otherwise, from the lowest Stufe
 * the child has worked on, the first Stufe that is not yet 'sicher'/'gemeistert' (3 if all are).
 */
export function suggestedStufe(state: ProgressState, skillId: string): Stufe {
  const start = ([1, 2, 3] as Stufe[]).find((s) => (stufeProgress(state, skillId, s)?.attempts ?? 0) > 0) ?? DEFAULT_STUFE;
  for (const s of [1, 2, 3] as Stufe[]) {
    if (s < start) continue;
    if (!isAtLeastSicher(masteryOf(state, skillId, s))) return s;
  }
  return 3;
}

/** Highest Stufe with at least one answer, if any. */
export function practisedStufe(state: ProgressState, skillId: string): Stufe | undefined {
  for (const s of [3, 2, 1] as Stufe[]) {
    if ((stufeProgress(state, skillId, s)?.attempts ?? 0) > 0) return s;
  }
  return undefined;
}

/** Entries hidden from overviews: NRW extras while the NRW setting is off. */
function hidden(state: ProgressState, p: StufeProgress): boolean {
  return isOptionalEntry(p) && !state.settings.nrwExtras;
}

/** "Heute wiederholen" is capped at 8 review answers a day (L2), not per round. */
export const REVIEWS_PER_DAY = 8;

/** Review answers still possible on `day` (REVIEWS_PER_DAY minus those already given that day). */
export function reviewBudget(state: ProgressState, day: Day): number {
  const done = state.reviewed?.day === day ? state.reviewed.count : 0;
  return Math.max(0, REVIEWS_PER_DAY - done);
}

/** Due skill-Stufen, most overdue first, capped at `limit` (default 8). */
export function dueReviews(state: ProgressState, day: Day, limit = 8): ReviewItem[] {
  const items: ReviewItem[] = [];
  for (const [key, p] of Object.entries(state.skills)) {
    if (p.box < 1 || !p.due || p.due > day || hidden(state, p)) continue;
    const parsed = parseSkillKey(key);
    if (parsed) items.push({ skillId: parsed.skillId, stufe: parsed.stufe, due: p.due });
  }
  items.sort((a, b) => (a.due < b.due ? -1 : a.due > b.due ? 1 : skillKey(a.skillId, a.stufe) < skillKey(b.skillId, b.stufe) ? -1 : 1));
  return items.slice(0, Math.max(0, limit));
}

/**
 * Einmaleins facts due on `day` (keys like '3x7'), most overdue first.
 * A fact missed today is due tomorrow at the earliest (see updateFact), never again the same day.
 */
export function dueFacts(state: ProgressState, day: Day): string[] {
  return Object.entries(state.facts)
    .filter(([, f]) => f.due !== undefined && f.due <= day)
    .sort(([ka, a], [kb, b]) => (a.due! < b.due! ? -1 : a.due! > b.due! ? 1 : a.box - b.box || compareFactKeys(ka, kb)))
    .map(([k]) => k);
}

/** Fact keys in box ≥ 4 (well automatised): the only facts used in the optional Blitzrunde. */
export function blitzFacts(state: ProgressState): string[] {
  return Object.entries(state.facts)
    .filter(([, f]) => f.box >= 4)
    .map(([k]) => k)
    .sort(compareFactKeys);
}

function clampGoal(goal: number): number {
  return Number.isInteger(goal) ? Math.min(5, Math.max(1, goal)) : 3;
}

/** Übungstage in the current week (Mon–Sun) vs weekly goal. */
export function weekProgress(state: ProgressState, day: Day): { days: number; goal: number; reached: boolean } {
  const from = weekStart(day);
  const to = addDays(from, 6);
  const days = new Set(state.days.filter((d) => d >= from && d <= to)).size;
  const goal = clampGoal(state.settings.weeklyGoal);
  return { days, goal, reached: days >= goal };
}

/** Skills shown for a topic: optional NRW extras only when the setting is on. */
export function visibleSkills(state: Pick<ProgressState, 'settings'>, skills: readonly SkillDef[]): SkillDef[] {
  return skills.filter((s) => !s.optional || state.settings.nrwExtras);
}

/**
 * Stars per topic for overview cards. Pass all of the topic's SkillDefs: this selector filters itself
 * (optional NRW skills count only when settings.nrwExtras is on). Passing an already filtered list is harmless.
 */
export function topicStars(state: ProgressState, skills: SkillDef[]): { stars: number; max: number; sicher: number; total: number } {
  const shown = visibleSkills(state, skills);
  let stars = 0;
  let sicher = 0;
  for (const skill of shown) {
    for (const s of [1, 2, 3] as Stufe[]) {
      stars += starsOf(state, skill.id, s);
      if (isAtLeastSicher(masteryOf(state, skill.id, s))) sicher += 1;
    }
  }
  return { stars, max: shown.length * 9, sicher, total: shown.length * 3 };
}

/** Topics with at least one practised skill (in the order of TOPICS). */
export function practisedTopics(state: ProgressState): TopicId[] {
  const found = new Set<TopicId>();
  for (const [key, p] of Object.entries(state.skills)) {
    if (p.attempts <= 0 || hidden(state, p)) continue;
    const parsed = parseSkillKey(key);
    if (parsed) found.add(parsed.topicId);
  }
  return TOPIC_IDS.filter((t) => found.has(t));
}
