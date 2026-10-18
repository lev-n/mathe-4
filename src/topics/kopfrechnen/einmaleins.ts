import { BOX, DIV, TIMES, toSpeech } from '../../core/format';
import type { Exercise, GenContext, Rng, SkillDef, Step, Stufe, Visual } from '../../core/types';
import { bugList, choiceAnswer } from '../zahlen/shared';
import { derivation, derivationSteps, factHint, factKey, factKind, isNewFact, parseFactKey, pickFact, searchStart, searchSteps } from './facts';

const ID = 'kopfrechnen.einmaleins';
const KMK = ['ZO.kopfrechnen'];

function base(stufe: Stufe, ab: 1 | 2 | 3, key: string) {
  return { key: `${ID}:${stufe}:${key}`, topicId: 'kopfrechnen' as const, skillId: ID, stufe, ab, kmk: KMK };
}

/** Punktefeld with a gap after 5 rows/columns (Kraft der Fünf). */
export function punktefeld(rows: number, cols: number): Visual {
  const v: Visual = { type: 'dotArray', rows, cols };
  if (rows > 5) v.splitAfterRow = 5;
  if (cols > 5) v.splitAfterCol = 5;
  return v;
}

const inRange = (x: number) => x >= 1 && x <= 10;

function kernTerm(a: number, b: number): string | null {
  const d = derivation(a, b);
  if (!d) return null;
  return d.vary === 'a' ? `${d.kern} ${TIMES} ${b}` : `${a} ${TIMES} ${d.kern}`;
}

const plural = (k: number, one: string, many: string) => `${k} ${k === 1 ? one : many}`;

// ─── Multiplication ──────────────────────────────────────────────────────────

export function malAufgabe(a: number, b: number, stufe: Stufe, dots: boolean): Exercise {
  const p = a * b;
  const kind = factKind(a, b);
  const steps: Step[] = derivationSteps(a, b);
  if (dots) steps.unshift({ text: `${a} ${TIMES} ${b} heißt: ${plural(a, 'Reihe', 'Reihen')} mit je ${plural(b, 'Punkt', 'Punkten')}.`, visual: punktefeld(a, b) });
  const kt = kernTerm(a, b);
  const anchor = derivation(a, b)?.anchor === 'quadrat' ? 'Quadrataufgabe' : 'Kernaufgabe';
  return {
    ...base(stufe, 1, `mal:${a}:${b}`),
    prompt: 'Rechne die Malaufgabe.',
    expression: `${a} ${TIMES} ${b} = ${BOX}`,
    ...(dots ? { visual: punktefeld(a, b) } : {}),
    answer: { kind: 'number', value: p, label: 'Ergebnis' },
    hints: [
      kind === 'kern'
        ? 'Das ist eine Kernaufgabe. Welche Rechenregel hilft dir?'
        : anchor === 'Quadrataufgabe'
          ? 'Welche Quadrataufgabe liegt in der Nähe?'
          : 'Welche Kernaufgabe liegt in der Nähe? Mal 2, mal 5 oder mal 10?',
      factHint(a, b),
    ],
    steps,
    bugs: bugList(p, [
      ['eine-reihe-weniger', inRange(a - 1) ? (a - 1) * b : null, `Das ist ${a - 1} ${TIMES} ${b}. Es fehlt noch einmal ${b}.`],
      ['eine-reihe-mehr', inRange(a + 1) ? (a + 1) * b : null, `Das ist ${a + 1} ${TIMES} ${b}. Das ist einmal ${b} zu viel.`],
      ['nachbar-weniger', inRange(b - 1) ? a * (b - 1) : null, `Das ist ${a} ${TIMES} ${b - 1}. Es fehlt noch einmal ${a}.`],
      ['nachbar-mehr', inRange(b + 1) ? a * (b + 1) : null, `Das ist ${a} ${TIMES} ${b + 1}. Das ist einmal ${a} zu viel.`],
      ['plus', a + b, `Du hast plus gerechnet. ${a} ${TIMES} ${b} heißt: ${a}-mal die ${b}.`],
    ]),
    praise: kind === 'kern' ? 'Du hast die Kernaufgabe sicher gewusst.' : kt ? `Die ${anchor} ${kt} ist eine gute Hilfe für ${a} ${TIMES} ${b}.` : 'Du hast die Malaufgabe sicher gelöst.',
    srText: `Wie viel ist ${a} mal ${b}?`,
    factKey: factKey(a, b),
  };
}

