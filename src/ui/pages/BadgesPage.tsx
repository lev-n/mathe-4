import { badgeById } from '../../state/badges';
import type { BadgeDef, Day } from '../../state/types';
import { useProgress } from '../../state/useProgress';
import { formatDay } from '../app/labels';
import { PageTitle } from '../app/PageTitle';
import { Link } from '../app/router';
import { PATHS } from '../app/routes';

/**
 * Earned badges only, newest first. Unearned badges are never listed (they stay a surprise,
 * docs/research.md M6/M8).
 */
export function earnedBadges(badges: Record<string, Day>): { badge: BadgeDef; day: Day }[] {
  return Object.entries(badges)
    .map(([id, day]) => ({ badge: badgeById(id), day }))
    .filter((b): b is { badge: BadgeDef; day: Day } => b.badge !== undefined)
    .sort((a, b) => (a.day < b.day ? 1 : a.day > b.day ? -1 : 0));
}

export default function BadgesPage() {
  const state = useProgress();
  const earned = earnedBadges(state.badges);

  return (
    <div className="page badges-page">
      <PageTitle docTitle="Meine Abzeichen">Meine Abzeichen</PageTitle>
      {/* No hint at badges still to come: they arrive as a surprise, nothing to chase (docs/research.md M6/M8). */}
      <p className="lead">
        Abzeichen zeigen, was du schon sicher kannst.{earned.length === 0 && ' Hier erscheinen sie, sobald du eines bekommst.'}
      </p>
      {earned.length > 0 && (
        <ul className="badge-list">
          {earned.map(({ badge, day }) => (
            <li key={badge.id} className="badge-card">
              <span className="badge-card__icon" aria-hidden="true">
                {badge.icon}
              </span>
              <div>
                <h2 className="badge-card__title">{badge.title}</h2>
                <p className="badge-card__desc">{badge.description}</p>
                <p className="badge-card__date">Bekommen am {formatDay(day)}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
      <p>
        <Link to={PATHS.progress}>Zurück zu „Mein Fortschritt“</Link>
      </p>
    </div>
  );
}
