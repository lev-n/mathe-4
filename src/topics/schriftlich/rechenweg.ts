import { DIV, MINUS, TIMES, fmt, toSpeech } from '../../core/format';
import type { ChoiceOption, Exercise, MultiField, Rng, SkillDef, Stufe, SubtractionMethod, WrittenOp } from '../../core/types';
import { NAMES, TOPIC, attempt, randLen, weighted } from './common';
import { layoutAdd, layoutMul, layoutSub, writtenVisual } from './layout';

const ID = 'schriftlich.rechenweg';

export type Way = 'kopf' | 'halbschriftlich' | 'schriftlich';

export interface WayTask {
  way: 'kopf' | 'schriftlich';
  family: string;
  expr: string;
  value: number;
  /** Why this way fits best (child-friendly). */
  reason: string;
  /** Written tasks: the calculation for the solution layout. */
  op?: WrittenOp;
  operands?: number[];
}

const KOPF_FAMILIES = ['minus1', 'stufenzahl', 'rund', 'mal10', 'geteilt'] as const;
const WRITTEN_FAMILIES = ['add', 'sub', 'mul'] as const;

export function kopfTask(rng: Rng, family: (typeof KOPF_FAMILIES)[number]): WayTask {
  switch (family) {
    case 'minus1': {
      const n = rng.int(2, 9) * 10 ** rng.int(3, 5);
      return { way: 'kopf', family, expr: `${fmt(n)} ${MINUS} 1`, value: n - 1, reason: `${fmt(n)} ${MINUS} 1 ist die Zahl direkt vor ${fmt(n)}. Das siehst du sofort.` };
    }
    case 'stufenzahl': {
      const s = rng.pick([100, 1000, 10_000]);
      const n = attempt(() => {
        const n = randLen(rng, 5);
        return Math.floor(n / s) % 10 <= 8 ? n : null;
      }, () => 34_567);
      return { way: 'kopf', family, expr: `${fmt(n)} + ${fmt(s)}`, value: n + s, reason: `Bei + ${fmt(s)} ändert sich nur eine Ziffer.` };
    }
    case 'rund': {
      const x = rng.int(12, 60);
      const y = rng.int(2, 9) * 10 - rng.int(0, 1) * 5;
      const sub = rng.chance(0.4) && x > y;
      return {
        way: 'kopf',
        family,
        expr: `${fmt(x * 1000)} ${sub ? MINUS : '+'} ${fmt(y * 1000)}`,
        value: (sub ? x - y : x + y) * 1000,
        reason: `Mit vollen Tausendern rechnest du wie mit kleinen Zahlen: ${x} ${sub ? MINUS : '+'} ${y}.`,
      };
    }
    case 'mal10': {
      const n = randLen(rng, rng.int(3, 4));
      const s = rng.pick([10, 100]);
      return { way: 'kopf', family, expr: `${fmt(n)} ${TIMES} ${s}`, value: n * s, reason: `Mal ${s} hängst du ${s === 10 ? 'eine Null' : 'zwei Nullen'} an.` };
    }
    case 'geteilt': {
      const d = rng.int(2, 9);
      const x = rng.int(2, 9);
      return { way: 'kopf', family, expr: `${fmt(d * x * 1000)} ${DIV} ${d}`, value: x * 1000, reason: `Das ist wie ${d * x} ${DIV} ${d} aus dem Einmaleins, nur mit Tausendern.` };
    }
  }
}

