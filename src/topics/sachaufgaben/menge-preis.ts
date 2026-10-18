/**
 * Menge–Preis-Tabellen und Rezepte: proportional rechnen ("je mehr – desto mehr"),
 * plus "je mehr – desto weniger" and situations that are not proportional at all.
 * Stufe 1: table 1, 2, 3 Stück given → price for 4–10 Stück.
 * Stufe 2: no row for 1 Stück (2 → 4 given), verdoppeln / halbieren / addieren; Rezept für mehr oder weniger Personen.
 * Stufe 3: via the unit price (6 Stück 9 € → 10 Stück), je mehr – desto weniger, "Ist das überhaupt proportional?".
 */
import { fmt, fmtMoney, TIMES, DIV } from '../../core/format';
import type { Exercise, Rng, SkillDef, Stufe, Visual } from '../../core/types';
import { answerSentence, build, numberBugs, pickPerson, Pron, safeHints, sentenceAnswer, speak, type Person } from './shared';

interface Product { one: string; many: string; min: number; max: number; step: number }

const PRODUCTS: readonly Product[] = [
  { one: 'Heft', many: 'Hefte', min: 60, max: 90, step: 10 },
  { one: 'Brötchen', many: 'Brötchen', min: 30, max: 50, step: 5 },
  { one: 'Kugel Eis', many: 'Kugeln Eis', min: 100, max: 150, step: 10 },
  { one: 'Postkarte', many: 'Postkarten', min: 50, max: 90, step: 10 },
  { one: 'Bleistift', many: 'Bleistifte', min: 40, max: 80, step: 10 },
  { one: 'Kinokarte', many: 'Kinokarten', min: 500, max: 800, step: 50 },
  { one: 'Busfahrkarte', many: 'Busfahrkarten', min: 150, max: 250, step: 10 },
  { one: 'Packung Saft', many: 'Packungen Saft', min: 80, max: 120, step: 10 },
  { one: 'Eintrittskarte', many: 'Eintrittskarten', min: 300, max: 600, step: 50 },
  { one: 'Blumentopf', many: 'Blumentöpfe', min: 120, max: 250, step: 10 },
];

function label(p: Product, n: number): string {
  return n === 1 ? `1 ${p.one}` : `${n} ${p.many}`;
}

/** 'kostet' for one item, 'kosten' for more. */
function kostet(n: number): string {
  return n === 1 ? 'kostet' : 'kosten';
}

function unitPrice(rng: Rng, p: Product, even = false): number {
  const step = even ? Math.max(p.step, 20) : p.step;
  return rng.int(Math.ceil(p.min / step), Math.floor(p.max / step)) * step;
}

function table(p: Product, rows: [number, number | null][], caption?: string): Visual {
  return { type: 'table', ...(caption ? { caption } : {}), header: ['Menge', 'Preis'], rows: rows.map(([n, c]) => [label(p, n), c === null ? '□' : fmtMoney(c)]) };
}

function srTable(p: Product, rows: [number, number | null][]): string {
  return rows.map(([n, c]) => `${label(p, n)}: ${c === null ? 'gesucht' : speak(fmtMoney(c))}`).join('; ');
}

interface Item {
  key: string;
  context: string;
  question: string;
  value: number;
  decimals?: number;
  before: string;
  after: string;
  visual?: Visual;
  srExtra: string;
  steps: string[];
  bugs: ({ id: string; match: number; hint: string } | false)[];
  hints: string[];
  ab: 1 | 2 | 3;
  knobel?: boolean;
  /** Process praise naming the step this item needs. */
  praise: string;
  emoji?: string;
  kmk?: string[];
}

// ─── Stufe 1 ─────────────────────────────────────────────────────────────────

function fromOne(rng: Rng, who: Person): Item {
  const p = rng.pick(PRODUCTS);
  const u = unitPrice(rng, p);
  const x = rng.pick([4, 5, 6, 7, 8, 10]);
  const rows: [number, number | null][] = [[1, u], [2, 2 * u], [3, 3 * u], [x, null]];
  const value = (x * u) / 100;
  return {
    key: `eins:${p.one}:${u}:${x}`,
    context: `${who.name} möchte ${label(p, x)} kaufen. ${Pron(who)} schaut auf die Preistabelle.`,
    question: `Wie viel ${kostet(x)} ${label(p, x)}?`,
    value, decimals: 2,
    before: `${label(p, x)} ${kostet(x)}`, after: '€.',
    visual: table(p, rows),
    srExtra: srTable(p, rows),
    steps: [`1 ${p.one} kostet ${fmtMoney(u)}.`, `${x} ${TIMES} ${fmtMoney(u)} = ${fmtMoney(x * u)}`],
    bugs: [
      { id: 'eine-zeile', match: ((x - 1) * u) / 100, hint: `Zähle genau: Du brauchst den Preis für 1 ${p.one} ${x}-mal.` },
      { id: 'cent', match: x * u, hint: 'Achte auf die Einheit. Schreibe den Preis in Euro mit Komma.' },
      { id: 'addiert', match: (3 * u + x * 100) / 100, hint: 'Die Preise wachsen nicht in Euro-Schritten. Wie viel kostet 1 Stück mehr?' },
    ],
    hints: [`Was kostet 1 ${p.one}?`, `Wie oft brauchst du diesen Preis für ${label(p, x)}?`],
    ab: 1,
    praise: `Du hast den Preis für 1 ${p.one} ${x}-mal genommen.`,
  };
}

