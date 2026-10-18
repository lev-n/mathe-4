// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { checkAnswer } from '../../core/check';
import type { AnswerOf, CheckResult, Response } from '../../core/types';
import CellsInput from './CellsInput';

afterEach(cleanup);

const answer: AnswerOf<'cells'> = {
  kind: 'cells',
  width: 4,
  height: 3,
  given: [[1, 0], [0, 1], [1, 1]],
  solution: [[2, 0], [2, 1], [3, 1]],
  axis: { orientation: 'vertical', at: 2 },
};

function Harness(props: { result?: CheckResult | null; reveal?: boolean; disabled?: boolean; onChange?: (r: Response) => void; onSubmit?: () => void; initial?: Response | null }) {
  const [response, setResponse] = useState<Response | null>(props.initial ?? null);
  return (
    <CellsInput
      answer={answer}
      response={response}
      onChange={(r) => {
        setResponse(r);
        props.onChange?.(r);
      }}
      onSubmit={props.onSubmit ?? (() => {})}
      disabled={props.disabled ?? false}
      result={props.result ?? null}
      reveal={props.reveal ?? false}
      idBase="t"
      keypad={false}
    />
  );
}

const cell = (x: number, y: number) => screen.getByRole('button', { name: new RegExp(`^Kästchen Spalte ${x + 1}, Zeile ${y + 1}(,|$)`) });

describe('CellsInput', () => {
  it('renders a labelled group of toggle buttons with the axis', () => {
    render(<Harness />);
    expect(screen.getByRole('group', { name: /Kästchengitter zum Anmalen, 4 Spalten und 3 Zeilen/ })).toBeTruthy();
    expect(screen.getAllByRole('button')).toHaveLength(12);
    expect(screen.getByTestId('cells-axis')).toBeTruthy();
    // given cells are pressed and disabled
    const given = cell(1, 0);
    expect(given.getAttribute('aria-pressed')).toBe('true');
    expect(given.getAttribute('aria-disabled')).toBe('true');
    expect(given.getAttribute('aria-label')).toContain('vorgegeben');
  });

  it('click toggles a cell on and off; given cells do not toggle; response excludes given cells', () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    fireEvent.click(cell(2, 0));
    expect(onChange).toHaveBeenLastCalledWith({ kind: 'cells', cells: [[2, 0]] });
    expect(cell(2, 0).getAttribute('aria-pressed')).toBe('true');
    expect(cell(2, 0).getAttribute('aria-label')).toContain('angemalt');
    fireEvent.click(cell(3, 1));
    expect(onChange).toHaveBeenLastCalledWith({ kind: 'cells', cells: [[2, 0], [3, 1]] });
    fireEvent.click(cell(2, 0));
    expect(onChange).toHaveBeenLastCalledWith({ kind: 'cells', cells: [[3, 1]] });
    onChange.mockClear();
    fireEvent.click(cell(1, 1)); // given
    expect(onChange).not.toHaveBeenCalled();
  });

  it('roving tabindex with arrow keys, Home/End', () => {
    render(<Harness />);
    const tabbable = screen.getAllByRole('button').filter((b) => b.tabIndex === 0);
    expect(tabbable).toHaveLength(1);
    const start = tabbable[0];
    start.focus();
    fireEvent.keyDown(start, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(cell(1, 0));
    fireEvent.keyDown(document.activeElement!, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(cell(1, 1));
    fireEvent.keyDown(document.activeElement!, { key: 'End' });
    expect(document.activeElement).toBe(cell(3, 1));
    fireEvent.keyDown(document.activeElement!, { key: 'Home' });
    expect(document.activeElement).toBe(cell(0, 1));
    fireEvent.keyDown(document.activeElement!, { key: 'ArrowLeft' }); // stays at the edge
    expect(document.activeElement).toBe(cell(0, 1));
    expect(screen.getAllByRole('button').filter((b) => b.tabIndex === 0)).toEqual([cell(0, 1)]);
  });

  it('Enter means Prüfen: it submits a painted grid and never toggles (Space toggles)', () => {
    const onChange = vi.fn();
    const onSubmit = vi.fn();
    render(<Harness onChange={onChange} onSubmit={onSubmit} />);
    // empty grid: Enter does nothing (and does not toggle either)
    expect(fireEvent.keyDown(cell(2, 0), { key: 'Enter' })).toBe(false); // default (native toggle) prevented
    expect(onSubmit).not.toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.click(cell(2, 0));
    onChange.mockClear();
    expect(fireEvent.keyDown(cell(2, 0), { key: 'Enter' })).toBe(false);
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onChange).not.toHaveBeenCalled();
    expect(cell(2, 0).getAttribute('aria-pressed')).toBe('true');
    // Space keeps its native button activation (toggle)
    expect(fireEvent.keyDown(cell(3, 1), { key: ' ' })).toBe(true);
  });

  it('Enter does not submit when the grid is locked', () => {
    const onSubmit = vi.fn();
    render(<Harness disabled onSubmit={onSubmit} initial={{ kind: 'cells', cells: [[2, 0]] }} />);
    fireEvent.keyDown(cell(2, 0), { key: 'Enter' });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('marks extra and missing cells after a check with icon and label', () => {
    const response: Response = { kind: 'cells', cells: [[2, 0], [3, 2]] };
    const result = checkAnswer(answer, response);
    expect(result.correct).toBe(false);
    render(<Harness initial={response} result={result} />);
    expect(cell(3, 2).getAttribute('aria-label')).toContain('zu viel');
    expect(cell(3, 2).textContent).toBe('−');
    expect(cell(2, 1).getAttribute('aria-label')).toContain('fehlt noch');
    expect(cell(2, 1).textContent).toBe('+');
    expect(screen.getByText(/1 Kästchen ist zu viel/)).toBeTruthy();
    expect(screen.getByText(/2 Kästchen fehlen noch/)).toBeTruthy();
    // fixing a cell removes its mark
    fireEvent.click(cell(3, 2));
    expect(cell(3, 2).textContent).toBe('');
  });

  it('reveal shows the solution and locks the grid', () => {
    const onChange = vi.fn();
    render(<Harness reveal disabled onChange={onChange} />);
    expect(cell(2, 1).getAttribute('aria-label')).toContain('Lösung');
    expect(cell(2, 1).getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(cell(0, 0));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('print mode renders a static grid with only the given cells', () => {
    render(
      <CellsInput answer={answer} response={null} onChange={() => {}} onSubmit={() => {}} disabled={false} result={null} reveal={false} idBase="p" keypad={false} print />,
    );
    expect(screen.queryAllByRole('button')).toHaveLength(0);
    const img = screen.getByRole('img');
    expect(img.getAttribute('aria-label')).toContain('Angemalt: Zeile 1: Spalte 2. Zeile 2: Spalte 1 und 2');
    expect(img.getAttribute('aria-label')).toContain('Symmetrieachse');
  });
});
