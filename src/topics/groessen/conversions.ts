/**
 * Generic building blocks for unit conversions with "neighbouring" units
 * (mm–cm, cm–m, m–km, g–kg, kg–t, ml–l, ct–€). Each builder returns the
 * maths part of an exercise (expression, answer, bugs, hints, steps, srText);
 * the skills add prompt, praise and curriculum tags.
 */
import { BOX, DIV, NBSP, TIMES, fmt, fmtQty } from '../../core/format';
import type { Bug, ChoiceAnswer, Exercise, MultiAnswer, MultiField, NumberAnswer, Rng, SkillDef, Stufe, Step } from '../../core/types';
import { build, makeChoice, multiBugs, numberBugs, roundTo, safeHints, speak } from './helpers';

export type Unit = 'mm' | 'cm' | 'm' | 'km' | 'g' | 'kg' | 't' | 'ml' | 'l' | 'ct' | '€';

/** Size of each unit in its base unit (mm, g, ml, ct). */
export const BASE: Record<Unit, number> = { mm: 1, cm: 10, m: 1000, km: 1_000_000, g: 1, kg: 1000, t: 1_000_000, ml: 1, l: 1000, ct: 1, '€': 100 };

/** Plural unit names for prompts ('Rechne in Zentimeter um'). */
export const UNIT_NAME: Record<Unit, string> = {
  mm: 'Millimeter', cm: 'Zentimeter', m: 'Meter', km: 'Kilometer', g: 'Gramm', kg: 'Kilogramm', t: 'Tonnen',
  ml: 'Milliliter', l: 'Liter', ct: 'Cent', '€': 'Euro',
};

/** Dative plural unit names ('Ergebnis in Metern', 'zu den Zentimetern'). */
export const UNIT_DATIVE: Record<Unit, string> = {
  mm: 'Millimetern', cm: 'Zentimetern', m: 'Metern', km: 'Kilometern', g: 'Gramm', kg: 'Kilogramm', t: 'Tonnen',
  ml: 'Millilitern', l: 'Litern', ct: 'Cent', '€': 'Euro',
};

/** 'kein ganzer Meter', 'kein ganzes Kilogramm', 'keine ganze Tonne'. */
const NOT_A_WHOLE: Record<Unit, string> = {
  mm: 'kein ganzer Millimeter', cm: 'kein ganzer Zentimeter', m: 'kein ganzer Meter', km: 'kein ganzer Kilometer',
  g: 'kein ganzes Gramm', kg: 'kein ganzes Kilogramm', t: 'keine ganze Tonne', ml: 'kein ganzer Milliliter', l: 'kein ganzer Liter',
  ct: 'kein ganzer Cent', '€': 'kein ganzer Euro',
};

/** 'ist' for exactly 1 ('1 cm ist …'), 'sind' otherwise. */
function sind(n: number): string {
  return n === 1 ? 'ist' : 'sind';
}

/** Neighbouring unit pairs [big, small]. */
export type Pair = readonly [big: Unit, small: Unit];

export const FACTORS = [10, 100, 1000] as const;

export function factor(big: Unit, small: Unit): number {
  return BASE[big] / BASE[small];
}

/** Number of decimal places that belong to the small unit (cm→mm 1, m→cm 2, km→m 3). */
export function places(big: Unit, small: Unit): number {
  return Math.round(Math.log10(factor(big, small)));
}

/** '1 m = 100 cm' */
export function relation(big: Unit, small: Unit): string {
  return `1${NBSP}${big} = ${fmt(factor(big, small))}${NBSP}${small}`;
}

export function q(n: number, unit: Unit | string, decimals?: number): string {
  return fmtQty(n, unit, decimals);
}

/** '2 km 50 m' (zero parts are left out; all-zero → '0 <small>'). */
export function mixed(a: number, big: Unit, b: number, small: Unit): string {
  const parts: string[] = [];
  if (a !== 0) parts.push(q(a, big));
  if (b !== 0 || a === 0) parts.push(q(b, small));
  return parts.join(' ');
}

/** The answer box with unit for expressions: '□ cm'. */
export function box(unit: Unit | string): string {
  return `${BOX}${NBSP}${unit}`;
}

