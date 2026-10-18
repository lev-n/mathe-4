import { describe, expect, it } from 'vitest';
import { checkAnswer } from '../../core/check';
import { describeSkill } from '../../core/testing';
import type { ColorName, Exercise } from '../../core/types';
import { drawKlasse, klasse, zufallSkill } from './zufall';
import { allText, byMode, keyPart, samples } from './testUtils';

describeSkill(zufallSkill, { minDistinct: { 1: 40, 2: 40, 3: 40 } });

const LABEL = ['sicher', 'möglich', 'unmöglich'];
const choice = (e: Exercise) => {
  if (e.answer.kind !== 'choice') throw new Error('choice expected');
  return e.answer;
};
const chosenLabel = (e: Exercise) => choice(e).options[choice(e).correct].label;

const NOUN: Record<string, ColorName> = { Rot: 'rot', Blau: 'blau', Gelb: 'gelb', Grün: 'gruen', Lila: 'lila', Orange: 'orange' };
const WORD: Record<string, ColorName> = { rot: 'rot', blau: 'blau', gelb: 'gelb', grün: 'gruen', lila: 'lila', orange: 'orange' };

/** Independent reading of the dice phrases. */
function dicePredicate(text: string): (v: number) => boolean {
  let m: RegExpMatchArray | null;
  if ((m = text.match(/^eine (\d+)$/))) return (v) => v === Number(m![1]);
  if (text === 'eine gerade Zahl') return (v) => v % 2 === 0;
  if (text === 'eine ungerade Zahl') return (v) => v % 2 === 1;
  if ((m = text.match(/^eine Zahl kleiner als (\d+)$/))) return (v) => v < Number(m![1]);
  if ((m = text.match(/^eine Zahl größer als (\d+)$/))) return (v) => v > Number(m![1]);
  if (text === 'eine Zahl von 1 bis 6') return (v) => v >= 1 && v <= 6;
  if (text === 'eine zweistellige Zahl') return (v) => v >= 10;
  throw new Error(`unknown dice phrase ${text}`);
}
const classify = (fits: number, all: number) => (fits === 0 ? 'unmöglich' : fits === all ? 'sicher' : 'möglich');

describe('daten.zufall – Stufe 1 classifications recomputed by counting outcomes', () => {
  const list = samples(zufallSkill, 1, 400);

  it('Würfel', () => {
    const items = byMode(list, 'wuerfel');
    expect(items.length).toBeGreaterThan(50);
    for (const e of items) {
      const text = e.prompt.match(/dass du (.+) würfelst\?/)![1];
      const p = dicePredicate(text);
      expect(chosenLabel(e)).toBe(classify([1, 2, 3, 4, 5, 6].filter(p).length, 6));
    }
  });

  it('Glücksrad', () => {
    for (const e of byMode(list, 'rad')) {
      if (e.visual?.type !== 'spinner') throw new Error('spinner');
      const sectors = e.visual.sectors;
      expect(sectors.length).toBeGreaterThanOrEqual(2);
      expect(sectors.length).toBeLessThanOrEqual(8);
      const m = e.prompt.match(/der Zeiger (nicht )?auf (\S+?)(?: oder (\S+))? stehen bleibt/)!;
      const colors = [m[2], m[3]].filter(Boolean).map((n) => NOUN[n]);
      const fits = sectors.filter((s) => (m[1] ? s !== colors[0] : colors.includes(s))).length;
      expect(chosenLabel(e)).toBe(classify(fits, sectors.length));
    }
  });

  it('Säckchen: ≤ 20 Kugeln in 2–3 colours', () => {
    for (const e of byMode(list, 'saeckchen')) {
      if (e.visual?.type !== 'bag') throw new Error('bag');
      const balls = e.visual.balls;
      const total = balls.reduce((a, b) => a + b.count, 0);
      expect(total).toBeLessThanOrEqual(20);
      expect(balls.length).toBeLessThanOrEqual(3);
      expect(balls.length).toBeGreaterThanOrEqual(2);
      const m = e.prompt.match(/dass sie (nicht )?(\S+?)(?: oder (\S+))? ist\?/)!;
      const colors = [m[2], m[3]].filter(Boolean).map((w) => WORD[w]);
      const fits = balls.filter((b) => (m[1] ? b.color !== colors[0] : colors.includes(b.color))).reduce((a, b) => a + b.count, 0);
      expect(chosenLabel(e)).toBe(classify(fits, total));
    }
  });

  it('Säckchen reasons: "ist auch eine gelbe Kugel" for a single ball, "sind auch gelbe Kugeln" for several', () => {
    const ADJ: Record<string, ColorName> = { rote: 'rot', blaue: 'blau', gelbe: 'gelb', grüne: 'gruen', lila: 'lila', orange: 'orange' };
    let single = 0;
    for (const e of byMode(list, 'saeckchen')) {
      if (e.visual?.type !== 'bag') throw new Error('bag');
      const balls = e.visual.balls;
      for (const o of choice(e).options) {
        const m = o.whyWrong?.match(/Im Säckchen (ist auch eine|sind auch) (\S+) Kugeln?\./);
        if (!m) continue;
        const count = balls.find((b) => b.color === ADJ[m[2]])!.count;
        expect(m[1] === 'ist auch eine', `${e.key}: ${o.whyWrong}`).toBe(count === 1);
        if (count === 1) single++;
      }
    }
    expect(single).toBeGreaterThan(0);
  });

  it('Münze', () => {
    const expected: Record<string, string> = { kopf: 'möglich', zahl: 'möglich', 'kopf-oder-zahl': 'sicher', beides: 'unmöglich' };
    for (const e of byMode(list, 'muenze')) expect(chosenLabel(e)).toBe(expected[keyPart(e, 3)]);
  });

  it('all three classes occur regularly', () => {
    const counts = { sicher: 0, möglich: 0, unmöglich: 0 } as Record<string, number>;
    list.forEach((e) => counts[chosenLabel(e)]++);
    Object.values(counts).forEach((c) => expect(c).toBeGreaterThan(list.length * 0.2));
  });
});

