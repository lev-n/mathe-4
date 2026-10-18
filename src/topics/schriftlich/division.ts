import { DIV, fmt, toSpeech } from '../../core/format';
import type { Exercise, Rng, SkillDef, Stufe } from '../../core/types';
import { TOPIC, attempt, divSteps, fromDigits, randLen, uniqueBugs, weighted, writtenItem } from './common';
import { layoutDiv, numLength, writtenVisual } from './layout';

const ID = 'schriftlich.division';
const KMK = ['ZO.division'];

/** Random quotient with `len` digits; `zeroPlaces` (0 = Einer) are 0, the other digits 1–9. */
function quotientWith(rng: Rng, len: number, zeroPlaces: readonly number[]): number {
  const ds: number[] = [];
  for (let p = len - 1; p >= 0; p--) ds.push(zeroPlaces.includes(p) ? 0 : rng.int(1, 9));
  return fromDigits(ds);
}

/** Stufe 1: 3–4-digit Dividend, divisor 2–9, no Rest, no zero in the quotient. */
export function stufe1Operands(rng: Rng): [number, number] {
  return attempt<[number, number]>(
    () => {
      const d = rng.int(2, 9);
      const q = quotientWith(rng, rng.int(2, 4), []);
      const a = q * d;
      const len = numLength(a);
      return len >= 3 && len <= 4 ? [a, d] : null;
    },
    () => [5432, 4],
  );
}

/** Stufe 2: 4–6-digit Dividend, divisor 2–9 (rarely 10), zeros in the quotient and/or a Rest. */
export function stufe2Operands(rng: Rng): [number, number] {
  const wantZero = rng.chance(0.55);
  const wantRest = !wantZero || rng.chance(0.5);
  return attempt<[number, number]>(
    () => {
      const d = rng.chance(0.08) ? 10 : rng.int(2, 9);
      const qLen = rng.int(3, 5);
      const zeros = wantZero ? rng.sample(Array.from({ length: qLen - 1 }, (_, p) => p), 1) : [];
      const q = quotientWith(rng, qLen, zeros);
      const r = wantRest ? rng.int(1, d - 1) : 0;
      const a = q * d + r;
      const len = numLength(a);
      if (len < 4 || len > 6) return null;
      const lay = layoutDiv(a, d);
      return (lay.quotientZeros > 0) === wantZero ? [a, d] : null;
    },
    () => [4230, 6],
  );
}

/** Stufe 3: 5–6-digit Dividend, two zeros in the quotient, or a zero plus Rest plus a small first digit. */
export function stufe3Operands(rng: Rng): [number, number] {
  return attempt<[number, number]>(
    () => {
      const d = rng.chance(0.1) ? 10 : rng.int(3, 9);
      const qLen = rng.int(4, 5);
      const twoZeros = rng.chance(0.5);
      const zeros = rng.sample(Array.from({ length: qLen - 1 }, (_, p) => p), twoZeros ? 2 : 1);
      const q = quotientWith(rng, qLen, zeros);
      const r = rng.int(twoZeros ? 0 : 1, d - 1);
      const a = q * d + r;
      const len = numLength(a);
      if (len < 5 || len > 6) return null;
      const lay = layoutDiv(a, d);
      if (twoZeros) return lay.quotientZeros >= 2 ? [a, d] : null;
      return lay.quotientZeros >= 1 && lay.remainder > 0 && lay.firstTwoDigits ? [a, d] : null;
    },
    () => [240_305, 6],
  );
}

/** Story contexts; `fits` keeps the numbers plausible (no Kiste with 90 331 apples). */
const CONTEXTS: { emoji: string; fits: (a: number, d: number) => boolean; make: (a: string, d: number) => [string, string] }[] = [
  {
    emoji: '✏️',
    fits: () => true,
    make: (a, d) => [`Eine Fabrik stellt ${a} Stifte her. Sie werden in Packungen zu ${d} Stück verpackt.`, 'Wie viele volle Packungen gibt es? Wie viele Stifte bleiben übrig?'],
  },
  {
    emoji: '🍎',
    fits: (a, d) => a / d <= 200,
    make: (a, d) => [`${a} Äpfel werden gerecht auf ${d} Kisten verteilt.`, 'Wie viele Äpfel kommen in jede Kiste? Wie viele bleiben übrig?'],
  },
];

