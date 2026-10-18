import { BOX, fmt, MINUS, NBSP, PLUS } from '../../core/format';
import type { Exercise, PlaceColumn, Rng, SkillDef, Stufe, Visual } from '../../core/types';
import {
  biggerCol,
  bugList,
  choiceAnswer,
  COLUMNS,
  columnsFor,
  digitAt,
  dropZeros,
  joinDe,
  PLACE_NAME,
  placeWord,
  PV,
  randomDigits,
  smallerCol,
  stelle,
  stufenschrift,
  stufenSpeech,
} from './shared';

const ID = 'zahlen.stellenwert';
const KMK = ['ZO.stellenwert', 'PK.darstellen'];
const SIX: PlaceColumn[] = ['HT', 'ZT', 'T', 'H', 'Z', 'E'];

function base(stufe: Stufe, ab: 1 | 2 | 3, key: string) {
  return { key: `${ID}:${stufe}:${key}`, topicId: 'zahlen' as const, skillId: ID, stufe, ab, kmk: KMK };
}

/** Stellenwerttafel visual. emptyZeros: internal zeros are shown as empty cells. */
export function tafel(n: number, cols: PlaceColumn[], mode: 'digits' | 'tokens', emptyZeros = false): Visual {
  const lead = String(n).length;
  const values = cols.map((c) => {
    const i = COLUMNS.length - 1 - COLUMNS.indexOf(c); // 0 = E
    if (i >= lead) return null;
    const d = digitAt(n, c);
    if (mode === 'tokens') return d === 0 ? null : d;
    return d === 0 && emptyZeros ? null : d;
  });
  return { type: 'placeValue', columns: cols, rows: [{ values }], mode };
}

/** Spoken table, matching what tafel() draws: an empty cell is 'leer', a drawn 0 is '0'. */
export function tafelSpeech(n: number, cols: PlaceColumn[], mode: 'digits' | 'tokens', emptyZeros = false): string {
  return cols
    .map((c) => {
      const inNumber = String(n).length > COLUMNS.length - 1 - COLUMNS.indexOf(c);
      const d = inNumber ? digitAt(n, c) : 0;
      if (mode === 'tokens') return `${PLACE_NAME[c]}: ${d} Plättchen`;
      return `${PLACE_NAME[c]}: ${!inNumber || (d === 0 && emptyZeros) ? 'leer' : d}`;
    })
    .join(', ');
}

/** Zerlegung in Stellenwerte: [40 000, 5 000, 300, 2]. */
function parts(n: number): number[] {
  return columnsFor(n)
    .map((c) => digitAt(n, c) * PV[c])
    .filter((v) => v > 0);
}

// ─── Stufe 1 ─────────────────────────────────────────────────────────────────

export function tafelZuZahl(n: number, stufe: Stufe, emptyZeros: boolean): Exercise {
  const cols = stufe === 1 ? columnsFor(n) : SIX;
  const hasZero = String(n).includes('0');
  return {
    ...base(stufe, stufe === 1 ? 1 : 2, `tafel:${n}:${emptyZeros ? 'leer' : 'null'}`),
    prompt: 'Welche Zahl steht in der Stellenwerttafel?',
    visual: tafel(n, cols, 'digits', emptyZeros),
    answer: { kind: 'number', value: n, label: 'Zahl' },
    hints: [
      'Lies die Ziffern von links nach rechts.',
      emptyZeros ? 'Ein leeres Feld bedeutet: 0 an dieser Stelle.' : 'Auch eine 0 schreibst du in der Zahl mit.',
    ],
    steps: [
      `In der Tafel steht: ${cols.map((c) => `${c} ${digitAt(n, c)}`).join(', ')}.`,
      ...(emptyZeros && hasZero ? ['Für jedes leere Feld schreibst du eine 0.'] : []),
      `Die Zahl heißt ${fmt(n)}.`,
    ],
    bugs: bugList(n, [['null-vergessen', hasZero ? dropZeros(n) : null, 'Schau auf die Stellen ohne Ziffer: Dort gehört eine 0 hin.']]),
    praise: hasZero ? 'Du hast an die Null in der Tafel gedacht.' : 'Du hast jede Ziffer an ihre Stelle geschrieben.',
    srText: `Stellenwerttafel. ${tafelSpeech(n, cols, 'digits', emptyZeros)}. Welche Zahl ist das?`,
  };
}