export interface ConvItem {
  key: string;
  expression: string;
  answer: NumberAnswer | MultiAnswer;
  bugs: Bug[];
  hints: string[];
  steps: Step[];
  srText: string;
  /** Process praise that names what this variant asks the child to do. */
  praise: string;
}

const otherFactors = (f: number) => FACTORS.filter((x) => x !== f);

function factorBug(match: number, big: Unit, small: Unit, f2: number): Bug {
  return {
    id: `faktor-${f2}`,
    match,
    hint: `Prüfe die Umrechnungszahl: ${relation(big, small)}, nicht ${fmt(f2)}.`,
  };
}

const FALLBACK = 'Überlege zuerst: Welche Einheit ist größer? Wird die Zahl größer oder kleiner?';

function numberAnswer(value: number, unit: Unit, decimals = 0): NumberAnswer {
  const a: NumberAnswer = { kind: 'number', value, unit, label: `Ergebnis in ${UNIT_DATIVE[unit]}` };
  if (decimals) a.decimals = decimals;
  return a;
}

// ─── Stufe 1: whole numbers, one step ────────────────────────────────────────

/** n big → small, e.g. '4 m = □ cm' (= 400). */
export function convDown(big: Unit, small: Unit, n: number): ConvItem {
  const f = factor(big, small);
  const value = n * f;
  const expression = `${q(n, big)} = ${box(small)}`;
  return {
    key: `down:${big}:${small}:${n}`,
    expression,
    answer: numberAnswer(value, small),
    bugs: numberBugs(
      [
        ...otherFactors(f).map((f2) => factorBug(n * f2, big, small, f2)),
        { id: 'abgeschrieben', match: n, hint: `${UNIT_NAME[small]} sind kleiner als ${UNIT_NAME[big]}. Du brauchst also mehr ${UNIT_NAME[small]}.` },
      ],
      value,
    ),
    hints: safeHints(
      [`Von der großen zur kleinen Einheit wird die Zahl größer.`, `Denke an: ${relation(big, small)}. Wie viel sind dann ${q(n, big)}?`],
      value,
      FALLBACK,
    ),
    steps: [relation(big, small), `${q(n, big)} = ${fmt(n)} ${TIMES} ${q(f, small)} = ${q(value, small)}`],
    srText: `Wandle um. ${speak(expression)}`,
    praise: `Du hast mit der Umrechnungszahl ${fmt(f)} malgenommen.`,
  };
}

/** n·F small → big, e.g. '400 cm = □ m' (= 4). */
export function convUp(big: Unit, small: Unit, n: number): ConvItem {
  const f = factor(big, small);
  const v = n * f;
  const expression = `${q(v, small)} = ${box(big)}`;
  return {
    key: `up:${big}:${small}:${n}`,
    expression,
    answer: numberAnswer(n, big),
    bugs: numberBugs(
      [
        ...otherFactors(f).map((f2) => factorBug(v / f2, big, small, f2)),
        { id: 'abgeschrieben', match: v, hint: `${UNIT_NAME[big]} sind größer als ${UNIT_NAME[small]}. Du brauchst also weniger ${UNIT_NAME[big]}.` },
      ],
      n,
    ),
    hints: safeHints(
      [`Von der kleinen zur großen Einheit wird die Zahl kleiner.`, `Denke an: ${relation(big, small)}. Wie oft passen ${q(f, small)} in ${q(v, small)}?`],
      n,
      FALLBACK,
    ),
    steps: [relation(big, small), `${fmt(v)} ${DIV} ${fmt(f)} = ${fmt(n)}`, `${q(v, small)} = ${q(n, big)}`],
    srText: `Wandle um. ${speak(expression)}`,
    praise: `Du hast durch die Umrechnungszahl ${fmt(f)} geteilt.`,
  };
}

// ─── Stufe 2: mixed notation ─────────────────────────────────────────────────

/** Digits of a and b written next to each other ('2 km 50 m' → 250): the "missing zero" bug. */
function glued(a: number, b: number): number {
  return Number(`${a}${b}`);
}

