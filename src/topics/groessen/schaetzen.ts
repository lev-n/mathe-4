/**
 * Schätzen und Plausibilität mit Stützpunktvorstellungen (Tür ≈ 2 m, Tafel Schokolade 100 g, Milchtüte 1 l …).
 * Stufe 1: choose the plausible unit ('Ein Bleistift ist etwa 17 □ lang.').
 * Stufe 2: choose the plausible value ('Eine Tür ist etwa … hoch.' 20 cm | 2 m | 20 m | 200 m).
 * Stufe 3: judge a claim ('Unser Hund wiegt 30 g.') and estimate with Stützpunkte (Schritte, Tafeln, Gläser).
 */
import { fmt, NBSP } from '../../core/format';
import type { ChoiceOption, Exercise, Rng, SkillDef, Stufe } from '../../core/types';
import { build, makeChoice, numberBugs, pickPerson, safeHints, speak } from './helpers';

type Dimension = 'laenge' | 'masse' | 'volumen' | 'zeit';

interface U {
  u: string;
  /** Written after the number 1 ('1 Woche'); same as u for symbols like 'cm'. */
  one: string;
  /** Spoken names [singular, plural] for screen readers. */
  spoken: [string, string];
  dim: Dimension;
  /** Size in the base unit of its dimension (mm, g, ml, s). */
  base: number;
  /** Stützpunkt sentence. */
  ref: string;
}

const UNITS: Record<string, U> = {
  mm: { u: 'mm', one: 'mm', spoken: ['Millimeter', 'Millimeter'], dim: 'laenge', base: 1, ref: '1\u00A0mm ist etwa so dick wie eine Bankkarte.' },
  cm: { u: 'cm', one: 'cm', spoken: ['Zentimeter', 'Zentimeter'], dim: 'laenge', base: 10, ref: '1\u00A0cm ist etwa so breit wie dein kleiner Finger.' },
  m: { u: 'm', one: 'm', spoken: ['Meter', 'Meter'], dim: 'laenge', base: 1000, ref: '1\u00A0m ist etwa ein großer Schritt. Eine Tür ist etwa 2\u00A0m hoch.' },
  km: { u: 'km', one: 'km', spoken: ['Kilometer', 'Kilometer'], dim: 'laenge', base: 1_000_000, ref: 'Für 1\u00A0km brauchst du zu Fuß etwa 15 Minuten.' },
  g: { u: 'g', one: 'g', spoken: ['Gramm', 'Gramm'], dim: 'masse', base: 1, ref: 'Eine Tafel Schokolade wiegt 100\u00A0g. 1\u00A0g ist sehr leicht.' },
  kg: { u: 'kg', one: 'kg', spoken: ['Kilogramm', 'Kilogramm'], dim: 'masse', base: 1000, ref: 'Eine Packung Mehl wiegt 1\u00A0kg.' },
  ml: { u: 'ml', one: 'ml', spoken: ['Milliliter', 'Milliliter'], dim: 'volumen', base: 1, ref: 'Ein Teelöffel fasst etwa 5\u00A0ml.' },
  l: { u: 'l', one: 'l', spoken: ['Liter', 'Liter'], dim: 'volumen', base: 1000, ref: 'Eine Milchtüte fasst 1\u00A0l.' },
  s: { u: 's', one: 's', spoken: ['Sekunde', 'Sekunden'], dim: 'zeit', base: 1, ref: 'Eine Sekunde dauert so lange, wie du „einundzwanzig“ sagst.' },
  min: { u: 'min', one: 'min', spoken: ['Minute', 'Minuten'], dim: 'zeit', base: 60, ref: 'Zähneputzen dauert etwa 3\u00A0min.' },
  h: { u: 'h', one: 'h', spoken: ['Stunde', 'Stunden'], dim: 'zeit', base: 3600, ref: 'Eine Schulstunde dauert 45\u00A0min, also etwas weniger als 1\u00A0h.' },
  Tage: { u: 'Tage', one: 'Tag', spoken: ['Tag', 'Tage'], dim: 'zeit', base: 86400, ref: 'Ein Tag hat 24 Stunden.' },
  Wochen: { u: 'Wochen', one: 'Woche', spoken: ['Woche', 'Wochen'], dim: 'zeit', base: 604800, ref: 'Eine Woche hat 7 Tage.' },
  Jahre: { u: 'Jahre', one: 'Jahr', spoken: ['Jahr', 'Jahre'], dim: 'zeit', base: 31_536_000, ref: 'Ein Jahr hat 12 Monate.' },
};

