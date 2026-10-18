import type { Exercise, Rng, SkillDef, Stufe, Visual } from '../../core/types';
import { bugList, joinDe } from './shared';

const ID = 'zahlen.binaer';
const KMK = ['ZO.stellenwert', 'MS.muster'];
const CARDS = [16, 8, 4, 2, 1];

function base(stufe: Stufe, ab: 1 | 2 | 3, key: string) {
  return { key: `${ID}:${stufe}:${key}`, topicId: 'zahlen' as const, skillId: ID, stufe, ab, kmk: KMK };
}

/** Bits for 16, 8, 4, 2, 1. */
export function bitsOf(n: number): number[] {
  return CARDS.map((c) => (Math.floor(n / c) % 2 === 1 ? 1 : 0));
}

const valueOf = (bits: number[]) => bits.reduce((s, b, i) => s + b * CARDS[i], 0);

function cardsVisual(bits: number[]): Visual {
  return {
    type: 'table',
    caption: 'Bit-Kärtchen: 1 = Karte liegt offen, 0 = Karte ist umgedreht',
    header: CARDS.map((c) => (c === 1 ? '1 Punkt' : `${c} Punkte`)),
    rows: [bits.map(String)],
  };
}

const openCards = (bits: number[]) => CARDS.filter((_, i) => bits[i] === 1);

export function lesen(n: number): Exercise {
  const bits = bitsOf(n);
  const open = openCards(bits);
  const reversed = valueOf([...bits].reverse());
  const asDecimal = Number(bits.join(''));
  return {
    ...base(1, 1, `lesen:${n}`),
    prompt: 'Welche Zahl zeigen die Bit-Kärtchen?',
    visual: cardsVisual(bits),
    answer: { kind: 'number', value: n, label: 'Zahl' },
    hints: ['Nur die offenen Karten zählen.', 'Addiere die Punkte der offenen Karten.'],
    steps: [`Offen sind die Karten ${joinDe(open.map(String))}.`, `${open.join(' + ')} = ${n}`],
    bugs: bugList(n, [
      ['karten-gezaehlt', open.length, 'Du hast die offenen Karten gezählt. Addiere ihre Punkte.'],
      ['umgedreht', reversed, 'Die Karte ganz links hat 16 Punkte. Die Karte ganz rechts hat 1 Punkt.'],
      ['ziffern-gelesen', asDecimal <= 1_000_000 ? asDecimal : null, 'Die Ziffern 1 und 0 zeigen nur, ob eine Karte offen ist. Addiere die Punkte.'],
    ]),
    praise: 'Du hast die Punkte der offenen Karten addiert.',
    srText: `Bit-Kärtchen mit 16, 8, 4, 2 und 1 Punkt. Offen sind die Karten ${joinDe(open.map(String))}. Welche Zahl zeigen sie?`,
  };
}

export function legen(n: number): Exercise {
  const bits = bitsOf(n);
  const open = openCards(bits);
  const fields = CARDS.map((c, i) => ({ id: `k${c}`, value: bits[i], before: `${c}:`, label: `Karte ${c}` }));
  const rev = [...bits].reverse();
  return {
    ...base(2, 2, `legen:${n}`),
    prompt: 'Lege die Zahl mit Bit-Kärtchen. Schreibe 1 für offen und 0 für umgedreht.',
    expression: String(n),
    answer: { kind: 'multi', fields },
    hints: ['Beginne mit der größten Karte, die noch passt.', 'Ziehe ihre Punkte ab und mache mit dem Rest weiter.'],
    steps: [...open.map((c, i) => `${c} passt${i === 0 ? '' : ' in den Rest'}: Karte ${c} ist offen.`), `${open.join(' + ')} = ${n}`],
    bugs: bugList(Object.fromEntries(fields.map((f) => [f.id, f.value])), [
      ['umgedreht', Object.fromEntries(fields.map((f, i) => [f.id, rev[i]])), 'Die Karte ganz links hat 16 Punkte. Die Karte ganz rechts hat 1 Punkt.'],
    ]),
    praise: 'Du hast immer die größte passende Karte zuerst genommen.',
    srText: `Lege die Zahl ${n} mit Bit-Kärtchen 16, 8, 4, 2 und 1. Schreibe für jede Karte 1 für offen oder 0 für umgedreht.`,
  };
}

