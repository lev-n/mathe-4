import { BOX, TIMES, fmt, toSpeech } from '../../core/format';
import type { Exercise, Rng, SkillDef, Stufe, SubtractionMethod } from '../../core/types';
import { TOPIC, addColumnSteps, attempt, ueberschlagOk, randLen, uniqueBugs, weighted, writtenItem } from './common';
import { layoutMul, numLength, writtenVisual } from './layout';

const ID = 'schriftlich.multiplikation';
const KMK = ['ZO.schriftlich'];

/** Random number with `len` digits and exactly one inner zero (not the leading digit, not the Einer if `keepEiner`). */
export function withInnerZero(rng: Rng, len: number): number {
  const digits = String(randLen(rng, len)).split('').map(Number);
  const zeroAt = rng.int(1, len - 1);
  digits[zeroAt] = 0;
  return Number(digits.join(''));
}

/** Stufe 1: 2–4-digit number · one digit (3–9), at least one carry. */
export function stufe1Operands(rng: Rng): [number, number] {
  return attempt<[number, number]>(
    () => {
      const la = weighted(rng, [[2, 1], [3, 4], [4, 5]] as const);
      const a = la >= 3 && rng.chance(0.25) ? withInnerZero(rng, la) : randLen(rng, la);
      const m = rng.int(3, 9);
      return layoutMul(a, m).carryCount >= 1 ? [a, m] : null;
    },
    () => [4738, 6],
  );
}

/** Stufe 2: 2–4-digit number · two-digit number (also · 40), product ≤ 1 000 000. */
export function stufe2Operands(rng: Rng): [number, number] {
  return attempt<[number, number]>(
    () => {
      const la = weighted(rng, [[2, 1], [3, 4], [4, 4]] as const);
      const a = la >= 3 && rng.chance(0.2) ? withInnerZero(rng, la) : randLen(rng, la);
      const b = rng.chance(0.25) ? rng.int(2, 9) * 10 : rng.int(12, 99);
      if (b % 11 === 0 && rng.chance(0.7)) return null;
      return a * b <= 1_000_000 && ueberschlagOk('mul', [a, b]) ? [a, b] : null;
    },
    () => [1254, 37],
  );
}

/** Stufe 3: factors with zeros (4 050 · 36, 30 405 · 27, 7 008 · 40), product ≤ 1 000 000. */
export function stufe3Operands(rng: Rng): [number, number] {
  return attempt<[number, number]>(
    () => {
      const la = rng.int(4, 5);
      const zeros = rng.int(1, 2);
      const digits = String(randLen(rng, la)).split('').map(Number);
      for (const p of rng.sample(Array.from({ length: la - 1 }, (_, i) => i + 1), zeros)) digits[p] = 0;
      const a = Number(digits.join(''));
      const b = rng.chance(0.3) ? rng.int(2, 9) * 10 : rng.int(12, 99);
      if (a * b > 1_000_000 || a * b < 50_000 || !ueberschlagOk('mul', [a, b])) return null;
      return [a, b];
    },
    () => [4050, 36],
  );
}

/** NRW extra: three-digit second factor (624 · 315, 624 · 305), product ≤ 1 000 000. */
export function threeDigitOperands(rng: Rng, withZero: boolean): [number, number] {
  return attempt<[number, number]>(
    () => {
      const a = randLen(rng, rng.int(3, 4));
      const b = withZero ? (rng.chance(0.5) ? withInnerZero(rng, 3) : rng.int(11, 99) * 10) : randLen(rng, 3);
      if ((!withZero && String(b).includes('0')) || b % 100 === 0) return null;
      return a * b <= 1_000_000 && ueberschlagOk('mul', [a, b]) ? [a, b] : null;
    },
    () => (withZero ? [624, 305] : [624, 315]),
  );
}