/** The unit as written after the number n: '1 Woche', '6 Wochen', '3 cm'. */
function unitText(u: string, n: number): string {
  return n === 1 ? UNITS[u].one : UNITS[u].u;
}

/** The unit key for a written unit ('Woche' → 'Wochen'). */
function unitKey(written: string): string {
  return Object.values(UNITS).find((x) => x.u === written || x.one === written)!.u;
}

const DIM_UNITS: Record<Dimension, string[]> = {
  laenge: ['mm', 'cm', 'm', 'km'],
  masse: ['g', 'kg'],
  volumen: ['ml', 'l'],
  zeit: ['s', 'min', 'h', 'Tage', 'Wochen', 'Jahre'],
};

const DIM_INFO: Record<Dimension, string> = {
  laenge: 'ist eine Längeneinheit. Damit misst du, wie lang etwas ist.',
  masse: 'ist eine Gewichtseinheit. Damit misst du, wie schwer etwas ist.',
  volumen: 'ist ein Hohlmaß. Damit misst du, wie viel in ein Gefäß passt.',
  zeit: 'ist eine Zeiteinheit. Damit misst du, wie lange etwas dauert.',
};

/**
 * Stützpunkte for hints, each tagged with the units it helps with, so that a length in cm gets a cm/m comparison
 * and not the walking time for 1 km. One is chosen that does not name the asked object.
 */
const DIM_HINTS: Record<Dimension, { text: string; units: string[] }[]> = {
  laenge: [
    { text: 'Vergleiche: Ein großer Schritt ist etwa 1\u00A0m.', units: ['m', 'cm'] },
    { text: 'Vergleiche: Dein kleiner Finger ist etwa 1\u00A0cm breit.', units: ['cm', 'mm'] },
    { text: 'Vergleiche: Eine Tür ist etwa 2\u00A0m hoch.', units: ['m', 'cm'] },
    { text: 'Vergleiche: Eine Bankkarte ist etwa 1\u00A0mm dick.', units: ['mm'] },
    { text: 'Vergleiche: Ein Lineal ist 30\u00A0cm lang.', units: ['cm'] },
    { text: 'Vergleiche: Für 1\u00A0km gehst du etwa 15 Minuten.', units: ['km'] },
    { text: 'Vergleiche: Ein Fußballfeld ist etwa 100\u00A0m lang. 10 Fußballfelder sind 1\u00A0km.', units: ['km', 'm'] },
  ],
  masse: [
    { text: 'Vergleiche: Eine Packung Mehl wiegt 1\u00A0kg.', units: ['kg'] },
    { text: 'Vergleiche: Eine Tafel Schokolade wiegt 100\u00A0g.', units: ['g'] },
    { text: 'Vergleiche: Ein Liter Wasser wiegt 1\u00A0kg.', units: ['kg'] },
    { text: 'Vergleiche: Eine Büroklammer wiegt etwa 1\u00A0g.', units: ['g'] },
  ],
  volumen: [
    { text: 'Vergleiche: Eine Milchtüte fasst 1\u00A0l.', units: ['l'] },
    { text: 'Vergleiche: Ein Eimer fasst etwa 10\u00A0l.', units: ['l'] },
    { text: 'Vergleiche: Ein Teelöffel fasst etwa 5\u00A0ml.', units: ['ml'] },
    { text: 'Vergleiche: Ein Becher Joghurt fasst etwa 150\u00A0ml.', units: ['ml'] },
  ],
  zeit: [
    { text: 'Vergleiche: „Einundzwanzig“ sagen dauert etwa 1 Sekunde.', units: ['s'] },
    { text: 'Vergleiche: Eine Minute hat 60 Sekunden.', units: ['s', 'min'] },
    { text: 'Vergleiche: Eine Schulstunde dauert 45\u00A0min.', units: ['min', 'h'] },
    { text: 'Vergleiche: Zähneputzen dauert etwa 3\u00A0min.', units: ['min'] },
    { text: 'Vergleiche: Ein Tag hat 24\u00A0h.', units: ['h', 'Tage'] },
    { text: 'Vergleiche: Eine Woche hat 7 Tage.', units: ['Tage', 'Wochen'] },
    { text: 'Vergleiche: Ein Jahr hat 12 Monate.', units: ['Wochen', 'Jahre'] },
  ],
};