export function zifferAnStelle(n: number, c: PlaceColumn): Exercise {
  const d = digitAt(n, c);
  const left = biggerCol(c);
  const right = smallerCol(c);
  const cols = columnsFor(n);
  const pos = cols.length - cols.indexOf(c);
  return {
    ...base(1, 1, `ziffer:${n}:${c}`),
    prompt: `Welche Ziffer steht an der ${stelle(c)}?`,
    expression: fmt(n),
    answer: { kind: 'number', value: d, label: 'Ziffer' },
    hints: ['Zähle die Stellen von rechts: Einer, Zehner, Hunderter …', `Die ${stelle(c)} ist die ${pos}. Stelle von rechts.`],
    steps: [
      `Von rechts: ${[...cols].reverse().map((k) => `${k} = ${digitAt(n, k)}`).join(', ')}.`,
      `An der ${stelle(c)} steht die ${d}.`,
    ],
    bugs: bugList(d, [
      ['stelle-links', left && cols.includes(left) ? digitAt(n, left) : null, `Das ist die Ziffer an der ${left ? stelle(left) : ''}. Zähle noch einmal von rechts.`],
      ['stelle-rechts', right ? digitAt(n, right) : null, `Das ist die Ziffer an der ${right ? stelle(right) : ''}. Zähle noch einmal von rechts.`],
    ]),
    praise: 'Du hast die Stellen von rechts richtig abgezählt.',
    srText: `Welche Ziffer steht in der Zahl ${n} an der ${stelle(c)}?`,
  };
}

export function stufenschriftZuZahl(n: number): Exercise {
  const missing = columnsFor(n).filter((c) => digitAt(n, c) === 0);
  return {
    ...base(1, 1, `stufenschrift:${n}`),
    prompt: 'Schreibe die Zahl mit Ziffern.',
    expression: `${stufenschrift(n)} = ${BOX}`,
    answer: { kind: 'number', value: n, label: 'Zahl' },
    hints: [
      'Schreibe zu jeder Stelle die passende Ziffer.',
      missing.length > 0 ? 'Fehlt eine Stelle? Dann schreibst du dort eine 0.' : 'Beginne mit der größten Stelle.',
    ],
    steps: [
      `${stufenschrift(n)} heißt: ${stufenSpeech(n)}.`,
      ...(missing.length > 0 ? [`Es fehlen ${joinDe(missing.map((c) => PLACE_NAME[c]))}. Dort steht eine 0.`] : []),
      `Die Zahl heißt ${fmt(n)}.`,
    ],
    bugs: bugList(n, [
      ['null-vergessen', missing.length > 0 ? dropZeros(n) : null, `Hier fehlen ${joinDe(missing.map((c) => PLACE_NAME[c]))}. Schreibe dort eine 0.`],
    ]),
    praise: missing.length > 0 ? 'Du hast die fehlenden Stellen mit 0 aufgefüllt.' : 'Du hast jede Stufe richtig übersetzt.',
    srText: `${stufenSpeech(n)}. Welche Zahl ist das?`,
  };
}

