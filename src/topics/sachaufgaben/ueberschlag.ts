/**
 * Überschlag und Plausibilität.
 * Stufe 1: "Reicht das Geld?" with rounded prices; estimate a sum or difference by rounding to hundreds.
 * Stufe 2: decide "Überschlag reicht / genau rechnen"; pick the result that can be right.
 * Stufe 3: judge a claim ('Mein Schulweg ist 25 km lang.'), check someone's result, Fermi estimates.
 */
import { fmt, fmtMoney, NBSP, TIMES } from '../../core/format';
import type { ChoiceOption, Exercise, Rng, SkillDef, Stufe } from '../../core/types';
import { answerSentence, build, joinList, makeChoice, numberBugs, pickPerson, Pron, safeHints, sentenceAnswer, speak, type Person } from './shared';

const ITEMS = [
  { name: 'ein Buch', min: 6, max: 14 },
  { name: 'ein Spiel', min: 8, max: 19 },
  { name: 'einen Ball', min: 5, max: 12 },
  { name: 'einen Malblock', min: 2, max: 5 },
  { name: 'eine Trinkflasche', min: 4, max: 9 },
  { name: 'ein Puzzle', min: 6, max: 13 },
  { name: 'Buntstifte', min: 3, max: 8 },
];

const ENDINGS = [49, 79, 89, 95, 99, 90, 50, 29];

// ─── Stufe 1 ─────────────────────────────────────────────────────────────────

function enoughMoney(stufe: Stufe, rng: Rng, who: Person): Exercise {
  const items = rng.sample(ITEMS, rng.int(2, 3)).map((it) => ({ ...it, price: rng.int(it.min, it.max) * 100 + rng.pick(ENDINGS) }));
  const total = items.reduce((a, b) => a + b.price, 0);
  const up = items.reduce((a, b) => a + Math.ceil(b.price / 100) * 100, 0);
  const down = items.reduce((a, b) => a + Math.floor(b.price / 100) * 100, 0);
  // choose a budget that the Überschlag decides clearly
  const enough = rng.chance(0.5) || Math.floor(down / 500) * 500 < 500;
  const budget = enough ? Math.ceil(up / 500) * 500 : Math.floor(down / 500) * 500;
  const ok = total <= budget;
  const yes = 'Ja, das Geld reicht.';
  const no = 'Nein, das Geld reicht nicht.';
  const unsure = 'Das kann man ohne genaues Rechnen nicht sagen.';
  const roundedLine = items.map((i) => `${Math.ceil(i.price / 100)}${NBSP}€`).join(' + ');
  const answer = makeChoice(rng, { label: ok ? yes : no }, [
    { label: ok ? no : yes, whyWrong: ok ? 'Runde alle Preise auf ganze Euro auf. Auch dann ist die Summe nicht größer als das Geld.' : 'Runde die Preise ab. Schon dann ist die Summe zu groß.' },
    { label: unsure, whyWrong: 'Ein Überschlag reicht hier: Runde die Preise auf ganze Euro.' },
  ], { order: [yes, no, unsure] });
  const context = `${who.name} hat ${budget / 100}${NBSP}€. ${Pron(who)} möchte ${joinList(items.map((i) => `${i.name} für ${fmtMoney(i.price)}`))} kaufen.`;
  return build(ueberschlagSkill, stufe, {
    key: `reicht:${budget}:${items.map((i) => i.price).join('-')}`,
    ab: 1,
    context,
    prompt: 'Reicht das Geld? Überschlage.',
    emoji: '👛',
    answer,
    hints: ['Runde jeden Preis auf ganze Euro.', 'Vergleiche die gerundete Summe mit dem Geld.'],
    steps: ok
      ? [`Aufgerundet: ${roundedLine} = ${up / 100}${NBSP}€`, `${up / 100}${NBSP}€ ist nicht mehr als ${budget / 100}${NBSP}€. Das Geld reicht.`]
      : [`Abgerundet: ${items.map((i) => `${Math.floor(i.price / 100)}${NBSP}€`).join(' + ')} = ${down / 100}${NBSP}€`, `Der Einkauf kostet also mehr als ${budget / 100}${NBSP}€. Das Geld reicht nicht.`],
    praise: 'Du hast mit gerundeten Preisen überschlagen.',
    srText: `${speak(context)} Reicht das Geld? Überschlage.`,
    kmk: ['ZO.runden', 'ZO.sachrechnen'],
  });
}

