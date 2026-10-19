import { describe, expect, it } from 'vitest';
import { addDays } from './dates';
import {
  ERROR_MIN_SEEN,
  capTracks,
  seedGrowth,
  HARD_START_MAX,
  MAX_ROUND_NOTES,
  MAX_TAGS_PER_ANSWER,
  MAX_TAGS_PER_SKILL,
  OVERCOME_RUN,
  applyGrowth,
  growthFacts,
  growthView,
  hadWrongAttempt,
  normalizeTag,
  roundNotes,
  tagsOf,
} from './growth';
import { applyAnswer } from './mastery';
import { createStore, emptyState } from './store';
import { ev } from './testkit';
import type { AnswerEvent, AnswerOutcome, GrowthEvent, ProgressState } from './types';

const D1 = '2026-10-19';
const D2 = '2026-10-20';
const D5 = '2026-10-23';

/** applyAnswer + applyGrowth, like the store does. */
function answer(state: ProgressState, event: AnswerEvent): { state: ProgressState; events: GrowthEvent[] } {
  const applied = applyAnswer(state, event, event.day);
  return applyGrowth(state, applied.state, event, event.day);
}

/** Feeds a list of events into a fresh store; returns the store and every outcome. */
function play(events: AnswerEvent[], s = createStore(null)): { s: ReturnType<typeof createStore>; outs: AnswerOutcome[] } {
  const outs = events.map((e) => s.recordAnswer(e));
  return { s, outs };
}

const growthOf = (outs: AnswerOutcome[]) => outs.flatMap((o) => o.growth);
const badgeIds = (outs: AnswerOutcome[]) => outs.flatMap((o) => o.newBadges.map((b) => b.id));

/** First-try pattern ('x' = first-try correct, '.' = not) as practice answers on one day. */
const pattern = (p: string, day: string, extra: Partial<AnswerEvent> = {}): AnswerEvent[] =>
  [...p].map((c) => ev({ day, firstTry: c === 'x', solved: true, ...extra }));

// ─── Tags ───────────────────────────────────────────────────────────────────

describe('error-library tags', () => {
  it('normalise Bug ids: index segments go, the misconception stays', () => {
    const cases: Array<[string, string]> = [
      ['add.no-carry', 'add.no-carry'],
      ['vier-2', 'vier'],
      ['fehlt-0', 'fehlt'],
      ['faktor-100', 'faktor'],
      ['faktor-1000', 'faktor'],
      ['nachbar-5', 'nachbar'],
      ['zr.carry-A', 'zr.carry'],
      ['ware-vergessen-1', 'ware-vergessen'],
      ['nur-ware-1', 'nur-ware'],
      ['zeile-0-vergessen', 'zeile-vergessen'],
      ['wert-3-vergessen', 'wert-vergessen'],
      // words, not indices
      ['sub.zero-minus-n', 'sub.zero-minus-n'],
      ['hs.minus-s', 'hs.minus-s'],
      ['nur-einer-b', 'nur-einer-b'],
      ['h', 'h'],
      // the operator of a wrong-operation bug is the misconception itself
      ['rechenart-+', 'rechenart-+'],
      ['rechenart-:', 'rechenart-:'],
      ['rechenart-*', 'rechenart-*'],
    ];
    for (const [id, tag] of cases) expect(normalizeTag(id), id).toBe(tag);
  });

  it('rejects ids that are no usable tag (also prototype keys)', () => {
    for (const bad of [undefined, null, 3, '', ' ', 'mit leerzeichen', 'ü-fehler', 'x'.repeat(49), '<script>', '__proto__', '-x']) expect(normalizeTag(bad), String(bad)).toBeNull();
  });

  it('a wrong attempt is a real mistake; help alone is not', () => {
    expect(hadWrongAttempt({ solved: true, firstTry: false, usedHint: false })).toBe(true);
    expect(hadWrongAttempt({ solved: false, firstTry: false, usedHint: true })).toBe(true);
    expect(hadWrongAttempt({ solved: true, firstTry: false, usedHint: true })).toBe(false);
    expect(hadWrongAttempt({ solved: true, firstTry: false, usedHint: true, wrongAttempt: true })).toBe(true);
    expect(hadWrongAttempt({ solved: true, firstTry: true, usedHint: false })).toBe(false);
  });

  it('tagsOf: distinct, valid, capped', () => {
    expect(tagsOf(['vier-0', 'vier-1', 'eins-0', 'kaputt id'])).toEqual(['vier', 'eins']);
    expect(tagsOf(undefined)).toEqual([]);
    const many = Array.from({ length: 30 }, (_, i) => `bug${String.fromCharCode(97 + (i % 26))}${i}x`);
    expect(tagsOf(many)).toHaveLength(MAX_TAGS_PER_ANSWER);
  });
});

// ─── 3. Error overcome ──────────────────────────────────────────────────────

