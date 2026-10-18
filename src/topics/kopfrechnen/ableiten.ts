import { BOX, fmt, MINUS, TIMES } from '../../core/format';
import type { Exercise, Rng, SkillDef, Stufe } from '../../core/types';
import { bugList, choiceAnswer, type WrongOption } from '../zahlen/shared';

const ID = 'kopfrechnen.ableiten';
const KMK = ['ZO.kopfrechnen', 'ZO.strategien'];

function base(stufe: Stufe, ab: 1 | 2 | 3, key: string) {
  return { key: `${ID}:${stufe}:${key}`, topicId: 'kopfrechnen' as const, skillId: ID, stufe, ab, kmk: KMK };
}

const t = (a: number, b: number) => `${a} ${TIMES} ${b}`;

/** Nachbaraufgabe: from k · b to (k ± 1) · b. */
export function nachbaraufgabe(k: number, target: number, b: number): Exercise {
  const kb = k * b;
  const v = target * b;
  const plus = target > k;
  return {
    ...base(1, 1, `nachbar:${k}:${target}:${b}`),
    prompt: `Du weißt: ${t(k, b)} = ${kb}. Wie viel ist ${t(target, b)}?`,
    expression: `${t(target, b)} = ${BOX}`,
    answer: { kind: 'number', value: v, label: 'Ergebnis' },
    hints: [`${t(target, b)} ist eine ${b} ${plus ? 'mehr' : 'weniger'} als ${t(k, b)}.`, `Rechne ${kb} ${plus ? '+' : MINUS} ${b}.`],
    steps: [`${t(k, b)} = ${kb}`, `${t(target, b)} = ${kb} ${plus ? '+' : MINUS} ${b} = ${v}`],
    bugs: bugList(v, [
      ['nur-eins', plus ? kb + 1 : kb - 1, `Es kommt nicht 1 ${plus ? 'dazu' : 'weg'}, sondern eine ganze ${b}.`],
      ['falscher-faktor', plus ? kb + k : kb - k, `Du hast ${k} ${plus ? 'dazugezählt' : 'abgezogen'}. Es ändert sich aber die Anzahl der ${b}er.`],
    ]),
    praise: `Du hast die Nachbaraufgabe von ${t(k, b)} genutzt.`,
    srText: `Du weißt: ${k} mal ${b} ist ${kb}. Wie viel ist ${target} mal ${b}?`,
  };
}

/** '6 · 7 = 5 · 7 + □' */
export function nachbarLuecke(k: number, target: number, b: number): Exercise {
  const plus = target > k;
  return {
    ...base(1, 2, `luecke:${k}:${target}:${b}`),
    prompt: 'Welche Zahl gehört in die Lücke?',
    expression: `${t(target, b)} = ${t(k, b)} ${plus ? '+' : MINUS} ${BOX}`,
    answer: { kind: 'number', value: b, label: 'Zahl in der Lücke' },
    hints: [`Vergleiche ${t(target, b)} und ${t(k, b)}. Wie viele ${b}er sind es mehr oder weniger?`, `Es ist genau eine Reihe ${plus ? 'mehr' : 'weniger'}.`],
    steps: [`${t(target, b)} hat eine ${b} ${plus ? 'mehr' : 'weniger'} als ${t(k, b)}.`, `${t(target, b)} = ${t(k, b)} ${plus ? '+' : MINUS} ${b}`],
    bugs: bugList(b, [
      // (the bug hints name the idea, not the number that belongs in the gap)
      ['nur-eins', 1, `Es ${plus ? 'kommt' : 'fällt'} nicht nur 1 ${plus ? 'dazu' : 'weg'}, sondern eine ganze Reihe.`],
      ['falscher-faktor', k !== b ? k : null, `Es ändert sich die Anzahl der ${b}er, nicht der Faktor ${k}. Wie viel ${plus ? 'kommt dann dazu' : 'fällt dann weg'}?`],
    ]),
    praise: 'Du hast erkannt, dass genau eine Reihe dazukommt oder wegfällt.',
    srText: `${target} mal ${b} ist gleich ${k} mal ${b} ${plus ? 'plus' : 'minus'} Lücke. Welche Zahl gehört in die Lücke?`,
  };
}