// ─── Stufe 2 ─────────────────────────────────────────────────────────────────

function noUnit(rng: Rng, who: Person): Item {
  const p = rng.pick(PRODUCTS);
  const u = unitPrice(rng, p, true);
  const [a, b] = rng.pick([[2, 4], [3, 6], [4, 8], [5, 10], [2, 6]] as const);
  const candidates = [1, a + b, 2 * b, a % 2 === 0 ? a / 2 : 0, 3 * a].filter((x) => x > 0 && x !== a && x !== b && x <= 20);
  const x = rng.pick([...new Set(candidates)]);
  const rows: [number, number | null][] = [[a, a * u], [b, b * u], [x, null]];
  const value = (x * u) / 100;
  let how: string;
  let praise: string;
  if (x === 1) {
    how = `${fmtMoney(a * u)} ${DIV} ${a} = ${fmtMoney(u)}`;
    praise = `Du hast den Preis für 1 ${p.one} durch Teilen gefunden.`;
  } else if (x === a + b) {
    how = `${fmtMoney(a * u)} + ${fmtMoney(b * u)} = ${fmtMoney(x * u)}`;
    praise = 'Du hast zwei Zeilen der Tabelle addiert.';
  } else if (x === 2 * b) {
    how = `${fmtMoney(b * u)} ${TIMES} 2 = ${fmtMoney(x * u)}`;
    praise = 'Du hast erkannt: Doppelt so viele kosten doppelt so viel.';
  } else if (x * 2 === a) {
    how = `${fmtMoney(a * u)} ${DIV} 2 = ${fmtMoney(x * u)}`;
    praise = 'Du hast erkannt: Halb so viele kosten halb so viel.';
  } else {
    how = `${fmtMoney(a * u)} ${TIMES} 3 = ${fmtMoney(x * u)}`;
    praise = 'Du hast erkannt: Dreimal so viele kosten dreimal so viel.';
  }
  return {
    key: `ohne-eins:${p.one}:${u}:${a}:${b}:${x}`,
    context: `${who.name} möchte ${label(p, x)} kaufen. In der Tabelle stehen nur einige Preise.`,
    question: `Wie viel ${kostet(x)} ${label(p, x)}?`,
    value, decimals: 2,
    before: `${label(p, x)} ${kostet(x)}`, after: '€.',
    visual: table(p, rows),
    srExtra: srTable(p, rows),
    steps: [`Nutze die Tabelle: ${how}`, `${label(p, x)} ${kostet(x)} ${fmtMoney(x * u)}.`],
    bugs: [
      { id: 'additiv', match: (a * u + (x - a) * 100) / 100, hint: `Die Preise wachsen nicht um 1\u00A0€ pro Stück. Wie viel kostet 1 ${p.one}?` },
      x !== 1 && { id: 'preis-mal-anzahl', match: (x * a * u) / 100, hint: `${fmtMoney(a * u)} ist der Preis für ${label(p, a)}, nicht für 1 ${p.one}.` },
    ],
    hints: ['Je mehr Stück, desto mehr kostet es. Wie hängen die Zeilen zusammen?', 'Du kannst verdoppeln, halbieren oder zwei Zeilen addieren.'],
    ab: 2,
    praise,
  };
}

const RECIPES = [
  { what: 'Pfannkuchen', ing: 'Mehl', unit: 'g', per4: [200, 250, 300] },
  { what: 'Obstsalat', ing: 'Äpfel', unit: 'g', per4: [400, 600, 800] },
  { what: 'Kakao', ing: 'Milch', unit: 'ml', per4: [800, 1000, 600] },
  { what: 'Waffeln', ing: 'Zucker', unit: 'g', per4: [100, 120, 160] },
];

const UNIT_WORD: Record<string, string> = { g: 'Gramm', ml: 'Milliliter' };

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

