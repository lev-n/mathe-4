/**
 * Fahrpläne und Preislisten lesen.
 * Stufe 1: Fahrzeit innerhalb einer Stunde; Preis ablesen oder verdoppeln.
 * Stufe 2: Fahrzeit über die volle Stunde; Einkauf mit mehreren Waren; welchen Bus spätestens?
 * Stufe 3: Daten, die nicht direkt dastehen: nächster Bus nach dem Plan, Wartezeit, Familienkarte, wie viele Kugeln höchstens.
 */
import { fmt, fmtDuration, fmtMoney, fmtTime } from '../../core/format';
import type { Exercise, Rng, SkillDef, Stufe, Visual } from '../../core/types';
import { cap, describeVisual, fixedChoice, makeExercise, numberBugs, shuffledChoice, speech } from './shared';

const SKILL = { id: 'daten.fahrplaene', kmk: ['DZ.daten', 'GM.zeit', 'GM.sachsituationen'] };
const KMK_FAHRPLAN = ['DZ.daten', 'GM.zeit'];
const KMK_PREIS = ['DZ.daten', 'GM.sachsituationen'];

// ─── Fahrplan ────────────────────────────────────────────────────────────────

interface Stop {
  name: string;
  female: boolean;
}

const STOPS: readonly Stop[] = [
  { name: 'Bahnhof', female: false },
  { name: 'Marktplatz', female: false },
  { name: 'Rathaus', female: false },
  { name: 'Schule', female: true },
  { name: 'Schwimmbad', female: false },
  { name: 'Zoo', female: false },
  { name: 'Bücherei', female: true },
  { name: 'Sportplatz', female: false },
  { name: 'Kirche', female: true },
  { name: 'Museum', female: false },
  { name: 'Park', female: false },
  { name: 'Kino', female: false },
];

const von = (s: Stop) => (s.female ? `von der ${s.name}` : `vom ${s.name}`);
const zu = (s: Stop) => (s.female ? `zur ${s.name}` : `zum ${s.name}`);
const an = (s: Stop) => (s.female ? `an der ${s.name}` : `am ${s.name}`);

const PEOPLE: readonly { name: string; pron: string }[] = [
  { name: 'Lea', pron: 'sie' },
  { name: 'Ben', pron: 'er' },
  { name: 'Mila', pron: 'sie' },
  { name: 'Jonas', pron: 'er' },
  { name: 'Aylin', pron: 'sie' },
  { name: 'Emil', pron: 'er' },
];

export interface Plan {
  line: number;
  stops: Stop[];
  /** Minutes after the first stop. */
  offsets: number[];
  /** Departures at the first stop, minutes since midnight. */
  departures: number[];
  interval: number;
}

/** Minutes since midnight → '7:48' (table) or '7:48 Uhr'. */
export const clock = (t: number, uhr = false) => fmtTime(Math.floor(t / 60) % 24, t % 60, uhr);
const hourOf = (t: number) => Math.floor(t / 60);
/** 'sind es 12 Minuten' / 'ist es 1 Minute' */
export const minutesSpan = (m: number) => (m === 1 ? 'ist es 1 Minute' : `sind es ${fmt(m)} Minuten`);
/** The typical error: subtracting times like decimal numbers (8:05 − 7:50 → 805 − 750 = 55). */
export const hundredMinutes = (t1: number, t2: number) => hourOf(t2) * 100 + (t2 % 60) - (hourOf(t1) * 100 + (t1 % 60));

export function timeAt(plan: Plan, bus: number, stop: number): number {
  return plan.departures[bus] + plan.offsets[stop];
}

function makePlan(rng: Rng, nStops: number, firstMinute?: number): Plan {
  const stops = rng.sample(STOPS, nStops);
  const offsets = [0];
  for (let i = 1; i < nStops; i++) offsets.push(offsets[i - 1] + rng.int(3, 9));
  const interval = rng.pick([15, 20, 30]);
  const start = rng.int(6, 16) * 60 + (firstMinute ?? rng.int(0, 59));
  return { line: rng.int(2, 39), stops, offsets, departures: [0, 1, 2].map((k) => start + k * interval), interval };
}

