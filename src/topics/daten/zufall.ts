/**
 * Zufall: sicher, möglich, unmöglich (KMK 2022 vocabulary; 'wahrscheinlich' is never used here).
 * Stufe 1: ein Ereignis einordnen (Würfel, Münze, Glücksrad, Säckchen).
 * Stufe 2: Augensumme mit zwei Würfeln, mehrere Kugeln auf einmal ziehen, das unmögliche/sichere Ereignis finden.
 * Stufe 3: Wie viele Kugeln muss ich ziehen, damit es sicher ist? Passendes Glücksrad/Säckchen wählen; unmögliche Summe.
 */
import { fmt } from '../../core/format';
import type { ColorName, Exercise, Rng, SkillDef, Stufe, Visual } from '../../core/types';
import {
  adjE,
  arrangeSectors,
  bagText,
  COLOR_NOUN,
  COLOR_WORD,
  COLORS,
  describeVisual,
  fixedChoice,
  listDe,
  makeExercise,
  numberBugs,
  shuffledChoice,
  speech,
  spinnerText,
  visualChoice,
  type BallGroup,
} from './shared';

const SKILL = { id: 'daten.zufall', kmk: ['DZ.zufall'] };

export type Klasse = 'sicher' | 'moeglich' | 'unmoeglich';
const KLASSEN: readonly Klasse[] = ['sicher', 'moeglich', 'unmoeglich'];
const WORD: Record<Klasse, string> = { sicher: 'sicher', moeglich: 'möglich', unmoeglich: 'unmöglich' };

/** Classification by counting outcomes: none → unmöglich, all → sicher, otherwise möglich. */
export function klasse(favourable: number, total: number): Klasse {
  if (favourable === 0) return 'unmoeglich';
  if (favourable === total) return 'sicher';
  return 'moeglich';
}

const QUESTION = 'Ist es sicher, möglich oder unmöglich,';

/** Reasons used in feedback, per device. */
interface Reasons {
  /** Why nothing fits. */
  none: string;
  /** An outcome that does not fit (for möglich). */
  other: string;
  /** An outcome that fits (for möglich). */
  example: string;
  /** Why everything fits. */
  all: string;
}

function classChoice(truth: Klasse, r: Reasons) {
  const why: Record<Klasse, Record<Klasse, string>> = {
    unmoeglich: { sicher: `Das kann gar nicht passieren. ${r.none}`, moeglich: `Kann das überhaupt passieren? ${r.none}`, unmoeglich: '' },
    moeglich: { sicher: `Es kann passieren, muss aber nicht. ${r.other}`, unmoeglich: `Es kann passieren. ${r.example}`, moeglich: '' },
    sicher: { moeglich: `Es passiert auf jeden Fall. ${r.all}`, unmoeglich: `Es passiert sogar immer. ${r.all}`, sicher: '' },
  };
  return fixedChoice(
    KLASSEN.map((k) => ({ label: WORD[k], whyWrong: why[truth][k] })),
    KLASSEN.indexOf(truth),
    'scale',
  );
}

const PRAISE: Record<Klasse, string> = {
  sicher: 'Du hast geprüft, dass jedes Ergebnis passt.',
  moeglich: 'Du hast erkannt: Es kann passieren, muss aber nicht.',
  unmoeglich: 'Du hast erkannt, dass kein Ergebnis passt.',
};

// ─── Stufe 1: ein Ereignis ───────────────────────────────────────────────────

interface DiceEvent {
  id: string;
  text: string;
  pred: (v: number) => boolean;
}

const DICE_EVENTS: readonly DiceEvent[] = [
  ...[1, 2, 3, 4, 5, 6, 7, 8, 0].map((k) => ({ id: `gleich-${k}`, text: `eine ${k}`, pred: (v: number) => v === k })),
  { id: 'gerade', text: 'eine gerade Zahl', pred: (v) => v % 2 === 0 },
  { id: 'ungerade', text: 'eine ungerade Zahl', pred: (v) => v % 2 === 1 },
  ...[1, 2, 3, 4, 5, 6, 7, 9].map((k) => ({ id: `kleiner-${k}`, text: `eine Zahl kleiner als ${k}`, pred: (v: number) => v < k })),
  ...[0, 1, 2, 3, 4, 5, 6, 8].map((k) => ({ id: `groesser-${k}`, text: `eine Zahl größer als ${k}`, pred: (v: number) => v > k })),
  { id: '1-bis-6', text: 'eine Zahl von 1 bis 6', pred: (v) => v >= 1 && v <= 6 },
  { id: 'zweistellig', text: 'eine zweistellige Zahl', pred: (v) => v >= 10 },
];

