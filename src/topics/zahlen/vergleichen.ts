import { BOX, fmt, MINUS, PLUS, toSpeech } from '../../core/format';
import type { ChoiceAnswer, Exercise, PlaceColumn, Rng, SkillDef, Stufe } from '../../core/types';
import { bugList, choiceAnswer, columnsFor, digitAt, orderAnswer, PV, randomDigits, stelle, stufenschrift, stufenSpeech } from './shared';

const ID = 'zahlen.vergleichen';
const KMK = ['ZO.zahlraum'];

function base(stufe: Stufe, ab: 1 | 2 | 3, key: string) {
  return { key: `${ID}:${stufe}:${key}`, topicId: 'zahlen' as const, skillId: ID, stufe, ab, kmk: KMK };
}

type Rel = '<' | '=' | '>';
const relOf = (a: number, b: number): Rel => (a < b ? '<' : a > b ? '>' : '=');

/** How the right-hand side is written. */
export type Form = 'zahl' | 'zerlegung' | 'stufenschrift';

function written(n: number, form: Form): string {
  if (form === 'zahl') return fmt(n);
  if (form === 'stufenschrift') return stufenschrift(n);
  return columnsFor(n)
    .map((c) => digitAt(n, c) * PV[c])
    .filter((v) => v > 0)
    .map((v) => fmt(v))
    .join(` ${PLUS} `);
}

function spoken(n: number, form: Form): string {
  return form === 'zahl' ? String(n) : form === 'stufenschrift' ? stufenSpeech(n) : toSpeech(written(n, form));
}

/** First place (from the left) where a and b differ. */
function firstDiff(a: number, b: number): PlaceColumn | null {
  return columnsFor(Math.max(a, b)).find((k) => digitAt(a, k) !== digitAt(b, k)) ?? null;
}

export function symbole(a: number, b: number, form: Form, stufe: Stufe): Exercise {
  const rel = relOf(a, b);
  const left = fmt(a);
  const right = written(b, form);
  const sameLength = String(a).length === String(b).length;
  const diffAt = firstDiff(a, b);
  const why = (chosen: Rel): string => {
    if (chosen === '=') return 'Die beiden Seiten sind nicht gleich groß. Suche die Stelle, an der sie sich unterscheiden.';
    if (rel === '=') return form === 'zahl' ? 'Vergleiche Stelle für Stelle.' : 'Schreibe die rechte Seite als Zahl. Vergleiche dann.';
    if (form !== 'zahl') return 'Schreibe die rechte Seite zuerst als Zahl. Vergleiche dann Stelle für Stelle.';
    if (!sameLength) return 'Zähle zuerst die Stellen. Die Zahl mit mehr Stellen ist größer.';
    return `Vergleiche von links. Der erste Unterschied ist an der ${diffAt ? stelle(diffAt) : 'ersten Stelle'}.`;
  };
  // fixed order < = > so the symbols always sit in the same place
  const options = (['<', '=', '>'] as Rel[]).map((r) => (r === rel ? { label: r } : { label: r, whyWrong: why(r) }));
  const answer: ChoiceAnswer = { kind: 'choice', options, correct: options.findIndex((o) => o.label === rel), layout: 'symbols' };
  const b10 = form === 'zahl' ? '' : ` (${fmt(b)})`;
  return {
    ...base(stufe, stufe === 1 ? 1 : 2, `symbole:${a}:${b}:${form}`),
    prompt: 'Welches Zeichen passt: <, > oder =?',
    expression: `${left} ${BOX} ${right}`,
    answer,
    hints: form === 'zahl'
      ? ['Zähle zuerst die Stellen beider Zahlen.', 'Gleich viele Stellen? Vergleiche von links Ziffer für Ziffer.']
      : ['Schreibe die rechte Seite als Zahl.', 'Vergleiche dann Stelle für Stelle von links.'],
    steps: [
      ...(form === 'zahl' ? [] : [`${right} = ${fmt(b)}`]),
      !sameLength
        ? `${fmt(a)} hat ${String(a).length} Stellen, ${fmt(b)} hat ${String(b).length} Stellen.`
        : rel === '='
          ? 'Alle Stellen sind gleich.'
          : `Der erste Unterschied ist an der ${diffAt ? stelle(diffAt) : ''}: ${diffAt ? digitAt(a, diffAt) : ''} und ${diffAt ? digitAt(b, diffAt) : ''}.`,
      `${fmt(a)} ${rel} ${right}${b10}`,
    ],
    praise: !sameLength ? 'Du hast zuerst die Stellen gezählt.' : form === 'zahl' ? 'Du hast Stelle für Stelle von links verglichen.' : 'Du hast beide Seiten als Zahl geschrieben und verglichen.',
    srText: `Vergleiche ${a} und ${spoken(b, form)}. Welches Zeichen passt: kleiner als, größer als oder gleich?`,
  };
}

