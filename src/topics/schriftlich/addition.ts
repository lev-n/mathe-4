import { BOX, fmt, toSpeech } from '../../core/format';
import type { Exercise, GenContext, Rng, SkillDef, Stufe } from '../../core/types';
import { bugsFor } from './bugs';
import { TOPIC, attempt, ueberschlagOk, randLen, subColumnSteps, weighted, writtenItem } from './common';
import { layoutAdd, numLength, writtenVisual } from './layout';

const ID = 'schriftlich.addition';
const KMK = ['ZO.schriftlich'];

export function carryCount(ops: readonly number[]): number {
  return layoutAdd(ops).carries.filter((c) => c > 0).length;
}
export function maxCarry(ops: readonly number[]): number {
  return Math.max(...layoutAdd(ops).carries);
}

/** Stufe 1: two Summanden with 3–4 digits, at most one carry, no new place. */
export function stufe1Operands(rng: Rng): number[] {
  const want = rng.chance(0.8) ? 1 : 0;
  return attempt(
    () => {
      const la = rng.int(3, 4);
      const lb = rng.int(3, la);
      const ops = rng.chance(0.5) ? [randLen(rng, la), randLen(rng, lb)] : [randLen(rng, lb), randLen(rng, la)];
      if (numLength(ops[0] + ops[1]) > la) return null;
      return carryCount(ops) === want ? ops : null;
    },
    () => [3452, 1381],
  );
}

/** Stufe 2: 2–4 Summanden, the longest with 5–6 digits, at least two carries, sum ≤ 1 000 000. */
export function stufe2Operands(rng: Rng): number[] {
  const k = weighted(rng, [[2, 3], [3, 4], [4, 3]] as const);
  return attempt(
    () => {
      const lead = rng.int(5, 6);
      const lens = [lead];
      for (let i = 1; i < k; i++) lens.push(rng.int(k === 2 ? 4 : 3, lead));
      const ops = rng.shuffle(lens).map((l) => randLen(rng, l));
      if (ops.reduce((s, n) => s + n, 0) > 1_000_000 || !ueberschlagOk('add', ops)) return null;
      return carryCount(ops) >= 2 ? ops : null;
    },
    () => [45678, 23456, 8795].slice(0, k),
  );
}

/** Stufe 3 (written): 3–4 Summanden of different lengths, a carry of 2 or more, long carry chain. */
export function stufe3Operands(rng: Rng): number[] {
  const k = rng.int(3, 4);
  return attempt(
    () => {
      const lens = [6, rng.int(4, 6), rng.int(2, 5)];
      if (k === 4) lens.push(rng.int(2, 4));
      const ops = rng.shuffle(lens).map((l) => randLen(rng, l));
      if (ops.reduce((s, n) => s + n, 0) > 1_000_000 || !ueberschlagOk('add', ops)) return null;
      return maxCarry(ops) >= 2 && carryCount(ops) >= 4 ? ops : null;
    },
    () => [356789, 98765, 4589].concat(k === 4 ? [867] : []),
  );
}

/** Largest Summand : smallest Summand. */
const spread = (ops: readonly number[]) => Math.max(...ops) / Math.min(...ops);

/**
 * Story contexts by number of Summanden. `fits` keeps the numbers plausible: similar months, seasons or classes
 * have numbers of a similar size (no zoo month with 2 851 and the next with 59 928 visitors).
 */
