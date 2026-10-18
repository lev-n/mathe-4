import { describe, expect, it } from 'vitest';
import { createRng } from '../../core/rng';
import { STUFEN, type GenContext } from '../../core/types';
import topic from './index';
import { checkStepText, checkWorkedSolution, evalSide } from './step-check';

const CTX: GenContext[] = [
  { subtractionMethod: 'abziehen', nrwExtras: false },
  { subtractionMethod: 'ergaenzen', nrwExtras: true },
];

describe('step checker (self-test)', () => {
  it('evaluates quantities in base units', () => {
    expect(evalSide('4 · 100 cm')?.value).toBe(4000);
    expect(evalSide('2 km 50 m')?.value).toBe(2_050_000);
    expect(evalSide('1 h 25 min')?.value).toBe(5100);
    expect(evalSide('2 ¾ kg')?.value).toBe(2750);
    expect(evalSide('360 € : 24')?.value).toBe(1500);
    expect(evalSide('Preis + 3 €')).toBeNull();
  });
  it('finds wrong lines and accepts right ones', () => {
    expect(checkStepText('4 m = 4 · 100 cm = 400 cm')).toBeNull();
    expect(checkStepText('Rechnung: 459 − 109 = 350')).toBeNull();
    expect(checkStepText('95 : 8 = 11 Rest 7')).toBeNull();
    expect(checkStepText('1,5 m = 15 cm')).toMatch(/mismatch/);
    expect(checkStepText('95 : 8 = 11 Rest 6')).toMatch(/remainder/);
  });
});

describe('groessen: worked solutions are arithmetically correct and end with the result', () => {
  for (const skill of topic.skills) {
    it(skill.id, () => {
      const errors: string[] = [];
      for (const ctx of CTX) {
        for (const stufe of STUFEN) {
          for (let seed = 1; seed <= 120; seed++) {
            errors.push(...checkWorkedSolution(skill.generate(createRng(seed * 104729 + stufe), stufe, ctx)));
          }
        }
      }
      expect(errors.slice(0, 10)).toEqual([]);
    });
  }
});

describe('groessen topic module', () => {
  it('has 9 core skills plus the NRW option Tonnen, unique ids in teaching order', () => {
    const ids = topic.skills.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids[0]).toBe('groessen.geld');
    expect(topic.skills.filter((s) => !s.optional)).toHaveLength(9);
    expect(topic.skills.find((s) => s.id === 'groessen.tonnen')?.optional).toBe('nrw');
  });
  it('only uses the allowed units (no dm, cm², m², hl)', () => {
    for (const skill of topic.skills) {
      for (const stufe of STUFEN) {
        for (let seed = 1; seed <= 60; seed++) {
          const text = JSON.stringify(skill.generate(createRng(seed), stufe, CTX[1]));
          expect(text, skill.id).not.toMatch(/\d\s?(dm|cm²|m²|hl)\b/);
          if (skill.id !== 'groessen.tonnen') expect(text, skill.id).not.toMatch(/\d\u00A0t\b/);
        }
      }
    }
  });
});
