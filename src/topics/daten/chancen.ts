/**
 * Chancen vergleichen – only by counts, never with numbers as probabilities.
 * Words: 'wahrscheinlicher als', 'weniger wahrscheinlich als', 'gleich wahrscheinlich', 'größere Chancen'.
 * Stufe 1: zwei Farben/Ereignisse bei einem Säckchen, Glücksrad oder Würfel vergleichen.
 * Stufe 2: zwei Säckchen oder Glücksräder vergleichen; Ist das Spiel fair?
 * Stufe 3: Säckchen verändern (Kugeln dazulegen/herausnehmen), faire Würfelspiele begründen, Spiel fair machen.
 */
import { fmt } from '../../core/format';
import type { ColorName, Exercise, Rng, SkillDef, Stufe, Visual } from '../../core/types';
import {
  adjE,
  adjEn,
  arrangeSectors,
  bagText,
  balls,
  cap,
  COLOR_NOUN,
  COLOR_WORD,
  COLORS,
  describeVisual,
  fields,
  fixedChoice,
  listDe,
  makeExercise,
  numberBugs,
  shuffledChoice,
  speech,
  spinnerText,
  type BallGroup,
  type Opt,
} from './shared';

const SKILL = { id: 'daten.chancen', kmk: ['DZ.zufall', 'PK.argumentieren'] };

const PLAYERS: readonly [string, string][] = [
  ['Anna', 'Ben'],
  ['Lena', 'Tom'],
  ['Mira', 'Jan'],
  ['Elif', 'Noah'],
  ['Sara', 'Luis'],
];

/** 'Rot ist wahrscheinlicher als Blau.' etc. in a fixed order: X > Y, Y > X, gleich. */
function compareChoice(x: string, y: string, nx: number, ny: number, why: { more: string; equal: string; notEqual: string }) {
  const correct = nx > ny ? 0 : nx < ny ? 1 : 2;
  const options: Opt[] = [
    { label: `${x} ist wahrscheinlicher als ${y}.`, whyWrong: correct === 2 ? why.notEqual : why.more },
    { label: `${y} ist wahrscheinlicher als ${x}.`, whyWrong: correct === 2 ? why.notEqual : why.more },
    { label: `${x} und ${y} sind gleich wahrscheinlich.`, whyWrong: why.equal },
  ];
  return fixedChoice(options, correct);
}

function conclusion(x: string, y: string, nx: number, ny: number): string {
  if (nx > ny) return `${x} ist wahrscheinlicher als ${y}.`;
  if (nx < ny) return `${x} ist weniger wahrscheinlich als ${y}.`;
  return `${x} und ${y} sind gleich wahrscheinlich.`;
}

/** Two counts for a comparison: equal in about a quarter of the cases. */
function twoCounts(rng: Rng, max: number): [number, number] {
  if (rng.chance(0.25)) {
    const n = rng.int(1, Math.floor(max / 2));
    return [n, n];
  }
  const pairs: [number, number][] = [];
  for (let a = 1; a < max; a++) for (let b = 1; a + b <= max; b++) if (a !== b) pairs.push([a, b]);
  return rng.pick(pairs);
}

// ─── Stufe 1 ─────────────────────────────────────────────────────────────────

