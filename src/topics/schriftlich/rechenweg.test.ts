import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import { rechenwegSkill } from './rechenweg';
import { evalExpr, samples } from './test-helpers';

describeSkill(rechenwegSkill, { minDistinct: 20 });

/** Independent classifier: does a task have a trick for the Kopf? */
function isKopf(expr: string): boolean {
  const e = expr.replace(/ /g, '');
  const m = e.match(/^(\d+) ([+−·:]) (\d+)$/);
  if (!m) throw new Error(expr);
  const [a, op, b] = [Number(m[1]), m[2], Number(m[3])];
  if (op === '−' && b === 1 && /^[1-9]0+$/.test(m[1])) return true; // 5 000 − 1
  if (op === '+' && /^10+$/.test(m[3])) return true; // + 100, + 1 000
  if ((op === '+' || op === '−') && a % 1000 === 0 && b % 1000 === 0) return true; // volle Tausender
  if (op === '·' && (b === 10 || b === 100)) return true;
  if (op === ':' && a % 1000 === 0 && (a / 1000) % b === 0) return true;
  return false;
}

describe('schriftlich.rechenweg', () => {
  it('Stufe 1: Kopf for tasks with a trick, schriftlich otherwise', () => {
    for (const ex of samples(rechenwegSkill, 1)) {
      if (ex.answer.kind !== 'choice' || !ex.expression) throw new Error('choice expected');
      const label = ex.answer.options[ex.answer.correct].label;
      expect(label).toBe(isKopf(ex.expression) ? 'im Kopf' : 'schriftlich');
      expect(ex.answer.options.map((o) => o.label).sort()).toEqual(['halbschriftlich', 'im Kopf', 'schriftlich']);
    }
  });

  it('Stufe 2: halbschriftlich parts add up and match the task', () => {
    for (const ex of samples(rechenwegSkill, 2)) {
      if (ex.answer.kind !== 'multi' || !ex.expression) throw new Error('multi expected');
      const [p1, p2, sum] = ex.answer.fields;
      const task = ex.expression.split(' = ')[0];
      expect(sum.value).toBe(evalExpr(task));
      const minus = ex.expression.split(' = ')[1].includes('−');
      expect(minus ? p1.value - p2.value : p1.value + p2.value).toBe(sum.value);
      expect(evalExpr(p1.before!.replace(' =', ''))).toBe(p1.value);
      expect(evalExpr(p2.before!.replace(' =', ''))).toBe(p2.value);
    }
  });

  it('Stufe 3: exactly one option fits the asked way', () => {
    for (const ex of samples(rechenwegSkill, 3)) {
      if (ex.answer.kind !== 'choice') throw new Error('choice expected');
      expect(ex.knobel).toBe(true);
      if (ex.key.includes(':rat:')) {
        expect(ex.answer.options[ex.answer.correct].label.startsWith('Rechne im Kopf')).toBe(true);
        continue;
      }
      const wantKopf = ex.key.includes('welche-kopf');
      const fitting = ex.answer.options.filter((o) => isKopf(o.label) === wantKopf);
      expect(fitting).toHaveLength(1);
      expect(ex.answer.options[ex.answer.correct]).toBe(fitting[0]);
    }
  });
});
