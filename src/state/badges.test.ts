import { describe, expect, it } from 'vitest';
import { GROUP } from '../core/format';
import { BANNED_PHRASES } from '../core/testing';
import { BADGES, BADGE_THRESHOLDS, badgeById, badgeFacts, evaluateBadges } from './badges';
import { ALL_FACT_KEYS, KERN_FACT_KEYS } from './facts';
import { TOPIC_IDS } from './mastery';
import { emptyState } from './store';
import { entry, withFacts, withSkills } from './testkit';
import type { FactProgress, ProgressState, StufeProgress } from './types';

const sicher = (...keys: string[]): Record<string, StufeProgress> => Object.fromEntries(keys.map((k) => [k, entry('sicher')]));
const facts = (keys: readonly string[], box: number): Record<string, FactProgress> =>
  Object.fromEntries(keys.map((k) => [k, { box, due: '2026-11-01', seen: 5, correct: 5 }]));
const totals = (patch: Partial<ProgressState['totals']>): ProgressState => {
  const s = emptyState();
  return { ...s, totals: { ...s.totals, ...patch } };
};

describe('badge definitions', () => {
  it('has 15–25 mastery badges plus at most 5 improvement badges, with unique ids and titles', () => {
    const mastery = BADGES.filter((b) => !b.improvement);
    expect(mastery.length).toBeGreaterThanOrEqual(15);
    expect(mastery.length).toBeLessThanOrEqual(25);
    expect(BADGES.filter((b) => b.improvement).map((b) => b.id)).toEqual(['fehler-ueberwunden', 'besser-geworden', 'behalten', 'vieles-behalten']);
    expect(new Set(BADGES.map((b) => b.id)).size).toBe(BADGES.length);
    expect(new Set(BADGES.map((b) => b.title)).size).toBe(BADGES.length);
  });

  it('every badge has a German title, a "Du …" description and a single emoji', () => {
    const seg = new Intl.Segmenter('de', { granularity: 'grapheme' });
    for (const b of BADGES) {
      expect(b.title.length, b.id).toBeGreaterThan(3);
      expect(b.description, b.id).toMatch(/^Du .+\.$/);
      expect(b.description.split(/[.!?]/).filter((x) => x.trim()).every((sentence) => sentence.trim().split(/\s+/).length <= 15), b.description).toBe(true);
      expect([...seg.segment(b.icon)], `${b.id}: ${b.icon}`).toHaveLength(1);
      expect(b.icon, b.id).toMatch(/\p{Extended_Pictographic}/u);
    }
  });

  it('uses no banned phrases, no participation wording and school notation', () => {
    for (const b of BADGES) {
      const text = `${b.title} ${b.description}`;
      const lower = text.toLowerCase();
      for (const banned of BANNED_PHRASES) expect(lower.includes(banned), `${banned} in ${text}`).toBe(false);
      expect(lower).not.toMatch(/anmeld|login|eingeloggt|erste[nrs]? (mal|besuch)|willkommen|teilgenommen|serie|schnell/);
      expect(text).not.toMatch(/[×÷*]|\d\.\d{3}/);
    }
    expect(badgeById('zahlen-sicher')!.description).toContain(`1${GROUP}000${GROUP}000`);
  });

  it('badgeById', () => {
    expect(badgeById('allrounder')?.title).toBe('Allrounder');
    expect(badgeById('gibt-es-nicht')).toBeUndefined();
  });
});

describe('no badge for just showing up', () => {
  it('an empty state or a little practice earns nothing', () => {
    expect(evaluateBadges(emptyState())).toEqual([]);
    const s = withSkills({ 'zahlen.runden#1': entry('geuebt'), 'geometrie.umfang#1': entry('geuebt') });
    expect(evaluateBadges({ ...s, days: ['2026-10-19'], totals: { ...s.totals, answered: 50, firstTry: 40, rounds: 5 } })).toEqual([]);
  });
});

describe('topic badges', () => {
  it.each(TOPIC_IDS)('%s: one Stufe sicher → "-sicher"; one Stufe gemeistert → "-gemeistert"', (t) => {
    expect(evaluateBadges(withSkills({ [`${t}.x#2`]: entry('geuebt') }))).toEqual([]);
    expect(evaluateBadges(withSkills(sicher(`${t}.x#2`)))).toEqual([`${t}-sicher`]);
    expect(evaluateBadges(withSkills({ [`${t}.x#1`]: entry('gemeistert') }))).toEqual([`${t}-sicher`, `${t}-gemeistert`]);
  });

  it('optional NRW entries never count', () => {
    const s = withSkills({ 'zahlen.binaer#1': entry('gemeistert', { optional: true }), 'zahlen.binaer#3': entry('sicher', { optional: true }) });
    expect(evaluateBadges(s)).toEqual([]);
  });

  it('already earned badges are not returned again', () => {
    const s = withSkills(sicher('zahlen.runden#1'));
    expect(evaluateBadges({ ...s, badges: { 'zahlen-sicher': '2026-10-01' } })).toEqual([]);
  });
});

