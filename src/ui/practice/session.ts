/**
 * Pure state machine of a practice round (docs/research.md §6.1, decisions "Feedback loop on wrong answers",
 * "Hints", "Session and round structure").
 *
 * Per item:  answering ──correct──▶ solved
 *               │ wrong (1st)
 *               ▼
 *             retry ──correct──▶ solved
 *               │ wrong (2nd)
 *               ▼
 *            revealed (worked solution; a Zwillingsaufgabe is inserted 2–3 slots later)
 *
 * - Invalid input (cannot be parsed) never counts as an attempt.
 * - Any use of 'Tipp' or of the 'So geht's' example during the item means it is not first-try correct (§6.3).
 *
 * Worked examples (§6.1 step 3, L6, L7):
 * - Einstiegs-Check: the first ENTRY_CHECK_ITEMS items of a skill+Stufe the child has never practised are
 *   plain items. As soon as one of them is not first-try correct, the 'So geht's' example comes before the
 *   next item of that skill+Stufe. All of them first-try correct → no example at all (expertise reversal).
 *   Only in single-skill rounds (`entryCheck`); mixed and review rounds never force an intro example.
 * - After 2 items of the same skill+Stufe in a row needed the worked solution, the example is shown again
 *   before the next item of that skill+Stufe (never before an unrelated item).
 * - Every finished item is appended exactly once to `finished` (the caller sends each entry to
 *   store.recordAnswer and never again).
 *
 * The reducer has no side effects and no clock: times come in through the actions.
 */
import type { CheckResult, Stufe, TopicId } from '../../core/types';
import type { RoundPurpose, RoundSlot } from '../../state/types';

export type ItemPhase = 'answering' | 'retry' | 'solved' | 'revealed';

export interface SessionSlot extends RoundSlot {
  uid: string;
}

/** Facts about the current exercise that the reducer needs (the exercise itself lives in the UI). */
export interface ItemMeta {
  topicId: TopicId;
  hintCount: number;
  factKey?: string;
  /** NRW extra: does not count toward badges. */
  optional?: boolean;
  /** Error-library tags this exercise offers (misconception families, src/topics/errorFamilies.ts tagsFor). */
  bugTags?: string[];
}

export interface ItemState {
  uid: string;
  meta: ItemMeta;
  phase: ItemPhase;
  /** Counted (valid) wrong attempts. */
  wrongAttempts: number;
  /** Number of hints currently visible (hints[0 … hintsShown-1]). */
  hintsShown: number;
  /** The child pressed 'Tipp'. */
  usedHint: boolean;
  /** After the 1st wrong attempt without a bug hint, the next hint is shown in the feedback (index into hints). */
  autoHint: number | null;
  /** Last valid check result (marks fields). */
  result: CheckResult | null;
  /** Message for input that could not be read (not an attempt). */
  invalid: string | null;
  shownAt: number | null;
  firstCheckAt: number | null;
  /** A Zwillingsaufgabe was inserted because of this item. */
  twinInserted: boolean;
  /** Ids of the known mistakes (matched Bugs) in this item, in order, at most 2. */
  bugIds?: string[];
}

export interface FinishedItem {
  uid: string;
  skillId: string;
  topicId: TopicId;
  stufe: Stufe;
  purpose: RoundPurpose;
  firstTry: boolean;
  solved: boolean;
  usedHint: boolean;
  /** Solved on the 2nd attempt ("drangeblieben"). */
  secondTry: boolean;
  factKey?: string;
  latencyMs?: number;
  optional?: boolean;
  /** Error-library tags the exercise offered (ItemMeta.bugTags). */
  bugTags?: string[];
  /** Raw ids of the known mistakes (matched Bugs) in this item (1st and 2nd attempt); Round maps them to families. */
  bugIds?: string[];
}

export type ExampleReason = 'intro' | 'again';

/** Number of plain items in the Einstiegs-Check of a new skill+Stufe. */
export const ENTRY_CHECK_ITEMS = 3;

/** Progress of the Einstiegs-Check of one skill+Stufe. */
export interface EntryCheck {
  /** Items of the check finished so far. */
  done: number;
  /** One of them was not first-try correct → the intro example comes before the next item. */
  failed: boolean;
}