const DIE = [1, 2, 3, 4, 5, 6];
export const diceKlasse = (e: { pred: (v: number) => boolean }) => klasse(DIE.filter(e.pred).length, 6);

function diceItem(rng: Rng, target: Klasse): Exercise {
  const ev = rng.pick(DICE_EVENTS.filter((e) => diceKlasse(e) === target));
  const fits = DIE.filter(ev.pred);
  const misses = DIE.filter((v) => !ev.pred(v));
  const visual: Visual = { type: 'dice', values: DIE };
  const context = 'Du würfelst einmal mit einem Würfel.';
  const prompt = `${QUESTION} dass du ${ev.text} würfelst?`;
  const reasons: Reasons = {
    none: 'Auf dem Würfel gibt es nur die Zahlen 1 bis 6. Keine davon passt.',
    other: misses.length ? `Du kannst zum Beispiel auch eine ${misses[0]} würfeln.` : '',
    example: fits.length ? `Zum Beispiel, wenn du eine ${fits[fits.length - 1]} würfelst.` : '',
    all: 'Jede Zahl von 1 bis 6 passt.',
  };
  return makeExercise(SKILL, 1, ['wuerfel', ev.id], {
    ab: 1,
    context,
    prompt,
    visual,
    emoji: '🎲',
    answer: classChoice(target, reasons),
    hints: ['Welche Zahlen hat ein Würfel?', 'Prüfe jede Zahl von 1 bis 6: Passt sie? Passen alle, manche oder keine?'],
    steps: [
      'Auf dem Würfel sind die Zahlen 1, 2, 3, 4, 5 und 6.',
      fits.length === 0 ? 'Keine Zahl passt.' : fits.length === 6 ? 'Alle Zahlen passen.' : `Diese Zahlen passen: ${listDe(fits.map(String))}. Die anderen passen nicht.`,
      `Es ist ${WORD[target]}, dass du ${ev.text} würfelst.`,
    ],
    praise: PRAISE[target],
    srText: speech(context, prompt),
  });
}

const COIN_EVENTS: readonly { id: string; text: string; klasse: Klasse }[] = [
  { id: 'kopf', text: 'die Münze Kopf zeigt', klasse: 'moeglich' },
  { id: 'zahl', text: 'die Münze Zahl zeigt', klasse: 'moeglich' },
  { id: 'kopf-oder-zahl', text: 'die Münze Kopf oder Zahl zeigt', klasse: 'sicher' },
  { id: 'beides', text: 'die Münze Kopf und Zahl gleichzeitig zeigt', klasse: 'unmoeglich' },
];

function coinItem(rng: Rng, target: Klasse): Exercise {
  const ev = rng.pick(COIN_EVENTS.filter((e) => e.klasse === target));
  const context = 'Du wirfst eine Münze einmal.';
  const prompt = `${QUESTION} dass ${ev.text}?`;
  const reasons: Reasons = {
    none: 'Eine Münze zeigt immer nur eine Seite.',
    other: `Die Münze kann auch ${ev.id === 'kopf' ? 'Zahl' : 'Kopf'} zeigen.`,
    example: 'Eine Seite der Münze passt.',
    all: 'Die Münze zeigt immer Kopf oder Zahl.',
  };
  return makeExercise(SKILL, 1, ['muenze', ev.id], {
    ab: 1,
    context,
    prompt,
    emoji: '🪙',
    answer: classChoice(target, reasons),
    hints: ['Welche zwei Seiten hat eine Münze?', 'Passen beide Seiten, eine Seite oder keine?'],
    steps: ['Eine Münze hat zwei Seiten: Kopf und Zahl. Sie zeigt immer genau eine Seite.', `Es ist ${WORD[target]}, dass ${ev.text}.`],
    praise: PRAISE[target],
    srText: speech(context, prompt),
  });
}

/** 1–3 colour groups with the given total. */
function groups(rng: Rng, nColors: number, total: number, colors?: ColorName[]): BallGroup[] {
  const cs = colors ?? rng.sample(COLORS, nColors);
  const counts = Array.from({ length: nColors }, () => 1);
  for (let i = nColors; i < total; i++) counts[rng.int(0, nColors - 1)]++;
  return cs.map((color, i) => ({ color, count: counts[i] }));
}

