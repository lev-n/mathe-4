// @vitest-environment jsdom
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OPERATOR_PLACEHOLDER } from '../../config/operator';
import { BANNED_PHRASES, IMPROVEMENT_BANNED_PHRASES } from '../../core/testing';
import type { TopicId } from '../../core/types';
import { dueFacts, dueReviews, practisedTopics, weekProgress } from '../../state/selectors';
import type { AnswerEvent, Consent, ProgressState } from '../../state/types';
import { getTopicMeta, loadTopic } from '../../topics/registry';
import BadgesPage, { earnedBadges } from './BadgesPage';
import { continueStufe, lastPractisedSkillId, reviewRoundSize } from '../app/progress';
import HomePage from './HomePage';
import ImprintPage from './ImprintPage';
import NotFoundPage from './NotFoundPage';
import { createStore } from '../../state/store';
import PrivacyPage, { KIDS_PRIVACY } from './PrivacyPage';
import ProgressPage from './ProgressPage';
import { progress, stateWith } from './testFixtures';
import TopicPage, { isSkillSicher } from './TopicPage';
import { weekGoalText } from './WeekGoal';
import AdultsPage from './AdultsPage';

const current = vi.hoisted(() => ({ state: null as unknown as ProgressState, consent: 'unknown' as Consent }));

vi.mock('../../state/useProgress', () => ({
  useProgress: () => current.state,
  useSettings: () => current.state.settings,
  useConsent: () => current.consent,
  useSaveStatus: () => 'ok',
}));

vi.mock('../../state/selectors', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../state/selectors')>();
  return {
    ...actual,
    dueReviews: vi.fn(() => []),
    dueFacts: vi.fn(() => []),
    weekProgress: vi.fn((s: ProgressState) => ({ days: 0, goal: s.settings.weeklyGoal, reached: false })),
  };
});

vi.mock('../../state/badges', () => {
  const BADGES = [
    { id: 'runden-profi', title: 'Runden-Profi', description: 'Du kannst Zahlen sicher runden.', icon: '🎯' },
    { id: 'einmaleins-profi', title: 'Einmaleins-Profi', description: 'Du kannst das Einmaleins sicher.', icon: '✖️' },
    { id: 'geheim', title: 'Geheimes Abzeichen', description: 'Noch nicht verdient.', icon: '🔒' },
  ];
  return { BADGES, badgeById: (id: string) => BADGES.find((b) => b.id === id), evaluateBadges: () => [] };
});

vi.mock('../../topics/registry', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../topics/registry')>();
  const { fakeModule } = await import('./testFixtures');
  return { ...actual, loadTopic: vi.fn((id: TopicId) => Promise.resolve(fakeModule(id))) };
});

beforeEach(() => {
  current.state = stateWith();
  current.consent = 'unknown';
  vi.mocked(dueReviews).mockReturnValue([]);
  vi.mocked(dueFacts).mockReturnValue([]);
  vi.mocked(weekProgress).mockImplementation((s) => ({ days: 0, goal: s.settings.weeklyGoal, reached: false }));
});
afterEach(cleanup);

