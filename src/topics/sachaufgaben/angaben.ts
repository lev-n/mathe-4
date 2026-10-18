/**
 * Überflüssige und fehlende Angaben, Kapitänsaufgaben.
 * Every number item offers the button "Nicht lösbar – es fehlt eine Angabe" (offerUnsolvable), so its presence gives nothing away.
 * Stufe 1: one extra piece of information; all needed data are there.
 * Stufe 2: "Welche Angabe brauchst du nicht?" / "Welche Angabe fehlt?" and number items (about 30 % not solvable).
 * Stufe 3: Kapitänsaufgaben (nonsense questions) mixed with solvable and missing-data items (about 45 % not solvable).
 */
import { fmt, TIMES, DIV } from '../../core/format';
import type { Bug, ChoiceOption, Exercise, Rng, SkillDef, Stufe } from '../../core/types';
import { build, makeChoice, numberBugs, pickPerson, Pron, safeHints, sentenceAnswer, speak, answerSentence, type Person } from './shared';

interface Fact {
  text: string;
  /** 'frame' = a sentence without a number that only sets the scene; it is never removed or offered as an option. */
  role: 'need' | 'extra' | 'frame';
  /** For needed facts: what is missing if the fact is removed ('wie viel ein Heft kostet'). */
  ask?: string;
}

interface InfoStory {
  key: string;
  facts: Fact[];
  question: string;
  value: number;
  before: string;
  after: string;
  calc: string;
  /** Results when the extra number is used. */
  extraBugs: number[];
  /** Typical numbers children compute although information is missing. */
  missingBugs: number[];
  /** Information that would not help ('welche Farbe die Hefte haben'). */
  irrelevant: [string, string];
  emoji: string;
}

type Maker = (rng: Rng, who: Person) => InfoStory;

