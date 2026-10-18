/**
 * Multiple choice as an ARIA radiogroup (roving tabindex, arrow keys move and select, Space selects,
 * Enter submits the selected option). Options are ≥ 64 px; the selected state is shown by a filled
 * marker and a thicker border, never by colour alone.
 */
import { useRef, type KeyboardEvent } from 'react';
import { toSpeech } from '../../core/format';
import type { AnswerOf, ChoiceOption, Visual } from '../../core/types';
import VisualView from '../visuals/Visual';
import type { AnswerInputProps } from './types';
import { FieldMark, type MarkState } from './NumberInput';
import './ChoiceInput.css';

const SYMBOL_NAMES: Record<string, string> = {
  '<': 'kleiner als',
  '>': 'größer als',
  '=': 'gleich',
  '≈': 'ungefähr gleich',
};

/**
 * Pictures whose labels, ticks or symbols must stay readable (text ≥ 16 px, src/ui/visuals/types.ts):
 * options with them get one option per row at the picture's own size instead of a 3-column grid.
 */
const TEXT_VISUALS = new Set<Visual['type']>(['barChart', 'pictogram', 'tally', 'spinner', 'bag', 'table', 'tree', 'clock', 'money', 'ruler', 'numberLine', 'placeValue', 'written', 'container', 'scale']);

export function hasTextVisual(options: readonly ChoiceOption[]): boolean {
  return options.some((o) => (o.visual ? TEXT_VISUALS.has(o.visual.type) || (o.visual.type === 'net' && !!o.visual.faces) : false));
}

/** Spoken name of an option (only when it differs from the visible text). */
export function optionSpeech(option: ChoiceOption): string | undefined {
  if (option.visual) return undefined;
  const label = option.label.trim();
  if (label in SYMBOL_NAMES) return SYMBOL_NAMES[label];
  const spoken = toSpeech(` ${label} `);
  return spoken !== label ? spoken : undefined;
}

export default function ChoiceInput({
  answer,
  response,
  onChange,
  onSubmit,
  disabled,
  result,
  reveal,
  idBase,
  print,
  labelledBy,
  describedBy,
}: AnswerInputProps<AnswerOf<'choice'>>) {
  const refs = useRef<(HTMLDivElement | null)[]>([]);
  const layout = answer.layout ?? 'list';
  const layoutClass = `ans-choice--${layout}${layout === 'grid' && hasTextVisual(answer.options) ? ' ans-choice--wide' : ''}`;
  const selected = response?.kind === 'choice' ? response.index : -1;
  const n = answer.options.length;
  const labelId = `${idBase}-choice-label`;

  if (print) {
    return (
      <ul className={`ans-choice ${layoutClass} ans-choice--print`}>
        {answer.options.map((opt, i) => (
          <li key={i} className="ans-choice__option">
            <span className="ans-choice__radio" aria-hidden="true" />
            {opt.visual && (
              <span className="ans-choice__visual">
                <VisualView visual={opt.visual} print />
              </span>
            )}
            <span className="ans-choice__label">{opt.label}</span>
          </li>
        ))}
      </ul>
    );
  }

  const locked = disabled || reveal;
  const checked = result && !result.invalid ? result : null;
  const focusIndex = selected >= 0 ? selected : 0;

  const select = (i: number, focus: boolean) => {
    if (locked) return;
    if (i !== selected) onChange({ kind: 'choice', index: i });
    if (focus) refs.current[i]?.focus();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>, i: number) => {
    let target: number | null = null;
    switch (e.key) {
      case 'ArrowDown':
      case 'ArrowRight':
        target = (i + 1) % n;
        break;
      case 'ArrowUp':
      case 'ArrowLeft':
        target = (i - 1 + n) % n;
        break;
      case 'Home':
        target = 0;
        break;
      case 'End':
        target = n - 1;
        break;
      case ' ':
      case 'Spacebar':
        e.preventDefault();
        select(i, false);
        return;
      case 'Enter':
        e.preventDefault();
        if (locked) return;
        if (selected === i) onSubmit();
        else select(i, false);
        return;
      default:
        return;
    }
    e.preventDefault();
    if (locked) {
      refs.current[target]?.focus();
      return;
    }
    select(target, true);
  };

  return (
    <div className="ans-choice-wrap">
      {!labelledBy && (
        <span className="visually-hidden" id={labelId}>
          Antwort auswählen
        </span>
      )}
      <div
        role="radiogroup"
        aria-labelledby={labelledBy ?? labelId}
        aria-describedby={describedBy}
        aria-disabled={locked || undefined}
        className={`ans-choice ${layoutClass}`}
      >
        {answer.options.map((opt, i) => {
          const isSelected = i === selected;
          let mark: MarkState = null;
          if (reveal && i === answer.correct) mark = 'solution';
          else if (checked && isSelected) mark = checked.correct ? 'right' : 'wrong';
          const markId = `${idBase}-choice-${i}-mark`;
          const spoken = optionSpeech(opt);
          return (
            <div
              key={i}
              ref={(el) => {
                refs.current[i] = el;
              }}
              role="radio"
              id={`${idBase}-choice-${i}`}
              aria-checked={isSelected}
              aria-disabled={locked || undefined}
              aria-label={spoken}
              // Without aria-label the mark text is already part of the option's name.
              aria-describedby={mark && spoken ? markId : undefined}
              tabIndex={i === focusIndex ? 0 : -1}
              // the tab stop is the answer field (fieldNav.ts); Enter is handled here (select, then Prüfen)
              data-answer-field={i === focusIndex ? '' : undefined}
              data-answer-enter={i === focusIndex ? 'self' : undefined}
              data-answer-empty={i === focusIndex ? String(selected < 0) : undefined}
              data-answer-wrong={i === focusIndex && mark === 'wrong' ? '' : undefined}
              className={[
                'ans-choice__option',
                isSelected ? 'is-selected' : '',
                mark === 'wrong' ? 'is-wrong' : '',
                mark === 'right' || mark === 'solution' ? 'is-right' : '',
                locked ? 'is-locked' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => select(i, false)}
              onKeyDown={(e) => onKeyDown(e, i)}
            >
              <span className="ans-choice__radio" aria-hidden="true" />
              {opt.visual && (
                <span className="ans-choice__visual">
                  <VisualView visual={opt.visual} />
                </span>
              )}
              <span className="ans-choice__label">{opt.label}</span>
              <FieldMark state={mark} id={markId} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