export function ordnen(rng: Rng, values: number[], direction: 'aufsteigend' | 'absteigend', stufe: Stufe): Exercise {
  const sorted = [...values].sort((x, y) => (direction === 'aufsteigend' ? x - y : y - x));
  const sign = direction === 'aufsteigend' ? '<' : '>';
  return {
    ...base(stufe, stufe === 1 ? 1 : 2, `ordnen:${[...values].sort((x, y) => x - y).join('-')}:${direction}`),
    prompt: direction === 'aufsteigend' ? 'Ordne die Zahlen. Beginne mit der kleinsten.' : 'Ordne die Zahlen. Beginne mit der größten.',
    answer: orderAnswer(rng, values, direction),
    hints: ['Zähle zuerst die Stellen. Mehr Stellen heißt größer.', 'Bei gleich vielen Stellen vergleichst du von links.'],
    steps: [`Geordnet: ${sorted.map((v) => fmt(v)).join(` ${sign} `)}`],
    praise: 'Du hast die Zahlen Stelle für Stelle verglichen und geordnet.',
    srText: `Ordne die Zahlen ${values.join(', ')} ${direction === 'aufsteigend' ? 'von der kleinsten zur größten' : 'von der größten zur kleinsten'}.`,
  };
}

/** Five different numbers made of the same six digits. */
function sameDigitNumbers(rng: Rng): number[] {
  const digits = rng.sample([0, 1, 2, 3, 4, 5, 6, 7, 8, 9], 6);
  const out = new Set<number>();
  while (out.size < 5) {
    const perm = rng.shuffle(digits);
    if (perm[0] === 0) continue;
    out.add(Number(perm.join('')));
  }
  return [...out];
}

// ─── Stufe 3 ─────────────────────────────────────────────────────────────────