const CONTEXTS: Record<number, { emoji: string; fits: (ops: readonly number[]) => boolean; make: (s: string[]) => [string, string] }[]> = {
  2: [
    {
      emoji: '🦒',
      fits: (ops) => spread(ops) <= 2 && Math.max(...ops) <= 400_000,
      make: ([a, b]) => [`Im Mai besuchten ${a} Menschen den Zoo. Im Juni waren es ${b}.`, 'Wie viele Besucher waren es zusammen? Rechne schriftlich.'],
    },
    {
      emoji: '🚲',
      fits: (ops) => spread(ops) <= 3,
      make: ([a, b]) => [`Ein Radweg wurde im Frühling ${a}-mal benutzt. Im Sommer ${b}-mal.`, 'Wie oft wurde er zusammen benutzt? Rechne schriftlich.'],
    },
  ],
  3: [
    {
      emoji: '♻️',
      fits: (ops) => spread(ops) <= 3 && Math.max(...ops) <= 100_000,
      make: ([a, b, c]) => [`Drei Schulen sammeln Kronkorken: ${a}, ${b} und ${c} Stück.`, 'Wie viele Kronkorken sind es zusammen? Rechne schriftlich.'],
    },
  ],
  4: [
    {
      emoji: '👟',
      fits: (ops) => spread(ops) <= 2 && Math.min(...ops) >= 50_000,
      make: ([a, b, c, d]) => [`Vier Klassen zählen eine Woche lang ihre Schritte: ${a}, ${b}, ${c} und ${d}.`, 'Wie viele Schritte sind es zusammen? Rechne schriftlich.'],
    },
  ],
};

/** Knobel: a + □ = s (Umkehraufgabe). */
function missingSummand(rng: Rng, stufe: Stufe, ctx: GenContext): Exercise {
  const [a, s] = attempt(
    () => {
      const s = rng.pick([100_000, 200_000, 250_000, 500_000, 600_000, 750_000, 800_000, 1_000_000, 50_000, 80_000]);
      const a = randLen(rng, numLength(s) - 1);
      if (a >= s || s - a < 1000) return null;
      return String(a).replace(/0/g, '').length >= 3 ? [a, s] : null;
    },
    () => [345_678, 600_000],
  );
  const x = s - a;
  const method = ctx.subtractionMethod;
  const expression = `${fmt(a)} + ${BOX} = ${fmt(s)}`;
  return {
    key: `${ID}:${stufe}:luecke:${a}+?=${s}`,
    topicId: TOPIC,
    skillId: ID,
    stufe,
    ab: 3,
    prompt: 'Welche Zahl fehlt? Rechne mit der Umkehraufgabe.',
    expression,
    answer: { kind: 'number', value: x, label: 'Fehlende Zahl' },
    hints: [
      'Die Umkehraufgabe zu plus ist eine Minusaufgabe.',
      `Rechne schriftlich: ${fmt(s)} minus ${fmt(a)}.`,
      method === 'abziehen'
        ? 'Bei den Nullen musst du mehrmals entbündeln. Geh Spalte für Spalte vor.'
        : 'Bei den Nullen musst du mehrmals erweitern und 1 merken. Geh Spalte für Spalte vor.',
    ],
    steps: [
      `Umkehraufgabe: ${fmt(s)} − ${fmt(a)} = ${BOX}.`,
      ...subColumnSteps(s, a, method),
      {
        text: `Die fehlende Zahl ist ${fmt(x)}. Probe: ${fmt(a)} + ${fmt(x)} = ${fmt(s)}.`,
        visual: writtenVisual({ type: 'written', op: 'sub', operands: [s, a], method, showSolution: true }),
      },
    ],
    bugs: bugsFor('sub', [s, a], method).map((b) =>
      b.id === 'sub.added' ? { ...b, hint: 'Die fehlende Zahl ist kleiner als das Ergebnis. Rechne minus.' } : b,
    ),
    praise: 'Du hast die Umkehraufgabe genutzt und bei den Nullen richtig gerechnet.',
    srText: `${toSpeech(expression)}. Welche Zahl fehlt?`,
    kmk: ['ZO.schriftlich', 'ZO.strategien'],
    knobel: true,
  };
}