describe('kind 3: error overcome', () => {
  const offer = { skillId: 'schriftlich.addition', topicId: 'schriftlich' as const, stufe: 2 as const, bugTags: ['add.no-carry', 'add.misaligned'] };
  const err = (day: string, bugIds = ['add.no-carry']) => ev({ ...offer, day, firstTry: false, solved: true, bugIds });
  /** The error in two tasks (a single slip is not an error pattern yet). */
  const errTwice = (day: string) => [err(day), err(day)];
  const clean = (day: string, n = 1) => Array.from({ length: n }, () => ev({ ...offer, day, firstTry: true }));
  const track = (s: ReturnType<typeof createStore>) => s.get().growth.errors['schriftlich.addition']['add.no-carry'];

  it('the error in 2 tasks, then the next 5 tasks offering it first-try correct, on a later day → overcome', () => {
    const { s, outs } = play([...errTwice(D1), ...clean(D2, OVERCOME_RUN)]);
    expect(growthOf(outs)).toEqual([{ kind: 'fehler', skillId: 'schriftlich.addition', stufe: 2, tag: 'add.no-carry', run: 5 }]);
    expect(growthOf(outs.slice(0, -1))).toEqual([]); // only on the 5th task
    expect(track(s)).toEqual({ day: D1, seen: ERROR_MIN_SEEN, run: 5, done: D2 });
    expect(badgeIds(outs)).toContain('fehler-ueberwunden');
  });

  it('anti-farming: one copied wrong answer (a single slip) is not an error to overcome', () => {
    const { s, outs } = play([err(D1), ...clean(D2, 10)]);
    expect(growthOf(outs)).toEqual([]);
    expect(track(s)).toEqual({ day: D1, seen: 1, run: 0 });
    expect(badgeIds(outs)).not.toContain('fehler-ueberwunden');
  });

  it('anti-farming: 5 clean tasks on the same day as the error are not enough; the next one on a later day is', () => {
    const { s, outs } = play([...errTwice(D1), ...clean(D1, 8)]);
    expect(growthOf(outs)).toEqual([]);
    expect(badgeIds(outs)).not.toContain('fehler-ueberwunden');
    expect(track(s).run).toBe(OVERCOME_RUN);
    const later = s.recordAnswer(clean(D2)[0]);
    expect(later.growth.map((g) => g.kind)).toEqual(['fehler']);
  });

  it('another wrong attempt breaks the run; help alone neither counts nor breaks it; the error itself starts over', () => {
    const tipp = ev({ ...offer, day: D2, firstTry: false, solved: true, usedHint: true, wrongAttempt: false });
    const other = ev({ ...offer, day: D2, firstTry: false, solved: true, wrongAttempt: true });
    const { s, outs } = play([...errTwice(D1), ...clean(D2, 3), tipp, ...clean(D2, 1)]);
    expect(track(s).run).toBe(4);
    s.recordAnswer(other);
    expect(track(s).run).toBe(0);
    play(clean(D2, 4), s);
    expect(growthOf(outs)).toEqual([]);
    // the same error again on D5: day moves on, so the clean run must end after D5
    s.recordAnswer(err(D5));
    expect(track(s)).toEqual({ day: D5, seen: 2, run: 0 });
    expect(play(clean(D5, 6), s).outs.flatMap((o) => o.growth).filter((g) => g.kind === 'fehler')).toEqual([]);
  });

  it('anti-farming: a Tipp or "So geht\'s" answer on the later day never completes it (only a first-try task does)', () => {
    const tipp = ev({ ...offer, day: D2, firstTry: false, solved: true, usedHint: true, wrongAttempt: false });
    const { s, outs } = play([...errTwice(D1), ...clean(D1, 5), tipp]);
    expect(growthOf(outs)).toEqual([]);
    expect(badgeIds(outs)).not.toContain('fehler-ueberwunden');
    expect(track(s)).toEqual({ day: D1, seen: 2, run: 5 });
    expect(s.recordAnswer(clean(D2)[0]).growth.map((g) => g.kind)).toEqual(['fehler']);
  });

  it('the Einmaleins trainer is left to kind 5 (every fact offers the same family, so any easy fact would count)', () => {
    const fact = (factKey: string, day: string, extra: Partial<AnswerEvent> = {}) =>
      ev({ skillId: 'kopfrechnen.einmaleins', topicId: 'kopfrechnen', stufe: 1, factKey, day, bugTags: ['einmaleins'], ...extra });
    const { s, outs } = play([
      fact('6x7', D1, { firstTry: false, bugIds: ['einmaleins'] }),
      fact('6x8', D1, { firstTry: false, bugIds: ['einmaleins'] }),
      ...['2x10', '3x10', '4x10', '5x10', '1x7', '2x2'].map((k) => fact(k, D2)),
    ]);
    expect(s.get().growth.errors).toEqual({});
    expect(growthOf(outs).filter((g) => g.kind === 'fehler')).toEqual([]);
  });

  it('only tasks that offer the error count, and only in the same skill', () => {
    const other = ev({ ...offer, bugTags: ['add.misaligned'], day: D2 });
    const otherSkill = ev({ skillId: 'schriftlich.subtraktion', topicId: 'schriftlich', stufe: 2, bugTags: ['add.no-carry'], day: D2 });
    const { s, outs } = play([...errTwice(D1), ...Array(5).fill(other), ...Array(5).fill(otherSkill)]);
    expect(growthOf(outs)).toEqual([]);
    expect(track(s).run).toBe(0);
    expect(s.get().growth.errors['schriftlich.subtraktion']).toBeUndefined();
  });

  it('counts across Stufen of the skill and across purposes (mixed, twin, review)', () => {
    const tasks = [
      ev({ ...offer, stufe: 1, day: D2 }),
      ev({ ...offer, stufe: 3, day: D2, purpose: 'mixed' }),
      ev({ ...offer, day: D2, purpose: 'twin' }),
      ev({ ...offer, day: D2, purpose: 'review' }),
      ev({ ...offer, day: D2 }),
    ];
    expect(growthOf(play([...errTwice(D1), ...tasks]).outs).map((g) => g.kind)).toEqual(['fehler']);
  });

  it('a mistake on the 2nd attempt counts as well (up to 2 known mistakes per task)', () => {
    const both = ev({ ...offer, day: D1, firstTry: false, solved: false, bugIds: ['add.misaligned', 'add.no-carry'] });
    const { s } = play([both, both]);
    expect(Object.keys(s.get().growth.errors['schriftlich.addition']).sort()).toEqual(['add.misaligned', 'add.no-carry']);
    expect(track(s).seen).toBe(2);
  });

  it('an index segment does not split one misconception into several', () => {
    const dz = { skillId: 'daten.strichlisten', topicId: 'daten' as const, stufe: 1 as const, bugTags: ['zeile-0-vergessen', 'zeile-2-vergessen'] };
    const outs = play([
      ev({ ...dz, day: D1, firstTry: false, bugIds: ['zeile-2-vergessen'] }),
      ev({ ...dz, day: D1, firstTry: false, bugIds: ['zeile-0-vergessen'] }),
      ...Array.from({ length: 5 }, () => ev({ ...dz, bugTags: ['zeile-1-vergessen'], day: D2 })),
    ]).outs;
    expect(growthOf(outs)).toEqual([{ kind: 'fehler', skillId: 'daten.strichlisten', stufe: 1, tag: 'zeile-vergessen', run: 5 }]);
  });

  it('overcome stays overcome: a relapse and a new run give no second note and no second badge', () => {
    const { s, outs } = play([...errTwice(D1), ...clean(D2, 5), ...errTwice(D2), ...clean('2026-10-21', 5)]);
    expect(growthOf(outs).map((g) => g.kind)).toEqual(['fehler']);
    expect(badgeIds(outs).filter((b) => b === 'fehler-ueberwunden')).toHaveLength(1);
    expect(track(s).done).toBe(D2);
  });

  it(`keeps at most ${MAX_TAGS_PER_SKILL} tags per skill: open ones with the oldest error go, overcome ones stay`, () => {
    const { s } = play([...errTwice(D1), ...clean(D2, 5)]);
    for (let i = 0; i < MAX_TAGS_PER_SKILL + 3; i++) s.recordAnswer(ev({ ...offer, day: addDays(D2, i), firstTry: false, bugIds: [`fehler${String.fromCharCode(97 + i)}`] }));
    const tags = Object.keys(s.get().growth.errors['schriftlich.addition']);
    expect(tags).toHaveLength(MAX_TAGS_PER_SKILL);
    expect(tags).toContain('add.no-carry');
    expect(tags).not.toContain('fehlera');
    expect(tags).toContain(`fehler${String.fromCharCode(97 + MAX_TAGS_PER_SKILL + 2)}`);
  });

  it('a skill without bugs never tracks anything; tags never find inherited object keys', () => {
    const { s } = play([ev({ day: D1, firstTry: false }), ...pattern('xxxxx', D2)]);
    expect(s.get().growth.errors).toEqual({});
    const odd = play([ev({ day: D2, bugTags: ['constructor', 'toString'] })]).s;
    expect(odd.get().growth.errors).toEqual({});
  });
});