/** Knobel: how much must be added so the division leaves no Rest? */
function addToFit(rng: Rng, stufe: Stufe): Exercise {
  const [a, d] = attempt<[number, number]>(
    () => {
      const d = rng.int(3, 9);
      const a = randLen(rng, rng.int(4, 5));
      return a % d !== 0 ? [a, d] : null;
    },
    () => [5435, 4],
  );
  const r = a % d;
  const value = d - r;
  const q = Math.floor(a / d);
  return {
    key: `${ID}:${stufe}:aufgehen:${a}/${d}`,
    topicId: TOPIC,
    skillId: ID,
    stufe,
    ab: 3,
    context: `Bei ${fmt(a)} ${DIV} ${d} bleibt ein Rest.`,
    prompt: `Wie viel musst du mindestens zu ${fmt(a)} dazuzählen, damit kein Rest bleibt?`,
    expression: `${fmt(a)} ${DIV} ${d}`,
    answer: { kind: 'number', value, label: 'So viel dazu' },
    hints: [
      `Teile zuerst ${fmt(a)} durch ${d}. Wie groß ist der Rest?`,
      `Bis zur nächsten Zahl, die durch ${d} teilbar ist, fehlt noch etwas. Der Rest ist schon da.`,
    ],
    steps: [
      ...divSteps(a, d),
      `${fmt(a)} ${DIV} ${d} = ${fmt(q)} R ${r}. Vom Rest ${r} bis ${d} ${value === 1 ? 'fehlt' : 'fehlen'} noch ${value}.`,
      {
        text: `Du musst mindestens ${value} dazuzählen: ${fmt(a + value)} ${DIV} ${d} = ${fmt(q + 1)}.`,
        visual: writtenVisual({ type: 'written', op: 'div', operands: [a + value, d], showSolution: true }),
      },
    ],
    bugs: uniqueBugs(value, [
      { id: 'div.rest-instead', match: r, hint: `${r} ist der Rest. Du sollst so viel dazutun, bis wieder ${d} voll sind.` },
      { id: 'div.divisor', match: d, hint: `Fast! Prüfe den Rest von ${fmt(a)} ${DIV} ${d}. Dann brauchst du weniger.` },
    ]),
    praise: 'Du hast den Rest bestimmt und clever ergänzt.',
    srText: `Bei ${toSpeech(`${fmt(a)} ${DIV} ${d}`)} bleibt ein Rest. Wie viel musst du mindestens zu ${toSpeech(fmt(a))} dazuzählen, damit kein Rest bleibt?`,
    kmk: ['ZO.division', 'PK.problemloesen'],
    knobel: true,
  };
}

