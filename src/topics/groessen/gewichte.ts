/**
 * Gewichte (Masse): g und kg. Tonnen gibt es nur in der NRW-Zusatzaufgabe groessen.tonnen.
 * Stufe 1: 3 kg = 3000 g and back, read a kitchen scale (to 1 kg).
 * Stufe 2: mixed notation (2 kg 50 g), ½ ¼ ¾ kg, scale to 2–5 kg.
 * Stufe 3: kg with 3 decimals, "Stimmt das?", Rezept (multi-step).
 */
import { fmt, NBSP, TIMES } from '../../core/format';
import type { Exercise, Rng, SkillDef, Stufe } from '../../core/types';
import { build, numberBugs, pickPerson, safeHints, speak } from './helpers';
import {
  claimItem, commaToSmall, convDown, convExercise, convUp, mixed, mixedToSmall, q, smallToComma, smallToMixed, type ConvItem,
} from './conversions';

function conv(stufe: Stufe, item: ConvItem, ab: 1 | 2 | 3): Exercise {
  return convExercise(gewichteSkill, stufe, item, { ab, kmk: ['GM.einheiten'] });
}

/** Goods on the scale with article and verb, so the question is grammatical ('Wie schwer ist das Mehl?'). */
const GOODS: readonly { np: string; verb: 'ist' | 'sind' }[] = [
  { np: 'die Äpfel', verb: 'sind' }, { np: 'das Mehl', verb: 'ist' }, { np: 'die Kartoffeln', verb: 'sind' },
  { np: 'die Nudeln', verb: 'sind' }, { np: 'die Kirschen', verb: 'sind' }, { np: 'der Zucker', verb: 'ist' },
  { np: 'die Möhren', verb: 'sind' }, { np: 'die Nüsse', verb: 'sind' }, { np: 'die Erdbeeren', verb: 'sind' },
  { np: 'der Reis', verb: 'ist' },
];

/** Gram distance between two labelled ticks of the kitchen scale (the same rule as ScaleVisual.labelStep; checked in a test). */
export function scaleLabelStep(max: number, step: number): number {
  const candidates = [step, 2 * step, 5 * step, 10 * step, 100, 200, 250, 500, 1000, 2000, 5000]
    .filter((c) => c >= step && c % step === 0)
    .sort((a, b) => a - b);
  return candidates.find((c) => max / c <= 10) ?? max;
}

/**
 * How a child reads the scale: from the last labelled number before the pointer, count the ticks after it
 * (the same reference point the visual's screen-reader text uses).
 */
export function scaleReading(maxGrams: number, stepGrams: number, grams: number): { where: string; steps: string[] } {
  const ls = scaleLabelStep(maxGrams, stepGrams);
  const last = Math.floor(grams / ls) * ls;
  const after = (grams - last) / stepGrams;
  const strich = after === 1 ? 'Strich' : 'Striche';
  if (after === 0) {
    return { where: `Der Zeiger zeigt genau auf die Zahl ${fmt(last)}.`, steps: [`Ein Strich bedeutet ${q(stepGrams, 'g')}.`, `Der Zeiger zeigt genau auf ${q(grams, 'g')}.`] };
  }
  const where = `Der Zeiger steht ${after} ${strich} nach der Zahl ${fmt(last)}.`;
  const count = `${after} ${TIMES} ${q(stepGrams, 'g')} = ${q(after * stepGrams, 'g')}`;
  if (last === 0) return { where, steps: [`Ein Strich bedeutet ${q(stepGrams, 'g')}.`, `Der Zeiger steht ${after} ${strich} nach der 0: ${count}`] };
  return {
    where,
    steps: [
      `Ein Strich bedeutet ${q(stepGrams, 'g')}.`,
      `Vor dem Zeiger steht die Zahl ${fmt(last)}. Danach kommen noch ${after} ${strich}: ${count}`,
      `${q(last, 'g')} + ${q(after * stepGrams, 'g')} = ${q(grams, 'g')}`,
    ],
  };
}

