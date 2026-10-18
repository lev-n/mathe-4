import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import { createRng } from '../../core/rng';
import { fmt } from '../../core/format';
import type { Exercise, Stufe } from '../../core/types';
import { naeher, symbole, vergleichenSkill, ziffernZahl } from './vergleichen';

describeSkill(vergleichenSkill, { minDistinct: 20 });

const ctx = { subtractionMethod: 'abziehen', nrwExtras: false } as const;
const sample = (stufe: Stufe): Exercise[] => Array.from({ length: 300 }, (_, i) => vergleichenSkill.generate(createRng(900 + i), stufe, ctx));
const num = (s: string) => Number(s.replace(/\D/g, ''));

function permutations(d: number[]): number[][] {
  if (d.length <= 1) return [d];
  return d.flatMap((x, i) => permutations([...d.slice(0, i), ...d.slice(i + 1)]).map((p) => [x, ...p]));
}

describe('zahlen.vergleichen', () => {
  it('answers recomputed from the key', () => {
    for (const stufe of [1, 2, 3] as Stufe[]) {
      for (const ex of sample(stufe)) {
        const [, , kind, ...p] = ex.key.split(':');
        if (kind === 'symbole') {
          if (ex.answer.kind !== 'choice') throw new Error('choice');
          const a = Number(p[0]);
          const b = Number(p[1]);
          expect(ex.answer.options.map((o) => o.label)).toEqual(['<', '=', '>']);
          expect(ex.answer.options[ex.answer.correct].label).toBe(a < b ? '<' : a > b ? '>' : '=');
        } else if (kind === 'ordnen') {
          if (ex.answer.kind !== 'order') throw new Error('order');
          const order = ex.answer.correct.map((i) => num((ex.answer as { items: string[] }).items[i]));
          const want = [...order].sort((x, y) => (p[1] === 'aufsteigend' ? x - y : y - x));
          expect(order).toEqual(want);
          expect(order).toHaveLength(stufe === 1 ? 4 : 5);
          if (stufe === 2) {
            const digits = (x: number) => String(x).split('').sort().join('');
            order.forEach((x) => expect(digits(x)).toBe(digits(order[0])));
          }
        } else if (kind === 'naeher') {
          if (ex.answer.kind !== 'choice') throw new Error('choice');
          const [target, closer, farther] = p.map(Number);
          expect(Math.abs(target - closer)).toBeLessThan(Math.abs(target - farther));
          expect(ex.answer.options[ex.answer.correct].label.startsWith(fmt(closer))).toBe(true);
        } else if (kind === 'ziffern') {
          const digits = p[0].split('').map(Number);
          const all = permutations(digits).filter((d) => d[0] !== 0).map((d) => Number(d.join('')));
          expect(ex.answer).toMatchObject({ value: p[1] === 'groesste' ? Math.max(...all) : Math.min(...all) });
        } else {
          expect(kind).toBe('stimmt');
          if (ex.answer.kind !== 'choice') throw new Error('choice');
          const [a, b] = [Number(p[0]), Number(p[1])];
          const isTrue = p[2] === 'a' ? a > b : b > a;
          expect(ex.answer.options[ex.answer.correct].label.startsWith(isTrue ? 'Stimmt.' : 'Stimmt nicht')).toBe(true);
        }
      }
    }
  });

  it('Stufe 1 stays ≤ 100 000, Stufe 2 uses six-digit numbers', () => {
    for (const ex of sample(1)) for (const x of ex.key.split(':').slice(3)) if (/^\d+$/.test(x)) expect(Number(x)).toBeLessThanOrEqual(100_000);
    for (const ex of sample(2)) {
      if (!ex.key.includes(':symbole:')) continue;
      const [a, b] = ex.key.split(':').slice(3, 5).map(Number);
      expect(Math.max(a, b)).toBeGreaterThanOrEqual(100_000);
    }
  });

  it('symbol choices explain the misconception', () => {
    const ex = symbole(9_876, 12_345, 'zahl', 1);
    if (ex.answer.kind !== 'choice') throw new Error('choice');
    expect(ex.answer.options[ex.answer.correct].label).toBe('<');
    expect(ex.answer.options.find((o) => o.label === '>')?.whyWrong).toContain('Stellen');
  });

  it('smallest number never starts with 0 (bug: five-digit number)', () => {
    const ex = ziffernZahl([3, 0, 5, 8, 1, 7], 'kleinste');
    expect(ex.answer).toMatchObject({ value: 103_578 });
    expect(ex.bugs?.find((b) => b.id === 'null-vorne')?.match).toBe(13_578);
    expect(ziffernZahl([3, 0, 5, 8, 1, 7], 'groesste').answer).toMatchObject({ value: 875_310 });
  });
  it('näher an: no distractor carries a valid reason (size only argues when both lie on one side)', () => {
    const rng = createRng(1);
    // both below 1 000 000: 'denn sie ist größer' would be a valid argument, so it must not be a distractor
    const same = naeher(rng, 1_000_000, 910_000, 899_899);
    if (same.answer.kind !== 'choice') throw new Error('choice');
    for (const o of same.answer.options) expect(o.label).not.toMatch(/denn sie ist (größer|kleiner)/);
    const slip = same.answer.options.find((o) => o.label.startsWith(fmt(910_000)) && o.whyWrong);
    expect(slip?.label).toContain('9000');
    // on both sides of the target the size argument is wrong and stays as a distractor
    const both = naeher(rng, 100_000, 98_000, 104_000);
    if (both.answer.kind !== 'choice') throw new Error('choice');
    expect(both.answer.options.some((o) => o.whyWrong && /denn sie ist kleiner/.test(o.label))).toBe(true);
    for (const ex of sample(3)) {
      if (!ex.key.includes(':naeher:') || ex.answer.kind !== 'choice') continue;
      const [target, closer, farther] = ex.key.split(':').slice(3).map(Number);
      if ((closer < target) !== (farther < target)) continue;
      for (const o of ex.answer.options) expect(o.label).not.toMatch(/denn sie ist (größer|kleiner)/);
    }
  });

  it('screen-reader text spells out Stufenschrift place names', () => {
    const ex = symbole(588_631, 588_631, 'stufenschrift', 2);
    expect(ex.srText).toContain('5 Hunderttausender, 8 Zehntausender');
    expect(ex.srText).not.toMatch(/\b(HT|ZT|T|H|Z|E)\b/);
  });
});

