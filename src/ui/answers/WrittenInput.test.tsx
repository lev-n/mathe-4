// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { checkAnswer } from '../../core/check';
import type { AnswerOf, CheckResult, Response } from '../../core/types';
import { insertChar } from '../keypad/insert';
import WrittenInput, { typedDigit } from './WrittenInput';

import AnswerInput from './AnswerInput';

afterEach(cleanup);

type WA = AnswerOf<'written'>;
const ADD: WA = { kind: 'written', op: 'add', operands: [4567, 2845], result: 7412 };
const SUB: WA = { kind: 'written', op: 'sub', operands: [805, 328], result: 477, method: 'abziehen' };
const MUL: WA = { kind: 'written', op: 'mul', operands: [1254, 37], result: 46398 };
const DIV: WA = { kind: 'written', op: 'div', operands: [5435, 4], result: 1358, remainder: 3 };

function Harness(p: { answer: WA; onChange?: (r: Response) => void; onSubmit?: () => void; result?: CheckResult | null; reveal?: boolean; keypad?: boolean }) {
  const [response, setResponse] = useState<Response | null>(null);
  return (
    <AnswerInput
      answer={p.answer}
      response={response}
      onChange={(r) => {
        setResponse(r);
        p.onChange?.(r);
      }}
      onSubmit={p.onSubmit ?? (() => {})}
      disabled={false}
      result={p.result ?? null}
      reveal={p.reveal ?? false}
      idBase="t"
      keypad={p.keypad ?? false}
    />
  );
}

const box = (label: string) => screen.getByLabelText(label) as HTMLInputElement;
/** A key press as in a browser: keydown, and unless that is prevented, the character replaces the selection. */
const pressKey = (key: string) => {
  const el = document.activeElement as HTMLInputElement;
  if (fireEvent.keyDown(el, { key })) insertChar(key, el);
};
const type = (label: string, value: string) => fireEvent.change(box(label), { target: { value } });

