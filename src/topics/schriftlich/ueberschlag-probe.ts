import { APPROX, BOX, DIV, MINUS, TIMES, fmt, toSpeech } from '../../core/format';
import type { ChoiceOption, Exercise, Rng, SkillDef, Stufe, SubtractionMethod, WrittenOp } from '../../core/types';
import { bugCandidates } from './bugs';
import { NAMES, TOPIC, attempt, expressionOf, randLen, roundLead, truncLead, ueberschlag, uniqueBugs, weighted } from './common';
import { correctResult, digitAt, numLength, writtenVisual } from './layout';

const ID = 'schriftlich.ueberschlag-probe';
const KMK = ['ZO.kontrolle', 'ZO.runden'];

/** 'Runde 4 873 auf die höchste Stelle: Die Ziffer danach ist 8, also aufrunden: 5 000.' */
export function roundingStep(n: number): string {
  const r = roundLead(n);
  if (n < 10) return `${n} bleibt ${n}.`;
  const next = digitAt(n, numLength(n) - 2);
  return `Runde ${fmt(n)} auf die höchste Stelle: Die Ziffer danach ist ${next}, also ${next >= 5 ? 'aufrunden' : 'abrunden'}: ${fmt(r)}.`;
}

function choiceAnswer(rng: Rng, correct: ChoiceOption, wrong: ChoiceOption[]): { options: ChoiceOption[]; correct: number } {
  const options = rng.shuffle([correct, ...wrong]);
  return { options, correct: options.indexOf(correct) };
}

/** Number answer: Überschlag of a + b, a − b or a · b. */
function estimateItem(rng: Rng, stufe: Stufe, op: WrittenOp): Exercise {
  const operands = attempt<number[]>(
    () => {
      let ops: number[];
      if (op === 'add') ops = [randLen(rng, rng.int(3, 4)), randLen(rng, rng.int(3, 4))];
      else if (op === 'sub') ops = [randLen(rng, 4), randLen(rng, rng.int(3, 4))];
      else ops = [randLen(rng, rng.int(3, 4)), rng.chance(0.5) ? rng.int(3, 9) : rng.int(12, 99)];
      const u = ueberschlag(op, ops).value;
      if (u <= 0 || u > 1_000_000) return null;
      if (op === 'sub' && ops[0] <= ops[1]) return null;
      // at least one number must really be rounded
      return ops.some((n) => n >= 10 && roundLead(n) !== n) ? ops : null;
    },
    () => (op === 'mul' ? [4738, 6] : [4873, 2145]),
  );
  const ue = ueberschlag(op, operands);
  const exact = correctResult(op, operands);
  const trunc = op === 'add' ? operands.map(truncLead).reduce((s, n) => s + n, 0)
    : op === 'sub' ? truncLead(operands[0]) - truncLead(operands[1])
      : truncLead(operands[0]) * truncLead(operands[1]);
  const expression = `${expressionOf(op, operands)} ${APPROX} ${BOX}`;
  const bugs = uniqueBugs(ue.value, [
    { id: 'ue.exact', match: exact, hint: 'Beim Überschlag rechnest du nicht genau. Runde zuerst jede Zahl auf die höchste Stelle.' },
    { id: 'ue.cut', match: trunc, hint: 'Schau auf die Ziffer nach der höchsten Stelle: Ab 5 rundest du auf.' },
    ...(op === 'mul'
      ? [
        { id: 'ue.zeros-lost', match: ue.value / 10, hint: 'Zähle die Nullen: Beim Malnehmen mit Nullen hängst du alle Nullen an.' },
        { id: 'ue.zeros-extra', match: ue.value * 10, hint: 'Zähle die Nullen noch einmal: Es ist eine Null zu viel.' },
      ]
      : []),
  ]).filter((b) => typeof b.match === 'number' && b.match > 0);
  return {
    key: `${ID}:${stufe}:ue:${expressionOf(op, operands)}`,
    topicId: TOPIC,
    skillId: ID,
    stufe,
    ab: stufe === 1 ? 1 : 2,
    prompt: 'Mach einen Überschlag. Runde jede Zahl auf die höchste Stelle.',
    expression,
    answer: { kind: 'number', value: ue.value, label: 'Überschlag' },
    hints: [
      'Schau bei jeder Zahl auf die höchste Stelle und die Ziffer danach.',
      'Ist die Ziffer danach 5 oder mehr, rundest du auf. Sonst rundest du ab.',
      `Rechne dann mit den gerundeten Zahlen ${op === 'mul' ? 'mal' : op === 'add' ? 'plus' : 'minus'}.`,
    ],
    steps: [
      ...operands.filter((n) => n >= 10).map(roundingStep),
      `Überschlag: ${ue.expression} = ${fmt(ue.value)}.`,
    ],
    bugs,
    praise: 'Du hast sauber auf die höchste Stelle gerundet.',
    srText: `Überschlage: ${toSpeech(expression)}. Runde jede Zahl auf die höchste Stelle.`,
    kmk: KMK,
  };
}