// ─── 4. Skill improved ──────────────────────────────────────────────────────

describe('kind 4: skill improved (first 10 vs last 10, or a new level after a hard start)', () => {
  it('a hard start, then clearly better on a later day → besser (window variant)', () => {
    // D1: 4 of 10 first try, ending with misses; D2: 8 of 10 without ever reaching 'sicher'
    const { s, outs } = play([...pattern('xxxx......', D1), ...pattern('xxxxx.xx.x', D2)]);
    const events = growthOf(outs);
    expect(events).toEqual([{ kind: 'besser', skillId: 'zahlen.runden', stufe: 1, early: 4, recent: 8 }]);
    expect(growthOf(outs.slice(0, -1))).toEqual([]); // only when the windows no longer overlap
    expect(s.get().skills['zahlen.runden#1'].state).toBe('geuebt');
    expect(s.get().growth.stufen['zahlen.runden#1']).toEqual({ earlyN: 10, earlyOk: 4, earlyWrong: 6, earlyDay: D1, after: 10, best: 8, laterOk: 3, miss: D2, improved: true });
    expect(badgeIds(outs)).toContain('besser-geworden');
  });

  it('a gain to 7 of 10 is shown on the progress page but is not yet "besser" (that needs the Sicher level, 8)', () => {
    const { s, outs } = play([...pattern('xxxx......', D1), ...pattern('xxx.xxx.x.', D2)]);
    expect(growthOf(outs)).toEqual([]);
    expect(growthView(s.get(), 'zahlen.runden')?.stufen[0].window).toEqual({ early: 4, best: 7 });
  });

  it('a hard start, then Sicher on a later day → besser (level variant)', () => {
    const outs = play([...pattern('......xxxx', D1), ...pattern('xxxx', D2)]).outs;
    expect(growthOf(outs)).toEqual([{ kind: 'besser', skillId: 'zahlen.runden', stufe: 1, early: 4, level: 'sicher' }]);
  });

  it("'Sicher' on the day of the hard start counts once later days confirm it with first-try answers (reviews too)", () => {
    const { s, outs } = play([...pattern('....xxxxxx', D1), ...pattern('xxxx', D1)]);
    expect(s.get().skills['zahlen.runden#1'].state).toBe('sicher');
    expect(growthOf(outs)).toEqual([]);
    expect(s.recordAnswer(ev({ day: D2, purpose: 'review' })).growth).toEqual([]);
    expect(s.recordAnswer(ev({ day: D2 })).growth).toEqual([]);
    const out = s.recordAnswer(ev({ day: D5, purpose: 'review' }));
    // the same review also shows a lasting improvement: the misses of D1 were real
    expect(out.growth).toEqual([
      { kind: 'besser', skillId: 'zahlen.runden', stufe: 1, early: 6, level: 'sicher' },
      { kind: 'behalten', skillId: 'zahlen.runden', stufe: 1, days: 4 },
    ]);
  });

  it('anti-farming: misses on purpose and a same-day recovery are never confirmed by a wrong or help-only answer later', () => {
    for (const later of [
      ev({ day: D2, firstTry: false, solved: true }), // wrong in practice
      ev({ day: D2, purpose: 'review', firstTry: false }), // wrong in a review
      ev({ day: D2, firstTry: false, solved: true, usedHint: true, wrongAttempt: false }), // help only
    ]) {
      const { s, outs } = play([...pattern('..........', D1), ...pattern('xxxxxxxxx.', D1)]);
      outs.push(s.recordAnswer(later), s.recordAnswer(later), s.recordAnswer(later));
      expect(growthOf(outs), JSON.stringify(later)).toEqual([]);
      expect(badgeIds(outs)).not.toContain('besser-geworden');
    }
  });

  it('a decline is never shown as an improvement: with Sicher but fewer than at the start, only the level is named', () => {
    // D1: 6 of 10 with 4 misses, then Sicher, then 2 misses; D2: 4 misses, then first-try answers on later days
    const { s, outs } = play([...pattern('....xxxxxx', D1), ...pattern('xxxxxxxx..', D1), ...pattern('....', D2)]);
    outs.push(...play([ev({ day: D2 }), ev({ day: D5, purpose: 'review' }), ev({ day: D5, purpose: 'review' })], s).outs);
    const besser = growthOf(outs).filter((g) => g.kind === 'besser');
    expect(besser).toEqual([{ kind: 'besser', skillId: 'zahlen.runden', stufe: 1, early: 6, level: 'sicher' }]);
  });

  it('anti-farming: pressing Tipp before every task is no hard start (help is not a mistake)', () => {
    const tipps = Array.from({ length: 10 }, () => ev({ day: D1, firstTry: false, solved: true, usedHint: true }));
    const { s, outs } = play([...tipps, ...pattern('xxxxxxxxxx', D2)]);
    expect(s.get().growth.stufen['zahlen.runden#1']).toMatchObject({ earlyN: 10, earlyOk: 0, earlyWrong: 0, after: 10 });
    expect(growthOf(outs)).toEqual([]);
    expect(badgeIds(outs)).not.toContain('besser-geworden');
  });

  it('anti-farming: misses on purpose and then right answers on the same day earn nothing', () => {
    const { s, outs } = play([...pattern('..........', D1), ...pattern('xxxxxxxxxx', D1)]);
    expect(growthOf(outs)).toEqual([]);
    expect(badgeIds(outs)).not.toContain('besser-geworden');
    expect(s.get().growth.stufen['zahlen.runden#1'].improved).toBeUndefined();
  });

  it('a clear rise without a low start counts too (7 → 10 of 10 after 3 real mistakes)', () => {
    const start = 'x'.repeat(HARD_START_MAX + 1) + '...';
    const outs = play([...pattern(start, D1), ...pattern('xxxxxxxxxx', D2)]).outs;
    expect(growthOf(outs)).toEqual([{ kind: 'besser', skillId: 'zahlen.runden', stufe: 1, early: 7, recent: 10 }]);
  });

  it('a good start → never (correct answers stay rewarded by stars only); help alone is no start to improve on', () => {
    expect(growthOf(play([...pattern('xxxxxxxxx.', D1), ...pattern('xxxxxxxxxx', D2), ...pattern('xxxxxxxxxx', D5)]).outs)).toEqual([]);
    const tipps = Array.from({ length: 3 }, () => ev({ day: D1, firstTry: false, solved: true, usedHint: true, wrongAttempt: false }));
    expect(growthOf(play([...tipps, ...pattern('xxxxxxx', D1), ...pattern('xxxxxxxxxx', D2)]).outs)).toEqual([]);
  });

  it('a gain of 3 that ends below 8 of 10 is not "besser" yet', () => {
    const outs = play([...pattern('xxx.......', D1), ...pattern('xxx..x.x.x', D2)]).outs; // 3 → 6
    expect(growthOf(outs)).toEqual([]);
  });

  it('is detected once per skill-Stufe', () => {
    const outs = play([...pattern('xxxx......', D1), ...pattern('xxx.xxx.x.', D2), ...pattern('xxxxxxxxxx', D5)]).outs;
    expect(growthOf(outs).filter((g) => g.kind === 'besser')).toHaveLength(1);
  });

  it('review and Blitz answers do not feed the windows', () => {
    const s = createStore(null);
    play(pattern('xxxx......', D1), s);
    for (let i = 0; i < 12; i++) s.recordAnswer(ev({ day: D2, purpose: 'review' }));
    s.recordAnswer(ev({ day: D2, purpose: 'blitz' }));
    expect(s.get().growth.stufen['zahlen.runden#1'].after).toBe(0);
  });

  it('a clock that went back (an earlier day) is not a later day', () => {
    const outs = play([...pattern('xxxx......', D2), ...pattern('xxx.xxx.x.', D1)]).outs;
    expect(growthOf(outs)).toEqual([]);
  });
});