/** Story contexts; `fits` keeps the numbers plausible (a cinema does not sell 9 876 tickets a day). */
const CONTEXTS: { emoji: string; fits: (a: number, b: number) => boolean; make: (a: string, b: string) => [string, string] }[] = [
  {
    emoji: '🔩',
    fits: () => true,
    make: (a, b) => [`In einer Kiste sind ${a} Schrauben. Im Lager stehen ${b} solche Kisten.`, 'Wie viele Schrauben sind es zusammen? Rechne schriftlich.'],
  },
  {
    emoji: '🎬',
    fits: (a, b) => a >= 100 && a <= 2000 && b <= 60,
    make: (a, b) => [`Ein Kino verkauft jeden Tag ${a} Karten.`, `Wie viele Karten sind es in ${b} Tagen? Rechne schriftlich.`],
  },
];

/** Knobel: use a known product (4 738 · 6 = 28 428) to find a neighbouring one. `method`: the class's subtraction method. */
export function useKnownProduct(rng: Rng, id: string, stufe: Stufe, threeDigit: boolean, method: SubtractionMethod): Exercise {
  const a = threeDigit ? randLen(rng, 3) : randLen(rng, rng.int(3, 4));
  const m = threeDigit ? rng.int(101, 998) : rng.int(3, 8);
  const kind = weighted(rng, [['plus1', 4], ['minus1', 3], ['double', threeDigit ? 0 : 2]] as const);
  const m2 = kind === 'plus1' ? m + 1 : kind === 'minus1' ? m - 1 : 2 * m;
  const known = a * m;
  const value = a * m2;
  const expression = `${fmt(a)} ${TIMES} ${fmt(m2)} = ${BOX}`;
  const given = `${fmt(a)} ${TIMES} ${fmt(m)} = ${fmt(known)}`;
  let steps: Exercise['steps'];
  let bugs: Exercise['bugs'];
  if (kind === 'plus1') {
    steps = [
      `${fmt(a)} ${TIMES} ${fmt(m2)} ist ${fmt(a)} mehr als ${fmt(a)} ${TIMES} ${fmt(m)}.`,
      ...addColumnSteps([known, a]),
      {
        text: `${fmt(known)} + ${fmt(a)} = ${fmt(value)}. Also ist ${fmt(a)} ${TIMES} ${fmt(m2)} = ${fmt(value)}.`,
        visual: writtenVisual({ type: 'written', op: 'add', operands: [known, a], showSolution: true }),
      },
    ];
    bugs = uniqueBugs(value, [
      { id: 'mul.plus-factor', match: known + m2, hint: `Bei ${TIMES} ${fmt(m2)} nimmst du ${fmt(a)} einmal mehr als bei ${TIMES} ${fmt(m)}.` },
      { id: 'mul.plus-one', match: known + 1, hint: `Bei ${TIMES} ${fmt(m2)} nimmst du ${fmt(a)} einmal mehr – nicht nur 1 mehr.` },
    ]);
  } else if (kind === 'minus1') {
    steps = [
      `${fmt(a)} ${TIMES} ${fmt(m2)} ist ${fmt(a)} weniger als ${fmt(a)} ${TIMES} ${fmt(m)}.`,
      {
        text: `${fmt(known)} − ${fmt(a)} = ${fmt(value)}. Also ist ${fmt(a)} ${TIMES} ${fmt(m2)} = ${fmt(value)}.`,
        visual: writtenVisual({ type: 'written', op: 'sub', operands: [known, a], method, showSolution: true }),
      },
    ];
    bugs = uniqueBugs(value, [
      { id: 'mul.minus-factor', match: known - m, hint: `Bei ${TIMES} ${fmt(m2)} nimmst du ${fmt(a)} einmal weniger als bei ${TIMES} ${fmt(m)}.` },
      { id: 'mul.wrong-direction', match: known + a, hint: `${fmt(m2)} ist weniger als ${fmt(m)}. Das Ergebnis wird also kleiner.` },
    ]);
  } else {
    steps = [
      `${fmt(m2)} ist das Doppelte von ${fmt(m)}. Also ist das Ergebnis doppelt so groß.`,
      {
        text: `${fmt(known)} + ${fmt(known)} = ${fmt(value)}. Also ist ${fmt(a)} ${TIMES} ${fmt(m2)} = ${fmt(value)}.`,
        visual: writtenVisual({ type: 'written', op: 'add', operands: [known, known], showSolution: true }),
      },
    ];
    bugs = uniqueBugs(value, [
      { id: 'mul.double-plus-a', match: known + a, hint: `${fmt(m2)} ist das Doppelte von ${fmt(m)}. Nimm das Ergebnis doppelt.` },
    ]);
  }
  return {
    key: `${id}:${stufe}:nutzen:${a}x${m}>${m2}`,
    topicId: TOPIC,
    skillId: id,
    stufe,
    ab: 3,
    context: `Es gilt: ${given}.`,
    prompt: 'Nutze diese Aufgabe. Wie viel ist das?',
    expression,
    answer: { kind: 'number', value, label: 'Ergebnis' },
    hints: [
      `Vergleiche ${fmt(m2)} mit ${fmt(m)}. Was ändert sich?`,
      kind === 'double'
        ? 'Wird ein Faktor verdoppelt, verdoppelt sich das Ergebnis.'
        : `Wie oft nimmst du ${fmt(a)} jetzt – einmal mehr oder einmal weniger?`,
    ],
    steps,
    bugs,
    praise: 'Du hast die bekannte Aufgabe geschickt genutzt.',
    srText: `Es gilt: ${toSpeech(given)}. Nutze diese Aufgabe: ${toSpeech(expression)}.`,
    kmk: ['ZO.schriftlich', 'ZO.strategien', 'MS.muster'],
    knobel: true,
  };
}