export function knobel(kind: 'anzahl' | 'dazu' | 'groesste', n: number, extra: number): Exercise {
  if (kind === 'anzahl') {
    const open = openCards(bitsOf(n));
    return {
      ...base(3, 2, `anzahl:${n}`),
      prompt: `Wie viele Karten sind offen, wenn du ${n} mit Bit-Kärtchen legst?`,
      // a label instead of the unit 'Karten', so the shown solution also reads well for 1 card
      answer: { kind: 'number', value: open.length, before: 'Offene Karten:', label: 'Anzahl offene Karten' },
      hints: ['Lege die Zahl zuerst: größte passende Karte zuerst.', 'Zähle dann die offenen Karten.'],
      steps: [`${n} = ${open.join(' + ')}`, open.length === 1 ? 'Es ist 1 Karte offen.' : `Es sind ${open.length} Karten offen.`],
      bugs: bugList(open.length, [['nur-groesste', 1, 'Eine Karte reicht nicht. Lege auch den Rest mit Karten.']]),
      praise: 'Du hast die Zahl erst gelegt und dann gezählt.',
      srText: `Wie viele Karten sind offen, wenn du ${n} mit den Bit-Kärtchen 16, 8, 4, 2 und 1 legst?`,
      knobel: true,
    };
  }
  if (kind === 'dazu') {
    const value = n + extra;
    return {
      ...base(3, 3, `dazu:${n}:${extra}`),
      // 'umgedreht' means face down (caption), so the card is 'aufgedeckt', not 'umgedreht'
      prompt: `Die Karten zeigen ${n}. Du deckst zusätzlich die Karte ${extra} auf. Welche Zahl entsteht?`,
      visual: cardsVisual(bitsOf(n)),
      answer: { kind: 'number', value, label: 'Neue Zahl' },
      hints: ['Die Karte war vorher umgedreht. Jetzt ist sie offen.', 'Ihre Punkte kommen dazu.'],
      steps: [`${n} + ${extra} = ${value}`],
      bugs: bugList(value, [['eins-dazu', n + 1, `Die Karte hat ${extra} Punkte, nicht 1.`]]),
      praise: 'Du hast erkannt, wie viel eine Karte wert ist.',
      srText: `Die Bit-Kärtchen zeigen ${n}. Du deckst zusätzlich die Karte mit ${extra} ${extra === 1 ? 'Punkt' : 'Punkten'} auf. Welche Zahl entsteht?`,
      knobel: true,
    };
  }
  const cards = CARDS.slice(CARDS.length - n);
  const value = cards.reduce((s, c) => s + c, 0);
  return {
    ...base(3, 3, `groesste:${n}`),
    prompt: `Du hast nur die ${n} Karten ${joinDe([...cards].reverse().map(String))}. Was ist die größte Zahl, die du legen kannst?`,
    answer: { kind: 'number', value, label: 'Größte Zahl' },
    hints: ['Für die größte Zahl liegen alle Karten offen.', 'Addiere alle Punkte.'],
    steps: [`${[...cards].reverse().join(' + ')} = ${value}`, `Die größte Zahl ist ${value}. Sie ist 1 weniger als die nächste Karte ${value + 1}.`],
    bugs: bugList(value, [['naechste-karte', value + 1, 'Für diese Zahl brauchst du schon die nächste Karte. Addiere nur die Karten, die du hast.']]),
    praise: 'Du hast alle Karten aufgedeckt und addiert.',
    srText: `Du hast nur die ${n} Bit-Kärtchen ${[...cards].reverse().join(', ')}. Was ist die größte Zahl, die du legen kannst?`,
    knobel: true,
  };
}

function generate(rng: Rng, stufe: Stufe): Exercise {
  if (stufe === 1) {
    let n = rng.int(3, 31);
    while (bitsOf(n).filter(Boolean).length < 2 || bitsOf(n).filter(Boolean).length > 3) n = rng.int(3, 31);
    return lesen(n);
  }
  if (stufe === 2) return legen(rng.int(1, 31));
  const kind = rng.pick(['anzahl', 'dazu', 'dazu', 'groesste'] as const);
  if (kind === 'groesste') return knobel('groesste', rng.int(3, 5), 0);
  const n = rng.int(kind === 'anzahl' ? 5 : 1, 30);
  const closed = CARDS.filter((_, i) => bitsOf(n)[i] === 0);
  return knobel(kind, n, closed.length ? rng.pick(closed) : 1);
}

export const binaerSkill: SkillDef = {
  id: ID,
  topicId: 'zahlen',
  title: 'Binärzahlen',
  description: 'Du legst Zahlen bis 31 mit fünf Bit-Kärtchen.',
  stufen: {
    1: 'Zahlen von den Bit-Kärtchen ablesen',
    2: 'Zahlen bis 31 mit Bit-Kärtchen legen',
    3: 'Knobeln mit Bit-Kärtchen',
  },
  kmk: KMK,
  optional: 'nrw',
  generate,
};
