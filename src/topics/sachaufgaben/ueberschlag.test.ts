import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import { ueberschlagSkill } from './ueberschlag';
import { cents, samples } from '../groessen/test-utils';

describeSkill(ueberschlagSkill, { minDistinct: 25 });

const label = (ex: { answer: unknown }) => {
  const a = ex.answer as { options: { label: string }[]; correct: number };
  return a.options[a.correct].label;
};

describe('sachaufgaben.ueberschlag specifics', () => {
  it('"Reicht das Geld?" is decided correctly (exact sum recomputed) and an estimate suffices', () => {
    let seen = 0;
    for (const ex of samples(ueberschlagSkill, 1)) {
      if (ex.prompt !== 'Reicht das Geld? Überschlage.') continue;
      seen++;
      const budget = Number(ex.context!.match(/hat (\d+)\u00A0€/)![1]) * 100;
      const prices = [...ex.context!.matchAll(/für (\d+,\d\d)\u00A0€/g)].map((m) => cents(m[1]));
      const total = prices.reduce((a, b) => a + b, 0);
      const up = prices.reduce((a, b) => a + Math.ceil(b / 100) * 100, 0);
      const down = prices.reduce((a, b) => a + Math.floor(b / 100) * 100, 0);
      expect(label(ex)).toBe(total <= budget ? 'Ja, das Geld reicht.' : 'Nein, das Geld reicht nicht.');
      // the rounded estimate decides it without exact calculation
      expect(up <= budget || down >= budget).toBe(true);
    }
    expect(seen).toBeGreaterThan(50);
  });

  it('estimates: both numbers rounded to hundreds', () => {
    let seen = 0;
    for (const ex of samples(ueberschlagSkill, 1)) {
      if (ex.answer.kind !== 'number') continue;
      seen++;
      const [a, b] = [...ex.context!.matchAll(/(\d{3})/g)].map((m) => Number(m[1]));
      const r = (n: number) => Math.round(n / 100) * 100;
      const add = /zusammen/.test(ex.prompt);
      expect(ex.answer.value).toBe(add ? r(a) + r(b) : r(a) - r(b));
      expect(ex.answer.value).toBeGreaterThan(0);
    }
    expect(seen).toBeGreaterThan(50);
  });

  it('Stufe 2: "Welches Ergebnis kann stimmen?" – the exact product is the right option', () => {
    for (const ex of samples(ueberschlagSkill, 2)) {
      if (!/Welches Ergebnis/.test(ex.prompt)) continue;
      const [a, b] = [...ex.context!.matchAll(/(\d+)/g)].map((m) => Number(m[1]));
      expect(label(ex).replace(/\u202F/g, '')).toBe(String(a * b));
    }
  });

  it('Stufe 2: money at the till and exact entries need exact results, "reicht/passt" questions an estimate', () => {
    for (const ex of samples(ueberschlagSkill, 2)) {
      if (!/Reicht ein Überschlag/.test(ex.prompt)) continue;
      const exact = /Rückgeld|jedes Kind bezahlen|Kasse|genaue Länge/i.test(ex.context! + ex.prompt);
      expect(label(ex)).toBe(exact ? 'Ich muss genau rechnen.' : 'Ein Überschlag reicht.');
    }
  });

  it('Stufe 3: checking a result – wrong by a factor of 10 is rejected', () => {
    for (const ex of samples(ueberschlagSkill, 3)) {
      const m = ex.context?.match(/rechnet: (\d+) .+? zu je (\d+,\d\d)\u00A0€ kosten zusammen ([\d\u202F]+,\d\d)\u00A0€/);
      if (!m) continue;
      const exact = Number(m[1]) * cents(m[2]);
      const claimed = cents(m[3]);
      expect(label(ex).startsWith(claimed === exact ? 'Ja' : 'Nein')).toBe(true);
    }
  });
});
