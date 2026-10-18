import { BOX, fmt, MINUS, PLUS, TIMES, toSpeech } from '../../core/format';
import type { Exercise, Rng, SkillDef, Stufe } from '../../core/types';
import { bugList, choiceAnswer, type WrongOption } from '../zahlen/shared';

const ID = 'kopfrechnen.vorteilhaft';
const KMK = ['ZO.strategien', 'PK.argumentieren'];

function base(stufe: Stufe, ab: 1 | 2 | 3, key: string) {
  return { key: `${ID}:${stufe}:${key}`, topicId: 'kopfrechnen' as const, skillId: ID, stufe, ab, kmk: KMK };
}

/** x + y with x just below a round number r (x = r − d). */
export function ausgleichPlus(x: number, y: number, r: number): Exercise {
  const d = r - x;
  const v = x + y;
  const expr = `${fmt(x)} ${PLUS} ${fmt(y)} = ${BOX}`;
  return {
    ...base(1, 1, `ausgleich:${x}:${y}`),
    prompt: 'Rechne geschickt.',
    expression: expr,
    answer: { kind: 'number', value: v, label: 'Ergebnis' },
    hints: [`${fmt(x)} liegt nah an ${fmt(r)}. Rechne zuerst mit ${fmt(r)}.`, `Du hast dann ${d} zu viel dazugezählt. Gleiche das aus.`],
    steps: [`${fmt(x)} = ${fmt(r)} ${MINUS} ${d}`, `${fmt(r)} ${PLUS} ${fmt(y)} = ${fmt(r + y)}`, `${fmt(r + y)} ${MINUS} ${d} = ${fmt(v)}`],
    bugs: bugList(v, [
      // r + y + d: the child compensated in the wrong direction
      ['verkehrt-ausgeglichen', v + 2 * d, `Du hast die ${d} dazugezählt. Mit ${fmt(r)} hast du aber schon ${d} zu viel gerechnet. Ziehe die ${d} ab.`],
      ['nicht-ausgeglichen', v + d, `Du hast mit ${fmt(r)} gerechnet. Ziehe die ${d} wieder ab.`],
    ]),
    praise: `Du hast mit der glatten Zahl ${fmt(r)} gerechnet und richtig ausgeglichen.`,
    srText: `Rechne geschickt: ${toSpeech(expr.replace(` = ${BOX}`, ''))}.`,
  };
}

/** Three summands where two add up to a round number: 37 + 48 + 63. order = display order of [a, c, b]. */
export function tauschPlus(a: number, b: number, c: number, order: number[]): Exercise {
  const items = [a, c, b];
  const shown = order.map((i) => items[i]);
  const v = a + b + c;
  const expr = `${shown.map((n) => fmt(n)).join(` ${PLUS} `)} = ${BOX}`;
  return {
    ...base(1, 1, `tausch:${shown.join('-')}`),
    prompt: 'Rechne geschickt. Welche Zahlen passen gut zusammen?',
    expression: expr,
    answer: { kind: 'number', value: v, label: 'Ergebnis' },
    hints: ['Suche zwei Zahlen, die zusammen eine glatte Zahl ergeben.', 'Beim Plusrechnen darfst du die Reihenfolge tauschen.'],
    steps: [`${fmt(a)} ${PLUS} ${fmt(b)} = ${fmt(a + b)}`, `${fmt(a + b)} ${PLUS} ${fmt(c)} = ${fmt(v)}`],
    praise: `Du hast ${fmt(a)} und ${fmt(b)} geschickt zusammengefasst.`,
    srText: `Rechne geschickt: ${toSpeech(expr.replace(` = ${BOX}`, ''))}.`,
  };
}

