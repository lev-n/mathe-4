/**
 * Shared helpers for the topic "Daten und Zufall" (topicId 'daten').
 *
 * - Exercise construction (key, ids), bug and choice helpers
 * - Data themes with grammatically correct German sentence templates
 * - Colour words for Kugeln and Glücksräder (colour is always named, never shown alone)
 */
import { fmt, toSpeech } from '../../core/format';
import type { Bug, ChoiceAnswer, ChoiceOption, ColorName, Exercise, PictoIcon, Rng, Stufe, Visual } from '../../core/types';

// ─── Exercise construction ───────────────────────────────────────────────────

export type ExerciseBody = Omit<Exercise, 'topicId' | 'skillId' | 'stufe' | 'key' | 'kmk'> & { kmk?: string[] };

export interface SkillMeta {
  id: string;
  kmk: string[];
}

export function makeExercise(skill: SkillMeta, stufe: Stufe, keyParts: (string | number)[], body: ExerciseBody): Exercise {
  const { kmk, ...rest } = body;
  return {
    key: [skill.id, stufe, ...keyParts].join(':'),
    topicId: 'daten',
    skillId: skill.id,
    stufe,
    kmk: kmk ?? skill.kmk,
    ...rest,
  };
}

/** Short stable hash (base 36) for exercise keys that depend on generated sentences. */
export function hashText(text: string): string {
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = (Math.imul(h, 33) ^ text.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

/** Plain spoken version: optional data description + context + prompt. */
export function speech(...parts: (string | undefined)[]): string {
  return toSpeech(parts.filter((p): p is string => !!p && p.trim() !== '').join(' '));
}

// ─── Bugs ────────────────────────────────────────────────────────────────────

export type BugSpec = readonly [id: string, value: number, hint: string];

/**
 * Typical wrong answers. Drops entries that are not finite, negative, non-integer (unless decimals),
 * equal to the correct answer or duplicates of an earlier bug.
 */
export function numberBugs(correct: number, specs: (BugSpec | null | undefined | false)[], decimals = false): Bug[] {
  const out: Bug[] = [];
  const seen: number[] = [correct];
  for (const s of specs) {
    if (!s) continue;
    const [id, raw, hint] = s;
    if (!Number.isFinite(raw) || raw < 0) continue;
    const value = decimals ? Math.round(raw * 100) / 100 : raw;
    if (!decimals && !Number.isInteger(value)) continue;
    if (seen.some((x) => Math.abs(x - value) < 1e-9)) continue;
    seen.push(value);
    out.push({ id, match: value, hint });
  }
  return out;
}

// ─── Choice answers ──────────────────────────────────────────────────────────

export interface Opt {
  label: string;
  visual?: Visual;
  whyWrong?: string;
}

function toOption(o: Opt, correct: boolean): ChoiceOption {
  const opt: ChoiceOption = { label: o.label };
  if (o.visual) opt.visual = o.visual;
  if (!correct && o.whyWrong) opt.whyWrong = o.whyWrong;
  return opt;
}

const sig = (o: Opt) => o.label + '|' + JSON.stringify(o.visual ?? null);

/** Correct option + up to max − 1 unique distractors, shuffled with rng. */
export function shuffledChoice(rng: Rng, correct: Opt, wrong: Opt[], max = 4, layout?: ChoiceAnswer['layout']): ChoiceAnswer {
  const list: ChoiceOption[] = [toOption(correct, true)];
  const seen = new Set([sig(correct)]);
  for (const w of wrong) {
    if (list.length >= max) break;
    const s = sig(w);
    if (seen.has(s)) continue;
    seen.add(s);
    list.push(toOption(w, false));
  }
  const order = rng.shuffle(list.map((_, i) => i));
  const answer: ChoiceAnswer = { kind: 'choice', options: order.map((i) => list[i]), correct: order.indexOf(0) };
  if (layout) answer.layout = layout;
  return answer;
}

/**
 * Fixed-order choice for answer scales ('sicher' – 'möglich' – 'unmöglich', 'A' – 'B' – 'gleich').
 * A stable order is easier to read than a shuffled scale; whyWrong of the correct option is dropped.
 */
export function fixedChoice(options: Opt[], correct: number, layout?: ChoiceAnswer['layout']): ChoiceAnswer {
  const answer: ChoiceAnswer = { kind: 'choice', options: options.map((o, i) => toOption(o, i === correct)), correct };
  if (layout) answer.layout = layout;
  return answer;
}

export const LETTERS = ['A', 'B', 'C', 'D'] as const;

/** Choice between pictures; after shuffling they are labelled '<noun> A', '<noun> B' … */
export function visualChoice(
  rng: Rng,
  noun: string,
  correct: Visual,
  wrong: { visual: Visual; whyWrong: string }[],
  max = 3,
): ChoiceAnswer {
  const items: { visual: Visual; whyWrong?: string }[] = [{ visual: correct }];
  const seen = new Set([JSON.stringify(correct)]);
  for (const w of wrong) {
    if (items.length >= max) break;
    const s = JSON.stringify(w.visual);
    if (seen.has(s)) continue;
    seen.add(s);
    items.push(w);
  }
  const order = rng.shuffle(items.map((_, i) => i));
  const options: ChoiceOption[] = order.map((idx, pos) => {
    const it = items[idx];
    const o: ChoiceOption = { label: `${noun} ${LETTERS[pos]}`, visual: it.visual };
    if (idx !== 0 && it.whyWrong) o.whyWrong = it.whyWrong;
    return o;
  });
  return { kind: 'choice', options, correct: order.indexOf(0), layout: 'grid' };
}

// ─── Text helpers ────────────────────────────────────────────────────────────

/** 'a', 'a und b', 'a, b und c' */
export function listDe(items: readonly string[], conj = 'und'): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} ${conj} ${items[items.length - 1]}`;
}

export function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const TIMES_WORD: Record<number, string> = { 2: 'doppelt', 3: 'dreimal', 4: 'viermal', 5: 'fünfmal' };
export function timesWord(k: number): string {
  return TIMES_WORD[k] ?? `${fmt(k)}-mal`;
}

/** '2 Fünferbündel und 3 Striche', '4 Striche', '1 Strich', '3 Fünferbündel' */
export function tallyText(count: number): string {
  const b = Math.floor(count / 5);
  const r = count % 5;
  const bundles = b > 0 ? `${fmt(b)} Fünferbündel` : '';
  const single = r > 0 ? (r === 1 ? '1 Strich' : `${fmt(r)} Striche`) : '';
  if (bundles && single) return `${bundles} und ${single}`;
  return bundles || single || 'keine Striche';
}

/** '3 Bilder', '1 Bild und ein halbes Bild', 'ein halbes Bild' */
export function pictoText(value: number, iconValue: number): string {
  const full = Math.floor(value / iconValue);
  const half = value - full * iconValue > 0;
  const fullText = full === 1 ? '1 Bild' : `${fmt(full)} Bilder`;
  if (full === 0) return half ? 'ein halbes Bild' : 'kein Bild';
  return half ? `${fullText} und ein halbes Bild` : fullText;
}

/** '5 + 5 + 5' style list of a repeated addend. */
export function repeatSum(addend: number, times: number): string {
  return Array.from({ length: times }, () => fmt(addend)).join(' + ');
}

// ─── Colours ─────────────────────────────────────────────────────────────────

export const COLORS: readonly ColorName[] = ['rot', 'blau', 'gelb', 'gruen', 'lila', 'orange'];

/** Predicative colour word: 'Die Kugel ist grün.' */
export const COLOR_WORD: Record<ColorName, string> = { rot: 'rot', blau: 'blau', gelb: 'gelb', gruen: 'grün', lila: 'lila', orange: 'orange' };
/** Colour as a noun: 'Der Zeiger bleibt auf Grün stehen.' */
export const COLOR_NOUN: Record<ColorName, string> = { rot: 'Rot', blau: 'Blau', gelb: 'Gelb', gruen: 'Grün', lila: 'Lila', orange: 'Orange' };

const INDECLINABLE: ReadonlySet<ColorName> = new Set(['lila', 'orange']);

/** 'rote', 'blaue', 'lila' (eine rote Kugel, 3 rote Kugeln) */
export function adjE(c: ColorName): string {
  return INDECLINABLE.has(c) ? COLOR_WORD[c] : COLOR_WORD[c] + 'e';
}
/** 'roten', 'lila' (die roten Kugeln) */
export function adjEn(c: ColorName): string {
  return INDECLINABLE.has(c) ? COLOR_WORD[c] : COLOR_WORD[c] + 'en';
}
/** '1 rote Kugel', '3 rote Kugeln' */
export function balls(n: number, c: ColorName): string {
  return `${fmt(n)} ${adjE(c)} ${n === 1 ? 'Kugel' : 'Kugeln'}`;
}
/** '1 rotes Feld', '3 rote Felder' */
export function fields(n: number, c: ColorName): string {
  if (n === 1) return `1 ${INDECLINABLE.has(c) ? COLOR_WORD[c] : COLOR_WORD[c] + 'es'} Feld`;
  return `${fmt(n)} ${adjE(c)} Felder`;
}

export interface BallGroup {
  color: ColorName;
  count: number;
}

/** '5 rote Kugeln, 3 blaue Kugeln und 1 gelbe Kugel' */
export function bagText(groups: readonly BallGroup[]): string {
  return listDe(groups.map((g) => balls(g.count, g.color)));
}

export function spinnerCounts(sectors: readonly ColorName[]): BallGroup[] {
  const out: BallGroup[] = [];
  for (const s of sectors) {
    const g = out.find((x) => x.color === s);
    if (g) g.count++;
    else out.push({ color: s, count: 1 });
  }
  return out;
}

/** '2 blaue', '1 rotes', '1 lila' (Felder implied) */
function fieldsShort(n: number, c: ColorName): string {
  if (n === 1) return `1 ${INDECLINABLE.has(c) ? COLOR_WORD[c] : COLOR_WORD[c] + 'es'}`;
  return `${fmt(n)} ${adjE(c)}`;
}

/** 'Das Glücksrad hat 7 gleich große Felder: 2 blaue, 3 orange und 2 grüne.' */
export function spinnerText(sectors: readonly ColorName[]): string {
  const groups = spinnerCounts(sectors);
  const list = groups.length === 1 ? `alle ${COLOR_WORD[groups[0].color]}` : listDe(groups.map((g) => fieldsShort(g.count, g.color)));
  return `Das Glücksrad hat ${fmt(sectors.length)} gleich große ${sectors.length === 1 ? 'Feld' : 'Felder'}: ${list}.`;
}

/** Spread the colours of an Glücksrad so equal colours are not all next to each other. */
export function arrangeSectors(rng: Rng, groups: readonly BallGroup[]): ColorName[] {
  const flat: ColorName[] = [];
  groups.forEach((g) => {
    for (let i = 0; i < g.count; i++) flat.push(g.color);
  });
  return rng.shuffle(flat);
}

// ─── Data themes (Diagramme, Strichlisten, Tabellen) ─────────────────────────

/**
 * A data context with all sentence templates the generators need.
 * Category names are chosen so that 'bei <Kategorie>' needs no dative ending (Katzen, Kiwis, Fußball …).
 */
export interface DataTheme {
  id: string;
  title: string;
  /** Pool of category names (≥ 6, ordered themes keep their order, e.g. Wochentage). */
  cats: readonly string[];
  ordered: boolean;
  /** Plural noun of what is counted ('Kinder'), and singular ('Kind'). */
  unit: string;
  unitOne: string;
  /** Table header of the category column ('Obst', 'Tag'). */
  catHeader: string;
  /** Axis caption ('Anzahl der Kinder'). */
  axisLabel: string;
  icon: PictoIcon;
  emoji: string;
  /** 'bei Katzen', 'am Montag' */
  at(c: string): string;
  /** Statement: 'Für Kiwis haben 12 Kinder gestimmt.' */
  says(c: string, n: number): string;
  /** Statement: 'Für Kiwis haben mehr Kinder gestimmt als für Birnen.' (b may be a group phrase) */
  moreThan(a: string, b: string): string;
  /** Second part of a comparison with two categories: 'Birnen und Trauben zusammen' */
  group(b: string, c: string): string;
  twice(a: string, b: string): string;
  sumIs(a: string, b: string, n: number): string;
  mostIs(c: string): string;
  leastIs(c: string): string;
  howMany(c: string): string;
  sumQ(a: string, b: string): string;
  totalQ: string;
  mostQ: string;
  leastQ: string;
}

function survey(id: string, title: string, cats: string[], catHeader: string, icon: PictoIcon, emoji: string): DataTheme {
  return {
    id,
    title,
    cats,
    ordered: false,
    unit: 'Kinder',
    unitOne: 'Kind',
    catHeader,
    axisLabel: 'Anzahl der Kinder',
    icon,
    emoji,
    at: (c) => `bei ${c}`,
    says: (c, n) => `Für ${c} ${n === 1 ? 'hat 1 Kind' : `haben ${fmt(n)} Kinder`} gestimmt.`,
    moreThan: (a, b) => `Für ${a} haben mehr Kinder gestimmt als für ${b}.`,
    group: (b, c) => `${b} und ${c} zusammen`,
    twice: (a, b) => `Für ${a} haben doppelt so viele Kinder gestimmt wie für ${b}.`,
    sumIs: (a, b, n) => `Für ${a} und ${b} haben zusammen ${fmt(n)} Kinder gestimmt.`,
    mostIs: (c) => `Für ${c} haben die meisten Kinder gestimmt.`,
    leastIs: (c) => `Für ${c} haben die wenigsten Kinder gestimmt.`,
    howMany: (c) => `Wie viele Kinder haben für ${c} gestimmt?`,
    sumQ: (a, b) => `Wie viele Kinder haben für ${a} und ${b} zusammen gestimmt?`,
    totalQ: 'Wie viele Kinder haben insgesamt abgestimmt?',
    mostQ: 'Wofür haben die meisten Kinder gestimmt?',
    leastQ: 'Wofür haben die wenigsten Kinder gestimmt?',
  };
}

const WEEKDAYS = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];

export const THEMES: readonly DataTheme[] = [
  survey('obst', 'Lieblingsobst', ['Bananen', 'Birnen', 'Trauben', 'Kirschen', 'Kiwis', 'Erdbeeren'], 'Obst', 'apfel', '🍎'),
  survey('sport', 'Lieblingssport', ['Fußball', 'Schwimmen', 'Turnen', 'Tanzen', 'Reiten', 'Judo'], 'Sport', 'ball', '⚽'),
  survey('tiere', 'Lieblingstiere', ['Katzen', 'Hasen', 'Pandas', 'Ponys', 'Giraffen', 'Elefanten'], 'Tier', 'herz', '🐾'),
  {
    id: 'schwimmbad',
    title: 'Besucher im Schwimmbad',
    cats: WEEKDAYS,
    ordered: true,
    unit: 'Besucher',
    unitOne: 'Besucher',
    catHeader: 'Tag',
    axisLabel: 'Anzahl der Besucher',
    icon: 'person',
    emoji: '🏊',
    at: (c) => `am ${c}`,
    says: (c, n) => `Am ${c} ${n === 1 ? 'kam 1 Besucher' : `kamen ${fmt(n)} Besucher`}.`,
    moreThan: (a, b) => `Am ${a} kamen mehr Besucher als am ${b}.`,
    group: (b, c) => `${b} und am ${c} zusammen`,
    twice: (a, b) => `Am ${a} kamen doppelt so viele Besucher wie am ${b}.`,
    sumIs: (a, b, n) => `Am ${a} und am ${b} kamen zusammen ${fmt(n)} Besucher.`,
    mostIs: (c) => `Am ${c} kamen die meisten Besucher.`,
    leastIs: (c) => `Am ${c} kamen die wenigsten Besucher.`,
    howMany: (c) => `Wie viele Besucher kamen am ${c}?`,
    sumQ: (a, b) => `Wie viele Besucher kamen am ${a} und am ${b} zusammen?`,
    totalQ: 'Wie viele Besucher kamen an allen Tagen zusammen?',
    mostQ: 'An welchem Tag kamen die meisten Besucher?',
    leastQ: 'An welchem Tag kamen die wenigsten Besucher?',
  },
  {
    id: 'buecherei',
    title: 'Ausgeliehene Bücher',
    cats: WEEKDAYS,
    ordered: true,
    unit: 'Bücher',
    unitOne: 'Buch',
    catHeader: 'Tag',
    axisLabel: 'Anzahl der Bücher',
    icon: 'buch',
    emoji: '📚',
    at: (c) => `am ${c}`,
    says: (c, n) => `Am ${c} ${n === 1 ? 'wurde 1 Buch' : `wurden ${fmt(n)} Bücher`} ausgeliehen.`,
    moreThan: (a, b) => `Am ${a} wurden mehr Bücher ausgeliehen als am ${b}.`,
    group: (b, c) => `${b} und am ${c} zusammen`,
    twice: (a, b) => `Am ${a} wurden doppelt so viele Bücher ausgeliehen wie am ${b}.`,
    sumIs: (a, b, n) => `Am ${a} und am ${b} wurden zusammen ${fmt(n)} Bücher ausgeliehen.`,
    mostIs: (c) => `Am ${c} wurden die meisten Bücher ausgeliehen.`,
    leastIs: (c) => `Am ${c} wurden die wenigsten Bücher ausgeliehen.`,
    howMany: (c) => `Wie viele Bücher wurden am ${c} ausgeliehen?`,
    sumQ: (a, b) => `Wie viele Bücher wurden am ${a} und am ${b} zusammen ausgeliehen?`,
    totalQ: 'Wie viele Bücher wurden an allen Tagen zusammen ausgeliehen?',
    mostQ: 'An welchem Tag wurden die meisten Bücher ausgeliehen?',
    leastQ: 'An welchem Tag wurden die wenigsten Bücher ausgeliehen?',
  },
  {
    id: 'sterne',
    title: 'Gesammelte Lesesterne',
    cats: ['Mia', 'Ben', 'Lea', 'Tom', 'Ida', 'Emil'],
    ordered: false,
    unit: 'Sterne',
    unitOne: 'Stern',
    catHeader: 'Kind',
    axisLabel: 'Anzahl der Sterne',
    icon: 'stern',
    emoji: '⭐',
    at: (c) => `bei ${c}`,
    says: (c, n) => `${c} hat ${n === 1 ? '1 Stern' : `${fmt(n)} Sterne`} gesammelt.`,
    moreThan: (a, b) => `${a} hat mehr Sterne gesammelt als ${b}.`,
    group: (b, c) => `${b} und ${c} zusammen`,
    twice: (a, b) => `${a} hat doppelt so viele Sterne gesammelt wie ${b}.`,
    sumIs: (a, b, n) => `${a} und ${b} haben zusammen ${fmt(n)} Sterne gesammelt.`,
    mostIs: (c) => `${c} hat die meisten Sterne gesammelt.`,
    leastIs: (c) => `${c} hat die wenigsten Sterne gesammelt.`,
    howMany: (c) => `Wie viele Sterne hat ${c} gesammelt?`,
    sumQ: (a, b) => `Wie viele Sterne haben ${a} und ${b} zusammen gesammelt?`,
    totalQ: 'Wie viele Sterne haben alle Kinder zusammen gesammelt?',
    mostQ: 'Wer hat die meisten Sterne gesammelt?',
    leastQ: 'Wer hat die wenigsten Sterne gesammelt?',
  },
  {
    id: 'verkehr',
    title: 'Verkehrszählung vor der Schule',
    cats: ['Autos', 'Lastwagen', 'Taxis', 'Mopeds', 'Traktoren', 'Wohnwagen'],
    ordered: false,
    unit: 'Fahrzeuge',
    unitOne: 'Fahrzeug',
    catHeader: 'Fahrzeug',
    axisLabel: 'Anzahl der Fahrzeuge',
    icon: 'person',
    emoji: '🚗',
    at: (c) => `bei den ${c}`,
    says: (c, n) => `Die Klasse hat ${fmt(n)} ${c} gezählt.`,
    moreThan: (a, b) => `Die Klasse hat mehr ${a} als ${b} gezählt.`,
    group: (b, c) => `${b} und ${c} zusammen`,
    twice: (a, b) => `Die Klasse hat doppelt so viele ${a} wie ${b} gezählt.`,
    sumIs: (a, b, n) => `Die Klasse hat ${fmt(n)} ${a} und ${b} zusammen gezählt.`,
    mostIs: (c) => `Die Klasse hat am häufigsten ${c} gezählt.`,
    leastIs: (c) => `Die Klasse hat am seltensten ${c} gezählt.`,
    howMany: (c) => `Wie viele ${c} hat die Klasse gezählt?`,
    sumQ: (a, b) => `Wie viele ${a} und ${b} hat die Klasse zusammen gezählt?`,
    totalQ: 'Wie viele Fahrzeuge hat die Klasse insgesamt gezählt?',
    mostQ: 'Welche Fahrzeuge hat die Klasse am häufigsten gezählt?',
    leastQ: 'Welche Fahrzeuge hat die Klasse am seltensten gezählt?',
  },
];

/** Themes whose icon fits a Bilddiagramm (no Verkehrszählung: there is no vehicle icon). */
export const PICTO_THEMES: readonly DataTheme[] = THEMES.filter((t) => t.id !== 'verkehr');
export const SURVEY_THEMES: readonly DataTheme[] = THEMES.filter((t) => t.unit === 'Kinder');

export function themeById(id: string): DataTheme {
  const t = THEMES.find((x) => x.id === id);
  if (!t) throw new Error(`unknown theme ${id}`);
  return t;
}

/** '12 Kinder', '1 Kind' */
export function qty(n: number, theme: DataTheme): string {
  return `${fmt(n)} ${n === 1 ? theme.unitOne : theme.unit}`;
}

/** 'Es sind 3 Kinder mehr.' / 'Es ist 1 Kind mehr.' */
export function moreText(n: number, theme: DataTheme): string {
  return `Es ${n === 1 ? 'ist' : 'sind'} ${qty(n, theme)} mehr.`;
}

export function pickCategories(rng: Rng, theme: DataTheme, n: number): string[] {
  if (n > theme.cats.length) throw new RangeError(`theme ${theme.id} has only ${theme.cats.length} categories`);
  if (theme.ordered) {
    const start = rng.int(0, theme.cats.length - n);
    return theme.cats.slice(start, start + n);
  }
  return rng.sample(theme.cats, n);
}

/** n distinct multiples of `step` in [min, max], random order. */
export function distinctValues(rng: Rng, n: number, min: number, max: number, step: number): number[] {
  const pool: number[] = [];
  for (let v = Math.ceil(min / step) * step; v <= max; v += step) pool.push(v);
  if (pool.length < n) throw new RangeError(`distinctValues: only ${pool.length} values for n=${n}`);
  return rng.sample(pool, n);
}

/** Smallest multiple of step that is strictly greater than max (one step of headroom above the tallest bar). */
export function axisMaxFor(max: number, step: number): number {
  return (Math.floor(max / step) + 1) * step;
}

export function sum(values: readonly number[]): number {
  return values.reduce((a, b) => a + b, 0);
}

export function argMax(values: readonly number[]): number {
  let best = 0;
  values.forEach((v, i) => {
    if (v > values[best]) best = i;
  });
  return best;
}

export function argMin(values: readonly number[]): number {
  let best = 0;
  values.forEach((v, i) => {
    if (v < values[best]) best = i;
  });
  return best;
}

/** 'Bananen 12, Birnen 8 und Kiwis 5' */
export function valuesText(cats: readonly string[], values: readonly number[]): string {
  return listDe(cats.map((c, i) => `${c} ${fmt(values[i])}`));
}

// ─── Visual builders + spoken descriptions ───────────────────────────────────

export type BarChart = Extract<Visual, { type: 'barChart' }>;
export type Pictogram = Extract<Visual, { type: 'pictogram' }>;
export type Tally = Extract<Visual, { type: 'tally' }>;
export type Table = Extract<Visual, { type: 'table' }>;

export function barChart(theme: DataTheme, cats: string[], values: number[], step: number, horizontal: boolean, axisStart?: number): BarChart {
  const v: BarChart = {
    type: 'barChart',
    title: theme.title,
    categories: cats,
    values,
    axisMax: axisMaxFor(Math.max(...values), step),
    axisStep: step,
    valueLabel: theme.axisLabel,
  };
  if (horizontal) v.horizontal = true;
  if (axisStart) v.axisStart = axisStart;
  return v;
}

export function pictogram(theme: DataTheme, cats: string[], values: number[], iconValue: number): Pictogram {
  return { type: 'pictogram', title: theme.title, categories: cats, values, iconValue, icon: theme.icon };
}

export function tally(theme: DataTheme, cats: string[], values: number[]): Tally {
  return { type: 'tally', title: theme.title, rows: cats.map((label, i) => ({ label, count: values[i] })) };
}

export function table(theme: DataTheme, cats: string[], values: (number | null)[], totalRow?: number): Table {
  const rows = cats.map((c, i) => [c, values[i] === null ? '?' : fmt(values[i] as number)]);
  if (totalRow !== undefined) rows.push(['Zusammen', fmt(totalRow)]);
  return { type: 'table', caption: theme.title, header: [theme.catHeader, 'Anzahl'], rows };
}

export function describeBarChart(v: BarChart): string {
  const kind = v.horizontal ? 'Balkendiagramm' : 'Säulendiagramm';
  const start = v.axisStart ? ` Die Achse beginnt bei ${fmt(v.axisStart)}.` : '';
  return `${kind} ${v.title}: ${valuesText(v.categories, v.values)}.${start}`;
}

export function describePictogram(v: Pictogram): string {
  return `Bilddiagramm ${v.title}. Ein Bild bedeutet ${fmt(v.iconValue)}. ${v.categories.map((c, i) => `${c}: ${pictoText(v.values[i], v.iconValue)}`).join('. ')}.`;
}

export function describeTally(v: Tally): string {
  return `Strichliste ${v.title ?? ''}: ${v.rows.map((r) => `${r.label}: ${tallyText(r.count)}`).join('. ')}.`;
}

export function describeTable(v: Table): string {
  return `Tabelle ${v.caption ?? ''}: ${v.rows.map((r) => r.join(' ')).join(', ')}.`;
}

export function describeVisual(v: Visual): string {
  switch (v.type) {
    case 'barChart':
      return describeBarChart(v);
    case 'pictogram':
      return describePictogram(v);
    case 'tally':
      return describeTally(v);
    case 'table':
      return describeTable(v);
    case 'bag':
      return `Im Säckchen sind ${bagText(v.balls)}.`;
    case 'spinner':
      return spinnerText(v.sectors);
    case 'dice':
      return `Würfel mit den Zahlen ${listDe(v.values.map((x) => fmt(x)))}.`;
    case 'tree':
      return `Baumdiagramm: ${v.levels.map((l) => listDe(l, 'oder')).join('; danach jeweils ')}.`;
    default:
      return '';
  }
}
