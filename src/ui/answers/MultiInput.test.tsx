// @vitest-environment jsdom
import { cleanup, fireEvent, render } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { checkAnswer } from '../../core/check';
import type { AnswerOf, CheckResult, Response } from '../../core/types';
import MultiInput, { fieldGroups } from './MultiInput';

import AnswerInput from './AnswerInput';

afterEach(cleanup);

const ANSWER: AnswerOf<'multi'> = {
  kind: 'multi',
  fields: [
    { id: 'eur', value: 3, before: '3,45 € =', after: '€' },
    { id: 'ct', value: 45, after: 'ct' },
  ],
};

function Harness(props: { result?: CheckResult | null; reveal?: boolean; disabled?: boolean; onSubmit?: () => void; onResponse?: (r: Response) => void; keypad?: boolean }) {
  const [response, setResponse] = useState<Response | null>(null);
  return (
    <AnswerInput
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
      idBase="m"
      keypad={props.keypad ?? false}
    />
  );
}

describe('MultiInput', () => {
  it('renders one labelled text field per field with the text in between', () => {
    const { getAllByRole, getByText, getByRole } = render(<Harness />);
    const inputs = getAllByRole('textbox') as HTMLInputElement[];
    expect(inputs).toHaveLength(2);
    expect(inputs.every((i) => i.type === 'text' && i.inputMode === 'numeric')).toBe(true);
    expect(inputs[0].getAttribute('aria-label')).toBe('3,45 € gleich Lücke €');
    expect(inputs[1].getAttribute('aria-label')).toBe('Lücke ct');
    expect(getByText('3,45 € =')).toBeTruthy();
    expect(getByText('ct')).toBeTruthy();
    expect(getByRole('group', { name: 'Fülle alle Felder aus.' })).toBeTruthy();
  });

  it('collects values per field id; the full response is checked correctly; Enter submits', () => {
    const onResponse = vi.fn();
    const onSubmit = vi.fn();
    const { getAllByRole } = render(<Harness onResponse={onResponse} onSubmit={onSubmit} />);
    const [eur, ct] = getAllByRole('textbox');
    fireEvent.change(eur, { target: { value: '3' } });
    fireEvent.change(ct, { target: { value: '45' } });
    const r = onResponse.mock.lastCall![0] as Response;
    expect(r).toEqual({ kind: 'multi', values: { eur: '3', ct: '45' } });
    expect(checkAnswer(ANSWER, r).correct).toBe(true);
    fireEvent.keyDown(ct, { key: 'Enter' });
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('marks each field from result.fieldCorrect', () => {
    const { getAllByRole, getByText } = render(<Harness result={{ correct: false, fieldCorrect: { eur: true, ct: false } }} />);
    const [eur, ct] = getAllByRole('textbox');
    expect(eur.className).toContain('is-right');
    expect(eur.getAttribute('aria-invalid')).toBeNull();
    expect(ct.className).toContain('is-wrong');
    expect(ct.getAttribute('aria-invalid')).toBe('true');
    expect(getByText('noch nicht richtig')).toBeTruthy();
    expect(getByText('richtig')).toBeTruthy();
  });

  it('reveal fills in all correct values read-only', () => {
    const { getAllByRole, getAllByText } = render(<Harness reveal disabled />);
    const inputs = getAllByRole('textbox') as HTMLInputElement[];
    expect(inputs.map((i) => i.value)).toEqual(['3', '45']);
    expect(inputs.every((i) => i.readOnly)).toBe(true);
    expect(getAllByText('Lösung')).toHaveLength(1);
  });

  it('keypad mode suppresses the system keyboard', () => {
    const { getAllByRole } = render(<Harness keypad />);
    expect((getAllByRole('textbox') as HTMLInputElement[]).every((i) => i.inputMode === 'none')).toBe(true);
  });

  it('keeps a clock time (h : mm Uhr) together and names the fields Stunden / Minuten', () => {
    const time: AnswerOf<'multi'> = { kind: 'multi', fields: [{ id: 'h', value: 17, after: ':' }, { id: 'm', value: 5, after: 'Uhr' }] };
    const { container, getAllByRole } = render(
      <MultiInput answer={time} response={null} onChange={() => {}} onSubmit={() => {}} disabled={false} result={null} reveal idBase="t" keypad={false} />,
    );
    const group = container.querySelector('.ans-multi__group--time')!;
    expect(group.querySelectorAll('input')).toHaveLength(2);
    const [h, m] = getAllByRole('textbox') as HTMLInputElement[];
    expect(h.getAttribute('aria-label')).toBe('Stunden');
    expect(m.getAttribute('aria-label')).toBe('Minuten');
    expect(m.value).toBe('05');
    expect(fieldGroups(ANSWER.fields)).toEqual([[0], [1]]);
  });

  it('print mode renders empty boxes', () => {
    const { container } = render(
      <MultiInput answer={ANSWER} response={null} onChange={() => {}} onSubmit={() => {}} disabled={false} result={null} reveal={false} idBase="p" keypad={false} print />,
    );
    expect(container.querySelector('input')).toBeNull();
    expect(container.querySelectorAll('.print-box')).toHaveLength(2);
  });
});
