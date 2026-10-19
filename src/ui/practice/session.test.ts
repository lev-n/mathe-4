import { describe, expect, it } from 'vitest';
import { createRng } from '../../core/rng';
import type { CheckResult } from '../../core/types';
import type { RoundSlot } from '../../state/types';
import {
  ENTRY_CHECK_ITEMS,
  createSession,
  isFinished,
  sessionReducer,
  summarize,
  type ItemMeta,
  type SessionAction,
  type SessionState,
} from './session';

const META: ItemMeta = { topicId: 'kopfrechnen', hintCount: 3, factKey: '7x8' };
const OK: CheckResult = { correct: true };
const WRONG: CheckResult = { correct: false };
const BUG: CheckResult = { correct: false, bugHint: 'Schau noch einmal auf die Zehnerstelle.' };
const INVALID: CheckResult = { correct: false, invalid: 'Gib zuerst eine Zahl ein.' };

function slots(n: number, skillId = 'kopfrechnen.einmaleins'): RoundSlot[] {
  return Array.from({ length: n }, () => ({ skillId, stufe: 2 as const, purpose: 'practice' as const }));
}

function start(n = 10, extra: Partial<Parameters<typeof createSession>[0]> = {}): SessionState {
  return createSession({ slots: slots(n), meta: META, now: 1000, maxTwins: 2, ...extra });
}

function run(state: SessionState, actions: SessionAction[]): SessionState {
  return actions.reduce(sessionReducer, state);
}

const check = (result: CheckResult, now = 2000, twinOffset = 2): SessionAction => ({ type: 'check', result, now, twinOffset });
const next = (now = 5000, isNew = false): SessionAction => ({ type: 'next', now, meta: META, isNew });

/** Mixed round: slots alternate between skills (like buildRound's interleaving). */
function mixedSlots(ids: string[]): RoundSlot[] {
  return ids.map((skillId) => ({ skillId, stufe: 1 as const, purpose: 'mixed' as const }));
}

