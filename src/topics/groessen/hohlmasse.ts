/**
 * Hohlmaße: ml und l, ½ l, ¼ l, ¾ l.
 * Stufe 1: 2 l = 2000 ml and back, read a Messbecher.
 * Stufe 2: ½ ¼ ¾ l, mixed notation, how many glasses from a bottle.
 * Stufe 3: l with 3 decimals, "Stimmt das?", multi-step (Flasche und Gläser).
 */
import { fmt, NBSP, TIMES } from '../../core/format';
import type { Exercise, Rng, SkillDef, Stufe } from '../../core/types';
import { build, numberBugs, pickPerson, Pron, safeHints, speak } from './helpers';
import {
  claimItem, commaToSmall, convDown, convExercise, convUp, mixed, mixedToSmall, q, smallToComma, smallToMixed, type ConvItem,
} from './conversions';

const LIQUIDS = ['Wasser', 'Saft', 'Milch', 'Tee', 'Kakao', 'Apfelschorle'];

function conv(stufe: Stufe, item: ConvItem, ab: 1 | 2 | 3): Exercise {
  return convExercise(hohlmasseSkill, stufe, item, { ab, kmk: ['GM.einheiten'] });
}

/** Every k-th tick of the Messbecher is labelled (the same rule as ContainerVisual.labelEvery; checked in a test). */
export function cupLabelEvery(capacity: number, step: number): number {
  const ticks = Math.round(capacity / step);
  for (const k of [1, 2, 4, 5, 10, 20, 25, 50, 100]) {
    if (ticks / k <= 10 && Math.round(ticks) % k === 0) return k;
  }
  return Math.ceil(ticks / 10);
}

/** How a child reads the Messbecher: from the last labelled number below the surface, count the ticks above it. */
export function cupReading(capacityMl: number, stepMl: number, fillMl: number, liquid: string): { where: string; steps: string[] } {
  const ls = cupLabelEvery(capacityMl, stepMl) * stepMl;
  const last = Math.floor(fillMl / ls) * ls;
  const after = (fillMl - last) / stepMl;
  const strich = after === 1 ? 'Strich' : 'Striche';
  const first = `Ein Strich bedeutet ${q(stepMl, 'ml')}.`;
  if (after === 0) return { where: `${liquid} reicht genau bis zur Zahl ${fmt(last)}.`, steps: [first, `${liquid} reicht genau bis ${q(fillMl, 'ml')}.`] };
  const count = `${after} ${TIMES} ${q(stepMl, 'ml')} = ${q(after * stepMl, 'ml')}`;
  if (last === 0) return { where: `${liquid} reicht ${after} ${strich} über den Boden.`, steps: [first, `${liquid} reicht ${after} ${strich} hoch: ${count}`] };
  return {
    where: `${liquid} reicht ${after} ${strich} über die Zahl ${fmt(last)}.`,
    steps: [
      first,
      `Unter der Oberfläche steht die Zahl ${fmt(last)}. Darüber kommen noch ${after} ${strich}: ${count}`,
      `${q(last, 'ml')} + ${q(after * stepMl, 'ml')} = ${q(fillMl, 'ml')}`,
    ],
  };
}

function cup(stufe: Stufe, rng: Rng): Exercise {
  const capacityMl = stufe === 1 ? rng.pick([500, 1000]) : rng.pick([1000, 2000]);
  const stepMl = capacityMl === 500 ? rng.pick([50, 100]) : capacityMl === 1000 ? rng.pick([100, 250, 50]) : rng.pick([100, 250]);
  const ticks = rng.int(1, capacityMl / stepMl - 1);
  const fillMl = ticks * stepMl;
  const liquid = rng.pick(LIQUIDS);
  const reading = cupReading(capacityMl, stepMl, fillMl, liquid);
  const sr = `Ein Messbecher bis ${fmt(capacityMl)} Milliliter. Ein Strich bedeutet ${stepMl} Milliliter. ${reading.where}`;
  return build(hohlmasseSkill, stufe, {
    key: `becher:${capacityMl}:${stepMl}:${fillMl}`,
    ab: stufe === 1 ? 1 : 2,
    prompt: `Wie viel ${liquid} ist im Messbecher?`,
    visual: { type: 'container', capacityMl, fillMl, stepMl },
    answer: { kind: 'number', value: fillMl, unit: 'ml', label: 'Menge in Millilitern' },
    hints: safeHints(['Schau, wie viel ein Strich bedeutet.', 'Lies genau auf Höhe der Oberfläche ab. Zähle ab der Zahl darunter weiter.'], fillMl, 'Zähle die Striche ab der Zahl unter der Oberfläche.'),
    steps: reading.steps,
    bugs: numberBugs(
      [
        { id: 'striche-gezaehlt', match: ticks, hint: 'Du hast die Striche gezählt. Gefragt sind Milliliter. Wie viel bedeutet ein Strich?' },
        stepMl !== 100 && { id: 'strich-100', match: ticks * 100, hint: `Ein Strich bedeutet hier nicht 100\u00A0ml. Prüfe die Zahlen an der Skala.` },
        { id: 'strich-zu-viel', match: fillMl + stepMl, hint: 'Zähle die Striche noch einmal bis zur Oberfläche.' },
      ],
      fillMl,
    ),
    praise: 'Du hast herausgefunden, wie viel ein Strich bedeutet.',
    srText: `Wie viel ${liquid} ist im Messbecher? ${sr} Antworte in Millilitern.`,
    kmk: ['GM.einheiten', 'GM.vorstellung'],
  });
}

