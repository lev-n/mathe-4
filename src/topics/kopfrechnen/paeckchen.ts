import { BOX, fmt, MINUS, PLUS, TIMES, toSpeech } from '../../core/format';
import type { Exercise, Rng, SkillDef, Stufe, Visual } from '../../core/types';
import { bugList, choiceAnswer, type WrongOption } from '../zahlen/shared';

const ID = 'kopfrechnen.paeckchen';
const KMK = ['MS.muster', 'ZO.strategien'];

function base(stufe: Stufe, ab: 1 | 2 | 3, key: string) {
  return { key: `${ID}:${stufe}:${key}`, topicId: 'kopfrechnen' as const, skillId: ID, stufe, ab, kmk: KMK };
}

type Op = '+' | '-' | '*';
export interface Row {
  a: number;
  op: Op;
  b: number;
}

const SYM: Record<Op, string> = { '+': PLUS, '-': MINUS, '*': TIMES };
export const evalRow = (r: Row) => (r.op === '+' ? r.a + r.b : r.op === '-' ? r.a - r.b : r.a * r.b);
const show = (r: Row) => `${fmt(r.a)} ${SYM[r.op]} ${fmt(r.b)}`;

function table(rows: Row[], hideLast: boolean): Visual {
  return {
    type: 'table',
    caption: 'Päckchen',
    header: ['Aufgabe', 'Ergebnis'],
    rows: rows.map((r, i) => [show(r), hideLast && i === rows.length - 1 ? BOX : fmt(evalRow(r))]),
  };
}

/** Patterns of Päckchen. Each returns rows (the last one is asked). */
export type Pattern = 'mal-null' | 'plus-zehn' | 'minus-hundert' | 'faktor-plus' | 'neuner' | 'tausend-minus' | 'summe-gleich';

export function rowsFor(pattern: Pattern, a: number, b: number, count = 4): Row[] {
  return Array.from({ length: count }, (_, i): Row => {
    switch (pattern) {
      case 'mal-null':
        return { a, op: '*', b: b * 10 ** i };
      case 'plus-zehn':
        return { a: a + 10 * i, op: '+', b };
      case 'minus-hundert':
        return { a: a + 100 * i, op: '-', b };
      case 'faktor-plus':
        return { a, op: '*', b: b * (i + 1) };
      case 'neuner':
        return { a, op: '*', b: 10 ** (i + 1) - 1 };
      case 'tausend-minus':
        return { a: a * (i + 1), op: '-', b: b * (i + 1) };
      case 'summe-gleich':
        return { a: a - i, op: '+', b: b + i };
    }
  });
}

/** How the rows change, with the child's numbers (first step of the worked solution). */
export function rule(pattern: Pattern, a: number, b: number): string {
  switch (pattern) {
    case 'mal-null':
      return 'Der zweite Faktor bekommt jedes Mal eine Null mehr. Das Ergebnis auch.';
    case 'plus-zehn':
      return 'Die erste Zahl wird immer um 10 größer. Das Ergebnis auch.';
    case 'minus-hundert':
      return 'Die erste Zahl wird immer um 100 größer. Das Ergebnis auch.';
    case 'faktor-plus':
      return `Der zweite Faktor wird immer um ${fmt(b)} größer. Das Ergebnis wird also immer um ${fmt(a)} ${TIMES} ${fmt(b)} = ${fmt(a * b)} größer.`;
    case 'neuner':
      return 'Der zweite Faktor bekommt jedes Mal eine 9 mehr.';
    case 'tausend-minus':
      return `Die erste Zahl wird immer um ${fmt(a)} größer, die zweite immer um ${fmt(b)}. Das Ergebnis wird also immer um ${fmt(a)} ${MINUS} ${fmt(b)} = ${fmt(a - b)} größer.`;
    case 'summe-gleich':
      return 'Die eine Zahl wird um 1 kleiner, die andere um 1 größer. Das Ergebnis bleibt gleich.';
  }
}

