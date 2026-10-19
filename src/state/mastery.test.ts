import { describe, expect, it } from 'vitest';
import { createRng } from '../core/rng';
import { addDays } from './dates';
import { ALL_FACT_KEYS, KERN_FACT_KEYS, normalizeFactKey, isFactKey, compareFactKeys } from './facts';
import { LEITNER_INTERVALS, applyAnswer, isOptionalEntry, isSicherRecent, parseSkillKey, updateFact } from './mastery';
import { dueFacts } from './selectors';
import { emptyState } from './store';
import { ev } from './testkit';
import type { AnswerEvent, ProgressState } from './types';

const K = 'zahlen.runden#1';
const D0 = '2026-10-19';

function run(events: Partial<AnswerEvent>[], start: ProgressState = emptyState()) {
  let s = start;
  const outcomes = events.map((e) => {
    const r = applyAnswer(s, ev(e));
    s = r.state;
    return r;
  });
  return { state: s, outcomes };
}

/** n practice answers with the given first-try results on one day. */
const practice = (results: boolean[], day = D0, extra: Partial<AnswerEvent> = {}): Partial<AnswerEvent>[] =>
  results.map((firstTry) => ({ firstTry, solved: true, day, ...extra }));

/** A state where K just became sicher on D0 (8 × first try on one day). */
function sicherState(): ProgressState {
  return run(practice(Array(8).fill(true))).state;
}

describe('mastery: neu → geübt → sicher', () => {
  it('any attempt makes a Stufe "geübt", even a wrong one', () => {
    const { state, outcomes } = run([{ firstTry: false, solved: false }]);
    expect(outcomes[0].before).toBe('neu');
    expect(outcomes[0].after).toBe('geuebt');
    expect(state.skills[K]).toMatchObject({ attempts: 1, recent: [false], state: 'geuebt', box: 0, last: D0, practiceDays: 1 });
  });

  it('becomes sicher with 8 first-try answers in a row and is scheduled in box 1 (due tomorrow)', () => {
    const { state, outcomes } = run(practice(Array(8).fill(true)));
    expect(outcomes[6].after).toBe('geuebt');
    expect(outcomes[7].before).toBe('geuebt');
    expect(outcomes[7].after).toBe('sicher');
    expect(state.skills[K]).toMatchObject({ state: 'sicher', sicherSince: D0, box: 1, due: '2026-10-20' });
  });

  it('needs ≥ 8 of the last 10 AND the last 3 correct', () => {
    // 8 of the last 10, but the last 3 were never all correct → not yet
    const a = run(practice([false, true, true, true, true, true, true, true, false, true, false]));
    expect(a.state.skills[K].recent.filter(Boolean)).toHaveLength(8);
    expect(a.state.skills[K].state).toBe('geuebt');
    // 7 of 10 with the last 3 correct → not yet
    const b = run(practice([false, false, false, true, true, true, true, true, true, true]));
    expect(b.state.skills[K].state).toBe('geuebt');
    // 8 of 10 with the last 3 correct → sicher
    const c = run(practice([false, false, true, true, true, true, true, true, true, true]));
    expect(c.state.skills[K].state).toBe('sicher');
  });

  it('an answer after a hint (firstTry false) counts as not correct', () => {
    const { state } = run(practice([true, true, true, true, true, true, true]).concat([{ firstTry: false, solved: true, usedHint: true }]));
    expect(state.skills[K].recent).toEqual([true, true, true, true, true, true, true, false]);
    expect(state.skills[K].state).toBe('geuebt');
  });

  it('matches an independent reference model on random sequences', () => {
    const rng = createRng(7);
    for (let trial = 0; trial < 300; trial++) {
      const seq = Array.from({ length: rng.int(1, 25) }, () => rng.chance(0.8));
      // reference: first index where the window of the last 10 has ≥ 8 true and the last 3 are true
      let expectedAt = -1;
      for (let i = 0; i < seq.length && expectedAt < 0; i++) {
        const win = seq.slice(Math.max(0, i - 9), i + 1);
        const correct = win.filter((x) => x).length;
        if (correct >= 8 && i >= 2 && seq[i] && seq[i - 1] && seq[i - 2]) expectedAt = i;
      }
      const { outcomes } = run(practice(seq));
      const actualAt = outcomes.findIndex((o) => o.after === 'sicher');
      expect(actualAt, JSON.stringify(seq)).toBe(expectedAt);
      // never goes down afterwards
      if (actualAt >= 0) outcomes.slice(actualAt).forEach((o) => expect(o.after).toBe('sicher'));
    }
  });

  it('keeps only the last 10 results and counts distinct practice days', () => {
    // 14 answers over 4 days
    const dayOf = (i: number) => addDays(D0, Math.floor(i / 4));
    const events = Array.from({ length: 14 }, (_, i) => ({ firstTry: i % 2 === 0, day: dayOf(i) }));
    const p = run(events).state.skills[K];
    expect(p.recent).toHaveLength(10);
    expect(p.recent).toEqual(events.slice(-10).map((e) => e.firstTry));
    expect(p.practiceDays).toBe(4);
    expect(p.last).toBe('2026-10-22');
    expect(p.attempts).toBe(14);
  });

  it('only practice, mixed and twin answers feed "recent"', () => {
    const { state } = run([
      { purpose: 'practice', firstTry: true },
      { purpose: 'mixed', firstTry: false },
      { purpose: 'twin', firstTry: true },
      { purpose: 'review', firstTry: false },
    ]);
    expect(state.skills[K].recent).toEqual([true, false, true]);
    expect(state.skills[K].attempts).toBe(4);
  });

  it('status never goes down: wrong answers after sicher keep sicher', () => {
    const { state, outcomes } = run(practice(Array(10).fill(false), '2026-10-20'), sicherState());
    expect(outcomes.every((o) => o.before === 'sicher' && o.after === 'sicher')).toBe(true);
    expect(state.skills[K].state).toBe('sicher');
  });
});

