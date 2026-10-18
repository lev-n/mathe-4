/**
 * Content rules the shared invariant suite cannot see: process praise that names what the child actually did,
 * feedback that fits the shown material, German grammar in generated sentences, and plausible situations.
 */
import { describe, expect, it } from 'vitest';
import type { Exercise } from '../../core/types';
import { labelStep } from '../../ui/visuals/ScaleVisual';
import { labelEvery } from '../../ui/visuals/ContainerVisual';
import topic from './index';
import { geldSkill } from './geld';
import { gewichteSkill, scaleLabelStep, scaleReading } from './gewichte';
import { speak } from './helpers';
import { cupLabelEvery, cupReading, hohlmasseSkill } from './hohlmasse';
import { laengenSkill } from './laengen';
import { schaetzenSkill } from './schaetzen';
import { gramsLike, tonnenSkill } from './tonnen';
import { uhrzeitSkill } from './uhrzeit';
import { vergleichenSkill } from './vergleichen';
import { spanSteps, zeitspannenSkill } from './zeitspannen';
import { samples, times } from './test-utils';

const all = (ex: Exercise) => JSON.stringify(ex);
const every = (stufen: (1 | 2 | 3)[], skill: Parameters<typeof samples>[0]) => stufen.flatMap((s) => samples(skill, s));

describe('groessen: spoken fractions', () => {
  it('mixed numbers are spoken as one word, a fraction before a unit as a phrase', () => {
    expect(speak('1 ¼ t = □ kg')).toBe('eineinviertel Tonnen gleich Lücke Kilogramm');
    expect(speak('2 ¾ kg')).toBe('zweidreiviertel Kilogramm');
    expect(speak('1 ½ l')).toBe('eineinhalb Liter');
    expect(speak('In jedes Glas passt ½ l.')).toBe('In jedes Glas passt ein halber Liter.');
    expect(speak('¼ l = 250 ml')).toBe('ein viertel Liter gleich 250 Milliliter');
    expect(speak('½ t')).toBe('eine halbe Tonne');
  });

  it('no generated screen-reader text contains "1 ein viertel" or "ein halb Liter"', () => {
    for (const skill of topic.skills) {
      for (const ex of every([1, 2, 3], skill)) expect(ex.srText, ex.key).not.toMatch(/\d ein viertel|\d drei viertel|ein halb (Liter|Kilogramm)/);
    }
  });
});

describe('groessen: process praise names what the child did', () => {
  it('conversion items: comma praise only with a comma, placeholder praise only when zeros are needed', () => {
    for (const skill of [geldSkill, laengenSkill, gewichteSkill, hohlmasseSkill, tonnenSkill]) {
      for (const ex of every([1, 2, 3], skill)) {
        if (!ex.expression || !/□/.test(ex.expression)) continue;
        const comma = /\d,\d/.test(ex.expression) || (ex.answer.kind === 'number' && (ex.answer.decimals ?? 0) > 0);
        if (/Komma/.test(ex.praise)) expect(comma, `${ex.key}: ${ex.praise}`).toBe(true);
        expect(ex.praise, ex.key).not.toMatch(/Waage|Messbecher|Viertelliter|Scheine und Münzen/);
      }
    }
  });

  it('Uhrzeit: no clock hands without a clock; "halb", "vor" and "nach 12 Uhr" only when they apply', () => {
    for (const ex of every([1, 2, 3], uhrzeitSkill)) {
      const clock = ex.visual?.type === 'clock';
      if (!clock) {
        expect(ex.praise, ex.key).not.toMatch(/Zeiger/);
        if (ex.answer.kind === 'choice') ex.answer.options.forEach((o) => expect(o.whyWrong ?? '', ex.key).not.toMatch(/Zeiger|Rechts von der 12/));
      }
      const m = ex.key.match(/:(?:lesen|sprechen|digital|ansage):(\d+):(\d+)$/);
      if (!m) continue;
      const [h, min] = [Number(m[1]), Number(m[2])];
      if (/„halb“/.test(ex.praise)) expect(min >= 25 && min <= 35, ex.key).toBe(true);
      if (/„vor“ an die/.test(ex.praise)) expect(min, ex.key).toBeGreaterThanOrEqual(40);
      if (/nach 12 Uhr/.test(ex.praise)) expect(h, ex.key).toBeGreaterThanOrEqual(13);
    }
  });

  it('Zeitspannen: unit conversions get unit praise, not time-span praise', () => {
    for (const ex of samples(zeitspannenSkill, 1)) {
      if (!/:einheit:/.test(ex.key)) continue;
      expect(ex.praise, ex.key).not.toMatch(/Anfang|volle Stunde|Ende/);
      expect(ex.answer.kind === 'number' && ex.answer.label, ex.key).toMatch(/^Ergebnis in (Minuten|Stunden|Sekunden|Tagen|Wochen|Monaten)$/);
    }
  });
});

