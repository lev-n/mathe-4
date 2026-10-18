/**
 * Ziffernblock helpers: insert a character into (or delete one from) a text input the way a real
 * keystroke would, so React's onChange fires.
 *
 * React tracks the value of controlled inputs through the instance property, so assigning
 * `input.value = …` directly would be swallowed. We therefore call the native setter from
 * HTMLInputElement.prototype and dispatch a bubbling 'input' event.
 */

/** A text field the keypad may type into. */
export function isTypeableInput(el: Element | null | undefined): el is HTMLInputElement {
  if (!el || !(el instanceof HTMLInputElement)) return false;
  const type = (el.getAttribute('type') ?? 'text').toLowerCase();
  if (type !== 'text' && type !== 'search' && type !== 'tel') return false;
  return !el.disabled && !el.readOnly;
}

/** Set an input's value through the native setter and fire an 'input' event (React onChange). */
export function setNativeValue(input: HTMLInputElement, value: string): void {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  if (setter) setter.call(input, value);
  else input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

export interface EditOptions {
  /**
   * Calculator behaviour (Ziffernblock): without a selection, type and delete at the end of the value,
   * wherever a tap left the caret (with inputmode "none" a child cannot move the caret). A selection —
   * e.g. the wrong answer selected after a check — is still replaced as a whole.
   */
  atEnd?: boolean;
}

function selection(input: HTMLInputElement, opts: EditOptions = {}): [number, number] {
  const len = input.value.length;
  let start = len;
  let end = len;
  try {
    start = input.selectionStart ?? len;
    end = input.selectionEnd ?? start;
  } catch {
    // Some input types do not support selection; fall back to the end.
  }
  if (opts.atEnd && start === end) return [len, len];
  return [Math.min(start, end), Math.max(start, end)];
}

function placeCaret(input: HTMLInputElement, pos: number): void {
  try {
    input.setSelectionRange(pos, pos);
  } catch {
    // ignore (unsupported input type)
  }
}

/**
 * Insert `char` at the caret (replacing a selection) of `target` (default: the focused element).
 * Respects maxLength: a full single-character box (digit box) is overwritten, longer full fields are left alone.
 * @returns true if the value changed.
 */
export function insertChar(char: string, target: Element | null = activeElement(), opts: EditOptions = {}): boolean {
  if (!isTypeableInput(target)) return false;
  const input = target;
  const value = input.value;
  const [start, end] = selection(input, opts);
  let next = value.slice(0, start) + char + value.slice(end);
  let caret = start + char.length;
  const max = input.maxLength;
  if (max > 0 && next.length > max) {
    if (max === 1) {
      next = char;
      caret = 1;
    } else {
      return false;
    }
  }
  if (next === value) return false;
  setNativeValue(input, next);
  placeCaret(input, caret);
  return true;
}

/**
 * Delete the selection, or the character before the caret, of `target` (default: the focused element).
 * @returns true if the value changed.
 */
export function backspace(target: Element | null = activeElement(), opts: EditOptions = {}): boolean {
  if (!isTypeableInput(target)) return false;
  const input = target;
  const value = input.value;
  const [start, end] = selection(input, opts);
  if (start === end && start === 0) return false;
  const from = start === end ? start - 1 : start;
  const next = value.slice(0, from) + value.slice(end);
  setNativeValue(input, next);
  placeCaret(input, from);
  return true;
}

function activeElement(): Element | null {
  return typeof document === 'undefined' ? null : document.activeElement;
}
