import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import { createRng } from '../../core/rng';
import type { Exercise, PlaceColumn, Stufe } from '../../core/types';
import {
  durcheinander,
  groesstePlaettchen,
  kleinstePlaettchen,
  plaettchenDazu,
  plaettchenRaetsel,
  plaettchenSchieben,
  stellenwertSkill,
  stimmtDas,
  stufenschriftZuZahl,
  tafelZuZahl,
  wertDerZiffer,
  zifferAnStelle,
} from './stellenwert';

describeSkill(stellenwertSkill, { minDistinct: 20 });

const PV: Record<string, number> = { M: 1e6, HT: 1e5, ZT: 1e4, T: 1e3, H: 100, Z: 10, E: 1 };
const ctx = { subtractionMethod: 'abziehen', nrwExtras: false } as const;

function sample(stufe: Stufe, count = 300): Exercise[] {
  return Array.from({ length: count }, (_, i) => stellenwertSkill.generate(createRng(1000 + i), stufe, ctx));
}

function bug(ex: Exercise, id: string): number | undefined {
  const b = ex.bugs?.find((x) => x.id === id);
  return b && typeof b.match === 'number' ? b.match : undefined;
}

describe('zahlen.stellenwert answers (recomputed from the key)', () => {
  it('recomputes every Stufe from its parameters', () => {
    for (const stufe of [1, 2, 3] as Stufe[]) {
      for (const ex of sample(stufe)) {
        const [, , kind, ...p] = ex.key.split(':');
        const value = ex.answer.kind === 'number' ? ex.answer.value : null;
        const n = Number(p[0]);
        const digit = (c: string) => Math.floor(n / PV[c]) % 10;
        switch (kind) {
          case 'tafel':
          case 'stufenschrift':
          case 'zerlegung':
          case 'durcheinander':
            expect(value).toBe(n);
            break;
          case 'ziffer':
            expect(value).toBe(digit(p[1]));
            break;
          case 'eintragen':
            if (ex.answer.kind !== 'multi') throw new Error('multi expected');
            expect(Number(ex.answer.fields.map((f) => f.value).join(''))).toBe(n);
            break;
          case 'dazu':
            expect(value).toBe(n + PV[p[1]]);
            break;
          case 'schieben':
            expect(value).toBe(p[3] === 'neu' ? n - PV[p[1]] + PV[p[2]] : Math.abs(PV[p[2]] - PV[p[1]]));
            expect(digit(p[1])).toBeGreaterThan(0);
            break;
          case 'wert':
            expect(value).toBe(digit(p[1]) * PV[p[1]]);
            break;
          case 'anzahl':
            expect(value).toBe(String(n).split('').reduce((s, d) => s + Number(d), 0));
            break;
          case 'raetsel':
            break; // brute-force test below
          case 'stimmt':
            expect(ex.answer.kind).toBe('choice');
            break;
          default:
            throw new Error(`unknown variant ${kind}`);
        }
      }
    }
  });

  it('keeps the Stufe bounds: Stufe 1 ≤ 100 000, Stufe 2 six digits with an internal zero', () => {
    for (const ex of sample(1)) {
      const n = Number(ex.key.split(':')[3]);
      expect(n).toBeGreaterThanOrEqual(1000);
      expect(n).toBeLessThanOrEqual(100_000);
    }
    for (const ex of sample(2)) {
      const n = Number(ex.key.split(':')[3]);
      expect(String(n)).toHaveLength(6);
      expect(String(n).slice(1)).toContain('0');
    }
  });
});

describe('zahlen.stellenwert bugs', () => {
  it('missing zero in the Stellentafel', () => {
    const ex = tafelZuZahl(304_020, 2, true);
    expect(bug(ex, 'null-vergessen')).toBe(342);
  });
  it('neighbouring places when reading a digit', () => {
    const ex = zifferAnStelle(45_312, 'H');
    expect(ex.answer).toMatchObject({ value: 3 });
    expect(bug(ex, 'stelle-links')).toBe(5);
    expect(bug(ex, 'stelle-rechts')).toBe(1);
  });
  it('Stufenschrift with missing places', () => {
    const ex = stufenschriftZuZahl(40_302);
    expect(ex.expression).toBe('4ZT 3H 2E = □');
    expect(bug(ex, 'null-vergessen')).toBe(432);
  });
  it('unordered decomposition: digits in shown order and missing zeros', () => {
    // 502 403 = 5HT 2T 4H 3E; order [3,2,1,0] shows 3E + 4H + 2T + 5HT
    const ex = durcheinander(502_403, [3, 2, 1, 0]);
    expect(ex.expression).toBe('3\u00A0E + 4\u00A0H + 2\u00A0T + 5\u00A0HT = □');
    expect(bug(ex, 'reihenfolge')).toBe(3425);
    expect(bug(ex, 'null-vergessen')).toBe(5243);
  });
  it('adding a Plättchen to the wrong column', () => {
    const ex = plaettchenDazu(345_678, 'T');
    expect(ex.answer).toMatchObject({ value: 346_678 });
    expect(bug(ex, 'falsche-spalte-links')).toBe(355_678);
    expect(bug(ex, 'falsche-spalte-rechts')).toBe(345_778);
  });
  it('moving a Plättchen from T to ZT makes the number 9 000 bigger', () => {
    const ex = plaettchenSchieben(345_678, 'T', 'ZT', 'diff');
    expect(ex.answer).toMatchObject({ value: 9_000 });
    expect(bug(ex, 'nur-neues')).toBe(10_000);
    expect(bug(ex, 'addiert')).toBe(11_000);
    const neu = plaettchenSchieben(345_678, 'T', 'ZT', 'neu');
    expect(neu.answer).toMatchObject({ value: 354_678 });
    expect(bug(neu, 'nur-dazu')).toBe(355_678);
  });
  it('value of a digit', () => {
    const ex = wertDerZiffer(304_020, 'T');
    expect(ex.answer).toMatchObject({ value: 4_000 });
    expect(bug(ex, 'nur-ziffer')).toBe(4);
    expect(bug(ex, 'stelle-zu-gross')).toBe(40_000);
  });
});