export function naeher(rng: Rng, target: number, closer: number, farther: number): Exercise {
  const dc = Math.abs(target - closer);
  const df = Math.abs(target - farther);
  const nines = (x: number) => (String(x).match(/9/g) ?? []).length;
  // 'denn sie ist größer/kleiner' is only a wrong reason when the numbers lie on both sides of the target.
  // On the same side (both below 1 000 000) the bigger number really is closer, so that reason would be valid.
  const sameSide = (closer < target) === (farther < target);
  // A slipped place value in the distance (one zero too few or too many): right number, wrong reason.
  const slipped = dc % 10 === 0 ? dc / 10 : dc * 10;
  const wrong = [
    { label: `${fmt(farther)}, denn der Abstand zu ${fmt(target)} ist ${fmt(df)}.`, whyWrong: `Vergleiche die Abstände: ${fmt(df)} ist mehr als ${fmt(dc)}.` },
    sameSide
      ? {
          label: `${fmt(closer)}, denn der Abstand zu ${fmt(target)} ist nur ${fmt(slipped)}.`,
          whyWrong: `Die Zahl stimmt, aber der Abstand nicht. Rechne nach: ${fmt(Math.max(target, closer))} ${MINUS} ${fmt(Math.min(target, closer))} = ${fmt(dc)}.`,
        }
      : { label: `${fmt(closer)}, denn sie ist ${closer < farther ? 'kleiner' : 'größer'}.`, whyWrong: 'Die Zahl stimmt, aber die Begründung nicht. Es kommt auf den Abstand an.' },
  ];
  if (nines(farther) > nines(closer)) {
    wrong.push({ label: `${fmt(farther)}, denn sie hat mehr Neunen.`, whyWrong: `Viele Neunen bedeuten nicht, dass eine Zahl nah an ${fmt(target)} liegt. Rechne den Abstand aus.` });
  }
  const options = [closer, farther].sort((x, y) => x - y);
  return {
    ...base(3, 3, `naeher:${target}:${closer}:${farther}`),
    kmk: [...KMK, 'PK.argumentieren'],
    prompt: `Welche Zahl liegt näher an ${fmt(target)}? Wähle die Antwort mit der richtigen Begründung.`,
    expression: `${fmt(options[0])} oder ${fmt(options[1])}`,
    answer: choiceAnswer(rng, `${fmt(closer)}, denn der Abstand zu ${fmt(target)} ist nur ${fmt(dc)}.`, wrong),
    hints: [`Rechne für jede Zahl aus: Wie weit ist es bis ${fmt(target)}?`, 'Der kleinere Abstand gewinnt.'],
    steps: [
      `Abstand von ${fmt(closer)}: ${fmt(dc)}.`,
      `Abstand von ${fmt(farther)}: ${fmt(df)}.`,
      `${fmt(dc)} < ${fmt(df)}. Also liegt ${fmt(closer)} näher an ${fmt(target)}.`,
    ],
    praise: 'Du hast mit dem Abstand begründet.',
    srText: `Welche Zahl liegt näher an ${target}: ${options[0]} oder ${options[1]}? Wähle die Antwort mit der richtigen Begründung.`,
    knobel: true,
  };
}

export function ziffernZahl(digits: number[], want: 'groesste' | 'kleinste'): Exercise {
  const desc = [...digits].sort((a, b) => b - a);
  const asc = [...digits].sort((a, b) => a - b);
  const largest = Number(desc.join(''));
  let smallestDigits = asc;
  if (asc[0] === 0) {
    const firstNonZero = asc.findIndex((d) => d !== 0);
    smallestDigits = [asc[firstNonZero], ...asc.filter((_, i) => i !== firstNonZero)];
  }
  const smallest = Number(smallestDigits.join(''));
  const value = want === 'groesste' ? largest : smallest;
  const hasZero = digits.includes(0);
  return {
    ...base(3, 3, `ziffern:${digits.join('')}:${want}`),
    prompt: `Bilde aus den Ziffern die ${want === 'groesste' ? 'größte' : 'kleinste'} sechsstellige Zahl. Nimm jede Ziffer genau einmal.`,
    expression: digits.join(', '),
    answer: { kind: 'number', value, label: want === 'groesste' ? 'Größte Zahl' : 'Kleinste Zahl' },
    hints: want === 'groesste'
      ? ['Die größte Ziffer kommt ganz nach links.', 'Dann folgt die nächstkleinere Ziffer.']
      : ['Die kleinste Ziffer kommt nach links. Aber: Eine Zahl beginnt nie mit 0.', 'Dann folgen die übrigen Ziffern der Größe nach.'],
    steps: want === 'groesste'
      ? [`Ziffern von groß nach klein: ${desc.join(', ')}.`, `Die größte Zahl ist ${fmt(largest)}.`]
      : [
          `Ziffern von klein nach groß: ${asc.join(', ')}.`,
          ...(hasZero ? [`Die 0 darf nicht vorne stehen. Vorne steht die ${smallestDigits[0]}.`] : []),
          `Die kleinste Zahl ist ${fmt(smallest)}.`,
        ],
    bugs: bugList(value, want === 'groesste'
      ? [['kleinste-gebildet', smallest, 'Das ist die kleinste Zahl. Für die größte kommt die größte Ziffer nach vorne.']]
      : [
          ['null-vorne', hasZero ? Number(asc.join('')) : null, 'Eine Zahl beginnt nie mit 0. Deine Zahl ist nur fünfstellig.'],
          ['groesste-gebildet', largest, 'Das ist die größte Zahl. Für die kleinste kommt die kleinste Ziffer nach vorne.'],
        ]),
    praise: want === 'kleinste' && hasZero ? 'Du hast daran gedacht, dass die 0 nicht vorne stehen darf.' : 'Du hast die Ziffern nach ihrem Wert sortiert.',
    srText: `Bilde aus den Ziffern ${digits.join(', ')} die ${want === 'groesste' ? 'größte' : 'kleinste'} sechsstellige Zahl. Nimm jede Ziffer genau einmal.`,
    knobel: true,
  };
}