function scale(stufe: Stufe, rng: Rng): Exercise {
  const maxGrams = stufe === 1 ? 1000 : rng.pick([2000, 5000]);
  const stepGrams = stufe === 1 ? rng.pick([50, 100]) : maxGrams === 2000 ? rng.pick([50, 100]) : 100;
  const ticks = rng.int(2, maxGrams / stepGrams - 1);
  const grams = ticks * stepGrams;
  const good = rng.pick(GOODS);
  const howHeavy = `Wie schwer ${good.verb} ${good.np}?`;
  const reading = scaleReading(maxGrams, stepGrams, grams);
  const sr = `Eine Küchenwaage bis ${fmt(maxGrams)} Gramm. Ein Strich bedeutet ${stepGrams} Gramm. ${reading.where}`;
  const visual = { type: 'scale' as const, maxGrams, stepGrams, grams };
  const bugs = numberBugs(
    [
      { id: 'strich-10g', match: ticks * 10, hint: `Ein Strich bedeutet hier nicht 10\u00A0g. Schau, wie viel Gramm von einer Zahl zur nächsten sind, und zähle die Striche dazwischen.` },
      { id: 'strich-zu-viel', match: grams + stepGrams, hint: 'Zähle die Striche noch einmal genau bis zum Zeiger.' },
    ],
    grams,
  );
  if (stufe === 1 || grams < 1000 || rng.chance(0.5)) {
    return build(gewichteSkill, stufe, {
      key: `waage:${maxGrams}:${stepGrams}:${grams}`,
      ab: stufe === 1 ? 1 : 2,
      prompt: `${howHeavy} Lies die Waage ab.`,
      visual,
      answer: { kind: 'number', value: grams, unit: 'g', label: 'Gewicht in Gramm' },
      hints: safeHints(['Wie viel Gramm sind es von einer Zahl zur nächsten?', `Ein kleiner Strich bedeutet ${q(stepGrams, 'g')}. Zähle ab der Zahl vor dem Zeiger weiter.`], grams, 'Zähle die Striche genau.'),
      steps: reading.steps,
      bugs,
      praise: 'Du hast herausgefunden, wie viel ein Strich bedeutet.',
      srText: `${howHeavy} ${sr} Antworte in Gramm.`,
      kmk: ['GM.einheiten', 'GM.vorstellung'],
    });
  }
  const a = Math.floor(grams / 1000);
  const b = grams % 1000;
  return build(gewichteSkill, stufe, {
    key: `waage-mix:${maxGrams}:${stepGrams}:${grams}`,
    ab: 2,
    prompt: `${howHeavy} Schreibe in kg und g.`,
    expression: `□${NBSP}kg □${NBSP}g`,
    visual,
    answer: {
      kind: 'multi',
      fields: [
        { id: 'kg', value: a, after: 'kg', label: 'Kilogramm' },
        { id: 'g', value: b, after: 'g', label: 'Gramm' },
      ],
    },
    hints: ['Lies zuerst ab, wie viel Gramm es sind.', 'Denke an: 1\u00A0kg = 1000\u00A0g. Wie viele ganze Kilogramm stecken darin?'],
    steps: [...reading.steps, `${q(grams, 'g')} = ${mixed(a, 'kg', b, 'g')}`],
    praise: 'Du hast abgelesen und in kg und g zerlegt.',
    srText: `${howHeavy} ${sr} Schreibe in Kilogramm und Gramm.`,
    kmk: ['GM.einheiten', 'GM.vorstellung'],
  });
}

const FRACTIONS: readonly { text: string; g: number }[] = [
  { text: '½', g: 500 }, { text: '¼', g: 250 }, { text: '¾', g: 750 },
  { text: '1 ½', g: 1500 }, { text: '2 ½', g: 2500 }, { text: '1 ¼', g: 1250 }, { text: '3 ½', g: 3500 }, { text: '2 ¾', g: 2750 },
];

function fraction(stufe: Stufe, rng: Rng): Exercise {
  const fr = rng.pick(FRACTIONS);
  const whole = Math.floor(fr.g / 1000);
  const part = fr.g % 1000;
  const fracText = fr.text.replace(' ', NBSP);
  const expression = `${fracText}${NBSP}kg = □${NBSP}g`;
  const partName = part === 500 ? 'die Hälfte' : part === 250 ? 'ein Viertel' : 'drei Viertel';
  return build(gewichteSkill, stufe, {
    key: `bruch:${fr.g}`,
    ab: 2,
    prompt: 'Wandle um.',
    expression,
    answer: { kind: 'number', value: fr.g, unit: 'g', label: 'Gewicht in Gramm' },
    hints: ['Denke an: 1\u00A0kg = 1000\u00A0g.', `Wie viel ist ${partName} von 1000 g?`],
    steps: [
      `${partName.charAt(0).toUpperCase() + partName.slice(1)} von 1000\u00A0g sind ${q(part, 'g')}.`,
      ...(whole > 0 ? [`${q(whole, 'kg')} = ${q(whole * 1000, 'g')}`, `${q(whole * 1000, 'g')} + ${q(part, 'g')} = ${q(fr.g, 'g')}`] : []),
      `${fracText}${NBSP}kg = ${q(fr.g, 'g')}`,
    ],
    bugs: numberBugs(
      [
        { id: 'durch-10', match: fr.g / 10, hint: 'Ein ganzes Kilogramm hat 1000\u00A0g, nicht 100\u00A0g.' },
        whole > 0 && { id: 'ganzes-vergessen', match: part, hint: 'Vergiss das ganze Kilogramm vor dem Bruch nicht.' },
        part === 250 && { id: 'viertel-4', match: whole * 1000 + 400, hint: 'Ein Viertel heißt: 1000\u00A0g in 4 gleiche Teile teilen.' },
      ],
      fr.g,
    ),
    praise: 'Du hast den Bruch richtig in Gramm umgerechnet.',
    srText: `Wandle um. ${speak(expression)}`,
    kmk: ['GM.einheiten'],
  });
}

