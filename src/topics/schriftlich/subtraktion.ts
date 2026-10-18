import { BOX, MINUS, fmt, toSpeech } from '../../core/format';
import type { Exercise, GenContext, Rng, SkillDef, Stufe, SubtractionMethod } from '../../core/types';
import { bugsFor } from './bugs';
import { TOPIC, addColumnSteps, attempt, uniqueBugs, fromDigits, randLen, subColumnSteps, ueberschlagOk, weighted, writtenItem } from './common';
import { layoutSub, writtenVisual } from './layout';

const ID = 'schriftlich.subtraktion';
const KMK = ['ZO.schriftlich'];

/** Random number with `len` digits; the given places (0 = Einer) are 0, all other digits 1–9. */
export function withZeros(rng: Rng, len: number, zeroPlaces: readonly number[]): number {
  const ds: number[] = [];
  for (let p = len - 1; p >= 0; p--) ds.push(zeroPlaces.includes(p) ? 0 : rng.int(1, 9));
  return fromDigits(ds);
}

/** Stufe 1: 3–4 digits, at most one Entbündeln/Erweitern, no zeros to cross. */
export function stufe1Operands(rng: Rng, method: SubtractionMethod): [number, number] {
  const want = rng.chance(0.8) ? 1 : 0;
  return attempt<[number, number]>(
    () => {
      const la = rng.int(3, 4);
      const lb = rng.int(3, la);
      const a = randLen(rng, la);
      const b = randLen(rng, lb);
      if (b >= a || a - b < 10) return null;
      const lay = layoutSub(a, b, method);
      return !lay.acrossZero && lay.regroupings === want ? [a, b] : null;
    },
    () => [752, 318],
  );
}

/** Stufe 2: 5–6 digits, 2–5 regroupings, mostly with zeros in the Minuend. */
export function stufe2Operands(rng: Rng, method: SubtractionMethod): [number, number] {
  const wantZero = rng.chance(0.7);
  return attempt<[number, number]>(
    () => {
      const la = rng.int(5, 6);
      const lb = rng.int(Math.max(3, la - 2), la);
      const zeros = wantZero ? rng.sample([0, 1, 2, 3, 4].filter((p) => p < la - 1), rng.int(1, 2)) : [];
      const a = wantZero ? withZeros(rng, la, zeros) : randLen(rng, la);
      const b = randLen(rng, lb);
      if (b >= a) return null;
      const lay = layoutSub(a, b, method);
      if (lay.regroupings < 2 || lay.regroupings > 5) return null;
      if (wantZero && !lay.acrossZero) return null;
      // the solution compares with the Überschlag, so it has to fit the result
      return ueberschlagOk('sub', [a, b]) ? [a, b] : null;
    },
    () => [80_405, 37_268],
  );
}

/** Stufe 3: Minuend with at least two zeros (100 000 − 43 572, 300 400 − 127 856), at least 3 regroupings. */
export function stufe3Operands(rng: Rng, method: SubtractionMethod): [number, number] {
  return attempt<[number, number]>(
    () => {
      const la = rng.int(5, 6);
      const z = rng.int(2, la - 1);
      const start = rng.int(0, la - 1 - z);
      const zeros = rng.chance(0.5)
        ? Array.from({ length: z }, (_, i) => start + i) // a block of zeros
        : rng.sample(Array.from({ length: la - 1 }, (_, p) => p), z);
      const a = withZeros(rng, la, zeros);
      const b = randLen(rng, rng.int(3, la));
      if (b >= a) return null;
      const lay = layoutSub(a, b, method);
      if (lay.regroupings < 3 || !lay.acrossZero) return null;
      return ueberschlagOk('sub', [a, b]) ? [a, b] : null;
    },
    () => [100_000, 43_572],
  );
}

/** Story contexts; `fits` keeps the numbers plausible for the situation (no stadium with 808 067 seats). */
const CONTEXTS: { emoji: string; fits: (a: number, b: number) => boolean; make: (a: string, b: string) => [string, string] }[] = [
  {
    emoji: '📚',
    // a big city library; at most half of the books are out at once
    fits: (a, b) => a <= 300_000 && b <= a / 2,
    make: (a, b) => [`Eine Bücherei hat ${a} Bücher. ${b} Bücher sind gerade ausgeliehen.`, 'Wie viele Bücher stehen im Regal? Rechne schriftlich.'],
  },
  {
    emoji: '🏟️',
    fits: (a) => a >= 10_000 && a <= 80_000,
    make: (a, b) => [`Ein Stadion hat ${a} Plätze. ${b} Karten sind schon verkauft.`, 'Wie viele Plätze sind noch frei? Rechne schriftlich.'],
  },
  {
    emoji: '🔩',
    fits: () => true,
    make: (a, b) => [`In einem Lager liegen ${a} Schrauben. ${b} Schrauben werden verschickt.`, 'Wie viele Schrauben bleiben im Lager? Rechne schriftlich.'],
  },
];