const NOT_NOUNS = new Set(['Ein', 'Eine', 'Vergleiche', 'Dein', 'Für', 'Die', 'Der', 'Das', 'Nachts', 'Einmal', 'Auf']);

function nouns(text: string): string[] {
  return (text.match(/[A-ZÄÖÜ][a-zäöüß]+/g) ?? []).filter((w) => !NOT_NOUNS.has(w));
}

/** A Stützpunkt hint that does not mention the object of the item (so it never gives the answer away). */
function stuetzHint(rng: Rng, dim: Dimension, it: Item): string {
  const own = new Set(nouns(it.s));
  const giveaway = qty(it.n, it.u);
  const usable = DIM_HINTS[dim].filter((h) => !nouns(h.text).some((n) => own.has(n)) && !h.text.includes(giveaway));
  const fitting = usable.filter((h) => h.units.includes(it.u));
  const ok = (fitting.length ? fitting : usable).map((h) => h.text);
  return rng.pick(ok.length ? ok : ['Denke an einen Gegenstand, den du gut kennst.']);
}

interface Item {
  /** Sentence with {x} for the quantity. */
  s: string;
  n: number;
  u: string;
  /** Question for Stufe 2. */
  q: string;
}

const ITEMS: readonly Item[] = [
  { s: 'Ein Bleistift ist etwa {x} lang.', n: 17, u: 'cm', q: 'Wie lang ist ein Bleistift etwa?' },
  { s: 'Eine Tür ist etwa {x} hoch.', n: 2, u: 'm', q: 'Wie hoch ist eine Tür etwa?' },
  { s: 'Eine Ameise ist etwa {x} lang.', n: 5, u: 'mm', q: 'Wie lang ist eine Ameise etwa?' },
  { s: 'Ein Fußballfeld ist etwa {x} lang.', n: 100, u: 'm', q: 'Wie lang ist ein Fußballfeld etwa?' },
  { s: 'Ein Schulbus ist etwa {x} lang.', n: 12, u: 'm', q: 'Wie lang ist ein Schulbus etwa?' },
  { s: 'Ein Marienkäfer ist etwa {x} lang.', n: 7, u: 'mm', q: 'Wie lang ist ein Marienkäfer etwa?' },
  { s: 'Ein Schulheft ist etwa {x} hoch.', n: 30, u: 'cm', q: 'Wie hoch ist ein Schulheft etwa?' },
  { s: 'Ein Klassenzimmer ist etwa {x} lang.', n: 8, u: 'm', q: 'Wie lang ist ein Klassenzimmer etwa?' },
  { s: 'Eine Euro-Münze ist etwa {x} dick.', n: 2, u: 'mm', q: 'Wie dick ist eine Euro-Münze etwa?' },
  { s: 'Ein Baum im Park ist etwa {x} hoch.', n: 15, u: 'm', q: 'Wie hoch ist ein Baum im Park etwa?' },
  { s: 'Auf der Autobahn fährt ein Auto in einer Stunde etwa {x}.', n: 100, u: 'km', q: 'Wie weit fährt ein Auto auf der Autobahn in einer Stunde etwa?' },
  { s: 'Eine Büroklammer ist etwa {x} lang.', n: 3, u: 'cm', q: 'Wie lang ist eine Büroklammer etwa?' },
  { s: 'Ein Marathonlauf ist etwa {x} lang.', n: 42, u: 'km', q: 'Wie lang ist ein Marathonlauf etwa?' },
  { s: 'Ein Tisch ist etwa {x} hoch.', n: 75, u: 'cm', q: 'Wie hoch ist ein Tisch etwa?' },
  { s: 'Eine Tafel Schokolade wiegt {x}.', n: 100, u: 'g', q: 'Wie schwer ist eine Tafel Schokolade?' },
  { s: 'Eine Packung Mehl wiegt {x}.', n: 1, u: 'kg', q: 'Wie schwer ist eine Packung Mehl?' },
  { s: 'Ein Apfel wiegt etwa {x}.', n: 150, u: 'g', q: 'Wie schwer ist ein Apfel etwa?' },
  { s: 'Ein großer Hund wiegt etwa {x}.', n: 30, u: 'kg', q: 'Wie schwer ist ein großer Hund etwa?' },
  { s: 'Ein Fahrrad wiegt etwa {x}.', n: 12, u: 'kg', q: 'Wie schwer ist ein Fahrrad etwa?' },
  { s: 'Ein Brief wiegt etwa {x}.', n: 20, u: 'g', q: 'Wie schwer ist ein Brief etwa?' },
  { s: 'Ein Hühnerei wiegt etwa {x}.', n: 60, u: 'g', q: 'Wie schwer ist ein Hühnerei etwa?' },
  { s: 'Eine Katze wiegt etwa {x}.', n: 4, u: 'kg', q: 'Wie schwer ist eine Katze etwa?' },
  { s: 'Ein voller Schulranzen wiegt etwa {x}.', n: 5, u: 'kg', q: 'Wie schwer ist ein voller Schulranzen etwa?' },
  { s: 'Eine Erdbeere wiegt etwa {x}.', n: 15, u: 'g', q: 'Wie schwer ist eine Erdbeere etwa?' },
  { s: 'Ein Sack Kartoffeln wiegt {x}.', n: 10, u: 'kg', q: 'Wie schwer ist ein Sack Kartoffeln?' },
  { s: 'In ein Wasserglas passen etwa {x}.', n: 200, u: 'ml', q: 'Wie viel passt in ein Wasserglas?' },
  { s: 'In eine Badewanne passen etwa {x}.', n: 150, u: 'l', q: 'Wie viel passt in eine Badewanne?' },
  { s: 'Ein Putzeimer fasst etwa {x}.', n: 10, u: 'l', q: 'Wie viel fasst ein Putzeimer?' },
  { s: 'Eine Tasse fasst etwa {x}.', n: 250, u: 'ml', q: 'Wie viel fasst eine Tasse?' },
  { s: 'Ein Teelöffel fasst etwa {x}.', n: 5, u: 'ml', q: 'Wie viel fasst ein Teelöffel?' },
  { s: 'Eine Milchtüte fasst {x}.', n: 1, u: 'l', q: 'Wie viel fasst eine Milchtüte?' },
  { s: 'Ein Trinkpäckchen fasst {x}.', n: 200, u: 'ml', q: 'Wie viel fasst ein Trinkpäckchen?' },
  { s: 'Ein kleines Aquarium fasst etwa {x}.', n: 60, u: 'l', q: 'Wie viel fasst ein kleines Aquarium?' },
  { s: 'Eine Schulstunde dauert {x}.', n: 45, u: 'min', q: 'Wie lange dauert eine Schulstunde?' },
  { s: 'Zähneputzen dauert etwa {x}.', n: 3, u: 'min', q: 'Wie lange dauert Zähneputzen?' },
  { s: 'Ein Fußballspiel dauert {x}.', n: 90, u: 'min', q: 'Wie lange dauert ein Fußballspiel?' },
  { s: 'Die Sommerferien dauern etwa {x}.', n: 6, u: 'Wochen', q: 'Wie lange dauern die Sommerferien?' },
  { s: 'Nachts schläfst du etwa {x}.', n: 10, u: 'h', q: 'Wie lange schläfst du nachts etwa?' },
  { s: 'Einmal in die Hände klatschen dauert etwa {x}.', n: 1, u: 's', q: 'Wie lange dauert einmal Klatschen?' },
  { s: 'Ein Kinofilm dauert etwa {x}.', n: 2, u: 'h', q: 'Wie lange dauert ein Kinofilm?' },
  { s: 'Ein Lied im Radio dauert etwa {x}.', n: 3, u: 'min', q: 'Wie lange dauert ein Lied im Radio?' },
  { s: 'Die Grundschule dauert {x}.', n: 4, u: 'Jahre', q: 'Wie lange dauert die Grundschule?' },
  { s: 'Die Luft anhalten kannst du etwa {x}.', n: 30, u: 's', q: 'Wie lange kannst du die Luft anhalten?' },
  { s: 'Ein Wochenende dauert {x}.', n: 2, u: 'Tage', q: 'Wie lange dauert ein Wochenende?' },
];