export interface ExampleTarget {
  skillId: string;
  stufe: Stufe;
}

export interface SessionState {
  slots: SessionSlot[];
  index: number;
  item: ItemState;
  /** Append-only log of finished items, in order. */
  finished: FinishedItem[];
  twinsAdded: number;
  maxTwins: number;
  /** Consecutive first-try items. */
  streak: number;
  /** Set on the item that completed a run of 5, 10, … first-try items. */
  streakNote: number | null;
  /** Per `${skillId}#${stufe}`: consecutive items of that skill+Stufe that needed the worked solution. */
  solutionRuns: Record<string, number>;
  /** Skill+Stufen whose worked example is shown again before their next item (2 in a row needed the solution). */
  exampleDue: ExampleTarget[];
  /** Worked example shown before the current item ('So geht's' first). */
  example: (ExampleTarget & { reason: ExampleReason }) | null;
  /** `${skillId}#${stufe}` keys whose intro is settled in this session (example seen or Einstiegs-Check passed). */
  introduced: string[];
  /** Running Einstiegs-Checks by `${skillId}#${stufe}`. */
  entry: Record<string, EntryCheck>;
  /** Run the Einstiegs-Check for new skill+Stufen (single-skill rounds only). */
  entryCheck: boolean;
  /** The normalising sentence ('Fehler helfen beim Lernen.') was used (max once per session). */
  normalisedUsed: boolean;
  /** Show the normalising sentence on the current item. */
  showNormalising: boolean;
  done: boolean;
  nextUid: number;
}

export type SessionAction =
  | { type: 'hint' }
  | { type: 'change' }
  | { type: 'check'; result: CheckResult; now: number; twinOffset?: number }
  | { type: 'closeExample'; now: number }
  /** The child opened the 'So geht's' example from the header during the item (counts as help). */
  | { type: 'example' }
  /** Move to slot `to` (default index + 1; larger values skip slots that could not be generated). */
  | { type: 'next'; now: number; meta?: ItemMeta; isNew?: boolean; to?: number };

export const STREAK_STEP = 5;

export const introKey = (skillId: string, stufe: Stufe) => `${skillId}#${stufe}`;

function without<T>(record: Record<string, T>, key: string): Record<string, T> {
  if (!(key in record)) return record;
  const copy = { ...record };
  delete copy[key];
  return copy;
}

export function isFinished(phase: ItemPhase): boolean {
  return phase === 'solved' || phase === 'revealed';
}

function freshItem(uid: string, meta: ItemMeta, shownAt: number | null): ItemState {
  return {
    uid,
    meta,
    phase: 'answering',
    wrongAttempts: 0,
    hintsShown: 0,
    usedHint: false,
    autoHint: null,
    result: null,
    invalid: null,
    shownAt,
    firstCheckAt: null,
    twinInserted: false,
  };
}

export interface CreateSessionOptions {
  slots: RoundSlot[];
  /** Meta of the first exercise (omit if the round is empty). */
  meta?: ItemMeta;
  now: number;
  /** The first slot's skill+Stufe has never been practised (mastery 'neu'). */
  isNew?: boolean;
  maxTwins: number;
  /** Carry over from a previous round of the same session. */
  normalisedUsed?: boolean;
  introduced?: string[];
  entry?: Record<string, EntryCheck>;
  /** Run the Einstiegs-Check for new skill+Stufen (default true; false for mixed and review rounds). */
  entryCheck?: boolean;
  /** Index of the first slot that could be generated (default 0). */
  start?: number;
}

export function createSession(opts: CreateSessionOptions): SessionState {
  const slots: SessionSlot[] = opts.slots.map((s, i) => ({ ...s, uid: `s${i}` }));
  const start = opts.start ?? 0;
  const base: SessionState = {
    slots,
    index: start,
    item: freshItem(slots[start]?.uid ?? 'none', opts.meta ?? { topicId: 'zahlen', hintCount: 0 }, opts.now),
    finished: [],
    twinsAdded: 0,
    maxTwins: opts.maxTwins,
    streak: 0,
    streakNote: null,
    solutionRuns: {},
    exampleDue: [],
    example: null,
    introduced: opts.introduced ? [...opts.introduced] : [],
    entry: opts.entry ? { ...opts.entry } : {},
    entryCheck: opts.entryCheck ?? true,
    normalisedUsed: opts.normalisedUsed ?? false,
    showNormalising: false,
    done: start >= slots.length || !opts.meta,
    nextUid: slots.length,
  };
  return base.done ? base : enterExample(base, opts.isNew ?? false, opts.now);
}

