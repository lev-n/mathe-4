/**
 * Modellieren: Geschichte ↔ Rechnung.
 * Stufe 1: "Welche Rechnung passt zur Geschichte?" (one step).
 * Stufe 2: two-step terms ('4 · 2 € + 3 €' vs '4 · (2 € + 3 €)') and "Welche Frage passt zur Rechnung?".
 * Stufe 3: "Welche Geschichte passt zur Rechnung?" incl. stories whose wording suggests another operation.
 */
import { MINUS, TIMES, fmt } from '../../core/format';
import type { ChoiceOption, Exercise, Rng, SkillDef, Stufe } from '../../core/types';
import { build, makeChoice, pickTwo, speak, type Person } from './shared';
import { oneStepStory, OP_SIGN, opResult, type Op } from './stories';

const OP_DOES: Record<Op, string> = {
  '+': 'Bei Plus kommt etwas dazu.',
  '-': 'Bei Minus wird etwas weggenommen oder der Unterschied gesucht.',
  '*': 'Bei Mal nimmst du gleich große Mengen mehrmals.',
  ':': 'Bei Geteilt wird etwas gerecht verteilt oder in gleiche Gruppen eingeteilt.',
};

const OP_CHECK: Record<Op, string> = {
  '+': 'Kommt in der Geschichte wirklich etwas dazu?',
  '-': 'Wird in der Geschichte wirklich etwas weggenommen?',
  '*': 'Gibt es in der Geschichte gleich große Mengen, die mehrmals vorkommen?',
  ':': 'Wird in der Geschichte wirklich etwas verteilt oder eingeteilt?',
};

// ─── Stufe 1 ─────────────────────────────────────────────────────────────────

function whichTerm(stufe: Stufe, rng: Rng): Exercise {
  const st = oneStepStory(rng, stufe === 3 ? 3 : 1);
  const termOf = (op: Op): string => {
    const [x, y] = op === '-' && st.a < st.b ? [st.b, st.a] : [st.a, st.b];
    return `${fmt(x)} ${OP_SIGN[op]} ${fmt(y)}`;
  };
  const right = termOf(st.op);
  const wrongs: ChoiceOption[] = (['+', '-', '*', ':'] as const)
    .filter((op) => op !== st.op)
    .map((op) => ({
      label: termOf(op),
      whyWrong: st.trap && st.trap.op === op ? st.trap.hint : `${OP_DOES[op]} ${OP_CHECK[op]}`,
    }));
  const answer = makeChoice(rng, { label: right }, wrongs, { max: 4 });
  return build(modellierenSkill, stufe, {
    key: `rechnung:${st.key}`,
    ab: st.trap ? 3 : 1,
    knobel: st.trap ? true : undefined,
    context: st.context,
    prompt: `${st.question} Welche Rechnung passt?`,
    emoji: st.emoji,
    answer,
    hints: ['Stell dir die Geschichte vor: Was passiert mit den Dingen?', st.hint],
    steps: [`In der Geschichte: ${st.hint}`, `Passende Rechnung: ${right} = ${fmt(st.value)}`],
    praise: st.trap ? 'Du hast dich nicht von einem Signalwort täuschen lassen.' : 'Du hast die Rechnung passend zur Geschichte gewählt.',
    srText: `${speak(st.context)} ${st.question} Welche Rechnung passt? Wähle aus: ${answer.options.map((o) => speak(o.label)).join('; ')}.`,
    kmk: ['PK.modellieren', 'ZO.sachrechnen'],
  });
}

// ─── Stufe 2 ─────────────────────────────────────────────────────────────────

interface TwoStep { key: string; context: string; question: string; right: string; wrongs: ChoiceOption[]; result: string }