/** 'Stimmt das?' — a: shorter number with a big first digit, b: longer number with first digit 1. */
export function stimmtStellen(rng: Rng, a: number, b: number, claim: 'a' | 'b'): Exercise {
  const big = claim === 'a' ? a : b;
  const small = claim === 'a' ? b : a;
  const isTrue = big > small;
  const first = String(a)[0];
  const statement = claim === 'a' ? `${fmt(a)} ist größer als ${fmt(b)}, weil vorne eine ${first} steht.` : `${fmt(b)} ist größer als ${fmt(a)}, weil die Zahl mehr Stellen hat.`;
  const answer = isTrue
    ? choiceAnswer(rng, `Stimmt. ${fmt(b)} hat ${String(b).length} Stellen, ${fmt(a)} nur ${String(a).length}.`, [
        { label: `Stimmt nicht. Vorne bei ${fmt(a)} steht eine ${first}, das ist mehr als 1.`, whyWrong: 'Zähle zuerst die Stellen. Die erste Ziffer zählt erst bei gleich vielen Stellen.' },
        { label: 'Stimmt nicht. Die Zahlen sind gleich groß.', whyWrong: 'Die Zahlen sind verschieden. Zähle die Stellen.' },
      ])
    : choiceAnswer(rng, `Stimmt nicht. ${fmt(b)} hat mehr Stellen. Also ist ${fmt(b)} größer.`, [
        { label: `Stimmt. Eine ${first} vorne ist mehr als eine 1 vorne.`, whyWrong: 'Die erste Ziffer zählt erst, wenn beide Zahlen gleich viele Stellen haben.' },
        { label: `Stimmt. ${fmt(a)} hat mehr große Ziffern.`, whyWrong: 'Es kommt nicht auf die Menge großer Ziffern an. Zähle zuerst die Stellen.' },
      ]);
  return {
    ...base(3, 3, `stimmt:${a}:${b}:${claim}`),
    kmk: [...KMK, 'PK.argumentieren'],
    prompt: 'Stimmt das? Wähle die richtige Begründung.',
    context: `„${statement}“`,
    answer,
    hints: ['Zähle zuerst die Stellen der beiden Zahlen.', 'Mehr Stellen bedeutet: größere Zahl.'],
    steps: [`${fmt(a)} hat ${String(a).length} Stellen, ${fmt(b)} hat ${String(b).length} Stellen.`, `Also ist ${fmt(b)} größer.`, isTrue ? 'Die Aussage stimmt.' : 'Die Aussage stimmt nicht.'],
    praise: 'Du hast mit der Anzahl der Stellen begründet.',
    srText: `Stimmt das? ${toSpeech(statement)} Wähle die richtige Begründung.`,
    knobel: true,
  };
}

// ─── Generator ───────────────────────────────────────────────────────────────

/** b = a with one digit changed (same length). */
function changeOneDigit(rng: Rng, a: number): number {
  const cols = columnsFor(a);
  for (;;) {
    const c = rng.pick(cols);
    const d = digitAt(a, c);
    const nd = rng.int(c === cols[0] ? 1 : 0, 9);
    if (nd !== d) return a + (nd - d) * PV[c];
  }
}