/** Decide whether the worked example comes before the current item. */
function enterExample(state: SessionState, isNew: boolean, now: number): SessionState {
  const slot = state.slots[state.index];
  const key = introKey(slot.skillId, slot.stufe);
  const target: ExampleTarget = { skillId: slot.skillId, stufe: slot.stufe };
  const showExample = (reason: ExampleReason): SessionState => ({
    ...state,
    exampleDue: state.exampleDue.filter((d) => introKey(d.skillId, d.stufe) !== key),
    entry: without(state.entry, key),
    introduced: state.introduced.includes(key) ? state.introduced : [...state.introduced, key],
    example: { ...target, reason },
    item: { ...state.item, shownAt: null },
  });
  if (state.exampleDue.some((d) => introKey(d.skillId, d.stufe) === key)) return showExample('again');
  if (state.entry[key]?.failed) return showExample('intro');
  let entry = state.entry;
  if (state.entryCheck && isNew && !state.introduced.includes(key) && !entry[key]) {
    entry = { ...entry, [key]: { done: 0, failed: false } };
  }
  return { ...state, entry, example: null, item: { ...state.item, shownAt: state.item.shownAt ?? now } };
}

function finish(state: SessionState, item: ItemState, solved: boolean, twinOffset: number): SessionState {
  const slot = state.slots[state.index];
  const firstTry = solved && item.wrongAttempts === 0 && !item.usedHint;
  const latency = item.shownAt !== null && item.firstCheckAt !== null ? Math.max(0, item.firstCheckAt - item.shownAt) : undefined;
  const record: FinishedItem = {
    uid: slot.uid,
    skillId: slot.skillId,
    topicId: item.meta.topicId,
    stufe: slot.stufe,
    purpose: slot.purpose,
    firstTry,
    solved,
    usedHint: item.usedHint,
    secondTry: solved && item.wrongAttempts === 1,
  };
  if (item.meta.factKey) record.factKey = item.meta.factKey;
  if (latency !== undefined) record.latencyMs = latency;
  if (item.meta.optional) record.optional = true;
  if (item.meta.bugTags && item.meta.bugTags.length > 0) record.bugTags = [...item.meta.bugTags];
  if (item.bugIds && item.bugIds.length > 0) record.bugIds = [...item.bugIds];

  const streak = firstTry ? state.streak + 1 : 0;
  const streakNote = firstTry && streak % STREAK_STEP === 0 ? streak : null;

  // Runs and the Einstiegs-Check are counted per skill+Stufe (mixed rounds interleave skills).
  const key = introKey(slot.skillId, slot.stufe);
  let solutionRuns: Record<string, number> = { ...state.solutionRuns, [key]: solved ? 0 : (state.solutionRuns[key] ?? 0) + 1 };
  let exampleDue = state.exampleDue;
  if (solutionRuns[key] >= 2) {
    if (!exampleDue.some((d) => introKey(d.skillId, d.stufe) === key)) exampleDue = [...exampleDue, { skillId: slot.skillId, stufe: slot.stufe }];
    solutionRuns = { ...solutionRuns, [key]: 0 };
  }

  let entry = state.entry;
  let introduced = state.introduced;
  const check = entry[key];
  if (check) {
    const done = check.done + 1;
    const failed = check.failed || !firstTry;
    if (!failed && done >= ENTRY_CHECK_ITEMS) {
      // Einstiegs-Check passed: no worked example for this skill+Stufe.
      entry = without(entry, key);
      introduced = [...introduced, key];
    } else {
      entry = { ...entry, [key]: { done, failed } };
    }
  }

  let slots = state.slots;
  let twinsAdded = state.twinsAdded;
  let nextUid = state.nextUid;
  let twinInserted = false;
  if (!solved && slot.purpose !== 'twin' && twinsAdded < state.maxTwins) {
    const offset = Math.max(1, Math.round(twinOffset));
    const at = Math.min(state.index + offset, slots.length);
    const twin: SessionSlot = { skillId: slot.skillId, stufe: slot.stufe, purpose: 'twin', uid: `t${nextUid}` };
    slots = [...slots.slice(0, at), twin, ...slots.slice(at)];
    twinsAdded += 1;
    nextUid += 1;
    twinInserted = true;
  }

  const showNormalising = !solved && !state.normalisedUsed;

  return {
    ...state,
    slots,
    twinsAdded,
    nextUid,
    item: { ...item, phase: solved ? 'solved' : 'revealed', twinInserted },
    finished: [...state.finished, record],
    streak,
    streakNote,
    solutionRuns,
    exampleDue,
    entry,
    introduced,
    showNormalising,
    normalisedUsed: state.normalisedUsed || showNormalising,
  };
}