// ─── 5. Lasting improvement ─────────────────────────────────────────────────

describe('kind 5: lasting improvement in a spaced review', () => {
  /** A child that missed on D1, then made the Stufe 'sicher' (so it gets reviewed). */
  function missedThenSicher() {
    return play([...pattern('.', D1), ...pattern('xxxxxxxxxx', D1)]);
  }

  it('a once-missed task type solved first try in a review ≥ 3 days later → behalten, the miss is cleared', () => {
    const { s } = missedThenSicher();
    expect(s.get().skills['zahlen.runden#1'].state).toBe('sicher');
    const out = s.recordAnswer(ev({ day: '2026-10-22', purpose: 'review' }));
    expect(out.growth).toEqual([{ kind: 'behalten', skillId: 'zahlen.runden', stufe: 1, days: 3 }]);
    expect(out.newBadges.map((b) => b.id)).toContain('behalten');
    expect(s.get().growth.stufen['zahlen.runden#1']).toMatchObject({ kept: 1 });
    expect(s.get().growth.stufen['zahlen.runden#1'].miss).toBeUndefined();
    // the next review needs a new miss first
    expect(s.recordAnswer(ev({ day: '2026-10-30', purpose: 'review' })).growth).toEqual([]);
  });

  it('too soon, outside a review, or wrong in the review → nothing (a wrong review answer is the new miss)', () => {
    const { s } = missedThenSicher();
    expect(s.recordAnswer(ev({ day: D2, purpose: 'review' })).growth).toEqual([]); // 1 day later
    expect(s.recordAnswer(ev({ day: '2026-10-25', purpose: 'practice' })).growth).toEqual([]); // not a review
    expect(s.recordAnswer(ev({ day: '2026-10-25', purpose: 'mixed' })).growth).toEqual([]);
    s.recordAnswer(ev({ day: '2026-10-25', purpose: 'review', firstTry: false }));
    expect(s.get().growth.stufen['zahlen.runden#1'].miss).toBe('2026-10-25');
    expect(s.recordAnswer(ev({ day: '2026-10-27', purpose: 'review' })).growth).toEqual([]);
    expect(s.recordAnswer(ev({ day: '2026-10-28', purpose: 'review' })).growth.map((g) => g.kind)).toEqual(['behalten']);
  });

  it('anti-farming: Tipp (or a slip) in a practice round on a Stufe that is already Sicher arms nothing', () => {
    const { s } = play(pattern('xxxxxxxxxx', D1));
    s.recordAnswer(ev({ day: D2, firstTry: false, solved: true, usedHint: true, wrongAttempt: false }));
    s.recordAnswer(ev({ day: D2, firstTry: false, solved: true, wrongAttempt: true })); // costs nothing at 'sicher'
    expect(s.get().growth.stufen['zahlen.runden#1'].miss).toBeUndefined();
    const out = s.recordAnswer(ev({ day: D5, purpose: 'review' }));
    expect(out.growth).toEqual([]);
    expect(out.newBadges.map((b) => b.id)).not.toContain('behalten');
  });

  it('a wrong answer that cost something arms it: a review miss, or a mixed miss that lowered the Leitner box', () => {
    const { s } = play(pattern('xxxxxxxxxx', D1)); // Sicher on D1: box 1, due D2
    // a mixed miss at box 1 costs nothing (the box stays 1, the next review stays due): it arms nothing
    s.recordAnswer(ev({ day: D1, purpose: 'mixed', firstTry: false }));
    expect(s.get().growth.stufen['zahlen.runden#1'].miss).toBeUndefined();
    s.recordAnswer(ev({ day: D2, purpose: 'review' })); // box 2
    s.recordAnswer(ev({ day: D2, purpose: 'mixed', firstTry: false })); // back to box 1: arms
    expect(s.get().growth.stufen['zahlen.runden#1'].miss).toBe(D2);
    expect(s.recordAnswer(ev({ day: D5, purpose: 'review' })).growth.map((g) => g.kind)).toEqual(['behalten']);
    // a review miss arms it as well
    s.recordAnswer(ev({ day: '2026-10-24', purpose: 'review', firstTry: false }));
    expect(s.get().growth.stufen['zahlen.runden#1'].miss).toBe('2026-10-24');
  });

  it('a review never missed before is no improvement (first-time correctness keeps its stars, no badge)', () => {
    const { s } = play(pattern('xxxxxxxxxx', D1));
    const out = s.recordAnswer(ev({ day: D5, purpose: 'review' }));
    expect(out.growth).toEqual([]);
    expect(out.newBadges.map((b) => b.id)).not.toContain('behalten');
  });

  it('Einmaleins: the task type is the fact, not the whole trainer', () => {
    const fact = (factKey: string, day: string, extra: Partial<AnswerEvent> = {}) =>
      ev({ skillId: 'kopfrechnen.einmaleins', topicId: 'kopfrechnen', stufe: 1, factKey, day, ...extra });
    const s = createStore(null);
    // a brand-new fact (box 0) missed costs nothing (it stays in box 0): nothing armed
    s.recordAnswer(fact('7x3', D1, { firstTry: false }));
    expect(s.get().growth.facts).toEqual({});
    s.recordAnswer(fact('3x7', D1)); // box 1
    s.recordAnswer(fact('7x3', D1, { firstTry: false })); // lost its box: armed
    expect(s.get().growth.facts).toEqual({ '3x7': D1 });
    expect(s.get().growth.stufen['kopfrechnen.einmaleins#1'].miss).toBeUndefined();
    expect(s.recordAnswer(fact('4x6', '2026-10-22', { purpose: 'review' })).growth).toEqual([]);
    const out = s.recordAnswer(fact('3x7', '2026-10-22', { purpose: 'review' }));
    expect(out.growth).toEqual([{ kind: 'behalten', skillId: 'kopfrechnen.einmaleins', stufe: 1, days: 3, factKey: '3x7' }]);
    expect(s.get().growth.facts).toEqual({});
  });

  it('"Vieles behalten" (the largest badge) needs lasting improvements in three different topics', () => {
    const s = createStore(null);
    // two skills of one topic count once
    const skills = ['zahlen.runden', 'zahlen.stellenwert', 'geometrie.flaeche', 'daten.diagramme'] as const;
    const earned: string[] = [];
    skills.forEach((skillId, i) => {
      const topicId = skillId.split('.')[0] as 'zahlen' | 'geometrie' | 'daten';
      play([ev({ skillId, topicId, day: D1, firstTry: false }), ...Array.from({ length: 10 }, () => ev({ skillId, topicId, day: D1 }))], s);
      const out = s.recordAnswer(ev({ skillId, topicId, day: '2026-10-22', purpose: 'review' }));
      earned.push(...out.newBadges.map((b) => b.id));
      if (i < 3) expect(earned).not.toContain('vieles-behalten');
    });
    expect(earned).toEqual(['behalten', 'vieles-behalten']);
    expect(growthFacts(s.get())).toMatchObject({ kept: 4, keptTopics: 3 });
  });

  it('NRW extras are noted but never earn an improvement badge, not even at the end of the round', () => {
    const o = { skillId: 'zahlen.binaer', optional: true };
    const { s } = play([ev({ ...o, day: D1, firstTry: false }), ...Array.from({ length: 10 }, () => ev({ ...o, day: D1 }))]);
    const out = s.recordAnswer(ev({ ...o, day: '2026-10-22', purpose: 'review' }));
    expect(out.growth.map((g) => g.kind)).toEqual(['behalten']);
    expect(out.newBadges).toEqual([]);
    expect(growthFacts(s.get()).kept).toBe(0);
    // recordRound evaluates all badges over the whole state: still nothing
    expect(s.recordRound({ day: '2026-10-22', answered: 1, firstTry: 1 })).toEqual([]);
    expect(Object.keys(s.get().badges).filter((id) => ['behalten', 'lange-behalten'].includes(id))).toEqual([]);
  });

  it('importing a backup replaces the improvement tracking as a whole (nothing piles up)', () => {
    const { s } = play([ev({ day: D1, firstTry: false, bugTags: ['abrunden'], bugIds: ['abrunden'] })]);
    const backup = createStore(null);
    backup.recordAnswer(ev({ skillId: 'geometrie.flaeche', topicId: 'geometrie', day: D1 }));
    expect(s.importJson(backup.exportJson())).toEqual({ ok: true });
    expect(s.get().growth).toEqual(backup.get().growth);
    expect(s.get().growth.errors).toEqual({});
  });
});

