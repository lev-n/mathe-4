import { BOX, fmt, PLUS } from '../../core/format';
import type { Exercise, PlaceColumn, Rng, SkillDef, Stufe } from '../../core/types';
import { bugList, choiceAnswer, digitAt, PLACE_NAME, placeWord, PV, randomDigits, stelle } from './shared';

const ID = 'zahlen.buendeln';
const KMK = ['ZO.stellenwert'];

function base(stufe: Stufe, ab: 1 | 2 | 3, key: string) {
  return { key: `${ID}:${stufe}:${key}`, topicId: 'zahlen' as const, skillId: ID, stufe, ab, kmk: KMK };
}

/** '14 Z = □ H □ Z' — big is the next bigger column of small. */
export function zerlegen(k: number, small: PlaceColumn, big: PlaceColumn, stufe: Stufe): Exercise {
  const g = Math.floor(k / 10);
  const r = k % 10;
  return {
    ...base(stufe, stufe === 1 ? 1 : 2, `zerlegen:${k}:${small}`),
    prompt: 'Bündle. Wie viele sind es?',
    expression: `${k} ${small} = ${BOX} ${big} ${BOX} ${small}`,
    answer: {
      kind: 'multi',
      fields: [
        { id: 'gross', value: g, after: big, label: PLACE_NAME[big] },
        { id: 'klein', value: r, after: small, label: PLACE_NAME[small] },
      ],
    },
    hints: [`Je 10 ${PLACE_NAME[small]} sind 1 ${PLACE_NAME[big]}.`, `Wie viele volle Zehnerbündel stecken in ${k} ${small}?`],
    steps: [`10 ${small} = 1 ${big}`, `${k} ${small} = ${g} · 10 ${small} ${PLUS} ${r} ${small}`, `Also: ${k} ${small} = ${g} ${big} ${r} ${small}.`],
    bugs: bugList({ gross: g, klein: r }, [
      ['vertauscht', { gross: r, klein: g }, `Die Zehnerbündel werden zu ${big}. Was übrig bleibt, bleibt bei ${small}.`],
    ]),
    praise: 'Du hast immer 10 zu einem Bündel zusammengefasst.',
    srText: `${k} ${PLACE_NAME[small]} sind wie viele ${PLACE_NAME[big]} und wie viele ${PLACE_NAME[small]}?`,
  };
}

/** a big = □ small (umrechnen in kleinere Einheit) or value = □ unit. */
export function umrechnen(amount: number, from: PlaceColumn | null, to: PlaceColumn, stufe: Stufe): Exercise {
  const total = from ? amount * PV[from] : amount;
  const value = total / PV[to];
  const left = from ? `${amount} ${from}` : fmt(amount);
  const ratio = from ? PV[from] / PV[to] : null;
  return {
    ...base(stufe, stufe === 1 ? 1 : 2, `umrechnen:${amount}:${from ?? 'zahl'}:${to}`),
    prompt: `Wie viele ${PLACE_NAME[to]} sind das?`,
    expression: `${left} = ${BOX} ${to}`,
    answer: { kind: 'number', value, unit: to, label: `Anzahl ${PLACE_NAME[to]}` },
    hints: from
      ? [`Wie viele ${PLACE_NAME[to]} sind 1 ${from}?`, 'Jede Stelle nach links ist 10-mal so viel wert.']
      : [`Überlege zuerst: Wie viel ist 1 ${to} wert?`, 'Lass dann so viele Nullen weg, wie dieser Stellenwert hat.'],
    steps: from
      ? [`1 ${from} = ${fmt(ratio ?? 1)} ${to}`, `${amount} ${from} = ${amount} · ${fmt(ratio ?? 1)} ${to} = ${fmt(value)} ${to}`]
      : [`1 ${to} = ${fmt(PV[to])}`, `${fmt(amount)} : ${fmt(PV[to])} = ${fmt(value)}`, `Also: ${fmt(amount)} = ${fmt(value)} ${to}.`],
    bugs: bugList(value, [
      ['eine-stelle-zu-viel', value * 10, 'Das ist eine Stelle zu viel. Prüfe, wie viele Nullen dazugehören.'],
      ['eine-stelle-zu-wenig', value % 10 === 0 ? value / 10 : null, 'Da fehlt eine Stelle. Prüfe, wie viele Nullen dazugehören.'],
    ]),
    praise: 'Du hast beim Umrechnen die Stellen richtig gezählt.',
    srText: `${from ? `${amount} ${PLACE_NAME[from]}` : String(amount)} sind wie viele ${PLACE_NAME[to]}?`,
  };
}

