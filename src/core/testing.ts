/**
 * Shared invariant suite for exercise generators. Only imported by *.test.ts files.
 *
 * Usage in a topic test:
 *   import { describeSkill } from '../../core/testing';
 *   describeSkill(rundenSkill, { minDistinct: 30 });
 */
import { describe, expect, it } from 'vitest';
import { checkAnswer, correctResponse, responseForBug } from './check';
import { fmt } from './format';
import { createRng } from './rng';
import { isKmkTag } from '../data/curriculum';
import type { Answer, Exercise, GenContext, SkillDef, Stufe, Visual } from './types';
import { STUFEN } from './types';

/** Phrases that must never appear (docs/research.md §6.4 and M15). Matched case-insensitively as whole words. */
export const BANNED_PHRASES = [
  'falsch', 'leider', 'konzentrier', 'schlau', 'genie', 'naturtalent', 'perfekt', 'unglaublich', 'fantastisch',
  'weltklasse', 'zu langsam', 'so schnell', 'schon wieder', 'war doch einfach', 'alle anderen',
];

/**
 * Extra traps of improvement praise (docs/research.md M15 "Verbesserung", M16): pressure, inflation, comparison
 * with others and error framing. Checked on every improvement text (round notes, progress view, badges).
 */
export const IMPROVEMENT_BANNED_PHRASES = [
  ...BANNED_PHRASES,
  'endlich', 'na also', 'besser als', 'andere kinder', 'viel besser', 'keine fehler', 'nie wieder', 'fehlerfrei',
];

const CONTEXTS: GenContext[] = [
  { subtractionMethod: 'abziehen', nrwExtras: false, today: '2026-10-19' },
  { subtractionMethod: 'ergaenzen', nrwExtras: true, today: '2026-10-19' },
];

function allStrings(value: unknown, out: string[] = []): string[] {
  if (typeof value === 'string') out.push(value);
  else if (Array.isArray(value)) value.forEach((v) => allStrings(v, out));
  else if (value && typeof value === 'object') Object.values(value).forEach((v) => allStrings(v, out));
  return out;
}

function allNumbers(value: unknown, out: number[] = []): number[] {
  if (typeof value === 'number') out.push(value);
  else if (Array.isArray(value)) value.forEach((v) => allNumbers(v, out));
  else if (value && typeof value === 'object') Object.values(value).forEach((v) => allNumbers(v, out));
  return out;
}

