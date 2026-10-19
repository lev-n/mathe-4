import { BOX, DIV, fmt, MINUS, PLUS, TIMES, toSpeech } from '../../core/format';
import type { Exercise, Rng, SkillDef, Stufe } from '../../core/types';
import { bugList, choiceAnswer, type WrongOption } from '../zahlen/shared';

const ID = 'kopfrechnen.stufenzahlen';
const KMK = ['ZO.kopfrechnen'];

function base(stufe: Stufe, ab: 1 | 2 | 3, key: string) {
  return { key: `${ID}:${stufe}:${key}`, topicId: 'kopfrechnen' as const, skillId: ID, stufe, ab, kmk: KMK };
}

const z = (k: number) => 10 ** k;
const zerosWord = (k: number) => (k === 1 ? 'eine Null' : `${k} Nullen`);

/** (a · 10^i) · (b · 10^j) */
export function malAnalog(a: number, i: number, b: number, j: number, stufe: Stufe): Exercise {
  const x = a * z(i);
  const y = b * z(j);
  const v = x * y;
  const expr = `${fmt(x)} ${TIMES} ${fmt(y)} = ${BOX}`;
  return {
    ...base(stufe, stufe === 3 ? 2 : stufe, `mal:${x}:${y}`),
    prompt: 'Rechne mit der Einmaleins-Aufgabe.',
    expression: expr,
    answer: { kind: 'number', value: v, label: 'Ergebnis' },
    hints: [`Denke an ${a} ${TIMES} ${b} = ${a * b}.`, `Zähle die Nullen von ${fmt(x)} und ${fmt(y)} zusammen und hänge sie an.`],
    steps: [`${a} ${TIMES} ${b} = ${a * b}`, `${fmt(x)} und ${fmt(y)} haben zusammen ${zerosWord(i + j)}.`, `${fmt(x)} ${TIMES} ${fmt(y)} = ${fmt(v)}`],
    bugs: bugList(v, [
      ['null-zu-wenig', v / 10, `Da fehlt eine Null. Zähle die Nullen beider Zahlen zusammen.${(a * b) % 10 === 0 ? ` Die Null aus ${a * b} zählt extra.` : ''}`],
      ['null-zu-viel', v * 10, 'Da ist eine Null zu viel. Zähle die Nullen beider Zahlen genau.'],
    ]),
    praise: `Du hast die Einmaleins-Aufgabe ${a} ${TIMES} ${b} genutzt und die Nullen richtig gezählt.`,
    srText: `Wie viel ist ${toSpeech(`${fmt(x)} ${TIMES} ${fmt(y)}`)}?`,
  };
}

/** (a · b · 10^k) : (a · 10^m) = b · 10^(k − m) */
export function geteiltAnalog(a: number, b: number, k: number, m: number, stufe: Stufe): Exercise {
  const dividend = a * b * z(k);
  const divisor = a * z(m);
  const v = b * z(k - m);
  const expr = `${fmt(dividend)} ${DIV} ${fmt(divisor)} = ${BOX}`;
  return {
    ...base(stufe, stufe === 3 ? 2 : stufe, `geteilt:${dividend}:${divisor}`),
    prompt: 'Rechne mit der Einmaleins-Aufgabe.',
    expression: expr,
    answer: { kind: 'number', value: v, label: 'Ergebnis' },
    hints: [`Denke an ${a * b} ${DIV} ${a} = ${b}.`, 'Prüfe mit der Umkehraufgabe: Ergebnis mal Teiler.'],
    steps: [`${a * b} ${DIV} ${a} = ${b}`, `${fmt(dividend)} ${DIV} ${fmt(divisor)} = ${fmt(v)}`, `Probe: ${fmt(v)} ${TIMES} ${fmt(divisor)} = ${fmt(dividend)}`],
    bugs: bugList(v, [
      ['null-zu-viel', v * 10, `Da ist eine Null zu viel. Probe: ${fmt(v * 10)} ${TIMES} ${fmt(divisor)} = ${fmt(v * 10 * divisor)}.`],
      ['null-zu-wenig', v % 10 === 0 ? v / 10 : null, `Da fehlt eine Null. Probe: ${fmt(v / 10)} ${TIMES} ${fmt(divisor)} = ${fmt((v / 10) * divisor)}.`],
    ]),
    praise: 'Du hast die Einmaleins-Aufgabe übertragen und mit der Probe geprüft.',
    srText: `Wie viel ist ${toSpeech(`${fmt(dividend)} ${DIV} ${fmt(divisor)}`)}?`,
  };
}

