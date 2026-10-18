/**
 * Mehrschrittige Sachaufgaben.
 * Stufe 1: two steps, whole numbers ≤ 1000.
 * Stufe 2: two steps with Größen (Geld mit Cent, Zeit, Meter), data from a Preisliste or Fahrplan, one extra piece of information.
 * Stufe 3: three steps (Einkauf mit Rückgeld, Zaun mit Tor, Klassenfahrt, Rezept).
 */
import { fmt, fmtMoney, fmtTime, TIMES } from '../../core/format';
import type { Bug, Exercise, Rng, SkillDef, Stufe, Step, Visual } from '../../core/types';
import { answerSentence, build, numberBugs, pickPerson, plural, Pron, safeHints, sentenceAnswer, speak, type Person } from './shared';

interface Problem {
  key: string;
  context: string;
  question: string;
  value: number;
  decimals?: number;
  before: string;
  after: string;
  steps: Step[];
  bugs: (Bug | false)[];
  hints: string[];
  emoji: string;
  visual?: Visual;
  /** Spoken extra text for screen readers (e.g. the table). */
  srExtra?: string;
  ab: 1 | 2 | 3;
  kmk: string[];
  /** Process praise naming the steps this problem needs. */
  praise: string;
}

const eur = (ct: number) => fmtMoney(ct);

// ─── Stufe 1 ─────────────────────────────────────────────────────────────────

function hefte(rng: Rng, who: Person): Problem {
  const n = rng.int(3, 8);
  const p = rng.int(2, 4);
  const q = rng.int(6, 15);
  const value = n * p + q;
  return {
    key: `hefte:${n}:${p}:${q}`,
    context: `${who.name} kauft ${n} Hefte. Ein Heft kostet ${p}\u00A0€. Dazu kauft ${who.p} einen Malkasten für ${q}\u00A0€.`,
    question: `Wie viel muss ${who.name} bezahlen?`,
    value, before: `${who.name} muss`, after: '€ bezahlen.',
    steps: [`Hefte: ${n} ${TIMES} ${p}\u00A0€ = ${n * p}\u00A0€`, `Mit Malkasten: ${n * p}\u00A0€ + ${q}\u00A0€ = ${value}\u00A0€`],
    bugs: [
      { id: 'nur-hefte', match: n * p, hint: 'Vergiss den Malkasten nicht.' },
      { id: 'alles-addiert', match: n + p + q, hint: `${who.name} kauft ${n} Hefte. Jedes Heft kostet ${p}\u00A0€.` },
      { id: 'ein-heft', match: p + q, hint: `Es sind ${n} Hefte, nicht nur eines.` },
    ],
    hints: ['Was kosten zuerst alle Hefte zusammen?', 'Rechne dann den Malkasten dazu.'],
    emoji: '📒', ab: 1, kmk: ['ZO.sachrechnen'],
    praise: 'Du hast erst den Preis für alle Hefte ausgerechnet und dann den Malkasten dazugezählt.',
  };
}

function regale(rng: Rng): Problem {
  const r = rng.int(3, 6);
  const a = rng.int(40, 90);
  const b = rng.int(15, Math.floor((r * a) / 2));
  const value = r * a - b;
  return {
    key: `regale:${r}:${a}:${b}`,
    context: `Die Klassenbücherei hat ${r} Regalbretter. Auf jedem Brett stehen ${a} Bücher. ${b} Bücher sind gerade ausgeliehen.`,
    question: 'Wie viele Bücher stehen noch auf den Brettern?',
    value, before: 'Auf den Brettern stehen noch', after: 'Bücher.',
    steps: [`Alle Bücher: ${r} ${TIMES} ${a} = ${r * a}`, `Ohne die ausgeliehenen: ${r * a} − ${b} = ${value}`],
    bugs: [
      { id: 'alle', match: r * a, hint: 'Einige Bücher sind ausgeliehen. Sie stehen nicht auf den Brettern.' },
      { id: 'ein-brett', match: a - b, hint: `Es sind ${r} Bretter. Wie viele Bücher sind es auf allen Brettern?` },
      { id: 'addiert', match: r * a + b, hint: 'Ausgeliehene Bücher sind weg. Werden es mehr oder weniger?' },
    ],
    hints: ['Wie viele Bücher sind es zuerst auf allen Brettern?', 'Was passiert mit den ausgeliehenen Büchern?'],
    emoji: '📚', ab: 1, kmk: ['ZO.sachrechnen'],
    praise: 'Du hast erst alle Bücher ausgerechnet und dann die ausgeliehenen abgezogen.',
  };
}