/** 'a big b small = □ small', e.g. '2 km 50 m = □ m' (= 2050). */
export function mixedToSmall(big: Unit, small: Unit, a: number, b: number): ConvItem {
  const f = factor(big, small);
  const value = a * f + b;
  const expression = `${mixed(a, big, b, small)} = ${box(small)}`;
  return {
    key: `m2s:${big}:${small}:${a}:${b}`,
    expression,
    answer: numberAnswer(value, small),
    bugs: numberBugs(
      [
        { id: 'null-fehlt', match: glued(a, b), hint: `Achte auf die Stellen: ${q(b, small)} ${sind(b)} weniger als ${q(f / 10, small)}. Dann brauchst du Nullen als Platzhalter.` },
        ...otherFactors(f).filter((f2) => f2 === f * 10 || f2 === f / 10).map((f2) => factorBug(a * f2 + b, big, small, f2)),
        { id: 'nur-addiert', match: a + b, hint: `Wandle zuerst die ${UNIT_NAME[big]} in ${UNIT_NAME[small]} um. Erst dann darfst du addieren.` },
      ],
      value,
    ),
    hints: safeHints(
      [`Wandle zuerst ${q(a, big)} in ${UNIT_NAME[small]} um.`, `Denke an: ${relation(big, small)}. Dann addiere ${q(b, small)}.`],
      value,
      FALLBACK,
    ),
    steps: [`${q(a, big)} = ${q(a * f, small)}`, `${q(a * f, small)} + ${q(b, small)} = ${q(value, small)}`],
    srText: `Wandle um. ${speak(expression)}`,
    praise: b < f / 10
      ? 'Du hast an die Nullen als Platzhalter gedacht.'
      : `Du hast erst die ${UNIT_NAME[big]} umgewandelt und dann die ${UNIT_NAME[small]} addiert.`,
  };
}

/** 'v small = □ big □ small', e.g. '2050 m = □ km □ m'. */
export function smallToMixed(big: Unit, small: Unit, v: number): ConvItem {
  const f = factor(big, small);
  const a = Math.floor(v / f);
  const b = v % f;
  const expression = `${q(v, small)} = ${box(big)} ${box(small)}`;
  const fields: MultiField[] = [
    { id: 'gross', value: a, after: big, label: `${UNIT_NAME[big]}` },
    { id: 'klein', value: b, after: small, label: `${UNIT_NAME[small]}` },
  ];
  return {
    key: `s2m:${big}:${small}:${v}`,
    expression,
    answer: { kind: 'multi', fields },
    bugs: multiBugs(
      [
        ...otherFactors(f).map((f2) => ({
          id: `faktor-${f2}`,
          match: { gross: Math.floor(v / f2), klein: v % f2 },
          hint: `Prüfe die Umrechnungszahl: ${relation(big, small)}.`,
        })),
        { id: 'vertauscht', match: { gross: b, klein: a }, hint: `Die großen Einheiten (${big}) kommen nach vorne, der Rest in ${small} nach hinten.` },
      ],
      fields,
    ),
    hints: [`Wie viele ganze ${UNIT_NAME[big]} stecken in ${q(v, small)}?`, `Denke an: ${relation(big, small)}. Was übrig bleibt, schreibst du in ${small}.`],
    steps: [relation(big, small), `${q(v, small)} = ${q(a * f, small)} + ${q(b, small)}`, `${q(a * f, small)} = ${q(a, big)}`, `${q(v, small)} = ${mixed(a, big, b, small)}`],
    srText: `Wandle um in ${UNIT_NAME[big]} und ${UNIT_NAME[small]}. ${speak(expression)}`,
    praise: `Du hast die ganzen ${UNIT_NAME[big]} abgetrennt und den Rest in ${UNIT_NAME[small]} geschrieben.`,
  };
}

// ─── Comma notation ──────────────────────────────────────────────────────────

/** Split a comma number into whole big units and the rest in small units. */
export function splitComma(x: number, big: Unit, small: Unit): [number, number] {
  const f = factor(big, small);
  const total = Math.round(x * f);
  return [Math.floor(total / f), total % f];
}

