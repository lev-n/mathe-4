import { BOX, DIV, fmt, TIMES, toSpeech } from '../../core/format';
import type { Exercise, Rng, SkillDef, Step, Stufe, Visual } from '../../core/types';
import { bugList, columnsFor, digitAt, randomDigits } from '../zahlen/shared';

const ID = 'kopfrechnen.mal-durch-zehn';
const KMK = ['ZO.kopfrechnen', 'ZO.stellenwert'];

function base(stufe: Stufe, ab: 1 | 2 | 3, key: string) {
  return { key: `${ID}:${stufe}:${key}`, topicId: 'kopfrechnen' as const, skillId: ID, stufe, ab, kmk: KMK };
}

const zeros = (f: number) => String(f).length - 1;
const ZERO_WORD = ['', 'eine Stelle', 'zwei Stellen', 'drei Stellen'];
/** 'durch 100' gives 'den hundertsten Teil' (clearer than '100-mal so klein'). */
const TEIL: Record<number, string> = { 10: 'zehnten', 100: 'hundertsten', 1000: 'tausendsten', 10_000: 'zehntausendsten' };

/** Stellenwerttafel before and after: shows the shift of the digits. */
function shiftVisual(from: number, to: number): Visual {
  const cols = columnsFor(Math.max(from, to));
  const row = (n: number) => cols.map((c) => (String(n).length > cols.length - 1 - cols.indexOf(c) ? digitAt(n, c) : null));
  return { type: 'placeValue', columns: cols, rows: [{ label: fmt(from), values: row(from) }, { label: fmt(to), values: row(to) }], mode: 'digits' };
}

/** Remove one inner zero of a number (e.g. 40 500 → 4 500); null if there is none. */
export function lostInnerZero(n: number): number | null {
  const s = String(n);
  const i = s.slice(1).search(/0(?=[1-9])/);
  if (i < 0) return null;
  return Number(s.slice(0, i + 1) + s.slice(i + 2));
}

export function rechnen(n: number, op: 'mal' | 'durch', f: number, stufe: Stufe): Exercise {
  const v = op === 'mal' ? n * f : n / f;
  const z = zeros(f);
  const sym = op === 'mal' ? TIMES : DIV;
  const expr = `${fmt(n)} ${sym} ${fmt(f)} = ${BOX}`;
  const steps: Step[] = [
    op === 'mal'
      ? `Mal ${fmt(f)}: Jede Ziffer rückt ${ZERO_WORD[z]} nach links. Hinten ${z === 1 ? 'kommt eine Null' : `kommen ${z} Nullen`} dazu.`
      : `Durch ${fmt(f)}: Jede Ziffer rückt ${ZERO_WORD[z]} nach rechts. Hinten ${z === 1 ? 'fällt eine Null' : `fallen ${z} Nullen`} weg.`,
    { text: `${fmt(n)} ${sym} ${fmt(f)} = ${fmt(v)}`, visual: shiftVisual(n, v) },
  ];
  return {
    ...base(stufe, stufe === 1 ? 1 : 2, `${op}:${n}:${f}`),
    prompt: 'Rechne im Kopf.',
    expression: expr,
    answer: { kind: 'number', value: v, label: 'Ergebnis' },
    hints: [
      op === 'mal' ? `Bei mal ${fmt(f)} wird die Zahl ${fmt(f)}-mal so groß.` : `Bei durch ${fmt(f)} wird die Zahl kleiner: Du bekommst den ${TEIL[f]} Teil.`,
      `Die Ziffern rücken ${ZERO_WORD[z]} nach ${op === 'mal' ? 'links' : 'rechts'}.`,
    ],
    steps,
    bugs: bugList(v, [
      ['null-zu-viel', v * 10, `Da ist eine Null zu viel. ${fmt(f)} hat ${z === 1 ? 'nur eine Null' : `${z} Nullen`}.`],
      ['null-zu-wenig', v % 10 === 0 ? v / 10 : null, `Da fehlt eine Null. ${fmt(f)} hat ${z === 1 ? 'eine Null' : `${z} Nullen`}.`],
      ['innere-null-weg', lostInnerZero(v), 'Achte auf die Null in der Mitte. Sie bleibt stehen.'],
      ['falsche-richtung', op === 'mal' ? (n % f === 0 ? n / f : null) : n * f, op === 'mal' ? 'Bei mal wird die Zahl größer, nicht kleiner.' : 'Bei geteilt wird die Zahl kleiner, nicht größer.'],
    ]),
    praise: 'Du hast die Ziffern um die richtige Zahl von Stellen verschoben.',
    srText: `Wie viel ist ${toSpeech(expr.replace(` = ${BOX}`, ''))}?`,
  };
}

