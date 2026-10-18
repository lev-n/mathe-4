/**
 * Ordering by tapping (no dragging, WCAG 2.5.7): tap the items in sequence; the built order is shown
 * with < or > between the items. Tapping a chosen item takes it out again; 'Zurücksetzen' clears all.
 * Keyboard: Tab/arrow keys move between items, Space/Enter toggles, Enter submits once all are placed.
 */
import { useRef, type KeyboardEvent } from 'react';
import { toSpeech } from '../../core/format';
import type { AnswerOf } from '../../core/types';
import type { AnswerInputProps } from './types';
import { FieldMark, type MarkState } from './NumberInput';
import './OrderInput.css';

export default function OrderInput({
  answer,
  response,
  onChange,
  onSubmit,
  disabled,
  result,
  reveal,
  idBase,
  print,
  describedBy,
}: AnswerInputProps<AnswerOf<'order'>>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const asc = answer.direction === 'aufsteigend';
  const sign = asc ? '<' : '>';
  const dirId = `${idBase}-order-dir`;
  const seqId = `${idBase}-order-seq`;
  const instruction = asc
    ? 'Tippe der Reihe nach an: zuerst das Kleinste, zuletzt das Größte.'
    : 'Tippe der Reihe nach an: zuerst das Größte, zuletzt das Kleinste.';

  if (print) {
    return (
      <div className="ans-order ans-order--print">
        {/* One boxed chip per item: a plain space between numbers looks like the digit-group space inside them. */}
        <ul className="ans-order__items ans-order__print-items">
          {answer.items.map((item, i) => (
            <li key={i} className="ans-order__print-item">
              {item}
            </li>
          ))}
        </ul>
        <p className="ans-order__print-seq">
          {answer.items.map((_, i) => (
            <span key={i}>
              {i > 0 && <span className="ans-order__sign"> {sign} </span>}
              <span className="print-box print-box--sm" aria-hidden="true" />
            </span>
          ))}
        </p>
      </div>
    );
  }

  const built = response?.kind === 'order' ? response.order : [];
  const order = reveal ? answer.correct : built;
  const locked = disabled || reveal;
  const complete = order.length === answer.items.length;
  const checked = result && !result.invalid ? result : null;
  let seqMark: MarkState = null;
  if (reveal) seqMark = 'solution';
  else if (checked) seqMark = checked.correct ? 'right' : 'wrong';

  const toggle = (i: number) => {
    if (locked) return;
    const pos = built.indexOf(i);
    const next = pos >= 0 ? built.filter((x) => x !== i) : [...built, i];
    onChange({ kind: 'order', order: next });
  };

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const n = answer.items.length;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      refs.current[(i + 1) % n]?.focus();
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      refs.current[(i - 1 + n) % n]?.focus();
    } else if (e.key === 'Enter' && complete && !locked) {
      e.preventDefault();
      onSubmit();
    }
  };

  const spokenSeq = order.map((i) => toSpeech(answer.items[i])).join(', dann ');

  return (
    <div className="ans-order">
      <p className="ans-order__dir" id={dirId}>
        {instruction}
      </p>
      <div className="ans-order__items" role="group" aria-labelledby={dirId} aria-describedby={describedBy}>
        {answer.items.map((item, i) => {
          const pos = order.indexOf(i);
          const chosen = pos >= 0;
          return (
            <button
              key={i}
              ref={(el) => {
                refs.current[i] = el;
              }}
              type="button"
              className={`ans-order__item${chosen ? ' is-chosen' : ''}`}
              aria-pressed={chosen}
              aria-label={`${toSpeech(item)}${chosen ? `, Platz ${pos + 1}` : ''}`}
              aria-disabled={locked || undefined}
              // the first item is the answer field (fieldNav.ts); Enter is handled here (toggle, then Prüfen)
              data-answer-field={i === 0 ? '' : undefined}
              data-answer-enter={i === 0 ? 'self' : undefined}
              data-answer-empty={i === 0 ? String(order.length === 0) : undefined}
              data-answer-wrong={i === 0 && seqMark === 'wrong' ? '' : undefined}
              onClick={() => toggle(i)}
              onKeyDown={(e) => onKeyDown(e, i)}
            >
              <span className="ans-order__pos" aria-hidden="true">
                {chosen ? `${pos + 1}.` : ''}
              </span>
              <span className="ans-order__text">{item}</span>
            </button>
          );
        })}
      </div>

      <div className={`ans-order__seq${seqMark === 'wrong' ? ' is-wrong' : ''}${seqMark === 'right' || seqMark === 'solution' ? ' is-right' : ''}`}>
        <span className="ans-order__seq-label" id={seqId}>
          {reveal ? 'Richtige Reihenfolge:' : 'Deine Reihenfolge:'}
        </span>
        <span className="visually-hidden">{order.length > 0 ? spokenSeq : 'noch leer'}</span>
        <span className="ans-order__chips" aria-hidden="true">
          {answer.items.map((_, k) => (
            <span key={k} className="ans-order__slot-wrap">
              {k > 0 && <span className="ans-order__sign">{sign}</span>}
              {k < order.length ? (
                <span className="ans-order__chip">{answer.items[order[k]]}</span>
              ) : (
                <span className="ans-order__chip ans-order__chip--empty" />
              )}
            </span>
          ))}
        </span>
        <FieldMark state={seqMark} />
      </div>

      {!locked && (
        <div className="ans-order__actions">
          <button
            type="button"
            className="btn"
            disabled={built.length === 0}
            onClick={() => {
              onChange({ kind: 'order', order: [] });
              // the button disables itself: keep focus in the task instead of losing it to <body>
              refs.current[0]?.focus();
            }}
          >
            Zurücksetzen
          </button>
        </div>
      )}
    </div>
  );
}
