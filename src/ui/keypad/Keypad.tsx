/**
 * On-screen Ziffernblock (docs/research.md P13): 0–9, ',', ⌫ and Prüfen, every key ≥ 64 px.
 * Keys never take focus away from the answer field (pointerdown is prevented), and characters are
 * inserted with native input events so the answer components' React onChange fires as usual.
 */
import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent, type ReactNode, type RefObject } from 'react';
import { answerFields, initialField } from '../answers/fieldNav';
import { backspace, insertChar, isTypeableInput } from './insert';
import './keypad.css';

export interface KeypadProps {
  /** Element that contains the answer inputs (used when no input is focused). */
  scopeRef: RefObject<HTMLElement | null>;
  /**
   * 'Prüfen' key. Gets the field the keypad would type into, so the page can treat the key exactly like Enter
   * in that field (next empty field first, then check; src/ui/answers/fieldNav.ts).
   */
  onSubmit: (field: HTMLInputElement | null) => void;
  /** Prüfen is disabled while the answer is empty. */
  submitDisabled: boolean;
  /** Show an active comma key (decimal answers). */
  comma: boolean;
  /** Everything disabled (item finished). */
  disabled?: boolean;
  /**
   * 'Tipp' next to Prüfen (the practice page puts it here so that task, field and the whole keypad fit on a
   * phone screen together). `unavailable` = all hints shown (aria-disabled, stays focusable).
   */
  hint?: { label: ReactNode; unavailable: boolean; onClick: (e: ReactMouseEvent<HTMLButtonElement>) => void };
}

/** Keys type at the end of the number like a calculator (see insert.ts EditOptions). */
const CALCULATOR = { atEnd: true } as const;

const DIGIT_ROWS = [['7', '8', '9'], ['4', '5', '6'], ['1', '2', '3']] as const;

/** Find the input the keypad should type into. */
export function keypadTarget(scope: HTMLElement | null, lastFocused: HTMLInputElement | null): HTMLInputElement | null {
  const active = typeof document === 'undefined' ? null : document.activeElement;
  if (scope && isTypeableInput(active) && scope.contains(active)) return active;
  if (lastFocused && lastFocused.isConnected && isTypeableInput(lastFocused) && (!scope || scope.contains(lastFocused))) return lastFocused;
  if (!scope) return null;
  // Nothing focused yet: the answer field to fill first (Überschlag or Einer, never an ungraded helper box).
  const first = initialField(answerFields(scope).filter((el) => isTypeableInput(el)));
  if (first && isTypeableInput(first)) return first;
  const inputs = Array.from(scope.querySelectorAll('input'));
  return inputs.find((el) => isTypeableInput(el)) ?? null;
}

export default function Keypad({ scopeRef, onSubmit, submitDisabled, comma, disabled = false, hint }: KeypadProps) {
  const lastFocused = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const scope = scopeRef.current;
    if (!scope) return;
    const onFocusIn = (e: FocusEvent) => {
      if (isTypeableInput(e.target as Element)) lastFocused.current = e.target as HTMLInputElement;
    };
    scope.addEventListener('focusin', onFocusIn);
    return () => scope.removeEventListener('focusin', onFocusIn);
  }, [scopeRef]);

  const withTarget = (fn: (input: HTMLInputElement) => void) => {
    const target = keypadTarget(scopeRef.current, lastFocused.current);
    if (!target) return;
    if (document.activeElement !== target) target.focus({ preventScroll: true });
    lastFocused.current = target;
    fn(target);
  };

  const keepFocus = (e: ReactPointerEvent | ReactMouseEvent) => e.preventDefault();

  const key = (char: string, label?: string) => (
    <button
      key={char}
      type="button"
      className={`keypad__key keypad__key--d${char}`}
      disabled={disabled}
      onPointerDown={keepFocus}
      onMouseDown={keepFocus}
      onClick={() => withTarget((t) => insertChar(char, t, CALCULATOR))}
      aria-label={label}
    >
      {char}
    </button>
  );

  return (
    <div className={`keypad no-print${hint ? ' keypad--with-hint' : ''}`} role="group" aria-label="Ziffernblock">
      <div className="keypad__grid">
        {DIGIT_ROWS.map((row) => row.map((d) => key(d)))}
        <button
          type="button"
          className="keypad__key keypad__key--comma"
          disabled={disabled || !comma}
          onPointerDown={keepFocus}
          onMouseDown={keepFocus}
          onClick={() => withTarget((t) => insertChar(',', t, CALCULATOR))}
          aria-label="Komma"
        >
          ,
        </button>
        {key('0')}
        <button
          type="button"
          className="keypad__key keypad__key--back"
          disabled={disabled}
          onPointerDown={keepFocus}
          onMouseDown={keepFocus}
          onClick={() => withTarget((t) => backspace(t, CALCULATOR))}
          aria-label="Löschen"
        >
          <span aria-hidden="true">⌫</span>
          <span className="keypad__sub" aria-hidden="true">Löschen</span>
        </button>
        {hint && (
          <button
            type="button"
            className="btn btn--lg keypad__hint"
            disabled={disabled}
            aria-disabled={hint.unavailable || undefined}
            onPointerDown={keepFocus}
            onMouseDown={keepFocus}
            onClick={(e) => {
              if (!hint.unavailable) hint.onClick(e);
            }}
          >
            {hint.label}
          </button>
        )}
        <button
          type="button"
          className={`btn btn--primary btn--lg keypad__submit${hint ? ' keypad__submit--with-hint' : ''}`}
          disabled={disabled || submitDisabled}
          onPointerDown={keepFocus}
          onMouseDown={keepFocus}
          onClick={() => onSubmit(keypadTarget(scopeRef.current, lastFocused.current))}
        >
          Prüfen
        </button>
      </div>
    </div>
  );
}

/** Media query for touch devices. */
const COARSE = '(pointer: coarse)';

/** Touch is the primary input (tablets, phones, Chromebooks in tablet mode). */
export function coarsePointer(): boolean {
  try {
    return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(COARSE).matches;
  } catch {
    return false;
  }
}

/** Whether the Ziffernblock is shown: setting 'on', or 'auto' on touch devices. */
export function useKeypadEnabled(setting: 'auto' | 'on' | 'off'): boolean {
  const [coarse, setCoarse] = useState(coarsePointer);
  useEffect(() => {
    if (setting !== 'auto' || typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    let mql: MediaQueryList;
    try {
      mql = window.matchMedia(COARSE);
    } catch {
      return;
    }
    const update = () => setCoarse(mql.matches);
    update();
    mql.addEventListener?.('change', update);
    return () => mql.removeEventListener?.('change', update);
  }, [setting]);
  if (setting === 'on') return true;
  if (setting === 'off') return false;
  return coarse;
}