function colourCompare(rng: Rng): Exercise {
  const spinner = rng.chance(0.45);
  const [c1, c2, c3] = rng.sample(COLORS, 3);
  const max = spinner ? 7 : 16;
  const [n1, n2] = twoCounts(rng, max);
  const extra = rng.chance(0.4) && n1 + n2 < (spinner ? 8 : 20) ? rng.int(1, (spinner ? 8 : 20) - n1 - n2) : 0;
  const g: BallGroup[] = [
    { color: c1, count: n1 },
    { color: c2, count: n2 },
    ...(extra ? [{ color: c3, count: extra }] : []),
  ];
  const total = n1 + n2 + extra;
  const visual: Visual = spinner ? { type: 'spinner', sectors: arrangeSectors(rng, g) } : { type: 'bag', balls: rng.shuffle(g) };
  const X = COLOR_NOUN[c1];
  const Y = COLOR_NOUN[c2];
  const unit = spinner ? 'Felder' : 'Kugeln';
  const context = spinner ? 'Du drehst das Glücksrad einmal.' : 'Du ziehst ohne hinzusehen eine Kugel aus dem Säckchen.';
  const prompt = `Was stimmt? Vergleiche ${X} und ${Y}.`;
  const both = spinner ? `die Felder mit ${X} und die Felder mit ${Y}` : `die ${adjEn(c1)} und die ${adjEn(c2)} Kugeln`;
  const answer = compareChoice(X, Y, n1, n2, {
    more: `Zähle ${both} noch einmal und vergleiche.`,
    equal: `Zähle noch einmal: Sind es wirklich gleich viele ${unit}?`,
    notEqual: `Zähle noch einmal: Von ${X} und ${Y} gibt es gleich viele ${unit}.`,
  });
  const desc = spinner ? spinnerText(visual.type === 'spinner' ? visual.sectors : []) : `Im Säckchen sind ${bagText(g)}.`;
  const what = (c: ColorName, n: number) => `${fmt(n)} von ${fmt(total)} ${spinner ? 'Feldern' : 'Kugeln'} ${n === 1 ? 'ist' : 'sind'} ${COLOR_WORD[c]}.`;
  return makeExercise(SKILL, 1, ['farben', spinner ? 'rad' : 'sack', g.map((x) => `${x.color}${x.count}`).join('-'), visual.type === 'spinner' ? visual.sectors.join('') : 's'], {
    ab: 1,
    context,
    prompt,
    visual,
    emoji: spinner ? '🎡' : '👝',
    answer,
    hints: [`Zähle ${both}.`, `Je mehr ${unit} eine Farbe hat, desto größer sind ihre Chancen.`],
    steps: [what(c1, n1), what(c2, n2), conclusion(X, Y, n1, n2)],
    praise: 'Du hast gezählt und die Anzahlen verglichen.',
    srText: speech(desc, context, prompt),
  });
}

interface DiceCompareEvent {
  text: string;
  nums: number[];
}

const DICE_COMPARE: readonly DiceCompareEvent[] = [
  { text: 'eine 6', nums: [6] },
  { text: 'eine 1', nums: [1] },
  { text: 'eine 3', nums: [3] },
  { text: 'eine gerade Zahl', nums: [2, 4, 6] },
  { text: 'eine ungerade Zahl', nums: [1, 3, 5] },
  { text: 'eine Zahl größer als 4', nums: [5, 6] },
  { text: 'eine Zahl kleiner als 3', nums: [1, 2] },
  { text: 'eine Zahl größer als 2', nums: [3, 4, 5, 6] },
  { text: 'eine Zahl kleiner als 5', nums: [1, 2, 3, 4] },
  { text: 'eine 5 oder eine 6', nums: [5, 6] },
  { text: 'eine Zahl größer als 1', nums: [2, 3, 4, 5, 6] },
];

function diceCompare(rng: Rng): Exercise {
  const [e1, e2] = rng.sample(DICE_COMPARE, 2);
  const n1 = e1.nums.length;
  const n2 = e2.nums.length;
  const context = `Du würfelst einmal. A: Du würfelst ${e1.text}. B: Du würfelst ${e2.text}.`;
  const prompt = 'Was stimmt?';
  const answer = compareChoice('A', 'B', n1, n2, {
    more: 'Zähle für A und für B, wie viele Zahlen passen.',
    equal: 'Zähle noch einmal: Passen wirklich gleich viele Zahlen?',
    notEqual: 'Zähle noch einmal: Für A und B passen gleich viele Zahlen.',
  });
  const fit = (name: string, e: DiceCompareEvent) =>
    `Für ${name} ${e.nums.length === 1 ? 'passt' : 'passen'} ${listDe(e.nums.map(String))}: ${fmt(e.nums.length)} von 6 Zahlen.`;
  return makeExercise(SKILL, 1, ['wuerfel', e1.text.replace(/ /g, '_'), e2.text.replace(/ /g, '_')], {
    ab: 1,
    context,
    prompt,
    visual: { type: 'dice', values: [1, 2, 3, 4, 5, 6] },
    emoji: '🎲',
    answer,
    hints: ['Jede Zahl auf dem Würfel hat die gleiche Chance.', 'Zähle für A und für B, wie viele Zahlen passen.'],
    steps: [fit('A', e1), fit('B', e2), conclusion('A', 'B', n1, n2)],
    praise: 'Du hast die passenden Zahlen gezählt und verglichen.',
    srText: speech(context, prompt, answer.options.map((o) => o.label).join(' Oder: ')),
  });
}

