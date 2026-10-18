import { describe, expect, it } from 'vitest';
import { checkAnswer } from '../../core/check';
import { describeSkill } from '../../core/testing';
import { createRng } from '../../core/rng';
import type { ColorName, Exercise, Visual } from '../../core/types';
import { better, chancenSkill, makePair } from './chancen';
import { allText, byMode, keyPart, samples } from './testUtils';

describeSkill(chancenSkill, { minDistinct: { 1: 40, 2: 40, 3: 40 } });

const NOUN: Record<string, ColorName> = { Rot: 'rot', Blau: 'blau', Gelb: 'gelb', Grün: 'gruen', Lila: 'lila', Orange: 'orange' };
const ADJ: Record<string, ColorName> = { rote: 'rot', blaue: 'blau', gelbe: 'gelb', grüne: 'gruen', lila: 'lila', orange: 'orange' };

const choice = (e: Exercise) => {
  if (e.answer.kind !== 'choice') throw new Error('choice expected');
  return e.answer;
};

function counts(v: Visual | undefined): Map<ColorName, number> {
  const m = new Map<ColorName, number>();
  if (v?.type === 'spinner') v.sectors.forEach((s) => m.set(s, (m.get(s) ?? 0) + 1));
  else if (v?.type === 'bag') v.balls.forEach((b) => m.set(b.color, (m.get(b.color) ?? 0) + b.count));
  else throw new Error('spinner or bag expected');
  return m;
}
const total = (m: Map<ColorName, number>) => [...m.values()].reduce((a, b) => a + b, 0);

function dicePredicate(text: string): (v: number) => boolean {
  let m: RegExpMatchArray | null;
  if ((m = text.match(/^eine (\d) oder eine (\d)$/))) return (v) => v === Number(m![1]) || v === Number(m![2]);
  if ((m = text.match(/^eine (\d+)$/))) return (v) => v === Number(m![1]);
  if (text === 'eine gerade Zahl') return (v) => v % 2 === 0;
  if (text === 'eine ungerade Zahl') return (v) => v % 2 === 1;
  if ((m = text.match(/^eine Zahl kleiner als (\d+)$/))) return (v) => v < Number(m![1]);
  if ((m = text.match(/^eine Zahl größer als (\d+)$/))) return (v) => v > Number(m![1]);
  throw new Error(`unknown dice phrase ${text}`);
}

describe('daten.chancen – Stufe 1: comparisons by counting', () => {
  const list = samples(chancenSkill, 1, 400);

  it('colours on a Glücksrad (≤ 8 Felder) or in a Säckchen (≤ 20 Kugeln)', () => {
    const items = byMode(list, 'farben');
    expect(items.length).toBeGreaterThan(100);
    for (const e of items) {
      const m = counts(e.visual);
      expect(total(m)).toBeLessThanOrEqual(e.visual!.type === 'spinner' ? 8 : 20);
      expect(m.size).toBeLessThanOrEqual(3);
      const [, x, y] = e.prompt.match(/Vergleiche (\S+) und (\S+)\./)!;
      const nx = m.get(NOUN[x])!;
      const ny = m.get(NOUN[y])!;
      expect(choice(e).correct).toBe(nx > ny ? 0 : nx < ny ? 1 : 2);
    }
    expect(items.some((e) => choice(e).correct === 2)).toBe(true);
  });

  it('two dice events: the one with more fitting numbers is more likely', () => {
    for (const e of byMode(list, 'wuerfel')) {
      const [t1, t2] = [keyPart(e, 3), keyPart(e, 4)].map((t) => t.replace(/_/g, ' '));
      const n1 = [1, 2, 3, 4, 5, 6].filter(dicePredicate(t1)).length;
      const n2 = [1, 2, 3, 4, 5, 6].filter(dicePredicate(t2)).length;
      expect(choice(e).correct).toBe(n1 > n2 ? 0 : n1 < n2 ? 1 : 2);
    }
  });
});

