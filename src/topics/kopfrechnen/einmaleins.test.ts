import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import { createRng } from '../../core/rng';
import type { Exercise, FactBox, GenContext, Stufe } from '../../core/types';
import { einmaleinsSkill, factorPairs, familie, geteiltAufgabe, hilfeWaehlen, malAufgabe, platzhalter, wieVieleAufgaben } from './einmaleins';
import { derivationSteps, factHint, factKey, factKind, INTRO_ORDER, MAX_LEARNING, pickFact, searchSteps } from './facts';
import { updateFact } from '../../state/mastery';
import { generateUnique } from '../../core/generate';

describeSkill(einmaleinsSkill, { minDistinct: 20 });

const ctx: GenContext = { subtractionMethod: 'abziehen', nrwExtras: false };
const sample = (stufe: Stufe, c: GenContext = ctx, n = 300): Exercise[] =>
  Array.from({ length: n }, (_, i) => einmaleinsSkill.generate(createRng(10_000 + i), stufe, c));
const bug = (ex: Exercise, id: string) => ex.bugs?.find((b) => b.id === id)?.match;

describe('kopfrechnen.einmaleins: facts and order', () => {
  it('has 55 fact keys (Tauschaufgaben linked), smaller factor first', () => {
    expect(INTRO_ORDER).toHaveLength(55);
    expect(new Set(INTRO_ORDER).size).toBe(55);
    INTRO_ORDER.forEach((k) => {
      const [a, b] = k.split('x').map(Number);
      expect(a).toBeLessThanOrEqual(b);
    });
    expect(factKey(8, 3)).toBe('3x8');
  });

  it('introduces Kernaufgaben, then Quadrataufgaben, then derived facts', () => {
    const kinds = INTRO_ORDER.map((k) => factKind(...(k.split('x').map(Number) as [number, number])));
    const firstQuadrat = kinds.indexOf('quadrat');
    const firstDerived = kinds.indexOf('abgeleitet');
    expect(kinds.slice(0, firstQuadrat).every((k) => k === 'kern')).toBe(true);
    expect(kinds.slice(firstQuadrat, firstDerived).every((k) => k === 'quadrat')).toBe(true);
    expect(kinds.slice(firstDerived).every((k) => k === 'abgeleitet')).toBe(true);
  });

  it('is never row by row: the first facts belong to different Einmaleinsreihen', () => {
    const first = INTRO_ORDER.slice(0, 6).map((k) => k.split('x').map(Number));
    const others = first.map(([a, b]) => ([2, 10].includes(a) ? b : a));
    expect(new Set(others).size).toBeGreaterThan(2);
  });

  it('a new learner (empty fact boxes) starts with Kernaufgaben', () => {
    const c: GenContext = { ...ctx, facts: {}, today: '2026-10-19' };
    for (const ex of sample(1, c, 100)) {
      expect(factKind(...(ex.factKey!.split('x').map(Number) as [number, number]))).toBe('kern');
      expect(INTRO_ORDER.slice(0, 3)).toContain(ex.factKey);
      expect(ex.visual?.type).toBe('dotArray');
    }
  });

  it('prefers due facts', () => {
    const facts: Record<string, FactBox> = {};
    INTRO_ORDER.forEach((k) => (facts[k] = { box: 5, due: '2026-12-01' }));
    facts['7x8'] = { box: 3, due: '2026-10-10' };
    const c: GenContext = { ...ctx, facts, today: '2026-10-19' };
    const picks = Array.from({ length: 200 }, (_, i) => pickFact(createRng(i), c));
    expect(picks.filter((k) => k === '7x8').length).toBeGreaterThan(150);
    // known facts get no Punktefeld
    expect(sample(1, c, 50).every((ex) => ex.visual === undefined)).toBe(true);
  });

  it('introduces derived facts once Kern- and Quadrataufgaben are known', () => {
    const facts: Record<string, FactBox> = {};
    INTRO_ORDER.forEach((k) => {
      const [a, b] = k.split('x').map(Number);
      if (factKind(a, b) !== 'abgeleitet') facts[k] = { box: 4, due: '2026-12-01' };
    });
    const c: GenContext = { ...ctx, facts, today: '2026-10-19' };
    const fresh = Array.from({ length: 200 }, (_, i) => pickFact(createRng(i), c)).filter((k) => !(k in facts));
    expect(fresh.length).toBeGreaterThan(100);
    fresh.forEach((k) => expect(factKind(...(k.split('x').map(Number) as [number, number]))).toBe('abgeleitet'));
  });

  it('wrong facts show the derivation from the nearest Kernaufgabe', () => {
    expect(derivationSteps(6, 7)).toEqual(['Kernaufgabe: 5 · 7 = 35', '5 · 7 = 35 → 6 · 7 = 35 + 7 = 42', 'Also: 6 · 7 = 42.']);
    expect(derivationSteps(8, 8)[1]).toBe('8 · 8 = 10 · 8 − 2 · 8 = 80 − 16 = 64');
    // 7 · 8 is two rows from every Kernaufgabe: the Quadrataufgabe 7 · 7 is the anchor
    expect(derivationSteps(8, 7)).toEqual(['Quadrataufgabe: 7 · 7 = 49', '7 · 7 = 49 → 8 · 7 = 49 + 7 = 56', 'Also: 8 · 7 = 56.']);
    expect(factHint(7, 8)).toBe('Nutze die Quadrataufgabe 7 · 7 = 49. Rechne dann 7 dazu.');
    expect(derivationSteps(7, 9)[1]).toBe('7 · 10 = 70 → 7 · 9 = 70 − 7 = 63');
  });
});