// ─── Division and placeholders ───────────────────────────────────────────────

/** Probe hint with a Kernaufgabe that is not the answer itself (the same start as the worked steps when possible). */
function probe(q: number, d: number, unknownFirst = true): string {
  if (d === 1) return 'Mal 1 ändert eine Zahl nicht.';
  const start = searchStart(q);
  const k = start !== q ? start : ([5, 10, 2].find((x) => x !== q) ?? 5);
  const kp = k * d;
  const p = q * d;
  const t = unknownFirst ? `${k} ${TIMES} ${d}` : `${d} ${TIMES} ${k}`;
  return `Probiere mit einer Kernaufgabe: ${t} = ${kp}. Ist das ${kp < p ? 'zu wenig' : 'zu viel'}?`;
}

function quotientBugs(q: number, d: number, p: number): [string, number | null, string][] {
  return [
    ['eins-weniger', q - 1 >= 1 ? q - 1 : null, `${q - 1} ${TIMES} ${d} = ${(q - 1) * d}. Das ist noch zu wenig für ${p}.`],
    ['eins-mehr', q + 1 <= 10 ? q + 1 : null, `${q + 1} ${TIMES} ${d} = ${(q + 1) * d}. Das ist schon zu viel für ${p}.`],
    ['minus', p - d, `Du hast minus gerechnet. Geteilt heißt: Wie oft passt ${d} in ${p}?`],
  ];
}

export function geteiltAufgabe(p: number, d: number, stufe: Stufe): Exercise {
  const q = p / d;
  return {
    ...base(stufe, stufe === 2 ? 1 : 2, `geteilt:${p}:${d}`),
    prompt: 'Rechne die Geteilt-Aufgabe.',
    expression: `${p} ${DIV} ${d} = ${BOX}`,
    answer: { kind: 'number', value: q, label: 'Ergebnis' },
    hints: [`Denke an die Umkehraufgabe: ${BOX} ${TIMES} ${d} = ${p}.`, probe(q, d)],
    // search from a Kernaufgabe with the known divisor (q is what the child is looking for)
    steps: [`Umkehraufgabe: ${BOX} ${TIMES} ${d} = ${p}.`, ...searchSteps(q, d), `Also: ${p} ${DIV} ${d} = ${q}.`],
    bugs: bugList(q, quotientBugs(q, d, p)),
    praise: `Du hast die Umkehraufgabe mit ${TIMES} ${d} genutzt.`,
    srText: `Wie viel ist ${p} geteilt durch ${d}?`,
    factKey: factKey(q, d),
  };
}

export type PlatzForm = 'faktor1' | 'faktor2' | 'divisor' | 'dividend';

