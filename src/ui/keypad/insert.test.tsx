// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { backspace, insertChar, isTypeableInput, setNativeValue } from './insert';

afterEach(cleanup);

function Controlled({ onValue, maxLength }: { onValue: (v: string) => void; maxLength?: number }) {
  const [value, setValue] = useState('');
  return (
    <input
      type="text"
      aria-label="Feld"
      value={value}
      maxLength={maxLength}
      onChange={(e) => {
        setValue(e.target.value);
        onValue(e.target.value);
      }}
    />
  );
}

describe('keypad insertion helper', () => {
  it('inserts into the focused controlled React input and fires onChange', () => {
    const onValue = vi.fn();
    const { getByLabelText } = render(<Controlled onValue={onValue} />);
    const input = getByLabelText('Feld') as HTMLInputElement;
    input.focus();
    expect(insertChar('4')).toBe(true);
    expect(insertChar('2')).toBe(true);
    expect(onValue).toHaveBeenLastCalledWith('42');
    expect(input.value).toBe('42');
  });

  it('inserts at the caret and replaces a selection', () => {
    const onValue = vi.fn();
    const { getByLabelText } = render(<Controlled onValue={onValue} />);
    const input = getByLabelText('Feld') as HTMLInputElement;
    input.focus();
    insertChar('1');
    insertChar('3');
    input.setSelectionRange(1, 1);
    insertChar('2');
    expect(input.value).toBe('123');
    expect(input.selectionStart).toBe(2);
    input.setSelectionRange(0, 2);
    insertChar('9');
    expect(input.value).toBe('93');
    expect(onValue).toHaveBeenLastCalledWith('93');
  });

  it('backspace deletes before the caret or the selection', () => {
    const onValue = vi.fn();
    const { getByLabelText } = render(<Controlled onValue={onValue} />);
    const input = getByLabelText('Feld') as HTMLInputElement;
    input.focus();
    ['3', ',', '5', '0'].forEach((c) => insertChar(c));
    expect(input.value).toBe('3,50');
    expect(backspace()).toBe(true);
    expect(input.value).toBe('3,5');
    input.setSelectionRange(0, 2);
    backspace();
    expect(input.value).toBe('5');
    input.setSelectionRange(0, 0);
    expect(backspace()).toBe(false);
    expect(onValue).toHaveBeenLastCalledWith('5');
  });

  it('a full single-digit box is overwritten; longer full fields are left alone', () => {
    const onDigit = vi.fn();
    const { getAllByLabelText, unmount } = render(<Controlled onValue={onDigit} maxLength={1} />);
    const box = getAllByLabelText('Feld')[0] as HTMLInputElement;
    box.focus();
    insertChar('7');
    insertChar('8');
    expect(box.value).toBe('8');
    unmount();
    const onValue = vi.fn();
    const { getByLabelText } = render(<Controlled onValue={onValue} maxLength={2} />);
    const input = getByLabelText('Feld') as HTMLInputElement;
    input.focus();
    insertChar('1');
    insertChar('2');
    expect(insertChar('3')).toBe(false);
    expect(input.value).toBe('12');
  });

  it('ignores non-text targets, readonly and disabled inputs', () => {
    const { container } = render(
      <div>
        <button type="button">B</button>
        <input type="text" readOnly aria-label="ro" defaultValue="1" />
        <input type="text" disabled aria-label="dis" defaultValue="1" />
        <input type="checkbox" aria-label="cb" />
      </div>,
    );
    const [ro, dis, cb] = Array.from(container.querySelectorAll('input'));
    const button = container.querySelector('button')!;
    expect(isTypeableInput(button)).toBe(false);
    expect(isTypeableInput(ro)).toBe(false);
    expect(isTypeableInput(dis)).toBe(false);
    expect(isTypeableInput(cb)).toBe(false);
    expect(insertChar('1', button)).toBe(false);
    expect(insertChar('1', ro)).toBe(false);
    expect(backspace(dis)).toBe(false);
    expect(insertChar('1', null)).toBe(false);
  });

  it('setNativeValue bypasses React value tracking', () => {
    const onValue = vi.fn();
    const { getByLabelText } = render(<Controlled onValue={onValue} />);
    const input = getByLabelText('Feld') as HTMLInputElement;
    setNativeValue(input, '345 678');
    expect(onValue).toHaveBeenCalledWith('345 678');
  });

  it('calculator behaviour (Ziffernblock): without a selection it types and deletes at the end; a selection is replaced', () => {
    const onValue = vi.fn();
    const { getByLabelText } = render(<Controlled onValue={onValue} />);
    const input = getByLabelText('Feld') as HTMLInputElement;
    input.focus();
    setNativeValue(input, '22');
    input.setSelectionRange(1, 1); // a tap left the caret between the digits
    backspace(input, { atEnd: true });
    expect(input.value).toBe('2');
    backspace(input, { atEnd: true });
    expect(input.value).toBe('');
    insertChar('2', input, { atEnd: true });
    insertChar('1', input, { atEnd: true });
    expect(input.value).toBe('21');
    input.setSelectionRange(0, 2); // e.g. the wrong answer selected after a check
    insertChar('7', input, { atEnd: true });
    expect(input.value).toBe('7');
    // without the option the caret position is respected (physical keyboard semantics)
    input.setSelectionRange(0, 0);
    insertChar('1', input);
    expect(input.value).toBe('17');
  });
});