/** 'x big = □ small', e.g. '1,5 m = □ cm' (= 150). shown = decimals displayed. */
export function commaToSmall(big: Unit, small: Unit, x: number, shown: number): ConvItem {
  const f = factor(big, small);
  const d = places(big, small);
  const value = Math.round(x * f);
  const [a, b] = splitComma(x, big, small);
  const shownText = fmt(x, shown);
  const fullText = fmt(x, d);
  const expression = `${q(x, big, shown)} = ${box(small)}`;
  const steps: Step[] = [];
  if (shown < d) steps.push(`Ergänze Nullen: ${q(x, big, shown)} = ${q(x, big, d)}`);
  steps.push(`${q(x, big, d)} = ${mixed(a, big, b, small)}`);
  steps.push(`${q(a, big)} = ${q(a * f, small)}`);
  steps.push(`${q(a * f, small)} + ${q(b, small)} = ${q(value, small)}`);
  return {
    key: `c2s:${big}:${small}:${fullText}:${shown}`,
    expression,
    answer: numberAnswer(value, small),
    bugs: numberBugs(
      [
        {
          id: 'komma-weg',
          match: Number(shownText.replace(/[,\u202F]/g, '')),
          hint: `Du hast nur das Komma weggelassen. Nach dem Komma stehen ${d} Stellen für die ${UNIT_NAME[small]}: ${q(x, big, shown)} = ${q(x, big, d)}.`,
        },
        ...otherFactors(f).map((f2) => factorBug(roundTo(x * f2, 3), big, small, f2)),
      ],
      value,
    ),
    hints: safeHints(
      [
        `Vor dem Komma stehen die ganzen ${UNIT_NAME[big]}.`,
        shown < d
          ? `Nach dem Komma gehören ${d} Stellen zu den ${UNIT_DATIVE[small]}. Ergänze Nullen.`
          : `Die ${d} Stellen nach dem Komma sind die ${UNIT_NAME[small]}.`,
      ],
      value,
      FALLBACK,
    ),
    steps,
    srText: `Wandle um. ${speak(expression)}`,
    praise: shown < d
      ? 'Du hast nach dem Komma die fehlenden Nullen ergänzt.'
      : b > 0 && b < f / 10
        ? 'Du hast auch an die Null direkt nach dem Komma gedacht.'
        : `Du hast die ${d} Stellen nach dem Komma als ${UNIT_NAME[small]} gelesen.`,
  };
}

/** Praise for writing a value with a comma: the zero right after the comma is the usual stumbling block. */
function commaPraise(b: number, f: number, d: number, small: Unit): string {
  return b > 0 && b < f / 10
    ? 'Du hast an die Null direkt nach dem Komma gedacht.'
    : `Du hast die ${UNIT_NAME[small]} mit ${d} Stellen nach dem Komma geschrieben.`;
}

/** 'v small = □ big' with comma, e.g. '235 cm = □ m' (= 2,35). */
export function smallToComma(big: Unit, small: Unit, v: number): ConvItem {
  const f = factor(big, small);
  const d = places(big, small);
  const value = roundTo(v / f, d);
  const a = Math.floor(v / f);
  const b = v % f;
  const expression = `${q(v, small)} = ${box(big)}`;
  const bugs: (Bug | null)[] = otherFactors(f).map((f2) => factorBug(roundTo(v / f2, 6), big, small, f2));
  if (b > 0 && b < f / 10) {
    bugs.unshift({
      id: 'null-fehlt',
      match: Number(`${a}.${b}`),
      hint: `${q(b, small)} ${sind(b)} weniger als ${q(f / 10, small)}. Direkt nach dem Komma steht deshalb mindestens eine 0.`,
    });
  }
  bugs.push({ id: 'abgeschrieben', match: v, hint: `${UNIT_NAME[big]} sind größer als ${UNIT_NAME[small]}. Die Zahl muss kleiner werden.` });
  return {
    key: `s2c:${big}:${small}:${v}`,
    expression,
    answer: numberAnswer(value, big, d),
    bugs: numberBugs(bugs, value, d),
    hints: safeHints(
      [`Wie viele ganze ${UNIT_NAME[big]} sind es? Sie stehen vor dem Komma.`, `Die restlichen ${UNIT_NAME[small]} kommen nach dem Komma. Achte auf ${d} Stellen.`],
      value,
      FALLBACK,
      d,
    ),
    steps: [`${q(v, small)} = ${mixed(a, big, b, small)}`, `${mixed(a, big, b, small)} = ${q(value, big, d)}`],
    srText: `Wandle um in ${UNIT_NAME[big]}, mit Komma. ${speak(expression)}`,
    praise: commaPraise(b, f, d, small),
  };
}

