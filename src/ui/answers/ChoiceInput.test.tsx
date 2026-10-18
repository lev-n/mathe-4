// @vitest-environment jsdom
import { cleanup, fireEvent, render } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AnswerOf, CheckResult, Response } from '../../core/types';
import ChoiceInput, { optionSpeech } from './ChoiceInput';

afterEach(cleanup);

type ChoiceAnswer = AnswerOf<'choice'>;

const ANSWER: ChoiceAnswer = {
  kind: 'choice',
  options: [{ label: '54' }, { label: '56' }, { label: '58', whyWrong: 'Zähle noch einmal.' }],
  correct: 1,
};

function Harness(props: { answer?: ChoiceAnswer; onSubmit?: () => void; result?: CheckResult | null; reveal?: boolean; disabled?: boolean; initial?: number }) {
  const [response, setResponse] = useState<Response | null>(props.initial !== undefined ? { kind: 'choice', index: props.initial } : null);
  return (
    <ChoiceInput
      answer={props.answer ?? ANSWER}
      response={response}
      onChange={setResponse}
      onSubmit={props.onSubmit ?? (() => {})}
      disabled={props.disabled ?? false}
      result={props.result ?? null}
      reveal={props.reveal ?? false}
      idBase="c"
      keypad={false}
    />
  );
}

