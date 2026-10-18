import { APPROX, BOX, fmt } from '../../core/format';
import type { Exercise, PlaceColumn, Rng, SkillDef, Stufe, Visual } from '../../core/types';
import { biggerCol, bugList, choiceAnswer, columnsFor, digitAt, floorTo, PLACE_NAME, PV, randomDigits, roundTo, smallerCol, stelle, type WrongOption } from './shared';

const ID = 'zahlen.runden';
const KMK = ['ZO.runden'];

function base(stufe: Stufe, ab: 1 | 2 | 3, key: string) {
  return { key: `${ID}:${stufe}:${key}`, topicId: 'zahlen' as const, skillId: ID, stufe, ab, kmk: KMK };
}

/** Zahlenstrahl between the two rounding candidates with n marked. */
export function segment(lo: number, p: number, mark: number, label: string): Visual {
  return {
    type: 'numberLine',
    min: lo,
    max: lo + p,
    majorStep: p / 2,
    minorStep: p / 10,
    labelMajor: true,
    marks: [{ value: mark, label }],
  };
}

const CONTEXTS = [
  { text: (n: string) => `Beim Fußballspiel sind ${n} Zuschauer im Stadion.`, emoji: '⚽' },
  { text: (n: string) => `Die Stadtbücherei hat ${n} Bücher.`, emoji: '📚' },
  { text: (n: string) => `Beim Stadtlauf laufen ${n} Menschen mit.`, emoji: '🏃' },
  { text: (n: string) => `Im Zoo waren dieses Jahr ${n} Besucher.`, emoji: '🦒' },
];

/** Stellenwerttafel of n with the decisive column (right of the rounding place) highlighted. */
export function decisiveDigit(n: number, decisive: PlaceColumn): Visual {
  const columns = columnsFor(n);
  return { type: 'placeValue', columns, rows: [{ values: columns.map((c) => digitAt(n, c)) }], mode: 'digits', highlight: decisive };
}

