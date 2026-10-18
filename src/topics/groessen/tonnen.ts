/**
 * Tonnen (NRW-Zusatz): t ↔ kg. Hidden unless GenContext.nrwExtras; does not count toward mastery.
 * Stufe 1: 3 t = 3000 kg and back.
 * Stufe 2: mixed notation (2 t 500 kg), ½ ¼ ¾ t.
 * Stufe 3: t with comma (3 decimals), loading a truck, plausibility.
 */
import { fmt, NBSP, TIMES } from '../../core/format';
import type { ChoiceOption, Exercise, Rng, SkillDef, Stufe } from '../../core/types';
import { build, makeChoice, numberBugs, safeHints, speak } from './helpers';
import { commaToSmall, convDown, convExercise, convUp, mixedToSmall, q, smallToMixed, type ConvItem } from './conversions';

function conv(stufe: Stufe, item: ConvItem, ab: 1 | 2 | 3): Exercise {
  return convExercise(tonnenSkill, stufe, item, { ab, kmk: ['GM.einheiten'] });
}

function fraction(stufe: Stufe, rng: Rng): Exercise {
  const fr = rng.pick([['½', 500], ['¼', 250], ['¾', 750], ['1 ½', 1500], ['2 ½', 2500], ['1 ¼', 1250]] as const);
  const text = fr[0].replace(' ', NBSP);
  const kg = fr[1];
  const expression = `${text}${NBSP}t = □${NBSP}kg`;
  return build(tonnenSkill, stufe, {
    key: `bruch:${kg}`,
    ab: 2,
    prompt: 'Wandle um.',
    expression,
    answer: { kind: 'number', value: kg, unit: 'kg', label: 'Gewicht in Kilogramm' },
    hints: ['Denke an: 1\u00A0t = 1000\u00A0kg.', 'Wie viel ist die Hälfte oder ein Viertel von 1000 kg?'],
    steps: [`1${NBSP}t = 1000${NBSP}kg`, `${text}${NBSP}t = ${q(kg, 'kg')}`],
    bugs: numberBugs([{ id: 'durch-10', match: kg / 10, hint: 'Eine Tonne hat 1000\u00A0kg, nicht 100\u00A0kg.' }, kg > 1000 && { id: 'ganzes-vergessen', match: kg % 1000, hint: 'Vergiss die ganze Tonne nicht.' }], kg),
    praise: 'Du hast den Bruch richtig in Kilogramm umgerechnet.',
    srText: `Wandle um. ${speak(expression)}`,
    kmk: ['GM.einheiten'],
  });
}

function truck(stufe: Stufe, rng: Rng): Exercise {
  const limit = rng.int(3, 8);
  const per = rng.pick([250, 350, 400, 450, 600, 750, 850]);
  const k = rng.int(2, Math.min(8, Math.floor((limit * 1000 - 100) / per)));
  const loaded = k * per;
  const rest = limit * 1000 - loaded;
  const context = `Ein Lastwagen darf ${q(limit, 't')} laden. Er hat schon ${k} Kisten mit je ${q(per, 'kg')} geladen.`;
  return build(tonnenSkill, stufe, {
    key: `laster:${limit}:${per}:${k}`,
    ab: 3,
    context,
    prompt: 'Wie viel Kilogramm darf er noch laden?',
    emoji: '🚚',
    answer: { kind: 'number', value: rest, before: 'Er darf noch', after: 'kg laden.', label: 'Rest in Kilogramm' },
    hints: safeHints(['Wie schwer sind alle Kisten zusammen?', 'Wandle die Tonnen in Kilogramm um. Ziehe dann ab.'], rest, 'Rechne in Kilogramm.'),
    steps: [`${k} ${TIMES} ${q(per, 'kg')} = ${q(loaded, 'kg')}`, `${q(limit, 't')} = ${q(limit * 1000, 'kg')}`, `${fmt(limit * 1000)} − ${fmt(loaded)} = ${fmt(rest)}`],
    bugs: numberBugs(
      [
        { id: 'geladen', match: loaded, hint: 'Das ist schon geladen. Gefragt ist, wie viel noch dazu darf.' },
        { id: 'eine-kiste', match: limit * 1000 - per, hint: `Es sind ${k} Kisten. Rechne zuerst alle zusammen.` },
      ],
      rest,
    ),
    praise: 'Du hast erst umgewandelt und dann in Schritten gerechnet.',
    srText: `${speak(context)} Wie viel Kilogramm darf er noch laden?`,
    kmk: ['GM.sachsituationen', 'GM.einheiten'],
  });
}