export function zerlegungZuZahl(n: number, stufe: Stufe, order: number[]): Exercise {
  const ps = parts(n);
  const shown = order.map((i) => ps[i]);
  const expr = `${shown.map((v) => fmt(v)).join(` ${PLUS} `)} = ${BOX}`;
  const hasZero = String(n).includes('0');
  return {
    ...base(stufe, stufe === 1 ? 1 : 2, `zerlegung:${n}:${order.join('')}`),
    prompt: 'Welche Zahl ist das?',
    expression: expr,
    answer: { kind: 'number', value: n, label: 'Zahl' },
    hints: ['Ordne die Zahlen nach ihrem Stellenwert, die größte zuerst.', 'Jede Stelle bekommt eine Ziffer. Fehlt eine Stelle, schreibst du 0.'],
    steps: [
      `Geordnet: ${ps.map((v) => fmt(v)).join(` ${PLUS} `)}.`,
      `Das sind ${stufenSpeech(n)}.`,
      `Die Zahl heißt ${fmt(n)}.`,
    ],
    bugs: bugList(n, [['null-vergessen', hasZero ? dropZeros(n) : null, 'Schau, welche Stellen fehlen. Dort steht in der Zahl eine 0.']]),
    praise: 'Du hast die Teile nach ihrem Stellenwert geordnet.',
    srText: `${shown.join(' plus ')}. Welche Zahl ist das?`,
  };
}

export function zahlInTafel(n: number): Exercise {
  const cols = columnsFor(n);
  return {
    ...base(1, 1, `eintragen:${n}`),
    prompt: 'Trage die Zahl in die Stellenwerttafel ein. In jedes Feld kommt eine Ziffer.',
    expression: fmt(n),
    answer: {
      kind: 'multi',
      fields: cols.map((c) => ({ id: c, value: digitAt(n, c), before: c, label: PLACE_NAME[c] })),
    },
    hints: ['Beginne rechts bei den Einern.', 'Gehe dann nach links: Zehner, Hunderter, Tausender …'],
    steps: [...[...cols].reverse().map((c) => `${PLACE_NAME[c]}: ${digitAt(n, c)}`), `So steht ${fmt(n)} in der Tafel.`],
    praise: 'Du hast jede Ziffer in die richtige Spalte geschrieben.',
    srText: `Trage die Zahl ${n} in die Stellenwerttafel ein. Felder: ${cols.map((c) => PLACE_NAME[c]).join(', ')}.`,
  };
}

// ─── Stufe 2 ─────────────────────────────────────────────────────────────────

export function durcheinander(n: number, order: number[]): Exercise {
  const cols = columnsFor(n).filter((c) => digitAt(n, c) !== 0);
  const shown = order.map((i) => cols[i]);
  const expr = `${shown.map((c) => `${digitAt(n, c)}${NBSP}${c}`).join(` ${PLUS} `)} = ${BOX}`;
  const asShown = Number(shown.map((c) => digitAt(n, c)).join(''));
  return {
    ...base(2, 2, `durcheinander:${n}:${order.join('')}`),
    prompt: 'Welche Zahl ist das? Achte auf die Stellen.',
    expression: expr,
    answer: { kind: 'number', value: n, label: 'Zahl' },
    hints: ['Die Teile sind durcheinander. Ordne sie: HT, ZT, T, H, Z, E.', 'Fehlt eine Stelle, schreibst du dort eine 0.'],
    steps: [`Geordnet: ${stufenschrift(n)}.`, `Das sind ${stufenSpeech(n)}.`, `Die Zahl heißt ${fmt(n)}.`],
    bugs: bugList(n, [
      ['reihenfolge', asShown, 'Du hast die Ziffern in der gezeigten Reihenfolge geschrieben. Ordne sie zuerst nach ihren Stellen.'],
      ['null-vergessen', dropZeros(n), 'Fast: Es fehlen Nullen. Schreibe an jede leere Stelle eine 0.'],
    ]),
    praise: 'Du hast die Teile nach Stellen geordnet und an die Nullen gedacht.',
    srText: `${shown.map((c) => `${digitAt(n, c)} ${PLACE_NAME[c]}`).join(' plus ')}. Welche Zahl ist das?`,
  };
}

