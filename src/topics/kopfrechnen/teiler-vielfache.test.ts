import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import { createRng } from '../../core/rng';
import type { Exercise, Stufe } from '../../core/types';
import { anzahlTeiler, divisors, gruppen, kgv, lcm, naechstesVielfaches, teilerVielfacheSkill } from './teiler-vielfache';

describeSkill(teilerVielfacheSkill, { minDistinct: 20 });

const ctx = { subtractionMethod: 'abziehen', nrwExtras: false } as const;
const sample = (stufe: Stufe): Exercise[] => Array.from({ length: 300 }, (_, i) => teilerVielfacheSkill.generate(createRng(1313 + i), stufe, ctx));
const bug = (ex: Exercise, id: string) => ex.bugs?.find((b) => b.id === id)?.match;
const range = (n: number) => Array.from({ length: n }, (_, i) => i + 1);

describe('kopfrechnen.teiler-vielfache', () => {
  it('answers recomputed from the key (brute force)', () => {
    for (const stufe of [1, 2, 3] as Stufe[]) {
      for (const ex of sample(stufe)) {
        const [, , kind, ...p] = ex.key.split(':');
        const n = p.map(Number);
        const v = ex.answer.kind === 'number' ? ex.answer.value : null;
        if (kind === 'waehlen' || kind === 'kein' || kind === 'istteiler') {
          if (ex.answer.kind !== 'choice') throw new Error('choice');
          const correct = ex.answer.correct;
          ex.answer.options.forEach((o, i) => {
            const x = Number(o.label.match(/\d+/)?.[0]);
            if (kind === 'waehlen') expect(x % n[0] === 0).toBe(i === correct);
            if (kind === 'kein') expect(n[0] % x !== 0).toBe(i === correct);
          });
          if (kind === 'istteiler') expect(correct).toBe(n[1] % n[0] === 0 ? 0 : 1);
        } else if (kind === 'naechstes') expect(v).toBe(n[0] * n[1] + n[0]);
        else if (kind === 'paare') {
          if (ex.answer.kind !== 'multi') throw new Error('multi');
          for (const f of ex.answer.fields) expect(Number(f.id.slice(1)) * f.value).toBe(n[0]);
          // every pair except 1 · n (shown) is asked
          expect(ex.answer.fields.map((f) => Number(f.id.slice(1)))).toEqual(divisors(n[0]).filter((d) => d > 1 && d * d <= n[0]));
        } else if (kind === 'anzahl') expect(v).toBe(range(n[0]).filter((d) => n[0] % d === 0).length);
        else if (kind === 'kgv') expect(v).toBe(range(1000).find((x) => x % n[0] === 0 && x % n[1] === 0));
        else if (kind === 'raetsel') {
          const [m, m2, lo, hi] = n;
          const sols = range(100).filter((x) => x > lo && x < hi && x % m === 0 && (m2 === 0 || x % m2 === 0));
          expect(sols).toEqual([v]);
        } else {
          expect(kind).toBe('gruppen');
          expect(v).toBe(range(n[0]).filter((d) => n[0] % d === 0 && d >= 2 && n[0] / d >= 2).length);
        }
      }
    }
  });

  it('stays within 100', () => {
    for (const stufe of [1, 2, 3] as Stufe[]) {
      for (const ex of sample(stufe)) if (ex.answer.kind === 'number') expect(ex.answer.value ?? 0).toBeLessThanOrEqual(100);
    }
  });

  it('bugs on known examples', () => {
    expect(divisors(36)).toEqual([1, 2, 3, 4, 6, 9, 12, 18, 36]);
    expect(lcm(4, 6)).toBe(12);
    const a = anzahlTeiler(36);
    expect(a.answer).toMatchObject({ value: 9 });
    expect(bug(a, 'ohne-1-und-zahl')).toBe(7);
    const k = kgv(4, 6);
    expect(bug(k, 'produkt')).toBe(24);
    const nx = naechstesVielfaches(6, 7);
    expect(nx.answer).toMatchObject({ value: 48 });
    expect(bug(nx, 'plus-eins')).toBe(43);
    const g = gruppen(24);
    expect(g.answer).toMatchObject({ value: 6 }); // 2, 3, 4, 6, 8, 12
    expect(bug(g, 'alle-teiler')).toBe(8);
  });

  it('wording: Ja/Nein items show no gap, kgV asks „Wie heißt …“', () => {
    for (const ex of sample(1)) if (ex.key.includes(':istteiler:')) expect(ex.expression).not.toContain('□');
    expect(kgv(7, 2).prompt).toBe('Wie heißt die kleinste Zahl, die ein Vielfaches von 7 und von 2 ist?');
  });
});