const FRACTIONS: readonly { text: string; ml: number }[] = [
  { text: '½', ml: 500 }, { text: '¼', ml: 250 }, { text: '¾', ml: 750 },
  { text: '1 ½', ml: 1500 }, { text: '2 ½', ml: 2500 }, { text: '1 ¼', ml: 1250 }, { text: '1 ¾', ml: 1750 }, { text: '3 ½', ml: 3500 },
];

function fraction(stufe: Stufe, rng: Rng): Exercise {
  const fr = rng.pick(FRACTIONS);
  const whole = Math.floor(fr.ml / 1000);
  const part = fr.ml % 1000;
  const fracText = fr.text.replace(' ', NBSP);
  const expression = `${fracText}${NBSP}l = □${NBSP}ml`;
  const partName = part === 500 ? 'die Hälfte' : part === 250 ? 'ein Viertel' : 'drei Viertel';
  return build(hohlmasseSkill, stufe, {
    key: `bruch:${fr.ml}`,
    ab: 2,
    prompt: 'Wandle um.',
    expression,
    answer: { kind: 'number', value: fr.ml, unit: 'ml', label: 'Menge in Millilitern' },
    hints: ['Denke an: 1\u00A0l = 1000\u00A0ml.', `Wie viel ist ${partName} von 1000 ml?`],
    steps: [
      `${partName.charAt(0).toUpperCase() + partName.slice(1)} von 1000\u00A0ml sind ${q(part, 'ml')}.`,
      ...(whole > 0 ? [`${q(whole, 'l')} = ${q(whole * 1000, 'ml')}`, `${q(whole * 1000, 'ml')} + ${q(part, 'ml')} = ${q(fr.ml, 'ml')}`] : []),
      `${fracText}${NBSP}l = ${q(fr.ml, 'ml')}`,
    ],
    bugs: numberBugs(
      [
        { id: 'durch-10', match: fr.ml / 10, hint: 'Ein ganzer Liter hat 1000\u00A0ml, nicht 100\u00A0ml.' },
        whole > 0 && { id: 'ganzes-vergessen', match: part, hint: 'Vergiss den ganzen Liter vor dem Bruch nicht.' },
        part === 250 && { id: 'viertel-4', match: whole * 1000 + 400, hint: 'Ein Viertel heißt: 1000\u00A0ml in 4 gleiche Teile teilen.' },
      ],
      fr.ml,
    ),
    praise: 'Du hast den Bruch richtig in Milliliter umgerechnet.',
    srText: `Wandle um. ${speak(expression)}`,
    kmk: ['GM.einheiten'],
  });
}

const GLASSES: readonly { ml: number; text: string }[] = [
  { ml: 250, text: '¼ l' }, { ml: 200, text: '200\u00A0ml' }, { ml: 500, text: '½ l' }, { ml: 100, text: '100\u00A0ml' }, { ml: 125, text: '125\u00A0ml' },
];

