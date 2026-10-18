import { describe, expect, it } from 'vitest';
import { parseDigits, parseNumber } from './parse';

const ok = (raw: string, decimals = 0) => {
  const r = parseNumber(raw, decimals);
  if (!r.ok) throw new Error(`expected ok for "${raw}": ${r.reason}`);
  return r.value;
};
const bad = (raw: string, decimals = 0) => {
  const r = parseNumber(raw, decimals);
  if (r.ok) throw new Error(`expected reason for "${raw}", got ${r.value}`);
  return r.reason;
};

describe('parseNumber', () => {
  it('accepts plain, space-grouped and dot-grouped integers', () => {
    expect(ok('345678')).toBe(345678);
    expect(ok('345 678')).toBe(345678);
    expect(ok('345 678')).toBe(345678);
    expect(ok('345 678')).toBe(345678);
    expect(ok('345.678')).toBe(345678);
    expect(ok('1.000.000')).toBe(1000000);
    expect(ok(' 42 ')).toBe(42);
    expect(ok('007')).toBe(7);
  });
  it('accepts decimal comma and dot in decimal tasks', () => {
    expect(ok('3,5', 2)).toBe(3.5);
    expect(ok('3,50', 2)).toBe(3.5);
    expect(ok('3.5', 2)).toBe(3.5);
    expect(ok('1.234,5', 2)).toBe(1234.5);
    expect(ok('0,750', 3)).toBe(0.75);
    expect(ok('12', 2)).toBe(12);
  });
  it('gives friendly reasons instead of judging unreadable input', () => {
    expect(bad('')).toMatch(/Zahl ein/);
    expect(bad('abc')).toMatch(/Ziffern/);
    expect(bad('345,678')).toMatch(/ohne Komma/);
    expect(bad('3,5')).toMatch(/ganze Zahl/);
    expect(bad('3.5')).toMatch(/ganze Zahl/);
    expect(bad('3,505', 2)).toMatch(/höchstens 2 Stellen/);
    expect(bad('1,2,3', 2)).toMatch(/ein Komma/);
    expect(bad('1.500', 3)).toMatch(/Komma/);
    expect(bad('12.34.5')).toMatch(/nicht lesen/);
    expect(bad('3,', 2)).toMatch(/Ziffer/);
  });
  it('accepts the minus sign', () => {
    expect(ok('−5')).toBe(-5);
    expect(ok('-5')).toBe(-5);
  });
});

describe('parseDigits', () => {
  it('accepts digits only', () => {
    expect(parseDigits('0123')).toEqual({ ok: true, value: 123 });
    expect(parseDigits('12 3')).toEqual({ ok: true, value: 123 });
    expect(parseDigits('').ok).toBe(false);
    expect(parseDigits('1a').ok).toBe(false);
  });
  it('names an empty box inside the result (WrittenInput sends it as _)', () => {
    expect(parseDigits('1_3')).toEqual({ ok: false, reason: 'Ein Kästchen im Ergebnis ist noch leer.' });
    expect(parseDigits('1a')).toEqual({ ok: false, reason: 'In jedes Kästchen kommt genau eine Ziffer.' });
  });
});