// ─── Purity and data ────────────────────────────────────────────────────────

describe('applyGrowth', () => {
  it('is pure and leaves the input states untouched', () => {
    const s0 = emptyState();
    const frozen = JSON.stringify(s0);
    const r = answer(s0, ev({ firstTry: false, bugTags: ['a'], bugIds: ['a'] }));
    expect(JSON.stringify(s0)).toBe(frozen);
    expect(r.state.growth.stufen['zahlen.runden#1']).toEqual({ earlyN: 1, earlyOk: 0, earlyWrong: 1, after: 0, miss: D1 });
    expect(r.state.growth.errors['zahlen.runden']).toEqual({ a: { day: D1, seen: 1, run: 0 } });
  });

  it('ignores Blitz answers and malformed skill keys', () => {
    const s0 = emptyState();
    expect(answer(s0, ev({ purpose: 'blitz' })).state.growth).toBe(s0.growth);
    expect(answer(s0, ev({ skillId: 'unbekannt.x' })).state.growth).toBe(s0.growth);
  });

  it('stores only flags, counts, days and tags (no free text, no ids, no times)', () => {
    const { s } = play([err(), ...pattern('xxxx......', D1), ev({ day: D2, factKey: '3x7', firstTry: false, skillId: 'kopfrechnen.einmaleins', topicId: 'kopfrechnen' })]);
    const text = JSON.stringify(s.get().growth);
    expect(text).not.toMatch(/T\d\d:|\d{10,}/);
    expect(text.length).toBeLessThan(600);
    function err() {
      return ev({ day: D1, firstTry: false, bugTags: ['abrunden'], bugIds: ['abrunden'] });
    }
  });
});

