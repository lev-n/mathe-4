import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import { figurenSkill } from './figuren';
import { bugValue, gridOf, numberValue, samples } from './test-utils';

// Stufe 1: 8 figures to name + 7 figures × (Ecken | Seiten) = 22 questions (keys ignore the distractor set).
// Stufe 2 and 3 draw from fixed banks of property questions (19 and 18 distinct items).
describeSkill(figurenSkill, { minDistinct: { 1: 20, 2: 18, 3: 15 } });

/** Names that are also correct for a shape (superclasses) – must never be offered as a "wrong" option. */
const ALSO_CORRECT: Record<string, string[]> = {
  quadrat: ['Rechteck', 'Raute', 'Parallelogramm', 'Trapez', 'Viereck'],
  rechteck: ['Parallelogramm', 'Trapez', 'Viereck'],
  parallelogramm: ['Trapez', 'Viereck'],
  'gleichseitiges-dreieck': ['Gleichseitiges Dreieck'],
  dreieck: [],
  kreis: [],
  sechseck: [],
  achteck: [],
};

const NAME: Record<string, string> = {
  quadrat: 'Quadrat', rechteck: 'Rechteck', dreieck: 'Dreieck', 'gleichseitiges-dreieck': 'Dreieck', kreis: 'Kreis',
  sechseck: 'Sechseck', achteck: 'Achteck', parallelogramm: 'Parallelogramm',
};
const ECKEN: Record<string, number> = { quadrat: 4, rechteck: 4, dreieck: 3, 'gleichseitiges-dreieck': 3, sechseck: 6, achteck: 8, parallelogramm: 4 };