function kekse(rng: Rng): Problem {
  const n = rng.int(3, 6);
  const k = rng.int(12, 24);
  const s = rng.int(Math.floor((n * k) / 3), n * k - 3);
  const value = n * k - s;
  return {
    key: `kekse:${n}:${k}:${s}`,
    context: `Für das Schulfest backt die Klasse ${n} Bleche Kekse. Auf jedes Blech passen ${k} Kekse. ${s} Kekse werden verkauft.`,
    question: 'Wie viele Kekse sind noch übrig?',
    value, before: 'Es sind noch', after: 'Kekse übrig.',
    steps: [`Alle Kekse: ${n} ${TIMES} ${k} = ${n * k}`, `Übrig: ${n * k} − ${s} = ${value}`],
    bugs: [
      { id: 'alle', match: n * k, hint: 'Das sind alle Kekse. Einige wurden schon verkauft.' },
      { id: 'verkauft', match: s, hint: 'Das sind die verkauften Kekse. Gefragt sind die übrigen.' },
    ],
    hints: ['Wie viele Kekse sind es auf allen Blechen?', 'Wie viele bleiben übrig, wenn einige verkauft sind?'],
    emoji: '🍪', ab: 1, kmk: ['ZO.sachrechnen'],
    praise: 'Du hast erst alle Kekse ausgerechnet und dann die verkauften abgezogen.',
  };
}

function zooFamilie(rng: Rng): Problem {
  const k = rng.int(2, 4);
  const e = rng.int(10, 16);
  const c = rng.int(5, 9);
  const value = 2 * e + k * c;
  return {
    key: `zoo:${k}:${e}:${c}`,
    context: `Familie Kaya geht in den Zoo: 2 Erwachsene und ${k} Kinder. Ein Erwachsener zahlt ${e}\u00A0€ Eintritt, ein Kind ${c}\u00A0€.`,
    question: 'Wie viel Eintritt zahlt die Familie?',
    value, before: 'Die Familie zahlt', after: '€ Eintritt.',
    steps: [`Erwachsene: 2 ${TIMES} ${e}\u00A0€ = ${2 * e}\u00A0€`, `Kinder: ${k} ${TIMES} ${c}\u00A0€ = ${k * c}\u00A0€`, `Zusammen: ${2 * e}\u00A0€ + ${k * c}\u00A0€ = ${value}\u00A0€`],
    bugs: [
      { id: 'je-eins', match: e + c, hint: 'Es sind 2 Erwachsene und mehrere Kinder.' },
      { id: 'kinder-vergessen', match: 2 * e, hint: 'Die Kinder zahlen auch Eintritt.' },
      { id: 'alle-erwachsenenpreis', match: (2 + k) * e, hint: 'Kinder zahlen weniger als Erwachsene.' },
    ],
    hints: ['Rechne zuerst für die Erwachsenen, dann für die Kinder.', 'Addiere zum Schluss beide Beträge.'],
    emoji: '🦁', ab: 1, kmk: ['ZO.sachrechnen'],
    praise: 'Du hast Erwachsene und Kinder getrennt gerechnet und dann addiert.',
  };
}