/**
 * Worked steps for a recipe via a whole number of persons: 6 → 9 Personen goes via 3 Personen
 * (400 g : 2 = 200 g, 200 g · 3 = 600 g), so no intermediate result is a decimal.
 */
export function recipeSteps(amount: number, base: number, target: number, unit: string): string[] {
  const g = gcd(base, target);
  const down = base / g;
  const up = target / g;
  const q = (v: number) => `${fmt(v)} ${unit}`;
  if (down === 1) return [`Für ${target} Personen braucht man ${up === 2 ? 'doppelt so viel' : up === 3 ? 'dreimal so viel' : `das ${up}-Fache`}: ${q(amount)} ${TIMES} ${up} = ${q((amount * target) / base)}`];
  if (up === 1) return [`Für ${target} Personen braucht man ${down === 2 ? 'die Hälfte' : down === 3 ? 'ein Drittel' : down === 4 ? 'ein Viertel' : `den ${down}. Teil`}: ${q(amount)} ${DIV} ${down} = ${q((amount * target) / base)}`];
  const part = amount / down;
  return [`Für ${g} Personen: ${q(amount)} ${DIV} ${down} = ${q(part)}`, `Für ${target} Personen: ${q(part)} ${TIMES} ${up} = ${q(part * up)}`];
}

function recipe(rng: Rng): Item {
  const r = rng.pick(RECIPES);
  const base = rng.pick([4, 6]);
  const amount = rng.pick(r.per4);
  const target = rng.pick((base === 4 ? [2, 8, 12, 6] : [3, 12, 9, 2]).filter((t) => (amount * t) % base === 0));
  const value = (amount * target) / base;
  const what = `${UNIT_WORD[r.unit]} ${r.ing}`;
  return {
    key: `rezept:${r.what}:${base}:${amount}:${target}`,
    context: `Für ${r.what} für ${base} Personen braucht man ${fmt(amount)} ${r.unit} ${r.ing}.`,
    question: `Wie viel ${what} braucht man für ${target} Personen?`,
    value, before: 'Man braucht', after: `${r.unit} ${r.ing}.`,
    visual: { type: 'table', caption: `Rezept: ${r.what}`, header: ['Personen', r.ing], rows: [[`${base} Personen`, `${fmt(amount)} ${r.unit}`], [`${target} Personen`, '□']] },
    srExtra: '',
    steps: [...recipeSteps(amount, base, target, r.unit), `Für ${target} Personen braucht man ${fmt(value)} ${r.unit} ${r.ing}.`],
    bugs: [
      { id: 'additiv', match: amount + (target - base), hint: 'Für jede Person mehr kommt nicht nur 1 dazu. Denke an verdoppeln oder halbieren.' },
      { id: 'mal-personen', match: amount * target, hint: `${fmt(amount)} ${r.unit} sind schon für ${base} Personen, nicht für 1 Person.` },
    ],
    hints: [`Wie viele Personen sind es im Vergleich zu ${base}: doppelt so viele, halb so viele …?`, 'Rechne zuerst für eine passende kleinere Zahl von Personen.'],
    ab: 2,
    praise: 'Du hast die Menge passend zur Zahl der Personen umgerechnet.',
    emoji: '🥣',
    kmk: ['MS.funktional', 'GM.sachsituationen'],
  };
}

// ─── Stufe 3 ─────────────────────────────────────────────────────────────────

function viaUnit(rng: Rng, who: Person): Item {
  const p = rng.pick(PRODUCTS);
  const u = unitPrice(rng, p);
  const a = rng.int(3, 8);
  let x = rng.int(2, 12);
  if (x === a || x % a === 0 || a % x === 0) x = a + rng.int(1, 4);
  const rows: [number, number | null][] = [[a, a * u], [x, null]];
  const value = (x * u) / 100;
  return {
    key: `ueber-eins:${p.one}:${u}:${a}:${x}`,
    context: `${who.name} möchte ${label(p, x)} kaufen. In der Tabelle steht nur ein Preis.`,
    question: `Wie viel ${kostet(x)} ${label(p, x)}?`,
    value, decimals: 2,
    before: `${label(p, x)} ${kostet(x)}`, after: '€.',
    visual: table(p, rows),
    srExtra: srTable(p, rows),
    steps: [`Preis für 1 ${p.one}: ${fmtMoney(a * u)} ${DIV} ${a} = ${fmtMoney(u)}`, `Preis für ${label(p, x)}: ${x} ${TIMES} ${fmtMoney(u)} = ${fmtMoney(x * u)}`],
    bugs: [
      { id: 'additiv', match: (a * u + (x - a) * 100) / 100, hint: `Die Preise wachsen nicht um 1\u00A0€ pro Stück. Rechne zuerst den Preis für 1 ${p.one} aus.` },
      { id: 'preis-mal-anzahl', match: (x * a * u) / 100, hint: `${fmtMoney(a * u)} ist der Preis für ${label(p, a)}. Teile zuerst.` },
      { id: 'einzelpreis', match: u / 100, hint: `Das ist der Preis für 1 ${p.one}. Gefragt sind ${label(p, x)}.` },
    ],
    hints: [`Rechne über den Preis für 1 ${p.one}.`, 'Erst teilen, dann malnehmen.'],
    ab: 3,
    knobel: true,
    praise: `Du hast zuerst den Preis für 1 ${p.one} bestimmt und dann malgenommen.`,
  };
}