describe('kopfrechnen.einmaleins: exercises', () => {
  it('answers recomputed from the key; never divides by 0; factKey set', () => {
    for (const stufe of [1, 2, 3] as Stufe[]) {
      for (const ex of sample(stufe)) {
        const [, , kind, ...p] = ex.key.split(':');
        const v = ex.answer.kind === 'number' ? ex.answer.value : null;
        if (kind === 'mal') expect(v).toBe(Number(p[0]) * Number(p[1]));
        else if (kind === 'geteilt') {
          expect(Number(p[1])).toBeGreaterThan(0);
          expect((v ?? 0) * Number(p[1])).toBe(Number(p[0]));
        } else if (kind === 'platz') {
          const [a, b] = [Number(p[1]), Number(p[2])];
          expect(v).toBe({ faktor1: a, faktor2: b, divisor: b, dividend: a * b }[p[0]]);
        } else if (kind === 'familie') {
          if (ex.answer.kind !== 'multi') throw new Error('multi');
          const [a, b] = [Number(p[0]), Number(p[1])];
          for (const f of ex.answer.fields) expect(f.value).toBe({ tausch: a * b, u1: b, u2: a }[f.id]);
        } else if (kind === 'hilfe') {
          if (ex.answer.kind !== 'choice') throw new Error('choice');
          expect(ex.answer.options[ex.answer.correct].label).toBe(`${Number(p[0]) / Number(p[1])} · ${p[1]} = ${p[0]}`);
        } else if (kind === 'anzahl') {
          let count = 0;
          for (let a = 1; a <= 10; a++) for (let b = 1; b <= 10; b++) if (a * b === Number(p[0])) count++;
          expect(v).toBe(count);
        } else {
          expect(kind).toBe('kein');
          if (ex.answer.kind !== 'choice') throw new Error('choice');
          const isProduct = (x: number) => factorPairs(x).length > 0;
          ex.answer.options.forEach((o, i) => expect(isProduct(Number(o.label))).toBe(i !== (ex.answer as { correct: number }).correct));
        }
        // only items where the child has to recall the fact feed the per-fact boxes
        if (['mal', 'geteilt', 'platz'].includes(kind)) expect(ex.factKey).toMatch(/^(10|[1-9])x(10|[1-9])$/);
        else expect(ex.factKey).toBeUndefined();
        if (stufe === 1) expect(kind).toBe('mal');
        if (stufe === 2) expect(['geteilt', 'platz']).toContain(kind);
      }
    }
  });

  it('bugs on known examples', () => {
    const m = malAufgabe(7, 8, 1, false);
    expect(bug(m, 'eine-reihe-weniger')).toBe(48);
    expect(bug(m, 'eine-reihe-mehr')).toBe(64);
    expect(bug(m, 'plus')).toBe(15);
    const g = geteiltAufgabe(56, 8, 2);
    expect(g.answer).toMatchObject({ value: 7 });
    expect(bug(g, 'eins-mehr')).toBe(8);
    expect(bug(g, 'minus')).toBe(48);
    const pl = platzhalter('faktor1', 8, 7, 2);
    expect(pl.expression).toBe('□ · 7 = 56');
    expect(pl.answer).toMatchObject({ value: 8 });
    const dv = platzhalter('dividend', 8, 7, 3);
    expect(dv.expression).toBe('□ : 7 = 8');
    expect(bug(dv, 'plus')).toBe(15);
    const f = familie(7, 8);
    expect(bug(f, 'vertauscht')).toEqual({ tausch: 56, u1: 7, u2: 8 });
    const w = wieVieleAufgaben(24);
    expect(w.answer).toMatchObject({ value: 4 });
    expect(bug(w, 'ohne-tausch')).toBe(2);
  });

  it('hints never contain the product of the fact', () => {
    for (let a = 1; a <= 10; a++) {
      for (let b = 1; b <= 10; b++) {
        const ex = malAufgabe(a, b, 1, false);
        ex.hints.forEach((h) => expect(h.split(/[^0-9]+/).includes(String(a * b)) && a * b > 10 ? h : '').toBe(''));
      }
    }
  });

  it('items that show the fact (Aufgabenfamilie, Welche Aufgabe hilft?) carry no factKey', () => {
    expect(familie(7, 8).factKey).toBeUndefined();
    expect(hilfeWaehlen(createRng(1), 30, 3).factKey).toBeUndefined();
  });

  it('division and gap steps search from a Kernaufgabe with the known factor, never from the unknown one', () => {
    const g = geteiltAufgabe(28, 4, 2);
    expect(g.steps).toEqual(['Umkehraufgabe: □ · 4 = 28.', 'Probiere eine Kernaufgabe: 5 · 4 = 20. Das ist zu wenig.', 'Bis 28 fehlen 8. Das ist noch 2-mal die 4: 7 · 4 = 28.', 'Also: 28 : 4 = 7.']);
    expect(searchSteps(9, 6)).toEqual(['Probiere eine Kernaufgabe: 10 · 6 = 60. Das ist zu viel.', '60 − 54 = 6. Das ist einmal die 6 zu viel: 9 · 6 = 54.']);
    expect(platzhalter('faktor2', 4, 7, 2).steps[1]).toBe('Probiere eine Kernaufgabe: 4 · 5 = 20. Das ist zu wenig.');
    for (const stufe of [2, 3] as Stufe[]) {
      for (const ex of sample(stufe)) {
        const [, , kind, ...p] = ex.key.split(':');
        if (kind !== 'geteilt' && !(kind === 'platz' && p[0] !== 'dividend')) continue;
        const v = (ex.answer as { value: number }).value;
        const known = kind === 'geteilt' ? Number(p[1]) : p[0] === 'faktor1' ? Number(p[2]) : Number(p[1]);
        const start = String(ex.steps[1]);
        // the first probe multiplies the known factor by a Kernzahl (or by v only when v itself is one)
        const m = /(\d+) · (\d+) = /.exec(start);
        expect(m).not.toBeNull();
        const factors = [Number(m![1]), Number(m![2])];
        expect(factors).toContain(known);
        const other = factors[0] === known ? factors[1] : factors[0];
        if (known !== 1) expect(other === v ? [1, 2, 5, 10].includes(v) : [1, 2, 5, 10].includes(other)).toBe(true);
      }
    }
  });

  it('worked steps never repeat a step (e.g. 10 · 3 = 30 twice)', () => {
    expect(geteiltAufgabe(30, 3, 2).steps).toEqual(['Umkehraufgabe: □ · 3 = 30.', 'Probiere die Kernaufgabe 10 · 3 = 30. Das passt genau.', 'Also: 30 : 3 = 10.']);
    const eq = (t: string) => t.match(/\d+ · \d+ = \d+/g) ?? [];
    for (const stufe of [1, 2, 3] as Stufe[]) {
      for (const ex of sample(stufe)) {
        const texts = ex.steps.map((x) => (typeof x === 'string' ? x : x.text));
        expect(new Set(texts).size).toBe(texts.length);
        // the same equation is not stated in two different steps (the derivation step 'k · b = kp → …' restates the anchor on purpose)
        const counts = new Map<string, number>();
        texts.forEach((t) => new Set(eq(t)).forEach((e) => counts.set(e, (counts.get(e) ?? 0) + 1)));
        const kern = texts.find((t) => /^(Kern|Quadrat)aufgabe: /.test(t));
        for (const [e, n] of counts) if (!kern?.includes(e)) expect(n, `${ex.key}: ${e}`).toBeLessThanOrEqual(1);
      }
    }
  });

  it('Punktefeld text uses singular for 1', () => {
    const one = malAufgabe(1, 6, 1, true).steps[0];
    expect(typeof one === 'string' ? one : one.text).toBe('1 · 6 heißt: 1 Reihe mit je 6 Punkten.');
    const per = malAufgabe(8, 1, 1, true).steps[0];
    expect(typeof per === 'string' ? per : per.text).toBe('8 · 1 heißt: 8 Reihen mit je 1 Punkt.');
  });
});