function basketball(rng: Rng, who: Person): Problem {
  const t = rng.int(3, 12);
  const d = rng.int(2, 8);
  const value = 2 * t + 3 * d;
  return {
    key: `basketball:${who.name}:${t}:${d}`,
    context: `Beim Basketball wirft ${who.name} ${t} Körbe für je 2 Punkte. Dazu wirft ${who.p} ${d} Körbe für je 3 Punkte.`,
    question: `Wie viele Punkte hat ${who.name}?`,
    value, before: `${who.name} hat`, after: 'Punkte.',
    steps: [`${t} ${TIMES} 2 = ${2 * t}`, `${d} ${TIMES} 3 = ${3 * d}`, `${2 * t} + ${3 * d} = ${value}`],
    bugs: [
      { id: 'koerbe', match: t + d, hint: 'Du hast die Körbe gezählt. Jeder Korb bringt 2 oder 3 Punkte.' },
      { id: 'alle-2', match: 2 * (t + d), hint: 'Manche Körbe zählen 3 Punkte.' },
    ],
    hints: ['Wie viele Punkte bringen die 2-Punkte-Körbe?', 'Wie viele Punkte bringen die 3-Punkte-Körbe?'],
    emoji: '🏀', ab: 1, kmk: ['ZO.sachrechnen'],
    praise: 'Du hast die 2-Punkte-Körbe und die 3-Punkte-Körbe getrennt gerechnet.',
  };
}

// ─── Stufe 2 ─────────────────────────────────────────────────────────────────

/** acc = definite accusative ('Vergiss die Brezel nicht.'), oneAcc = indefinite pronoun ('nicht nur eine'). */
const WAREN = [
  { one: 'Brötchen', many: 'Brötchen', acc: 'das Brötchen', oneAcc: 'eines', prices: [35, 39, 40, 45, 49, 55] },
  { one: 'Brezel', many: 'Brezeln', acc: 'die Brezel', oneAcc: 'eine', prices: [65, 69, 75, 79, 85, 89, 95] },
  { one: 'Apfel', many: 'Äpfel', acc: 'den Apfel', oneAcc: 'einen', prices: [30, 35, 40, 45, 50, 55, 60] },
  { one: 'Banane', many: 'Bananen', acc: 'die Banane', oneAcc: 'eine', prices: [25, 29, 30, 35, 39, 45] },
  { one: 'Joghurt', many: 'Joghurts', acc: 'den Joghurt', oneAcc: 'einen', prices: [39, 45, 49, 55, 59, 65, 69, 75, 79] },
  { one: 'Müsliriegel', many: 'Müsliriegel', acc: 'den Müsliriegel', oneAcc: 'einen', prices: [49, 55, 59, 65, 69, 75, 79, 85, 89] },
  { one: 'Flasche Saft', many: 'Flaschen Saft', acc: 'die Flasche Saft', oneAcc: 'eine', prices: [99, 109, 119, 129, 139, 149, 159, 179, 199] },
  { one: 'Flasche Milch', many: 'Flaschen Milch', acc: 'die Flasche Milch', oneAcc: 'eine', prices: [99, 105, 109, 115, 119, 125, 129, 135, 139, 149] },
];

function preisliste(rng: Rng, who: Person): Problem {
  const list = rng.sample(WAREN, 4).map((w) => ({ ...w, price: rng.pick(w.prices) }));
  const [x, y] = rng.sample(list, 2);
  const n = rng.int(3, 8);
  const total = n * x.price + y.price;
  return {
    key: `preisliste:${list.map((l) => `${l.one}-${l.price}`).join('+')}:${x.one}:${n}:${y.one}`,
    context: `${who.name} kauft für das Klassenfrühstück ${n} ${x.many} und 1 ${y.one}.`,
    question: `Wie viel muss ${who.name} bezahlen?`,
    value: total / 100, decimals: 2, before: `${who.name} muss`, after: '€ bezahlen.',
    steps: [`${x.many}: ${n} ${TIMES} ${eur(x.price)} = ${eur(n * x.price)}`, `Dazu: ${eur(n * x.price)} + ${eur(y.price)} = ${eur(total)}`],
    bugs: [
      { id: 'anzahl-vergessen', match: (x.price + y.price) / 100, hint: `${who.name} kauft ${n} ${x.many}, nicht nur ${x.oneAcc}.` },
      { id: 'beides-mal', match: (n * (x.price + y.price)) / 100, hint: `Von „${y.one}“ kauft ${who.name} nur 1 Stück.` },
      { id: 'nur-erstes', match: (n * x.price) / 100, hint: `Vergiss ${y.acc} nicht.` },
    ],
    hints: ['Suche die Preise in der Preisliste. Du brauchst nur zwei davon.', `Rechne zuerst den Preis für die ${x.many} aus.`],
    emoji: '🥨',
    visual: { type: 'table', caption: 'Preisliste Supermarkt', header: ['Ware', 'Preis'], rows: list.map((l) => [l.one, eur(l.price)]) },
    srExtra: `Preisliste: ${list.map((l) => `${l.one} ${speak(eur(l.price))}`).join(', ')}.`,
    ab: 2, kmk: ['ZO.sachrechnen', 'GM.sachsituationen', 'DZ.daten'],
    praise: 'Du hast die zwei passenden Preise in der Liste gefunden und in Schritten gerechnet.',
  };
}

