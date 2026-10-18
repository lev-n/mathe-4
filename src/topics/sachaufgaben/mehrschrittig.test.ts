import { describe, expect, it } from 'vitest';
import { describeSkill } from '../../core/testing';
import { mehrschrittigSkill } from './mehrschrittig';
import { cents, num, samples, times } from '../groessen/test-utils';

describeSkill(mehrschrittigSkill, { minDistinct: 40 });

const value = (ex: { answer: unknown }) => (ex.answer as { value: number }).value;

describe('sachaufgaben.mehrschrittig specifics', () => {
  it('Stufe 1: two steps with whole numbers ≤ 1000', () => {
    for (const ex of samples(mehrschrittigSkill, 1)) {
      expect(Number.isInteger(value(ex))).toBe(true);
      expect(value(ex)).toBeLessThanOrEqual(1000);
      expect(value(ex)).toBeGreaterThan(0);
      const calc = ex.steps.filter((s) => / = /.test(String(s)));
      expect(calc.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('Stufe 1 recomputed from the story: Hefte, Bücher, Basketball', () => {
    for (const ex of samples(mehrschrittigSkill, 1)) {
      const c = ex.context!;
      let m;
      if ((m = c.match(/kauft (\d+) Hefte\. Ein Heft kostet (\d+)\s€\. .* für (\d+)\s€/))) expect(value(ex)).toBe(num(m[1]) * num(m[2]) + num(m[3]));
      else if ((m = c.match(/hat (\d+) Regalbretter\. Auf jedem Brett stehen (\d+) Bücher\. (\d+) Bücher/))) expect(value(ex)).toBe(num(m[1]) * num(m[2]) - num(m[3]));
      else if ((m = c.match(/wirft \S+ (\d+) Körbe für je 2 Punkte\. Dazu wirft \S+ (\d+) Körbe/))) expect(value(ex)).toBe(2 * num(m[1]) + 3 * num(m[2]));
    }
  });

  it('Stufe 2: Preisliste and Fahrplan are recomputed from the table', () => {
    let list = 0;
    let plan = 0;
    for (const ex of samples(mehrschrittigSkill, 2)) {
      if (ex.visual?.type !== 'table') continue;
      const rows = ex.visual.rows;
      if (ex.visual.header[0] === 'Ware') {
        list++;
        const m = ex.context!.match(/kauft für das Klassenfrühstück (\d+) (.+?) und 1 (.+)\.$/)!;
        const singular: Record<string, string> = {
          'Brötchen': 'Brötchen', 'Brezeln': 'Brezel', 'Äpfel': 'Apfel', 'Bananen': 'Banane', 'Joghurts': 'Joghurt',
          'Müsliriegel': 'Müsliriegel', 'Flaschen Saft': 'Flasche Saft', 'Flaschen Milch': 'Flasche Milch',
        };
        const x = cents(rows.find((r) => r[0] === singular[m[2]])![1]);
        const y = cents(rows.find((r) => r[0] === m[3])![1]);
        expect(Math.round(value(ex) * 100)).toBe(num(m[1]) * x + y);
      } else {
        plan++;
        const m = ex.context!.match(/Haltestelle (.+?) in den Bus\. .* bis zur Haltestelle (.+?)\. Danach läuft \S+ noch (\d+) Minuten/)!;
        const tA = times(rows.find((r) => r[0] === m[1])![1])[0];
        const tB = times(rows.find((r) => r[0] === m[2])![1])[0];
        expect(value(ex)).toBe(tB - tA + num(m[3]));
      }
    }
    expect(list).toBeGreaterThan(15);
    expect(plan).toBeGreaterThan(15);
  });

  it('Stufe 2 Klassenfahrt contains exactly one unnecessary piece of information', () => {
    for (const ex of samples(mehrschrittigSkill, 2)) {
      if (!/Kletterpark/.test(ex.context ?? '')) continue;
      const m = ex.context!.match(/^(\d+) Kinder .* zusammen ([\d\u202F]+)\s€\. .*Eintritt kostet (\d+)\s€ pro Kind/)!;
      expect(value(ex)).toBe(num(m[2]) / num(m[1]) + num(m[3]));
      expect(ex.context).toMatch(/dauert|Sitzplätze|fährt um/);
    }
  });

  it('Stufe 3: three calculation steps and Knobel flag', () => {
    for (const ex of samples(mehrschrittigSkill, 3)) {
      expect(ex.knobel).toBe(true);
      const calc = ex.steps.filter((s) => / = /.test(String(s)));
      expect(calc.length).toBeGreaterThanOrEqual(2);
      if (/Rückgeld/.test(ex.prompt)) {
        const note = Number(ex.context!.match(/(\d+)-€-Schein/)![1]) * 100;
        const m = ex.context!.match(/kauft (\d+) .+? zu je (\d+,\d\d)\u00A0€ und 1 .+? für (\d+,\d\d)\u00A0€/)!;
        expect(Math.round(value(ex) * 100)).toBe(note - num(m[1]) * cents(m[2]) - cents(m[3]));
      }
    }
  });
});
