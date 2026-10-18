import { fmt } from '../../core/format';
import type { SkillDef, TopicId } from '../../core/types';
import { STUFEN } from '../../core/types';
import { topicDocTitle } from '../../seo/meta';
import { masteryOf, starsOf, suggestedStufe, visibleSkills } from '../../state/selectors';
import type { ProgressState } from '../../state/types';
import { useProgress } from '../../state/useProgress';
import { getTopicMeta } from '../../topics/registry';
import { useTopicModule } from '../app/hooks';
import { TopicIcon } from '../app/icons';
import { MASTERY_LABEL, stufeLabel } from '../app/labels';
import { Loading, PageTitle } from '../app/PageTitle';
import { Link } from '../app/router';
import { PATHS, mixPath, practicePath } from '../app/routes';
import { StarLegend, Stars } from '../app/Stars';

/** Minimum number of 'sicher' skills before "Gemischte Übung" is offered (docs/research.md, Interleaving). */
export const MIX_MIN_SICHER = 2;

/** A skill counts as sicher when at least one of its Stufen is sicher or gemeistert. */
export function isSkillSicher(state: ProgressState, skillId: string): boolean {
  return STUFEN.some((s) => {
    const m = masteryOf(state, skillId, s);
    return m === 'sicher' || m === 'gemeistert';
  });
}

function SkillCard({ skill, state }: { skill: SkillDef; state: ProgressState }) {
  const suggested = suggestedStufe(state, skill.id);
  const headingId = `skill-${skill.id.replace(/[^a-z0-9-]/gi, '-')}`;
  return (
    <li className="skill-card">
      <h2 className="skill-card__title" id={headingId}>
        {skill.title}
        {skill.optional === 'nrw' && <span className="tag">Zusatz NRW</span>}
      </h2>
      <p className="skill-card__desc">{skill.description}</p>
      <ul className="stufe-list" aria-labelledby={headingId}>
        {STUFEN.map((s) => {
          const mastery = masteryOf(state, skill.id, s);
          const recommended = s === suggested;
          return (
            <li key={s}>
              <Link to={practicePath(skill.id, s)} className={recommended ? 'stufe-btn stufe-btn--recommended' : 'stufe-btn'}>
                <span className="stufe-btn__head">
                  <span className="stufe-btn__label">{stufeLabel(s)}</span>
                  {recommended && <span className="tag tag--recommended">Empfohlen</span>}
                </span>
                <span className="stufe-btn__desc">{skill.stufen[s]}</span>
                <span className="stufe-btn__state">
                  <Stars count={starsOf(state, skill.id, s)} />
                  <span>{MASTERY_LABEL[mastery]}</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </li>
  );
}

export default function TopicPage({ topicId }: { topicId: TopicId }) {
  const meta = getTopicMeta(topicId);
  const state = useProgress();
  const mod = useTopicModule(topicId);
  const skills = mod.status === 'ready' ? visibleSkills(state, mod.data.skills) : [];
  const sicherCount = skills.filter((s) => !s.optional && isSkillSicher(state, s.id)).length;
  const mixReady = sicherCount >= MIX_MIN_SICHER;

  return (
    <div className={`page topic-page topic--${topicId}`}>
      <div className="topic-head">
        <span className="topic-head__icon">
          <TopicIcon topicId={topicId} />
        </span>
        <div>
          <PageTitle docTitle={topicDocTitle(meta)}>{meta.title}</PageTitle>
          <p className="lead">{meta.description}</p>
        </div>
      </div>

      {mod.status === 'loading' && <Loading text="Die Aufgaben werden geladen …" />}
      {mod.status === 'error' && (
        <p className="notice">Die Aufgaben konnten gerade nicht geladen werden. Lade die Seite bitte neu.</p>
      )}

      {mod.status === 'ready' && (
        <>
          <p className="topic-page__intro">Wähle eine Stufe. Du kannst jede Stufe ausprobieren.</p>
          <StarLegend />
          {skills.length === 0 ? (
            <p className="notice">Hier kommen bald Aufgaben dazu.</p>
          ) : (
            <ul className="skill-list">
              {skills.map((s) => (
                <SkillCard key={s.id} skill={s} state={state} />
              ))}
            </ul>
          )}

          <section className="mix-card" aria-labelledby="mix-title">
            <h2 id="mix-title">Gemischte Übung</h2>
            <p>Aufgaben aus dem ganzen Thema durcheinander. So merkst du, welcher Rechenweg passt.</p>
            {mixReady ? (
              <Link to={mixPath(topicId)} className="btn btn--primary btn--lg">
                Gemischt üben
              </Link>
            ) : (
              <>
                <button type="button" className="btn btn--lg" disabled aria-describedby="mix-reason">
                  Gemischt üben
                </button>
                <p id="mix-reason" className="mix-card__reason">
                  Das geht, sobald du in {fmt(MIX_MIN_SICHER)} Bereichen „Sicher“ bist. Jetzt: {fmt(sicherCount)} von {fmt(MIX_MIN_SICHER)}.
                </p>
              </>
            )}
          </section>
        </>
      )}

      <p className="back-link">
        <Link to={PATHS.home}>Zurück zur Startseite</Link>
      </p>
    </div>
  );
}
