/**
 * Single number answer: optional Antwortsatz text before/after, unit, decimal comma, and the optional
 * 'Nicht lösbar – es fehlt eine Angabe' toggle for Denk-Aufgaben (docs/research.md L15, P13).
 */
import { fmt } from '../../core/format';
import type { AnswerOf } from '../../core/types';
import type { KeyboardEvent } from 'react';
import { describedByIds, type AnswerInputProps } from './types';
import './NumberInput.css';

export type MarkState = 'right' | 'wrong' | 'solution' | null;

/** Icon + text marker next to a field: never colour alone. */
export function FieldMark({ state, id }: { state: MarkState; id?: string }) {
  if (!state) return null;
  if (state === 'wrong') {
    return (
      <span className="field-mark field-mark--wrong" id={id}>
        <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false">
          <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2.5" />
          <path d="M12 6.5v7" stroke="currentColor" strokeWidth="2.75" strokeLinecap="round" />
          <circle cx="12" cy="17.3" r="1.6" fill="currentColor" />
        </svg>
        <span className="visually-hidden">noch nicht richtig</span>
      </span>
    );
  }
  return (
    <span className={`field-mark field-mark--${state}`} id={id}>
      <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false">
        <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2.5" />
        <path d="M7 12.5l3.2 3.2L17 8.8" fill="none" stroke="currentColor" strokeWidth="2.75" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {state === 'solution' ? <span className="field-mark__text">Lösung</span> : <span className="visually-hidden">richtig</span>}
    </span>
  );
}

/** Text of a number in the answer field (decimal comma, German grouping). */
export function answerText(value: number, decimals?: number): string {
  return fmt(value, decimals && !Number.isInteger(value) ? decimals : undefined);
}

export function inputModeFor(keypad: boolean, decimals: number | undefined): 'none' | 'decimal' | 'numeric' {
  if (keypad) return 'none';
  return decimals && decimals > 0 ? 'decimal' : 'numeric';
}

export default function NumberInput({
  answer,
  response,
  onChange,
  onSubmit,
  disabled,
  result,
  reveal,
  idBase,
  keypad,
  print,
  describedBy,
}: AnswerInputProps<AnswerOf<'number'>>) {
  const inputId = `${idBase}-num`;
  const labelId = `${idBase}-num-label`;
  const unitId = `${idBase}-num-unit`;
  const markId = `${idBase}-num-mark`;
  const current = response?.kind === 'number' ? response : { kind: 'number' as const, text: '', unsolvable: false };
  const unsolvable = !!current.unsolvable;

  if (print) {
    return (
      <div className="ans-number ans-number--print">
        {answer.label && !answer.before && <span className="ans-label">{answer.label}</span>}
        <div className="ans-number__row">
          {answer.before && <span className="ans-number__text">{answer.before}</span>}
          <span className="print-box" aria-hidden="true" />
          {answer.unit && <span className="ans-number__unit">{answer.unit}</span>}
          {answer.after && <span className="ans-number__text">{answer.after}</span>}
        </div>
        {answer.offerUnsolvable && <span className="ans-number__print-option">○ Nicht lösbar – es fehlt eine Angabe</span>}
      </div>
    );
  }

  const checked = result && !result.invalid ? result : null;
  let inputMark: MarkState = null;
  let buttonMark: MarkState = null;
  if (reveal) {
    if (answer.value === null) buttonMark = 'solution';
    else inputMark = 'solution';
  } else if (checked) {
    const state: MarkState = checked.correct ? 'right' : 'wrong';
    if (unsolvable) buttonMark = state;
    else inputMark = state;
  }

  const text = reveal ? (answer.value === null ? '' : answerText(answer.value, answer.decimals)) : current.text;
  const pressed = reveal ? answer.value === null : unsolvable;
  const readOnly = disabled || reveal;

  // A wrongly pressed 'Nicht lösbar' is fixed by typing a number: the field is the place to go back to.
  const wrong = inputMark === 'wrong' || buttonMark === 'wrong';
  const visibleLabel = answer.label ?? (answer.before ? null : 'Deine Antwort');

  return (
    <div className="ans-number">
      {visibleLabel && (
        <label className="ans-label" htmlFor={inputId} id={labelId}>
          {visibleLabel}
        </label>
      )}
      <div className="ans-number__row">
        {answer.before &&
          (visibleLabel ? (
            <span className="ans-number__text">{answer.before}</span>
          ) : (
            <label className="ans-number__text" htmlFor={inputId} id={labelId}>
              {answer.before}
            </label>
          ))}
        <input
          id={inputId}
          type="text"
          className={`num-input ans-number__input${inputMark === 'wrong' ? ' is-wrong' : ''}${inputMark === 'right' || inputMark === 'solution' ? ' is-right' : ''}${unsolvable && !reveal ? ' is-muted' : ''}`}
          inputMode={inputModeFor(keypad, answer.decimals)}
          enterKeyHint="done"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          value={text}
          readOnly={readOnly}
          aria-readonly={readOnly || undefined}
          aria-invalid={inputMark === 'wrong' || undefined}
          aria-describedby={describedByIds(describedBy, (answer.unit || answer.after) && unitId, inputMark && markId)}
          data-answer-field=""
          data-answer-empty={current.text.trim() === '' && !unsolvable ? 'true' : 'false'}
          data-answer-wrong={wrong ? '' : undefined}
          onChange={(e) => onChange({ kind: 'number', text: e.target.value, unsolvable: false })}
        />
        {(answer.unit || answer.after) && (
          <span className="ans-number__text" id={unitId}>
            {[answer.unit, answer.after].filter(Boolean).join(' ')}
          </span>
        )}
        <FieldMark state={inputMark} id={markId} />
      </div>
      {answer.offerUnsolvable && (
        <div className="ans-number__unsolvable">
          <button
            type="button"
            className={`btn ans-unsolvable${pressed ? ' is-pressed' : ''}`}
            aria-pressed={pressed}
            disabled={readOnly}
            onClick={() => onChange({ kind: 'number', text: '', unsolvable: !unsolvable })}
            // Enter means "Prüfen" everywhere: it switches the choice on, and once it is on it checks
            // (it never silently switches the choice off again; Space toggles).
            onKeyDown={(e: KeyboardEvent<HTMLButtonElement>) => {
              if (e.key !== 'Enter' || e.repeat) return;
              e.preventDefault();
              if (readOnly) return;
              if (unsolvable) onSubmit();
              else onChange({ kind: 'number', text: '', unsolvable: true });
            }}
          >
            <span className="ans-unsolvable__box" aria-hidden="true">
              {pressed ? '✓' : ''}
            </span>
            Nicht lösbar – es fehlt eine Angabe
          </button>
          <FieldMark state={buttonMark} />
        </div>
      )}
    </div>
  );
}
