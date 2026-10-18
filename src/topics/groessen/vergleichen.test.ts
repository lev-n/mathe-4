import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import { bareNumber, vergleichenSkill } from './vergleichen';
import { checkAnswer, responseForBug } from '../../core/check';
import { evalSide } from './step-check';
import { samples } from './test-utils';

describeSkill(vergleichenSkill, { minDistinct: 40 });

const value = (label: string) => Math.round(evalSide(label)!.value * 1e6) / 1e6;

describe('groessen.vergleichen specifics', () => {
  it('compare: the chosen symbol matches an independent comparison in base units', () => {
    let seen = 0;
    for (const stufe of [1, 2] as const) {
      for (const ex of samples(vergleichenSkill, stufe)) {
        if (ex.answer.kind !== 'choice' || !ex.expression) continue;
        seen++;
        const [l, r] = ex.expression.split(' □ ');
        const a = value(l);
        const b = value(r);
        const expected = a < b ? '<' : a > b ? '>' : '=';
        expect(ex.answer.options[ex.answer.correct].label).toBe(expected);
        expect(ex.answer.options.map((o) => o.label)).toEqual(['<', '>', '=']);
      }
    }
    expect(seen).toBeGreaterThan(50);
  });

  it('order: the correct order is sorted by value; values are distinct; several notations are mixed', () => {
    let seen = 0;
    for (const stufe of [2, 3] as const) {
      for (const ex of samples(vergleichenSkill, stufe)) {
        if (ex.answer.kind !== 'order') continue;
        seen++;
        const vals = ex.answer.items.map(value);
        expect(new Set(vals).size).toBe(vals.length);
        const ordered = ex.answer.correct.map((i) => vals[i]);
        const sorted = [...ordered].sort((x, y) => (ex.answer.kind === 'order' && ex.answer.direction === 'aufsteigend' ? x - y : y - x));
        expect(ordered).toEqual(sorted);
        expect(ex.answer.items.length).toBe(stufe === 3 ? 5 : 4);
      }
    }
    expect(seen).toBeGreaterThan(100);
  });

  it('Stufe 3: largest/smallest and odd-one-out are unambiguous', () => {
    for (const ex of samples(vergleichenSkill, 3)) {
      const ans = ex.answer;
      if (ans.kind !== 'choice') continue;
      const vals = ans.options.map((o) => value(o.label));
      const right = vals[ans.correct];
      if (/größte/.test(ex.prompt)) expect(right).toBe(Math.max(...vals));
      else if (/kleinste/.test(ex.prompt)) expect(right).toBe(Math.min(...vals));
      else {
        const others = vals.filter((_, i) => i !== ans.correct);
        expect(new Set(others).size).toBe(1);
        expect(right).not.toBe(others[0]);
      }
    }
  });
});

describe('groessen.vergleichen: units-ignored order bug', () => {
  it('reads the leading number as written', () => {
    expect(bareNumber('2 m 5 cm')).toBe(2);
    expect(bareNumber('250 cm')).toBe(250);
    expect(bareNumber('2,15 m')).toBe(2.15);
    expect(bareNumber('1\u202F250 g')).toBe(1250);
    expect(bareNumber('½ kg')).toBeNull();
  });
  it('the bug order sorts by the bare numbers and returns its hint', () => {
    let seen = 0;
    for (const stufe of [2, 3] as const) {
      for (const ex of samples(vergleichenSkill, stufe)) {
        if (ex.answer.kind !== 'order' || !ex.bugs?.length) continue;
        seen++;
        const bug = ex.bugs.find((b) => b.id === 'nur-zahlen-verglichen')!;
        const nums = ex.answer.items.map((t) => bareNumber(t)!);
        const order = bug.match as number[];
        for (let i = 1; i < order.length; i++) {
          const [p, c] = [nums[order[i - 1]], nums[order[i]]];
          expect(ex.answer.direction === 'aufsteigend' ? p < c : p > c).toBe(true);
        }
        expect(checkAnswer(ex.answer, responseForBug(ex.answer, bug)!, ex.bugs).bugHint).toMatch(/Einheiten/);
      }
    }
    expect(seen).toBeGreaterThan(10);
  });
});
