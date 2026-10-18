// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { formatAnswer } from '../../core/check';
import { DEFAULT_CONTEXT, generateUnique } from '../../core/generate';
import { deriveSeed } from '../../core/rng';
import type { GenContext, TopicId } from '../../core/types';
import { KMK_TAGS } from '../../data/curriculum';
import { FAKE_SKILLS, fakeSkill } from './testFixtures';
import type { Answer, Exercise } from '../../core/types';
import { COMPACT_CONTEXT_MAX, answerBesidePicture, assignSkills, buildWorksheet, isCompactTask, lastStepText, parseSeed, partnerPrompt } from './worksheet';
import WorksheetPage from './WorksheetPage';

vi.mock('../../topics/registry', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../topics/registry')>();
  const { fakeModule } = await import('./testFixtures');
  return { ...actual, loadTopic: vi.fn((id: TopicId) => Promise.resolve(fakeModule(id))) };
});

// Answer inputs and visuals are built by other engineers; here we only check the wiring (print mode).
vi.mock('../answers/AnswerInput', () => ({
  default: (props: { print?: boolean; disabled: boolean; idBase: string }) => (
    <span data-testid="answer-input" data-print={String(props.print)} data-disabled={String(props.disabled)} data-id={props.idBase}>
      [Antwortfeld]
    </span>
  ),
}));
vi.mock('../visuals/Visual', () => ({ default: () => <span data-testid="visual" /> }));

const CTX: GenContext = { subtractionMethod: 'abziehen', nrwExtras: false };
const skills = [fakeSkill('zahlen.runden', 'Runden'), fakeSkill('zahlen.stellenwert', 'Stellenwerte')];

afterEach(cleanup);

