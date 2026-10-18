/**
 * Practice page (docs/research.md §6.1): loads the topic modules a plan needs, then runs rounds
 * (or the optional Blitzrunde). Session state (break timer, normalising sentence, session id) belongs to
 * the practice visit (visit.ts) and survives navigation between skills and topics.
 */
import { useEffect, useRef, useState } from 'react';
import type { SkillDef, TopicId, TopicModule } from '../../core/types';
import type { PracticePlan } from '../../state/types';
import { getTopicMeta, isTopicId, loadAllTopics, loadTopic, topicOfSkill } from '../../topics/registry';
import Blitzrunde from './Blitzrunde';
import PracticeHeader from './PracticeHeader';
import Round, { type RoundPlan, type SharedSession } from './Round';
import { practiceVisit } from './visit';
import './practice.css';

export interface PracticePageProps {
  plan: PracticePlan;
  /** Leave the round (always visible, one tap). */
  onExit: () => void;
  /** Start a different plan (e.g. "Nächste Stufe", "Noch eine Runde" with changed Stufe). */
  onNavigate: (plan: PracticePlan) => void;
}

export function planKey(plan: PracticePlan): string {
  switch (plan.mode) {
    case 'skill':
      return `skill:${plan.skillId}:${plan.stufe}`;
    case 'mixed':
      return `mixed:${plan.topicId}`;
    default:
      return plan.mode;
  }
}

function safeTopicOfSkill(skillId: string): TopicId | null {
  try {
    return topicOfSkill(skillId);
  } catch {
    return null;
  }
}

/** Load the SkillDefs a plan needs: skill → its topic; mixed → the topic; review → all topics. */
export async function loadSkillsFor(plan: RoundPlan): Promise<SkillDef[]> {
  let modules: TopicModule[];
  if (plan.mode === 'skill') {
    const topic = safeTopicOfSkill(plan.skillId);
    if (!topic) throw new Error(`Unknown skill ${plan.skillId}`);
    modules = [await loadTopic(topic)];
    if (!modules[0].skills.some((s) => s.id === plan.skillId)) throw new Error(`Unknown skill ${plan.skillId}`);
  } else if (plan.mode === 'mixed') {
    modules = [await loadTopic(plan.topicId)];
  } else {
    modules = await loadAllTopics();
  }
  return modules.flatMap((m) => m.skills);
}

type LoadState = { status: 'loading' } | { status: 'error' } | { status: 'ready'; skills: SkillDef[]; focusHeading: boolean };

function RoundSession({ plan, onExit, onNavigate }: { plan: RoundPlan; onExit: () => void; onNavigate: (plan: PracticePlan) => void }) {
  const [load, setLoad] = useState<LoadState>({ status: 'loading' });
  const [roundNo, setRoundNo] = useState(0);
  const shared = useRef<SharedSession | null>(null);
  if (!shared.current) shared.current = practiceVisit(Date.now());
  const headingRef = useRef<HTMLHeadingElement>(null);

  const key = planKey(plan);
  useEffect(() => {
    let cancelled = false;
    loadSkillsFor(plan).then(
      (skills) => {
        if (cancelled) return;
        // The route focus may sit on the loading screen's heading, which is replaced by the round's own
        // header: hand the focus over instead of letting it fall back to <body>.
        const focusHeading = !!headingRef.current && headingRef.current === document.activeElement;
        setLoad({ status: 'ready', skills, focusHeading });
      },
      (err: unknown) => {
        console.error('Thema konnte nicht geladen werden', err);
        if (!cancelled) setLoad({ status: 'error' });
      },
    );
    return () => {
      cancelled = true;
    };
    // The plan is identified by its key (the page remounts this component when the key changes).
  }, [key]);

  if (load.status !== 'ready') {
    const topic = plan.mode === 'mixed' ? plan.topicId : plan.mode === 'skill' ? safeTopicOfSkill(plan.skillId) : null;
    const title = topic && isTopicId(topic) ? getTopicMeta(topic).title : 'Wiederholung';
    return (
      <div className="pr-page">
        <PracticeHeader topicId={topic} title={title} onExit={onExit} headingRef={headingRef} />
        {load.status === 'loading' ? (
          <section className="pr-message card" aria-busy="true">
            <p className="pr-loading">Die Aufgaben werden vorbereitet …</p>
          </section>
        ) : (
          <section className="pr-message card">
            <h2>Diese Übung gibt es hier noch nicht.</h2>
            <p>Such dir eine andere Übung aus.</p>
            <button type="button" className="btn btn--primary btn--lg" onClick={onExit}>
              Zurück zur Übersicht
            </button>
          </section>
        )}
      </div>
    );
  }

  return (
    <Round
      key={roundNo}
      plan={plan}
      skills={load.skills}
      shared={shared.current}
      onExit={onExit}
      onNavigate={onNavigate}
      onAgain={() => setRoundNo((n) => n + 1)}
      autoFocus={roundNo > 0}
      focusHeading={roundNo === 0 && load.focusHeading}
    />
  );
}

function BlitzSession({ onExit }: { onExit: () => void }) {
  useEffect(() => {
    // Warm the Kopfrechnen chunk (the Blitzrunde itself only needs the fact list).
    loadTopic('kopfrechnen').catch(() => undefined);
  }, []);
  return <Blitzrunde onExit={onExit} />;
}

export default function PracticePage({ plan, onExit, onNavigate }: PracticePageProps) {
  const key = planKey(plan);
  return (
    <div className="practice">
      {plan.mode === 'blitz' ? (
        <BlitzSession key={key} onExit={onExit} />
      ) : (
        <RoundSession key={key} plan={plan} onExit={onExit} onNavigate={onNavigate} />
      )}
    </div>
  );
}
