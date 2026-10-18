import { fmt } from '../../core/format';
import type { Exercise, PlaceColumn, Rng, SkillDef, Stufe } from '../../core/types';
import { biggerCol, bugList, choiceAnswer, floorTo, nachbar, nachbarDativ, PLACE_NAME, PV, randomDigits, roundTo, smallerCol, type WrongOption } from './shared';

const ID = 'zahlen.nachbarzahlen';
const KMK = ['ZO.zahlraum'];

function base(stufe: Stufe, ab: 1 | 2 | 3, key: string) {
  return { key: `${ID}:${stufe}:${key}`, topicId: 'zahlen' as const, skillId: ID, stufe, ab, kmk: KMK };
}

function trailing(n: number, digit: string): number {
  const m = String(n).match(new RegExp(`${digit}+$`));
  return m ? m[0].length : 0;
}

export function vorNach(n: number, which: 'vorgaenger' | 'nachfolger', stufe: Stufe): Exercise {
  const value = which === 'vorgaenger' ? n - 1 : n + 1;
  const name = which === 'vorgaenger' ? 'Vorgänger' : 'Nachfolger';
  const z = which === 'vorgaenger' ? trailing(n, '0') : trailing(n, '9');
  const crossing = z > 0;
  const carryBug = crossing ? (which === 'vorgaenger' ? value + 10 ** z : value - 10 ** z) : null;
  return {
    ...base(stufe, stufe === 1 ? 1 : 2, `${which}:${n}`),
    prompt: `Wie heißt der ${name} dieser Zahl?`,
    expression: fmt(n),
    answer: { kind: 'number', value, label: name },
    hints: [
      which === 'vorgaenger' ? 'Der Vorgänger ist um 1 kleiner.' : 'Der Nachfolger ist um 1 größer.',
      crossing ? (which === 'vorgaenger' ? 'Bei den Nullen musst du entbündeln.' : 'Bei den Neunen gibt es einen Übertrag.') : 'Nur die Einerstelle ändert sich.',
    ],
    steps: [
      `${fmt(n)} ${which === 'vorgaenger' ? '−' : '+'} 1 = ${fmt(value)}`,
      ...(crossing ? [which === 'vorgaenger' ? 'Aus den Nullen werden Neunen, und die Ziffer davor wird um 1 kleiner.' : 'Aus den Neunen werden Nullen, und die Ziffer davor wird um 1 größer.'] : []),
      `Der ${name} von ${fmt(n)} ist ${fmt(value)}.`,
    ],
    bugs: bugList(value, [
      ['verwechselt', which === 'vorgaenger' ? n + 1 : n - 1, which === 'vorgaenger' ? 'Das ist der Nachfolger. Der Vorgänger kommt direkt vor der Zahl.' : 'Das ist der Vorgänger. Der Nachfolger kommt direkt nach der Zahl.'],
      ['uebergang', carryBug, 'Beim Übergang ändert sich auch die Ziffer links von den Nullen oder Neunen.'],
    ]),
    praise: crossing ? 'Du hast beim Übergang an alle Stellen gedacht.' : `Du weißt, wo der ${name} steht.`,
    srText: `Wie heißt der ${name} von ${n}?`,
  };
}

/** '□ < 4 567 < □' with Nachbar-p. */
export function nachbarn(n: number, c: PlaceColumn, stufe: Stufe): Exercise {
  const p = PV[c];
  const lo = floorTo(n, p);
  const hi = lo + p;
  const name = nachbar(c);
  const small = smallerCol(c);
  const big = biggerCol(c);
  const wrong = (col: PlaceColumn | null) => (col && col !== 'M' && n % PV[col] !== 0 ? { u: floorTo(n, PV[col]), o: floorTo(n, PV[col]) + PV[col] } : null);
  return {
    ...base(stufe, stufe === 1 ? 1 : 2, `nachbarn:${n}:${c}`),
    prompt: `Wie heißen die ${name}?`,
    answer: {
      kind: 'multi',
      fields: [
        { id: 'u', value: lo, after: `< ${fmt(n)} <`, label: `kleinerer ${name}` },
        { id: 'o', value: hi, label: `größerer ${name}` },
      ],
    },
    hints: [c === 'Z' ? 'Nachbarzehner haben an der Einerstelle eine 0.' : `${name} haben an allen Stellen rechts von ${c} eine 0.`, `Schau auf die ${PLACE_NAME[c]}: Welcher ${PLACE_NAME[c]} kommt davor, welcher danach?`],
    steps: [
      `Ersetze alle Ziffern rechts von der ${c}-Stelle durch 0: ${fmt(lo)}.`,
      `Der nächste ${PLACE_NAME[c]} ist ${fmt(lo)} + ${fmt(p)} = ${fmt(hi)}.`,
      `${fmt(lo)} < ${fmt(n)} < ${fmt(hi)}`,
    ],
    bugs: bugList({ u: lo, o: hi }, [
      ['vorgaenger-nachfolger', { u: n - 1, o: n + 1 }, `Das sind Vorgänger und Nachfolger. Gesucht sind die ${name}.`],
      ['stelle-zu-klein', wrong(small), `Das sind die ${small ? nachbar(small) : ''}. Gesucht sind die ${name}.`],
      ['stelle-zu-gross', wrong(big), `Das sind die ${big ? nachbar(big) : ''}. Gesucht sind die ${name}.`],
    ]),
    praise: `Du hast die ${name} an der ${c}-Stelle gefunden.`,
    srText: `Wie heißen die ${name} von ${n}? Der kleinere zuerst, dann der größere.`,
  };
}