export function fortsetzen(pattern: Pattern, a: number, b: number, stufe: Stufe): Exercise {
  const rows = rowsFor(pattern, a, b);
  const last = rows[rows.length - 1];
  const prev = rows[rows.length - 2];
  const v = evalRow(last);
  const prevV = evalRow(prev);
  const diff = prevV - evalRow(rows[rows.length - 3]);
  return {
    ...base(stufe, stufe === 1 ? 1 : 2, `${pattern}:${a}:${b}`),
    prompt: 'Setze das Päckchen fort. Wie heißt das Ergebnis der letzten Aufgabe?',
    visual: table(rows, true),
    expression: `${show(last)} = ${BOX}`,
    answer: { kind: 'number', value: v, label: 'Ergebnis' },
    hints: [
      'Vergleiche die Aufgaben: Was verändert sich von Zeile zu Zeile?',
      pattern === 'neuner' ? `${fmt(last.b)} ist ${fmt(last.b + 1)} ${MINUS} 1. Rechne mit ${fmt(last.b + 1)} und nimm dann einmal ${fmt(a)} weg.` : 'Wie verändert sich dann das Ergebnis?',
    ],
    steps: [
      rule(pattern, a, b),
      `${show(prev)} = ${fmt(prevV)}`,
      // Neuner: the row itself does not show how to get the result, so the step uses 9999 = 10 000 − 1
      pattern === 'neuner'
        ? `${show(last)} = ${fmt(a)} ${TIMES} ${fmt(last.b + 1)} ${MINUS} ${fmt(a)} = ${fmt(a * (last.b + 1))} ${MINUS} ${fmt(a)} = ${fmt(v)}`
        : `${show(last)} = ${fmt(v)}`,
    ],
    bugs: bugList(v, [
      ['gleicher-schritt', pattern === 'mal-null' || pattern === 'neuner' ? prevV + diff : null, 'Das Ergebnis wächst hier nicht immer um gleich viel. Schau, wie sich die Zahlen verändern.'],
      ['null-zu-wenig', pattern === 'mal-null' ? v / 10 : null, 'Zähle die Nullen: Jede Zeile bekommt eine Null mehr.'],
      ['nicht-veraendert', pattern === 'summe-gleich' ? null : prevV, 'Das ist das Ergebnis der Zeile davor. Die letzte Aufgabe ist anders.'],
    ]),
    praise: 'Du hast das Muster im Päckchen erkannt und genutzt.',
    srText: `Päckchen: ${rows.slice(0, -1).map((r) => `${toSpeech(show(r))} gleich ${evalRow(r)}`).join('. ')}. Wie viel ist ${toSpeech(show(last))}?`,
  };
}

// ─── Stufe 3 ─────────────────────────────────────────────────────────────────

/** 'Welcher Term hat dasselbe Ergebnis wie 6 · 8?' */
export function gleicherTerm(rng: Rng, op: '+' | '*', a: number, b: number, k: number): Exercise {
  const target = op === '+' ? a + b : a * b;
  const sym = SYM[op];
  const t = (x: number, y: number) => `${fmt(x)} ${sym} ${fmt(y)}`;
  const val = (x: number, y: number) => (op === '+' ? x + y : x * y);
  const correct: [number, number] = op === '+' ? [a + k, b - k] : [a / 2, b * 2];
  const cands: [number, number, string][] =
    op === '+'
      ? [
          [a + k, b + k, 'Bei Plus darfst du nicht beide Zahlen größer machen.'],
          [a + k, b, 'Du hast nur eine Zahl verändert.'],
          [a - k, b - k, 'Wenn beide Zahlen kleiner werden, wird die Summe kleiner.'],
        ]
      : [
          [a - 1, b + 1, 'Bei Mal klappt das Ausgleichen um 1 nicht. Das Ergebnis ändert sich.'],
          [a * 2, b * 2, 'Wenn du beide Faktoren verdoppelst, wird das Ergebnis viermal so groß.'],
          [a / 2, b / 2, 'Wenn du beide Faktoren halbierst, wird das Ergebnis viel kleiner.'],
          [a + 2, b - 2, 'Bei Mal reicht es nicht, auszugleichen wie bei Plus.'],
        ];
  const wrong: WrongOption[] = cands
    .filter(([x, y]) => Number.isInteger(x) && Number.isInteger(y) && x > 0 && y > 0 && val(x, y) !== target)
    .map(([x, y, why]) => ({ label: t(x, y), whyWrong: `${t(x, y)} = ${fmt(val(x, y))}. ${why}` }));
  return {
    ...base(3, 3, `gleich:${op}:${a}:${b}:${k}`),
    prompt: `Welcher Term hat dasselbe Ergebnis wie ${t(a, b)}?`,
    answer: choiceAnswer(rng, t(...correct), wrong),
    hints: [op === '+' ? 'Bei Plus: Was eine Zahl mehr bekommt, gibt die andere ab.' : 'Bei Mal: Halbierst du einen Faktor, musst du den anderen verdoppeln.', 'Rechne zur Probe jeden Term aus.'],
    steps: [
      op === '+' ? `${fmt(a)} ${PLUS} ${k} und ${fmt(b)} ${MINUS} ${k}: gegensinnig verändert.` : `${fmt(a)} halbiert und ${fmt(b)} verdoppelt.`,
      `${t(...correct)} = ${fmt(target)} und ${t(a, b)} = ${fmt(target)}`,
    ],
    praise: op === '+' ? 'Du weißt: Bei Plus bleibt die Summe gleich, wenn du gegensinnig veränderst.' : 'Du weißt: Halbieren und Verdoppeln lässt das Produkt gleich.',
    srText: `Welcher Term hat dasselbe Ergebnis wie ${toSpeech(t(a, b))}?`,
    knobel: true,
  };
}

