/**
 * One-step word problems ("Rechengeschichten") shared by sachaufgaben.einschrittig and sachaufgaben.modellieren.
 * Wording deliberately varies so that keywords do not predict the operation
 * ('insgesamt' also appears with − and :, 'mehr als' with −, 'weniger als' with +).
 */
import { DIV, MINUS, PLUS, TIMES, fmt } from '../../core/format';
import type { Rng, Stufe } from '../../core/types';
import { pickTwo, Pron, poss, type Person } from '../groessen/helpers';

export type Op = '+' | '-' | '*' | ':';

export const OP_SIGN: Record<Op, string> = { '+': PLUS, '-': MINUS, '*': TIMES, ':': DIV };

export interface Story {
  /** Template id + numbers (for exercise keys). */
  key: string;
  context: string;
  question: string;
  op: Op;
  /** The two numbers of the calculation, in the order they are written (a op b). */
  a: number;
  b: number;
  value: number;
  /** Antwortsatz around the input. */
  before: string;
  after: string;
  /** Unit text used in steps, e.g. '€' or 'Bücher'. */
  unit: string;
  emoji: string;
  /** Situation-specific hint (strategy, never the answer). */
  hint: string;
  /** Wording suggests another operation (Stufe 3): the trap operation and a hint about the situation. */
  trap?: { op: Op; hint: string };
}

export function opResult(op: Op, a: number, b: number): number {
  switch (op) {
    case '+': return a + b;
    case '-': return a - b;
    case '*': return a * b;
    case ':': return a / b;
  }
}

/** 'a op b' with German operator signs. */
export function term(op: Op, a: number, b: number): string {
  return `${fmt(a)} ${OP_SIGN[op]} ${fmt(b)}`;
}

/**
 * Number ranges belong to the situation: a school fete sells a few hundred Lose, a bakery bakes dozens of Bleche,
 * a city run has thousands of children. Stufe 1 stays ≤ 1000, Stufe 2/3 ≤ 10 000; large numbers only appear in
 * contexts where they are plausible.
 */
const big = (stufe: Stufe) => stufe >= 2;

/** Two summands a ∈ aRange, b ∈ bRange with a + b ≤ max. */
function sumPair(rng: Rng, aRange: [number, number], bRange: [number, number], max: number): [number, number] {
  const a = rng.int(aRange[0], Math.min(aRange[1], max - bRange[0]));
  const b = rng.int(bRange[0], Math.min(bRange[1], max - a));
  return [a, b];
}

/** Dividend and divisor: divisor from the list, quotient in qRange, dividend ≤ max. */
function divPair(rng: Rng, divisors: readonly number[], qRange: [number, number], max: number): [number, number] {
  const b = rng.pick(divisors);
  const q = rng.int(qRange[0], Math.min(qRange[1], Math.floor(max / b)));
  return [q * b, b];
}

type Template = (rng: Rng, stufe: Stufe, who: Person, other: Person) => Story;

