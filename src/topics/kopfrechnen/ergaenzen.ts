import { BOX, fmt, PLUS } from '../../core/format';
import type { Exercise, PlaceColumn, Rng, SkillDef, Stufe } from '../../core/types';
import { bugList, choiceAnswer, COLUMNS, stelle, type WrongOption } from '../zahlen/shared';

const ID = 'kopfrechnen.ergaenzen';
const KMK = ['ZO.kopfrechnen', 'ZO.zahlraum'];

function base(stufe: Stufe, ab: 1 | 2 | 3, key: string) {
  return { key: `${ID}:${stufe}:${key}`, topicId: 'kopfrechnen' as const, skillId: ID, stufe, ab, kmk: KMK };
}

/** Every digit completed to 10 (a typical error): 370 → 730 for the target 1000. */
export function complementTo10(n: number, target: number): number {
  const width = String(target).length - 1;
  return Number(String(n).padStart(width, '0').split('').map((d) => (10 - Number(d)) % 10).join(''));
}

const trailingZeros = (n: number): number => String(n).match(/0+$/)?.[0].length ?? 0;

/**
 * Jumps to the next Stufenzahl: 370 → 400 → 1000; 99 999 → 100 000 → 1 000 000.
 * Each jump starts from the zeros of the number reached, so a round number jumps on in one go.
 */
export function jumps(n: number, target: number): [number, number][] {
  const out: [number, number][] = [];
  let cur = n;
  while (cur < target) {
    const p = 10 ** (trailingZeros(cur) + 1);
    const next = Math.min(target, (Math.floor(cur / p) + 1) * p);
    out.push([cur, next]);
    cur = next;
  }
  return out;
}

/** The last digit of n that is not 0: it is completed to 10, the digits before it to 9, the zeros after it stay 0. */
function lastNonZero(n: number): { digit: number; col: PlaceColumn; zeros: number } {
  const zeros = trailingZeros(n);
  return { digit: Math.floor(n / 10 ** zeros) % 10, col: COLUMNS[COLUMNS.length - 1 - zeros], zeros };
}

/** Bug hints for 'jede Ziffer zu 10' and 'alle Ziffern zu 9', phrased with the child's number (n > 0). */
export function zifferHints(n: number): { zu10: string; zu9: string } {
  const { digit, col, zeros } = lastNonZero(n);
  const nullen = zeros === 0 ? '' : zeros === 1 ? ' Die Null am Ende bleibt 0.' : ' Die Nullen am Ende bleiben 0.';
  return {
    zu10: `Du hast jede Ziffer zu 10 ergänzt. Nur die ${digit} an der ${stelle(col)} ergänzt du zu 10, die Ziffern davor zu 9.${nullen}`,
    zu9: `Fast! Prüfe die ${stelle(col)}: Die ${digit} ergänzt du zu 10, nicht zu 9.${nullen}`,
  };
}

const CONTEXTS = [
  { text: (n: string, t: string) => `Lena sammelt Punkte. Sie hat schon ${n} Punkte. Bei ${t} Punkten bekommt sie einen Preis.`, q: 'Wie viele Punkte fehlen noch?', unit: 'Punkte', emoji: '⭐' },
  { text: (n: string, t: string) => `Ein Verein will ${t} € sammeln. ${n} € sind schon da.`, q: 'Wie viel Geld fehlt noch?', unit: '€', emoji: '💶' },
  { text: (n: string, t: string) => `Die Schule will ${t} Seiten lesen. Die Kinder haben schon ${n} Seiten gelesen.`, q: 'Wie viele Seiten fehlen noch?', unit: 'Seiten', emoji: '📖' },
];

export function ergaenzen(n: number, target: number, stufe: Stufe, contextIndex: number | null = null): Exercise {
  const v = target - n;
  const js = jumps(n, target);
  const zh = zifferHints(n);
  const ctx = contextIndex === null ? null : CONTEXTS[contextIndex];
  const expr = `${fmt(n)} ${PLUS} ${BOX} = ${fmt(target)}`;
  return {
    ...base(stufe, stufe === 1 ? 1 : 2, `${n}:${target}${ctx ? `:${contextIndex}` : ''}`),
    ...(ctx ? { context: ctx.text(fmt(n), fmt(target)), emoji: ctx.emoji, kmk: [...KMK, 'ZO.sachrechnen'] } : {}),
    prompt: ctx ? ctx.q : `Ergänze bis ${fmt(target)}.`,
    expression: expr,
    answer: { kind: 'number', value: v, label: 'Ergänzung', ...(ctx ? { unit: ctx.unit } : {}) },
    hints: ['Ergänze in Schritten: erst bis zur nächsten glatten Zahl, dann weiter.', `Zähle die Schritte bis ${fmt(target)} zusammen.`],
    steps: [
      ...js.map(([a, b]) => `${fmt(a)} ${PLUS} ${fmt(b - a)} = ${fmt(b)}`),
      ...(js.length > 1 ? [`Zusammen: ${js.map(([a, b]) => fmt(b - a)).join(` ${PLUS} `)} = ${fmt(v)}`] : []),
      `Also: ${fmt(n)} ${PLUS} ${fmt(v)} = ${fmt(target)}`,
    ],
    bugs: bugList(v, [
      ['jede-ziffer-zu-10', complementTo10(n, target), zh.zu10],
      // target − 1 − n: every digit completed to 9
      ['eins-zu-wenig', v - 1, zh.zu9],
      ['eins-zu-viel', v + 1, 'Fast! Prüfe mit der Probe: Rechne deine Zahl plus die Zahl aus der Aufgabe.'],
    ]),
    praise: 'Du hast in Schritten bis zur Stufenzahl ergänzt.',
    srText: ctx ? `${ctx.text(String(n), String(target))} ${ctx.q}` : `${n} plus wie viel ist ${target}?`,
  };
}

