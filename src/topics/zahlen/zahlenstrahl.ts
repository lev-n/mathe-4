import { fmt } from '../../core/format';
import type { Exercise, NumberLineAnswer, Rng, SkillDef, Stufe, VisualOf } from '../../core/types';
import { bugList, choiceAnswer, type WrongOption } from './shared';

const ID = 'zahlen.zahlenstrahl';
const KMK = ['ZO.zahlraum', 'PK.darstellen'];

function base(stufe: Stufe, ab: 1 | 2 | 3, key: string) {
  return { key: `${ID}:${stufe}:${key}`, topicId: 'zahlen' as const, skillId: ID, stufe, ab, kmk: KMK };
}

/** A segment of the Zahlenstrahl. labels: explicit labelled values (in addition to major labels if labelMajor). */
export interface Line {
  min: number;
  max: number;
  major: number;
  minor: number;
  labelMajor: boolean;
  labels?: number[];
}

export function lineVisual(l: Line, marks?: { value: number; label: string }[]): VisualOf<'numberLine'> {
  const v: VisualOf<'numberLine'> = { type: 'numberLine', min: l.min, max: l.max, majorStep: l.major, minorStep: l.minor, labelMajor: l.labelMajor };
  if (l.labels) v.labels = l.labels;
  if (marks) v.marks = marks;
  return v;
}

function labelled(l: Line): number[] {
  const out = new Set<number>(l.labels ?? []);
  if (l.labelMajor) for (let x = l.min; x <= l.max; x += l.major) out.add(x);
  return [...out].sort((a, b) => a - b);
}

const plural = (k: number, one: string, many: string) => `${k} ${k === 1 ? one : many}`;

/** Spoken description of the line (what a sighted child sees, without step values). */
export function describeLine(l: Line): string {
  const majors = Math.round((l.max - l.min) / l.major);
  const perMajor = Math.round(l.major / l.minor);
  const parts = [`Zahlenstrahl von ${l.min} bis ${l.max}.`];
  if (perMajor > 1) parts.push(`Lange Striche teilen ihn in ${majors} Abschnitte. Jeder Abschnitt hat ${perMajor} kleine Abschnitte.`);
  else parts.push(`Striche teilen ihn in ${majors} gleiche Abschnitte.`);
  parts.push(`Beschriftet: ${labelled(l).join(', ')}.`);
  return parts.join(' ');
}

/** Spoken position of a mark relative to the nearest labelled value on its left (tick counts, no value). */
export function describeMark(l: Line, value: number, name: string): string {
  const labels = labelled(l);
  const left = [...labels].reverse().find((x) => x <= value);
  const ref = left ?? l.min;
  const d = value - ref;
  if (d === 0) return `${name} steht genau bei ${ref}.`;
  const onTick = Math.abs(d / l.minor - Math.round(d / l.minor)) < 1e-9;
  if (!onTick) {
    const idx = Math.floor((value - l.min) / l.major);
    const f = (value - l.min - idx * l.major) / l.major;
    const where =
      f <= 0.2 ? 'kurz nach dem linken Strich' : f < 0.5 ? 'näher am linken Strich' : f === 0.5 ? 'genau in seiner Mitte' : f < 0.8 ? 'näher am rechten Strich' : 'kurz vor dem rechten Strich';
    return `${name} steht im ${idx + 1}. Abschnitt von links, ${where}.`;
  }
  const big = l.major === l.minor ? 0 : Math.floor(d / l.major);
  const small = Math.round((d - big * l.major) / l.minor);
  if (l.major === l.minor) return `${name} steht ${plural(small, 'Strich', 'Striche')} rechts von ${ref}.`;
  const bits = [big > 0 ? plural(big, 'langen Abschnitt', 'lange Abschnitte') : '', small > 0 ? plural(small, 'kleinen Abschnitt', 'kleine Abschnitte') : ''].filter(Boolean);
  return `${name} steht ${bits.join(' und ')} rechts von ${ref}.`;
}

// ─── Exercises ───────────────────────────────────────────────────────────────

