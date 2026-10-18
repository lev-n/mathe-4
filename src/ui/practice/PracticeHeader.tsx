/**
 * Header of the practice page: topic colour accent, skill title + Stufe, progress (text + dots, no timer),
 * an optional 'So geht's' toggle and the always-visible 'Beenden' button (one tap, no confirmation).
 */
import type { Ref } from 'react';
import type { TopicId } from '../../core/types';

export interface PracticeHeaderProps {
  topicId: TopicId | null;
  kicker?: string;
  title: string;
  /** 'Stufe 2' etc. */
  stufeText?: string;
  progress?: { current: number; total: number };
  /** 'So geht's' toggle (omit to hide). */
  example?: { open: boolean; controls: string; onToggle: () => void; disabled?: boolean; ref?: Ref<HTMLButtonElement> };
  onExit: () => void;
  /** The page heading (focus target after the round has loaded). */
  headingRef?: Ref<HTMLHeadingElement>;
}

export function accentClass(topicId: TopicId | null): string {
  return topicId ? `accent-${topicId}` : 'accent-none';
}

export default function PracticeHeader({ topicId, kicker, title, stufeText, progress, example, onExit, headingRef }: PracticeHeaderProps) {
  return (
    <header className={`pr-header ${accentClass(topicId)}`}>
      <div className="pr-header__top">
        <div className="pr-header__titles">
          {kicker && <span className="pr-header__kicker">{kicker}</span>}
          <h1 className="pr-header__title" tabIndex={-1} ref={headingRef}>
            {title}
            {stufeText && <span className="pr-header__stufe">{stufeText}</span>}
          </h1>
        </div>
        <div className="pr-header__buttons no-print">
          {example && (
            <button
              type="button"
              ref={example.ref}
              className={`btn pr-header__example${example.open ? ' is-open' : ''}`}
              aria-expanded={example.open}
              aria-controls={example.controls}
              disabled={example.disabled}
              onClick={example.onToggle}
            >
              <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false">
                <path d="M4 5.5h6.5a2 2 0 0 1 2 2V19a1.6 1.6 0 0 0-1.6-1.6H4z M20 5.5h-6.5a2 2 0 0 0-2 2V19a1.6 1.6 0 0 1 1.6-1.6H20z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
              </svg>
              So geht&apos;s
            </button>
          )}
          <button type="button" className="btn pr-header__exit" onClick={onExit}>
            Beenden
          </button>
        </div>
      </div>
      {progress && progress.total > 0 && (
        <div className="pr-progress">
          <span className="pr-progress__text">
            Aufgabe {Math.min(progress.current, progress.total)} von {progress.total}
          </span>
          <ol className="pr-dots" aria-hidden="true">
            {Array.from({ length: progress.total }, (_, i) => (
              <li
                key={i}
                className={`pr-dot${i < progress.current - 1 ? ' is-done' : ''}${i === progress.current - 1 ? ' is-current' : ''}`}
              />
            ))}
          </ol>
        </div>
      )}
    </header>
  );
}