/** '2T 13H 5Z = □' with at least one count ≥ 10. cols = three neighbouring columns, counts per column. */
export function gemischt(counts: number[], cols: PlaceColumn[]): Exercise {
  const value = counts.reduce((s, c, i) => s + c * PV[cols[i]], 0);
  const lowestZeros = String(PV[cols[cols.length - 1]]).length - 1;
  const concat = Number(counts.join('') + '0'.repeat(lowestZeros));
  const expr = `${counts.map((c, i) => `${c}${cols[i]}`).join(' ')} = ${BOX}`;
  return {
    ...base(2, 2, `gemischt:${counts.join('-')}:${cols.join('')}`),
    prompt: 'Welche Zahl ist das? Bündle, wo es nötig ist.',
    expression: expr,
    answer: { kind: 'number', value, label: 'Zahl' },
    hints: ['Mehr als 9 an einer Stelle? Dann bündelst du: 10 davon sind 1 der nächsten Stelle.', 'Du kannst auch jeden Teil ausrechnen und addieren.'],
    steps: [
      ...counts.map((c, i) => `${c} ${cols[i]} = ${fmt(c * PV[cols[i]])}`),
      `${counts.map((c, i) => fmt(c * PV[cols[i]])).join(` ${PLUS} `)} = ${fmt(value)}`,
    ],
    bugs: bugList(value, [['abgeschrieben', concat, 'Du hast die Zahlen nur aneinandergehängt. Bei mehr als 9 an einer Stelle musst du bündeln.']]),
    praise: 'Du hast gebündelt, wo mehr als 9 an einer Stelle standen.',
    srText: `${counts.map((c, i) => `${c} ${PLACE_NAME[cols[i]]}`).join(', ')}. Welche Zahl ist das?`,
  };
}

/** 'Wie viele Hunderter hat 345 678 insgesamt?' */
export function insgesamt(n: number, unit: PlaceColumn): Exercise {
  const value = Math.floor(n / PV[unit]);
  return {
    ...base(3, 2, `insgesamt:${n}:${unit}`),
    prompt: `Wie viele ${PLACE_NAME[unit]} hat diese Zahl insgesamt?`,
    expression: fmt(n),
    answer: { kind: 'number', value, unit, label: `Anzahl ${PLACE_NAME[unit]}` },
    hints: [`Nicht nur die Ziffer an der ${stelle(unit)} zählt.`, `Auch in den größeren Stellen stecken ${PLACE_NAME[unit]}. Lass die Stellen rechts von ${unit} weg.`],
    steps: [
      `An der ${stelle(unit)} steht nur die ${digitAt(n, unit)}.`,
      `Alle Stellen ab ${unit} nach links zusammen: ${fmt(value)}.`,
      `${fmt(n)} hat insgesamt ${fmt(value)} ${PLACE_NAME[unit]}.`,
    ],
    bugs: bugList(value, [
      ['nur-ziffer', digitAt(n, unit), `Die ${digitAt(n, unit)} zeigt nur die einzelnen ${PLACE_NAME[unit]}. Zähle auch die, die in den größeren Stellen stecken.`],
      ['falsche-stelle', Math.floor(n / (PV[unit] * 10)), 'Prüfe, an welcher Stelle du abschneidest.'],
    ]),
    praise: 'Du hast den Unterschied zwischen Ziffer und Anzahl erkannt.',
    srText: `Wie viele ${PLACE_NAME[unit]} hat die Zahl ${n} insgesamt?`,
  };
}

const PACKS = [
  { size: 10, place: 'In einer Bonbonfabrik', thing: 'Bonbons', pack: 'Tüten', emoji: '🍬', verb: 'werden in Tüten zu je 10 Stück gefüllt' },
  { size: 100, place: 'In einem Lager', thing: 'Schrauben', pack: 'Schachteln', emoji: '🔩', verb: 'werden in Schachteln zu je 100 Stück gepackt' },
  { size: 1000, place: 'In einer Druckerei', thing: 'Eintrittskarten', pack: 'Rollen', emoji: '🎟️', verb: 'werden auf Rollen zu je 1000 Stück gewickelt' },
  { size: 100, place: 'In einer Druckerei', thing: 'Briefmarken', pack: 'Bögen', emoji: '📮', verb: 'werden auf Bögen zu je 100 Stück gedruckt' },
] as const;

