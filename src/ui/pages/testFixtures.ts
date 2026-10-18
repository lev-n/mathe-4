/**
 * Test-only fixtures (imported by *.test.tsx files only): small deterministic fake skills and topic modules,
 * so page tests do not depend on the real generators that are built in parallel.
 */
import { BOX, fmt } from '../../core/format';
import type { Exercise, SkillDef, Stufe, TopicId, TopicModule } from '../../core/types';
import { emptyState } from '../../state/store';
import type { MasteryState, ProgressState, StufeProgress } from '../../state/types';

export function fakeSkill(id: string, title: string, opts: { optional?: 'nrw'; topicId?: TopicId } = {}): SkillDef {
  const topicId = opts.topicId ?? (id.split('.')[0] as TopicId);
  return {
    id,
    topicId,
    title,
    description: `${title} üben.`,
    stufen: { 1: `${title} leicht`, 2: `${title} mittel`, 3: `${title} knifflig` },
    kmk: ['ZO.kopfrechnen'],
    optional: opts.optional,
    generate(rng, stufe: Stufe): Exercise {
      const max = stufe === 1 ? 99 : stufe === 2 ? 9999 : 99_999;
      const a = rng.int(10, max);
      const b = rng.int(10, max);
      const sum = a + b;
      return {
        key: `${id}:${stufe}:${a}+${b}`,
        topicId,
        skillId: id,
        stufe,
        ab: stufe,
        prompt: 'Rechne im Kopf.',
        expression: `${fmt(a)} + ${fmt(b)} = ${BOX}`,
        answer: { kind: 'number', value: sum },
        hints: ['Rechne zuerst mit den großen Stellen.'],
        steps: [`${fmt(a)} + ${fmt(b)} = ${fmt(sum)}`],
        praise: 'Du hast Stelle für Stelle gerechnet.',
        srText: `${a} plus ${b}`,
        kmk: stufe === 3 ? ['ZO.kopfrechnen', 'ZO.strategien'] : ['ZO.kopfrechnen'],
      };
    },
  };
}

export const FAKE_SKILLS: Record<TopicId, SkillDef[]> = {
  zahlen: [fakeSkill('zahlen.runden', 'Runden'), fakeSkill('zahlen.stellenwert', 'Stellenwerte'), fakeSkill('zahlen.binaer', 'Binärzahlen', { optional: 'nrw' })],
  schriftlich: [fakeSkill('schriftlich.plus', 'Schriftlich plus')],
  kopfrechnen: [fakeSkill('kopfrechnen.einmaleins', 'Einmaleins')],
  groessen: [fakeSkill('groessen.geld', 'Geld')],
  geometrie: [fakeSkill('geometrie.flaeche', 'Flächen')],
  daten: [fakeSkill('daten.diagramme', 'Diagramme')],
  sachaufgaben: [fakeSkill('sachaufgaben.einkaufen', 'Einkaufen')],
};

export function fakeModule(topicId: TopicId): TopicModule {
  return { topicId, skills: FAKE_SKILLS[topicId] };
}

export function progress(state: MasteryState, extra: Partial<StufeProgress> = {}): StufeProgress {
  return { attempts: 10, recent: [], practiceDays: 1, state, box: 0, checks: [], last: '2026-10-17', ...extra };
}

/** emptyState() with some skill progress, e.g. { 'zahlen.runden#1': progress('sicher') }. */
export function stateWith(skills: Record<string, StufeProgress> = {}, patch: Partial<ProgressState> = {}): ProgressState {
  const s = emptyState();
  return { ...s, ...patch, skills, settings: { ...s.settings, ...(patch.settings ?? {}) } };
}