const MAKERS: readonly Maker[] = [
  (rng, who) => {
    const n = rng.int(2, 6);
    const p = rng.int(2, 4);
    // the money brought along always covers the purchase, so the extra fact never contradicts the story
    const m = rng.pick([20, 30, 50].filter((x) => x > n * p));
    return {
      key: `bloecke:${n}:${p}:${m}`,
      facts: [
        { text: `${who.name} kauft ${n} Malblöcke für die Schule.`, role: 'need', ask: `wie viele Malblöcke ${who.name} kauft` },
        { text: `Ein Malblock kostet ${p}\u00A0€.`, role: 'need', ask: 'wie viel ein Malblock kostet' },
        { text: `${who.name} hat ${m}\u00A0€ dabei.`, role: 'extra' },
      ],
      question: 'Wie viel kosten die Malblöcke zusammen?',
      value: n * p, before: 'Die Malblöcke kosten', after: '€.',
      calc: `${n} ${TIMES} ${p}\u00A0€ = ${n * p}\u00A0€`,
      extraBugs: [m - n * p, m - n],
      missingBugs: [m - n, n * m, m / n, m - p, m / p],
      irrelevant: ['welche Farbe die Malblöcke haben', 'wie viele Blätter ein Malblock hat'],
      emoji: '🎨',
    };
  },
  (rng, who) => {
    const pages = rng.int(12, 30) * 10;
    const read = rng.int(3, pages / 10 - 3) * 10;
    const minutes = rng.pick([15, 20, 25, 30]);
    return {
      key: `buch:${pages}:${read}:${minutes}`,
      facts: [
        { text: `${who.name} liest ein Buch mit ${pages} Seiten.`, role: 'need', ask: 'wie viele Seiten das Buch hat' },
        { text: `${who.name} hat schon ${read} Seiten gelesen.`, role: 'need', ask: `wie viele Seiten ${who.name} schon gelesen hat` },
        { text: `${Pron(who)} liest jeden Abend ${minutes} Minuten.`, role: 'extra' },
      ],
      question: `Wie viele Seiten muss ${who.name} noch lesen?`,
      value: pages - read, before: `${who.name} muss noch`, after: 'Seiten lesen.',
      calc: `${pages} − ${read} = ${pages - read}`,
      extraBugs: [pages - read - minutes, pages - minutes],
      missingBugs: [read - minutes, read + minutes, pages - minutes, pages],
      irrelevant: ['wie schwer das Buch ist', 'wie das Buch heißt'],
      emoji: '📖',
    };
  },
  (rng) => {
    const a = rng.int(14, 39);
    const b = rng.int(11, 35);
    const d = rng.pick([60, 75, 90]);
    const len = rng.pick([20, 25, 30]);
    return {
      key: `verein:${a}:${b}:${d}:${len}`,
      facts: [
        // the frame says that both groups exist, so a missing number is clearly missing (not 'no boys')
        { text: 'Im Turnverein trainieren Mädchen und Jungen.', role: 'frame' },
        { text: `Es trainieren ${a} Mädchen.`, role: 'need', ask: 'wie viele Mädchen trainieren' },
        { text: `Es trainieren ${b} Jungen.`, role: 'need', ask: 'wie viele Jungen trainieren' },
        { text: `Ein Training dauert ${d} Minuten.`, role: 'extra' },
        { text: `Die Turnhalle ist ${len}\u00A0m lang.`, role: 'extra' },
      ],
      question: 'Wie viele Kinder trainieren im Turnverein?',
      value: a + b, before: 'Im Turnverein trainieren', after: 'Kinder.',
      calc: `${a} + ${b} = ${a + b}`,
      extraBugs: [a + b + d, a + b + len],
      missingBugs: [a + d, a + len, d - a, b + d, b + len],
      irrelevant: ['wie alt die Trainerin ist', 'wie breit die Turnhalle ist'],
      emoji: '🤸',
    };
  },
  (rng) => {
    const c = rng.int(4, 9);
    const k = rng.int(19, 28);
    const animals = rng.int(30, 90) * 10;
    return {
      key: `zoo:${c}:${k}:${animals}`,
      facts: [
        { text: `Ein Kinderticket für den Zoo kostet ${c}\u00A0€.`, role: 'need', ask: 'wie viel ein Kinderticket kostet' },
        { text: `Die Klasse 4b fährt mit ${k} Kindern in den Zoo.`, role: 'need', ask: 'wie viele Kinder in den Zoo fahren' },
        { text: `Im Zoo leben ${animals} Tiere.`, role: 'extra' },
      ],
      question: 'Wie viel Eintritt zahlt die Klasse für alle Kinder?',
      value: c * k, before: 'Die Klasse zahlt', after: '€ Eintritt.',
      calc: `${k} ${TIMES} ${c}\u00A0€ = ${c * k}\u00A0€`,
      extraBugs: [animals - c * k, c * k + animals],
      missingBugs: [k + animals, animals - k, animals / k, c * animals, animals / c],
      irrelevant: ['wann der Zoo öffnet', 'wie viele Erwachsene mitfahren'],
      emoji: '🦓',
    };
  },
  (rng) => {
    const r = rng.int(4, 9);
    const p = rng.int(6, 14);
    const h = rng.int(40, 90);
    return {
      key: `tomaten:${r}:${p}:${h}`,
      facts: [
        { text: `Im Schulgarten gibt es ${r} Reihen mit Tomaten.`, role: 'need', ask: 'wie viele Reihen es gibt' },
        { text: `In jeder Reihe stehen ${p} Pflanzen.`, role: 'need', ask: 'wie viele Pflanzen in einer Reihe stehen' },
        { text: `Jede Pflanze ist etwa ${h}\u00A0cm hoch.`, role: 'extra' },
      ],
      question: 'Wie viele Tomatenpflanzen sind es?',
      value: r * p, before: 'Es sind', after: 'Tomatenpflanzen.',
      calc: `${r} ${TIMES} ${p} = ${r * p}`,
      extraBugs: [r * h, r * p * h],
      missingBugs: [r * h, r + h, p * h, p + h],
      irrelevant: ['wie viele Tomaten an einer Pflanze hängen', 'wie lang eine Reihe ist'],
      emoji: '🍅',
    };
  },
  (rng) => {
    const k = rng.pick([20, 22, 24, 25]);
    const per = rng.int(6, 15) * 5;
    const days = rng.int(2, 5);
    return {
      key: `fahrt:${k}:${per}:${days}`,
      facts: [
        { text: `Die Klassenfahrt kostet für alle Kinder zusammen ${fmt(k * per)}\u00A0€.`, role: 'need', ask: 'wie viel die Klassenfahrt zusammen kostet' },
        { text: `${k} Kinder fahren mit.`, role: 'need', ask: 'wie viele Kinder mitfahren' },
        { text: `Die Fahrt dauert ${days} Tage.`, role: 'extra' },
      ],
      question: 'Wie viel muss jedes Kind bezahlen?',
      value: per, before: 'Jedes Kind muss', after: '€ bezahlen.',
      calc: `${fmt(k * per)}\u00A0€ ${DIV} ${k} = ${per}\u00A0€`,
      extraBugs: [(k * per) / days, per * days],
      missingBugs: [(k * per) / days, k * per, k * days],
      irrelevant: ['wohin die Klasse fährt', 'wie viele Koffer im Bus sind'],
      emoji: '🚌',
    };
  },
  (rng) => {
    const w = rng.int(25, 80);
    const p = rng.int(1, 3);
    const t = rng.int(13, 16);
    return {
      key: `waffeln:${w}:${p}:${t}`,
      facts: [
        { text: `Beim Schulfest verkauft die Klasse ${w} Waffeln.`, role: 'need', ask: 'wie viele Waffeln verkauft werden' },
        { text: `Eine Waffel kostet ${p}\u00A0€.`, role: 'need', ask: 'wie viel eine Waffel kostet' },
        { text: `Das Fest beginnt um ${t} Uhr.`, role: 'extra' },
      ],
      question: 'Wie viel Geld nimmt die Klasse ein?',
      value: w * p, before: 'Die Klasse nimmt', after: '€ ein.',
      calc: `${w} ${TIMES} ${p}\u00A0€ = ${w * p}\u00A0€`,
      extraBugs: [w * p + t, w + t],
      missingBugs: [w * t, w + t, w, p * t, p + t],
      irrelevant: ['wie lange das Fest dauert', 'wie viele Eier im Teig sind'],
      emoji: '🧇',
    };
  },
];

