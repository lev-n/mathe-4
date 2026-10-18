/**
 * Optional Blitzrunde (docs/research.md "Timers and Blitzrunde", L12, M10): only mastered Einmaleins facts,
 * 2 minutes, remaining time as calm text (no shrinking bar, no seconds countdown), ends with
 * 'Die Zeit ist um.', compares only with the child's own best, never touches mastery or badges.
 */
import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { checkAnswer, isEmptyResponse } from '../../core/check';
import { fmt, toSpeech } from '../../core/format';
import { createRng, randomSeed } from '../../core/rng';
import type { Response } from '../../core/types';
import { store } from '../../state/store';
import { useProgress } from '../../state/useProgress';
import AnswerInput from '../answers/AnswerInput';
import Keypad, { useKeypadEnabled } from '../keypad/Keypad';
import { BLITZ_MS, availableBlitzFacts, blitzTask, remainingText, type BlitzTask } from './blitz';
import PracticeHeader from './PracticeHeader';
import { GOODBYE } from './phrases';
import { useHoldover } from './useHoldover';

export interface BlitzrundeProps {
  onExit: () => void;
}

type Phase = 'start' | 'running' | 'over' | 'goodbye';

interface Note {
  kind: 'ok' | 'show' | 'invalid';
  text: string;
}

