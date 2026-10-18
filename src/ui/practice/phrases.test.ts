import { describe, expect, it } from 'vitest';
import { BANNED_PHRASES } from '../../core/testing';
import { BOX, TIMES } from '../../core/format';
import { createRng } from '../../core/rng';
import type { Exercise } from '../../core/types';
import * as phrases from './phrases';
import { blitzTask, parseFactKey, remainingText } from './blitz';
import { isHoldoverClick } from './useHoldover';

function allPhraseStrings(): string[] {
  const out: string[] = [];
  for (const v of Object.values(phrases)) {
    if (typeof v === 'string') out.push(v);
    else if (Array.isArray(v)) out.push(...v.filter((x): x is string => typeof x === 'string'));
  }
  out.push(phrases.summaryText(8, 10), phrases.summaryText(1, 2), phrases.summaryText(10, 10), phrases.summaryText(0, 3), phrases.streakText(5));
  return out;
}

const EX: Exercise = {
  key: 'kopfrechnen.test:7x8',
  topicId: 'kopfrechnen',
  skillId: 'kopfrechnen.test',
  stufe: 1,
  ab: 1,
  prompt: 'Rechne.',
  expression: `7 ${TIMES} 8 = ${BOX}`,
  answer: { kind: 'number', value: 56 },
  hints: ['Denk an 7 · 10.'],
  steps: ['7 · 8 = 56'],
  praise: 'Du hast die Kernaufgabe genutzt.',
  srText: 'Wie viel ist 7 mal 8?',
  kmk: ['ZO.kopfrechnen'],
};