// ─── Stufe 2 ─────────────────────────────────────────────────────────────────

type PairType = 'gleiche-summe' | 'gleich-viele' | 'mehr-weniger' | 'doppelt';

interface Pair {
  type: PairType;
  a: [number, number];
  b: [number, number];
}

/** Two compositions (target, other) whose chances can be compared by counting alone. */
export function makePair(rng: Rng, maxTotal: number): Pair {
  const type = rng.pick<PairType>(['gleiche-summe', 'gleiche-summe', 'gleich-viele', 'gleich-viele', 'mehr-weniger', 'doppelt']);
  if (type === 'gleiche-summe') {
    const t = rng.int(4, maxTotal);
    const [r1, r2] = rng.sample(Array.from({ length: t - 1 }, (_, i) => i + 1), 2);
    return { type, a: [r1, t - r1], b: [r2, t - r2] };
  }
  if (type === 'gleich-viele') {
    const r = rng.int(1, Math.floor(maxTotal / 2));
    const [o1, o2] = rng.sample(Array.from({ length: maxTotal - r }, (_, i) => i + 1), 2);
    return { type, a: [r, o1], b: [r, o2] };
  }
  if (type === 'mehr-weniger') {
    const r1 = rng.int(2, Math.floor(maxTotal / 2));
    const r2 = rng.int(1, r1 - 1);
    const o1 = rng.int(1, Math.max(1, maxTotal - r1 - 1));
    const o2 = rng.int(o1 + 1, Math.max(o1 + 1, maxTotal - r2));
    return rng.chance(0.5) ? { type, a: [r1, o1], b: [r2, o2] } : { type, a: [r2, o2], b: [r1, o1] };
  }
  const maxPart = maxTotal >= 12 ? 3 : 2;
  const r = rng.int(1, maxPart);
  const o = rng.int(1, maxPart);
  const small: [number, number] = [r, o];
  const big: [number, number] = [2 * r, 2 * o];
  return rng.chance(0.5) ? { type, a: small, b: big } : { type, a: big, b: small };
}

/** Which side has the larger chance: 0 = A, 1 = B, 2 = gleich. Cross-multiplication (only used to check the counted reasoning). */
export function better(p: Pair): 0 | 1 | 2 {
  const lhs = p.a[0] * (p.b[0] + p.b[1]);
  const rhs = p.b[0] * (p.a[0] + p.a[1]);
  return lhs > rhs ? 0 : lhs < rhs ? 1 : 2;
}