/** Verdoppeln: from h · b to 2h · b. */
export function verdoppeln(h: number, b: number): Exercise {
  const hb = h * b;
  const v = 2 * hb;
  return {
    ...base(2, 2, `doppelt:${h}:${b}`),
    prompt: `Du weißt: ${t(h, b)} = ${hb}. Wie viel ist ${t(2 * h, b)}?`,
    expression: `${t(2 * h, b)} = ${BOX}`,
    answer: { kind: 'number', value: v, label: 'Ergebnis' },
    hints: [`${2 * h} ist das Doppelte von ${h}.`, `Dann ist ${t(2 * h, b)} das Doppelte von ${hb}.`],
    steps: [`${2 * h} = 2 ${TIMES} ${h}`, `${t(2 * h, b)} = ${hb} + ${hb} = ${v}`],
    bugs: bugList(v, [
      ['nachbar', hb + b, `Das ist ${t(h + 1, b)}. Bei ${t(2 * h, b)} verdoppelst du ${hb}.`],
      ['plus-zwei', hb + 2, 'Verdoppeln heißt: noch einmal so viel, nicht plus 2.'],
    ]),
    praise: 'Du hast die Verdopplungsaufgabe genutzt.',
    srText: `Du weißt: ${h} mal ${b} ist ${hb}. Wie viel ist ${2 * h} mal ${b}?`,
  };
}

/** Zerlegen: a · b = k · b ± m · b with k ∈ {2, 5, 10}. */
export function zerlegen(a: number, b: number, k: number): Exercise {
  const m = Math.abs(a - k);
  const plus = a > k;
  const kb = k * b;
  const mb = m * b;
  const v = a * b;
  const sign = plus ? '+' : MINUS;
  return {
    ...base(2, 2, `zerlegen:${a}:${b}:${k}`),
    prompt: 'Zerlege die Aufgabe und rechne. Fülle alle Lücken.',
    answer: {
      kind: 'multi',
      fields: [
        { id: 'm', value: m, before: `${t(a, b)} = ${t(k, b)} ${sign}`, after: `${TIMES} ${b}`, label: 'Wie viele Reihen dazu oder weg' },
        { id: 'mb', value: mb, before: `= ${kb} ${sign}`, label: 'Teilergebnis' },
        { id: 'e', value: v, before: '=', label: 'Ergebnis' },
      ],
    },
    hints: [`${a} = ${k} ${sign} ${m}. Nutze die Kernaufgabe ${t(k, b)} = ${kb}.`, `Rechne ${t(m, b)} und dann ${kb} ${sign} …`],
    steps: [`${a} = ${k} ${sign} ${m}`, `${t(a, b)} = ${t(k, b)} ${sign} ${t(m, b)}`, `= ${kb} ${sign} ${mb} = ${v}`],
    bugs: bugList({ m, mb, e: v }, [
      ['nicht-malgenommen', { m, mb: m, e: plus ? kb + m : kb - m }, `Du musst ${m} noch mit ${b} malnehmen: ${t(m, b)}.`],
    ]),
    praise: `Du hast ${t(a, b)} geschickt in zwei leichte Aufgaben zerlegt.`,
    srText: `Zerlege ${a} mal ${b} in ${k} mal ${b} ${plus ? 'plus' : 'minus'} Lücke mal ${b}. Dann rechne das Teilergebnis und das Ergebnis.`,
  };
}

/** Großes Einmaleins: a ∈ 11..19 via 10 · b + (a − 10) · b. */
export function grossesEinmaleins(a: number, b: number): Exercise {
  const e = a - 10;
  const v = a * b;
  return {
    ...base(3, 2, `gross:${a}:${b}`),
    prompt: 'Rechne geschickt. Zerlege die große Zahl.',
    expression: `${t(a, b)} = ${BOX}`,
    answer: { kind: 'number', value: v, label: 'Ergebnis' },
    hints: [`Zerlege ${a} in 10 und ${e}.`, `Rechne ${t(10, b)} und ${t(e, b)}. Addiere dann.`],
    steps: [`${a} = 10 + ${e}`, `${t(a, b)} = ${t(10, b)} + ${t(e, b)}`, `= ${10 * b} + ${e * b} = ${fmt(v)}`],
    bugs: bugList(v, [
      ['einer-vergessen', 10 * b + e, `Du musst auch die ${e} mit ${b} malnehmen.`],
      ['zehner-als-eins', b + e * b, `Die 1 in ${a} steht für 10. Rechne ${t(10, b)}.`],
    ]),
    praise: `Du hast ${a} in 10 und ${e} zerlegt.`,
    srText: `Wie viel ist ${a} mal ${b}? Rechne geschickt.`,
    knobel: true,
  };
}

