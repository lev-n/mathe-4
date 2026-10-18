/**
 * Skill badges (docs/research.md M6–M8): named by competence, awarded as a surprise, never announced
 * in advance, no participation badges (§ 6.4). Every condition needs solved tasks (sicher/gemeistert
 * Stufen, known facts, tasks solved after a mistake, passed spaced checks); none is earned for
 * practice days or time spent (M6, M12 "virtual rewards for performing (repeated) actions"). The
 * weekly goal has its own gentle display and is never turned into a badge.
 * Conditions use only topic prefixes, counts, facts and totals, so they do not depend on other
 * modules' exact skill ids. NRW extras (optional entries) never count, and the Blitzrunde never feeds
 * any of these numbers.
 */
import { fmt } from '../core/format';
import type { TopicId } from '../core/types';
import { ALL_FACT_KEYS, KERN_FACT_KEYS } from './facts';
import { TOPIC_IDS, isAtLeastSicher, isOptionalEntry, parseSkillKey } from './mastery';
import type { BadgeDef, ProgressState } from './types';

/** Numbers the conditions look at, computed once per evaluation. */
export interface BadgeFacts {
  /** Distinct skills with ≥ 1 Stufe sicher/gemeistert, per topic. */
  sicherSkills: Record<TopicId, number>;
  /** Skill-Stufen at 'gemeistert', per topic. */
  gemeistert: Record<TopicId, number>;
  gemeistertTotal: number;
  /** Topics with ≥ 1 skill sicher on Stufe 3. */
  stufe3Topics: number;
}

interface BadgeRule extends BadgeDef {
  met(state: ProgressState, f: BadgeFacts): boolean;
}

const MILLION = fmt(1_000_000);
const LATER = 'Du kannst sie auch nach ein paar Tagen noch.';

type TopicTexts = { sicher: [title: string, description: string, icon: string]; meister: [title: string, description: string, icon: string] };

const TOPIC_TEXTS: Record<TopicId, TopicTexts> = {
  zahlen: {
    sicher: ['Zahlen-Profi', `Du kannst eine Stufe bei den großen Zahlen bis ${MILLION} sicher.`, '🔢'],
    meister: ['Zahlen-Meister', `Du hast eine Stufe bei den großen Zahlen gemeistert. ${LATER}`, '🚀'],
  },
  schriftlich: {
    sicher: ['Rechen-Profi', 'Du rechnest eine Stufe schriftlich untereinander sicher.', '📝'],
    meister: ['Rechen-Meister', `Du hast eine Stufe beim schriftlichen Rechnen gemeistert. ${LATER}`, '🧾'],
  },
  kopfrechnen: {
    sicher: ['Kopfrechen-Profi', 'Du rechnest eine Stufe sicher im Kopf.', '🧠'],
    meister: ['Kopfrechen-Meister', `Du hast eine Stufe beim Kopfrechnen gemeistert. ${LATER}`, '💡'],
  },
  groessen: {
    sicher: ['Größen-Profi', 'Du kannst eine Stufe bei Geld, Längen, Gewichten, Zeit oder Hohlmaßen sicher.', '📏'],
    meister: ['Größen-Meister', `Du hast eine Stufe bei den Größen gemeistert. ${LATER}`, '⏰'],
  },
  geometrie: {
    sicher: ['Formen-Profi', 'Du kannst eine Stufe in der Geometrie sicher.', '📐'],
    meister: ['Geometrie-Meister', `Du hast eine Stufe in der Geometrie gemeistert. ${LATER}`, '🔷'],
  },
  daten: {
    sicher: ['Daten-Profi', 'Du kannst eine Stufe bei Diagrammen, Daten und Zufall sicher.', '📊'],
    meister: ['Daten-Meister', `Du hast eine Stufe bei Daten und Zufall gemeistert. ${LATER}`, '🎲'],
  },
  sachaufgaben: {
    sicher: ['Sachaufgaben-Profi', 'Du löst Sachaufgaben einer Stufe sicher.', '🧩'],
    meister: ['Sachaufgaben-Meister', `Du hast eine Stufe bei den Sachaufgaben gemeistert. ${LATER}`, '🔍'],
  },
};

/** Thresholds (heuristics; documented so they can be tuned in a pilot). */
export const BADGE_THRESHOLDS = {
  dranbleiber: 10,
  wiederholung: 10,
  themenProfiSkills: 3,
  stufe3Topics: 3,
  gedaechtnis: 5,
} as const;

function factsAtLeast(state: ProgressState, keys: readonly string[], box: number): boolean {
  return keys.every((k) => (state.facts[k]?.box ?? 0) >= box);
}

