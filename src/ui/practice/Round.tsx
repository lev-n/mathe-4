/**
 * One practice round (docs/research.md §6.1): slots from buildRound(), exercises generated lazily,
 * the attempt state machine from session.ts, recording to the store, break suggestion, summary.
 */
import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import { checkAnswer, isEmptyResponse } from '../../core/check';
import { generateUnique } from '../../core/generate';
import { createRng, randomSeed } from '../../core/rng';
import type { CheckResult, Exercise, GenContext, Response, SkillDef, Stufe } from '../../core/types';
import { today } from '../../state/dates';
import { SMALL_ACKS_PER_ROUND, roundNotes } from '../../state/growth';
import { MAX_TWINS, buildRound } from '../../state/round';
import { masteryOf } from '../../state/selectors';
import { store } from '../../state/store';
import type { AnswerOutcome, BadgeDef, GrowthEvent, PracticePlan, RoundSlot } from '../../state/types';
import { answerFields, firstEmptyRequiredField, firstWrongField, focusField, initialField, showRegion } from '../answers/fieldNav';
import { coarsePointer, useKeypadEnabled } from '../keypad/Keypad';
import { useSettings } from '../../state/useProgress';
import { tagsFor } from '../../topics/errorFamilies';
import { getTopicMeta } from '../../topics/registry';
import BreakPrompt, { BREAK_AFTER_MS } from './BreakPrompt';
import ConsentPrompt from './ConsentPrompt';
import ItemView from './ItemView';
import PracticeHeader from './PracticeHeader';
import RoundSummary, { ImprovedNotes, NewBadges, type MasteryLine, type SummaryNote } from './RoundSummary';
import { afterPracticeAnnouncement, isBigNote, noteText, spokenText, summaryAnnouncement } from './growthText';
import WorkedExample from './WorkedExample';
import {
  EFFORT_PHRASES,
  EMPTY_REVIEW,
  EXAMPLE_AGAIN_INTRO,
  EXAMPLE_INTRO,
  GOODBYE,
  NORMALISING_PHRASES,
  TWIN_SOLVED_PHRASES,
  UNCHANGED_ANSWER,
  announceCorrect,
  announceRetry,
  announceSolution,
  rotate,
  stufeLabel,
} from './phrases';
import {
  createSession,
  isFinished,
  sessionReducer,
  summarize,
  type FinishedItem,
  type ItemMeta,
  type SessionAction,
  type SessionState,
} from './session';
import { useHoldover } from './useHoldover';
import { touchVisit, type PracticeVisit } from './visit';

/** State shared by all rounds of one practice visit (survives navigation, see visit.ts). */
export type SharedSession = PracticeVisit;

export type RoundPlan = Exclude<PracticePlan, { mode: 'blitz' }>;

export interface RoundProps {
  plan: RoundPlan;
  skills: SkillDef[];
  shared: SharedSession;
  onExit: () => void;
  onNavigate: (plan: PracticePlan) => void;
  onAgain: () => void;
  /** Move focus to the first item (e.g. after 'Noch eine Runde'; only after a user action). */
  autoFocus?: boolean;
  /** The loading screen's heading had focus (route focus): keep it on this page's heading. */
  focusHeading?: boolean;
}

type View = 'item' | 'break' | 'summary' | 'goodbye';

interface SummaryData {
  solved: number;
  answered: number;
  mastery: MasteryLine[];
  notes: SummaryNote[];
  badges: BadgeDef[];
  nextStufe: Stufe | null;
}

/** 'item' = a new task (first field to fill); 'retry' = after a wrong answer; 'invalid' = unreadable input. */
type FocusTarget = 'next' | 'item' | 'retry' | 'invalid' | 'example' | 'summary' | 'goodbye' | 'heading' | 'exampleToggle' | null;

function metaOf(ex: Exercise, skill: SkillDef): ItemMeta {
  const meta: ItemMeta = { topicId: ex.topicId ?? skill.topicId, hintCount: ex.hints.length };
  if (ex.factKey) meta.factKey = ex.factKey;
  if (skill.optional === 'nrw') meta.optional = true;
  // The typical errors this task offers, as misconception families of the skill (src/topics/errorFamilies.ts):
  // the improvement tracking counts them (src/state/growth.ts).
  const bugTags = tagsFor(skill.id, (ex.bugs ?? []).map((b) => b.id));
  if (bugTags.length > 0) meta.bugTags = bugTags;
  return meta;
}