export function ablesen(l: Line, value: number, stufe: Stufe): Exercise {
  const labels = labelled(l);
  const left = [...labels].reverse().find((x) => x <= value) ?? l.min;
  const k = Math.round((value - left) / l.minor);
  const perMajor = Math.round(l.major / l.minor);
  return {
    ...base(stufe, stufe === 1 ? 1 : 2, `ablesen:${l.min}:${l.max}:${l.major}:${l.minor}:${value}`),
    prompt: 'Welche Zahl zeigt der Pfeil A?',
    visual: lineVisual(l, [{ value, label: 'A' }]),
    answer: { kind: 'number', value, label: 'Zahl bei A' },
    hints: [
      'Wie viel ist ein kleiner Schritt wert? Schau dir zwei beschriftete Zahlen an.',
      `Zähle die Schritte von ${fmt(left)} bis zum Pfeil.`,
    ],
    steps: [
      perMajor > 1
        ? `Ein langer Abschnitt ist ${fmt(l.major)}. Er hat ${perMajor} kleine Abschnitte. Ein kleiner Abschnitt ist also ${fmt(l.minor)}.`
        : `Ein Abschnitt ist ${fmt(l.minor)}.`,
      `Von ${fmt(left)} bis A: ${plural(k, 'kleiner Abschnitt', 'kleine Abschnitte')}. ${k} · ${fmt(l.minor)} = ${fmt(k * l.minor)}.`,
      `${fmt(left)} + ${fmt(k * l.minor)} = ${fmt(value)}. Der Pfeil zeigt ${fmt(value)}.`,
    ],
    bugs: bugList(value, [
      ['striche-gezaehlt', k >= 2 ? left + k : null, 'Du hast die Striche gezählt. Überlege, wie viel ein Strich wert ist.'],
      ['schritt-zu-klein', l.minor >= 10 ? left + k * (l.minor / 10) : null, 'Ein kleiner Abschnitt ist mehr wert. Prüfe mit zwei beschrifteten Zahlen.'],
      ['schritt-zu-gross', left + k * l.minor * 10, 'Ein kleiner Abschnitt ist weniger wert. Prüfe mit zwei beschrifteten Zahlen.'],
      ['einer-mehr', value + l.minor <= l.max ? value + l.minor : null, 'Fast! Zähle die kleinen Abschnitte noch einmal genau.'],
      ['einer-weniger', value - l.minor > left ? value - l.minor : null, 'Fast! Zähle die kleinen Abschnitte noch einmal genau.'],
    ]),
    praise: 'Du hast zuerst den Wert eines Schritts bestimmt und dann gezählt.',
    srText: `${describeLine(l)} ${describeMark(l, value, 'Der Pfeil A')} Welche Zahl zeigt der Pfeil A?`,
  };
}

export function eintragen(line: Line, value: number, stufe: Stufe, tolerance = 0, step = line.minor): Exercise {
  // The answer input labels the major ticks, or the line's own labels (at least both ends) when labelMajor is false.
  // The labels are stated explicitly in the answer, so input, hints and srText agree (e.g. 0, 500 000, 1 000 000 for estimates).
  const l: Line = line.labelMajor ? { ...line, labels: undefined } : { ...line, labels: [...new Set([line.min, ...(line.labels ?? []), line.max])].sort((x, y) => x - y) };
  const answer: NumberLineAnswer = { kind: 'numberline', min: l.min, max: l.max, majorStep: l.major, minorStep: l.minor, step, value, tolerance, labelMajor: l.labelMajor };
  if (l.labels) answer.labels = l.labels;
  const labels = labelled(l);
  const left = [...labels].reverse().find((x) => x <= value) ?? l.min;
  const big = Math.floor((value - left) / l.major);
  const small = Math.round((value - left - big * l.major) / l.minor);
  const swapped = left + small * l.major + big * l.minor;
  const estimate = tolerance > 0;
  const inRange = (x: number) => x >= l.min && x <= l.max && Math.abs(x - value) > tolerance;
  return {
    ...base(stufe, estimate ? 3 : stufe === 1 ? 1 : 2, `eintragen:${l.min}:${l.max}:${l.major}:${l.minor}:${value}`),
    prompt: estimate ? `Setze den Pfeil ungefähr auf ${fmt(value)}.` : `Setze den Pfeil auf ${fmt(value)}.`,
    answer,
    hints: estimate
      ? [
          'Zwischen welchen beschrifteten Zahlen liegt die Zahl?',
          `Von Strich zu Strich sind es ${fmt(l.major)}. Zwischen welchen zwei Strichen liegt die Zahl?`,
          'Liegt sie eher in der Mitte oder näher an einem Strich?',
        ]
      : ['Wie viel ist ein kleiner Schritt wert?', `Beginne bei ${fmt(left)} und zähle weiter.`],
    steps: estimate
      ? [`${fmt(value)} liegt zwischen ${fmt(Math.floor(value / l.major) * l.major)} und ${fmt(Math.floor(value / l.major) * l.major + l.major)}.`, { text: `So liegt ${fmt(value)} auf dem Zahlenstrahl.`, visual: lineVisual(l, [{ value, label: fmt(value) }]) }]
      : [
          `Ein kleiner Abschnitt ist ${fmt(l.minor)}${l.major !== l.minor ? `, ein langer ${fmt(l.major)}` : ''}.`,
          `${fmt(value)} = ${fmt(left)}${big > 0 ? ` + ${big} · ${fmt(l.major)}` : ''}${small > 0 ? ` + ${small} · ${fmt(l.minor)}` : ''}`,
          { text: `Der Pfeil gehört an diese Stelle: ${fmt(value)}.`, visual: lineVisual(l, [{ value, label: fmt(value) }]) },
        ],
    bugs: bugList(value, [
      ['lang-kurz-vertauscht', !estimate && l.major !== l.minor && inRange(swapped) ? swapped : null, 'Lange und kurze Striche haben verschiedene Werte. Prüfe, wie viel ein Abschnitt wert ist.'],
      ['einer-mehr', !estimate && inRange(value + l.minor) ? value + l.minor : null, 'Fast! Zähle die kleinen Abschnitte noch einmal.'],
      ['einer-weniger', !estimate && inRange(value - l.minor) ? value - l.minor : null, 'Fast! Zähle die kleinen Abschnitte noch einmal.'],
    ]),
    praise: estimate ? 'Du hast gut geschätzt, wo die Zahl liegt.' : 'Du hast den Wert der Striche erkannt und genau gezählt.',
    srText: `${describeLine(l)} Setze den Pfeil ${estimate ? 'ungefähr ' : ''}auf ${value}. Nutze die Pfeiltasten.`,
    knobel: estimate ? true : undefined,
  };
}