function twoDevices(rng: Rng): Exercise {
  const spinner = rng.chance(0.4);
  const p = makePair(rng, spinner ? 8 : 16);
  const [c, d] = rng.sample(COLORS.slice(0, 4), 2);
  const groupsOf = (x: [number, number]): BallGroup[] => [
    { color: c, count: x[0] },
    { color: d, count: x[1] },
  ];
  const vis = (x: [number, number]): Visual => (spinner ? { type: 'spinner', sectors: arrangeSectors(rng, groupsOf(x)) } : { type: 'bag', balls: groupsOf(x) });
  const noun = spinner ? 'Glücksrad' : 'Säckchen';
  const unit = spinner ? 'Felder' : 'Kugeln';
  const vA = vis(p.a);
  const vB = vis(p.b);
  const best = better(p);
  const target = spinner ? `der Zeiger auf ${COLOR_NOUN[c]} stehen bleibt` : `du eine ${adjE(c)} Kugel ziehst`;
  const prompt = `Bei welchem ${noun} ist es wahrscheinlicher, dass ${target}?`;
  const why: Record<PairType, string> = {
    'gleiche-summe': `Beide haben gleich viele ${unit}. Wo sind mehr ${spinner ? `Felder mit ${COLOR_NOUN[c]}` : `${adjE(c)} Kugeln`}?`,
    'gleich-viele': `Bei beiden sind es gleich viele ${spinner ? `Felder mit ${COLOR_NOUN[c]}` : `${adjE(c)} Kugeln`}. Wo sind weniger andere ${unit} dabei?`,
    'mehr-weniger': `Vergleiche beide Farben: Wo sind mehr ${spinner ? `Felder mit ${COLOR_NOUN[c]}` : `${adjE(c)} Kugeln`} und weniger andere?`,
    doppelt: `Bei einem ist von jeder Farbe doppelt so viel. Das ändert die Chance nicht.`,
  };
  const options: Opt[] = [
    { label: `${noun} A`, visual: vA, whyWrong: best === 2 ? why.doppelt : why[p.type] },
    { label: `${noun} B`, visual: vB, whyWrong: best === 2 ? why.doppelt : why[p.type] },
    { label: 'Bei beiden ist es gleich wahrscheinlich.', whyWrong: 'Zähle bei beiden die Farben und vergleiche genau.' },
  ];
  const answer = fixedChoice(options, best, 'grid');
  const share = (x: [number, number]) => `${fmt(x[0])} von ${fmt(x[0] + x[1])} ${spinner ? 'Feldern' : 'Kugeln'} ${x[0] === 1 ? 'ist' : 'sind'} ${COLOR_WORD[c]}`;
  const targetThings = spinner ? `Felder mit ${COLOR_NOUN[c]}` : `${adjE(c)} Kugeln`;
  const reason: Record<PairType, string> = {
    'gleiche-summe': `Beide haben ${fmt(p.a[0] + p.a[1])} ${unit}. Mehr ${spinner ? `Felder mit ${COLOR_NOUN[c]}` : `${adjE(c)} Kugeln`} bedeuten größere Chancen.`,
    'gleich-viele': `Bei beiden gibt es gleich viele ${targetThings}. Weniger andere ${unit} bedeuten größere Chancen.`,
    'mehr-weniger': `Bei einem gibt es mehr ${targetThings} und weniger andere ${unit}. Dort sind die Chancen größer.`,
    doppelt: 'Bei einem ist von jeder Farbe doppelt so viel. Die Chancen sind gleich groß.',
  };
  return makeExercise(SKILL, 2, ['vergleich', spinner ? 'rad' : 'sack', p.type, p.a.join('-'), p.b.join('-'), c, d], {
    ab: 2,
    prompt,
    emoji: spinner ? '🎡' : '👝',
    answer,
    hints: [`Zähle bei beiden: Wie viele ${unit} sind ${COLOR_WORD[c]}, wie viele haben eine andere Farbe?`, `Vergleiche zuerst die ${targetThings}, dann die anderen ${unit}.`],
    steps: [`${noun} A: ${share(p.a)}.`, `${noun} B: ${share(p.b)}.`, reason[p.type], best === 2 ? 'Bei beiden ist es gleich wahrscheinlich.' : `Bei ${noun} ${best === 0 ? 'A' : 'B'} ist es wahrscheinlicher.`],
    praise: 'Du hast beide Farben in beiden Bildern verglichen.',
    srText: speech(`${noun} A: ${describeVisual(vA)} ${noun} B: ${describeVisual(vB)}`, prompt),
  });
}