function twoStepStory(rng: Rng, who: Person): TwoStep {
  const v = rng.int(1, 4);
  const T = TIMES;
  if (v === 1) {
    const n = rng.int(3, 8);
    const p = rng.int(2, 5);
    const q = rng.int(3, 9);
    return {
      key: `t1:${n}:${p}:${q}`,
      context: `${who.name} kauft ${n} Hefte zu je ${p}\u00A0€. Dazu kauft ${who.p} einen Block für ${q}\u00A0€.`,
      question: `Wie viel bezahlt ${who.name}?`,
      right: `${n} ${T} ${p}\u00A0€ + ${q}\u00A0€`,
      wrongs: [
        { label: `${n} ${T} (${p}\u00A0€ + ${q}\u00A0€)`, whyWrong: `So hätte ${who.name} ${n} Blöcke gekauft. Es ist aber nur ein Block.` },
        { label: `${n} + ${p}\u00A0€ + ${q}\u00A0€`, whyWrong: `${n} ist die Anzahl der Hefte. Jedes Heft kostet ${p}\u00A0€.` },
        { label: `${n} ${T} ${p}\u00A0€ ${MINUS} ${q}\u00A0€`, whyWrong: 'Der Block kostet auch Geld. Er kommt dazu.' },
      ],
      result: `${n * p + q}\u00A0€`,
    };
  }
  if (v === 2) {
    const r = rng.int(3, 6);
    const a = rng.int(20, 60);
    const b = rng.int(5, 19);
    return {
      key: `t2:${r}:${a}:${b}`,
      context: `In der Bücherei stehen ${r} Regale mit je ${a} Büchern. ${b} Bücher sind ausgeliehen.`,
      question: 'Wie viele Bücher stehen noch in den Regalen?',
      right: `${r} ${T} ${a} ${MINUS} ${b}`,
      wrongs: [
        { label: `${r} ${T} (${a} ${MINUS} ${b})`, whyWrong: `So würden aus jedem Regal ${b} Bücher fehlen. Es fehlen aber nur ${b} Bücher insgesamt.` },
        { label: `${r} + ${a} ${MINUS} ${b}`, whyWrong: `Es sind ${r} Regale mit je ${a} Büchern. Das ist eine Mal-Aufgabe.` },
        { label: `${r} ${T} ${a} + ${b}`, whyWrong: 'Ausgeliehene Bücher stehen nicht im Regal. Sie werden abgezogen.' },
      ],
      result: `${r * a - b}`,
    };
  }
  if (v === 3) {
    const e = rng.int(10, 16);
    const k = rng.int(2, 4);
    const c = rng.int(5, 9);
    return {
      key: `t3:${e}:${k}:${c}`,
      context: `2 Erwachsene und ${k} Kinder gehen ins Schwimmbad. Erwachsene zahlen ${e}\u00A0€, Kinder ${c}\u00A0€.`,
      question: 'Wie viel Eintritt zahlen alle zusammen?',
      right: `2 ${T} ${e}\u00A0€ + ${k} ${T} ${c}\u00A0€`,
      wrongs: [
        { label: `(2 + ${k}) ${T} ${e}\u00A0€`, whyWrong: 'Kinder zahlen weniger als Erwachsene.' },
        { label: `2 ${T} ${e}\u00A0€ + ${c}\u00A0€`, whyWrong: `Es sind ${k} Kinder, nicht nur eines.` },
        { label: `${e}\u00A0€ + ${c}\u00A0€`, whyWrong: `Es sind 2 Erwachsene und ${k} Kinder.` },
      ],
      result: `${2 * e + k * c}\u00A0€`,
    };
  }
  const m = rng.pick([10, 20]);
  const n = rng.int(2, 6);
  const p = rng.int(1, Math.floor((m - 1) / n));
  return {
    key: `t4:${m}:${n}:${p}`,
    context: `${who.name} hat ${m}\u00A0€. ${who.p === 'sie' ? 'Sie' : 'Er'} kauft ${n} Packungen Sticker zu je ${p}\u00A0€.`,
    question: `Wie viel Geld hat ${who.name} danach noch?`,
    right: `${m}\u00A0€ ${MINUS} ${n} ${T} ${p}\u00A0€`,
    wrongs: [
      { label: `${m}\u00A0€ + ${n} ${T} ${p}\u00A0€`, whyWrong: `${who.name} gibt Geld aus. Es wird weniger.` },
      { label: `${m}\u00A0€ ${MINUS} ${n}\u00A0€ ${MINUS} ${p}\u00A0€`, whyWrong: `${n} ist die Anzahl der Packungen, kein Preis.` },
      { label: `${m}\u00A0€ ${MINUS} ${p}\u00A0€`, whyWrong: `${who.name} kauft ${n} Packungen, nicht nur eine.` },
    ],
    result: `${m - n * p}\u00A0€`,
  };
}