/** Platzhalteraufgabe for the fact a · b = p. */
export function platzhalter(form: PlatzForm, a: number, b: number, stufe: Stufe): Exercise {
  const p = a * b;
  const expr =
    form === 'faktor1'
      ? `${BOX} ${TIMES} ${b} = ${p}`
      : form === 'faktor2'
        ? `${a} ${TIMES} ${BOX} = ${p}`
        : form === 'divisor'
          ? `${p} ${DIV} ${BOX} = ${a}`
          : `${BOX} ${DIV} ${b} = ${a}`;
  const value = form === 'faktor1' ? a : form === 'faktor2' ? b : form === 'divisor' ? b : p;
  const known = form === 'faktor1' ? b : a; // the factor that is shown next to the gap
  const steps: Step[] =
    form === 'dividend'
      ? [`Umkehraufgabe: ${a} ${TIMES} ${b} = ${BOX}.`, ...derivationSteps(a, b).slice(0, -1), `Also: ${p} ${DIV} ${b} = ${a}. In die Lücke gehört ${p}.`]
      : [
          form === 'divisor' ? `Frage: ${p} geteilt durch welche Zahl ergibt ${a}? Das ist dasselbe wie ${a} ${TIMES} ${BOX} = ${p}.` : `Frage: Welche Zahl mal ${known} ergibt ${p}?`,
          // search the gap from a Kernaufgabe with the shown factor (never start from the unknown)
          ...searchSteps(value, known, form === 'faktor1'),
          `In die Lücke gehört ${value}.`,
        ];
  const bugs =
    form === 'dividend'
      ? bugList(value, [
          ['plus', a + b, `Du hast plus gerechnet. Rechne die Umkehraufgabe: ${a} ${TIMES} ${b}.`],
          ['eine-reihe-weniger', (a - 1) * b > 0 ? (a - 1) * b : null, `${(a - 1) * b} ${DIV} ${b} = ${a - 1}, nicht ${a}.`],
          ['eine-reihe-mehr', (a + 1) * b, `${(a + 1) * b} ${DIV} ${b} = ${a + 1}, nicht ${a}.`],
        ])
      : bugList(value, quotientBugs(value, known, p));
  return {
    ...base(stufe, 2, `platz:${form}:${a}:${b}`),
    prompt: 'Welche Zahl gehört in die Lücke?',
    expression: expr,
    answer: { kind: 'number', value, label: 'Zahl in der Lücke' },
    hints:
      form === 'dividend'
        ? ['Rechne rückwärts mit der Umkehraufgabe.', `Welche Zahl geteilt durch ${b} ergibt ${a}? Rechne ${a} ${TIMES} ${b}.`]
        : [form === 'divisor' ? `Denke an die Malaufgabe: ${a} ${TIMES} ${BOX} = ${p}.` : `Welche Zahl mal ${known} ergibt ${p}?`, probe(value, known, form === 'faktor1')],
    steps,
    bugs,
    praise: form === 'dividend' ? 'Du hast mit der Umkehraufgabe rückwärts gerechnet.' : 'Du hast die passende Malaufgabe gefunden.',
    srText: `${toSpeech(expr)}. Welche Zahl gehört in die Lücke?`,
    factKey: factKey(a, b),
  };
}

// ─── Stufe 3 ─────────────────────────────────────────────────────────────────

/** Aufgabenfamilie: Tauschaufgabe and Umkehraufgaben of a · b. */
export function familie(a: number, b: number): Exercise {
  const p = a * b;
  const fields = [
    ...(a !== b ? [{ id: 'tausch', value: p, before: `${b} ${TIMES} ${a} =`, label: 'Tauschaufgabe' }] : []),
    { id: 'u1', value: b, before: `${p} ${DIV} ${a} =`, label: 'Erste Umkehraufgabe' },
    ...(a !== b ? [{ id: 'u2', value: a, before: `${p} ${DIV} ${b} =`, label: 'Zweite Umkehraufgabe' }] : []),
  ];
  const correct = Object.fromEntries(fields.map((f) => [f.id, f.value]));
  return {
    ...base(3, 2, `familie:${a}:${b}`),
    prompt: a !== b ? 'Ergänze die Tauschaufgabe und die Umkehraufgaben.' : 'Ergänze die Umkehraufgabe.',
    expression: `${a} ${TIMES} ${b} = ${p}`,
    answer: { kind: 'multi', fields },
    hints: ['Bei der Tauschaufgabe bleibt das Ergebnis gleich.', `Bei der Umkehraufgabe teilst du ${p} durch einen Faktor. Heraus kommt der andere.`],
    steps: [
      ...(a !== b ? [`Tauschaufgabe: ${b} ${TIMES} ${a} = ${p}`] : []),
      `Umkehraufgabe: ${p} ${DIV} ${a} = ${b}`,
      ...(a !== b ? [`Umkehraufgabe: ${p} ${DIV} ${b} = ${a}`] : []),
    ],
    bugs: a !== b ? bugList(correct, [['vertauscht', { ...correct, u1: a, u2: b }, `${p} ${DIV} ${a}: Wie oft passt ${a} in ${p}? Heraus kommt der andere Faktor.`]]) : [],
    praise: 'Du hast die ganze Aufgabenfamilie gefunden.',
    srText: `${a} mal ${b} ist ${p}. ${fields.map((f) => toSpeech(`${f.before} ${BOX}`)).join('. ')}.`,
    // no factKey: the fact is shown, so answering does not show that the child recalls it (L11 boxes)
  };
}