function fairGame(rng: Rng): Exercise {
  const spinner = rng.chance(0.5);
  const [p1, p2] = rng.pick(PLAYERS);
  const [c1, c2, c3] = rng.sample(COLORS.slice(0, 4), 3);
  const fair = rng.chance(0.4);
  // Glücksrad: at most 3 + 3 + 2 = 8 Felder.
  const max = spinner ? 3 : 8;
  const n1 = rng.int(1, max);
  const n2 = fair ? n1 : rng.pick(Array.from({ length: max }, (_, i) => i + 1).filter((x) => x !== n1));
  const n3 = rng.chance(0.4) ? rng.int(1, 2) : 0;
  const g: BallGroup[] = [
    { color: c1, count: n1 },
    { color: c2, count: n2 },
    ...(n3 ? [{ color: c3, count: n3 }] : []),
  ];
  const visual: Visual = spinner ? { type: 'spinner', sectors: arrangeSectors(rng, g) } : { type: 'bag', balls: g };
  const action = spinner ? 'gedreht' : 'gezogen';
  const context = `${p1} gewinnt bei ${COLOR_NOUN[c1]}. ${p2} gewinnt bei ${COLOR_NOUN[c2]}.${n3 ? ` Bei ${COLOR_NOUN[c3]} wird noch einmal ${action}.` : ''}`;
  const prompt = 'Ist das Spiel fair?';
  const unit = spinner ? 'Felder' : 'Kugeln';
  const correct = n1 === n2 ? 0 : n1 > n2 ? 1 : 2;
  const answer = fixedChoice(
    [
      { label: 'Ja, beide haben gleich große Chancen.', whyWrong: `Beide können gewinnen. Aber haben beide gleich viele ${unit}?` },
      { label: `Nein, ${p1} hat größere Chancen.`, whyWrong: n1 === n2 ? `Zähle noch einmal: ${COLOR_NOUN[c1]} und ${COLOR_NOUN[c2]} kommen gleich oft vor.` : `Zähle die ${unit} für ${COLOR_NOUN[c1]} und für ${COLOR_NOUN[c2]} noch einmal.` },
      { label: `Nein, ${p2} hat größere Chancen.`, whyWrong: n1 === n2 ? `Zähle noch einmal: ${COLOR_NOUN[c1]} und ${COLOR_NOUN[c2]} kommen gleich oft vor.` : `Zähle die ${unit} für ${COLOR_NOUN[c1]} und für ${COLOR_NOUN[c2]} noch einmal.` },
    ],
    correct,
  );
  const count = (c: ColorName, n: number) => (spinner ? fields(n, c) : balls(n, c));
  return makeExercise(SKILL, 2, ['fair', spinner ? 'rad' : 'sack', g.map((x) => `${x.color}${x.count}`).join('-'), p1, visual.type === 'spinner' ? visual.sectors.join('') : 's'], {
    ab: 2,
    context,
    prompt,
    visual,
    emoji: spinner ? '🎡' : '👝',
    answer,
    hints: ['Fair heißt: Beide haben gleich große Chancen.', `Zähle die ${unit} für ${p1} und für ${p2}.`],
    steps: [
      `Für ${p1}: ${count(c1, n1)}. Für ${p2}: ${count(c2, n2)}.`,
      ...(n3 ? [`${cap(count(c3, n3))} zählt für niemanden.`] : []),
      n1 === n2 ? 'Beide haben gleich viele. Das Spiel ist fair.' : `${n1 > n2 ? p1 : p2} hat mehr ${unit}. Das Spiel ist nicht fair.`,
    ],
    praise: 'Du hast die Chancen beider Kinder verglichen.',
    srText: speech(describeVisual(visual), context, prompt),
  });
}

// ─── Stufe 3 ─────────────────────────────────────────────────────────────────

type ChangeKind = 'dazu-mehr' | 'dazu-gleich' | 'weg-mehr';