/** Knobel: interpret the Rest (round up). Numbers fit the story: egg boxes hold 6 or 10, a school trip has ≤ 400 children. */
function roundUpRest(rng: Rng, stufe: Stufe): Exercise {
  const eggs = rng.chance(0.5);
  const [a, d] = attempt<[number, number]>(
    () => {
      const d = eggs ? rng.pick([6, 10]) : rng.int(4, 9);
      const a = eggs ? randLen(rng, rng.int(3, 4)) : rng.int(100, 400);
      return a % d !== 0 ? [a, d] : null;
    },
    () => (eggs ? [1358, 6] : [358, 6]),
  );
  const q = Math.floor(a / d);
  const r = a % d;
  const story = eggs
    ? {
      id: 'eier', emoji: '🥚', context: `${fmt(a)} Eier sollen in Schachteln. In eine Schachtel passen ${d} Eier.`,
      prompt: 'Wie viele Schachteln braucht man mindestens?', what: 'Eier',
      rest: r === 1 ? 'Das übrige Ei braucht auch eine Schachtel.' : `Die ${r} übrigen Eier brauchen auch eine Schachtel.`,
    }
    : {
      id: 'boote', emoji: '🚣', context: `${fmt(a)} Kinder einer Schule machen einen Bootsausflug. In ein Boot passen ${d} Kinder.`,
      prompt: 'Wie viele Boote braucht man mindestens?', what: 'Kinder',
      rest: r === 1 ? 'Das übrige Kind braucht auch ein Boot.' : `Die ${r} übrigen Kinder brauchen auch ein Boot.`,
    };
  return {
    key: `${ID}:${stufe}:aufrunden:${a}/${d}:${story.id}`,
    topicId: TOPIC,
    skillId: ID,
    stufe,
    ab: 3,
    context: story.context,
    prompt: story.prompt,
    emoji: story.emoji,
    answer: { kind: 'number', value: q + 1, label: 'Anzahl' },
    hints: [`Rechne ${fmt(a)} ${DIV} ${d}.`, `Es bleibt ein Rest. Wohin kommen die übrigen ${story.what}?`],
    steps: [
      ...divSteps(a, d),
      `${fmt(a)} ${DIV} ${d} = ${fmt(q)} R ${r}.`,
      story.rest,
      `Man braucht ${fmt(q)} + 1 = ${fmt(q + 1)}.`,
    ],
    bugs: [{ id: 'div.rest-ignored', match: q, hint: `Denk an den Rest: Die übrigen ${story.what} brauchen auch Platz.` }],
    praise: 'Du hast den Rest sinnvoll gedeutet.',
    srText: `${toSpeech(story.context)} ${story.prompt}`,
    kmk: ['ZO.division', 'ZO.sachrechnen', 'PK.modellieren'],
    knobel: true,
  };
}

export const divisionSkill: SkillDef = {
  id: ID,
  topicId: 'schriftlich',
  title: 'Schriftlich dividieren',
  description: 'Du teilst große Zahlen Schritt für Schritt durch einstellige Zahlen.',
  stufen: {
    1: 'Ohne Rest und ohne Null im Ergebnis',
    2: 'Mit Null im Ergebnis und mit Rest',
    3: 'Große Zahlen, Rest deuten und Knobelaufgaben',
  },
  kmk: KMK,
  generate(rng, stufe, ctx) {
    const method = ctx.subtractionMethod;
    if (stufe === 1) {
      return writtenItem({ skillId: ID, stufe, ab: 1, op: 'div', operands: stufe1Operands(rng), method, withUeberschlag: false, kmk: KMK, rng });
    }
    if (stufe === 2) {
      const operands = stufe2Operands(rng);
      let context: string | undefined;
      let prompt: string | undefined;
      let emoji: string | undefined;
      if (rng.chance(0.15) && operands[1] < 10) {
        const tpl = rng.pick(CONTEXTS.filter((c) => c.fits(operands[0], operands[1])));
        [context, prompt] = tpl.make(fmt(operands[0]), operands[1]);
        emoji = tpl.emoji;
      }
      return writtenItem({ skillId: ID, stufe, ab: 2, op: 'div', operands, method, withUeberschlag: true, kmk: [...KMK, 'ZO.runden'], rng, context, prompt, emoji });
    }
    const variant = weighted(rng, [['gross', 55], ['aufgehen', 25], ['aufrunden', 20]] as const);
    if (variant === 'aufgehen') return addToFit(rng, stufe);
    if (variant === 'aufrunden') return roundUpRest(rng, stufe);
    return writtenItem({
      skillId: ID, stufe, ab: 2, op: 'div', operands: stufe3Operands(rng), method, withUeberschlag: true, kmk: [...KMK, 'ZO.runden'], rng,
      prompt: 'Mach zuerst einen Überschlag. Achte auf Nullen im Ergebnis.',
    });
  },
};
