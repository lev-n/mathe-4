/**
 * Rest interpretieren: aufrunden (Autos, Tische, Boote) oder abrunden (volle Packungen, Tickets) – je nach Situation.
 * Feedback refers to the situation ('Dann hätten 4 Kinder keinen Platz.').
 * Every situation has its own realistic divisors and numbers (4 children per car, 6 or 10 eggs per box, a ride costs 3–5 €).
 * Stufe 1: dividends ≤ 90.
 * Stufe 2: dividends ≤ 500 where the situation allows it; sometimes the remainder itself is asked.
 * Stufe 3: two steps before dividing, unit conversion (2 m Band, Stücke zu 30 cm), choose the fitting answer.
 */
import { fmt, TIMES } from '../../core/format';
import type { ChoiceOption, Exercise, Rng, SkillDef, Stufe } from '../../core/types';
import { answerSentence, build, makeChoice, numberBugs, pickPerson, safeHints, sentenceAnswer, speak, type Person } from './shared';

type Mode = 'auf' | 'ab' | 'rest';

interface Situation {
  id: string;
  mode: Mode;
  context: (n: number, k: number, who: Person) => string;
  question: (who: Person) => string;
  before: (who: Person) => string;
  after: string;
  /** Singular / plural of the counted thing (Auto/Autos). */
  thing: [string, string];
  /** What the remainder is (Kinder, Eier …). */
  restThing: string;
  /** 'ein weiteres Auto' */
  another: string;
  emoji: string;
  /** Realistic divisors (all ≥ 3, so a remainder ≥ 2 is possible) for Stufe 1 and for Stufe 2/3. */
  k: [number[], number[]];
  /** Largest dividend for Stufe 1 and for Stufe 2/3. */
  maxN: [number, number];
  /** Rounding down: what the whole groups are ('5 Schachteln werden voll.') and the hint question about them. */
  full?: (q: number) => string;
  fullHint?: string;
}