/** Written tasks; `method` is the class's subtraction method (Abziehen: entbündeln, Ergänzen: erweitern). */
export function writtenTask(rng: Rng, family: (typeof WRITTEN_FAMILIES)[number], method: SubtractionMethod = 'abziehen'): WayTask {
  switch (family) {
    case 'add': {
      const [a, b] = attempt<[number, number]>(() => {
        const a = randLen(rng, rng.int(5, 6));
        const b = randLen(rng, 5);
        return a + b <= 1_000_000 && layoutAdd([a, b]).carries.filter((c) => c > 0).length >= 3 ? [a, b] : null;
      }, () => [45_678, 38_795]);
      return { way: 'schriftlich', family, op: 'add', operands: [a, b], expr: `${fmt(a)} + ${fmt(b)}`, value: a + b, reason: 'Große Zahlen mit vielen Überträgen: Schriftlich behältst du den Überblick.' };
    }
    case 'sub': {
      const [a, b] = attempt<[number, number]>(() => {
        const a = randLen(rng, 5);
        const b = randLen(rng, 5);
        return b < a && layoutSub(a, b, method).regroupings >= 3 ? [a, b] : null;
      }, () => [70_412, 38_576]);
      return {
        way: 'schriftlich',
        family,
        op: 'sub',
        operands: [a, b],
        expr: `${fmt(a)} ${MINUS} ${fmt(b)}`,
        value: a - b,
        reason: `Viele Stellen und oft ${method === 'abziehen' ? 'entbündeln' : 'erweitern'}: Schriftlich rechnest du sicher Spalte für Spalte.`,
      };
    }
    case 'mul': {
      const [a, b] = attempt<[number, number]>(() => {
        const a = randLen(rng, 4);
        const b = rng.int(23, 89);
        return b % 10 !== 0 && b % 11 !== 0 && a * b <= 1_000_000 && layoutMul(a, b).carryCount >= 3 ? [a, b] : null;
      }, () => [4738, 36]);
      return { way: 'schriftlich', family, op: 'mul', operands: [a, b], expr: `${fmt(a)} ${TIMES} ${b}`, value: a * b, reason: 'Ein großer Faktor mal eine zweistellige Zahl: Mit Teilprodukten schriftlich ist es übersichtlich.' };
    }
  }
}

const WAY_LABEL: Record<Way, string> = { kopf: 'im Kopf', halbschriftlich: 'halbschriftlich', schriftlich: 'schriftlich' };

/** 'Hier gibt es viele Überträge.' in the words of the task's operation and the class's method. */
function manySteps(task: WayTask, method: SubtractionMethod): string {
  if (task.op !== 'sub') return 'Hier gibt es viele Überträge.';
  return method === 'abziehen' ? 'Hier musst du oft entbündeln.' : 'Hier musst du oft erweitern.';
}

/** Stufe 1: which way fits best? */
function chooseWay(rng: Rng, stufe: Stufe, method: SubtractionMethod): Exercise {
  const task = rng.chance(0.5) ? kopfTask(rng, rng.pick(KOPF_FAMILIES)) : writtenTask(rng, rng.pick(WRITTEN_FAMILIES), method);
  const why: Record<Way, string | undefined> =
    task.way === 'kopf'
      ? {
        kopf: undefined,
        halbschriftlich: 'Hier musst du nichts zerlegen. Das geht direkt im Kopf.',
        schriftlich: `Das geht auch schriftlich, ist aber ein Umweg. ${task.reason}`,
      }
      : {
        kopf: `${manySteps(task, method)} Im Kopf verlierst du leicht den Überblick.`,
        halbschriftlich: 'Das geht, wird aber mit so vielen Stellen lang. Schriftlich ist es übersichtlicher.',
        schriftlich: undefined,
      };
  const ways = rng.shuffle<Way>(['kopf', 'halbschriftlich', 'schriftlich']);
  const options: ChoiceOption[] = ways.map((w) => (why[w] ? { label: WAY_LABEL[w], whyWrong: why[w] } : { label: WAY_LABEL[w] }));
  return {
    key: `${ID}:${stufe}:wie:${task.family}:${task.expr}`,
    topicId: TOPIC,
    skillId: ID,
    stufe,
    ab: 2,
    prompt: 'Wie rechnest du diese Aufgabe am besten?',
    expression: task.expr,
    answer: { kind: 'choice', options, correct: ways.indexOf(task.way) },
    hints: ['Schau dir die Zahlen genau an: Sind sie rund oder fast rund?', 'Gibt es viele Überträge? Dann hilft dir das schriftliche Rechnen.'],
    steps: [task.reason, `Am besten rechnest du hier ${WAY_LABEL[task.way]}: ${task.expr} = ${fmt(task.value)}.`],
    praise: task.way === 'kopf' ? 'Du hast erkannt, dass es im Kopf schneller geht.' : 'Du hast erkannt, wann sich schriftliches Rechnen lohnt.',
    srText: `Wie rechnest du ${toSpeech(task.expr)} am besten: im Kopf, halbschriftlich oder schriftlich?`,
    kmk: ['ZO.strategien', 'ZO.schriftlich'],
  };
}