function glasses(stufe: Stufe, rng: Rng): Exercise {
  const who = pickPerson(rng);
  const g = rng.pick(GLASSES);
  const liters = rng.int(1, 5);
  const total = liters * 1000;
  const n = total / g.ml;
  const perLiter = 1000 / g.ml;
  const liquid = rng.pick(LIQUIDS);
  const glassText = g.text.replace(' ', NBSP);
  const context = `${who.name} hat ${q(liters, 'l')} ${liquid}. ${Pron(who)} füllt damit Gläser. In jedes Glas ${/[½¼¾]/.test(g.text) ? 'passt' : 'passen'} ${glassText}.`;
  return build(hohlmasseSkill, stufe, {
    key: `glaeser:${liters}:${g.ml}`,
    ab: 2,
    context,
    prompt: 'Wie viele Gläser werden voll?',
    emoji: '🥛',
    answer: { kind: 'number', value: n, before: 'Es werden', after: 'Gläser voll.', label: 'Anzahl der Gläser' },
    hints: safeHints([`Wie viele Gläser mit ${glassText} passen in 1 l?`, `Denke an: 1\u00A0l = 1000\u00A0ml. Dann rechne für ${q(liters, 'l')}.`], n, 'Rechne zuerst für 1 Liter.'),
    steps: [`1\u00A0l = 1000\u00A0ml. 1000\u00A0ml : ${fmt(g.ml)}\u00A0ml = ${fmt(perLiter)}`, `Aus 1\u00A0l werden ${fmt(perLiter)} Gläser voll.`, `${liters} ${TIMES} ${fmt(perLiter)} = ${fmt(n)}`, `Es werden ${fmt(n)} Gläser voll.`],
    bugs: numberBugs(
      [
        liters > 1 && { id: 'nur-ein-liter', match: perLiter, hint: `Das sind die Gläser für 1\u00A0l. ${who.name} hat ${q(liters, 'l')}.` },
        { id: 'faktor-100', match: (liters * 100) / g.ml, hint: '1\u00A0l hat 1000\u00A0ml, nicht 100\u00A0ml.' },
      ],
      n,
    ),
    praise: 'Du hast zuerst überlegt, wie viele Gläser in einen Liter passen.',
    srText: `${speak(context)} Wie viele Gläser werden voll?`,
    kmk: ['GM.einheiten', 'GM.sachsituationen'],
  });
}

function claim(stufe: Stufe, rng: Rng): Exercise {
  const who = pickPerson(rng);
  const showTrue = rng.chance(0.3);
  const kind = rng.int(1, 3);
  let c: ReturnType<typeof claimItem>;
  let key: string;
  if (kind === 1) {
    const ml = rng.pick([250, 500, 750]);
    const frac = ml === 250 ? '¼' : ml === 500 ? '½' : '¾';
    key = `claim-bruch:${ml}`;
    c = claimItem(rng, who.name, {
      lhs: `${frac}${NBSP}l`,
      right: q(ml, 'ml'),
      wrongs: [
        { rhs: q(ml / 10, 'ml'), why: '1\u00A0l hat 1000\u00A0ml, nicht 100\u00A0ml.' },
        ml === 250
          ? { rhs: q(400, 'ml'), why: 'Ein Viertel heißt: 1000\u00A0ml in 4 gleiche Teile teilen.' }
          : { rhs: q(ml / 100, 'ml'), why: 'Das ist viel zu wenig. 1\u00A0l hat 1000\u00A0ml.' },
      ],
    }, showTrue);
  } else if (kind === 2) {
    const a = rng.int(1, 5);
    const b = rng.int(1, 9) * 10;
    key = `claim-mix:${a}:${b}`;
    c = claimItem(rng, who.name, {
      lhs: mixed(a, 'l', b, 'ml'),
      right: q(a * 1000 + b, 'ml'),
      wrongs: [
        { rhs: q(Number(`${a}${b}`), 'ml'), why: `${q(b, 'ml')} sind weniger als 100\u00A0ml. Dafür braucht man eine 0 als Platzhalter.` },
        { rhs: q(a * 1000 + b * 10, 'ml'), why: `${q(b, 'ml')} bleiben ${q(b, 'ml')}. Sie werden nicht mehr.` },
      ],
    }, showTrue);
  } else {
    const x = rng.int(1, 3) + rng.pick([0.25, 0.5, 0.75]);
    key = `claim-komma:${x}`;
    c = claimItem(rng, who.name, {
      lhs: q(x, 'l', 2),
      right: q(Math.round(x * 1000), 'ml'),
      wrongs: [
        { rhs: q(Math.round(x * 100), 'ml'), why: 'Hier wurde nur das Komma weggelassen. 1\u00A0l hat 1000\u00A0ml.' },
        { rhs: q(Math.round(x * 10000), 'ml'), why: '1\u00A0l hat 1000\u00A0ml, nicht 10\u202F000\u00A0ml.' },
      ],
    }, showTrue);
  }
  return build(hohlmasseSkill, stufe, {
    key: `${key}:${c.isTrue ? 'w' : 'f'}`,
    ab: 3,
    context: c.context,
    prompt: c.prompt,
    answer: c.answer,
    hints: ['Rechne zuerst selbst. Vergleiche dann.', 'Denke an: 1\u00A0l = 1000\u00A0ml.'],
    steps: c.steps,
    praise: c.isTrue ? 'Du hast selbst nachgerechnet und richtig geprüft.' : 'Du hast den Umrechnungsfehler gefunden.',
    srText: c.srText,
    kmk: ['GM.einheiten', 'PK.argumentieren', 'ZO.kontrolle'],
  });
}