function whichTwoStepTerm(stufe: Stufe, rng: Rng, who: Person): Exercise {
  const t = twoStepStory(rng, who);
  const answer = makeChoice(rng, { label: t.right }, t.wrongs);
  return build(modellierenSkill, stufe, {
    key: `zweischritt:${t.key}`,
    ab: 2,
    context: t.context,
    prompt: `${t.question} Welche Rechnung passt?`,
    emoji: '🧩',
    answer,
    hints: ['Welche Dinge kommen mehrmals vor? Welche nur einmal?', 'Prüfe jede Rechnung: Was würde sie in der Geschichte bedeuten?'],
    steps: [`Passend ist: ${t.right}`, `Ergebnis: ${t.result}`],
    praise: 'Du hast die Rechnung Schritt für Schritt mit der Geschichte verglichen.',
    srText: `${speak(t.context)} ${t.question} Welche Rechnung passt? Wähle aus: ${answer.options.map((o) => speak(o.label)).join('; ')}.`,
    kmk: ['PK.modellieren', 'ZO.sachrechnen'],
  });
}

interface QuestionItem { key: string; context: string; term: string; right: string; wrongs: ChoiceOption[] }

function questionForTerm(rng: Rng, who: Person): QuestionItem {
  const v = rng.int(1, 3);
  if (v === 1) {
    const n = rng.int(2, 5);
    const p = rng.int(2, 3);
    // the note is chosen after the price, so that it always covers the purchase (no negative or zero change)
    const note = rng.pick([10, 20].filter((x) => x > n * p));
    return {
      key: `q1:${n}:${p}:${note}`,
      context: `${who.name} kauft ${n} Malblöcke zu je ${p}\u00A0€. ${who.p === 'sie' ? 'Sie' : 'Er'} bezahlt mit einem ${note}-€-Schein.`,
      term: `${note}\u00A0€ ${MINUS} ${n} ${TIMES} ${p}\u00A0€`,
      right: `Wie viel Rückgeld bekommt ${who.name}?`,
      wrongs: [
        { label: 'Wie viel kosten die Malblöcke zusammen?', whyWrong: `Dafür reicht ${n} ${TIMES} ${p}\u00A0€. In der Rechnung wird noch etwas abgezogen.` },
        { label: 'Wie viel kostet ein Malblock?', whyWrong: 'Das steht schon in der Geschichte. Dafür braucht man keine Rechnung.' },
        { label: `Wie viele Malblöcke kauft ${who.name}?`, whyWrong: 'Das steht schon in der Geschichte.' },
      ],
    };
  }
  if (v === 2) {
    const a = rng.int(18, 35);
    const out = rng.int(3, 9);
    const inn = rng.int(2, 9);
    return {
      key: `q2:${a}:${out}:${inn}`,
      context: `Im Bus sitzen ${a} Kinder. An der Haltestelle steigen ${out} Kinder aus und ${inn} Kinder ein.`,
      term: `${a} ${MINUS} ${out} + ${inn}`,
      right: 'Wie viele Kinder sitzen jetzt im Bus?',
      wrongs: [
        { label: 'Wie viele Kinder sitzen nach dem Aussteigen im Bus?', whyWrong: `Dafür reicht ${a} ${MINUS} ${out}. In der Rechnung steigen noch Kinder ein.` },
        { label: 'Wie viele Kinder steigen aus?', whyWrong: 'Das steht schon in der Geschichte.' },
        { label: 'Wie viele Kinder steigen insgesamt ein und aus?', whyWrong: `Dafür würde man ${out} + ${inn} rechnen.` },
      ],
    };
  }
  const k = rng.int(3, 6);
  const per = rng.int(k + 1, 12);
  let eaten = rng.int(2, k * per - 2);
  if (eaten === k || eaten === per) eaten += 1;
  return {
    key: `q3:${k}:${per}:${eaten}`,
    context: `Auf dem Schulfest gibt es ${k} Bleche mit je ${per} Stück Kuchen. ${eaten} Stück werden gegessen.`,
    term: `${k} ${TIMES} ${per} ${MINUS} ${eaten}`,
    right: 'Wie viele Stück Kuchen sind noch übrig?',
    wrongs: [
      { label: 'Wie viele Stück Kuchen gab es am Anfang?', whyWrong: `Dafür reicht ${k} ${TIMES} ${per}. In der Rechnung wird noch etwas abgezogen.` },
      { label: 'Wie viele Stück werden gegessen?', whyWrong: 'Das steht schon in der Geschichte.' },
      { label: 'Wie viele Bleche gibt es?', whyWrong: 'Das steht schon in der Geschichte.' },
    ],
  };
}

