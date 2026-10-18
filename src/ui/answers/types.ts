import type { Answer, CheckResult, Response } from '../../core/types';

/**
 * Contract for every answer input component (src/ui/answers/*Input.tsx).
 *
 * - Text inputs are plain <input type="text"> with inputMode = keypad ? 'none' : 'numeric' (or 'decimal'),
 *   never type="number". The on-screen Ziffernblock inserts characters into the focused input by
 *   dispatching native input events, so components just use React onChange.
 * - Enter: AnswerInput handles Enter for every text field (src/ui/answers/fieldNav.ts): it moves to the next
 *   empty field and calls onSubmit() when nothing is left to fill. Components only mark their fields with the
 *   data-answer-* attributes described there; widgets with their own Enter semantics (choice, order, cells,
 *   number line) mark their tab stop with data-answer-enter="self" and call onSubmit() themselves.
 * - Every input has a visible or programmatic German label.
 * - Wrong parts are marked with colour AND an icon/text (never colour only), using result.
 * - Touch targets ≥ 48 px (answer buttons ≥ 64 px).
 */
export interface AnswerInputProps<A extends Answer = Answer> {
  answer: A;
  response: Response | null;
  onChange: (response: Response) => void;
  onSubmit: () => void;
  /** No more changes (solved, or solution shown). */
  disabled: boolean;
  /** Last check result (to mark wrong fields/columns/cells). */
  result: CheckResult | null;
  /** Solution was revealed: show the correct answer read-only. */
  reveal: boolean;
  /** Unique prefix for element ids. */
  idBase: string;
  /** On-screen keypad is active → inputMode 'none'. */
  keypad: boolean;
  /** Worksheet mode: static, empty, printable boxes (no interactivity). */
  print?: boolean;
  /** Id of the visible task prompt; group inputs (e.g. the choice radiogroup) use it as their accessible name. */
  labelledBy?: string;
  /** Id of the spoken task (Exercise.srText): answer fields add it to aria-describedby, so a focused field reads the question. */
  describedBy?: string;
}

/** Join aria-describedby ids, skipping empty ones (undefined when none are left). */
export function describedByIds(...ids: (string | false | null | undefined)[]): string | undefined {
  const out = ids.filter((id): id is string => typeof id === 'string' && id !== '');
  return out.length ? out.join(' ') : undefined;
}
