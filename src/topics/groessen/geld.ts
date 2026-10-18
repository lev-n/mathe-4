/**
 * Geld: Scheine und Münzen zählen, Euro ↔ Cent, Komma ↔ gemischte Schreibweise.
 * Stufe 1: count money (≤ 50 €), € ↔ ct up to 20 €.
 * Stufe 2: comma ↔ mixed notation, 4-digit ct amounts, counting unsorted money up to 500 €.
 * Stufe 3: amounts up to 1000 €, equal notations, "Stimmt das?", fewest notes and coins.
 */
import { fmt, fmtMoney, NBSP } from '../../core/format';
import type { Bug, Exercise, Rng, SkillDef, Stufe, Step } from '../../core/types';
import { build, makeChoice, numberBugs, pickPerson, speak } from './helpers';
import { claimItem, commaToMixed, commaToSmall, convExercise, mixedToComma, smallToComma, type ConvItem } from './conversions';

/** All coins and notes in Cent. */
export const DENOMINATIONS = [20000, 10000, 5000, 2000, 1000, 500, 200, 100, 50, 20, 10, 5, 2, 1] as const;

/** '20 €' or '50 ct' */
export function pieceLabel(cents: number): string {
  return cents >= 100 ? `${fmt(cents / 100)}${NBSP}€` : `${cents}${NBSP}ct`;
}

/** Spoken list: '1 Schein zu 20 Euro, 2 Münzen zu 1 Euro'. */
export function describeMoney(items: number[]): string {
  const counts = new Map<number, number>();
  items.forEach((v) => counts.set(v, (counts.get(v) ?? 0) + 1));
  return [...counts.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([v, n]) => {
      const kind = v >= 500 ? (n === 1 ? 'Schein' : 'Scheine') : n === 1 ? 'Münze' : 'Münzen';
      const value = v >= 100 ? `${v / 100} Euro` : `${v} Cent`;
      return `${n} ${kind} zu ${value}`;
    })
    .join(', ');
}

/** Greedy decomposition (optimal for euro denominations). */
export function fewestPieces(cents: number): number[] {
  const out: number[] = [];
  let rest = cents;
  for (const d of DENOMINATIONS) {
    while (rest >= d) {
      out.push(d);
      rest -= d;
    }
  }
  return out;
}

function sumLine(items: number[], unit: '€' | 'ct'): string {
  const parts = items.map((v) => (unit === '€' ? `${fmt(v / 100)}${NBSP}€` : `${v}${NBSP}ct`));
  const total = items.reduce((a, b) => a + b, 0);
  const totalText = unit === '€' ? `${fmt(total / 100)}${NBSP}€` : `${total}${NBSP}ct`;
  return parts.length === 1 ? totalText : `${parts.join(' + ')} = ${totalText}`;
}

/** Extra money bugs for '4,35 € = □ ct'. */
function euroToCentBugs(cents: number): Bug[] {
  const e = Math.floor(cents / 100);
  const c = cents % 100;
  const bugs: Bug[] = [];
  if (c > 0) bugs.push({ id: 'nur-euro', match: e * 100, hint: 'Vergiss die Cent nach dem Komma nicht.' });
  if (e > 0) bugs.push({ id: 'nur-cent', match: c, hint: 'Wandle auch die Euro vor dem Komma um. 1\u00A0€ sind 100\u00A0ct.' });
  if (c > 0 && c < 10) bugs.push({ id: 'null-weg', match: Number(`${e}${c}`), hint: 'Die 0 nach dem Komma ist wichtig. Sie zeigt: keine Zehner-Cent.' });
  if (c > 0 && c % 10 === 0) bugs.push({ id: 'zehner-cent', match: Number(`${e}${c / 10}`), hint: 'Nach dem Komma stehen zwei Stellen. Die erste Stelle sind die Zehner-Cent.' });
  return bugs;
}

/** Cent amount with "interesting" cents: often below 10 or a multiple of 10. */
function centsPart(rng: Rng): number {
  const r = rng.int(1, 3);
  if (r === 1) return rng.int(1, 9);
  if (r === 2) return rng.int(1, 9) * 10;
  return rng.int(11, 99);
}

function conv(skill: SkillDef, stufe: Stufe, item: ConvItem, ab: 1 | 2 | 3, extra: Bug[] = []): Exercise {
  return convExercise(skill, stufe, item, { ab, kmk: ['GM.einheiten'], extra });
}

// ─── Variants ────────────────────────────────────────────────────────────────