describe('daten.chancen – Stufe 2', () => {
  const list = samples(chancenSkill, 2, 400);

  it('two Säckchen / Glücksräder: the answer agrees with an exact comparison and is decidable by counting', () => {
    const items = byMode(list, 'vergleich');
    expect(items.length).toBeGreaterThan(100);
    for (const e of items) {
      const c = keyPart(e, 7) as ColorName;
      const a = choice(e).options[0].visual;
      const b = choice(e).options[1].visual;
      const ma = counts(a);
      const mb = counts(b);
      const [ra, ta, rb, tb] = [ma.get(c)!, total(ma), mb.get(c)!, total(mb)];
      // exact comparison of ra/ta and rb/tb by cross-multiplication
      const exact = ra * tb > rb * ta ? 0 : ra * tb < rb * ta ? 1 : 2;
      expect(choice(e).correct).toBe(exact);
      // decidable by counts: same total, same target count, dominance, or one doubled
      const oa = ta - ra;
      const ob = tb - rb;
      const decidable = ta === tb || ra === rb || (ra > rb && oa < ob) || (rb > ra && ob < oa) || (ra * 2 === rb && oa * 2 === ob) || (rb * 2 === ra && ob * 2 === oa);
      expect(decidable).toBe(true);
      if (a?.type === 'spinner') expect(ta).toBeLessThanOrEqual(8);
    }
  });

  it('fair game: the answer follows the number of fields/balls per player', () => {
    for (const e of byMode(list, 'fair')) {
      const m = counts(e.visual);
      const [, x, y] = e.context!.match(/gewinnt bei (\S+)\. \S+ gewinnt bei (\S+?)\./)!;
      const n1 = m.get(NOUN[x])!;
      const n2 = m.get(NOUN[y])!;
      expect(choice(e).correct).toBe(n1 === n2 ? 0 : n1 > n2 ? 1 : 2);
      if (e.visual?.type === 'spinner') expect(e.visual.sectors.length).toBeLessThanOrEqual(8);
    }
  });

  it('makePair never needs fractions', () => {
    for (let seed = 1; seed < 500; seed++) {
      const p = makePair(createRng(seed), 16);
      const result = better(p);
      if (p.type === 'doppelt') expect(result).toBe(2);
      else expect(result).not.toBe(2);
    }
  });
});

describe('daten.chancen – Stufe 3', () => {
  const list = samples(chancenSkill, 3, 400);

  it('changing a Säckchen: the answer is the smallest number that works', () => {
    const items = byMode(list, 'aendern');
    expect(items.length).toBeGreaterThan(80);
    for (const e of items) {
      if (e.answer.kind !== 'number') throw new Error('number');
      const kind = keyPart(e, 3);
      const r = Number(keyPart(e, 4).replace(/\D/g, ''));
      const b = Number(keyPart(e, 5).replace(/\D/g, ''));
      const works = (x: number) => {
        const [rr, bb] = kind === 'weg-mehr' ? [r, b - x] : [r + x, b];
        return kind === 'dazu-gleich' ? rr === bb : rr > bb;
      };
      let smallest = 0;
      while (!works(smallest)) smallest++;
      expect(e.answer.value).toBe(smallest);
      if (kind !== 'dazu-gleich') {
        const res = checkAnswer(e.answer, { kind: 'number', text: String(b - r) }, e.bugs);
        expect(res.bugHint).toMatch(/gleich viele/);
      }
      // 'mindestens' only where more balls would also work: 'gleich wahrscheinlich' needs exactly that many.
      expect(e.prompt.includes('mindestens'), e.prompt).toBe(kind !== 'dazu-gleich');
    }
  });

  it('dice game: fair exactly when both players have equally many numbers', () => {
    for (const e of byMode(list, 'wuerfelspiel')) {
      const A = keyPart(e, 3).split('').map(Number);
      const B = keyPart(e, 4).split('').map(Number);
      expect(A.filter((x) => B.includes(x))).toHaveLength(0);
      const label = choice(e).options[choice(e).correct].label;
      expect(label.startsWith('Ja')).toBe(A.length === B.length);
    }
  });

  it('making a game fair: only the correct option leads to equal counts', () => {
    for (const e of byMode(list, 'fair-machen')) {
      const m = counts(e.visual);
      const [c1, c2] = [...m.keys()];
      choice(e).options.forEach((o, i) => {
        const mm = o.label.match(/^(Eine|\d+) (\S+) Kugeln? dazulegen\.$/)!;
        const n = mm[1] === 'Eine' ? 1 : Number(mm[1]);
        const col = ADJ[mm[2]];
        const after = new Map(m);
        after.set(col, (after.get(col) ?? 0) + n);
        expect(after.get(c1) === after.get(c2), o.label).toBe(i === choice(e).correct);
      });
    }
  });
});

describe('daten.chancen – vocabulary', () => {
  it('"wahrscheinlich" only comparatively; no numbers as probabilities', () => {
    for (const stufe of [1, 2, 3] as const) {
      for (const e of samples(chancenSkill, stufe, 200)) {
        for (const s of allText(e)) {
          const lower = s.toLowerCase();
          expect(lower).not.toContain('unwahrscheinlich');
          for (const m of lower.matchAll(/(\S+) wahrscheinlich([a-zäöüß]*)/g)) {
            expect(m[2] === 'er' || m[1] === 'weniger' || m[1] === 'gleich', `"${s}"`).toBe(true);
          }
          if (/^wahrscheinlich\b/.test(lower)) throw new Error(`standalone wahrscheinlich: ${s}`);
          expect(s).not.toMatch(/\d\s*\/\s*\d|%|Prozent/);
        }
      }
    }
  });
});