function roundH(n: number): number {
  return Math.round(n / 100) * 100;
}

const ADD_CTX = [
  { t: (a: number, b: number) => `Am Samstag besuchen ${a} Menschen das Museum. Am Sonntag sind es ${b} Menschen.`, noun: 'Menschen' },
  { t: (a: number, b: number) => `Beim Schulfest werden am Vormittag ${a} Lose verkauft. Am Nachmittag sind es ${b} Lose.`, noun: 'Lose' },
  { t: (a: number, b: number) => `Die Klasse sammelt im September ${a} Kastanien. Im Oktober sammelt sie noch ${b} Stück.`, noun: 'Kastanien' },
];

const SUB_CTX = [
  { t: (a: number, b: number, w: Person) => `${w.name} liest ein Buch mit ${a} Seiten. ${Pron(w)} hat schon ${b} Seiten gelesen.`, noun: 'Seiten' },
  { t: (a: number, b: number) => `Der Zoo hat heute ${a} Eintrittskarten. Davon sind schon ${b} verkauft.`, noun: 'Karten' },
  { t: (a: number, b: number) => `Im Getränkelager stehen ${a} Flaschen. Für das Sportfest werden ${b} Flaschen abgeholt.`, noun: 'Flaschen' },
];

function estimateNumber(stufe: Stufe, rng: Rng, who: Person): Exercise {
  const add = rng.chance(0.5);
  let a = add ? rng.int(120, 860) : rng.int(320, 880);
  let b = add ? rng.int(110, 980 - a) : rng.int(110, a - 160);
  // avoid numbers ending in 50 (then the rounding rule would be the only difficulty)
  if (a % 100 === 50) a += 3;
  if (b % 100 === 50) b += 4;
  const ra = roundH(a);
  const rb = roundH(b);
  const value = add ? ra + rb : ra - rb;
  const idx = rng.int(0, 2);
  const c = add ? ADD_CTX[idx] : SUB_CTX[idx];
  const ctx = c.t(a, b, who);
  const question = add ? `Etwa wie viele ${c.noun} sind es zusammen? Überschlage.` : `Etwa wie viele ${c.noun} sind es noch? Überschlage.`;
  const exact = add ? a + b : a - b;
  const floorA = Math.floor(a / 100) * 100;
  const floorB = Math.floor(b / 100) * 100;
  const floorV = add ? floorA + floorB : floorA - floorB;
  return build(ueberschlagSkill, stufe, {
    key: `ueberschlag:${add ? 'plus' : 'minus'}:${idx}:${a}:${b}`,
    ab: 1,
    context: ctx,
    prompt: question,
    answer: sentenceAnswer(value, 'Es sind etwa', `${c.noun}.`, question),
    hints: safeHints(['Runde beide Zahlen auf Hunderter.', 'Rechne dann mit den gerundeten Zahlen.'], value, 'Runde zuerst.'),
    steps: [`Runden: ${a} ≈ ${ra}, ${b} ≈ ${rb}`, `Überschlag: ${ra} ${add ? '+' : '−'} ${rb} = ${value}`, `Antwort: ${answerSentence('Es sind etwa', fmt(value), `${c.noun}.`)}`],
    bugs: numberBugs([
      { id: 'genau', match: exact, hint: 'Du hast genau gerechnet. Beim Überschlag rundest du zuerst auf Hunderter.' },
      floorV !== value && floorV > 0 && { id: 'abgeschnitten', match: floorV, hint: 'Runde richtig: Ab 50 wird aufgerundet.' },
    ], value),
    praise: 'Du hast beide Zahlen gerundet und dann gerechnet.',
    srText: `${speak(ctx)} ${question}`,
    kmk: ['ZO.runden', 'ZO.sachrechnen'],
  });
}

// ─── Stufe 2 ─────────────────────────────────────────────────────────────────