const SITUATIONS: readonly Situation[] = [
  { id: 'autos', mode: 'auf', k: [[3, 4], [3, 4]], maxN: [40, 60], context: (n, k) => `${n} Kinder fahren zum Sportfest. In ein Auto passen ${k} Kinder.`, question: () => 'Wie viele Autos braucht man?', before: () => 'Man braucht', after: 'Autos.', thing: ['Auto', 'Autos'], restThing: 'Kinder', another: 'ein weiteres Auto', emoji: '🚗' },
  { id: 'tische', mode: 'auf', k: [[6, 8, 10], [6, 8, 10, 12]], maxN: [90, 250], context: (n, k) => `Zum Schulfest kommen ${n} Gäste. An einen Tisch passen ${k} Personen.`, question: () => 'Wie viele Tische braucht man mindestens?', before: () => 'Man braucht mindestens', after: 'Tische.', thing: ['Tisch', 'Tische'], restThing: 'Gäste', another: 'einen weiteren Tisch', emoji: '🪑' },
  { id: 'boote', mode: 'auf', k: [[4, 5, 6], [4, 5, 6, 8]], maxN: [60, 100], context: (n, k) => `${n} Kinder machen eine Bootsfahrt auf dem See. In ein Boot passen ${k} Kinder.`, question: () => 'Wie viele Boote braucht man?', before: () => 'Man braucht', after: 'Boote.', thing: ['Boot', 'Boote'], restThing: 'Kinder', another: 'ein weiteres Boot', emoji: '🚣' },
  { id: 'kisten', mode: 'auf', k: [[6, 7, 8, 9], [12, 15, 20, 25]], maxN: [90, 500], context: (n, k) => `Die Bücherei packt ${n} Bücher in Kisten. In eine Kiste passen ${k} Bücher.`, question: () => 'Wie viele Kisten braucht man?', before: () => 'Man braucht', after: 'Kisten.', thing: ['Kiste', 'Kisten'], restThing: 'Bücher', another: 'eine weitere Kiste', emoji: '📦' },
  { id: 'aufzug', mode: 'auf', k: [[6, 8], [8, 10, 12, 13]], maxN: [50, 60], context: (n, k) => `${n} Kinder wollen mit dem Aufzug nach oben. Der Aufzug darf ${k} Personen mitnehmen.`, question: () => 'Wie oft muss der Aufzug mindestens fahren?', before: () => 'Der Aufzug muss mindestens', after: 'Mal fahren.', thing: ['Fahrt', 'Fahrten'], restThing: 'Kinder', another: 'eine weitere Fahrt', emoji: '🛗' },
  { id: 'zelte', mode: 'auf', k: [[3, 4, 5, 6], [3, 4, 5, 6]], maxN: [60, 120], context: (n, k) => `Im Zeltlager schlafen ${n} Kinder. In ein Zelt passen ${k} Kinder.`, question: () => 'Wie viele Zelte braucht man?', before: () => 'Man braucht', after: 'Zelte.', thing: ['Zelt', 'Zelte'], restThing: 'Kinder', another: 'ein weiteres Zelt', emoji: '⛺' },
  { id: 'schachteln', mode: 'ab', k: [[6, 10], [6, 10]], maxN: [90, 300], full: (q) => `${q} Schachteln werden voll.`, fullHint: 'Zählen nur volle Schachteln? Was passiert mit den übrigen Eiern?', context: (n, k) => `Auf dem Hof liegen ${n} Eier. In eine Schachtel passen ${k} Eier.`, question: () => 'Wie viele Schachteln werden voll?', before: () => 'Es werden', after: 'Schachteln voll.', thing: ['Schachtel', 'Schachteln'], restThing: 'Eier', another: 'eine weitere Schachtel', emoji: '🥚' },
  { id: 'mannschaften', mode: 'ab', k: [[5, 6, 7], [7, 11]], maxN: [60, 120], full: (q) => `${q} Mannschaften sind vollständig.`, fullHint: 'Zählen nur vollständige Mannschaften? Was passiert mit den übrigen Kindern?', context: (n, k) => `${n} Kinder spielen Fußball. Eine Mannschaft hat genau ${k} Kinder.`, question: () => 'Wie viele ganze Mannschaften gibt es?', before: () => 'Es gibt', after: 'ganze Mannschaften.', thing: ['Mannschaft', 'Mannschaften'], restThing: 'Kinder', another: 'eine weitere Mannschaft', emoji: '⚽' },
  { id: 'tickets', mode: 'ab', k: [[3, 4], [3, 4, 5]], maxN: [30, 50], full: (q) => `Für ${q} Fahrkarten reicht das Geld.`, fullHint: 'Kann man eine halbe Fahrkarte kaufen? Was passiert mit dem übrigen Geld?', context: (n, k, w) => `${w.name} hat ${n}\u00A0€. Eine Fahrkarte für das Karussell kostet ${k}\u00A0€.`, question: (w) => `Wie viele Fahrkarten kann ${w.name} kaufen?`, before: (w) => `${w.name} kann`, after: 'Fahrkarten kaufen.', thing: ['Fahrkarte', 'Fahrkarten'], restThing: 'Euro', another: 'eine weitere Fahrkarte', emoji: '🎠' },
  { id: 'straeusse', mode: 'ab', k: [[5, 6, 7, 8, 9], [10, 12, 15, 20]], maxN: [90, 300], full: (q) => `${q} Sträuße werden fertig.`, fullHint: 'Zählen nur fertige Sträuße? Was passiert mit den übrigen Tulpen?', context: (n, k) => `Im Garten blühen ${n} Tulpen. Für einen Strauß braucht man ${k} Tulpen.`, question: () => 'Wie viele Sträuße kann man binden?', before: () => 'Man kann', after: 'Sträuße binden.', thing: ['Strauß', 'Sträuße'], restThing: 'Tulpen', another: 'einen weiteren Strauß', emoji: '💐' },
  { id: 'tueten', mode: 'ab', k: [[5, 6, 7, 8, 9], [8, 10, 12, 15, 20, 25]], maxN: [90, 500], full: (q) => `${q} Tüten werden voll.`, fullHint: 'Zählen nur volle Tüten? Was passiert mit den übrigen Bonbons?', context: (n, k) => `Die Klasse hat ${n} Bonbons. In jede Tüte kommen ${k} Bonbons.`, question: () => 'Wie viele Tüten werden voll?', before: () => 'Es werden', after: 'Tüten voll.', thing: ['Tüte', 'Tüten'], restThing: 'Bonbons', another: 'eine weitere Tüte', emoji: '🍬' },
  { id: 'eier-rest', mode: 'rest', k: [[6, 10], [6, 10]], maxN: [90, 300], context: (n, k) => `Auf dem Hof liegen ${n} Eier. In eine Schachtel passen ${k} Eier. Alle Schachteln werden gefüllt, so gut es geht.`, question: () => 'Wie viele Eier bleiben übrig?', before: () => 'Es bleiben', after: 'Eier übrig.', thing: ['Schachtel', 'Schachteln'], restThing: 'Eier', another: 'eine weitere Schachtel', emoji: '🥚' },
  { id: 'kinder-rest', mode: 'rest', k: [[3, 4, 5, 6], [4, 5, 6, 7, 8]], maxN: [90, 120], context: (n, k) => `${n} Kinder bilden Gruppen mit je ${k} Kindern. Es gibt nur volle Gruppen.`, question: () => 'Wie viele Kinder sind in keiner Gruppe?', before: () => '', after: 'Kinder sind in keiner Gruppe.', thing: ['Gruppe', 'Gruppen'], restThing: 'Kinder', another: 'eine weitere Gruppe', emoji: '🧒' },
];