/** Platzhalter: '□ · 100 = 45 000', '34 000 : □ = 340', '□ : 1000 = 56', '72 · □ = 72 000'. */
export function platzhalter(form: 'zahl-mal' | 'faktor' | 'zahl-durch' | 'divisor', n: number, f: number): Exercise {
  const product = n * f;
  let expr: string;
  let value: number;
  if (form === 'zahl-mal') [expr, value] = [`${BOX} ${TIMES} ${fmt(f)} = ${fmt(product)}`, n];
  else if (form === 'faktor') [expr, value] = [`${fmt(n)} ${TIMES} ${BOX} = ${fmt(product)}`, f];
  else if (form === 'zahl-durch') [expr, value] = [`${BOX} ${DIV} ${fmt(f)} = ${fmt(n)}`, product];
  else [expr, value] = [`${fmt(product)} ${DIV} ${BOX} = ${fmt(n)}`, f];
  const isFactor = form === 'faktor' || form === 'divisor';
  return {
    ...base(3, 2, `platz:${form}:${n}:${f}`),
    prompt: 'Welche Zahl gehört in die Lücke?',
    expression: expr,
    answer: { kind: 'number', value, label: 'Zahl in der Lücke' },
    hints: isFactor
      ? ['Vergleiche die beiden Zahlen. Um wie viele Stellen sind die Ziffern verschoben?', 'Jede Stelle, um die die Ziffern rücken, ist eine Null mehr in der gesuchten Zahl.']
      : [
          'Rechne rückwärts mit der Umkehraufgabe.',
          form === 'zahl-mal' ? `Die gesuchte Zahl ist kleiner: Teile durch ${fmt(f)}.` : `Die gesuchte Zahl ist größer: Nimm mit ${fmt(f)} mal.`,
        ],
    steps: [
      form === 'zahl-mal'
        ? `Umkehraufgabe: ${fmt(product)} ${DIV} ${fmt(f)} = ${fmt(n)}`
        : form === 'zahl-durch'
          ? `Umkehraufgabe: ${fmt(n)} ${TIMES} ${fmt(f)} = ${fmt(product)}`
          : `Von ${fmt(form === 'faktor' ? n : product)} zu ${fmt(form === 'faktor' ? product : n)} rücken die Ziffern ${ZERO_WORD[zeros(f)]} nach ${form === 'faktor' ? 'links' : 'rechts'}.`,
      `In die Lücke gehört ${fmt(value)}.`,
    ],
    bugs: bugList(value, isFactor
      ? [
          ['stelle-zu-wenig', f / 10 >= 10 ? f / 10 : null, 'Zähle die Stellen noch einmal, um die die Ziffern rücken.'],
          ['stelle-zu-viel', f * 10, 'Zähle die Stellen noch einmal, um die die Ziffern rücken.'],
        ]
      : [
          ['falsche-richtung', form === 'zahl-mal' ? product * f : n % f === 0 ? n / f : null, form === 'zahl-mal' ? 'Rechne rückwärts: Die Zahl in der Lücke ist kleiner.' : 'Rechne rückwärts: Die Zahl in der Lücke ist größer.'],
          ['null-zu-viel', value * 10, 'Da ist eine Null zu viel.'],
          ['null-zu-wenig', value % 10 === 0 ? value / 10 : null, 'Da fehlt eine Null.'],
        ]),
    praise: isFactor ? 'Du hast gezählt, um wie viele Stellen die Ziffern rücken.' : 'Du hast mit der Umkehraufgabe rückwärts gerechnet.',
    srText: `${toSpeech(expr)}. Welche Zahl gehört in die Lücke?`,
    knobel: true,
  };
}

