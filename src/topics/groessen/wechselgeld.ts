/**
 * Wechselgeld: Rückgeld durch Ergänzen bestimmen.
 * Stufe 1: prices in 10-ct steps, pay with 5/10/20 €.
 * Stufe 2: any cents, pay with 20/50/100 €, sometimes two items.
 * Stufe 3: Einkaufszettel with 3 items, backwards (Preis gesucht), "Wie viel fehlt?".
 */
import { fmtMoney } from '../../core/format';
import type { Bug, Exercise, Rng, SkillDef, Stufe, Step } from '../../core/types';
import { build, joinList, numberBugs, pickPerson, Pron, safeHints, speak, type Person } from './helpers';

interface Ware {
  name: string;
  /** Article + name for sentences: 'ein Heft' */
  text: string;
  /** Whole euros (min, max). */
  min: number;
  max: number;
  shop: string;
}

const SCHREIB = 'im Schreibwarenladen';
const SPIEL = 'im Spielwarenladen';
const MARKT = 'auf dem Markt';
const LADEN = 'im Supermarkt';

const WAREN: readonly Ware[] = [
  { name: 'Heft', text: 'ein Heft', min: 0, max: 2, shop: SCHREIB },
  { name: 'Füller', text: 'einen Füller', min: 5, max: 14, shop: SCHREIB },
  { name: 'Malkasten', text: 'einen Malkasten', min: 4, max: 12, shop: SCHREIB },
  { name: 'Klebestift', text: 'einen Klebestift', min: 1, max: 2, shop: SCHREIB },
  { name: 'Buch', text: 'ein Buch', min: 6, max: 16, shop: 'in der Buchhandlung' },
  { name: 'Comic', text: 'einen Comic', min: 3, max: 7, shop: 'in der Buchhandlung' },
  { name: 'Ball', text: 'einen Ball', min: 6, max: 19, shop: SPIEL },
  { name: 'Puzzle', text: 'ein Puzzle', min: 5, max: 14, shop: SPIEL },
  { name: 'Kartenspiel', text: 'ein Kartenspiel', min: 2, max: 9, shop: SPIEL },
  { name: 'Springseil', text: 'ein Springseil', min: 3, max: 9, shop: SPIEL },
  { name: 'Brot', text: 'ein Brot', min: 1, max: 4, shop: 'in der Bäckerei' },
  { name: 'Kuchen', text: 'einen Kuchen', min: 6, max: 14, shop: 'in der Bäckerei' },
  { name: 'Käse', text: 'ein Stück Käse', min: 1, max: 5, shop: MARKT },
  { name: 'Honig', text: 'ein Glas Honig', min: 2, max: 6, shop: MARKT },
  { name: 'Äpfel', text: 'eine Tüte Äpfel', min: 1, max: 4, shop: MARKT },
  { name: 'Blumen', text: 'einen Blumenstrauß', min: 4, max: 14, shop: MARKT },
  { name: 'Saft', text: 'eine Flasche Saft', min: 0, max: 2, shop: LADEN },
  { name: 'Müsli', text: 'eine Packung Müsli', min: 1, max: 4, shop: LADEN },
  { name: 'Pflanze', text: 'eine Pflanze', min: 2, max: 8, shop: 'in der Gärtnerei' },
];

/** Cent endings that look like real prices. */
const CENTS_ANY = [9, 19, 25, 29, 35, 39, 45, 49, 55, 59, 65, 69, 75, 79, 85, 89, 95, 99];
const CENTS_10 = [10, 20, 30, 40, 50, 60, 70, 80, 90];

function noteText(euro: number): string {
  return `einem ${euro}-€-Schein`;
}

/** Ergänzen in Schritten: price → next 10 ct → next € → next 10 € → paid. */
export function changeSteps(price: number, paid: number): Step[] {
  const steps: Step[] = [];
  let at = price;
  const hops: number[] = [];
  const go = (target: number) => {
    if (target > at && target <= paid) {
      steps.push(`${fmtMoney(at)} + ${fmtMoney(target - at)} = ${fmtMoney(target)}`);
      hops.push(target - at);
      at = target;
    }
  };
  go(Math.ceil(at / 10) * 10);
  go(Math.ceil(at / 100) * 100);
  go(Math.ceil(at / 1000) * 1000);
  go(paid);
  const total = paid - price;
  steps.push(hops.length > 1 ? `Rückgeld: ${hops.map(fmtMoney).join(' + ')} = ${fmtMoney(total)}` : `Rückgeld: ${fmtMoney(total)}`);
  return steps;
}

