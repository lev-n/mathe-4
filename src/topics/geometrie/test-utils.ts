/** Helpers for the geometry tests (imported by *.test.ts only). */
import { createRng } from '../../core/rng';
import type { Exercise, GenContext, SkillDef, Stufe, Visual } from '../../core/types';

export const CTX: GenContext = { subtractionMethod: 'abziehen', nrwExtras: false };

/** n exercises for a Stufe with seeds 1…n (deterministic). */
export function samples(skill: SkillDef, stufe: Stufe, n = 300): Exercise[] {
  return Array.from({ length: n }, (_, i) => skill.generate(createRng(i * 104729 + 17 + stufe), stufe, CTX));
}

export function gridOf(ex: Exercise): Extract<Visual, { type: 'grid' }> {
  if (!ex.visual || ex.visual.type !== 'grid') throw new Error(`no grid visual in ${ex.key}`);
  return ex.visual;
}

/** Independent perimeter count: unit edges between a filled and an empty cell. */
export function countPerimeter(cells: readonly (readonly [number, number])[]): number {
  const set = new Set(cells.map((c) => `${c[0]},${c[1]}`));
  let p = 0;
  for (const [x, y] of cells) {
    if (!set.has(`${x - 1},${y}`)) p++;
    if (!set.has(`${x + 1},${y}`)) p++;
    if (!set.has(`${x},${y - 1}`)) p++;
    if (!set.has(`${x},${y + 1}`)) p++;
  }
  return p;
}

export function bugValue(ex: Exercise, id: string): number | undefined {
  const b = ex.bugs?.find((x) => x.id === id);
  return b && typeof b.match === 'number' ? b.match : undefined;
}

export function numberValue(ex: Exercise): number {
  if (ex.answer.kind !== 'number' || ex.answer.value === null) throw new Error(`not a number answer: ${ex.key}`);
  return ex.answer.value;
}