/** Product with a nice pair (2·5, 4·25, 8·125, 20·5, 50·2) and a third factor; order = display order of [p, x, q]. */
export function paarMal(p: number, q: number, x: number, order: number[], stufe: Stufe): Exercise {
  const items = [p, x, q];
  const shown = order.map((i) => items[i]);
  const v = p * q * x;
  const expr = `${shown.map((n) => fmt(n)).join(` ${TIMES} `)} = ${BOX}`;
  return {
    ...base(stufe, stufe === 1 ? 1 : 2, `mal:${shown.join('-')}`),
    prompt: 'Rechne geschickt. Welche Zahlen passen gut zusammen?',
    expression: expr,
    answer: { kind: 'number', value: v, label: 'Ergebnis' },
    hints: ['Beim Malrechnen darfst du die Reihenfolge tauschen.', 'Suche zwei Zahlen, deren Produkt eine Stufenzahl ist: 10, 100 oder 1000.'],
    steps: [`${fmt(p)} ${TIMES} ${fmt(q)} = ${fmt(p * q)}`, `${fmt(p * q)} ${TIMES} ${fmt(x)} = ${fmt(v)}`],
    praise: `Du hast zuerst ${fmt(p)} ${TIMES} ${fmt(q)} gerechnet. Das ist geschickt.`,
    srText: `Rechne geschickt: ${toSpeech(expr.replace(` = ${BOX}`, ''))}.`,
  };
}

/** Konstanz der Differenz: x − y with y = r − d → (x + d) − r. */
export function konstanz(x: number, y: number, r: number): Exercise {
  const d = r - y;
  const v = x - y;
  const expr = `${fmt(x)} ${MINUS} ${fmt(y)} = ${BOX}`;
  return {
    ...base(2, 2, `konstanz:${x}:${y}`),
    prompt: 'Rechne geschickt: Verändere beide Zahlen gleich.',
    expression: expr,
    answer: { kind: 'number', value: v, label: 'Ergebnis' },
    hints: [`Mache aus ${fmt(y)} die glatte Zahl ${fmt(r)}.`, 'Bei Minus veränderst du beide Zahlen gleich. Dann bleibt der Unterschied gleich.'],
    steps: [`Beide Zahlen ${PLUS} ${d}: ${fmt(x)} ${PLUS} ${d} = ${fmt(x + d)} und ${fmt(y)} ${PLUS} ${d} = ${fmt(r)}`, `${fmt(x + d)} ${MINUS} ${fmt(r)} = ${fmt(v)}`],
    bugs: bugList(v, [
      // x − r − d: the child compensated in the wrong direction
      ['verkehrt-ausgeglichen', v - 2 * d, `Du hast die ${d} noch einmal abgezogen. Mit ${fmt(r)} hast du aber schon ${d} zu viel abgezogen. Zähle die ${d} dazu.`],
      ['nicht-ausgeglichen', v - d, `Du hast ${fmt(r)} statt ${fmt(y)} abgezogen. Verändere auch die erste Zahl um ${d}.`],
    ]),
    praise: 'Du hast beide Zahlen gleich verändert. So bleibt der Unterschied gleich.',
    srText: `Rechne geschickt: ${toSpeech(expr.replace(` = ${BOX}`, ''))}.`,
  };
}