// ─── Stufe 3 ─────────────────────────────────────────────────────────────────

export function raetselVorNach(v: number, given: 'vorgaenger' | 'nachfolger'): Exercise {
  const n = given === 'vorgaenger' ? v + 1 : v - 1;
  const value = given === 'vorgaenger' ? n + 1 : n - 1;
  const ask = given === 'vorgaenger' ? 'Nachfolger' : 'Vorgänger';
  return {
    ...base(3, 3, `raetsel:${v}:${given}`),
    prompt: `Der ${given === 'vorgaenger' ? 'Vorgänger' : 'Nachfolger'} einer Zahl ist ${fmt(v)}. Wie heißt ihr ${ask}?`,
    answer: { kind: 'number', value, label: ask },
    hints: ['Finde zuerst die gesuchte Zahl selbst.', `Bestimme dann ihren ${ask}.`],
    steps: [`Die Zahl ist ${fmt(v)} ${given === 'vorgaenger' ? '+' : '−'} 1 = ${fmt(n)}.`, `Ihr ${ask} ist ${fmt(value)}.`],
    bugs: bugList(value, [
      ['zahl-selbst', n, `Das ist die Zahl selbst. Gesucht ist ihr ${ask}.`],
      ['gegeben', v, 'Das ist die Zahl aus der Aufgabe. Gehe zwei Schritte weiter.'],
    ]),
    praise: 'Du hast in zwei Schritten gedacht.',
    srText: `Der ${given === 'vorgaenger' ? 'Vorgänger' : 'Nachfolger'} einer Zahl ist ${v}. Wie heißt ihr ${ask}?`,
    knobel: true,
  };
}

export function mitte(n: number, c: PlaceColumn): Exercise {
  const p = PV[c];
  const lo = floorTo(n, p);
  const value = lo + p / 2;
  const name = nachbar(c);
  return {
    ...base(3, 3, `mitte:${n}:${c}`),
    prompt: `Welche Zahl liegt genau in der Mitte zwischen den ${nachbarDativ(c)} von ${fmt(n)}?`,
    answer: { kind: 'number', value, label: 'Zahl in der Mitte' },
    hints: [`Bestimme zuerst die beiden ${name}.`, 'Der Abstand zwischen ihnen ist eine Stufenzahl. Halbiere ihn.'],
    steps: [`Die ${name} sind ${fmt(lo)} und ${fmt(lo + p)}.`, `Der Abstand ist ${fmt(p)}. Die Hälfte davon ist ${fmt(p / 2)}.`, `${fmt(lo)} + ${fmt(p / 2)} = ${fmt(value)}`],
    bugs: bugList(value, [
      ['halber-abstand', p / 2, 'Das ist der halbe Abstand. Zähle ihn zum kleineren Nachbarn dazu.'],
      ['gerundet', roundTo(n, p), 'Das ist ein Nachbar. Gesucht ist die Zahl genau dazwischen.'],
    ]),
    praise: 'Du hast die Nachbarn gefunden und den Abstand halbiert.',
    srText: `Welche Zahl liegt genau in der Mitte zwischen den ${nachbarDativ(c)} von ${n}?`,
    knobel: true,
  };
}

export function zwischen(lo: number, c: PlaceColumn): Exercise {
  const p = PV[c];
  const value = p - 1;
  return {
    ...base(3, 3, `zwischen:${lo}:${c}`),
    prompt: `Wie viele Zahlen liegen zwischen ${fmt(lo)} und ${fmt(lo + p)}?`,
    answer: { kind: 'number', value, unit: 'Zahlen', label: 'Anzahl' },
    hints: ['Die beiden Zahlen selbst zählen nicht mit.', 'Probiere es klein: Zwischen 10 und 20 liegen 11, 12 … 19.'],
    steps: [`Von ${fmt(lo)} bis ${fmt(lo + p)} sind es ${fmt(p)} Schritte.`, 'Die Zahlen dazwischen: eine weniger als die Schritte.', `Es sind ${fmt(value)} Zahlen.`],
    bugs: bugList(value, [
      ['abstand', p, 'Das ist der Abstand. Die Zahlen dazwischen sind eine weniger.'],
      ['mit-raendern', p + 1, 'Die beiden Zahlen am Rand liegen nicht dazwischen.'],
    ]),
    praise: 'Du hast genau überlegt, welche Zahlen mitzählen.',
    srText: `Wie viele Zahlen liegen zwischen ${lo} und ${lo + p}?`,
    knobel: true,
  };
}