export function sachBuendeln(n: number, packIndex: number): Exercise {
  const p = PACKS[packIndex];
  const value = Math.floor(n / p.size);
  const rest = n % p.size;
  return {
    ...base(3, 2, `sach:${n}:${packIndex}`),
    kmk: [...KMK, 'ZO.sachrechnen'],
    prompt: `Wie viele ${p.pack} werden voll?`,
    context: `${p.place} gibt es ${fmt(n)} ${p.thing}. Sie ${p.verb}.`,
    emoji: p.emoji,
    answer: { kind: 'number', value, before: 'Es werden', after: `${p.pack} voll.`, label: `Anzahl volle ${p.pack}` },
    hints: [`${p.size} ${p.thing} sind ein Bündel.`, `Wie viele ${p.size === 10 ? 'Zehner' : p.size === 100 ? 'Hunderter' : 'Tausender'} stecken in der Zahl?`],
    steps: [
      `Je ${p.size} ${p.thing} füllen eine Packung.`,
      `${fmt(n)} hat ${fmt(value)} ${p.size === 10 ? 'Zehner' : p.size === 100 ? 'Hunderter' : 'Tausender'}${rest > 0 ? ` und ${fmt(rest)} übrig` : ''}.`,
      `Es werden ${fmt(value)} ${p.pack} voll.`,
    ],
    bugs: bugList(value, [
      ['aufgerundet', rest > 0 ? value + 1 : null, `Nur volle ${p.pack} zählen. Die übrigen ${fmt(rest)} ${p.thing} reichen nicht für eine weitere.`],
      ['nur-ziffer', digitAt(n, p.size === 10 ? 'Z' : p.size === 100 ? 'H' : 'T'), 'Das ist nur eine Ziffer. Zähle alle Bündel, auch die in den größeren Stellen.'],
    ]),
    praise: 'Du hast gebündelt und nur die vollen Packungen gezählt.',
    srText: `${p.place} gibt es ${n} ${p.thing}. Sie ${p.verb}. Wie viele ${p.pack} werden voll?`,
  };
}

/** 'Stimmt das? 35 H sind mehr als 3 T.' */
export function stimmtVergleich(rng: Rng, a: number, small: PlaceColumn, b: number, big: PlaceColumn): Exercise {
  const va = a * PV[small];
  const vb = b * PV[big];
  const isTrue = va > vb;
  const statement = `${a} ${small} sind mehr als ${b} ${big}.`;
  const reason = `${a} ${small} = ${fmt(va)} und ${b} ${big} = ${fmt(vb)}.`;
  const answer = choiceAnswer(rng, `${isTrue ? 'Stimmt' : 'Stimmt nicht'}, denn ${reason}`, [
    isTrue
      ? { label: `Stimmt nicht, denn ${big} sind immer mehr wert als ${small}.`, whyWrong: 'Es kommt auch auf die Anzahl an. Rechne beide Seiten in Zahlen um.' }
      : { label: `Stimmt, denn ${a} ist mehr als ${b}.`, whyWrong: 'Es kommt auch darauf an, was eine Stelle wert ist. Rechne beide Seiten in Zahlen um.' },
    {
      label: isTrue ? `Stimmt nicht, denn ${a} ${small} = ${fmt(va / 10)}.` : `Stimmt, denn ${a} ${small} = ${fmt(va * 10)}.`,
      whyWrong: `1 ${small} ist ${fmt(PV[small])} wert. Rechne ${a} · ${fmt(PV[small])}.`,
    },
  ]);
  return {
    ...base(3, 3, `stimmt:${a}:${small}:${b}:${big}`),
    kmk: [...KMK, 'PK.argumentieren'],
    prompt: 'Stimmt das? Wähle die richtige Begründung.',
    context: `„${statement}“`,
    answer,
    hints: ['Rechne beide Seiten in eine Zahl um.', `1 ${small} = ${fmt(PV[small])}, 1 ${big} = ${fmt(PV[big])}.`],
    steps: [reason, isTrue ? `${fmt(va)} ist mehr als ${fmt(vb)}. Die Aussage stimmt.` : `${fmt(va)} ist nicht mehr als ${fmt(vb)}. Die Aussage stimmt nicht.`],
    praise: 'Du hast beide Seiten umgerechnet und dann verglichen.',
    srText: `Stimmt das? ${a} ${PLACE_NAME[small]} sind mehr als ${b} ${placeWord(big, b)}. Wähle die richtige Begründung.`,
    knobel: true,
  };
}

// ─── Generator ───────────────────────────────────────────────────────────────

