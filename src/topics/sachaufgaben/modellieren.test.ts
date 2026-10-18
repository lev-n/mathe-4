import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import { modellierenSkill } from './modellieren';
import { evalSide } from '../groessen/step-check';
import { samples } from '../groessen/test-utils';

describeSkill(modellierenSkill, { minDistinct: 30 });

describe('sachaufgaben.modellieren specifics', () => {
  it('Stufe 1: the correct term evaluates to the story result; wrong terms use other operations', () => {
    for (const ex of samples(modellierenSkill, 1)) {
      if (ex.answer.kind !== 'choice') continue;
      const right = ex.answer.options[ex.answer.correct].label;
      const last = String(ex.steps[ex.steps.length - 1]);
      const [term, result] = last.replace('Passende Rechnung: ', '').split(' = ');
      expect(term).toBe(right);
      expect(evalSide(right)!.value).toBeCloseTo(evalSide(result)!.value, 6);
      const opOf = (t: string) => t.match(/[+−·:]/)![0];
      const ops = ex.answer.options.map((o) => opOf(o.label));
      expect(new Set(ops).size).toBe(ops.length);
      expect(ex.answer.options.length).toBe(4);
    }
  });

  it('Stufe 2: two-step terms and fitting questions each have exactly one right option with explanations for the others', () => {
    for (const ex of samples(modellierenSkill, 2)) {
      if (ex.answer.kind !== 'choice') continue;
      expect(ex.answer.options.length).toBe(4);
      ex.answer.options.forEach((o, i) => expect(Boolean(o.whyWrong)).toBe(i !== (ex.answer as { correct: number }).correct));
      if (ex.expression) {
        // "Welche Frage passt zur Rechnung?": the term can be evaluated
        expect(evalSide(ex.expression)).not.toBeNull();
      }
    }
  });

  it('Stufe 3: "Welche Geschichte passt?" – the right story uses the numbers of the term', () => {
    let seen = 0;
    for (const ex of samples(modellierenSkill, 3)) {
      if (ex.answer.kind !== 'choice' || !ex.expression) continue;
      seen++;
      const [a, , b] = ex.expression.split(' ');
      const right = ex.answer.options[ex.answer.correct].label;
      expect(right).toContain(a);
      expect(right).toContain(b);
      expect(ex.knobel).toBe(true);
      // the operation is described in a different way by each wrong story
      const wrongs = ex.answer.options.filter((_, i) => i !== (ex.answer as { correct: number }).correct);
      wrongs.forEach((w) => expect(w.whyWrong).toMatch(/passt zu einer \S+aufgabe, nicht zu einer/));
    }
    expect(seen).toBeGreaterThan(50);
  });
});
