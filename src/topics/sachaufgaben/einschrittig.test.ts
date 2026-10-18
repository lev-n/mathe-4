import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import { checkAnswer } from '../../core/check';
import { createRng } from '../../core/rng';
import { einschrittigSkill } from './einschrittig';
import { oneStepStory, opResult, TEMPLATES, type Op } from './stories';
import { samples } from '../groessen/test-utils';

describeSkill(einschrittigSkill, { minDistinct: 40 });

const numbersIn = (text: string) => [...text.replace(/\u202F/g, '').matchAll(/\d+/g)].map((m) => Number(m[0]));

describe('sachaufgaben.einschrittig specifics', () => {
  it('the answer is the result of the story operation on the two story numbers (independent)', () => {
    for (const stufe of [1, 2, 3] as const) {
      for (let seed = 1; seed <= 300; seed++) {
        const st = oneStepStory(createRng(seed * 31 + stufe), stufe);
        expect(Number.isInteger(st.value) && st.value > 0, st.key).toBe(true);
        expect(st.value).toBe(opResult(st.op, st.a, st.b));
        const nums = numbersIn(st.context);
        expect(nums, st.key).toEqual(expect.arrayContaining(st.op === '-' && st.key.startsWith('aenderung') ? [st.a, st.b] : [st.a, st.b].filter((x) => !(st.key.startsWith('mal-so-viele') && x === st.b))));
      }
    }
  });

  it('number range: ≤ 1000 on Stufe 1, ≤ 10 000 on Stufe 2', () => {
    for (const [stufe, max] of [[1, 1000], [2, 10000]] as const) {
      for (const ex of samples(einschrittigSkill, stufe)) {
        numbersIn(ex.context! + ' ' + String(ex.answer.kind === 'number' ? ex.answer.value : '')).forEach((n) => expect(n, ex.key).toBeLessThanOrEqual(max));
      }
    }
  });

  it('all four operations occur and "insgesamt" is not tied to one operation', () => {
    const opsWithInsgesamt = new Set<Op>();
    const ops = new Set<Op>();
    for (const op of ['+', '-', '*', ':'] as const) {
      for (const t of TEMPLATES[op]) {
        for (let seed = 1; seed <= 5; seed++) {
          const st = t(createRng(seed), 2, { name: 'Lena', p: 'sie' }, { name: 'Ben', p: 'er' });
          ops.add(st.op);
          if (/insgesamt/i.test(st.context + st.question)) opsWithInsgesamt.add(st.op);
        }
      }
    }
    expect(ops.size).toBe(4);
    expect(opsWithInsgesamt.size).toBeGreaterThanOrEqual(3);
  });

  it('Stufe 3: tricky wording is frequent and the keyword trap gets a situation hint', () => {
    const ex3 = samples(einschrittigSkill, 3);
    const tricky = ex3.filter((e) => e.knobel);
    expect(tricky.length).toBeGreaterThan(ex3.length * 0.4);
    const mehrAls = ex3.find((e) => /mehr, als/.test(e.context ?? ''))!;
    const [a, b] = numbersIn(mehrAls.context!);
    const r = checkAnswer(mehrAls.answer, { kind: 'number', text: String(a + b) }, mehrAls.bugs);
    expect(r.correct).toBe(false);
    expect(r.bugHint).toMatch(/also weniger/);
  });

  it('answers are embedded in an Antwortsatz (after-text always present)', () => {
    for (const ex of samples(einschrittigSkill, 2, 50)) {
      expect(ex.answer.kind === 'number' && ex.answer.after).toBeTruthy();
    }
  });
});