// ─── Round notes ────────────────────────────────────────────────────────────

describe('roundNotes', () => {
  const item = (purpose: 'practice' | 'twin', firstTry: boolean, secondTry = false) => ({ purpose, firstTry, secondTry });
  const fehler: GrowthEvent = { kind: 'fehler', skillId: 's.a', stufe: 1, tag: 't', run: 5 };
  const besser: GrowthEvent = { kind: 'besser', skillId: 's.a', stufe: 1, early: 4, recent: 8 };
  const behalten: GrowthEvent = { kind: 'behalten', skillId: 's.b', stufe: 2, days: 4 };

  it('larger improvements first, then one line each for twins and 2nd tries', () => {
    const notes = roundNotes([item('practice', false, true), item('practice', false, true), item('twin', true)], [fehler, besser, behalten]);
    expect(notes.map((n) => n.kind)).toEqual(['behalten', 'besser', 'fehler', 'zwilling']);
    expect(notes).toHaveLength(MAX_ROUND_NOTES);
  });

  it('aggregates the small ones and caps them (wrong answers on purpose cannot fill the summary)', () => {
    const many = Array.from({ length: 10 }, () => item('practice', false, true));
    expect(roundNotes([...many, item('twin', true), item('twin', false)], [])).toEqual([
      { kind: 'zwilling', count: 1 },
      { kind: 'selbst', count: 10 },
    ]);
  });

  it('several kept Einmaleins facts make one line, below a kept skill-Stufe and a skill improvement', () => {
    const fact = (factKey: string, days: number): GrowthEvent => ({ kind: 'behalten', skillId: 'kopfrechnen.einmaleins', stufe: 1, days, factKey });
    expect(roundNotes([], [fact('3x7', 5), fact('4x6', 3), fact('6x8', 9), fehler, besser, behalten])).toEqual([
      behalten,
      besser,
      { kind: 'fakten', count: 3, days: 3 },
      fehler,
    ]);
    expect(roundNotes([], [fact('3x7', 5), besser]).map((n) => n.kind)).toEqual(['besser', 'behalten']);
  });

  it('each improvement once; nothing for a round without improvement', () => {
    expect(roundNotes([], [fehler, { ...fehler }])).toEqual([fehler]);
    expect(roundNotes([item('practice', true), item('twin', false)], [])).toEqual([]);
  });
});

// ─── Progress view ──────────────────────────────────────────────────────────