/** 'a big b small = □ big', e.g. '3 m 5 cm = □ m' (= 3,05). */
export function mixedToComma(big: Unit, small: Unit, a: number, b: number): ConvItem {
  const f = factor(big, small);
  const d = places(big, small);
  const value = roundTo(a + b / f, d);
  const expression = `${mixed(a, big, b, small)} = ${box(big)}`;
  const bugs: (Bug | null)[] = [];
  if (b < f / 10) {
    bugs.push({
      id: 'null-fehlt',
      match: Number(`${a}.${b}`),
      hint: `${q(b, small)} ${sind(b)} weniger als ${q(f / 10, small)}. Direkt nach dem Komma steht deshalb mindestens eine 0.`,
    });
  }
  bugs.push({ id: 'addiert', match: a + b, hint: `${q(b, small)} ${sind(b)} ${NOT_A_WHOLE[big]}. ${b === 1 ? 'Er steht' : 'Sie stehen'} nach dem Komma.` });
  return {
    key: `m2c:${big}:${small}:${a}:${b}`,
    expression,
    answer: numberAnswer(value, big, d),
    bugs: numberBugs(bugs, value, d),
    hints: safeHints(
      [`Die ganzen ${UNIT_NAME[big]} stehen vor dem Komma.`, `Nach dem Komma stehen genau ${d} Stellen für die ${UNIT_NAME[small]}.`],
      value,
      FALLBACK,
      d,
    ),
    steps: [`${relation(big, small)}`, `${q(b, small)} = ${q(b / f, big, d)}`, `${mixed(a, big, b, small)} = ${q(value, big, d)}`],
    srText: `Schreibe mit Komma. ${speak(expression)}`,
    praise: commaPraise(b, f, d, small),
  };
}

/** 'x big = □ big □ small', e.g. '3,45 € = □ € □ ct'. */
export function commaToMixed(big: Unit, small: Unit, x: number, shown: number): ConvItem {
  const f = factor(big, small);
  const d = places(big, small);
  const [a, b] = splitComma(x, big, small);
  const expression = `${q(x, big, shown)} = ${box(big)} ${box(small)}`;
  const fields: MultiField[] = [
    { id: 'gross', value: a, after: big, label: UNIT_NAME[big] },
    { id: 'klein', value: b, after: small, label: UNIT_NAME[small] },
  ];
  const bugs: Bug[] = [];
  const shownFrac = fmt(x, shown).split(',')[1] ?? '';
  // Reading the digits after the comma as a whole number: '12,05 €' → 5 ct is right, but '12,5 €' → 5 ct is not.
  const asRead = Number(shownFrac.replace(/^0+(?=\d)/, '') || '0');
  if (asRead !== b) {
    bugs.push({ id: 'stellen', match: { gross: a, klein: asRead }, hint: `Nach dem Komma stehen ${d} Stellen für die ${UNIT_NAME[small]}. Ergänze, wenn nötig, eine Null am Ende.` });
  }
  if (b > 0 && b < f / 10) {
    bugs.push({ id: 'null-vorn', match: { gross: a, klein: b * 10 }, hint: `Die 0 direkt nach dem Komma zählt: Es sind weniger als ${q(f / 10, small)}.` });
  }
  if (b % 10 === 0 && b > 0) {
    bugs.push({ id: 'null-hinten', match: { gross: a, klein: b / 10 }, hint: `Die erste Stelle nach dem Komma ist der Zehner der ${UNIT_NAME[small]}.` });
  }
  return {
    key: `c2m:${big}:${small}:${fmt(x, d)}:${shown}`,
    expression,
    answer: { kind: 'multi', fields },
    bugs: multiBugs(bugs, fields),
    hints: [`Vor dem Komma stehen die ganzen ${UNIT_NAME[big]}.`, `Nach dem Komma stehen ${d} Stellen für die ${UNIT_NAME[small]}.`],
    steps: shown < d
      ? [`${q(x, big, shown)} = ${q(x, big, d)}`, `${q(x, big, d)} = ${mixed(a, big, b, small)}`]
      : [`Vor dem Komma: ${q(a, big)}. Nach dem Komma: ${q(b, small)}.`, `${q(x, big, d)} = ${mixed(a, big, b, small)}`],
    srText: `Schreibe in ${UNIT_NAME[big]} und ${UNIT_NAME[small]}. ${speak(expression)}`,
    praise: shown < d
      ? 'Du hast nach dem Komma die fehlende Null ergänzt.'
      : b > 0 && b < f / 10
        ? 'Du hast auch an die Null direkt nach dem Komma gedacht.'
        : `Du hast ${UNIT_NAME[big]} und ${UNIT_NAME[small]} sauber getrennt.`,
  };
}