export function hilfeWaehlen(rng: Rng, p: number, d: number): Exercise {
  const q = p / d;
  const wrong = [
    ...(q + 1 <= 10 ? [{ label: `${q + 1} ${TIMES} ${d} = ${(q + 1) * d}`, whyWrong: `${(q + 1) * d} ist nicht ${p}. Diese Aufgabe passt nicht.` }] : []),
    ...(q - 1 >= 1 ? [{ label: `${q - 1} ${TIMES} ${d} = ${(q - 1) * d}`, whyWrong: `${(q - 1) * d} ist nicht ${p}. Diese Aufgabe passt nicht.` }] : []),
    { label: `${p} − ${d} = ${p - d}`, whyWrong: 'Zu Geteilt-Aufgaben passt eine Malaufgabe, nicht eine Minusaufgabe.' },
    ...(d !== q ? [{ label: `${d} ${TIMES} ${d} = ${d * d}`, whyWrong: `${d * d} ist nicht ${p}. Diese Aufgabe passt nicht.` }] : []),
  ];
  return {
    ...base(3, 2, `hilfe:${p}:${d}`),
    prompt: `Welche Aufgabe hilft dir bei ${p} ${DIV} ${d}?`,
    answer: choiceAnswer(rng, `${q} ${TIMES} ${d} = ${p}`, rng.shuffle(wrong)),
    hints: ['Geteilt und mal gehören zusammen.', `Suche die Malaufgabe mit dem Ergebnis ${p}.`],
    steps: [`${p} ${DIV} ${d} = ${BOX} gehört zu ${BOX} ${TIMES} ${d} = ${p}.`, `${q} ${TIMES} ${d} = ${p}, also ${p} ${DIV} ${d} = ${q}.`],
    praise: 'Du hast die passende Umkehraufgabe gefunden.',
    srText: `Welche Aufgabe hilft dir bei ${p} geteilt durch ${d}?`,
    // no factKey: the right option is found by matching the shown product, not by recall
  };
}

/** Ordered pairs (a, b) with a, b in 1..10 and a · b = n. */
export function factorPairs(n: number): [number, number][] {
  const out: [number, number][] = [];
  for (let a = 1; a <= 10; a++) if (n % a === 0 && n / a <= 10) out.push([a, n / a]);
  return out;
}

export function wieVieleAufgaben(n: number): Exercise {
  const pairs = factorPairs(n);
  const unordered = pairs.filter(([a, b]) => a <= b);
  return {
    ...base(3, 3, `anzahl:${n}`),
    prompt: `Wie viele Malaufgaben aus dem Einmaleins haben das Ergebnis ${n}? Tauschaufgaben zählen extra.`,
    answer: { kind: 'number', value: pairs.length, unit: 'Aufgaben', label: 'Anzahl Aufgaben' },
    hints: ['Gehe die Einmaleinsreihen von 1 bis 10 durch.', 'Denke an die Tauschaufgaben.'],
    steps: [`${pairs.map(([a, b]) => `${a} ${TIMES} ${b}`).join(', ')}`, `Das sind ${pairs.length} Aufgaben.`],
    bugs: bugList(pairs.length, [['ohne-tausch', unordered.length, 'Denke an die Tauschaufgaben. Sie zählen extra.']]),
    praise: 'Du hast systematisch gesucht und die Tauschaufgaben mitgezählt.',
    srText: `Wie viele Malaufgaben aus dem Einmaleins haben das Ergebnis ${n}? Tauschaufgaben zählen extra.`,
    knobel: true,
  };
}

const PRODUCTS = new Set(Array.from({ length: 100 }, (_, i) => (Math.floor(i / 10) + 1) * ((i % 10) + 1)));