describe('session reducer: one item', () => {
  it('first-try correct: solved, firstTry, recorded once with latency', () => {
    const s = run(start(), [check(OK, 4000)]);
    expect(s.item.phase).toBe('solved');
    expect(s.finished).toHaveLength(1);
    expect(s.finished[0]).toMatchObject({
      skillId: 'kopfrechnen.einmaleins',
      topicId: 'kopfrechnen',
      stufe: 2,
      purpose: 'practice',
      firstTry: true,
      solved: true,
      usedHint: false,
      secondTry: false,
      factKey: '7x8',
      latencyMs: 3000,
    });
    expect(s.streak).toBe(1);
    expect(s.slots).toHaveLength(10);
  });

  it('using a hint means not first-try, even if the first attempt is correct', () => {
    const s = run(start(), [{ type: 'hint' }, check(OK)]);
    expect(s.item.hintsShown).toBe(1);
    expect(s.finished[0]).toMatchObject({ firstTry: false, solved: true, usedHint: true, secondTry: false });
    expect(s.streak).toBe(0);
  });

  it('hints are revealed one at a time and never beyond the available hints', () => {
    const s = run(start(), [{ type: 'hint' }, { type: 'hint' }, { type: 'hint' }, { type: 'hint' }]);
    expect(s.item.hintsShown).toBe(3);
    expect(s.item.usedHint).toBe(true);
  });

  it('1st wrong attempt → retry, input stays open, next hint shown automatically when there is no bug hint', () => {
    const s = run(start(), [check(WRONG)]);
    expect(s.item.phase).toBe('retry');
    expect(isFinished(s.item.phase)).toBe(false);
    expect(s.item.wrongAttempts).toBe(1);
    expect(s.item.autoHint).toBe(0);
    expect(s.item.hintsShown).toBe(1);
    expect(s.item.usedHint).toBe(false);
    expect(s.finished).toHaveLength(0);
  });

  it('1st wrong attempt with a matching bug → bug hint, no automatic strategy hint', () => {
    const s = run(start(), [check(BUG)]);
    expect(s.item.phase).toBe('retry');
    expect(s.item.result?.bugHint).toBe(BUG.bugHint);
    expect(s.item.autoHint).toBeNull();
    expect(s.item.hintsShown).toBe(0);
  });

  it('wrong, then right → solved on the 2nd try (not first-try)', () => {
    const s = run(start(), [check(WRONG), check(OK, 9000)]);
    expect(s.item.phase).toBe('solved');
    expect(s.finished).toHaveLength(1);
    expect(s.finished[0]).toMatchObject({ firstTry: false, solved: true, secondTry: true });
    // Latency is measured to the FIRST check only.
    expect(s.finished[0].latencyMs).toBe(1000);
  });

  it('2nd wrong attempt → solution revealed, not solved, Zwillingsaufgabe inserted 2–3 slots later', () => {
    const s = run(start(), [check(WRONG), check(WRONG, 3000, 3)]);
    expect(s.item.phase).toBe('revealed');
    expect(s.finished).toHaveLength(1);
    expect(s.finished[0]).toMatchObject({ firstTry: false, solved: false, secondTry: false });
    expect(s.slots).toHaveLength(11);
    expect(s.twinsAdded).toBe(1);
    expect(s.item.twinInserted).toBe(true);
    const twinIndex = s.slots.findIndex((x) => x.purpose === 'twin');
    expect(twinIndex).toBe(s.index + 3);
    expect(s.slots[twinIndex]).toMatchObject({ skillId: 'kopfrechnen.einmaleins', stufe: 2, purpose: 'twin' });
    expect(new Set(s.slots.map((x) => x.uid)).size).toBe(s.slots.length);
  });

  it('twin offset 2 puts the twin as the 2nd item after the current one', () => {
    const s = run(start(), [check(WRONG), check(WRONG, 3000, 2)]);
    expect(s.slots[s.index + 2].purpose).toBe('twin');
    expect(s.slots[s.index + 1].purpose).toBe('practice');
  });

  it('a twin near the end of the round is appended at the end', () => {
    let s = start(2);
    s = run(s, [check(OK), next(), check(WRONG), check(WRONG, 3000, 3)]);
    expect(s.slots).toHaveLength(3);
    expect(s.slots[2].purpose).toBe('twin');
  });

  it('invalid input is not counted as an attempt and is cleared on change', () => {
    let s = run(start(), [check(INVALID)]);
    expect(s.item.phase).toBe('answering');
    expect(s.item.wrongAttempts).toBe(0);
    expect(s.item.invalid).toBe(INVALID.invalid);
    expect(s.item.firstCheckAt).toBeNull();
    expect(s.finished).toHaveLength(0);
    s = sessionReducer(s, { type: 'change' });
    expect(s.item.invalid).toBeNull();
    // Invalid input during the retry phase does not use up the 2nd attempt either.
    s = run(s, [check(WRONG), check(INVALID), check(INVALID)]);
    expect(s.item.phase).toBe('retry');
    expect(s.item.wrongAttempts).toBe(1);
    s = sessionReducer(s, check(OK));
    expect(s.finished[0]).toMatchObject({ solved: true, firstTry: false });
  });

  it('after an item is finished, further checks and hints are ignored (recorded exactly once)', () => {
    const solved = run(start(), [check(OK)]);
    const again = run(solved, [check(OK), check(WRONG), check(WRONG), { type: 'hint' }]);
    expect(again).toBe(solved);
    expect(again.finished).toHaveLength(1);

    const revealed = run(start(), [check(WRONG), check(WRONG)]);
    const after = run(revealed, [check(OK), check(WRONG), { type: 'hint' }]);
    expect(after).toBe(revealed);
    expect(after.finished).toHaveLength(1);
  });

  it('next is ignored until the item is finished', () => {
    const s = start();
    expect(sessionReducer(s, next())).toBe(s);
    const retry = run(s, [check(WRONG)]);
    expect(sessionReducer(retry, next())).toBe(retry);
  });
});