export function assertWellFormedAnswer(answer: Answer): void {
  switch (answer.kind) {
    case 'number':
      if (answer.value === null) expect(answer.offerUnsolvable, 'value null requires offerUnsolvable').toBe(true);
      else expect(Number.isFinite(answer.value)).toBe(true);
      if (answer.value !== null && !answer.decimals) expect(Number.isInteger(answer.value), `integer answer expected, got ${answer.value}`).toBe(true);
      break;
    case 'choice': {
      expect(answer.options.length).toBeGreaterThanOrEqual(2);
      expect(answer.options.length).toBeLessThanOrEqual(8);
      expect(answer.correct).toBeGreaterThanOrEqual(0);
      expect(answer.correct).toBeLessThan(answer.options.length);
      const labels = answer.options.map((o) => o.label + JSON.stringify(o.visual ?? null));
      expect(new Set(labels).size, `duplicate choice options: ${labels.join(' | ')}`).toBe(labels.length);
      expect(answer.options[answer.correct].whyWrong, 'correct option must not have whyWrong').toBeUndefined();
      break;
    }
    case 'multi': {
      expect(answer.fields.length).toBeGreaterThanOrEqual(1);
      expect(new Set(answer.fields.map((f) => f.id)).size).toBe(answer.fields.length);
      for (const f of answer.fields) {
        expect(Number.isFinite(f.value)).toBe(true);
        if (!f.decimals) expect(Number.isInteger(f.value)).toBe(true);
      }
      break;
    }
    case 'written': {
      const ops = answer.operands;
      ops.forEach((o) => expect(Number.isInteger(o) && o >= 0, `operand ${o}`).toBe(true));
      if (answer.op === 'add') {
        expect(ops.length).toBeGreaterThanOrEqual(2);
        expect(answer.result).toBe(ops.reduce((a, b) => a + b, 0));
      } else if (answer.op === 'sub') {
        expect(ops.length).toBe(2);
        expect(answer.result).toBe(ops[0] - ops[1]);
        expect(answer.result).toBeGreaterThanOrEqual(0);
      } else if (answer.op === 'mul') {
        expect(ops.length).toBe(2);
        expect(answer.result).toBe(ops[0] * ops[1]);
      } else {
        expect(ops.length).toBe(2);
        expect(ops[1]).toBeGreaterThan(0);
        expect(answer.result).toBe(Math.floor(ops[0] / ops[1]));
        expect(answer.remainder ?? 0).toBe(ops[0] % ops[1]);
      }
      expect(answer.result).toBeLessThanOrEqual(1_000_000);
      break;
    }
    case 'cells': {
      const inside = (c: readonly [number, number]) => c[0] >= 0 && c[1] >= 0 && c[0] < answer.width && c[1] < answer.height;
      answer.given.forEach((c) => expect(inside(c)).toBe(true));
      answer.solution.forEach((c) => expect(inside(c)).toBe(true));
      expect(answer.solution.length).toBeGreaterThan(0);
      const given = new Set(answer.given.map((c) => c.join()));
      answer.solution.forEach((c) => expect(given.has(c.join()), 'solution overlaps given').toBe(false));
      break;
    }
    case 'numberline':
      expect(answer.value).toBeGreaterThanOrEqual(answer.min);
      expect(answer.value).toBeLessThanOrEqual(answer.max);
      expect(answer.step).toBeGreaterThan(0);
      expect(answer.max).toBeGreaterThan(answer.min);
      expect(Math.abs(((answer.value - answer.min) / answer.step) - Math.round((answer.value - answer.min) / answer.step))).toBeLessThan(1e-9);
      break;
    case 'order': {
      expect(answer.items.length).toBeGreaterThanOrEqual(2);
      expect([...answer.correct].sort((a, b) => a - b)).toEqual(answer.items.map((_, i) => i));
      break;
    }
  }
}

export function assertWellFormedVisual(v: Visual): void {
  switch (v.type) {
    case 'placeValue':
      v.rows.forEach((r) => expect(r.values.length).toBe(v.columns.length));
      break;
    case 'numberLine':
      expect(v.max).toBeGreaterThan(v.min);
      expect(v.minorStep).toBeGreaterThan(0);
      expect((v.max - v.min) / v.minorStep, 'too many ticks').toBeLessThanOrEqual(200);
      (v.marks ?? []).forEach((m) => {
        expect(m.value).toBeGreaterThanOrEqual(v.min);
        expect(m.value).toBeLessThanOrEqual(v.max);
      });
      break;
    case 'barChart':
    case 'pictogram':
      expect(v.values.length).toBe(v.categories.length);
      break;
    case 'grid':
      v.cells.forEach((c) => {
        expect(c[0]).toBeLessThan(v.width);
        expect(c[1]).toBeLessThan(v.height);
      });
      break;
    case 'clock':
      expect(v.hours).toBeGreaterThanOrEqual(0);
      expect(v.hours).toBeLessThan(24);
      expect(v.minutes).toBeGreaterThanOrEqual(0);
      expect(v.minutes).toBeLessThan(60);
      break;
    default:
      break;
  }
}