function inverse(rng: Rng): Item {
  const k1 = rng.pick([2, 3, 4, 6]);
  const each1 = rng.pick([6, 8, 10, 12, 15]);
  const total = k1 * each1;
  const divisors = [2, 3, 4, 5, 6, 8, 10, 12].filter((d) => d !== k1 && total % d === 0);
  const k2 = rng.pick(divisors);
  const each2 = total / k2;
  const thing = rng.pick([['Äpfel', 'Kiste mit Äpfeln'], ['Murmeln', 'Dose mit Murmeln'], ['Sticker', 'Packung Sticker'], ['Nüsse', 'Tüte Nüsse']] as const);
  return {
    key: `umgekehrt:${thing[0]}:${k1}:${each1}:${k2}`,
    context: `Eine ${thing[1]} wird gerecht verteilt. Bei ${k1} Kindern bekommt jedes Kind ${each1} ${thing[0]}.`,
    question: `Wie viele ${thing[0]} bekommt jedes Kind, wenn ${k2} Kinder teilen?`,
    value: each2, before: 'Jedes Kind bekommt', after: `${thing[0]}.`,
    visual: { type: 'table', header: ['Kinder', `${thing[0]} pro Kind`], rows: [[`${k1} Kinder`, `${each1}`], [`${k2} Kinder`, '□']] },
    srExtra: '',
    steps: [`Alle ${thing[0]}: ${k1} ${TIMES} ${each1} = ${total}`, `Auf ${k2} Kinder verteilt: ${total} ${DIV} ${k2} = ${each2}`, k2 > k1 ? 'Je mehr Kinder teilen, desto weniger bekommt jedes Kind.' : 'Je weniger Kinder teilen, desto mehr bekommt jedes Kind.'],
    bugs: [
      { id: 'proportional', match: (each1 * k2) / k1, hint: k2 > k1 ? 'Wenn mehr Kinder teilen, bekommt jedes Kind weniger, nicht mehr.' : 'Wenn weniger Kinder teilen, bekommt jedes Kind mehr.' },
      { id: 'gesamt', match: total, hint: `Das sind alle ${thing[0]} zusammen. Gefragt ist, wie viele ein Kind bekommt.` },
      { id: 'additiv', match: each1 + (k2 - k1), hint: 'Überlege: Wie viele sind es zuerst insgesamt?' },
    ],
    hints: [`Wie viele ${thing[0]} sind es insgesamt?`, k2 > k1 ? 'Bekommt jedes Kind mehr oder weniger, wenn mehr Kinder teilen?' : 'Bekommt jedes Kind mehr oder weniger, wenn weniger Kinder teilen?'],
    ab: 3,
    knobel: true,
    praise: k2 > k1 ? 'Du hast erkannt: Je mehr Kinder teilen, desto weniger bekommt jedes.' : 'Du hast erkannt: Je weniger Kinder teilen, desto mehr bekommt jedes.',
    emoji: '🍎',
    kmk: ['MS.funktional', 'PK.problemloesen'],
  };
}