export const multiplikationSkill: SkillDef = {
  id: ID,
  topicId: 'schriftlich',
  title: 'Schriftlich multiplizieren',
  description: 'Du nimmst große Zahlen schriftlich mal – erst mit einer, dann mit zwei Ziffern.',
  stufen: {
    1: 'Mal eine einstellige Zahl, mit Übertrag',
    2: 'Mal eine zweistellige Zahl, mit Überschlag',
    3: 'Faktoren mit Nullen und Knobelaufgaben',
  },
  kmk: KMK,
  generate(rng, stufe, ctx) {
    const method = ctx.subtractionMethod;
    if (stufe === 1) {
      return writtenItem({ skillId: ID, stufe, ab: 1, op: 'mul', operands: stufe1Operands(rng), method, withUeberschlag: false, kmk: KMK, rng });
    }
    if (stufe === 2) {
      const operands = stufe2Operands(rng);
      let context: string | undefined;
      let prompt: string | undefined;
      let emoji: string | undefined;
      if (rng.chance(0.15)) {
        const tpl = rng.pick(CONTEXTS.filter((c) => c.fits(operands[0], operands[1])));
        [context, prompt] = tpl.make(fmt(operands[0]), fmt(operands[1]));
        emoji = tpl.emoji;
      }
      return writtenItem({ skillId: ID, stufe, ab: 2, op: 'mul', operands, method, withUeberschlag: true, kmk: [...KMK, 'ZO.runden'], rng, context, prompt, emoji });
    }
    // Stufe 3: × 3-digit only as NRW extra
    const variant = weighted(rng, [['nullen', 45], ['nutzen', 30], ['drei', ctx.nrwExtras ? 35 : 0]] as const);
    if (variant === 'nutzen') return useKnownProduct(rng, ID, stufe, false, method);
    const operands = variant === 'drei' ? threeDigitOperands(rng, rng.chance(0.4)) : stufe3Operands(rng);
    return writtenItem({
      skillId: ID,
      stufe,
      ab: 2,
      op: 'mul',
      operands,
      method,
      withUeberschlag: true,
      kmk: [...KMK, 'ZO.runden'],
      rng,
      prompt: numLength(operands[1]) === 3 ? 'Mach zuerst einen Überschlag. Rechne dann mit drei Teilprodukten.' : 'Mach zuerst einen Überschlag. Achte auf die Nullen.',
    });
  },
};