// ─── "Stimmt das?" error check ───────────────────────────────────────────────

export interface Claim {
  /** Left side, e.g. '3,5 m'. */
  lhs: string;
  /** Correct right side, e.g. '350 cm'. */
  right: string;
  /** Typical wrong right sides with an explanation of the misconception (at least 2). */
  wrongs: { rhs: string; why: string }[];
}

export interface ClaimItem {
  context: string;
  prompt: string;
  answer: ChoiceAnswer;
  shown: string;
  isTrue: boolean;
  steps: Step[];
  srText: string;
}

/**
 * "Kim schreibt: 3,5 m = 35 cm. Stimmt das?" with three options.
 * If the shown statement is true, "Ja, das stimmt." is correct; otherwise "Nein. Richtig ist: …".
 */
export function claimItem(rng: Rng, name: string, claim: Claim, showTrue: boolean): ClaimItem {
  const shown = showTrue ? claim.right : claim.wrongs[0].rhs;
  const yes = 'Ja, das stimmt.';
  const fix = (rhs: string) => `Nein. Richtig ist: ${claim.lhs} = ${rhs}`;
  const answer = showTrue
    ? makeChoice(rng, { label: yes }, claim.wrongs.slice(0, 2).map((w) => ({ label: fix(w.rhs), whyWrong: `${claim.lhs} = ${w.rhs} stimmt nicht. ${w.why}` })), { max: 3 })
    : makeChoice(
        rng,
        { label: fix(claim.right) },
        [
          { label: yes, whyWrong: claim.wrongs[0].why },
          ...claim.wrongs.slice(1, 2).map((w) => ({ label: fix(w.rhs), whyWrong: `${claim.lhs} = ${w.rhs} stimmt auch nicht. ${w.why}` })),
        ],
        { max: 3 },
      );
  const context = `${name} schreibt: ${claim.lhs} = ${shown}`;
  return {
    context,
    prompt: 'Stimmt das? Prüfe genau.',
    answer,
    shown,
    isTrue: showTrue,
    steps: showTrue
      ? [`Rechne selbst nach: ${claim.lhs} = ${claim.right}`, `${name} hat richtig umgewandelt.`]
      : [`Rechne selbst nach: ${claim.lhs} = ${claim.right}`, `${name} hat ${shown} geschrieben. ${claim.wrongs[0].why}`, `Richtig ist: ${claim.lhs} = ${claim.right}`],
    srText: `${speak(context)}. Stimmt das?`,
  };
}

// ─── Wrapper: ConvItem → Exercise ────────────────────────────────────────────

export interface ConvOpts {
  ab: 1 | 2 | 3;
  /** Overrides the variant's own process praise (rarely needed). */
  praise?: string;
  kmk: string[];
  /** Additional skill-specific bugs (merged and filtered). */
  extra?: Bug[];
  prompt?: string;
  knobel?: boolean;
}

export function convExercise(skill: Pick<SkillDef, 'id' | 'topicId'>, stufe: Stufe, item: ConvItem, opts: ConvOpts): Exercise {
  let bugs = item.bugs;
  if (opts.extra?.length) {
    bugs = item.answer.kind === 'number'
      ? numberBugs([...opts.extra, ...item.bugs], item.answer.value, item.answer.decimals ?? 0)
      : multiBugs([...opts.extra, ...item.bugs], item.answer.fields);
  }
  const ex = build(skill, stufe, {
    key: item.key,
    ab: opts.ab,
    prompt: opts.prompt ?? 'Wandle um.',
    expression: item.expression,
    answer: item.answer,
    hints: item.hints,
    steps: item.steps,
    bugs,
    praise: opts.praise ?? item.praise,
    srText: item.srText,
    kmk: opts.kmk,
  });
  if (opts.knobel) ex.knobel = true;
  return ex;
}