function spinnerItem(rng: Rng, target: Klasse): Exercise {
  const n = rng.int(3, 8);
  let g: BallGroup[];
  let event: ColorName[];
  let negate = false;
  if (target === 'sicher') {
    if (rng.chance(0.4)) {
      g = groups(rng, 1, n);
      event = [g[0].color];
    } else {
      g = groups(rng, 2, n);
      event = g.map((x) => x.color);
    }
  } else if (target === 'unmoeglich') {
    g = groups(rng, rng.int(1, 3), n);
    event = [rng.pick(COLORS.filter((c) => !g.some((x) => x.color === c)))];
  } else {
    g = groups(rng, rng.int(2, 3), n);
    if (rng.chance(0.25)) {
      negate = true;
      event = [rng.pick(g).color];
    } else event = [rng.pick(g).color];
  }
  const sectors = arrangeSectors(rng, g);
  const visual: Visual = { type: 'spinner', sectors };
  const evText = negate ? `nicht auf ${COLOR_NOUN[event[0]]}` : `auf ${listDe(event.map((c) => COLOR_NOUN[c]), 'oder')}`;
  const fits = sectors.filter((s) => (negate ? s !== event[0] : event.includes(s))).length;
  const context = 'Du drehst das Glücksrad einmal.';
  const prompt = `${QUESTION} dass der Zeiger ${evText} stehen bleibt?`;
  const otherColor = g.find((x) => (negate ? x.color === event[0] : !event.includes(x.color)))?.color;
  const fitColor = g.find((x) => (negate ? x.color !== event[0] : event.includes(x.color)))?.color;
  const reasons: Reasons = {
    none: negate ? `Alle Felder sind ${COLOR_WORD[event[0]]}.` : `Auf dem Glücksrad gibt es kein Feld mit ${COLOR_NOUN[event[0]]}.`,
    other: otherColor ? `Der Zeiger kann auch auf ${COLOR_NOUN[otherColor]} stehen bleiben.` : '',
    example: fitColor ? `Auf dem Glücksrad gibt es Felder mit ${COLOR_NOUN[fitColor]}.` : '',
    all: 'Jedes Feld passt.',
  };
  return makeExercise(SKILL, 1, ['rad', sectors.join('-'), negate ? 'nicht' : 'ja', event.join('-')], {
    ab: 1,
    context,
    prompt,
    visual,
    emoji: '🎡',
    answer: classChoice(target, reasons),
    hints: ['Schau dir alle Felder des Glücksrads an.', 'Passen alle Felder, manche oder keines?'],
    steps: [spinnerText(sectors), fits === 0 ? 'Kein Feld passt.' : fits === n ? 'Alle Felder passen.' : `${fmt(fits)} von ${fmt(n)} Feldern ${fits === 1 ? 'passt' : 'passen'}.`, `Es ist ${WORD[target]}, dass der Zeiger ${evText} stehen bleibt.`],
    praise: PRAISE[target],
    srText: speech(spinnerText(sectors), context, prompt),
  });
}

function bagItem(rng: Rng, target: Klasse): Exercise {
  // Säckchen with ≤ 20 Kugeln in 2–3 colours.
  const total = rng.int(4, 20);
  let g: BallGroup[];
  let event: ColorName[];
  let negate = false;
  if (target === 'sicher') {
    if (rng.chance(0.5)) {
      // 'rot oder blau' when there are only red and blue balls
      g = groups(rng, 2, total);
      event = g.map((x) => x.color);
    } else {
      // 'nicht gelb' when there is no yellow ball
      g = groups(rng, rng.int(2, 3), total);
      negate = true;
      event = [rng.pick(COLORS.filter((c) => !g.some((x) => x.color === c)))];
    }
  } else if (target === 'unmoeglich') {
    g = groups(rng, rng.int(2, 3), total);
    event = [rng.pick(COLORS.filter((c) => !g.some((x) => x.color === c)))];
  } else {
    g = groups(rng, rng.int(2, 3), total);
    negate = rng.chance(0.25);
    event = [rng.pick(g).color];
  }
  const visual: Visual = { type: 'bag', balls: g };
  const fits = g.filter((x) => (negate ? x.color !== event[0] : event.includes(x.color))).reduce((a, x) => a + x.count, 0);
  const evText = negate ? `nicht ${COLOR_WORD[event[0]]}` : listDe(event.map((c) => COLOR_WORD[c]), 'oder');
  const context = `Im Säckchen sind ${bagText(g)}. Du ziehst ohne hinzusehen eine Kugel.`;
  const prompt = `${QUESTION} dass sie ${evText} ist?`;
  const other = g.find((x) => (negate ? x.color === event[0] : !event.includes(x.color)));
  const fit = g.find((x) => (negate ? x.color !== event[0] : event.includes(x.color)));
  const reasons: Reasons = {
    none: negate ? `Alle Kugeln im Säckchen sind ${COLOR_WORD[event[0]]}.` : `Im Säckchen ist keine ${adjE(event[0])} Kugel.`,
    other: other ? (other.count === 1 ? `Im Säckchen ist auch eine ${adjE(other.color)} Kugel.` : `Im Säckchen sind auch ${adjE(other.color)} Kugeln.`) : '',
    example: fit ? `Im Säckchen ${fit.count === 1 ? 'ist eine' : 'sind'} ${adjE(fit.color)} ${fit.count === 1 ? 'Kugel' : 'Kugeln'}.` : '',
    all: 'Jede Kugel im Säckchen passt.',
  };
  return makeExercise(SKILL, 1, ['saeckchen', g.map((x) => `${x.color}${x.count}`).join('-'), negate ? 'nicht' : 'ja', event.join('-')], {
    ab: 1,
    context,
    prompt,
    visual,
    emoji: '👝',
    answer: classChoice(target, reasons),
    hints: ['Welche Farben haben die Kugeln im Säckchen?', 'Passen alle Kugeln, manche oder keine?'],
    steps: [`Im Säckchen sind ${bagText(g)}.`, fits === 0 ? 'Keine Kugel passt.' : fits === total ? 'Alle Kugeln passen.' : `${fmt(fits)} von ${fmt(total)} Kugeln ${fits === 1 ? 'passt' : 'passen'}.`, `Es ist ${WORD[target]}, dass die Kugel ${evText} ist.`],
    praise: PRAISE[target],
    srText: speech(context, prompt),
  });
}