interface Decide { key: string; context: string; question: string; estimate: boolean; why: string }

function decideSituation(rng: Rng, who: Person): Decide {
  const v = rng.int(1, 8);
  if (v === 1) {
    const p1 = rng.int(2, 6) * 100 + 99;
    const p2 = rng.int(1, 4) * 100 + 49;
    return { key: `d1:${p1}:${p2}`, context: `${who.name} hat 20\u00A0€. ${Pron(who)} kauft einen Malkasten für ${fmtMoney(p1)} und Pinsel für ${fmtMoney(p2)}.`, question: 'Reicht das Geld?', estimate: true, why: 'Mit gerundeten Preisen sieht man sofort, dass das Geld reicht.' };
  }
  if (v === 2) {
    const p1 = rng.int(2, 6) * 100 + 99;
    return { key: `d2:${p1}`, context: `${who.name} kauft ein Buch für ${fmtMoney(p1)}. ${Pron(who)} bezahlt mit 10\u00A0€.`, question: `Wie viel Rückgeld bekommt ${who.name}?`, estimate: false, why: 'Das Rückgeld muss auf den Cent genau stimmen.' };
  }
  if (v === 3) {
    const kids = rng.int(61, 84);
    return { key: `d3:${kids}`, context: `${kids} Kinder fahren zum Sportfest. Es gibt 2 Busse mit je 50 Plätzen.`, question: 'Haben alle Kinder einen Platz?', estimate: true, why: 'Es gibt 100 Plätze. Man sieht ohne genaue Rechnung, dass es reicht.' };
  }
  if (v === 4) {
    const total = rng.int(30, 60) * 24;
    return { key: `d4:${total}`, context: `Die Klassenfahrt kostet für 24 Kinder zusammen ${fmt(total)}\u00A0€.`, question: 'Wie viel muss jedes Kind bezahlen?', estimate: false, why: 'Jedes Kind muss den genauen Betrag bezahlen.' };
  }
  if (v === 5) {
    const a = rng.int(210, 390);
    const b = rng.int(180, 340);
    return { key: `d5:${a}:${b}`, context: `Der Weg zum Bäcker ist ${a}\u00A0m lang. Von dort sind es noch ${b}\u00A0m bis zur Schule.`, question: 'Ist der ganze Weg kürzer als 1 km?', estimate: true, why: 'Beide Teile sind weniger als 400\u00A0m. Zusammen ist das sicher weniger als 1000\u00A0m.' };
  }
  if (v === 6) {
    const a = rng.int(210, 390);
    const b = rng.int(180, 340);
    return { key: `d6:${a}:${b}`, context: `Im Plan des Schulgeländes soll die genaue Länge des neuen Weges eingetragen werden. Der Weg hat zwei Teile: ${a}\u00A0m und ${b}\u00A0m.`, question: 'Wie lang ist der Weg?', estimate: false, why: 'Im Plan soll die genaue Länge stehen, auf den Meter genau.' };
  }
  if (v === 7) {
    const a = rng.int(1100, 1900);
    const b = rng.int(1100, 1900);
    return { key: `d7:${a}:${b}`, context: `Am Samstag kommen ${fmt(a)} Menschen zum Stadtfest, am Sonntag ${fmt(b)}. Die Zeitung möchte wissen, ob mehr als 2000 Menschen da waren.`, question: 'Waren mehr als 2000 Menschen da?', estimate: true, why: 'Beide Zahlen sind größer als 1000. Zusammen sind es sicher mehr als 2000.' };
  }
  const n = rng.int(12, 28);
  const p = rng.int(2, 4) * 100 + rng.pick([20, 40, 60, 80]);
  return { key: `d8:${n}:${p}`, context: `Beim Kuchenverkauf werden ${n} Stück Kuchen zu je ${fmtMoney(p)} verkauft. Die Kasse soll stimmen.`, question: 'Wie viel Geld muss in der Kasse sein?', estimate: false, why: 'Die Kasse muss auf den Cent genau stimmen.' };
}

