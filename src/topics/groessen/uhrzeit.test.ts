import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import { checkAnswer } from '../../core/check';
import { describeHands, spoken, uhrzeitSkill } from './uhrzeit';
import { samples, times } from './test-utils';

describeSkill(uhrzeitSkill, { minDistinct: 30 });

const fields = (ex: { answer: unknown }) => (ex.answer as { fields: { id: string; value: number }[] }).fields;

describe('groessen.uhrzeit specifics', () => {
  it('spoken German forms', () => {
    expect(spoken(2, 30)).toBe('halb drei');
    expect(spoken(8, 15)).toBe('Viertel nach acht');
    expect(spoken(8, 45)).toBe('Viertel vor neun');
    expect(spoken(15, 25)).toBe('fünf vor halb vier');
    expect(spoken(15, 35)).toBe('fünf nach halb vier');
    expect(spoken(12, 30)).toBe('halb eins');
    expect(spoken(13, 0)).toBe('ein Uhr');
    expect(spoken(11, 55)).toBe('fünf vor zwölf');
  });

  it('reading a clock: the answer equals the time on the clock; Stufe ranges', () => {
    for (const stufe of [1, 2, 3] as const) {
      for (const ex of samples(uhrzeitSkill, stufe)) {
        if (ex.visual?.type !== 'clock' || ex.answer.kind !== 'multi') continue;
        const [h, m] = fields(ex);
        expect(h.value).toBe(ex.visual.hours);
        expect(m.value).toBe(ex.visual.minutes);
        if (stufe === 1) {
          expect(h.value).toBeGreaterThanOrEqual(6);
          expect(h.value).toBeLessThanOrEqual(11);
          expect(m.value % 5).toBe(0);
        }
        if (stufe === 2) {
          expect(h.value).toBeGreaterThanOrEqual(13);
          expect(m.value % 5).toBe(0);
        }
        if (stufe === 3) expect(m.value % 5).not.toBe(0);
      }
    }
  });

  it('spoken → digital: hour and minutes match the spoken form (independent table)', () => {
    const words = ['zwölf', 'eins', 'zwei', 'drei', 'vier', 'fünf', 'sechs', 'sieben', 'acht', 'neun', 'zehn', 'elf'];
    const table: [RegExp, number, number][] = [
      [/^fünf vor halb (\S+)$/, 25, -1], [/^fünf nach halb (\S+)$/, 35, -1], [/^halb (\S+)$/, 30, -1],
      [/^Viertel nach (\S+)$/, 15, 0], [/^Viertel vor (\S+)$/, 45, -1],
      [/^fünf nach (\S+)$/, 5, 0], [/^zehn nach (\S+)$/, 10, 0], [/^zwanzig nach (\S+)$/, 20, 0],
      [/^zwanzig vor (\S+)$/, 40, -1], [/^zehn vor (\S+)$/, 50, -1], [/^fünf vor (\S+)$/, 55, -1],
      [/^(\S+) Uhr$/, 0, 0],
    ];
    let seen = 0;
    for (const stufe of [1, 2, 3] as const) {
      for (const ex of samples(uhrzeitSkill, stufe)) {
        const p = ex.prompt.match(/^Schreibe mit Ziffern: (.+) (am \S+|in der Nacht)\.$/);
        if (!p) continue;
        const row = table.find(([re]) => re.test(p[1]));
        expect(row, p[1]).toBeDefined();
        const [re, min, shift] = row!;
        const word = p[1].match(re)![1] === 'ein' ? 'eins' : p[1].match(re)![1];
        const expected12 = ((words.indexOf(word) + shift + 12) % 12) || 12;
        const [h, mm] = fields(ex);
        expect(mm.value).toBe(min);
        expect((h.value % 12) || 12).toBe(expected12);
        if (/Nachmittag|Abend/.test(p[2])) expect(h.value).toBeGreaterThanOrEqual(13);
        else if (/Mittag/.test(p[2])) expect([12, 13]).toContain(h.value);
        else expect(h.value).toBeLessThan(12);
        seen++;
      }
    }
    expect(seen).toBeGreaterThan(50);
  });

  it('a clock that runs fast/slow: real time = shown ∓ difference', () => {
    let seen = 0;
    for (const ex of samples(uhrzeitSkill, 3)) {
      const m = ex.context?.match(/geht (\d+) Minuten (vor|nach)/);
      if (!m) continue;
      seen++;
      const [shown] = times(ex.context!);
      const [h, mm] = fields(ex);
      expect(h.value * 60 + mm.value).toBe(shown + (m[2] === 'vor' ? -1 : 1) * Number(m[1]));
    }
    expect(seen).toBeGreaterThan(20);
  });

  it('typical bugs: hands swapped and the next hour after "halb"', () => {
    const ex = samples(uhrzeitSkill, 1).find((e) => e.visual?.type === 'clock' && e.answer.kind === 'multi' && e.visual.minutes === 40 && e.visual.hours !== 8)!;
    const h = (ex.visual as { hours: number }).hours;
    const r1 = checkAnswer(ex.answer, { kind: 'multi', values: { h: String(h + 1), min: '40' } }, ex.bugs);
    expect(r1.bugHint).toMatch(/noch nicht bei der nächsten Zahl/);
    const r2 = checkAnswer(ex.answer, { kind: 'multi', values: { h: '8', min: String((h % 12) * 5) } }, ex.bugs);
    expect(r2.bugHint).toMatch(/kurze Zeiger zeigt die Stunden/);
  });

  it('screen-reader description of the hands', () => {
    expect(describeHands(8, 20)).toBe('Der kurze Stundenzeiger steht zwischen der 8 und der 9. Der lange Minutenzeiger zeigt auf die 4.');
    expect(describeHands(15, 0)).toBe('Der kurze Stundenzeiger zeigt auf die 3. Der lange Minutenzeiger zeigt auf die 12.');
  });
});