function stufe1(rng: Rng): Exercise {
  const target = rng.pick(KLASSEN);
  const roll = rng.next();
  if (roll < 0.35) return diceItem(rng, target);
  if (roll < 0.6) return spinnerItem(rng, target);
  if (roll < 0.85) return bagItem(rng, target);
  return coinItem(rng, target);
}

// ─── Stufe 2 ─────────────────────────────────────────────────────────────────

interface SumEvent {
  id: string;
  /** Clause after 'dass': 'die Summe 7 ist' */
  text: string;
  pred: (x: number, y: number) => boolean;
}

const SUM_EVENTS: readonly SumEvent[] = [
  ...[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14].map((k) => ({ id: `summe-${k}`, text: `die Summe ${k} ist`, pred: (x: number, y: number) => x + y === k })),
  { id: 'groesser-1', text: 'die Summe größer als 1 ist', pred: (x, y) => x + y > 1 },
  { id: 'kleiner-13', text: 'die Summe kleiner als 13 ist', pred: (x, y) => x + y < 13 },
  { id: 'groesser-12', text: 'die Summe größer als 12 ist', pred: (x, y) => x + y > 12 },
  { id: 'kleiner-2', text: 'die Summe kleiner als 2 ist', pred: (x, y) => x + y < 2 },
  { id: 'gerade', text: 'die Summe eine gerade Zahl ist', pred: (x, y) => (x + y) % 2 === 0 },
  { id: 'pasch', text: 'beide Würfel die gleiche Zahl zeigen', pred: (x, y) => x === y },
  { id: 'mind-2', text: 'die Summe mindestens 2 ist', pred: (x, y) => x + y >= 2 },
];

const PAIRS: readonly [number, number][] = DIE.flatMap((x) => DIE.map((y) => [x, y] as [number, number]));
export const sumKlasse = (e: { pred: (x: number, y: number) => boolean }) => klasse(PAIRS.filter(([x, y]) => e.pred(x, y)).length, 36);

function twoDice(rng: Rng): Exercise {
  const target = rng.pick(KLASSEN);
  const ev = rng.pick(SUM_EVENTS.filter((e) => sumKlasse(e) === target));
  const fit = PAIRS.find(([x, y]) => ev.pred(x, y));
  const miss = PAIRS.find(([x, y]) => !ev.pred(x, y));
  const context = 'Du würfelst mit zwei Würfeln. Du rechnest die beiden Zahlen zusammen.';
  const prompt = `${QUESTION} dass ${ev.text}?`;
  const reasons: Reasons = {
    none: 'Die Summe ist immer mindestens 2 und höchstens 12.',
    other: miss ? `Es kann auch anders kommen, zum Beispiel ${miss[0]} und ${miss[1]}.` : '',
    example: fit ? `Zum Beispiel mit ${fit[0]} und ${fit[1]}.` : '',
    all: 'Die Summe ist immer mindestens 2 und höchstens 12. Jeder Wurf passt.',
  };
  return makeExercise(SKILL, 2, ['summe', ev.id], {
    ab: 2,
    context,
    prompt,
    emoji: '🎲',
    answer: classChoice(target, reasons),
    hints: ['Was ist die kleinste Summe, was die größte?', 'Suche einen Wurf, der passt, und einen, der nicht passt.'],
    steps: [
      'Die kleinste Summe ist 1 + 1 = 2. Die größte Summe ist 6 + 6 = 12.',
      target === 'unmoeglich' ? 'Kein Wurf passt.' : target === 'sicher' ? 'Jeder Wurf passt.' : `${fit![0]} und ${fit![1]} passt. ${miss![0]} und ${miss![1]} passt nicht.`,
      `Es ist ${WORD[target]}, dass ${ev.text}.`,
    ],
    praise: PRAISE[target],
    srText: speech(context, prompt),
  });
}