describe('WrittenInput', () => {
  it('renders the operands stellengerecht with labelled result boxes and place headers', () => {
    const { container } = render(<Harness answer={ADD} />);
    expect(container.querySelector('table')).not.toBeNull();
    for (const p of ['Einer', 'Zehner', 'Hunderter', 'Tausender', 'Zehntausender']) expect(box(`Ergebnis, ${p}`)).toBeTruthy();
    expect(box('Übertrag, Zehner').className).toContain('wi-helper');
    expect([...container.querySelectorAll('th')].map((th) => th.textContent)).toEqual(['ZT', 'T', 'H', 'Z', 'E']);
    expect(box('Ergebnis, Einer').getAttribute('inputmode')).toBe('numeric');
    expect(box('Ergebnis, Einer').getAttribute('type')).toBe('text');
  });

  it('enters digits right to left and reports the result', () => {
    const onChange = vi.fn();
    render(<Harness answer={ADD} onChange={onChange} />);
    box('Ergebnis, Einer').focus();
    type('Ergebnis, Einer', '2');
    expect(onChange).toHaveBeenLastCalledWith({ kind: 'written', result: '2' });
    expect(document.activeElement).toBe(box('Ergebnis, Zehner'));
    type('Ergebnis, Zehner', '1');
    type('Ergebnis, Hunderter', '4');
    type('Ergebnis, Tausender', '7');
    expect(onChange).toHaveBeenLastCalledWith({ kind: 'written', result: '7412' });
    expect(checkAnswer(ADD, onChange.mock.lastCall![0]).correct).toBe(true);
  });

  it('ignores non-digits and keeps a gap visible as an unreadable entry', () => {
    const onChange = vi.fn();
    render(<Harness answer={ADD} onChange={onChange} />);
    type('Ergebnis, Einer', 'x');
    expect(box('Ergebnis, Einer').value).toBe('');
    type('Ergebnis, Zehner', '1');
    expect(onChange).toHaveBeenLastCalledWith({ kind: 'written', result: '1_' });
    expect(checkAnswer(ADD, onChange.mock.lastCall![0]).invalid).toBeTruthy();
  });

  it('Backspace in an empty box clears the previous digit and moves right', () => {
    const onChange = vi.fn();
    render(<Harness answer={ADD} onChange={onChange} />);
    type('Ergebnis, Einer', '2');
    const zehner = box('Ergebnis, Zehner');
    expect(document.activeElement).toBe(zehner);
    fireEvent.keyDown(zehner, { key: 'Backspace' });
    expect(box('Ergebnis, Einer').value).toBe('');
    expect(document.activeElement).toBe(box('Ergebnis, Einer'));
    expect(onChange).toHaveBeenLastCalledWith({ kind: 'written', result: '' });
  });

  it('moves with the arrow keys; Enter goes to the empty Einer first, then submits', () => {
    const onSubmit = vi.fn();
    render(<Harness answer={ADD} onSubmit={onSubmit} />);
    const einer = box('Ergebnis, Einer');
    einer.focus();
    fireEvent.keyDown(einer, { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(box('Ergebnis, Zehner'));
    fireEvent.keyDown(document.activeElement!, { key: 'ArrowUp' });
    expect(document.activeElement).toBe(box('Übertrag, Zehner'));
    fireEvent.keyDown(document.activeElement!, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(box('Ergebnis, Zehner'));
    // the result is still empty: Enter leads to the Einer (wrap-around), it does not check
    fireEvent.keyDown(document.activeElement!, { key: 'Enter' });
    expect(onSubmit).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(einer);
    for (const d of '2147') pressKey(d);
    // all digits typed (the empty box in front of the highest digit is not missing): Enter checks
    fireEvent.keyDown(document.activeElement!, { key: 'Enter' });
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('carry boxes are not graded', () => {
    const onChange = vi.fn();
    render(<Harness answer={ADD} onChange={onChange} />);
    type('Übertrag, Zehner', '1');
    expect(box('Übertrag, Zehner').value).toBe('1');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('marks wrong columns with colour, outline marker and screen-reader text', () => {
    const result = checkAnswer(ADD, { kind: 'written', result: '7402' });
    expect(result.wrongColumns).toEqual([1]);
    const { container } = render(<Harness answer={ADD} result={result} />);
    const zehner = box('Ergebnis, Zehner');
    expect(zehner.className).toContain('is-wrong');
    expect(zehner.getAttribute('aria-invalid')).toBe('true');
    expect(document.getElementById(zehner.getAttribute('aria-describedby')!)?.textContent).toBe('Diese Stelle stimmt noch nicht.');
    expect(container.querySelectorAll('.wi-mark')).toHaveLength(1);
    expect(box('Ergebnis, Einer').className).not.toContain('is-wrong');
  });

  it('reveal shows the correct digits read-only', () => {
    render(<Harness answer={SUB} reveal />);
    expect(box('Ergebnis, Einer').value).toBe('7');
    expect(box('Ergebnis, Zehner').value).toBe('7');
    expect(box('Ergebnis, Hunderter').value).toBe('4');
    expect(box('Ergebnis, Einer').readOnly).toBe(true);
  });

  it('offers Entbündeln helper boxes for Abziehen and gemerkte-1 boxes for Ergänzen', () => {
    const { unmount } = render(<Harness answer={SUB} />);
    expect(box('Entbündeln, Einer')).toBeTruthy();
    unmount();
    render(<Harness answer={{ ...SUB, method: 'ergaenzen' }} />);
    expect(box('Gemerkte 1, Zehner')).toBeTruthy();
    expect(screen.queryByLabelText('Entbündeln, Einer')).toBeNull();
  });

  it('multiplication with a two-digit factor has shifted partial-product rows and one graded result row', () => {
    const onChange = vi.fn();
    render(<Harness answer={MUL} onChange={onChange} />);
    expect(box('1. Teilprodukt, Zehner')).toBeTruthy();
    expect(box('2. Teilprodukt, Einer')).toBeTruthy();
    expect(screen.queryByLabelText('1. Teilprodukt, Einer')).toBeNull(); // shifted: ends under the 3 (Zehner)
    expect(screen.getAllByLabelText(/^Ergebnis, /)).toHaveLength(6);
    type('2. Teilprodukt, Einer', '8');
    expect(onChange).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(box('2. Teilprodukt, Zehner'));
  });

  it('division: quotient left to right, then the remainder', () => {
    const onChange = vi.fn();
    render(<Harness answer={DIV} onChange={onChange} />);
    type('Ergebnis, 1. Ziffer', '1');
    expect(document.activeElement).toBe(box('Ergebnis, 2. Ziffer'));
    type('Ergebnis, 2. Ziffer', '3');
    type('Ergebnis, 3. Ziffer', '5');
    type('Ergebnis, 4. Ziffer', '8');
    type('Rest, 1. Ziffer', '3');
    const last = onChange.mock.lastCall![0] as Response;
    expect(last).toEqual({ kind: 'written', result: '1358', remainder: '3' });
    expect(checkAnswer(DIV, last).correct).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Platz für Nebenrechnungen' }));
    expect(box('Nebenrechnung, Zeile 1, Spalte 1')).toBeTruthy();
  });

  it('division: marks a wrong quotient digit and a wrong remainder', () => {
    const result = checkAnswer(DIV, { kind: 'written', result: '1348', remainder: '7' });
    const harness = render(<Harness answer={DIV} result={null} />);
    type('Ergebnis, 1. Ziffer', '1');
    type('Ergebnis, 2. Ziffer', '3');
    type('Ergebnis, 3. Ziffer', '4');
    type('Ergebnis, 4. Ziffer', '8');
    type('Rest, 1. Ziffer', '7');
    harness.rerender(<Harness answer={DIV} result={result} />);
    expect(box('Ergebnis, 3. Ziffer').className).toContain('is-wrong');
    expect(box('Ergebnis, 2. Ziffer').className).not.toContain('is-wrong');
    expect(box('Rest, 1. Ziffer').className).toContain('is-wrong');
  });

  it('Tab enters at the Einer box; helper boxes are reached with the arrow keys', () => {
    render(<Harness answer={ADD} />);
    expect(box('Ergebnis, Einer').tabIndex).toBe(0);
    expect(box('Ergebnis, Zehner').tabIndex).toBe(-1);
    expect(box('Übertrag, Zehner').tabIndex).toBe(-1);
  });

  it('a corrected box loses its mark until the next check', () => {
    const result = checkAnswer(ADD, { kind: 'written', result: '7402' });
    render(<Harness answer={ADD} result={result} />);
    expect(box('Ergebnis, Zehner').className).toContain('is-wrong');
    type('Ergebnis, Zehner', '1');
    expect(box('Ergebnis, Zehner').className).not.toContain('is-wrong');
  });

  it('uses inputMode none with the on-screen keypad', () => {
    render(<Harness answer={ADD} keypad />);
    expect(box('Ergebnis, Einer').getAttribute('inputmode')).toBe('none');
  });

  it('print mode renders static empty Kästchen without inputs', () => {
    const { container } = render(
      <WrittenInput answer={MUL} response={null} onChange={() => {}} onSubmit={() => {}} disabled={false} result={null} reveal={false} idBase="p" keypad={false} print />,
    );
    expect(container.querySelectorAll('input')).toHaveLength(0);
    expect(container.querySelectorAll('.digit-box').length).toBeGreaterThanOrEqual(6);
    const div = render(
      <WrittenInput answer={DIV} response={null} onChange={() => {}} onSubmit={() => {}} disabled={false} result={null} reveal={false} idBase="q" keypad={false} print />,
    );
    expect(div.container.querySelectorAll('input')).toHaveLength(0);
    expect(div.container.textContent).toContain('R');
  });

  it('retyping a corrected result with the keyboard keeps every digit in its place (same digits included)', () => {
    const onChange = vi.fn();
    render(<Harness answer={ADD} onChange={onChange} />);
    const typeFromEiner = (digits: string) => {
      box('Ergebnis, Einer').focus();
      for (const d of digits.split('').reverse()) pressKey(d);
    };
    typeFromEiner('7413');
    expect(onChange).toHaveBeenLastCalledWith({ kind: 'written', result: '7413' });
    // after "Noch nicht ganz" the child types the whole result again; 1, 4 and 7 are unchanged
    typeFromEiner('7412');
    expect(onChange).toHaveBeenLastCalledWith({ kind: 'written', result: '7412' });
    expect(checkAnswer(ADD, onChange.mock.lastCall![0]).correct).toBe(true);
    expect(document.activeElement).toBe(box('Ergebnis, Zehntausender'));
  });

  it('retyping with the Ziffernblock moves on after an unchanged digit, too', () => {
    const onChange = vi.fn();
    render(<Harness answer={ADD} onChange={onChange} keypad />);
    const typeFromEiner = (digits: string) => {
      box('Ergebnis, Einer').focus();
      for (const d of digits.split('').reverse()) insertChar(d, document.activeElement);
    };
    typeFromEiner('7413');
    expect(onChange).toHaveBeenLastCalledWith({ kind: 'written', result: '7413' });
    typeFromEiner('7412');
    expect(onChange).toHaveBeenLastCalledWith({ kind: 'written', result: '7412' });
    expect(['Einer', 'Zehner', 'Hunderter', 'Tausender'].map((p) => box(`Ergebnis, ${p}`).value)).toEqual(['2', '1', '4', '7']);
  });

  it('division: retyping the quotient left to right works the same way', () => {
    const onChange = vi.fn();
    render(<Harness answer={DIV} onChange={onChange} />);
    const typeQuotient = (digits: string) => {
      box('Ergebnis, 1. Ziffer').focus();
      for (const d of digits) pressKey(d);
    };
    typeQuotient('1338');
    typeQuotient('1358');
    expect((onChange.mock.lastCall![0] as Response).kind === 'written' && (onChange.mock.lastCall![0] as { result: string }).result).toBe('1358');
  });

  it('a letter typed after a digit is dropped and does not move on; Delete clears the box', () => {
    render(<Harness answer={ADD} />);
    const einer = box('Ergebnis, Einer');
    einer.focus();
    pressKey('2');
    box('Ergebnis, Einer').focus();
    insertChar('x', document.activeElement);
    expect(box('Ergebnis, Einer').value).toBe('2');
    expect(document.activeElement).toBe(box('Ergebnis, Einer'));
    fireEvent.keyDown(box('Ergebnis, Einer'), { key: 'Delete' });
    expect(box('Ergebnis, Einer').value).toBe('');
  });

  it('typedDigit picks the new digit wherever the caret was', () => {
    expect(typedDigit('8', '87')).toBe('7');
    expect(typedDigit('8', '78')).toBe('7');
    expect(typedDigit('7', '77')).toBe('7');
    expect(typedDigit('', '5')).toBe('5');
    expect(typedDigit('3', '')).toBe('');
  });

  it('the "noch nicht" text is only reachable through a marked box', () => {
    const { container } = render(<Harness answer={ADD} />);
    // hidden: not read in browse mode, but still the description of a marked box (aria-describedby)
    const note = container.querySelector('#t-wrong') as HTMLElement;
    expect(note.hidden).toBe(true);
    expect(note.textContent).toBe('Diese Stelle stimmt noch nicht.');
  });

  it('print: the Dividend is the first row of the Kästchen grid', () => {
    const { container } = render(
      <WrittenInput answer={DIV} response={null} onChange={() => {}} onSubmit={() => {}} disabled={false} result={null} reveal={false} idBase="q" keypad={false} print />,
    );
    const rows = [...container.querySelectorAll('table.wi-print-grid tr')];
    const first = [...rows[0].querySelectorAll('td.wi-print-cell')].map((td) => td.textContent);
    expect(first).toEqual(['', '5', '4', '3', '5']);
    // the rows below have a grid cell under every Dividend digit (plus one for the minus sign)
    expect(rows[1].querySelectorAll('td.wi-print-cell')).toHaveLength(5);
  });

  it('adopts a response that the page resets', () => {
    function Resettable() {
      const [response, setResponse] = useState<Response | null>(null);
      return (
        <>
          <button type="button" onClick={() => setResponse(null)}>reset</button>
          <WrittenInput answer={ADD} response={response} onChange={setResponse} onSubmit={() => {}} disabled={false} result={null} reveal={false} idBase="r" keypad={false} />
        </>
      );
    }
    render(<Resettable />);
    type('Ergebnis, Einer', '2');
    expect(box('Ergebnis, Einer').value).toBe('2');
    fireEvent.click(screen.getByText('reset'));
    expect(box('Ergebnis, Einer').value).toBe('');
  });
});

describe('WrittenInput: Überschlag first (Stufe 2–3)', () => {
  const ADD_U: WA = { ...ADD, ueberschlag: 8000 };
  const DIV_U: WA = { ...DIV, ueberschlag: 1400 };

  it('shows a labelled Überschlag field only when the task asks for one', () => {
    render(<Harness answer={ADD} />);
    expect(screen.queryByLabelText('Überschlag')).toBeNull();
    cleanup();
    render(<Harness answer={ADD_U} />);
    const field = box('Überschlag');
    expect(field.getAttribute('inputmode')).toBe('numeric');
    expect(document.getElementById(field.getAttribute('aria-describedby')!)!.textContent).toMatch(/höchste Stelle/);
  });

  it('reports the Überschlag with the result; checking without it is not an attempt', () => {
    const onChange = vi.fn();
    render(<Harness answer={ADD_U} onChange={onChange} />);
    type('Ergebnis, Einer', '2');
    const first = onChange.mock.calls.at(-1)![0] as Response;
    expect(first).toEqual({ kind: 'written', result: '2', ueberschlag: '' });
    expect(checkAnswer(ADD_U, first).invalid).toMatch(/Überschlag/);
    type('Überschlag', '8 000x');
    expect(box('Überschlag').value).toBe('8 000');
    expect(onChange.mock.calls.at(-1)![0]).toEqual({ kind: 'written', result: '2', ueberschlag: '8 000' });
  });

  it('Enter in the Überschlag field moves to the Kästchen while the result is empty, then the Rest, then submits', () => {
    const onSubmit = vi.fn();
    render(<Harness answer={DIV_U} onSubmit={onSubmit} />);
    type('Überschlag', '1400');
    box('Überschlag').focus();
    fireEvent.keyDown(box('Überschlag'), { key: 'Enter' });
    expect(onSubmit).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(box('Ergebnis, 1. Ziffer'));
    type('Ergebnis, 1. Ziffer', '1');
    box('Überschlag').focus();
    // the (optional) Rest is visited once …
    fireEvent.keyDown(box('Überschlag'), { key: 'Enter' });
    expect(onSubmit).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(box('Rest, 1. Ziffer'));
    // … and may stay empty: Enter there checks
    fireEvent.keyDown(document.activeElement!, { key: 'Enter' });
    expect(onSubmit).toHaveBeenCalledOnce();
  });

  it('marks a far-off Überschlag with text (not only colour) and shows the expected one on reveal', () => {
    const result = checkAnswer(ADD_U, { kind: 'written', result: '7412', ueberschlag: '80' });
    expect(result.correct).toBe(true);
    render(<Harness answer={ADD_U} result={result} />);
    expect(box('Überschlag').getAttribute('aria-invalid')).toBe('true');
    expect(screen.getByText(/Dein Überschlag passt noch nicht ganz/)).toBeTruthy();
    cleanup();
    render(<Harness answer={ADD_U} reveal />);
    expect(box('Überschlag').value).toBe('8000');
    expect(box('Überschlag').readOnly).toBe(true);
  });

  it('print: a line for the Überschlag above the Kästchen', () => {
    const { container } = render(
      <WrittenInput answer={ADD_U} response={null} onChange={() => {}} onSubmit={() => {}} disabled={false} result={null} reveal={false} idBase="p" keypad={false} print />,
    );
    expect(container.querySelector('.wi-print-ueb')?.textContent).toContain('Überschlag:');
    expect(container.querySelectorAll('input')).toHaveLength(0);
  });
});