interface Captain {
  key: string;
  context: string;
  question: string;
  after: string;
  nums: [number, number];
  emoji: string;
  why: string;
}

const CAPTAINS: readonly ((rng: Rng) => Captain)[] = [
  (rng) => {
    const a = rng.int(12, 40);
    const b = rng.int(5, 25);
    return { key: `kapitaen:${a}:${b}`, context: `Auf einem Schiff sind ${a} Schafe und ${b} Ziegen.`, question: 'Wie alt ist der Kapitän?', after: 'Jahre alt.', nums: [a, b], emoji: '🚢', why: 'Die Zahl der Tiere sagt nichts über das Alter des Kapitäns.' };
  },
  (rng) => {
    const a = rng.int(20, 45);
    const b = rng.int(3, 15);
    return { key: `busfahrerin:${a}:${b}`, context: `Ein Bus fährt mit ${a} Kindern los. An der ersten Haltestelle steigen ${b} Kinder aus.`, question: 'Wie alt ist die Busfahrerin?', after: 'Jahre alt.', nums: [a, b], emoji: '🚌', why: 'Wie viele Kinder im Bus sitzen, sagt nichts über das Alter der Busfahrerin.' };
  },
  (rng) => {
    const a = rng.int(5, 20);
    const b = rng.int(10, 40);
    return { key: `zoo-alter:${a}:${b}`, context: `Im Zoo leben ${a} Affen und ${b} Pinguine.`, question: 'Wie alt ist der Tierpfleger?', after: 'Jahre alt.', nums: [a, b], emoji: '🐒', why: 'Die Zahl der Tiere sagt nichts über das Alter des Tierpflegers.' };
  },
  (rng) => {
    const a = rng.int(20, 29);
    const b = rng.int(3, 12);
    return { key: `lehrerin:${a}:${b}`, context: `In der Klasse 4c sind ${a} Kinder. ${b} Kinder haben ein Haustier.`, question: 'Wie alt ist die Lehrerin?', after: 'Jahre alt.', nums: [a, b], emoji: '🏫', why: 'Die Zahlen sagen etwas über die Kinder, nicht über die Lehrerin.' };
  },
  (rng) => {
    const a = rng.int(40, 120);
    const b = rng.int(20, 60);
    return { key: `baecker:${a}:${b}`, context: `Ein Bäcker backt am Morgen ${a} Brötchen und ${b} Brezeln.`, question: 'Wie viele Zentimeter ist der Bäcker groß?', after: 'cm groß.', nums: [a, b], emoji: '🥐', why: 'Die Zahl der Brötchen sagt nichts darüber, wie groß der Bäcker ist.' };
  },
];

const PRAISE_EXTRA = 'Du hast nur die Angaben benutzt, die du für die Frage brauchst.';
const PRAISE_MISSING = 'Du hast gemerkt, dass eine wichtige Angabe fehlt.';
const PRAISE_CAPTAIN = 'Du hast gemerkt, dass die Zahlen nicht zur Frage passen.';