type DrawKind = 'mindestens' | 'alle' | 'keine';

/** Classification for drawing k balls at once from a bag with a balls of colour A and b of colour B. */
export function drawKlasse(kind: DrawKind, a: number, b: number, k: number): Klasse {
  // Number of A-balls among the k drawn ranges from max(0, k − b) to min(k, a).
  const lo = Math.max(0, k - b);
  const hi = Math.min(k, a);
  const ok = (x: number) => (kind === 'mindestens' ? x >= 1 : kind === 'alle' ? x === k : x === 0);
  let fits = 0;
  let all = 0;
  for (let x = lo; x <= hi; x++) {
    all++;
    if (ok(x)) fits++;
  }
  return klasse(fits, all);
}

function draws(rng: Rng): Exercise {
  const target = rng.pick(KLASSEN);
  let pick = { kind: 'mindestens' as DrawKind, a: 2, b: 3, k: 2 };
  for (let tries = 0; tries < 60; tries++) {
    const cand = { kind: rng.pick<DrawKind>(['mindestens', 'alle', 'keine']), a: rng.int(1, 8), b: rng.int(1, 8), k: rng.int(2, 4) };
    if (cand.k >= cand.a + cand.b) continue;
    pick = cand;
    if (drawKlasse(cand.kind, cand.a, cand.b, cand.k) === target) break;
  }
  const { kind, a, b, k } = pick;
  const truth = drawKlasse(kind, a, b, k);
  const [cA, cB] = rng.sample(COLORS.slice(0, 4), 2);
  const g: BallGroup[] = [
    { color: cA, count: a },
    { color: cB, count: b },
  ];
  const visual: Visual = { type: 'bag', balls: g };
  const clause =
    kind === 'mindestens'
      ? `mindestens eine Kugel ${COLOR_WORD[cA]} ist`
      : kind === 'alle'
        ? `${k === 2 ? 'beide' : `alle ${k}`} Kugeln ${COLOR_WORD[cA]} sind`
        : `keine Kugel ${COLOR_WORD[cA]} ist`;
  const context = `Im Säckchen sind ${bagText(g)}. Du ziehst ohne hinzusehen ${k} Kugeln auf einmal.`;
  const prompt = `${QUESTION} dass ${clause}?`;
  const whyWrong: Record<Klasse, Record<Klasse, string>> = {
    sicher: {
      moeglich: `Stell dir vor, du hast Pech: Wie viele ${adjE(cB)} Kugeln kannst du höchstens ziehen?`,
      unmoeglich: 'Überlege, welche Kugeln du ziehen kannst. Es passiert sogar immer.',
      sicher: '',
    },
    moeglich: {
      sicher: 'Es kann auch anders kommen. Überlege, welche Kugeln du noch ziehen könntest.',
      unmoeglich: 'Überlege: Gibt es eine Möglichkeit, bei der es passt?',
      moeglich: '',
    },
    unmoeglich: {
      sicher: `Wie viele ${adjE(cA)} und wie viele ${adjE(cB)} Kugeln sind im Säckchen? Reicht das?`,
      moeglich: `Wie viele ${adjE(cA)} und wie viele ${adjE(cB)} Kugeln sind im Säckchen? Reicht das für ${k} Kugeln?`,
      unmoeglich: '',
    },
  };
  const lo = Math.max(0, k - b);
  const hi = Math.min(k, a);
  return makeExercise(SKILL, 2, ['ziehen', kind, cA, a, cB, b, k], {
    ab: 2,
    context,
    prompt,
    visual,
    emoji: '👝',
    answer: fixedChoice(KLASSEN.map((x) => ({ label: WORD[x], whyWrong: whyWrong[truth][x] })), KLASSEN.indexOf(truth), 'scale'),
    hints: ['Überlege: Was ist das Beste, was du ziehen kannst? Was ist das Schlechteste?', `Wie viele ${adjE(cA)} Kugeln können unter deinen ${k} Kugeln sein?`],
    steps: [
      `Im Säckchen sind ${bagText(g)}.`,
      lo === hi
        ? `Unter ${k} Kugeln sind immer genau ${fmt(lo)} ${adjE(cA)}.`
        : `Unter ${k} Kugeln sind mindestens ${fmt(lo)} und höchstens ${fmt(hi)} ${adjE(cA)}.`,
      `Es ist ${WORD[truth]}, dass ${clause}.`,
    ],
    praise: 'Du hast den besten und den schlechtesten Fall durchdacht.',
    srText: speech(context, prompt),
  });
}

