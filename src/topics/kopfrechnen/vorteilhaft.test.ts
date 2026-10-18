import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import { createRng } from '../../core/rng';
import type { Exercise, Stufe } from '../../core/types';
import { ausgleichPlus, gleichesErgebnis, konstanz, luecke, vorteilhaftSkill } from './vorteilhaft';

describeSkill(vorteilhaftSkill, { minDistinct: 20 });

const ctx = { subtractionMethod: 'abziehen', nrwExtras: false } as const;
const sample = (stufe: Stufe): Exercise[] => Array.from({ length: 300 }, (_, i) => vorteilhaftSkill.generate(createRng(9090 + i), stufe, ctx));
const bug = (ex: Exercise, id: string) => ex.bugs?.find((b) => b.id === id)?.match;
const num = (s: string) => Number(s.replace(/\D/g, ''));

describe('kopfrechnen.vorteilhaft', () => {
  it('answers recomputed from the key', () => {
    for (const stufe of [1, 2, 3] as Stufe[]) {
      for (const ex of sample(stufe)) {
        const [, , kind, ...p] = ex.key.split(':');
        const v = ex.answer.kind === 'number' ? ex.answer.value : null;
        if (kind === 'ausgleich') expect(v).toBe(Number(p[0]) + Number(p[1]));
        else if (kind === 'tausch') expect(v).toBe(p[0].split('-').map(Number).reduce((a, b) => a + b, 0));
        else if (kind === 'mal') expect(v).toBe(p[0].split('-').map(Number).reduce((a, b) => a * b, 1));
        else if (kind === 'konstanz') expect(v).toBe(Number(p[0]) - Number(p[1]));
        else if (kind === 'luecke') {
          // both sides of the shown equation must be equal with the answer in the gap
          const [left, right] = (ex.expression ?? '').split(' = ');
          const lv = p[0] === '+' ? Number(p[1]) + Number(p[2]) : Number(p[1]) - Number(p[2]);
          const first = num(right.split(/[+−]/)[0]);
          expect(p[0] === '+' ? first + (v ?? 0) : first - (v ?? 0)).toBe(lv);
          expect(left).toContain(' ');
        } else {
          expect(kind).toBe('gleich');
          if (ex.answer.kind !== 'choice') throw new Error('choice');
          const [x, y] = [Number(p[1]), Number(p[2])];
          const target = p[0] === '+' ? x + y : x - y;
          const correct = ex.answer.correct;
          ex.answer.options.forEach((o, i) => {
            const [a, b] = o.label.split(/[+−]/).map(num);
            expect((p[0] === '+' ? a + b : a - b) === target).toBe(i === correct);
          });
        }
      }
    }
  });

  it('bugs on known examples', () => {
    const a = ausgleichPlus(298, 156, 300);
    expect(a.answer).toMatchObject({ value: 454 });
    expect(bug(a, 'verkehrt-ausgeglichen')).toBe(458);
    const k = konstanz(403, 198, 200);
    expect(k.answer).toMatchObject({ value: 205 });
    expect(bug(k, 'verkehrt-ausgeglichen')).toBe(201);
    const lm = luecke('-', 403, 198, 200);
    expect(lm.expression).toBe('403 − 198 = 405 − □');
    expect(lm.answer).toMatchObject({ value: 200 });
    expect(bug(lm, 'gegensinnig')).toBe(196);
    const lp = luecke('+', 398, 245, 400);
    expect(lp.answer).toMatchObject({ value: 243 });
    expect(bug(lp, 'gleichsinnig')).toBe(247);
    const g = gleichesErgebnis(createRng(3), '-', 403, 198, 2);
    if (g.answer.kind !== 'choice') throw new Error('choice');
    expect(g.answer.options[g.answer.correct].label).toBe('405 − 200');
  });

  it('wrong-direction compensation: the hint names the error and its fix leads to the answer', () => {
    const plus = ausgleichPlus(197, 659, 200);
    const pb = plus.bugs?.find((b) => b.id === 'verkehrt-ausgeglichen');
    expect(pb?.match).toBe(862);
    expect(pb?.hint).toBe('Du hast die 3 dazugezählt. Mit 200 hast du aber schon 3 zu viel gerechnet. Ziehe die 3 ab.');
    const minus = konstanz(9406, 7997, 8000);
    const mb = minus.bugs?.find((b) => b.id === 'verkehrt-ausgeglichen');
    expect(mb?.match).toBe(1403);
    expect(mb?.hint).toBe('Du hast die 3 noch einmal abgezogen. Mit 8000 hast du aber schon 3 zu viel abgezogen. Zähle die 3 dazu.');
    // the two plus hints are different
    expect(plus.bugs?.find((b) => b.id === 'nicht-ausgeglichen')?.hint).not.toBe(pb?.hint);
  });
});