function changeBag(rng: Rng): Exercise {
  const kind = rng.pick<ChangeKind>(['dazu-mehr', 'dazu-gleich', 'weg-mehr']);
  const [c1, c2, c3] = rng.sample(COLORS.slice(0, 4), 3);
  const r = rng.int(1, 6);
  const b = rng.int(r + 1, Math.min(12, r + 7));
  const extra = rng.chance(0.4) ? rng.int(1, 3) : 0;
  const g: BallGroup[] = [
    { color: c1, count: r },
    { color: c2, count: b },
    ...(extra ? [{ color: c3, count: extra }] : []),
  ];
  const visual: Visual = { type: 'bag', balls: g };
  const X = COLOR_NOUN[c1];
  const Y = COLOR_NOUN[c2];
  const diff = b - r;
  const answer = kind === 'dazu-gleich' ? diff : diff + 1;
  const goal = kind === 'dazu-gleich' ? `${X} und ${Y} gleich wahrscheinlich sind` : `${X} wahrscheinlicher ist als ${Y}`;
  // 'mindestens' only where more would also work ('wahrscheinlicher'); 'gleich wahrscheinlich' needs exactly diff balls.
  const action =
    kind === 'weg-mehr'
      ? `${adjE(c2)} Kugeln musst du mindestens herausnehmen`
      : `${adjE(c1)} Kugeln musst du ${kind === 'dazu-mehr' ? 'mindestens ' : ''}dazulegen`;
  const context = `Im Säckchen sind ${bagText(g)}.`;
  const prompt = `Wie viele ${action}, damit ${goal}?`;
  const after = kind === 'weg-mehr' ? [r, b - answer] : [r + answer, b];
  return makeExercise(SKILL, 3, ['aendern', kind, `${c1}${r}`, `${c2}${b}`, extra ? `${c3}${extra}` : 'x'], {
    ab: 3,
    knobel: true,
    context,
    prompt,
    visual,
    emoji: '👝',
    answer: { kind: 'number', value: answer, unit: 'Kugeln', label: 'Anzahl der Kugeln' },
    hints: [`Vergleiche die Anzahl der ${adjEn(c1)} und der ${adjEn(c2)} Kugeln.`, kind === 'dazu-gleich' ? 'Gleich wahrscheinlich heißt: gleich viele Kugeln von beiden Farben.' : `Wahrscheinlicher heißt: mehr ${adjE(c1)} als ${adjE(c2)} Kugeln.`],
    steps: [
      `Jetzt: ${balls(r, c1)} und ${balls(b, c2)}. Der Unterschied ist ${fmt(b)} − ${fmt(r)} = ${fmt(diff)}.`,
      kind === 'dazu-gleich'
        ? `Legst du ${balls(diff, c1)} dazu, sind es gleich viele.`
        : `Mit ${fmt(diff)} ${diff === 1 ? 'Kugel' : 'Kugeln'} wären es gleich viele. Für „wahrscheinlicher“ brauchst du noch eine: ${fmt(diff)} + 1 = ${fmt(answer)}.`,
      `Danach: ${balls(after[0], c1)} und ${balls(after[1], c2)}. ${kind === 'dazu-gleich' ? `${X} und ${Y} sind gleich wahrscheinlich.` : `${X} ist wahrscheinlicher als ${Y}.`}`,
    ],
    bugs: numberBugs(answer, [
      kind === 'dazu-gleich'
        ? ['eine-zu-viel', diff + 1, `Dann wäre ${X} schon wahrscheinlicher als ${Y}. Gesucht ist gleich wahrscheinlich.`]
        : ['nur-gleich', diff, `Dann sind es gleich viele. Für „wahrscheinlicher“ brauchst du eine Kugel mehr.`],
      ['anzahl-andere', b, `So viele ${adjE(c2)} Kugeln sind im Säckchen. Es reicht, den Unterschied auszugleichen.`],
      kind === 'weg-mehr' ? null : ['alle-zusammen', r + b, 'So viele brauchst du nicht. Vergleiche nur die beiden Farben.'],
    ]),
    praise: 'Du hast den Unterschied ausgeglichen und genau überlegt, ob noch eine Kugel fehlt.',
    srText: speech(context, prompt),
  });
}

