// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { StrictMode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BOX, TIMES } from '../../core/format';
import type { Exercise, SkillDef, TopicModule } from '../../core/types';
import { DEFAULT_SETTINGS, type RoundSlot } from '../../state/types';
import { serializeState } from '../../state/schema';
import { EFFORT_PHRASES, EXAMPLE_AGAIN_INTRO, EXAMPLE_INTRO, NORMALISING_PHRASES, TWIN_SOLVED_PHRASES, UNCHANGED_ANSWER } from './phrases';
import { resetPracticeVisit } from './visit';

// ── Test doubles ────────────────────────────────────────────────────────────
// A tiny Einmaleins skill: a · b = □ with one bug (a · b + a) and two hints.
const testSkill: SkillDef = {
  id: 'kopfrechnen.test',
  topicId: 'kopfrechnen',
  title: 'Testeinmaleins',
  description: 'Zum Testen.',
  stufen: { 1: 'leicht', 2: 'mittel', 3: 'schwer' },
  kmk: ['ZO.kopfrechnen'],
  generate(rng, stufe): Exercise {
    const a = rng.int(2, 9);
    const b = rng.int(2, 9);
    return {
      key: `kopfrechnen.test:${a}x${b}`,
      topicId: 'kopfrechnen',
      skillId: 'kopfrechnen.test',
      stufe,
      ab: 1,
      prompt: 'Rechne.',
      expression: `${a} ${TIMES} ${b} = ${BOX}`,
      answer: { kind: 'number', value: a * b },
      hints: ['Nutze eine Kernaufgabe.', 'Rechne mit 10 und ziehe ab.'],
      steps: [`${a} ${TIMES} 10 = ${a * 10}`, `${a} ${TIMES} ${b} = ${a * b}`],
      bugs: [{ id: 'one-more', match: a * b + a, hint: 'Du hast eine Reihe zu viel gerechnet.' }],
      praise: 'Du hast die Kernaufgabe genutzt.',
      srText: `Wie viel ist ${a} mal ${b}?`,
      kmk: ['ZO.kopfrechnen'],
      factKey: `${Math.min(a, b)}x${Math.max(a, b)}`,
    };
  },
};
const testModule: TopicModule = { topicId: 'kopfrechnen', skills: [testSkill] };

const roundState = vi.hoisted(() => ({ size: 3, empty: false }));
const loadState = vi.hoisted(() => ({ gate: null as Promise<void> | null }));

vi.mock('../../topics/registry', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../topics/registry')>();
  return {
    ...actual,
    loadTopic: vi.fn(async () => {
      if (loadState.gate) await loadState.gate;
      return testModule;
    }),
    loadAllTopics: vi.fn(async () => [testModule]),
  };
});

vi.mock('../../state/round', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../state/round')>();
  return {
    ...actual,
    buildRound: vi.fn((plan: { mode: string; skillId?: string; stufe?: 1 | 2 | 3 }): RoundSlot[] => {
      if (roundState.empty) return [];
      return Array.from({ length: roundState.size }, () => ({
        skillId: 'kopfrechnen.test',
        stufe: plan.stufe ?? 1,
        purpose: plan.mode === 'review' ? ('review' as const) : ('practice' as const),
      }));
    }),
  };
});

vi.mock('../../state/store', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../state/store')>();
  return { ...actual, store: actual.createStore(null) };
});

import PracticePage from './PracticePage';
import { store } from '../../state/store';

// ── Helpers ─────────────────────────────────────────────────────────────────
let clock = 1_000_000;