describe('kopfrechnen.einmaleins: scheduling with the real fact boxes', () => {
  const addDay = (d: string, n: number) => new Date(Date.parse(`${d}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

  /** Simulate rounds of Stufe-1 items; `answer` decides first-try correctness per fact. */
  function simulate(days: number, perDay: number, answer: (key: string) => boolean) {
    let facts: Record<string, { box: number; due?: string; seen: number; correct: number }> = {};
    const log: { day: number; key: string }[] = [];
    let seed = 1;
    for (let day = 0; day < days; day++) {
      const today = addDay('2026-10-19', day);
      const recent = new Set<string>();
      for (let i = 0; i < perDay; i++) {
        const ex = generateUnique(einmaleinsSkill, 1, seed++, { ...ctx, facts, today }, recent);
        recent.add(ex.key);
        log.push({ day, key: ex.factKey! });
        facts = { ...facts, [ex.factKey!]: updateFact(facts[ex.factKey!], answer(ex.factKey!), 1500, today) };
      }
    }
    return { facts, log };
  }

  it('a fluent child meets many facts on day 1 and is not drilled on the same few', () => {
    const { facts, log } = simulate(1, 20, () => true);
    const asked = log.map((l) => l.key);
    expect(new Set(asked).size).toBeGreaterThanOrEqual(12);
    const most = Math.max(...[...new Set(asked)].map((k) => asked.filter((x) => x === k).length));
    expect(most).toBeLessThanOrEqual(3);
    expect(Object.keys(facts).length).toBeGreaterThanOrEqual(12);
  });

  it('a fluent child has met all 55 facts after about a week of 20 items a day (not 14 days)', () => {
    const { facts } = simulate(8, 20, () => true);
    expect(Object.keys(facts)).toHaveLength(55);
  });

  it('due facts come first; facts answered today are not due again today', () => {
    const today = '2026-10-19';
    const facts: Record<string, FactBox> = {
      '2x3': { box: 2, due: today },
      '3x10': { box: 1, due: '2026-10-18' },
      '5x7': { box: 3, due: today },
    };
    ['2x7', '2x4', '7x10', '2x6', '4x10', '2x9'].forEach((k) => (facts[k] = { box: 1, due: '2026-10-20' }));
    const c: GenContext = { ...ctx, facts, today };
    const picks = Array.from({ length: 300 }, (_, i) => pickFact(createRng(i), c));
    expect(new Set(picks)).toEqual(new Set(['2x3', '3x10', '5x7']));
  });

  it('new facts wait while several facts are still being learned (box 0)', () => {
    const today = '2026-10-19';
    const facts: Record<string, FactBox> = {};
    INTRO_ORDER.slice(0, MAX_LEARNING).forEach((k) => (facts[k] = { box: 0, due: '2026-10-20' }));
    const c: GenContext = { ...ctx, facts, today };
    const picks = Array.from({ length: 200 }, (_, i) => pickFact(createRng(i), c));
    picks.forEach((k) => expect(k in facts).toBe(true));
  });
});