describe('session reducer: round flow', () => {
  it('next resets the item; the round is done after the last slot', () => {
    let s = start(3);
    s = run(s, [check(OK), next(6000)]);
    expect(s.index).toBe(1);
    expect(s.item.phase).toBe('answering');
    expect(s.item.hintsShown).toBe(0);
    expect(s.item.shownAt).toBe(6000);
    s = run(s, [check(OK), next(), check(OK), next()]);
    expect(s.done).toBe(true);
    expect(s.finished).toHaveLength(3);
    // Nothing happens after the round is done.
    expect(sessionReducer(s, check(OK))).toBe(s);
  });

  it('next with `to` skips slots that could not be generated', () => {
    let s = start(5);
    s = run(s, [check(OK), { type: 'next', now: 1, meta: META, to: 3 }]);
    expect(s.index).toBe(3);
    s = run(s, [check(OK), { type: 'next', now: 1, to: 5 }]);
    expect(s.done).toBe(true);
  });

  it('at most maxTwins twins per round, and a twin never spawns another twin', () => {
    let s = start(6);
    const fail: SessionAction[] = [check(WRONG), check(WRONG, 2000, 2)];
    s = run(s, [...fail, next()]); // twin 1 at index 2
    expect(s.twinsAdded).toBe(1);
    s = run(s, [...fail, next()]); // index 1 → twin 2 at index 3
    expect(s.twinsAdded).toBe(2);
    expect(s.slots[s.index].purpose).toBe('twin');
    s = run(s, fail); // failing the twin inserts nothing
    expect(s.twinsAdded).toBe(2);
    expect(s.slots).toHaveLength(8);
    s = run(s, [next(), ...fail]);
    expect(s.slots.filter((x) => x.purpose === 'twin')).toHaveLength(2);
    expect(s.slots).toHaveLength(8);
  });

  it('Einstiegs-Check: a new skill+Stufe starts with plain items; 3 first-try correct → no worked example', () => {
    expect(ENTRY_CHECK_ITEMS).toBe(3);
    let s = createSession({ slots: slots(5), meta: META, now: 1000, maxTwins: 2, isNew: true });
    expect(s.example).toBeNull();
    expect(s.item.shownAt).toBe(1000);
    expect(s.entry['kopfrechnen.einmaleins#2']).toEqual({ done: 0, failed: false });
    // After the first item the Stufe is no longer 'neu' (isNew false), the check keeps counting.
    s = run(s, [check(OK), next(), check(OK), next(), check(OK)]);
    expect(s.entry).toEqual({});
    expect(s.introduced).toContain('kopfrechnen.einmaleins#2');
    s = run(s, [next(), check(WRONG), check(WRONG), next()]);
    expect(s.example).toBeNull();
  });

  it('Einstiegs-Check: an item that is not first-try correct brings the worked example before the next item', () => {
    let s = createSession({ slots: slots(4), meta: META, now: 1000, maxTwins: 2, isNew: true });
    s = run(s, [check(OK), next(), check(WRONG), check(OK)]);
    expect(s.entry['kopfrechnen.einmaleins#2']).toEqual({ done: 2, failed: true });
    s = sessionReducer(s, next(6000));
    expect(s.example).toMatchObject({ skillId: 'kopfrechnen.einmaleins', stufe: 2, reason: 'intro' });
    expect(s.item.shownAt).toBeNull();
    // Checks and hints wait until the example is closed.
    expect(sessionReducer(s, check(OK))).toBe(s);
    expect(sessionReducer(s, { type: 'hint' })).toBe(s);
    s = sessionReducer(s, { type: 'closeExample', now: 7000 });
    expect(s.example).toBeNull();
    expect(s.item.shownAt).toBe(7000);
    expect(s.entry).toEqual({});
    // Not shown again for the same skill+Stufe in this session.
    s = run(s, [check(WRONG), check(WRONG), next(8000, true)]);
    expect(s.example).toBeNull();
  });

  it('a running or settled Einstiegs-Check carries over to the next round of the same session', () => {
    let first = createSession({ slots: slots(1), meta: META, now: 0, maxTwins: 2, isNew: true });
    first = run(first, [check(WRONG), check(OK)]);
    const second = createSession({ slots: slots(2), meta: META, now: 0, maxTwins: 2, isNew: false, entry: first.entry, introduced: first.introduced });
    expect(second.example).toMatchObject({ reason: 'intro' });
    const third = createSession({ slots: slots(2), meta: META, now: 0, maxTwins: 2, isNew: true, introduced: second.introduced });
    expect(third.example).toBeNull();
    expect(third.entry).toEqual({});
  });

  it('mixed and review rounds (entryCheck false) never force an intro example', () => {
    let s = createSession({ slots: slots(4), meta: META, now: 0, maxTwins: 0, isNew: true, entryCheck: false });
    expect(s.entry).toEqual({});
    s = run(s, [check(WRONG), check(OK), next(1, true)]);
    expect(s.example).toBeNull();
  });

  it("opening 'So geht's' during an item counts as help and settles the Einstiegs-Check", () => {
    let s = createSession({ slots: slots(3), meta: META, now: 0, maxTwins: 2, isNew: true });
    s = sessionReducer(s, { type: 'example' });
    expect(s.item.usedHint).toBe(true);
    expect(s.item.hintsShown).toBe(0);
    expect(s.entry).toEqual({});
    expect(s.introduced).toContain('kopfrechnen.einmaleins#2');
    s = sessionReducer(s, check(OK));
    expect(s.finished[0]).toMatchObject({ firstTry: false, solved: true, usedHint: true });
    // No forced example afterwards, and nothing changes once the item is finished.
    expect(sessionReducer(s, { type: 'example' })).toBe(s);
    s = sessionReducer(s, next());
    expect(s.example).toBeNull();
  });

  it('after 2 consecutive items needing the solution, the worked example is offered again', () => {
    let s = start(6);
    const fail: SessionAction[] = [check(WRONG), check(WRONG)];
    s = run(s, [...fail, next()]);
    expect(s.example).toBeNull();
    s = run(s, fail);
    expect(s.exampleDue).toEqual([{ skillId: 'kopfrechnen.einmaleins', stufe: 2 }]);
    s = sessionReducer(s, next(9000));
    expect(s.example).toMatchObject({ reason: 'again', skillId: 'kopfrechnen.einmaleins', stufe: 2 });
    expect(s.exampleDue).toEqual([]);
    s = sessionReducer(s, { type: 'closeExample', now: 9500 });
    expect(s.item.shownAt).toBe(9500);
  });

  it('mixed rounds: the "again" example waits for the next item of the same skill+Stufe', () => {
    // Slots a, b, c, a: items 1 (a) and 2 (b) need the solution – two different skills, no example.
    let s = createSession({ slots: mixedSlots(['zahlen.a', 'zahlen.b', 'zahlen.c', 'zahlen.a', 'zahlen.a']), meta: META, now: 0, maxTwins: 0 });
    const fail: SessionAction[] = [check(WRONG), check(WRONG)];
    s = run(s, [...fail, next(), ...fail, next()]);
    expect(s.slots[s.index].skillId).toBe('zahlen.c');
    expect(s.example).toBeNull();
    expect(s.exampleDue).toEqual([]);
    // Skill a fails again (2 in a row for a, with c solved in between) → shown before a's next item only.
    s = run(s, [check(OK), next(), ...fail]);
    expect(s.exampleDue).toEqual([{ skillId: 'zahlen.a', stufe: 1 }]);
    s = sessionReducer(s, next());
    expect(s.slots[s.index].skillId).toBe('zahlen.a');
    expect(s.example).toMatchObject({ skillId: 'zahlen.a', stufe: 1, reason: 'again' });
  });

  it('mixed rounds: a due example is not shown before an unrelated item', () => {
    let s = createSession({ slots: mixedSlots(['zahlen.a', 'zahlen.a', 'zahlen.b', 'zahlen.a']), meta: META, now: 0, maxTwins: 0 });
    s = run(s, [check(WRONG), check(WRONG), next(), check(WRONG), check(WRONG), next()]);
    expect(s.slots[s.index].skillId).toBe('zahlen.b');
    expect(s.example).toBeNull();
    s = run(s, [check(OK), next()]);
    expect(s.example).toMatchObject({ skillId: 'zahlen.a', reason: 'again' });
  });

  it('a solved item in between resets the "needs solution" run', () => {
    let s = start(6);
    s = run(s, [check(WRONG), check(WRONG), next(), check(OK), next(), check(WRONG), check(WRONG), next()]);
    expect(s.example).toBeNull();
  });

  it('streak note at 5 first-try items in a row', () => {
    let s = start(10);
    for (let i = 0; i < 4; i++) s = run(s, [check(OK), next()]);
    s = sessionReducer(s, check(OK));
    expect(s.streak).toBe(5);
    expect(s.streakNote).toBe(5);
    s = sessionReducer(s, next());
    expect(s.streakNote).toBeNull();
    s = run(s, [{ type: 'hint' }, check(OK)]);
    expect(s.streak).toBe(0);
    expect(s.streakNote).toBeNull();
  });

  it('the normalising sentence is used at most once per session', () => {
    let s = start(6);
    s = run(s, [check(WRONG), check(WRONG)]);
    expect(s.showNormalising).toBe(true);
    expect(s.normalisedUsed).toBe(true);
    s = run(s, [next(), check(WRONG), check(WRONG)]);
    expect(s.showNormalising).toBe(false);
    const nextRound = createSession({ slots: slots(2), meta: META, now: 0, maxTwins: 2, normalisedUsed: true });
    expect(run(nextRound, [check(WRONG), check(WRONG)]).showNormalising).toBe(false);
  });

  it('an empty round is done immediately', () => {
    const s = createSession({ slots: [], now: 0, maxTwins: 2 });
    expect(s.done).toBe(true);
    expect(s.finished).toHaveLength(0);
  });

  it('optional (NRW) items are flagged in the record', () => {
    const s = run(createSession({ slots: slots(1), meta: { ...META, optional: true }, now: 0, maxTwins: 2 }), [check(OK)]);
    expect(s.finished[0].optional).toBe(true);
  });
});