function bottle(stufe: Stufe, rng: Rng): Exercise {
  const who = pickPerson(rng);
  const liquid = rng.pick(LIQUIDS);
  const bottleMl = rng.pick([1000, 1500, 2000]);
  const glass = rng.pick([150, 200, 250, 300]);
  const k = rng.int(2, Math.min(6, Math.floor((bottleMl - 100) / glass)));
  const rest = bottleMl - k * glass;
  const bottleText = bottleMl === 1500 ? `1${NBSP}½${NBSP}l` : q(bottleMl / 1000, 'l');
  const context = `Eine Flasche ${liquid} hat ${bottleText}. ${who.name} gießt ${k} Gläser mit je ${q(glass, 'ml')} ein.`;
  return build(hohlmasseSkill, stufe, {
    key: `flasche:${bottleMl}:${glass}:${k}`,
    ab: 3,
    context,
    prompt: 'Wie viel bleibt in der Flasche?',
    emoji: '🍶',
    answer: { kind: 'number', value: rest, before: 'In der Flasche bleiben', after: 'ml.', label: 'Rest in Millilitern' },
    hints: safeHints(['Wie viel Milliliter sind in allen Gläsern zusammen?', 'Wandle die Flasche in Milliliter um. Ziehe dann ab.'], rest, 'Rechne in Millilitern.'),
    steps: [`${k} ${TIMES} ${q(glass, 'ml')} = ${q(k * glass, 'ml')}`, `${bottleText} = ${q(bottleMl, 'ml')}`, `${fmt(bottleMl)} − ${fmt(k * glass)} = ${fmt(rest)}`, `Es bleiben ${q(rest, 'ml')}.`],
    bugs: numberBugs(
      [
        { id: 'nur-ein-glas', match: bottleMl - glass, hint: `${who.name} gießt ${k} Gläser ein. Rechne zuerst alle Gläser zusammen.` },
        { id: 'eingegossen', match: k * glass, hint: 'Das ist die Menge in den Gläsern. Gefragt ist der Rest in der Flasche.' },
      ],
      rest,
    ),
    praise: 'Du hast alles in Milliliter umgewandelt und in Schritten gerechnet.',
    srText: `${speak(context)} Wie viel bleibt in der Flasche?`,
    kmk: ['GM.sachsituationen', 'GM.einheiten'],
  });
}

export const hohlmasseSkill: SkillDef = {
  id: 'groessen.hohlmasse',
  topicId: 'groessen',
  title: 'Hohlmaße',
  description: 'Du liest Messbecher ab und rechnest Liter und Milliliter um.',
  stufen: {
    1: 'Messbecher ablesen, l und ml umwandeln',
    2: 'Halber und viertel Liter, Gläser füllen',
    3: 'Liter mit Komma, Fehler finden, Flaschen',
  },
  kmk: ['GM.einheiten', 'GM.vorstellung'],
  generate(rng, stufe) {
    if (stufe === 1) {
      if (rng.chance(0.35)) return cup(1, rng);
      const n = rng.int(2, 12);
      return conv(1, rng.chance(0.5) ? convDown('l', 'ml', n) : convUp('l', 'ml', n), 1);
    }
    if (stufe === 2) {
      const v = rng.int(1, 5);
      if (v === 1) return cup(2, rng);
      if (v === 2) return fraction(2, rng);
      if (v === 3) return glasses(2, rng);
      if (v === 4) return conv(2, mixedToSmall('l', 'ml', rng.int(1, 9), rng.chance(0.5) ? rng.int(1, 99) : rng.int(100, 999)), 2);
      return conv(2, smallToMixed('l', 'ml', rng.int(1, 9) * 1000 + (rng.chance(0.5) ? rng.int(1, 99) : rng.int(100, 999))), 2);
    }
    const v = rng.int(1, 4);
    if (v === 1) {
      const shown = rng.chance(0.4) ? 1 : 3;
      const x = shown === 1 ? rng.int(1, 9) + rng.int(1, 9) / 10 : rng.int(0, 5) + rng.int(1, 999) / 1000;
      return conv(3, commaToSmall('l', 'ml', Math.round(x * 1000) / 1000, shown), 2);
    }
    if (v === 2) return conv(3, smallToComma('l', 'ml', rng.int(0, 5) * 1000 + rng.int(10, 999)), 2);
    if (v === 3) return claim(3, rng);
    return bottle(3, rng);
  },
};
