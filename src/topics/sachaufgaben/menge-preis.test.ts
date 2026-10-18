import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import { checkAnswer } from '../../core/check';
import { mengePreisSkill } from './menge-preis';
import { cents, num, samples } from '../groessen/test-utils';

describeSkill(mengePreisSkill, { minDistinct: 30 });

const qty = (label: string) => Number(label.split(' ')[0]);

describe('sachaufgaben.menge-preis specifics', () => {
  it('price tables are proportional and the answer continues them', () => {
    let seen = 0;
    for (const stufe of [1, 2, 3] as const) {
      for (const ex of samples(mengePreisSkill, stufe)) {
        if (ex.visual?.type !== 'table' || ex.visual.header[1] !== 'Preis') continue;
        seen++;
        expect(ex.visual.header).toEqual(['Menge', 'Preis']);
        const known = ex.visual.rows.filter((r) => r[1] !== '□');
        const asked = ex.visual.rows.find((r) => r[1] === '□')!;
        const unit = cents(known[0][1]) / qty(known[0][0]);
        known.forEach((r) => expect(cents(r[1])).toBeCloseTo(unit * qty(r[0]), 6));
        expect(Math.round((ex.answer as { value: number }).value * 100)).toBe(Math.round(unit * qty(asked[0])));
        if (stufe === 1) expect(known.map((r) => qty(r[0]))).toEqual([1, 2, 3]);
        if (stufe >= 2) expect(known.some((r) => qty(r[0]) === 1)).toBe(false);
      }
    }
    expect(seen).toBeGreaterThan(300);
  });

  it('recipes scale proportionally', () => {
    for (const ex of samples(mengePreisSkill, 2)) {
      const m = ex.context?.match(/für (\d+) Personen braucht man ([\d\u202F]+) (g|ml)/);
      if (!m) continue;
      const target = Number(ex.prompt.match(/für (\d+) Personen/)![1]);
      expect((ex.answer as { value: number }).value).toBe((num(m[2]) * target) / Number(m[1]));
    }
  });

  it('additive misconception is caught (2 Stück 1,60 € → 5 Stück 4,60 €)', () => {
    const ex = samples(mengePreisSkill, 2).find((e) => e.bugs?.some((b) => b.id === 'additiv') && e.visual?.type === 'table' && e.visual.header[1] === 'Preis')!;
    const bug = ex.bugs!.find((b) => b.id === 'additiv')!;
    const r = checkAnswer(ex.answer, { kind: 'number', text: String(bug.match).replace('.', ',') }, ex.bugs);
    expect(r.bugHint).toMatch(/nicht um 1\s€ pro Stück/);
  });

  it('Stufe 3: je mehr – desto weniger, and not-proportional situations', () => {
    let inv = 0;
    let notProp = 0;
    for (const ex of samples(mengePreisSkill, 3)) {
      const v = (ex.answer as { value: number }).value;
      let m;
      if ((m = ex.context?.match(/Bei (\d+) Kindern bekommt jedes Kind (\d+)/))) {
        inv++;
        const k2 = Number(ex.prompt.match(/wenn (\d+) Kinder teilen/)![1]);
        expect(v * k2).toBe(Number(m[1]) * Number(m[2]));
      } else if (/nicht-proportional/.test(ex.key)) {
        notProp++;
        const first = Number(ex.context!.match(/(\d+) (Minuten|Stunden)/)![1]);
        expect(v).toBe(first);
      }
    }
    expect(inv).toBeGreaterThan(30);
    expect(notProp).toBeGreaterThan(20);
  });
});