/** Gap form: '403 − 198 = 405 − □' (minus) or '398 + 245 = 400 + □' (plus). */
export function luecke(op: '+' | '-', x: number, y: number, r: number): Exercise {
  const plus = op === '+';
  const d = plus ? r - x : r - y;
  const value = plus ? y - d : r;
  const expr = plus ? `${fmt(x)} ${PLUS} ${fmt(y)} = ${fmt(r)} ${PLUS} ${BOX}` : `${fmt(x)} ${MINUS} ${fmt(y)} = ${fmt(x + d)} ${MINUS} ${BOX}`;
  return {
    ...base(2, 2, `luecke:${op}:${x}:${y}`),
    prompt: 'Welche Zahl gehört in die Lücke? Beide Seiten sollen gleich sein.',
    expression: expr,
    answer: { kind: 'number', value, label: 'Zahl in der Lücke' },
    hints: plus
      ? [`Die erste Zahl wird um ${d} größer.`, 'Bei Plus gleichst du aus: Die andere Zahl wird um genauso viel kleiner.']
      : [`Die erste Zahl wird um ${d} größer.`, 'Bei Minus veränderst du beide Zahlen gleich.'],
    steps: plus
      ? [`${fmt(x)} ${PLUS} ${d} = ${fmt(r)}`, `${fmt(y)} ${MINUS} ${d} = ${fmt(value)}`, `Probe: ${fmt(x + y)} = ${fmt(r + value)}`]
      : [`${fmt(x)} ${PLUS} ${d} = ${fmt(x + d)}`, `${fmt(y)} ${PLUS} ${d} = ${fmt(value)}`, `Probe: ${fmt(x - y)} = ${fmt(x + d - value)}`],
    bugs: bugList(value, plus
      ? [['gleichsinnig', y + d, 'Bei Plus musst du gegensinnig verändern: Was eine Zahl mehr bekommt, gibt die andere ab.']]
      : [['gegensinnig', y - d, 'Bei Minus veränderst du beide Zahlen gleich. Sonst ändert sich der Unterschied.']]),
    praise: plus ? 'Du hast gegensinnig ausgeglichen. So bleibt die Summe gleich.' : 'Du hast beide Zahlen gleich verändert. So bleibt der Unterschied gleich.',
    srText: `${toSpeech(expr)}. Welche Zahl gehört in die Lücke?`,
  };
}

/** Which term has the same result? */
export function gleichesErgebnis(rng: Rng, op: '+' | '-', x: number, y: number, d: number): Exercise {
  const plus = op === '+';
  const sym = plus ? PLUS : MINUS;
  const target = plus ? x + y : x - y;
  const t = (a: number, b: number) => `${fmt(a)} ${sym} ${fmt(b)}`;
  const val = (a: number, b: number) => (plus ? a + b : a - b);
  const correctPair: [number, number] = plus ? [x + d, y - d] : [x + d, y + d];
  const cands: [number, number, string][] = plus
    ? [
        [x + d, y + d, 'Bei Plus darfst du nicht beide Zahlen größer machen. Dann wächst die Summe.'],
        [x + d, y, 'Du hast nur eine Zahl verändert. Dann ändert sich das Ergebnis.'],
        [x - d, y - d, 'Wenn beide Zahlen kleiner werden, wird auch die Summe kleiner.'],
      ]
    : [
        [x + d, y - d, 'Bei Minus musst du beide Zahlen gleich verändern. Sonst ändert sich der Unterschied.'],
        [x, y + d, 'Du hast nur eine Zahl verändert. Dann ändert sich das Ergebnis.'],
        [x - d, y + d, 'Bei Minus musst du beide Zahlen gleich verändern. Sonst ändert sich der Unterschied.'],
      ];
  const wrong: WrongOption[] = cands
    .filter(([a, b]) => val(a, b) !== target)
    .map(([a, b, why]) => ({ label: t(a, b), whyWrong: `${t(a, b)} = ${fmt(val(a, b))}. ${why}` }));
  return {
    ...base(3, 3, `gleich:${op}:${x}:${y}:${d}`),
    prompt: `Welche Aufgabe hat dasselbe Ergebnis wie ${t(x, y)}? Du musst nicht ausrechnen.`,
    answer: choiceAnswer(rng, t(...correctPair), wrong),
    hints: [plus ? 'Bei Plus: Was die eine Zahl mehr bekommt, muss die andere abgeben.' : 'Bei Minus: Beide Zahlen müssen sich gleich verändern.', 'Vergleiche jede Zahl mit der Zahl in der Aufgabe.'],
    steps: [
      plus ? `${fmt(x)} ${PLUS} ${d} und ${fmt(y)} ${MINUS} ${d}: gegensinnig verändert.` : `${fmt(x)} ${PLUS} ${d} und ${fmt(y)} ${PLUS} ${d}: gleichsinnig verändert.`,
      `${t(...correctPair)} = ${fmt(target)} und ${t(x, y)} = ${fmt(target)}`,
    ],
    praise: plus ? 'Du weißt: Bei Plus verändert man gegensinnig.' : 'Du weißt: Bei Minus verändert man gleichsinnig.',
    srText: `Welche Aufgabe hat dasselbe Ergebnis wie ${toSpeech(t(x, y))}?`,
    knobel: true,
  };
}

