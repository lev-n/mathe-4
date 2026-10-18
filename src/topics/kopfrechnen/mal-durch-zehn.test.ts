import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import { createRng } from '../../core/rng';
import type { Exercise, Stufe } from '../../core/types';
import { kette, lostInnerZero, malDurchZehnSkill, platzhalter, rechnen } from './mal-durch-zehn';

describeSkill(malDurchZehnSkill, { minDistinct: 20 });

const ctx = { subtractionMethod: 'abziehen', nrwExtras: false } as const;
const sample = (stufe: Stufe): Exercise[] => Array.from({ length: 300 }, (_, i) => malDurchZehnSkill.generate(createRng(55 + i), stufe, ctx));
const bug = (ex: Exercise, id: string) => ex.bugs?.find((b) => b.id === id)?.match;

describe('kopfrechnen.mal-durch-zehn', () => {
  it('answers recomputed from the key (string shift of zeros)', () => {
    const shift = (n: number, z: number) => Number(String(n) + '0'.repeat(z));
    const unshift = (n: number, z: number) => {
      const s = String(n);
      expect(s.endsWith('0'.repeat(z))).toBe(true);
      return Number(s.slice(0, s.length - z));
    };
    for (const stufe of [1, 2, 3] as Stufe[]) {
      for (const ex of sample(stufe)) {
        const [, , kind, ...p] = ex.key.split(':');
        const v = ex.answer.kind === 'number' ? ex.answer.value : null;
        if (kind === 'mal' || kind === 'durch') {
          const [n, f] = p.map(Number);
          const z = String(f).length - 1;
          expect(v).toBe(kind === 'mal' ? shift(n, z) : unshift(n, z));
          expect(stufe === 1 ? [10, 100] : [10, 100, 1000]).toContain(f);
        } else if (kind === 'platz') {
          const [n, f] = [Number(p[1]), Number(p[2])];
          expect(v).toBe({ 'zahl-mal': n, faktor: f, 'zahl-durch': n * f, divisor: f }[p[0]]);
        } else {
          expect(kind).toBe('kette');
          const [n, f1, f2] = [Number(p[1]), Number(p[2]), Number(p[3])];
          expect(v).toBe(p[0] === 'mal' ? n * f1 * f2 : n / f1 / f2);
        }
        expect(v ?? 0).toBeLessThanOrEqual(1_000_000);
      }
    }
  });

  it('bugs on known examples', () => {
    expect(lostInnerZero(40_500)).toBe(4_500);
    expect(lostInnerZero(4_500)).toBeNull();
    const ex = rechnen(405, 'mal', 100, 2);
    expect(ex.answer).toMatchObject({ value: 40_500 });
    expect(bug(ex, 'null-zu-viel')).toBe(405_000);
    expect(bug(ex, 'null-zu-wenig')).toBe(4_050);
    expect(bug(ex, 'innere-null-weg')).toBe(4_500);
    const d = rechnen(67_000, 'durch', 1000, 2);
    expect(d.answer).toMatchObject({ value: 67 });
    expect(bug(d, 'falsche-richtung')).toBe(67_000_000);
    const pl = platzhalter('faktor', 72, 1000);
    expect(pl.expression).toBe('72 · □ = 72\u202F000');
    expect(bug(pl, 'stelle-zu-wenig')).toBe(100);
    const k = kette(45, 'mal', 10, 100);
    expect(k.answer).toMatchObject({ value: 45_000 });
    expect(bug(k, 'nur-ein-schritt')).toBe(450);
  });

  it('wording: no „… mal so klein“, no double colons in chains', () => {
    const k = kette(29_000, 'durch', 100, 10);
    for (const t of [...k.hints, ...k.steps.map((x) => (typeof x === 'string' ? x : x.text))]) {
      expect(t).not.toMatch(/: :|: ·|· ·/);
    }
    expect(k.hints[1]).toBe('Oder: Teile gleich durch 1000.');
    expect(rechnen(4500, 'durch', 10, 1).hints[0]).toBe('Bei durch 10 wird die Zahl kleiner: Du bekommst den zehnten Teil.');
    for (const stufe of [1, 2, 3] as const) {
      for (let i = 0; i < 300; i++) {
        const ex = malDurchZehnSkill.generate(createRng(600 + i), stufe, { subtractionMethod: 'abziehen', nrwExtras: false });
        for (const h of ex.hints) expect(h).not.toMatch(/mal so klein|undefined/);
      }
    }
  });
});