/** Typical wrong change amounts (in ct) for paying `paid` for `price`. */
export function changeBugs(price: number, paid: number): (Bug | false)[] {
  const change = paid - price;
  const c = price % 100;
  return [
    c > 0 && { id: 'euro-nicht-entbuendelt', match: (change + 100) / 100, hint: 'Für die Cent hast du schon einen Euro angebrochen. Ziehe ihn bei den Euro ab.' },
    c % 10 !== 0 && { id: 'ziffern-zu-10', match: (change + 10) / 100, hint: 'Prüfe die Cent: Ergänze zuerst bis zum nächsten Zehner, dann bis zum vollen Euro.' },
    { id: 'addiert', match: (paid + price) / 100, hint: 'Beim Rückgeld bekommst du einen Teil deines Geldes zurück. Es muss weniger sein als der Schein.' },
  ];
}

/** A realistic price in Cent: whole euros from the item's range plus a typical cent ending. */
function priceIn(rng: Rng, w: Ware, tens: boolean): number {
  return rng.int(w.min, w.max) * 100 + rng.pick(tens ? CENTS_10 : CENTS_ANY);
}

function simple(skill: SkillDef, stufe: 1 | 2, rng: Rng): Exercise {
  const who = pickPerson(rng);
  let items: { w: Ware; price: number }[];
  if (stufe === 1) {
    const w = rng.pick(WAREN.filter((x) => x.max <= 14));
    items = [{ w, price: priceIn(rng, w, true) }];
  } else {
    const first = rng.pick(WAREN);
    const two = rng.chance(0.4);
    const partners = WAREN.filter((x) => x.shop === first.shop && x !== first);
    const second = two && partners.length > 0 ? rng.pick(partners) : undefined;
    items = [first, ...(second ? [second] : [])].map((w) => ({ w, price: priceIn(rng, w, false) }));
  }
  const price = items.reduce((a, b) => a + b.price, 0);
  const notes = stufe === 1 ? [500, 1000, 2000] : [2000, 5000, 10000];
  const paid = notes.find((n) => n > price) ?? 10000;
  const change = paid - price;
  const shop = items[0].w.shop;
  const bought = joinList(items.map((i) => `${i.w.text} für ${fmtMoney(i.price)}`));
  const context = `${who.name} kauft ${shop} ${bought}. ${Pron(who)} bezahlt mit ${noteText(paid / 100)}.`;
  const steps: Step[] = [];
  if (items.length > 1) steps.push(`Preis zusammen: ${items.map((i) => fmtMoney(i.price)).join(' + ')} = ${fmtMoney(price)}`);
  steps.push(...changeSteps(price, paid));
  const extra: (Bug | false)[] = items.length > 1
    ? items.map((i, k) => ({ id: `nur-ware-${k}`, match: (paid - i.price) / 100, hint: `${who.name} kauft zwei Sachen. Addiere zuerst beide Preise.` }))
    : [];
  const value = change / 100;
  return build(skill, stufe, {
    key: `rueck:${items.map((i) => `${i.w.name}-${i.price}`).join('+')}:${paid}`,
    ab: stufe === 1 ? 1 : 2,
    context,
    prompt: `Wie viel Rückgeld bekommt ${who.name}?`,
    emoji: '🛒',
    answer: { kind: 'number', value, decimals: 2, before: `${who.name} bekommt`, after: `€ zurück.`, label: 'Rückgeld in Euro' },
    hints: safeHints(
      [
        items.length > 1 ? 'Addiere zuerst die Preise.' : 'Ergänze vom Preis bis zum Schein.',
        'Gehe in Schritten: erst bis zum nächsten vollen Euro, dann bis zum Schein.',
      ],
      value,
      'Ergänze in kleinen Schritten.',
      2,
    ),
    steps,
    bugs: numberBugs([...extra, ...changeBugs(price, paid)], value, 2),
    praise: items.length > 1
      ? 'Du hast erst die Preise addiert und dann bis zum Schein ergänzt.'
      : price % 100 > 0
        ? 'Du hast in Schritten ergänzt: erst bis zum vollen Euro, dann bis zum Schein.'
        : 'Du hast vom Preis aus bis zum Schein ergänzt.',
    srText: `${speak(context)} Wie viel Rückgeld bekommt ${who.name}? Antworte in Euro.`,
    kmk: ['GM.sachsituationen', 'GM.einheiten'],
  });
}