export function schaetzen(rng: Rng, l: Line, value: number): Exercise {
  const candidates = [value / 10, Number(String(value).slice(1, 2) + String(value).slice(0, 1) + String(value).slice(2)), value + 300_000, value - 300_000, value + 200_000, value - 200_000];
  const wrong: WrongOption[] = [];
  for (const x of candidates) {
    if (!Number.isInteger(x) || x <= l.min || x >= l.max || Math.abs(x - value) < 150_000) continue;
    const lo = Math.floor(x / l.major) * l.major;
    wrong.push({ label: fmt(x), whyWrong: x === value / 10 ? `${fmt(x)} läge ganz nah bei 0.` : `${fmt(x)} läge zwischen ${fmt(lo)} und ${fmt(lo + l.major)}. Der Pfeil steht woanders.` });
  }
  return {
    ...base(3, 3, `schaetzen:${value}`),
    prompt: 'Welche Zahl zeigt der Pfeil ungefähr?',
    visual: lineVisual(l, [{ value, label: 'A' }]),
    answer: choiceAnswer(rng, fmt(value), wrong),
    hints: ['Zwischen welchen zwei Strichen steht der Pfeil?', 'Ein Abschnitt ist ein Zehntel der ganzen Strecke.'],
    steps: [
      `Die Strecke von ${fmt(l.min)} bis ${fmt(l.max)} hat 10 Abschnitte. Ein Abschnitt ist ${fmt(l.major)}.`,
      `Der Pfeil steht zwischen ${fmt(Math.floor(value / l.major) * l.major)} und ${fmt(Math.floor(value / l.major) * l.major + l.major)}.`,
      `Er zeigt ungefähr ${fmt(value)}.`,
    ],
    praise: 'Du hast die Abschnitte genutzt, um gut zu schätzen.',
    srText: `${describeLine(l)} ${describeMark(l, value, 'Der Pfeil A')} Welche Zahl zeigt der Pfeil ungefähr?`,
    knobel: true,
  };
}

