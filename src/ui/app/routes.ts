/**
 * Route table: path → Route (pure) and path builders. German URLs.
 */
import type { Stufe, TopicId } from '../../core/types';
import type { PracticePlan } from '../../state/types';
import { isTopicId } from '../../topics/registry';

export type Route =
  | { name: 'home' }
  | { name: 'topic'; topicId: TopicId }
  | { name: 'practice'; plan: PracticePlan }
  | { name: 'progress' }
  | { name: 'badges' }
  | { name: 'worksheet' }
  | { name: 'adults' }
  | { name: 'privacy' }
  | { name: 'imprint' }
  | { name: 'notFound' };

export const PATHS = {
  home: '/',
  progress: '/fortschritt',
  badges: '/abzeichen',
  worksheet: '/arbeitsblatt',
  adults: '/erwachsene',
  privacy: '/datenschutz',
  imprint: '/impressum',
  review: '/wiederholen',
  blitz: '/blitz',
} as const;

export const topicPath = (topicId: TopicId): string => `/thema/${topicId}`;
export const practicePath = (skillId: string, stufe: Stufe): string => `/ueben/${encodeURIComponent(skillId)}/${stufe}`;
export const mixPath = (topicId: TopicId): string => `/mix/${topicId}`;

export function planPath(plan: PracticePlan): string {
  switch (plan.mode) {
    case 'skill':
      return practicePath(plan.skillId, plan.stufe);
    case 'mixed':
      return mixPath(plan.topicId);
    case 'review':
      return PATHS.review;
    case 'blitz':
      return PATHS.blitz;
  }
}

/** Where "leave the round" goes: the topic page for skill/mixed rounds, else home. */
export function exitPath(plan: PracticePlan): string {
  if (plan.mode === 'mixed') return topicPath(plan.topicId);
  if (plan.mode === 'skill') {
    const t = plan.skillId.split('.')[0];
    return isTopicId(t) ? topicPath(t) : PATHS.home;
  }
  return PATHS.home;
}

function decode(segment: string): string | null {
  try {
    return decodeURIComponent(segment);
  } catch {
    return null;
  }
}

function parseStufe(s: string): Stufe | null {
  return s === '1' ? 1 : s === '2' ? 2 : s === '3' ? 3 : null;
}

const SKILL_ID = /^[a-z]+\.[A-Za-z0-9_.-]+$/;

export function matchRoute(pathname: string): Route {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  const parts = path.split('/').filter(Boolean).map(decode);
  if (parts.some((p) => p === null)) return { name: 'notFound' };
  const seg = parts as string[];

  if (seg.length === 0) return { name: 'home' };
  const [head, a, b] = seg;

  if (seg.length === 1) {
    switch (head) {
      case 'fortschritt':
        return { name: 'progress' };
      case 'abzeichen':
        return { name: 'badges' };
      case 'arbeitsblatt':
        return { name: 'worksheet' };
      case 'erwachsene':
        return { name: 'adults' };
      case 'datenschutz':
        return { name: 'privacy' };
      case 'impressum':
        return { name: 'imprint' };
      case 'wiederholen':
        return { name: 'practice', plan: { mode: 'review' } };
      case 'blitz':
        return { name: 'practice', plan: { mode: 'blitz' } };
      default:
        return { name: 'notFound' };
    }
  }
  if (seg.length === 2 && head === 'thema' && isTopicId(a)) return { name: 'topic', topicId: a };
  if (seg.length === 2 && head === 'mix' && isTopicId(a)) return { name: 'practice', plan: { mode: 'mixed', topicId: a } };
  if (seg.length === 3 && head === 'ueben' && SKILL_ID.test(a) && isTopicId(a.split('.')[0])) {
    const stufe = parseStufe(b);
    if (stufe) return { name: 'practice', plan: { mode: 'skill', skillId: a, stufe } };
  }
  return { name: 'notFound' };
}

export function isPracticeRoute(route: Route): route is Extract<Route, { name: 'practice' }> {
  return route.name === 'practice';
}