/** Add one Plättchen to column c. */
export function plaettchenDazu(n: number, c: PlaceColumn): Exercise {
  const result = n + PV[c];
  const left = biggerCol(c);
  const right = smallerCol(c);
  return {
    ...base(2, 2, `dazu:${n}:${c}`),
    prompt: `Lege ein Plättchen in die Spalte ${c} dazu. Wie heißt die neue Zahl?`,
    visual: tafel(n, SIX, 'tokens'),
    answer: { kind: 'number', value: result, label: 'Neue Zahl' },
    hints: ['Lies zuerst die Zahl in der Tafel.', `Ein Plättchen in der Spalte ${c} ist ${fmt(PV[c])} wert.`],
    steps: [
      `Die Tafel zeigt ${fmt(n)}.`,
      `Ein Plättchen mehr bei den ${PLACE_NAME[c]}n: ${fmt(n)} ${PLUS} ${fmt(PV[c])}.`,
      `Die neue Zahl heißt ${fmt(result)}.`,
    ],
    bugs: bugList(result, [
      ['falsche-spalte-links', left && left !== 'M' ? n + PV[left] : null, `Das Plättchen liegt in der Spalte ${c}, nicht in ${left ?? ''}. Es ist ${fmt(PV[c])} wert.`],
      ['falsche-spalte-rechts', right ? n + PV[right] : null, `Das Plättchen liegt in der Spalte ${c}, nicht in ${right ?? ''}. Es ist ${fmt(PV[c])} wert.`],
      ['unveraendert', n, 'Das ist die Zahl vor dem neuen Plättchen. Zähle das Plättchen dazu.'],
    ]),
    praise: `Du hast erkannt: Ein Plättchen bei ${c} ist ${fmt(PV[c])} wert.`,
    srText: `Stellenwerttafel mit Plättchen. ${tafelSpeech(n, SIX, 'tokens')}. Lege ein Plättchen bei den ${PLACE_NAME[c]}n dazu. Wie heißt die neue Zahl?`,
  };
}

/** Move one Plättchen from column `from` to column `to`. ask 'neu' = new number, 'diff' = change. */
export function plaettchenSchieben(n: number, from: PlaceColumn, to: PlaceColumn, ask: 'neu' | 'diff'): Exercise {
  const result = n - PV[from] + PV[to];
  const up = PV[to] > PV[from];
  const diff = Math.abs(PV[to] - PV[from]);
  const word = up ? 'größer' : 'kleiner';
  const common = {
    ...base(2, 2, `schieben:${n}:${from}:${to}:${ask}`),
    visual: tafel(n, SIX, 'tokens'),
    hints: [
      `Ein Plättchen fehlt danach bei ${from}: ${MINUS} ${fmt(PV[from])}.`,
      `Ein Plättchen kommt neu zu ${to}: ${PLUS} ${fmt(PV[to])}.`,
    ],
    praise: 'Du hast beides beachtet: das Plättchen, das weggeht, und das, das dazukommt.',
  };
  if (ask === 'neu') {
    return {
      ...common,
      prompt: `Verschiebe ein Plättchen von ${from} nach ${to}. Wie heißt die neue Zahl?`,
      answer: { kind: 'number', value: result, label: 'Neue Zahl' },
      steps: [
        `Die Tafel zeigt ${fmt(n)}.`,
        `Bei ${from} fehlt jetzt ${fmt(PV[from])}, bei ${to} kommt ${fmt(PV[to])} dazu.`,
        `${fmt(n)} ${MINUS} ${fmt(PV[from])} ${PLUS} ${fmt(PV[to])} = ${fmt(result)}`,
        `Die neue Zahl heißt ${fmt(result)}.`,
      ],
      bugs: bugList(result, [
        ['nur-dazu', n + PV[to], `Du hast das Plättchen bei ${to} dazugezählt. Bei ${from} fehlt jetzt aber eins.`],
        ['nur-weg', n - PV[from], `Du hast das Plättchen bei ${from} weggenommen. Es liegt jetzt bei ${to}.`],
      ]),
      srText: `Stellenwerttafel mit Plättchen. ${tafelSpeech(n, SIX, 'tokens')}. Verschiebe ein Plättchen von den ${PLACE_NAME[from]}n zu den ${PLACE_NAME[to]}n. Wie heißt die neue Zahl?`,
    };
  }
  return {
    ...common,
    prompt: `Verschiebe ein Plättchen von ${from} nach ${to}. Um wie viel wird die Zahl ${word}?`,
    answer: { kind: 'number', value: diff, before: 'Die Zahl wird um', after: `${word}.`, label: 'Unterschied' },
    steps: [
      `Bei ${from} fehlt ${fmt(PV[from])}, bei ${to} kommt ${fmt(PV[to])} dazu.`,
      up ? `${fmt(PV[to])} ${MINUS} ${fmt(PV[from])} = ${fmt(diff)}` : `${fmt(PV[from])} ${MINUS} ${fmt(PV[to])} = ${fmt(diff)}`,
      `Die Zahl wird um ${fmt(diff)} ${word}.`,
    ],
    bugs: bugList(diff, [
      ['nur-neues', PV[to], `Bei ${from} fehlt jetzt ein Plättchen. Ziehe seinen Wert ab.`],
      ['nur-altes', PV[from], `Bei ${to} kommt ein Plättchen dazu. Rechne mit beiden Werten.`],
      ['addiert', PV[to] + PV[from], 'Ein Plättchen geht weg, eins kommt dazu. Rechne den Unterschied mit Minus.'],
    ]),
    srText: `Stellenwerttafel mit Plättchen. ${tafelSpeech(n, SIX, 'tokens')}. Verschiebe ein Plättchen von den ${PLACE_NAME[from]}n zu den ${PLACE_NAME[to]}n. Um wie viel wird die Zahl ${word}?`,
  };
}