function decide(stufe: Stufe, rng: Rng, who: Person): Exercise {
  const d = decideSituation(rng, who);
  const est = 'Ein Überschlag reicht.';
  const exact = 'Ich muss genau rechnen.';
  const none = 'Ich brauche gar nicht zu rechnen.';
  const answer = makeChoice(rng, { label: d.estimate ? est : exact }, [
    { label: d.estimate ? exact : est, whyWrong: d.estimate ? `Genau rechnen geht auch, ist aber nicht nötig. ${d.why}` : `Ein Überschlag ist hier zu ungenau. ${d.why}` },
    { label: none, whyWrong: 'Ohne Rechnen weißt du die Antwort hier nicht sicher.' },
  ], { order: [est, exact, none] });
  return build(ueberschlagSkill, stufe, {
    key: `entscheiden:${d.key}`,
    ab: 2,
    context: d.context,
    prompt: `${d.question} Reicht ein Überschlag oder musst du genau rechnen?`,
    emoji: '🤔',
    answer,
    hints: ['Was genau soll herauskommen: ein ungefährer Wert oder ein genauer Betrag?', 'Bei Geld an der Kasse muss es genau stimmen. Steht in der Aufgabe, dass es genau sein soll?'],
    steps: [`Frage: ${d.question}`, d.why, d.estimate ? est : exact],
    praise: d.estimate
      ? 'Du hast erkannt, dass hier ein Überschlag zum Entscheiden reicht.'
      : 'Du hast erkannt, dass das Ergebnis hier genau stimmen muss.',
    srText: `${speak(d.context)} ${d.question} Reicht ein Überschlag oder musst du genau rechnen?`,
    kmk: ['ZO.runden', 'ZO.sachrechnen', 'PK.argumentieren'],
  });
}

function whichResult(stufe: Stufe, rng: Rng): Exercise {
  const a = rng.int(12, 39);
  const b = rng.int(11, 29);
  const exact = a * b;
  const ctx = rng.pick([
    `${a} Kinder laufen beim Spendenlauf je ${b} Runden.`,
    `Die Bücherei hat ${a} Kisten mit je ${b} Büchern.`,
    `Im Garten gibt es ${a} Beete mit je ${b} Salatköpfen.`,
  ]);
  const q = 'Welches Ergebnis kann stimmen?';
  const ra = Math.round(a / 10) * 10;
  const rb = Math.round(b / 10) * 10;
  const est = ra * rb;
  const wrongs: ChoiceOption[] = [
    { label: fmt(exact * 10), whyWrong: `Überschlage: ${ra} ${TIMES} ${rb} = ${fmt(est)}. Diese Zahl ist viel zu groß.` },
    { label: fmt(a + b), whyWrong: `Das wäre ${a} + ${b}. Hier wird aber malgenommen.` },
    { label: fmt(Math.round(exact / 10)), whyWrong: `Überschlage: ${ra} ${TIMES} ${rb} = ${fmt(est)}. Diese Zahl ist viel zu klein.` },
  ];
  const answer = makeChoice(rng, { label: fmt(exact) }, wrongs);
  return build(ueberschlagSkill, stufe, {
    key: `welches:${a}:${b}:${ctx.slice(0, 10)}`,
    ab: 2,
    context: ctx,
    prompt: `${q} Überschlage.`,
    answer,
    hints: ['Runde beide Zahlen auf Zehner.', 'Rechne mit den gerundeten Zahlen. Welche Antwort liegt in der Nähe?'],
    steps: [`Überschlag: ${ra} ${TIMES} ${rb} = ${fmt(est)}`, `Genau: ${a} ${TIMES} ${b} = ${fmt(exact)}`, `Es kann nur ${fmt(exact)} stimmen.`],
    praise: 'Du hast mit dem Überschlag die passende Größenordnung gefunden.',
    srText: `${speak(ctx)} ${q} Wähle aus: ${answer.options.map((o) => speak(o.label)).join(', ')}.`,
    kmk: ['ZO.runden', 'ZO.kontrolle', 'ZO.sachrechnen'],
  });
}

// ─── Stufe 3 ─────────────────────────────────────────────────────────────────