function genContext(): GenContext {
  const st = store.get();
  return {
    subtractionMethod: st.settings.subtractionMethod,
    nrwExtras: st.settings.nrwExtras,
    facts: st.facts,
    today: today(),
  };
}

const masteryKey = (skillId: string, stufe: Stufe) => `${skillId}#${stufe}`;

/** Below this width the Ziffernblock sits under the task (see practice.css). */
const KEYPAD_BELOW = '(max-width: 899px)';

/**
 * On phones with the Ziffernblock below the task: scroll so that the task, the answer field and the whole
 * keypad are on screen together. Returns false (and does nothing) when there is no such layout or it does
 * not fit on the screen.
 */
function showItemWithKeypad(section: HTMLElement): boolean {
  const layout = section.closest<HTMLElement>('.pr-item-layout.has-keypad');
  let narrow = false;
  try {
    narrow = !!layout && typeof window.matchMedia === 'function' && window.matchMedia(KEYPAD_BELOW).matches;
  } catch {
    narrow = false;
  }
  if (!layout || !narrow) return false;
  const box = layout.getBoundingClientRect();
  const view = window.innerHeight;
  if (!(box.height > 0 && box.height <= view)) return false;
  if (box.top < 0 || box.bottom > view) window.scrollBy(0, box.bottom - view);
  return true;
}

/**
 * Focus a new item's region (fallback when it has no answer field). On phones with the Ziffernblock below the
 * task, the task, the answer field and the whole keypad end up on screen together when they fit.
 */
function focusItem(section: HTMLElement): void {
  section.focus({ preventScroll: true });
  if (!showItemWithKeypad(section)) section.focus({ preventScroll: false });
}

/**
 * Focus inside the answer (src/ui/answers/fieldNav.ts): a new task → the first field to fill; after a wrong
 * answer → the first wrong field, content selected for retyping; after unreadable input → the first empty
 * required field (if none, focus stays). Returns false when there is no such field.
 */
function focusAnswer(section: HTMLElement, target: 'item' | 'retry' | 'invalid'): boolean {
  const fields = answerFields(section);
  const field =
    target === 'retry' ? (firstWrongField(fields) ?? initialField(fields)) : target === 'invalid' ? firstEmptyRequiredField(fields) : initialField(fields);
  if (!field) return false;
  focusField(field, { select: target === 'retry', mode: target === 'item' ? 'new' : 'retry' });
  return true;
}

/**
 * The first task of a visit may take focus by itself (no tap before it) only where that cannot open the
 * device's own keyboard: with the Ziffernblock (inputMode 'none') or without a touch screen.
 */
function entryFocusAllowed(keypadOn: boolean): boolean {
  return keypadOn || !coarsePointer();
}