describe('HomePage', () => {
  it('greets, shows 7 topic cards and no review card when nothing is due', async () => {
    render(<HomePage />);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Hallo! Was möchtest du heute üben?');
    const list = screen.getByRole('list');
    expect(within(list).getAllByRole('link')).toHaveLength(7);
    expect(screen.queryByText('Heute wiederholen')).toBeNull();
    expect(screen.queryByText('Blitzrunde')).toBeNull();
    expect(screen.getByText('Dein Wochenziel: an 3 Tagen üben.')).toBeTruthy();
    await waitFor(() => expect(screen.getAllByText('Noch nicht geübt')).toHaveLength(7));
  });

  it('puts "Heute wiederholen" first when reviews or facts are due', () => {
    vi.mocked(dueReviews).mockReturnValue([
      { skillId: 'zahlen.runden', stufe: 1, due: '2026-10-01' },
      { skillId: 'zahlen.runden', stufe: 2, due: '2026-10-02' },
    ]);
    vi.mocked(dueFacts).mockReturnValue(['3x7', '6x8', '7x8']);
    render(<HomePage />);
    const card = screen.getByRole('region', { name: 'Heute wiederholen' });
    // The round plans 2 slots per due skill-Stufe (room permitting) plus 3 Einmaleins slots: 2·2 + 3.
    expect(card.textContent).toContain('7 Aufgaben von früher');
    expect(within(card).getByRole('link', { name: /Wiederholen/ }).getAttribute('href')).toBe('/wiederholen');
    // the review card comes before the topics
    const topics = screen.getByRole('list');
    expect(card.compareDocumentPosition(topics) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('announces exactly as many review tasks as the review round contains', () => {
    const st = stateWith();
    // 1 due skill-Stufe → the round practises it twice
    vi.mocked(dueReviews).mockReturnValue([{ skillId: 'zahlen.runden', stufe: 1, due: '2026-10-01' }]);
    vi.mocked(dueFacts).mockReturnValue([]);
    expect(reviewRoundSize(st, '2026-10-18', [])).toBe(2);
    render(<HomePage />);
    expect(screen.getByRole('region', { name: 'Heute wiederholen' }).textContent).toContain('2 Aufgaben von früher');
    cleanup();
    // 10 due facts → at most 3 Einmaleins slots
    vi.mocked(dueReviews).mockReturnValue([]);
    vi.mocked(dueFacts).mockReturnValue(['1x2', '1x3', '1x4', '1x5', '1x6', '1x7', '1x8', '1x9', '2x2', '2x3']);
    render(<HomePage />);
    expect(screen.getByRole('region', { name: 'Heute wiederholen' }).textContent).toContain('3 Aufgaben von früher');
    cleanup();
    // many due skill-Stufen → capped at 8
    vi.mocked(dueFacts).mockReturnValue([]);
    vi.mocked(dueReviews).mockReturnValue(
      Array.from({ length: 12 }, (_, i) => ({ skillId: `zahlen.s${i}`, stufe: 1 as const, due: '2026-10-01' })),
    );
    expect(reviewRoundSize(st, '2026-10-18', [])).toBe(8);
  });

  it('offers "Weiter üben" for the most recently practised skill at its suggested Stufe', async () => {
    current.state = stateWith({
      'zahlen.stellenwert#1': progress('geuebt', { last: '2026-10-10' }),
      'zahlen.runden#1': progress('sicher', { last: '2026-10-15' }),
    });
    expect(lastPractisedSkillId(current.state)).toBe('zahlen.runden');
    render(<HomePage />);
    const tile = await screen.findByRole('link', { name: /Weiter üben/ });
    expect(tile.textContent).toContain('Runden – Stufe 2');
    expect(tile.getAttribute('href')).toBe('/ueben/zahlen.runden/2');
  });

  it('shows the Blitzrunde tile only when allowed, plus weekly goal and lifetime days', () => {
    current.state = stateWith(
      {},
      {
        days: ['2026-10-01', '2026-10-02', '2026-10-05'],
        facts: { '3x7': { box: 4, due: '2026-11-01', seen: 9, correct: 9 } },
        settings: { ...stateWith().settings, blitzrunde: true },
      },
    );
    vi.mocked(weekProgress).mockReturnValue({ days: 2, goal: 3, reached: false });
    render(<HomePage />);
    expect(screen.getByRole('link', { name: /Blitzrunde/ }).getAttribute('href')).toBe('/blitz');
    expect(screen.queryByTestId('blitz-soon')).toBeNull();
    expect(screen.getByText('Übungstage diese Woche: 2 von 3')).toBeTruthy();
    expect(screen.getByText('Du hast schon an 3 Tagen geübt.')).toBeTruthy();
  });

  it('does not link to the Blitzrunde before any Einmaleins fact is mastered (no dead end)', () => {
    current.state = stateWith(
      {},
      { facts: { '3x7': { box: 2, due: '2026-11-01', seen: 3, correct: 2 } }, settings: { ...stateWith().settings, blitzrunde: true } },
    );
    render(<HomePage />);
    expect(screen.queryByRole('link', { name: /Blitzrunde/ })).toBeNull();
    const soon = screen.getByTestId('blitz-soon');
    expect(soon.textContent).toContain('Blitzrunde');
    expect(soon.textContent).toContain('Kommt noch. Sie startet, sobald du Einmaleins-Aufgaben gemeistert hast.');
    expect(within(screen.getByRole('list')).getAllByRole('link')).toHaveLength(7);
  });

  it('loads topic modules only for practised topics', async () => {
    vi.mocked(loadTopic).mockClear();
    current.state = stateWith({ 'daten.diagramme#1': progress('geuebt') });
    expect(practisedTopics(current.state)).toEqual(['daten']);
    render(<HomePage />);
    expect(await screen.findByRole('link', { name: /Weiter üben/ })).toBeTruthy();
    expect(vi.mocked(loadTopic).mock.calls.map((c) => c[0])).toEqual(['daten']);
  });

  it('words the weekly goal gently', () => {
    expect(weekGoalText(0, 3, false)).toBe('Dein Wochenziel: an 3 Tagen üben.');
    expect(weekGoalText(0, 1, false)).toBe('Dein Wochenziel: an einem Tag üben.');
    expect(weekGoalText(2, 3, false)).toBe('Übungstage diese Woche: 2 von 3');
    expect(weekGoalText(3, 3, true)).toBe('Übungstage diese Woche: 3 von 3. Wochenziel geschafft!');
    expect(weekGoalText(4, 3, true)).toBe('Übungstage diese Woche: 4. Wochenziel geschafft!');
  });
});

describe('"Weiter üben" (lastPractisedSkillId)', () => {
  const answer = (skillId: string, stufe: 1 | 2 | 3): AnswerEvent => ({
    skillId,
    topicId: skillId.split('.')[0] as TopicId,
    stufe,
    firstTry: true,
    solved: true,
    usedHint: false,
    purpose: 'practice',
    day: '2026-10-18',
  });

  it('points to the skill-Stufe answered last in a practice round, also after a reload or an import', () => {
    const s = createStore(null);
    s.recordAnswer(answer('zahlen.stellenwert', 1));
    s.recordAnswer(answer('zahlen.runden', 1));
    s.recordAnswer(answer('zahlen.stellenwert', 3));
    // The stored days tie; without lastPlayed the entry added last (Runden) would win.
    expect(s.get().lastPlayed).toEqual({ skillId: 'zahlen.stellenwert', stufe: 3 });
    expect(lastPractisedSkillId(s.get())).toBe('zahlen.stellenwert');
    expect(continueStufe(s.get(), 'zahlen.stellenwert')).toBe(3);
    // review and mixed answers do not change it
    s.recordAnswer({ ...answer('zahlen.runden', 1), purpose: 'review' });
    s.recordAnswer({ ...answer('zahlen.runden', 1), purpose: 'mixed' });
    expect(lastPractisedSkillId(s.get())).toBe('zahlen.stellenwert');
    // it survives the stored document (reload) and comes with an imported backup
    const reloaded = createStore(null);
    expect(reloaded.importJson(s.exportJson())).toEqual({ ok: true });
    expect(reloaded.get().lastPlayed).toEqual({ skillId: 'zahlen.stellenwert', stufe: 3 });
    const other = createStore(null);
    other.recordAnswer(answer('daten.diagramme', 1));
    other.recordAnswer(answer('zahlen.runden', 2));
    expect(s.importJson(other.exportJson())).toEqual({ ok: true });
    expect(lastPractisedSkillId(s.get())).toBe('zahlen.runden');
    expect(continueStufe(s.get(), 'zahlen.runden')).toBe(2);
  });

  it('never offers a hidden NRW extra', async () => {
    current.state = stateWith({
      'zahlen.runden#1': progress('geuebt', { last: '2026-10-10' }),
      'zahlen.binaer#1': progress('geuebt', { last: '2026-10-15', optional: true }),
    });
    expect(lastPractisedSkillId(current.state)).toBe('zahlen.runden');
    expect(lastPractisedSkillId({ ...current.state, lastPlayed: { skillId: 'zahlen.binaer', stufe: 1 } })).toBe('zahlen.runden');
    expect(lastPractisedSkillId({ ...current.state, settings: { ...current.state.settings, nrwExtras: true } })).toBe('zahlen.binaer');
    render(<HomePage />);
    const tile = await screen.findByRole('link', { name: /Weiter üben/ });
    expect(tile.getAttribute('href')).toBe('/ueben/zahlen.runden/1');
  });
});

describe('TopicPage', () => {
  it('lists skills with three Stufe links, stars, state words and "Empfohlen"', async () => {
    current.state = stateWith({ 'zahlen.runden#1': progress('gemeistert'), 'zahlen.runden#2': progress('geuebt') });
    render(<TopicPage topicId="zahlen" />);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(getTopicMeta('zahlen').title);
    await screen.findByRole('heading', { name: 'Runden' });
    const runden = screen.getByRole('list', { name: 'Runden' });
    const links = within(runden).getAllByRole('link');
    expect(links.map((l) => l.getAttribute('href'))).toEqual(['/ueben/zahlen.runden/1', '/ueben/zahlen.runden/2', '/ueben/zahlen.runden/3']);
    expect(links[0].textContent).toContain('Gemeistert');
    expect(within(links[0]).getByRole('img', { name: '3 von 3 Sternen' })).toBeTruthy();
    expect(links[1].textContent).toContain('Empfohlen');
    expect(links[1].textContent).toContain('Geübt');
    expect(links[1].textContent).toContain('Runden mittel');
    expect(links[2].textContent).toContain('Noch nicht geübt');
    expect(links[0].textContent).not.toContain('Empfohlen');
  });

  it('hides optional NRW skills unless enabled', async () => {
    render(<TopicPage topicId="zahlen" />);
    await screen.findByRole('heading', { name: 'Runden' });
    expect(screen.queryByRole('heading', { name: /Binärzahlen/ })).toBeNull();
    cleanup();
    current.state = stateWith({}, { settings: { ...stateWith().settings, nrwExtras: true } });
    render(<TopicPage topicId="zahlen" />);
    expect(await screen.findByRole('heading', { name: /Binärzahlen/ })).toBeTruthy();
  });

  it('disables "Gemischte Übung" with a visible reason until 2 skills are sicher', async () => {
    current.state = stateWith({ 'zahlen.runden#2': progress('sicher') });
    render(<TopicPage topicId="zahlen" />);
    const button = await screen.findByRole('button', { name: 'Gemischt üben' });
    expect((button as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText(/Das geht, sobald du in 2 Bereichen „Sicher“ bist\. Jetzt: 1 von 2\./)).toBeTruthy();
    cleanup();
    current.state = stateWith({ 'zahlen.runden#2': progress('sicher'), 'zahlen.stellenwert#1': progress('gemeistert') });
    render(<TopicPage topicId="zahlen" />);
    const link = await screen.findByRole('link', { name: 'Gemischt üben' });
    expect(link.getAttribute('href')).toBe('/mix/zahlen');
  });

  it('counts a skill as sicher when any Stufe is sicher or gemeistert', () => {
    expect(isSkillSicher(stateWith({ 'a.b#3': progress('gemeistert') }), 'a.b')).toBe(true);
    expect(isSkillSicher(stateWith({ 'a.b#1': progress('geuebt') }), 'a.b')).toBe(false);
  });
});

describe('ProgressPage', () => {
  it('shows a skills × Stufen table only for practised topics', async () => {
    current.state = stateWith({ 'zahlen.runden#1': progress('sicher') }, { days: ['2026-10-17'] });
    render(<ProgressPage />);
    expect(screen.getByText('Du hast schon an einem Tag geübt.')).toBeTruthy();
    const table = await screen.findByRole('table');
    expect(within(table).getAllByRole('columnheader').map((c) => c.textContent)).toEqual(['Bereich', 'Stufe 1', 'Stufe 2', 'Stufe 3']);
    const row = within(table).getByRole('row', { name: /Runden/ });
    expect(row.textContent).toContain('Sicher');
    expect(screen.getAllByText(/Noch nicht geübt\./)).toHaveLength(6);
    expect(screen.getByRole('link', { name: /Meine Abzeichen/ }).getAttribute('href')).toBe('/abzeichen');
  });

  it('never compares with other children', () => {
    render(<ProgressPage />);
    const text = document.body.textContent ?? '';
    expect(text).not.toMatch(/Rangliste|andere Kinder|besser als|Platz \d/);
  });
});

describe('ProgressPage: "So hast du dich verbessert"', () => {
  const T = Array(10).fill(true);
  /** Runden: Stufe 1 went from 4 of 10 to 9 of 10; Stufe 2 became 'Sicher' after a hard start and was kept in a review. */
  function improvedState(): ProgressState {
    const s = stateWith({
      'zahlen.runden#1': progress('geuebt', { recent: [true, true, true, true, false, true, true, true, true, true] }),
      'zahlen.runden#2': progress('sicher', { recent: T }),
      'zahlen.stellenwert#1': progress('geuebt', { recent: [true, false, false, false, false, false, false, false, false, false] }),
      'schriftlich.plus#1': progress('sicher', { recent: T }),
    });
    s.growth = {
      stufen: {
        'zahlen.runden#1': { earlyN: 10, earlyOk: 4, earlyWrong: 6, earlyDay: '2026-10-10', after: 10, best: 9 },
        'zahlen.runden#2': { earlyN: 10, earlyOk: 4, earlyWrong: 6, earlyDay: '2026-10-11', after: 4, kept: 1 },
        // got worse: never shown
        'zahlen.stellenwert#1': { earlyN: 10, earlyOk: 5, earlyWrong: 5, earlyDay: '2026-10-12', after: 10, best: 1 },
      },
      // stored tags are misconception families (src/topics/errorFamilies.ts)
      errors: { 'schriftlich.plus': { uebertrag: { day: '2026-10-12', seen: 2, run: 5, done: '2026-10-14' }, stellengerecht: { day: '2026-10-13', seen: 2, run: 2 } } },
      facts: {},
    };
    return s;
  }

  /** The block under a topic: an h3 named "So hast du dich verbessert: <topic>" (no extra landmark). */
  async function growthIn(topic: RegExp): Promise<HTMLElement> {
    const region = await screen.findByRole('region', { name: topic });
    const heading = await within(region).findByRole('heading', { level: 3, name: /^So hast du dich verbessert/ });
    return heading.closest<HTMLElement>('.progress-growth')!;
  }
  const linesOf = (block: HTMLElement) => [...block.querySelectorAll('.progress-growth__lines li')].map((li) => li.textContent);

  it('lists only improvements per skill, positively worded, under the topic', async () => {
    current.state = improvedState();
    render(<ProgressPage />);
    const growth = await growthIn(/^Zahlen bis/);
    // the heading names the topic for screen readers (headings list), like the table caption does
    expect(within(growth).getByRole('heading', { level: 3 }).textContent).toMatch(/^So hast du dich verbessert: Zahlen bis/);
    expect(screen.queryByRole('region', { name: /So hast du dich verbessert/ })).toBeNull();
    const skills = [...growth.querySelectorAll('.progress-growth__skill')];
    expect(skills.map((li) => li.querySelector('.progress-growth__name')!.textContent)).toEqual(['Runden']);
    expect(linesOf(growth)).toEqual([
      'Stufe 1: Am Anfang 4 von 10 auf Anhieb, später 9 von 10.',
      'Stufe 2: Am Anfang 4 von 10 auf Anhieb – jetzt ist die Stufe „Sicher“.',
      'Stufe 2: In der Wiederholung hast du auf Anhieb gelöst, was vorher noch knifflig war.',
    ]);
    // Stellenwerte got worse: nothing is said about it.
    expect(growth.textContent).not.toContain('Stellenwerte');
    const lines = linesOf(await growthIn(/Schriftlich/));
    expect(lines).toContain('Du hast den Übertrag fünfmal richtig beachtet.');
    // not yet overcome: nothing is said about it
    expect(lines.join(' ')).not.toMatch(/stellengerecht|untereinander/i);
  });

  it('says "Früher" for progress saved before the tracking existed, and never "0 von 10"', async () => {
    const s = stateWith({ 'zahlen.runden#1': progress('geuebt'), 'zahlen.runden#2': progress('sicher') });
    s.growth = {
      stufen: {
        'zahlen.runden#1': { earlyN: 10, earlyOk: 3, earlyWrong: 7, earlyDay: '2026-10-10', carried: true, after: 10, best: 8 },
        'zahlen.runden#2': { earlyN: 10, earlyOk: 0, earlyWrong: 10, earlyDay: '2026-10-10', after: 10, best: 7 },
      },
      errors: {},
      facts: {},
    };
    current.state = s;
    render(<ProgressPage />);
    expect(linesOf(await growthIn(/^Zahlen bis/))).toEqual([
      'Stufe 1: Früher 3 von 10 auf Anhieb, später 8 von 10.',
      'Stufe 2: Am Anfang war das noch knifflig – später 7 von 10 auf Anhieb.',
    ]);
  });

  it('an overcome error in written subtraction is worded for the child’s subtraction method', async () => {
    const withMethod = (subtractionMethod: 'abziehen' | 'ergaenzen') => {
      const st = stateWith({ 'schriftlich.plus#1': progress('sicher', { recent: T }) }, { settings: { ...stateWith().settings, subtractionMethod } });
      st.growth = { stufen: {}, errors: { 'schriftlich.plus': { entbuendeln: { day: '2026-10-12', seen: 2, run: 5, done: '2026-10-14' } } }, facts: {} };
      return st;
    };
    current.state = withMethod('abziehen');
    render(<ProgressPage />);
    expect(linesOf(await growthIn(/Schriftlich/))).toContain('Du hast das Entbündeln fünfmal richtig gemacht.');
    cleanup();
    current.state = withMethod('ergaenzen');
    render(<ProgressPage />);
    expect(linesOf(await growthIn(/Schriftlich/))).toContain('Du hast das Erweitern mit der gemerkten 1 fünfmal richtig gemacht.');
  });

  it('a tag without a family still gets a calm, positive line (said once)', async () => {
    const st = stateWith({ 'schriftlich.plus#1': progress('sicher', { recent: T }) });
    const done = { day: '2026-10-12', seen: 2, run: 5, done: '2026-10-14' };
    st.growth = { stufen: {}, errors: { 'schriftlich.plus': { 'neu.fehler': done, 'noch-neuer': { ...done, done: '2026-10-15' } } }, facts: {} };
    current.state = st;
    render(<ProgressPage />);
    expect(linesOf(await growthIn(/Schriftlich/))).toEqual(['Du hast die knifflige Stelle in diesen Aufgaben fünfmal richtig gelöst.']);
  });

  it('shows nothing (no empty box, no pressure) without improvement', async () => {
    current.state = stateWith({ 'zahlen.runden#1': progress('geuebt', { recent: [true, false] }) });
    render(<ProgressPage />);
    await screen.findByRole('table');
    expect(screen.queryByRole('heading', { name: /So hast du dich verbessert/ })).toBeNull();
    expect(document.querySelector('.progress-growth')).toBeNull();
  });

  it('the view is plain text in headings and lists: nothing to operate, the topic link stays reachable by keyboard', async () => {
    current.state = improvedState();
    render(<ProgressPage />);
    const growth = await growthIn(/^Zahlen bis/);
    expect(growth.querySelectorAll('a, button, input, [tabindex]')).toHaveLength(0);
    // reading order: table, then the improvements, then "Weiter üben"
    const link = screen.getByRole('link', { name: 'Weiter üben: Zahlen' });
    expect(growth.compareDocumentPosition(link) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    const text = document.body.textContent ?? '';
    for (const banned of IMPROVEMENT_BANNED_PHRASES) expect(text.toLowerCase(), banned).not.toContain(banned);
    expect(text).not.toMatch(/schneller|schlau|0 von 10/i);
  });
});

describe('BadgesPage', () => {
  it('lists only earned badges (newest first) and keeps the rest a surprise', () => {
    current.state = stateWith({}, { badges: { 'runden-profi': '2026-10-01', 'einmaleins-profi': '2026-10-12', 'unbekannt': '2026-10-13' } });
    render(<BadgesPage />);
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(items[0].textContent).toContain('Einmaleins-Profi');
    expect(items[0].textContent).toContain('Bekommen am 12.\u00A0Oktober 2026');
    expect(items[1].textContent).toContain('Runden-Profi');
    expect(screen.queryByText('Geheimes Abzeichen')).toBeNull();
    // No teaser for badges still to come (M6/M8: no list of rewards to chase).
    expect(document.body.textContent).not.toMatch(/noch mehr|entdecken|freischalten|sammle/i);
    expect(earnedBadges({}).length).toBe(0);
  });
});

describe('Legal pages', () => {
  it('Datenschutz: child layer of 5–7 short sentences, then the full text with placeholders', () => {
    render(<PrivacyPage />);
    expect(KIDS_PRIVACY.length).toBeGreaterThanOrEqual(5);
    expect(KIDS_PRIVACY.length).toBeLessThanOrEqual(7);
    for (const s of KIDS_PRIVACY) {
      for (const sentence of s.split(/(?<=\.)\s+/)) expect(sentence.split(/\s+/).length, sentence).toBeLessThanOrEqual(15);
    }
    const kids = screen.getByRole('region', { name: 'Für Kinder erklärt' });
    expect(within(kids).getAllByRole('listitem')).toHaveLength(KIDS_PRIVACY.length);
    const text = document.body.textContent ?? '';
    for (const needle of ['Google Ireland Limited', 'Art. 6 Abs. 1 lit. f DSGVO', 'Data Privacy Framework', 'Standardvertragsklauseln', 'mathe4.v1', 'Art. 77', 'Art. 15', 'Art. 21', 'keine Cookies']) {
      expect(text, needle).toContain(needle);
    }
    expect(screen.getAllByText(OPERATOR_PLACEHOLDER).length).toBeGreaterThan(0);
  });

  it('Datenschutz: names the data of the improvement badges (days only, error types, Einmaleins misses)', () => {
    render(<PrivacyPage />);
    const text = document.body.textContent ?? '';
    expect(text).toContain('für die Abzeichen fürs Besserwerden');
    expect(text).toContain('typischen Fehlerarten');
    expect(text).toContain('je Einmaleins-Aufgabe der Tag, an dem sie zuletzt danebenging');
    expect(text).toContain('nur das Datum, ohne Uhrzeit');
  });

  it('Datenschutz: localStorage rests on the § 25 Abs. 2 Nr. 2 TDDDG exemption only, never on consent (P1/P2)', () => {
    render(<PrivacyPage />);
    const text = (document.body.textContent ?? '').replace(/\s+/g, ' ');
    expect(text).toContain('§ 25 Abs. 2 Nr. 2 TDDDG');
    // A DSGVO consent of a child would trigger Art. 8 – the design avoids relying on consent.
    expect(text).not.toMatch(/Einwilligung|Art\. [78](?!\d)|§ 25 Abs\. 1(?!\d)/);
    expect(text).toContain('„Nicht mehr merken“');
    expect(text).toContain('der Betreiber erhält sie nicht');
  });

  it('Impressum: § 5 DDG with placeholders while the operator config is empty', () => {
    render(<ImprintPage />);
    expect(screen.getByRole('heading', { name: 'Angaben gemäß § 5 DDG' })).toBeTruthy();
    expect(screen.getAllByText(OPERATOR_PLACEHOLDER).length).toBeGreaterThanOrEqual(3);
    expect(screen.queryByRole('link', { name: /@/ })).toBeNull();
  });
});

describe('language', () => {
  it('no page uses banned phrases or ×/÷', async () => {
    current.state = stateWith({ 'zahlen.runden#1': progress('sicher') }, { badges: { 'runden-profi': '2026-10-01' }, days: ['2026-10-01'] });
    const pages = [<HomePage key="h" />, <TopicPage key="t" topicId="zahlen" />, <ProgressPage key="p" />, <BadgesPage key="b" />, <AdultsPage key="a" />, <PrivacyPage key="d" />, <ImprintPage key="i" />, <NotFoundPage key="n" />];
    for (const page of pages) {
      render(page);
      await new Promise((r) => setTimeout(r, 0));
      const lower = (document.body.textContent ?? '').toLowerCase();
      for (const banned of BANNED_PHRASES) {
        const re = new RegExp(`(^|[^a-zäöüß])${banned}([^a-zäöüß]|$)`);
        expect(re.test(lower), `"${banned}" on ${String(page.key)}`).toBe(false);
      }
      expect(lower.includes('×') || lower.includes('÷')).toBe(false);
      cleanup();
    }
  });
});