function planTable(plan: Plan): Visual {
  return {
    type: 'table',
    caption: `Fahrplan Bus ${plan.line}`,
    header: ['Haltestelle', ...plan.departures.map((_, k) => `${k + 1}. Bus`)],
    rows: plan.stops.map((s, i) => [s.name, ...plan.departures.map((_, k) => clock(timeAt(plan, k, i)))]),
  };
}

const planKey = (p: Plan) => [p.line, p.stops.map((s) => s.name).join('-'), p.offsets.join('-'), p.departures[0], p.interval].join('_');

interface Trip {
  bus: number;
  from: number;
  to: number;
}

function trips(plan: Plan, crossHour: boolean): Trip[] {
  const out: Trip[] = [];
  plan.departures.forEach((_, bus) => {
    for (let from = 0; from < plan.stops.length; from++) {
      for (let to = from + 1; to < plan.stops.length; to++) {
        const t1 = timeAt(plan, bus, from);
        const t2 = timeAt(plan, bus, to);
        if (t2 - t1 >= 4 && (hourOf(t1) !== hourOf(t2)) === crossHour) out.push({ bus, from, to });
      }
    }
  });
  return out;
}

function travelTime(rng: Rng, stufe: 1 | 2): Exercise {
  const crossHour = stufe === 2;
  let plan = makePlan(rng, stufe === 1 ? 4 : 5);
  let options = trips(plan, crossHour);
  for (let tries = 0; options.length === 0 && tries < 10; tries++) {
    plan = makePlan(rng, stufe === 1 ? 4 : 5);
    options = trips(plan, crossHour);
  }
  if (options.length === 0) {
    // Deterministic fallback: first bus at :00 has a trip within the hour, first bus at :55 crosses the hour.
    plan = makePlan(rng, stufe === 1 ? 4 : 5, crossHour ? 55 : 0);
    options = trips(plan, crossHour);
  }
  const trip = rng.pick(options);
  const A = plan.stops[trip.from];
  const B = plan.stops[trip.to];
  const t1 = timeAt(plan, trip.bus, trip.from);
  const t2 = timeAt(plan, trip.bus, trip.to);
  const d = t2 - t1;
  const visual = planTable(plan);
  const prompt = `Wie viele Minuten fährt der ${trip.bus + 1}. Bus ${von(A)} ${zu(B)}?`;
  const fullHour = (hourOf(t1) + 1) * 60;
  const steps = crossHour
    ? [
        `Abfahrt ${an(A)}: ${clock(t1, true)}. Ankunft ${an(B)}: ${clock(t2, true)}.`,
        `Von ${clock(t1, true)} bis ${clock(fullHour, true)} ${minutesSpan(fullHour - t1)}.`,
        // Arrival exactly at the full hour: nothing left to add after the full hour.
        ...(t2 === fullHour
          ? [`Der Bus fährt ${fmtDuration(d)}.`]
          : [
              `Von ${clock(fullHour, true)} bis ${clock(t2, true)} ${minutesSpan(t2 - fullHour)}.`,
              `${fmt(fullHour - t1)} + ${fmt(t2 - fullHour)} = ${fmt(d)}. Der Bus fährt ${fmtDuration(d)}.`,
            ]),
      ]
    : [
        `Abfahrt ${an(A)}: ${clock(t1, true)}. Ankunft ${an(B)}: ${clock(t2, true)}.`,
        `${fmt(t2 % 60)} − ${fmt(t1 % 60)} = ${fmt(d)}`,
        `Der Bus fährt ${fmtDuration(d)}.`,
      ];
  const neighbours = [trip.to - 1, trip.to + 1].filter((i) => i > trip.from && i < plan.stops.length && i !== trip.to);
  return makeExercise(SKILL, stufe, ['fahrzeit', planKey(plan), trip.bus, trip.from, trip.to], {
    kmk: KMK_FAHRPLAN,
    ab: stufe,
    prompt,
    visual,
    emoji: '🚌',
    answer: { kind: 'number', value: d, unit: 'min', label: 'Fahrzeit in Minuten' },
    hints: [
      `Suche die Zeilen „${A.name}“ und „${B.name}“ in der Spalte „${trip.bus + 1}. Bus“.`,
      crossHour ? (t2 === fullHour ? 'Rechne bis zur vollen Stunde.' : 'Rechne zuerst bis zur vollen Stunde. Rechne dann weiter.') : 'Rechne von der ersten Uhrzeit bis zur zweiten Uhrzeit.',
    ],
    steps,
    bugs: numberBugs(d, [
      crossHour ? ['hundert-minuten', hundredMinutes(t1, t2), 'Eine Stunde hat 60 Minuten, nicht 100. Rechne bis zur vollen Stunde und dann weiter.'] : null,
      crossHour ? ['nur-minuten', Math.abs((t2 % 60) - (t1 % 60)), 'Achte auf die volle Stunde dazwischen. Rechne zuerst bis zur vollen Stunde.'] : null,
      ...neighbours.map((i) => [`haltestelle-${i}`, timeAt(plan, trip.bus, i) - t1, `Prüfe die Zeile: Der Bus soll bis ${zu(B)} fahren.`] as const),
    ]),
    praise: crossHour ? 'Du hast geschickt über die volle Stunde gerechnet.' : 'Du hast die richtigen Zeilen im Fahrplan gefunden.',
    srText: speech(describeVisual(visual), prompt),
  });
}