export default function Round({ plan, skills, shared, onExit, onNavigate, onAgain, autoFocus = false, focusHeading = false }: RoundProps) {
  const settings = useSettings();
  const keypadOn = useKeypadEnabled(settings.keypad);
  const skillMap = useMemo(() => new Map(skills.map((s) => [s.id, s])), [skills]);

  const generateFor = (skill: SkillDef, stufe: Stufe, avoid?: string): Exercise | null => {
    try {
      const recent = new Set(shared.recentKeys);
      if (avoid) recent.add(avoid);
      const ex = generateUnique(skill, stufe, randomSeed(), genContext(), recent);
      shared.recentKeys.add(ex.key);
      return ex;
    } catch (err) {
      console.error('Aufgabe konnte nicht erzeugt werden', skill.id, err);
      return null;
    }
  };

  /** Worked example for the session's pending example (intro / again). */
  const exampleFor = (s: SessionState, avoid?: string): Exercise | null => {
    if (!s.example) return null;
    const skill = skillMap.get(s.example.skillId);
    return skill ? generateFor(skill, s.example.stufe, avoid) : null;
  };

  const [boot] = useState(() => {
    const st = store.get();
    let slots: RoundSlot[] = [];
    try {
      slots = buildRound(plan, st, today(), createRng(randomSeed()), skills);
    } catch (err) {
      console.error('Runde konnte nicht gebaut werden', err);
    }
    let start = 0;
    let first: Exercise | null = null;
    let firstSkill: SkillDef | undefined;
    for (; start < slots.length; start++) {
      firstSkill = skillMap.get(slots[start].skillId);
      if (!firstSkill) continue;
      first = generateFor(firstSkill, slots[start].stufe);
      if (first) break;
    }
    let session = createSession({
      slots,
      meta: first && firstSkill ? metaOf(first, firstSkill) : undefined,
      now: Date.now(),
      isNew: first ? masteryOf(st, slots[start].skillId, slots[start].stufe) === 'neu' : false,
      maxTwins: MAX_TWINS,
      normalisedUsed: shared.normalisedUsed,
      introduced: shared.introduced,
      entry: shared.entry,
      // Mixed and review rounds never force an intro example (the header 'So geht's' stays available).
      entryCheck: plan.mode === 'skill',
      start,
    });
    const exercises: Record<string, Exercise> = {};
    if (first) exercises[session.slots[start].uid] = first;
    let example: Exercise | null = null;
    if (session.example) {
      example = exampleFor(session, first?.key);
      if (!example) session = sessionReducer(session, { type: 'closeExample', now: Date.now() });
    }
    // Note: no writes to `shared` here (StrictMode runs initializers twice); dispatch() syncs it.
    return { session, exercises, example, empty: slots.length === 0, failed: slots.length > 0 && !first };
  });

  const [session, setSession] = useState<SessionState>(boot.session);
  const sessionRef = useRef<SessionState>(boot.session);
  const [exercises, setExercises] = useState<Record<string, Exercise>>(boot.exercises);
  const [example, setExample] = useState<Exercise | null>(boot.example);
  const [manual, setManual] = useState<Exercise | null>(null);
  const [response, setResponse] = useState<Response | null>(null);
  const responseRef = useRef<Response | null>(null);
  const [checkedSig, setCheckedSig] = useState<string | null>(null);
  const [praise, setPraise] = useState<string[]>([]);
  const [normalising, setNormalising] = useState<string | null>(null);
  const [view, setView] = useState<View>('item');
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [live, setLive] = useState('');
  const outcomes = useRef<{ f: FinishedItem; outcome: AnswerOutcome | null }[]>([]);
  const roundRecorded = useRef(false);
  /** Effort lines after a 2nd try given in this round (capped; twin lines are limited by MAX_TWINS already). */
  const smallAcks = useRef(0);
  /** Improvements and badges for the goodbye screen when the round ends at the break suggestion (no summary). */
  const [farewell, setFarewell] = useState<{ notes: SummaryNote[]; badges: BadgeDef[] } | null>(null);
  const entryFocus = !autoFocus && !boot.session.example && entryFocusAllowed(keypadOn);
  const pendingFocus = useRef<FocusTarget>(
    autoFocus ? (boot.session.example ? 'example' : 'item') : entryFocus ? 'item' : focusHeading ? 'heading' : null,
  );
  const sectionRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const exampleToggleRef = useRef<HTMLButtonElement>(null);
  const exampleRef = useRef<HTMLElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const summaryRef = useRef<HTMLHeadingElement>(null);
  const goodbyeRef = useRef<HTMLHeadingElement>(null);

  const slot = session.slots[session.index];
  const exercise = slot ? exercises[slot.uid] : undefined;
  const skill = slot ? skillMap.get(slot.skillId) : undefined;

  const guard = useHoldover(`${view}:${session.index}:${session.item.phase}:${session.example ? 'ex' : ''}:${manual ? 'm' : ''}`);

  // Focus moves only after user actions: handlers set pendingFocus, this effect applies it after render.
  useEffect(() => {
    const target = pendingFocus.current;
    if (!target) return;
    const refs: Record<Exclude<FocusTarget, null>, { current: HTMLElement | null }> = {
      next: nextRef,
      item: sectionRef,
      retry: sectionRef,
      invalid: sectionRef,
      example: exampleRef,
      summary: summaryRef,
      goodbye: goodbyeRef,
      heading: headingRef,
      exampleToggle: exampleToggleRef,
    };
    const el = refs[target].current;
    if (el) {
      if (target === 'item') {
        if (!focusAnswer(el, 'item')) focusItem(el);
      } else if (target === 'retry' || target === 'invalid') focusAnswer(el, target);
      else if (target === 'next') {
        // Weiter gets focus, but the page shows the feedback from its top (a worked solution is read from
        // its beginning, not opened scrolled to its end next to Weiter).
        el.focus({ preventScroll: true });
        const panel = sectionRef.current?.querySelector('.pr-feedback');
        if (panel) showRegion(panel, el);
        else el.scrollIntoView?.({ block: 'nearest' });
      } else if (target === 'example') {
        el.focus({ preventScroll: true });
        showRegion(el);
      } else el.focus({ preventScroll: false });
      pendingFocus.current = null;
    }
  });

  // After 'Tipp': scroll the new hint into view (focus stays where it is).
  const pendingHintScroll = useRef(false);
  useEffect(() => {
    if (!pendingHintScroll.current) return;
    pendingHintScroll.current = false;
    const hints = sectionRef.current?.querySelectorAll('.pr-hint, .pr-feedback--retry');
    const last = hints?.[hints.length - 1];
    if (last) showRegion(last);
  });

  // The first item after entering the page: on phones, also show the task, the answer field and the
  // Ziffernblock together (like every later item). The focus stays where the navigation put it (heading).
  const firstItemShown = useRef(autoFocus || entryFocus);
  useEffect(() => {
    if (firstItemShown.current || view !== 'item' || session.example) return;
    const el = sectionRef.current;
    if (!el) return;
    firstItemShown.current = true;
    // after the route's own scroll to the top (no cleanup: a re-render must not cancel it)
    window.setTimeout(() => {
      if (el.isConnected) showItemWithKeypad(el);
    }, 50);
  });

  const announce = (text: string) => setLive((prev) => (prev === text ? `${text} ` : text));

  const record = (f: FinishedItem) => {
    let outcome: AnswerOutcome | null = null;
    try {
      // the matched Bugs as the same family tags as ItemMeta.bugTags
      const bugIds = tagsFor(f.skillId, f.bugIds);
      outcome = store.recordAnswer({
        skillId: f.skillId,
        topicId: f.topicId,
        stufe: f.stufe,
        firstTry: f.firstTry,
        solved: f.solved,
        usedHint: f.usedHint,
        purpose: f.purpose,
        factKey: f.factKey,
        latencyMs: f.latencyMs,
        day: today(),
        optional: f.optional,
        bugTags: f.bugTags,
        bugIds: bugIds.length > 0 ? bugIds : undefined,
        wrongAttempt: !f.solved || f.secondTry,
      });
    } catch (err) {
      console.error('Antwort konnte nicht gespeichert werden', err);
    }
    outcomes.current.push({ f, outcome });
  };

  /** Apply an action; every newly finished item is recorded exactly once, right here. */
  const dispatch = (action: SessionAction): SessionState => {
    const prev = sessionRef.current;
    const next = sessionReducer(prev, action);
    if (next === prev) return prev;
    sessionRef.current = next;
    shared.normalisedUsed = next.normalisedUsed;
    shared.introduced = next.introduced;
    shared.entry = next.entry;
    setSession(next);
    for (const f of next.finished.slice(prev.finished.length)) record(f);
    return next;
  };

  const onChange = (r: Response) => {
    responseRef.current = r;
    setResponse(r);
    dispatch({ type: 'change' });
  };

  const handleCheck = () => {
    const s = sessionRef.current;
    const resp = responseRef.current;
    if (!exercise || isFinished(s.item.phase) || s.example || isEmptyResponse(resp) || !resp) return;
    const now = Date.now();
    touchVisit(shared, now);
    // The same answer again (e.g. Enter pressed twice) is not a 2nd attempt: it would skip the retry step.
    if (s.item.phase === 'retry' && checkedSig === JSON.stringify(resp)) {
      dispatch({ type: 'check', result: { correct: false, invalid: UNCHANGED_ANSWER }, now });
      announce(UNCHANGED_ANSWER);
      pendingFocus.current = 'retry';
      return;
    }
    let result: CheckResult;
    try {
      result = checkAnswer(exercise.answer, resp, exercise.bugs);
    } catch {
      result = { correct: false, invalid: 'Diese Antwort kann ich nicht lesen. Probier es noch einmal.' };
    }
    const next = dispatch({ type: 'check', result, now, twinOffset: 2 + (randomSeed() % 2) });
    if (result.invalid) {
      announce(result.invalid);
      pendingFocus.current = 'invalid';
      return;
    }
    setCheckedSig(JSON.stringify(resp));
    const item = next.item;
    if (item.phase === 'solved') {
      const f = next.finished[next.finished.length - 1];
      const lines: string[] = [];
      // Small improvements get one calm line (docs/research.md M16): a twin task solved first try (at most
      // MAX_TWINS per round), a 2nd try a few times per round at most, so wrong answers on purpose do not pay.
      if (f?.purpose === 'twin' && f.firstTry) lines.push(rotate(TWIN_SOLVED_PHRASES, shared.praiseCounter++));
      else if (f?.secondTry && smallAcks.current < SMALL_ACKS_PER_ROUND) {
        smallAcks.current += 1;
        lines.push(rotate(EFFORT_PHRASES, shared.praiseCounter++));
      }
      lines.push(exercise.praise);
      setPraise(lines);
      announce(announceCorrect(exercise, lines.join(' ')));
      pendingFocus.current = 'next';
    } else if (item.phase === 'retry') {
      const hint = result.bugHint ?? (item.autoHint !== null ? exercise.hints[item.autoHint] : null);
      announce(announceRetry(hint));
      pendingFocus.current = 'retry';
    } else if (item.phase === 'revealed') {
      setNormalising(next.showNormalising ? rotate(NORMALISING_PHRASES, randomSeed()) : null);
      announce(announceSolution(exercise));
      pendingFocus.current = 'next';
    }
  };

  const handleHint = () => {
    if (!exercise) return;
    const prev = sessionRef.current;
    const next = dispatch({ type: 'hint' });
    if (next !== prev) {
      const i = next.item.hintsShown - 1;
      announce(`Tipp ${i + 1}: ${exercise.hints[i]}`);
      pendingHintScroll.current = true;
    }
  };

  /** "Das hast du verbessert" and new badges from the answers recorded so far (`extra`: badges for finishing). */
  const improvementsSoFar = (finished: readonly FinishedItem[], extra: readonly BadgeDef[] = []) => {
    const method = store.get().settings.subtractionMethod;
    const events: GrowthEvent[] = outcomes.current.flatMap(({ outcome }) => outcome?.growth ?? []);
    const titleOf = (id: string) => skillMap.get(id)?.title ?? id;
    const notes: SummaryNote[] = roundNotes(finished, events).map((n, i) => {
      const text = noteText(n, titleOf, method);
      const spoken = spokenText(text);
      return spoken ? { key: `${n.kind}-${i}`, text, spoken, big: isBigNote(n) } : { key: `${n.kind}-${i}`, text, big: isBigNote(n) };
    });
    const badges = new Map<string, BadgeDef>();
    for (const { outcome } of outcomes.current) outcome?.newBadges.forEach((b) => badges.set(b.id, b));
    extra.forEach((b) => badges.set(b.id, b));
    return { notes, badges: [...badges.values()] };
  };

  const finishRound = (s: SessionState) => {
    if (roundRecorded.current) return;
    roundRecorded.current = true;
    const sum = summarize(s.finished);
    let roundBadges: BadgeDef[] = [];
    try {
      roundBadges = store.recordRound({ day: today(), answered: sum.answered, firstTry: sum.firstTry });
    } catch (err) {
      console.error('Runde konnte nicht gespeichert werden', err);
    }
    const st = store.get();
    const seen = new Map<string, MasteryLine>();
    for (const { f, outcome } of outcomes.current) {
      const key = masteryKey(f.skillId, f.stufe);
      const line = seen.get(key) ?? {
        key,
        title: skillMap.get(f.skillId)?.title ?? f.skillId,
        stufe: f.stufe,
        state: masteryOf(st, f.skillId, f.stufe),
        levelUp: false,
      };
      if (outcome && outcome.after !== outcome.before && (outcome.after === 'sicher' || outcome.after === 'gemeistert')) line.levelUp = true;
      seen.set(key, line);
    }
    const suggest = outcomes.current.some(({ outcome }) => outcome?.suggestNextStufe);
    const nextStufe = plan.mode === 'skill' && plan.stufe < 3 && suggest ? ((plan.stufe + 1) as Stufe) : null;
    const { notes, badges: badgeList } = improvementsSoFar(s.finished, roundBadges);
    setSummary({ solved: sum.solved, answered: sum.answered, mastery: [...seen.values()], notes, badges: badgeList, nextStufe });
    setView('summary');
    announce(summaryAnnouncement(sum.solved, sum.answered, notes.map((n) => n.text), badgeList));
    pendingFocus.current = 'summary';
  };

  const goNext = () => {
    const s = sessionRef.current;
    if (!isFinished(s.item.phase)) return;
    let to = s.index + 1;
    let ex: Exercise | null = null;
    let nextSkill: SkillDef | undefined;
    for (; to < s.slots.length; to++) {
      nextSkill = skillMap.get(s.slots[to].skillId);
      if (!nextSkill) continue;
      ex = generateFor(nextSkill, s.slots[to].stufe);
      if (ex) break;
    }
    responseRef.current = null;
    setResponse(null);
    setCheckedSig(null);
    setPraise([]);
    setNormalising(null);
    setManual(null);
    setView('item');
    if (!ex || !nextSkill) {
      finishRound(dispatch({ type: 'next', now: Date.now(), to }));
      return;
    }
    const nextSlot = s.slots[to];
    const exReady = ex;
    setExercises((prev) => ({ ...prev, [nextSlot.uid]: exReady }));
    let next = dispatch({
      type: 'next',
      now: Date.now(),
      to,
      meta: metaOf(ex, nextSkill),
      isNew: masteryOf(store.get(), nextSlot.skillId, nextSlot.stufe) === 'neu',
    });
    if (next.example) {
      const exEx = exampleFor(next, ex.key);
      if (exEx) {
        setExample(exEx);
        pendingFocus.current = 'example';
        return;
      }
      next = dispatch({ type: 'closeExample', now: Date.now() });
    }
    pendingFocus.current = 'item';
  };

  const handleNext = () => {
    const s = sessionRef.current;
    if (!isFinished(s.item.phase)) return;
    const hasMore = s.index + 1 < s.slots.length;
    const now = Date.now();
    touchVisit(shared, now);
    if (hasMore && !shared.breakOffered && now - shared.startedAt >= BREAK_AFTER_MS) {
      shared.breakOffered = true;
      setView('break');
      return;
    }
    goNext();
  };

  const closeExample = (e: MouseEvent) => {
    if (guard(e)) return;
    dispatch({ type: 'closeExample', now: Date.now() });
    setExample(null);
    pendingFocus.current = 'item';
  };

  const toggleManual = () => {
    if (manual) {
      setManual(null);
      return;
    }
    if (!skill || !slot) return;
    const ex = generateFor(skill, slot.stufe, exercise?.key);
    if (!ex) return;
    setManual(ex);
    // Seeing a worked example of the same kind is help: the item no longer counts as first-try (§6.3).
    dispatch({ type: 'example' });
  };

  const closeManual = () => {
    setManual(null);
    pendingFocus.current = 'exampleToggle';
  };

  const goodbye = () => {
    // Leaving at the break suggestion skips the summary: show what improved so far here (after practice, so it is
    // no pop-up during the round). After the summary ("Fertig für heute") it is not repeated.
    const after = view === 'break' ? improvementsSoFar(sessionRef.current.finished) : null;
    const shown = after && (after.notes.length > 0 || after.badges.length > 0) ? after : null;
    setFarewell(shown);
    setView('goodbye');
    announce(shown ? afterPracticeAnnouncement(GOODBYE, shown.notes.length, shown.badges) : GOODBYE);
    pendingFocus.current = 'goodbye';
  };

  // ── Rendering ──────────────────────────────────────────────────────────
  // After the last item (summary, goodbye) there is no current slot: the header shows the plan instead.
  const planSkill = plan.mode === 'skill' ? skillMap.get(plan.skillId) : undefined;
  const topicId = skill?.topicId ?? (plan.mode === 'mixed' ? plan.topicId : (planSkill?.topicId ?? null));
  const kicker =
    plan.mode === 'mixed'
      ? `Gemischte Übung · ${getTopicMeta(plan.topicId).shortTitle}`
      : plan.mode === 'review'
        ? 'Heute wiederholen'
        : topicId
          ? getTopicMeta(topicId).shortTitle
          : undefined;

  const liveRegion = (
    <div className="visually-hidden" role="status" aria-live="polite" aria-atomic="true">
      {live}
    </div>
  );

  if (boot.empty || boot.failed) {
    return (
      <div className="pr-page">
        <PracticeHeader topicId={topicId} kicker={kicker} title={plan.mode === 'review' ? 'Wiederholung' : (skill?.title ?? planSkill?.title ?? 'Üben')} onExit={onExit} headingRef={headingRef} />
        {liveRegion}
        <section className="pr-message card">
          <h2>{boot.empty && plan.mode === 'review' ? EMPTY_REVIEW : 'Hier gibt es gerade keine Aufgaben.'}</h2>
          <p>{boot.empty && plan.mode === 'review' ? 'Du kannst dir ein Thema aussuchen und frei üben.' : 'Such dir ein anderes Thema aus.'}</p>
          <button type="button" className="btn btn--primary btn--lg" onClick={onExit}>
            Zurück zur Übersicht
          </button>
        </section>
      </div>
    );
  }

  const showProgress = view === 'item' || view === 'break';
  const total = session.slots.length;
  const headerTitle =
    skill?.title ??
    (plan.mode === 'skill' ? (planSkill?.title ?? 'Üben') : plan.mode === 'mixed' ? getTopicMeta(plan.topicId).title : 'Wiederholung');
  const headerStufe = slot ? slot.stufe : plan.mode === 'skill' ? plan.stufe : undefined;
  const exampleOpen = !!manual;

  return (
    <div className="pr-page">
      <PracticeHeader
        topicId={topicId}
        kicker={kicker}
        title={headerTitle}
        stufeText={headerStufe ? stufeLabel(headerStufe) : undefined}
        progress={showProgress ? { current: session.index + 1, total } : undefined}
        example={
          view === 'item' && !session.done
            ? { open: exampleOpen, controls: 'pr-manual-example', onToggle: toggleManual, disabled: !!session.example, ref: exampleToggleRef }
            : undefined
        }
        onExit={onExit}
        headingRef={headingRef}
      />
      {liveRegion}

      {view === 'item' && session.example && example && (
        <WorkedExample
          id="pr-intro-example"
          ref={exampleRef}
          exercise={example}
          intro={session.example.reason === 'intro' ? EXAMPLE_INTRO : EXAMPLE_AGAIN_INTRO}
          doneLabel="Jetzt selbst probieren"
          primary
          onDone={closeExample}
        />
      )}

      {view === 'item' && !session.example && exercise && slot && (
        <>
          {manual && (
            <WorkedExample id="pr-manual-example" exercise={manual} doneLabel="Schließen" onDone={closeManual} />
          )}
          <ItemView
            key={slot.uid}
            uid={slot.uid}
            exercise={exercise}
            item={session.item}
            isTwin={slot.purpose === 'twin'}
            heading={`Aufgabe ${session.index + 1} von ${total}`}
            response={response}
            markResult={isFinished(session.item.phase) || checkedSig === JSON.stringify(response) ? session.item.result : null}
            onChange={onChange}
            onCheck={handleCheck}
            onHint={handleHint}
            onNext={handleNext}
            praise={praise}
            streakNote={session.streakNote}
            normalising={normalising}
            keypad={keypadOn}
            exampleOpen={exampleOpen}
            guard={guard}
            sectionRef={sectionRef}
            nextRef={nextRef}
          />
        </>
      )}

      {view === 'item' && session.finished.length >= 1 && <ConsentPrompt key={session.index} guard={guard} />}

      {view === 'break' && <BreakPrompt onContinue={goNext} onExit={goodbye} guard={guard} announce={announce} />}

      {view === 'summary' && summary && (
        <RoundSummary
          solved={summary.solved}
          answered={summary.answered}
          mastery={summary.mastery}
          notes={summary.notes}
          badges={summary.badges}
          nextStufe={summary.nextStufe}
          onAgain={onAgain}
          onDone={goodbye}
          onNextStufe={() => {
            if (plan.mode === 'skill' && summary.nextStufe) onNavigate({ mode: 'skill', skillId: plan.skillId, stufe: summary.nextStufe });
          }}
          guard={guard}
          headingRef={summaryRef}
        />
      )}

      {view === 'goodbye' && (
        <section className="pr-message card" aria-labelledby="pr-goodbye-h">
          <h2 id="pr-goodbye-h" tabIndex={-1} ref={goodbyeRef}>
            {GOODBYE}
          </h2>
          {farewell && (
            <>
              <ImprovedNotes notes={farewell.notes} />
              <NewBadges badges={farewell.badges} />
            </>
          )}
          <button type="button" className="btn btn--primary btn--lg" onClick={onExit}>
            Zur Übersicht
          </button>
        </section>
      )}
    </div>
  );
}
