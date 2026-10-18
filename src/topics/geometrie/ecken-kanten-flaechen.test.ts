import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import type { Exercise } from '../../core/types';
import { eckenKantenFlaechenSkill } from './ecken-kanten-flaechen';
import { bugValue, numberValue, samples } from './test-utils';

// Stufe 1: 4 polyhedra × 3 questions + 4 "what meets where" questions = 16 distinct tasks.
describeSkill(eckenKantenFlaechenSkill, { minDistinct: { 1: 16, 2: 25, 3: 30 } });

/** Independent facts (Ecken, Kanten, Flächen) via Euler: E − K + F = 2 for polyhedra. */
const FACTS: Record<string, [number, number, number]> = {
  wuerfel: [8, 12, 6], quader: [8, 12, 6], pyramide: [5, 8, 5], prisma: [6, 9, 5], zylinder: [0, 2, 3], kegel: [0, 1, 2], kugel: [0, 0, 1],
};
const IDX = { ecken: 0, kanten: 1, flaechen: 2 } as const;

function fields(ex: Exercise): Record<string, number> {
  if (ex.answer.kind !== 'multi') throw new Error('multi expected');
  return Object.fromEntries(ex.answer.fields.map((f) => [f.id, f.value]));
}

describe('Ecken, Kanten, Flächen – independent checks', () => {
  it('Euler: E − K + F = 2 for all polyhedra', () => {
    for (const s of ['wuerfel', 'quader', 'pyramide', 'prisma']) {
      const [e, k, f] = FACTS[s];
      expect(e - k + f).toBe(2);
    }
  });

  it('Stufe 1: single counts are right; swapped counts and visible-only counts are bugs', () => {
    // independent facts for the "what meets where" items
    const MEET: Record<string, number> = { 'kanten-an-ecke': 3, 'kanten-an-spitze': 4, 'flaechen-an-kante': 2, 'ecken-einer-flaeche': 4 };
    const meet = new Set<string>();
    for (const ex of samples(eckenKantenFlaechenSkill, 1)) {
      const [, , solid, part] = ex.key.split(':');
      if (solid === 'treffen') {
        meet.add(part);
        expect(numberValue(ex)).toBe(MEET[part]);
        continue;
      }
      expect(numberValue(ex)).toBe(FACTS[solid][IDX[part as keyof typeof IDX]]);
    }
    expect(meet).toEqual(new Set(Object.keys(MEET)));
    const cube = samples(eckenKantenFlaechenSkill, 1, 500).find((e) => e.key.endsWith(':wuerfel:kanten'))!;
    expect(bugValue(cube, 'nur-sichtbare')).toBe(9); // solid lines in the drawing
    expect(bugValue(cube, 'verwechselt-ecken')).toBe(8);
    expect(bugValue(cube, 'verwechselt-flaechen')).toBe(6);
  });

  it('Stufe 2: all counts, Kantenmodelle and Sticker', () => {
    for (const ex of samples(eckenKantenFlaechenSkill, 2)) {
      const parts = ex.key.split(':');
      const kind = parts[2];
      const solid = parts[3];
      const [e, k, f] = FACTS[solid];
      if (kind === 'alle') expect(fields(ex)).toEqual({ ecken: e, kanten: k, flaechen: f });
      else if (kind === 'modell') {
        const n = Number(parts[4]);
        expect(fields(ex)).toEqual({ staebchen: n * k, kugeln: n * e });
      } else {
        const n = Number(parts[4]);
        expect(numberValue(ex)).toBe(n * f);
      }
    }
  });

  it('Stufe 3: curved solids follow the stated convention; models and division with remainder', () => {
    const kinds = new Set<string>();
    for (const ex of samples(eckenKantenFlaechenSkill, 3)) {
      const parts = ex.key.split(':');
      const kind = parts[2];
      kinds.add(kind);
      if (kind === 'gebogen') {
        const [e, k, f] = FACTS[parts[3]];
        const got = fields(ex);
        if ('ecken' in got) expect(got.ecken).toBe(e);
        expect(got.kanten).toBe(k);
        expect(got.flaechen).toBe(f);
        expect(ex.prompt).toMatch(/gebogene Flächen und gebogene Kanten mit/);
        if (parts[3] === 'kegel') expect('ecken' in got).toBe(false);
      } else if (kind === 'zwei-modelle') {
        const m = /^(\d)(\w+)\+(\d)(\w+)$/.exec(parts[3])!;
        const [ea, ka] = FACTS[m[2]];
        const [eb, kb] = FACTS[m[4]];
        expect(fields(ex)).toEqual({ staebchen: Number(m[1]) * ka + Number(m[3]) * kb, kugeln: Number(m[1]) * ea + Number(m[3]) * eb });
      } else if (kind === 'wie-viele-modelle') {
        const k = FACTS[parts[3]][1];
        const sticks = Number(parts[4]);
        expect(numberValue(ex)).toBe(Math.floor(sticks / k));
        expect(bugValue(ex, 'aufgerundet')).toBe(Math.ceil(sticks / k));
      } else if (kind === 'welcher') {
        if (ex.answer.kind !== 'choice') throw new Error('choice');
        expect(ex.answer.options[ex.answer.correct].label.toLowerCase()).toContain(parts[3] === 'wuerfel' ? 'würfel' : parts[3]);
      }
    }
    expect(kinds).toEqual(new Set(['gebogen', 'zwei-modelle', 'wie-viele-modelle', 'welcher']));
  });

  it('Kugel: counting the drawn outline as a Kante gets a targeted hint (the drawing has no equator)', () => {
    const ex = samples(eckenKantenFlaechenSkill, 3, 400).find((e) => e.key.endsWith(':gebogen:kugel'))!;
    expect(fields(ex)).toEqual({ ecken: 0, kanten: 0, flaechen: 1 });
    const bug = ex.bugs!.find((b) => b.id === 'umriss-als-kante')!;
    expect(bug.match).toEqual({ kanten: 1 });
    expect(bug.hint).toMatch(/keine Kante/);
    // no text tells the child that a dashed line on the Kugel is a Kante
    expect(ex.srText).not.toMatch(/gestrichelt/);
  });

  it('German: "als Kantenmodelle" for several models and "von Würfeln" (dative plural)', () => {
    for (const stufe of [2, 3] as const) {
      for (const ex of samples(eckenKantenFlaechenSkill, stufe, 300)) {
        const ctx = ex.context ?? '';
        if (!ctx.includes('Kantenmodell')) continue;
        const k = ex.key.split(':');
        if (k[2] === 'modell') expect(ctx).toContain(Number(k[4]) === 1 ? 'als Kantenmodell.' : 'als Kantenmodelle.');
        if (k[2] === 'zwei-modelle') expect(ctx).toContain('als Kantenmodelle.');
        if (k[2] === 'wie-viele-modelle') expect(ctx).toMatch(/von (Würfeln|Pyramiden|Prismen) bauen/);
      }
    }
  });

  it('multi bugs: swapping Ecken and Kanten gives the targeted hint', () => {
    const ex = samples(eckenKantenFlaechenSkill, 2, 300).find((e) => e.key.endsWith(':alle:prisma'))!;
    const swap = ex.bugs!.find((b) => b.id === 'ecken-kanten-vertauscht')!;
    expect(swap.match).toEqual({ ecken: 9, kanten: 6 });
  });
});