const PRAISE_UP = 'Du hast an die übrigen gedacht: Sie brauchen auch noch Platz.';
const PRAISE_DOWN = 'Du hast erkannt: Nur volle zählen, der Rest reicht nicht.';
const PRAISE_REST = 'Du hast den Rest richtig gedeutet.';

/** 4,67 for the "Kann man 4,67 Autos nehmen?" question (2 decimals, rounded). */
function decimalText(n: number, k: number): string {
  return fmt(Math.round((n / k) * 100) / 100);
}

function divide(stufe: Stufe, rng: Rng): Exercise {
  const who = pickPerson(rng);
  const pool = SITUATIONS.filter((s) => stufe >= 2 || s.mode !== 'rest');
  const sit = rng.pick(pool);
  // remainder ≥ 2 keeps the sentences simple ('2 Kinder hätten keinen Platz')
  const level = stufe === 1 ? 0 : 1;
  const k = rng.pick(sit.k[level]);
  const maxQ = Math.min(40, Math.floor((sit.maxN[level] - (k - 1)) / k));
  const q = rng.int(2, Math.max(2, maxQ));
  const r = rng.int(2, k - 1);
  const n = q * k + r;
  const up = q + 1;
  const value = sit.mode === 'auf' ? up : sit.mode === 'ab' ? q : r;
  const many = sit.thing[1];
  const before = sit.before(who);
  const context = sit.context(n, k, who);
  const question = sit.question(who);
  const division = `${n} : ${k} = ${q} Rest ${r}`;
  let steps: string[];
  let bugs;
  if (sit.mode === 'auf') {
    steps = [division, `${q} ${many} reichen nicht: ${r} ${sit.restThing} hätten keinen Platz.`, `Für sie braucht man noch ${sit.another}.`];
    bugs = numberBugs([
      { id: 'abgerundet', match: q, hint: `Dann hätten ${r} ${sit.restThing} keinen Platz. Auch sie müssen mit.` },
      { id: 'rest', match: r, hint: `Das ist der Rest: ${r} ${sit.restThing}. Gefragt ist, wie viele ${many} man braucht.` },
      { id: 'mal', match: n * k, hint: 'Hier wird aufgeteilt. Wie oft passt die Gruppe hinein?' },
    ], value);
  } else if (sit.mode === 'ab') {
    steps = [division, sit.full!(q), `Die ${r} übrigen ${sit.restThing} reichen nicht für ${sit.another}.`];
    bugs = numberBugs([
      { id: 'aufgerundet', match: up, hint: `Für ${up} ${many} reicht es nicht. Es bleiben nur ${r} ${sit.restThing} übrig.` },
      { id: 'rest', match: r, hint: `Das ist der Rest. Gefragt ist: ${question}` },
      { id: 'mal', match: n * k, hint: 'Hier wird eingeteilt. Wie oft passt die Menge hinein?' },
    ], value);
  } else {
    steps = [division, `${q} ${many} werden voll.`, `Es bleiben ${r} ${sit.restThing} übrig.`];
    bugs = numberBugs([
      { id: 'quotient', match: q, hint: `Das ist die Zahl der vollen ${many}. Gefragt ist, was übrig bleibt.` },
      { id: 'aufgerundet', match: up, hint: 'Gefragt ist, was übrig bleibt, nicht wie viele es sind.' },
    ], value);
  }
  const sentence = answerSentence(before, fmt(value), sit.after);
  return build(restSkill, stufe, {
    key: `${sit.id}:${n}:${k}`,
    ab: stufe === 1 ? 1 : 2,
    context,
    prompt: question,
    emoji: sit.emoji,
    answer: sentenceAnswer(value, before, sit.after, question),
    hints: safeHints(
      sit.mode === 'rest'
        ? ['Teile mit Rest.', 'Der Rest ist das, was nicht mehr in eine volle Gruppe passt.']
        : [
            'Teile mit Rest. Was bedeutet der Rest in dieser Geschichte?',
            sit.mode === 'auf' ? `Kann man ${decimalText(n, k)} ${many} nehmen? Was ist mit dem Rest?` : sit.fullHint!,
          ],
      value,
      'Teile mit Rest und denke an die Situation.',
    ),
    steps: [`Frage: ${question}`, ...steps, `Antwort: ${sentence}`],
    bugs,
    praise: sit.mode === 'auf' ? PRAISE_UP : sit.mode === 'ab' ? PRAISE_DOWN : PRAISE_REST,
    srText: `${speak(context)} ${question}`,
    kmk: ['ZO.sachrechnen', 'PK.modellieren'],
  });
}