const ADD: Template[] = [
  (rng, s) => {
    const [a, b] = big(s) ? sumPair(rng, [2000, 8000], [40, 300], 10000) : sumPair(rng, [300, 850], [12, 150], 1000);
    return { key: `add-buecherei:${a}:${b}`, context: `In der Bücherei stehen ${fmt(a)} Kinderbücher. Heute kommen ${fmt(b)} neue Bücher dazu.`, question: 'Wie viele Kinderbücher stehen jetzt in der Bücherei?', op: '+', a, b, value: a + b, before: 'Jetzt stehen', after: 'Kinderbücher in der Bücherei.', unit: 'Bücher', emoji: '📚', hint: 'Kommen Bücher dazu, oder gehen welche weg?' };
  },
  (rng, s) => {
    if (big(s)) {
      const [a, b] = sumPair(rng, [1200, 4800], [1200, 4800], 10000);
      return { key: `add-tombola:${a}:${b}`, context: `Bei der Tombola auf dem Stadtfest werden am Samstag ${fmt(a)} Lose verkauft. Am Sonntag sind es ${fmt(b)} Lose.`, question: 'Wie viele Lose werden am Wochenende verkauft?', op: '+', a, b, value: a + b, before: 'Am Wochenende werden', after: 'Lose verkauft.', unit: 'Lose', emoji: '🎟️', hint: 'Das Wochenende hat zwei Tage. Was passiert mit beiden Zahlen?' };
    }
    const [a, b] = sumPair(rng, [120, 400], [80, 400], 1000);
    return { key: `add-lose:${a}:${b}`, context: `Beim Schulfest verkauft die Klasse 4a am Vormittag ${fmt(a)} Lose. Am Nachmittag verkauft sie noch ${fmt(b)} Lose.`, question: 'Wie viele Lose verkauft die Klasse an diesem Tag?', op: '+', a, b, value: a + b, before: 'Die Klasse verkauft', after: 'Lose.', unit: 'Lose', emoji: '🎟️', hint: 'Denke an beide Teile des Tages.' };
  },
  (rng, s) => {
    const [a, b] = big(s) ? sumPair(rng, [1200, 7800], [1200, 7800], 10000) : sumPair(rng, [120, 850], [110, 850], 1000);
    return { key: `add-zoo:${a}:${b}`, context: `Am Samstag kommen ${fmt(a)} Menschen in den Zoo. Am Sonntag sind es ${fmt(b)} Menschen.`, question: 'Wie viele Menschen waren am Wochenende im Zoo?', op: '+', a, b, value: a + b, before: 'Am Wochenende waren', after: 'Menschen im Zoo.', unit: 'Menschen', emoji: '🦒', hint: 'Das Wochenende hat zwei Tage. Was passiert mit beiden Zahlen?' };
  },
  (rng, s) => {
    const [a, b] = big(s) ? sumPair(rng, [1200, 7800], [120, 7800], 10000) : sumPair(rng, [120, 850], [12, 850], 1000);
    return { key: `add-garten:${a}:${b}`, context: `Im Stadtpark blühen ${fmt(a)} Tulpen und ${fmt(b)} Narzissen.`, question: 'Wie viele Blumen blühen im Park?', op: '+', a, b, value: a + b, before: 'Im Park blühen', after: 'Blumen.', unit: 'Blumen', emoji: '🌷', hint: 'Tulpen und Narzissen sind beides Blumen.' };
  },
  (rng, s, who) => {
    const a = s === 1 ? rng.int(25, 180) : rng.int(120, 480);
    const b = s === 1 ? rng.int(5, 60) : rng.int(20, 150);
    return { key: `add-sparen:${who.name}:${a}:${b}`, context: `${who.name} hat ${a}\u00A0€ gespart. Zum Geburtstag bekommt ${who.p} ${b}\u00A0€ geschenkt.`, question: `Wie viel Geld hat ${who.name} jetzt?`, op: '+', a, b, value: a + b, before: `${who.name} hat jetzt`, after: '€.', unit: '€', emoji: '🐷', hint: 'Bekommt das Kind Geld dazu, oder gibt es Geld aus?' };
  },
];