const CLAIMS = [
  { text: 'Mein Schulweg ist 25\u00A0km lang. Ich gehe ihn jeden Morgen zu Fuß.', ok: false, reason: '25\u00A0km zu Fuß dauern mehr als 5 Stunden.', fake: 'Ein Schulweg ist immer kürzer als 1\u00A0km.' },
  { text: 'In meiner Klasse sind 250 Kinder.', ok: false, reason: 'In eine Klasse gehen etwa 20 bis 30 Kinder.', fake: 'In eine Klasse gehen höchstens 10 Kinder.' },
  { text: 'Unser Klassenzimmer ist 80\u00A0m lang.', ok: false, reason: 'Ein Klassenzimmer ist etwa 8\u00A0m lang. 80\u00A0m sind fast ein Fußballfeld.', fake: 'Ein Klassenzimmer ist etwa 80\u00A0cm lang.' },
  { text: 'Eine Tüte Milch kostet 25\u00A0€.', ok: false, reason: 'Eine Tüte Milch kostet etwa 1\u00A0€.', fake: 'Milch kostet nur ein paar Cent.' },
  { text: 'Ich schlafe jede Nacht 30 Stunden.', ok: false, reason: 'Ein ganzer Tag hat nur 24 Stunden.', fake: 'Man schläft höchstens 3 Stunden.' },
  { text: 'Ich habe in den Ferien 5 Bücher gelesen.', ok: true, reason: 'In sechs Wochen Ferien kann man gut 5 Bücher lesen.', fake: 'Ein Buch zu lesen dauert ein ganzes Jahr.' },
  { text: 'Die große Pause dauert 20 Minuten.', ok: true, reason: 'Pausen dauern oft 15 bis 30 Minuten.', fake: 'Eine Pause dauert immer genau 1 Stunde.' },
  { text: 'Mein Fahrrad wiegt 12\u00A0kg.', ok: true, reason: 'Ein Kinderfahrrad wiegt etwa 10 bis 15\u00A0kg.', fake: 'Ein Fahrrad wiegt über 100\u00A0kg.' },
  { text: 'Mit dem Rad brauche ich 15 Minuten zum Schwimmbad.', ok: true, reason: 'In 15 Minuten fährt man mit dem Rad etwa 3 bis 4\u00A0km.', fake: 'Mit dem Rad braucht man für jeden Weg mehrere Stunden.' },
  { text: 'Unsere Lehrerin ist 3\u00A0m groß.', ok: false, reason: 'Erwachsene sind etwa 1,50\u00A0m bis 2\u00A0m groß. Eine Tür ist 2\u00A0m hoch.', fake: 'Erwachsene sind etwa 30\u00A0cm groß.' },
  { text: 'In unsere Gießkanne passen 10 Liter Wasser.', ok: true, reason: 'Eine große Gießkanne fasst etwa 10\u00A0l.', fake: 'In eine Gießkanne passt nur ein Glas Wasser.' },
];

function judgeClaim(stufe: Stufe, rng: Rng, who: Person): Exercise {
  const idx = rng.int(0, CLAIMS.length - 1);
  const c = CLAIMS[idx];
  const yes = `Ja, das kann stimmen. ${c.ok ? c.reason : ''}`.trim();
  const no = `Nein, das kann nicht stimmen. ${c.ok ? '' : c.reason}`.trim();
  const fakeNo = `Nein, das kann nicht stimmen. ${c.fake}`;
  const answer = c.ok
    ? makeChoice(rng, { label: yes }, [
        { label: fakeNo, whyWrong: `Das stimmt nicht: ${c.reason}` },
        { label: 'Nein, das kann nicht stimmen. Die Zahl ist zu klein.', whyWrong: c.reason },
      ])
    : makeChoice(rng, { label: no }, [
        { label: 'Ja, das kann stimmen.', whyWrong: c.reason },
        { label: fakeNo, whyWrong: `Die Antwort „Nein“ passt, aber die Begründung nicht. ${c.reason}` },
      ]);
  const context = `${who.name} sagt: „${c.text}“`;
  return build(ueberschlagSkill, stufe, {
    key: `behauptung:${idx}:${who.name}`,
    ab: 3,
    context,
    prompt: 'Kann das stimmen? Wähle die Antwort mit der passenden Begründung.',
    emoji: '💬',
    answer,
    hints: ['Vergleiche mit etwas, das du gut kennst.', 'Ist die Zahl viel zu groß, viel zu klein oder passend?'],
    steps: [c.reason, c.ok ? 'Die Angabe kann stimmen.' : 'Die Angabe kann nicht stimmen.'],
    praise: 'Du hast die Angabe mit deinem Wissen über die Welt verglichen.',
    srText: `${speak(context)} Kann das stimmen? Wähle aus: ${answer.options.map((o) => speak(o.label)).join(' ')}`,
    kmk: ['GM.vorstellung', 'PK.argumentieren', 'ZO.sachrechnen'],
  });
}