/** '6 · 8 = 3 · □' (halve a → double b) or '6 · 8 = 12 · □' (double a → halve b). */
export function termErgaenzen(a: number, b: number, dir: 'halb' | 'doppelt'): Exercise {
  const na = dir === 'halb' ? a / 2 : a * 2;
  const value = dir === 'halb' ? b * 2 : b / 2;
  const expr = `${a} ${TIMES} ${b} = ${na} ${TIMES} ${BOX}`;
  return {
    ...base(3, 2, `term:${a}:${b}:${dir}`),
    prompt: 'Welche Zahl gehört in die Lücke? Beide Seiten sollen gleich sein.',
    expression: expr,
    answer: { kind: 'number', value, label: 'Zahl in der Lücke' },
    hints: [`Aus ${a} wird ${na}. Was passiert mit dem ersten Faktor?`, 'Der andere Faktor muss sich genau umgekehrt verändern.'],
    steps: [`${a} ${dir === 'halb' ? 'halbiert' : 'verdoppelt'} ist ${na}.`, `Also ${dir === 'halb' ? 'verdoppelst' : 'halbierst'} du ${b}: ${value}.`, `${a} ${TIMES} ${b} = ${a * b} und ${na} ${TIMES} ${value} = ${na * value}`],
    bugs: bugList(value, [
      ['gleichsinnig', dir === 'halb' ? (b % 2 === 0 ? b / 2 : null) : b * 2, 'Du hast beide Faktoren gleich verändert. Der zweite muss sich umgekehrt verändern.'],
      ['plus-ausgleich', dir === 'halb' ? b + (a - na) : b - (na - a) > 0 ? b - (na - a) : null, 'Ausgleichen wie bei Plus klappt bei Mal nicht. Verdopple oder halbiere.'],
    ]),
    praise: 'Du hast gegensinnig verdoppelt und halbiert.',
    srText: `${toSpeech(expr)}. Welche Zahl gehört in die Lücke?`,
  };
}

/** Explain how the result of a Päckchen changes. */
export function musterErklaeren(rng: Rng, kind: 'verdoppeln' | 'summe' | 'differenz', a: number, b: number): Exercise {
  const rows: Row[] =
    kind === 'verdoppeln'
      ? [0, 1, 2].map((i) => ({ a, op: '*', b: b * 2 ** i }))
      : kind === 'summe'
        ? [0, 1, 2].map((i) => ({ a: a - i, op: '+', b: b + i }))
        : [0, 1, 2].map((i) => ({ a: a + i, op: '-', b: b + i }));
  const r = rows.map(evalRow);
  let correct: string;
  let wrong: WrongOption[];
  if (kind === 'verdoppeln') {
    correct = 'Es verdoppelt sich, weil der zweite Faktor sich verdoppelt.';
    wrong = [
      { label: `Es wird immer um ${fmt(r[0])} größer.`, whyWrong: `Prüfe: ${fmt(r[1])} ${PLUS} ${fmt(r[0])} = ${fmt(r[1] + r[0])}, aber das nächste Ergebnis ist ${fmt(r[2])}.` },
      { label: 'Es wird immer um 2 größer.', whyWrong: `Vergleiche ${fmt(r[0])} und ${fmt(r[1])}. Der Unterschied ist größer als 2.` },
      { label: 'Es bleibt gleich, weil der erste Faktor gleich bleibt.', whyWrong: 'Rechne die Ergebnisse aus. Sie sind verschieden.' },
    ];
  } else if (kind === 'summe') {
    correct = 'Es bleibt gleich: Eine Zahl wird um 1 kleiner, die andere um 1 größer.';
    wrong = [
      { label: 'Es wird immer um 1 kleiner, weil die erste Zahl kleiner wird.', whyWrong: 'Rechne die Ergebnisse aus. Die zweite Zahl wird größer und gleicht aus.' },
      { label: 'Es wird immer um 2 größer.', whyWrong: `Rechne nach: ${show(rows[0])} = ${fmt(r[0])} und ${show(rows[1])} = ${fmt(r[1])}.` },
      { label: 'Es bleibt gleich, weil beide Zahlen größer werden.', whyWrong: 'Schau genau: Die erste Zahl wird kleiner.' },
    ];
  } else {
    correct = 'Es bleibt gleich, weil beide Zahlen um 1 größer werden.';
    wrong = [
      { label: 'Es wird immer um 2 größer, weil beide Zahlen größer werden.', whyWrong: `Rechne nach: ${show(rows[0])} = ${fmt(r[0])} und ${show(rows[1])} = ${fmt(r[1])}.` },
      { label: 'Es wird immer um 1 größer.', whyWrong: 'Bei Minus heben sich gleiche Veränderungen auf.' },
      { label: 'Es bleibt gleich, weil eine Zahl kleiner und die andere größer wird.', whyWrong: 'Schau genau: Beide Zahlen werden größer.' },
    ];
  }
  return {
    ...base(3, 3, `erklaeren:${kind}:${a}:${b}`),
    kmk: [...KMK, 'PK.argumentieren'],
    prompt: 'Wie verändert sich das Ergebnis von Aufgabe zu Aufgabe? Wähle die richtige Begründung.',
    visual: table(rows, false),
    answer: choiceAnswer(rng, correct, wrong),
    hints: ['Vergleiche die Zahlen in zwei Zeilen untereinander.', 'Rechne die Ergebnisse aus und vergleiche sie.'],
    steps: [...rows.map((row, i) => `${show(row)} = ${fmt(r[i])}`), correct],
    praise: 'Du hast das Muster mit den Zahlen begründet.',
    srText: `Päckchen: ${rows.map((row, i) => `${toSpeech(show(row))} gleich ${r[i]}`).join('. ')}. Wie verändert sich das Ergebnis? Wähle die richtige Begründung.`,
    knobel: true,
  };
}