function claim(stufe: Stufe, rng: Rng): Exercise {
  const who = pickPerson(rng);
  const showTrue = rng.chance(0.3);
  const kind = rng.int(1, 3);
  let c: ReturnType<typeof claimItem>;
  let key: string;
  if (kind === 1) {
    const a = rng.int(1, 9);
    const b = rng.int(1, 9) * 10;
    key = `claim-mix:${a}:${b}`;
    c = claimItem(rng, who.name, {
      lhs: mixed(a, 'kg', b, 'g'),
      right: q(a + b / 1000, 'kg', 3),
      wrongs: [
        { rhs: q(a + b / 100, 'kg', 2), why: `Bei Kilogramm stehen 3 Stellen nach dem Komma für die Gramm. ${q(b, 'g')} sind weniger als 100\u00A0g.` },
        { rhs: q(a * 100 + b, 'g'), why: '1\u00A0kg hat 1000\u00A0g, nicht 100\u00A0g.' },
      ],
    }, showTrue);
  } else if (kind === 2) {
    const x = rng.int(1, 9) + rng.int(1, 9) / 10;
    key = `claim-komma:${x}`;
    c = claimItem(rng, who.name, {
      lhs: q(x, 'kg', 1),
      right: q(Math.round(x * 1000), 'g'),
      wrongs: [
        { rhs: q(Math.round(x * 10), 'g'), why: 'Hier wurde nur das Komma weggelassen. 1\u00A0kg hat 1000\u00A0g.' },
        { rhs: q(Math.round(x * 100), 'g'), why: '1\u00A0kg hat 1000\u00A0g, nicht 100\u00A0g.' },
      ],
    }, showTrue);
  } else {
    const g = rng.int(2, 9) * 100 + rng.pick([0, 50]);
    key = `claim-g:${g}`;
    c = claimItem(rng, who.name, {
      lhs: q(g, 'g'),
      right: q(g / 1000, 'kg', 3),
      wrongs: [
        { rhs: q(g / 100, 'kg', 1), why: `${q(g, 'g')} sind weniger als 1\u00A0kg. Vor dem Komma muss eine 0 stehen.` },
        { rhs: q(g / 10, 'kg', 1), why: `${q(g, 'g')} sind weniger als 1\u00A0kg, nicht mehr.` },
      ],
    }, showTrue);
  }
  return build(gewichteSkill, stufe, {
    key: `${key}:${c.isTrue ? 'w' : 'f'}`,
    ab: 3,
    context: c.context,
    prompt: c.prompt,
    answer: c.answer,
    hints: ['Rechne zuerst selbst. Vergleiche dann.', 'Denke an: 1\u00A0kg = 1000\u00A0g. Nach dem Komma stehen 3 Stellen für die Gramm.'],
    steps: c.steps,
    praise: c.isTrue ? 'Du hast selbst nachgerechnet und richtig geprüft.' : 'Du hast den Umrechnungsfehler gefunden.',
    srText: c.srText,
    kmk: ['GM.einheiten', 'PK.argumentieren', 'ZO.kontrolle'],
  });
}

const RECIPES = [
  { what: 'einen Rührkuchen', ing: 'Mehl', per: [250, 300, 375, 400] },
  { what: 'ein Blech Kekse', ing: 'Mehl', per: [200, 250, 350] },
  { what: 'einen Obstkuchen', ing: 'Zucker', per: [150, 200, 250] },
  { what: 'eine Portion Pfannkuchen', ing: 'Mehl', per: [125, 250, 300] },
];