/** Kette: '45 · 10 · 100 = □' or '360 000 : 100 : 10 = □'. */
export function kette(n: number, op: 'mal' | 'durch', f1: number, f2: number): Exercise {
  const total = f1 * f2;
  const v = op === 'mal' ? n * total : n / total;
  const sym = op === 'mal' ? TIMES : DIV;
  const mid = op === 'mal' ? n * f1 : n / f1;
  const expr = `${fmt(n)} ${sym} ${fmt(f1)} ${sym} ${fmt(f2)} = ${BOX}`;
  return {
    ...base(3, 3, `kette:${op}:${n}:${f1}:${f2}`),
    prompt: 'Rechne die Kette.',
    expression: expr,
    answer: { kind: 'number', value: v, label: 'Ergebnis' },
    hints: ['Rechne Schritt für Schritt von links.', op === 'mal' ? `Oder: Nimm gleich mit ${fmt(total)} mal.` : `Oder: Teile gleich durch ${fmt(total)}.`],
    steps: [
      `${fmt(n)} ${sym} ${fmt(f1)} = ${fmt(mid)}`,
      `${fmt(mid)} ${sym} ${fmt(f2)} = ${fmt(v)}`,
      op === 'mal' ? `Zusammen hast du mit ${fmt(total)} malgenommen: ${fmt(n)} ${sym} ${fmt(total)} = ${fmt(v)}.` : `Zusammen hast du durch ${fmt(total)} geteilt: ${fmt(n)} ${sym} ${fmt(total)} = ${fmt(v)}.`,
    ],
    bugs: bugList(v, [
      ['nur-ein-schritt', mid, `Das ist erst der erste Schritt. Rechne noch ${sym} ${fmt(f2)}.`],
      ['null-zu-viel', v * 10, 'Da ist eine Null zu viel. Zähle die Nullen beider Zahlen.'],
      ['null-zu-wenig', v % 10 === 0 ? v / 10 : null, 'Da fehlt eine Null. Zähle die Nullen beider Zahlen.'],
    ]),
    praise: 'Du hast die Kette Schritt für Schritt gerechnet.',
    srText: `Wie viel ist ${toSpeech(expr.replace(` = ${BOX}`, ''))}?`,
    knobel: true,
  };
}

// ─── Generator ───────────────────────────────────────────────────────────────

function generate(rng: Rng, stufe: Stufe): Exercise {
  if (stufe === 1) {
    const f = rng.pick([10, 100, 10]);
    const k = f === 10 ? rng.int(2, 999) : rng.int(2, 99);
    return rng.chance(0.5) ? rechnen(k, 'mal', f, 1) : rechnen(k * f, 'durch', f, 1);
  }
  if (stufe === 2) {
    const f = rng.pick([1000, 100, 1000, 10]);
    const k = randomDigits(rng, rng.int(2, f === 1000 ? 3 : 4), rng.chance(0.4) ? 1 : 0);
    return rng.chance(0.5) ? rechnen(k, 'mal', f, 2) : rechnen(k * f, 'durch', f, 2);
  }
  const v = rng.pick(['zahl-mal', 'faktor', 'zahl-durch', 'divisor', 'kette', 'kette'] as const);
  if (v === 'kette') {
    const [f1, f2] = rng.pick([[10, 100], [100, 10], [10, 10], [100, 100], [10, 1000]]);
    const n = rng.int(2, 99);
    return rng.chance(0.5) ? kette(n, 'mal', f1, f2) : kette(n * f1 * f2, 'durch', f1, f2);
  }
  const f = rng.pick([10, 100, 1000]);
  const n = randomDigits(rng, rng.int(f === 1000 ? 1 : 2, 3), 0);
  return platzhalter(v, n, f);
}

export const malDurchZehnSkill: SkillDef = {
  id: ID,
  topicId: 'kopfrechnen',
  title: 'Mal und durch 10, 100, 1000',
  description: 'Du rechnest mal und durch 10, 100 und 1000 im Kopf.',
  stufen: {
    1: 'Mal und durch 10 und 100',
    2: 'Auch 1000 und große Zahlen',
    3: 'Platzhalter und Rechenketten',
  },
  kmk: KMK,
  generate,
};