describe('phrase bank', () => {
  it('never uses banned phrases', () => {
    for (const s of allPhraseStrings()) {
      const lower = s.toLowerCase();
      for (const banned of BANNED_PHRASES) {
        expect(new RegExp(`(^|[^a-zäöüß])${banned}([^a-zäöüß]|$)`).test(lower), `"${banned}" in "${s}"`).toBe(false);
      }
    }
  });

  it('keeps sentences short (≤ 15 words)', () => {
    for (const s of allPhraseStrings()) {
      for (const sentence of s.split(/(?<=[.!?])\s+/)) {
        expect(sentence.split(/\s+/).filter(Boolean).length, sentence).toBeLessThanOrEqual(15);
      }
    }
  });

  it('round summary is success-framed and promises no later review', () => {
    expect(phrases.summaryText(8, 10)).toBe('8 von 10 geschafft – 2 Aufgaben waren noch knifflig.');
    expect(phrases.summaryText(9, 10)).toBe('9 von 10 geschafft – 1 Aufgabe war noch knifflig.');
    expect(phrases.summaryText(10, 10)).toBe('10 von 10 geschafft.');
    expect(phrases.summaryText(0, 10)).toBe('Du hast alle 10 Aufgaben bearbeitet. Sie waren noch knifflig.');
    expect(phrases.summaryText(0, 1)).toBe('Du hast die Aufgabe bearbeitet. Sie war noch knifflig.');
    for (const t of [phrases.summaryText(8, 10), phrases.summaryText(0, 3)]) expect(t).not.toMatch(/später/);
  });

  it('mastery words and stars', () => {
  });

  it('announces a full German sentence with the solved task', () => {
    expect(phrases.spokenSolution(EX)).toBe('7 mal 8 ist 56.');
    expect(phrases.announceCorrect(EX, 'Du hast die Kernaufgabe genutzt.')).toBe('Richtig! 7 mal 8 ist 56. Du hast die Kernaufgabe genutzt.');
    expect(phrases.announceRetry('Denk an 7 · 10')).toBe('Noch nicht ganz – probier es noch einmal. Denk an 7 · 10.');
    expect(phrases.announceSolution(EX)).toContain('Lass uns das zusammen anschauen. 7 mal 8 ist 56.');
  });

  it('falls back to wording that fits the answer kind without a fillable expression', () => {
    const ex: Exercise = { ...EX, expression: undefined, answer: { kind: 'choice', options: [{ label: 'Würfel' }, { label: 'Quader' }], correct: 0 } };
    expect(phrases.spokenSolution(ex)).toBe('Die Lösung: Würfel.');
    const big: Exercise = { ...EX, expression: undefined, answer: { kind: 'number', value: 345678 } };
    expect(phrases.spokenSolution(big)).toBe('Die Lösung ist 345678.');
    const unit: Exercise = { ...EX, expression: undefined, answer: { kind: 'number', value: 15, unit: 'min' } };
    expect(phrases.spokenSolution(unit)).toBe('Die Lösung ist 15 min.');
  });

  it('speaks a clock time as h:mm Uhr, never "geteilt durch"', () => {
    const time = (h: number, m: number): Exercise => ({
      ...EX,
      expression: undefined,
      answer: { kind: 'multi', fields: [{ id: 'h', value: h, after: ':' }, { id: 'm', value: m, after: 'Uhr' }] },
    });
    expect(phrases.spokenSolution(time(6, 25))).toBe('Die Lösung: 6:25 Uhr.');
    expect(phrases.spokenSolution(time(17, 5))).toBe('Die Lösung: 17:05 Uhr.');
    expect(phrases.announceCorrect(time(6, 25), 'Du hast die Zeiger genau gelesen.')).toBe('Richtig! Die Lösung: 6:25 Uhr. Du hast die Zeiger genau gelesen.');
    expect(phrases.spokenSolution(time(6, 25))).not.toMatch(/geteilt/);
    // The visible 'Die Lösung: …' line uses the same notation.
    expect(phrases.solutionText(time(17, 5).answer)).toBe('17:05 Uhr');
    expect(phrases.solutionText(EX.answer)).toBe('56');
  });

  it('speaks an answer sentence as it is (no "Die Lösung ist Mia bekommt …")', () => {
    const ex: Exercise = { ...EX, expression: undefined, answer: { kind: 'number', value: 2.6, decimals: 2, unit: '€', before: 'Mia bekommt', after: 'zurück.' } };
    expect(phrases.spokenSolution(ex)).toBe('Mia bekommt 2,60 € zurück.');
    const label: Exercise = { ...EX, expression: undefined, answer: { kind: 'number', value: 6, before: 'Flächeninhalt:', after: 'Kästchen' } };
    expect(phrases.spokenSolution(label)).toBe('Flächeninhalt: 6 Kästchen.');
    const unsolvable: Exercise = { ...EX, expression: undefined, answer: { kind: 'number', value: null, offerUnsolvable: true } };
    expect(phrases.spokenSolution(unsolvable)).toBe('Die Aufgabe ist nicht lösbar – es fehlt eine Angabe.');
  });

  it('cells: no "siehe Lösungsbild"; the solution points to the marked cells, a correct drawing needs no repeat', () => {
    const ex: Exercise = {
      ...EX,
      expression: undefined,
      answer: { kind: 'cells', width: 4, height: 4, given: [[0, 0]], solution: [[3, 0]] },
    };
    expect(phrases.spokenSolution(ex)).toBe('Die richtigen Kästchen sind im Gitter mit einem Haken markiert.');
    expect(phrases.announceCorrect(ex, 'Du hast genau gespiegelt.')).toBe('Richtig! Du hast genau gespiegelt.');
    expect(phrases.announceSolution(ex)).not.toMatch(/Lösungsbild|Die Lösung ist/);
  });

  it('comparisons, multi chains, order and written division read as German sentences', () => {
    const cmp: Exercise = {
      ...EX,
      expression: `345 ${BOX} 354`,
      answer: { kind: 'choice', layout: 'symbols', options: [{ label: '<' }, { label: '>' }, { label: '=' }], correct: 0 },
    };
    expect(phrases.spokenSolution(cmp)).toBe('345 ist kleiner als 354.');
    const chain: Exercise = {
      ...EX,
      expression: undefined,
      answer: { kind: 'multi', fields: [{ id: 'a', value: 1, before: 'A =' }, { id: 'b', value: 0, before: 'B =' }] },
    };
    expect(phrases.spokenSolution(chain)).toBe('Die Lösung: A gleich 1, B gleich 0.');
    const order: Exercise = {
      ...EX,
      expression: undefined,
      answer: { kind: 'order', items: ['309 cm', '3 m 6 cm', '0,39 m'], direction: 'aufsteigend', correct: [2, 1, 0] },
    };
    expect(phrases.spokenSolution(order)).toBe('Die Reihenfolge: 0,39 m, dann 3 m 6 cm, dann 309 cm.');
    const div: Exercise = { ...EX, expression: undefined, answer: { kind: 'written', op: 'div', operands: [5174, 9], result: 574, remainder: 8 } };
    expect(phrases.spokenSolution(div)).toBe('Die Lösung ist 574 Rest 8.');
  });

  it('rotate cycles through variants', () => {
    expect(phrases.rotate(['a', 'b', 'c'], 4)).toBe('b');
    expect(phrases.rotate(['a', 'b', 'c'], -1)).toBe('c');
  });
});