describe('ChoiceInput', () => {
  it('names the radiogroup by the visible prompt when labelledBy is given', () => {
    const { getByRole } = render(
      <>
        <p id="the-prompt">Welche Zahl ist größer?</p>
        <ChoiceInput answer={ANSWER} response={null} onChange={() => {}} onSubmit={() => {}} disabled={false} result={null} reveal={false} idBase="p" keypad={false} labelledBy="the-prompt" />
      </>,
    );
    expect(getByRole('radiogroup', { name: 'Welche Zahl ist größer?' })).toBeTruthy();
  });

  it('renders a radiogroup with one radio per option and roving tabindex', () => {
    const { getByRole, getAllByRole } = render(<Harness />);
    expect(getByRole('radiogroup')).toBeTruthy();
    const radios = getAllByRole('radio');
    expect(radios).toHaveLength(3);
    expect(radios.map((r) => r.tabIndex)).toEqual([0, -1, -1]);
    expect(radios.every((r) => r.getAttribute('aria-checked') === 'false')).toBe(true);
  });

  it('click selects; the selected state is not colour-only (filled marker + aria-checked)', () => {
    const { getAllByRole } = render(<Harness />);
    fireEvent.click(getAllByRole('radio')[2]);
    const radios = getAllByRole('radio');
    expect(radios[2].getAttribute('aria-checked')).toBe('true');
    expect(radios[2].className).toContain('is-selected');
    expect(radios[2].querySelector('.ans-choice__radio')).not.toBeNull();
    expect(radios.map((r) => r.tabIndex)).toEqual([-1, -1, 0]);
  });

  it('arrow keys move and select (wrapping), Home/End jump', () => {
    const { getAllByRole } = render(<Harness />);
    const radios = () => getAllByRole('radio');
    radios()[0].focus();
    fireEvent.keyDown(radios()[0], { key: 'ArrowDown' });
    expect(radios()[1].getAttribute('aria-checked')).toBe('true');
    expect(document.activeElement).toBe(radios()[1]);
    fireEvent.keyDown(radios()[1], { key: 'ArrowUp' });
    fireEvent.keyDown(radios()[0], { key: 'ArrowUp' });
    expect(radios()[2].getAttribute('aria-checked')).toBe('true');
    fireEvent.keyDown(radios()[2], { key: 'Home' });
    expect(radios()[0].getAttribute('aria-checked')).toBe('true');
    fireEvent.keyDown(radios()[0], { key: 'End' });
    expect(radios()[2].getAttribute('aria-checked')).toBe('true');
  });

  it('Space selects, Enter submits the selected option', () => {
    const onSubmit = vi.fn();
    const { getAllByRole } = render(<Harness onSubmit={onSubmit} />);
    const r = getAllByRole('radio');
    fireEvent.keyDown(r[1], { key: 'Enter' });
    expect(onSubmit).not.toHaveBeenCalled();
    expect(getAllByRole('radio')[1].getAttribute('aria-checked')).toBe('true');
    fireEvent.keyDown(getAllByRole('radio')[1], { key: 'Enter' });
    expect(onSubmit).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(getAllByRole('radio')[0], { key: ' ' });
    expect(getAllByRole('radio')[0].getAttribute('aria-checked')).toBe('true');
  });

  it('marks the chosen wrong option, and the correct one on reveal', () => {
    const { getAllByRole, getByText, rerender } = render(<Harness initial={2} result={{ correct: false }} />);
    expect(getAllByRole('radio')[2].className).toContain('is-wrong');
    expect(getByText('noch nicht richtig')).toBeTruthy();
    rerender(<Harness initial={2} result={{ correct: false }} reveal disabled />);
    const radios = getAllByRole('radio');
    expect(radios[1].className).toContain('is-right');
    expect(getByText('Lösung')).toBeTruthy();
    // Locked: clicking does not change the selection.
    fireEvent.click(radios[0]);
    expect(getAllByRole('radio')[0].getAttribute('aria-checked')).toBe('false');
  });

  it('symbol options get German spoken names', () => {
    const answer: ChoiceAnswer = { kind: 'choice', options: [{ label: '<' }, { label: '>' }, { label: '=' }], correct: 0, layout: 'symbols' };
    const { getByRole } = render(<Harness answer={answer} />);
    expect(getByRole('radio', { name: 'kleiner als' })).toBeTruthy();
    expect(getByRole('radio', { name: 'größer als' })).toBeTruthy();
    expect(getByRole('radio', { name: 'gleich' })).toBeTruthy();
    expect(optionSpeech({ label: '7 · 8' })).toBe('7 mal 8');
    expect(optionSpeech({ label: 'Würfel' })).toBeUndefined();
  });

  it('options with visuals render the visual inside the option (grid layout)', () => {
    const answer: ChoiceAnswer = {
      kind: 'choice',
      layout: 'grid',
      options: [
        { label: 'A', visual: { type: 'table', caption: 'Tabelle A', header: ['x'], rows: [['1']] } },
        { label: 'B', visual: { type: 'table', caption: 'Tabelle B', header: ['x'], rows: [['2']] } },
      ],
      correct: 0,
    };
    const { getAllByRole, container } = render(<Harness answer={answer} />);
    expect(container.querySelector('.ans-choice--grid')).not.toBeNull();
    expect(getAllByRole('radio')[0].querySelector('table')).not.toBeNull();
  });

  it('options with charts or other text-bearing pictures get one option per row (readable size)', () => {
    const chart = (n: number): AnswerOf<'choice'>['options'][number] => ({
      label: `Diagramm ${n}`,
      visual: { type: 'barChart', title: 'Tiere', categories: ['Hasen', 'Katzen'], values: [14 + n, 8], axisMax: 20, axisStep: 2 },
    });
    const answer: ChoiceAnswer = { kind: 'choice', layout: 'grid', options: [chart(1), chart(2), chart(3)], correct: 0 };
    const { container } = render(<Harness answer={answer} />);
    expect(container.querySelector('.ans-choice--grid.ans-choice--wide')).not.toBeNull();
    cleanup();
    const shapes: ChoiceAnswer = {
      kind: 'choice',
      layout: 'grid',
      options: [
        { label: 'A', visual: { type: 'solid', solid: 'wuerfel' } },
        { label: 'B', visual: { type: 'solid', solid: 'quader' } },
      ],
      correct: 0,
    };
    const second = render(<Harness answer={shapes} />);
    expect(second.container.querySelector('.ans-choice--grid')).not.toBeNull();
    expect(second.container.querySelector('.ans-choice--wide')).toBeNull();
  });

  it('print mode renders a static list', () => {
    const { container } = render(
      <ChoiceInput answer={ANSWER} response={null} onChange={() => {}} onSubmit={() => {}} disabled={false} result={null} reveal={false} idBase="p" keypad={false} print />,
    );
    expect(container.querySelectorAll('[role=radio]')).toHaveLength(0);
    expect(container.querySelectorAll('li')).toHaveLength(3);
  });
});
