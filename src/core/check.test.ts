import { describe, expect, it } from 'vitest';
import { UEBERSCHLAG_MISSING, checkAnswer, correctResponse, formatAnswer, isEmptyResponse, responseForBug } from './check';
import type { Answer, Bug } from './types';

describe('checkAnswer: number', () => {
  const answer: Answer = { kind: 'number', value: 345700 };
  const bugs: Bug[] = [{ id: 'abrunden', match: 345600, hint: 'Schau auf die Zehnerstelle.' }];
  it('accepts every notation of the correct value', () => {
    for (const text of ['345700', '345 700', '345.700', '345 700']) {
      expect(checkAnswer(answer, { kind: 'number', text }).correct).toBe(true);
    }
  });
  it('returns a targeted hint for a known bug', () => {
    const r = checkAnswer(answer, { kind: 'number', text: '345600' }, bugs);
    expect(r).toEqual({ correct: false, bugHint: 'Schau auf die Zehnerstelle.' });
  });
  it('treats unreadable input as invalid, not wrong', () => {
    const r = checkAnswer(answer, { kind: 'number', text: '345,7' });
    expect(r.correct).toBe(false);
    expect(r.invalid).toBeTruthy();
  });
  it('handles decimals and the "Nicht lösbar" option', () => {
    const money: Answer = { kind: 'number', value: 3.5, decimals: 2, unit: '€' };
    expect(checkAnswer(money, { kind: 'number', text: '3,50' }).correct).toBe(true);
    expect(checkAnswer(money, { kind: 'number', text: '3,5' }).correct).toBe(true);
    expect(checkAnswer(money, { kind: 'number', text: '', unsolvable: true }).correct).toBe(false);
    const unsolvable: Answer = { kind: 'number', value: null, offerUnsolvable: true };
    expect(checkAnswer(unsolvable, { kind: 'number', text: '', unsolvable: true }).correct).toBe(true);
    expect(checkAnswer(unsolvable, { kind: 'number', text: '12' }).correct).toBe(false);
  });
});

describe('checkAnswer: choice, multi, order', () => {
  it('choice returns whyWrong', () => {
    const a: Answer = { kind: 'choice', options: [{ label: '<' }, { label: '>', whyWrong: 'Vergleiche zuerst die höchste Stelle.' }, { label: '=' }], correct: 0, layout: 'symbols' };
    expect(checkAnswer(a, { kind: 'choice', index: 0 }).correct).toBe(true);
    expect(checkAnswer(a, { kind: 'choice', index: 1 }).bugHint).toMatch(/höchste Stelle/);
    expect(checkAnswer(a, { kind: 'choice', index: -1 }).invalid).toBeTruthy();
  });
  it('multi reports per-field correctness and bug matches', () => {
    const a: Answer = { kind: 'multi', fields: [{ id: 'e', value: 3, after: '€' }, { id: 'ct', value: 45, after: 'ct' }] };
    const bugs: Bug[] = [{ id: 'swap', match: { e: 45, ct: 3 }, hint: 'Euro kommen vor dem Komma.' }];
    expect(checkAnswer(a, { kind: 'multi', values: { e: '3', ct: '45' } }).correct).toBe(true);
    const r = checkAnswer(a, { kind: 'multi', values: { e: '3', ct: '4' } }, bugs);
    expect(r.fieldCorrect).toEqual({ e: true, ct: false });
    expect(checkAnswer(a, { kind: 'multi', values: { e: '45', ct: '3' } }, bugs).bugHint).toMatch(/Euro/);
    expect(checkAnswer(a, { kind: 'multi', values: { e: '', ct: '45' } }).invalid).toBeTruthy();
  });
  it('order compares the sequence', () => {
    const a: Answer = { kind: 'order', items: ['30', '10', '20'], correct: [1, 2, 0], direction: 'aufsteigend' };
    expect(checkAnswer(a, { kind: 'order', order: [1, 2, 0] }).correct).toBe(true);
    expect(checkAnswer(a, { kind: 'order', order: [2, 1, 0] }).correct).toBe(false);
    expect(checkAnswer(a, { kind: 'order', order: [1] }).invalid).toBeTruthy();
    expect(formatAnswer(a)).toBe('10 < 20 < 30');
  });
  it('order bugs match an exact index order', () => {
    const a: Answer = { kind: 'order', items: ['2 m 5 cm', '250 cm', '2,15 m'], correct: [0, 2, 1], direction: 'aufsteigend' };
    const bugs: Bug[] = [{ id: 'nur-zahlen', match: [0, 2, 1].reverse(), hint: 'Achte auf die Einheiten.' }];
    expect(checkAnswer(a, { kind: 'order', order: [1, 2, 0] }, bugs)).toEqual({ correct: false, bugHint: 'Achte auf die Einheiten.' });
    expect(checkAnswer(a, { kind: 'order', order: [2, 0, 1] }, bugs)).toEqual({ correct: false, bugHint: undefined });
    expect(responseForBug(a, bugs[0])).toEqual({ kind: 'order', order: [1, 2, 0] });
    // array matches never apply to other answer kinds
    expect(checkAnswer({ kind: 'number', value: 5 }, { kind: 'number', text: '1' }, [{ id: 'x', match: [1], hint: 'h' }]).bugHint).toBeUndefined();
  });
});