function latestBus(rng: Rng): Exercise {
  const plan = makePlan(rng, 5);
  const person = rng.pick(PEOPLE);
  const from = rng.int(0, 2);
  const to = rng.int(from + 2, plan.stops.length - 1);
  const A = plan.stops[from];
  const B = plan.stops[to];
  const j = rng.int(0, 1);
  const arrival = (bus: number) => timeAt(plan, bus, to);
  // A 'nice' deadline: the next multiple of 5 at or after the arrival of bus j, before bus j + 1 arrives.
  const nice = Math.ceil(arrival(j) / 5) * 5;
  const deadline = nice < arrival(j + 1) ? nice : arrival(j);
  const visual = planTable(plan);
  const context = `${person.name} steigt ${an(A)} ein. ${person.pron === 'er' ? 'Er' : 'Sie'} will spätestens um ${clock(deadline, true)} ${an(B)} sein.`;
  const prompt = `Welchen Bus muss ${person.name} spätestens nehmen?`;
  const answer = fixedChoice(
    plan.departures.map((_, k) => ({
      label: `${k + 1}. Bus`,
      whyWrong:
        k < j
          ? `Mit dem ${k + 1}. Bus kommt ${person.name} auch pünktlich an. Aber es gibt einen späteren Bus, der auch passt.`
          : `Der ${k + 1}. Bus kommt erst um ${clock(arrival(k), true)} ${an(B)} an. Das ist zu spät.`,
    })),
    j,
    'scale',
  );
  return makeExercise(SKILL, 2, ['spaetestens', planKey(plan), from, to, j, person.name], {
    kmk: KMK_FAHRPLAN,
    ab: 2,
    context,
    prompt,
    visual,
    emoji: '🚌',
    answer,
    hints: [`Schau in die Zeile „${B.name}“. Wann kommt welcher Bus dort an?`, `Welcher Bus kommt als letzter noch vor ${clock(deadline, true)} oder genau um ${clock(deadline, true)} an?`],
    steps: [
      `Ankunft ${an(B)}: ${plan.departures.map((_, k) => `${k + 1}. Bus ${clock(arrival(k), true)}`).join(', ')}.`,
      `Der ${j + 1}. Bus kommt um ${clock(arrival(j), true)} an. Das ist pünktlich. Der nächste Bus ist zu spät.`,
      `${person.name} muss spätestens den ${j + 1}. Bus nehmen.`,
    ],
    praise: 'Du hast in der richtigen Zeile gesucht und die Ankunftszeiten verglichen.',
    srText: speech(describeVisual(visual), context, prompt),
  });
}

