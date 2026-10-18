/**
 * Pure worksheet builder: same skills + Stufe + count + seed + ctx ⇒ identical sheet.
 * Item i uses deriveSeed(seed, i); repeats within a sheet are avoided via generateUnique.
 */
import { generateUnique } from '../../core/generate';
import { deriveSeed } from '../../core/rng';
import type { Exercise, GenContext, SkillDef, Step, Stufe } from '../../core/types';
import { KMK_TAGS, isKmkTag } from '../../data/curriculum';
import type { KmkTagId } from '../../data/curriculum';

export const TASK_COUNTS = [6, 10, 15] as const;
export type TaskCount = (typeof TASK_COUNTS)[number];

/** Largest seed (seeds are unsigned 32-bit integers). */
export const MAX_SEED = 4_294_967_295;

export interface Worksheet {
  exercises: Exercise[];
  /** Items whose generator threw (skipped, so one broken skill never blanks the whole sheet). */
  failed: number;
  /** KMK tag ids used on the sheet, in curriculum order. */
  kmk: KmkTagId[];
}

/** Distribute `count` tasks over the skills, grouped by skill in the given order (e.g. 10 over 3 → 4, 3, 3). */
export function assignSkills<T>(skills: readonly T[], count: number): T[] {
  if (skills.length === 0) return [];
  const base = Math.floor(count / skills.length);
  const extra = count % skills.length;
  return skills.flatMap((s, i) => Array.from({ length: base + (i < extra ? 1 : 0) }, () => s));
}

export function buildWorksheet(skills: readonly SkillDef[], stufe: Stufe, count: number, seed: number, ctx: GenContext): Worksheet {
  const seen = new Set<string>();
  const exercises: Exercise[] = [];
  let failed = 0;
  assignSkills(skills, count).forEach((skill, i) => {
    try {
      const ex = generateUnique(skill, stufe, deriveSeed(seed, i), ctx, seen);
      seen.add(ex.key);
      exercises.push(ex);
    } catch (err) {
      failed++;
      console.error(`Worksheet: generator ${skill.id} failed`, err);
    }
  });
  const used = new Set(exercises.flatMap((e) => e.kmk).filter(isKmkTag));
  const kmk = (Object.keys(KMK_TAGS) as KmkTagId[]).filter((id) => used.has(id));
  return { exercises, failed, kmk };
}

export function stepText(step: Step): string {
  return typeof step === 'string' ? step : step.text;
}

export function lastStepText(ex: Exercise): string {
  return ex.steps.length > 0 ? stepText(ex.steps[ex.steps.length - 1]) : '';
}

/** Accepts only plain digits (spaces ignored) in [0, MAX_SEED]. */
export function parseSeed(text: string): number | null {
  const t = text.replace(/[\s  ]/g, '');
  if (!/^\d{1,10}$/.test(t)) return null;
  const n = Number(t);
  return n <= MAX_SEED ? n : null;
}

/** Rotating 'Erkläre deinem Partner …' prompts (KMK process competence Kommunizieren). */
export const PARTNER_PROMPTS = [
  'Erkläre deinem Partner, wie du gerechnet hast.',
  'Erkläre deinem Partner, woran du gedacht hast.',
  'Erkläre deinem Partner, wie du dein Ergebnis prüfen kannst.',
] as const;

export function partnerPrompt(index: number): string {
  return PARTNER_PROMPTS[index % PARTNER_PROMPTS.length];
}

/** Context longer than this (characters) gets the full line width in print. */
export const COMPACT_CONTEXT_MAX = 160;

/**
 * Tasks that fit half the A4 width in print (two per row): no picture, a short or no context and a
 * small answer area (number, several numbers, or short choices like <, >, =). Everything else spans the
 * full width: pictures, number lines, grids, ordering, choice lists and written calculations (their
 * Kästchen rows are wider than half a page).
 */
export function isCompactTask(ex: Exercise): boolean {
  if (ex.visual) return false;
  if ((ex.context?.length ?? 0) > COMPACT_CONTEXT_MAX) return false;
  const a = ex.answer;
  switch (a.kind) {
    case 'number':
    case 'multi':
      return true;
    case 'choice':
      return (a.layout === 'symbols' || a.layout === 'scale') && a.options.every((o) => !o.visual);
    default:
      return false;
  }
}

/** In print, a small answer (one or a few numbers) sits next to the task's picture instead of below it. */
export function answerBesidePicture(ex: Exercise): boolean {
  return ex.visual !== undefined && (ex.answer.kind === 'number' || ex.answer.kind === 'multi');
}