/** Choice: which calculation is the Probe (Umkehraufgabe)? */
function probeChoice(rng: Rng, stufe: Stufe): Exercise {
  const isAdd = rng.chance(0.5);
  const [a, b] = attempt<[number, number]>(
    () => {
      const a = randLen(rng, 4);
      const b = randLen(rng, rng.int(3, 4));
      return a > b && a + b < 10_000 ? [a, b] : null;
    },
    () => [4873, 2145],
  );
  let given: string;
  let correct: ChoiceOption;
  let wrong: ChoiceOption[];
  if (isAdd) {
    const s = a + b;
    given = `${fmt(a)} + ${fmt(b)} = ${fmt(s)}`;
    correct = { label: `${fmt(s)} ${MINUS} ${fmt(b)}` };
    wrong = [
      { label: `${fmt(s)} + ${fmt(b)}`, whyWrong: 'Die Probe zu einer Plusaufgabe ist eine Minusaufgabe. Du rechnest zurück.' },
      { label: `${fmt(a)} ${MINUS} ${fmt(b)}`, whyWrong: 'Starte bei der Summe. Davon ziehst du einen Summanden ab.' },
      { label: `${fmt(s)} + ${fmt(a)}`, whyWrong: 'Rechne zurück: Von der Summe nimmst du einen Summanden weg.' },
    ];
  } else {
    const d = a - b;
    given = `${fmt(a)} ${MINUS} ${fmt(b)} = ${fmt(d)}`;
    correct = { label: `${fmt(d)} + ${fmt(b)}` };
    wrong = [
      { label: `${fmt(a)} + ${fmt(b)}`, whyWrong: 'Bei der Probe rechnest du mit dem Ergebnis. Es soll wieder die erste Zahl herauskommen.' },
      { label: `${fmt(d)} ${MINUS} ${fmt(b)}`, whyWrong: 'Die Probe zu einer Minusaufgabe ist eine Plusaufgabe.' },
      { label: `${fmt(a)} + ${fmt(d)}`, whyWrong: 'Bei der Probe kommt wieder die erste Zahl heraus. Rechne Ergebnis plus Subtrahend.' },
    ];
  }
  const { options, correct: idx } = choiceAnswer(rng, correct, wrong);
  return {
    key: `${ID}:${stufe}:probe:${isAdd ? 'add' : 'sub'}:${a}:${b}`,
    topicId: TOPIC,
    skillId: ID,
    stufe,
    ab: 1,
    context: `${rng.pick(NAMES)} hat gerechnet: ${given}.`,
    prompt: 'Mit welcher Aufgabe machst du die Probe?',
    answer: { kind: 'choice', options, correct: idx },
    hints: [
      'Die Probe ist die Umkehraufgabe: Du rechnest rückwärts.',
      isAdd ? 'Die Umkehraufgabe zu plus ist minus. Starte beim Ergebnis.' : 'Die Umkehraufgabe zu minus ist plus. Starte beim Ergebnis.',
    ],
    steps: [
      isAdd ? 'Zu einer Plusaufgabe gehört als Probe eine Minusaufgabe.' : 'Zu einer Minusaufgabe gehört als Probe eine Plusaufgabe.',
      `Die Probe ist ${correct.label} = ${fmt(a)}. ${isAdd ? 'Es kommt wieder der erste Summand heraus.' : 'Es kommt wieder der Minuend heraus.'}`,
    ],
    praise: 'Du hast die passende Umkehraufgabe gefunden.',
    srText: `Jemand hat gerechnet: ${toSpeech(given)}. Mit welcher Aufgabe machst du die Probe?`,
    kmk: ['ZO.kontrolle'],
  };
}