const PAIRS_1: [PlaceColumn, PlaceColumn][] = [['Z', 'H'], ['H', 'T']];
const PAIRS_2: [PlaceColumn, PlaceColumn][] = [['H', 'T'], ['T', 'ZT'], ['ZT', 'HT']];
const CONVERT_1: [PlaceColumn, PlaceColumn][] = [['T', 'H'], ['T', 'Z'], ['H', 'Z'], ['H', 'E'], ['T', 'E']];
const CONVERT_2: [PlaceColumn, PlaceColumn][] = [['HT', 'T'], ['ZT', 'H'], ['HT', 'H'], ['ZT', 'T'], ['HT', 'ZT'], ['ZT', 'Z']];

function generate(rng: Rng, stufe: Stufe): Exercise {
  if (stufe === 1) {
    const v = rng.pick(['zerlegen', 'umrechnen', 'zahl'] as const);
    if (v === 'zerlegen') {
      const [small, big] = rng.pick(PAIRS_1);
      return zerlegen(rng.int(11, 99), small, big, 1);
    }
    if (v === 'umrechnen') {
      const [from, to] = rng.pick(CONVERT_1);
      return umrechnen(rng.int(1, 9), from, to, 1);
    }
    const to = rng.pick(['H', 'Z'] as PlaceColumn[]);
    return umrechnen(rng.int(1, 9) * 1000, null, to, 1);
  }
  if (stufe === 2) {
    const v = rng.pick(['zerlegen', 'umrechnen', 'zahl', 'gemischt', 'gemischt'] as const);
    if (v === 'zerlegen') {
      const [small, big] = rng.pick(PAIRS_2);
      return zerlegen(rng.int(11, 99), small, big, 2);
    }
    if (v === 'umrechnen') {
      const [from, to] = rng.pick(CONVERT_2);
      return umrechnen(rng.int(1, 9), from, to, 2);
    }
    if (v === 'zahl') {
      const [unit, to] = rng.pick([[10_000, 'H'], [100_000, 'T'], [1_000_000, 'T'], [1_000_000, 'ZT'], [100_000, 'H']] as [number, PlaceColumn][]);
      return umrechnen(unit === 1_000_000 ? unit : rng.int(1, 9) * unit, null, to, 2);
    }
    const cols = rng.pick([['T', 'H', 'Z'], ['ZT', 'T', 'H'], ['HT', 'ZT', 'T']] as PlaceColumn[][]);
    const counts = [rng.int(1, 8), rng.int(0, 19), rng.int(0, 19)];
    if (counts[1] < 10 && counts[2] < 10) counts[rng.int(1, 2)] += 10;
    // stay in the Zahlenraum bis 1 000 000 (8 HT 19 ZT 19 T would be 1 009 000)
    const rest = counts[1] * PV[cols[1]] + counts[2] * PV[cols[2]];
    counts[0] = Math.min(counts[0], Math.floor((1_000_000 - rest) / PV[cols[0]]));
    return gemischt(counts, cols);
  }
  const v = rng.pick(['insgesamt', 'insgesamt', 'sach', 'stimmt'] as const);
  if (v === 'insgesamt') return insgesamt(randomDigits(rng, 6, rng.int(0, 2)), rng.pick(['Z', 'H', 'T', 'ZT'] as PlaceColumn[]));
  if (v === 'sach') {
    const i = rng.int(0, PACKS.length - 1);
    return sachBuendeln(randomDigits(rng, rng.int(4, 6), rng.int(0, 1)), i);
  }
  const [small, big] = rng.pick([['H', 'T'], ['Z', 'H'], ['T', 'ZT'], ['H', 'ZT']] as [PlaceColumn, PlaceColumn][]);
  const ratio = PV[big] / PV[small];
  const b = rng.int(2, 9);
  // a around b·ratio so both answers are plausible, never equal
  let a = b * ratio + rng.pick([-1, 1]) * rng.int(1, Math.min(9, ratio - 1)) * (ratio > 10 ? 10 : 1);
  if (a === b * ratio) a += 1;
  if (a > 999) a = b * ratio - 1;
  return stimmtVergleich(rng, a, small, b, big);
}

export const buendelnSkill: SkillDef = {
  id: ID,
  topicId: 'zahlen',
  title: 'Bündeln und Entbündeln',
  description: 'Du bündelst je 10 zu einer größeren Stelle und rechnest Stellenwerte um.',
  stufen: {
    1: '14 Z = 1 H 4 Z und 1000 = 10 H',
    2: 'Bündeln bis zur Million, gemischte Stellen',
    3: 'Wie viele insgesamt? Sachaufgaben und Stimmt das?',
  },
  kmk: KMK,
  generate,
};