function shoppingList(skill: SkillDef, stufe: Stufe, rng: Rng, who: Person): Exercise {
  const items = rng.sample(WAREN.filter((w) => w.max <= 9), 3).map((w) => ({ w, price: priceIn(rng, w, false) }));
  const price = items.reduce((a, b) => a + b.price, 0);
  const paid = [1000, 2000, 5000].find((n) => n > price) ?? 5000;
  const change = paid - price;
  const value = change / 100;
  const context = `${who.name} kauft alles auf dem Einkaufszettel. ${Pron(who)} bezahlt mit ${noteText(paid / 100)}.`;
  return build(skill, stufe, {
    key: `zettel:${items.map((i) => `${i.w.name}-${i.price}`).join('+')}:${paid}`,
    ab: 3,
    context,
    prompt: `Wie viel Geld bekommt ${who.name} zurück?`,
    emoji: '📝',
    visual: { type: 'table', caption: 'Einkaufszettel', header: ['Ware', 'Preis'], rows: items.map((i) => [i.w.name, fmtMoney(i.price)]) },
    answer: { kind: 'number', value, decimals: 2, before: `${who.name} bekommt`, after: '€ zurück.', label: 'Rückgeld in Euro' },
    hints: safeHints(['Rechne zuerst aus, wie viel alles zusammen kostet.', 'Ergänze dann vom Gesamtpreis bis zum Schein.'], value, 'Rechne in zwei Schritten.', 2),
    steps: [`Zusammen: ${items.map((i) => fmtMoney(i.price)).join(' + ')} = ${fmtMoney(price)}`, ...changeSteps(price, paid)],
    bugs: numberBugs(
      [
        { id: 'nur-summe', match: price / 100, hint: 'Das ist der Preis für alles. Gefragt ist das Rückgeld.' },
        ...items.map((i, k) => ({ id: `ware-vergessen-${k}`, match: (change + i.price) / 100, hint: 'Prüfe, ob du alle drei Preise addiert hast.' })),
        ...changeBugs(price, paid),
      ],
      value,
      2,
    ),
    praise: 'Du hast erst alle Preise addiert und dann bis zum Schein ergänzt.',
    srText: `${speak(context)} Auf dem Einkaufszettel stehen: ${items.map((i) => `${i.w.name} für ${speak(fmtMoney(i.price))}`).join(', ')}. Wie viel Geld bekommt ${who.name} zurück?`,
    kmk: ['GM.sachsituationen', 'ZO.sachrechnen'],
  });
}

function backwards(skill: SkillDef, stufe: Stufe, rng: Rng, who: Person): Exercise {
  const paid = rng.pick([1000, 2000, 5000]);
  const price = rng.int(Math.round(paid * 0.3), paid - 101);
  const change = paid - price;
  const value = price / 100;
  const context = `${who.name} bezahlt mit ${noteText(paid / 100)}. ${Pron(who)} bekommt ${fmtMoney(change)} zurück.`;
  return build(skill, stufe, {
    key: `rueckwaerts:${paid}:${price}`,
    ab: 3,
    knobel: true,
    context,
    prompt: `Wie viel hat der Einkauf gekostet?`,
    emoji: '🧾',
    answer: { kind: 'number', value, decimals: 2, before: 'Der Einkauf hat', after: '€ gekostet.', label: 'Preis in Euro' },
    hints: safeHints(
      ['Rückgeld und Preis ergeben zusammen den Schein.', 'Rechne rückwärts: Ziehe das Rückgeld vom Schein ab.'],
      value,
      'Rechne rückwärts.',
      2,
    ),
    steps: [`Preis + ${fmtMoney(change)} = ${fmtMoney(paid)}`, `${fmtMoney(paid)} − ${fmtMoney(change)} = ${fmtMoney(price)}`],
    bugs: numberBugs(
      [
        { id: 'addiert', match: (paid + change) / 100, hint: 'Der Einkauf kostet weniger als der Schein. Ziehe das Rückgeld ab.' },
        { id: 'rueckgeld', match: change / 100, hint: 'Das ist das Rückgeld. Gefragt ist der Preis.' },
        change % 100 > 0 && { id: 'euro-nicht-entbuendelt', match: (price + 100) / 100, hint: 'Für die Cent musst du einen Euro entbündeln. Ziehe ihn bei den Euro ab.' },
      ],
      value,
      2,
    ),
    praise: 'Du hast rückwärts gerechnet und den Preis gefunden.',
    srText: `${speak(context)} Wie viel hat der Einkauf gekostet?`,
    kmk: ['GM.sachsituationen', 'PK.problemloesen'],
  });
}

