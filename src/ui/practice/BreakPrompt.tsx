/**
 * One break suggestion after 20 minutes of continuous practice (docs/research.md "Fair design").
 * Inline, two equal buttons; 'Pause machen' shows a calm pause screen.
 */
import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { BREAK_CONFIRM, BREAK_QUESTION } from './phrases';

export const BREAK_AFTER_MS = 20 * 60 * 1000;

export interface BreakPromptProps {
  onContinue: () => void;
  onExit: () => void;
  guard?: (e: MouseEvent) => boolean;
  /** Live-region announcement (the question, then the pause text). */
  announce?: (text: string) => void;
}

export default function BreakPrompt({ onContinue, onExit, guard, announce }: BreakPromptProps) {
  const [paused, setPaused] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  // Shown after a tap on 'Weiter' / 'Pause machen' (user actions): move focus to the heading and announce it,
  // so keyboard and screen-reader users are not left on <body>.
  useEffect(() => {
    headingRef.current?.focus({ preventScroll: false });
    announce?.(paused ? BREAK_CONFIRM : BREAK_QUESTION);
    // announce is a stable callback from the round; run on mount and when the pause screen opens
  }, [paused]);
  const act = (fn: () => void) => (e: MouseEvent) => {
    if (guard?.(e)) return;
    fn();
  };

  if (paused) {
    return (
      <section className="pr-break card" aria-labelledby="pr-break-h">
        <h2 className="pr-break__text" id="pr-break-h" tabIndex={-1} ref={headingRef}>
          {BREAK_CONFIRM}
        </h2>
        <p>Steh kurz auf, trink etwas oder schau aus dem Fenster. Wenn du magst, übst du danach weiter.</p>
        <div className="pr-pair">
          <button type="button" className="btn btn--lg" onClick={act(onContinue)}>
            Weiter üben
          </button>
          <button type="button" className="btn btn--lg" onClick={act(onExit)}>
            Fertig für heute
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="pr-break card" aria-labelledby="pr-break-q">
      <h2 className="pr-break__text" id="pr-break-q" tabIndex={-1} ref={headingRef}>
        {BREAK_QUESTION}
      </h2>
      <div className="pr-pair">
        <button type="button" className="btn btn--lg" onClick={act(() => setPaused(true))}>
          Pause machen
        </button>
        <button type="button" className="btn btn--lg" onClick={act(onContinue)}>
          Weiter üben
        </button>
      </div>
    </section>
  );
}