export function runden(n: number, c: PlaceColumn, stufe: Stufe, contextIndex: number | null = null): Exercise {
  const p = PV[c];
  const lo = floorTo(n, p);
  const hi = lo + p;
  const r = roundTo(n, p);
  const right = smallerCol(c) as PlaceColumn;
  const d = digitAt(n, right);
  const up = r === hi;
  const carry = up && digitAt(n, c) === 9;
  const small = smallerCol(c);
  const big = biggerCol(c);
  const ctx = contextIndex === null ? null : CONTEXTS[contextIndex];
  return {
    ...base(stufe, stufe === 1 ? 1 : 2, `${n}:${c}${ctx ? `:${contextIndex}` : ''}`),
    ...(ctx ? { context: `${ctx.text(fmt(n))} Die Zeitung rundet auf ${PLACE_NAME[c]}.`, emoji: ctx.emoji, kmk: [...KMK, 'ZO.sachrechnen'] } : {}),
    prompt: ctx ? 'Welche Zahl schreibt die Zeitung?' : `Runde auf ${PLACE_NAME[c]}.`,
    expression: `${fmt(n)} ${APPROX} ${BOX}`,
    ...(stufe === 1 ? { visual: segment(lo, p, n, fmt(n)) } : {}),
    answer: { kind: 'number', value: r, label: 'Gerundete Zahl' },
    hints: [
      `Schau auf die Ziffer rechts neben der ${stelle(c)}.`,
      'Bei 0, 1, 2, 3 oder 4 rundest du ab. Bei 5, 6, 7, 8 oder 9 rundest du auf.',
      `Alle Stellen rechts von der ${stelle(c)} werden zu 0.`,
    ],
    steps: [
      `Runde auf ${PLACE_NAME[c]}: Schau auf die ${stelle(right)}.`,
      { text: `Dort steht eine ${d}. Also rundest du ${up ? 'auf' : 'ab'}.`, visual: decisiveDigit(n, right) },
      ...(carry ? [`An der ${stelle(c)} steht schon eine 9. Beim Aufrunden entsteht ein Übertrag nach links.`] : []),
      { text: `${fmt(n)} liegt zwischen ${fmt(lo)} und ${fmt(hi)}.`, visual: segment(lo, p, n, fmt(n)) },
      `Also: ${fmt(n)} ${APPROX} ${fmt(r)}.`,
    ],
    bugs: bugList(r, [
      ['abgerundet', up ? lo : null, `Die Ziffer rechts neben der ${stelle(c)} ist eine ${d}. Bei 5 bis 9 rundest du auf. Nur abschneiden reicht nicht.`],
      ['aufgerundet', up ? null : hi, `Die Ziffer rechts neben der ${stelle(c)} ist eine ${d}. Bei 0 bis 4 rundest du ab.`],
      ['unveraendert', n, `Beim Runden werden alle Stellen rechts von der ${stelle(c)} zu 0.`],
      ['falsche-stelle-klein', small && small !== 'E' ? roundTo(n, PV[small]) : null, `Du hast auf ${small ? PLACE_NAME[small] : ''} gerundet. Gesucht: auf ${PLACE_NAME[c]}.`],
      ['falsche-stelle-gross', big && big !== 'M' && roundTo(n, PV[big]) > 0 ? roundTo(n, PV[big]) : null, `Du hast auf ${big ? PLACE_NAME[big] : ''} gerundet. Gesucht: auf ${PLACE_NAME[c]}.`],
      ['nicht-genullt', up ? hi + (n - lo) : null, `Beim Runden werden alle Stellen rechts von der ${stelle(c)} zu 0.`],
    ]),
    praise: carry ? 'Du hast beim Aufrunden an den Übertrag gedacht.' : `Du hast auf die ${stelle(right)} geschaut und richtig ${up ? 'auf' : 'ab'}gerundet.`,
    srText: ctx ? `${ctx.text(String(n))} Die Zeitung rundet auf ${PLACE_NAME[c]}. Welche Zahl schreibt die Zeitung?` : `Runde ${n} auf ${PLACE_NAME[c]}.`,
  };
}

// ─── Stufe 3: reverse questions ──────────────────────────────────────────────

export function grenze(t: number, c: PlaceColumn, want: 'kleinste' | 'groesste'): Exercise {
  const p = PV[c];
  const value = want === 'kleinste' ? t - p / 2 : t + p / 2 - 1;
  const lineLo = t - p;
  return {
    ...base(3, 3, `${want}:${t}:${c}`),
    prompt: `Wie heißt die ${want === 'kleinste' ? 'kleinste' : 'größte'} Zahl, die auf ${PLACE_NAME[c]} gerundet ${fmt(t)} ergibt?`,
    answer: { kind: 'number', value, label: `${want === 'kleinste' ? 'Kleinste' : 'Größte'} Zahl` },
    hints: [
      want === 'kleinste' ? `Welche Zahlen werden zu ${fmt(t)} aufgerundet?` : `Welche Zahlen werden zu ${fmt(t)} abgerundet?`,
      `Die Grenze liegt genau in der Mitte zwischen zwei ${PLACE_NAME[c]}n. Bei 5 wird aufgerundet.`,
    ],
    steps: [
      want === 'kleinste'
        ? `Zahlen ab der Mitte zwischen ${fmt(t - p)} und ${fmt(t)} werden zu ${fmt(t)} aufgerundet.`
        : `Zahlen unter der Mitte zwischen ${fmt(t)} und ${fmt(t + p)} werden zu ${fmt(t)} abgerundet.`,
      { text: `Die Mitte ist ${fmt(want === 'kleinste' ? t - p / 2 : t + p / 2)}.`, visual: { type: 'numberLine', min: lineLo, max: t + p, majorStep: p / 2, minorStep: p / 10, labelMajor: true } },
      want === 'kleinste' ? `Die Mitte selbst wird aufgerundet. Also ist ${fmt(value)} die kleinste Zahl.` : `Die Mitte wird schon aufgerundet. Also ist ${fmt(value)} die größte Zahl.`,
    ],
    bugs: bugList(value, want === 'kleinste'
      ? [
          ['zu-gross', t - p / 2 + 1, `Probiere eine Zahl, die noch 1 kleiner ist. Auch sie wird zu ${fmt(t)} gerundet.`],
          ['abgerundet', t - p / 2 - 1, 'Diese Zahl wird abgerundet. Bei 0 bis 4 rundest du ab.'],
          ['ziel', t, `Auch kleinere Zahlen werden zu ${fmt(t)} aufgerundet.`],
        ]
      : [
          ['mitte', t + p / 2, `Bei einer 5 rundest du auf. Diese Zahl wird zu ${fmt(t + p)}.`],
          ['abgeschnitten', t + p - 1, `Diese Zahl wird aufgerundet zu ${fmt(t + p)}. Nur abschneiden ist nicht runden.`],
          ['ziel', t, `Auch größere Zahlen werden zu ${fmt(t)} abgerundet.`],
        ]),
    praise: 'Du hast die Grenze beim Runden genau bestimmt.',
    srText: `Wie heißt die ${want === 'kleinste' ? 'kleinste' : 'größte'} Zahl, die auf ${PLACE_NAME[c]} gerundet ${t} ergibt?`,
    knobel: true,
  };
}