// ─── Stufe 3 ─────────────────────────────────────────────────────────────────

function busTrip(stufe: Stufe, rng: Rng): Exercise {
  const classes = rng.int(3, 5);
  const per = rng.int(19, 27);
  const adults = rng.int(4, 8);
  const seats = rng.pick([40, 45, 50, 55]);
  const people = classes * per + adults;
  const total = people;
  const q = Math.floor(total / seats);
  const r = total % seats;
  const value = r === 0 ? q : q + 1;
  const context = `${classes} Klassen mit je ${per} Kindern fahren in den Tierpark. Es fahren auch ${adults} Erwachsene mit. Ein Bus hat ${seats} Plätze.`;
  return build(restSkill, stufe, {
    key: `busse:${classes}:${per}:${adults}:${seats}`,
    ab: 3,
    knobel: true,
    context,
    prompt: 'Wie viele Busse braucht man?',
    emoji: '🚌',
    answer: sentenceAnswer(value, 'Man braucht', 'Busse.', 'Wie viele Busse braucht man?'),
    hints: safeHints(['Wie viele Personen fahren mit? Denke an die Erwachsenen.', 'Teile dann mit Rest. Haben alle einen Platz?'], value, 'Rechne in Schritten.'),
    steps: [
      `Kinder: ${classes} ${TIMES} ${per} = ${classes * per}`,
      `Mit Erwachsenen: ${classes * per} + ${adults} = ${total}`,
      r === 0 ? `${total} : ${seats} = ${q}` : `${total} : ${seats} = ${q} Rest ${r}`,
      r === 0 ? `Alle haben genau Platz.` : `${q === 1 ? '1 Bus reicht' : `${q} Busse reichen`} nicht: ${r === 1 ? 'Eine Person hätte' : `${r} Personen hätten`} keinen Platz.`,
      `Antwort: Man braucht ${value} Busse.`,
    ],
    bugs: numberBugs([
      r > 0 && { id: 'abgerundet', match: q, hint: `Dann ${r === 1 ? 'hätte eine Person' : `hätten ${r} Personen`} keinen Platz. Alle sollen mitfahren.` },
      { id: 'ohne-erwachsene', match: Math.ceil((classes * per) / seats), hint: 'Die Erwachsenen brauchen auch einen Platz im Bus.' },
    ], value),
    praise: 'Du hast an alle Personen gedacht und richtig aufgerundet.',
    srText: `${speak(context)} Wie viele Busse braucht man?`,
    kmk: ['ZO.sachrechnen', 'PK.modellieren', 'PK.problemloesen'],
  });
}