function sentence(it: Item, x: string): string {
  return it.s.replace('{x}', x);
}

/** '17 cm', '1 Woche', '6 Wochen' (u is the unit key). */
function qty(n: number, u: string): string {
  return `${fmt(n)}${NBSP}${unitText(u, n)}`;
}

/** Steps of a worked example without repeating the Stützpunkt sentence ('Zähneputzen dauert etwa 3 min.' twice). */
function refSteps(ref: string, result: string): string[] {
  return ref.includes(result) ? [ref] : [ref, result];
}

/** Explains why `n u` does not fit when the right unit is `right`. */
function unitWhy(n: number, u: string, right: string): string {
  const a = UNITS[u];
  const b = UNITS[right];
  if (a.dim !== b.dim) return `${u} ${DIM_INFO[a.dim]}`;
  return `${qty(n, u)} ${n === 1 ? 'wäre' : 'wären'} viel zu ${a.base < b.base ? 'wenig' : 'viel'}. ${a.ref}`;
}

/** 'ist' for 1, 'sind' otherwise ('1 kg ist …', '10 kg sind …'). */
function verb(label: string): string {
  return /^1\u00A0/.test(label) ? 'ist' : 'sind';
}

/** Unit of a label like '20 cm'. */
function unitOf(label: string): string {
  return label.split('\u00A0')[1];
}