function recipe(stufe: Stufe, rng: Rng): Exercise {
  const who = pickPerson(rng);
  const r = rng.pick(RECIPES);
  const per = rng.pick(r.per);
  const packKg = rng.pick([1, 2]);
  const maxK = Math.floor((packKg * 1000 - 50) / per);
  const k = rng.int(2, Math.min(4, maxK));
  const used = k * per;
  const rest = packKg * 1000 - used;
  const context = `Für ${r.what} braucht man ${q(per, 'g')} ${r.ing}. ${who.name} backt ${k}-mal. ${who.p === 'sie' ? 'Sie' : 'Er'} hat eine Packung mit ${q(packKg, 'kg')} ${r.ing}.`;
  return build(gewichteSkill, stufe, {
    key: `rezept:${r.what}:${per}:${packKg}:${k}`,
    ab: 3,
    context,
    prompt: `Wie viel Gramm ${r.ing} bleiben übrig?`,
    emoji: '🧁',
    answer: { kind: 'number', value: rest, before: 'Es bleiben', after: `g ${r.ing} übrig.`, label: 'Rest in Gramm' },
    hints: safeHints([`Wie viel Gramm ${r.ing} braucht man, wenn man ${k}-mal backt?`, `Wandle die Packung in Gramm um. Ziehe dann ab.`], rest, 'Rechne in Gramm.'),
    steps: [`${k} ${'·'} ${q(per, 'g')} = ${q(used, 'g')}`, `${q(packKg, 'kg')} = ${q(packKg * 1000, 'g')}`, `${fmt(packKg * 1000)} − ${fmt(used)} = ${fmt(rest)}`, `Es bleiben ${q(rest, 'g')} übrig.`],
    bugs: numberBugs(
      [
        { id: 'nur-einmal', match: packKg * 1000 - per, hint: `${who.name} backt ${k}-mal. Rechne zuerst aus, wie viel alle zusammen brauchen.` },
        { id: 'verbraucht', match: used, hint: 'Das ist, was verbraucht wird. Gefragt ist, was übrig bleibt.' },
        packKg * 100 > used && { id: 'faktor-100', match: packKg * 100 - used, hint: '1\u00A0kg hat 1000\u00A0g, nicht 100\u00A0g.' },
      ],
      rest,
    ),
    praise: 'Du hast in Gramm umgewandelt und in zwei Schritten gerechnet.',
    srText: `${speak(context)} Wie viel Gramm ${r.ing} bleiben übrig?`,
    kmk: ['GM.sachsituationen', 'GM.einheiten'],
  });
}

export const gewichteSkill: SkillDef = {
  id: 'groessen.gewichte',
  topicId: 'groessen',
  title: 'Gewichte',
  description: 'Du liest Waagen ab und rechnest Gramm und Kilogramm um.',
  stufen: {
    1: 'Waage ablesen, kg und g umwandeln',
    2: 'Gemischte Schreibweise, halbe und viertel Kilogramm',
    3: 'Kilogramm mit Komma, Fehler finden, Rezepte',
  },
  kmk: ['GM.einheiten', 'GM.vorstellung'],
  generate(rng, stufe) {
    if (stufe === 1) {
      if (rng.chance(0.3)) return scale(1, rng);
      const n = rng.int(2, 15);
      return conv(1, rng.chance(0.5) ? convDown('kg', 'g', n) : convUp('kg', 'g', n), 1);
    }
    if (stufe === 2) {
      const v = rng.int(1, 4);
      if (v === 1) return scale(2, rng);
      if (v === 2) return fraction(2, rng);
      if (v === 3) {
        const a = rng.int(1, 9);
        const b = rng.chance(0.5) ? rng.int(1, 99) : rng.int(100, 999);
        return conv(2, mixedToSmall('kg', 'g', a, b), 2);
      }
      const total = rng.int(1, 9) * 1000 + (rng.chance(0.5) ? rng.int(1, 99) : rng.int(100, 999));
      return conv(2, smallToMixed('kg', 'g', total), 2);
    }
    const v = rng.int(1, 4);
    if (v === 1) {
      const shown = rng.chance(0.4) ? 1 : 3;
      const x = shown === 1 ? rng.int(1, 9) + rng.int(1, 9) / 10 : rng.int(0, 9) + rng.int(1, 999) / 1000;
      return conv(3, commaToSmall('kg', 'g', Math.round(x * 1000) / 1000, shown), 2);
    }
    if (v === 2) return conv(3, smallToComma('kg', 'g', rng.int(0, 9) * 1000 + rng.int(10, 999)), 2);
    if (v === 3) return claim(3, rng);
    return recipe(3, rng);
  },
};
