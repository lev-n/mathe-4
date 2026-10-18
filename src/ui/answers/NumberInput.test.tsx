// @vitest-environment jsdom
import { cleanup, fireEvent, render } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { checkAnswer } from '../../core/check';
import type { AnswerOf, CheckResult, Response } from '../../core/types';
import NumberInput from './NumberInput';

import AnswerInput from './AnswerInput';

afterEach(cleanup);

type NumberAnswer = AnswerOf<'number'>;

function Harness(props: { answer: NumberAnswer; onSubmit?: () => void; result?: CheckResult | null; reveal?: boolean; disabled?: boolean; keypad?: boolean; onResponse?: (r: Response) => void }) {
  const [response, setResponse] = useState<Response | null>(null);
  return (
    <AnswerInput
      answer={props.answer}
      response={response}
      onChange={(r) => {
        setResponse(r);
        props.onResponse?.(r);
      }}
      onSubmit={props.onSubmit ?? (() => {})}
      disabled={props.disabled ?? false}
      result={props.result ?? null}
      reveal={props.reveal ?? false}
      idBase="t"
      keypad={props.keypad ?? false}
    />
  );
}

describe('NumberInput', () => {
  it('is a text input (never type=number) with a visible label and numeric keyboard', () => {
    const { getByLabelText } = render(<Harness answer={{ kind: 'number', value: 56 }} />);
    const input = getByLabelText('Deine Antwort') as HTMLInputElement;
    expect(input.type).toBe('text');
    expect(input.inputMode).toBe('numeric');
  });

  it('uses inputmode decimal for decimal answers and none with the keypad', () => {
    const { getByLabelText, unmount } = render(<Harness answer={{ kind: 'number', value: 3.5, decimals: 2, unit: '€' }} />);
    expect((getByLabelText('Deine Antwort') as HTMLInputElement).inputMode).toBe('decimal');
    unmount();
    const r = render(<Harness answer={{ kind: 'number', value: 3.5, decimals: 2 }} keypad />);
    expect((r.getByLabelText('Deine Antwort') as HTMLInputElement).inputMode).toBe('none');
  });

  it('shows Antwortsatz text before/after and the unit; "before" labels the field', () => {
    const { getByLabelText, getByText } = render(
      <Harness answer={{ kind: 'number', value: 12, unit: '€', before: 'Lena bezahlt', after: 'für die Bücher.' }} />,
    );
    const input = getByLabelText('Lena bezahlt') as HTMLInputElement;
    expect(getByText('€ für die Bücher.')).toBeTruthy();
    expect(input.getAttribute('aria-describedby')).toContain('t-num-unit');
  });

  it('reports typed text and submits on Enter', () => {
    const onSubmit = vi.fn();
    const onResponse = vi.fn();
    const { getByLabelText } = render(<Harness answer={{ kind: 'number', value: 56 }} onSubmit={onSubmit} onResponse={onResponse} />);
    const input = getByLabelText('Deine Antwort');
    fireEvent.change(input, { target: { value: '56' } });
    expect(onResponse).toHaveBeenLastCalledWith({ kind: 'number', text: '56', unsolvable: false });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('marks a wrong answer with colour, icon text and aria-invalid; a right one with a check', () => {
    const { getByLabelText, getByText, rerender } = render(<Harness answer={{ kind: 'number', value: 56 }} result={{ correct: false }} />);
    const input = getByLabelText('Deine Antwort');
    expect(input.className).toContain('is-wrong');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(getByText('noch nicht richtig')).toBeTruthy();
    rerender(<Harness answer={{ kind: 'number', value: 56 }} result={{ correct: true }} disabled />);
    expect(getByLabelText('Deine Antwort').className).toContain('is-right');
    expect(getByText('richtig')).toBeTruthy();
  });

  it('does not mark anything for invalid input', () => {
    const { getByLabelText } = render(<Harness answer={{ kind: 'number', value: 56 }} result={{ correct: false, invalid: 'Gib zuerst eine Zahl ein.' }} />);
    expect(getByLabelText('Deine Antwort').className).not.toContain('is-wrong');
  });

  it('reveal shows the correct value read-only in German notation', () => {
    const { getByLabelText, getByText } = render(<Harness answer={{ kind: 'number', value: 345678 }} reveal disabled />);
    const input = getByLabelText('Deine Antwort') as HTMLInputElement;
    expect(input.value).toBe('345 678');
    expect(input.readOnly).toBe(true);
    expect(getByText('Lösung')).toBeTruthy();
  });

  it('reveal of a decimal answer uses a decimal comma', () => {
    const { getByLabelText } = render(<Harness answer={{ kind: 'number', value: 3.5, decimals: 2 }} reveal disabled />);
    expect((getByLabelText('Deine Antwort') as HTMLInputElement).value).toBe('3,50');
  });

  it("'Nicht lösbar' toggles response.unsolvable and is accepted by checkAnswer", () => {
    const answer: NumberAnswer = { kind: 'number', value: null, offerUnsolvable: true };
    const onResponse = vi.fn();
    const { getByRole, getByLabelText } = render(<Harness answer={answer} onResponse={onResponse} />);
    const button = getByRole('button', { name: /Nicht lösbar – es fehlt eine Angabe/ });
    expect(button.getAttribute('aria-pressed')).toBe('false');
    fireEvent.click(button);
    const r = onResponse.mock.lastCall![0] as Response;
    expect(r).toEqual({ kind: 'number', text: '', unsolvable: true });
    expect(checkAnswer(answer, r).correct).toBe(true);
    expect(button.getAttribute('aria-pressed')).toBe('true');
    // Typing a number switches "nicht lösbar" off again.
    fireEvent.change(getByLabelText('Deine Antwort'), { target: { value: '4' } });
    expect(onResponse).toHaveBeenLastCalledWith({ kind: 'number', text: '4', unsolvable: false });
    expect(button.getAttribute('aria-pressed')).toBe('false');
  });

  it('reveal of an unsolvable task presses the button and marks it as the solution', () => {
    const { getByRole, getByText } = render(<Harness answer={{ kind: 'number', value: null, offerUnsolvable: true }} reveal disabled />);
    expect(getByRole('button', { name: /Nicht lösbar/ }).getAttribute('aria-pressed')).toBe('true');
    expect(getByText('Lösung')).toBeTruthy();
  });

  it('print mode renders an empty box without inputs', () => {
    const { container, getByText } = render(
      <NumberInput answer={{ kind: 'number', value: 7, unit: 'cm', before: 'Die Linie ist' }} response={null} onChange={() => {}} onSubmit={() => {}} disabled={false} result={null} reveal={false} idBase="p" keypad={false} print />,
    );
    expect(container.querySelector('input')).toBeNull();
    expect(container.querySelector('.print-box')).not.toBeNull();
    expect(getByText('Die Linie ist')).toBeTruthy();
  });

  it("Enter on 'Nicht lösbar' switches it on, and once it is on checks (never switches it off again)", () => {
    const onSubmit = vi.fn();
    const onResponse = vi.fn();
    const { getByRole } = render(<Harness answer={{ kind: 'number', value: null, offerUnsolvable: true }} onSubmit={onSubmit} onResponse={onResponse} />);
    const toggle = getByRole('button', { name: /Nicht lösbar/ });
    fireEvent.keyDown(toggle, { key: 'Enter' });
    expect(onResponse).toHaveBeenLastCalledWith({ kind: 'number', text: '', unsolvable: true });
    expect(onSubmit).not.toHaveBeenCalled();
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
    fireEvent.keyDown(toggle, { key: 'Enter' });
    expect(onSubmit).toHaveBeenCalledOnce();
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
  });
});
