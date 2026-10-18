import { describe, expect, it } from 'vitest';
import { addDays, daysBetween, insertDay, isDay, today, weekStart, weekdayIndex } from './dates';

/** Independent day enumeration via the local calendar (constructor normalises overflowing dates). */
function* localDays(fromYear: number, toYear: number): Generator<{ y: number; m: number; d: number }> {
  for (let y = fromYear; y <= toYear; y++) {
    for (let m = 1; m <= 12; m++) {
      const len = new Date(y, m, 0).getDate();
      for (let d = 1; d <= len; d++) yield { y, m, d };
    }
  }
}
const iso = (y: number, m: number, d: number) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

describe('today', () => {
  it('uses the local calendar date', () => {
    expect(today(new Date(2026, 9, 19, 12, 0))).toBe('2026-10-19');
    expect(today(new Date(2026, 0, 5, 8))).toBe('2026-01-05');
  });

  it('is stable around midnight on DST change days (Europe: 29.03. and 25.10.2026)', () => {
    for (const [m, d] of [
      [3, 29],
      [10, 25],
    ]) {
      expect(today(new Date(2026, m - 1, d, 0, 30))).toBe(iso(2026, m, d));
      expect(today(new Date(2026, m - 1, d, 3, 30))).toBe(iso(2026, m, d));
      expect(today(new Date(2026, m - 1, d, 23, 59))).toBe(iso(2026, m, d));
    }
  });

  it('handles the year boundary', () => {
    expect(today(new Date(2026, 11, 31, 23, 59, 59))).toBe('2026-12-31');
    expect(today(new Date(2027, 0, 1, 0, 0, 1))).toBe('2027-01-01');
  });

  it('defaults to now', () => {
    expect(isDay(today())).toBe(true);
  });
});

describe('addDays / daysBetween', () => {
  it('crosses month, year and leap-day boundaries', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDays('2026-02-28', 1)).toBe('2026-03-01');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2028-02-29', 1)).toBe('2028-03-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2027-01-01', -1)).toBe('2026-12-31');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(addDays('2026-10-19', 28)).toBe('2026-11-16');
    expect(addDays('2026-10-19', 0)).toBe('2026-10-19');
    expect(addDays('2026-01-01', 365)).toBe('2027-01-01');
  });

  it('is exact across DST changes', () => {
    expect(addDays('2026-03-28', 1)).toBe('2026-03-29');
    expect(addDays('2026-03-29', 1)).toBe('2026-03-30');
    expect(addDays('2026-10-24', 1)).toBe('2026-10-25');
    expect(addDays('2026-10-25', 1)).toBe('2026-10-26');
    expect(daysBetween('2026-03-28', '2026-03-30')).toBe(2);
    expect(daysBetween('2026-10-24', '2026-10-26')).toBe(2);
    expect(daysBetween('2026-03-01', '2026-04-01')).toBe(31);
    expect(daysBetween('2026-10-01', '2026-11-01')).toBe(31);
  });

  it('counts whole days (b − a), negative when b is earlier', () => {
    expect(daysBetween('2026-01-01', '2027-01-01')).toBe(365);
    expect(daysBetween('2028-01-01', '2029-01-01')).toBe(366);
    expect(daysBetween('2026-10-19', '2026-10-12')).toBe(-7);
    expect(daysBetween('2026-10-19', '2026-10-19')).toBe(0);
  });

  it('matches the local calendar for every day of 2025–2029', () => {
    let prev: string | undefined;
    for (const { y, m, d } of localDays(2025, 2029)) {
      const day = iso(y, m, d);
      // independent: the local Date at 00:30 and 23:30 of that calendar day
      expect(today(new Date(y, m - 1, d, 0, 30))).toBe(day);
      expect(today(new Date(y, m - 1, d, 23, 30))).toBe(day);
      if (prev) {
        expect(addDays(prev, 1)).toBe(day);
        expect(addDays(day, -1)).toBe(prev);
        expect(daysBetween(prev, day)).toBe(1);
      }
      prev = day;
    }
  });
});

describe('weeks (Mon–Sun)', () => {
  it('knows the weekday (2026-10-19 is a Monday, 2026-10-18 a Sunday)', () => {
    expect(weekdayIndex('2026-10-19')).toBe(0);
    expect(weekdayIndex('2026-10-18')).toBe(6);
    expect(weekdayIndex('2027-01-01')).toBe(4);
  });

  it('weekStart across month and year boundaries', () => {
    expect(weekStart('2026-10-18')).toBe('2026-10-12');
    expect(weekStart('2026-10-19')).toBe('2026-10-19');
    expect(weekStart('2026-10-25')).toBe('2026-10-19');
    expect(weekStart('2026-11-01')).toBe('2026-10-26');
    expect(weekStart('2027-01-01')).toBe('2026-12-28');
    expect(addDays(weekStart('2026-12-28'), 6)).toBe('2027-01-03');
    expect(weekStart('2026-03-29')).toBe('2026-03-23');
  });

  it('agrees with an independent weekday computation for 2025–2029', () => {
    for (const { y, m, d } of localDays(2025, 2029)) {
      const day = iso(y, m, d);
      const expected = (new Date(y, m - 1, d, 12).getDay() + 6) % 7;
      expect(weekdayIndex(day)).toBe(expected);
      const ws = weekStart(day);
      expect(weekdayIndex(ws)).toBe(0);
      expect(daysBetween(ws, day)).toBe(expected);
    }
  });
});

describe('isDay / insertDay', () => {
  it('accepts real calendar dates only', () => {
    expect(isDay('2026-10-19')).toBe(true);
    expect(isDay('2028-02-29')).toBe(true);
    for (const bad of ['2027-02-29', '2026-02-30', '2026-13-01', '2026-00-10', '2026-1-1', '26-01-01', '2026-10-19T00:00', '', ' 2026-10-19']) {
      expect(isDay(bad), bad).toBe(false);
    }
    expect(isDay(20261019)).toBe(false);
    expect(isDay(null)).toBe(false);
  });

  it('keeps days distinct and sorted', () => {
    const a = insertDay([], '2026-10-19');
    const b = insertDay(a, '2026-10-12');
    const c = insertDay(b, '2026-10-19');
    expect(b).toEqual(['2026-10-12', '2026-10-19']);
    expect(c).toBe(b);
    expect(insertDay(b, '2027-01-01')).toEqual(['2026-10-12', '2026-10-19', '2027-01-01']);
  });
});
