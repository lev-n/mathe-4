import { createRng, deriveSeed } from './rng';
import type { Exercise, GenContext, SkillDef, Stufe } from './types';

export const DEFAULT_CONTEXT: GenContext = { subtractionMethod: 'abziehen', nrwExtras: false };

/**
 * Generate an exercise whose key is not in `recent` (tries up to 30 derived seeds).
 * Falls back to the last attempt if the skill's variety is exhausted.
 */
export function generateUnique(
  skill: SkillDef,
  stufe: Stufe,
  seed: number,
  ctx: GenContext = DEFAULT_CONTEXT,
  recent: ReadonlySet<string> = new Set(),
): Exercise {
  let ex = skill.generate(createRng(seed), stufe, ctx);
  for (let i = 1; i < 30 && recent.has(ex.key); i++) {
    ex = skill.generate(createRng(deriveSeed(seed, i)), stufe, ctx);
  }
  return ex;
}
