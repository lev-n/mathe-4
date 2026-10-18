import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import { koerperSkill } from './koerper';
import { samples } from './test-utils';

// Keys name the question only (not the distractors). Stufe 1: 7 solids × (name | find | rollen) = 21;
// Stufe 2: 26 everyday objects; Stufe 3: 11 riddles and 7 "Welche Flächen" questions.
describeSkill(koerperSkill, { minDistinct: { 1: 20, 2: 25, 3: 18 } });

const NAMES: Record<string, string> = {
  wuerfel: 'Der Würfel', quader: 'Der Quader', kugel: 'Die Kugel', zylinder: 'Der Zylinder', kegel: 'Der Kegel', pyramide: 'Die Pyramide', prisma: 'Das Prisma',
};

describe('Körper erkennen – independent checks', () => {
  it('Stufe 1: the drawn solid gets its own name; Quader is never a wrong option for a Würfel', () => {
    for (const ex of samples(koerperSkill, 1)) {
      if (ex.answer.kind !== 'choice') throw new Error('choice');
      const opts = ex.answer.options;
      if (ex.key.includes(':rollen:')) {
        const solid = ex.key.split(':')[3];
        const rolls = ['kugel', 'zylinder', 'kegel'].includes(solid);
        expect(opts[ex.answer.correct].label.startsWith(rolls ? 'Ja' : 'Nein')).toBe(true);
        expect(opts.map((o) => o.label.slice(0, 2))).toEqual(['Ja', 'Ne']); // fixed order
        continue;
      }
      if (ex.visual?.type === 'solid') {
        expect(opts[ex.answer.correct].label).toBe(NAMES[ex.visual.solid]);
        if (ex.visual.solid === 'wuerfel') expect(opts.map((o) => o.label)).not.toContain('Der Quader');
      } else {
        // find task: the correct option shows the asked solid
        const asked = Object.entries(NAMES).find(([, n]) => ex.prompt.includes(n.split(' ')[1]))![0];
        const v = opts[ex.answer.correct].visual;
        expect(v && v.type === 'solid' && v.solid).toBe(asked);
        // labels are 'Körper A' … in order
        opts.forEach((o, i) => expect(o.label).toBe(`Körper ${String.fromCharCode(65 + i)}`));
        if (asked === 'quader') opts.forEach((o) => expect(o.visual && o.visual.type === 'solid' && o.visual.solid).not.toBe('wuerfel'));
      }
    }
  });

  it('Stufe 2: everyday objects map to the right solid', () => {
    const expected: Record<string, string> = {
      fussball: 'kugel', murmel: 'kugel', orange: 'kugel', seifenblase: 'kugel', dose: 'zylinder', kerze: 'zylinder', baumstamm: 'zylinder',
      klopapier: 'zylinder', eistuete: 'kegel', partyhut: 'kegel', schultuete: 'kegel', schuhkarton: 'quader', ziegel: 'quader',
      radiergummi: 'quader', buch: 'quader', kirchturm: 'pyramide', aegypten: 'pyramide', zelt: 'prisma', kaese: 'prisma', satteldach: 'prisma',
      tennisball: 'kugel', globus: 'kugel', trinkhalm: 'zylinder', huetchen: 'kegel', butter: 'quader',
    };
    const seen = new Set<string>();
    for (const ex of samples(koerperSkill, 2)) {
      if (ex.answer.kind !== 'choice') throw new Error('choice');
      const id = ex.key.split(':')[3];
      seen.add(id);
      expect(ex.key).toBe(`geometrie.koerper:2:alltag:${id}`); // the distractors are not part of the key
      expect(ex.answer.options[ex.answer.correct].label).toBe(NAMES[expected[id]]);
      // the object name never gives the solid away
      expect(ex.prompt.split(':')[0].toLowerCase()).not.toContain(expected[id].replace('ue', 'ü'));
    }
    expect(seen.size).toBeGreaterThanOrEqual(22);
  });

  it('Kugel riddle: says that a Körper is wanted, so the flat Kreis really does not fit', () => {
    const ex = samples(koerperSkill, 3, 400).find((e) => e.key.endsWith(':raetsel:kugel'))!;
    expect(ex.context).toMatch(/^Ich bin ein Körper\./);
    expect(ex.context).toMatch(/gebogene Fläche/);
  });

  it('Stufe 3: riddles have exactly one fitting solid', () => {
    for (const ex of samples(koerperSkill, 3)) {
      const a = ex.answer;
      if (a.kind !== 'choice') throw new Error('choice');
      expect(a.options.length).toBeGreaterThanOrEqual(3);
      expect(a.options.every((o, i) => i === a.correct || Boolean(o.whyWrong))).toBe(true);
    }
    const r = samples(koerperSkill, 3).find((e) => e.key.endsWith(':raetsel:fuenf-ecken'))!;
    if (r.answer.kind === 'choice') expect(r.answer.options[r.answer.correct].label).toBe('Die Pyramide');
  });
});
