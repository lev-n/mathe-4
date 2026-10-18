import { describe, expect, it } from 'vitest';
import { createRng } from '../core/rng';
import type { Stufe } from '../core/types';
import { addDays } from './dates';
import { applyAnswer } from './mastery';
import { BLITZ_SLOTS, EINMALEINS_SKILL_ID, MAX_TWINS, REVIEW_MAX, ROUND_SIZE, buildRound, mixedStufe } from './round';
import { dueReviews, reviewBudget } from './selectors';
import { emptyState } from './store';
import { entry, skillDef, withFacts, withSkills } from './testkit';
import type { ProgressState, RoundSlot, StufeProgress } from './types';

const DAY = '2026-10-19';
const ZAHLEN = ['zahlen.stellenwert', 'zahlen.zahlwort', 'zahlen.runden', 'zahlen.ordnen', 'zahlen.strahl'].map((id) => skillDef(id));
const SKILLS = [...ZAHLEN, skillDef('zahlen.binaer', true), skillDef('geometrie.umfang'), skillDef('kopfrechnen.einmaleins')];

function noAdjacentRepeats(slots: RoundSlot[]): boolean {
  return slots.every((s, i) => i === 0 || s.skillId !== slots[i - 1].skillId);
}

function counts(slots: RoundSlot[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const s of slots) m.set(s.skillId, (m.get(s.skillId) ?? 0) + 1);
  return m;
}

/** An arrangement without neighbours of the same skill exists iff the largest group ≤ others + 1. */
function separable(slots: RoundSlot[]): boolean {
  const max = Math.max(...counts(slots).values());
  return max <= slots.length - max + 1;
}

describe("plan 'skill'", () => {
  it('gives 10 practice slots of the chosen skill and Stufe', () => {
    const slots = buildRound({ mode: 'skill', skillId: 'zahlen.runden', stufe: 2 }, emptyState(), DAY, createRng(1), SKILLS);
    expect(slots).toHaveLength(ROUND_SIZE);
    expect(slots.every((s) => s.skillId === 'zahlen.runden' && s.stufe === 2 && s.purpose === 'practice')).toBe(true);
    expect(MAX_TWINS).toBe(2);
  });
});

describe("plan 'blitz'", () => {
  it('gives 60 Einmaleins slots on Stufe 1', () => {
    const slots = buildRound({ mode: 'blitz' }, emptyState(), DAY, createRng(1), []);
    expect(slots).toHaveLength(BLITZ_SLOTS);
    expect(slots.every((s) => s.skillId === EINMALEINS_SKILL_ID && s.stufe === 1 && s.purpose === 'blitz')).toBe(true);
  });
});