const NOT_PROPORTIONAL = [
  { context: (n: number, m: number, _w: string) => `Ein Kind braucht für den Schulweg ${m} Minuten. Heute gehen ${n} Kinder gemeinsam.`, q: 'Wie viele Minuten dauert der Schulweg heute?', before: 'Der Schulweg dauert', after: 'Minuten.', why: 'Gehen die Kinder zusammen, dauert der Weg nicht länger.', minutes: [10, 15, 20, 25] },
  { context: (n: number, m: number, w: string) => `Ein Ei kocht in ${m} Minuten. ${w} kocht ${n} Eier zusammen in einem großen Topf.`, q: 'Wie viele Minuten kochen die Eier?', before: 'Die Eier kochen', after: 'Minuten.', why: 'Alle Eier kochen gleichzeitig im selben Topf.', minutes: [6, 7, 8, 10] },
  { context: (n: number, m: number, _w: string) => `Ein Chor mit 20 Kindern singt ein Lied in ${m} Minuten. Heute singen ${n * 10} Kinder dasselbe Lied.`, q: 'Wie viele Minuten dauert das Lied jetzt?', before: 'Das Lied dauert', after: 'Minuten.', why: 'Mit mehr Sängerinnen und Sängern wird ein Lied nicht länger oder kürzer.', minutes: [2, 3, 4] },
  { context: (n: number, m: number, w: string) => `Ein Handtuch trocknet auf der Leine in ${m} Stunden. ${w} hängt ${n} Handtücher nebeneinander auf.`, q: 'Wie viele Stunden brauchen die Handtücher zum Trocknen?', before: 'Sie brauchen', after: 'Stunden.', why: 'Die Handtücher trocknen alle gleichzeitig.', minutes: [2, 3, 4] },
] as const;

function notProportional(rng: Rng, who: Person): Item {
  const idx = rng.int(0, NOT_PROPORTIONAL.length - 1);
  const t = NOT_PROPORTIONAL[idx];
  const n = rng.int(3, 6);
  const m = rng.pick(t.minutes);
  const context = t.context(n, m, who.name);
  const factor = idx === 2 ? (n * 10) / 20 : n;
  return {
    key: `nicht-proportional:${idx}:${n}:${m}:${who.name}`,
    context,
    question: t.q,
    value: m, before: t.before, after: t.after,
    srExtra: '',
    steps: [t.why, `Es bleibt bei ${m} ${t.after.replace('.', '')}.`],
    bugs: [
      { id: 'mal', match: m * factor, hint: `${t.why} Stell dir die Situation genau vor.` },
      { id: 'geteilt', match: m / factor, hint: `${t.why} Es geht auch nicht schneller.` },
    ],
    hints: ['Stell dir die Situation genau vor. Passt hier „je mehr – desto mehr“?', 'Passiert alles nacheinander oder gleichzeitig?'],
    ab: 3,
    knobel: true,
    praise: 'Du hast genau überlegt, ob die Situation proportional ist.',
    emoji: '🤔',
    kmk: ['MS.funktional', 'PK.modellieren', 'PK.argumentieren'],
  };
}

function toExercise(stufe: Stufe, it: Item): Exercise {
  const decimals = it.decimals ?? 0;
  const valueText = fmt(it.value, decimals && !Number.isInteger(it.value) ? decimals : undefined);
  const context = it.context ?? '';
  const ex = build(mengePreisSkill, stufe, {
    key: it.key,
    ab: it.ab,
    context,
    prompt: it.question,
    emoji: it.emoji ?? '🏷️',
    answer: sentenceAnswer(it.value, it.before, it.after, it.question, decimals ? { decimals } : {}),
    hints: safeHints(it.hints, it.value, 'Wie hängen Menge und Preis zusammen?', decimals || undefined),
    steps: [...it.steps, `Antwort: ${answerSentence(it.before, valueText, it.after)}`],
    bugs: numberBugs(it.bugs, it.value, decimals),
    praise: it.praise,
    srText: `${speak(context)} ${it.srExtra ? `Tabelle: ${it.srExtra}.` : ''} ${it.question}`.replace(/\s+/g, ' ').trim(),
    kmk: it.kmk ?? ['MS.funktional', 'ZO.sachrechnen'],
  });
  if (it.visual) ex.visual = it.visual;
  if (it.knobel) ex.knobel = true;
  return ex;
}

export const mengePreisSkill: SkillDef = {
  id: 'sachaufgaben.menge-preis',
  topicId: 'sachaufgaben',
  title: 'Menge und Preis',
  description: 'Du nutzt Tabellen: Je mehr du kaufst, desto mehr bezahlst du.',
  stufen: {
    1: 'Vom Preis für 1 Stück auf mehr schließen',
    2: 'Verdoppeln, halbieren, Rezepte umrechnen',
    3: 'Über den Preis für 1 Stück, je mehr – desto weniger',
  },
  kmk: ['MS.funktional', 'ZO.sachrechnen'],
  generate(rng, stufe) {
    const who = pickPerson(rng);
    if (stufe === 1) return toExercise(1, fromOne(rng, who));
    if (stufe === 2) return toExercise(2, rng.chance(0.65) ? noUnit(rng, who) : recipe(rng));
    const v = rng.int(1, 5);
    return toExercise(3, v <= 2 ? viaUnit(rng, who) : v <= 4 ? inverse(rng) : notProportional(rng, who));
  },
};