function checkResult(stufe: Stufe, rng: Rng, who: Person): Exercise {
  const n = rng.int(3, 8);
  const p = rng.int(1, 6) * 100 + rng.pick([95, 99, 49, 90]);
  const exact = n * p;
  const kind = rng.int(1, 3);
  const claimed = kind === 1 ? exact : kind === 2 ? exact * 10 : Math.round(exact / 10);
  const ok = claimed === exact;
  const roundP = Math.round(p / 100);
  const est = n * roundP;
  const ware = rng.pick([['Hefte', 'Heft'], ['Bastelscheren', 'Bastelschere'], ['Malblöcke', 'Malblock'], ['Kartenspiele', 'Kartenspiel']] as const);
  const context = `${who.name} rechnet: ${n} ${ware[0]} zu je ${fmtMoney(p)} kosten zusammen ${fmtMoney(claimed)}.`;
  const correctLabel = ok ? `Ja. ${n} ${TIMES} ${roundP}${NBSP}€ = ${est}${NBSP}€, das passt.` : `Nein. ${n} ${TIMES} ${roundP}${NBSP}€ sind nur etwa ${est}${NBSP}€.`.replace('nur etwa', claimed > exact ? 'nur etwa' : 'etwa');
  const wrongs: ChoiceOption[] = ok
    ? [
        { label: `Nein. ${n} ${TIMES} ${roundP}${NBSP}€ sind etwa ${est * 10}${NBSP}€.`, whyWrong: `Prüfe den Überschlag: ${n} ${TIMES} ${roundP} = ${est}.` },
        { label: 'Nein. Das kann man nicht überschlagen.', whyWrong: `Runde den Preis auf ganze Euro: Ein ${ware[1]} kostet etwa ${roundP}${NBSP}€.` },
      ]
    : [
        { label: 'Ja, das kann stimmen.', whyWrong: `Überschlage: Ein ${ware[1]} kostet etwa ${roundP}${NBSP}€. ${n} ${TIMES} ${roundP}${NBSP}€ = ${est}${NBSP}€.` },
        { label: 'Nein. Das kann man nicht überschlagen.', whyWrong: `Doch: Runde den Preis auf ganze Euro. Ein ${ware[1]} kostet etwa ${roundP}${NBSP}€.` },
      ];
  const answer = makeChoice(rng, { label: correctLabel }, wrongs);
  return build(ueberschlagSkill, stufe, {
    key: `pruefen:${n}:${p}:${kind}:${ware[1]}`,
    ab: 3,
    knobel: true,
    context,
    prompt: 'Kann das stimmen? Überschlage.',
    emoji: '🧮',
    answer,
    hints: ['Runde den Preis auf ganze Euro.', 'Rechne mit dem gerundeten Preis und vergleiche.'],
    steps: [`Überschlag: ${fmtMoney(p)} ≈ ${roundP}${NBSP}€`, `${n} ${TIMES} ${roundP}${NBSP}€ = ${est}${NBSP}€`, ok ? `${fmtMoney(claimed)} liegt nah dabei. Das kann stimmen.` : `${fmtMoney(claimed)} ist viel ${claimed > exact ? 'zu viel' : 'zu wenig'}. Genau sind es ${fmtMoney(exact)}.`],
    praise: 'Du hast das Ergebnis mit einem Überschlag kontrolliert.',
    srText: `${speak(context)} Kann das stimmen? Wähle aus: ${answer.options.map((o) => speak(o.label)).join(' ')}`,
    kmk: ['ZO.kontrolle', 'ZO.runden', 'PK.argumentieren'],
  });
}