/** Stufe 2: halbschriftlich rechnen (zerlegen). */
function halfWritten(rng: Rng, stufe: Stufe): Exercise {
  const kind = weighted(rng, [['mal', 4], ['geteilt', 4], ['fastrund', 2]] as const);
  let expression: string;
  let fields: MultiField[];
  let bugs: Exercise['bugs'];
  let hints: string[];
  let steps: string[];
  let key: string;
  if (kind === 'mal') {
    const m = rng.int(3, 9);
    const h = rng.int(1, 9);
    const r = attempt(() => {
      const r = rng.int(12, 49);
      return r % 10 !== 0 ? r : null;
    }, () => 12);
    const n = h * 100 + r;
    expression = `${m} ${TIMES} ${fmt(n)} = ${m} ${TIMES} ${h * 100} + ${m} ${TIMES} ${r}`;
    fields = [
      { id: 'p1', value: m * h * 100, before: `${m} ${TIMES} ${h * 100} =`, label: `${m} mal ${h * 100}` },
      { id: 'p2', value: m * r, before: `${m} ${TIMES} ${r} =`, label: `${m} mal ${r}` },
      { id: 'sum', value: m * n, before: `${m} ${TIMES} ${fmt(n)} =`, label: `${m} mal ${n}` },
    ];
    bugs = [
      { id: 'hs.second-part', match: { p2: r }, hint: `Auch den zweiten Teil nimmst du mal ${m}.` },
      { id: 'hs.second-part-sum', match: { sum: m * h * 100 + r }, hint: `Auch ${r} nimmst du mal ${m}, bevor du addierst.` },
    ];
    hints = [`Zerlege ${fmt(n)} in ${h * 100} und ${r}.`, `Nimm beide Teile mal ${m}. Dann addierst du.`];
    steps = [
      `${m} ${TIMES} ${h * 100} = ${fmt(m * h * 100)}.`,
      `${m} ${TIMES} ${r} = ${m * r}.`,
      `${fmt(m * h * 100)} + ${m * r} = ${fmt(m * n)}. Also ist ${m} ${TIMES} ${fmt(n)} = ${fmt(m * n)}.`,
    ];
    key = `mal:${m}x${n}`;
  } else if (kind === 'geteilt') {
    const d = rng.int(3, 9);
    const q1 = rng.pick([100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 2000]);
    const q2 = rng.int(3, Math.floor(99 / d));
    const big = d * q1;
    const small = d * q2;
    const a = big + small;
    expression = `${fmt(a)} ${DIV} ${d} = ${fmt(big)} ${DIV} ${d} + ${small} ${DIV} ${d}`;
    fields = [
      { id: 'p1', value: q1, before: `${fmt(big)} ${DIV} ${d} =`, label: `${big} geteilt durch ${d}` },
      { id: 'p2', value: q2, before: `${small} ${DIV} ${d} =`, label: `${small} geteilt durch ${d}` },
      { id: 'sum', value: q1 + q2, before: `${fmt(a)} ${DIV} ${d} =`, label: `${a} geteilt durch ${d}` },
    ];
    bugs = [
      { id: 'hs.zeros', match: { p1: q1 / 10 }, hint: `Rechne zuerst ohne Nullen: ${big / 100} ${DIV} ${d}. Dann hänge die zwei Nullen wieder an.` },
    ];
    hints = [`Teile zuerst ${fmt(big)} durch ${d}. Denk an das Einmaleins.`, `Teile dann ${small} durch ${d} und addiere beide Ergebnisse.`];
    steps = [
      `${fmt(big)} ${DIV} ${d} = ${fmt(q1)}, denn ${big / 100} ${DIV} ${d} = ${q1 / 100}.`,
      `${small} ${DIV} ${d} = ${q2}.`,
      `${fmt(q1)} + ${q2} = ${fmt(q1 + q2)}. Also ist ${fmt(a)} ${DIV} ${d} = ${fmt(q1 + q2)}.`,
    ];
    key = `geteilt:${a}/${d}`;
  } else {
    const m = rng.int(3, 9);
    const h = rng.int(2, 9);
    const s = rng.pick([1, 2, 3, 5]);
    const n = h * 100 - s;
    expression = `${m} ${TIMES} ${n} = ${m} ${TIMES} ${h * 100} ${MINUS} ${m} ${TIMES} ${s}`;
    fields = [
      { id: 'p1', value: m * h * 100, before: `${m} ${TIMES} ${h * 100} =`, label: `${m} mal ${h * 100}` },
      { id: 'p2', value: m * s, before: `${m} ${TIMES} ${s} =`, label: `${m} mal ${s}` },
      { id: 'sum', value: m * n, before: `${m} ${TIMES} ${n} =`, label: `${m} mal ${n}` },
    ];
    bugs = [
      { id: 'hs.plus-instead', match: { sum: m * h * 100 + m * s }, hint: `${n} ist weniger als ${h * 100}. Du musst also ${m} ${TIMES} ${s} abziehen.` },
      { id: 'hs.minus-s', match: { sum: m * h * 100 - s }, hint: `Du nimmst ${s} genau ${m}-mal zu viel. Ziehe also ${m} ${TIMES} ${s} ab.` },
    ];
    hints = [`${n} ist fast ${h * 100}. Rechne erst mit ${h * 100}.`, `Wie viel hast du dann zu viel genommen?`];
    steps = [
      `${m} ${TIMES} ${h * 100} = ${fmt(m * h * 100)}.`,
      `Das ist ${m}-mal ${s} zu viel: ${m} ${TIMES} ${s} = ${m * s}.`,
      `${fmt(m * h * 100)} ${MINUS} ${m * s} = ${fmt(m * n)}. Also ist ${m} ${TIMES} ${n} = ${fmt(m * n)}.`,
    ];
    key = `fastrund:${m}x${n}`;
  }
  return {
    key: `${ID}:${stufe}:${key}`,
    topicId: TOPIC,
    skillId: ID,
    stufe,
    ab: 2,
    prompt: 'Rechne halbschriftlich. Fülle alle Felder aus.',
    expression,
    answer: { kind: 'multi', fields },
    hints,
    steps,
    bugs: (bugs ?? []).filter((b) => {
      const m = b.match as Record<string, number>;
      return Object.entries(m).every(([id, v]) => fields.find((f) => f.id === id)?.value !== v);
    }),
    praise: 'Du hast geschickt zerlegt und die Teile richtig zusammengesetzt.',
    srText: `Rechne halbschriftlich: ${toSpeech(expression)}. Fülle alle Felder aus.`,
    kmk: ['ZO.strategien', kind === 'geteilt' ? 'ZO.division' : 'ZO.schriftlich'],
  };
}