describe('session reducer: error-library tags for the improvement tracking', () => {
  const tagged: ItemMeta = { ...META, bugTags: ['add.no-carry', 'add.misaligned'] };
  const carry: CheckResult = { correct: false, bugHint: 'Denk an den Übertrag.', bugId: 'add.no-carry' };
  const misaligned: CheckResult = { correct: false, bugHint: 'Schreib Stelle unter Stelle.', bugId: 'add.misaligned' };

  it('records the tags the task offered and the known mistakes of both attempts', () => {
    const s = run(start(10, { meta: tagged }), [check(carry), check(misaligned)]);
    expect(s.finished[0]).toMatchObject({ bugTags: ['add.no-carry', 'add.misaligned'], bugIds: ['add.no-carry', 'add.misaligned'], solved: false });
  });

  it('a mistake without a known bug or a correct answer records no bug ids; tags are still recorded', () => {
    const same = run(start(10, { meta: tagged }), [check(carry), check(carry)]);
    expect(same.finished[0].bugIds).toEqual(['add.no-carry']);
    const s = run(start(10, { meta: tagged }), [check(WRONG), check(OK)]);
    expect(s.finished[0].bugTags).toEqual(['add.no-carry', 'add.misaligned']);
    expect('bugIds' in s.finished[0]).toBe(false);
    expect('bugTags' in run(start(), [check(OK)]).finished[0]).toBe(false);
  });

  it('invalid input never sets a bug id', () => {
    const s = run(start(10, { meta: tagged }), [check({ ...INVALID, bugId: 'add.no-carry' }), check(OK)]);
    expect(s.finished[0]).toMatchObject({ firstTry: true });
    expect(s.finished[0].bugIds).toBeUndefined();
  });
});