export default function Blitzrunde({ onExit }: BlitzrundeProps) {
  const progress = useProgress();
  const enabled = progress.settings.blitzrunde;
  const keypadOn = useKeypadEnabled(progress.settings.keypad);
  const [facts] = useState(() => availableBlitzFacts(store.get()));
  const [phase, setPhase] = useState<Phase>('start');
  const [task, setTask] = useState<BlitzTask | null>(null);
  const [response, setResponse] = useState<Response | null>(null);
  const [score, setScore] = useState(0);
  const [endAt, setEndAt] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [note, setNote] = useState<Note | null>(null);
  const [final, setFinal] = useState<{ score: number; best: number | undefined; newBest: boolean } | null>(null);
  const [live, setLive] = useState('');
  const rng = useRef(createRng(randomSeed()));
  const recent = useRef<string[]>([]);
  const scoreRef = useRef(0);
  const finishedRef = useRef(false);
  const answerRef = useRef<HTMLDivElement>(null);
  const pendingFocus = useRef<'input' | 'end' | null>(null);
  const endRef = useRef<HTMLHeadingElement>(null);
  const guard = useHoldover(phase);

  const announce = (text: string) => setLive((prev) => (prev === text ? `${text} ` : text));

  const nextTask = () => {
    const t = blitzTask(rng.current, facts, new Set(recent.current));
    if (t) recent.current = [...recent.current.slice(-3), t.key];
    setTask(t);
    setResponse(null);
  };

  const finish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    let newBest = false;
    try {
      newBest = store.recordBlitz(scoreRef.current);
    } catch (err) {
      console.error('Blitzrunde konnte nicht gespeichert werden', err);
    }
    setFinal({ score: scoreRef.current, best: store.get().blitzBest, newBest });
    setPhase('over');
    announce(`Die Zeit ist um. Du hast ${scoreRef.current} ${scoreRef.current === 1 ? 'Aufgabe' : 'Aufgaben'} gelöst.`);
    pendingFocus.current = 'end';
  };

  useEffect(() => {
    if (phase !== 'running') return;
    const id = window.setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (t >= endAt) finish();
    }, 500);
    return () => window.clearInterval(id);
    // `finish` only reads refs and stable state setters, so it may come from an earlier render.
  }, [phase, endAt]);

  useEffect(() => {
    const target = pendingFocus.current;
    if (!target) return;
    const el = target === 'end' ? endRef.current : (answerRef.current?.querySelector('input') ?? null);
    if (el) {
      el.focus();
      pendingFocus.current = null;
    }
  });

  const start = (e: MouseEvent) => {
    if (guard(e)) return;
    finishedRef.current = false;
    scoreRef.current = 0;
    setScore(0);
    setNote(null);
    setFinal(null);
    const t = Date.now();
    setNow(t);
    setEndAt(t + BLITZ_MS);
    nextTask();
    setPhase('running');
    pendingFocus.current = 'input';
  };

  const check = () => {
    if (phase !== 'running' || !task || !response || isEmptyResponse(response)) return;
    if (Date.now() >= endAt) {
      finish();
      return;
    }
    const result = checkAnswer(task.answer, response);
    if (result.invalid) {
      setNote({ kind: 'invalid', text: result.invalid });
      announce(result.invalid);
      return;
    }
    const value = task.answer.value ?? 0;
    const solved = toSpeech(task.expression.replace('□', fmt(value))).replace(/ gleich /g, ' ist ');
    if (result.correct) {
      scoreRef.current += 1;
      setScore(scoreRef.current);
      setNote({ kind: 'ok', text: `Richtig! ${task.expression.replace('□', fmt(value))}` });
      announce(`Richtig! ${solved}.`);
    } else {
      setNote({ kind: 'show', text: `So geht es: ${task.expression.replace('□', fmt(value))}` });
      announce(`So geht es: ${solved}.`);
    }
    nextTask();
  };

  const header = <PracticeHeader topicId="kopfrechnen" kicker="Kopfrechnen" title="Blitzrunde" onExit={onExit} />;
  const liveRegion = (
    <div className="visually-hidden" role="status" aria-live="polite" aria-atomic="true">
      {live}
    </div>
  );

  if (!enabled || facts.length === 0) {
    return (
      <div className="pr-page">
        {header}
        {liveRegion}
        <section className="pr-message card">
          {!enabled ? (
            <>
              <h2>Die Blitzrunde ist gerade ausgeschaltet.</h2>
              <p>Ein Erwachsener kann sie in den Einstellungen einschalten.</p>
            </>
          ) : (
            <>
              <h2>Die Blitzrunde kommt noch.</h2>
              <p>Sie startet, sobald du Einmaleins-Aufgaben gemeistert hast.</p>
              <p>Übe dafür einfach weiter das Einmaleins.</p>
            </>
          )}
          <button type="button" className="btn btn--primary btn--lg" onClick={onExit}>
            Zurück zur Übersicht
          </button>
        </section>
      </div>
    );
  }

  return (
    <div className="pr-page">
      {header}
      {liveRegion}

      {phase === 'start' && (
        <section className="pr-message card" aria-labelledby="pr-blitz-h">
          <h2 id="pr-blitz-h">2 Minuten Einmaleins</h2>
          <p>Du rechnest Aufgaben, die du schon gemeistert hast.</p>
          <p>Du vergleichst dich nur mit dir selbst.</p>
          {progress.blitzBest !== undefined && <p>Dein Bestwert bisher: {progress.blitzBest}</p>}
          <button type="button" className="btn btn--primary btn--lg" onClick={start}>
            Los geht&apos;s
          </button>
        </section>
      )}

      {phase === 'running' && task && (
        <div className={`pr-item-layout${keypadOn ? ' has-keypad' : ''}`}>
          <section className="pr-item card pr-blitz" aria-label="Blitzrunde">
            <p className="pr-blitz__time">{remainingText(endAt - now)}</p>
            <p className="pr-expression" aria-hidden="true">
              {task.expression}
            </p>
            <p className="visually-hidden" id="pr-blitz-sr">
              {task.srText}
            </p>
            <div className="pr-answer" ref={answerRef}>
              <AnswerInput
                answer={task.answer}
                response={response}
                onChange={(r) => {
                  setResponse(r);
                  if (note?.kind === 'invalid') setNote(null);
                }}
                onSubmit={check}
                disabled={false}
                result={null}
                reveal={false}
                idBase="pr-blitz"
                keypad={keypadOn}
                describedBy="pr-blitz-sr"
              />
            </div>
            {note && <p className={`pr-blitz__note pr-blitz__note--${note.kind}`}>{note.text}</p>}
            <p className="pr-blitz__score">Gelöst: {score}</p>
            <div className="pr-actions no-print">
              <button type="button" className="btn btn--primary btn--lg" disabled={isEmptyResponse(response)} onClick={(e) => !guard(e) && check()}>
                Prüfen
              </button>
            </div>
          </section>
          {keypadOn && (
            <div className="pr-keypad">
              <Keypad scopeRef={answerRef} onSubmit={check} submitDisabled={isEmptyResponse(response)} comma={false} />
            </div>
          )}
        </div>
      )}

      {phase === 'over' && final && (
        <section className="pr-summary card" aria-labelledby="pr-blitz-end">
          <h2 className="pr-summary__title" id="pr-blitz-end" tabIndex={-1} ref={endRef}>
            Die Zeit ist um.
          </h2>
          <p className="pr-summary__count">
            Du hast {final.score} {final.score === 1 ? 'Aufgabe' : 'Aufgaben'} gelöst.
          </p>
          {final.newBest ? (
            <p>Das ist dein neuer Bestwert.</p>
          ) : (
            final.best !== undefined && <p>Dein Bestwert: {final.best}</p>
          )}
          <div className="pr-pair no-print">
            <button type="button" className="btn btn--lg" onClick={start}>
              Noch eine Blitzrunde
            </button>
            <button
              type="button"
              className="btn btn--lg"
              onClick={(e) => {
                if (guard(e)) return;
                setPhase('goodbye');
                announce(GOODBYE);
              }}
            >
              Fertig für heute
            </button>
          </div>
        </section>
      )}

      {phase === 'goodbye' && (
        <section className="pr-message card">
          <h2>{GOODBYE}</h2>
          <button type="button" className="btn btn--primary btn--lg" onClick={onExit}>
            Zur Übersicht
          </button>
        </section>
      )}
    </div>
  );
}
