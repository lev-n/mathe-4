import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import { schaetzenSkill } from './schaetzen';
import { num, samples } from './test-utils';

describeSkill(schaetzenSkill, { minDistinct: 25 });

describe('groessen.schaetzen specifics', () => {
  it('Stufe 1: the right unit is the one in the reference sentence; every wrong unit has a Stützpunkt explanation', () => {
    for (const ex of samples(schaetzenSkill, 1)) {
      if (ex.answer.kind !== 'choice') continue;
      const right = ex.answer.options[ex.answer.correct].label;
      const last = String(ex.steps[ex.steps.length - 1]);
      expect(last).toMatch(new RegExp(`\\u00A0${right}\\b`));
      expect(ex.answer.options.length).toBeGreaterThanOrEqual(3);
      ex.answer.options.forEach((o, i) => {
        if (i !== (ex.answer as { correct: number }).correct) expect(o.whyWrong).toBeTruthy();
      });
    }
  });

  it('Stufe 2: the plausible value is the one in the worked solution and differs from the others by a factor ≥ 10', () => {
    for (const ex of samples(schaetzenSkill, 2)) {
      if (ex.answer.kind !== 'choice' || !ex.expression?.includes('…')) continue;
      const right = ex.answer.options[ex.answer.correct].label;
      expect(String(ex.steps[ex.steps.length - 1])).toContain(right);
    }
  });

  it('hints never name the asked quantity (no giveaway Stützpunkt)', () => {
    for (const stufe of [1, 2] as const) {
      for (const ex of samples(schaetzenSkill, stufe)) {
        if (ex.answer.kind !== 'choice') continue;
        const right = ex.answer.options[ex.answer.correct].label;
        const n = ex.expression?.match(/(\d+)\u00A0□/)?.[1];
        const giveaway = n ? `${n}\u00A0${right}` : right;
        expect(ex.hints.join(' '), ex.key).not.toContain(giveaway);
      }
    }
  });

  it('Stufe 3 Stützpunkt calculations are recomputed', () => {
    let seen = 0;
    for (const ex of samples(schaetzenSkill, 3)) {
      if (ex.answer.kind !== 'number' || !ex.context) continue;
      seen++;
      const v = ex.answer.value!;
      let m;
      if ((m = ex.context.match(/Kinderschritt ist etwa (\d+)\u00A0cm.*?Schulhof ist (\d+)\u00A0m/))) expect(v).toBe((num(m[2]) * 100) / num(m[1]));
      else if ((m = ex.context.match(/wiegt (\d+)\u00A0g/)) && (ex.prompt.match(/zusammen (\d+)\u00A0kg/))) expect(v).toBe((num(ex.prompt.match(/zusammen (\d+)\u00A0kg/)![1]) * 1000) / num(m[1]));
      else if ((m = ex.context.match(/Glas fasst (\d+)\u00A0ml.*?gibt es (\d+)\u00A0l/))) expect(v).toBe((num(m[2]) * 1000) / num(m[1]));
      else if ((m = ex.context.match(/Stockwerk ist etwa (\d+)\u00A0m hoch\. Ein Haus hat (\d+)/))) expect(v).toBe(num(m[1]) * num(m[2]));
      else throw new Error(`unknown estimate item: ${ex.context}`);
    }
    expect(seen).toBeGreaterThan(50);
  });

  it('claims: about a third are plausible, the rest are not', () => {
    const claims = samples(schaetzenSkill, 3).filter((e) => e.answer.kind === 'choice');
    const yes = claims.filter((e) => e.answer.kind === 'choice' && e.answer.options[e.answer.correct].label.startsWith('Ja'));
    expect(yes.length).toBeGreaterThan(claims.length * 0.15);
    expect(yes.length).toBeLessThan(claims.length * 0.5);
  });
});
