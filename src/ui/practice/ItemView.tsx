/**
 * One practice item: Sachaufgabe context, prompt, large expression, visual, answer input, hints and the
 * feedback panels of the attempt state machine (see session.ts).
 */
import { useRef, type KeyboardEvent, type MouseEvent, type Ref } from 'react';
import { isEmptyResponse } from '../../core/check';
import type { Answer, CheckResult, Exercise, Response } from '../../core/types';
import AnswerInput from '../answers/AnswerInput';
import { advanceOrSubmit } from '../answers/fieldNav';
import Keypad from '../keypad/Keypad';
import VisualView from '../visuals/Visual';
import {
  CORRECT_HEADING,
  RETRY_HEADING,
  SOLUTION_HEADING,
  SOLUTION_PREFIX,
  TWIN_LABEL,
  TWIN_NOTE,
  solutionText,
  streakText,
} from './phrases';
import { isFinished, type ItemState } from './session';
import { StepList } from './WorkedExample';

export interface ItemViewProps {
  exercise: Exercise;
  item: ItemState;
  isTwin: boolean;
  /** 'Aufgabe 3 von 10' (heading of the item region). */
  heading: string;
  response: Response | null;
  /** Result used for marking fields (null once the child changed the answer after a check). */
  markResult: CheckResult | null;
  onChange: (r: Response) => void;
  onCheck: () => void;
  onHint: () => void;
  onNext: (e: MouseEvent<HTMLButtonElement>) => void;
  /** Extra praise line(s) after 'Richtig!'. */
  praise: string[];
  streakNote: number | null;
  normalising: string | null;
  keypad: boolean;
  /** The 'So geht's' example is open above the task: the Ziffernblock must not type into the hidden field. */
  exampleOpen?: boolean;
  guard: (e: { detail: number }) => boolean;
  sectionRef?: Ref<HTMLElement>;
  nextRef?: Ref<HTMLButtonElement>;
  /** Slot unique id (for element ids). */
  uid: string;
}

const KEYPAD_KINDS = new Set(['number', 'multi', 'written']);

function wantsComma(ex: Exercise): boolean {
  const a = ex.answer;
  if (a.kind === 'number') return (a.decimals ?? 0) > 0;
  if (a.kind === 'multi') return a.fields.some((f) => (f.decimals ?? 0) > 0);
  return false;
}

/**
 * A number field whose label repeats the prompt word for word (Sachaufgaben with an Antwortsatz) shows the
 * question twice: drop the label, the Antwortsatz text (or 'Deine Antwort') labels the field instead.
 */
export function withoutRepeatedLabel(answer: Answer, prompt: string): Answer {
  if (answer.kind !== 'number' || !answer.label || answer.label.trim() !== prompt.trim()) return answer;
  const rest = { ...answer };
  delete rest.label;
  return rest;
}