/** x ± y where both are multiples of the Stufenzahl u. */
export function plusMinus(x: number, op: '+' | '-', y: number, u: number, stufe: Stufe): Exercise {
  const v = op === '+' ? x + y : x - y;
  const sym = op === '+' ? PLUS : MINUS;
  const expr = `${fmt(x)} ${sym} ${fmt(y)} = ${BOX}`;
  const dx = Math.floor(x / u) % 10;
  const dy = Math.floor(y / u) % 10;
  const carry = op === '+' ? dx + dy >= 10 : dx < dy;
  const NAMES: Record<number, string> = { 10: 'Zehner', 100: 'Hunderter', 1000: 'Tausender', 10000: 'Zehntausender', 100000: 'Hunderttausender' };
  const name = NAMES[u] ?? '';
  const next = NAMES[u * 10] ?? '';
  return {
    ...base(stufe, stufe === 1 ? 1 : 2, `${op === '+' ? 'plus' : 'minus'}:${x}:${y}`),
    prompt: 'Rechne im Kopf.',
    expression: expr,
    answer: { kind: 'number', value: v, label: 'Ergebnis' },
    hints: [`Rechne mit den ${name}n wie mit Einern: ${x / u} ${sym} ${y / u}.`, carry ? (op === '+' ? `Achte auf den Übergang: 10 ${name} sind eine Stufe mehr.` : 'Achte auf den Übergang: Du musst entbündeln.') : 'Hänge die Nullen danach wieder an.'],
    steps: [`${x / u} ${sym} ${y / u} = ${v / u}`, `Also ${v / u} ${name}: ${fmt(x)} ${sym} ${fmt(y)} = ${fmt(v)}`],
    bugs: bugList(v, [
      // plus: the carry was forgotten. minus: the child did regroup (e.g. 13 − 4 = 9) but kept the next place unchanged
      // (7900 instead of 6900); a different misconception, so a different id (src/topics/errorFamilies.ts).
      [op === '+' ? 'uebertrag-vergessen' : 'entbuendeln-vergessen', carry ? (op === '+' ? v - 10 * u : v + 10 * u) : null, op === '+' ? `${dx} + ${dy} ist mehr als 9. Denk an den Übertrag.` : `Du hast einen ${next} entbündelt. Dann ist bei den ${next}n einer weniger.`],
      ['kleiner-minus-groesser', op === '-' && carry ? Math.floor(x / (10 * u)) * 10 * u + (dy - dx) * u : null, `Bei den ${name}n darfst du nicht einfach ${dy} ${MINUS} ${dx} rechnen. Entbündle.`],
    ]),
    praise: carry ? 'Du hast den Übergang richtig beachtet.' : `Du hast mit den ${name}n wie mit Einern gerechnet.`,
    srText: `Wie viel ist ${toSpeech(`${fmt(x)} ${sym} ${fmt(y)}`)}?`,
  };
}

/** Platzhalter: '□ · 70 = 4 900', '6 · □ = 4 800', '3 600 : □ = 400', '□ : 8 = 600'. */
export function platzhalter(form: 'faktor1' | 'faktor2' | 'divisor' | 'dividend', a: number, i: number, b: number, j: number): Exercise {
  const x = a * z(i);
  const y = b * z(j);
  const p = x * y;
  const [expr, value] =
    form === 'faktor1'
      ? [`${BOX} ${TIMES} ${fmt(y)} = ${fmt(p)}`, x]
      : form === 'faktor2'
        ? [`${fmt(x)} ${TIMES} ${BOX} = ${fmt(p)}`, y]
        : form === 'divisor'
          ? [`${fmt(p)} ${DIV} ${BOX} = ${fmt(x)}`, y]
          : [`${BOX} ${DIV} ${fmt(y)} = ${fmt(x)}`, p];
  return {
    ...base(3, 3, `platz:${form}:${x}:${y}`),
    prompt: 'Welche Zahl gehört in die Lücke?',
    expression: expr,
    answer: { kind: 'number', value, label: 'Zahl in der Lücke' },
    // the Einmaleins fact is given with a gap where the task has its gap, so the hint never states the answer's digits
    hints: [
      form === 'dividend'
        ? `Rechne zuerst die Einmaleins-Aufgabe ${a} ${TIMES} ${b}.`
        : `Denke an die Einmaleins-Aufgabe ${form === 'faktor1' ? `${BOX} ${TIMES} ${b}` : `${a} ${TIMES} ${BOX}`} = ${a * b}.`,
      form === 'dividend' ? 'Rechne die Umkehraufgabe mit mal.' : 'Prüfe deine Zahl mit der Malaufgabe. Stimmen die Nullen?',
    ],
    steps: [`${a} ${TIMES} ${b} = ${a * b}`, `${fmt(x)} ${TIMES} ${fmt(y)} = ${fmt(p)}`, `In die Lücke gehört ${fmt(value)}.`],
    bugs: bugList(value, [
      ['null-zu-wenig', value % 10 === 0 ? value / 10 : null, 'Da fehlt eine Null. Prüfe mit der Malaufgabe.'],
      ['null-zu-viel', value * 10, 'Da ist eine Null zu viel. Prüfe mit der Malaufgabe.'],
    ]),
    praise: 'Du hast die Lücke mit der Einmaleins-Aufgabe und den Nullen gefunden.',
    srText: `${toSpeech(expr)}. Welche Zahl gehört in die Lücke?`,
    knobel: true,
  };
}