describe('cross-topic badges', () => {
  it('Themen-Profi: three different skills sicher in one topic (Stufen of one skill do not add up)', () => {
    expect(evaluateBadges(withSkills(sicher('zahlen.a#1', 'zahlen.a#2', 'zahlen.a#3')))).not.toContain('themen-profi');
    expect(evaluateBadges(withSkills(sicher('zahlen.a#1', 'zahlen.b#1', 'geometrie.c#1')))).not.toContain('themen-profi');
    expect(evaluateBadges(withSkills(sicher('zahlen.a#1', 'zahlen.b#2', 'zahlen.c#3')))).toContain('themen-profi');
    expect(BADGE_THRESHOLDS.themenProfiSkills).toBe(3);
  });

  it('Allrounder: at least one Stufe sicher in every topic', () => {
    const six = TOPIC_IDS.slice(0, 6).map((t) => `${t}.x#1`);
    expect(evaluateBadges(withSkills(sicher(...six)))).not.toContain('allrounder');
    const all = evaluateBadges(withSkills(sicher(...six, 'sachaufgaben.x#1')));
    expect(all).toContain('allrounder');
    expect(all.filter((id) => id.endsWith('-sicher'))).toHaveLength(7);
  });

  it('Stufe-3-Profi: Stufe 3 sicher in three topics', () => {
    expect(evaluateBadges(withSkills(sicher('zahlen.a#3', 'zahlen.b#3', 'daten.c#3')))).not.toContain('stufe3');
    expect(evaluateBadges(withSkills(sicher('zahlen.a#3', 'geometrie.b#3', 'daten.c#2')))).not.toContain('stufe3');
    expect(evaluateBadges(withSkills(sicher('zahlen.a#3', 'geometrie.b#3', 'daten.c#3')))).toContain('stufe3');
  });

  it('Gedächtnis-Profi: five Stufen gemeistert', () => {
    const g = (n: number) => withSkills(Object.fromEntries(Array.from({ length: n }, (_, i) => [`kopfrechnen.s${i}#1`, entry('gemeistert')])));
    expect(evaluateBadges(g(4))).not.toContain('gedaechtnis');
    expect(evaluateBadges(g(5))).toContain('gedaechtnis');
  });

  it('Kernaufgaben-Kenner: all 34 facts with a factor 1, 2, 5 or 10 in box ≥ 2', () => {
    expect(KERN_FACT_KEYS).toHaveLength(34);
    expect(evaluateBadges(withFacts(facts(KERN_FACT_KEYS, 2)))).toEqual(['kernaufgaben']);
    expect(evaluateBadges(withFacts({ ...facts(KERN_FACT_KEYS, 2), '5x7': { box: 1, seen: 1, correct: 1 } }))).toEqual([]);
    expect(evaluateBadges(withFacts(facts(KERN_FACT_KEYS.slice(1), 5)))).toEqual([]);
  });

  it('Einmaleins-Meister: all 55 facts in box ≥ 3', () => {
    expect(evaluateBadges(withFacts(facts(ALL_FACT_KEYS, 3)))).toEqual(['kernaufgaben', 'einmaleins']);
    expect(evaluateBadges(withFacts({ ...facts(ALL_FACT_KEYS, 3), '7x8': { box: 2, seen: 1, correct: 1 } }))).toEqual(['kernaufgaben']);
  });

  it('Dranbleiber: 10 tasks solved with a hint or on the second try', () => {
    expect(evaluateBadges(totals({ afterHint: 9 }))).toEqual([]);
    expect(evaluateBadges(totals({ afterHint: 10 }))).toEqual(['dranbleiber']);
    expect(badgeById('dranbleiber')!.description).toBe('Du hast 10 knifflige Aufgaben mit Tipp oder im zweiten Versuch gelöst.');
  });

  it('Wiederholungs-Profi: 10 passed spaced checks', () => {
    expect(evaluateBadges(totals({ checksPassed: 9 }))).toEqual([]);
    expect(evaluateBadges(totals({ checksPassed: 10 }))).toEqual(['wiederholung']);
  });

  it('practice days, rounds and answered tasks alone never earn a badge (no participation badges, § 6.4)', () => {
    // every day of a whole week, for every weekly goal
    const week = ['2026-10-19', '2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23', '2026-10-24', '2026-10-25'];
    for (let goal = 1; goal <= 5; goal++) {
      const s = emptyState();
      const busy: ProgressState = { ...s, days: week, totals: { ...s.totals, answered: 500, rounds: 50 }, settings: { ...s.settings, weeklyGoal: goal } };
      expect(evaluateBadges(busy), `goal ${goal}`).toEqual([]);
    }
    expect(badgeById('wochenziel')).toBeUndefined();
  });

  it('badgeFacts summarises per topic', () => {
    const f = badgeFacts(withSkills({ ...sicher('zahlen.a#1', 'zahlen.a#2', 'zahlen.b#3'), 'daten.c#1': entry('gemeistert') }));
    expect(f.sicherSkills.zahlen).toBe(2);
    expect(f.sicherSkills.daten).toBe(1);
    expect(f.gemeistert.daten).toBe(1);
    expect(f.gemeistertTotal).toBe(1);
    expect(f.stufe3Topics).toBe(1);
  });
});
