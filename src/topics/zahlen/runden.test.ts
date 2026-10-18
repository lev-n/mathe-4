import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import { createRng } from '../../core/rng';
import { fmt } from '../../core/format';
import type { Exercise, Stufe } from '../../core/types';
import { grenze, runden, rundenSkill } from './runden';

describeSkill(rundenSkill, { minDistinct: 20 });

const PV: Record<string, number> = { HT: 1e5, ZT: 1e4, T: 1e3, H: 100, Z: 10 };
const ctx = { subtractionMethod: 'abziehen', nrwExtras: false } as const;
const sample = (stufe: Stufe): Exercise[] => Array.from({ length: 400 }, (_, i) => rundenSkill.generate(createRng(4242 + i), stufe, ctx));
const bug = (ex: Exercise, id: string) => ex.bugs?.find((b) => b.id === id)?.match;
/** Independent rounding via the decisive digit (string based). */
function roundRef(n: number, p: number): number {
  const s = String(n);
  const keep = s.length - String(p).length + 1; // digits up to and including the rounding place
  if (keep <= 0) return Number(s[0]) >= 5 ? p : 0;
  const head = Number(s.slice(0, keep));
  const decisive = Number(s[keep] ?? '0');
  return (decisive >= 5 ? head + 1 : head) * p;
}

describe('zahlen.runden', () => {
  it('reference rounding agrees on carry cases', () => {
    expect(roundRef(996_500, 10_000)).toBe(1_000_000);
    expect(roundRef(34_567, 1000)).toBe(35_000);
    expect(roundRef(34_467, 1000)).toBe(34_000);
  });

  it('answers recomputed from the key', () => {
    for (const stufe of [1, 2, 3] as Stufe[]) {
      for (const ex of sample(stufe)) {
        const p = ex.key.split(':').slice(2);
        if (/^\d+$/.test(p[0])) {
          expect(ex.answer).toMatchObject({ value: roundRef(Number(p[0]), PV[p[1]]) });
          continue;
        }
        const [kind, t, c] = [p[0], Number(p[1]), p[2]];
        if (kind === 'kleinste' || kind === 'groesste') {
          const value = (ex.answer as { value: number }).value;
          expect(roundRef(value, PV[c])).toBe(t);
          expect(roundRef(kind === 'kleinste' ? value - 1 : value + 1, PV[c])).not.toBe(t);
        } else if (kind === 'welche' || kind === 'stelle') {
          if (ex.answer.kind !== 'choice') throw new Error('choice');
          const correct = ex.answer.correct;
          if (kind === 'welche') {
            ex.answer.options.forEach((o, i) => expect(roundRef(Number(o.label.replace(/\D/g, '')), PV[c]) === t).toBe(i === correct));
          } else {
            const n = t;
            const shown = Number((ex.expression ?? '').split('≈')[1].replace(/\D/g, ''));
            ex.answer.options.forEach((o, i) => {
              const place = { 'auf Hunderter': 'H', 'auf Tausender': 'T', 'auf Zehntausender': 'ZT', 'auf Hunderttausender': 'HT' }[o.label] ?? '';
              expect(roundRef(n, PV[place]) === shown).toBe(i === correct);
            });
          }
        } else {
          throw new Error(kind);
        }
      }
    }
  });

  it('keeps the Stufe bounds and includes carry cases', () => {
    const s1 = sample(1).map((ex) => ex.key.split(':'));
    s1.forEach((k) => {
      expect(Number(k[2])).toBeLessThan(100_000);
      expect(Number(k[2])).toBeGreaterThanOrEqual(1000);
      expect(['Z', 'H', 'T']).toContain(k[3]);
    });
    const s2 = sample(2).map((ex) => ex.key.split(':'));
    s2.forEach((k) => {
      expect(String(Number(k[2]))).toHaveLength(6);
      expect(['T', 'ZT', 'HT']).toContain(k[3]);
    });
    expect(s2.some((k) => roundRef(Number(k[2]), PV[k[3]]) === 1_000_000)).toBe(true);
  });

  it('bugs: rounding down instead of up, wrong place, truncating, digits not zeroed', () => {
    const ex = runden(34_567, 'T', 1);
    expect(ex.answer).toMatchObject({ value: 35_000 });
    expect(bug(ex, 'abgerundet')).toBe(34_000);
    expect(bug(ex, 'falsche-stelle-klein')).toBe(34_600);
    expect(bug(ex, 'falsche-stelle-gross')).toBe(30_000);
    expect(bug(ex, 'nicht-genullt')).toBe(35_567);
    const down = runden(34_467, 'T', 1);
    expect(bug(down, 'aufgerundet')).toBe(35_000);
    const carry = runden(996_500, 'ZT', 2);
    expect(carry.answer).toMatchObject({ value: 1_000_000 });
    expect(bug(carry, 'abgerundet')).toBe(990_000);
    expect(carry.steps.some((s) => typeof s === 'string' && s.includes('Übertrag'))).toBe(true);
  });

  it('reverse questions', () => {
    const k = grenze(3_500, 'H', 'kleinste');
    expect(k.answer).toMatchObject({ value: 3_450 });
    expect(bug(k, 'zu-gross')).toBe(3_451);
    expect(bug(k, 'abgerundet')).toBe(3_449);
    const g = grenze(45_000, 'T', 'groesste');
    expect(g.answer).toMatchObject({ value: 45_499 });
    expect(bug(g, 'mitte')).toBe(45_500);
    expect(bug(g, 'abgeschnitten')).toBe(45_999);
    expect(fmt(45_499)).toBe('45\u202F499');
  });

  it('the Stufe text names every place the Stufe rounds to', () => {
    const names: Record<string, string> = { Z: 'Z', H: 'H', T: 'T', ZT: 'ZT', HT: 'HT' };
    for (const stufe of [1, 2] as Stufe[]) {
      const used = new Set<string>();
      for (let i = 0; i < 300; i++) used.add(rundenSkill.generate(createRng(3000 + i), stufe, { subtractionMethod: 'abziehen', nrwExtras: false }).key.split(':').pop()!);
      const words = rundenSkill.stufen[stufe].split(/[^A-Za-zÄÖÜäöüß]+/);
      for (const c of used) if (c in names) expect(words, `Stufe ${stufe} rounds to ${c}`).toContain(names[c]);
    }
  });
});

