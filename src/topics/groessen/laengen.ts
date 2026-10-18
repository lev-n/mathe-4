/**
 * Längen: mm, cm, m, km.
 * Stufe 1: neighbouring units with whole numbers (4 m = 400 cm), ruler in whole cm.
 * Stufe 2: mixed ↔ single unit (2 km 50 m = 2050 m), m with comma (2 decimals), ruler in cm and mm.
 * Stufe 3: km with 3 decimals, "Stimmt das?", ruler not starting at 0, Weg-Aufgaben.
 */
import { fmt, NBSP } from '../../core/format';
import type { Exercise, MultiField, Rng, SkillDef, Stufe } from '../../core/types';
import { build, multiBugs, numberBugs, pickPerson, safeHints, speak } from './helpers';
import {
  claimItem, commaToSmall, convDown, convExercise, convUp, mixed, mixedToComma, mixedToSmall, q,
  smallToComma, smallToMixed, type ConvItem, type Pair,
} from './conversions';

const PAIRS: readonly Pair[] = [['cm', 'mm'], ['m', 'cm'], ['km', 'm']];

const OBJECTS = ['Streifen', 'Stift', 'Nagel', 'Wollfaden', 'Strohhalm', 'Zweig', 'Bleistift', 'Pinsel'];

function conv(stufe: Stufe, item: ConvItem, ab: 1 | 2 | 3): Exercise {
  return convExercise(laengenSkill, stufe, item, { ab, kmk: ['GM.einheiten'] });
}

function simpleRange(pair: Pair, rng: Rng): number {
  if (pair[0] === 'cm') return rng.int(2, 30);
  if (pair[0] === 'm') return rng.int(2, 25);
  return rng.int(2, 15);
}

// ─── Ruler ───────────────────────────────────────────────────────────────────

