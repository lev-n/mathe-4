import { describe, expect, it } from 'vitest';
import { createRng } from '../../core/rng';
import { STUFEN, type GenContext } from '../../core/types';
import topic from './index';
import { checkWorkedSolution } from '../groessen/step-check';

const CTX: GenContext[] = [
  { subtractionMethod: 'abziehen', nrwExtras: false },
  { subtractionMethod: 'ergaenzen', nrwExtras: true },
];

describe('sachaufgaben: worked solutions are arithmetically correct and end with the result', () => {
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

describe('sachaufgaben topic module', () => {
  it('has 7 skills with unique ids, starting with one-step stories', () => {
    const ids = topic.skills.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids[0]).toBe('sachaufgaben.einschrittig');
    expect(ids).toHaveLength(7);
    expect(topic.skills.every((s) => !s.optional)).toBe(true);
  });

  it('uses no brand names and only everyday, child-appropriate contexts', () => {
    const banned = /\b(Diät\w*|abnehmen|Schulden|Kredit\w*|Waffen?\b|Krieg\w*|kämpf\w*|McDonald|Coca|Lego|Nintendo|Amazon)/i;
    for (const skill of topic.skills) {
      for (const stufe of STUFEN) {
        for (let seed = 1; seed <= 80; seed++) {
          const ex = skill.generate(createRng(seed), stufe, CTX[0]);
          expect(JSON.stringify(ex), skill.id).not.toMatch(banned);
        }
      }
    }
  });
});