/** Which product equals a·10^i · b·10^j? Options move zeros between the factors. */
export function gleichesErgebnis(rng: Rng, a: number, i: number, b: number, j: number): Exercise {
  const total = i + j;
  const term = (p: number, q: number) => `${fmt(a * z(p))} ${TIMES} ${fmt(b * z(q))}`;
  const target = a * b * z(total);
  const alts: [number, number][] = [];
  for (let k = 0; k <= total; k++) if (k !== i && k <= 3 && total - k <= 3) alts.push([k, total - k]);
  const [ci, cj] = rng.pick(alts);
  const correct = term(ci, cj);
  const wrong: WrongOption[] = rng
    .shuffle(([[ci + 1, cj], [ci, cj + 1], [ci - 1, cj], [ci, cj - 1]] as [number, number][]).filter(([p, q]) => p >= 0 && q >= 0))
    .map(([p, q]) => {
      const val = a * b * z(p + q);
      return { label: term(p, q), whyWrong: `${term(p, q)} = ${fmt(val)}. ${val > target ? 'Da ist eine Null zu viel.' : 'Da fehlt eine Null.'}` };
    });
  return {
    ...base(3, 3, `gleich:${a * z(i)}:${b * z(j)}:${ci}${cj}`),
    prompt: `Welche Aufgabe hat dasselbe Ergebnis wie ${term(i, j)}?`,
    answer: choiceAnswer(rng, correct, wrong),
    hints: [`Rechne zuerst ${term(i, j)} aus.`, 'Zähle bei jeder Aufgabe die Nullen und denke an die Einmaleins-Aufgabe.'],
    steps: [`${term(i, j)} = ${fmt(target)}`, `${correct} = ${fmt(target)}`, `Beide Aufgaben gehören zu ${a} ${TIMES} ${b} und haben zusammen ${zerosWord(total)}.`],
    praise: 'Du hast erkannt: Die Nullen dürfen den Platz wechseln, ihre Anzahl bleibt gleich.',
    srText: `Welche Aufgabe hat dasselbe Ergebnis wie ${toSpeech(term(i, j))}?`,
    knobel: true,
  };
}

// ─── Generator ───────────────────────────────────────────────────────────────

function factors(rng: Rng): [number, number] {
  return [rng.int(2, 9), rng.int(2, 9)];
}

function generate(rng: Rng, stufe: Stufe): Exercise {
  if (stufe === 1) {
    const v = rng.pick(['mal', 'mal', 'geteilt', 'plus', 'minus'] as const);
    const [a, b] = factors(rng);
    if (v === 'mal') return rng.chance(0.5) ? malAnalog(a, 0, b, 1, 1) : malAnalog(a, 1, b, 0, 1);
    if (v === 'geteilt') return geteiltAnalog(a, b, 1, 0, 1);
    const u = 100;
    if (v === 'plus') return plusMinus(rng.int(1, 9) * u, '+', rng.int(1, 9) * u, u, 1);
    const x = rng.int(11, 19) * u;
    return plusMinus(x, '-', rng.int(2, 9) * u, u, 1);
  }
  if (stufe === 2) {
    const v = rng.pick(['mal', 'mal', 'geteilt', 'geteilt', 'plus', 'minus'] as const);
    const [a, b] = factors(rng);
    if (v === 'mal') {
      const total = rng.int(2, 3);
      const i = rng.int(0, total);
      return malAnalog(a, i, b, total - i, 2);
    }
    if (v === 'geteilt') {
      const k = rng.int(2, 3);
      const m = rng.chance(0.3) ? 1 : 0;
      return geteiltAnalog(a, b, k, m, 2);
    }
    const u = rng.pick([100, 1000, 10_000]);
    const x = rng.int(11, 90) * u;
    const y = rng.int(1, 9) * u;
    if (v === 'plus') return plusMinus(x, '+', y, u, 2);
    return plusMinus(x, '-', y, u, 2);
  }
  const [a, b] = factors(rng);
  const total = rng.int(2, 3);
  const i = rng.int(1, total);
  if (rng.chance(0.35)) return gleichesErgebnis(rng, a, i, b, total - i);
  return platzhalter(rng.pick(['faktor1', 'faktor2', 'divisor', 'dividend'] as const), a, i, b, total - i);
}

export const stufenzahlenSkill: SkillDef = {
  id: ID,
  topicId: 'kopfrechnen',
  title: 'Rechnen mit Stufenzahlen',
  description: 'Du überträgst das Einmaleins auf große Zahlen: 7 · 800, 3500 : 7.',
  stufen: {
    1: '7 · 80, 560 : 8, 600 + 700',
    2: '70 · 80, 48 000 : 6, 7300 − 400',
    3: 'Platzhalter und gleiche Ergebnisse',
  },
  kmk: KMK,
  generate,
};