const RULES: BadgeRule[] = [
  ...TOPIC_IDS.flatMap((t): BadgeRule[] => {
    const { sicher, meister } = TOPIC_TEXTS[t];
    return [
      { id: `${t}-sicher`, title: sicher[0], description: sicher[1], icon: sicher[2], met: (_s, f) => f.sicherSkills[t] >= 1 },
      { id: `${t}-gemeistert`, title: meister[0], description: meister[1], icon: meister[2], met: (_s, f) => f.gemeistert[t] >= 1 },
    ];
  }),
  {
    id: 'themen-profi',
    title: 'Themen-Profi',
    description: 'Du kannst in einem Thema drei verschiedene Aufgabenarten sicher.',
    icon: '🌟',
    met: (_s, f) => TOPIC_IDS.some((t) => f.sicherSkills[t] >= BADGE_THRESHOLDS.themenProfiSkills),
  },
  {
    id: 'allrounder',
    title: 'Allrounder',
    description: 'Du kannst in allen sieben Themen mindestens eine Stufe sicher.',
    icon: '🌈',
    met: (_s, f) => TOPIC_IDS.every((t) => f.sicherSkills[t] >= 1),
  },
  {
    id: 'stufe3',
    title: 'Stufe-3-Profi',
    description: 'Du kannst in drei Themen auch schwere Aufgaben auf Stufe 3 sicher.',
    icon: '🧗',
    met: (_s, f) => f.stufe3Topics >= BADGE_THRESHOLDS.stufe3Topics,
  },
  {
    id: 'gedaechtnis',
    title: 'Gedächtnis-Profi',
    description: 'Du hast fünf Stufen gemeistert und kannst sie auch nach Tagen noch.',
    icon: '🦉',
    met: (_s, f) => f.gemeistertTotal >= BADGE_THRESHOLDS.gedaechtnis,
  },
  {
    id: 'kernaufgaben',
    title: 'Kernaufgaben-Kenner',
    description: 'Du kannst die Kernaufgaben des Einmaleins: mal 1, mal 2, mal 5 und mal 10.',
    icon: '🔑',
    met: (s) => factsAtLeast(s, KERN_FACT_KEYS, 2),
  },
  {
    id: 'einmaleins',
    title: 'Einmaleins-Meister',
    description: 'Du kannst alle Aufgaben des kleinen Einmaleins sicher.',
    icon: '🏆',
    met: (s) => factsAtLeast(s, ALL_FACT_KEYS, 3),
  },
  {
    id: 'dranbleiber',
    title: 'Dranbleiber',
    description: 'Du hast 10 knifflige Aufgaben mit Tipp oder im zweiten Versuch gelöst.',
    icon: '💪',
    met: (s) => s.totals.afterHint >= BADGE_THRESHOLDS.dranbleiber,
  },
  {
    id: 'wiederholung',
    title: 'Wiederholungs-Profi',
    description: 'Du hast 10 Wiederholungen nach ein paar Tagen auf Anhieb gelöst.',
    icon: '🔁',
    met: (s) => s.totals.checksPassed >= BADGE_THRESHOLDS.wiederholung,
  },
];

/** 15–25 competence-named badges (no participation badges, never announced in advance). */
export const BADGES: BadgeDef[] = RULES.map(({ id, title, description, icon }) => ({ id, title, description, icon }));

const zeroPerTopic = (): Record<TopicId, number> => Object.fromEntries(TOPIC_IDS.map((t) => [t, 0])) as Record<TopicId, number>;

export function badgeFacts(state: ProgressState): BadgeFacts {
  const sicherSkillIds: Record<TopicId, Set<string>> = Object.fromEntries(TOPIC_IDS.map((t) => [t, new Set<string>()])) as Record<TopicId, Set<string>>;
  const gemeistert = zeroPerTopic();
  const stufe3 = new Set<TopicId>();
  let gemeistertTotal = 0;
  for (const [key, p] of Object.entries(state.skills)) {
    if (isOptionalEntry(p)) continue;
    const parsed = parseSkillKey(key);
    if (!parsed || !isAtLeastSicher(p.state)) continue;
    sicherSkillIds[parsed.topicId].add(parsed.skillId);
    if (parsed.stufe === 3) stufe3.add(parsed.topicId);
    if (p.state === 'gemeistert') {
      gemeistert[parsed.topicId] += 1;
      gemeistertTotal += 1;
    }
  }
  const sicherSkills = zeroPerTopic();
  for (const t of TOPIC_IDS) sicherSkills[t] = sicherSkillIds[t].size;
  return { sicherSkills, gemeistert, gemeistertTotal, stufe3Topics: stufe3.size };
}

/** Ids of badges whose condition is met but that are not yet in state.badges. */
export function evaluateBadges(state: ProgressState): string[] {
  const f = badgeFacts(state);
  return RULES.filter((r) => !Object.prototype.hasOwnProperty.call(state.badges, r.id) && r.met(state, f)).map((r) => r.id);
}

export function badgeById(id: string): BadgeDef | undefined {
  return BADGES.find((b) => b.id === id);
}