describe('buildWorksheet (pure)', () => {
  it('is deterministic per seed', () => {
    const a = buildWorksheet(skills, 2, 10, 12345, CTX);
    const b = buildWorksheet(skills, 2, 10, 12345, CTX);
    expect(b).toEqual(a);
    expect(a.exercises).toHaveLength(10);
  });

  it('gives different tasks for a different seed', () => {
    const a = buildWorksheet(skills, 2, 10, 1, CTX).exercises.map((e) => e.key);
    const b = buildWorksheet(skills, 2, 10, 2, CTX).exercises.map((e) => e.key);
    expect(b).not.toEqual(a);
  });

  it('uses deriveSeed(seed, i) for item i', () => {
    const sheet = buildWorksheet(skills, 3, 6, 777, CTX);
    // 6 tasks over 2 skills → 3 + 3, grouped by skill
    expect(sheet.exercises.map((e) => e.skillId)).toEqual(['zahlen.runden', 'zahlen.runden', 'zahlen.runden', 'zahlen.stellenwert', 'zahlen.stellenwert', 'zahlen.stellenwert']);
    expect(sheet.exercises[0]).toEqual(generateUnique(skills[0], 3, deriveSeed(777, 0), CTX, new Set()));
    const seen = new Set(sheet.exercises.slice(0, 3).map((e) => e.key));
    expect(sheet.exercises[3]).toEqual(generateUnique(skills[1], 3, deriveSeed(777, 3), CTX, seen));
  });

  it('avoids repeated tasks within a sheet', () => {
    const sheet = buildWorksheet([skills[0]], 1, 15, 99, DEFAULT_CONTEXT);
    expect(new Set(sheet.exercises.map((e) => e.key)).size).toBe(15);
  });

  it('collects KMK tags in curriculum order', () => {
    const sheet = buildWorksheet(skills, 3, 6, 5, CTX);
    const order = Object.keys(KMK_TAGS);
    expect(sheet.kmk).toEqual(['ZO.kopfrechnen', 'ZO.strategien']);
    expect(order.indexOf(sheet.kmk[0])).toBeLessThan(order.indexOf(sheet.kmk[1]));
  });

  it('skips a broken generator instead of failing the whole sheet', () => {
    const broken = { ...skills[0], id: 'zahlen.kaputt', generate: () => { throw new Error('boom'); } };
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const sheet = buildWorksheet([broken, skills[1]], 1, 6, 1, CTX);
    spy.mockRestore();
    expect(sheet.failed).toBe(3);
    expect(sheet.exercises).toHaveLength(3);
  });

  it('distributes tasks evenly over skills', () => {
    expect(assignSkills(['a', 'b', 'c'], 10)).toEqual(['a', 'a', 'a', 'a', 'b', 'b', 'b', 'c', 'c', 'c']);
    expect(assignSkills(['a'], 6)).toHaveLength(6);
    expect(assignSkills([], 6)).toEqual([]);
  });

  it('parses seeds strictly', () => {
    expect(parseSeed('12345')).toBe(12345);
    expect(parseSeed(' 4 294 967 295 ')).toBe(4294967295);
    expect(parseSeed('4294967296')).toBeNull();
    expect(parseSeed('12a')).toBeNull();
    expect(parseSeed('-1')).toBeNull();
    expect(parseSeed('')).toBeNull();
  });

  it('prints small tasks two per row and small answers next to the picture (paper-saving layout)', () => {
    const base = buildWorksheet([skills[0]], 1, 6, 1, CTX).exercises[0];
    const ex = (patch: Partial<Exercise>): Exercise => ({ ...base, ...patch });
    const choice = (layout: 'list' | 'symbols' | 'grid' | 'scale'): Answer => ({ kind: 'choice', options: [{ label: '<' }, { label: '>' }], correct: 0, layout });
    const bar = { type: 'barChart', categories: ['A'], values: [1], max: 2, step: 1 } as unknown as Exercise['visual'];
    expect(isCompactTask(base)).toBe(true); // number answer, no picture
    expect(isCompactTask(ex({ answer: { kind: 'multi', fields: [{ id: 'a', value: 1 }] } }))).toBe(true);
    expect(isCompactTask(ex({ answer: choice('symbols') }))).toBe(true);
    expect(isCompactTask(ex({ answer: choice('scale') }))).toBe(true);
    expect(isCompactTask(ex({ answer: choice('list') }))).toBe(false);
    expect(isCompactTask(ex({ answer: { kind: 'written', op: 'add', operands: [123456, 654321], result: 777777 } }))).toBe(false);
    expect(isCompactTask(ex({ visual: bar }))).toBe(false);
    expect(isCompactTask(ex({ context: 'x'.repeat(COMPACT_CONTEXT_MAX + 1) }))).toBe(false);
    expect(answerBesidePicture(base)).toBe(false);
    expect(answerBesidePicture(ex({ visual: bar }))).toBe(true);
    expect(answerBesidePicture(ex({ visual: bar, answer: choice('list') }))).toBe(false);
  });

  it('rotates the partner prompts', () => {
    expect(partnerPrompt(0)).toMatch(/^Erkläre deinem Partner/);
    expect(partnerPrompt(3)).toBe(partnerPrompt(0));
    expect(partnerPrompt(1)).not.toBe(partnerPrompt(0));
  });
});

async function setupPage() {
  render(<WorksheetPage />);
  await screen.findByRole('checkbox', { name: /Runden/ });
}

function createWithSeed(seed: string) {
  const input = screen.getByRole('textbox', { name: 'Blatt-Nummer' });
  fireEvent.change(input, { target: { value: seed } });
  fireEvent.click(screen.getByRole('button', { name: 'Arbeitsblatt erstellen' }));
}