/** Which decomposition fits a · b? */
export function welcheZerlegung(rng: Rng, a: number, b: number, k: number): Exercise {
  const m = Math.abs(a - k);
  const plus = a > k;
  const sign = plus ? '+' : MINUS;
  const target = a * b;
  const correct = `${t(k, b)} ${sign} ${t(m, b)}`;
  const options: { label: string; value: number; why: string }[] = [
    { label: `${t(k, b)} ${sign} ${m}`, value: k * b + (plus ? m : -m), why: `Hier fehlt das „${TIMES} ${b}“ beim zweiten Teil.` },
    { label: `${t(k, b)} ${sign} ${t(m, a)}`, value: k * b + (plus ? 1 : -1) * m * a, why: `Im zweiten Teil muss auch ${b} stehen, nicht ${a}.` },
    { label: `${t(k, b)} ${plus ? MINUS : '+'} ${t(m, b)}`, value: k * b + (plus ? -1 : 1) * m * b, why: `${a} ist ${plus ? 'größer' : 'kleiner'} als ${k}. Prüfe das Rechenzeichen.` },
    { label: `${t(k, a)} ${sign} ${t(m, b)}`, value: k * a + (plus ? 1 : -1) * m * b, why: `Im ersten Teil muss ${b} stehen, nicht ${a}.` },
  ];
  const wrong: WrongOption[] = options
    .filter((o) => o.value !== target && o.label !== correct)
    .map((o) => ({ label: o.label, whyWrong: `${o.label} = ${o.value}, nicht ${target}. ${o.why}` }));
  return {
    ...base(3, 3, `welche:${a}:${b}:${k}`),
    prompt: `Welche Rechnung hat dasselbe Ergebnis wie ${t(a, b)}?`,
    answer: choiceAnswer(rng, correct, wrong),
    hints: [`${a} = ${k} ${sign} ${m}.`, `Beide Teile brauchen „${TIMES} ${b}“.`],
    steps: [`${a} = ${k} ${sign} ${m}`, `${t(a, b)} = ${correct}`, `= ${k * b} ${sign} ${m * b} = ${target}`],
    praise: 'Du hast die passende Zerlegung erkannt und begründet.',
    srText: `Welche Rechnung hat dasselbe Ergebnis wie ${a} mal ${b}?`,
    knobel: true,
  };
}

// ─── Generator ───────────────────────────────────────────────────────────────

const NEAREST: Record<number, number> = { 3: 2, 4: 5, 6: 5, 7: 5, 8: 10, 9: 10 };

function generate(rng: Rng, stufe: Stufe): Exercise {
  if (stufe === 1) {
    const k = rng.pick([2, 5, 10]);
    const target = k === 10 ? 9 : k === 2 ? 3 : k + rng.pick([-1, 1]);
    const b = rng.int(3, 9);
    return rng.chance(0.65) ? nachbaraufgabe(k, target, b) : nachbarLuecke(k, target, b);
  }
  if (stufe === 2) {
    if (rng.chance(0.4)) return verdoppeln(rng.int(2, 5), rng.int(3, 9));
    const a = rng.pick([3, 4, 6, 7, 8, 9]);
    const k = a === 7 ? rng.pick([5, 10]) : NEAREST[a];
    return zerlegen(a, rng.int(3, 9), k);
  }
  if (rng.chance(0.6)) return grossesEinmaleins(rng.int(11, 19), rng.int(3, 9));
  const a = rng.pick([3, 4, 6, 7, 8, 9]);
  return welcheZerlegung(rng, a, rng.int(3, 9), a === 7 ? rng.pick([5, 10]) : NEAREST[a]);
}

export const ableitenSkill: SkillDef = {
  id: ID,
  topicId: 'kopfrechnen',
  title: 'Einmaleins ableiten',
  description: 'Du leitest schwere Malaufgaben aus leichten Kernaufgaben ab.',
  stufen: {
    1: 'Nachbaraufgaben: von 5 · 7 zu 6 · 7',
    2: 'Verdoppeln und Zerlegen',
    3: 'Großes Einmaleins und passende Zerlegungen',
  },
  kmk: KMK,
  generate,
};