export function wertDerZiffer(n: number, c: PlaceColumn): Exercise {
  const d = digitAt(n, c);
  const v = d * PV[c];
  return {
    ...base(2, 2, `wert:${n}:${c}`),
    prompt: `Welchen Wert hat die Ziffer ${d} in dieser Zahl?`,
    expression: fmt(n),
    answer: { kind: 'number', value: v, label: 'Wert' },
    hints: [`An welcher Stelle steht die ${d}?`, 'Eine Ziffer ist so viel wert, wie ihre Stelle sagt.'],
    steps: [`Die ${d} steht an der ${stelle(c)}.`, `${d} ${placeWord(c, d)} sind ${fmt(v)}.`, `Die Ziffer ${d} hat den Wert ${fmt(v)}.`],
    bugs: bugList(v, [
      ['nur-ziffer', d, 'Die Ziffer allein ist nicht ihr Wert. Schau, an welcher Stelle sie steht.'],
      ['stelle-zu-gross', v * 10 <= 1_000_000 ? v * 10 : null, 'Zähle die Stellen noch einmal von rechts ab.'],
      ['stelle-zu-klein', c !== 'E' ? v / 10 : null, 'Zähle die Stellen noch einmal von rechts ab.'],
    ]),
    praise: `Du hast an der Stelle erkannt, was die ${d} wert ist.`,
    srText: `Welchen Wert hat die Ziffer ${d} in der Zahl ${n}?`,
  };
}

// ─── Stufe 3 ─────────────────────────────────────────────────────────────────

/** Largest number with k Plättchen in HT..E, at most `limit` per column (null = no limit). */
export function groesstePlaettchen(k: number, limit: number | null): number {
  let rest = k;
  let n = 0;
  for (const c of SIX) {
    const put = Math.min(rest, limit ?? 9);
    n += put * PV[c];
    rest -= put;
  }
  return n;
}

/** Smallest six-digit number with k Plättchen, at most `limit` per column. */
export function kleinstePlaettchen(k: number, limit: number | null): number {
  let rest = k - 1;
  let n = PV.HT;
  for (const c of [...SIX].reverse()) {
    const room = (limit ?? 9) - (c === 'HT' ? 1 : 0);
    const put = Math.min(rest, room);
    n += put * PV[c];
    rest -= put;
  }
  return n;
}