function diceFair(rng: Rng): Exercise {
  const [p1, p2] = rng.pick(PLAYERS);
  const trap = rng.chance(0.25);
  let A: number[];
  let B: number[];
  if (trap) {
    // Kids often think a 6 is harder to throw.
    A = [6];
    B = [rng.int(1, 5)];
    if (rng.chance(0.5)) [A, B] = [B, A];
  } else {
    const nums = rng.shuffle([1, 2, 3, 4, 5, 6]);
    const sa = rng.int(1, 4);
    const sb = rng.chance(0.4) ? Math.min(sa, 6 - sa) : rng.int(1, 6 - sa);
    A = nums.slice(0, sa).sort((x, y) => x - y);
    B = nums.slice(sa, sa + sb).sort((x, y) => x - y);
  }
  const rest = [1, 2, 3, 4, 5, 6].filter((x) => !A.includes(x) && !B.includes(x));
  const context = `${p1} gewinnt bei ${listDe(A.map(String), 'oder')}. ${p2} gewinnt bei ${listDe(B.map(String), 'oder')}.${rest.length ? ` Bei ${listDe(rest.map(String), 'oder')} wird noch einmal gewürfelt.` : ''}`;
  const prompt = 'Ist das Spiel fair?';
  const fair = A.length === B.length;
  const bigger = A.length > B.length ? p1 : p2;
  const correct: Opt = fair ? { label: 'Ja. Beide haben gleich viele Zahlen.' } : { label: `Nein. ${bigger} hat mehr Zahlen, also größere Chancen.` };
  const wrong: Opt[] = [];
  if (!fair) wrong.push({ label: 'Ja. Beide können gewinnen.', whyWrong: 'Beide können gewinnen. Aber haben beide gleich viele Zahlen?' });
  if (fair) wrong.push({ label: `Nein. ${p1} hat größere Chancen.`, whyWrong: 'Zähle die Zahlen von beiden. Jede Zahl kommt beim Würfeln gleich oft vor.' });
  if (A.includes(6) || B.includes(6)) {
    wrong.push({ label: 'Nein. Eine 6 ist schwerer zu würfeln.', whyWrong: 'Jede Zahl auf dem Würfel hat die gleiche Chance. Die 6 ist nicht seltener.' });
  }
  wrong.push({ label: 'Nein. Wer die größeren Zahlen hat, gewinnt öfter.', whyWrong: 'Große Zahlen kommen nicht seltener oder öfter. Es zählt, wie viele Zahlen jeder hat.' });
  if (!fair) wrong.push({ label: `Nein. ${bigger === p1 ? p2 : p1} hat größere Chancen.`, whyWrong: 'Zähle die Zahlen von beiden noch einmal.' });
  const answer = shuffledChoice(rng, correct, wrong, 4);
  return makeExercise(SKILL, 3, ['wuerfelspiel', A.join(''), B.join(''), p1, answer.correct], {
    ab: 3,
    knobel: true,
    context,
    prompt,
    visual: { type: 'dice', values: [1, 2, 3, 4, 5, 6] },
    emoji: '🎲',
    answer,
    hints: ['Jede Zahl auf dem Würfel kommt gleich oft vor.', `Zähle: Bei wie vielen Zahlen gewinnt ${p1}, bei wie vielen ${p2}?`],
    steps: [
      `${p1} gewinnt bei ${fmt(A.length)} ${A.length === 1 ? 'Zahl' : 'Zahlen'}. ${p2} gewinnt bei ${fmt(B.length)} ${B.length === 1 ? 'Zahl' : 'Zahlen'}.`,
      'Jede Zahl hat die gleiche Chance – auch die 6.',
      fair ? 'Beide haben gleich viele Zahlen. Das Spiel ist fair.' : `${bigger} hat mehr Zahlen. Das Spiel ist nicht fair.`,
    ],
    praise: 'Du hast mit der Anzahl der Zahlen begründet.',
    srText: speech(context, prompt),
  });
}