function pair(rng: Rng, stufe: Stufe): [number, number, Form] {
  const len = stufe === 1 ? 5 : 6;
  const type = rng.pick(['laenge', 'stelle', 'stelle', 'tausch', 'term'] as const);
  if (type === 'laenge') {
    const short = Number(String(rng.int(6, 9)) + String(randomDigits(rng, len - 1, 1)).slice(1));
    const long = Number('1' + String(randomDigits(rng, len, 1)).slice(1));
    const fixed = stufe === 2 && rng.chance(0.3) ? [99_999, 100_000] : [short, long];
    return rng.chance(0.5) ? [fixed[0], fixed[1], 'zahl'] : [fixed[1], fixed[0], 'zahl'];
  }
  const a = randomDigits(rng, len, rng.int(0, stufe === 1 ? 1 : 2));
  if (type === 'stelle') return [a, changeOneDigit(rng, a), 'zahl'];
  if (type === 'tausch') {
    const s = String(a).split('');
    const i = rng.int(1, s.length - 2);
    [s[i], s[i + 1]] = [s[i + 1], s[i]];
    const b = Number(s.join(''));
    return [a, b === a ? changeOneDigit(rng, a) : b, 'zahl'];
  }
  const b = rng.chance(0.5) ? a : changeOneDigit(rng, a);
  return [a, b, stufe === 1 ? 'zerlegung' : rng.pick(['zerlegung', 'stufenschrift'] as Form[])];
}

function generate(rng: Rng, stufe: Stufe): Exercise {
  if (stufe === 1 || stufe === 2) {
    if (rng.chance(0.3)) {
      if (stufe === 1) {
        const values = new Set<number>();
        while (values.size < 4) values.add(randomDigits(rng, rng.int(4, 5), rng.int(0, 1)));
        return ordnen(rng, [...values], 'aufsteigend', 1);
      }
      return ordnen(rng, sameDigitNumbers(rng), rng.chance(0.5) ? 'aufsteigend' : 'absteigend', 2);
    }
    const [a, b, form] = pair(rng, stufe);
    return symbole(a, b, form, stufe);
  }
  const v = rng.pick(['naeher', 'ziffern', 'stimmt'] as const);
  if (v === 'naeher') {
    if (rng.chance(0.5)) {
      const closer = 1_000_000 - rng.int(1, 9) * 10_000;
      const farther = rng.pick([899_999, 889_999, 799_999, 898_999, 899_899, 699_999]);
      return naeher(rng, 1_000_000, closer, farther);
    }
    const target = rng.pick([100_000, 500_000]);
    const dc = rng.int(2, 40) * (target / 100);
    const df = dc + rng.int(1, 10) * (target / 100);
    const below = rng.chance(0.5);
    return naeher(rng, target, below ? target - dc : target + dc, below ? target + df : target - df);
  }
  if (v === 'ziffern') {
    const digits = rng.chance(0.7) ? [0, ...rng.sample([1, 2, 3, 4, 5, 6, 7, 8, 9], 5)] : rng.sample([1, 2, 3, 4, 5, 6, 7, 8, 9], 6);
    return ziffernZahl(rng.shuffle(digits), rng.chance(0.6) ? 'kleinste' : 'groesste');
  }
  const len = rng.int(4, 5);
  const a = Number(String(rng.int(7, 9)) + String(randomDigits(rng, len, 0)).slice(1));
  const b = Number('1' + String(randomDigits(rng, len + 1, 1)).slice(1));
  return stimmtStellen(rng, a, b, rng.chance(0.5) ? 'a' : 'b');
}

export const vergleichenSkill: SkillDef = {
  id: ID,
  topicId: 'zahlen',
  title: 'Vergleichen und Ordnen',
  description: 'Du vergleichst große Zahlen mit <, > und = und ordnest sie.',
  stufen: {
    1: 'Zahlen bis 100 000 vergleichen und ordnen',
    2: 'Sechsstellige Zahlen, gleiche Ziffern ordnen',
    3: 'Näher an 1 000 000? Größte Zahl bilden, begründen',
  },
  kmk: KMK,
  generate,
};