// ─── Stufe 1 ─────────────────────────────────────────────────────────────────

function chooseUnit(stufe: Stufe, rng: Rng): Exercise {
  const it = rng.pick(ITEMS);
  const dim = UNITS[it.u].dim;
  const same = DIM_UNITS[dim].filter((u) => u !== it.u);
  let wrong = rng.shuffle(same).slice(0, 3);
  if (wrong.length < 2) {
    const otherDim = rng.pick((['laenge', 'masse', 'volumen'] as Dimension[]).filter((d) => d !== dim));
    wrong = [...wrong, rng.pick(DIM_UNITS[otherDim])];
  }
  const options: ChoiceOption[] = wrong.map((u) => ({ label: unitText(u, it.n), whyWrong: unitWhy(it.n, u, it.u) }));
  const answer = makeChoice(rng, { label: unitText(it.u, it.n) }, options);
  const expression = sentence(it, `${fmt(it.n)}${NBSP}□`);
  return build(schaetzenSkill, stufe, {
    key: `einheit:${it.s}`,
    ab: 1,
    prompt: 'Welche Einheit passt?',
    expression,
    answer,
    hints: ['Stell dir den Gegenstand vor. Ist er klein, mittel oder sehr groß?', stuetzHint(rng, dim, it)],
    steps: refSteps(UNITS[it.u].ref, sentence(it, qty(it.n, it.u))),
    praise: 'Du hast dir die Sache vorgestellt und eine Einheit gewählt, die dazu passt.',
    srText: `Welche Einheit passt? ${speak(expression)} Wähle aus: ${answer.options.map((o) => UNITS[unitKey(o.label)].spoken[it.n === 1 ? 0 : 1]).join(', ')}.`,
    kmk: ['GM.vorstellung'],
  });
}