export function keinErgebnis(rng: Rng, x: number, others: number[]): Exercise {
  const wrong = others.map((y) => {
    const [a, b] = factorPairs(y).find(([u, v]) => u <= v) ?? [1, y];
    return { label: String(y), whyWrong: `${y} = ${a} ${TIMES} ${b}. Es ist ein Ergebnis im Einmaleins.` };
  });
  return {
    ...base(3, 3, `kein:${x}:${others.join('-')}`),
    prompt: 'Welche Zahl ist kein Ergebnis im Einmaleins von 1 · 1 bis 10 · 10?',
    answer: choiceAnswer(rng, String(x), wrong),
    hints: ['Suche für jede Zahl eine passende Malaufgabe.', 'Für eine Zahl findest du keine Malaufgabe mit Faktoren bis 10.'],
    steps: [...others.map((y) => {
      const [a, b] = factorPairs(y).find(([u, v]) => u <= v) ?? [1, y];
      return `${y} = ${a} ${TIMES} ${b}`;
    }), `${x} kommt in keiner Einmaleinsreihe vor.`],
    praise: 'Du hast jede Zahl mit einer Malaufgabe geprüft.',
    srText: 'Welche Zahl ist kein Ergebnis im Einmaleins von 1 mal 1 bis 10 mal 10?',
    knobel: true,
  };
}

// ─── Generator ───────────────────────────────────────────────────────────────

function oriented(rng: Rng, key: string): [number, number] {
  const [a, b] = parseFactKey(key);
  return rng.chance(0.5) ? [a, b] : [b, a];
}

function factTask(rng: Rng, stufe: Stufe, ctx: GenContext, forms: ('mal' | 'geteilt' | PlatzForm)[]): Exercise {
  const key = pickFact(rng, ctx);
  const [a, b] = oriented(rng, key);
  const form = rng.pick(forms);
  if (form === 'mal') {
    const fresh = isNewFact(key, ctx);
    const dots = stufe === 1 && (fresh === null ? rng.chance(0.2) : fresh);
    return malAufgabe(a, b, stufe, dots);
  }
  if (form === 'geteilt') return geteiltAufgabe(a * b, b, stufe);
  return platzhalter(form, a, b, stufe);
}

function generate(rng: Rng, stufe: Stufe, ctx: GenContext): Exercise {
  if (stufe === 1) return factTask(rng, 1, ctx, ['mal']);
  if (stufe === 2) return factTask(rng, 2, ctx, ['geteilt', 'geteilt', 'geteilt', 'faktor1', 'faktor2', 'divisor']);
  const roll = rng.next();
  if (roll < 0.4) return factTask(rng, 3, ctx, ['mal', 'geteilt', 'faktor1', 'faktor2', 'divisor', 'dividend']);
  if (roll < 0.6) {
    const [a, b] = oriented(rng, pickFact(rng, ctx));
    return familie(a, b);
  }
  if (roll < 0.75) {
    const [a, b] = oriented(rng, pickFact(rng, ctx));
    return hilfeWaehlen(rng, a * b, b === 1 && a !== 1 ? a : b);
  }
  if (roll < 0.88) return wieVieleAufgaben(rng.pick([4, 6, 8, 9, 10, 12, 16, 18, 20, 24, 30, 36, 40]));
  const candidates = Array.from({ length: 80 }, (_, i) => i + 11).filter((x) => !PRODUCTS.has(x));
  const x = rng.pick(candidates);
  const near = [...PRODUCTS].filter((y) => y > 10 && Math.abs(y - x) <= 12);
  return keinErgebnis(rng, x, rng.sample(near, Math.min(3, near.length)).sort((u, v) => u - v));
}

export const einmaleinsSkill: SkillDef = {
  id: ID,
  topicId: 'kopfrechnen',
  title: 'Einmaleins',
  description: 'Du übst das Einmaleins: erst Kernaufgaben, dann alle anderen Aufgaben.',
  stufen: {
    1: 'Malaufgaben von 1 · 1 bis 10 · 10',
    2: 'Geteilt-Aufgaben und Platzhalteraufgaben',
    3: 'Gemischt: Tauschaufgaben, Umkehraufgaben, Knobeleien',
  },
  kmk: KMK,
  generate,
};
