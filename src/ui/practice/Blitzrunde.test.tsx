// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../state/selectors', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../state/selectors')>();
  return { ...actual, blitzFacts: () => ['3x7', '6x8'] };
});

vi.mock('../../state/store', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../state/store')>();
  return { ...actual, store: actual.createStore(null) };
});

import Blitzrunde from './Blitzrunde';
import { store } from '../../state/store';

let clock = 5_000_000;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'setTimeout', 'clearTimeout'] });
  clock = 5_000_000;
  vi.spyOn(Date, 'now').mockImplementation(() => clock);
  vi.spyOn(performance, 'now').mockImplementation(() => clock);
  store.reset();
  store.updateSettings({ blitzrunde: true });
  vi.spyOn(store, 'recordAnswer');
  vi.spyOn(store, 'recordBlitz');
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function solve(): number {
  const text = document.querySelector('.pr-blitz .pr-expression')!.textContent!;
  const m = /^(\d+) ([·:]) (\d+) = □$/.exec(text)!;
  const a = Number(m[1]);
  const b = Number(m[3]);
  return m[2] === '·' ? a * b : a / b;
}

describe('Blitzrunde', () => {
  it('runs 2 minutes with calm time text, counts solved tasks, never records answers', () => {
    render(<Blitzrunde onExit={vi.fn()} />);
    expect(screen.getByText('Du vergleichst dich nur mit dir selbst.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: "Los geht's" }));
    expect(screen.getByText('Noch 2 Minuten')).toBeTruthy();
    expect(document.querySelector('[role=progressbar]')).toBeNull();

    for (let i = 0; i < 3; i++) {
      fireEvent.change(screen.getByLabelText('Ergebnis'), { target: { value: String(solve()) } });
      fireEvent.keyDown(screen.getByLabelText('Ergebnis'), { key: 'Enter' });
    }
    expect(screen.getByText('Gelöst: 3')).toBeTruthy();
    // A wrong answer shows the result calmly and moves on, without counting.
    fireEvent.change(screen.getByLabelText('Ergebnis'), { target: { value: '1' } });
    fireEvent.keyDown(screen.getByLabelText('Ergebnis'), { key: 'Enter' });
    expect(screen.getByText(/^So geht es: /, { selector: 'p' })).toBeTruthy();
    expect(screen.getByText('Gelöst: 3')).toBeTruthy();

    clock += 61_000;
    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(screen.getByText('Noch 1 Minute')).toBeTruthy();

    clock += 60_000;
    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(screen.getByRole('heading', { name: 'Die Zeit ist um.' })).toBeTruthy();
    expect(screen.getByText('Du hast 3 Aufgaben gelöst.', { selector: 'p' })).toBeTruthy();
    expect(store.recordBlitz).toHaveBeenCalledTimes(1);
    expect(store.recordBlitz).toHaveBeenCalledWith(3);
    expect(store.recordAnswer).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Noch eine Blitzrunde' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Fertig für heute' })).toBeTruthy();
  });

  it('invalid input is not counted and keeps the task', () => {
    render(<Blitzrunde onExit={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: "Los geht's" }));
    const before = document.querySelector('.pr-blitz .pr-expression')!.textContent;
    fireEvent.change(screen.getByLabelText('Ergebnis'), { target: { value: '2,5' } });
    fireEvent.keyDown(screen.getByLabelText('Ergebnis'), { key: 'Enter' });
    expect(document.querySelector('.pr-blitz .pr-expression')!.textContent).toBe(before);
    expect(screen.getByText('Gelöst: 0')).toBeTruthy();
  });
});