function countMoney(skill: SkillDef, stufe: Stufe, rng: Rng): Exercise {
  let items: number[];
  if (stufe === 1) {
    const notes = Array.from({ length: rng.int(0, 2) }, () => rng.pick([500, 1000, 2000]));
    const coins = Array.from({ length: rng.int(2, 4) }, () => rng.pick([200, 100, 50, 20, 10, 5, 2, 1]));
    items = [...notes, ...coins].sort((a, b) => b - a);
  } else {
    const notes = Array.from({ length: rng.int(1, 3) }, () => rng.pick([500, 1000, 2000, 5000, 10000]));
    const coins = Array.from({ length: rng.int(3, 5) }, () => rng.pick([200, 100, 50, 20, 10, 5, 2, 1]));
    items = rng.shuffle([...notes, ...coins]);
  }
  const total = items.reduce((a, b) => a + b, 0);
  const value = total / 100;
  const notes = items.filter((v) => v >= 500).sort((a, b) => b - a);
  const euroCoins = items.filter((v) => v >= 100 && v < 500).sort((a, b) => b - a);
  const centCoins = items.filter((v) => v < 100).sort((a, b) => b - a);
  const centSum = centCoins.reduce((a, b) => a + b, 0);
  const euroSum = total - centSum;

  const steps: Step[] = [];
  if (notes.length) steps.push(`${notes.length === 1 ? 'Schein' : 'Scheine'}: ${sumLine(notes, '€')}`);
  if (euroCoins.length) steps.push(`Euro-Münzen: ${sumLine(euroCoins, '€')}`);
  if (centCoins.length) steps.push(`Cent-Münzen: ${sumLine(centCoins, 'ct')}`);
  steps.push(`Zusammen: ${fmtMoney(total)}`);

  const bugs = numberBugs(
    [
      { id: 'stueck-gezaehlt', match: items.length, hint: 'Du hast die Stücke gezählt. Gefragt ist, wie viel Geld es ist. Addiere die Werte.' },
      centSum > 0 && euroSum > 0 && { id: 'cent-vergessen', match: euroSum / 100, hint: 'Zähle auch die Cent-Münzen dazu.' },
      centSum > 0 && { id: 'cent-als-euro', match: euroSum / 100 + centSum, hint: 'Die kleinen Münzen sind Cent, nicht Euro. 100\u00A0ct sind 1\u00A0€.' },
    ],
    value,
    2,
  );
  const desc = describeMoney(items);
  return build(skill, stufe, {
    key: `zaehlen:${[...items].sort((a, b) => b - a).join('-')}:${stufe === 2 ? items.join('-') : ''}`,
    ab: stufe === 1 ? 1 : 2,
    prompt: 'Wie viel Geld ist das? Schreibe mit Komma.',
    visual: { type: 'money', items },
    answer: { kind: 'number', value, unit: '€', decimals: 2, label: 'Betrag in Euro' },
    hints: [
      'Ordne zuerst: Scheine, dann Euro-Münzen, dann Cent-Münzen.',
      'Zähle die Euro und die Cent getrennt. Schreibe dann mit Komma.',
    ],
    steps,
    bugs,
    praise: stufe >= 2
      ? 'Du hast die Scheine und Münzen erst geordnet und dann gezählt.'
      : centSum > 0 && euroSum > 0
        ? 'Du hast Euro und Cent getrennt gezählt und dann mit Komma geschrieben.'
        : 'Du hast die Werte aller Scheine und Münzen zusammengezählt.',
    srText: `Wie viel Geld ist das? Du siehst: ${desc}. Schreibe den Betrag in Euro mit Komma.`,
    kmk: ['GM.einheiten', 'GM.vorstellung'],
  });
}

