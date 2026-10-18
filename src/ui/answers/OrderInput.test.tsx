// @vitest-environment jsdom
import { cleanup, fireEvent, render } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { checkAnswer } from '../../core/check';
import type { AnswerOf, CheckResult, Response } from '../../core/types';
import OrderInput from './OrderInput';

afterEach(cleanup);

const ANSWER: AnswerOf<'order'> = {
  kind: 'order',
  items: ['45 300', '4530', '453 000'],
  correct: [1, 0, 2],
  direction: 'aufsteigend',
};

function Harness(props: { result?: CheckResult | null; reveal?: boolean; disabled?: boolean; onSubmit?: () => void; onResponse?: (r: Response) => void }) {
  const [response, setResponse] = useState<Response | null>(null);
  return (
    <OrderInput
      answer={ANSWER}
      response={response}
      onChange={(r) => {
        setResponse(r);
        props.onResponse?.(r);
      }}
      onSubmit={props.onSubmit ?? (() => {})}
      disabled={props.disabled ?? false}
      result={props.result ?? null}
      reveal={props.reveal ?? false}
      idBase="o"
      keypad={false}
    />
  );
}

const itemButtons = (getAllByRole: (role: string) => HTMLElement[]) => getAllByRole('button').filter((b) => b.classList.contains('ans-order__item'));

describe('OrderInput', () => {
  it('builds the order by tapping and shows it with < signs', () => {
    const onResponse = vi.fn();
    const { getAllByRole, container } = render(<Harness onResponse={onResponse} />);
    const items = itemButtons(getAllByRole);
    fireEvent.click(items[1]);
    fireEvent.click(items[0]);
    fireEvent.click(items[2]);
    const r = onResponse.mock.lastCall![0] as Response;
    expect(r).toEqual({ kind: 'order', order: [1, 0, 2] });
    expect(checkAnswer(ANSWER, r).correct).toBe(true);
    const chips = Array.from(container.querySelectorAll('.ans-order__chip')).map((c) => c.textContent);
    expect(chips).toEqual(['4530', '45 300', '453 000']);
    expect(container.querySelectorAll('.ans-order__sign')[0].textContent).toBe('<');
  });

  it('chosen items show their position and are announced with it', () => {
    const { getAllByRole, getByRole } = render(<Harness />);
    fireEvent.click(itemButtons(getAllByRole)[2]);
    const chosen = getByRole('button', { name: '453000, Platz 1' });
    expect(chosen.getAttribute('aria-pressed')).toBe('true');
    expect(chosen.textContent).toContain('1.');
  });

  it('tapping a chosen item takes it out again; Zurücksetzen clears everything', () => {
    const onResponse = vi.fn();
    const { getAllByRole, getByRole } = render(<Harness onResponse={onResponse} />);
    const reset = getByRole('button', { name: 'Zurücksetzen' }) as HTMLButtonElement;
    expect(reset.disabled).toBe(true);
    fireEvent.click(itemButtons(getAllByRole)[0]);
    fireEvent.click(itemButtons(getAllByRole)[1]);
    fireEvent.click(itemButtons(getAllByRole)[0]);
    expect(onResponse).toHaveBeenLastCalledWith({ kind: 'order', order: [1] });
    fireEvent.click(reset);
    expect(onResponse).toHaveBeenLastCalledWith({ kind: 'order', order: [] });
  });

  it('is keyboard operable: arrows move focus, Enter submits once all items are placed', () => {
    const onSubmit = vi.fn();
    const { getAllByRole } = render(<Harness onSubmit={onSubmit} />);
    const items = itemButtons(getAllByRole);
    items[0].focus();
    fireEvent.keyDown(items[0], { key: 'ArrowRight' });
    expect(document.activeElement).toBe(items[1]);
    fireEvent.keyDown(items[1], { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(items[0]);
    fireEvent.keyDown(items[0], { key: 'Enter' });
    expect(onSubmit).not.toHaveBeenCalled();
    [1, 0, 2].forEach((i) => fireEvent.click(itemButtons(getAllByRole)[i]));
    fireEvent.keyDown(itemButtons(getAllByRole)[2], { key: 'Enter' });
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('marks a wrong order (colour + icon text) and shows the correct order on reveal', () => {
    const { container, getByText, rerender } = render(<Harness result={{ correct: false }} />);
    expect(container.querySelector('.ans-order__seq')!.className).toContain('is-wrong');
    expect(getByText('noch nicht richtig')).toBeTruthy();
    rerender(<Harness reveal disabled />);
    expect(getByText('Richtige Reihenfolge:')).toBeTruthy();
    const chips = Array.from(container.querySelectorAll('.ans-order__chip')).map((c) => c.textContent);
    expect(chips).toEqual(['4530', '45 300', '453 000']);
    expect(container.querySelector('button.btn')).toBeNull();
  });

  it('absteigend uses > and the matching instruction', () => {
    const { container, getByText } = render(
      <OrderInput
        answer={{ ...ANSWER, direction: 'absteigend', correct: [2, 0, 1] }}
        response={{ kind: 'order', order: [2, 0] }}
        onChange={() => {}}
        onSubmit={() => {}}
        disabled={false}
        result={null}
        reveal={false}
        idBase="d"
        keypad={false}
      />,
    );
    expect(container.querySelectorAll('.ans-order__sign')[0].textContent).toBe('>');
    expect(getByText(/zuerst das Größte/)).toBeTruthy();
  });

  it('print mode renders items and empty boxes', () => {
    const { container } = render(
      <OrderInput answer={ANSWER} response={null} onChange={() => {}} onSubmit={() => {}} disabled={false} result={null} reveal={false} idBase="p" keypad={false} print />,
    );
    expect(container.querySelector('button')).toBeNull();
    expect(container.querySelectorAll('.print-box')).toHaveLength(3);
  });

  it('print mode draws every item as its own element (numbers with digit groups stay apart)', () => {
    const answer: AnswerOf<'order'> = { kind: 'order', items: ['142 970', '401 729', '140 972'], correct: [2, 0, 1], direction: 'aufsteigend' };
    const { container } = render(
      <OrderInput answer={answer} response={null} onChange={() => {}} onSubmit={() => {}} disabled={false} result={null} reveal={false} idBase="p" keypad={false} print />,
    );
    const items = [...container.querySelectorAll('.ans-order__print-items > li')].map((li) => li.textContent);
    expect(items).toEqual(['142 970', '401 729', '140 972']);
  });
});
