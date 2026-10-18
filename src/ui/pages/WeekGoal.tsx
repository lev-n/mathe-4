import { fmt } from '../../core/format';
import { daysPhrase } from '../app/labels';

/**
 * Weekly practice-day goal (docs/research.md M13): gentle, nothing can be lost,
 * resets silently on Monday (weekProgress handles the week), no "0 Tage" message.
 */
export function weekGoalText(days: number, goal: number, reached: boolean): string {
  if (days <= 0) return `Dein Wochenziel: ${daysPhrase(goal)} üben.`;
  if (reached || days >= goal) {
    return days > goal
      ? `Übungstage diese Woche: ${fmt(days)}. Wochenziel geschafft!`
      : `Übungstage diese Woche: ${fmt(days)} von ${fmt(goal)}. Wochenziel geschafft!`;
  }
  return `Übungstage diese Woche: ${fmt(days)} von ${fmt(goal)}`;
}

export function WeekGoal({ days, goal, reached }: { days: number; goal: number; reached: boolean }) {
  const total = Math.max(goal, days);
  return (
    <div className="week-goal">
      <svg className="week-goal__dots" viewBox={`0 0 ${total * 28} 24`} width={total * 28} height="24" aria-hidden="true" focusable="false">
        {Array.from({ length: total }, (_, i) => (
          <circle key={i} cx={14 + i * 28} cy="12" r="9" className={i < days ? 'dot dot--on' : 'dot dot--off'} />
        ))}
      </svg>
      <p className="week-goal__text">{weekGoalText(days, goal, reached)}</p>
    </div>
  );
}