export function plaettchenRaetsel(k: number, limit: number | null, want: 'groesste' | 'kleinste'): Exercise {
  const value = want === 'groesste' ? groesstePlaettchen(k, limit) : kleinstePlaettchen(k, limit);
  const rule = limit ? ` In jede Spalte dürfen höchstens ${limit} Plättchen.` : '';
  const task = want === 'groesste' ? 'Lege die größte Zahl.' : 'Lege die kleinste sechsstellige Zahl.';
  const prompt = `Du hast ${k} Plättchen und die Spalten HT bis E. ${task}${rule}`;
  // screen readers would spell 'HT' letter by letter
  const srText = `Du hast ${k} Plättchen und die Spalten Hunderttausender bis Einer. ${task}${rule}`;
  const steps =
    want === 'groesste'
      ? [
          'Plättchen ganz links sind am meisten wert.',
          limit ? `Lege in jede Spalte von links so viele wie erlaubt: höchstens ${limit}.` : 'Lege also alle Plättchen in die Spalte HT.',
          `Die größte Zahl heißt ${fmt(value)}.`,
        ]
      : [
          'Sechsstellig heißt: In der Spalte HT muss mindestens ein Plättchen liegen.',
          'Die übrigen Plättchen legst du möglichst weit nach rechts, zuerst zu den Einern.',
          `Die kleinste sechsstellige Zahl heißt ${fmt(value)}.`,
        ];
  const candidates: [string, number | null, string][] =
    want === 'groesste'
      ? [
          ['regel-vergessen', limit && k > limit ? k * PV.HT : null, `Denk an die Regel: höchstens ${limit ?? 0} Plättchen pro Spalte.`],
        ]
      : [
          ['nicht-sechsstellig', k, 'Die Zahl soll sechsstellig sein. Ein Plättchen muss in die Spalte HT.'],
          ['regel-vergessen', limit && k - 1 > limit ? PV.HT + (k - 1) : null, `Denk an die Regel: höchstens ${limit ?? 0} Plättchen pro Spalte.`],
          ['zu-weit-links', !limit || k - 1 <= limit ? PV.HT + (k - 1) * 10 : null, 'Lege die übrigen Plättchen ganz nach rechts zu den Einern.'],
        ];
  return {
    ...base(3, 3, `raetsel:${want}:${k}:${limit ?? 0}`),
    prompt,
    answer: { kind: 'number', value, label: want === 'groesste' ? 'Größte Zahl' : 'Kleinste Zahl' },
    hints:
      want === 'groesste'
        ? ['Welche Spalte ist am meisten wert?', 'Fülle die Spalten von links nach rechts.']
        : ['Damit die Zahl sechsstellig ist, brauchst du ein Plättchen bei HT.', 'Plättchen ganz rechts sind am wenigsten wert.'],
    steps,
    bugs: bugList(value, candidates),
    praise: want === 'groesste' ? 'Du hast die Plättchen dorthin gelegt, wo sie am meisten wert sind.' : 'Du hast an die Bedingung sechsstellig gedacht und die übrigen Plättchen nach rechts gelegt.',
    srText,
    knobel: true,
  };
}

export function plaettchenAnzahl(n: number): Exercise {
  const sum = String(n).split('').reduce((s, d) => s + Number(d), 0);
  const nonzero = String(n).replace(/0/g, '').length;
  return {
    ...base(3, 2, `anzahl:${n}`),
    prompt: 'Wie viele Plättchen brauchst du, um diese Zahl in die Stellenwerttafel zu legen?',
    expression: fmt(n),
    answer: { kind: 'number', value: sum, unit: 'Plättchen', label: 'Anzahl Plättchen' },
    hints: ['Jede Ziffer sagt, wie viele Plättchen in ihre Spalte kommen.', 'Zähle alle Ziffern zusammen.'],
    steps: [
      `${stufenschrift(n)}`,
      `${String(n).split('').filter((d) => d !== '0').join(` ${PLUS} `)} = ${sum}`,
      `Du brauchst ${sum} Plättchen.`,
    ],
    bugs: bugList(sum, [
      ['spalten-gezaehlt', nonzero, 'Du hast die Spalten gezählt. In eine Spalte kommen so viele Plättchen, wie die Ziffer sagt.'],
      ['stellen-gezaehlt', String(n).length, 'Du hast die Stellen gezählt. Zähle die Ziffern zusammen.'],
    ]),
    praise: 'Du hast die Ziffern als Anzahl der Plättchen genutzt.',
    srText: `Wie viele Plättchen brauchst du für die Zahl ${n}?`,
  };
}

