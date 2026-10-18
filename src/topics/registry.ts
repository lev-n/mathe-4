/**
 * Topic metadata (always loaded) and lazy loaders for the topic modules (one chunk per topic).
 */
import type { SkillDef, TopicId, TopicMeta, TopicModule } from '../core/types';

export const TOPICS: readonly TopicMeta[] = [
  { id: 'zahlen', title: 'Zahlen bis 1 000 000', shortTitle: 'Zahlen', description: 'Stellenwerte, Runden und der Zahlenstrahl', color: 'zahlen' },
  { id: 'schriftlich', title: 'Schriftlich rechnen', shortTitle: 'Schriftlich', description: 'Plus, minus, mal und geteilt untereinander', color: 'schriftlich' },
  { id: 'kopfrechnen', title: 'Kopfrechnen und Einmaleins', shortTitle: 'Kopfrechnen', description: 'Einmaleins, geschickt rechnen, große Zahlen im Kopf', color: 'kopfrechnen' },
  { id: 'groessen', title: 'Größen und Messen', shortTitle: 'Größen', description: 'Geld, Längen, Gewichte, Zeit und Hohlmaße', color: 'groessen' },
  { id: 'geometrie', title: 'Geometrie', shortTitle: 'Geometrie', description: 'Flächen, Umfang, Symmetrie, Körper und Netze', color: 'geometrie' },
  { id: 'daten', title: 'Daten und Zufall', shortTitle: 'Daten', description: 'Diagramme lesen, Möglichkeiten zählen, Chancen vergleichen', color: 'daten' },
  { id: 'sachaufgaben', title: 'Sachaufgaben', shortTitle: 'Sachaufgaben', description: 'Rechengeschichten aus dem Alltag lösen', color: 'sachaufgaben' },
];

const LOADERS: Record<TopicId, () => Promise<{ default: TopicModule }>> = {
  zahlen: () => import('./zahlen'),
  schriftlich: () => import('./schriftlich'),
  kopfrechnen: () => import('./kopfrechnen'),
  groessen: () => import('./groessen'),
  geometrie: () => import('./geometrie'),
  daten: () => import('./daten'),
  sachaufgaben: () => import('./sachaufgaben'),
};

const cache = new Map<TopicId, Promise<TopicModule>>();

export function isTopicId(id: string): id is TopicId {
  return Object.prototype.hasOwnProperty.call(LOADERS, id);
}

export function getTopicMeta(id: TopicId): TopicMeta {
  const meta = TOPICS.find((t) => t.id === id);
  if (!meta) throw new Error(`Unknown topic ${id}`);
  return meta;
}

export function loadTopic(id: TopicId): Promise<TopicModule> {
  let p = cache.get(id);
  if (!p) {
    p = LOADERS[id]().then((m) => m.default);
    p.catch(() => cache.delete(id));
    cache.set(id, p);
  }
  return p;
}

export function loadAllTopics(): Promise<TopicModule[]> {
  return Promise.all(TOPICS.map((t) => loadTopic(t.id)));
}

/** Skill ids are `${topicId}.${slug}`. */
export function topicOfSkill(skillId: string): TopicId {
  const id = skillId.split('.')[0];
  if (!isTopicId(id)) throw new Error(`Skill id without valid topic prefix: ${skillId}`);
  return id;
}

export async function loadSkill(skillId: string): Promise<SkillDef> {
  const mod = await loadTopic(topicOfSkill(skillId));
  const skill = mod.skills.find((s) => s.id === skillId);
  if (!skill) throw new Error(`Unknown skill ${skillId}`);
  return skill;
}