describe('zahlen.stellenwert Plättchen-Rätsel (brute force)', () => {
  const cols: PlaceColumn[] = ['HT', 'ZT', 'T', 'H', 'Z', 'E'];
  function all(k: number, limit: number | null): number[] {
    const out: number[] = [];
    const rec = (i: number, rest: number, n: number) => {
      if (i === cols.length) {
        if (rest === 0) out.push(n);
        return;
      }
      for (let d = 0; d <= Math.min(rest, limit ?? 9); d++) rec(i + 1, rest - d, n + d * PV[cols[i]]);
    };
    rec(0, k, 0);
    return out;
  }
  it('largest and smallest six-digit numbers match an exhaustive search', () => {
    for (const limit of [null, 2, 3, 4]) {
      for (let k = 2; k <= 9; k++) {
        const nums = all(k, limit);
        if (nums.length === 0) continue;
        expect(groesstePlaettchen(k, limit)).toBe(Math.max(...nums));
        const six = nums.filter((n) => n >= 100_000);
        if (six.length) expect(kleinstePlaettchen(k, limit)).toBe(Math.min(...six));
      }
    }
  });
});

describe('zahlen.stellenwert Stimmt das? and screen-reader text', () => {
  /** A reason option is defensible when its verdict is right and the value it states is the real value. */
  function defensible(label: string, isTrue: boolean, d: number, real: number): boolean {
    const verdictRight = label.startsWith(isTrue ? 'Stimmt.' : 'Stimmt nicht.');
    const m = /Wert ([\d\u202F]+)\.$/.exec(label);
    return verdictRight && (m === null || Number(m[1].replace(/\D/g, '')) === real || (d === real && /immer/.test(label)));
  }

  it('only the correct option has the right verdict with a true reason', () => {
    for (const ex of sample(3, 600)) {
      const [, , kind, n, c, claimed] = ex.key.split(':');
      const a = ex.answer;
      if (kind !== 'stimmt' || a.kind !== 'choice') continue;
      expect(c).not.toBe('E');
      expect(claimed).not.toBe('E');
      const d = Math.floor(Number(n) / PV[c]) % 10;
      const isTrue = c === claimed;
      a.options.forEach((o, i) => {
        if (i !== a.correct) expect(defensible(o.label, isTrue, d, d * PV[c])).toBe(false);
      });
    }
  });

  it('a digit at the Einerstelle never gets the „immer den Wert d“ distractor', () => {
    for (const claimed of ['E', 'Z'] as PlaceColumn[]) {
      const ex = stimmtDas(createRng(4), 196_774, 'E', claimed);
      if (ex.answer.kind !== 'choice') throw new Error('choice');
      for (const o of ex.answer.options) expect(o.label).not.toContain('immer den Wert');
      expect(ex.answer.options.length).toBeGreaterThanOrEqual(3);
    }
    const z = stimmtDas(createRng(4), 946_861, 'Z', 'E');
    if (z.answer.kind !== 'choice') throw new Error('choice');
    for (const o of z.answer.options) expect(o.label).not.toContain('immer den Wert');
  });

  it('Stufe-1 table speaks the 0 it shows; Stufe-2 table says „leer“ for its empty cells', () => {
    const shown = tafelZuZahl(3034, 1, false);
    expect(shown.srText).toContain('Hunderter: 0');
    expect(shown.srText).not.toContain('leer');
    const empty = tafelZuZahl(304_502, 2, true);
    expect(empty.srText).toContain('Zehntausender: leer');
  });

  it('Plättchen-Rätsel srText uses the full place names', () => {
    const ex = plaettchenRaetsel(5, 2, 'groesste');
    expect(ex.prompt).toContain('HT bis E');
    expect(ex.srText).toContain('Hunderttausender bis Einer');
    expect(ex.srText).not.toMatch(/\bHT\b/);
  });
});