describe("plan 'mixed'", () => {
  const mixed = (state: ProgressState, seed: number, skills = SKILLS) => buildRound({ mode: 'mixed', topicId: 'zahlen' }, state, DAY, createRng(seed), skills);

  it('new topic: 10 slots spread evenly over the non-optional skills, never the same skill twice in a row', () => {
    for (let seed = 0; seed < 200; seed++) {
      const slots = mixed(emptyState(), seed);
      expect(slots).toHaveLength(10);
      expect(slots.every((s) => s.purpose === 'mixed' && s.stufe === 2)).toBe(true); // new skills: Stufe 2 (C4)
      expect(noAdjacentRepeats(slots)).toBe(true);
      const c = counts(slots);
      expect([...c.keys()].sort()).toEqual(ZAHLEN.map((s) => s.id).sort());
      expect([...c.values()]).toEqual([2, 2, 2, 2, 2]);
    }
  });

  it('prefers practised skills, each at its practised/suggested Stufe', () => {
    const state = withSkills({
      'zahlen.runden#1': entry('sicher'),
      'zahlen.runden#2': entry('geuebt'),
      'zahlen.ordnen#1': entry('geuebt'),
      'zahlen.strahl#1': entry('gemeistert'),
      'geometrie.umfang#1': entry('sicher'),
    });
    for (let seed = 0; seed < 100; seed++) {
      const slots = mixed(state, seed);
      expect(slots).toHaveLength(10);
      expect(noAdjacentRepeats(slots)).toBe(true);
      const c = counts(slots);
      expect([...c.keys()].sort()).toEqual(['zahlen.ordnen', 'zahlen.runden', 'zahlen.strahl']);
      expect(Math.max(...c.values()) - Math.min(...c.values())).toBeLessThanOrEqual(1);
      for (const s of slots) {
        const expected: Record<string, Stufe> = { 'zahlen.runden': 2, 'zahlen.ordnen': 1, 'zahlen.strahl': 1 };
        expect(s.stufe).toBe(expected[s.skillId]);
      }
    }
  });

  it('mixedStufe: suggested Stufe once worked on, otherwise the practised one', () => {
    const s = withSkills({
      'zahlen.runden#1': entry('sicher'),
      'zahlen.ordnen#2': entry('geuebt'),
      'zahlen.strahl#1': entry('sicher'),
      'zahlen.strahl#2': entry('sicher'),
      'zahlen.strahl#3': entry('sicher'),
    });
    expect(mixedStufe(s, 'zahlen.runden')).toBe(1); // Stufe 2 not opened yet
    expect(mixedStufe(s, 'zahlen.ordnen')).toBe(2); // works on Stufe 2
    expect(mixedStufe(s, 'zahlen.strahl')).toBe(3);
    expect(mixedStufe(s, 'zahlen.zahlwort')).toBe(2); // new: the default suggestion (C4)
  });

  it('with fewer than 2 practised skills the whole topic is used, practised skills first for extra slots', () => {
    const three = ZAHLEN.slice(0, 3);
    const state = withSkills({ 'zahlen.zahlwort#1': entry('geuebt') });
    for (let seed = 0; seed < 50; seed++) {
      const slots = mixed(state, seed, three);
      expect(noAdjacentRepeats(slots)).toBe(true);
      expect(counts(slots).get('zahlen.zahlwort')).toBe(4);
    }
  });

  it('includes NRW extras only when enabled', () => {
    const on = { ...emptyState(), settings: { ...emptyState().settings, nrwExtras: true } };
    expect(mixed(emptyState(), 3).some((s) => s.skillId === 'zahlen.binaer')).toBe(false);
    expect(counts(mixed(on, 3)).get('zahlen.binaer')).toBeGreaterThan(0);
  });

  it('is deterministic per rng seed and varies between seeds', () => {
    expect(mixed(emptyState(), 42)).toEqual(mixed(emptyState(), 42));
    const orders = new Set(Array.from({ length: 20 }, (_, seed) => mixed(emptyState(), seed).map((s) => s.skillId).join()));
    expect(orders.size).toBeGreaterThan(10);
  });

  it('handles tiny and huge topics', () => {
    expect(mixed(emptyState(), 1, [])).toEqual([]);
    const one = mixed(emptyState(), 1, [skillDef('zahlen.runden')]);
    expect(one).toHaveLength(10);
    expect(one.every((s) => s.skillId === 'zahlen.runden')).toBe(true);
    const twelve = Array.from({ length: 12 }, (_, i) => skillDef(`zahlen.s${i}`));
    const practisedAll: Record<string, StufeProgress> = {};
    twelve.forEach((s) => (practisedAll[`${s.id}#1`] = entry('geuebt')));
    const slots = mixed(withSkills(practisedAll), 9, twelve);
    expect(slots).toHaveLength(10);
    expect(new Set(slots.map((s) => s.skillId)).size).toBe(10);
  });
});