// ─── Generator ───────────────────────────────────────────────────────────────

function generate(rng: Rng, stufe: Stufe): Exercise {
  if (stufe === 1) {
    const p = rng.pick(['mal-null', 'plus-zehn', 'minus-hundert'] as const);
    if (p === 'mal-null') return fortsetzen(p, rng.int(2, 9), rng.int(2, 9), 1);
    if (p === 'plus-zehn') return fortsetzen(p, rng.int(1, 9), rng.int(3, 9), 1);
    return fortsetzen(p, rng.int(1, 9) * 10, rng.int(3, 9), 1);
  }
  if (stufe === 2) {
    const p = rng.pick(['faktor-plus', 'neuner', 'tausend-minus', 'summe-gleich'] as const);
    if (p === 'faktor-plus') return fortsetzen(p, rng.pick([25, 50, 20, 15, 12]), rng.int(2, 9), 2);
    if (p === 'neuner') return fortsetzen(p, rng.int(2, 9), 9, 2);
    if (p === 'tausend-minus') return fortsetzen(p, rng.pick([1000, 10_000, 100]), rng.int(1, 9), 2);
    return fortsetzen(p, rng.int(40, 90), rng.int(11, 39), 2);
  }
  const v = rng.pick(['gleich', 'gleich', 'term', 'erklaeren'] as const);
  if (v === 'gleich') {
    if (rng.chance(0.5)) return gleicherTerm(rng, '+', rng.int(21, 89), rng.int(21, 89), rng.int(1, 4));
    return gleicherTerm(rng, '*', 2 * rng.int(2, 6), rng.int(3, 9), 0);
  }
  if (v === 'term') {
    const dir = rng.chance(0.5) ? 'halb' : 'doppelt';
    return dir === 'halb' ? termErgaenzen(2 * rng.int(2, 9), rng.int(3, 12), 'halb') : termErgaenzen(rng.int(2, 9), 2 * rng.int(2, 9), 'doppelt');
  }
  const kind = rng.pick(['verdoppeln', 'summe', 'differenz'] as const);
  if (kind === 'verdoppeln') return musterErklaeren(rng, kind, rng.int(3, 9), rng.int(2, 5));
  return musterErklaeren(rng, kind, rng.int(30, 90), rng.int(11, 29));
}

export const paeckchenSkill: SkillDef = {
  id: ID,
  topicId: 'kopfrechnen',
  title: 'Päckchen und Muster',
  description: 'Du setzt strukturierte Päckchen fort und findest Terme mit gleichem Ergebnis.',
  stufen: {
    1: 'Einfache Päckchen fortsetzen',
    2: 'Päckchen mit zwei Veränderungen fortsetzen',
    3: 'Gleiche Terme finden und Muster begründen',
  },
  kmk: KMK,
  generate,
};