function ribbon(stufe: Stufe, rng: Rng): Exercise {
  const meters = rng.int(1, 4);
  const total = meters * 100;
  // realistic piece lengths: a bow needs 30–45 cm, a bookmark or a bracelet about 15–25 cm
  const what = rng.pick([
    { stuff: 'Band', many: 'Schleifen', one: 'eine Schleife', cm: [30, 35, 40, 45] },
    { stuff: 'Wollfaden', many: 'Armbänder', one: 'ein Armband', cm: [15, 18, 22] },
    { stuff: 'Stoffband', many: 'Lesezeichen', one: 'ein Lesezeichen', cm: [15, 18, 22, 24] },
  ]);
  const piece = rng.pick(what.cm.filter((p) => total % p !== 0));
  const q = Math.floor(total / piece);
  const r = total % piece;
  const context = `Ein ${what.stuff} ist ${meters}\u00A0m lang. Für ${what.one} braucht man ${piece}\u00A0cm.`;
  const question = `Wie viele ${what.many} kann man machen?`;
  return build(restSkill, stufe, {
    key: `band:${meters}:${piece}:${what.stuff}`,
    ab: 3,
    knobel: true,
    context,
    prompt: question,
    emoji: '🎀',
    answer: sentenceAnswer(q, 'Man kann', `${what.many} machen.`, question),
    hints: safeHints(['Rechne zuerst in Zentimeter um.', 'Teile mit Rest. Reicht der Rest für noch ein Stück?'], q, 'Rechne in Zentimetern.'),
    steps: [`${meters}\u00A0m = ${total}\u00A0cm`, `${total} : ${piece} = ${q} Rest ${r}`, `Die übrigen ${r}\u00A0cm reichen nicht für ein weiteres Stück.`, `Antwort: Man kann ${q} ${what.many} machen.`],
    bugs: numberBugs([
      { id: 'aufgerundet', match: q + 1, hint: `Für das letzte Stück fehlen Zentimeter. Es bleiben nur ${r}\u00A0cm übrig.` },
      Math.floor((meters * 10) / piece) > 0 && { id: 'meter', match: Math.floor((meters * 10) / piece), hint: '1\u00A0m hat 100\u00A0cm, nicht 10\u00A0cm. Rechne zuerst in Zentimeter um.' },
      { id: 'rest', match: r, hint: 'Das ist der Rest in Zentimetern. Gefragt ist die Anzahl der Stücke.' },
    ], q),
    praise: 'Du hast umgewandelt und erkannt, dass der Rest nicht reicht.',
    srText: `${speak(context)} ${question}`,
    kmk: ['ZO.sachrechnen', 'GM.sachsituationen', 'PK.modellieren'],
  });
}

function chooseAnswer(stufe: Stufe, rng: Rng): Exercise {
  const k = rng.pick([3, 4]);
  const q = rng.int(3, 8);
  const r = rng.int(2, k - 1);
  const n = q * k + r;
  const dec = fmt(Math.round((n / k) * 100) / 100);
  const options: ChoiceOption[] = [
    { label: `${q} Autos`, whyWrong: `Dann hätten ${r} Kinder keinen Platz.` },
    { label: `${dec} Autos`, whyWrong: `Kann man ${dec} Autos nehmen? Ein Auto kann man nicht teilen.` },
    { label: `${q} Autos, ${r} Kinder bleiben zu Hause`, whyWrong: 'Alle Kinder sollen mitfahren. Niemand soll zu Hause bleiben.' },
  ];
  const answer = makeChoice(rng, { label: `${q + 1} Autos` }, options);
  const context = `${n} Kinder fahren zum Schwimmen. In jedes Auto passen ${k} Kinder. Alle sollen mitfahren.`;
  return build(restSkill, stufe, {
    key: `antwort:${n}:${k}`,
    ab: 3,
    context,
    prompt: 'Welche Antwort passt zur Geschichte?',
    emoji: '🚗',
    answer,
    hints: ['Rechne zuerst: Teile mit Rest.', 'Prüfe jede Antwort: Passt sie zur Situation?'],
    steps: [`${n} : ${k} = ${q} Rest ${r}`, `${q} Autos reichen nicht: ${r} Kinder hätten keinen Platz.`, `Antwort: ${q + 1} Autos.`],
    praise: 'Du hast die Antwort mit der Situation verglichen.',
    srText: `${speak(context)} Welche Antwort passt zur Geschichte? Wähle aus: ${answer.options.map((o) => o.label).join('; ')}.`,
    kmk: ['ZO.sachrechnen', 'PK.modellieren', 'PK.argumentieren'],
  });
}

export const restSkill: SkillDef = {
  id: 'sachaufgaben.rest',
  topicId: 'sachaufgaben',
  title: 'Rest deuten',
  description: 'Du teilst mit Rest und überlegst, was der Rest in der Geschichte bedeutet.',
  stufen: {
    1: 'Aufrunden oder abrunden, kleine Zahlen',
    2: 'Größere Zahlen, auch der Rest ist gefragt',
    3: 'Mehrere Schritte, Längen, passende Antwort',
  },
  kmk: ['ZO.sachrechnen', 'PK.modellieren'],
  generate(rng, stufe) {
    if (stufe < 3) return divide(stufe, rng);
    const v = rng.int(1, 4);
    if (v === 1) return busTrip(3, rng);
    if (v === 2) return ribbon(3, rng);
    if (v === 3) return chooseAnswer(3, rng);
    return divide(3, rng);
  },
};