function whichEvent(rng: Rng): Exercise {
  const target: Klasse = rng.pick(['unmoeglich', 'sicher']);
  const correct = rng.pick(DICE_EVENTS.filter((e) => diceKlasse(e) === target));
  const others = rng.shuffle(DICE_EVENTS.filter((e) => diceKlasse(e) !== target));
  // Distractors: the opposite class and two 'möglich' events.
  const opposite = others.find((e) => diceKlasse(e) === (target === 'sicher' ? 'unmoeglich' : 'sicher'))!;
  const possible = others.filter((e) => diceKlasse(e) === 'moeglich');
  const wrongEvents = [opposite, possible[0], possible[1]];
  const label = (e: DiceEvent) => `Du würfelst ${e.text}.`;
  const why = (e: DiceEvent): string => {
    const k = diceKlasse(e);
    if (k === 'moeglich') return 'Das ist möglich, aber nicht sicher.';
    if (k === 'sicher') return 'Das passiert sogar immer.';
    return 'Das kann gar nicht passieren.';
  };
  const answer = shuffledChoice(rng, { label: label(correct) }, wrongEvents.map((e) => ({ label: label(e), whyWrong: why(e) })), 4);
  const context = 'Du würfelst einmal mit einem Würfel.';
  const prompt = `Was ist ${WORD[target]}?`;
  return makeExercise(SKILL, 2, ['welches', target, correct.id, wrongEvents.map((e) => e.id).join('-'), answer.correct], {
    ab: 2,
    context,
    prompt,
    visual: { type: 'dice', values: DIE },
    emoji: '🎲',
    answer,
    hints: ['Prüfe jede Antwort mit den Zahlen 1 bis 6.', target === 'unmoeglich' ? 'Unmöglich heißt: Keine Zahl passt.' : 'Sicher heißt: Jede Zahl passt.'],
    steps: [
      'Auf dem Würfel sind die Zahlen 1 bis 6.',
      target === 'unmoeglich' ? `Für „${correct.text}“ passt keine Zahl.` : `Für „${correct.text}“ passt jede Zahl.`,
      `${WORD[target].charAt(0).toUpperCase() + WORD[target].slice(1)} ist: ${label(correct)}`,
    ],
    praise: target === 'unmoeglich' ? 'Du hast das Ereignis gefunden, bei dem keine Zahl passt.' : 'Du hast das Ereignis gefunden, bei dem jede Zahl passt.',
    srText: speech(context, prompt, answer.options.map((o) => o.label).join(' Oder: ')),
  });
}

// ─── Stufe 3 ─────────────────────────────────────────────────────────────────

