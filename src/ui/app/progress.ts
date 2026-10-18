/** Small read-only helpers over the progress state used by several pages. */
import { createRng } from '../../core/rng';
import type { SkillDef, Stufe } from '../../core/types';
import { isAtLeastSicher, isOptionalEntry, parseSkillKey } from '../../state/mastery';
import { buildRound } from '../../state/round';
import { masteryOf, suggestedStufe } from '../../state/selectors';
import type { Day, ProgressState, StufeProgress } from '../../state/types';

/**
 * Number of tasks in today's "Heute wiederholen" round, computed by the same planner the round uses
 * (review planning is deterministic, the rng is not used). `skills` are the SkillDefs loaded so far;
 * due items of topics that are not loaded yet are counted as available, exactly like the planner does.
 */
export function reviewRoundSize(state: ProgressState, day: Day, skills: SkillDef[]): number {
  try {
    return buildRound({ mode: 'review' }, state, day, createRng(0), skills).length;
  } catch {
    return 0;
  }
}

// ─── "Weiter üben" ──────────────────────────────────────────────────────────

/** A practised entry that is shown (NRW extras only while the NRW setting is on). */
function shownEntry(state: ProgressState, skillId: string, stufe: Stufe): StufeProgress | null {
  const p = state.skills[`${skillId}#${stufe}`];
  if (!p || !(p.attempts > 0)) return null;
  if (isOptionalEntry(p) && !state.settings.nrwExtras) return null;
  return p;
}

/**
 * The skill to offer under "Weiter üben": the one last practised in a practice round
 * (ProgressState.lastPlayed, kept across reloads when progress is saved). Older saved progress has no
 * `lastPlayed`; then the most recently practised skill by day is used (on a tie the entry added to the
 * state last wins). NRW extras count only while they are shown.
 */
export function lastPractisedSkillId(state: ProgressState): string | null {
  const lp = state.lastPlayed;
  if (lp && shownEntry(state, lp.skillId, lp.stufe)) return lp.skillId;
  let best: { skillId: string; last: Day } | null = null;
  for (const key of Object.keys(state.skills)) {
    const parsed = parseSkillKey(key);
    const p = parsed ? shownEntry(state, parsed.skillId, parsed.stufe) : null;
    if (parsed && p?.last && (!best || p.last >= best.last)) best = { skillId: parsed.skillId, last: p.last };
  }
  return best?.skillId ?? null;
}

/**
 * Stufe for "Weiter üben" of `skillId`: the Stufe played last while it is not yet 'Sicher', otherwise the
 * suggested Stufe (the next one that is not 'Sicher' yet).
 */
export function continueStufe(state: ProgressState, skillId: string): Stufe {
  const lp = state.lastPlayed;
  if (lp && lp.skillId === skillId && !isAtLeastSicher(masteryOf(state, skillId, lp.stufe))) return lp.stufe;
  return suggestedStufe(state, skillId);
}