/** 'Stimmt das?' about the value of a digit. claimedCol = col whose value is claimed. */
export function stimmtDas(rng: Rng, n: number, c: PlaceColumn, claimedCol: PlaceColumn): Exercise {
  const d = digitAt(n, c);
  const real = d * PV[c];
  const claimed = d * PV[claimedCol];
  const isTrue = c === claimedCol;
  const countHint = 'Zähle die Stellen von rechts ab: E, Z, H, T, ZT, HT.';
  // 'hat immer den Wert d' is only a clearly wrong reason when neither the digit nor the claim is at the Einerstelle;
  // otherwise its value d is true (or is the claim itself), so a wrong place value is offered instead.
  const faceValue =
    c === 'E' || claimedCol === 'E'
      ? { label: `Stimmt nicht. Die ${d} hat den Wert ${fmt(d * PV[c === 'E' ? 'H' : (biggerCol(c) as PlaceColumn)])}.`, whyWrong: countHint }
      : { label: `Stimmt nicht. Die Ziffer ${d} hat immer den Wert ${d}.`, whyWrong: 'Der Wert einer Ziffer hängt von ihrer Stelle ab.' };
  const answer = isTrue
    ? choiceAnswer(rng, `Stimmt. Die ${d} steht an der ${stelle(c)}.`, [
        { label: `Stimmt nicht. Die ${d} hat den Wert ${fmt(d * PV[c === 'E' ? 'Z' : (smallerCol(c) as PlaceColumn)])}.`, whyWrong: countHint },
        faceValue,
      ])
    : choiceAnswer(rng, `Stimmt nicht. Die ${d} steht an der ${stelle(c)}. Sie hat den Wert ${fmt(real)}.`, [
        { label: `Stimmt. Die ${d} steht an der ${stelle(claimedCol)}.`, whyWrong: countHint },
        faceValue,
      ]);
  const statement = `In ${fmt(n)} hat die Ziffer ${d} den Wert ${fmt(claimed)}.`;
  return {
    ...base(3, 3, `stimmt:${n}:${c}:${claimedCol}`),
    kmk: [...KMK, 'PK.argumentieren'],
    prompt: `Stimmt das? Wähle die richtige Begründung.`,
    context: `„${statement}“`,
    answer,
    hints: [`An welcher Stelle steht die ${d}?`, 'Zähle die Stellen von rechts: E, Z, H, T, ZT, HT.'],
    steps: [`Die ${d} steht an der ${stelle(c)}.`, `Ihr Wert ist ${fmt(real)}.`, isTrue ? 'Die Aussage stimmt.' : 'Die Aussage stimmt nicht.'],
    praise: 'Du hast deine Antwort mit der Stelle der Ziffer begründet.',
    srText: `Stimmt das? ${statement.replace(/\u202F/g, '')} Wähle die richtige Begründung.`,
    knobel: true,
  };
}

// ─── Generator ───────────────────────────────────────────────────────────────

function shuffledOrder(rng: Rng, len: number): number[] {
  const idx = Array.from({ length: len }, (_, i) => i);
  let order = rng.shuffle(idx);
  if (order.every((v, i) => v === i)) order = [...order.slice(1), order[0]];
  return order;
}

/** Digit that occurs exactly once (non-zero); returns its column or null. minPlace: smallest allowed place value. */
function uniqueDigitCol(rng: Rng, n: number, minPlace = 1): PlaceColumn | null {
  const cols = columnsFor(n).filter((c) => {
    if (PV[c] < minPlace) return false;
    const d = digitAt(n, c);
    return d !== 0 && String(n).split('').filter((x) => Number(x) === d).length === 1;
  });
  return cols.length ? rng.pick(cols) : null;
}