describe('daten.zufall – Stufe 2 recomputed by enumeration', () => {
  const list = samples(zufallSkill, 2, 400);

  it('two dice: all 36 throws are checked', () => {
    for (const e of byMode(list, 'summe')) {
      const clause = e.prompt.match(/dass (.+)\?/)![1];
      let p: (x: number, y: number) => boolean;
      let m: RegExpMatchArray | null;
      if ((m = clause.match(/^die Summe (\d+) ist$/))) p = (x, y) => x + y === Number(m![1]);
      else if ((m = clause.match(/^die Summe größer als (\d+) ist$/))) p = (x, y) => x + y > Number(m![1]);
      else if ((m = clause.match(/^die Summe kleiner als (\d+) ist$/))) p = (x, y) => x + y < Number(m![1]);
      else if ((m = clause.match(/^die Summe mindestens (\d+) ist$/))) p = (x, y) => x + y >= Number(m![1]);
      else if (clause === 'die Summe eine gerade Zahl ist') p = (x, y) => (x + y) % 2 === 0;
      else if (clause === 'beide Würfel die gleiche Zahl zeigen') p = (x, y) => x === y;
      else throw new Error(clause);
      let fits = 0;
      for (let x = 1; x <= 6; x++) for (let y = 1; y <= 6; y++) if (p(x, y)) fits++;
      expect(chosenLabel(e)).toBe(classify(fits, 36));
    }
  });

  it('drawing several balls at once: every k-subset of the labelled balls is checked', () => {
    const items = byMode(list, 'ziehen');
    expect(items.length).toBeGreaterThan(50);
    for (const e of items) {
      const kind = keyPart(e, 3);
      const a = Number(keyPart(e, 5));
      const b = Number(keyPart(e, 7));
      const k = Number(keyPart(e, 8));
      const balls = [...Array(a).fill('A'), ...Array(b).fill('B')];
      let fits = 0;
      let all = 0;
      const walk = (start: number, chosen: string[]) => {
        if (chosen.length === k) {
          all++;
          const nA = chosen.filter((x) => x === 'A').length;
          if (kind === 'mindestens' ? nA >= 1 : kind === 'alle' ? nA === k : nA === 0) fits++;
          return;
        }
        for (let i = start; i < balls.length; i++) walk(i + 1, [...chosen, balls[i]]);
      };
      walk(0, []);
      expect(chosenLabel(e)).toBe(classify(fits, all));
    }
  });

  it('drawing two balls: "beide Kugeln", not "alle 2 Kugeln"', () => {
    for (const e of byMode(list, 'ziehen')) {
      if (keyPart(e, 3) !== 'alle') continue;
      const k = Number(keyPart(e, 8));
      expect(e.prompt).toContain(k === 2 ? 'dass beide Kugeln' : `dass alle ${k} Kugeln`);
    }
  });

  it('which event is impossible / certain: exactly the correct option has that class', () => {
    for (const e of byMode(list, 'welches')) {
      const target = keyPart(e, 3) === 'sicher' ? 'sicher' : 'unmöglich';
      choice(e).options.forEach((o, i) => {
        const p = dicePredicate(o.label.match(/^Du würfelst (.+)\.$/)![1]);
        const cls = classify([1, 2, 3, 4, 5, 6].filter(p).length, 6);
        expect(cls === target, o.label).toBe(i === choice(e).correct);
      });
    }
  });

  it('drawKlasse agrees with simple cases', () => {
    expect(drawKlasse('mindestens', 2, 3, 4)).toBe('sicher');
    expect(drawKlasse('alle', 2, 3, 3)).toBe('unmoeglich');
    expect(drawKlasse('keine', 4, 3, 2)).toBe('moeglich');
    expect(klasse(0, 6)).toBe('unmoeglich');
  });
});