/** Which two numbers add up to target? */
export function paarWaehlen(rng: Rng, a: number, target: number): Exercise {
  const b = target - a;
  const c10 = complementTo10(a, target);
  const wrong: WrongOption[] = [c10, b - 1, b + 10, b - 1000]
    .filter((x) => x > 0 && x !== b)
    .map((x) => ({ label: `${fmt(a)} und ${fmt(x)}`, whyWrong: `${fmt(a)} ${PLUS} ${fmt(x)} = ${fmt(a + x)}, nicht ${fmt(target)}.` }));
  return {
    ...base(3, 3, `paar:${a}:${target}`),
    prompt: `Welche zwei Zahlen ergeben zusammen ${fmt(target)}?`,
    answer: choiceAnswer(rng, `${fmt(a)} und ${fmt(b)}`, wrong),
    hints: ['Prüfe jedes Paar mit einer Plusaufgabe.', 'Schau zuerst auf die letzten Ziffern: Passen sie zusammen?'],
    steps: [`${fmt(a)} ${PLUS} ${fmt(b)} = ${fmt(target)}`, `Also passen ${fmt(a)} und ${fmt(b)}.`],
    praise: 'Du hast die Paare geprüft und die richtige Ergänzung gefunden.',
    srText: `Welche zwei Zahlen ergeben zusammen ${target}?`,
    knobel: true,
  };
}

/** How much from n to the next multiple of p? */
export function naechsteStufe(n: number, p: number): Exercise {
  const target = (Math.floor(n / p) + 1) * p;
  const v = target - n;
  const js = jumps(n, target);
  const zh = zifferHints(n % p);
  return {
    ...base(3, 2, `naechste:${n}:${p}`),
    prompt: `Wie viel fehlt von ${fmt(n)} bis ${fmt(target)}?`,
    expression: `${fmt(n)} ${PLUS} ${BOX} = ${fmt(target)}`,
    answer: { kind: 'number', value: v, label: 'Ergänzung' },
    hints: ['Ergänze in Schritten bis zur nächsten glatten Zahl.', 'Zähle die Schritte zusammen.'],
    steps: [...js.map(([a, b]) => `${fmt(a)} ${PLUS} ${fmt(b - a)} = ${fmt(b)}`), `Zusammen: ${fmt(v)}`],
    bugs: bugList(v, [
      ['jede-ziffer-zu-10', complementTo10(n % p, p), zh.zu10],
      ['eins-zu-wenig', v - 1, zh.zu9],
    ]),
    praise: 'Du hast geschickt bis zur nächsten glatten Zahl ergänzt.',
    srText: `Wie viel fehlt von ${n} bis ${target}?`,
    knobel: true,
  };
}

// ─── Generator ───────────────────────────────────────────────────────────────

function generate(rng: Rng, stufe: Stufe): Exercise {
  if (stufe === 1) {
    if (rng.chance(0.5)) {
      let n = rng.int(11, 99) * 10;
      if (n % 100 === 0) n += 10 * rng.int(1, 9);
      return ergaenzen(n, 1000, 1);
    }
    let n = rng.int(11, 99) * 100;
    if (n % 1000 === 0) n += 100 * rng.int(1, 9);
    return ergaenzen(n, 10_000, 1);
  }
  if (stufe === 2) {
    const target = rng.pick([100_000, 1_000_000]);
    const unit = target === 100_000 ? rng.pick([10, 100]) : rng.pick([100, 1000]);
    let n = rng.int(Math.ceil(target / 10 / unit), Math.floor((target - unit) / unit)) * unit;
    if (n % (unit * 10) === 0) n += unit * rng.int(1, 9);
    if (n >= target) n = target - unit * rng.int(1, 9);
    const contextIndex = rng.chance(0.15) ? rng.int(0, CONTEXTS.length - 1) : null;
    return ergaenzen(n, target, 2, contextIndex);
  }
  const v = rng.pick(['paar', 'naechste', 'naechste', 'krumm'] as const);
  if (v === 'paar') {
    const target = rng.pick([1000, 10_000, 100_000, 1_000_000]);
    const unit = target / 1000;
    let a = rng.int(101, 899) * unit;
    if (a % (10 * unit) === 0) a += unit;
    return paarWaehlen(rng, a, target);
  }
  if (v === 'naechste') {
    const p = rng.pick([10_000, 100_000]);
    let n = rng.int(100_000, 989_999);
    if (n % p === 0) n += 7;
    return naechsteStufe(n, p);
  }
  // 'krumme' Zahlen close to the target or full of nines: 99 999 + □ = 1 000 000
  const target = rng.pick([1000, 10_000, 100_000, 1_000_000]);
  const n = rng.chance(0.5) ? target - rng.int(2, 99) : target / 10 - 1 + (rng.chance(0.5) ? 0 : rng.int(1, 8) * (target / 10));
  return ergaenzen(n, target, 3);
}

export const ergaenzenSkill: SkillDef = {
  id: ID,
  topicId: 'kopfrechnen',
  title: 'Ergänzen',
  description: 'Du ergänzt bis 1000, 10 000, 100 000 und 1 000 000.',
  stufen: {
    1: 'Ergänzen bis 1000 und 10 000',
    2: 'Ergänzen bis 100 000 und 1 000 000',
    3: 'Passende Paare, krumme Zahlen und nächste Stufenzahl',
  },
  kmk: KMK,
  generate,
};