describe('session reducer: recordAnswer exactly once per item (random walks)', () => {
  it('every finished item appears exactly once in `finished`, in order', () => {
    const results = [OK, WRONG, BUG, INVALID];
    for (let seed = 1; seed <= 200; seed++) {
      const rng = createRng(seed);
      let s = start(rng.int(1, 10), { isNew: rng.chance(0.5) });
      // Mirror of the UI: send every new entry of `finished` to the store.
      const sent: string[] = [];
      const finishedUids = new Set<string>();
      for (let step = 0; step < 300 && !s.done; step++) {
        const roll = rng.next();
        let action: SessionAction;
        if (s.example) action = { type: 'closeExample', now: step };
        else if (roll < 0.15) action = { type: 'hint' };
        else if (roll < 0.25) action = { type: 'change' };
        else if (roll < 0.75) action = check(rng.pick(results), step, rng.int(2, 3));
        else action = { type: 'next', now: step, meta: META, isNew: rng.chance(0.3) };
        const prev = s;
        s = sessionReducer(s, action);
        for (const f of s.finished.slice(prev.finished.length)) sent.push(f.uid);
        if (isFinished(s.item.phase) && !s.done) finishedUids.add(s.item.uid);
      }
      expect(new Set(sent).size).toBe(sent.length);
      expect(sent).toEqual(s.finished.map((f) => f.uid));
      for (const uid of finishedUids) expect(sent).toContain(uid);
      expect(s.twinsAdded).toBeLessThanOrEqual(2);
      for (const f of s.finished) {
        if (f.firstTry) expect(f.solved && !f.usedHint && !f.secondTry).toBe(true);
      }
    }
  });
});

describe('summarize', () => {
  it('counts solved, first-try and items to repeat', () => {
    let s = start(4);
    s = run(s, [check(OK), next(), { type: 'hint' }, check(OK), next(), check(WRONG), check(OK), next(), check(WRONG), check(WRONG)]);
    expect(summarize(s.finished)).toEqual({ answered: 4, solved: 3, firstTry: 1, toRepeat: 1 });
  });
});