const SUB: Template[] = [
  (rng, s) => {
    const a = big(s) ? rng.int(2000, 9900) : rng.int(300, 990);
    const y = big(s) ? rng.int(150, Math.floor(a / 4)) : rng.int(20, Math.floor(a / 3));
    return { key: `sub-buecherei:${a}:${y}`, context: `Die Bücherei hat ${fmt(a)} Bücher. ${fmt(y)} Bücher sind gerade ausgeliehen.`, question: 'Wie viele Bücher stehen in den Regalen?', op: '-', a, b: y, value: a - y, before: 'In den Regalen stehen', after: 'Bücher.', unit: 'Bücher', emoji: '📚', hint: 'Ausgeliehene Bücher stehen nicht im Regal.' };
  },
  (rng, s) => {
    const [x, y] = big(s) ? sumPair(rng, [800, 3600], [200, 1200], 4800) : sumPair(rng, [120, 600], [30, 300], 900);
    const a = x + y;
    return { key: `sub-verein:${a}:${y}`, context: `Der Sportverein hat insgesamt ${fmt(a)} Mitglieder. ${fmt(y)} davon spielen Fußball.`, question: 'Wie viele Mitglieder spielen keinen Fußball?', op: '-', a, b: y, value: x, before: '', after: 'Mitglieder spielen keinen Fußball.', unit: 'Mitglieder', emoji: '⚽', hint: 'Alle Mitglieder sind schon gezählt. Wer gehört nicht zu den Fußballern?' };
  },
  (rng, s) => {
    if (s === 1) {
      const a = rng.int(180, 850);
      const y = rng.int(Math.floor(a / 5), Math.floor((a * 4) / 5));
      return { key: `sub-fahrt:${a}:${y}`, context: `Die Zugfahrt ans Meer ist ${fmt(a)}\u00A0km lang. Der Zug ist schon ${fmt(y)}\u00A0km gefahren.`, question: 'Wie viele Kilometer muss der Zug noch fahren?', op: '-', a, b: y, value: a - y, before: 'Der Zug muss noch', after: 'km fahren.', unit: 'km', emoji: '🚆', hint: 'Ein Teil des Weges ist schon geschafft.' };
    }
    const a = rng.int(240, 1800) * 5;
    const y = rng.int(Math.floor(a / 25), Math.floor((a * 4) / 25)) * 5;
    return { key: `sub-wanderweg:${a}:${y}`, context: `Der Wanderweg zur Burg ist ${fmt(a)}\u00A0m lang. Die Klasse ist schon ${fmt(y)}\u00A0m gegangen.`, question: 'Wie viele Meter muss die Klasse noch gehen?', op: '-', a, b: y, value: a - y, before: 'Die Klasse muss noch', after: 'm gehen.', unit: 'm', emoji: '🥾', hint: 'Ein Teil des Weges ist schon geschafft.' };
  },
  (rng, s, who) => {
    const a = s === 1 ? rng.int(40, 150) : rng.int(120, 400);
    const y = rng.int(25, Math.min(90, a - 10));
    return { key: `sub-sparen:${who.name}:${a}:${y}`, context: `${who.name} hat ${a}\u00A0€ gespart. ${Pron(who)} kauft ein Fahrrad-Schloss und einen Helm für zusammen ${y}\u00A0€.`, question: `Wie viel Geld bleibt ${who.p === 'sie' ? 'ihr' : 'ihm'}?`, op: '-', a, b: y, value: a - y, before: 'Es bleiben', after: '€.', unit: '€', emoji: '🚲', hint: 'Wird das gesparte Geld mehr oder weniger?' };
  },
  (rng, s) => {
    const [x, y] = big(s) ? sumPair(rng, [1200, 7800], [120, 7800], 10000) : sumPair(rng, [120, 850], [12, 850], 1000);
    const a = x + y;
    return { key: `sub-karten:${a}:${y}`, context: `Der Zoo hat für heute ${fmt(a)} Eintrittskarten. Bis zum Mittag werden ${fmt(y)} Karten verkauft.`, question: 'Wie viele Karten sind noch übrig?', op: '-', a, b: y, value: x, before: 'Es sind noch', after: 'Karten übrig.', unit: 'Karten', emoji: '🎫', hint: 'Verkaufte Karten sind weg.' };
  },
];