export function assertWellFormedExercise(skill: SkillDef, stufe: Stufe, ex: Exercise): void {
  expect(ex.skillId).toBe(skill.id);
  expect(ex.topicId).toBe(skill.topicId);
  expect(ex.stufe).toBe(stufe);
  expect([1, 2, 3]).toContain(ex.ab);
  expect(ex.key.length).toBeGreaterThan(0);
  expect(ex.key.startsWith(skill.id), `key must start with skill id: ${ex.key}`).toBe(true);
  expect(ex.prompt.trim().length).toBeGreaterThan(0);
  expect(ex.hints.length).toBeGreaterThanOrEqual(1);
  expect(ex.steps.length).toBeGreaterThanOrEqual(1);
  expect(ex.praise.trim().length).toBeGreaterThan(0);
  expect(ex.srText.trim().length).toBeGreaterThan(0);
  expect(ex.kmk.length).toBeGreaterThanOrEqual(1);
  ex.kmk.forEach((t) => expect(isKmkTag(t), `unknown KMK tag ${t}`).toBe(true));

  // Bug ids are internal (never shown to children), so they are exempt from the wording checks.
  const strings = allStrings({ ...ex, bugs: ex.bugs?.map(({ id: _id, ...shown }) => shown) });
  for (const s of strings) {
    expect(/\bundefined\b|\bNaN\b|\[object|\bInfinity\b/.test(s), `suspicious text: "${s}"`).toBe(false);
    const lower = s.toLowerCase();
    for (const banned of BANNED_PHRASES) {
      const re = new RegExp(`(^|[^a-zäöüß])${banned}([^a-zäöüß]|$)`);
      expect(re.test(lower), `banned phrase "${banned}" in "${s}"`).toBe(false);
    }
    expect(s.includes('×') || s.includes('÷'), `use · and : instead of × ÷ in "${s}"`).toBe(false);
  }
  allNumbers(ex).forEach((n) => expect(Number.isFinite(n), 'non-finite number in exercise').toBe(true));

  assertWellFormedAnswer(ex.answer);
  if (ex.visual) assertWellFormedVisual(ex.visual);

  // The correct response is accepted.
  const ok = checkAnswer(ex.answer, correctResponse(ex.answer), ex.bugs);
  expect(ok.correct, `correct response rejected for ${ex.key}: ${JSON.stringify(ok)}`).toBe(true);

  // Bugs never coincide with the correct answer and always produce their hint.
  for (const bug of ex.bugs ?? []) {
    const r = responseForBug(ex.answer, bug);
    if (!r) continue;
    const res = checkAnswer(ex.answer, r, ex.bugs);
    expect(res.correct, `bug ${bug.id} equals the correct answer in ${ex.key}`).toBe(false);
    expect(res.invalid, `bug ${bug.id} response is not parseable in ${ex.key}`).toBeUndefined();
    expect(res.bugHint, `bug ${bug.id} hint not returned`).toBeTruthy();
  }

  // Hints never give away a numeric answer of 3+ digits.
  if (ex.answer.kind === 'number' && ex.answer.value !== null && Math.abs(ex.answer.value) >= 100) {
    const shown = fmt(ex.answer.value);
    ex.hints.forEach((h) => expect(h.includes(shown), `hint reveals answer ${shown}: "${h}"`).toBe(false));
  }
}

export interface SkillSuiteOptions {
  /** Samples per Stufe and context (default 150). */
  samples?: number;
  /** Minimum number of distinct exercise keys per Stufe across samples (default 20). */
  minDistinct?: number | Partial<Record<Stufe, number>>;
  /** Stufen to test (default all). */
  stufen?: Stufe[];
}

/** Registers a vitest suite that checks every invariant above for one skill. */
export function describeSkill(skill: SkillDef, opts: SkillSuiteOptions = {}): void {
  const samples = opts.samples ?? 150;
  describe(`skill ${skill.id}`, () => {
    it('has complete metadata', () => {
      expect(skill.id.startsWith(skill.topicId + '.')).toBe(true);
      expect(skill.title.trim()).not.toBe('');
      expect(skill.description.trim()).not.toBe('');
      STUFEN.forEach((s) => expect(skill.stufen[s].trim()).not.toBe(''));
      skill.kmk.forEach((t) => expect(isKmkTag(t), `unknown KMK tag ${t}`).toBe(true));
    });
    for (const stufe of opts.stufen ?? STUFEN) {
      it(`Stufe ${stufe}: ${samples} samples are well-formed, deterministic and varied`, () => {
        for (const ctx of CONTEXTS) {
          const keys = new Set<string>();
          for (let seed = 1; seed <= samples; seed++) {
            const ex = skill.generate(createRng(seed * 7919 + stufe), stufe, ctx);
            assertWellFormedExercise(skill, stufe, ex);
            keys.add(ex.key);
            if (seed <= 5) {
              const again = skill.generate(createRng(seed * 7919 + stufe), stufe, ctx);
              expect(JSON.stringify(again)).toBe(JSON.stringify(ex));
            }
          }
          const min = typeof opts.minDistinct === 'number' ? opts.minDistinct : (opts.minDistinct?.[stufe] ?? 20);
          expect(keys.size, `only ${keys.size} distinct exercises at Stufe ${stufe}`).toBeGreaterThanOrEqual(Math.min(min, samples));
        }
      });
    }
  });
}