/** Choice: which result can be right? (decided by the Überschlag) */
function plausibleChoice(rng: Rng, stufe: Stufe): Exercise {
  const op = weighted(rng, [['mul', 5], ['add', 3], ['sub', 2]] as const);
  const operands = attempt<number[]>(
    () => {
      const ops = op === 'mul' ? [randLen(rng, 4), rng.int(3, 9)] : op === 'add' ? [randLen(rng, 5), randLen(rng, 5)] : [randLen(rng, 5), randLen(rng, 4)];
      const res = correctResult(op, ops);
      // res < 100 000: the "about ten times too big" option stays inside the Zahlenraum bis 1 000 000
      return ueberschlag(op, ops).value > 0 && res >= 1000 && res < 100_000 ? ops : null;
    },
    () => [4738, 6],
  );
  const res = correctResult(op, operands);
  const u = ueberschlag(op, operands).value;
  const s = String(res);
  const [small, big] = attempt<[number, number]>(
    () => {
      const cut = rng.int(1, s.length - 1);
      const small = Number(s.slice(0, cut) + s.slice(cut + 1));
      const ins = rng.int(1, s.length - 1);
      const big = Number(s.slice(0, ins) + String(rng.int(0, 9)) + s.slice(ins));
      return small * 4 <= u && big >= 4 * u && big <= 1_000_000 ? [small, big] : null;
    },
    () => [Math.floor(res / 10), res * 10 + 1],
  );
  const expr = expressionOf(op, operands);
  const correct: ChoiceOption = { label: fmt(res) };
  const wrong: ChoiceOption[] = [
    { label: fmt(small), whyWrong: `Der Überschlag ist ${fmt(u)}. ${fmt(small)} ist viel zu klein.` },
    { label: fmt(big), whyWrong: `Der Überschlag ist ${fmt(u)}. ${fmt(big)} ist viel zu groß.` },
  ];
  const { options, correct: idx } = choiceAnswer(rng, correct, wrong);
  return {
    key: `${ID}:${stufe}:plausibel:${expr}`,
    topicId: TOPIC,
    skillId: ID,
    stufe,
    ab: 2,
    prompt: 'Welches Ergebnis kann stimmen? Entscheide mit einem Überschlag.',
    expression: `${expr} = ${BOX}`,
    answer: { kind: 'choice', options, correct: idx },
    hints: ['Runde jede Zahl auf die höchste Stelle und rechne im Kopf.', 'Welches Ergebnis liegt nah an deinem Überschlag?'],
    steps: [ueberschlag(op, operands).text, `Nur ${fmt(res)} liegt nah an ${fmt(u)}. Die anderen sind etwa zehnmal zu klein oder zu groß.`],
    praise: 'Du hast mit dem Überschlag geprüft, ob die Größe passt.',
    srText: `Welches Ergebnis kann stimmen: ${toSpeech(expr)}? Entscheide mit einem Überschlag.`,
    kmk: KMK,
  };
}

/** Number: □ : d = q R r — which number was divided? (Probe with Rest) */
function divisionInverse(rng: Rng, stufe: Stufe): Exercise {
  const q = randLen(rng, rng.int(3, 4));
  const d = rng.int(3, 9);
  const r = rng.int(1, d - 1);
  const a = q * d + r;
  const expression = `${BOX} ${DIV} ${d} = ${fmt(q)} R ${r}`;
  return {
    key: `${ID}:${stufe}:umkehr-div:${q}:${d}:${r}`,
    topicId: TOPIC,
    skillId: ID,
    stufe,
    ab: 2,
    prompt: 'Welche Zahl wurde geteilt? Rechne die Probe.',
    expression,
    answer: { kind: 'number', value: a, label: 'Geteilte Zahl' },
    hints: ['Die Probe zu geteilt ist mal.', 'Nimm das Ergebnis mal den Divisor. Was machst du dann mit dem Rest?'],
    steps: [
      `Probe: ${fmt(q)} ${TIMES} ${d} + ${r}.`,
      `${fmt(q)} ${TIMES} ${d} = ${fmt(q * d)}.`,
      {
        text: `${fmt(q * d)} + ${r} = ${fmt(a)}. Die geteilte Zahl ist ${fmt(a)}.`,
        visual: writtenVisual({ type: 'written', op: 'div', operands: [a, d], showSolution: true }),
      },
    ],
    bugs: uniqueBugs(a, [
      { id: 'probe.rest-vergessen', match: q * d, hint: 'Denk an den Rest: Du zählst ihn am Ende dazu.' },
      { id: 'probe.rest-abgezogen', match: q * d - r, hint: 'Den Rest zählst du dazu, nicht ab.' },
      { id: 'probe.rest-zuerst', match: (q + r) * d, hint: 'Erst malnehmen, dann den Rest dazuzählen.' },
    ]),
    praise: 'Du hast an den Rest in der Probe gedacht.',
    srText: `${toSpeech(expression.replace(' R ', ' Rest '))}. Welche Zahl wurde geteilt?`,
    kmk: ['ZO.kontrolle', 'ZO.division'],
  };
}