/** Knobel: a − □ = d or □ − b = d. */
function missingNumber(rng: Rng, stufe: Stufe, method: SubtractionMethod): Exercise {
  const missingMinuend = rng.chance(0.5);
  const [x, y] = attempt<[number, number]>(
    () => {
      const x = randLen(rng, rng.int(5, 6));
      const y = randLen(rng, rng.int(4, 5));
      if (y >= x || x + y > 1_000_000) return null;
      return [x, y];
    },
    () => [45_678, 2_345],
  );
  if (missingMinuend) {
    // □ − b = d  →  □ = d + b
    const b = y;
    const d = x;
    const value = d + b;
    const expression = `${BOX} ${MINUS} ${fmt(b)} = ${fmt(d)}`;
    const bugs = uniqueBugs(value, [
      { id: 'sub.inverse-minus', match: d - b, hint: `Die gesuchte Zahl ist größer als ${fmt(d)}. Rechne plus.` },
      ...bugsFor('add', [d, b]),
    ]);
    return {
      key: `${ID}:${stufe}:luecke:?-${b}=${d}`,
      topicId: TOPIC,
      skillId: ID,
      stufe,
      ab: 3,
      prompt: 'Welche Zahl fehlt? Rechne mit der Umkehraufgabe.',
      expression,
      answer: { kind: 'number', value, label: 'Fehlende Zahl' },
      hints: [
        'Von der gesuchten Zahl wird etwas abgezogen. Ist sie größer oder kleiner als das Ergebnis?',
        'Die Umkehraufgabe zu minus ist eine Plusaufgabe.',
        `Rechne schriftlich: ${fmt(d)} plus ${fmt(b)}.`,
      ],
      steps: [
        `Umkehraufgabe: ${fmt(d)} + ${fmt(b)} = ${BOX}.`,
        ...addColumnSteps([d, b]),
        {
          text: `Die fehlende Zahl ist ${fmt(value)}. Probe: ${fmt(value)} ${MINUS} ${fmt(b)} = ${fmt(d)}.`,
          visual: writtenVisual({ type: 'written', op: 'add', operands: [d, b], showSolution: true }),
        },
      ],
      bugs,
      praise: 'Du hast erkannt, dass du hier mit plus rechnen musst.',
      srText: `${toSpeech(expression)}. Welche Zahl fehlt?`,
      kmk: ['ZO.schriftlich', 'ZO.strategien'],
      knobel: true,
    };
  }
  // a − □ = d  →  □ = a − d
  const a = x;
  const d = y;
  const value = a - d;
  const expression = `${fmt(a)} ${MINUS} ${BOX} = ${fmt(d)}`;
  return {
    key: `${ID}:${stufe}:luecke:${a}-?=${d}`,
    topicId: TOPIC,
    skillId: ID,
    stufe,
    ab: 3,
    prompt: 'Welche Zahl fehlt? Überlege, wie du sie ausrechnen kannst.',
    expression,
    answer: { kind: 'number', value, label: 'Fehlende Zahl' },
    hints: [
      `Von ${fmt(a)} wird etwas weggenommen, und es bleibt ${fmt(d)}. Wie viel wurde weggenommen?`,
      `Rechne schriftlich: ${fmt(a)} minus ${fmt(d)}.`,
    ],
    steps: [
      `Gesucht ist, was von ${fmt(a)} weggenommen wird. Rechne ${fmt(a)} ${MINUS} ${fmt(d)}.`,
      ...subColumnSteps(a, d, method),
      {
        text: `Die fehlende Zahl ist ${fmt(value)}. Probe: ${fmt(a)} ${MINUS} ${fmt(value)} = ${fmt(d)}.`,
        visual: writtenVisual({ type: 'written', op: 'sub', operands: [a, d], method, showSolution: true }),
      },
    ],
    bugs: bugsFor('sub', [a, d], method).map((b) =>
      b.id === 'sub.added' ? { ...b, hint: `Die fehlende Zahl ist kleiner als ${fmt(a)}. Rechne minus.` } : b,
    ),
    praise: 'Du hast die passende Umkehraufgabe gefunden.',
    srText: `${toSpeech(expression)}. Welche Zahl fehlt?`,
    kmk: ['ZO.schriftlich', 'ZO.strategien'],
    knobel: true,
  };
}