describe('checkAnswer: written', () => {
  it('marks wrong columns from the right (0 = Einer)', () => {
    const a: Answer = { kind: 'written', op: 'add', operands: [478, 256], result: 734 };
    expect(checkAnswer(a, { kind: 'written', result: '734' }).correct).toBe(true);
    const r = checkAnswer(a, { kind: 'written', result: '624' }, [{ id: 'carry', match: 624, hint: 'Denk an den Übertrag.' }]);
    expect(r.correct).toBe(false);
    expect(r.wrongColumns).toEqual([1, 2]);
    expect(r.bugHint).toMatch(/Übertrag/);
  });
  it('checks the remainder in division', () => {
    const a: Answer = { kind: 'written', op: 'div', operands: [23, 5], result: 4, remainder: 3 };
    expect(checkAnswer(a, { kind: 'written', result: '4', remainder: '3' }).correct).toBe(true);
    const r = checkAnswer(a, { kind: 'written', result: '4', remainder: '' });
    expect(r.correct).toBe(false);
    expect(r.remainderCorrect).toBe(false);
    const noRest: Answer = { kind: 'written', op: 'div', operands: [24, 6], result: 4, remainder: 0 };
    expect(checkAnswer(noRest, { kind: 'written', result: '4', remainder: '' }).correct).toBe(true);
    expect(checkAnswer(noRest, { kind: 'written', result: '4', remainder: '0' }).correct).toBe(true);
    expect(formatAnswer(a)).toBe('4 R 3');
  });
  it('division bugs with a remainder need quotient and remainder to match', () => {
    const a: Answer = { kind: 'written', op: 'div', operands: [23, 5], result: 4, remainder: 3 };
    const bugs: Bug[] = [
      { id: 'rest-vergessen', match: 4, remainder: 0, hint: 'Es bleibt etwas übrig.' },
      { id: 'quotient', match: 3, hint: 'Passt 5 noch einmal hinein?' },
    ];
    expect(checkAnswer(a, { kind: 'written', result: '4', remainder: '' }, bugs).bugHint).toBe('Es bleibt etwas übrig.');
    expect(checkAnswer(a, { kind: 'written', result: '4', remainder: '0' }, bugs).bugHint).toBe('Es bleibt etwas übrig.');
    expect(checkAnswer(a, { kind: 'written', result: '4', remainder: '2' }, bugs).bugHint).toBeUndefined();
    expect(checkAnswer(a, { kind: 'written', result: '3', remainder: '8' }, bugs).bugHint).toBe('Passt 5 noch einmal hinein?');
    expect(responseForBug(a, bugs[0])).toEqual({ kind: 'written', result: '4', remainder: '' });
    expect(responseForBug(a, bugs[1])).toEqual({ kind: 'written', result: '3', remainder: '3' });
  });
});

describe('checkAnswer: cells and numberline', () => {
  it('cells compares sets, ignoring given cells', () => {
    const a: Answer = { kind: 'cells', width: 4, height: 2, given: [[0, 0]], solution: [[3, 0], [2, 1]] };
    expect(checkAnswer(a, { kind: 'cells', cells: [[2, 1], [3, 0]] }).correct).toBe(true);
    expect(checkAnswer(a, { kind: 'cells', cells: [[0, 0], [2, 1], [3, 0]] }).correct).toBe(true);
    const r = checkAnswer(a, { kind: 'cells', cells: [[3, 0], [1, 1]] });
    expect(r.correct).toBe(false);
    expect(r.extraCells).toEqual([[1, 1]]);
    expect(r.missingCells).toEqual([[2, 1]]);
    expect(checkAnswer(a, { kind: 'cells', cells: [] }).invalid).toBeTruthy();
  });
  it('numberline respects tolerance', () => {
    const a: Answer = { kind: 'numberline', min: 0, max: 10000, majorStep: 1000, minorStep: 100, step: 100, value: 3400, tolerance: 100, labelMajor: true };
    expect(checkAnswer(a, { kind: 'numberline', value: 3500 }).correct).toBe(true);
    expect(checkAnswer(a, { kind: 'numberline', value: 3600 }).correct).toBe(false);
  });
});