/** Knobel: does a given result fit the Überschlag? */
function fitsChoice(rng: Rng, stufe: Stufe, method: SubtractionMethod): Exercise {
  const op = weighted(rng, [['add', 4], ['sub', 3], ['mul', 3]] as const);
  const operands = attempt<number[]>(
    () => {
      const ops = op === 'mul' ? [randLen(rng, 4), rng.int(12, 99)] : op === 'add' ? [randLen(rng, 5), randLen(rng, rng.int(4, 5))] : [randLen(rng, 6), randLen(rng, 5)];
      const u = ueberschlag(op, ops).value;
      const res = correctResult(op, ops);
      // the correct result must visibly fit the Überschlag
      return u > 0 && u <= 1_000_000 && res <= 1_000_000 && Math.abs(res - u) <= 0.2 * u ? ops : null;
    },
    () => [34_567, 28_945],
  );
  const res = correctResult(op, operands);
  const u = ueberschlag(op, operands).value;
  const showWrong = rng.chance(0.6);
  let shown = res;
  if (showWrong) {
    const far = bugCandidates(op, operands, method).map((c) => c.value).filter((v) => Math.abs(v - u) >= 0.4 * u && v <= 1_000_000);
    if (far.length > 0) shown = rng.pick(far);
    else {
      const s = String(res);
      const cut = rng.int(1, s.length - 1);
      shown = Number(s.slice(0, cut) + s.slice(cut + 1));
    }
  }
  const fits = shown === res;
  const name = rng.pick(NAMES);
  const given = `${expressionOf(op, operands)} = ${fmt(shown)}`;
  const yes: ChoiceOption = { label: 'Ja, das Ergebnis liegt nah am Überschlag.' };
  const no: ChoiceOption = { label: 'Nein, das Ergebnis liegt weit weg vom Überschlag.' };
  const unsure: ChoiceOption = {
    label: 'Das kann man ohne genaues Rechnen nicht sagen.',
    whyWrong: 'Mit einem Überschlag prüfst du schnell, ob die Größe passt. Runde und rechne im Kopf.',
  };
  if (fits) no.whyWrong = `Der Überschlag ist ${fmt(u)}. ${fmt(shown)} liegt ganz in der Nähe.`;
  else yes.whyWrong = `Der Überschlag ist ${fmt(u)}. ${fmt(shown)} ist zu weit weg.`;
  const { options, correct } = choiceAnswer(rng, fits ? yes : no, [fits ? no : yes, unsure]);
  return {
    key: `${ID}:${stufe}:passt:${expressionOf(op, operands)}=${shown}`,
    topicId: TOPIC,
    skillId: ID,
    stufe,
    ab: 3,
    context: `${name} hat schriftlich gerechnet: ${given}.`,
    prompt: 'Passt das Ergebnis zum Überschlag?',
    visual: writtenVisual({ type: 'written', op, operands: operands.slice(), method: op === 'sub' ? method : undefined, showSolution: false, shownResult: shown }),
    answer: { kind: 'choice', options, correct },
    hints: ['Runde jede Zahl auf die höchste Stelle.', 'Rechne mit den gerundeten Zahlen im Kopf. Vergleiche dann.'],
    steps: [
      ueberschlag(op, operands).text,
      fits
        ? `${fmt(shown)} liegt nah an ${fmt(u)}. Das Ergebnis passt zum Überschlag.`
        : `${fmt(shown)} liegt weit weg von ${fmt(u)}. Das Ergebnis passt nicht. Richtig ist ${fmt(res)}.`,
    ],
    praise: 'Du hast das Ergebnis mit einem Überschlag geprüft.',
    srText: `${name} hat schriftlich gerechnet: ${toSpeech(given)}. Passt das Ergebnis zum Überschlag?`,
    kmk: ['ZO.kontrolle', 'ZO.runden', 'PK.argumentieren'],
    knobel: true,
  };
}