function nextBus(rng: Rng): Exercise {
  const plan = makePlan(rng, 4);
  const stop = rng.int(0, plan.stops.length - 1);
  const S = plan.stops[stop];
  const which = rng.pick([4, 5]);
  const last = timeAt(plan, 2, stop);
  const correctT = last + (which - 3) * plan.interval;
  const visual = planTable(plan);
  const context = 'Der Bus fährt den ganzen Tag immer im gleichen Abstand weiter.';
  const prompt = `Wann fährt der ${which}. Bus ${an(S)} ab?`;
  const opt = (t: number, why: string) => ({ label: clock(t, true), whyWrong: why });
  const otherInterval = plan.interval === 20 ? 30 : 20;
  const answer = shuffledChoice(
    rng,
    { label: clock(correctT, true) },
    [
      opt(correctT - plan.interval, which === 4 ? 'Das ist der 3. Bus. Er steht schon im Plan.' : 'Das ist der 4. Bus. Gesucht ist der 5. Bus.'),
      opt(correctT + plan.interval, `Das ist schon der ${which + 1}. Bus. Zähle die Busse noch einmal.`),
      opt(last + (which - 3) * otherInterval, `Prüfe den Abstand zwischen zwei Bussen. Es sind ${fmt(plan.interval)} Minuten.`),
    ],
    4,
  );
  return makeExercise(SKILL, 3, ['naechster', planKey(plan), stop, which], {
    kmk: KMK_FAHRPLAN,
    ab: 3,
    knobel: true,
    context,
    prompt,
    visual,
    emoji: '🚌',
    answer,
    hints: ['Wie viele Minuten liegen zwischen zwei Bussen?', `Rechne von der letzten Zeit in der Zeile „${S.name}“ weiter.`],
    steps: [
      `Die Busse fahren alle ${fmt(plan.interval)} Minuten.`,
      `Der 3. Bus fährt ${an(S)} um ${clock(last, true)}.`,
      ...(which === 5 ? [`Der 4. Bus fährt um ${clock(last + plan.interval, true)}.`] : []),
      `Der ${which}. Bus fährt um ${clock(correctT, true)}.`,
    ],
    praise: 'Du hast den gleichen Abstand erkannt und weitergerechnet.',
    srText: speech(describeVisual(visual), context, prompt),
  });
}

function waiting(rng: Rng): Exercise {
  const plan = makePlan(rng, 4);
  const person = rng.pick(PEOPLE);
  const stop = rng.int(0, plan.stops.length - 1);
  const S = plan.stops[stop];
  const j = rng.int(0, 1);
  const before = timeAt(plan, j, stop);
  const next = timeAt(plan, j + 1, stop);
  const arrive = rng.int(before + 1, next - 2);
  const wait = next - arrive;
  const visual = planTable(plan);
  const context = `${person.name} kommt um ${clock(arrive, true)} ${an(S)} an.`;
  const prompt = `Wie viele Minuten muss ${person.pron} auf den nächsten Bus warten?`;
  const crosses = hourOf(arrive) !== hourOf(next);
  return makeExercise(SKILL, 3, ['warten', planKey(plan), stop, arrive, person.name], {
    kmk: KMK_FAHRPLAN,
    ab: 3,
    context,
    prompt,
    visual,
    emoji: '🚌',
    answer: { kind: 'number', value: wait, unit: 'min', label: 'Wartezeit in Minuten' },
    hints: [`Suche in der Zeile „${S.name}“ den ersten Bus nach ${clock(arrive, true)}.`, crosses ? 'Rechne zuerst bis zur vollen Stunde. Rechne dann weiter.' : 'Rechne von der Ankunft bis zur Abfahrt.'],
    steps: [
      `Der Bus um ${clock(before, true)} ist schon weg.`,
      `Der nächste Bus fährt um ${clock(next, true)}.`,
      `Von ${clock(arrive, true)} bis ${clock(next, true)} sind es ${fmt(wait)} Minuten.`,
      `${person.name} wartet ${fmtDuration(wait)}.`,
    ],
    bugs: numberBugs(wait, [
      ['uebernaechster', wait + plan.interval, 'Nimm den nächsten Bus, nicht den übernächsten.'],
      ['bus-weg', arrive - before, `Dieser Bus ist schon weg. ${cap(person.pron)} muss auf den nächsten Bus warten.`],
      crosses ? ['hundert-minuten', hundredMinutes(arrive, next), 'Eine Stunde hat 60 Minuten, nicht 100. Rechne bis zur vollen Stunde und dann weiter.'] : null,
    ]),
    praise: 'Du hast den passenden Bus gefunden und die Wartezeit berechnet.',
    srText: speech(describeVisual(visual), context, prompt),
  });
}

// ─── Preislisten ─────────────────────────────────────────────────────────────

interface Item {
  name: string;
  /** Nominative with article: 'ein Apfel' */
  one: string;
  /** Accusative with article: 'einen Apfel' */
  acc: string;
  /** Accusative with definite article: 'den Apfel' */
  def: string;
  plural: string;
  prices: number[];
}

