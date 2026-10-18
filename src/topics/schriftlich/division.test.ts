import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import { checkAnswer } from '../../core/check';
import { divisionSkill } from './division';
import { ABZ, digits, len, samples, stepTexts } from './test-helpers';

describeSkill(divisionSkill, { minDistinct: 20 });

const quotientHasZero = (q: number) => String(q).includes('0');

describe('schriftlich.division: Stufe bounds and correctness', () => {
  it('Stufe 1: 3–4-digit Dividend, divisor 2–9, no Rest, no zero in the quotient', () => {
    let small = 0;
    for (const ex of samples(divisionSkill, 1)) {
      if (ex.answer.kind !== 'written') throw new Error('written expected');
      const [a, d] = ex.answer.operands;
      expect(len(a)).toBeGreaterThanOrEqual(3);
      expect(len(a)).toBeLessThanOrEqual(4);
      expect(d).toBeGreaterThanOrEqual(2);
      expect(d).toBeLessThanOrEqual(9);
      expect(a % d).toBe(0);
      expect(ex.answer.result * d).toBe(a);
      expect(ex.answer.remainder ?? 0).toBe(0);
      expect(quotientHasZero(ex.answer.result)).toBe(false);
      if (digits(a)[0] < d) small++;
    }
    expect(small).toBeGreaterThan(0); // first partial dividend smaller than the divisor
  });

  it('Stufe 2: 4–6 digits, zeros in the quotient and/or a Rest, divisor ≤ 10', () => {
    let zeros = 0;
    let rests = 0;
    for (const ex of samples(divisionSkill, 2)) {
      if (ex.answer.kind !== 'written') throw new Error('written expected');
      const [a, d] = ex.answer.operands;
      expect(len(a)).toBeGreaterThanOrEqual(4);
      expect(len(a)).toBeLessThanOrEqual(6);
      expect(d).toBeGreaterThanOrEqual(2);
      expect(d).toBeLessThanOrEqual(10);
      expect(ex.answer.result).toBe(Math.floor(a / d));
      expect(ex.answer.remainder).toBe(a % d);
      const hasZero = quotientHasZero(ex.answer.result);
      expect(hasZero || a % d > 0).toBe(true);
      if (hasZero) zeros++;
      if (a % d > 0) rests++;
      expect(stepTexts(ex)[0]).toMatch(/^Überschlag: /);
      expect(stepTexts(ex).pop()).toMatch(/Probe: /);
    }
    expect(zeros).toBeGreaterThan(50);
    expect(rests).toBeGreaterThan(50);
  });

  it('Stufe 3: 5–6 digits, never a divisor ≥ 11; Knobel answers are correct', () => {
    for (const ex of samples(divisionSkill, 3)) {
      if (ex.answer.kind === 'written') {
        const [a, d] = ex.answer.operands;
        expect(len(a)).toBeGreaterThanOrEqual(5);
        expect(d).toBeLessThanOrEqual(10);
        expect(ex.answer.result).toBe(Math.floor(a / d));
        expect(quotientHasZero(ex.answer.result)).toBe(true);
      } else if (ex.answer.kind === 'number') {
        const v = ex.answer.value ?? NaN;
        const fit = ex.key.match(/aufgehen:(\d+)\/(\d+)/);
        const up = ex.key.match(/aufrunden:(\d+)\/(\d+)/);
        if (fit) {
          const [a, d] = [Number(fit[1]), Number(fit[2])];
          expect((a + v) % d).toBe(0);
          expect(v).toBeGreaterThan(0);
          expect(v).toBeLessThan(d);
        } else if (up) {
          expect(v).toBe(Math.ceil(Number(up[1]) / Number(up[2])));
        } else throw new Error(`unexpected key ${ex.key}`);
      }
    }
  });

  it('bug: missing zero in the quotient gets a targeted hint', () => {
    const ex = samples(divisionSkill, 2, ABZ).find((e) => e.bugs?.some((b) => b.id === 'div.missing-zero'));
    if (!ex || ex.answer.kind !== 'written') throw new Error('no item');
    const without = Number(String(ex.answer.result).replace(/^(\d*?[1-9])(0+)(?=[1-9])/, '$1'));
    const r = checkAnswer(ex.answer, { kind: 'written', result: String(without), remainder: String(ex.answer.remainder ?? ''), ueberschlag: String(ex.answer.ueberschlag ?? '') }, ex.bugs);
    expect(r.correct).toBe(false);
    expect(r.bugHint).toMatch(/eine 0 ins Ergebnis/);
  });

  it('bug: a forgotten Rest (correct quotient) gets its own hint (Bug.remainder)', () => {
    const ex = samples(divisionSkill, 2).find((e) => e.answer.kind === 'written' && (e.answer.remainder ?? 0) > 0);
    if (!ex || ex.answer.kind !== 'written') throw new Error('no item with a Rest');
    expect(ex.bugs?.some((b) => b.id === 'div.rest-vergessen' && b.remainder === 0)).toBe(true);
    for (const remainder of ['', '0']) {
      const r = checkAnswer(ex.answer, { kind: 'written', result: String(ex.answer.result), remainder, ueberschlag: String(ex.answer.ueberschlag ?? '') }, ex.bugs);
      expect(r.correct).toBe(false);
      expect(r.remainderCorrect).toBe(false);
      expect(r.bugHint).toMatch(/Rest/);
    }
    // a wrong (non-zero) remainder is not "forgotten"
    const other = checkAnswer(ex.answer, { kind: 'written', result: String(ex.answer.result), remainder: String((ex.answer.remainder ?? 0) + 1), ueberschlag: String(ex.answer.ueberschlag ?? '') }, ex.bugs);
    expect(other.bugHint).toBeUndefined();
  });

  it('the solution step shows the one-line notation with R and the Probe', () => {
    const ex = samples(divisionSkill, 2).find((e) => e.answer.kind === 'written' && (e.answer.remainder ?? 0) > 0)!;
    if (ex.answer.kind !== 'written') return;
    const last = stepTexts(ex).pop()!;
    expect(last).toMatch(/ : \d+ = [\d ]+ R \d+\. Probe: [\d ]+ · \d+ \+ \d+ = [\d ]+\./);
  });
});
