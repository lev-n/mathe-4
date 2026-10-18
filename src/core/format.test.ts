import { describe, expect, it } from 'vitest';
import { fmt, fmtDuration, fmtMoney, fmtQty, fmtTime, numberWord, toSpeech } from './format';

const G = ' ';
const N = ' ';

describe('fmt', () => {
  it('groups numbers with 5+ digits using U+202F and leaves 4-digit numbers ungrouped', () => {
    expect(fmt(7)).toBe('7');
    expect(fmt(2500)).toBe('2500');
    expect(fmt(12345)).toBe(`12${G}345`);
    expect(fmt(345678)).toBe(`345${G}678`);
    expect(fmt(1000000)).toBe(`1${G}000${G}000`);
  });
  it('uses a decimal comma and the minus sign U+2212', () => {
    expect(fmt(2.5)).toBe('2,5');
    expect(fmt(2.5, 2)).toBe('2,50');
    expect(fmt(1.05, 2)).toBe('1,05');
    expect(fmt(0.75, 3)).toBe('0,750');
    expect(fmt(-3)).toBe('−3');
    expect(fmt(12345.5, 2)).toBe(`12${G}345,50`);
  });
  it('rejects non-finite numbers', () => {
    expect(() => fmt(NaN)).toThrow();
  });
});

describe('quantities', () => {
  it('formats money, quantities, clock times and durations', () => {
    expect(fmtMoney(345)).toBe(`3,45${N}€`);
    expect(fmtMoney(5)).toBe(`0,05${N}€`);
    expect(fmtMoney(1200000)).toBe(`12${G}000,00${N}€`);
    expect(fmtQty(5, 'kg')).toBe(`5${N}kg`);
    expect(fmtQty(1.05, 'm', 2)).toBe(`1,05${N}m`);
    expect(fmtTime(14, 5)).toBe(`14:05${N}Uhr`);
    expect(fmtTime(8, 30, false)).toBe('8:30');
    expect(fmtDuration(85)).toBe(`1${N}h 25${N}min`);
    expect(fmtDuration(60)).toBe(`1${N}h`);
    expect(fmtDuration(45)).toBe(`45${N}min`);
  });
});

describe('numberWord', () => {
  it.each([
    [0, 'null'],
    [1, 'eins'],
    [11, 'elf'],
    [16, 'sechzehn'],
    [17, 'siebzehn'],
    [21, 'einundzwanzig'],
    [30, 'dreißig'],
    [99, 'neunundneunzig'],
    [100, 'einhundert'],
    [101, 'einhunderteins'],
    [1000, 'eintausend'],
    [1001, 'eintausendeins'],
    [21000, 'einundzwanzigtausend'],
    [304020, 'dreihundertviertausendzwanzig'],
    [201001, 'zweihunderteintausendeins'],
    [777777, 'siebenhundertsiebenundsiebzigtausendsiebenhundertsiebenundsiebzig'],
    [1000000, 'eine Million'],
  ])('%i → %s', (n, word) => {
    expect(numberWord(n)).toBe(word);
  });
  it('rejects out-of-range input', () => {
    expect(() => numberWord(1000001)).toThrow();
    expect(() => numberWord(2.5)).toThrow();
  });
});

describe('toSpeech', () => {
  it('spells out operators and joins grouped digits', () => {
    expect(toSpeech('7 · 8 = □')).toBe('7 mal 8 gleich Lücke');
    expect(toSpeech(`345${G}678 ≈ □`)).toBe('345678 ist ungefähr Lücke');
    expect(toSpeech('56 : 7 = 8')).toBe('56 geteilt durch 7 gleich 8');
    expect(toSpeech('900 − 1')).toBe('900 minus 1');
    expect(toSpeech('14:30 Uhr')).toBe('14:30 Uhr');
  });
  it('never reads a clock time as a division', () => {
    expect(toSpeech('21 : 0 Uhr')).toBe('21:00 Uhr');
    expect(toSpeech('Die Lösung ist 11 : 15\u00A0Uhr.')).toBe('Die Lösung ist 11:15 Uhr.');
    expect(toSpeech('21:00\u00A0Uhr')).toBe('21:00 Uhr');
    expect(toSpeech('48 : 6 = 8')).toBe('48 geteilt durch 6 gleich 8');
  });
  it('leaves no space before punctuation', () => {
    expect(toSpeech('Das sind etwa 1 □.')).toBe('Das sind etwa 1 Lücke.');
    expect(toSpeech('□, □ und □ .')).toBe('Lücke, Lücke und Lücke.');
    expect(toSpeech('3 · 4 = □ ?')).toBe('3 mal 4 gleich Lücke?');
  });
});
