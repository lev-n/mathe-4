import { useMemo } from 'react';
import { fmt } from '../../core/format';
import type { SkillDef, Stufe, TopicId, TopicModule } from '../../core/types';
import { today } from '../../state/dates';
import { practisedTopics, topicStars, weekProgress } from '../../state/selectors';
import { useProgress } from '../../state/useProgress';
import { TOPICS } from '../../topics/registry';
import { useTopicModules } from '../app/hooks';
import { ArrowIcon, BoltIcon, RepeatIcon, TopicIcon } from '../app/icons';
import { daysPhrase, stufeLabel, tasksPhrase } from '../app/labels';
import { PageTitle } from '../app/PageTitle';
import { continueStufe, lastPractisedSkillId, reviewRoundSize } from '../app/progress';
import { availableBlitzFacts } from '../practice/blitz';
import { Link } from '../app/router';
import { PATHS, practicePath, topicPath } from '../app/routes';
import { WeekGoal } from './WeekGoal';

function findSkill(mods: Partial<Record<TopicId, TopicModule | 'error'>>, skillId: string): SkillDef | undefined {
  const mod = mods[skillId.split('.')[0] as TopicId];
  return mod && mod !== 'error' ? mod.skills.find((s) => s.id === skillId) : undefined;
}

export default function HomePage() {
  const state = useProgress();
  // Only topics with progress need their module (for stars); new visitors load nothing extra.
  const practised = useMemo(() => practisedTopics(state), [state]);
  const mods = useTopicModules(practised);
  const day = today();
  const { blitzrunde } = state.settings;

  // Count exactly what the review round will contain (1–2 slots per due skill-Stufe, ≤ 3 Einmaleins, ≤ 8).
  const loadedSkills = useMemo(() => Object.values(mods).flatMap((m) => (m && m !== 'error' ? m.skills : [])), [mods]);
  const reviewCount = useMemo(() => reviewRoundSize(state, day, loadedSkills), [state, day, loadedSkills]);
  // The Blitzrunde uses only mastered Einmaleins facts; until there are some, the tile is a calm hint, not a link.
  const blitzReady = useMemo(() => blitzrunde && availableBlitzFacts(state).length > 0, [blitzrunde, state]);
  const week = weekProgress(state, day);
  const lifetimeDays = state.days.length;

  const lastId = useMemo(() => lastPractisedSkillId(state), [state]);
  const lastSkill = lastId ? findSkill(mods, lastId) : undefined;
  const lastStufe: Stufe | null = lastSkill ? continueStufe(state, lastSkill.id) : null;

  return (
    <div className="page home">
      <PageTitle docTitle={null}>Hallo! Was möchtest du heute üben?</PageTitle>

      {(reviewCount > 0 || (lastSkill && lastStufe)) && (
        <div className="home__start">
          {reviewCount > 0 && (
            <section className="review-card" aria-labelledby="review-title">
              <span className="review-card__icon">
                <RepeatIcon />
              </span>
              <div className="review-card__body">
                <h2 id="review-title">Heute wiederholen</h2>
                <p>{tasksPhrase(reviewCount)} von früher. So bleibt alles frisch im Kopf.</p>
              </div>
              <Link to={PATHS.review} className="btn btn--primary btn--lg review-card__go">
                Wiederholen <ArrowIcon />
              </Link>
            </section>
          )}
          {lastSkill && lastStufe && (
            <Link
              to={practicePath(lastSkill.id, lastStufe)}
              className={`continue-tile topic--${lastSkill.topicId}`}
            >
              <span className="continue-tile__kicker">Weiter üben</span>
              <span className="continue-tile__title">
                {lastSkill.title} – {stufeLabel(lastStufe)}
              </span>
              <ArrowIcon />
            </Link>
          )}
        </div>
      )}

      <section aria-labelledby="topics-title" className="home__topics">
        <h2 id="topics-title" className="visually-hidden">
          Themen
        </h2>
        <ul className="topic-grid">
          {TOPICS.map((t) => {
            const mod = mods[t.id];
            const touched = practised.includes(t.id);
            const stars = touched && mod && mod !== 'error' ? topicStars(state, mod.skills) : null;
            return (
              <li key={t.id}>
                <Link to={topicPath(t.id)} className={`topic-card topic--${t.id}`}>
                  <span className="topic-card__icon">
                    <TopicIcon topicId={t.id} />
                  </span>
                  <span className="topic-card__text">
                    <span className="topic-card__title">{t.title}</span>
                    <span className="topic-card__desc">{t.description}</span>
                    {!touched && <span className="topic-card__stars topic-card__stars--new">Noch nicht geübt</span>}
                    {stars && stars.max > 0 && (
                      <span className="topic-card__progress">
                        <svg className="bar" viewBox="0 0 100 8" preserveAspectRatio="none" aria-hidden="true" focusable="false">
                          <rect className="bar__track" x="0" y="0" width="100" height="8" rx="4" />
                          {stars.stars > 0 && (
                            <rect className="bar__fill" x="0" y="0" width={Math.max(4, (100 * stars.stars) / stars.max)} height="8" rx="4" />
                          )}
                        </svg>
                        <span className="topic-card__stars">
                          {stars.stars > 0 ? `${fmt(stars.stars)} von ${fmt(stars.max)} Sternen` : 'Noch nicht geübt'}
                        </span>
                      </span>
                    )}
                  </span>
                </Link>
              </li>
            );
          })}
          {blitzrunde && (
            <li>
              {blitzReady ? (
                <Link to={PATHS.blitz} className="topic-card topic-card--blitz">
                  <span className="topic-card__icon">
                    <BoltIcon />
                  </span>
                  <span className="topic-card__text">
                    <span className="topic-card__title">Blitzrunde</span>
                    <span className="topic-card__desc">2 Minuten Einmaleins, das du schon gut kannst. Nur für dich.</span>
                  </span>
                </Link>
              ) : (
                <div className="topic-card topic-card--blitz topic-card--soon" data-testid="blitz-soon">
                  <span className="topic-card__icon">
                    <BoltIcon />
                  </span>
                  <span className="topic-card__text">
                    <span className="topic-card__title">Blitzrunde</span>
                    <span className="topic-card__desc">Kommt noch. Sie startet, sobald du Einmaleins-Aufgaben gemeistert hast.</span>
                  </span>
                </div>
              )}
            </li>
          )}
        </ul>
      </section>

      <section className="home__week" aria-labelledby="week-title">
        <h2 id="week-title" className="visually-hidden">
          Deine Übungstage
        </h2>
        <WeekGoal days={week.days} goal={week.goal} reached={week.reached} />
        {lifetimeDays > 0 && <p className="home__lifetime">Du hast schon {daysPhrase(lifetimeDays)} geübt.</p>}
      </section>
    </div>
  );
}