function whichQuestion(stufe: Stufe, rng: Rng, who: Person): Exercise {
  const q = questionForTerm(rng, who);
  const answer = makeChoice(rng, { label: q.right }, q.wrongs);
  return build(modellierenSkill, stufe, {
    key: `frage:${q.key}`,
    ab: 2,
    context: q.context,
    prompt: 'Welche Frage passt zu dieser Rechnung?',
    expression: q.term,
    emoji: '❓',
    answer,
    hints: ['Was bedeutet jede Zahl in der Rechnung?', 'Was rechnet man am Ende aus?'],
    steps: [`Rechnung: ${q.term}`, `Sie passt zu der Frage: ${q.right}`],
    praise: 'Du hast herausgefunden, was die Rechnung in der Geschichte bedeutet.',
    srText: `${speak(q.context)} Welche Frage passt zur Rechnung ${speak(q.term)}? Wähle aus: ${answer.options.map((o) => o.label).join(' ')}`,
    kmk: ['PK.modellieren', 'PK.darstellen'],
  });
}

// ─── Stufe 3 ─────────────────────────────────────────────────────────────────

type Snippet = (a: number, b: number, p: Person, o: Person) => string;

/** Short stories per operation; 'tricky' ones use wording that suggests another operation. */
const SNIPPETS: Record<Op, { plain: Snippet[]; tricky: Snippet[] }> = {
  '+': {
    plain: [
      (a, b, p) => `${p.name} hat ${a} Murmeln. ${p.p === 'sie' ? 'Sie' : 'Er'} bekommt ${b} Murmeln dazu. Wie viele Murmeln hat ${p.p} jetzt?`,
      (a, b) => `Im Bus sitzen ${a} Kinder. ${b} Kinder steigen ein. Wie viele Kinder sitzen jetzt im Bus?`,
    ],
    tricky: [(a, b, p, o) => `${p.name} hat ${a} Sticker. Das sind ${b} weniger, als ${o.name} hat. Wie viele Sticker hat ${o.name}?`],
  },
  '-': {
    plain: [
      (a, b, p) => `${p.name} hat ${a} Murmeln. ${p.p === 'sie' ? 'Sie' : 'Er'} verschenkt ${b} Murmeln. Wie viele Murmeln hat ${p.p} noch?`,
      (a, b) => `Im Bus sitzen ${a} Kinder. ${b} Kinder steigen aus. Wie viele Kinder sitzen jetzt im Bus?`,
    ],
    tricky: [(a, b, p, o) => `${p.name} hat ${a} Sticker. Das sind ${b} mehr, als ${o.name} hat. Wie viele Sticker hat ${o.name}?`],
  },
  '*': {
    plain: [
      (a, b) => `Es gibt ${a} Tüten mit je ${b} Bonbons. Wie viele Bonbons sind es?`,
      (a, b) => `${a} Kinder bezahlen je ${b}\u00A0€ für den Ausflug. Wie viel Geld ist das?`,
    ],
    tricky: [(a, b, p, o) => `${o.name} hat ${a} Sticker. ${p.name} hat ${b}-mal so viele. Wie viele Sticker hat ${p.name}?`],
  },
  ':': {
    plain: [
      (a, b) => `${a} Bonbons werden gerecht an ${b} Kinder verteilt. Wie viele bekommt jedes Kind?`,
      (a, b) => `${a} Kinder bilden Gruppen mit je ${b} Kindern. Wie viele Gruppen gibt es?`,
    ],
    tricky: [(a, b, p, o) => `${p.name} hat ${a} Sticker. Das sind ${b}-mal so viele, wie ${o.name} hat. Wie viele Sticker hat ${o.name}?`],
  },
};