describe('Leitner boxes per skill-Stufe', () => {
  it('review answers move up one box per due review with intervals 1, 3, 7, 14, 28 days', () => {
    let s = sicherState();
    let day = '2026-10-20';
    const seen: Array<[number, string]> = [];
    for (let i = 0; i < 6; i++) {
      s = applyAnswer(s, ev({ purpose: 'review', firstTry: true, day })).state;
      const p = s.skills[K];
      seen.push([p.box, p.due!]);
      day = p.due!;
    }
    expect(seen).toEqual([
      [2, addDays('2026-10-20', 3)],
      [3, addDays('2026-10-23', 7)],
      [4, addDays('2026-10-30', 14)],
      [5, addDays('2026-11-13', 28)],
      [5, addDays('2026-12-11', 28)],
      [5, addDays('2027-01-08', 28)],
    ]);
    expect(LEITNER_INTERVALS).toEqual([0, 1, 3, 7, 14, 28]);
  });

  it('a wrong review moves one box down (min 1), never resets, and keeps sicher', () => {
    let s = sicherState();
    s = applyAnswer(s, ev({ purpose: 'review', firstTry: true, day: '2026-10-20' })).state; // box 2
    s = applyAnswer(s, ev({ purpose: 'review', firstTry: true, day: '2026-10-23' })).state; // box 3
    const r = applyAnswer(s, ev({ purpose: 'review', firstTry: false, solved: true, day: '2026-10-30' }));
    expect(r.state.skills[K]).toMatchObject({ box: 2, due: '2026-11-02', state: 'sicher' });
    let t = r.state;
    for (let i = 0; i < 4; i++) t = applyAnswer(t, ev({ purpose: 'review', firstTry: false, solved: false, day: '2026-11-02' })).state;
    expect(t.skills[K]).toMatchObject({ box: 1, due: '2026-11-03', state: 'sicher' });
  });

  it('a second correct review on the same day does not skip a box', () => {
    let s = sicherState();
    s = applyAnswer(s, ev({ purpose: 'review', firstTry: true, day: '2026-10-20' })).state;
    s = applyAnswer(s, ev({ purpose: 'review', firstTry: true, day: '2026-10-20' })).state;
    expect(s.skills[K]).toMatchObject({ box: 2, due: '2026-10-23' });
  });

  it('errors in mixed practice move the box down but never remove sicher', () => {
    let s = sicherState();
    s = applyAnswer(s, ev({ purpose: 'review', firstTry: true, day: '2026-10-20' })).state; // box 2, due 23.10.
    const r = applyAnswer(s, ev({ purpose: 'mixed', firstTry: false, solved: true, day: '2026-10-21' }));
    expect(r.state.skills[K]).toMatchObject({ box: 1, due: '2026-10-22', state: 'sicher' });
    // a correct mixed answer does not change the schedule
    const c = applyAnswer(s, ev({ purpose: 'mixed', firstTry: true, day: '2026-10-21' }));
    expect(c.state.skills[K]).toMatchObject({ box: 2, due: '2026-10-23' });
  });

  it('unscheduled Stufen (box 0) are not moved by review or mixed answers', () => {
    const { state } = run([{ purpose: 'practice' }, { purpose: 'review', firstTry: false }, { purpose: 'mixed', firstTry: false }]);
    expect(state.skills[K].box).toBe(0);
    expect(state.skills[K].due).toBeUndefined();
  });
});