const STOPS = ['Bahnhof', 'Marktplatz', 'Rathaus', 'Schule', 'Schwimmbad', 'Zoo', 'Bücherei', 'Sportplatz', 'Krankenhaus', 'Stadtpark'];

function fahrplan(rng: Rng, who: Person): Problem {
  const stops = rng.sample(STOPS, 4);
  const t0 = rng.int(7, 16) * 60 + rng.int(30, 55);
  const times = [t0];
  for (let i = 1; i < 4; i++) times.push(times[i - 1] + rng.int(4, 13));
  const ia = rng.int(0, 1);
  const ib = rng.int(2, 3);
  const ride = times[ib] - times[ia];
  const walk = rng.int(3, 12);
  const value = ride + walk;
  const t = (m: number) => fmtTime(Math.floor(m / 60), m % 60);
  const decimal = (Math.floor(times[ib] / 60) * 100 + (times[ib] % 60)) - (Math.floor(times[ia] / 60) * 100 + (times[ia] % 60));
  return {
    key: `fahrplan:${times.join('-')}:${stops.join('-')}:${ia}:${ib}:${walk}`,
    context: `${who.name} steigt an der Haltestelle ${stops[ia]} in den Bus. ${Pron(who)} fährt bis zur Haltestelle ${stops[ib]}. Danach läuft ${who.p} noch ${walk} Minuten.`,
    question: `Wie viele Minuten ist ${who.name} unterwegs?`,
    value, before: `${who.name} ist`, after: 'Minuten unterwegs.',
    steps: [`Abfahrt ${stops[ia]}: ${t(times[ia])}. Ankunft ${stops[ib]}: ${t(times[ib])}.`, `Busfahrt: ${ride}\u00A0min`, `Mit Laufen: ${ride}\u00A0min + ${walk}\u00A0min = ${value}\u00A0min`],
    bugs: [
      { id: 'nur-bus', match: ride, hint: `Nach der Busfahrt läuft ${who.name} noch.` },
      decimal !== ride && { id: 'hundert', match: decimal + walk, hint: 'Eine Stunde hat 60 Minuten, nicht 100. Zähle über die volle Stunde hinweg.' },
      { id: 'ganze-linie', match: times[3] - times[0] + walk, hint: `Lies genau: ${who.name} fährt nicht die ganze Strecke.` },
    ],
    hints: ['Suche im Fahrplan die beiden Haltestellen.', 'Wie lange dauert die Busfahrt? Zähle dann das Laufen dazu.'],
    emoji: '🚌',
    visual: { type: 'table', caption: 'Fahrplan Buslinie 4', header: ['Haltestelle', 'Abfahrt'], rows: stops.map((s, i) => [s, t(times[i])]) },
    srExtra: `Fahrplan: ${stops.map((s, i) => `${s} ${t(times[i])}`).join(', ')}.`,
    ab: 2, kmk: ['GM.zeit', 'GM.sachsituationen', 'DZ.daten'],
    praise: 'Du hast die Fahrzeit im Fahrplan abgelesen und das Laufen dazugezählt.',
  };
}