function generate(rng: Rng, stufe: Stufe): Exercise {
  if (stufe === 1) {
    const n = randomDigits(rng, rng.int(4, 5), rng.int(0, 1));
    const v = rng.pick(['tafel', 'ziffer', 'stufenschrift', 'zerlegung', 'eintragen'] as const);
    if (v === 'tafel') return tafelZuZahl(n, 1, false);
    if (v === 'ziffer') return zifferAnStelle(n, rng.pick(columnsFor(n)));
    if (v === 'stufenschrift') return stufenschriftZuZahl(randomDigits(rng, rng.int(4, 5), rng.int(0, 2)));
    if (v === 'zerlegung') return zerlegungZuZahl(n, 1, parts(n).map((_, i) => i));
    return zahlInTafel(n);
  }
  if (stufe === 2) {
    const n = randomDigits(rng, 6, rng.int(1, 3));
    const v = rng.pick(['tafel', 'durcheinander', 'zerlegung', 'dazu', 'schieben', 'wert'] as const);
    if (v === 'tafel') return tafelZuZahl(n, 2, true);
    if (v === 'durcheinander') return durcheinander(n, shuffledOrder(rng, parts(n).length));
    if (v === 'zerlegung') return zerlegungZuZahl(n, 2, shuffledOrder(rng, parts(n).length));
    if (v === 'dazu') {
      const cols = SIX.filter((c) => digitAt(n, c) < 9);
      return plaettchenDazu(n, rng.pick(cols.length ? cols : ['E']));
    }
    if (v === 'schieben') {
      const from = rng.pick(SIX.filter((c) => digitAt(n, c) > 0));
      const to = rng.pick(SIX.filter((c) => c !== from && digitAt(n, c) < 9 && (c !== 'HT' || digitAt(n, 'HT') < 9)));
      return plaettchenSchieben(n, from, to, rng.chance(0.5) ? 'neu' : 'diff');
    }
    const c = uniqueDigitCol(rng, n, 100);
    return c ? wertDerZiffer(n, c) : tafelZuZahl(n, 2, true);
  }
  const v = rng.pick(['groesste', 'kleinste', 'anzahl', 'stimmt', 'stimmt'] as const);
  if (v === 'groesste') {
    const limit = rng.pick([2, 3, 4]);
    return plaettchenRaetsel(rng.int(limit + 1, 9), limit, 'groesste');
  }
  if (v === 'kleinste') {
    const limit = rng.chance(0.5) ? null : rng.pick([2, 3]);
    return plaettchenRaetsel(rng.int(limit ? limit + 2 : 3, 9), limit, 'kleinste');
  }
  const zeros = rng.int(0, 2);
  let n = randomDigits(rng, 6, zeros);
  if (v === 'anzahl') return plaettchenAnzahl(n);
  // Stimmt-das: digit and claim never at the Einerstelle (there 'die Ziffer hat den Wert d' would be true)
  for (let i = 0; i < 20 && uniqueDigitCol(rng, n, 10) === null; i++) n = randomDigits(rng, 6, zeros);
  const c = uniqueDigitCol(rng, n, 10) ?? 'HT';
  const neighbours = [biggerCol(c), smallerCol(c)].filter((x): x is PlaceColumn => x !== null && x !== 'M' && x !== 'E');
  const claimed = rng.chance(0.5) ? c : rng.pick(neighbours);
  return stimmtDas(rng, n, c, claimed);
}

export const stellenwertSkill: SkillDef = {
  id: ID,
  topicId: 'zahlen',
  title: 'Stellenwerttafel',
  description: 'Du liest und schreibst große Zahlen mit der Stellenwerttafel.',
  stufen: {
    1: 'Zahlen bis 100 000 lesen und eintragen',
    2: 'Sechsstellige Zahlen mit Nullen, Plättchen legen und verschieben',
    3: 'Plättchen-Rätsel und Stimmt-das-Aufgaben',
  },
  kmk: KMK,
  generate,
};