function missing(skill: SkillDef, stufe: Stufe, rng: Rng, who: Person): Exercise {
  const w = rng.pick(WAREN.filter((x) => x.min >= 3));
  const price = priceIn(rng, w, false);
  const have = rng.int(Math.round(price * 0.4), price - 11);
  const diff = price - have;
  const value = diff / 100;
  const context = `${who.name} möchte ${w.text} für ${fmtMoney(price)} kaufen. ${Pron(who)} hat ${fmtMoney(have)} gespart.`;
  return build(skill, stufe, {
    key: `fehlt:${w.name}:${price}:${have}`,
    ab: 2,
    context,
    prompt: `Wie viel Geld fehlt ${who.p === 'sie' ? 'ihr' : 'ihm'} noch?`,
    emoji: '🐷',
    answer: { kind: 'number', value, decimals: 2, before: 'Es fehlen noch', after: '€.', label: 'Fehlender Betrag in Euro' },
    hints: safeHints(['Ergänze vom gesparten Geld bis zum Preis.', 'Gehe in Schritten: erst bis zum vollen Euro, dann weiter.'], value, 'Ergänze in Schritten.', 2),
    steps: [`${fmtMoney(have)} + □ = ${fmtMoney(price)}`, `${fmtMoney(price)} − ${fmtMoney(have)} = ${fmtMoney(diff)}`],
    bugs: numberBugs(
      [
        { id: 'addiert', match: (price + have) / 100, hint: `${who.name} hat schon etwas gespart. Es fehlt weniger als der ganze Preis.` },
        have % 100 > price % 100 && { id: 'euro-nicht-entbuendelt', match: (diff + 100) / 100, hint: 'Beim Ergänzen der Cent brauchst du einen Euro. Ziehe ihn bei den Euro ab.' },
        (have % 10 !== price % 10) && { id: 'kleiner-von-groesser', match: (Math.abs(Math.floor(price / 100) - Math.floor(have / 100)) * 100 + Math.abs((price % 100) - (have % 100))) / 100, hint: 'Rechne die Cent nicht einfach umgekehrt. Ergänze lieber in Schritten bis zum Preis.' },
      ],
      value,
      2,
    ),
    praise: 'Du hast vom gesparten Geld bis zum Preis ergänzt.',
    srText: `${speak(context)} Wie viel Geld fehlt noch?`,
    kmk: ['GM.sachsituationen', 'GM.einheiten'],
  });
}

export const wechselgeldSkill: SkillDef = {
  id: 'groessen.wechselgeld',
  topicId: 'groessen',
  title: 'Wechselgeld',
  description: 'Du rechnest aus, wie viel Geld du zurückbekommst.',
  stufen: {
    1: 'Rückgeld bei Preisen in 10-Cent-Schritten',
    2: 'Rückgeld mit allen Cent-Beträgen',
    3: 'Einkaufszettel, Preis gesucht, fehlendes Geld',
  },
  kmk: ['GM.sachsituationen', 'GM.einheiten'],
  generate(rng, stufe) {
    if (stufe === 1) return simple(wechselgeldSkill, 1, rng);
    if (stufe === 2) return rng.chance(0.75) ? simple(wechselgeldSkill, 2, rng) : missing(wechselgeldSkill, 2, rng, pickPerson(rng));
    const who = pickPerson(rng);
    const v = rng.int(1, 3);
    if (v === 1) return shoppingList(wechselgeldSkill, 3, rng, who);
    if (v === 2) return backwards(wechselgeldSkill, 3, rng, who);
    return missing(wechselgeldSkill, 3, rng, who);
  },
};