const SNACKS: readonly Item[] = [
  { name: 'Brezel', one: 'eine Brezel', acc: 'eine Brezel', def: 'die Brezel', plural: 'Brezeln', prices: [50, 60, 70, 80, 90] },
  { name: 'Apfel', one: 'ein Apfel', acc: 'einen Apfel', def: 'den Apfel', plural: 'Äpfel', prices: [30, 40, 50, 60] },
  { name: 'Käsebrötchen', one: 'ein Käsebrötchen', acc: 'ein Käsebrötchen', def: 'das Käsebrötchen', plural: 'Käsebrötchen', prices: [120, 130, 140, 150, 160] },
  { name: 'Muffin', one: 'ein Muffin', acc: 'einen Muffin', def: 'den Muffin', plural: 'Muffins', prices: [100, 110, 120, 130, 140, 150] },
  { name: 'Becher Kakao', one: 'ein Becher Kakao', acc: 'einen Becher Kakao', def: 'den Becher Kakao', plural: 'Becher Kakao', prices: [80, 90, 100, 110, 120] },
  { name: 'Flasche Wasser', one: 'eine Flasche Wasser', acc: 'eine Flasche Wasser', def: 'die Flasche Wasser', plural: 'Flaschen Wasser', prices: [60, 70, 80, 90, 100] },
  { name: 'Banane', one: 'eine Banane', acc: 'eine Banane', def: 'die Banane', plural: 'Bananen', prices: [30, 40, 50] },
  { name: 'Joghurt', one: 'ein Joghurt', acc: 'einen Joghurt', def: 'den Joghurt', plural: 'Joghurts', prices: [60, 70, 80, 90] },
];

function priceList(rng: Rng, n: number): { items: Item[]; prices: number[]; visual: Visual } {
  const items = rng.sample(SNACKS, n);
  const prices = items.map((it) => rng.pick(it.prices));
  return {
    items,
    prices,
    visual: { type: 'table', caption: 'Preisliste Pausenverkauf', header: ['Ware', 'Preis'], rows: items.map((it, i) => [it.name, fmtMoney(prices[i])]) },
  };
}

const euro = (cents: number) => cents / 100;
const MONEY = { kind: 'number', decimals: 2, unit: '€' } as const;

function readPrice(rng: Rng): Exercise {
  const { items, prices, visual } = priceList(rng, rng.int(4, 5));
  const t = rng.int(0, items.length - 1);
  const it = items[t];
  const q = rng.pick([1, 2, 2, 3]);
  const cents = q * prices[t];
  const prompt = q === 1 ? `Was kostet ${it.one}?` : `Was kosten ${q} ${it.plural}?`;
  const neighbours = [t - 1, t + 1].filter((i) => i >= 0 && i < items.length);
  return makeExercise(SKILL, 1, ['preis', items.map((x) => x.name).join('-'), prices.join('-'), t, q], {
    kmk: KMK_PREIS,
    ab: 1,
    prompt,
    visual,
    emoji: '🥨',
    answer: { ...MONEY, value: euro(cents), label: 'Preis in Euro' },
    hints: [`Suche die Zeile „${it.name}“ in der Preisliste.`, q === 1 ? 'Lies den Preis in derselben Zeile ab.' : `Du brauchst den Preis ${q}-mal.`],
    steps:
      q === 1
        ? [`In der Zeile „${it.name}“ steht ${fmtMoney(prices[t])}.`, `${cap(it.one)} kostet ${fmtMoney(cents)}.`]
        : [`${cap(it.one)} kostet ${fmtMoney(prices[t])}.`, `${q} · ${fmtMoney(prices[t])} = ${fmtMoney(cents)}`, `${q} ${it.plural} kosten ${fmtMoney(cents)}.`],
    bugs: numberBugs(
      euro(cents),
      [
        q > 1 ? ['einmal', euro(prices[t]), `Das ist der Preis für ${it.one}. Gefragt sind ${q} ${it.plural}.`] : null,
        ...neighbours.map((i) => [`zeile-${i}`, euro(q * prices[i]), `Prüfe die Zeile: Gesucht ist „${it.name}“.`] as const),
      ],
      true,
    ),
    praise: q === 1 ? 'Du hast in der richtigen Zeile abgelesen.' : 'Du hast den Preis richtig vervielfacht.',
    srText: speech(describeVisual(visual), prompt),
  });
}

