import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import { createRng } from '../../core/rng';
import type { Exercise, Stufe } from '../../core/types';
import { diktat, dreherBugs, extraZeroBug, innerZeroBug, invertPart, missingZeroBug, nullenZaehlen, zahlwortSkill, zeroShifts } from './zahlwort';
import { formatAnswer } from '../../core/check';

describeSkill(zahlwortSkill, { minDistinct: 20 });

const ctx = { subtractionMethod: 'abziehen', nrwExtras: false } as const;

/** Independent parser for German number words (used to verify the generator). */
const UNITS: Record<string, number> = { ein: 1, eins: 1, zwei: 2, drei: 3, vier: 4, fünf: 5, sechs: 6, sieben: 7, acht: 8, neun: 9 };
const TEENS: Record<string, number> = { zehn: 10, elf: 11, zwölf: 12, dreizehn: 13, vierzehn: 14, fünfzehn: 15, sechzehn: 16, siebzehn: 17, achtzehn: 18, neunzehn: 19 };
const TENS: Record<string, number> = { zwanzig: 20, dreißig: 30, vierzig: 40, fünfzig: 50, sechzig: 60, siebzig: 70, achtzig: 80, neunzig: 90 };
function below1000(s: string): number {
  let n = 0;
  const h = s.indexOf('hundert');
  if (h >= 0) {
    n += UNITS[s.slice(0, h)] * 100;
    s = s.slice(h + 7);
  }
  if (s === '') return n;
  if (s in TEENS) return n + TEENS[s];
  if (s in TENS) return n + TENS[s];
  const u = s.indexOf('und');
  if (u > 0) return n + UNITS[s.slice(0, u)] + TENS[s.slice(u + 3)];
  return n + UNITS[s];
}
function parseWord(word: string): number {
  if (word === 'eine Million') return 1_000_000;
  const t = word.indexOf('tausend');
  return t >= 0 ? below1000(word.slice(0, t)) * 1000 + below1000(word.slice(t + 7)) : below1000(word);
}
const plain = (s: string) => s.replace(/\u00AD/g, '');

function sample(stufe: Stufe, count = 300): Exercise[] {
  return Array.from({ length: count }, (_, i) => zahlwortSkill.generate(createRng(500 + i), stufe, ctx));
}

describe('zahlen.zahlwort', () => {
  it('the independent parser reads tricky words', () => {
    expect(parseWord('dreihundertviertausendzwanzig')).toBe(304_020);
    expect(parseWord('neunhundertneunundneunzigtausendneunhundertneunundneunzig')).toBe(999_999);
  });

  it('dictation answers match the shown word', () => {
    for (const stufe of [1, 2, 3] as Stufe[]) {
      for (const ex of sample(stufe)) {
        const kind = ex.key.split(':')[2];
        const n = Number(ex.key.split(':')[3]);
        if (kind === 'diktat') {
          expect(ex.answer).toMatchObject({ kind: 'number', value: n });
          expect(parseWord(plain(ex.expression ?? ''))).toBe(n);
        } else if (kind === 'nullen') {
          expect(parseWord(plain(ex.expression ?? ''))).toBe(n);
          expect(ex.answer).toMatchObject({ value: String(n).split('').filter((d) => d === '0').length });
        } else {
          expect(kind).toBe('waehlen');
          if (ex.answer.kind !== 'choice') throw new Error('choice expected');
          const correct = ex.answer.correct;
          expect(parseWord(plain(ex.answer.options[ex.answer.correct].label))).toBe(n);
          ex.answer.options.forEach((o, i) => {
            if (i !== correct) expect(parseWord(plain((o as { label: string }).label))).not.toBe(n);
          });
        }
      }
    }
  });

  it('keeps the Stufe bounds', () => {
    for (const ex of sample(1)) expect(Number(ex.key.split(':')[3])).toBeLessThanOrEqual(100_000);
    for (const ex of sample(2)) {
      const n = Number(ex.key.split(':')[3]);
      expect(String(n)).toHaveLength(6);
      expect(String(n).slice(1)).toContain('0');
    }
    for (const ex of sample(3)) expect(Number(ex.key.split(':')[3])).toBeLessThanOrEqual(1_000_000);
  });

  it('computes the misconceptions on known examples', () => {
    expect(missingZeroBug(304_020)).toBe(30_420);
    expect(missingZeroBug(345_678)).toBeNull();
    expect(extraZeroBug(304_020)).toBe(30_400_020);
    expect(innerZeroBug(45_305)).toBe(4_535);
    expect(invertPart(78)).toBe(87);
    expect(invertPart(30)).toBeNull();
    expect(dreherBugs(345_678).map((d) => d.value)).toEqual([354_678, 345_687]);
    expect(zeroShifts(304_020)).toEqual([340_020, 300_420, 304_200, 304_002]);
  });

  it('dictation exercise carries the targeted bugs', () => {
    const ex = diktat(304_020, 2);
    const byId = Object.fromEntries((ex.bugs ?? []).map((b) => [b.id, b.match]));
    expect(byId['null-fehlt']).toBe(30_420);
    expect(byId['zu-viele-nullen']).toBe(30_400_020);
    const ex2 = diktat(345_678, 2);
    expect((ex2.bugs ?? []).map((b) => b.match)).toEqual(expect.arrayContaining([354_678, 345_687]));
  });

  it('counting zeros: 300 004 has 4 zeros, heard as 3000004 it would be 5', () => {
    const ex = nullenZaehlen(300_004);
    expect(ex.answer).toMatchObject({ value: 4 });
    expect(ex.bugs?.find((b) => b.id === 'tausend-als-000')?.match).toBe(5);
    expect(ex.bugs?.find((b) => b.id === 'null-fehlt')?.match).toBe(2);
  });

  it('the shown solution reads well for exactly one zero', () => {
    const ex = nullenZaehlen(999_501);
    expect(ex.answer).toMatchObject({ value: 1 });
    expect(formatAnswer(ex.answer)).toBe('Anzahl der Nullen: 1');
  });
});