const MUL: Template[] = [
  (rng, s) => {
    const [a, b] = s === 1 ? [rng.int(18, 28), rng.int(3, 7) * 5] : [rng.int(18, 28), rng.int(20, 70) * 5];
    return { key: `mul-fahrt:${a}:${b}`, context: `${a} Kinder fahren mit auf Klassenfahrt. Jedes Kind bezahlt ${fmt(b)}\u00A0€.`, question: 'Wie viel Geld kommt zusammen?', op: '*', a, b, value: a * b, before: 'Es kommen', after: '€ zusammen.', unit: '€', emoji: '🚌', hint: 'Jedes Kind bezahlt gleich viel. Wie oft kommt dieser Betrag vor?' };
  },
  (rng, s) => {
    if (big(s)) {
      const a = rng.int(12, 48);
      const b = rng.int(20, 40);
      return { key: `mul-baeckerei:${a}:${b}`, context: `Eine Großbäckerei backt ${a} Bleche Kekse. Auf jedem Blech liegen ${b} Kekse.`, question: 'Wie viele Kekse sind es?', op: '*', a, b, value: a * b, before: 'Es sind', after: 'Kekse.', unit: 'Kekse', emoji: '🍪', hint: 'Auf jedem Blech liegen gleich viele Kekse.' };
    }
    const a = rng.int(3, 9);
    const b = rng.int(12, 30);
    return { key: `mul-kekse:${a}:${b}`, context: `Für das Schulfest backen die Eltern ${a} Bleche Kekse. Auf jedem Blech liegen ${b} Kekse.`, question: 'Wie viele Kekse sind es?', op: '*', a, b, value: a * b, before: 'Es sind', after: 'Kekse.', unit: 'Kekse', emoji: '🍪', hint: 'Auf jedem Blech liegen gleich viele Kekse.' };
  },
  (rng, s) => {
    if (big(s)) {
      const a = rng.int(12, 48);
      const b = rng.int(40, 99);
      return { key: `mul-feld:${a}:${b}`, context: `Ein Gemüsebauer pflanzt Salat in ${a} Reihen. In jeder Reihe stehen ${b} Pflanzen.`, question: 'Wie viele Salatpflanzen sind es insgesamt?', op: '*', a, b, value: a * b, before: 'Es sind', after: 'Salatpflanzen.', unit: 'Pflanzen', emoji: '🥬', hint: 'Alle Reihen sind gleich lang.' };
    }
    const a = rng.int(3, 9);
    const b = rng.int(8, 25);
    return { key: `mul-garten:${a}:${b}`, context: `Im Gemüsegarten gibt es ${a} Reihen. In jeder Reihe stehen ${b} Salatpflanzen.`, question: 'Wie viele Salatpflanzen sind es insgesamt?', op: '*', a, b, value: a * b, before: 'Es sind', after: 'Salatpflanzen.', unit: 'Pflanzen', emoji: '🥬', hint: 'Alle Reihen sind gleich lang.' };
  },
  (rng, s) => {
    const a = big(s) ? rng.int(12, 48) : rng.int(3, 9);
    const b = big(s) ? rng.int(40, 99) : rng.int(25, 60);
    return { key: `mul-regal:${a}:${b}`, context: `Die Bücherei hat ${a} gleiche Regale. In jedes Regal passen ${b} Bücher.`, question: 'Wie viele Bücher passen in alle Regale?', op: '*', a, b, value: a * b, before: 'In alle Regale passen', after: 'Bücher.', unit: 'Bücher', emoji: '📚', hint: 'Alle Regale sind gleich groß.' };
  },
  (rng, s) => {
    const a = s === 1 ? rng.int(4, 9) : rng.int(12, 30);
    const b = s === 1 ? rng.int(12, 39) : rng.int(19, 45);
    return { key: `mul-trikots:${a}:${b}`, context: `Der Sportverein kauft ${a} neue Trikots. Ein Trikot kostet ${b}\u00A0€.`, question: 'Wie viel kosten alle Trikots?', op: '*', a, b, value: a * b, before: 'Alle Trikots kosten', after: '€.', unit: '€', emoji: '👕', hint: 'Jedes Trikot kostet gleich viel.' };
  },
];