const OP_NAME: Record<Op, string> = { '+': 'einer Plusaufgabe', '-': 'einer Minusaufgabe', '*': 'einer Malaufgabe', ':': 'einer Geteiltaufgabe' };

function whichStory(stufe: Stufe, rng: Rng): Exercise {
  const [p, o] = pickTwo(rng);
  const op = rng.pick(['+', '-', '*', ':'] as const);
  // the same two numbers must make sense in every story: a > b and a divisible by b
  const b = rng.int(3, 9);
  const a = b * rng.int(3, 9);
  const useTricky = rng.chance(0.5);
  const right = rng.pick(useTricky ? SNIPPETS[op].tricky : SNIPPETS[op].plain)(a, b, p, o);
  const wrongOps = (['+', '-', '*', ':'] as const).filter((x) => x !== op);
  const wrongs: ChoiceOption[] = rng.shuffle(wrongOps).map((w) => {
    const pool = rng.chance(0.3) ? SNIPPETS[w].tricky : SNIPPETS[w].plain;
    return { label: rng.pick(pool)(a, b, p, o), whyWrong: `Diese Geschichte passt zu ${OP_NAME[w]}, nicht zu ${OP_NAME[op]}.` };
  });
  const termText = `${fmt(a)} ${OP_SIGN[op]} ${fmt(b)}`;
  const answer = makeChoice(rng, { label: right }, wrongs);
  return build(modellierenSkill, stufe, {
    key: `geschichte:${op}:${a}:${b}:${right}`,
    ab: 3,
    knobel: true,
    prompt: 'Welche Geschichte passt zur Rechnung?',
    expression: termText,
    emoji: '📝',
    answer,
    hints: [OP_DOES[op], 'Lies jede Geschichte genau. Achte darauf, wer mehr und wer weniger hat.'],
    steps: [`${termText} = ${fmt(opResult(op, a, b))}`, OP_DOES[op], `Passend ist: ${right}`],
    praise: useTricky ? 'Du hast genau gelesen und die versteckte Rechnung erkannt.' : 'Du hast Rechnung und Geschichte genau verglichen.',
    srText: `Welche Geschichte passt zur Rechnung ${speak(termText)}? Wähle aus: ${answer.options.map((x) => x.label).join(' ')}`,
    kmk: ['PK.modellieren', 'PK.darstellen', 'ZO.sachrechnen'],
  });
}

export const modellierenSkill: SkillDef = {
  id: 'sachaufgaben.modellieren',
  topicId: 'sachaufgaben',
  title: 'Rechnung und Geschichte',
  description: 'Du findest die Rechnung zur Geschichte und die Geschichte zur Rechnung.',
  stufen: {
    1: 'Welche Rechnung passt zur Geschichte?',
    2: 'Rechnungen mit zwei Schritten, passende Frage',
    3: 'Welche Geschichte passt zur Rechnung?',
  },
  kmk: ['PK.modellieren', 'ZO.sachrechnen'],
  generate(rng, stufe) {
    const [who] = pickTwo(rng);
    if (stufe === 1) return whichTerm(1, rng);
    if (stufe === 2) return rng.chance(0.5) ? whichTwoStepTerm(2, rng, who) : whichQuestion(2, rng, who);
    return rng.chance(0.65) ? whichStory(3, rng) : whichTerm(3, rng);
  },
};