describe('daten.zufall – Stufe 3', () => {
  const list = samples(zufallSkill, 3, 400);

  it('minimum draws for a sure colour = other balls + 1; for a pair = colours + 1', () => {
    for (const e of byMode(list, 'mindestens')) {
      if (e.visual?.type !== 'bag' || e.answer.kind !== 'number') throw new Error('shape');
      const target = keyPart(e, 4) as ColorName;
      const others = e.visual.balls.filter((b) => b.color !== target).reduce((s, b) => s + b.count, 0);
      expect(e.answer.value).toBe(others + 1);
      const res = checkAnswer(e.answer, { kind: 'number', text: String(others) }, e.bugs);
      expect(res.bugHint).toMatch(/noch eine Kugel mehr/);
    }
    for (const e of byMode(list, 'paar')) {
      if (e.visual?.type !== 'bag' || e.answer.kind !== 'number') throw new Error('shape');
      expect(e.answer.value).toBe(e.visual.balls.length + 1);
    }
  });

  it('the matching Glücksrad / Säckchen satisfies every condition, the others violate one', () => {
    const items = byMode(list, 'passend');
    expect(items.length).toBeGreaterThan(50);
    for (const e of items) {
      const sicherMode = keyPart(e, 4) === 'sicher';
      const [c1, c2] = [keyPart(e, 5), keyPart(e, 6)] as ColorName[];
      choice(e).options.forEach((o, i) => {
        const v = o.visual!;
        const counts = new Map<ColorName, number>();
        if (v.type === 'spinner') v.sectors.forEach((s) => counts.set(s, (counts.get(s) ?? 0) + 1));
        else if (v.type === 'bag') v.balls.forEach((b) => counts.set(b.color, (counts.get(b.color) ?? 0) + b.count));
        const total = [...counts.values()].reduce((a, b) => a + b, 0);
        const has = (c: ColorName) => counts.get(c) ?? 0;
        const ok = sicherMode ? has(c1) === total : has(c1) > 0 && has(c1) < total && has(c2) === 0;
        expect(ok).toBe(i === choice(e).correct);
      });
    }
  });

  it('impossible sum: only the correct option lies outside 2–12', () => {
    for (const e of byMode(list, 'unmoeglich-summe')) {
      choice(e).options.forEach((o, i) => {
        const s = Number(o.label);
        expect(s < 2 || s > 12).toBe(i === choice(e).correct);
      });
    }
  });
});

describe('daten.zufall – vocabulary (KMK 2022)', () => {
  it('uses sicher / möglich / unmöglich and never "wahrscheinlich", fractions or percentages', () => {
    for (const stufe of [1, 2, 3] as const) {
      for (const e of samples(zufallSkill, stufe, 200)) {
        for (const s of allText(e)) {
          expect(s.toLowerCase()).not.toContain('wahrscheinlich');
          expect(s).not.toMatch(/\d\s*\/\s*\d|%|Prozent/);
        }
      }
    }
    expect(LABEL).toEqual(['sicher', 'möglich', 'unmöglich']);
  });
});
