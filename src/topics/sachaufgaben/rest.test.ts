import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import { checkAnswer } from '../../core/check';
import { restSkill } from './rest';
import { samples } from '../groessen/test-utils';

describeSkill(restSkill, { minDistinct: 30 });

const UP = ['autos', 'tische', 'boote', 'kisten', 'aufzug', 'zelte'];
const DOWN = ['schachteln', 'mannschaften', 'tickets', 'straeusse', 'tueten'];
const REST = ['eier-rest', 'kinder-rest'];

describe('sachaufgaben.rest specifics', () => {
  it('round up / round down / remainder – recomputed from the key (n, k) and the situation', () => {
    const modes = new Set<string>();
    for (const stufe of [1, 2, 3] as const) {
      for (const ex of samples(restSkill, stufe)) {
        const m = ex.key.match(/^sachaufgaben\.rest:\d:([a-z-]+):(\d+):(\d+)$/);
        if (!m) continue;
        const [id, n, k] = [m[1], Number(m[2]), Number(m[3])];
        const v = (ex.answer as { value: number }).value;
        expect(n % k).toBeGreaterThanOrEqual(2);
        if (UP.includes(id)) { modes.add('auf'); expect(v).toBe(Math.ceil(n / k)); }
        else if (DOWN.includes(id)) { modes.add('ab'); expect(v).toBe(Math.floor(n / k)); }
        else if (REST.includes(id)) { modes.add('rest'); expect(v).toBe(n % k); expect(stufe).toBeGreaterThanOrEqual(2); }
        else expect(['antwort', 'band', 'busse']).toContain(id);
        if (stufe === 1) expect(n).toBeLessThanOrEqual(90);
        if (stufe === 2) expect(n).toBeLessThanOrEqual(500);
      }
    }
    expect([...modes].sort()).toEqual(['ab', 'auf', 'rest']);
  });

  it('feedback refers to the situation: rounding down in a round-up story', () => {
    const ex = samples(restSkill, 1).find((e) => /:autos:/.test(e.key))!;
    const [, n, k] = ex.key.match(/:(\d+):(\d+)$/)!.map(Number);
    const r = checkAnswer(ex.answer, { kind: 'number', text: String(Math.floor(n / k)) }, ex.bugs);
    expect(r.bugHint).toMatch(/keinen Platz/);
    expect(ex.hints.join(' ')).toMatch(/Kann man \d+,\d+ Autos nehmen\?/);
  });

  it('Stufe 3: buses for classes plus adults, ribbons in cm, choosing the fitting answer', () => {
    let bus = 0;
    let ribbon = 0;
    let choice = 0;
    for (const ex of samples(restSkill, 3)) {
      let m;
      if ((m = ex.context?.match(/^(\d+) Klassen mit je (\d+) Kindern .* auch (\d+) Erwachsene mit\. Ein Bus hat (\d+) Plätze/))) {
        bus++;
        const people = Number(m[1]) * Number(m[2]) + Number(m[3]);
        expect((ex.answer as { value: number }).value).toBe(Math.ceil(people / Number(m[4])));
      } else if ((m = ex.context?.match(/ist (\d+)\u00A0m lang\. Für .* braucht man (\d+)\u00A0cm/))) {
        ribbon++;
        expect((ex.answer as { value: number }).value).toBe(Math.floor((Number(m[1]) * 100) / Number(m[2])));
      } else if (ex.answer.kind === 'choice') {
        choice++;
        const [, n, k] = ex.context!.match(/^(\d+) Kinder .* passen (\d+) Kinder/)!.map(Number);
        expect(ex.answer.options[ex.answer.correct].label).toBe(`${Math.ceil(n / k)} Autos`);
      }
    }
    expect(bus).toBeGreaterThan(20);
    expect(ribbon).toBeGreaterThan(20);
    expect(choice).toBeGreaterThan(20);
  });
});