beforeEach(() => {
  clock = 1_000_000;
  vi.spyOn(Date, 'now').mockImplementation(() => clock);
  // Pointer clicks would be filtered by the 400 ms holdover guard; move performance.now on.
  vi.spyOn(performance, 'now').mockImplementation(() => clock);
  roundState.size = 3;
  roundState.empty = false;
  loadState.gate = null;
  resetPracticeVisit();
  store.reset();
  store.updateSettings({ ...DEFAULT_SETTINGS }); // reset() keeps settings; tests must not leak them
  vi.spyOn(store, 'recordAnswer');
  vi.spyOn(store, 'recordRound');
  vi.spyOn(store, 'recordBlitz');
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

/** Pretend to be a touch device (primary pointer coarse): the Ziffernblock is on unless switched off. */
function touchDevice() {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query === '(pointer: coarse)',
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
}

const field = () => screen.getByLabelText('Deine Antwort') as HTMLInputElement;

function solution(): number {
  const text = document.querySelector('.pr-item .pr-expression')!.textContent!;
  const m = /^(\d+) · (\d+) = □$/.exec(text)!;
  return Number(m[1]) * Number(m[2]);
}

function firstFactor(): number {
  const text = document.querySelector('.pr-item .pr-expression')!.textContent!;
  return Number(/^(\d+)/.exec(text)![1]);
}

/** Mark the test skill as practised (mastery 'geuebt'), so no Einstiegs-Check runs. */
function practised(stufe: 1 | 2 | 3 = 1) {
  store.recordAnswer({ skillId: 'kopfrechnen.test', topicId: 'kopfrechnen', stufe, firstTry: true, solved: true, usedHint: false, purpose: 'practice', day: '2026-10-01' });
  vi.mocked(store.recordAnswer).mockClear();
}

async function startSkillRound(onExit = vi.fn(), onNavigate = vi.fn()) {
  render(<PracticePage plan={{ mode: 'skill', skillId: 'kopfrechnen.test', stufe: 1 }} onExit={onExit} onNavigate={onNavigate} />);
  // A new skill+Stufe starts with the Einstiegs-Check: plain items, no forced worked example.
  await screen.findByRole('button', { name: 'Prüfen' });
  expect(screen.queryByRole('button', { name: 'Jetzt selbst probieren' })).toBeNull();
  return { onExit, onNavigate };
}

function failItem() {
  answer('1');
  prufen();
  answer('2');
  prufen();
}

function answer(value: string) {
  fireEvent.change(screen.getByLabelText('Deine Antwort'), { target: { value } });
}

function prufen() {
  fireEvent.click(screen.getByRole('button', { name: 'Prüfen' }));
}

function weiter() {
  fireEvent.click(screen.getByRole('button', { name: 'Weiter' }));
}

const BREAK = 'Du übst schon eine ganze Weile. Zeit für eine kleine Pause?';
const breakHeading = () => screen.queryByRole('heading', { name: BREAK });

function progress(): string {
  return document.querySelector('.pr-progress__text')?.textContent ?? '';
}

function live(): string {
  return document.querySelector('[role=status][aria-live=polite]')!.textContent ?? '';
}

// ── Tests ───────────────────────────────────────────────────────────────────
describe('PracticePage: item flow', () => {
  it('first-try correct: praise, live announcement, focus on Weiter, recorded once', async () => {
    await startSkillRound();
    expect(progress()).toBe('Aufgabe 1 von 3');
    expect(screen.getByRole('button', { name: 'Tipp' })).toBeTruthy();
    const check = screen.getByRole('button', { name: 'Prüfen' }) as HTMLButtonElement;
    expect(check.disabled).toBe(true);
    const value = solution();
    answer(String(value));
    expect(check.disabled).toBe(false);
    prufen();
    expect(screen.getByText('Richtig!')).toBeTruthy();
    expect(screen.getByText('Du hast die Kernaufgabe genutzt.')).toBeTruthy();
    expect(live()).toMatch(new RegExp(`^Richtig! \\d+ mal \\d+ ist ${value}\\. Du hast die Kernaufgabe genutzt\\.$`));
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Weiter' }));
    expect(store.recordAnswer).toHaveBeenCalledTimes(1);
    expect(vi.mocked(store.recordAnswer).mock.calls[0][0]).toMatchObject({
      skillId: 'kopfrechnen.test',
      topicId: 'kopfrechnen',
      stufe: 1,
      firstTry: true,
      solved: true,
      usedHint: false,
      purpose: 'practice',
    });
    const event = vi.mocked(store.recordAnswer).mock.calls[0][0];
    expect(event.day).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(event).not.toHaveProperty('sessionId');
    expect(event.factKey).toMatch(/^\dx\d$/);
    expect(typeof event.latencyMs).toBe('number');
    // Enter in the (now read-only) field does nothing more.
    fireEvent.keyDown(screen.getByLabelText('Deine Antwort'), { key: 'Enter' });
    expect(store.recordAnswer).toHaveBeenCalledTimes(1);
  });

  it('Enter in the field submits', async () => {
    await startSkillRound();
    answer(String(solution()));
    fireEvent.keyDown(screen.getByLabelText('Deine Antwort'), { key: 'Enter' });
    expect(screen.getByText('Richtig!')).toBeTruthy();
  });

  it('1st wrong → bug hint, retry; 2nd try correct → effort praise, not first-try', async () => {
    await startSkillRound();
    const value = solution();
    answer(String(value + firstFactor()));
    prufen();
    expect(screen.getByText('Noch nicht ganz – probier es noch einmal.')).toBeTruthy();
    expect(screen.getByText('Du hast eine Reihe zu viel gerechnet.')).toBeTruthy();
    expect(screen.getByLabelText('Deine Antwort').className).toContain('is-wrong');
    expect(store.recordAnswer).not.toHaveBeenCalled();
    // Editing removes the marks; the hint stays.
    answer(String(value));
    expect(screen.getByLabelText('Deine Antwort').className).not.toContain('is-wrong');
    prufen();
    expect(screen.getByText('Richtig!')).toBeTruthy();
    expect(screen.getByText('Geschafft – du bist drangeblieben.')).toBeTruthy();
    expect(store.recordAnswer).toHaveBeenCalledTimes(1);
    expect(vi.mocked(store.recordAnswer).mock.calls[0][0]).toMatchObject({ firstTry: false, solved: true });
  });

  it('1st wrong without a bug shows the next strategy hint', async () => {
    await startSkillRound();
    answer('1');
    prufen();
    const panel = document.querySelector('.pr-feedback--retry') as HTMLElement;
    expect(within(panel).getByText('Nutze eine Kernaufgabe.')).toBeTruthy();
  });

  it('2nd wrong → worked solution, revealed answer, Zwillingsaufgabe inserted, recorded as not solved', async () => {
    await startSkillRound();
    const value = solution();
    answer('1');
    prufen();
    answer('2');
    prufen();
    expect(screen.getByText('Lass uns das zusammen anschauen.')).toBeTruthy();
    expect(screen.getByText('Die Lösung:')).toBeTruthy();
    expect(screen.getAllByText(new RegExp(`= ${value}$`)).length).toBeGreaterThan(0);
    expect((screen.getByLabelText('Deine Antwort') as HTMLInputElement).value).toBe(String(value));
    const panel = document.querySelector('.pr-feedback--solution')!;
    expect(NORMALISING_PHRASES.some((n) => panel.textContent!.includes(n))).toBe(true);
    expect(screen.getByText(/Gleich kommt eine ähnliche Aufgabe/)).toBeTruthy();
    expect(progress()).toBe('Aufgabe 1 von 4');
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Weiter' }));
    expect(store.recordAnswer).toHaveBeenCalledTimes(1);
    expect(vi.mocked(store.recordAnswer).mock.calls[0][0]).toMatchObject({ firstTry: false, solved: false });
    expect(live()).toContain('Lass uns das zusammen anschauen.');
    expect(document.body.textContent).not.toMatch(/falsch/i);
  });

  it('Tipp reveals hints one at a time and the item no longer counts as first-try', async () => {
    await startSkillRound();
    fireEvent.click(screen.getByRole('button', { name: 'Tipp' }));
    expect(screen.getByText('Nutze eine Kernaufgabe.')).toBeTruthy();
    expect(live()).toBe('Tipp 1: Nutze eine Kernaufgabe.');
    fireEvent.click(screen.getByRole('button', { name: 'Tipp' }));
    expect(screen.getByText('Rechne mit 10 und ziehe ab.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Keine weiteren Tipps' }).getAttribute('aria-disabled')).toBe('true');
    answer(String(solution()));
    prufen();
    expect(vi.mocked(store.recordAnswer).mock.calls[0][0]).toMatchObject({ firstTry: false, solved: true, usedHint: true });
  });

  it('invalid input gives a neutral message and is not counted', async () => {
    await startSkillRound();
    answer('3,5');
    prufen();
    expect(screen.getByText('Hier ist eine ganze Zahl gesucht – ohne Komma.', { selector: 'p' })).toBeTruthy();
    expect(live()).toBe('Hier ist eine ganze Zahl gesucht – ohne Komma.');
    expect(screen.queryByText('Noch nicht ganz – probier es noch einmal.')).toBeNull();
    expect(store.recordAnswer).not.toHaveBeenCalled();
    answer(String(solution()));
    expect(screen.queryByText('Hier ist eine ganze Zahl gesucht – ohne Komma.', { selector: 'p' })).toBeNull();
    prufen();
    expect(vi.mocked(store.recordAnswer).mock.calls[0][0]).toMatchObject({ firstTry: true });
  });

  it('a pointer tap on Weiter right after it appeared is ignored (holdover), a later one works', async () => {
    await startSkillRound();
    answer(String(solution()));
    prufen();
    const next = screen.getByRole('button', { name: 'Weiter' });
    fireEvent.click(next, { detail: 1 });
    expect(progress()).toBe('Aufgabe 1 von 3');
    clock += 500;
    fireEvent.click(next, { detail: 1 });
    expect(progress()).toBe('Aufgabe 2 von 3');
  });

  it("'So geht's' opens an inline worked example with all steps", async () => {
    await startSkillRound();
    const toggle = screen.getByRole('button', { name: "So geht's" });
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(toggle);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    const panel = document.getElementById('pr-manual-example')!;
    expect(within(panel).getByText('So rechnest du:')).toBeTruthy();
    expect(panel.querySelectorAll('.pr-steps li')).toHaveLength(2);
    fireEvent.click(within(panel).getByRole('button', { name: 'Schließen' }));
    expect(document.getElementById('pr-manual-example')).toBeNull();
  });

  it("'Beenden' leaves with one tap", async () => {
    const { onExit } = await startSkillRound();
    fireEvent.click(screen.getByRole('button', { name: 'Beenden' }));
    expect(onExit).toHaveBeenCalledTimes(1);
  });
});

describe('PracticePage: consent, round end, breaks', () => {
  it('asks for storage consent inline after the first finished item', async () => {
    await startSkillRound();
    expect(screen.queryByText('Soll ich mir deinen Fortschritt auf diesem Gerät merken?')).toBeNull();
    answer(String(solution()));
    prufen();
    expect(screen.getByText('Soll ich mir deinen Fortschritt auf diesem Gerät merken?')).toBeTruthy();
    expect(screen.getByText('Wird nur auf diesem Gerät gespeichert. Nichts wird verschickt.')).toBeTruthy();
    // 'Mehr dazu' opens inline (the round is not left); the adults' text opens in a new tab
    const more = screen.getByText('Mehr dazu').closest('details')!;
    expect(more.textContent).toContain('Mathe 4 weiß nicht, wer du bist.');
    const adults = screen.getByRole('link', { name: /Datenschutz für Erwachsene/ });
    expect(adults.getAttribute('href')).toBe('/datenschutz');
    expect(adults.getAttribute('target')).toBe('_blank');
    const yes = screen.getByRole('button', { name: 'Ja, merken' });
    const no = screen.getByRole('button', { name: 'Nein' });
    expect(yes.className).toBe(no.className);
    const setConsent = vi.spyOn(store, 'setConsent');
    yes.focus();
    fireEvent.click(yes);
    expect(setConsent).toHaveBeenCalledWith('granted');
    expect(screen.queryByRole('button', { name: 'Ja, merken' })).toBeNull();
    // the answered button is gone: focus goes on to 'Weiter', not to <body>
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Weiter' }));
  });

  it('runs a whole round to a success-framed summary and records the round once', async () => {
    practised();
    const { onExit } = await startSkillRound();
    // Item 1 right, item 2 needs the solution (→ twin), items 3 and twin right.
    answer(String(solution()));
    prufen();
    weiter();
    answer('1');
    prufen();
    answer('2');
    prufen();
    weiter();
    for (let i = 0; i < 2; i++) {
      answer(String(solution()));
      prufen();
      weiter();
    }
    expect(screen.getByText('3 von 4 geschafft – 1 Aufgabe war noch knifflig.', { selector: 'p' })).toBeTruthy();
    // The header keeps the skill title, Stufe and topic accent on the summary.
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('TesteinmaleinsStufe 1');
    expect(document.querySelector('.pr-header')!.className).toContain('accent-kopfrechnen');
    expect(store.recordAnswer).toHaveBeenCalledTimes(4);
    const purposes = vi.mocked(store.recordAnswer).mock.calls.map((c) => c[0].purpose);
    expect(purposes.filter((p) => p === 'twin')).toHaveLength(1);
    expect(store.recordRound).toHaveBeenCalledTimes(1);
    expect(vi.mocked(store.recordRound).mock.calls[0][0]).toMatchObject({ answered: 4, firstTry: 3 });
    expect(document.querySelector('.pr-mastery__name')!.textContent).toMatch(/Testeinmaleins/);
    expect(screen.getByRole('img', { name: /von 3 Sternen/ })).toBeTruthy();
    const again = screen.getByRole('button', { name: 'Noch eine Runde' });
    const done = screen.getByRole('button', { name: 'Fertig für heute' });
    expect(again.className).toBe(done.className);
    fireEvent.click(done);
    expect(screen.getByRole('heading', { name: 'Super, dass du heute geübt hast. Bis zum nächsten Mal!' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Zur Übersicht' }));
    expect(onExit).toHaveBeenCalledTimes(1);
  });

  it("'Noch eine Runde' starts a fresh round without autoplay", async () => {
    roundState.size = 1;
    await startSkillRound();
    answer(String(solution()));
    prufen();
    weiter();
    fireEvent.click(screen.getByRole('button', { name: 'Noch eine Runde' }));
    await screen.findByRole('button', { name: 'Prüfen' });
    expect(progress()).toBe('Aufgabe 1 von 1');
    // No worked example (the Einstiegs-Check is still running); focus moves to the new task's answer field.
    expect(screen.queryByRole('button', { name: 'Jetzt selbst probieren' })).toBeNull();
    expect(document.activeElement).toBe(field());
  });

  it('suggests a break once after 20 minutes of continuous practice, at an item boundary', async () => {
    roundState.size = 6;
    await startSkillRound();
    for (let i = 0; i < 3; i++) {
      clock += 7 * 60 * 1000;
      answer(String(solution()));
      prufen();
      if (i < 2) weiter();
    }
    clock += 60 * 1000;
    weiter();
    // focus moves to the question (not lost to <body>) and it is announced
    expect(document.activeElement).toBe(breakHeading());
    expect(live()).toContain(BREAK);
    fireEvent.click(screen.getByRole('button', { name: 'Pause machen' }));
    expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'Gute Idee, eine Pause zu machen!' }));
    fireEvent.click(screen.getByRole('button', { name: 'Weiter üben' }));
    expect(progress()).toBe('Aufgabe 4 von 6');
    answer(String(solution()));
    prufen();
    weiter();
    expect(breakHeading()).toBeNull();
  });

  it('a real pause (> 10 minutes without practice) restarts the break timer', async () => {
    await startSkillRound();
    clock += 9 * 60 * 1000;
    answer(String(solution()));
    prufen();
    clock += 15 * 60 * 1000; // the tablet lay around
    weiter();
    expect(breakHeading()).toBeNull();
    expect(progress()).toBe('Aufgabe 2 von 3');
  });

  it('the break timer and the session id survive navigation to another skill or Stufe', async () => {
    render(<PracticePage plan={{ mode: 'skill', skillId: 'kopfrechnen.test', stufe: 1 }} onExit={vi.fn()} onNavigate={vi.fn()} />);
    await screen.findByRole('button', { name: 'Prüfen' });
    for (let i = 0; i < 2; i++) {
      clock += 6 * 60 * 1000;
      answer(String(solution()));
      prufen();
      weiter();
    }
    cleanup(); // back to the start page, then another Stufe
    clock += 5 * 60 * 1000;
    render(<PracticePage plan={{ mode: 'skill', skillId: 'kopfrechnen.test', stufe: 2 }} onExit={vi.fn()} onNavigate={vi.fn()} />);
    await screen.findByRole('button', { name: 'Prüfen' });
    clock += 5 * 60 * 1000;
    answer(String(solution()));
    prufen();
    weiter();
    expect(breakHeading()).toBeTruthy();
  });

  it('the normalising sentence appears at most once per visit, also across pages', async () => {
    render(<PracticePage plan={{ mode: 'skill', skillId: 'kopfrechnen.test', stufe: 1 }} onExit={vi.fn()} onNavigate={vi.fn()} />);
    await screen.findByRole('button', { name: 'Prüfen' });
    failItem();
    expect(NORMALISING_PHRASES.some((n) => document.querySelector('.pr-feedback--solution')!.textContent!.includes(n))).toBe(true);
    cleanup();
    render(<PracticePage plan={{ mode: 'skill', skillId: 'kopfrechnen.test', stufe: 3 }} onExit={vi.fn()} onNavigate={vi.fn()} />);
    await screen.findByRole('button', { name: 'Prüfen' });
    failItem();
    expect(NORMALISING_PHRASES.some((n) => document.querySelector('.pr-feedback--solution')!.textContent!.includes(n))).toBe(false);
  });

  it('shows the worked example again after 2 items in a row needed the solution', async () => {
    roundState.size = 4;
    practised();
    await startSkillRound();
    for (let i = 0; i < 2; i++) {
      answer('1');
      prufen();
      answer('2');
      prufen();
      weiter();
    }
    expect(screen.getByText(EXAMPLE_AGAIN_INTRO)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Jetzt selbst probieren' }));
    expect(screen.getByLabelText('Deine Antwort')).toBeTruthy();
  });

  it('empty review: friendly message and a way back', async () => {
    roundState.empty = true;
    const onExit = vi.fn();
    render(<PracticePage plan={{ mode: 'review' }} onExit={onExit} onNavigate={vi.fn()} />);
    expect(await screen.findByText('Heute ist nichts zu wiederholen.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Zurück zur Übersicht' }));
    expect(onExit).toHaveBeenCalled();
  });

  it('unknown skill: friendly message', async () => {
    render(<PracticePage plan={{ mode: 'skill', skillId: 'kopfrechnen.gibtsnicht', stufe: 1 }} onExit={vi.fn()} onNavigate={vi.fn()} />);
    expect(await screen.findByText('Diese Übung gibt es hier noch nicht.')).toBeTruthy();
  });
});

describe('PracticePage: attempts, examples and focus', () => {
  it('checking the unchanged wrong answer again is not a 2nd attempt', async () => {
    await startSkillRound();
    answer('1');
    prufen();
    expect(screen.getByText('Noch nicht ganz – probier es noch einmal.')).toBeTruthy();
    clock += 500;
    prufen(); // e.g. Enter pressed twice
    expect(screen.queryByText('Lass uns das zusammen anschauen.')).toBeNull();
    expect(screen.getByText(UNCHANGED_ANSWER, { selector: 'p' })).toBeTruthy();
    expect(live()).toBe(UNCHANGED_ANSWER);
    fireEvent.keyDown(screen.getByLabelText('Deine Antwort'), { key: 'Enter' });
    expect(screen.queryByText('Lass uns das zusammen anschauen.')).toBeNull();
    expect(store.recordAnswer).not.toHaveBeenCalled();
    // A changed answer is checked as the 2nd attempt.
    answer(String(solution()));
    expect(screen.queryByText(UNCHANGED_ANSWER, { selector: 'p' })).toBeNull();
    prufen();
    expect(screen.getByText('Richtig!')).toBeTruthy();
    expect(vi.mocked(store.recordAnswer).mock.calls[0][0]).toMatchObject({ firstTry: false, solved: true });
  });

  it('Einstiegs-Check: 3 first-try correct items → no worked example at all', async () => {
    roundState.size = 4;
    await startSkillRound();
    for (let i = 0; i < 3; i++) {
      answer(String(solution()));
      prufen();
      weiter();
    }
    expect(progress()).toBe('Aufgabe 4 von 4');
    expect(screen.queryByRole('heading', { name: "So geht's" })).toBeNull();
    expect(screen.getByRole('button', { name: 'Prüfen' })).toBeTruthy();
  });

  it('Einstiegs-Check: a missed item brings the worked example before the next item', async () => {
    roundState.size = 4;
    await startSkillRound();
    failItem();
    weiter();
    expect(screen.getByRole('heading', { name: "So geht's" })).toBeTruthy();
    expect(screen.getByText(EXAMPLE_INTRO)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Prüfen' })).toBeNull();
    expect(document.activeElement).toBe(document.getElementById('pr-intro-example'));
    fireEvent.click(screen.getByRole('button', { name: 'Jetzt selbst probieren' }));
    expect(screen.getByRole('button', { name: 'Prüfen' })).toBeTruthy();
    expect(document.activeElement).toBe(field());
  });

  it('mixed rounds never force an intro example', async () => {
    roundState.size = 3;
    render(<PracticePage plan={{ mode: 'mixed', topicId: 'kopfrechnen' }} onExit={vi.fn()} onNavigate={vi.fn()} />);
    await screen.findByRole('button', { name: 'Prüfen' });
    failItem();
    weiter();
    expect(screen.queryByText(EXAMPLE_INTRO)).toBeNull();
    expect(screen.getByRole('button', { name: 'Prüfen' })).toBeTruthy();
    expect(screen.getByRole('button', { name: "So geht's" })).toBeTruthy();
  });

  it("opening 'So geht's' during an item counts as help; closing it returns focus to the toggle", async () => {
    await startSkillRound();
    const toggle = screen.getByRole('button', { name: "So geht's" });
    fireEvent.click(toggle);
    const panel = document.getElementById('pr-manual-example')!;
    fireEvent.click(within(panel).getByRole('button', { name: 'Schließen' }));
    expect(document.getElementById('pr-manual-example')).toBeNull();
    expect(document.activeElement).toBe(toggle);
    answer(String(solution()));
    prufen();
    expect(vi.mocked(store.recordAnswer).mock.calls[0][0]).toMatchObject({ firstTry: false, solved: true, usedHint: true });
  });

  it('without a touch screen, the first task takes the focus from the loading heading (answer field)', async () => {
    let release: () => void = () => {};
    loadState.gate = new Promise<void>((r) => {
      release = r;
    });
    render(<PracticePage plan={{ mode: 'mixed', topicId: 'kopfrechnen' }} onExit={vi.fn()} onNavigate={vi.fn()} />);
    screen.getByRole('heading', { level: 1 }).focus(); // what useRouteFocus does after a navigation
    await act(async () => {
      release();
    });
    await screen.findByRole('button', { name: 'Prüfen' });
    // the round mounts after an async load: its focus effect may run just after the button appears
    await waitFor(() => expect(document.activeElement).toBe(field()));
    // the field is described by the task, so a screen reader reads the question
    expect(field().getAttribute('aria-describedby')!.split(' ')).toContain(document.querySelector('.pr-item')!.getAttribute('aria-describedby'));
  });

  it("on a touch screen without the Ziffernblock, keeps the route focus on the page heading (no native keyboard pops up)", async () => {
    touchDevice();
    store.updateSettings({ keypad: 'off' });
    let release: () => void = () => {};
    loadState.gate = new Promise<void>((r) => {
      release = r;
    });
    render(<PracticePage plan={{ mode: 'mixed', topicId: 'kopfrechnen' }} onExit={vi.fn()} onNavigate={vi.fn()} />);
    const loadingHeading = screen.getByRole('heading', { level: 1 });
    loadingHeading.focus(); // what useRouteFocus does after a navigation
    await act(async () => {
      release();
    });
    await screen.findByRole('button', { name: 'Prüfen' });
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).not.toBe(loadingHeading);
    await waitFor(() => expect(document.activeElement).toBe(heading));
  });

  it('first page load on a touch screen without the Ziffernblock: focus stays where it was', async () => {
    touchDevice();
    store.updateSettings({ keypad: 'off' });
    await startSkillRound();
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(document.activeElement).toBe(document.body);
  });

  it('first page load on a touch screen with the Ziffernblock: the field takes focus without the native keyboard', async () => {
    touchDevice();
    await startSkillRound();
    expect(screen.getByRole('group', { name: 'Ziffernblock' })).toBeTruthy();
    await waitFor(() => expect(document.activeElement).toBe(field()));
    expect(field().getAttribute('inputmode')).toBe('none');
  });

  it('first page load without a touch screen: the answer field takes focus', async () => {
    await startSkillRound();
    await waitFor(() => expect(document.activeElement).toBe(field()));
  });

  it("after 'Weiter' the next task's answer field has focus; after a wrong answer the field is focused with its text selected", async () => {
    practised();
    await startSkillRound();
    answer(String(solution()));
    prufen();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Weiter' }));
    weiter();
    expect(document.activeElement).toBe(field());
    (screen.getByRole('button', { name: 'Prüfen' }) as HTMLButtonElement).focus();
    answer('1');
    prufen();
    expect(screen.getByText('Noch nicht ganz – probier es noch einmal.')).toBeTruthy();
    expect(document.activeElement).toBe(field());
    expect([field().selectionStart, field().selectionEnd]).toEqual([0, 1]);
  });

  it("while the 'So geht's' example is open, the Ziffernblock does not type into the hidden field", async () => {
    store.updateSettings({ keypad: 'on' });
    practised();
    await startSkillRound();
    const pad = screen.getByRole('group', { name: 'Ziffernblock' });
    fireEvent.click(screen.getByRole('button', { name: "So geht's" }));
    expect((within(pad).getByRole('button', { name: '7' }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(within(document.getElementById('pr-manual-example')!).getByRole('button', { name: 'Schließen' }));
    expect((within(pad).getByRole('button', { name: '7' }) as HTMLButtonElement).disabled).toBe(false);
  });

  it('Ziffernblock: Prüfen with every field filled checks (like Enter)', async () => {
    store.updateSettings({ keypad: 'on' });
    practised();
    await startSkillRound();
    const pad = screen.getByRole('group', { name: 'Ziffernblock' });
    for (const d of String(solution())) fireEvent.click(within(pad).getByRole('button', { name: d }));
    fireEvent.click(within(pad).getByRole('button', { name: 'Prüfen' }));
    expect(screen.getByText('Richtig!')).toBeTruthy();
  });

  it('with the Ziffernblock, Tipp and Prüfen are in its last row (one Prüfen)', async () => {
    store.updateSettings({ keypad: 'on' });
    await startSkillRound();
    const pad = screen.getByRole('group', { name: 'Ziffernblock' });
    expect(screen.getAllByRole('button', { name: 'Prüfen' })).toHaveLength(1);
    expect(within(pad).getByRole('button', { name: 'Prüfen' })).toBeTruthy();
    fireEvent.click(within(pad).getByRole('button', { name: 'Tipp' }));
    expect(screen.getByText('Nutze eine Kernaufgabe.')).toBeTruthy();
    (screen.getByLabelText('Deine Antwort') as HTMLInputElement).focus();
    for (const d of String(solution())) fireEvent.click(within(pad).getByRole('button', { name: d }));
    fireEvent.click(within(pad).getByRole('button', { name: 'Prüfen' }));
    expect(screen.getByText('Richtig!')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Weiter' })).toBeTruthy();
  });
});

describe('PracticePage: improvements in the round summary', () => {
  const improved = () => screen.queryByRole('region', { name: 'Das hast du verbessert' });
  const isEffort = (t: string) => (EFFORT_PHRASES as readonly string[]).includes(t);
  const praiseLines = () => [...document.querySelectorAll('.pr-item .pr-praise, .pr-item p')].map((p) => p.textContent ?? '');

  it('small improvements (2nd try, twin task) get one calm line each, announced with the summary', async () => {
    practised();
    await startSkillRound();
    // 1: wrong once (bug hint), then right → 2nd try
    const v = solution();
    answer(String(v + firstFactor()));
    prufen();
    answer(String(v));
    prufen();
    weiter();
    // 2: needs the solution → Zwillingsaufgabe at the end; 3: right
    failItem();
    weiter();
    answer(String(solution()));
    prufen();
    weiter();
    // the twin, first try: a calm in-item line, no badge, no pop-up
    expect(screen.getByText('Eine ähnliche Aufgabe wie vorhin')).toBeTruthy();
    answer(String(solution()));
    prufen();
    expect(praiseLines().some((t) => (TWIN_SOLVED_PHRASES as readonly string[]).includes(t))).toBe(true);
    expect(improved()).toBeNull();
    weiter();

    const section = improved()!;
    expect(within(section).getByRole('heading', { level: 3, name: 'Das hast du verbessert' })).toBeTruthy();
    expect(within(section).getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      'Nach dem Lösungsweg hast du die ähnliche Aufgabe auf Anhieb gelöst.',
      'Eine Aufgabe hast du im zweiten Versuch selbst gelöst.',
    ]);
    expect(section.querySelector('.is-big')).toBeNull();
    expect(screen.queryByText('Neues Abzeichen')).toBeNull();
    expect(live()).toBe(
      '3 von 4 geschafft – 1 Aufgabe war noch knifflig. Das hast du verbessert: Nach dem Lösungsweg hast du die ähnliche Aufgabe auf Anhieb gelöst. Eine Aufgabe hast du im zweiten Versuch selbst gelöst.',
    );
    // the matched mistake is recorded as its error-library tag (no family for this test skill: the id itself)
    const events = vi.mocked(store.recordAnswer).mock.calls.map((c) => c[0]);
    expect(events[0]).toMatchObject({ bugTags: ['one-more'], bugIds: ['one-more'], wrongAttempt: true });
    expect(events[2].bugIds).toBeUndefined();
  });

  it('an error overcome on a later day: shown first and emphasised, with its badge, only after the round', async () => {
    roundState.size = 5;
    // Earlier (another day) the child made the "one row too many" mistake in this skill (tracking needs the skill entry).
    practised();
    const st = store.get();
    store.importJson(serializeState({ ...st, growth: { ...st.growth, errors: { 'kopfrechnen.test': { 'one-more': { day: '2000-01-01', seen: 2, run: 0 } } } } }));
    await startSkillRound();
    for (let i = 0; i < 5; i++) {
      answer(String(solution()));
      prufen();
      // never during the round: no badge, no improvement note, nothing announced about it
      expect(document.body.textContent).not.toMatch(/Stolperstein|Abzeichen|verbessert/);
      expect(live()).not.toMatch(/Abzeichen|verbessert/);
      weiter();
    }
    const heading = screen.getByRole('heading', { level: 2, name: 'Runde geschafft' });
    expect(document.activeElement).toBe(heading);
    const section = improved()!;
    const lines = within(section).getAllByRole('listitem');
    expect(lines.map((li) => li.textContent)).toEqual(['Testeinmaleins: Du hast die knifflige Stelle in diesen Aufgaben jetzt fünfmal richtig gelöst.']);
    expect(lines[0].className).toContain('is-big');
    expect(screen.getByRole('heading', { level: 3, name: 'Neues Abzeichen' })).toBeTruthy();
    expect(screen.getByText('Stolperstein überwunden')).toBeTruthy();
    expect(live()).toBe(
      '5 von 5 geschafft. Das hast du verbessert: Testeinmaleins: Du hast die knifflige Stelle in diesen Aufgaben jetzt fünfmal richtig gelöst. Neues Abzeichen: Stolperstein überwunden.',
    );
    expect(store.get().badges['fehler-ueberwunden']).toBeDefined();
    expect(vi.mocked(store.recordAnswer).mock.calls.every((c) => c[0].bugTags?.[0] === 'one-more')).toBe(true);
  });

  it('keyboard and reading order: heading (focused), counts, improvements, badges, then the two equal buttons', async () => {
    roundState.size = 1;
    practised();
    await startSkillRound();
    // the whole item by keyboard: Enter checks (twice), focus then sits on Weiter
    const v = solution();
    answer(String(v + firstFactor()));
    fireEvent.keyDown(field(), { key: 'Enter' });
    answer(String(v));
    fireEvent.keyDown(field(), { key: 'Enter' });
    expect(screen.getByText('Richtig!')).toBeTruthy();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Weiter' }));
    weiter();
    const summary = document.querySelector('.pr-summary')!;
    expect(document.activeElement).toBe(within(summary as HTMLElement).getByRole('heading', { level: 2 }));
    const section = improved()!;
    // the notes are text only: nothing to tab through before the buttons
    expect(section.querySelectorAll('a, button, input, [tabindex]')).toHaveLength(0);
    const focusables = [...summary.querySelectorAll<HTMLElement>('button, a[href]')].map((b) => b.textContent);
    expect(focusables).toEqual(['Noch eine Runde', 'Fertig für heute']);
    const order = [summary.querySelector('h2'), summary.querySelector('.pr-summary__count'), section, summary.querySelector('.pr-pair')];
    for (let i = 1; i < order.length; i++) expect(order[i - 1]!.compareDocumentPosition(order[i]!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('caps the in-item acknowledgements per round: wrong answers on purpose do not keep paying', async () => {
    roundState.size = 5;
    practised();
    await startSkillRound();
    let acknowledged = 0;
    for (let i = 0; i < 5; i++) {
      const v = solution();
      answer(String(v + firstFactor()));
      prufen();
      answer(String(v));
      prufen();
      if (praiseLines().some(isEffort)) acknowledged += 1;
      weiter();
    }
    expect(acknowledged).toBe(3);
    // the summary aggregates them into one line
    expect(within(improved()!).getAllByRole('listitem').map((li) => li.textContent)).toEqual(['5 Aufgaben hast du im zweiten Versuch selbst gelöst.']);
    expect(store.get().badges).toEqual({});
  });
});

describe('PracticePage: StrictMode', () => {
  it('shows the intro example after a missed check item and records each item exactly once under StrictMode', async () => {
    roundState.size = 2;
    render(
      <StrictMode>
        <PracticePage plan={{ mode: 'skill', skillId: 'kopfrechnen.test', stufe: 2 }} onExit={vi.fn()} onNavigate={vi.fn()} />
      </StrictMode>,
    );
    await screen.findByRole('button', { name: 'Prüfen' });
    answer(String(solution()));
    prufen();
    weiter();
    answer('1');
    prufen();
    answer('2');
    prufen();
    expect(store.recordAnswer).toHaveBeenCalledTimes(2);
    weiter();
    expect(screen.getByText(EXAMPLE_INTRO)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Jetzt selbst probieren' }));
    expect(progress()).toBe('Aufgabe 3 von 3');
    answer(String(solution()));
    prufen();
    weiter();
    expect(store.recordAnswer).toHaveBeenCalledTimes(3);
    expect(store.recordRound).toHaveBeenCalledTimes(1);
    expect(screen.getByText('2 von 3 geschafft – 1 Aufgabe war noch knifflig.', { selector: 'p' })).toBeTruthy();
  });
});

describe('PracticePage: Blitzrunde gate', () => {
  it('is off unless enabled in the settings', async () => {
    render(<PracticePage plan={{ mode: 'blitz' }} onExit={vi.fn()} onNavigate={vi.fn()} />);
    expect(screen.getByText('Die Blitzrunde ist gerade ausgeschaltet.')).toBeTruthy();
    await act(async () => {});
  });

  it('explains kindly when no facts are mastered yet', async () => {
    store.updateSettings({ blitzrunde: true });
    render(<PracticePage plan={{ mode: 'blitz' }} onExit={vi.fn()} onNavigate={vi.fn()} />);
    expect(screen.getByText(/sobald du Einmaleins-Aufgaben gemeistert hast/)).toBeTruthy();
    await act(async () => {});
    expect(store.recordAnswer).not.toHaveBeenCalled();
  });
});
