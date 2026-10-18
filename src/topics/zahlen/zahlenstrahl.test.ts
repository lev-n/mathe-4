import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import { createRng } from '../../core/rng';
import type { Exercise, Stufe } from '../../core/types';
import { ablesen, describeMark, eintragen, mitteZwischen, zahlenstrahlSkill, type Line } from './zahlenstrahl';

describeSkill(zahlenstrahlSkill, { minDistinct: 20 });

const ctx = { subtractionMethod: 'abziehen', nrwExtras: false } as const;
const sample = (stufe: Stufe): Exercise[] => Array.from({ length: 300 }, (_, i) => zahlenstrahlSkill.generate(createRng(2024 + i), stufe, ctx));
const bug = (ex: Exercise, id: string) => ex.bugs?.find((b) => b.id === id)?.match;

describe('zahlen.zahlenstrahl', () => {
  it('answers match the key and lie on the line', () => {
    for (const stufe of [1, 2, 3] as Stufe[]) {
      for (const ex of sample(stufe)) {
        const [, , kind, ...p] = ex.key.split(':');
        if (kind === 'ablesen') {
          const [min, max, major, minor, value] = p.map(Number);
          expect(ex.answer).toMatchObject({ value });
          expect(ex.visual).toMatchObject({ type: 'numberLine', min, max, majorStep: major, minorStep: minor });
          expect((ex.visual as { marks: { value: number }[] }).marks[0].value).toBe(value);
          expect((value - min) % minor).toBe(0);
          expect(value > min && value < max).toBe(true);
        } else if (kind === 'eintragen') {
          const [min, max, , , value] = p.map(Number);
          expect(ex.answer).toMatchObject({ kind: 'numberline', min, max, value });
        } else if (kind === 'schaetzen') {
          if (ex.answer.kind !== 'choice') throw new Error('choice');
          const correct = ex.answer.correct;
          const value = Number(p[0]);
          expect(Number(ex.answer.options[ex.answer.correct].label.replace(/\D/g, ''))).toBe(value);
          ex.answer.options.forEach((o, i) => {
            if (i !== correct) expect(Math.abs(Number(o.label.replace(/\D/g, '')) - value)).toBeGreaterThanOrEqual(150_000);
          });
        } else {
          expect(kind).toBe('mitte');
          const [a, b] = p.map(Number);
          expect(ex.answer).toMatchObject({ value: (a + b) / 2 });
        }
      }
    }
  });

  it('Stufe 1 lines have labelled big ticks with steps of 1000 or more; Stufe 2 lines are zoomed with unlabelled ticks', () => {
    for (const ex of sample(1)) {
      const line = ex.answer.kind === 'numberline' ? ex.answer : ex.visual;
      expect(line).toMatchObject({ labelMajor: true });
      expect((line as { minorStep: number }).minorStep).toBeGreaterThanOrEqual(500);
      expect((line as { max: number }).max).toBeLessThanOrEqual(100_000);
    }
    for (const ex of sample(2)) {
      const line = (ex.answer.kind === 'numberline' ? ex.answer : ex.visual) as { min: number; max: number; labelMajor: boolean };
      expect(line.labelMajor).toBe(false);
      expect(line.max - line.min).toBeLessThanOrEqual(100_000);
      expect(line.max).toBeLessThanOrEqual(1_000_000);
    }
  });

  it('placing tasks describe exactly the labels the answer input shows', () => {
    for (const stufe of [1, 2, 3] as Stufe[]) {
      for (const ex of sample(stufe)) {
        if (ex.answer.kind !== 'numberline') continue;
        const a = ex.answer;
        const shown: number[] = [];
        if (a.labelMajor) for (let v = a.min; v <= a.max; v += a.majorStep) shown.push(v);
        else shown.push(...(a.labels ?? [a.min, a.max]));
        expect(shown[0]).toBe(a.min);
        expect(shown[shown.length - 1]).toBe(a.max);
        expect(ex.srText).toContain(`Beschriftet: ${shown.join(', ')}.`);
      }
    }
  });

  it('estimate items keep the labels their hints talk about', () => {
    const est: Line = { min: 0, max: 1_000_000, major: 100_000, minor: 100_000, labelMajor: false, labels: [0, 500_000, 1_000_000] };
    const ex = eintragen(est, 520_000, 3, 20_000, 10_000);
    expect(ex.answer).toMatchObject({ labels: [0, 500_000, 1_000_000] });
    expect(ex.hints[0]).toContain('beschrifteten Zahlen');
    for (const x of sample(3)) {
      if (x.answer.kind !== 'numberline') continue;
      expect(x.answer.labels?.length).toBeGreaterThanOrEqual(3);
    }
  });

  const zoom: Line = { min: 340_000, max: 350_000, major: 1_000, minor: 500, labelMajor: false, labels: [340_000, 350_000] };

  it('describes a mark without giving its value', () => {
    expect(describeMark(zoom, 343_500, 'Der Pfeil A')).toBe('Der Pfeil A steht 3 lange Abschnitte und 1 kleinen Abschnitt rechts von 340000.');
    const est: Line = { min: 0, max: 1_000_000, major: 100_000, minor: 100_000, labelMajor: false, labels: [0, 500_000, 1_000_000] };
    expect(describeMark(est, 640_000, 'Der Pfeil A')).toBe('Der Pfeil A steht im 7. Abschnitt von links, näher am linken Strich.');
  });

  it('reading bugs: counting ticks, wrong step size, off by one tick', () => {
    const ex = ablesen(zoom, 343_500, 2);
    expect(ex.answer).toMatchObject({ value: 343_500 });
    expect(bug(ex, 'striche-gezaehlt')).toBe(340_007);
    expect(bug(ex, 'schritt-zu-klein')).toBe(340_350);
    expect(bug(ex, 'schritt-zu-gross')).toBe(375_000);
    expect(bug(ex, 'einer-mehr')).toBe(344_000);
  });

  it('placing bug: long and short ticks swapped', () => {
    const line: Line = { min: 340_000, max: 350_000, major: 1_000, minor: 500, labelMajor: false, labels: [340_000, 350_000] };
    const ex = eintragen(line, 341_500, 2);
    expect(bug(ex, 'lang-kurz-vertauscht')).toBeUndefined(); // 1 long + 1 short: swapping gives the same place
    const ex2 = eintragen({ ...line, minor: 100 }, 342_300, 2);
    expect(bug(ex2, 'lang-kurz-vertauscht')).toBe(343_200);
  });

  it('middle of two numbers', () => {
    const ex = mitteZwischen(340_000, 350_000);
    expect(ex.answer).toMatchObject({ value: 345_000 });
    expect(bug(ex, 'halber-abstand')).toBe(5_000);
  });
});