function klassenfahrt(rng: Rng, three: boolean): Problem {
  const k = rng.pick([20, 22, 24, 25, 26, 28]);
  const busPer = rng.int(8, 20);
  const bus = busPer * k;
  const e = rng.int(4, 12);
  const f = rng.int(5, 9);
  const value = busPer + e + (three ? f : 0);
  const hours = rng.int(1, 3);
  const extra = rng.pick([`Die Fahrt dauert ${hours} ${plural(hours, 'Stunde', 'Stunden')}.`, `Der Bus hat ${rng.pick([40, 50, 60])} Sitzplätze.`, `Die Klasse fährt um ${rng.int(7, 9)} Uhr los.`]);
  return {
    key: `klassenfahrt:${three ? 3 : 2}:${k}:${bus}:${e}:${three ? f : 0}:${extra}`,
    context: three
      ? `${k} Kinder fahren in den Kletterpark. Der Bus kostet für alle zusammen ${fmt(bus)}\u00A0€. Der Eintritt kostet ${e}\u00A0€ pro Kind. Das Mittagessen kostet ${f}\u00A0€ pro Kind.`
      : `${k} Kinder fahren in den Kletterpark. Der Bus kostet für alle zusammen ${fmt(bus)}\u00A0€. ${extra} Der Eintritt kostet ${e}\u00A0€ pro Kind.`,
    question: 'Wie viel muss jedes Kind bezahlen?',
    value, before: 'Jedes Kind muss', after: '€ bezahlen.',
    steps: [`Bus pro Kind: ${fmt(bus)}\u00A0€ : ${k} = ${busPer}\u00A0€`, three ? `Mit Eintritt und Essen: ${busPer}\u00A0€ + ${e}\u00A0€ + ${f}\u00A0€ = ${value}\u00A0€` : `Mit Eintritt: ${busPer}\u00A0€ + ${e}\u00A0€ = ${value}\u00A0€`],
    bugs: [
      { id: 'nur-bus', match: busPer, hint: 'Der Eintritt kommt für jedes Kind noch dazu.' },
      { id: 'bus-nicht-geteilt', match: bus + e + (three ? f : 0), hint: 'Der Bus kostet für alle zusammen so viel. Teile den Preis auf alle Kinder auf.' },
      three && { id: 'essen-vergessen', match: busPer + e, hint: 'Vergiss das Mittagessen nicht.' },
    ],
    hints: ['Wie viel kostet der Bus für ein Kind?', three ? 'Was muss jedes Kind sonst noch bezahlen?' : 'Welche Angabe brauchst du nicht?'],
    emoji: '🧗', ab: three ? 3 : 2, kmk: ['ZO.sachrechnen', 'GM.sachsituationen'],
    praise: three
      ? 'Du hast den Buspreis auf alle Kinder verteilt und dann alle Kosten für ein Kind addiert.'
      : 'Du hast den Buspreis aufgeteilt und nur die Angaben benutzt, die du brauchst.',
  };
}

function zaun(rng: Rng, gate: boolean): Problem {
  const a = rng.int(4, 15);
  const b = rng.int(2, a - 1);
  const g = gate ? rng.int(1, 2) : 0;
  const value = 2 * (a + b) - g;
  const plants = rng.int(8, 30);
  return {
    key: `zaun:${a}:${b}:${g}:${plants}`,
    context: gate
      ? `Ein Gemüsebeet ist ${a}\u00A0m lang und ${b}\u00A0m breit. Rundherum kommt ein Zaun. Für das Tor ${plural(g, 'bleibt', 'bleiben')} ${g}\u00A0m frei.`
      : `Ein Gemüsebeet ist ${a}\u00A0m lang und ${b}\u00A0m breit. Darin wachsen ${plants} Tomatenpflanzen. Rundherum kommt ein Zaun.`,
    question: 'Wie viele Meter Zaun braucht man?',
    value, before: 'Man braucht', after: 'm Zaun.',
    steps: [`Rundherum: ${a}\u00A0m + ${b}\u00A0m + ${a}\u00A0m + ${b}\u00A0m = ${2 * (a + b)}\u00A0m`, ...(gate ? [`Ohne Tor: ${2 * (a + b)}\u00A0m − ${g}\u00A0m = ${value}\u00A0m`] : [])],
    bugs: [
      { id: 'zwei-seiten', match: a + b - g, hint: 'Der Zaun geht um alle vier Seiten des Beets.' },
      { id: 'flaeche', match: a * b, hint: 'Der Zaun steht am Rand. Rechne die Länge aller Seiten zusammen.' },
      gate && { id: 'tor-vergessen', match: 2 * (a + b), hint: 'Am Tor braucht man keinen Zaun.' },
    ],
    hints: ['Zeichne das Beet als Rechteck. Wo steht der Zaun?', gate ? 'Rechne alle vier Seiten zusammen. Denke dann an das Tor.' : 'Rechne alle vier Seiten zusammen.'],
    emoji: '🌻', ab: gate ? 3 : 2, kmk: ['GM.sachsituationen', 'RF.flaeche'],
    praise: gate
      ? 'Du hast alle vier Seiten zusammengezählt und an das Tor gedacht.'
      : 'Du hast alle vier Seiten zusammengezählt und die Pflanzen nicht mitgerechnet.',
  };
}