function CheckIcon() {
  return (
    <svg className="pr-check" viewBox="0 0 48 48" width="44" height="44" aria-hidden="true" focusable="false">
      <circle className="pr-check__circle" cx="24" cy="24" r="21" fill="none" stroke="currentColor" strokeWidth="4" />
      <path className="pr-check__tick" d="M14 25l7 7 13-15" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function RetryIcon() {
  return (
    <svg viewBox="0 0 48 48" width="40" height="40" aria-hidden="true" focusable="false" className="pr-feedback__icon">
      <path d="M36 16a14 14 0 1 0 2.5 11" fill="none" stroke="currentColor" strokeWidth="4.5" strokeLinecap="round" />
      <path d="M38 6v11H27" fill="none" stroke="currentColor" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function LookIcon() {
  return (
    <svg viewBox="0 0 48 48" width="40" height="40" aria-hidden="true" focusable="false" className="pr-feedback__icon">
      <path d="M6 10h15a4 4 0 0 1 4 4v26a3 3 0 0 0-3-3H6z M42 10H27a4 4 0 0 0-4 4v26a3 3 0 0 1 3-3h16z" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinejoin="round" />
    </svg>
  );
}

function HintIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false">
      <path d="M12 3a6 6 0 0 0-3.6 10.8c.7.5 1.1 1.3 1.1 2.2V17h5v-1c0-.9.4-1.7 1.1-2.2A6 6 0 0 0 12 3z M9.5 20h5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function ItemView(props: ItemViewProps) {
  const {
    exercise: ex,
    item,
    isTwin,
    heading,
    response,
    markResult,
    onChange,
    onCheck,
    onHint,
    onNext,
    praise,
    streakNote,
    normalising,
    keypad,
    exampleOpen = false,
    guard,
    sectionRef,
    nextRef,
    uid,
  } = props;
  const answerRef = useRef<HTMLDivElement>(null);
  const finished = isFinished(item.phase);
  const empty = isEmptyResponse(response);
  const idBase = `pr-${uid}`;
  const headingId = `${idBase}-heading`;
  const srId = `${idBase}-sr`;
  const promptId = `${idBase}-prompt`;
  const showKeypad = keypad && KEYPAD_KINDS.has(ex.answer.kind);
  const allHintsShown = item.hintsShown >= ex.hints.length;
  // Hints listed in the hint panel (the automatic hint after a 1st wrong attempt sits in the feedback panel).
  const listedHints = ex.hints.slice(0, item.hintsShown).map((h, i) => ({ h, i })).filter(({ i }) => !(item.phase === 'retry' && i === item.autoHint));

  const submit = () => {
    if (finished || empty) return;
    onCheck();
  };

  const onCheckClick = (e: MouseEvent<HTMLButtonElement>) => {
    if (guard(e)) return;
    submit();
  };

  const onNextClick = (e: MouseEvent<HTMLButtonElement>) => {
    if (guard(e)) return;
    onNext(e);
  };

  // A held-down Enter key must not skip through feedback screens.
  const blockRepeat = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.repeat) e.preventDefault();
  };

  const retryHint = item.phase === 'retry' ? (item.result?.bugHint ?? (item.autoHint !== null ? ex.hints[item.autoHint] : null)) : null;
  const hintLabel = (
    <>
      <HintIcon />
      {allHintsShown ? 'Keine weiteren Tipps' : 'Tipp'}
    </>
  );
  // the Ziffernblock key is narrow: a short label keeps the key (and the keypad) from growing
  const keypadHintLabel = (
    <>
      <HintIcon />
      {allHintsShown ? 'Kein Tipp mehr' : 'Tipp'}
    </>
  );

  return (
    <div className={`pr-item-layout${showKeypad ? ' has-keypad' : ''}`}>
      <section
        className="pr-item card"
        ref={sectionRef}
        tabIndex={-1}
        aria-labelledby={headingId}
        aria-describedby={srId}
      >
        <h2 className="visually-hidden" id={headingId}>
          {heading}
        </h2>
        {isTwin && <p className="pr-twin-label">{TWIN_LABEL}</p>}
        {ex.knobel && <p className="pr-knobel-label">Knobelaufgabe</p>}
        {ex.context && (
          <p className="pr-context">
            {ex.emoji && (
              <span className="pr-context__emoji" aria-hidden="true">
                {ex.emoji}
              </span>
            )}
            {ex.context}
          </p>
        )}
        <p className="pr-prompt" id={promptId}>
          {ex.prompt}
        </p>
        {ex.expression && (
          <p className="pr-expression" aria-hidden="true">
            {ex.expression}
          </p>
        )}
        <p className="visually-hidden" id={srId}>
          {ex.srText}
        </p>
        {ex.visual && (
          <div className="visual-wrap pr-visual">
            <VisualView visual={ex.visual} />
          </div>
        )}

        <div className="pr-answer" ref={answerRef}>
          <AnswerInput
            answer={withoutRepeatedLabel(ex.answer, ex.prompt)}
            response={response}
            onChange={onChange}
            onSubmit={submit}
            disabled={finished}
            result={markResult}
            reveal={item.phase === 'revealed'}
            idBase={idBase}
            keypad={showKeypad}
            labelledBy={promptId}
            describedBy={srId}
          />
        </div>

        {item.invalid && !finished && (
          <p className="pr-invalid">
            <span className="pr-invalid__icon" aria-hidden="true">
              i
            </span>
            {item.invalid}
          </p>
        )}

        {!finished && listedHints.length > 0 && (
          <div className="pr-hints">
            {listedHints.map(({ h, i }) => (
              <p key={i} className="pr-hint">
                <HintIcon />
                <span>
                  <strong>Tipp {i + 1}:</strong> {h}
                </span>
              </p>
            ))}
          </div>
        )}

        {item.phase === 'retry' && (
          <div className="pr-feedback pr-feedback--retry">
            <RetryIcon />
            <div className="pr-feedback__body">
              <p className="pr-feedback__title">{RETRY_HEADING}</p>
              {retryHint && <p className="pr-feedback__text">{retryHint}</p>}
            </div>
          </div>
        )}

        {item.phase === 'solved' && (
          <div className="pr-feedback pr-feedback--ok">
            <CheckIcon />
            <div className="pr-feedback__body">
              <p className="pr-feedback__title">{CORRECT_HEADING}</p>
              {praise.map((p, i) => (
                <p key={i} className="pr-feedback__text">
                  {p}
                </p>
              ))}
              {streakNote && <p className="pr-streak">{streakText(streakNote)}</p>}
            </div>
          </div>
        )}

        {item.phase === 'revealed' && (
          <div className="pr-feedback pr-feedback--solution">
            <LookIcon />
            <div className="pr-feedback__body">
              <p className="pr-feedback__title">{SOLUTION_HEADING}</p>
              {normalising && <p className="pr-feedback__text">{normalising}</p>}
              <StepList steps={ex.steps} />
              <p className="pr-solution">
                <strong>{SOLUTION_PREFIX}</strong>
                {solutionText(ex.answer)}
              </p>
              {item.twinInserted && <p className="pr-feedback__text">{TWIN_NOTE}</p>}
            </div>
          </div>
        )}

        {/* With the Ziffernblock, Tipp and Prüfen sit in its last row (one Prüfen, and on phones the task,
            the field and the whole keypad fit on the screen together). */}
        {(finished || !showKeypad) && (
          <div className="pr-actions no-print">
            {finished ? (
              <button type="button" ref={nextRef} className="btn btn--primary btn--lg pr-next" onClick={onNextClick} onKeyDown={blockRepeat}>
                Weiter
              </button>
            ) : (
              <>
                <button
                  type="button"
                  className="btn btn--lg pr-hint-btn"
                  onClick={() => {
                    if (!allHintsShown) onHint();
                  }}
                  aria-disabled={allHintsShown || undefined}
                >
                  {hintLabel}
                </button>
                <button type="button" className="btn btn--primary btn--lg pr-check-btn" disabled={empty} onClick={onCheckClick} onKeyDown={blockRepeat}>
                  Prüfen
                </button>
              </>
            )}
          </div>
        )}
      </section>

      {showKeypad && (
        <div className="pr-keypad">
          <Keypad
            scopeRef={answerRef}
            onSubmit={(field) => advanceOrSubmit(answerRef.current, field, submit)}
            submitDisabled={empty || finished}
            comma={wantsComma(ex)}
            disabled={finished || exampleOpen}
            hint={{
              label: keypadHintLabel,
              unavailable: allHintsShown,
              onClick: (e) => {
                if (!guard(e)) onHint();
              },
            }}
          />
        </div>
      )}
    </div>
  );
}
