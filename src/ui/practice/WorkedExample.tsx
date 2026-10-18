/**
 * 'So geht's': a freshly generated exercise with its complete worked solution (docs/research.md L6).
 * Shown inline (never as a pop-up): before the first item of a new Stufe, after two items in a row that
 * needed the solution, or whenever the child opens it from the header.
 */
import type { MouseEvent, Ref } from 'react';
import { correctResponse } from '../../core/check';
import type { Exercise, Step } from '../../core/types';
import AnswerInput from '../answers/AnswerInput';
import VisualView from '../visuals/Visual';
import { SOLUTION_PREFIX, solutionText } from './phrases';

/** Worked solution steps: strings or text with a visual. */
export function StepList({ steps }: { steps: readonly Step[] }) {
  return (
    <ol className="pr-steps">
      {steps.map((step, i) => {
        const text = typeof step === 'string' ? step : step.text;
        const visual = typeof step === 'string' ? undefined : step.visual;
        return (
          <li key={i} className="pr-steps__step">
            <span className="pr-steps__text">{text}</span>
            {visual && (
              <div className="visual-wrap pr-steps__visual">
                <VisualView visual={visual} />
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}

/** Answer kinds whose solution is best shown in their own (read-only) input. */
const SHOW_SOLVED_INPUT = new Set(['written', 'cells', 'numberline']);

/**
 * The solved answer input is only a fallback for steps without a picture: generators normally end the steps
 * with the finished calculation / drawing / number line, and a second copy would only repeat it.
 */
export function showsSolvedInput(ex: Exercise): boolean {
  return SHOW_SOLVED_INPUT.has(ex.answer.kind) && !ex.steps.some((step) => typeof step !== 'string' && step.visual);
}

export interface WorkedExampleProps {
  id: string;
  exercise: Exercise;
  /** Intro line, e.g. 'Hier siehst du an einem Beispiel, wie es geht.' */
  intro?: string;
  doneLabel: string;
  onDone: (e: MouseEvent<HTMLButtonElement>) => void;
  /** Primary button (intro) vs. secondary close button (opened from the header). */
  primary?: boolean;
  ref?: Ref<HTMLElement>;
}

export default function WorkedExample({ id, exercise: ex, intro, doneLabel, onDone, primary = false, ref }: WorkedExampleProps) {
  const headingId = `${id}-heading`;
  return (
    <section id={id} ref={ref} tabIndex={-1} className="pr-example card" aria-labelledby={headingId}>
      <h2 className="pr-example__heading" id={headingId}>
        So geht&apos;s
      </h2>
      {intro && <p className="pr-example__intro">{intro}</p>}
      <div className="pr-example__task">
        <p className="pr-example__label">Beispiel</p>
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
        <p className="pr-prompt">{ex.prompt}</p>
        {ex.expression && (
          <p className="pr-expression pr-expression--sm" aria-hidden="true">
            {ex.expression}
          </p>
        )}
        <p className="visually-hidden">{ex.srText}</p>
        {ex.visual && (
          <div className="visual-wrap">
            <VisualView visual={ex.visual} />
          </div>
        )}
      </div>
      <h3 className="pr-example__subheading">So rechnest du:</h3>
      <StepList steps={ex.steps} />
      {showsSolvedInput(ex) && (
        // A static picture of the solution: no tab stops, no input instructions (the text below says it).
        <div className="pr-example__solved" inert aria-hidden="true">
          <AnswerInput
            answer={ex.answer}
            response={correctResponse(ex.answer)}
            onChange={() => {}}
            onSubmit={() => {}}
            disabled
            result={null}
            reveal
            idBase={`${id}-solved`}
            keypad={false}
          />
        </div>
      )}
      <p className="pr-solution">
        <strong>{SOLUTION_PREFIX}</strong>
        {solutionText(ex.answer)}
      </p>
      <div className="pr-actions no-print">
        <button type="button" className={`btn btn--lg${primary ? ' btn--primary' : ''}`} onClick={onDone}>
          {doneLabel}
        </button>
      </div>
    </section>
  );
}