export function mitteZwischen(a: number, b: number): Exercise {
  const value = (a + b) / 2;
  const half = (b - a) / 2;
  return {
    ...base(3, 2, `mitte:${a}:${b}`),
    prompt: `Welche Zahl liegt genau in der Mitte zwischen ${fmt(a)} und ${fmt(b)}?`,
    answer: { kind: 'number', value, label: 'Zahl in der Mitte' },
    hints: ['Wie groß ist der Abstand zwischen den beiden Zahlen?', 'Gehe von der kleineren Zahl den halben Abstand weiter.'],
    steps: [
      `Abstand: ${fmt(b)} − ${fmt(a)} = ${fmt(b - a)}.`,
      `Die Hälfte davon: ${fmt(half)}.`,
      { text: `${fmt(a)} + ${fmt(half)} = ${fmt(value)}`, visual: lineVisual({ min: a, max: b, major: half, minor: half / 5, labelMajor: true }) },
    ],
    bugs: bugList(value, [
      ['halber-abstand', half, `Das ist der halbe Abstand. Zähle ihn zu ${fmt(a)} dazu.`],
      ['abstand', b - a, 'Das ist der ganze Abstand. Gesucht ist die Zahl in der Mitte.'],
    ]),
    praise: 'Du hast den Abstand halbiert und von der kleineren Zahl aus weitergezählt.',
    srText: `Welche Zahl liegt genau in der Mitte zwischen ${a} und ${b}?`,
  };
}

// ─── Lines per Stufe ─────────────────────────────────────────────────────────

function stufe1Line(rng: Rng): { line: Line; values: number[] } {
  const kind = rng.int(0, 2);
  if (kind === 0) {
    const a = rng.int(0, 9) * 10_000;
    return { line: { min: a, max: a + 10_000, major: 5_000, minor: 1_000, labelMajor: true }, values: [1, 2, 3, 4, 6, 7, 8, 9].map((k) => a + k * 1_000) };
  }
  if (kind === 1) {
    const a = rng.int(0, 9) * 10_000;
    return { line: { min: a, max: a + 10_000, major: 1_000, minor: 500, labelMajor: true }, values: Array.from({ length: 10 }, (_, k) => a + (2 * k + 1) * 500) };
  }
  return { line: { min: 0, max: 100_000, major: 10_000, minor: 5_000, labelMajor: true }, values: Array.from({ length: 10 }, (_, k) => (2 * k + 1) * 5_000) };
}

function stufe2Line(rng: Rng): { line: Line; values: number[] } {
  const kind = rng.int(0, 2);
  const span = [10_000, 1_000, 100_000][kind];
  const a = kind === 2 ? rng.int(0, 9) * 100_000 : rng.int(kind === 0 ? 10 : 100, kind === 0 ? 99 : 999) * span;
  const major = span / 10;
  const minor = major / 2;
  const labels = rng.chance(0.4) ? [a, a + span / 2, a + span] : [a, a + span];
  const values = Array.from({ length: 19 }, (_, k) => a + (k + 1) * minor).filter((v) => !labels.includes(v));
  return { line: { min: a, max: a + span, major, minor, labelMajor: false, labels }, values };
}

function generate(rng: Rng, stufe: Stufe): Exercise {
  if (stufe === 1 || stufe === 2) {
    const { line, values } = stufe === 1 ? stufe1Line(rng) : stufe2Line(rng);
    const value = rng.pick(values);
    return rng.chance(0.5) ? ablesen(line, value, stufe) : eintragen(line, value, stufe);
  }
  const v = rng.pick(['schaetzen', 'eintragen', 'mitte'] as const);
  if (v === 'mitte') {
    const p = rng.pick([1_000, 10_000, 100_000]);
    const a = rng.int(1, p === 100_000 ? 8 : 98) * p;
    const width = rng.pick([1, 2]) * p;
    return mitteZwischen(a, Math.min(a + width, 1_000_000));
  }
  const big = v === 'schaetzen' || rng.chance(0.6);
  const line: Line = big
    ? { min: 0, max: 1_000_000, major: 100_000, minor: 100_000, labelMajor: false, labels: [0, 500_000, 1_000_000] }
    : { min: 0, max: 100_000, major: 10_000, minor: 10_000, labelMajor: false, labels: [0, 50_000, 100_000] };
  const unit = line.major / 10;
  let value = rng.int(11, 89) * unit;
  if (value % line.major === 0) value += 3 * unit;
  if (v === 'eintragen') return eintragen(line, value, 3, 2 * unit, unit);
  return schaetzen(rng, line, value);
}

export const zahlenstrahlSkill: SkillDef = {
  id: ID,
  topicId: 'zahlen',
  title: 'Zahlenstrahl',
  description: 'Du liest Zahlen am Zahlenstrahl ab und trägst sie ein.',
  stufen: {
    1: 'Zahlenstrahl mit Schritten von 1000 ablesen und eintragen',
    2: 'Ausschnitte mit unbeschrifteten Zwischenstrichen',
    3: 'Schätzen bis 1 000 000 und die Mitte finden',
  },
  kmk: KMK,
  generate,
};