export function welcheZahl(rng: Rng, lo: number, c: PlaceColumn): Exercise {
  const p = PV[c];
  const hi = lo + p;
  const step = p / 10 >= 1 ? p / 10 : 1;
  const inside = lo + rng.int(1, 9) * step + (p >= 100 ? rng.int(0, Math.max(0, step - 1)) : 0);
  const above = hi + rng.int(1, 9) * step;
  const below = lo - rng.int(1, 9) * step;
  const bigger = biggerCol(c);
  const shifted = bigger && bigger !== 'M' && inside + PV[bigger] < 1_000_000 ? inside + PV[bigger] : null;
  const why = (x: number) => `Die ${nachbar(c)} von ${fmt(x)} sind ${fmt(floorTo(x, p))} und ${fmt(floorTo(x, p) + p)}.`;
  const wrong: WrongOption[] = [above, ...(below > 0 ? [below] : []), ...(shifted ? [shifted] : [])].map((x) => ({ label: fmt(x), whyWrong: why(x) }));
  return {
    ...base(3, 3, `welche:${lo}:${c}:${inside}`),
    prompt: `Die ${nachbar(c)} einer Zahl sind ${fmt(lo)} und ${fmt(hi)}. Welche Zahl kann es sein?`,
    answer: choiceAnswer(rng, fmt(inside), wrong),
    hints: ['Die Zahl liegt zwischen den beiden Nachbarn.', 'Prüfe jede Zahl: Liegt sie zwischen den beiden Nachbarn?'],
    steps: [`Gesucht ist eine Zahl zwischen ${fmt(lo)} und ${fmt(hi)}.`, `${fmt(lo)} < ${fmt(inside)} < ${fmt(hi)}`, `Also kann es ${fmt(inside)} sein.`],
    praise: 'Du hast jede Zahl mit beiden Nachbarn verglichen.',
    srText: `Die ${nachbar(c)} einer Zahl sind ${lo} und ${hi}. Welche Zahl kann es sein?`,
    knobel: true,
  };
}

// ─── Generator ───────────────────────────────────────────────────────────────

/** A number ending in zeros (for Vorgänger) or nines (for Nachfolger) with total `digits` digits. */
function crossingNumber(rng: Rng, digits: number, which: 'vorgaenger' | 'nachfolger'): number {
  const z = rng.int(2, digits - 1);
  const head = randomDigits(rng, digits - z, 0);
  if (which === 'vorgaenger') return head * 10 ** z;
  const h = head % 10 === 9 ? head - 1 : head;
  return h * 10 ** z + (10 ** z - 1);
}

function generate(rng: Rng, stufe: Stufe): Exercise {
  if (stufe === 1 || stufe === 2) {
    const digits = stufe === 1 ? rng.int(4, 5) : 6;
    if (rng.chance(0.45)) {
      const which = rng.chance(0.5) ? 'vorgaenger' : 'nachfolger';
      const n = rng.chance(0.6) ? crossingNumber(rng, digits, which) : randomDigits(rng, digits, rng.int(0, 2));
      return vorNach(n, which, stufe);
    }
    const c = rng.pick((stufe === 1 ? ['Z', 'H', 'T'] : ['T', 'ZT', 'HT']) as PlaceColumn[]);
    let n = randomDigits(rng, digits, rng.int(0, 2));
    if (n % PV[c] === 0) n += rng.int(1, 9) * (PV[c] / 10);
    return nachbarn(n, c, stufe);
  }
  const v = rng.pick(['raetsel', 'mitte', 'zwischen', 'welche'] as const);
  if (v === 'raetsel') {
    const given = rng.chance(0.5) ? 'vorgaenger' : 'nachfolger';
    const pattern = rng.pick([99_999, 9_999, 199_999, 409_999, 299_998, 100_000, 50_000, 700_001, 89_999]);
    return raetselVorNach(given === 'vorgaenger' ? pattern : pattern + 2, given);
  }
  const c = rng.pick(['H', 'T', 'ZT'] as PlaceColumn[]);
  if (v === 'mitte') {
    let n = randomDigits(rng, rng.int(5, 6), rng.int(0, 1));
    if (n % PV[c] === 0) n += PV[c] / 10;
    return mitte(n, c);
  }
  const lo = rng.int(1, 98) * PV[c] * (c === 'H' ? rng.pick([1, 10]) : 1);
  if (v === 'zwischen') return zwischen(lo, c);
  return welcheZahl(rng, lo, c);
}

export const nachbarzahlenSkill: SkillDef = {
  id: ID,
  topicId: 'zahlen',
  title: 'Nachbarzahlen',
  description: 'Du findest Vorgänger, Nachfolger und Nachbarzehner bis Nachbarhunderttausender.',
  stufen: {
    1: 'Vorgänger, Nachfolger, Nachbarzehner bis -tausender',
    2: 'Sechsstellige Zahlen, Nachbartausender bis -hunderttausender',
    3: 'Nachbar-Rätsel: Mitte, Anzahl dazwischen, welche Zahl?',
  },
  kmk: KMK,
  generate,
};