// ─── Stufe 2 ─────────────────────────────────────────────────────────────────

/** Render a base value in the largest unit of its dimension that gives a whole number. */
function nice(base: number, dim: Dimension): string | null {
  const units = [...DIM_UNITS[dim]].reverse();
  for (const u of units) {
    const v = base / UNITS[u].base;
    if (v >= 1 && Math.abs(v - Math.round(v)) < 1e-9) return qty(Math.round(v), u);
  }
  return null;
}

function chooseValue(stufe: Stufe, rng: Rng): Exercise {
  const it = rng.pick(ITEMS.filter((x) => UNITS[x.u].dim !== 'zeit'));
  const dim = UNITS[it.u].dim;
  const base = it.n * UNITS[it.u].base;
  const right = qty(it.n, it.u);
  const factors = rng.shuffle([0.01, 0.1, 10, 100, 1000]);
  const wrongs: ChoiceOption[] = [];
  for (const f of factors) {
    const label = nice(base * f, dim);
    if (!label || label === right || wrongs.some((w) => w.label === label)) continue;
    wrongs.push({ label, whyWrong: `${label} ${verb(label)} viel zu ${f < 1 ? 'wenig' : 'viel'}. ${UNITS[unitKey(unitOf(label))].ref}` });
    if (wrongs.length === 3) break;
  }
  const answer = makeChoice(rng, { label: right }, wrongs);
  const expression = sentence(it, '…');
  return build(schaetzenSkill, stufe, {
    key: `wert:${it.s}`,
    ab: 2,
    prompt: it.q,
    expression,
    answer,
    hints: [stuetzHint(rng, dim, it), 'Ist die Angabe zu klein, zu groß oder passend?'],
    steps: refSteps(UNITS[it.u].ref, sentence(it, right)),
    praise: 'Du hast die Größe mit etwas verglichen, das du gut kennst.',
    srText: `${it.q} Wähle aus: ${answer.options.map((o) => speak(o.label)).join('; ')}.`,
    kmk: ['GM.vorstellung'],
  });
}

// ─── Stufe 3 ─────────────────────────────────────────────────────────────────