/** Knobel: largest difference of two 3-digit numbers from six digit cards. */
function largestDifference(rng: Rng, stufe: Stufe, method: SubtractionMethod): Exercise {
  const digits = rng.sample([1, 2, 3, 4, 5, 6, 7, 8, 9], 6);
  const desc = digits.slice().sort((x, y) => y - x);
  const big = fromDigits(desc.slice(0, 3));
  const small = fromDigits(desc.slice(3).reverse());
  const value = big - small;
  const smallDesc = fromDigits(desc.slice(3));
  const list = digits.join(', ');
  return {
    key: `${ID}:${stufe}:max-diff:${desc.join('')}`,
    topicId: TOPIC,
    skillId: ID,
    stufe,
    ab: 3,
    context: `Du hast sechs Ziffernkarten: ${list}. Lege damit zwei dreistellige Zahlen.`,
    prompt: 'Der Unterschied soll so groß wie möglich sein. Wie groß ist er?',
    emoji: '🃏',
    answer: { kind: 'number', value, label: 'Größte Differenz' },
    hints: [
      'Die erste Zahl soll so groß wie möglich sein, die zweite so klein wie möglich.',
      'Für die kleinste Zahl kommt die kleinste Ziffer nach vorne.',
    ],
    steps: [
      `Die größte Zahl aus den drei größten Ziffern: ${fmt(big)}.`,
      `Die kleinste Zahl aus den übrigen Ziffern: ${fmt(small)}.`,
      {
        text: `${fmt(big)} ${MINUS} ${fmt(small)} = ${fmt(value)}. Der größte Unterschied ist ${fmt(value)}.`,
        visual: writtenVisual({ type: 'written', op: 'sub', operands: [big, small], method, showSolution: true }),
      },
    ],
    bugs: smallDesc !== small ? [{ id: 'sub.small-desc', match: big - smallDesc, hint: 'Die zweite Zahl soll so klein wie möglich sein. Welche Ziffer kommt dann nach vorne?' }] : [],
    praise: 'Du hast die größte und die kleinste Zahl geschickt gelegt.',
    srText: `Ziffernkarten: ${list}. Bilde zwei dreistellige Zahlen mit dem größten Unterschied. Wie groß ist er?`,
    kmk: ['ZO.schriftlich', 'ZO.stellenwert', 'PK.problemloesen'],
    knobel: true,
  };
}

export const subtraktionSkill: SkillDef = {
  id: ID,
  topicId: 'schriftlich',
  title: 'Schriftlich subtrahieren',
  description: 'Du ziehst stellengerecht ab – mit Entbündeln oder Ergänzen, so wie in deiner Klasse.',
  stufen: {
    1: 'Zahlen bis 9999, höchstens einmal entbündeln oder erweitern',
    2: 'Große Zahlen, Nullen im Minuend, mit Überschlag',
    3: 'Viele Nullen, fehlende Zahlen und Knobelaufgaben',
  },
  kmk: KMK,
  generate(rng, stufe, ctx: GenContext) {
    const method = ctx.subtractionMethod;
    if (stufe === 1) {
      return writtenItem({ skillId: ID, stufe, ab: 1, op: 'sub', operands: stufe1Operands(rng, method), method, withUeberschlag: false, kmk: KMK, rng });
    }
    if (stufe === 2) {
      const operands = stufe2Operands(rng, method);
      let context: string | undefined;
      let prompt: string | undefined;
      let emoji: string | undefined;
      if (rng.chance(0.15)) {
        const tpl = rng.pick(CONTEXTS.filter((c) => c.fits(operands[0], operands[1])));
        [context, prompt] = tpl.make(fmt(operands[0]), fmt(operands[1]));
        emoji = tpl.emoji;
      }
      return writtenItem({ skillId: ID, stufe, ab: 2, op: 'sub', operands, method, withUeberschlag: true, kmk: [...KMK, 'ZO.runden'], rng, context, prompt, emoji });
    }
    const variant = weighted(rng, [['nullen', 55], ['luecke', 25], ['max', 20]] as const);
    if (variant === 'luecke') return missingNumber(rng, stufe, method);
    if (variant === 'max') return largestDifference(rng, stufe, method);
    return writtenItem({
      skillId: ID,
      stufe,
      ab: 2,
      op: 'sub',
      operands: stufe3Operands(rng, method),
      method,
      withUeberschlag: true,
      kmk: [...KMK, 'ZO.runden'],
      rng,
      prompt: method === 'abziehen'
        ? 'Mach zuerst einen Überschlag. Achte beim Entbündeln auf die Nullen.'
        : 'Mach zuerst einen Überschlag. Achte beim Erweitern auf die Nullen.',
    });
  },
};