function minimumDraws(rng: Rng): Exercise {
  const nColors = rng.int(2, 3);
  const total = rng.int(nColors + 3, 16);
  const g = groups(rng, nColors, total);
  const pairMode = rng.chance(0.35);
  const visual: Visual = { type: 'bag', balls: g };
  const context = `Im Säckchen sind ${bagText(g)}. Du ziehst ohne hinzusehen eine Kugel nach der anderen.`;
  if (pairMode) {
    const answer = nColors + 1;
    const prompt = 'Du willst sicher zwei Kugeln mit der gleichen Farbe haben. Wie viele musst du mindestens ziehen?';
    return makeExercise(SKILL, 3, ['paar', g.map((x) => `${x.color}${x.count}`).join('-')], {
      ab: 3,
      knobel: true,
      context,
      prompt,
      visual,
      emoji: '👝',
      answer: { kind: 'number', value: answer, unit: 'Kugeln', label: 'Anzahl der Kugeln' },
      hints: ['Stell dir vor, du hast Pech: Jede Kugel hat eine andere Farbe als die vorher.', `Es gibt ${fmt(nColors)} Farben. Wie lange kann das gut gehen?`],
      steps: [
        `Es gibt ${fmt(nColors)} Farben. Mit Pech hat jede der ersten ${fmt(nColors)} Kugeln eine andere Farbe.`,
        'Die nächste Kugel hat dann sicher eine Farbe, die schon da ist.',
        `${fmt(nColors)} + 1 = ${fmt(answer)}. Du musst mindestens ${fmt(answer)} Kugeln ziehen.`,
      ],
      bugs: numberBugs(answer, [
        ['zwei', 2, 'Zwei Kugeln können verschiedene Farben haben. Dann ist es nur möglich, nicht sicher.'],
        ['anzahl-farben', nColors, 'Mit so vielen Kugeln kann jede Farbe genau einmal dabei sein.'],
      ]),
      praise: 'Du hast an den Fall mit dem meisten Pech gedacht.',
      srText: speech(context, prompt),
    });
  }
  const target = rng.pick(g);
  const others = total - target.count;
  const answer = others + 1;
  const prompt = `Wie viele Kugeln musst du mindestens ziehen, damit du sicher eine ${adjE(target.color)} Kugel hast?`;
  return makeExercise(SKILL, 3, ['mindestens', g.map((x) => `${x.color}${x.count}`).join('-'), target.color], {
    ab: 3,
    knobel: true,
    context,
    prompt,
    visual,
    emoji: '👝',
    answer: { kind: 'number', value: answer, unit: 'Kugeln', label: 'Anzahl der Kugeln' },
    hints: [`Stell dir vor, du hast Pech: Du ziehst zuerst nur Kugeln, die nicht ${COLOR_WORD[target.color]} sind.`, 'Wie viele solche Kugeln gibt es? Was passiert danach?'],
    steps: [
      others === 1 ? `Es gibt 1 Kugel, die nicht ${COLOR_WORD[target.color]} ist.` : `Es gibt ${fmt(others)} Kugeln, die nicht ${COLOR_WORD[target.color]} sind.`,
      `Mit Pech ziehst du zuerst ${others === 1 ? 'diese eine Kugel' : `alle ${fmt(others)}`}. Die nächste Kugel ist dann sicher ${COLOR_WORD[target.color]}: ${fmt(others)} + 1 = ${fmt(answer)}.`,
      `Du musst mindestens ${fmt(answer)} Kugeln ziehen.`,
    ],
    bugs: numberBugs(answer, [
      ['plus-eins-vergessen', others, `Dann hast du mit Pech nur die anderen Kugeln. Du brauchst noch eine Kugel mehr.`],
      ['eine', 1, `Mit einer Kugel ist ${COLOR_NOUN[target.color]} möglich, aber nicht sicher.`],
      ['zielfarbe', target.count, `Überlege: Welche Kugeln könntest du zuerst ziehen, wenn du Pech hast?`],
      ['alle', total, 'So viele brauchst du nicht. Es reicht, wenn sicher eine passende Kugel dabei ist.'],
    ]),
    praise: 'Du hast an den Fall mit dem meisten Pech gedacht.',
    srText: speech(context, prompt),
  });
}