function judge(stufe: Stufe, rng: Rng): Exercise {
  const who = pickPerson(rng);
  const it = rng.pick(ITEMS);
  const dim = UNITS[it.u].dim;
  const others = DIM_UNITS[dim].filter((u) => u !== it.u);
  const claimedUnit = rng.chance(0.3) ? it.u : rng.pick(others);
  const isTrue = claimedUnit === it.u;
  const claim = sentence(it, qty(it.n, claimedUnit));
  const yes = 'Ja, das kann stimmen.';
  const fix = (u: string) => `Nein, eher ${qty(it.n, u)}.`;
  const tooMuch: ChoiceOption = {
    label: `Nein, eher ${qty(it.n * 10, it.u)}.`,
    whyWrong: `${qty(it.n * 10, it.u)} wären viel zu viel. ${UNITS[it.u].ref}`,
  };
  const wrongs: ChoiceOption[] = isTrue
    ? rng.shuffle(others).slice(0, 2).map((u) => ({ label: fix(u), whyWrong: unitWhy(it.n, u, it.u) }))
    : [
        { label: yes, whyWrong: unitWhy(it.n, claimedUnit, it.u) },
        ...rng.shuffle(others.filter((u) => u !== claimedUnit)).slice(0, 1).map((u) => ({ label: fix(u), whyWrong: unitWhy(it.n, u, it.u) })),
      ];
  if (wrongs.length < 2) wrongs.push(tooMuch);
  const answer = makeChoice(rng, { label: isTrue ? yes : fix(it.u) }, wrongs);
  const context = `${who.name} sagt: „${claim}“`;
  return build(schaetzenSkill, stufe, {
    key: `pruefen:${it.s}:${claimedUnit}`,
    ab: 3,
    context,
    prompt: 'Kann das stimmen?',
    answer,
    hints: ['Stell dir die Sache genau vor.', 'Vergleiche mit einem Stützpunkt, den du kennst.'],
    steps: [UNITS[it.u].ref, isTrue ? `${claim} Das passt.` : `${qty(it.n, claimedUnit)} ${it.n === 1 ? 'passt' : 'passen'} nicht. Richtig ist etwa: ${sentence(it, qty(it.n, it.u))}`],
    praise: isTrue ? 'Du hast die Angabe geprüft und gemerkt, dass sie passt.' : 'Du hast gemerkt, dass die Einheit nicht passt.',
    srText: `${speak(context)} Kann das stimmen? Wähle aus: ${answer.options.map((o) => speak(o.label)).join('; ')}`,
    kmk: ['GM.vorstellung', 'PK.argumentieren'],
  });
}

interface Estimate { key: string; context: string; prompt: string; value: number; before: string; after: string; steps: string[]; bugs: { id: string; match: number; hint: string }[]; hint: string }