function equalNotation(skill: SkillDef, stufe: Stufe, rng: Rng): Exercise {
  const e = rng.int(100, 999);
  const c = rng.chance(0.5) ? rng.int(1, 9) : rng.int(1, 9) * 10;
  const total = e * 100 + c;
  const shown = fmtMoney(total);
  const right = rng.chance(0.5) ? `${e}${NBSP}€ ${c}${NBSP}ct` : `${fmt(total)}${NBSP}ct`;
  const wrongs = [
    c < 10
      ? { label: `${e}${NBSP}€ ${c * 10}${NBSP}ct`, whyWrong: `Bei ${shown} steht direkt nach dem Komma eine 0. Es gibt also keine Zehner-Cent.` }
      : { label: `${e}${NBSP}€ ${c / 10}${NBSP}ct`, whyWrong: `Nach dem Komma stehen zwei Stellen. Die erste Stelle sind die Zehner-Cent.` },
    c < 10
      ? { label: `${fmt(Number(`${e}${c}`))}${NBSP}ct`, whyWrong: `Hier fehlt eine Null. ${e}${NBSP}€ sind schon ${fmt(e * 100)}${NBSP}ct.` }
      : { label: `${fmt(Number(`${e}${c / 10}`))}${NBSP}ct`, whyWrong: `Hier fehlt eine Stelle. ${e}${NBSP}€ sind schon ${fmt(e * 100)}${NBSP}ct.` },
    { label: `${fmt(total * 10)}${NBSP}ct`, whyWrong: 'Das ist zehnmal zu viel. 1\u00A0€ sind 100\u00A0ct, nicht 1000\u00A0ct.' },
    { label: `${fmt(total)}${NBSP}€`, whyWrong: 'Die Zahl stimmt, aber die Einheit nicht: Das wären Euro statt Cent.' },
  ];
  const answer = makeChoice(rng, { label: right }, rng.shuffle(wrongs));
  return build(skill, stufe, {
    key: `gleich:${total}:${right.includes('€ ') ? 'm' : 'c'}`,
    ab: 3,
    prompt: `Welche Angabe ist genauso viel wie ${shown}?`,
    answer,
    hints: ['Zerlege den Betrag: Euro vor dem Komma, Cent nach dem Komma.', 'Denke an: 1\u00A0€ = 100\u00A0ct. Prüfe jede Angabe einzeln.'],
    steps: [`${shown} = ${e}${NBSP}€ ${c}${NBSP}ct`, `${e}${NBSP}€ = ${fmt(e * 100)}${NBSP}ct`, `${shown} = ${fmt(total)}${NBSP}ct`, `Passend ist: ${right}`],
    praise: c < 10 ? 'Du hast auf die Null direkt nach dem Komma geachtet.' : 'Du hast mit 1\u00A0€ = 100\u00A0ct jede Angabe geprüft.',
    srText: `Welche Angabe ist genauso viel wie ${speak(shown)}? Wähle aus: ${answer.options.map((o) => speak(o.label)).join('; ')}.`,
    kmk: ['GM.einheiten', 'PK.darstellen'],
  });
}

function claim(skill: SkillDef, stufe: Stufe, rng: Rng): Exercise {
  const who = pickPerson(rng);
  const e = rng.int(2, 99);
  const kind = rng.int(1, 3);
  let c: ReturnType<typeof claimItem>;
  let key: string;
  if (kind === 1) {
    const ct = rng.int(1, 9);
    key = `claim1:${e}:${ct}`;
    c = claimItem(rng, who.name, {
      lhs: `${e}${NBSP}€ ${ct}${NBSP}ct`,
      right: fmtMoney(e * 100 + ct),
      wrongs: [
        { rhs: `${e},${ct}${NBSP}€`, why: `${e},${ct}${NBSP}€ sind ${e}${NBSP}€ ${ct * 10}${NBSP}ct. Bei weniger als 10\u00A0ct steht nach dem Komma zuerst eine 0.` },
        { rhs: `${fmt(e + ct)}${NBSP}€`, why: 'Euro und Cent darfst du nicht einfach addieren.' },
      ],
    }, rng.chance(0.3));
  } else if (kind === 2) {
    const ct = rng.int(1, 9) * 10;
    key = `claim2:${e}:${ct}`;
    c = claimItem(rng, who.name, {
      lhs: fmtMoney(e * 100 + ct),
      right: `${e}${NBSP}€ ${ct}${NBSP}ct`,
      wrongs: [
        { rhs: `${e}${NBSP}€ ${ct / 10}${NBSP}ct`, why: 'Nach dem Komma stehen zwei Stellen. Die erste Stelle sind die Zehner-Cent.' },
        { rhs: `${fmt(e * 100 + ct)}${NBSP}€`, why: 'Das wären Cent, nicht Euro. Die Einheit passt nicht.' },
      ],
    }, rng.chance(0.3));
  } else {
    const cents = e * 100 + rng.int(1, 99);
    key = `claim3:${cents}`;
    c = claimItem(rng, who.name, {
      lhs: `${fmt(cents)}${NBSP}ct`,
      right: fmtMoney(cents),
      wrongs: [
        { rhs: `${fmt(cents / 10, 1)}${NBSP}€`, why: 'Hier wurde durch 10 geteilt. 1\u00A0€ sind 100\u00A0ct, also muss man durch 100 teilen.' },
        { rhs: `${fmt(cents)}${NBSP}€`, why: 'Die Zahl ist gleich geblieben, aber Euro sind viel mehr wert als Cent.' },
      ],
    }, rng.chance(0.3));
  }
  return build(skill, stufe, {
    key: `${key}:${c.isTrue ? 'w' : 'f'}`,
    ab: 3,
    prompt: c.prompt,
    context: c.context,
    answer: c.answer,
    hints: ['Rechne zuerst selbst. Vergleiche dann.', 'Denke an: 1\u00A0€ = 100\u00A0ct. Nach dem Komma stehen immer zwei Stellen.'],
    steps: c.steps,
    praise: c.isTrue ? 'Du hast selbst nachgerechnet und richtig geprüft.' : 'Du hast den Fehler gefunden und erklärt, was richtig ist.',
    srText: c.srText,
    kmk: ['GM.einheiten', 'PK.argumentieren', 'ZO.kontrolle'],
  });
}