export function welcheZahl(rng: Rng, t: number, c: PlaceColumn): Exercise {
  const p = PV[c];
  const step = p / 10;
  const pick = (from: number, to: number) => from + rng.int(0, (to - from) / step) * step + (step >= 10 ? rng.int(1, step - 1) : 0);
  let ok = pick(t - p / 2, t + p / 2 - step);
  if (ok === t) ok += step;
  const upX = pick(t + p / 2, t + p - step);
  const downX = pick(t - p, t - p / 2 - step);
  const wrong: WrongOption[] = [upX, downX, t + p / 2]
    .filter((x) => x > 0 && roundTo(x, p) !== t)
    .map((x) => ({ label: fmt(x), whyWrong: `${fmt(x)} wird auf ${fmt(roundTo(x, p))} gerundet.${x === t + p / 2 ? ' Bei einer 5 rundest du auf.' : ''}` }));
  return {
    ...base(3, 3, `welche:${t}:${c}:${ok}:${upX}:${downX}`),
    prompt: `Welche Zahl ergibt auf ${PLACE_NAME[c]} gerundet ${fmt(t)}?`,
    answer: choiceAnswer(rng, fmt(ok), wrong),
    hints: [`Runde jede Zahl auf ${PLACE_NAME[c]}.`, `Schau jeweils auf die ${stelle(smallerCol(c) as PlaceColumn)}.`],
    steps: [`Auf ${PLACE_NAME[c]} gerundet ergibt ${fmt(t)} jede Zahl von ${fmt(t - p / 2)} bis ${fmt(t + p / 2 - 1)}.`, `${fmt(ok)} liegt in diesem Bereich.`, `${fmt(ok)} ${APPROX} ${fmt(t)}`],
    praise: 'Du hast jede Zahl geprüft und die richtige gefunden.',
    srText: `Welche Zahl ergibt auf ${PLACE_NAME[c]} gerundet ${t}?`,
    knobel: true,
  };
}