function ruler(stufe: Stufe, rng: Rng): Exercise {
  const obj = rng.pick(OBJECTS);
  const maxCm = rng.int(10, 15);
  let startMm = 0;
  let lengthMm: number;
  if (stufe === 1) {
    lengthMm = rng.int(2, maxCm) * 10;
  } else if (stufe === 2) {
    lengthMm = rng.int(15, maxCm * 10 - 1);
    if (lengthMm % 10 === 0) lengthMm += rng.int(1, 9);
  } else {
    startMm = rng.int(1, 4) * 10 + (rng.chance(0.3) ? 5 : 0);
    lengthMm = rng.int(15, maxCm * 10 - startMm);
    if (lengthMm % 10 === 0) lengthMm += 3;
    if (startMm + lengthMm > maxCm * 10) lengthMm = maxCm * 10 - startMm;
  }
  const endMm = startMm + lengthMm;
  const visual = { type: 'ruler' as const, maxCm, startMm, lengthMm };
  const key = `lineal:${maxCm}:${startMm}:${lengthMm}`;
  const where = startMm === 0 ? '' : ` Der ${obj} liegt nicht an der 0.`;
  const srBase = `Ein Lineal bis ${maxCm} Zentimeter. Der ${obj} beginnt bei ${speakPos(startMm)} und endet bei ${speakPos(endMm)}.`;

  if (stufe === 1) {
    const cm = lengthMm / 10;
    return build(laengenSkill, stufe, {
      key,
      ab: 1,
      prompt: `Wie lang ist der ${obj}?`,
      visual,
      answer: { kind: 'number', value: cm, unit: 'cm', label: 'Länge in Zentimetern' },
      hints: ['Der Anfang liegt genau an der 0.', 'Lies am Ende ab: Bei welcher Zahl hört er auf?'],
      steps: [`Anfang: 0\u00A0cm. Ende: ${q(cm, 'cm')}.`, `Der ${obj} ist ${q(cm, 'cm')} lang.`],
      bugs: numberBugs([{ id: 'striche-gezaehlt', match: cm + 1, hint: 'Zähle die Abstände zwischen den Zahlen, nicht die Striche. Die 0 ist der Anfang.' }], cm),
      praise: 'Du hast an der 0 angefangen und am Ende genau abgelesen.',
      srText: `Wie lang ist der ${obj}? ${srBase} Antworte in Zentimetern.`,
      kmk: ['GM.einheiten', 'GM.vorstellung'],
    });
  }

  const a = Math.floor(lengthMm / 10);
  const b = lengthMm % 10;
  if (stufe === 2 && rng.chance(0.5)) {
    const fields: MultiField[] = [
      { id: 'cm', value: a, after: 'cm', label: 'Zentimeter' },
      { id: 'mm', value: b, after: 'mm', label: 'Millimeter' },
    ];
    return build(laengenSkill, stufe, {
      key: `${key}:mix`,
      ab: 2,
      prompt: `Wie lang ist der ${obj}? Schreibe in cm und mm.`,
      expression: `${obj}: ${BOX_CM} ${BOX_MM}`,
      visual,
      answer: { kind: 'multi', fields },
      hints: ['Lies zuerst die ganzen Zentimeter ab.', 'Zähle dann die kleinen Striche bis zum Ende. Jeder kleine Strich ist 1\u00A0mm.'],
      steps: [`Ganze Zentimeter bis zum Ende: ${q(a, 'cm')}`, `Danach noch ${q(b, 'mm')}`, `Der ${obj} ist ${mixed(a, 'cm', b, 'mm')} lang.`],
      bugs: multiBugs(
        [
          { id: 'naechster-cm', match: { cm: a + 1, mm: b }, hint: 'Nimm die letzte Zentimeter-Zahl, an der der Streifen schon vorbei ist.' },
          { id: 'rueckwaerts', match: { cm: a + 1, mm: 10 - b }, hint: 'Zähle die Millimeter von der letzten ganzen Zentimeter-Zahl aus weiter.' },
        ],
        fields,
      ),
      praise: 'Du hast Zentimeter und Millimeter genau abgelesen.',
      srText: `Wie lang ist der ${obj}? ${srBase} Schreibe in Zentimetern und Millimetern.`,
      kmk: ['GM.einheiten', 'GM.vorstellung'],
    });
  }
  // length in mm (Stufe 2, or Stufe 3 with start ≠ 0)
  const ex = build(laengenSkill, stufe, {
    key: `${key}:mm`,
    ab: stufe === 3 ? 3 : 2,
    prompt: `Wie lang ist der ${obj} in Millimetern?${where}`,
    visual,
    answer: { kind: 'number', value: lengthMm, unit: 'mm', label: 'Länge in Millimetern' },
    hints: safeHints(
      startMm === 0
        ? ['1\u00A0cm hat 10\u00A0mm. Wie viele ganze Zentimeter sind es?', 'Zähle dann die kleinen Striche bis zum Ende dazu.']
        : ['Lies den Anfang und das Ende ab.', 'Rechne: Ende minus Anfang. Oder zähle die Abstände vom Anfang bis zum Ende.'],
      lengthMm,
      'Lies Anfang und Ende genau ab.',
    ),
    steps: startMm === 0
      ? [`Bis zum Ende: ${mixed(a, 'cm', b, 'mm')}`, `${q(a, 'cm')} = ${q(a * 10, 'mm')}`, `${q(a * 10, 'mm')} + ${q(b, 'mm')} = ${q(lengthMm, 'mm')}`]
      : [`Anfang: ${q(startMm, 'mm')}. Ende: ${q(endMm, 'mm')}.`, `${fmt(endMm)} − ${fmt(startMm)} = ${fmt(lengthMm)}`, `Der ${obj} ist ${q(lengthMm, 'mm')} lang.`],
    bugs: numberBugs(
      [
        startMm > 0 && { id: 'ende-abgelesen', match: endMm, hint: `Der ${obj} beginnt nicht bei 0. Ziehe den Anfang ab.` },
        { id: 'cm-statt-mm', match: a, hint: 'Gefragt sind Millimeter. 1\u00A0cm hat 10\u00A0mm.' },
        startMm > 0 && { id: 'ein-cm-daneben', match: lengthMm - 10, hint: 'Prüfe den Anfang noch einmal genau.' },
      ],
      lengthMm,
    ),
    praise: startMm === 0 ? 'Du hast Zentimeter in Millimeter umgerechnet.' : 'Du hast daran gedacht, dass der Anfang nicht bei 0 liegt.',
    srText: `Wie lang ist der ${obj} in Millimetern? ${srBase}`,
    kmk: ['GM.einheiten', 'GM.vorstellung'],
  });
  if (stufe === 3) ex.knobel = true;
  return ex;
}

const BOX_CM = `□${NBSP}cm`;
const BOX_MM = `□${NBSP}mm`;

/** 'die 7-Zentimeter-Marke und 4 Millimeter'. */
function speakPos(mm: number): string {
  const cm = Math.floor(mm / 10);
  const rest = mm % 10;
  return rest === 0 ? `der ${cm}-Zentimeter-Marke` : `${rest} Millimeter nach der ${cm}-Zentimeter-Marke`;
}

// ─── Stufe 3 extras ──────────────────────────────────────────────────────────