/** Stufe 3 (Knobel): pick the task that suits a way, or give advice. */
function whichTask(rng: Rng, stufe: Stufe, method: SubtractionMethod): Exercise {
  const variant = weighted(rng, [['welche-schriftlich', 40], ['welche-kopf', 35], ['rat', 25]] as const);
  if (variant === 'rat') {
    const fam = rng.pick(['minus1', 'stufenzahl', 'mal10'] as const);
    const task = kopfTask(rng, fam);
    const name = rng.pick(NAMES);
    const correct: ChoiceOption = { label: `Rechne im Kopf. ${task.reason}` };
    const wrong: ChoiceOption[] = [
      { label: 'Rechne schriftlich. Das ist immer am sichersten.', whyWrong: 'Schriftlich ist hier ein Umweg. Bei so einfachen Zahlen geht es im Kopf schneller und sicherer.' },
      { label: 'Rechne halbschriftlich und zerlege die Zahlen.', whyWrong: 'Hier musst du nichts zerlegen. Das geht direkt im Kopf.' },
    ];
    const options = rng.shuffle([correct, ...wrong]);
    return {
      key: `${ID}:${stufe}:rat:${task.family}:${task.expr}`,
      topicId: TOPIC,
      skillId: ID,
      stufe,
      ab: 3,
      context: `${name} will ${task.expr} schriftlich rechnen.`,
      prompt: `Was rätst du ${name}?`,
      answer: { kind: 'choice', options, correct: options.indexOf(correct) },
      hints: ['Schau dir die Zahlen genau an. Ist etwas rund oder besonders einfach?', 'Lohnt sich hier das Rechnen in Spalten?'],
      steps: [task.reason, `Rate ${name}, im Kopf zu rechnen: ${task.expr} = ${fmt(task.value)}.`],
      praise: 'Du hast den einfachsten Rechenweg erkannt und gut begründet.',
      srText: `${name} will ${toSpeech(task.expr)} schriftlich rechnen. Was rätst du ${name}?`,
      kmk: ['ZO.strategien', 'PK.argumentieren'],
      knobel: true,
    };
  }
  const wantWritten = variant === 'welche-schriftlich';
  const target = wantWritten ? writtenTask(rng, rng.pick(WRITTEN_FAMILIES), method) : kopfTask(rng, rng.pick(KOPF_FAMILIES));
  const others = wantWritten
    ? rng.sample(KOPF_FAMILIES, 3).map((f) => kopfTask(rng, f))
    : rng.sample(WRITTEN_FAMILIES, 3).map((f) => writtenTask(rng, f, method));
  const correct: ChoiceOption = { label: target.expr };
  const wrong: ChoiceOption[] = others.map((t) => ({
    label: t.expr,
    whyWrong: wantWritten ? `${t.reason} Das geht im Kopf.` : `${manySteps(t, method)} Schriftlich ist es sicherer.`,
  }));
  const options = rng.shuffle([correct, ...wrong]);
  const prompt = wantWritten ? 'Welche Aufgabe rechnest du am besten schriftlich?' : 'Welche Aufgabe rechnest du am besten im Kopf?';
  return {
    key: `${ID}:${stufe}:${variant}:${[target, ...others].map((t) => t.expr).join('|')}`,
    topicId: TOPIC,
    skillId: ID,
    stufe,
    ab: 3,
    prompt,
    answer: { kind: 'choice', options, correct: options.indexOf(correct) },
    hints: ['Schau bei jeder Aufgabe: Sind die Zahlen rund? Gibt es viele Überträge?', wantWritten ? 'Drei Aufgaben haben einen Trick für den Kopf.' : 'Nur eine Aufgabe hat einen Trick für den Kopf.'],
    steps: [
      target.reason,
      wantWritten && target.op && target.operands
        ? {
          text: `Am besten schriftlich: ${target.expr} = ${fmt(target.value)}.`,
          visual: writtenVisual({
            type: 'written',
            op: target.op,
            operands: target.operands,
            method: target.op === 'sub' ? method : undefined,
            showSolution: true,
          }),
        }
        : `Am besten ${wantWritten ? 'schriftlich' : 'im Kopf'}: ${target.expr} = ${fmt(target.value)}.`,
    ],
    praise: wantWritten ? 'Du hast erkannt, wann sich schriftliches Rechnen lohnt.' : 'Du hast den Trick für den Kopf entdeckt.',
    srText: `${prompt} ${options.map((o, i) => `Aufgabe ${i + 1}: ${toSpeech(o.label)}.`).join(' ')}`,
    kmk: ['ZO.strategien', 'PK.argumentieren'],
    knobel: true,
  };
}

export const rechenwegSkill: SkillDef = {
  id: ID,
  topicId: 'schriftlich',
  title: 'Kopf oder schriftlich?',
  description: 'Du entscheidest, ob du im Kopf, halbschriftlich oder schriftlich rechnest.',
  stufen: {
    1: 'Den passenden Rechenweg wählen',
    2: 'Halbschriftlich rechnen: geschickt zerlegen',
    3: 'Rechenwege vergleichen und Tipps geben',
  },
  kmk: ['ZO.strategien', 'ZO.schriftlich'],
  generate(rng, stufe, ctx) {
    const method = ctx.subtractionMethod;
    if (stufe === 1) return chooseWay(rng, stufe, method);
    if (stufe === 2) return halfWritten(rng, stufe);
    return whichTask(rng, stufe, method);
  },
};