describe('blitz helpers', () => {
  it('parses fact keys', () => {
    expect(parseFactKey('3x7')).toEqual([3, 7]);
    expect(parseFactKey('10x10')).toEqual([10, 10]);
    expect(parseFactKey('3·7')).toBeNull();
    expect(parseFactKey('12x3')).toBeNull();
  });

  it('builds correct tasks only from the given facts (independent check)', () => {
    const rng = createRng(42);
    const facts = ['3x7', '6x8', '4x10'];
    let divisions = 0;
    for (let i = 0; i < 300; i++) {
      const t = blitzTask(rng, facts)!;
      expect(facts).toContain(t.factKey);
      const [a, b] = parseFactKey(t.factKey)!;
      const m = /^(\d+) ([·:]) (\d+) = □$/.exec(t.expression)!;
      expect(m, t.expression).not.toBeNull();
      const x = Number(m[1]);
      const y = Number(m[3]);
      const expected = m[2] === '·' ? x * y : x / y;
      if (m[2] === ':') divisions++;
      expect(t.answer.value).toBe(expected);
      expect(Number.isInteger(expected)).toBe(true);
      if (m[2] === '·') expect([x, y].sort((p, q) => p - q)).toEqual([a, b].sort((p, q) => p - q));
      else expect(x).toBe(a * b);
      expect(t.srText).toMatch(/^Wie viel ist \d+ (mal|geteilt durch) \d+\?$/);
    }
    expect(divisions).toBeGreaterThan(30);
  });

  it('is deterministic for the same seed and avoids recent tasks when possible', () => {
    const facts = ['3x7', '6x8', '4x9', '2x5'];
    const a = blitzTask(createRng(7), facts);
    const b = blitzTask(createRng(7), facts);
    expect(a).toEqual(b);
    const rng = createRng(9);
    const recent = new Set<string>();
    let repeats = 0;
    for (let i = 0; i < 100; i++) {
      const t = blitzTask(rng, facts, recent)!;
      if (recent.has(t.key)) repeats++;
      recent.clear();
      recent.add(t.key);
    }
    expect(repeats).toBeLessThan(5);
  });

  it('returns null without usable facts', () => {
    expect(blitzTask(createRng(1), [])).toBeNull();
    expect(blitzTask(createRng(1), ['quatsch'])).toBeNull();
  });

  it('remaining time is calm text in half-minute steps', () => {
    expect(remainingText(120_000)).toBe('Noch 2 Minuten');
    expect(remainingText(75_000)).toBe('Noch 1½ Minuten');
    expect(remainingText(45_000)).toBe('Noch 1 Minute');
    expect(remainingText(10_000)).toBe('Noch eine halbe Minute');
    expect(remainingText(0)).toBe('Die Zeit ist um.');
  });
});

describe('holdover guard', () => {
  it('ignores pointer clicks within 400 ms of a screen change, never keyboard clicks', () => {
    expect(isHoldoverClick(1, 100)).toBe(true);
    expect(isHoldoverClick(1, 399)).toBe(true);
    expect(isHoldoverClick(1, 400)).toBe(false);
    expect(isHoldoverClick(0, 10)).toBe(false);
  });
});