function claim(stufe: Stufe, rng: Rng): Exercise {
  const who = pickPerson(rng);
  const kind = rng.int(1, 4);
  let c: ReturnType<typeof claimItem>;
  let key: string;
  const showTrue = rng.chance(0.3);
  if (kind === 1) {
    const a = rng.int(1, 9);
    const d = rng.int(1, 9);
    key = `claim-m:${a}:${d}`;
    c = claimItem(rng, who.name, {
      lhs: q(a + d / 10, 'm', 1),
      right: q(a * 100 + d * 10, 'cm'),
      wrongs: [
        { rhs: q(a * 10 + d, 'cm'), why: `Nach dem Komma stehen bei Metern 2 Stellen für die Zentimeter: ${q(a + d / 10, 'm', 2)}.` },
        { rhs: q(a * 1000 + d * 100, 'cm'), why: '1\u00A0m hat 100\u00A0cm, nicht 1000\u00A0cm.' },
      ],
    }, showTrue);
  } else if (kind === 2) {
    const a = rng.int(1, 9);
    const b = rng.int(1, 9) * 10;
    key = `claim-km:${a}:${b}`;
    c = claimItem(rng, who.name, {
      lhs: mixed(a, 'km', b, 'm'),
      right: q(a * 1000 + b, 'm'),
      wrongs: [
        { rhs: q(a * 100 + b, 'm'), why: `1\u00A0km hat 1000\u00A0m. ${q(b, 'm')} sind weniger als 100\u00A0m, deshalb brauchst du eine 0 als Platzhalter.` },
        { rhs: q(a * 1000 + b * 10, 'm'), why: `${q(b, 'm')} bleiben ${q(b, 'm')}. Sie werden nicht mehr.` },
      ],
    }, showTrue);
  } else if (kind === 3) {
    const m = rng.int(1, 9) * 100 + rng.pick([0, 50]);
    key = `claim-0km:${m}`;
    c = claimItem(rng, who.name, {
      lhs: q(m / 1000, 'km', 3),
      right: q(m, 'm'),
      wrongs: [
        { rhs: q(m / 10, 'm'), why: 'Bei Kilometern stehen 3 Stellen nach dem Komma für die Meter.' },
        { rhs: q(m * 10, 'm'), why: '1\u00A0km hat 1000\u00A0m. Weniger als 1\u00A0km sind auch weniger als 1000\u00A0m.' },
      ],
    }, showTrue);
  } else {
    const a = rng.int(2, 9);
    const b = rng.int(1, 9);
    key = `claim-mm:${a}:${b}`;
    c = claimItem(rng, who.name, {
      lhs: mixed(a, 'cm', b, 'mm'),
      right: q(a * 10 + b, 'mm'),
      wrongs: [
        { rhs: q(a * 100 + b, 'mm'), why: '1\u00A0cm hat 10\u00A0mm, nicht 100\u00A0mm.' },
        { rhs: q(a + b, 'mm'), why: 'Hier wurden die Zentimeter nicht in Millimeter umgewandelt.' },
      ],
    }, showTrue);
  }
  return build(laengenSkill, stufe, {
    key: `${key}:${c.isTrue ? 'w' : 'f'}`,
    ab: 3,
    context: c.context,
    prompt: c.prompt,
    answer: c.answer,
    hints: ['Rechne zuerst selbst. Vergleiche dann.', 'Denke an: 1\u00A0km = 1000\u00A0m, 1\u00A0m = 100\u00A0cm, 1\u00A0cm = 10\u00A0mm.'],
    steps: c.steps,
    praise: c.isTrue ? 'Du hast selbst nachgerechnet und richtig geprüft.' : 'Du hast den Umrechnungsfehler gefunden.',
    srText: c.srText,
    kmk: ['GM.einheiten', 'PK.argumentieren', 'ZO.kontrolle'],
  });
}

