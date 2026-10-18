import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import { checkAnswer } from '../../core/check';
import { ueberschlagProbeSkill } from './ueberschlag-probe';
import { evalExpr, roundToLead, samples } from './test-helpers';

describeSkill(ueberschlagProbeSkill, { minDistinct: 20 });

const num = (s: string) => Number(s.replace(/ /g, ''));

describe('schriftlich.ueberschlag-probe', () => {
  it('Überschlag answers round every number to its highest place (independent check)', () => {
    for (const stufe of [1, 2] as const) {
      for (const ex of samples(ueberschlagProbeSkill, stufe)) {
        if (!ex.key.includes(':ue:')) continue;
        const expr = ex.key.split(':ue:')[1].replace(/ /g, '');
        const m = expr.match(/^(\d+) ([+−·]) (\d+)$/)!;
        const [a, b] = [roundToLead(Number(m[1])), roundToLead(Number(m[3]))];
        const want = m[2] === '+' ? a + b : m[2] === '−' ? a - b : a * b;
        expect(ex.answer.kind === 'number' && ex.answer.value).toBe(want);
        // the exact result is a typical wrong answer with a hint
        const exact = evalExpr(expr);
        if (exact !== want && ex.answer.kind === 'number') {
          expect(checkAnswer(ex.answer, { kind: 'number', text: String(exact) }, ex.bugs).bugHint).toMatch(/nicht genau/);
        }
      }
    }
  });

  it('Probe choice: the correct option is the Umkehraufgabe', () => {
    for (const ex of samples(ueberschlagProbeSkill, 1)) {
      if (!ex.key.includes(':probe:') || ex.answer.kind !== 'choice') continue;
      const [, kind, a, b] = ex.key.match(/probe:(add|sub):(\d+):(\d+)/)!;
      const label = ex.answer.options[ex.answer.correct].label;
      // s − b = a (plus) or d + b = a (minus): the Probe gives back the first number
      expect(evalExpr(label)).toBe(Number(a));
      expect(label).toContain(kind === 'add' ? '−' : '+');
      const correct = ex.answer.correct;
      ex.answer.options.forEach((o, i) => {
        if (i !== correct) expect(o.whyWrong).toBeTruthy();
      });
      expect(Number(b)).toBeGreaterThan(0);
    }
  });

  it('plausibility: only the correct result is offered close to the Überschlag', () => {
    for (const ex of samples(ueberschlagProbeSkill, 2)) {
      if (!ex.key.includes(':plausibel:') || ex.answer.kind !== 'choice') continue;
      const exact = evalExpr(ex.key.split(':plausibel:')[1]);
      expect(num(ex.answer.options[ex.answer.correct].label)).toBe(exact);
      const correct = ex.answer.correct;
      ex.answer.options.forEach((o, i) => {
        if (i === correct) return;
        const v = num(o.label);
        expect(v > 3 * exact || v * 3 < exact).toBe(true);
      });
    }
  });

  it('division with Rest: the divided number is q · d + r', () => {
    for (const ex of samples(ueberschlagProbeSkill, 2)) {
      if (!ex.key.includes(':umkehr-div:')) continue;
      const [, q, d, r] = ex.key.match(/umkehr-div:(\d+):(\d+):(\d+)/)!.map(Number);
      expect(ex.answer.kind === 'number' && ex.answer.value).toBe(q * d + r);
      expect(ex.bugs?.find((b) => b.id === 'probe.rest-vergessen')?.match).toBe(q * d);
    }
  });

  it('Stufe 3: "passt" is right exactly when the shown result is correct; division from Probe', () => {
    for (const ex of samples(ueberschlagProbeSkill, 3)) {
      if (ex.answer.kind !== 'choice') throw new Error('choice expected');
      const label = ex.answer.options[ex.answer.correct].label;
      if (ex.key.includes(':passt:')) {
        const [expr, shown] = ex.key.split(':passt:')[1].split('=');
        const fits = evalExpr(expr) === Number(shown);
        expect(label.startsWith(fits ? 'Ja' : 'Nein')).toBe(true);
        expect(ex.knobel).toBe(true);
      } else {
        const [, q, d, r] = ex.key.match(/probe-div:(\d+):(\d+):(\d+)/)!.map(Number);
        const m = label.replace(/ /g, '').match(/^(\d+) : (\d+) = (\d+) R (\d+)$/)!;
        expect(Number(m[1])).toBe(q * d + r);
        expect(Number(m[2])).toBe(d);
        expect(Number(m[3])).toBe(q);
        expect(Number(m[4])).toBe(r);
      }
    }
  });
});