describe('growthView', () => {
  it('shows a gain of ≥ 2 between the first and the last 10, never a decline', () => {
    const up = play([...pattern('xxxx......', D1), ...pattern('xxxxx.x...', D2)]).s.get(); // 4 → 6
    expect(growthView(up, 'zahlen.runden')).toEqual({ stufen: [{ stufe: 1, window: { early: 4, best: 6 }, kept: 0 }], overcome: [] });
    const down = play([...pattern('xxxxxx....', D1), ...pattern('xxx.......', D2)]).s.get();
    expect(growthView(down, 'zahlen.runden')).toBeNull();
    expect(growthView(emptyState(), 'zahlen.runden')).toBeNull();
  });

  it('shows a new level after a hard start, lasting improvements and overcome errors', () => {
    const offer = { bugTags: ['abrunden'] };
    const { s } = play([
      ev({ ...offer, day: D1, firstTry: false, bugIds: ['abrunden'] }),
      ev({ ...offer, day: D1, firstTry: false, bugIds: ['abrunden'] }),
      ...pattern('....xxxx', D1, offer),
      ...pattern('xxxxxx', D2, offer),
      ev({ day: '2026-10-25', purpose: 'review' }),
    ]);
    expect(growthView(s.get(), 'zahlen.runden')).toEqual({
      stufen: [{ stufe: 1, level: 'sicher', early: 4, kept: 1 }],
      overcome: ['abrunden'],
    });
  });
});

// ─── Invariants under random play ───────────────────────────────────────────

describe('random play keeps the tracking valid, bounded and loadable', () => {
  it('after every answer: caps hold, the state survives a save/load round trip, badges come once', async () => {
    const { createRng } = await import('../core/rng');
    const { parseText, serializeState } = await import('./schema');
    const skills = [
      { skillId: 'schriftlich.addition', topicId: 'schriftlich' as const, tags: ['add.no-carry', 'add.misaligned', 'rechenart-+'] },
      { skillId: 'zahlen.runden', topicId: 'zahlen' as const, tags: ['abgerundet', 'aufgerundet', 'unveraendert'] },
      { skillId: 'kopfrechnen.einmaleins', topicId: 'kopfrechnen' as const, tags: ['eine-reihe-mehr'] },
      { skillId: 'zahlen.binaer', topicId: 'zahlen' as const, tags: ['eins-dazu'], optional: true },
    ];
    const purposes = ['practice', 'practice', 'mixed', 'twin', 'review', 'blitz'] as const;
    for (const seed of [1, 2, 3, 4, 5]) {
      const rng = createRng(seed);
      const s = createStore(null);
      let day = '2026-10-01';
      const earned: string[] = [];
      for (let i = 0; i < 400; i++) {
        if (rng.chance(0.08)) day = addDays(day, rng.int(1, 4));
        const sk = rng.pick(skills);
        const firstTry = rng.chance(0.65);
        const usedHint = !firstTry && rng.chance(0.3);
        const solved = firstTry || rng.chance(0.7);
        const out = s.recordAnswer(
          ev({
            ...sk,
            stufe: rng.pick([1, 2, 3] as const),
            purpose: rng.pick(purposes),
            day,
            firstTry,
            usedHint,
            solved,
            wrongAttempt: !firstTry && (!usedHint || !solved),
            bugTags: rng.sample(sk.tags, rng.int(0, sk.tags.length)),
            bugIds: !firstTry && rng.chance(0.5) ? [rng.pick(sk.tags)] : undefined,
            factKey: sk.skillId === 'kopfrechnen.einmaleins' ? rng.pick(['3x7', '4x6', '6x8']) : undefined,
          }),
        );
        earned.push(...out.newBadges.map((b) => b.id));
        const st = s.get();
        for (const g of Object.values(st.growth.stufen)) {
          expect(g.earlyN).toBeLessThanOrEqual(10);
          expect(g.after).toBeLessThanOrEqual(10);
          expect(g.earlyOk).toBeLessThanOrEqual(g.earlyN);
          expect(g.earlyWrong).toBeLessThanOrEqual(g.earlyN);
          expect(g.best ?? 0).toBeLessThanOrEqual(10);
          if (g.earlyDay) expect(g.earlyN).toBe(10);
        }
        for (const tracks of Object.values(st.growth.errors)) {
          expect(Object.keys(tracks).length).toBeLessThanOrEqual(MAX_TAGS_PER_SKILL);
          for (const t of Object.values(tracks)) {
            expect(t.run).toBeLessThanOrEqual(OVERCOME_RUN);
            expect(t.seen).toBeLessThanOrEqual(ERROR_MIN_SEEN);
            // overcome only on a later day than the error, and an overcome error never moves again
            if (t.done) expect(t.done > t.day).toBe(true);
          }
        }
        for (const e of out.growth) {
          // NRW extras never produce a badge; growth events never come from Blitz answers
          if (e.skillId === 'zahlen.binaer') expect(out.newBadges.filter((b) => b.improvement)).toEqual([]);
        }
        if (i % 50 === 49) {
          const r = parseText(serializeState(st));
          expect(r.ok, `seed ${seed}, step ${i}`).toBe(true);
          if (r.ok) expect(r.state.growth).toEqual(st.growth);
        }
      }
      expect(new Set(earned).size).toBe(earned.length);
    }
  });
});