describe('WorksheetPage', () => {
  it('renders the same sheet for the same seed and a different one for another seed', async () => {
    await setupPage();
    createWithSeed('424242');
    const first = (await screen.findByTestId('worksheet')).textContent;
    const firstKey = screen.getByTestId('answer-key').textContent;
    expect(first).toContain('Blatt-Nummer 424242');

    createWithSeed('1');
    await waitFor(() => expect(screen.getByTestId('worksheet').textContent).not.toBe(first));

    createWithSeed('424242');
    await waitFor(() => expect(screen.getByTestId('worksheet').textContent).toBe(first));
    expect(screen.getByTestId('answer-key').textContent).toBe(firstKey);
  });

  it('numbers the tasks, uses print-mode answer inputs and prints the answer key with the last step', async () => {
    await setupPage();
    createWithSeed('2024');
    const sheet = await screen.findByTestId('worksheet');
    const tasks = within(sheet).getAllByRole('listitem');
    expect(tasks).toHaveLength(10);
    const inputs = within(sheet).getAllByTestId('answer-input');
    expect(inputs).toHaveLength(10);
    inputs.forEach((el) => {
      expect(el.dataset.print).toBe('true');
      expect(el.dataset.disabled).toBe('true');
    });
    // fake skills: number answers without pictures → two per row in print
    tasks.forEach((li) => expect(li.className).toBe('ws-task ws-task--compact'));
    expect(within(sheet).getByText(/^Name:/)).toBeTruthy();
    expect(within(sheet).getByText(/^Datum:/)).toBeTruthy();
    expect(sheet.textContent).toContain('KMK-Bildungsstandards');

    // Independent computation: default selection = both non-optional zahlen skills, Stufe 2, 10 tasks.
    const expected = buildWorksheet(FAKE_SKILLS.zahlen.filter((s) => !s.optional), 2, 10, 2024, { subtractionMethod: 'abziehen', nrwExtras: false });
    const key = screen.getByTestId('answer-key');
    const keyItems = within(key).getAllByRole('listitem');
    expect(keyItems).toHaveLength(10);
    expected.exercises.forEach((ex, i) => {
      expect(keyItems[i].textContent).toContain(formatAnswer(ex.answer));
      expect(ex.answer.kind === 'number' && ex.answer.value).toBeTruthy();
      expect(keyItems[i].textContent).toContain(lastStepText(ex));
    });
    // the answer key is printed on its own page
    expect(key.className).toBe('answer-key');
  });

  it('respects the options: Stufe, number of tasks, partner line, answer key off', async () => {
    await setupPage();
    fireEvent.click(screen.getByRole('radio', { name: /Stufe 3/ }));
    fireEvent.click(screen.getByRole('radio', { name: /^\s*6\s*$/ }));
    fireEvent.click(screen.getByRole('checkbox', { name: /Erkläre deinem Partner/ }));
    fireEvent.click(screen.getByRole('checkbox', { name: /Lösungsblatt mitdrucken/ }));
    fireEvent.click(screen.getByRole('checkbox', { name: /Stellenwerte/ }));
    createWithSeed('7');
    const sheet = await screen.findByTestId('worksheet');
    expect(within(sheet).getAllByTestId('answer-input')).toHaveLength(6);
    expect(sheet.textContent).toContain('Stufe 3');
    expect(sheet.textContent).toContain('Erkläre deinem Partner');
    expect(sheet.textContent).not.toContain('Stellenwerte');
    expect(screen.getByTestId('answer-key').className).toContain('no-print');
  });

  it('validates the inputs', async () => {
    await setupPage();
    fireEvent.click(screen.getByRole('checkbox', { name: /Runden/ }));
    fireEvent.click(screen.getByRole('checkbox', { name: /Stellenwerte/ }));
    createWithSeed('5');
    expect(screen.getByText('Wählen Sie mindestens einen Bereich aus.')).toBeTruthy();
    fireEvent.click(screen.getByRole('checkbox', { name: /Runden/ }));
    createWithSeed('abc');
    expect(screen.getByText(/Die Blatt-Nummer darf nur aus Ziffern bestehen/)).toBeTruthy();
    expect(screen.queryByTestId('worksheet')).toBeNull();
  });

  it('"Neue Aufgaben" picks a new seed and shows it in the field', async () => {
    await setupPage();
    const input = screen.getByRole('textbox', { name: 'Blatt-Nummer' }) as HTMLInputElement;
    fireEvent.change(input, { target: { value: '1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Neue Aufgaben' }));
    const sheet = await screen.findByTestId('worksheet');
    expect(input.value).toMatch(/^\d+$/);
    expect(sheet.textContent).toContain(`Blatt-Nummer ${input.value}`);
  });

  it('prints via window.print', async () => {
    await setupPage();
    createWithSeed('3');
    await screen.findByTestId('worksheet');
    const print = vi.fn();
    window.print = print;
    fireEvent.click(screen.getByRole('button', { name: /Drucken/ }));
    expect(print).toHaveBeenCalledOnce();
  });
});
