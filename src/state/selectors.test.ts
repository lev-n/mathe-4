import { describe, expect, it } from 'vitest';
import { TOPICS } from '../topics/registry';
import { TOPIC_IDS } from './mastery';
import {
  blitzFacts,
  dueFacts,
  dueReviews,
  masteryOf,
  practisedStufe,
  practisedTopics,
  skillKey,
  starsOf,
  suggestedStufe,
  topicStars,
  visibleSkills,
  weekProgress,
} from './selectors';
import { emptyState } from './store';
import { entry, skillDef, withFacts, withSkills } from './testkit';
import type { ProgressState } from './types';

const withNrw = (s: ProgressState): ProgressState => ({ ...s, settings: { ...s.settings, nrwExtras: true } });

describe('basic selectors', () => {
  it('skillKey / masteryOf / starsOf', () => {
    const s = withSkills({ 'zahlen.runden#1': entry('sicher'), 'zahlen.runden#2': entry('geuebt'), 'zahlen.runden#3': entry('gemeistert') });
    expect(skillKey('zahlen.runden', 2)).toBe('zahlen.runden#2');
    expect(masteryOf(s, 'zahlen.runden', 1)).toBe('sicher');
    expect(masteryOf(s, 'zahlen.ordnen', 1)).toBe('neu');
    expect([1, 2, 3].map((n) => starsOf(s, 'zahlen.runden', n as 1 | 2 | 3))).toEqual([2, 1, 3]);
  });

  it('suggestedStufe: Stufe 2 for a new skill (C4), else the first Stufe from the lowest practised one that is not sicher (3 if all are)', () => {
    expect(suggestedStufe(emptyState(), 'zahlen.runden')).toBe(2);
    expect(suggestedStufe(withSkills({ 'zahlen.runden#1': entry('geuebt') }), 'zahlen.runden')).toBe(1);
    expect(suggestedStufe(withSkills({ 'zahlen.runden#1': entry('gemeistert') }), 'zahlen.runden')).toBe(2);
    expect(suggestedStufe(withSkills({ 'zahlen.runden#1': entry('sicher'), 'zahlen.runden#2': entry('geuebt') }), 'zahlen.runden')).toBe(2);
    expect(suggestedStufe(withSkills({ 'zahlen.runden#2': entry('geuebt') }), 'zahlen.runden')).toBe(2);
    // started at Stufe 2 and it is sicher: move up, never back to Stufe 1
    expect(suggestedStufe(withSkills({ 'zahlen.runden#2': entry('sicher') }), 'zahlen.runden')).toBe(3);
    const all = withSkills({ 'zahlen.runden#1': entry('sicher'), 'zahlen.runden#2': entry('sicher'), 'zahlen.runden#3': entry('gemeistert') });
    expect(suggestedStufe(all, 'zahlen.runden')).toBe(3);
  });

  it('practisedStufe = highest Stufe with answers', () => {
    expect(practisedStufe(emptyState(), 'zahlen.runden')).toBeUndefined();
    expect(practisedStufe(withSkills({ 'zahlen.runden#1': entry('sicher'), 'zahlen.runden#2': entry('geuebt') }), 'zahlen.runden')).toBe(2);
    expect(practisedStufe(withSkills({ 'zahlen.runden#3': entry('neu') }), 'zahlen.runden')).toBeUndefined();
  });
});

describe('dueReviews', () => {
  const s = withSkills({
    'zahlen.runden#1': entry('sicher', { box: 2, due: '2026-10-19' }),
    'zahlen.ordnen#2': entry('sicher', { box: 1, due: '2026-10-10' }),
    'geometrie.umfang#1': entry('gemeistert', { box: 4, due: '2026-10-15' }),
    'daten.zufall#3': entry('sicher', { box: 3, due: '2026-10-20' }),
    'zahlen.zahlwort#1': entry('geuebt', { box: 0 }),
    'zahlen.binaer#1': entry('sicher', { box: 1, due: '2026-10-01', optional: true }),
  });

  it('returns box ≥ 1 items due on or before the day, most overdue first', () => {
    expect(dueReviews(s, '2026-10-19')).toEqual([
      { skillId: 'zahlen.ordnen', stufe: 2, due: '2026-10-10' },
      { skillId: 'geometrie.umfang', stufe: 1, due: '2026-10-15' },
      { skillId: 'zahlen.runden', stufe: 1, due: '2026-10-19' },
    ]);
    expect(dueReviews(s, '2026-10-09')).toEqual([]);
    expect(dueReviews(s, '2026-10-19', 1)).toHaveLength(1);
  });

  it('includes NRW extras only when the setting is on', () => {
    expect(dueReviews(withNrw(s), '2026-10-19')[0]).toEqual({ skillId: 'zahlen.binaer', stufe: 1, due: '2026-10-01' });
  });

  it('caps the list at 8 by default with a stable order for equal days', () => {
    const many: Record<string, ReturnType<typeof entry>> = {};
    for (let i = 0; i < 12; i++) many[`zahlen.s${String(i).padStart(2, '0')}#1`] = entry('sicher', { box: 1, due: i < 6 ? '2026-10-18' : '2026-10-17' });
    const due = dueReviews(withSkills(many), '2026-10-19');
    expect(due).toHaveLength(8);
    expect(due.map((d) => d.skillId)).toEqual(['zahlen.s06', 'zahlen.s07', 'zahlen.s08', 'zahlen.s09', 'zahlen.s10', 'zahlen.s11', 'zahlen.s00', 'zahlen.s01']);
  });
});