describe('Ebene Figuren – independent checks', () => {
  it('Stufe 1: the right name and corner count for the drawn shape; no superclass distractors', () => {
    for (const ex of samples(figurenSkill, 1)) {
      if (!ex.visual || ex.visual.type !== 'shape') throw new Error('shape visual expected');
      const shape = ex.visual.shape;
      const a = ex.answer;
      if (a.kind === 'choice') {
        expect(a.options[a.correct].label).toBe(NAME[shape]);
        a.options.forEach((o, i) => {
          if (i !== a.correct) expect(ALSO_CORRECT[shape]).not.toContain(o.label);
        });
        expect(a.options.length).toBe(4);
      } else {
        expect(numberValue(ex)).toBe(ECKEN[shape]);
      }
    }
  });

  it('Stufe 2: property facts are right', () => {
    const facts: Record<string, number> = {
      'zahl:seiten-quadrat': 4, 'zahl:rw-zwei-rechtecke': 8, 'zahl:ecken-sechseck-dreieck': 9,
      'zahl:rw-rechteck': 4, 'zahl:rw-quadrat': 4, 'zahl:rw-parallelogramm': 0, 'zahl:seiten-sechseck': 6, 'zahl:seiten-achteck': 8, 'zahl:parallel-rechteck': 2,
    };
    const choices: Record<string, string> = {
      'wahl:quadrat-eigenschaften': 'Quadrat', 'wahl:rechteck-eigenschaften': 'Rechteck', 'wahl:keine-ecken': 'Kreis', 'wahl:sechs-ecken': 'Sechseck',
      'wahl:acht-ecken': 'Achteck', 'wahl:kein-rechter-winkel': 'Parallelogramm', 'wahl:senkrecht-quadrat': 'senkrecht zueinander',
      'wahl:parallelogramm-eigenschaften': 'Parallelogramm', 'wahl:benachbart-senkrecht': 'senkrecht zueinander', 'wahl:gegenueber-parallel': 'parallel zueinander',
    };
    for (const ex of samples(figurenSkill, 2)) {
      const id = ex.key.split(':').slice(2).join(':');
      if (ex.answer.kind === 'number') expect(numberValue(ex)).toBe(facts[id]);
      else if (ex.answer.kind === 'choice') expect(ex.answer.options[ex.answer.correct].label).toBe(choices[id]);
    }
  });

  it('Stufe 3: counting Quadrate in a grid matches brute force', () => {
    let seen = 0;
    for (const ex of samples(figurenSkill, 3)) {
      if (!ex.key.includes(':quadrate:')) continue;
      seen++;
      const g = gridOf(ex);
      const set = new Set(g.cells.map((c) => c.join()));
      let count = 0;
      for (let k = 1; k <= 6; k++) {
        for (let y = 0; y < g.height; y++) {
          for (let x = 0; x < g.width; x++) {
            let all = true;
            for (let dy = 0; dy < k && all; dy++) for (let dx = 0; dx < k && all; dx++) all = set.has(`${x + dx},${y + dy}`);
            if (all) count++;
          }
        }
      }
      expect(numberValue(ex)).toBe(count);
      expect(bugValue(ex, 'nur-kleine')).toBe(g.cells.length);
    }
    expect(seen).toBeGreaterThan(20);
  });

  it('Stufe 3: "Wie viele Quadrate siehst du?" shows only the rectangle (no empty grid squares around it)', () => {
    for (const ex of samples(figurenSkill, 3, 200)) {
      if (!ex.key.includes(':quadrate:')) continue;
      const g = gridOf(ex);
      expect(g.cells.length).toBe(g.width * g.height);
    }
  });

  it('Stufe 1: the same figure with other distractors is the same question (same key)', () => {
    for (const ex of samples(figurenSkill, 1, 200)) {
      expect(ex.key).toMatch(/^geometrie\.figuren:1:(name|ecken|seiten):[a-z-]+$/);
    }
  });

  it('Parallelogramm statements fit the Stufe-3 hierarchy (a Rechteck is a special Parallelogramm)', () => {
    for (const stufe of [1, 2, 3] as const) {
      for (const ex of samples(figurenSkill, stufe, 300)) {
        const texts = [ex.prompt, ...ex.steps.map((st) => (typeof st === 'string' ? st : st.text)), ...(ex.answer.kind === 'choice' ? ex.answer.options.map((o) => o.whyWrong ?? '') : [])];
        texts.forEach((t) => expect(t).not.toMatch(/\bEin Parallelogramm hat keine/));
        if (ex.key.endsWith(':kein-rechter-winkel')) {
          if (ex.answer.kind !== 'choice') throw new Error('choice');
          // the question is about the drawn Vierecke
          expect(ex.prompt).toMatch(/dieser Vierecke/);
          ex.answer.options.forEach((o) => expect(o.visual?.type).toBe('shape'));
          expect(ex.answer.layout).toBe('grid');
        }
      }
    }
  });

  it('Stufe 3: an Dreieck has at most 1 rechter Winkel; "2" triggers the parallel-sides hint', () => {
    const ex = samples(figurenSkill, 3).find((e) => e.key.endsWith('dreieck-rechte-winkel'))!;
    expect(numberValue(ex)).toBe(1);
    expect(ex.bugs!.find((b) => b.match === 2)!.hint).toMatch(/parallel/);
  });

  it('Stufe 3: "Ist ein Quadrat auch ein Rechteck?" → Ja (4 rechte Winkel)', () => {
    const ex = samples(figurenSkill, 3).find((e) => e.key.endsWith('quadrat-ist-rechteck'))!;
    if (ex.answer.kind !== 'choice') throw new Error('choice');
    expect(ex.answer.options[ex.answer.correct].label).toMatch(/^Ja, denn es hat 4 rechte Winkel/);
  });
});

describe('Ebene Figuren – riddles never offer a superclass as a wrong answer', () => {
  it('Wer bin ich?', () => {
    const SUPER: Record<string, string[]> = {
      Quadrat: ['Rechteck', 'Raute', 'Parallelogramm', 'Trapez', 'Viereck'],
      Rechteck: ['Parallelogramm', 'Trapez', 'Viereck'],
      Parallelogramm: ['Trapez', 'Viereck'],
      'Gleichseitiges Dreieck': ['Dreieck'],
    };
    for (const ex of samples(figurenSkill, 3, 300)) {
      if (ex.answer.kind !== 'choice' || !ex.key.includes('raetsel')) continue;
      const correct = ex.answer.options[ex.answer.correct].label;
      ex.answer.options.forEach((o) => expect(SUPER[correct] ?? []).not.toContain(o.label));
    }
  });
});