const DIVS: Template[] = [
  (rng, s) => {
    const k = rng.int(18, 28);
    const per = s === 1 ? rng.int(3, 7) * 5 : rng.int(20, 70) * 5;
    const a = k * per;
    return { key: `div-fahrt:${a}:${k}`, context: `Die Klassenfahrt kostet für alle zusammen ${fmt(a)}\u00A0€. ${k} Kinder fahren mit. Alle bezahlen gleich viel.`, question: 'Wie viel bezahlt ein Kind?', op: ':', a, b: k, value: per, before: 'Ein Kind bezahlt', after: '€.', unit: '€', emoji: '🚌', hint: 'Der Gesamtpreis wird gerecht auf alle Kinder verteilt.' };
  },
  (rng, s) => {
    if (big(s)) {
      const [a, b] = divPair(rng, [3, 4, 5, 6, 7, 8, 9, 12, 15, 20, 25], [24, 400], 10000);
      return { key: `div-filialen:${a}:${b}`, context: `Eine Großbäckerei verteilt ${fmt(a)} Brötchen gerecht auf ${b} Filialen.`, question: 'Wie viele Brötchen bekommt jede Filiale?', op: ':', a, b, value: a / b, before: 'Jede Filiale bekommt', after: 'Brötchen.', unit: 'Brötchen', emoji: '🥖', hint: 'Jede Filiale bekommt gleich viele Brötchen.' };
    }
    const [a, b] = divPair(rng, [2, 3, 4, 5, 6, 7, 8, 9], [8, 30], 1000);
    return { key: `div-muffins:${a}:${b}`, context: `${fmt(a)} Muffins werden gerecht auf ${b} Tische verteilt.`, question: 'Wie viele Muffins stehen auf einem Tisch?', op: ':', a, b, value: a / b, before: 'Auf einem Tisch stehen', after: 'Muffins.', unit: 'Muffins', emoji: '🧁', hint: 'Jeder Tisch bekommt gleich viele Muffins.' };
  },
  (rng, s) => {
    if (big(s)) {
      const [a, b] = divPair(rng, [12, 15, 20, 25], [24, 400], 10000);
      return { key: `div-stadtlauf:${a}:${b}`, context: `Beim Stadtlauf starten insgesamt ${fmt(a)} Kinder. Es werden Startgruppen mit je ${b} Kindern gebildet.`, question: 'Wie viele Startgruppen gibt es?', op: ':', a, b, value: a / b, before: 'Es gibt', after: 'Startgruppen.', unit: 'Gruppen', emoji: '🏃', hint: 'Wie oft passt eine Startgruppe in alle Kinder?' };
    }
    const [a, b] = divPair(rng, [4, 5, 6, 7, 8, 9], [8, 40], 1000);
    return { key: `div-gruppen:${a}:${b}`, context: `Zum Sportfest kommen insgesamt ${fmt(a)} Kinder. Es werden Gruppen mit je ${b} Kindern gebildet.`, question: 'Wie viele Gruppen gibt es?', op: ':', a, b, value: a / b, before: 'Es gibt', after: 'Gruppen.', unit: 'Gruppen', emoji: '🏃', hint: 'Wie oft passt eine Gruppe in alle Kinder?' };
  },
  (rng, s) => {
    if (big(s)) {
      const [a, b] = divPair(rng, [20, 25, 40, 50], [24, 200], 10000);
      return { key: `div-beete:${a}:${b}`, context: `Im Stadtpark werden ${fmt(a)} Blumenzwiebeln gesetzt. In jedes Beet kommen ${b} Zwiebeln.`, question: 'Wie viele Beete werden es?', op: ':', a, b, value: a / b, before: 'Es werden', after: 'Beete.', unit: 'Beete', emoji: '🌱', hint: 'Jedes Beet bekommt gleich viele Zwiebeln.' };
    }
    const [a, b] = divPair(rng, [6, 8, 9, 10, 12, 15], [4, 25], 1000);
    return { key: `div-zwiebeln:${a}:${b}`, context: `Im Schulgarten werden ${fmt(a)} Blumenzwiebeln gesetzt. In jede Reihe kommen ${b} Zwiebeln.`, question: 'Wie viele Reihen werden es?', op: ':', a, b, value: a / b, before: 'Es werden', after: 'Reihen.', unit: 'Reihen', emoji: '🌱', hint: 'Jede Reihe bekommt gleich viele Zwiebeln.' };
  },
  (rng, s) => {
    const days = rng.pick([5, 6, 7]);
    const per = s === 1 ? rng.int(4, 12) : rng.int(15, 80);
    const a = days * per;
    return { key: `div-futter:${a}:${days}`, context: `Die Tierpflegerin hat ${fmt(a)}\u00A0kg Futter für die Ziegen. Es soll ${days} Tage reichen. Jeden Tag gibt es gleich viel.`, question: 'Wie viel Kilogramm Futter gibt es an einem Tag?', op: ':', a, b: days, value: per, before: 'An einem Tag gibt es', after: 'kg Futter.', unit: 'kg', emoji: '🐐', hint: 'Das Futter wird gleichmäßig auf die Tage verteilt.' };
  },
];