function fermi(stufe: Stufe, rng: Rng): Exercise {
  const v = rng.int(1, 3);
  let ctx: string;
  let q: string;
  let value: number;
  let calc: string;
  if (v === 1) {
    const classes = rng.int(8, 16);
    const per = 25;
    value = classes * per;
    ctx = `Eine Grundschule hat ${classes} Klassen. In jeder Klasse sind etwa ${per} Kinder.`;
    q = 'Etwa wie viele Kinder gehen auf die Schule?';
    calc = `${classes} ${TIMES} ${per} = ${value}`;
  } else if (v === 2) {
    const kids = rng.pick([20, 24, 25]);
    const days = 5;
    value = kids * days;
    ctx = `In der Klasse sind ${kids} Kinder. Jedes Kind isst in der Pause etwa einen Apfel. Eine Schulwoche hat ${days} Tage.`;
    q = 'Etwa wie viele Äpfel isst die Klasse in einer Woche?';
    calc = `${kids} ${TIMES} ${days} = ${value}`;
  } else {
    const per = rng.pick([2, 3]);
    const kids = rng.pick([200, 300, 400]);
    value = kids * per;
    ctx = `Auf eine Schule gehen etwa ${kids} Kinder. Jedes Kind trinkt am Tag etwa ${per} Becher Wasser.`;
    q = 'Etwa wie viele Becher Wasser sind das an einem Tag?';
    calc = `${kids} ${TIMES} ${per} = ${value}`;
  }
  const wrongs: ChoiceOption[] = [value / 10, value * 10, value * 100]
    .filter((x) => Number.isInteger(x))
    .map((x) => ({ label: `etwa ${fmt(x)}`, whyWrong: x < value ? 'Das ist viel zu wenig. Rechne mit den Zahlen aus der Geschichte.' : 'Das ist viel zu viel. Rechne mit den Zahlen aus der Geschichte.' }));
  const answer = makeChoice(rng, { label: `etwa ${fmt(value)}` }, wrongs);
  return build(ueberschlagSkill, stufe, {
    key: `fermi:${v}:${ctx}`,
    ab: 3,
    knobel: true,
    context: ctx,
    prompt: q,
    emoji: '🔢',
    answer,
    hints: ['Welche Zahlen aus der Geschichte brauchst du?', 'Rechne mit runden Zahlen. Es muss nicht genau sein.'],
    steps: [calc, `Es sind etwa ${fmt(value)}.`],
    praise: 'Du hast mit runden Zahlen sinnvoll geschätzt.',
    srText: `${speak(ctx)} ${q} Wähle aus: ${answer.options.map((o) => speak(o.label)).join(', ')}.`,
    kmk: ['ZO.runden', 'PK.problemloesen', 'GM.vorstellung'],
  });
}

export const ueberschlagSkill: SkillDef = {
  id: 'sachaufgaben.ueberschlag',
  topicId: 'sachaufgaben',
  title: 'Überschlagen und prüfen',
  description: 'Du rechnest mit gerundeten Zahlen und prüfst, ob ein Ergebnis passt.',
  stufen: {
    1: 'Reicht das Geld? Mit gerundeten Zahlen rechnen',
    2: 'Überschlag oder genau? Passendes Ergebnis finden',
    3: 'Angaben prüfen, Rechnungen kontrollieren, schätzen',
  },
  kmk: ['ZO.runden', 'ZO.sachrechnen', 'ZO.kontrolle'],
  generate(rng, stufe) {
    const who = pickPerson(rng);
    if (stufe === 1) return rng.chance(0.5) ? enoughMoney(1, rng, who) : estimateNumber(1, rng, who);
    if (stufe === 2) return rng.chance(0.5) ? decide(2, rng, who) : whichResult(2, rng);
    const v = rng.int(1, 3);
    if (v === 1) return judgeClaim(3, rng, who);
    if (v === 2) return checkResult(3, rng, who);
    return fermi(3, rng);
  },
};