describe('helpers', () => {
  const answers: Answer[] = [
    { kind: 'number', value: 12345 },
    { kind: 'number', value: 3.05, decimals: 2 },
    { kind: 'number', value: null, offerUnsolvable: true },
    { kind: 'choice', options: [{ label: 'a' }, { label: 'b' }], correct: 1 },
    { kind: 'multi', fields: [{ id: 'm', value: 2 }, { id: 'cm', value: 50 }] },
    { kind: 'written', op: 'mul', operands: [1254, 37], result: 46398 },
    { kind: 'written', op: 'div', operands: [4230, 6], result: 705, remainder: 0 },
    { kind: 'cells', width: 3, height: 3, given: [], solution: [[1, 1]] },
    { kind: 'numberline', min: 0, max: 100, majorStep: 10, minorStep: 1, step: 1, value: 37, tolerance: 0, labelMajor: true },
    { kind: 'order', items: ['b', 'a'], correct: [1, 0], direction: 'aufsteigend' },
  ];
  it.each(answers.map((a) => [a.kind, a] as const))('correctResponse is accepted (%s)', (_, a) => {
    expect(checkAnswer(a, correctResponse(a)).correct).toBe(true);
    expect(isEmptyResponse(correctResponse(a))).toBe(false);
    expect(formatAnswer(a).length).toBeGreaterThan(0);
  });
  it('responseForBug builds parseable wrong answers', () => {
    const a: Answer = { kind: 'number', value: 3.5, decimals: 2 };
    const r = responseForBug(a, { id: 'x', match: 35, hint: 'h' });
    expect(r).toEqual({ kind: 'number', text: '35' });
    expect(isEmptyResponse(null)).toBe(true);
    expect(isEmptyResponse({ kind: 'number', text: '  ' })).toBe(true);
  });
});

describe('formatAnswer: clock times', () => {
  const time = (h: number, min: number): Answer => ({
    kind: 'multi',
    fields: [
      { id: 'h', value: h, after: ':', label: 'Stunden' },
      { id: 'min', value: min, after: 'Uhr', label: 'Minuten' },
    ],
  });
  it('writes h:mm Uhr with zero-padded minutes, never "21 : 0 Uhr"', () => {
    expect(formatAnswer(time(21, 0))).toBe('21:00\u00A0Uhr');
    expect(formatAnswer(time(9, 5))).toBe('9:05\u00A0Uhr');
    expect(formatAnswer(time(11, 15))).toBe('11:15\u00A0Uhr');
    expect(formatAnswer(time(0, 30))).toBe('0:30\u00A0Uhr');
  });
  it('keeps other multi answers unchanged', () => {
    const money: Answer = { kind: 'multi', fields: [{ id: 'e', value: 3, before: '3,45 € =', after: '€' }, { id: 'c', value: 45, after: 'ct' }] };
    expect(formatAnswer(money)).toBe('3,45 € = 3 € 45 ct');
    const span: Answer = { kind: 'multi', fields: [{ id: 'h', value: 1, after: 'h' }, { id: 'min', value: 5, after: 'min' }] };
    expect(formatAnswer(span)).toBe('1 h 5 min');
  });
});

describe('checkAnswer: written with an Überschlag', () => {
  // 4 873 + 3 125 = 7 998, Überschlag 5 000 + 3 000 = 8 000
  const a: Answer = { kind: 'written', op: 'add', operands: [4873, 3125], result: 7998, ueberschlag: 8000 };
  const bugs: Bug[] = [{ id: 'carry', match: 7898, hint: 'Denk an den Übertrag.' }];
  it('needs an Überschlag before checking (not counted as an attempt)', () => {
    expect(checkAnswer(a, { kind: 'written', result: '7998' })).toEqual({ correct: false, invalid: UEBERSCHLAG_MISSING });
    expect(checkAnswer(a, { kind: 'written', result: '7998', ueberschlag: 'acht' }).invalid).toMatch(/Überschlag/);
  });
  it('checks the Überschlag loosely and never lets it decide the result', () => {
    expect(checkAnswer(a, { kind: 'written', result: '7998', ueberschlag: '8 000' })).toMatchObject({ correct: true, ueberschlagOk: true });
    expect(checkAnswer(a, { kind: 'written', result: '7998', ueberschlag: '7900' })).toMatchObject({ correct: true, ueberschlagOk: true });
    expect(checkAnswer(a, { kind: 'written', result: '7998', ueberschlag: '80' })).toMatchObject({ correct: true, ueberschlagOk: false });
    expect(checkAnswer(a, correctResponse(a))).toMatchObject({ correct: true, ueberschlagOk: true });
  });
  it('a known mistake keeps its hint; otherwise the own Überschlag is the check', () => {
    expect(checkAnswer(a, responseForBug(a, bugs[0])!, bugs).bugHint).toBe('Denk an den Übertrag.');
    expect(checkAnswer(a, { kind: 'written', result: '17998', ueberschlag: '8000' }, bugs).bugHint).toMatch(/passt nicht zu deinem Überschlag/);
    // close to the Überschlag: no such claim
    expect(checkAnswer(a, { kind: 'written', result: '7988', ueberschlag: '8000' }, bugs).bugHint).toBeUndefined();
    // a far-off Überschlag is not used as the check
    expect(checkAnswer(a, { kind: 'written', result: '17998', ueberschlag: '80' }, bugs).bugHint).toBeUndefined();
  });
  it('tasks without an Überschlag ignore the field', () => {
    const plain: Answer = { kind: 'written', op: 'add', operands: [12, 30], result: 42 };
    expect(checkAnswer(plain, { kind: 'written', result: '42' })).toEqual({ correct: true, wrongColumns: [] });
  });
});