describe('gemeistert: spaced checks on ≥ 3 practice days', () => {
  it('counts a review as a check only ≥ 3 days after sicherSince', () => {
    let s = sicherState();
    s = applyAnswer(s, ev({ purpose: 'review', day: '2026-10-20' })).state;
    s = applyAnswer(s, ev({ purpose: 'review', day: '2026-10-21' })).state;
    expect(s.skills[K].checks).toEqual([]);
    s = applyAnswer(s, ev({ purpose: 'review', day: '2026-10-22' })).state;
    expect(s.skills[K].checks).toEqual([true]);
    expect(s.totals.checksPassed).toBe(1);
    s = applyAnswer(s, ev({ purpose: 'review', firstTry: false, day: '2026-10-25' })).state;
    expect(s.skills[K].checks).toEqual([true, false]);
    expect(s.totals.checksPassed).toBe(1);
  });

  it('becomes gemeistert with ≥ 4 of the last 5 checks', () => {
    let s = sicherState();
    const reviews: Array<[string, boolean]> = [
      ['2026-10-22', true],
      ['2026-10-25', false],
      ['2026-10-26', true],
      ['2026-10-29', true],
    ];
    for (const [day, firstTry] of reviews) s = applyAnswer(s, ev({ purpose: 'review', day, firstTry })).state;
    // 3 of 4 checks true → not yet
    expect(s.skills[K].state).toBe('sicher');
    const g = applyAnswer(s, ev({ purpose: 'review', day: '2026-11-05' }));
    expect(g.state.skills[K].checks).toEqual([true, false, true, true, true]);
    expect(g.before).toBe('sicher');
    expect(g.after).toBe('gemeistert');
    // and never goes down again
    let t = g.state;
    for (let i = 0; i < 6; i++) t = applyAnswer(t, ev({ purpose: i % 2 ? 'review' : 'mixed', firstTry: false, day: '2026-12-20' })).state;
    expect(t.skills[K].state).toBe('gemeistert');
    expect(t.skills[K].box).toBe(1);
  });

  it('needs practice on ≥ 3 distinct days, however many checks pass on one day', () => {
    let s = sicherState(); // day 1
    for (let i = 0; i < 5; i++) s = applyAnswer(s, ev({ purpose: 'review', day: '2026-10-22' })).state; // day 2
    expect(s.skills[K]).toMatchObject({ checks: [true, true, true, true, true], practiceDays: 2, state: 'sicher' });
    const g = applyAnswer(s, ev({ purpose: 'review', day: '2026-10-23' })); // day 3
    expect(g.state.skills[K].practiceDays).toBe(3);
    expect(g.after).toBe('gemeistert');
  });

  it('only the last 5 checks count', () => {
    let s = sicherState();
    const days = ['2026-10-22', '2026-10-23', '2026-10-24', '2026-10-25', '2026-10-26', '2026-10-27', '2026-10-28'];
    const results = [false, false, true, true, true, false, true];
    days.forEach((day, i) => (s = applyAnswer(s, ev({ purpose: 'review', day, firstTry: results[i] })).state));
    expect(s.skills[K].checks).toEqual([true, true, true, false, true]);
    expect(s.skills[K].state).toBe('gemeistert');
  });
});

describe('suggestNextStufe', () => {
  it('after 5 first-try answers in a row on Stufe 1 or 2', () => {
    const { outcomes } = run(practice([false, true, true, true, true, true, true]));
    expect(outcomes.map((o) => o.suggestNextStufe)).toEqual([false, false, false, false, false, true, true]);
  });
  it('never on Stufe 3, and not for review answers', () => {
    expect(run(practice(Array(6).fill(true), D0, { stufe: 3 })).outcomes.some((o) => o.suggestNextStufe)).toBe(false);
    const s = run(practice(Array(5).fill(true))).state;
    expect(applyAnswer(s, ev({ purpose: 'review' })).suggestNextStufe).toBe(false);
  });
});

