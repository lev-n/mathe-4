/** Test helpers for the daten topic. Only imported by *.test.ts files. */
import { createRng } from '../../core/rng';
import type { Exercise, GenContext, SkillDef, Stufe } from '../../core/types';

export const CTX: GenContext = { subtractionMethod: 'abziehen', nrwExtras: false };

/** Generate `count` exercises for a Stufe with deterministic seeds. */
export function samples(skill: SkillDef, stufe: Stufe, count = 300): Exercise[] {
  const out: Exercise[] = [];
  for (let seed = 1; seed <= count; seed++) out.push(skill.generate(createRng(seed * 104729 + stufe * 13), stufe, CTX));
  return out;
}

/** Exercises whose key contains `/:<mode>:/`. */
export function byMode(list: Exercise[], mode: string): Exercise[] {
  return list.filter((e) => e.key.split(':')[2] === mode);
}

/** Parse the key part at position i (0 = skill id). */
export function keyPart(e: Exercise, i: number): string {
  return e.key.split(':')[i];
}

export function nums(part: string): number[] {
  return part.split('-').map(Number);
}

export function allText(value: unknown, out: string[] = []): string[] {
  if (typeof value === 'string') out.push(value);
  else if (Array.isArray(value)) value.forEach((v) => allText(v, out));
  else if (value && typeof value === 'object') Object.values(value).forEach((v) => allText(v, out));
  return out;
}
