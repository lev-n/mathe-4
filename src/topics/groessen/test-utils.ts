/** Test support (imported only by *.test.ts). */
import { createRng } from '../../core/rng';
import type { Exercise, GenContext, SkillDef, Stufe } from '../../core/types';

export const CTX: GenContext = { subtractionMethod: 'abziehen', nrwExtras: true };

/** n exercises of one Stufe (seeds differ from the shared suite's seeds). */
export function samples(skill: SkillDef, stufe: Stufe, n = 300): Exercise[] {
  return Array.from({ length: n }, (_, i) => skill.generate(createRng(i * 7717 + 13 + stufe), stufe, CTX));
}

/** Parse German numbers like '1 250', '3,45' (U+202F/NBSP tolerant). */
export function num(text: string): number {
  return Number(text.replace(/[\u202F\u00A0 ]/g, '').replace(',', '.'));
}

/** Cent value of a money string '3,45 €'. */
export function cents(text: string): number {
  return Math.round(num(text.replace('€', '')) * 100);
}

/** Minutes since midnight for every 'HH:MM Uhr' in a text. */
export function times(text: string): number[] {
  return [...text.matchAll(/(\d{1,2}):(\d\d)\u00A0Uhr/g)].map((m) => Number(m[1]) * 60 + Number(m[2]));
}
