import { describe, expect, it } from 'vitest';
import { checkAnswer } from '../../core/check';
import { describeSkill } from '../../core/testing';
import type { Exercise } from '../../core/types';
import { countSteps, strichlistenSkill, _internal } from './strichlisten';
import { byMode, keyPart, nums, samples } from './testUtils';

describeSkill(strichlistenSkill, { minDistinct: 40 });

const tallyRows = (e: Exercise) => {
  if (e.visual?.type !== 'tally') throw new Error('tally expected');
  return e.visual.rows;
};
const tableRows = (e: Exercise) => {
  if (e.visual?.type !== 'table') throw new Error('table expected');
  return e.visual.rows;
};
const numValue = (e: Exercise) => {
  if (e.answer.kind !== 'number') throw new Error('number expected');
  return e.answer.value;
};

describe('daten.strichlisten – answers recomputed from the visual', () => {
  const s1 = samples(strichlistenSkill, 1);
  const s2 = samples(strichlistenSkill, 2);
  const s3 = samples(strichlistenSkill, 3);

  it('Stufe 1: reading a row gives its stroke count; bounds 3–4 rows, counts 3–22', () => {
    const read = byMode(s1, 'lesen');
    expect(read.length).toBeGreaterThan(50);
    for (const e of read) {
      const rows = tallyRows(e);
      expect(rows.length).toBeGreaterThanOrEqual(3);
      expect(rows.length).toBeLessThanOrEqual(4);
      const row = rows.find((r) => e.prompt.includes(r.label));
      expect(row).toBeDefined();
      expect(numValue(e)).toBe(row!.count);
      expect(row!.count).toBeGreaterThanOrEqual(5);
    }
    for (const e of s1) tallyRows(e).forEach((r) => expect(r.count).toBeLessThanOrEqual(22));
  });

  it('Stufe 1: the largest / smallest row is the correct choice', () => {
    for (const e of [...byMode(s1, 'max'), ...byMode(s1, 'min')]) {
      const rows = tallyRows(e);
      const counts = rows.map((r) => r.count);
      const target = keyPart(e, 2) === 'max' ? Math.max(...counts) : Math.min(...counts);
      if (e.answer.kind !== 'choice') throw new Error('choice expected');
      expect(e.answer.options[e.answer.correct].label).toBe(rows.find((r) => r.count === target)!.label);
      expect(counts.filter((c) => c === target)).toHaveLength(1);
    }
  });

  it('Stufe 2: totals, sums and differences match the data (≤ 5 rows, counts ≤ 60)', () => {
    for (const e of s2) {
      const mode = keyPart(e, 2);
      const values = nums(keyPart(e, 6));
      const rows = keyPart(e, 3) === 'strich' ? tallyRows(e).map((r) => r.count) : tableRows(e).map((r) => Number(r[1]));
      expect(rows).toEqual(values);
      expect(values.length).toBeLessThanOrEqual(5);
      values.forEach((v) => expect(v).toBeLessThanOrEqual(60));
      if (mode === 'total') expect(numValue(e)).toBe(values.reduce((a, b) => a + b, 0));
      else {
        const a = values[Number(keyPart(e, 7))];
        const b = values[Number(keyPart(e, 8))];
        expect(numValue(e)).toBe(mode === 'diff' ? a - b : a + b);
        expect(a).toBeGreaterThan(b);
      }
    }
  });

  it('Stufe 3: missing table value = total − known values', () => {
    const list = byMode(s3, 'fehlt');
    expect(list.length).toBeGreaterThan(30);
    for (const e of list) {
      const rows = tableRows(e);
      const total = Number(rows[rows.length - 1][1]);
      const known = rows.slice(0, -1).filter((r) => r[1] !== '?').map((r) => Number(r[1]));
      expect(rows.filter((r) => r[1] === '?')).toHaveLength(1);
      expect(numValue(e)).toBe(total - known.reduce((a, b) => a + b, 0));
      expect(e.knobel).toBe(true);
    }
  });

  it('Stufe 3: corrected total = all strokes − extra strokes', () => {
    for (const e of byMode(s3, 'korrektur')) {
      const total = tallyRows(e).reduce((a, r) => a + r.count, 0);
      const k = Number(keyPart(e, 7));
      expect(numValue(e)).toBe(total - k);
    }
  });

  it('Stufe 3: bundles and single strokes', () => {
    for (const e of byMode(s3, 'buendeln')) {
      const v = Number(keyPart(e, 3));
      if (e.answer.kind !== 'multi') throw new Error('multi expected');
      const [b, r] = e.answer.fields.map((f) => f.value);
      expect(5 * b + r).toBe(v);
      expect(r).toBeLessThan(5);
    }
  });
});

describe('daten.strichlisten – misconceptions', () => {
  it('counting a bundle as 4 or as 1 gives the predicted numbers', () => {
    expect(_internal.asFour(13)).toBe(11);
    expect(_internal.bundles(13) + (13 % 5)).toBe(5);
    expect(_internal.asFour(20)).toBe(16);
  });

  it('a reading item reports the bundle-as-4 hint for value − bundles', () => {
    const e = byMode(samples(strichlistenSkill, 1), 'lesen')[0];
    const v = numValue(e)!;
    const res = checkAnswer(e.answer, { kind: 'number', text: String(v - Math.floor(v / 5)) }, e.bugs);
    expect(res.correct).toBe(false);
    expect(res.bugHint).toMatch(/Querstrich/);
  });

  it('difference items flag adding instead of subtracting', () => {
    const e = byMode(samples(strichlistenSkill, 2), 'diff')[0];
    const values = nums(keyPart(e, 6));
    const a = values[Number(keyPart(e, 7))];
    const b = values[Number(keyPart(e, 8))];
    const res = checkAnswer(e.answer, { kind: 'number', text: String(a + b) }, e.bugs);
    expect(res.bugHint).toMatch(/minus/);
  });

  it('bundle splitting flags rounding up', () => {
    const e = byMode(samples(strichlistenSkill, 3), 'buendeln').find((x) => Number(keyPart(x, 3)) % 5 !== 0)!;
    const v = Number(keyPart(e, 3));
    const res = checkAnswer(e.answer, { kind: 'multi', values: { b: String(Math.ceil(v / 5)), r: '0' } }, e.bugs);
    expect(res.correct).toBe(false);
    expect(res.bugHint).toMatch(/erst mit 5 Strichen voll/);
  });

  it('worked steps count in fives', () => {
    expect(countSteps('Autos', 13)).toContain('5, 10');
    expect(countSteps('Autos', 13)).toContain('10 + 3 = 13');
    expect(countSteps('Autos', 4)).toContain('4 einzelne');
    expect(countSteps('Autos', 11)).toContain('Dazu kommt 1 einzelner Strich: 10 + 1 = 11.');
    expect(countSteps('Autos', 1)).toBe('In der Zeile „Autos“ ist 1 einzelner Strich.');
  });
});