function fewest(skill: SkillDef, stufe: Stufe, rng: Rng): Exercise {
  const cents = rng.int(11, 299) * 100 + (rng.chance(0.8) ? rng.int(1, 99) : 0);
  const pieces = fewestPieces(cents);
  const n = pieces.length;
  const distinct = new Set(pieces).size;
  const euroPieces = pieces.filter((p) => p >= 100).length;
  const bugs = numberBugs(
    [
      { id: 'sorten', match: distinct, hint: 'Manche Scheine oder Münzen brauchst du mehrmals. Zähle jedes Stück.' },
      cents % 100 > 0 && { id: 'nur-euro', match: euroPieces, hint: 'Vergiss die Cent-Münzen nicht.' },
      { id: 'mehr', match: n + 1, hint: 'Geht es noch mit weniger Stücken? Nimm immer den größten Schein oder die größte Münze, die noch passt.' },
    ],
    n,
  );
  const amount = fmtMoney(cents);
  return build(skill, stufe, {
    key: `wenigste:${cents}`,
    ab: 3,
    knobel: true,
    prompt: `Lege ${amount} mit möglichst wenigen Scheinen und Münzen. Wie viele Stücke brauchst du?`,
    answer: { kind: 'number', value: n, unit: 'Stück', label: 'Anzahl der Scheine und Münzen' },
    hints: ['Nimm immer zuerst den größten Schein, der noch passt.', 'Mache mit dem Rest weiter, bis 0\u00A0ct übrig sind. Zähle dann alle Stücke.'],
    steps: [`${amount} = ${pieces.map(pieceLabel).join(' + ')}`, `Das sind ${n} Stücke.`],
    bugs,
    praise: 'Du hast immer den größten passenden Schein genommen.',
    srText: `Lege ${speak(amount)} mit möglichst wenigen Scheinen und Münzen. Es gibt Scheine zu 200, 100, 50, 20, 10 und 5 Euro und Münzen zu 2 und 1 Euro und 50, 20, 10, 5, 2 und 1 Cent. Wie viele Stücke brauchst du?`,
    kmk: ['GM.einheiten', 'PK.problemloesen'],
  });
}

// ─── Skill ───────────────────────────────────────────────────────────────────

export const geldSkill: SkillDef = {
  id: 'groessen.geld',
  topicId: 'groessen',
  title: 'Geld',
  description: 'Du zählst Geld und schreibst Beträge in Euro und Cent.',
  stufen: {
    1: 'Geld zählen, Euro in Cent umwandeln',
    2: 'Komma und Euro-Cent-Schreibweise',
    3: 'Große Beträge, Fehler finden, wenige Münzen',
  },
  kmk: ['GM.einheiten', 'GM.vorstellung'],
  generate(rng, stufe) {
    const skill = geldSkill;
    if (stufe === 1) {
      const v = rng.int(1, 3);
      if (v === 1) return countMoney(skill, stufe, rng);
      const cents = rng.int(1, 19) * 100 + centsPart(rng);
      if (v === 2) return conv(skill, stufe, commaToSmall('€', 'ct', cents / 100, 2), 1, euroToCentBugs(cents));
      return conv(skill, stufe, smallToComma('€', 'ct', cents), 1);
    }
    if (stufe === 2) {
      const v = rng.int(1, 5);
      if (v === 1) return countMoney(skill, stufe, rng);
      if (v === 2) {
        const cents = rng.int(1, 99) * 100 + centsPart(rng);
        return conv(skill, stufe, commaToMixed('€', 'ct', cents / 100, 2), 2);
      }
      if (v === 3) return conv(skill, stufe, mixedToComma('€', 'ct', rng.int(1, 99), centsPart(rng)), 2);
      if (v === 4) return conv(skill, stufe, smallToComma('€', 'ct', rng.int(10, 99) * 100 + centsPart(rng)), 2);
      const cents = rng.int(10, 99) * 100 + centsPart(rng);
      return conv(skill, stufe, commaToSmall('€', 'ct', cents / 100, 2), 2, euroToCentBugs(cents));
    }
    const v = rng.int(1, 4);
    if (v === 1) return equalNotation(skill, stufe, rng);
    if (v === 2) return claim(skill, stufe, rng);
    if (v === 3) return fewest(skill, stufe, rng);
    const cents = rng.int(100, 999) * 100 + centsPart(rng);
    return conv(skill, stufe, commaToSmall('€', 'ct', cents / 100, 2), 2, euroToCentBugs(cents));
  },
};