// ─── Stufe 3 ─────────────────────────────────────────────────────────────────

function einkaufRueckgeld(rng: Rng, who: Person): Problem {
  const [x, y] = rng.sample(WAREN, 2).map((w) => ({ ...w, price: rng.pick(w.prices) }));
  const n = rng.int(3, 6);
  const sum = n * x.price + y.price;
  const note = [500, 1000, 2000].find((v) => v > sum) ?? 2000;
  const change = note - sum;
  return {
    key: `einkauf:${x.one}-${x.price}:${n}:${y.one}-${y.price}:${note}`,
    context: `${who.name} kauft ${n} ${x.many} zu je ${eur(x.price)} und 1 ${y.one} für ${eur(y.price)}. ${Pron(who)} bezahlt mit einem ${note / 100}-€-Schein.`,
    question: `Wie viel Rückgeld bekommt ${who.name}?`,
    value: change / 100, decimals: 2, before: `${who.name} bekommt`, after: '€ zurück.',
    steps: [`${x.many}: ${n} ${TIMES} ${eur(x.price)} = ${eur(n * x.price)}`, `Einkauf: ${eur(n * x.price)} + ${eur(y.price)} = ${eur(sum)}`, `Rückgeld: ${eur(note)} − ${eur(sum)} = ${eur(change)}`],
    bugs: [
      { id: 'nur-einkauf', match: sum / 100, hint: 'Das kostet der Einkauf. Gefragt ist das Rückgeld.' },
      { id: 'zweite-ware-vergessen', match: (note - n * x.price) / 100, hint: `Vergiss ${y.acc} nicht.` },
      { id: 'anzahl-vergessen', match: (note - x.price - y.price) / 100, hint: `${who.name} kauft ${n} ${x.many}.` },
      { id: 'euro-nicht-entbuendelt', match: (change + 100) / 100, hint: 'Prüfe beim Rückgeld die Euro: Für die Cent hast du einen Euro angebrochen.' },
    ],
    hints: ['Rechne in drei Schritten: erst die gleichen Waren, dann alles zusammen, dann das Rückgeld.', 'Ergänze beim Rückgeld vom Preis bis zum Schein.'],
    emoji: '🛒', ab: 3, kmk: ['ZO.sachrechnen', 'GM.sachsituationen'],
    praise: 'Du hast erst den ganzen Einkauf ausgerechnet und dann das Rückgeld bestimmt.',
  };
}