function estimate(stufe: Stufe, rng: Rng): Exercise {
  const v = rng.int(1, 4);
  let e: Estimate;
  if (v === 1) {
    const step = rng.pick([50, 40]);
    const meters = rng.pick([10, 20, 30, 40, 50, 100]);
    const value = (meters * 100) / step;
    e = {
      key: `schritte:${step}:${meters}`,
      context: `Ein Kinderschritt ist etwa ${qty(step, 'cm')} lang. Der Schulhof ist ${qty(meters, 'm')} lang.`,
      prompt: 'Wie viele Schritte brauchst du etwa für den Schulhof?',
      value,
      before: 'Ich brauche etwa',
      after: 'Schritte.',
      steps: [`${qty(meters, 'm')} = ${qty(meters * 100, 'cm')}`, `${fmt(meters * 100)} : ${step} = ${fmt(value)}`],
      bugs: [
        { id: 'meter-gleich-schritt', match: meters, hint: `Ein Schritt ist kürzer als 1\u00A0m. Du brauchst also mehr Schritte als ${meters}.` },
        { id: 'faktor-10', match: (meters * 10) / step, hint: '1\u00A0m hat 100\u00A0cm, nicht 10\u00A0cm.' },
      ],
      hint: 'Wandle die Länge des Schulhofs in Zentimeter um.',
    };
  } else if (v === 2) {
    const kg = rng.int(1, 5);
    const bar = rng.pick([100, 250, 500]);
    const value = (kg * 1000) / bar;
    const what = bar === 100 ? 'Tafel Schokolade' : bar === 250 ? 'Packung Butter' : 'Packung Nudeln';
    const plural = bar === 100 ? 'Tafeln' : 'Packungen';
    e = {
      key: `stueck:${bar}:${kg}`,
      context: `Eine ${what} wiegt ${qty(bar, 'g')}.`,
      prompt: `Wie viele ${plural} wiegen zusammen ${qty(kg, 'kg')}?`,
      value,
      before: 'Es sind',
      after: `${plural}.`,
      steps: [`${qty(kg, 'kg')} = ${qty(kg * 1000, 'g')}`, `${fmt(kg * 1000)} : ${bar} = ${fmt(value)}`],
      bugs: [{ id: 'faktor-100', match: (kg * 100) / bar, hint: '1\u00A0kg hat 1000\u00A0g, nicht 100\u00A0g.' }, { id: 'pro-kg', match: 1000 / bar, hint: `Das ist für 1\u00A0kg. Gefragt sind ${qty(kg, 'kg')}.` }],
      hint: 'Wie viele davon wiegen zusammen 1 kg?',
    };
  } else if (v === 3) {
    const l = rng.int(1, 4);
    const glass = rng.pick([200, 250]);
    const value = (l * 1000) / glass;
    e = {
      key: `glaeser:${glass}:${l}`,
      context: `Ein Glas fasst ${qty(glass, 'ml')}. Für das Klassenfrühstück gibt es ${qty(l, 'l')} Saft.`,
      prompt: 'Wie viele Gläser kannst du füllen?',
      value,
      before: 'Ich kann',
      after: 'Gläser füllen.',
      steps: [`${qty(l, 'l')} = ${qty(l * 1000, 'ml')}`, `${fmt(l * 1000)} : ${glass} = ${fmt(value)}`],
      bugs: [{ id: 'pro-liter', match: 1000 / glass, hint: `Das ist für 1\u00A0l. Es gibt ${qty(l, 'l')} Saft.` }, { id: 'faktor-100', match: (l * 100) / glass, hint: '1\u00A0l hat 1000\u00A0ml, nicht 100\u00A0ml.' }],
      hint: 'Wie viele Gläser passen in 1 l?',
    };
  } else {
    const floors = rng.int(3, 8);
    const per = 3;
    const value = floors * per;
    e = {
      key: `haus:${floors}`,
      context: `Ein Stockwerk ist etwa ${qty(per, 'm')} hoch. Ein Haus hat ${floors} Stockwerke.`,
      prompt: 'Wie hoch ist das Haus etwa?',
      value,
      before: 'Das Haus ist etwa',
      after: 'm hoch.',
      steps: [`${floors} · ${qty(per, 'm')} = ${qty(value, 'm')}`],
      bugs: [{ id: 'addiert', match: floors + per, hint: `Jedes der ${floors} Stockwerke ist etwa ${qty(per, 'm')} hoch. Du brauchst ${floors}-mal ${qty(per, 'm')}.` }],
      hint: 'Wie oft musst du die Höhe eines Stockwerks nehmen?',
    };
  }
  return build(schaetzenSkill, stufe, {
    key: `stuetzpunkt:${e.key}`,
    ab: 3,
    knobel: true,
    context: e.context,
    prompt: e.prompt,
    answer: { kind: 'number', value: e.value, before: e.before, after: e.after, label: e.prompt },
    hints: safeHints([e.hint, 'Rechne mit derselben Einheit.'], e.value, 'Rechne mit derselben Einheit.'),
    steps: [...e.steps, `${e.before} ${fmt(e.value)} ${e.after}`],
    bugs: numberBugs(e.bugs, e.value),
    praise: 'Du hast mit einem Stützpunkt gerechnet.',
    srText: `${speak(e.context)} ${e.prompt}`,
    kmk: ['GM.vorstellung', 'GM.sachsituationen'],
  });
}

export const schaetzenSkill: SkillDef = {
  id: 'groessen.schaetzen',
  topicId: 'groessen',
  title: 'Schätzen',
  description: 'Du schätzt Größen mit Dingen, die du gut kennst.',
  stufen: {
    1: 'Die passende Einheit wählen',
    2: 'Den passenden Wert wählen',
    3: 'Angaben prüfen und mit Stützpunkten rechnen',
  },
  kmk: ['GM.vorstellung'],
  generate(rng, stufe) {
    if (stufe === 1) return chooseUnit(1, rng);
    if (stufe === 2) return rng.chance(0.7) ? chooseValue(2, rng) : chooseUnit(2, rng);
    return rng.chance(0.5) ? judge(3, rng) : estimate(3, rng);
  },
};