// ─── Generator ───────────────────────────────────────────────────────────────

const PAIRS: [number, number][] = [[2, 5], [4, 25], [20, 5], [50, 2], [8, 125], [25, 4]];

function pairMal(rng: Rng, stufe: Stufe): Exercise {
  const [p, q] = stufe === 1 ? rng.pick([[2, 5], [5, 2], [20, 5]] as [number, number][]) : rng.pick(PAIRS);
  const x = stufe === 1 ? rng.int(11, 49) : rng.int(13, 99);
  const order = rng.pick([[0, 1, 2], [1, 0, 2], [0, 2, 1], [2, 1, 0]]);
  return paarMal(p, q, x, order, stufe);
}

function generate(rng: Rng, stufe: Stufe): Exercise {
  if (stufe === 1) {
    const v = rng.pick(['ausgleich', 'tausch', 'mal'] as const);
    if (v === 'ausgleich') {
      const r = rng.int(2, 9) * 100;
      return ausgleichPlus(r - rng.int(1, 3), rng.int(101, 899), r);
    }
    if (v === 'tausch') {
      const a = rng.int(11, 89);
      const b = 100 - a;
      const c = rng.int(11, 99);
      return tauschPlus(a, b, c, rng.pick([[0, 1, 2], [1, 0, 2], [0, 2, 1]]));
    }
    return pairMal(rng, 1);
  }
  if (stufe === 2) {
    const v = rng.pick(['konstanz', 'konstanz', 'luecke', 'mal'] as const);
    const big = rng.chance(0.35);
    const unit = big ? 1000 : 100;
    const r = rng.int(1, big ? 8 : 6) * unit;
    const d = rng.int(1, 3);
    if (v === 'konstanz') {
      const y = r - d;
      return konstanz(r + rng.int(1, big ? 1 : 3) * unit + rng.int(1, unit - 1), y, r);
    }
    if (v === 'luecke') {
      if (rng.chance(0.5)) return luecke('-', r + rng.int(1, 3) * unit + rng.int(1, unit - 1), r - d, r);
      return luecke('+', r - d, rng.int(unit + 1, 9 * unit), r);
    }
    return pairMal(rng, 2);
  }
  if (rng.chance(0.6)) {
    const op = rng.chance(0.5) ? '+' : '-';
    const r = rng.int(2, 9) * 100;
    const d = rng.int(1, 4);
    if (op === '+') return gleichesErgebnis(rng, '+', r - d, rng.int(120, 880), d);
    return gleichesErgebnis(rng, '-', r + rng.int(110, 890), r - d, d);
  }
  const [p, q] = rng.pick(PAIRS.slice(1));
  const x = rng.int(13, 99);
  return paarMal(p, q, x, rng.pick([[0, 1, 2], [1, 0, 2], [0, 2, 1], [2, 1, 0], [1, 2, 0]]), 3);
}

export const vorteilhaftSkill: SkillDef = {
  id: ID,
  topicId: 'kopfrechnen',
  title: 'Vorteilhaft rechnen',
  description: 'Du rechnest geschickt mit Tauschen, Ausgleichen und gleichem Verändern.',
  stufen: {
    1: '298 + 156 und 2 · 17 · 5 geschickt rechnen',
    2: 'Konstanz der Differenz: 403 − 198 = 405 − 200',
    3: 'Gleiche Ergebnisse erkennen und begründen',
  },
  kmk: KMK,
  generate,
};