function rezept(rng: Rng): Problem {
  const per = rng.pick([150, 200, 250, 300]);
  const base = 12;
  const factor = rng.int(2, 3);
  const n = base * factor;
  const need = per * factor;
  const pack = need < 1000 ? 1000 : 2000;
  const rest = pack - need;
  return {
    key: `rezept:${per}:${factor}:${pack}`,
    context: `Für ${base} Muffins braucht man ${per}\u00A0g Mehl. Die Klasse backt ${n} Muffins für das Schulfest. Sie hat eine Packung mit ${pack / 1000}\u00A0kg Mehl.`,
    question: 'Wie viel Gramm Mehl bleiben übrig?',
    value: rest, before: 'Es bleiben', after: 'g Mehl übrig.',
    steps: [`${n} Muffins sind ${factor}-mal so viele wie ${base}: ${n} : ${base} = ${factor}`, `Mehl: ${factor} ${TIMES} ${per}\u00A0g = ${need}\u00A0g`, `${pack / 1000}\u00A0kg = ${pack}\u00A0g`, `Rest: ${pack}\u00A0g − ${need}\u00A0g = ${rest}\u00A0g`],
    bugs: [
      { id: 'einmal-rezept', match: pack - per, hint: `Die Klasse backt mehr als ${base} Muffins. Wie oft braucht sie das Rezept?` },
      { id: 'verbrauch', match: need, hint: 'Das ist das Mehl für alle Muffins. Gefragt ist, was übrig bleibt.' },
      need < pack / 10 * 10 && { id: 'faktor-100', match: (pack / 10) - need, hint: '1\u00A0kg hat 1000\u00A0g, nicht 100\u00A0g.' },
    ],
    hints: [`Wie oft musst du das Rezept für ${n} Muffins nehmen?`, 'Rechne alles in Gramm.'],
    emoji: '🧁', ab: 3, kmk: ['GM.sachsituationen', 'MS.funktional'],
    praise: 'Du hast das Rezept vervielfacht und alles in Gramm gerechnet.',
  };
}

// ─── Skill ───────────────────────────────────────────────────────────────────

function toExercise(stufe: Stufe, p: Problem): Exercise {
  const decimals = p.decimals ?? 0;
  const valueText = fmt(p.value, decimals && !Number.isInteger(p.value) ? decimals : undefined);
  const ex = build(mehrschrittigSkill, stufe, {
    key: p.key,
    ab: p.ab,
    context: p.context,
    prompt: p.question,
    emoji: p.emoji,
    answer: sentenceAnswer(p.value, p.before, p.after, p.question, decimals ? { decimals } : {}),
    hints: safeHints(p.hints, p.value, 'Zerlege die Aufgabe in kleine Schritte.', decimals || undefined),
    steps: [`Frage: ${p.question}`, ...p.steps, `Antwort: ${answerSentence(p.before, valueText, p.after)}`],
    bugs: numberBugs(p.bugs, p.value, decimals),
    praise: p.praise,
    srText: `${speak(p.context)} ${p.srExtra ?? ''} ${p.question}`.replace(/\s+/g, ' ').trim(),
    kmk: p.kmk,
  });
  if (p.visual) ex.visual = p.visual;
  if (p.ab === 3) ex.knobel = true;
  return ex;
}

export const mehrschrittigSkill: SkillDef = {
  id: 'sachaufgaben.mehrschrittig',
  topicId: 'sachaufgaben',
  title: 'Aufgaben mit mehreren Schritten',
  description: 'Du löst Sachaufgaben Schritt für Schritt.',
  stufen: {
    1: 'Zwei Rechenschritte mit ganzen Zahlen',
    2: 'Zwei Schritte mit Geld, Zeit, Tabellen',
    3: 'Drei Rechenschritte',
  },
  kmk: ['ZO.sachrechnen', 'GM.sachsituationen'],
  generate(rng, stufe) {
    const who = pickPerson(rng);
    let p: Problem;
    if (stufe === 1) {
      const v = rng.int(1, 5);
      p = v === 1 ? hefte(rng, who) : v === 2 ? regale(rng) : v === 3 ? kekse(rng) : v === 4 ? zooFamilie(rng) : basketball(rng, who);
    } else if (stufe === 2) {
      const v = rng.int(1, 4);
      p = v === 1 ? preisliste(rng, who) : v === 2 ? fahrplan(rng, who) : v === 3 ? klassenfahrt(rng, false) : zaun(rng, false);
    } else {
      const v = rng.int(1, 4);
      p = v === 1 ? einkaufRueckgeld(rng, who) : v === 2 ? zaun(rng, true) : v === 3 ? klassenfahrt(rng, true) : rezept(rng);
    }
    return toExercise(stufe, p);
  },
};
