/**
 * Keyboard and focus navigation through answer fields, shared by every answer input.
 *
 * Inputs only mark their fields with data attributes; this module decides where focus goes:
 * - data-answer-field          an answer field: text input, digit box, slider, the tab stop of a widget …
 * - data-answer-order="n"      reading order (written calculations: right-to-left digits); default: DOM order
 * - data-answer-empty="true"   overrides the default emptiness (a text input whose value is blank)
 * - data-answer-optional       may stay empty (division Rest): Enter visits it once, then checks
 * - data-answer-wrong          marked "noch nicht richtig" by the last check
 * - data-answer-enter="self"   the widget keeps its own Enter handling (choice, order, cells, number line)
 *
 * Enter in a field moves to the next empty field in reading order (filled fields are skipped), wrapping
 * around to the first empty required field; when nothing is left to fill, Enter means "Prüfen".
 * Shift+Enter goes back one field. The Ziffernblock's "Prüfen" key does the same as Enter.
 */
import type { KeyboardEvent } from 'react';

const FIELD = '[data-answer-field]';
/** Breathing space kept between the revealed region and the screen edge. */
const MARGIN = 8;
/** Below this width the Ziffernblock sits under the task (keep in sync with practice.css). */
const KEYPAD_BELOW = '(max-width: 899px)';

function isUsable(el: HTMLElement): boolean {
  if (!el.isConnected || el.closest('[hidden]')) return false;
  return !(el instanceof HTMLInputElement || el instanceof HTMLButtonElement) || !el.disabled;
}

/** The answer fields inside `scope`, in reading order. */
export function answerFields(scope: ParentNode | null | undefined): HTMLElement[] {
  if (!scope) return [];
  return Array.from(scope.querySelectorAll<HTMLElement>(FIELD))
    .filter(isUsable)
    .map((el, i) => {
      const order = Number(el.dataset.answerOrder);
      return { el, i, order: Number.isFinite(order) && el.dataset.answerOrder !== undefined ? order : i };
    })
    .sort((a, b) => a.order - b.order || a.i - b.i)
    .map((x) => x.el);
}

export function isEmptyField(el: HTMLElement): boolean {
  const flag = el.dataset.answerEmpty;
  if (flag === 'true') return true;
  if (flag === 'false') return false;
  return el instanceof HTMLInputElement ? el.value.trim() === '' : false;
}

const isOptional = (el: HTMLElement) => el.dataset.answerOptional !== undefined;
const isRequiredEmpty = (el: HTMLElement) => isEmptyField(el) && !isOptional(el);

/** The field that contains `node` (or is it), or null. */
export function fieldOf(node: EventTarget | null): HTMLElement | null {
  return node instanceof Element ? node.closest<HTMLElement>(FIELD) : null;
}

/**
 * Where Enter in `current` leads: the next empty field after it, else the first empty required field
 * before it (wrap-around); null means "Prüfen". When `current` is not a field (e.g. an ungraded helper box),
 * the first empty required field is the target.
 */
export function enterTarget(fields: readonly HTMLElement[], current: HTMLElement | null): HTMLElement | null {
  const idx = current ? fields.indexOf(current) : -1;
  if (idx < 0) return fields.find(isRequiredEmpty) ?? null;
  for (let i = idx + 1; i < fields.length; i++) if (isEmptyField(fields[i])) return fields[i];
  for (let i = 0; i < idx; i++) if (isRequiredEmpty(fields[i])) return fields[i];
  // Only the current field is still empty (or nothing is): check, so the child gets the friendly
  // "Gib zuerst … ein" message instead of a silent Enter.
  return null;
}

/** The field before `current` in reading order (Shift+Enter), or null at the start. */
export function previousField(fields: readonly HTMLElement[], current: HTMLElement): HTMLElement | null {
  const idx = fields.indexOf(current);
  return idx > 0 ? fields[idx - 1] : null;
}

/** First field to fill: the first empty required field, else the first empty field, else the first field. */
export function initialField(fields: readonly HTMLElement[]): HTMLElement | null {
  return fields.find(isRequiredEmpty) ?? fields.find(isEmptyField) ?? fields[0] ?? null;
}

export function firstWrongField(fields: readonly HTMLElement[]): HTMLElement | null {
  return fields.find((f) => f.dataset.answerWrong !== undefined) ?? null;
}

export function firstEmptyRequiredField(fields: readonly HTMLElement[]): HTMLElement | null {
  return fields.find(isRequiredEmpty) ?? null;
}

function keypadBelow(): boolean {
  try {
    return typeof window.matchMedia === 'function' && window.matchMedia(KEYPAD_BELOW).matches;
  } catch {
    return false;
  }
}

type Span = { top: number; bottom: number };

/** Top edge of the task: Zwilling/Knobel label, Sachaufgabe context or prompt (whichever comes first). */
const TASK_START = '.pr-twin-label, .pr-knobel-label, .pr-context, .pr-prompt';

/**
 * Scroll as little as possible to show the field plus, in order of priority, as much as fits:
 * - a new task ('new'): the task text from its top, then the whole Ziffernblock (phones), then the buttons;
 * - after a wrong answer ('retry'): the hint (feedback panel), then the Ziffernblock, then the task text.
 * The field itself is never cut off.
 */