/** Choose the Glücksrad or Säckchen that fits two conditions. */
function matchDevice(rng: Rng): Exercise {
  const spinner = rng.chance(0.55);
  const [c1, c2, c3] = rng.sample(COLORS, 3);
  const n = spinner ? rng.int(4, 8) : rng.int(5, 12);
  const sicherMode = rng.chance(0.4);
  const make = (gs: BallGroup[]): Visual => (spinner ? { type: 'spinner', sectors: arrangeSectors(rng, gs) } : { type: 'bag', balls: gs });
  const split = (cs: ColorName[]) => groups(rng, cs.length, n, cs);
  const noun = spinner ? 'Glücksrad' : 'Säckchen';
  let context: string;
  let correct: Visual;
  let wrong: { visual: Visual; whyWrong: string }[];
  if (sicherMode) {
    context = spinner ? `Der Zeiger soll sicher auf ${COLOR_NOUN[c1]} stehen bleiben.` : `Die gezogene Kugel soll sicher ${COLOR_WORD[c1]} sein.`;
    correct = make(split([c1]));
    wrong = [
      { visual: make(split([c1, c2])), whyWrong: `Hier ist auch ${COLOR_NOUN[c2]} möglich. Dann ist ${COLOR_NOUN[c1]} nicht sicher.` },
      { visual: make(split([c2, c3])), whyWrong: `Hier ist ${COLOR_NOUN[c1]} unmöglich.` },
    ];
  } else {
    context = spinner
      ? `${COLOR_NOUN[c1]} soll möglich sein, aber nicht sicher. ${COLOR_NOUN[c2]} soll unmöglich sein.`
      : `Eine ${adjE(c1)} Kugel soll möglich sein, aber nicht sicher. Eine ${adjE(c2)} Kugel soll unmöglich sein.`;
    correct = make(split([c1, c3]));
    wrong = rng.shuffle([
      { visual: make(split([c1, c2])), whyWrong: `Hier ist ${COLOR_NOUN[c2]} möglich. Es soll aber unmöglich sein.` },
      { visual: make(split([c1])), whyWrong: `Hier ist ${COLOR_NOUN[c1]} sicher, nicht nur möglich.` },
      { visual: make(split([c2, c3])), whyWrong: `Hier ist ${COLOR_NOUN[c1]} unmöglich.` },
    ]);
  }
  const answer = visualChoice(rng, noun, correct, wrong, 3);
  const prompt = `Welches ${noun} passt?`;
  const right = answer.options[answer.correct].label;
  return makeExercise(SKILL, 3, ['passend', spinner ? 'rad' : 'sack', sicherMode ? 'sicher' : 'moeglich', c1, c2, c3, n, answer.correct], {
    ab: 3,
    context,
    prompt,
    emoji: spinner ? '🎡' : '👝',
    answer,
    hints: ['Prüfe jede Bedingung einzeln.', sicherMode ? 'Sicher heißt: Alles passt.' : 'Unmöglich heißt: Diese Farbe kommt gar nicht vor.'],
    steps: [
      sicherMode ? `Sicher heißt: Es darf nur ${COLOR_NOUN[c1]} geben.` : `${COLOR_NOUN[c1]} muss vorkommen, aber nicht allein. ${COLOR_NOUN[c2]} darf nicht vorkommen.`,
      { text: `${right} passt.`, visual: correct },
    ],
    praise: 'Du hast jede Bedingung genau geprüft.',
    srText: speech(context, prompt, answer.options.map((o) => `${o.label}: ${o.visual ? describeVisual(o.visual) : ''}`).join(' ')),
  });
}

function impossibleSum(rng: Rng): Exercise {
  const impossible = rng.pick([1, 13, 14, 0]);
  const possible = rng.sample([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], 3);
  if (!possible.includes(12) && !possible.includes(2) && rng.chance(0.6)) possible[0] = rng.pick([2, 12]);
  const way = (s: number) => {
    const x = Math.min(6, s - 1);
    return `${x} + ${s - x}`;
  };
  const answer = shuffledChoice(
    rng,
    { label: fmt(impossible) },
    possible.map((s) => ({ label: fmt(s), whyWrong: `Die Summe ${s} ist möglich: ${way(s)} = ${s}.` })),
    4,
    'symbols',
  );
  const context = 'Du würfelst mit zwei Würfeln. Du rechnest die beiden Zahlen zusammen.';
  const prompt = 'Welche Summe ist unmöglich?';
  return makeExercise(SKILL, 3, ['unmoeglich-summe', impossible, possible.join('-'), answer.correct], {
    ab: 3,
    context,
    prompt,
    emoji: '🎲',
    answer,
    hints: ['Was ist die kleinste Summe, die du würfeln kannst?', 'Was ist die größte Summe?'],
    steps: ['Die kleinste Summe ist 1 + 1 = 2. Die größte Summe ist 6 + 6 = 12.', `${fmt(impossible)} liegt nicht zwischen 2 und 12. Diese Summe ist unmöglich.`],
    praise: 'Du hast die kleinste und die größte Summe bedacht.',
    srText: speech(context, prompt, answer.options.map((o) => o.label).join(', ')),
  });
}

function generate(rng: Rng, stufe: Stufe): Exercise {
  if (stufe === 1) return stufe1(rng);
  if (stufe === 2) {
    const roll = rng.next();
    if (roll < 0.35) return twoDice(rng);
    if (roll < 0.7) return draws(rng);
    return whichEvent(rng);
  }
  const roll = rng.next();
  if (roll < 0.4) return minimumDraws(rng);
  if (roll < 0.75) return matchDevice(rng);
  return impossibleSum(rng);
}

export const zufallSkill: SkillDef = {
  id: SKILL.id,
  topicId: 'daten',
  title: 'Sicher, möglich, unmöglich',
  description: 'Du überlegst, ob etwas sicher, möglich oder unmöglich ist.',
  stufen: {
    1: 'Würfel, Münze, Glücksrad und Säckchen',
    2: 'Zwei Würfel und mehrere Kugeln',
    3: 'Wann ist es sicher? Passendes Glücksrad finden',
  },
  kmk: SKILL.kmk,
  generate,
};
