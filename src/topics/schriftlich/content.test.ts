/** Content rules across all schriftlich skills: true equations, honest Überschlag claims, the chosen method, German. */
import { describe, expect, it } from 'vitest';
import type { Exercise, GenContext, Visual } from '../../core/types';
import topic from './index';
import { ABZ, ERG, NRW, samples } from './test-helpers';

const num = (s: string) => Number(s.replace(/\D/g, ''));
/** A number in German notation (digit groups with a narrow space). */
const N = String.raw`\d[\d    ]*\d|\d`;

/** Texts that explain (worked steps, hints, bug hints) – unlike wrong choice options, they must be true. */
function explanations(ex: Exercise): string[] {
  return [...ex.hints, ...ex.steps.map((st) => (typeof st === 'string' ? st : st.text)), ...(ex.bugs ?? []).map((b) => b.hint)];
}

/** All texts a child can see or hear for an exercise. */
function texts(ex: Exercise): string[] {
  const out = [ex.prompt, ex.srText, ex.context ?? '', ex.expression ?? '', ...ex.hints];
  for (const st of ex.steps) out.push(typeof st === 'string' ? st : st.text);
  for (const b of ex.bugs ?? []) out.push(b.hint);
  if (ex.answer.kind === 'choice') for (const o of ex.answer.options) out.push(o.label, o.whyWrong ?? '');
  return out.filter(Boolean);
}

function visuals(ex: Exercise): Visual[] {
  const out: Visual[] = [];
  if (ex.visual) out.push(ex.visual);
  for (const st of ex.steps) if (typeof st !== 'string' && st.visual) out.push(st.visual);
  return out;
}

const all = (ctx: GenContext, n = 120) =>
  topic.skills.flatMap((skill) => ([1, 2, 3] as const).flatMap((stufe) => samples(skill, stufe, ctx, n)));

describe('schriftlich content rules', () => {
  const abz = all(ABZ);
  const erg = all(ERG);
  const nrw = all(NRW, 60);
  const every = [...abz, ...erg, ...nrw];

  it('division steps only write true equations ("17 : 3 = 5" is not one)', () => {
    let seen = 0;
    for (const ex of every) {
      for (const t of explanations(ex)) {
        for (const m of t.matchAll(new RegExp(`(?<![\\d\\u202f])(${N}) : (\\d+) = (${N})(?: R (\\d+))?(?![\\d\\u202f])`, 'g'))) {
          const [a, d, q, r] = [num(m[1]), num(m[2]), num(m[3]), m[4] ? num(m[4]) : 0];
          seen++;
          expect(q * d + r, `${t}`).toBe(a);
        }
      }
    }
    expect(seen).toBeGreaterThan(100);
  });

  it('"Das passt zum Überschlag" is only said when the result is within 25 % of the Überschlag', () => {
    let claims = 0;
    for (const ex of every) {
      for (const t of texts(ex)) {
        const m = t.match(new RegExp(`Ergebnis: .* = (${N})\\. Das passt zum Überschlag (${N})\\.`));
        if (!m) continue;
        claims++;
        const [res, u] = [num(m[1]), num(m[2])];
        expect(Math.abs(res - u), t).toBeLessThanOrEqual(0.25 * Math.max(res, u));
      }
    }
    expect(claims).toBeGreaterThan(200);
  });

  it('written + and − solutions end with a Probe', () => {
    for (const ex of every) {
      if (ex.answer.kind !== 'written' || (ex.answer.op !== 'add' && ex.answer.op !== 'sub')) continue;
      const last = ex.steps[ex.steps.length - 1];
      expect(typeof last === 'string' ? last : last.text).toMatch(/ Probe: /);
    }
  });

  it('Ergänzen classes never see Entbündeln: no wording, no Abziehen layout', () => {
    for (const ex of erg) {
      for (const t of texts(ex)) expect(t, ex.key).not.toMatch(/entbündel/i);
      for (const v of visuals(ex)) if (v.type === 'written' && v.op === 'sub') expect(v.method, ex.key).toBe('ergaenzen');
    }
    for (const ex of abz) for (const v of visuals(ex)) if (v.type === 'written' && v.op === 'sub') expect(v.method, ex.key).toBe('abziehen');
  });

  it('German agreement in the Sprechweise', () => {
    for (const ex of every) {
      for (const t of texts(ex)) {
        expect(t).not.toMatch(/fehlen (noch )?1\b/);
        expect(t).not.toMatch(/sind es noch [01]\b/);
        // 'Aus jeder 0 wird 9' only when two or more zeros were named before
        if (/Aus jeder 0 wird 9/.test(t)) expect(t).toMatch(/und|bis zu den/);
        if (/Aus der 0 wird 9/.test(t)) expect(t).not.toMatch(/Bei den \w+ und \w+ steht 0/);
      }
    }
  });

  it('story numbers fit the situation', () => {
    for (const ex of every) {
      const c = ex.context ?? '';
      const stadium = c.match(new RegExp(`Ein Stadion hat (${N}) Plätze`));
      if (stadium) expect(num(stadium[1])).toBeLessThanOrEqual(80_000);
      const eggs = c.match(/In eine Schachtel passen (\d+) Eier/);
      if (eggs) expect([6, 10]).toContain(Number(eggs[1]));
      const apples = c.match(new RegExp(`(${N}) Äpfel werden gerecht auf (\\d+) Kisten`));
      if (apples) expect(num(apples[1]) / Number(apples[2])).toBeLessThanOrEqual(200);
      const boat = c.match(new RegExp(`(${N}) Kinder einer Schule machen einen Bootsausflug`));
      if (boat) expect(num(boat[1])).toBeLessThanOrEqual(400);
      const zoo = c.match(new RegExp(`Im Mai besuchten (${N}) Menschen den Zoo\\. Im Juni waren es (${N})\\.`));
      if (zoo) {
        const [x, y] = [num(zoo[1]), num(zoo[2])];
        expect(Math.max(x, y) / Math.min(x, y)).toBeLessThanOrEqual(2);
      }
      const steps = c.match(/Vier Klassen zählen eine Woche lang ihre Schritte: (.*)\./);
      if (steps) {
        const ns = steps[1].split(/, | und /).map(num);
        expect(Math.max(...ns) / Math.min(...ns)).toBeLessThanOrEqual(2);
      }
    }
  });

  it('every number shown as a choice stays inside the Zahlenraum bis 1 000 000', () => {
    for (const ex of every) {
      if (ex.answer.kind !== 'choice') continue;
      for (const o of ex.answer.options) {
        if (new RegExp(`^(?:${N})$`).test(o.label)) expect(num(o.label), ex.key).toBeLessThanOrEqual(1_000_000);
      }
    }
  });
});
