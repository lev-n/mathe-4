/**
 * Storage opt-in (§ 25 TDDDG, docs/research.md P1): an inline card (not a modal) after the first finished
 * item, with two equally weighted buttons and the note. "Mehr dazu" opens inline (the child stays in the
 * round); the full Datenschutzerklärung for adults opens in a new tab. Nothing is stored before 'Ja, merken'.
 */
import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { store } from '../../state/store';
import { useConsent, useSaveStatus } from '../../state/useProgress';
import { KIDS_PRIVACY } from '../app/kidsPrivacy';
import { PATHS } from '../app/routes';
import { CONSENT_NOTE, CONSENT_QUESTION, SAVE_FAILED_CHILD } from './phrases';

export interface ConsentPromptProps {
  /** Holdover guard: returns true if a click must be ignored. */
  guard?: (e: MouseEvent) => boolean;
}

export default function ConsentPrompt({ guard }: ConsentPromptProps) {
  const consent = useConsent();
  const saveStatus = useSaveStatus();
  const [answered, setAnswered] = useState<'granted' | 'denied' | null>(null);
  const doneRef = useRef<HTMLParagraphElement>(null);
  // The answered button disappears: hand the focus on (to 'Weiter' if the item is finished, else to the
  // confirmation) instead of letting it fall to <body>. Only when the focus was really lost.
  useEffect(() => {
    if (!answered) return;
    const active = document.activeElement;
    if (active && active !== document.body) return;
    const next = document.querySelector<HTMLElement>('.pr-next');
    (next ?? doneRef.current)?.focus({ preventScroll: true });
  }, [answered]);

  if (answered) {
    // Never claim that progress is saved when the browser blocks storage (or it is full).
    const failed = answered === 'granted' && consent === 'granted' && saveStatus === 'failed';
    return (
      <p className="pr-consent pr-consent--done card" role="note" tabIndex={-1} ref={doneRef}>
        {failed
          ? SAVE_FAILED_CHILD
          : answered === 'granted'
            ? 'Alles klar. Ich merke mir deinen Fortschritt auf diesem Gerät.'
            : 'Alles klar. Ich merke mir nichts. Du kannst trotzdem weiter üben.'}
      </p>
    );
  }
  if (consent !== 'unknown') return null;

  const choose = (value: 'granted' | 'denied') => (e: MouseEvent) => {
    if (guard?.(e)) return;
    store.setConsent(value);
    setAnswered(value);
  };

  return (
    <section className="pr-consent card" aria-labelledby="pr-consent-q">
      <p className="pr-consent__question" id="pr-consent-q">
        {CONSENT_QUESTION}
      </p>
      <div className="pr-consent__buttons">
        <button type="button" className="btn btn--lg pr-consent__btn" onClick={choose('granted')}>
          Ja, merken
        </button>
        <button type="button" className="btn btn--lg pr-consent__btn" onClick={choose('denied')}>
          Nein
        </button>
      </div>
      <p className="pr-consent__note">{CONSENT_NOTE}</p>
      <details className="pr-consent__more">
        <summary>Mehr dazu</summary>
        <ul>
          {KIDS_PRIVACY.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
        <p>
          <a href={PATHS.privacy} target="_blank" rel="noopener">
            Datenschutz für Erwachsene (öffnet eine neue Seite)
          </a>
        </p>
      </details>
    </section>
  );
}