/** Knobel: which division was checked by this Probe? */
function divisionFromProbe(rng: Rng, stufe: Stufe): Exercise {
  const q = randLen(rng, rng.int(3, 4));
  const d = rng.int(3, 9);
  const r = rng.int(2, d - 1);
  const a = q * d + r;
  const probe = `${fmt(q)} ${TIMES} ${d} + ${r} = ${fmt(a)}`;
  const correct: ChoiceOption = { label: `${fmt(a)} ${DIV} ${d} = ${fmt(q)} R ${r}` };
  const wrong: ChoiceOption[] = [
    { label: `${fmt(a)} ${DIV} ${r} = ${fmt(q)} R ${d}`, whyWrong: `Der Rest ist die Zahl, die dazugezählt wird. Geteilt wird durch ${d}.` },
    { label: `${fmt(q * d)} ${DIV} ${d} = ${fmt(q)} R ${r}`, whyWrong: 'Geteilt wird die Zahl, die bei der Probe am Ende herauskommt.' },
    { label: `${fmt(q)} ${DIV} ${d} = ${fmt(a)} R ${r}`, whyWrong: 'Beim Teilen wird das Ergebnis kleiner als die geteilte Zahl.' },
  ];
  const { options, correct: idx } = choiceAnswer(rng, correct, wrong);
  return {
    key: `${ID}:${stufe}:probe-div:${q}:${d}:${r}`,
    topicId: TOPIC,
    skillId: ID,
    stufe,
    ab: 3,
    context: `${rng.pick(NAMES)} macht eine Probe: ${probe}.`,
    prompt: 'Welche Divisionsaufgabe wurde geprüft?',
    answer: { kind: 'choice', options, correct: idx },
    hints: ['Bei der Probe nimmst du das Ergebnis mal den Divisor und zählst den Rest dazu.', 'Welche Zahl kommt am Ende heraus? Diese Zahl wurde geteilt.'],
    steps: [
      `In der Probe ist ${fmt(q)} das Ergebnis, ${d} der Divisor und ${r} der Rest.`,
      `Geteilt wurde ${fmt(a)}. Die Aufgabe ist ${correct.label}.`,
    ],
    praise: 'Du hast die Teile der Probe richtig zugeordnet.',
    srText: `Jemand macht eine Probe: ${toSpeech(probe)}. Welche Divisionsaufgabe wurde geprüft?`,
    kmk: ['ZO.kontrolle', 'ZO.division', 'PK.argumentieren'],
    knobel: true,
  };
}

export const ueberschlagProbeSkill: SkillDef = {
  id: ID,
  topicId: 'schriftlich',
  title: 'Überschlag und Probe',
  description: 'Du schätzt vorher mit einem Überschlag und prüfst nachher mit der Umkehraufgabe.',
  stufen: {
    1: 'Überschlag bei plus und minus, die passende Probe finden',
    2: 'Überschlag beim Malnehmen, Ergebnisse prüfen, Probe mit Rest',
    3: 'Fremde Rechnungen prüfen und Proben deuten',
  },
  kmk: KMK,
  generate(rng, stufe, ctx) {
    if (stufe === 1) {
      const v = weighted(rng, [['add', 35], ['sub', 30], ['probe', 35]] as const);
      return v === 'probe' ? probeChoice(rng, stufe) : estimateItem(rng, stufe, v);
    }
    if (stufe === 2) {
      const v = weighted(rng, [['mul', 30], ['plausibel', 35], ['umkehr', 35]] as const);
      if (v === 'plausibel') return plausibleChoice(rng, stufe);
      if (v === 'umkehr') return divisionInverse(rng, stufe);
      return estimateItem(rng, stufe, 'mul');
    }
    return rng.chance(0.55) ? fitsChoice(rng, stufe, ctx.subtractionMethod) : divisionFromProbe(rng, stufe);
  },
};