function weg(stufe: Stufe, rng: Rng): Exercise {
  const who = pickPerson(rng);
  const a = rng.int(1, 4);
  const b = rng.pick([50, 80, 200, 300, 450, 600, 750]);
  const total = a * 1000 + b;
  const gone = rng.int(4, Math.floor((total - 100) / 50)) * 50;
  const rest = total - gone;
  const place = rng.pick(['zum Sportplatz', 'zum See', 'zur Oma', 'zum Zoo', 'zur Bücherei', 'zum Schwimmbad']);
  const context = `Der Weg ${place} ist ${mixed(a, 'km', b, 'm')} lang. ${who.name} ist schon ${q(gone, 'm')} gegangen.`;
  return build(laengenSkill, stufe, {
    key: `weg:${total}:${gone}`,
    ab: 3,
    context,
    prompt: 'Wie viele Meter sind es noch?',
    emoji: '🚶',
    answer: { kind: 'number', value: rest, before: 'Es sind noch', after: 'm.', label: 'Restweg in Metern' },
    hints: safeHints(['Wandle zuerst den ganzen Weg in Meter um.', 'Ziehe dann ab, was schon gegangen ist.'], rest, 'Rechne in Metern.'),
    steps: [`${mixed(a, 'km', b, 'm')} = ${q(total, 'm')}`, `${fmt(total)} − ${fmt(gone)} = ${fmt(rest)}`, `Es sind noch ${q(rest, 'm')}.`],
    bugs: numberBugs(
      [
        b < 100 && Number(`${a}${b}`) > gone && { id: 'null-fehlt', match: Number(`${a}${b}`) - gone, hint: `${mixed(a, 'km', b, 'm')}: Bei ${q(b, 'm')} brauchst du eine 0 als Platzhalter.` },
        a * 100 + b > gone && { id: 'faktor-100', match: a * 100 + b - gone, hint: '1\u00A0km hat 1000\u00A0m, nicht 100\u00A0m.' },
        { id: 'addiert', match: total + gone, hint: `${who.name} ist schon ein Stück gegangen. Der Rest ist kürzer als der ganze Weg.` },
        { id: 'gegangen', match: gone, hint: 'Das ist der Teil, der schon geschafft ist. Gefragt ist der Rest.' },
      ],
      rest,
    ),
    praise: 'Du hast erst in Meter umgewandelt und dann abgezogen.',
    srText: `${speak(context)} Wie viele Meter sind es noch?`,
    kmk: ['GM.sachsituationen', 'GM.einheiten'],
  });
}

// ─── Skill ───────────────────────────────────────────────────────────────────

export const laengenSkill: SkillDef = {
  id: 'groessen.laengen',
  topicId: 'groessen',
  title: 'Längen',
  description: 'Du misst Längen und rechnest mm, cm, m und km um.',
  stufen: {
    1: 'Messen und Nachbar-Einheiten umwandeln',
    2: 'Gemischte Schreibweise und Meter mit Komma',
    3: 'Kilometer mit Komma, Fehler finden, Wege',
  },
  kmk: ['GM.einheiten', 'GM.vorstellung'],
  generate(rng, stufe) {
    if (stufe === 1) {
      if (rng.chance(0.25)) return ruler(1, rng);
      const pair = rng.pick(PAIRS);
      const n = simpleRange(pair, rng);
      return conv(1, rng.chance(0.5) ? convDown(pair[0], pair[1], n) : convUp(pair[0], pair[1], n), 1);
    }
    if (stufe === 2) {
      const v = rng.int(1, 6);
      if (v === 1) return ruler(2, rng);
      if (v === 2) {
        const pair = rng.pick(PAIRS);
        const f = pair[0] === 'cm' ? 10 : pair[0] === 'm' ? 100 : 1000;
        const a = rng.int(1, 9);
        const b = rng.chance(0.5) ? rng.int(1, Math.max(1, f / 10 - 1)) : rng.int(1, f - 1);
        return conv(2, mixedToSmall(pair[0], pair[1], a, b), 2);
      }
      if (v === 3) {
        const pair = rng.pick(PAIRS);
        const f = pair[0] === 'cm' ? 10 : pair[0] === 'm' ? 100 : 1000;
        const v2 = rng.int(1, 9) * f + (rng.chance(0.5) ? rng.int(1, Math.max(1, f / 10 - 1)) : rng.int(1, f - 1));
        return conv(2, smallToMixed(pair[0], pair[1], v2), 2);
      }
      if (v === 4) {
        const shown = rng.chance(0.4) ? 1 : 2;
        const x = shown === 1 ? rng.int(1, 9) + rng.int(1, 9) / 10 : rng.int(1, 9) + rng.int(1, 99) / 100;
        return conv(2, commaToSmall('m', 'cm', Math.round(x * 100) / 100, shown), 2);
      }
      if (v === 5) return conv(2, smallToComma('m', 'cm', rng.int(1, 9) * 100 + (rng.chance(0.4) ? rng.int(1, 9) : rng.int(10, 99))), 2);
      return conv(2, mixedToComma('m', 'cm', rng.int(1, 9), rng.chance(0.5) ? rng.int(1, 9) : rng.int(10, 99)), 2);
    }
    const v = rng.int(1, 5);
    if (v === 1) {
      const shown = rng.chance(0.4) ? 1 : 3;
      const x = shown === 1 ? rng.int(1, 9) + rng.int(1, 9) / 10 : rng.int(0, 9) + rng.int(1, 999) / 1000;
      return conv(3, commaToSmall('km', 'm', Math.round(x * 1000) / 1000, shown), 3 as const);
    }
    if (v === 2) return conv(3, smallToComma('km', 'm', rng.int(1, 9) * 1000 + (rng.chance(0.4) ? rng.int(1, 99) : rng.int(100, 999))), 2);
    if (v === 3) return claim(3, rng);
    if (v === 4) return ruler(3, rng);
    return weg(3, rng);
  },
};