function numberItem(stufe: Stufe, rng: Rng, missing: boolean): Exercise {
  const who = pickPerson(rng);
  const st = rng.pick(MAKERS)(rng, who);
  let facts = st.facts;
  let removed: Fact | undefined;
  if (missing) {
    removed = rng.pick(facts.filter((f) => f.ask));
    facts = facts.filter((f) => f !== removed);
  } else if (stufe === 1) {
    // Stufe 1: exactly one extra fact
    const extras = facts.filter((f) => f.role === 'extra');
    const keep = rng.pick(extras);
    facts = facts.filter((f) => f.role !== 'extra' || f === keep);
  }
  const context = facts.map((f) => f.text).join(' ');
  const value = missing ? null : st.value;
  const needed = st.facts.filter((f) => f.role === 'need').map((f) => f.text);
  const extras = facts.filter((f) => f.role === 'extra').map((f) => f.text);
  const bugs: Bug[] = missing
    ? st.missingBugs.map((m, i) => ({ id: `fehlt-${i}`, match: m, hint: `Woher weißt du, ${removed!.ask}? Diese Angabe steht nicht in der Aufgabe.` }))
    : st.extraBugs.map((m, i) => ({ id: `ueberfluessig-${i}`, match: m, hint: 'Brauchst du wirklich alle Zahlen? Prüfe, welche Angabe zur Frage passt.' }));
  const ex = build(angabenSkill, stufe, {
    key: `${st.key}:${missing ? `fehlt-${removed!.ask}` : `extra-${extras.join('|')}`}`,
    ab: missing ? 3 : stufe === 1 ? 1 : 2,
    context,
    prompt: st.question,
    emoji: st.emoji,
    answer: sentenceAnswer(value, st.before, st.after, st.question, { offerUnsolvable: true }),
    hints: safeHints(
      ['Unterstreiche, was gefragt ist. Welche Angaben brauchst du dafür?', 'Prüfe jede Zahl: Hilft sie bei der Frage? Fehlt dir etwas?'],
      value,
      'Prüfe jede Angabe einzeln.',
    ),
    steps: missing
      ? [`Frage: ${st.question}`, `Dafür musst du wissen, ${removed!.ask}.`, 'Diese Angabe fehlt. Die Aufgabe ist nicht lösbar.']
      : [
          `Frage: ${st.question}`,
          `Du brauchst: ${needed.join(' ')}`,
          `Nicht nötig: ${extras.join(' ')}`,
          `Rechnung: ${st.calc}`,
          `Antwort: ${answerSentence(st.before, fmt(st.value), st.after)}`,
        ],
    bugs: numberBugs(bugs, value),
    praise: missing ? PRAISE_MISSING : PRAISE_EXTRA,
    srText: `${speak(context)} ${st.question} Wenn eine Angabe fehlt, wähle „Nicht lösbar“.`,
    kmk: ['ZO.sachrechnen', 'PK.modellieren', 'PK.problemloesen'],
  });
  if (missing) ex.knobel = true;
  return ex;
}

function captain(stufe: Stufe, rng: Rng): Exercise {
  const c = rng.pick(CAPTAINS)(rng);
  const [a, b] = c.nums;
  return build(angabenSkill, stufe, {
    key: c.key,
    ab: 3,
    knobel: true,
    context: c.context,
    prompt: c.question,
    emoji: c.emoji,
    answer: sentenceAnswer(null, '', c.after, c.question, { offerUnsolvable: true }),
    hints: ['Passen die Zahlen in der Geschichte zu der Frage?', 'Kann man das wirklich ausrechnen?'],
    steps: [`Frage: ${c.question}`, c.why, 'Man kann die Frage mit diesen Zahlen nicht beantworten. Die Aufgabe ist nicht lösbar.'],
    bugs: numberBugs([
      { id: 'summe', match: a + b, hint: `${c.why} Kann man das ausrechnen?` },
      { id: 'differenz', match: Math.abs(a - b), hint: `${c.why} Kann man das ausrechnen?` },
      { id: 'produkt', match: a * b, hint: `${c.why} Kann man das ausrechnen?` },
    ], null),
    praise: PRAISE_CAPTAIN,
    srText: `${speak(c.context)} ${c.question} Wenn man es nicht ausrechnen kann, wähle „Nicht lösbar“.`,
    kmk: ['PK.modellieren', 'PK.argumentieren', 'ZO.sachrechnen'],
  });
}