describe('groessen: reading scales like a child does', () => {
  it('the generator uses the same labelled ticks as the visuals', () => {
    for (const [max, step] of [[1000, 50], [1000, 100], [2000, 50], [2000, 100], [5000, 100]]) expect(scaleLabelStep(max, step)).toBe(labelStep(max, step));
    for (const [cap, step] of [[500, 50], [500, 100], [1000, 50], [1000, 100], [1000, 250], [2000, 100], [2000, 250]]) expect(cupLabelEvery(cap, step)).toBe(labelEvery(cap, step));
  });

  it('steps start at the last labelled number, never at the n-th tick from 0', () => {
    expect(scaleReading(2000, 50, 1100).steps).toEqual(['Ein Strich bedeutet 50 g.', 'Vor dem Zeiger steht die Zahl 1000. Danach kommen noch 2 Striche: 2 · 50 g = 100 g', '1000 g + 100 g = 1100 g']);
    expect(cupReading(2000, 100, 1300, 'Saft').where).toBe('Saft reicht 1 Strich über die Zahl 1200.');
    for (const ex of [...every([1, 2], gewichteSkill), ...every([1, 2], hohlmasseSkill)]) {
      if (ex.visual?.type !== 'scale' && ex.visual?.type !== 'container') continue;
      expect(all(ex), ex.key).not.toMatch(/\d+\. Strich/);
    }
  });
});