function makeFair(rng: Rng): Exercise {
  const [p1, p2] = rng.pick(PLAYERS);
  const [c1, c2, c3] = rng.sample(COLORS.slice(0, 4), 3);
  const b = rng.int(1, 6);
  const d = rng.int(1, 3);
  const r = b + d;
  const g: BallGroup[] = [
    { color: c1, count: r },
    { color: c2, count: b },
  ];
  const visual: Visual = { type: 'bag', balls: g };
  const context = `${p1} gewinnt bei einer ${adjEn(c1)} Kugel. ${p2} gewinnt bei einer ${adjEn(c2)} Kugel.`;
  const prompt = 'Was macht das Spiel fair?';
  const add = (n: number, c: ColorName) => `${n === 1 ? 'Eine' : fmt(n)} ${adjE(c)} ${n === 1 ? 'Kugel' : 'Kugeln'} dazulegen.`;
  const answer = shuffledChoice(
    rng,
    { label: add(d, c2) },
    [
      { label: add(d, c1), whyWrong: `Dann hat ${COLOR_NOUN[c1]} noch mehr Kugeln.` },
      { label: add(d + 1, c2), whyWrong: `Dann hat ${COLOR_NOUN[c2]} mehr Kugeln als ${COLOR_NOUN[c1]}. ${p2} hätte größere Chancen.` },
      { label: `Eine ${adjE(c3)} Kugel dazulegen.`, whyWrong: `Eine ${adjE(c3)} Kugel ändert nichts am Unterschied zwischen ${COLOR_NOUN[c1]} und ${COLOR_NOUN[c2]}.` },
    ],
    4,
  );
  return makeExercise(SKILL, 3, ['fair-machen', `${c1}${r}`, `${c2}${b}`, c3, p1, answer.correct], {
    ab: 3,
    knobel: true,
    context,
    prompt,
    visual,
    emoji: '👝',
    answer,
    hints: ['Fair heißt: Beide Farben haben gleich viele Kugeln.', `Wie viele ${adjE(c2)} Kugeln fehlen bis zur Anzahl der ${adjEn(c1)} Kugeln?`],
    steps: [`Jetzt: ${balls(r, c1)} und ${balls(b, c2)}.`, `Es fehlen ${fmt(d)} ${adjE(c2)} ${d === 1 ? 'Kugel' : 'Kugeln'}: ${fmt(b)} + ${fmt(d)} = ${fmt(r)}.`, `Dann sind ${COLOR_NOUN[c1]} und ${COLOR_NOUN[c2]} gleich wahrscheinlich. Das Spiel ist fair.`],
    praise: 'Du hast die Chancen gleich gemacht, indem du die Anzahlen ausgeglichen hast.',
    srText: speech(`Im Säckchen sind ${bagText(g)}.`, context, prompt),
  });
}

function generate(rng: Rng, stufe: Stufe): Exercise {
  if (stufe === 1) return rng.chance(0.7) ? colourCompare(rng) : diceCompare(rng);
  if (stufe === 2) return rng.chance(0.6) ? twoDevices(rng) : fairGame(rng);
  const roll = rng.next();
  if (roll < 0.4) return changeBag(rng);
  if (roll < 0.75) return diceFair(rng);
  return makeFair(rng);
}

export const chancenSkill: SkillDef = {
  id: SKILL.id,
  topicId: 'daten',
  title: 'Chancen vergleichen',
  description: 'Du vergleichst Chancen durch Zählen und prüfst, ob ein Spiel fair ist.',
  stufen: {
    1: 'Was ist wahrscheinlicher? Zählen und vergleichen',
    2: 'Zwei Säckchen vergleichen, faire Spiele',
    3: 'Säckchen verändern und Spiele fair machen',
  },
  kmk: SKILL.kmk,
  generate,
};