const HEAVY = [
  { what: 'Ein Elefant', n: 5, u: 't' },
  { what: 'Ein Auto', n: 1, u: 't' },
  { what: 'Ein Pferd', n: 500, u: 'kg' },
  { what: 'Ein Lastwagen', n: 20, u: 't' },
  { what: 'Ein Kühlschrank', n: 60, u: 'kg' },
  { what: 'Ein Nashorn', n: 2, u: 't' },
] as const;

/** Something familiar that weighs about n g (a Stützpunkt for the gram option). */
export function gramsLike(n: number): string {
  if (n === 1) return 'eine Büroklammer';
  if (n <= 3) return 'ein paar Büroklammern';
  if (n <= 10) return 'ein Blatt Papier';
  if (n <= 30) return 'ein paar Blätter Papier';
  if (n <= 70) return 'ein Hühnerei';
  if (n <= 150) return 'eine Tafel Schokolade';
  return 'eine Packung Nudeln';
}

function plausible(stufe: Stufe, rng: Rng): Exercise {
  const it = rng.pick(HEAVY);
  const right = q(it.n, it.u);
  const other = it.u === 't' ? 'kg' : 't';
  const waere = it.n === 1 ? 'wäre' : 'wären';
  const wiegt = it.n === 1 ? 'wiegt' : 'wiegen';
  const wrongs: ChoiceOption[] = [
    { label: q(it.n, other), whyWrong: it.u === 't' ? `${q(it.n, 'kg')} ${waere} viel zu leicht. 1\u00A0t sind 1000\u00A0kg.` : `${q(it.n, 't')} ${waere} viel zu schwer. 1\u00A0t sind 1000\u00A0kg.` },
    { label: q(it.n, 'g'), whyWrong: `${q(it.n, 'g')} ${wiegt} etwa so viel wie ${gramsLike(it.n)}. Das ist viel zu leicht.` },
  ];
  const answer = makeChoice(rng, { label: right }, wrongs);
  return build(tonnenSkill, stufe, {
    key: `schwer:${it.what}`,
    ab: 2,
    prompt: `${it.what} wiegt etwa …`,
    answer,
    // the car comparison would give the answer away for the car itself
    hints: [it.what === 'Ein Auto' ? 'Eine Tonne sind 1000\u00A0kg. Das ist so schwer wie 1000 Packungen Mehl.' : 'Eine Tonne sind 1000\u00A0kg. Das ist so schwer wie ein kleines Auto.', 'Vergleiche mit Dingen, die du kennst.'],
    steps: ['1\u00A0t = 1000\u00A0kg, etwa so schwer wie ein kleines Auto.', `${it.what} wiegt etwa ${right}.`],
    praise: 'Du hast dir die Tonne gut vorgestellt.',
    srText: `${it.what} wiegt etwa wie viel? Wähle aus: ${answer.options.map((o) => speak(o.label)).join('; ')}.`,
    kmk: ['GM.vorstellung'],
  });
}

export const tonnenSkill: SkillDef = {
  id: 'groessen.tonnen',
  topicId: 'groessen',
  title: 'Tonnen',
  description: 'Du rechnest mit sehr schweren Dingen in Tonnen und Kilogramm.',
  stufen: {
    1: 'Tonnen und Kilogramm umwandeln',
    2: 'Gemischte Schreibweise, halbe Tonnen, schätzen',
    3: 'Tonnen mit Komma, Lastwagen beladen',
  },
  kmk: ['GM.einheiten', 'GM.vorstellung'],
  optional: 'nrw',
  generate(rng, stufe) {
    if (stufe === 1) {
      const n = rng.int(2, 20);
      return conv(1, rng.chance(0.5) ? convDown('t', 'kg', n) : convUp('t', 'kg', n), 1);
    }
    if (stufe === 2) {
      const v = rng.int(1, 4);
      if (v === 1) return fraction(2, rng);
      if (v === 2) return plausible(2, rng);
      if (v === 3) return conv(2, mixedToSmall('t', 'kg', rng.int(1, 9), rng.chance(0.5) ? rng.int(1, 99) : rng.int(100, 999)), 2);
      return conv(2, smallToMixed('t', 'kg', rng.int(1, 9) * 1000 + rng.int(1, 999)), 2);
    }
    if (rng.chance(0.5)) return truck(3, rng);
    const shown = rng.chance(0.4) ? 1 : 3;
    const x = shown === 1 ? rng.int(1, 9) + rng.int(1, 9) / 10 : rng.int(0, 9) + rng.int(1, 999) / 1000;
    return conv(3, commaToSmall('t', 'kg', Math.round(x * 1000) / 1000, shown), 2);
  },
};