function shopping(rng: Rng): Exercise {
  const { items, prices, visual } = priceList(rng, 5);
  const [a, b] = rng.sample([0, 1, 2, 3, 4], 2);
  const q = rng.int(2, 3);
  const person = rng.pick(PEOPLE);
  const total = q * prices[a] + prices[b];
  const prompt = `${person.name} kauft ${q} ${items[a].plural} und ${items[b].acc}. Wie viel muss ${person.pron} bezahlen?`;
  return makeExercise(SKILL, 2, ['einkauf', items.map((x) => x.name).join('-'), prices.join('-'), a, b, q, person.name], {
    kmk: KMK_PREIS,
    ab: 2,
    prompt,
    visual,
    emoji: '🥨',
    answer: { ...MONEY, value: euro(total), label: 'Preis in Euro' },
    hints: ['Suche beide Preise in der Preisliste.', `Rechne zuerst den Preis für ${q} ${items[a].plural}. Addiere dann den zweiten Preis.`],
    steps: [
      `${q} ${items[a].plural}: ${q} · ${fmtMoney(prices[a])} = ${fmtMoney(q * prices[a])}`,
      `Dazu ${items[b].acc}: ${fmtMoney(q * prices[a])} + ${fmtMoney(prices[b])} = ${fmtMoney(total)}`,
      `${person.name} bezahlt ${fmtMoney(total)}.`,
    ],
    bugs: numberBugs(
      euro(total),
      [
        ['menge-vergessen', euro(prices[a] + prices[b]), `${person.name} kauft ${q} ${items[a].plural}. Nimm diesen Preis ${q}-mal.`],
        ['zweites-vergessen', euro(q * prices[a]), `Vergiss ${items[b].def} nicht.`],
        ['alles-mal', euro(q * (prices[a] + prices[b])), `Nur von „${items[a].name}“ kauft ${person.name} ${q} Stück.`],
      ],
      true,
    ),
    praise: 'Du hast an die Menge gedacht und alle Preise addiert.',
    srText: speech(describeVisual(visual), prompt),
  });
}

function familyTicket(rng: Rng): Exercise {
  const child = rng.pick([200, 250, 300, 350]);
  const adult = rng.pick([400, 450, 500, 550, 600]);
  const saving = rng.pick([100, 150, 200, 250, 300]);
  const single = 2 * adult + 2 * child;
  const family = single - saving;
  const name = rng.pick(['Yilmaz', 'Weber', 'Nowak', 'Schmidt', 'Krüger']);
  const visual: Visual = {
    type: 'table',
    caption: 'Eintritt Schwimmbad',
    header: ['Karte', 'Preis'],
    rows: [
      ['Kind', fmtMoney(child)],
      ['Erwachsene Person', fmtMoney(adult)],
      ['Familienkarte (2 Erwachsene und 2 Kinder)', fmtMoney(family)],
    ],
  };
  const context = `Familie ${name} geht ins Schwimmbad: 2 Erwachsene und 2 Kinder.`;
  const prompt = 'Wie viel Geld spart die Familie mit der Familienkarte?';
  return makeExercise(SKILL, 3, ['familie', child, adult, saving, name], {
    kmk: KMK_PREIS,
    ab: 3,
    knobel: true,
    context,
    prompt,
    visual,
    emoji: '🏊',
    answer: { ...MONEY, value: euro(saving), label: 'Ersparnis in Euro' },
    hints: ['Rechne zuerst aus, was 4 einzelne Karten kosten.', 'Vergleiche dann mit dem Preis der Familienkarte.'],
    steps: [
      `Einzelkarten: 2 · ${fmtMoney(adult)} + 2 · ${fmtMoney(child)} = ${fmtMoney(2 * adult)} + ${fmtMoney(2 * child)} = ${fmtMoney(single)}`,
      `Familienkarte: ${fmtMoney(family)}`,
      `${fmtMoney(single)} − ${fmtMoney(family)} = ${fmtMoney(saving)}`,
      `Die Familie spart ${fmtMoney(saving)}.`,
    ],
    bugs: numberBugs(
      euro(saving),
      [
        ['einzelpreis', euro(single), 'So viel kosten die Einzelkarten. Vergleiche mit der Familienkarte.'],
        ['je-einer', euro(family - adult - child), 'Es sind 2 Erwachsene und 2 Kinder. Rechne jede Karte doppelt.'],
        ['familienkarte', euro(family), 'Das kostet die Familienkarte. Gefragt ist, wie viel die Familie spart.'],
      ],
      true,
    ),
    praise: 'Du hast beide Möglichkeiten ausgerechnet und verglichen.',
    srText: speech(describeVisual(visual), context, prompt),
  });
}

