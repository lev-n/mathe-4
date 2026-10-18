/**
 * Arbeitsblätter for teachers and parents: topic → skills → Stufe → number of tasks → sheet.
 * Deterministic per Blatt-Nummer (seed); the answer key prints on its own page.
 * Lazy-loaded (it pulls in all answer inputs and visuals).
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { formatAnswer } from '../../core/check';
import { fmt, toSpeech } from '../../core/format';
import { randomSeed } from '../../core/rng';
import type { Exercise, GenContext, SkillDef, Stufe, TopicId } from '../../core/types';
import { STUFEN } from '../../core/types';
import { KMK_TAGS } from '../../data/curriculum';
import { visibleSkills } from '../../state/selectors';
import { useSettings } from '../../state/useProgress';
import { TOPICS, getTopicMeta } from '../../topics/registry';
import AnswerInput from '../answers/AnswerInput';
import VisualView from '../visuals/Visual';
import { useTopicModule } from '../app/hooks';
import { PrintIcon, TopicIcon } from '../app/icons';
import { stufeLabel } from '../app/labels';
import { Loading, PageTitle } from '../app/PageTitle';
import { TASK_COUNTS, answerBesidePicture, buildWorksheet, isCompactTask, lastStepText, parseSeed, partnerPrompt, MAX_SEED } from './worksheet';
import type { TaskCount } from './worksheet';
import './worksheet.css';

interface SheetSpec {
  topicId: TopicId;
  skillIds: string[];
  stufe: Stufe;
  count: TaskCount;
  seed: number;
  partner: boolean;
  answerKey: boolean;
}

const noop = () => {};

function TaskView({ ex, index, partner }: { ex: Exercise; index: number; partner: boolean }) {
  return (
    <li className={isCompactTask(ex) ? 'ws-task ws-task--compact' : 'ws-task'}>
      <p className="ws-task__prompt">{ex.prompt}</p>
      {ex.context && (
        <p className="ws-task__context">
          {ex.emoji && (
            <span className="ws-task__emoji" aria-hidden="true">
              {ex.emoji}{' '}
            </span>
          )}
          {ex.context}
        </p>
      )}
      {ex.expression && (
        <p className="ws-task__expr">
          <span aria-hidden="true">{ex.expression}</span>
          <span className="visually-hidden">{toSpeech(ex.expression)}</span>
        </p>
      )}
      <div className={answerBesidePicture(ex) ? 'ws-task__body ws-task__body--side' : 'ws-task__body'}>
        {ex.visual && (
          <div className="visual-wrap">
            <VisualView visual={ex.visual} print />
          </div>
        )}
        <div className="ws-task__answer">
          <AnswerInput
            answer={ex.answer}
            response={null}
            onChange={noop}
            onSubmit={noop}
            disabled
            result={null}
            reveal={false}
            idBase={`ws-${index}`}
            keypad={false}
            print
          />
        </div>
      </div>
      {partner && <p className="ws-task__partner">{partnerPrompt(index)}</p>}
    </li>
  );
}

function KeyItem({ ex }: { ex: Exercise }) {
  const a = ex.answer;
  const last = lastStepText(ex);
  const answerText = formatAnswer(a);
  return (
    <li className="key-item">
      <span className="key-item__answer">{answerText}</span>
      {a.kind === 'cells' && (
        <div className="visual-wrap">
          <VisualView visual={{ type: 'grid', width: a.width, height: a.height, cells: [...a.given, ...a.solution], axis: a.axis, showOutline: true }} print />
        </div>
      )}
      {last && last !== answerText && <span className="key-item__step">{last}</span>}
    </li>
  );
}

function Sheet({ spec, skills, ctx }: { spec: SheetSpec; skills: SkillDef[]; ctx: GenContext }) {
  const meta = getTopicMeta(spec.topicId);
  const chosen = useMemo(() => skills.filter((s) => spec.skillIds.includes(s.id)), [skills, spec.skillIds]);
  const sheet = useMemo(() => buildWorksheet(chosen, spec.stufe, spec.count, spec.seed, ctx), [chosen, spec.stufe, spec.count, spec.seed, ctx]);
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    headingRef.current?.focus();
  }, [spec]);

  const info = `${meta.title} · ${stufeLabel(spec.stufe)} · Blatt-Nummer ${spec.seed}`;
  return (
    <>
      <article className="worksheet" aria-labelledby="ws-title" data-testid="worksheet">
        <header className="worksheet__head">
          <p className="worksheet__brand">Mathe 4 · Arbeitsblatt</p>
          <h2 id="ws-title" ref={headingRef} tabIndex={-1}>
            {meta.title}
          </h2>
          <p className="worksheet__meta">
            {stufeLabel(spec.stufe)} · {fmt(sheet.exercises.length)} Aufgaben · {chosen.map((s) => s.title).join(', ')}
          </p>
          <div className="worksheet__fields">
            <span>
              Name: <span className="write-line" />
            </span>
            <span>
              Datum: <span className="write-line write-line--short" />
            </span>
          </div>
        </header>
        {sheet.failed > 0 && (
          <p className="notice no-print">
            {sheet.failed === 1 ? '1 Aufgabe konnte' : `${fmt(sheet.failed)} Aufgaben konnten`} nicht erstellt werden. Probieren Sie eine andere
            Blatt-Nummer.
          </p>
        )}
        <ol className="worksheet__tasks">
          {sheet.exercises.map((ex, i) => (
            <TaskView key={`${ex.key}:${i}`} ex={ex} index={i} partner={spec.partner} />
          ))}
        </ol>
        <footer className="worksheet__foot">
          <p>
            {info}
            {spec.topicId === 'schriftlich' && ` · Subtraktion: ${ctx.subtractionMethod === 'ergaenzen' ? 'Ergänzen' : 'Abziehen'}`}
          </p>
          {sheet.kmk.length > 0 && (
            <p className="worksheet__kmk">
              KMK-Bildungsstandards (2022): {sheet.kmk.map((id) => `${KMK_TAGS[id].leitidee} – ${KMK_TAGS[id].text}`).join(' · ')}
            </p>
          )}
        </footer>
      </article>

      <section className={spec.answerKey ? 'answer-key' : 'answer-key no-print'} aria-labelledby="key-title" data-testid="answer-key">
        <h2 id="key-title">Lösungen</h2>
        <p className="answer-key__info">
          {info}
          {!spec.answerKey && <span className="no-print"> (wird nicht mitgedruckt)</span>}
        </p>
        <ol className="answer-key__list">
          {sheet.exercises.map((ex, i) => (
            <KeyItem key={`${ex.key}:${i}`} ex={ex} />
          ))}
        </ol>
      </section>
    </>
  );
}

export default function WorksheetPage() {
  const settings = useSettings();
  const [topicId, setTopicId] = useState<TopicId>('zahlen');
  const [picked, setPicked] = useState<Partial<Record<TopicId, string[]>>>({});
  const [stufe, setStufe] = useState<Stufe>(2);
  const [count, setCount] = useState<TaskCount>(10);
  const [partner, setPartner] = useState(false);
  const [answerKey, setAnswerKey] = useState(true);
  const [seedText, setSeedText] = useState(() => String(randomSeed()));
  const [error, setError] = useState<string | null>(null);
  const [spec, setSpec] = useState<SheetSpec | null>(null);

  const mod = useTopicModule(topicId);
  const skills = mod.status === 'ready' ? visibleSkills({ settings }, mod.data.skills) : [];
  const defaultIds = skills.filter((s) => !s.optional).map((s) => s.id);
  const selected = (picked[topicId] ?? defaultIds).filter((id) => skills.some((s) => s.id === id));

  const ctx = useMemo<GenContext>(
    () => ({ subtractionMethod: settings.subtractionMethod, nrwExtras: settings.nrwExtras }),
    [settings.subtractionMethod, settings.nrwExtras],
  );

  // The sheet shown belongs to a loaded topic module; keep its skills even if the form switches topic.
  const sheetMod = useTopicModule(spec?.topicId ?? null);
  const sheetSkills = sheetMod.status === 'ready' ? sheetMod.data.skills : [];

  function toggleSkill(id: string, on: boolean) {
    const next = on ? [...selected, id] : selected.filter((x) => x !== id);
    setPicked((p) => ({ ...p, [topicId]: skills.map((s) => s.id).filter((x) => next.includes(x)) }));
  }

  function create(seed: number | null) {
    if (mod.status !== 'ready') return;
    if (selected.length === 0) {
      setError('Wählen Sie mindestens einen Bereich aus.');
      return;
    }
    if (seed === null) {
      setError(`Die Blatt-Nummer darf nur aus Ziffern bestehen (0 bis ${fmt(MAX_SEED)}).`);
      return;
    }
    setError(null);
    setSpec({ topicId, skillIds: selected, stufe, count, seed, partner, answerKey });
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    create(parseSeed(seedText));
  }

  function newTasks() {
    const seed = randomSeed();
    setSeedText(String(seed));
    create(seed);
  }

  return (
    <div className="page worksheet-page">
      <div className="ws-intro no-print">
        <PageTitle docTitle="Arbeitsblätter">Arbeitsblätter</PageTitle>
        <p className="lead">
          Für Lehrkräfte und Eltern: Stellen Sie ein Blatt zum Ausdrucken zusammen. Dieselbe Blatt-Nummer ergibt mit denselben Einstellungen immer dieselben Aufgaben.
        </p>
      </div>

      <form className="ws-form no-print" onSubmit={onSubmit} noValidate>
        <fieldset className="choice-group">
          <legend>1. Thema</legend>
          <div className="choice-grid">
            {TOPICS.map((t) => (
              <label key={t.id} className={`choice-card topic--${t.id}`}>
                <input type="radio" name="ws-topic" value={t.id} checked={topicId === t.id} onChange={() => setTopicId(t.id)} />
                <span className="choice-card__icon">
                  <TopicIcon topicId={t.id} />
                </span>
                <span>{t.title}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="choice-group">
          <legend>2. Bereiche</legend>
          {mod.status === 'loading' && <Loading text="Die Bereiche werden geladen …" />}
          {mod.status === 'error' && <p className="notice">Dieses Thema konnte gerade nicht geladen werden.</p>}
          {mod.status === 'ready' && skills.length === 0 && <p className="notice">Für dieses Thema gibt es noch keine Aufgaben.</p>}
          {skills.length > 0 && (
            <div className="check-list">
              {skills.map((s) => (
                <label key={s.id} className="check-row">
                  <input type="checkbox" checked={selected.includes(s.id)} onChange={(e) => toggleSkill(s.id, e.target.checked)} />
                  <span>
                    <span className="check-row__title">
                      {s.title}
                      {s.optional === 'nrw' && <span className="tag">Zusatz NRW</span>}
                    </span>
                    <span className="check-row__desc">{s.stufen[stufe]}</span>
                  </span>
                </label>
              ))}
            </div>
          )}
        </fieldset>

        <div className="ws-form__row">
          <fieldset className="choice-group">
            <legend>3. Stufe</legend>
            <div className="segmented">
              {STUFEN.map((s) => (
                <label key={s} className="segmented__item">
                  <input type="radio" name="ws-stufe" value={s} checked={stufe === s} onChange={() => setStufe(s)} />
                  <span>{stufeLabel(s)}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="choice-group">
            <legend>4. Anzahl der Aufgaben</legend>
            <div className="segmented">
              {TASK_COUNTS.map((n) => (
                <label key={n} className="segmented__item">
                  <input type="radio" name="ws-count" value={n} checked={count === n} onChange={() => setCount(n)} />
                  <span>{fmt(n)}</span>
                </label>
              ))}
            </div>
          </fieldset>
        </div>

        <fieldset className="choice-group">
          <legend>5. Extras</legend>
          <div className="check-list">
            <label className="check-row">
              <input type="checkbox" checked={partner} onChange={(e) => setPartner(e.target.checked)} />
              <span>Zeile „Erkläre deinem Partner …“ bei jeder Aufgabe</span>
            </label>
            <label className="check-row">
              <input type="checkbox" checked={answerKey} onChange={(e) => setAnswerKey(e.target.checked)} />
              <span>Lösungsblatt mitdrucken (eigene Seite)</span>
            </label>
          </div>
        </fieldset>

        <div className="ws-seed">
          <label htmlFor="ws-seed">Blatt-Nummer</label>
          <input
            id="ws-seed"
            className="num-input ws-seed__input"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            spellCheck={false}
            value={seedText}
            onChange={(e) => setSeedText(e.target.value)}
            aria-describedby="ws-seed-hint"
          />
          <p id="ws-seed-hint" className="hint">
            Notieren Sie die Nummer, um ein Blatt später genau so wieder zu erstellen.
          </p>
        </div>

        {error && (
          <p className="notice" role="status">
            {error}
          </p>
        )}

        <div className="row">
          <button type="submit" className="btn btn--primary btn--lg" disabled={mod.status !== 'ready'}>
            Arbeitsblatt erstellen
          </button>
          <button type="button" className="btn btn--lg" onClick={newTasks} disabled={mod.status !== 'ready'}>
            Neue Aufgaben
          </button>
        </div>
      </form>

      {spec && (
        <>
          <div className="ws-actions no-print">
            <button type="button" className="btn btn--primary btn--lg" onClick={() => window.print()}>
              <PrintIcon /> Drucken
            </button>
            <p className="hint">Tipp: Schalten Sie im Druckfenster „Kopf- und Fußzeilen“ aus.</p>
          </div>
          {sheetMod.status === 'ready' ? <Sheet spec={spec} skills={sheetSkills} ctx={ctx} /> : <Loading />}
        </>
      )}
    </div>
  );
}