describe('robustness: shown progress never shrinks, clocks, caps, orphans', () => {
  it('the progress line keeps its best: a weaker round later never lowers or removes it (nothing can be lost)', () => {
    const { s } = play([...pattern('xxxx......', D1), ...pattern('xxxxxxx...', D2)]); // 4 → 7
    expect(growthView(s.get(), 'zahlen.runden')?.stufen[0].window).toEqual({ early: 4, best: 7 });
    play(pattern('..........', D5), s); // a mixed-up day
    expect(growthView(s.get(), 'zahlen.runden')?.stufen[0].window).toEqual({ early: 4, best: 7 });
  });

  it('a device clock that was ahead once does not block detection for months', () => {
    const future = '2027-03-01';
    const { s } = play([ev({ day: future, firstTry: false }), ...pattern('xxxxxxxxxx', D1)]);
    // the stored miss is clamped to the answer's day …
    expect(s.get().growth.stufen['zahlen.runden#1'].miss).toBe(D1);
    // … so a review 3 days later counts again (never overstated: the true day is on or before it)
    expect(s.recordAnswer(ev({ day: '2026-10-22', purpose: 'review' })).growth.map((g) => g.kind)).toEqual(['behalten']);
    // an error day in the future does not block "overcome" either
    const offer = { skillId: 'schriftlich.addition', topicId: 'schriftlich' as const, stufe: 2 as const, bugTags: ['uebertrag'] };
    const t = play([ev({ ...offer, day: future, firstTry: false, bugIds: ['uebertrag'] }), ev({ ...offer, day: future, firstTry: false, bugIds: ['uebertrag'] })]).s;
    play(Array.from({ length: 4 }, () => ev({ ...offer, day: D1 })), t);
    expect(t.recordAnswer(ev({ ...offer, day: D2 })).growth.map((g) => g.kind)).toEqual(['fehler']);
  });

  it('a fact missed with the clock ahead is clamped and saved, so its review counts after the clock is right', () => {
    const fact = (day: string, extra: Partial<AnswerEvent> = {}) => ev({ skillId: 'kopfrechnen.einmaleins', topicId: 'kopfrechnen', factKey: '3x7', day, ...extra });
    const s = createStore(null);
    s.recordAnswer(fact(D1)); // box 1
    s.recordAnswer(fact('2027-03-01', { firstTry: false })); // clock ahead: armed on 2027-03-01
    s.recordAnswer(ev({ day: D1 })); // clock right again (another skill)
    s.recordAnswer(fact(D1, { purpose: 'review' }));
    expect(s.get().growth.facts['3x7']).toBe(D1);
    expect(s.recordAnswer(fact('2026-10-22', { purpose: 'review' })).growth.map((g) => g.kind)).toEqual(['behalten']);
  });

  it('a clock that is behind for one answer moves no stored day back and opens no later-day gate', () => {
    const { s } = play([...pattern('.', D1), ...pattern('xxxxxxxxxx', D2), ...pattern('x', D5)]);
    const before = s.get().growth;
    // the tablet clock shows 2000-01-01 for one answer (practice days D1, D2 and D5 lie after it)
    s.recordAnswer(ev({ day: '2000-01-01', firstTry: false }));
    expect(s.get().growth).toEqual(before);
    expect(s.recordAnswer(ev({ day: '2026-10-24', purpose: 'review' })).growth.map((g) => g.kind)).toEqual(['behalten']);
  });

  it('when the cap is reached, single slips go first and an almost overcome error stays', () => {
    const tracks: Record<string, import('./types').ErrorTrack> = {
      nearly: { day: '2026-10-01', seen: 2, run: 4 },
      fresh: { day: '2026-10-20', seen: 2, run: 0 },
      done: { day: '2026-09-01', seen: 2, run: 5, done: '2026-09-05' },
    };
    for (let i = 0; i < MAX_TAGS_PER_SKILL; i++) tracks[`slip${'abcdefghijklm'[i]}`] = { day: `2026-10-${10 + i}`, seen: 1, run: 0 };
    const kept = Object.keys(capTracks(tracks, ['slipa']));
    expect(kept).toHaveLength(MAX_TAGS_PER_SKILL);
    for (const k of ['nearly', 'fresh', 'done', 'slipa']) expect(kept, k).toContain(k);
    // of the other slips, the newest stay
    expect(kept).toContain(`slip${'abcdefghijklm'[MAX_TAGS_PER_SKILL - 1]}`);
    expect(kept).not.toContain('slipb');
  });

  it('tracking without a skill entry (e.g. from an edited file) never earns a badge', () => {
    const s0 = emptyState();
    const orphan: ProgressState = {
      ...s0,
      growth: {
        stufen: { 'zahlen.runden#1': { earlyN: 10, earlyOk: 2, earlyWrong: 8, after: 10, improved: true, kept: 3 } },
        errors: { 'zahlen.runden': { x: { day: D1, seen: 2, run: 5, done: D2 } } },
        facts: {},
      },
    };
    expect(growthFacts(orphan)).toEqual({ overcome: 0, improved: 0, kept: 0, keptTopics: 0 });
  });

  it('seedGrowth: Geübt Stufen keep their misses, Sicher ones get a closed window, carried when not the real start', () => {
    const g = seedGrowth({
      'zahlen.runden#1': { attempts: 14, recent: [false, false, false, true, true, true, false, true, true, false], practiceDays: 2, state: 'geuebt', box: 0, checks: [], last: '2026-10-15' },
      'zahlen.runden#2': { attempts: 3, recent: [true, true, false], practiceDays: 1, state: 'geuebt', box: 0, checks: [], last: '2026-10-16' },
      'geometrie.umfang#1': { attempts: 12, recent: [true, false, true, true, true, true, true, true, true, true], practiceDays: 2, state: 'sicher', box: 1, checks: [], last: '2026-10-12' },
      'daten.zufall#1': { attempts: 0, recent: [], practiceDays: 0, state: 'neu', box: 0, checks: [] },
    });
    expect(g.stufen).toEqual({
      'zahlen.runden#1': { earlyN: 10, earlyOk: 5, earlyWrong: 5, earlyDay: '2026-10-15', carried: true, after: 0, miss: '2026-10-15', missCarried: true },
      'zahlen.runden#2': { earlyN: 3, earlyOk: 2, earlyWrong: 1, after: 0, miss: '2026-10-16', missCarried: true },
      'geometrie.umfang#1': { earlyN: 10, earlyOk: 9, earlyWrong: 0, earlyDay: '2026-10-12', carried: true, after: 0 },
    });
    expect(g.errors).toEqual({});
    expect(g.facts).toEqual({});
  });
});