describe('facts', () => {
  const s = withFacts({
    '3x7': { box: 2, due: '2026-10-19', seen: 3, correct: 3 },
    '6x8': { box: 0, due: '2026-10-18', seen: 2, correct: 0 },
    '2x5': { box: 4, due: '2026-11-01', seen: 6, correct: 6 },
    '10x10': { box: 5, due: '2026-10-10', seen: 9, correct: 9 },
    '4x4': { box: 1, due: '2026-10-25', seen: 1, correct: 1 },
  });

  it('dueFacts: due on or before the day (also box 0 from an earlier day), most overdue first', () => {
    expect(dueFacts(s, '2026-10-19')).toEqual(['10x10', '6x8', '3x7']);
    expect(dueFacts(emptyState(), '2026-10-19')).toEqual([]);
  });

  it('blitzFacts: box ≥ 4, in numeric order', () => {
    expect(blitzFacts(s)).toEqual(['2x5', '10x10']);
  });
});

describe('weekProgress (Mon–Sun)', () => {
  const s = { ...emptyState(), days: ['2026-10-11', '2026-10-12', '2026-10-14', '2026-10-18', '2026-10-19'] };

  it('counts distinct practice days of the current week only', () => {
    // week of 12.–18.10.2026
    expect(weekProgress(s, '2026-10-18')).toEqual({ days: 3, goal: 3, reached: true });
    expect(weekProgress(s, '2026-10-12')).toEqual({ days: 3, goal: 3, reached: true });
    // Monday 19.10. starts a new week quietly
    expect(weekProgress(s, '2026-10-19')).toEqual({ days: 1, goal: 3, reached: false });
    expect(weekProgress(s, '2026-10-25')).toEqual({ days: 1, goal: 3, reached: false });
  });

  it('uses the weekly goal (1–5) from the settings', () => {
    const g5 = { ...s, settings: { ...s.settings, weeklyGoal: 5 } };
    expect(weekProgress(g5, '2026-10-18')).toEqual({ days: 3, goal: 5, reached: false });
    const g1 = { ...s, settings: { ...s.settings, weeklyGoal: 1 } };
    expect(weekProgress(g1, '2026-10-19').reached).toBe(true);
  });

  it('works for weeks across the year boundary', () => {
    const y = { ...emptyState(), days: ['2026-12-27', '2026-12-28', '2026-12-31', '2027-01-03', '2027-01-04'] };
    expect(weekProgress(y, '2027-01-01').days).toBe(3);
  });
});

describe('topicStars / practisedTopics', () => {
  const skills = [skillDef('zahlen.runden'), skillDef('zahlen.ordnen'), skillDef('zahlen.binaer', true)];
  const s = withSkills({
    'zahlen.runden#1': entry('gemeistert'),
    'zahlen.runden#2': entry('sicher'),
    'zahlen.runden#3': entry('geuebt'),
    'zahlen.ordnen#1': entry('geuebt'),
    'zahlen.binaer#1': entry('sicher', { optional: true }),
    'geometrie.umfang#1': entry('neu'),
  });

  it('sums stars and sicher Stufen over the visible skills', () => {
    expect(topicStars(s, skills)).toEqual({ stars: 3 + 2 + 1 + 1, max: 18, sicher: 2, total: 6 });
    expect(topicStars(withNrw(s), skills)).toEqual({ stars: 7 + 2, max: 27, sicher: 3, total: 9 });
    expect(topicStars(emptyState(), [])).toEqual({ stars: 0, max: 0, sicher: 0, total: 0 });
    expect(visibleSkills(s, skills).map((x) => x.id)).toEqual(['zahlen.runden', 'zahlen.ordnen']);
  });

  it('lists topics with at least one practised skill, in topic order', () => {
    const t = withSkills({ 'daten.zufall#1': entry('geuebt'), 'kopfrechnen.einmaleins#1': entry('sicher') }, s);
    expect(practisedTopics(t)).toEqual(['zahlen', 'kopfrechnen', 'daten']);
    expect(practisedTopics(withSkills({ 'zahlen.binaer#1': entry('geuebt', { optional: true }) }))).toEqual([]);
    expect(practisedTopics(emptyState())).toEqual([]);
  });

  it('TOPIC_IDS follow the registry order', () => {
    expect(TOPIC_IDS).toEqual(TOPICS.map((t) => t.id));
  });
});