describe('Einmaleins facts', () => {
  it('normalises keys (Tauschaufgaben share one key) and rejects others', () => {
    expect(normalizeFactKey('7x3')).toBe('3x7');
    expect(normalizeFactKey('3x7')).toBe('3x7');
    expect(normalizeFactKey(' 8 · 6 ')).toBe('6x8');
    expect(normalizeFactKey('10x10')).toBe('10x10');
    for (const bad of ['3x', 'x7', '3+7', '123x4', '3x7x2', '', '21x1']) expect(normalizeFactKey(bad), bad).toBeNull();
    expect(normalizeFactKey(undefined)).toBeNull();
    expect(isFactKey('3x7')).toBe(true);
    expect(isFactKey('7x3')).toBe(false);
  });

  it('has 55 keys for 1 · 1 … 10 · 10 and 34 Kernaufgaben (factor 1, 2, 5 or 10)', () => {
    expect(ALL_FACT_KEYS).toHaveLength(55);
    expect(new Set(ALL_FACT_KEYS).size).toBe(55);
    // independent count: 100 ordered facts → 10 squares + 45 unordered pairs
    expect(10 + (100 - 10) / 2).toBe(55);
    expect(KERN_FACT_KEYS).toHaveLength(55 - 21); // 21 pairs from {3,4,6,7,8,9}
    expect(KERN_FACT_KEYS).toContain('5x7');
    expect(KERN_FACT_KEYS).not.toContain('3x7');
    expect([...ALL_FACT_KEYS].sort(compareFactKeys)).toEqual(ALL_FACT_KEYS);
  });

  it('box 0 → +1 when correct and fast; due = day + interval', () => {
    const f1 = updateFact(undefined, true, 1200, D0);
    expect(f1).toEqual({ box: 1, due: '2026-10-20', seen: 1, correct: 1 });
    const f2 = updateFact(f1, true, undefined, '2026-10-20');
    expect(f2).toEqual({ box: 2, due: '2026-10-23', seen: 2, correct: 2 });
    const f3 = updateFact(f2, true, 3000, '2026-10-23');
    expect(f3).toMatchObject({ box: 3, due: '2026-10-30' });
  });

  it('correct but slower than 3 s keeps the box (min 1) and the fact stays in review', () => {
    expect(updateFact(undefined, true, 3001, D0)).toEqual({ box: 1, due: '2026-10-20', seen: 1, correct: 1 });
    const f = updateFact({ box: 3, due: D0, seen: 5, correct: 5 }, true, 8000, D0);
    expect(f).toEqual({ box: 3, due: '2026-10-26', seen: 6, correct: 6 });
    expect(updateFact({ box: 2, due: D0, seen: 1, correct: 1 }, true, Number.NaN, D0).box).toBe(2);
  });

  it('wrong → one box down (min 0); a missed fact is due tomorrow at the earliest', () => {
    expect(updateFact({ box: 3, due: D0, seen: 3, correct: 3 }, false, 900, D0)).toEqual({ box: 2, due: '2026-10-22', seen: 4, correct: 3 });
    expect(updateFact({ box: 1, due: D0, seen: 1, correct: 1 }, false, 900, D0)).toEqual({ box: 0, due: '2026-10-20', seen: 2, correct: 1 });
    expect(updateFact({ box: 0, due: D0, seen: 2, correct: 1 }, false, 900, D0)).toEqual({ box: 0, due: '2026-10-20', seen: 3, correct: 1 });
    expect(updateFact(undefined, false, 900, D0)).toEqual({ box: 0, due: '2026-10-20', seen: 1, correct: 0 });
    // box 0 can still move up within the same session (the trainer repeats it)
    expect(updateFact({ box: 0, due: '2026-10-20', seen: 1, correct: 0 }, true, 900, D0)).toEqual({ box: 1, due: '2026-10-20', seen: 2, correct: 1 });
  });

  it('a fact missed twice in a review is not due again the same day (no repetition loop, M9)', () => {
    const fact = { skillId: 'kopfrechnen.einmaleins', topicId: 'kopfrechnen' as const, factKey: '3x7', purpose: 'review' as const, firstTry: false, day: D0 };
    let s: ProgressState = { ...emptyState(), facts: { '3x7': { box: 2, due: D0, seen: 4, correct: 4 } } };
    expect(dueFacts(s, D0)).toEqual(['3x7']);
    s = run([fact, fact], s).state;
    expect(s.facts['3x7']).toMatchObject({ box: 0, due: '2026-10-20' });
    expect(dueFacts(s, D0)).toEqual([]);
    expect(dueFacts(s, '2026-10-20')).toEqual(['3x7']);
  });

  it('a fast correct answer before the due day does not promote', () => {
    const f = updateFact({ box: 2, due: '2026-10-22', seen: 2, correct: 2 }, true, 800, D0);
    expect(f).toEqual({ box: 2, due: '2026-10-22', seen: 3, correct: 3 });
  });

  it('applyAnswer updates the fact under its canonical key, for any purpose but blitz', () => {
    let s = applyAnswer(emptyState(), ev({ skillId: 'kopfrechnen.einmaleins', topicId: 'kopfrechnen', factKey: '7x3', latencyMs: 1000 })).state;
    expect(s.facts['3x7']).toMatchObject({ box: 1, seen: 1 });
    s = applyAnswer(s, ev({ skillId: 'kopfrechnen.einmaleins', topicId: 'kopfrechnen', factKey: '3x7', purpose: 'review', firstTry: false })).state;
    expect(s.facts['3x7']).toMatchObject({ box: 0, seen: 2, correct: 1 });
    const b = applyAnswer(s, ev({ skillId: 'kopfrechnen.einmaleins', topicId: 'kopfrechnen', factKey: '3x7', purpose: 'blitz' }));
    expect(b.state).toBe(s);
    const bad = applyAnswer(s, ev({ factKey: 'drei mal sieben' })).state;
    expect(Object.keys(bad.facts)).toEqual(['3x7']);
  });
});