/** Stufe 3: inconsistent wording or unknown start. */
const TRICKY: Template[] = [
  (rng, s, who, other) => {
    const b = rng.int(12, 90);
    const x = rng.int(40, s === 3 ? 900 : 300);
    const a = x + b;
    return { key: `mehr-als:${who.name}:${other.name}:${a}:${b}`, context: `${who.name} hat ${fmt(a)} Sammelkarten. Das sind ${b} Karten mehr, als ${other.name} hat.`, question: `Wie viele Sammelkarten hat ${other.name}?`, op: '-', a, b, value: x, before: `${other.name} hat`, after: 'Sammelkarten.', unit: 'Karten', emoji: '🃏', hint: `Wer hat mehr Karten: ${who.name} oder ${other.name}?`, trap: { op: '+', hint: `${who.name} hat mehr Karten als ${other.name}. ${other.name} hat also weniger.` } };
  },
  (rng) => {
    const a = rng.int(120, 900);
    const b = rng.int(15, 150);
    return { key: `weniger-als:${a}:${b}`, context: `Die Klasse 4b sammelt beim Spendenlauf ${a}\u00A0€. Das sind ${b}\u00A0€ weniger als bei der Klasse 4a.`, question: 'Wie viel Geld sammelt die Klasse 4a?', op: '+', a, b, value: a + b, before: 'Die Klasse 4a sammelt', after: '€.', unit: '€', emoji: '🏃', hint: 'Welche Klasse hat mehr Geld gesammelt?', trap: { op: '-', hint: 'Die 4b hat weniger gesammelt als die 4a. Die 4a hat also mehr.' } };
  },
  (rng) => {
    const a = rng.int(25, 180);
    const b = rng.int(120, 800);
    return { key: `anfang:${a}:${b}`, context: `Nach dem Schulfest sind noch ${a} Becher übrig. ${fmt(b)} Becher wurden benutzt.`, question: 'Wie viele Becher waren es am Anfang?', op: '+', a, b, value: a + b, before: 'Am Anfang waren es', after: 'Becher.', unit: 'Becher', emoji: '🥤', hint: 'Am Anfang waren die benutzten und die übrigen Becher zusammen da.', trap: { op: '-', hint: 'Am Anfang waren mehr Becher da als am Ende. Die benutzten Becher waren auch dabei.' } };
  },
  (rng) => {
    const start = rng.int(1200, 4000);
    const back = rng.int(40, 600);
    const end = start + back;
    return { key: `aenderung:${start}:${end}`, context: `Am Morgen stehen ${fmt(start)} Bücher in der Bücherei. Bis zum Abend werden nur Bücher zurückgebracht. Dann stehen dort ${fmt(end)} Bücher.`, question: 'Wie viele Bücher wurden zurückgebracht?', op: '-', a: end, b: start, value: back, before: 'Es wurden', after: 'Bücher zurückgebracht.', unit: 'Bücher', emoji: '📚', hint: 'Wie viele Bücher sind am Abend mehr da als am Morgen?', trap: { op: '+', hint: 'Gefragt ist nur, wie viele Bücher dazugekommen sind. Vergleiche Morgen und Abend.' } };
  },
  (rng, _s, who, other) => {
    const k = rng.int(3, 6);
    const x = rng.int(12, 60);
    const a = k * x;
    return { key: `mal-so-viele:${who.name}:${other.name}:${a}:${k}`, context: `${who.name} hat ${k}-mal so viele Murmeln wie ${other.name}. ${who.name} hat ${a} Murmeln.`, question: `Wie viele Murmeln hat ${other.name}?`, op: ':', a, b: k, value: x, before: `${other.name} hat`, after: 'Murmeln.', unit: 'Murmeln', emoji: '🔵', hint: `Wer hat mehr Murmeln: ${who.name} oder ${other.name}?`, trap: { op: '*', hint: `${who.name} hat mehr Murmeln. ${other.name} hat also weniger, nicht mehr.` } };
  },
];

export const TEMPLATES: Record<Op, Template[]> = { '+': ADD, '-': SUB, '*': MUL, ':': DIVS };

/** A one-step story for the given Stufe. Stufe 3: mostly tricky wording. */
export function oneStepStory(rng: Rng, stufe: Stufe, op?: Op): Story {
  const [who, other] = pickTwo(rng);
  if (stufe === 3 && !op && rng.chance(0.7)) return rng.pick(TRICKY)(rng, stufe, who, other);
  const o = op ?? rng.pick(['+', '-', '*', ':'] as const);
  return rng.pick(TEMPLATES[o])(rng, stufe, who, other);
}

/** The calculation with the operation the keyword suggests or with a wrong operation. */
export function wrongOpValues(st: Story): { op: Op; value: number }[] {
  const out: { op: Op; value: number }[] = [];
  for (const op of ['+', '-', '*', ':'] as const) {
    if (op === st.op) continue;
    let v = opResult(op, st.a, st.b);
    if (op === '-') v = Math.abs(st.a - st.b);
    if (Number.isInteger(v) && v > 0) out.push({ op, value: v });
  }
  return out;
}

export { poss };