describe('groessen: grammar', () => {
  it('scale questions agree with the good ("Wie schwer ist das Mehl?")', () => {
    for (const ex of every([1, 2], gewichteSkill)) expect(ex.prompt, ex.key).not.toMatch(/sind die (Mehl|Zucker|Reis)|ist die (Äpfel|Nudeln)/);
  });

  it('no plural unit after the number 1, dative after "zu den" and "Ergebnis in"', () => {
    for (const skill of topic.skills) {
      for (const ex of every([1, 2, 3], skill)) {
        const text = all(ex);
        expect(text, ex.key).not.toMatch(/(?<![\d,])1[  ](Stunden|Minuten|Sekunden|Jahre|Wochen|Tage)\b/);
        expect(text, ex.key).not.toMatch(/zu den (Millimeter|Zentimeter|Meter|Kilometer|Milliliter|Liter)\b/);
        expect(text, ex.key).not.toMatch(/Ergebnis in (Millimeter|Zentimeter|Meter|Kilometer|Milliliter|Liter|s|h|min|Monate|Tage)"/);
        expect(text, ex.key).not.toMatch(/kein ganzer (m|€|km|kg|l|cm)\b|\bein Comic\b/);
      }
    }
  });

  it('"Stimmt das?" explanations describe someone else\'s mistake, not the child\'s', () => {
    for (const skill of topic.skills) {
      for (const ex of samples(skill, 3)) {
        if (!/claim/.test(ex.key)) continue;
        ex.steps.forEach((s) => expect(String(s), ex.key).not.toMatch(/geschrieben\. Du /));
        if (ex.answer.kind === 'choice') ex.answer.options.forEach((o) => expect(o.whyWrong ?? '', ex.key).not.toMatch(/^Du hast/));
      }
    }
  });

  it('Tonnen: the gram comparison fits the amount', () => {
    expect(gramsLike(1)).toBe('eine Büroklammer');
    expect(gramsLike(20)).toBe('ein paar Blätter Papier');
    expect(gramsLike(500)).toBe('eine Packung Nudeln');
  });

  it('Schätzen: singular units after 1 and no repeated worked step', () => {
    for (const ex of every([1, 2, 3], schaetzenSkill)) {
      expect(all(ex), ex.key).not.toMatch(/\b1 (Tage|Wochen|Jahre)\b/);
      const steps = ex.steps.map(String);
      expect(new Set(steps).size, ex.key).toBe(steps.length);
      if (steps.length > 1) expect(steps[0].includes(steps[1]), ex.key).toBe(false);
    }
  });
});

describe('groessen: plausible situations', () => {
  it('Zeitspannen: durations fit the event (films ≥ 80 min, cakes and bread ≤ 70 min, no trip in March)', () => {
    for (const ex of every([1, 2, 3], zeitspannenSkill)) {
      const c = ex.context ?? '';
      const ts = times(c);
      let dur: number | null = null;
      if (/:(kurz|dauer):/.test(ex.key) && !/nacht/.test(ex.key)) dur = ts[1] - ts[0];
      const given = c.match(/(\d+) h(?: (\d+) min)?|(\d+) min/);
      if (/:(ende|anfang):/.test(ex.key) && given) dur = given[3] ? Number(given[3]) : Number(given[1]) * 60 + Number(given[2] ?? 0);
      if (dur === null) continue;
      if (/Film/.test(c)) expect(dur, c).toBeGreaterThanOrEqual(80);
      if (/Kuchen|Brot/.test(c)) expect(dur, c).toBeLessThanOrEqual(70);
      if (/Schulfest|Ausflug/.test(c)) expect(dur, c).toBeGreaterThanOrEqual(120);
      if (/Training|Handballspiel/.test(c)) expect(dur, c).toBeGreaterThanOrEqual(60);
    }
    for (const ex of samples(zeitspannenSkill, 3)) {
      const m = ex.context?.match(/\d+\. (\S+) (ins Zeltlager|ins Ferienlager|an die Nordsee|in die Berge)/);
      if (m) expect(['Juli', 'August'], ex.context).toContain(m[1]);
    }
  });

  it('overnight spans go via midnight, as the hint says', () => {
    expect(spanSteps(19 * 60 + 30, 1440 + 7 * 60 + 10).map(String)).toEqual([
      '19:30 Uhr → 20:00 Uhr: 30 min',
      '20:00 Uhr → 24:00 Uhr: 4 h',
      '0:00 Uhr → 7:00 Uhr: 7 h',
      '7:00 Uhr → 7:10 Uhr: 10 min',
      '30 min + 4 h + 7 h + 10 min = 11 h 40 min',
    ]);
  });

  it('Vergleichen Stufe 3: the largest/smallest value cannot be read off the notation', () => {
    const kinds = { größte: new Set<string>(), kleinste: new Set<string>() };
    for (const ex of samples(vergleichenSkill, 3, 600)) {
      if (!/:extrem:/.test(ex.key) || ex.answer.kind !== 'choice') continue;
      const want = /größte/.test(ex.prompt) ? 'größte' : 'kleinste';
      const right = ex.answer.options[ex.answer.correct].label;
      expect(right, ex.key).not.toMatch(/^0,/);
      kinds[want].add(/,/.test(right) ? 'comma' : 'other');
      expect(ex.answer.options.filter((o) => /,/.test(o.label)).length, ex.key).toBeGreaterThanOrEqual(2);
    }
    expect([...kinds.größte].sort()).toEqual(['comma', 'other']);
    expect([...kinds.kleinste].sort()).toEqual(['comma', 'other']);
  });
});