describe('totals, days and special events', () => {
  it('counts answered and firstTry and keeps distinct sorted days', () => {
    const { state } = run([
      { firstTry: true, day: '2026-10-21' },
      { firstTry: false, solved: true, usedHint: true, day: '2026-10-19' },
      { firstTry: false, solved: false, day: '2026-10-21' },
      { firstTry: false, solved: true, day: '2026-10-20' },
    ]);
    expect(state.totals).toEqual({ answered: 4, firstTry: 1, rounds: 0, checksPassed: 0 });
    expect(state.days).toEqual(['2026-10-19', '2026-10-20', '2026-10-21']);
  });

  it('Blitzrunde answers never touch progress', () => {
    const s = sicherState();
    const r = applyAnswer(s, ev({ purpose: 'blitz', firstTry: false }));
    expect(r.state).toBe(s);
    expect(r.counted).toBe(false);
    expect(r.before).toBe('sicher');
    expect(r.after).toBe('sicher');
  });

  it('optional NRW events are flagged and do not feed badge counters', () => {
    const base = { skillId: 'zahlen.binaer', optional: true as const };
    const { state } = run([
      { ...base, firstTry: false, solved: true },
      ...practice(Array(8).fill(true), D0, base),
    ]);
    const p = state.skills['zahlen.binaer#1'];
    expect(p.state).toBe('sicher');
    expect(isOptionalEntry(p)).toBe(true);
    expect(state.totals.checksPassed).toBe(0);
    expect(state.totals.answered).toBe(9);
  });

  it('ignores malformed skill ids for skill progress but still counts the answer', () => {
    const r = applyAnswer(emptyState(), ev({ skillId: 'unbekannt' }));
    expect(r.state.skills).toEqual({});
    expect(r.state.totals.answered).toBe(1);
    expect(applyAnswer(emptyState(), ev({ skillId: 'musik.noten' })).state.skills).toEqual({});
  });

  it('never stores session ids (P1: no ids, no times), even if an old caller still passes one', () => {
    const id = `s${'q'.repeat(20)}${Date.UTC(2026, 9, 18, 14, 37).toString(36)}`;
    const legacy = (e: Record<string, string>) => e as Partial<AnswerEvent>;
    const s = run([legacy({ sessionId: id }), legacy({ sessionId: id, day: '2026-10-20' }), legacy({ sessionId: 'b', day: '2026-10-20' })]).state;
    expect(JSON.stringify(s)).not.toContain(id);
    expect(JSON.stringify(s)).not.toContain('session');
    expect(s.skills[K].practiceDays).toBe(2);
  });

  it('is pure: the input state is not modified', () => {
    const s = sicherState();
    const snapshot = JSON.stringify(s);
    applyAnswer(s, ev({ purpose: 'review', firstTry: false, day: '2026-10-25', factKey: '3x7' }));
    expect(JSON.stringify(s)).toBe(snapshot);
  });

  it('parses skill keys', () => {
    expect(parseSkillKey('zahlen.runden#2')).toEqual({ skillId: 'zahlen.runden', topicId: 'zahlen', stufe: 2 });
    expect(parseSkillKey('kopfrechnen.einmaleins#1')?.topicId).toBe('kopfrechnen');
    for (const bad of ['zahlen.runden#4', 'zahlen.runden', 'zahlen#1', 'musik.x#1', '__proto__', 'zahlen.a b#1']) expect(parseSkillKey(bad), bad).toBeNull();
  });

  it('isSicherRecent', () => {
    expect(isSicherRecent([])).toBe(false);
    expect(isSicherRecent(Array(8).fill(true))).toBe(true);
    expect(isSicherRecent([...Array(7).fill(true), false, true, true])).toBe(false);
    expect(isSicherRecent([...Array(7).fill(true), false, true, true, true])).toBe(true);
  });
});