export function sessionReducer(state: SessionState, action: SessionAction): SessionState {
  if (state.done) return state;
  const item = state.item;
  switch (action.type) {
    case 'hint': {
      if (isFinished(item.phase) || state.example) return state;
      if (item.hintsShown >= item.meta.hintCount) return state;
      return { ...state, item: { ...item, hintsShown: item.hintsShown + 1, usedHint: true } };
    }
    case 'change': {
      if (item.invalid === null) return state;
      return { ...state, item: { ...item, invalid: null } };
    }
    case 'example': {
      if (isFinished(item.phase) || state.example) return state;
      // The child has seen the worked example: it no longer counts as first-try, and a running
      // Einstiegs-Check of this skill+Stufe is settled (no second, forced example).
      const slot = state.slots[state.index];
      const key = introKey(slot.skillId, slot.stufe);
      const entry = without(state.entry, key);
      const introduced = state.introduced.includes(key) ? state.introduced : [...state.introduced, key];
      if (item.usedHint && entry === state.entry && introduced === state.introduced) return state;
      return { ...state, entry, introduced, item: { ...item, usedHint: true } };
    }
    case 'closeExample': {
      if (!state.example) return state;
      return { ...state, example: null, item: { ...item, shownAt: item.shownAt ?? action.now } };
    }
    case 'check': {
      if (isFinished(item.phase) || state.example) return state;
      const { result, now } = action;
      if (result.invalid) {
        return { ...state, item: { ...item, invalid: result.invalid } };
      }
      const checked: ItemState = {
        ...item,
        invalid: null,
        result,
        firstCheckAt: item.firstCheckAt ?? now,
      };
      if (!result.correct && result.bugId && !(item.bugIds ?? []).includes(result.bugId)) checked.bugIds = [...(item.bugIds ?? []), result.bugId];
      if (result.correct) return finish(state, checked, true, action.twinOffset ?? 2);
      const wrongAttempts = item.wrongAttempts + 1;
      if (wrongAttempts >= 2) {
        return finish(state, { ...checked, wrongAttempts }, false, action.twinOffset ?? 2);
      }
      // 1st wrong attempt: targeted bug hint if available, otherwise the next strategy hint.
      let { hintsShown } = item;
      let autoHint: number | null = null;
      if (!result.bugHint && hintsShown < item.meta.hintCount) {
        autoHint = hintsShown;
        hintsShown += 1;
      }
      return { ...state, item: { ...checked, wrongAttempts, phase: 'retry', hintsShown, autoHint } };
    }
    case 'next': {
      if (!isFinished(item.phase)) return state;
      const to = Math.max(state.index + 1, action.to ?? state.index + 1);
      if (to >= state.slots.length || !action.meta) {
        return { ...state, index: Math.min(to, state.slots.length), done: true, example: null, streakNote: null, showNormalising: false };
      }
      const next: SessionState = {
        ...state,
        index: to,
        item: freshItem(state.slots[to].uid, action.meta, action.now),
        streakNote: null,
        showNormalising: false,
        example: null,
      };
      return enterExample(next, action.isNew ?? false, action.now);
    }
  }
}

/** Counts for the round summary. */
export function summarize(finished: readonly FinishedItem[]): { answered: number; solved: number; firstTry: number; toRepeat: number } {
  const solved = finished.filter((f) => f.solved).length;
  return {
    answered: finished.length,
    solved,
    firstTry: finished.filter((f) => f.firstTry).length,
    toRepeat: finished.length - solved,
  };
}