export function revealField(field: HTMLElement, mode: 'new' | 'retry' = 'new'): void {
  if (typeof window === 'undefined') return;
  const view = window.innerHeight;
  const box = field.getBoundingClientRect();
  if (!view || (box.width === 0 && box.height === 0)) return;
  const item = field.closest<HTMLElement>('.pr-item');
  const layout = field.closest<HTMLElement>('.pr-item-layout');
  const span = (sel: string, root: HTMLElement | null): Span | null => {
    const r = root?.querySelector<HTMLElement>(sel)?.getBoundingClientRect();
    return r && (r.width > 0 || r.height > 0) ? { top: r.top, bottom: r.bottom } : null;
  };
  const join = (a: Span, b: Span): Span => ({ top: Math.min(a.top, b.top), bottom: Math.max(a.bottom, b.bottom) });
  const fits = (s: Span) => s.bottom - s.top <= view - 2 * MARGIN;

  const keypad = layout?.classList.contains('has-keypad') && keypadBelow() ? span('.pr-keypad', layout) : null;
  const task = span(TASK_START, item);
  const feedback = span('.pr-invalid, .pr-feedback', item);
  const actions = span('.pr-actions', item);
  const extras = mode === 'retry' ? [feedback, keypad, task, actions] : [task, keypad, feedback, actions];

  let show: Span = { top: box.top, bottom: box.bottom };
  let keypadShown = false;
  for (const extra of extras) {
    if (!extra) continue;
    const next = join(show, extra);
    if (fits(next)) {
      show = next;
      if (extra === keypad) keypadShown = true;
    }
  }
  // The Ziffernblock below does not fit completely: start the shown part at the top of the screen, so as much
  // of the keypad as possible is visible under it (instead of the page header).
  if (keypad && !keypadShown) {
    const delta = show.top - MARGIN;
    if (Math.abs(delta) >= 1) window.scrollBy(0, delta);
    return;
  }
  scrollToShow(show, view);
}

function scrollToShow(show: Span, view: number): void {
  let delta = 0;
  if (show.bottom - show.top > view - 2 * MARGIN || show.top < MARGIN) delta = show.top - MARGIN;
  else if (show.bottom > view - MARGIN) delta = show.bottom - (view - MARGIN);
  if (Math.abs(delta) >= 1) window.scrollBy(0, delta);
}

/**
 * Show the region from `top` to `bottom` with as little scrolling as possible; a region taller than the
 * screen starts at its top (worked solutions and examples are read from the beginning).
 */
export function showRegion(top: Element, bottom: Element = top): void {
  if (typeof window === 'undefined' || !window.innerHeight) return;
  const a = top.getBoundingClientRect();
  const b = bottom.getBoundingClientRect();
  if (a.width === 0 && a.height === 0) return;
  scrollToShow({ top: Math.min(a.top, b.top), bottom: Math.max(a.bottom, b.bottom) }, window.innerHeight);
}

/** Scroll sideways-scrolling containers (written columns, grids, number lines) so the field is inside them. */
export function revealInline(field: HTMLElement): void {
  for (let box = field.parentElement; box; box = box.parentElement) {
    if (box.scrollWidth <= box.clientWidth + 1) continue;
    const overflow = getComputedStyle(box).overflowX;
    if (overflow !== 'auto' && overflow !== 'scroll') continue;
    const outer = box.getBoundingClientRect();
    const r = field.getBoundingClientRect();
    if (r.width >= outer.width) continue; // the field is the wide content itself (number-line slider)
    if (r.left < outer.left + MARGIN) box.scrollLeft -= outer.left + MARGIN - r.left;
    else if (r.right > outer.right - MARGIN) box.scrollLeft += r.right - (outer.right - MARGIN);
  }
}

/** Focus a field without the browser's own jump, select a text field's content if asked, then reveal it. */
export function focusField(el: HTMLElement, opts: { select?: boolean; mode?: 'new' | 'retry' } = {}): void {
  el.focus({ preventScroll: true });
  if (opts.select && el instanceof HTMLInputElement && el.value !== '') {
    try {
      el.select();
    } catch {
      // selection not supported: focusing is enough
    }
  }
  revealInline(el);
  revealField(el, opts.mode);
}

/**
 * Enter from `current` (a field, a non-field input inside the scope, or null): move to the next field to fill,
 * or call `submit` when nothing is left.
 */
export function advanceOrSubmit(scope: ParentNode | null | undefined, current: Element | null, submit: () => void): void {
  const fields = answerFields(scope);
  const target = enterTarget(fields, fieldOf(current));
  if (target && target !== current) focusField(target);
  else submit();
}

/**
 * onKeyDownCapture handler for the element around an answer input: Enter and Shift+Enter in text fields.
 * Widgets marked data-answer-enter="self" and elements that are not inputs (buttons) keep their own handling.
 */
export function handleAnswerKeyDown(e: KeyboardEvent<HTMLElement>, submit: () => void): void {
  if (e.key !== 'Enter' || e.altKey || e.ctrlKey || e.metaKey || e.nativeEvent.isComposing) return;
  const target = e.target as HTMLElement;
  const field = fieldOf(target);
  if (field?.dataset.answerEnter === 'self') return;
  if (!field && !(target instanceof HTMLInputElement)) return;
  e.preventDefault();
  e.stopPropagation();
  if (e.shiftKey) {
    if (field) {
      const prev = previousField(answerFields(e.currentTarget), field);
      if (prev) focusField(prev);
    }
    return;
  }
  advanceOrSubmit(e.currentTarget, target, submit);
}