/** "Welche Angabe brauchst du nicht?" */
function chooseExtra(stufe: Stufe, rng: Rng): Exercise {
  const who = pickPerson(rng);
  const st = rng.pick(MAKERS)(rng, who);
  const extras = st.facts.filter((f) => f.role === 'extra');
  const extra = rng.pick(extras);
  const facts = st.facts.filter((f) => f.role !== 'extra' || f === extra);
  const options: ChoiceOption[] = facts.filter((f) => f.role === 'need').map((f) => ({ label: f.text, whyWrong: 'Diese Angabe brauchst du. Ohne sie kannst du die Frage nicht beantworten.' }));
  const answer = makeChoice(rng, { label: extra.text }, options);
  const context = facts.map((f) => f.text).join(' ');
  return build(angabenSkill, stufe, {
    key: `nicht-noetig:${st.key}:${extra.text}`,
    ab: 2,
    context,
    prompt: `${st.question} Welche Angabe brauchst du dafür nicht?`,
    emoji: st.emoji,
    answer,
    hints: ['Lies die Frage genau. Was willst du ausrechnen?', 'Prüfe jede Angabe: Kommt sie in deiner Rechnung vor?'],
    steps: [`Frage: ${st.question}`, `Rechnung: ${st.calc}`, `Nicht nötig ist: ${extra.text}`],
    praise: PRAISE_EXTRA,
    srText: `${speak(context)} ${st.question} Welche Angabe brauchst du dafür nicht? Wähle aus: ${answer.options.map((o) => speak(o.label)).join(' ')}`,
    kmk: ['PK.modellieren', 'ZO.sachrechnen'],
  });
}

/** "Welche Angabe fehlt?" */
function chooseMissing(stufe: Stufe, rng: Rng): Exercise {
  const who = pickPerson(rng);
  const st = rng.pick(MAKERS)(rng, who);
  const removed = rng.pick(st.facts.filter((f) => f.ask));
  const facts = st.facts.filter((f) => f !== removed);
  const context = facts.map((f) => f.text).join(' ');
  const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1) + '.';
  const given = facts.filter((f) => f.ask).map((f) => ({ label: cap(f.ask!), whyWrong: 'Das steht schon in der Aufgabe.' }));
  const useless = st.irrelevant.map((t) => ({ label: cap(t), whyWrong: 'Das hilft dir bei dieser Frage nicht.' }));
  const answer = makeChoice(rng, { label: cap(removed.ask!) }, rng.shuffle([...given, ...useless]));
  return build(angabenSkill, stufe, {
    key: `fehlt-wahl:${st.key}:${removed.ask}`,
    ab: 2,
    context,
    prompt: `${st.question} Welche Angabe fehlt dir?`,
    emoji: st.emoji,
    answer,
    hints: ['Wie würdest du rechnen? Welche Zahl fehlt dir dafür?', 'Prüfe, welche Zahlen schon in der Aufgabe stehen.'],
    steps: [`Frage: ${st.question}`, `Rechnung: ${st.calc}`, `Es fehlt: ${removed.ask}.`],
    praise: PRAISE_MISSING,
    srText: `${speak(context)} ${st.question} Welche Angabe fehlt dir? Wähle aus: ${answer.options.map((o) => o.label).join(' ')}`,
    kmk: ['PK.modellieren', 'PK.problemloesen'],
  });
}

export const angabenSkill: SkillDef = {
  id: 'sachaufgaben.angaben',
  topicId: 'sachaufgaben',
  title: 'Welche Angaben brauchst du?',
  description: 'Du findest überflüssige Angaben und merkst, wenn etwas fehlt.',
  stufen: {
    1: 'Eine Angabe brauchst du nicht',
    2: 'Überflüssige oder fehlende Angaben finden',
    3: 'Fehlende Angaben und Kapitänsaufgaben',
  },
  kmk: ['ZO.sachrechnen', 'PK.modellieren', 'PK.problemloesen'],
  generate(rng, stufe) {
    if (stufe === 1) return numberItem(1, rng, false);
    if (stufe === 2) {
      const v = rng.int(1, 4);
      if (v === 1) return chooseExtra(2, rng);
      if (v === 2) return chooseMissing(2, rng);
      return numberItem(2, rng, rng.chance(0.4));
    }
    const v = rng.int(1, 10);
    if (v <= 3) return captain(3, rng);
    if (v <= 5) return numberItem(3, rng, true);
    return numberItem(3, rng, false);
  },
};