describe("plan 'review'", () => {
  const review = (state: ProgressState, seed = 1, skills = SKILLS) => buildRound({ mode: 'review' }, state, DAY, createRng(seed), skills);
  const due = (d: string, extra: Partial<StufeProgress> & { optional?: true } = {}) => entry('sicher', { box: 2, due: d, ...extra });
  const facts = (n: number) => {
    const f: Record<string, { box: number; due: string; seen: number; correct: number }> = {};
    ['3x7', '6x8', '4x9', '7x7', '8x9'].slice(0, n).forEach((k) => (f[k] = { box: 1, due: DAY, seen: 1, correct: 1 }));
    return f;
  };

  it('is empty when nothing is due', () => {
    const s = withSkills({ 'zahlen.runden#1': due('2026-10-20'), 'zahlen.ordnen#1': entry('geuebt') }, withFacts({ '3x7': { box: 2, due: '2026-10-22', seen: 2, correct: 2 } }));
    expect(review(s)).toEqual([]);
    expect(review(emptyState())).toEqual([]);
  });

  it('one due skill-Stufe gets 2 slots', () => {
    const slots = review(withSkills({ 'zahlen.runden#2': due('2026-10-18') }));
    expect(slots).toEqual([
      { skillId: 'zahlen.runden', stufe: 2, purpose: 'review' },
      { skillId: 'zahlen.runden', stufe: 2, purpose: 'review' },
    ]);
  });

  it('due skill-Stufen get 1–2 slots, most overdue first, plus up to 3 Einmaleins slots, interleaved', () => {
    const s = withSkills(
      {
        'zahlen.runden#2': due('2026-10-18'),
        'zahlen.ordnen#1': due('2026-10-10'),
        'geometrie.umfang#1': due('2026-10-19'),
        'daten.zufall#3': due('2026-10-15'),
      },
      withFacts(facts(5)),
    );
    const slots = review(s);
    expect(slots).toHaveLength(REVIEW_MAX);
    expect(slots.every((x) => x.purpose === 'review')).toBe(true);
    expect(noAdjacentRepeats(slots)).toBe(true);
    const c = counts(slots);
    expect(c.get(EINMALEINS_SKILL_ID)).toBe(3);
    // 5 skill slots: the most overdue item (zahlen.ordnen) gets the second slot
    expect(c.get('zahlen.ordnen')).toBe(2);
    expect(c.get('daten.zufall')).toBe(1);
    expect(c.get('zahlen.runden')).toBe(1);
    expect(c.get('geometrie.umfang')).toBe(1);
    expect(slots.filter((x) => x.skillId === EINMALEINS_SKILL_ID).every((x) => x.stufe === 1)).toBe(true);
    // the most overdue item opens the round (useful when the child stops early)
    expect(slots[0]).toEqual({ skillId: 'zahlen.ordnen', stufe: 1, purpose: 'review' });
  });

  it('interleaves overdue items with the Einmaleins slots, most overdue first', () => {
    const s = withSkills({ 'zahlen.ordnen#1': due('2026-10-10'), 'zahlen.runden#1': due('2026-10-12') }, withFacts(facts(3)));
    // 3 fact slots leave room for 5 skill slots → both due skill-Stufen get 2 slots (7 in total)
    const E = EINMALEINS_SKILL_ID;
    expect(review(s).map((x) => x.skillId)).toEqual(['zahlen.ordnen', 'zahlen.runden', E, 'zahlen.ordnen', E, 'zahlen.runden', E]);
  });

  it('many due items: capped at 8, the most overdue first, at least one Einmaleins slot if facts are due', () => {
    const many: Record<string, StufeProgress> = {};
    for (let i = 0; i < 10; i++) many[`zahlen.s${i}#1`] = due(`2026-10-${String(i + 1).padStart(2, '0')}`);
    const s = withSkills(many, withFacts(facts(2)));
    const defs = [...Object.keys(many).map((k) => skillDef(k.split('#')[0])), skillDef(EINMALEINS_SKILL_ID)];
    const slots = review(s, 1, defs);
    expect(slots).toHaveLength(8);
    expect(counts(slots).get(EINMALEINS_SKILL_ID)).toBe(1);
    const expectedIds = dueReviews(s, DAY, 7).map((d) => d.skillId).sort();
    expect(slots.filter((x) => x.skillId !== EINMALEINS_SKILL_ID).map((x) => x.skillId).sort()).toEqual(expectedIds);
    expect(noAdjacentRepeats(slots)).toBe(true);
  });

  it('the cap of 8 is per day: after a full review round nothing more today, the rest comes tomorrow (L2)', () => {
    const many: Record<string, StufeProgress> = {};
    for (let i = 0; i < 12; i++) many[`zahlen.s${i}#1`] = due(`2026-10-${String(i + 1).padStart(2, '0')}`);
    const defs = Object.keys(many).map((k) => skillDef(k.split('#')[0]));
    let s = withSkills(many);
    const first = review(s, 1, defs);
    expect(first).toHaveLength(REVIEW_MAX);
    for (const slot of first) s = applyAnswer(s, { skillId: slot.skillId, topicId: 'zahlen', stufe: slot.stufe, firstTry: true, solved: true, usedHint: false, purpose: 'review', day: DAY }).state;
    expect(s.reviewed).toEqual({ day: DAY, count: 8 });
    expect(reviewBudget(s, DAY)).toBe(0);
    // 4 skill-Stufen are still due, but today's 8 are done
    expect(dueReviews(s, DAY, 100)).toHaveLength(4);
    expect(review(s, 2, defs)).toEqual([]);
    // tomorrow the rest comes back
    const tomorrow = buildRound({ mode: 'review' }, s, addDays(DAY, 1), createRng(3), defs);
    expect(new Set(tomorrow.map((x) => x.skillId))).toEqual(new Set(['zahlen.s8', 'zahlen.s9', 'zahlen.s10', 'zahlen.s11']));
  });

  it('a review round stopped early leaves the rest of the daily 8', () => {
    let s = withSkills({ 'zahlen.ordnen#1': due('2026-10-10'), 'zahlen.runden#1': due('2026-10-12') }, withFacts(facts(3)));
    const first = review(s);
    expect(first).toHaveLength(7);
    for (const slot of first.slice(0, 5)) {
      const fact = slot.skillId === EINMALEINS_SKILL_ID ? { factKey: '3x7' } : {};
      s = applyAnswer(s, { skillId: slot.skillId, topicId: 'zahlen', stufe: slot.stufe, firstTry: false, solved: true, usedHint: false, purpose: 'review', day: DAY, ...fact }).state;
    }
    expect(reviewBudget(s, DAY)).toBe(3);
    // wrong answers are not due again today; only the 2 untouched facts are left, within the budget
    const rest = review(s);
    expect(rest).toEqual([
      { skillId: EINMALEINS_SKILL_ID, stufe: 1, purpose: 'review' },
      { skillId: EINMALEINS_SKILL_ID, stufe: 1, purpose: 'review' },
    ]);
    // a count from an earlier day does not limit today
    expect(reviewBudget({ ...s, reviewed: { day: '2026-10-18', count: 8 } }, DAY)).toBe(REVIEW_MAX);
    // a budget of 1 still gives one slot
    expect(review({ ...s, reviewed: { day: DAY, count: 7 } })).toHaveLength(1);
  });

  it('facts only: as many Einmaleins slots as due facts, at most 3', () => {
    expect(review(withFacts(facts(2)))).toEqual([
      { skillId: EINMALEINS_SKILL_ID, stufe: 1, purpose: 'review' },
      { skillId: EINMALEINS_SKILL_ID, stufe: 1, purpose: 'review' },
    ]);
    expect(review(withFacts(facts(5)))).toHaveLength(3);
  });

  it('two Stufen of one skill are treated as one skill for interleaving', () => {
    const s = withSkills({ 'zahlen.runden#1': due('2026-10-10'), 'zahlen.runden#2': due('2026-10-11'), 'zahlen.ordnen#1': due('2026-10-12') });
    const slots = review(s);
    expect(slots).toHaveLength(6);
    expect(counts(slots).get('zahlen.runden')).toBe(4);
    // 4 of 6 cannot be separated completely, but the round still contains every due Stufe twice
    expect(slots.filter((x) => x.skillId === 'zahlen.runden').map((x) => x.stufe).sort()).toEqual([1, 1, 2, 2]);
  });

  it('drops skills that no longer exist in a loaded topic and hidden NRW extras; keeps skills of topics not loaded', () => {
    const s = withSkills({
      'zahlen.alt#1': due('2026-10-10'),
      'zahlen.binaer#1': due('2026-10-10', { optional: true }),
      'sachaufgaben.rest#1': due('2026-10-11'),
    });
    expect(review(s).map((x) => x.skillId)).toEqual(['sachaufgaben.rest', 'sachaufgaben.rest']);
    const on = { ...s, settings: { ...s.settings, nrwExtras: true } };
    expect(new Set(review(on).map((x) => x.skillId))).toEqual(new Set(['zahlen.binaer', 'sachaufgaben.rest']));
    // kopfrechnen loaded without the Einmaleins trainer → no fact slots
    expect(review(withFacts(facts(3)), 1, [skillDef('kopfrechnen.analogie')])).toEqual([]);
  });

  it('random states: ≤ 8 slots, only due items, every slot purpose review, no neighbours when separable, deterministic', () => {
    const rng = createRng(2024);
    const ids = ['zahlen.a', 'zahlen.b', 'geometrie.c', 'daten.d', 'groessen.e', 'schriftlich.f'];
    for (let trial = 0; trial < 300; trial++) {
      const skills: Record<string, StufeProgress> = {};
      for (const id of ids) {
        for (const st of [1, 2, 3] as Stufe[]) {
          if (rng.chance(0.3)) skills[`${id}#${st}`] = due(`2026-10-${String(rng.int(10, 25)).padStart(2, '0')}`, { box: rng.int(1, 5) });
        }
      }
      const s = withSkills(skills, withFacts(facts(rng.int(0, 5))));
      // alternately with all topics loaded and with no topic loaded (nothing can be verified → keep)
      const defs = trial % 2 ? [...ids.map((id) => skillDef(id)), skillDef(EINMALEINS_SKILL_ID)] : [];
      const slots = review(s, trial, defs);
      expect(slots.length).toBeLessThanOrEqual(REVIEW_MAX);
      const dueIds = new Set(dueReviews(s, DAY, 100).map((d) => `${d.skillId}#${d.stufe}`));
      for (const x of slots) {
        expect(x.purpose).toBe('review');
        if (x.skillId !== EINMALEINS_SKILL_ID) expect(dueIds.has(`${x.skillId}#${x.stufe}`)).toBe(true);
      }
      if (dueIds.size > 0) expect(slots.length).toBeGreaterThan(0);
      if (slots.length > 0 && separable(slots)) expect(noAdjacentRepeats(slots), JSON.stringify(slots)).toBe(true);
      expect(review(s, trial, defs)).toEqual(slots);
    }
  });
});
