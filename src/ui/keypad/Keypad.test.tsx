// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, renderHook } from '@testing-library/react';
import { useRef, useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Keypad, { keypadTarget, useKeypadEnabled } from './Keypad';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function Harness({ onSubmit, comma = false, fields = 1 }: { onSubmit: () => void; comma?: boolean; fields?: number }) {
  const scope = useRef<HTMLDivElement>(null);
  const [values, setValues] = useState<string[]>(Array(fields).fill(''));
  return (
    <div>
      <div ref={scope}>
        {values.map((v, i) => (
          <input
            key={i}
            type="text"
            inputMode="none"
            aria-label={`Feld ${i + 1}`}
            value={v}
            onChange={(e) => setValues((prev) => prev.map((x, j) => (j === i ? e.target.value : x)))}
          />
        ))}
      </div>
      <output data-testid="out">{values.join('|')}</output>
      <Keypad scopeRef={scope} onSubmit={onSubmit} submitDisabled={values.every((v) => v === '')} comma={comma} />
    </div>
  );
}

describe('Keypad', () => {
  it('has digits 0–9, comma, delete and Prüfen in a labelled group', () => {
    const { getByRole } = render(<Harness onSubmit={() => {}} />);
    const group = getByRole('group', { name: 'Ziffernblock' });
    for (let d = 0; d <= 9; d++) expect(getByRole('button', { name: String(d) })).toBeTruthy();
    expect(getByRole('button', { name: 'Komma' })).toBeTruthy();
    expect(getByRole('button', { name: 'Löschen' })).toBeTruthy();
    expect(getByRole('button', { name: 'Prüfen' })).toBeTruthy();
    expect(group.querySelectorAll('button')).toHaveLength(13);
  });

  it('types into the focused field, deletes, and submits', () => {
    const onSubmit = vi.fn();
    const { getByRole, getByLabelText, getByTestId } = render(<Harness onSubmit={onSubmit} />);
    const prufen = getByRole('button', { name: 'Prüfen' }) as HTMLButtonElement;
    expect(prufen.disabled).toBe(true);
    (getByLabelText('Feld 1') as HTMLInputElement).focus();
    fireEvent.click(getByRole('button', { name: '5' }));
    fireEvent.click(getByRole('button', { name: '6' }));
    expect(getByTestId('out').textContent).toBe('56');
    fireEvent.click(getByRole('button', { name: 'Löschen' }));
    expect(getByTestId('out').textContent).toBe('5');
    expect(prufen.disabled).toBe(false);
    fireEvent.click(prufen);
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('keeps focus in the field (pointerdown is prevented)', () => {
    const { getByRole } = render(<Harness onSubmit={() => {}} />);
    const key = getByRole('button', { name: '3' });
    const ev = new Event('pointerdown', { bubbles: true, cancelable: true });
    key.dispatchEvent(ev);
    expect(ev.defaultPrevented).toBe(true);
    const md = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
    key.dispatchEvent(md);
    expect(md.defaultPrevented).toBe(true);
  });

  it('uses the last focused field, or the first field, when no field is focused', () => {
    const { getByRole, getByLabelText, getByTestId } = render(<Harness onSubmit={() => {}} fields={2} />);
    fireEvent.click(getByRole('button', { name: '1' }));
    expect(getByTestId('out').textContent).toBe('1|');
    (getByLabelText('Feld 2') as HTMLInputElement).focus();
    (getByRole('button', { name: '9' }) as HTMLButtonElement).focus(); // e.g. keyboard user tabbed to the keypad
    fireEvent.click(getByRole('button', { name: '9' }));
    expect(getByTestId('out').textContent).toBe('1|9');
  });

  it('comma key is only active for decimal answers', () => {
    const { getByRole, rerender, getByLabelText, getByTestId } = render(<Harness onSubmit={() => {}} />);
    expect((getByRole('button', { name: 'Komma' }) as HTMLButtonElement).disabled).toBe(true);
    rerender(<Harness onSubmit={() => {}} comma />);
    (getByLabelText('Feld 1') as HTMLInputElement).focus();
    fireEvent.click(getByRole('button', { name: '3' }));
    fireEvent.click(getByRole('button', { name: 'Komma' }));
    fireEvent.click(getByRole('button', { name: '5' }));
    expect(getByTestId('out').textContent).toBe('3,5');
  });

  it('keypadTarget prefers the focused input inside the scope', () => {
    const { container } = render(
      <div>
        <div data-testid="scope">
          <input type="text" aria-label="a" />
          <input type="text" aria-label="b" />
        </div>
        <input type="text" aria-label="outside" />
      </div>,
    );
    const scope = container.querySelector('[data-testid=scope]') as HTMLElement;
    const [a, b, outside] = Array.from(container.querySelectorAll('input'));
    b.focus();
    expect(keypadTarget(scope, null)).toBe(b);
    outside.focus();
    expect(keypadTarget(scope, null)).toBe(a);
    expect(keypadTarget(scope, b)).toBe(b);
  });
});

describe('useKeypadEnabled', () => {
  const stubMatchMedia = (matches: boolean) =>
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    }));

  it("'on' and 'off' override the device", () => {
    stubMatchMedia(false);
    expect(renderHook(() => useKeypadEnabled('on')).result.current).toBe(true);
    stubMatchMedia(true);
    expect(renderHook(() => useKeypadEnabled('off')).result.current).toBe(false);
  });

  it("'auto' follows (pointer: coarse)", () => {
    stubMatchMedia(true);
    expect(renderHook(() => useKeypadEnabled('auto')).result.current).toBe(true);
    stubMatchMedia(false);
    const { result } = renderHook(() => useKeypadEnabled('auto'));
    act(() => {});
    expect(result.current).toBe(false);
  });
});