function iceCream(rng: Rng): Exercise {
  const scoop = rng.pick([90, 110, 120, 130, 140, 150, 160]);
  let budget = rng.pick([500, 600, 700, 800, 1000]);
  if (budget % scoop === 0) budget += 50;
  const cream = rng.pick([40, 50, 60]);
  const sprinkles = rng.pick([20, 30]);
  const max = Math.floor(budget / scoop);
  const rest = budget - max * scoop;
  const person = rng.pick(PEOPLE);
  const visual: Visual = {
    type: 'table',
    caption: 'Preisliste Eiscafé',
    header: ['Ware', 'Preis'],
    rows: [
      ['Kugel Eis', fmtMoney(scoop)],
      ['Sahne', fmtMoney(cream)],
      ['Streusel', fmtMoney(sprinkles)],
    ],
  };
  const context = `${person.name} hat ${fmtMoney(budget)}. ${cap(person.pron)} kauft nur Kugeln Eis.`;
  const prompt = `Wie viele Kugeln kann ${person.pron} höchstens kaufen?`;
  return makeExercise(SKILL, 3, ['eis', scoop, budget, cream, sprinkles, person.name], {
    kmk: KMK_PREIS,
    ab: 3,
    knobel: true,
    context,
    prompt,
    visual,
    emoji: '🍦',
    answer: { kind: 'number', value: max, unit: 'Kugeln', label: 'Anzahl der Kugeln' },
    hints: ['Du brauchst nur den Preis für eine Kugel.', `Wie viele Kugeln passen in ${fmtMoney(budget)}? Probiere: 1 Kugel, 2 Kugeln, …`],
    steps: [
      `Eine Kugel kostet ${fmtMoney(scoop)}.`,
      `${fmt(max)} · ${fmtMoney(scoop)} = ${fmtMoney(max * scoop)}. Das reicht.`,
      `${fmt(max + 1)} · ${fmtMoney(scoop)} = ${fmtMoney((max + 1) * scoop)}. Das ist zu viel.`,
      `${cap(person.pron)} kann höchstens ${fmt(max)} Kugeln kaufen. Es bleiben ${fmtMoney(rest)} übrig.`,
    ],
    bugs: numberBugs(max, [
      ['aufgerundet', max + 1, `Prüfe: ${fmt(max + 1)} Kugeln kosten mehr als ${fmtMoney(budget)}.`],
      ['euro-als-anzahl', budget / 100, 'Das ist der Geldbetrag in Euro. Teile ihn durch den Preis einer Kugel.'],
    ]),
    praise: 'Du hast geprüft, wie weit das Geld reicht.',
    srText: speech(describeVisual(visual), context, prompt),
  });
}

function generate(rng: Rng, stufe: Stufe): Exercise {
  if (stufe === 1) return rng.chance(0.5) ? travelTime(rng, 1) : readPrice(rng);
  if (stufe === 2) {
    const roll = rng.next();
    if (roll < 0.4) return travelTime(rng, 2);
    if (roll < 0.7) return shopping(rng);
    return latestBus(rng);
  }
  const roll = rng.next();
  if (roll < 0.25) return nextBus(rng);
  if (roll < 0.5) return waiting(rng);
  if (roll < 0.75) return familyTicket(rng);
  return iceCream(rng);
}

export const fahrplaeneSkill: SkillDef = {
  id: SKILL.id,
  topicId: 'daten',
  title: 'Fahrpläne und Preislisten',
  description: 'Du liest Fahrpläne und Preislisten und rechnest mit Zeiten und Preisen.',
  stufen: {
    1: 'Fahrzeit in einer Stunde, Preise ablesen',
    2: 'Fahrzeit über die volle Stunde, Einkaufen',
    3: 'Nächster Bus, Wartezeit, günstig einkaufen',
  },
  kmk: SKILL.kmk,
  generate,
};