export function welcheStelle(rng: Rng, n: number, c: PlaceColumn, candidates: PlaceColumn[]): Exercise {
  const r = roundTo(n, PV[c]);
  const wrong = candidates
    .filter((k) => k !== c)
    .map((k) => ({ label: `auf ${PLACE_NAME[k]}`, whyWrong: `Auf ${PLACE_NAME[k]} gerundet ergibt ${fmt(roundTo(n, PV[k]))}.` }));
  return {
    ...base(3, 2, `stelle:${n}:${c}`),
    prompt: 'Auf welche Stelle wurde gerundet?',
    expression: `${fmt(n)} ${APPROX} ${fmt(r)}`,
    answer: choiceAnswer(rng, `auf ${PLACE_NAME[c]}`, wrong),
    hints: ['Schau, ab welcher Stelle nur noch Nullen stehen.', 'Prüfe deine Wahl: Runde selbst und vergleiche.'],
    steps: [`Ab der ${stelle(smallerCol(c) as PlaceColumn)} stehen nur Nullen.`, `${fmt(n)} auf ${PLACE_NAME[c]} gerundet ergibt ${fmt(r)}.`, `Es wurde auf ${PLACE_NAME[c]} gerundet.`],
    praise: 'Du hast an den Nullen erkannt, auf welche Stelle gerundet wurde.',
    srText: `${n} ist ungefähr ${r}. Auf welche Stelle wurde gerundet?`,
  };
}

// ─── Generator ───────────────────────────────────────────────────────────────

/** Number with `digits` digits that causes a carry when rounding to c (digit at c is 9, next digit ≥ 5). */
function carryNumber(rng: Rng, digits: number, c: PlaceColumn): number {
  const p = PV[c];
  const headDigits = digits - String(p).length;
  const head = headDigits > 0 ? randomDigits(rng, headDigits, 0) : 0;
  const tail = rng.int(5 * (p / 10), p - 1);
  return head * p * 10 + 9 * p + tail;
}

function generate(rng: Rng, stufe: Stufe): Exercise {
  if (stufe === 1 || stufe === 2) {
    const c = rng.pick((stufe === 1 ? ['H', 'T', 'H', 'T', 'Z'] : ['ZT', 'HT', 'ZT', 'HT', 'T']) as PlaceColumn[]);
    const digits = stufe === 1 ? rng.int(4, 5) : 6;
    let n = rng.chance(0.3) && String(PV[c]).length <= digits ? carryNumber(rng, digits, c) : randomDigits(rng, digits, rng.int(0, 2));
    if (n % PV[c] === 0) n += PV[c] / 2 + rng.int(0, 9);
    const contextIndex = stufe === 2 && rng.chance(0.15) ? rng.int(0, CONTEXTS.length - 1) : null;
    return runden(n, c, stufe, contextIndex);
  }
  const v = rng.pick(['kleinste', 'groesste', 'welche', 'stelle'] as const);
  if (v === 'stelle') {
    const cands: PlaceColumn[] = ['H', 'T', 'ZT', 'HT'];
    // all four roundings must differ from each other and from n, so exactly one place fits
    const fits = (x: number) => new Set([x, ...cands.map((k) => roundTo(x, PV[k]))]).size === cands.length + 1;
    let n = randomDigits(rng, 6, 0);
    for (let i = 0; i < 30 && !fits(n); i++) n = randomDigits(rng, 6, 0);
    if (fits(n)) return welcheStelle(rng, n, rng.pick(cands), cands);
  }
  const c = rng.pick(['H', 'T', 'ZT'] as PlaceColumn[]);
  const t = rng.int(2, c === 'ZT' ? 98 : c === 'T' ? 998 : 9_998) * PV[c];
  if (v === 'welche') return welcheZahl(rng, t, c);
  return grenze(t, c, v === 'groesste' ? 'groesste' : 'kleinste');
}

export const rundenSkill: SkillDef = {
  id: ID,
  topicId: 'zahlen',
  title: 'Runden',
  description: 'Du rundest große Zahlen auf Zehner, Hunderter, Tausender und mehr.',
  stufen: {
    1: 'Vier- und fünfstellige Zahlen auf Z, H oder T runden',
    2: 'Auf T, ZT und HT runden, auch mit Übertrag',
    3: 'Rückwärts denken: Welche Zahlen runden zu …?',
  },
  kmk: KMK,
  generate,
};
