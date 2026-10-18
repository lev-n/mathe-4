/** Helpers for the schriftlich tests (independent re-computations; imported by *.test.ts only). */
import { createRng } from '../../core/rng';
import type { Exercise, GenContext, SkillDef, Stufe, VisualOf } from '../../core/types';

export const ABZ: GenContext = { subtractionMethod: 'abziehen', nrwExtras: false };
export const ERG: GenContext = { subtractionMethod: 'ergaenzen', nrwExtras: false };
export const NRW: GenContext = { subtractionMethod: 'abziehen', nrwExtras: true };

export function samples(skill: SkillDef, stufe: Stufe, ctx: GenContext = ABZ, n = 250): Exercise[] {
  return Array.from({ length: n }, (_, i) => skill.generate(createRng(1000 + i * 31 + stufe), stufe, ctx));
}

export const len = (n: number) => String(n).length;
export const digits = (n: number) => String(n).split('').map(Number);

/** Number of columns with a carry out (plain column addition). */
export function carries(ops: readonly number[]): number[] {
  const out: number[] = [];
  let c = 0;
  const max = Math.max(...ops.map(len));
  for (let p = 0; p < max; p++) {
    const s = ops.reduce((acc, n) => acc + (Math.floor(n / 10 ** p) % 10), 0) + c;
    c = Math.floor(s / 10);
    out.push(c);
  }
  return out;
}

/** Number of places where a borrow is needed (a − b). */
export function borrows(a: number, b: number): number {
  let n = 0;
  for (let p = 0; p < len(a); p++) if (a % 10 ** (p + 1) < b % 10 ** (p + 1)) n++;
  return n;
}

/** Round to the highest place, computed via strings. */
export function roundToLead(n: number): number {
  const s = String(n);
  if (s.length === 1) return n;
  const head = Number(s[0]);
  const up = Number(s[1]) >= 5 ? 1 : 0;
  return (head + up) * 10 ** (s.length - 1);
}

export function stepTexts(ex: Exercise): string[] {
  return ex.steps.map((s) => (typeof s === 'string' ? s : s.text));
}

export function lastStepVisual(ex: Exercise): VisualOf<'written'> | undefined {
  const last = ex.steps[ex.steps.length - 1];
  return typeof last === 'string' || !last.visual || last.visual.type !== 'written' ? undefined : last.visual;
}

/** Evaluate 'a op b' written in German notation ('4 567 + 2 845', '624 · 315', '5 432 : 4'). */
export function evalExpr(expr: string): number {
  const clean = expr.replace(/ /g, '');
  const m = clean.match(/^(\d+) ([+−·:]) (\d+)$/);
  if (!m) throw new Error(`cannot evaluate ${expr}`);
  const a = Number(m[1]);
  const b = Number(m[3]);
  return m[2] === '+' ? a + b : m[2] === '−' ? a - b : m[2] === '·' ? a * b : a / b;
}
