/**
 * Several inline number fields with text in between, e.g. '3,45 € =' [3] '€' [45] 'ct'.
 * Each field is marked individually from result.fieldCorrect (colour + icon).
 */
import type { ReactNode } from 'react';
import { toSpeech } from '../../core/format';
import type { AnswerOf, MultiField } from '../../core/types';
import { describedByIds, type AnswerInputProps } from './types';
import { FieldMark, answerText, inputModeFor, type MarkState } from './NumberInput';
import './NumberInput.css';

/** A field followed by ':' and the next field form a clock time (hours : minutes). */
function isTimeStart(fields: readonly MultiField[], i: number): boolean {
  return fields[i].after === ':' && i + 1 < fields.length;
}

function isMinutes(fields: readonly MultiField[], i: number): boolean {
  return i > 0 && isTimeStart(fields, i - 1);
}

/** Indices of fields that are shown together without a line break (a clock time 'h : mm Uhr'). */
export function fieldGroups(fields: readonly MultiField[]): number[][] {
  const groups: number[][] = [];
  fields.forEach((_, i) => {
    if (isMinutes(fields, i)) groups[groups.length - 1].push(i);
    else groups.push([i]);
  });
  return groups;
}

function fieldLabel(fields: readonly MultiField[], index: number): string {
  const field = fields[index];
  const count = fields.length;
  if (field.label) return field.label;
  if (isTimeStart(fields, index)) return toSpeech([field.before, 'Stunden'].filter(Boolean).join(' '));
  if (isMinutes(fields, index)) return 'Minuten';
  const parts = [field.before, 'Lücke', field.after].filter(Boolean).join(' ');
  if (field.before || field.after) return toSpeech(parts);
  return count > 1 ? `Feld ${index + 1}` : 'Deine Antwort';
}

export default function MultiInput({
  answer,
  response,
  onChange,
  disabled,
  result,
  reveal,
  idBase,
  keypad,
  print,
  describedBy,
}: AnswerInputProps<AnswerOf<'multi'>>) {
  const values = response?.kind === 'multi' ? response.values : {};
  const groupId = `${idBase}-multi-label`;
  const groups = fieldGroups(answer.fields);
  const isTime = (g: number[]) => g.length > 1;
  const wrap = (g: number[], render: (i: number) => ReactNode) =>
    isTime(g) ? (
      <span key={answer.fields[g[0]].id} className="ans-multi__group ans-multi__group--time">
        {g.map(render)}
      </span>
    ) : (
      render(g[0])
    );

  if (print) {
    return (
      <div className="ans-multi ans-multi--print">
        <div className="ans-multi__row">
          {groups.map((g) =>
            wrap(g, (i) => {
              const f = answer.fields[i];
              return (
                <span key={f.id} className="ans-multi__field">
                  {f.before && <span>{f.before}</span>}
                  <span className="print-box print-box--sm" aria-hidden="true" />
                  {f.after && <span>{f.after}</span>}
                </span>
              );
            }),
          )}
        </div>
      </div>
    );
  }

  const checked = result && !result.invalid ? result : null;
  const readOnly = disabled || reveal;

  return (
    <div className="ans-multi" role="group" aria-labelledby={groupId}>
      <span className="ans-label" id={groupId}>
        {answer.fields.length > 1 ? 'Fülle alle Felder aus.' : 'Deine Antwort'}
      </span>
      <div className="ans-multi__row">
        {groups.map((g) => wrap(g, (i) => {
          const f = answer.fields[i];
          const inputId = `${idBase}-multi-${f.id}`;
          const markId = `${inputId}-mark`;
          let mark: MarkState = null;
          if (reveal) mark = 'solution';
          else if (checked?.fieldCorrect && f.id in checked.fieldCorrect) mark = checked.fieldCorrect[f.id] ? 'right' : 'wrong';
          else if (checked?.correct) mark = 'right';
          const solution = isMinutes(answer.fields, i) ? String(f.value).padStart(2, '0') : answerText(f.value, f.decimals);
          const text = reveal ? solution : (values[f.id] ?? '');
          // The solution label is shown once, after the last field.
          const shownMark: MarkState = mark === 'solution' && i < answer.fields.length - 1 ? null : mark;
          return (
            <span key={f.id} className="ans-multi__field">
              {f.before && (
                <span className="ans-number__text" aria-hidden="true">
                  {f.before}
                </span>
              )}
              <input
                id={inputId}
                type="text"
                className={`num-input ans-multi__input${f.decimals ? ' ans-multi__input--wide' : ''}${isTime(g) ? ' ans-multi__input--time' : ''}${mark === 'wrong' ? ' is-wrong' : ''}${mark === 'right' || mark === 'solution' ? ' is-right' : ''}`}
                inputMode={inputModeFor(keypad, f.decimals)}
                enterKeyHint={i === answer.fields.length - 1 ? 'done' : 'next'}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                aria-label={fieldLabel(answer.fields, i)}
                aria-invalid={mark === 'wrong' || undefined}
                aria-describedby={describedByIds(describedBy, shownMark && markId)}
                data-answer-field=""
                data-answer-wrong={mark === 'wrong' ? '' : undefined}
                aria-readonly={readOnly || undefined}
                readOnly={readOnly}
                value={text}
                onChange={(e) => onChange({ kind: 'multi', values: { ...values, [f.id]: e.target.value } })}
              />
              {f.after && (
                <span className="ans-number__text" aria-hidden="true">
                  {f.after}
                </span>
              )}
              <FieldMark state={shownMark} id={markId} />
            </span>
          );
        }))}
      </div>
    </div>
  );
}
