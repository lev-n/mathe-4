/**
 * Success-framed round summary (docs/research.md §6.1 step 6, M15): counts instead of stars for the round,
 * stars only for the mastery state of a Stufe, what the child improved compared with their own earlier answers
 * (M16, largest first), newly earned badges revealed calmly, and two equally weighted buttons. No autoplay into
 * the next round. This is the only place where badges and improvements appear after a round (never mid-round).
 */
import type { MouseEvent, Ref } from 'react';
import type { Stufe } from '../../core/types';
import type { BadgeDef, MasteryState } from '../../state/types';
import { MASTERY_STARS } from '../../state/selectors';
import { MASTERY_LABEL } from '../app/labels';
import { IMPROVED_HEADING } from './growthText';
import { stufeLabel, summaryText } from './phrases';

export interface MasteryLine {
  key: string;
  title: string;
  stufe: Stufe;
  state: MasteryState;
  /** Reached 'sicher' or 'gemeistert' during this round. */
  levelUp: boolean;
}

/** A line of "Das hast du verbessert" (text from growthText.noteText). */
export interface SummaryNote {
  key: string;
  text: string;
  /** What a screen reader reads instead, when the text uses symbols ('3 · 7' → '3 mal 7'). */
  spoken?: string;
  /** Kinds 3–5 (error overcome, skill improved, lasting improvement). */
  big: boolean;
}

/** "Das hast du verbessert": shown after practice only (round summary, goodbye after a break), never mid-round. */
export function ImprovedNotes({ notes }: { notes: readonly SummaryNote[] }) {
  if (notes.length === 0) return null;
  return (
    <div className="pr-improved">
      <h3 className="pr-improved__title">{IMPROVED_HEADING}</h3>
      <ul className="pr-improved__list">
        {notes.map((n) => (
          <li key={n.key} className={`pr-improved__line${n.big ? ' is-big' : ''}`}>
            {n.spoken ? (
              <>
                <span aria-hidden="true">{n.text}</span>
                <span className="visually-hidden">{n.spoken}</span>
              </>
            ) : (
              n.text
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Newly earned badges, revealed calmly after practice. */
export function NewBadges({ badges }: { badges: readonly BadgeDef[] }) {
  if (badges.length === 0) return null;
  return (
    <div className="pr-badges">
      <h3 className="pr-badges__title">{badges.length === 1 ? 'Neues Abzeichen' : 'Neue Abzeichen'}</h3>
      <ul className="pr-badges__list">
        {badges.map((b) => (
          <li key={b.id} className="pr-badge">
            <span className="pr-badge__icon" aria-hidden="true">
              {b.icon}
            </span>
            <span className="pr-badge__text">
              <strong>{b.title}</strong>
              <span>{b.description}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export interface RoundSummaryProps {
  solved: number;
  answered: number;
  mastery: MasteryLine[];
  notes?: SummaryNote[];
  badges: BadgeDef[];
  nextStufe: Stufe | null;
  onAgain: () => void;
  onDone: () => void;
  onNextStufe: () => void;
  guard: (e: { detail: number }) => boolean;
  headingRef?: Ref<HTMLHeadingElement>;
}

export function Stars({ state }: { state: MasteryState }) {
  const n = MASTERY_STARS[state];
  return (
    <span className="pr-stars" role="img" aria-label={`${n} von 3 Sternen`}>
      {[0, 1, 2].map((i) => (
        <svg key={i} viewBox="0 0 24 24" width="28" height="28" aria-hidden="true" focusable="false" className={i < n ? 'pr-star is-on' : 'pr-star'}>
          <path d="M12 2.8l2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.2l-5.6 3 1.1-6.3L2.9 9.5l6.3-.9z" strokeWidth="1.8" strokeLinejoin="round" />
        </svg>
      ))}
    </span>
  );
}

export default function RoundSummary({
  solved,
  answered,
  mastery,
  notes = [],
  badges,
  nextStufe,
  onAgain,
  onDone,
  onNextStufe,
  guard,
  headingRef,
}: RoundSummaryProps) {
  const act = (fn: () => void) => (e: MouseEvent) => {
    if (guard(e)) return;
    fn();
  };
  return (
    <section className="pr-summary card" aria-labelledby="pr-summary-h">
      <h2 className="pr-summary__title" id="pr-summary-h" tabIndex={-1} ref={headingRef}>
        Runde geschafft
      </h2>
      <p className="pr-summary__count">{summaryText(solved, answered)}</p>

      {mastery.length > 0 && (
        <ul className="pr-mastery">
          {mastery.map((m) => (
            <li key={m.key} className={`pr-mastery__line${m.levelUp ? ' is-up' : ''}`}>
              <span className="pr-mastery__name">
                {m.title} <span className="pr-mastery__stufe">{stufeLabel(m.stufe)}</span>
              </span>
              <Stars state={m.state} />
              <span className="pr-mastery__word">{MASTERY_LABEL[m.state]}</span>
              {m.levelUp && <span className="pr-mastery__new">Neu erreicht!</span>}
            </li>
          ))}
        </ul>
      )}

      <ImprovedNotes notes={notes} />
      <NewBadges badges={badges} />

      <div className="pr-pair no-print">
        <button type="button" className="btn btn--lg" onClick={act(onAgain)}>
          Noch eine Runde
        </button>
        <button type="button" className="btn btn--lg" onClick={act(onDone)}>
          Fertig für heute
        </button>
      </div>
      {nextStufe && (
        <div className="pr-summary__next no-print">
          <p>Du hast viele Aufgaben auf Anhieb gelöst.</p>
          <button type="button" className="btn btn--lg" onClick={act(onNextStufe)}>
            {stufeLabel(nextStufe)} ausprobieren
          </button>
        </div>
      )}
    </section>
  );
}