/** Knobel: largest sum of two 3-digit numbers from six digit cards. */
function largestSum(rng: Rng, stufe: Stufe): Exercise {
  const digits = rng.sample([1, 2, 3, 4, 5, 6, 7, 8, 9], 6);
  const desc = digits.slice().sort((x, y) => y - x);
  const best = 100 * (desc[0] + desc[1]) + 10 * (desc[2] + desc[3]) + (desc[4] + desc[5]);
  const n1 = 100 * desc[0] + 10 * desc[2] + desc[4];
  const n2 = 100 * desc[1] + 10 * desc[3] + desc[5];
  const oneBig = 100 * desc[0] + 10 * desc[1] + desc[2] + (100 * desc[3] + 10 * desc[4] + desc[5]);
  const list = digits.join(', ');
  return {
    key: `${ID}:${stufe}:max:${desc.join('')}`,
    topicId: TOPIC,
    skillId: ID,
    stufe,
    ab: 3,
    context: `Du hast sechs Ziffernkarten: ${list}. Lege damit zwei dreistellige Zahlen.`,
    prompt: 'Die Summe soll so groß wie möglich sein. Wie groß ist sie?',
    emoji: '🃏',
    answer: { kind: 'number', value: best, label: 'Größte Summe' },
    hints: [
      'Welche Stelle ist am meisten wert?',
      'Die größten Ziffern gehören an die Hunderterstelle – bei beiden Zahlen.',
      'Dann kommen die nächsten zwei Ziffern an die Zehnerstelle.',
    ],
    steps: [
      `An die Hunderterstelle kommen die zwei größten Ziffern: ${desc[0]} und ${desc[1]}.`,
      `An die Zehnerstelle kommen ${desc[2]} und ${desc[3]}, an die Einerstelle ${desc[4]} und ${desc[5]}.`,
      {
        text: `Zum Beispiel: ${fmt(n1)} + ${fmt(n2)} = ${fmt(best)}. Die größte Summe ist ${fmt(best)}.`,
        visual: writtenVisual({ type: 'written', op: 'add', operands: [n1, n2], showSolution: true }),
      },
    ],
    bugs: oneBig !== best ? [{ id: 'add.one-big-number', match: oneBig, hint: 'Die zwei größten Ziffern gehören beide an die Hunderterstelle, nicht in eine Zahl.' }] : [],
    praise: 'Du hast die großen Ziffern an die wertvollste Stelle gelegt.',
    srText: `Ziffernkarten: ${list}. Bilde zwei dreistellige Zahlen mit der größten Summe. Wie groß ist die Summe?`,
    kmk: ['ZO.schriftlich', 'ZO.stellenwert', 'PK.problemloesen'],
    knobel: true,
  };
}

export const additionSkill: SkillDef = {
  id: ID,
  topicId: 'schriftlich',
  title: 'Schriftlich addieren',
  description: 'Du schreibst Zahlen stellengerecht untereinander und addierst mit Übertrag.',
  stufen: {
    1: 'Zwei Zahlen bis 9999, höchstens ein Übertrag',
    2: 'Zwei bis vier große Zahlen, viele Überträge, mit Überschlag',
    3: 'Lange Übertragsketten und Knobelaufgaben',
  },
  kmk: KMK,
  generate(rng, stufe, ctx) {
    if (stufe === 1) {
      return writtenItem({ skillId: ID, stufe, ab: 1, op: 'add', operands: stufe1Operands(rng), method: ctx.subtractionMethod, withUeberschlag: false, kmk: KMK, rng });
    }
    if (stufe === 2) {
      const operands = stufe2Operands(rng);
      let context: string | undefined;
      let prompt: string | undefined;
      let emoji: string | undefined;
      const fitting = CONTEXTS[operands.length].filter((c) => c.fits(operands));
      if (rng.chance(0.15) && fitting.length > 0) {
        const tpl = rng.pick(fitting);
        [context, prompt] = tpl.make(operands.map((n) => fmt(n)));
        emoji = tpl.emoji;
      }
      return writtenItem({ skillId: ID, stufe, ab: 2, op: 'add', operands, method: ctx.subtractionMethod, withUeberschlag: true, kmk: [...KMK, 'ZO.runden'], rng, context, prompt, emoji });
    }
    const variant = weighted(rng, [['kette', 6], ['luecke', 2], ['max', 2]] as const);
    if (variant === 'luecke') return missingSummand(rng, stufe, ctx);
    if (variant === 'max') return largestSum(rng, stufe);
    const operands = stufe3Operands(rng);
    return writtenItem({
      skillId: ID,
      stufe,
      ab: 2,
      op: 'add',
      operands,
      method: ctx.subtractionMethod,
      withUeberschlag: true,
      kmk: [...KMK, 'ZO.runden'],
      rng,
      prompt: 'Mach zuerst einen Überschlag. Achte beim Rechnen auf Überträge, die größer als 1 sind.',
    });
  },
};
