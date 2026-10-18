import { fmt, numberWord } from '../../core/format';
import type { Exercise, Rng, SkillDef, Stufe } from '../../core/types';
import { bugList, choiceAnswer, randomDigits, softWord, zeroCount, type WrongOption } from './shared';

const ID = 'zahlen.zahlwort';
const KMK = ['ZO.stellenwert', 'ZO.zahlraum', 'PK.darstellen'];

function base(stufe: Stufe, ab: 1 | 2 | 3, key: string) {
  return { key: `${ID}:${stufe}:${key}`, topicId: 'zahlen' as const, skillId: ID, stufe, ab, kmk: KMK };
}

/** Word of the thousands part as it appears before 'tausend' (1 → 'ein'). */
function thousandsWord(th: number): string {
  return numberWord(th * 1000).replace(/tausend$/, '');
}

// ─── Misconceptions (exported for tests) ─────────────────────────────────────

/** 'dreihundertviertausendzwanzig' → 30 420: the zero after 'tausend' is left out. */
export function missingZeroBug(n: number): number | null {
  const th = Math.floor(n / 1000);
  const r = n % 1000;
  if (th === 0 || r === 0 || r >= 100) return null;
  return Number(`${th}${r}`);
}

/** Zero missing inside a three-digit part: 'dreihundertfünf' → 35 (e.g. 45 305 → 4 535). */
export function innerZeroBug(n: number): number | null {
  const th = Math.floor(n / 1000);
  const r = n % 1000;
  if (r >= 100 && r % 100 > 0 && r % 100 < 10) return Number(`${th || ''}${Math.floor(r / 100)}${r % 100}`);
  if (th >= 100 && th % 100 > 0 && th % 100 < 10) return Number(`${Math.floor(th / 100)}${th % 100}${String(r).padStart(3, '0')}`);
  return null;
}

/** Written as heard: 'dreihundertviertausend' → 304000, then 'zwanzig' → 30 400 020. */
export function extraZeroBug(n: number): number | null {
  const th = Math.floor(n / 1000);
  const r = n % 1000;
  if (th === 0 || r === 0) return null;
  return Number(`${th}000${r}`);
}

/** Tens and ones swapped in a part with 'und' (achtundsiebzig → 87). */
export function invertPart(p: number): number | null {
  const t = Math.floor(p / 10) % 10;
  const o = p % 10;
  if (t < 2 || o === 0 || t === o) return null;
  return p - 10 * t - o + 10 * o + t;
}

export function dreherBugs(n: number): { where: 'tausender' | 'rest'; value: number; part: number }[] {
  const th = Math.floor(n / 1000);
  const r = n % 1000;
  const out: { where: 'tausender' | 'rest'; value: number; part: number }[] = [];
  const it = invertPart(th);
  if (th > 0 && it !== null) out.push({ where: 'tausender', value: it * 1000 + r, part: th });
  const ir = invertPart(r);
  if (ir !== null) out.push({ where: 'rest', value: th * 1000 + ir, part: r });
  return out;
}

function dreherHint(part: number): string {
  const t = Math.floor(part / 10) % 10;
  const o = part % 10;
  return `„${numberWord(10 * t + o)}“ sind ${t} Zehner und ${o} Einer. Die Zehner schreibst du zuerst.`;
}

// ─── Exercises ───────────────────────────────────────────────────────────────

function diktatSteps(n: number): string[] {
  if (n === 1_000_000) return ['Eine Million sind 1000 Tausender.', 'Sie hat eine 1 und sechs Nullen.', `Du schreibst ${fmt(n)}.`];
  const th = Math.floor(n / 1000);
  const r = n % 1000;
  const rWord = r > 0 ? numberWord(r) : '';
  return [
    `Teile das Zahlwort bei „tausend“: ${thousandsWord(th)}tausend | ${rWord || '(nichts)'}.`,
    `Vor „tausend“: ${thousandsWord(th)} = ${fmt(th)}. Das sind die Tausender.`,
    r > 0
      ? `Nach „tausend“: ${rWord} = ${String(r).padStart(3, '0')}. Das sind immer drei Stellen: H, Z, E.`
      : 'Nach „tausend“ kommt nichts. Du schreibst drei Nullen.',
    `Zusammen: ${fmt(n)}.`,
  ];
}

export function diktat(n: number, stufe: Stufe): Exercise {
  const word = numberWord(n);
  const drehers = dreherBugs(n);
  const hasGap = missingZeroBug(n) !== null || innerZeroBug(n) !== null;
  return {
    ...base(stufe, stufe === 3 ? 2 : stufe, `diktat:${n}`),
    prompt: 'Schreibe die Zahl mit Ziffern.',
    expression: softWord(word),
    answer: { kind: 'number', value: n, label: 'Zahl mit Ziffern' },
    hints:
      n === 1_000_000
        ? ['Eine Million ist die Zahl nach 999\u202F999.', 'Wie viele Nullen braucht eine Million?']
        : [
            'Suche im Zahlwort das Wort „tausend“.',
            'Vor „tausend“ stehen die Tausender. Danach kommen genau drei Stellen: H, Z, E.',
            'Wird eine Stelle nicht genannt? Dann schreibst du dort eine 0.',
          ],
    steps: diktatSteps(n),
    bugs: bugList(n, [
      ['null-fehlt', missingZeroBug(n), 'Nach „tausend“ kommen immer drei Stellen: Hunderter, Zehner, Einer. Fülle mit Nullen auf.'],
      ['null-fehlt-innen', innerZeroBug(n), 'Eine Stelle wird nicht genannt. Schreibe dort eine 0.'],
      ['zu-viele-nullen', extraZeroBug(n), 'Du hast „tausend“ als 000 geschrieben und dann weitergeschrieben. Nach den Tausendern folgen nur drei Stellen.'],
      ...drehers.map((d): [string, number, string] => [`dreher-${d.where}`, d.value, dreherHint(d.part)]),
    ]),
    praise:
      n === 1_000_000
        ? 'Du hast an alle sechs Nullen der Million gedacht.'
        : hasGap
          ? 'Du hast an die Nullen für die fehlenden Stellen gedacht.'
          : 'Du hast das Zahlwort beim Wort „tausend“ richtig geteilt.',
    srText: `Schreibe die Zahl ${word} mit Ziffern.`,
  };
}

/** Variants of n with one zero moved to a neighbouring place (304 020 → 340 020). */
export function zeroShifts(n: number): number[] {
  const s = String(n);
  const out: number[] = [];
  for (let i = 1; i < s.length; i++) {
    if (s[i] !== '0') continue;
    for (const j of [i - 1, i + 1]) {
      if (j < 1 || j >= s.length || s[j] === '0') continue;
      const a = s.split('');
      [a[i], a[j]] = [a[j], a[i]];
      out.push(Number(a.join('')));
    }
  }
  return out;
}

export function wortWaehlen(rng: Rng, n: number, stufe: Stufe): Exercise {
  const wrong: WrongOption[] = [];
  for (const d of dreherBugs(n)) {
    wrong.push({ label: softWord(numberWord(d.value)), whyWrong: `Dieses Wort gehört zu ${fmt(d.value)}. Bei „und“ hörst du zuerst die Einer, geschrieben stehen die Zehner vorne.` });
  }
  for (const m of rng.shuffle(zeroShifts(n))) {
    wrong.push({ label: softWord(numberWord(m)), whyWrong: `Dieses Wort gehört zu ${fmt(m)}. Prüfe, an welcher Stelle die Null steht.` });
  }
  const t = Math.floor(n / 1000) % 10;
  const fallback = t < 9 ? n + 1000 : n - 1000;
  wrong.push({ label: softWord(numberWord(fallback)), whyWrong: `Dieses Wort gehört zu ${fmt(fallback)}. Lies die Tausender noch einmal genau.` });
  const z = Math.floor(n / 10) % 10;
  const fallback2 = z < 9 ? n + 10 : n - 10;
  wrong.push({ label: softWord(numberWord(fallback2)), whyWrong: `Dieses Wort gehört zu ${fmt(fallback2)}. Lies die Zehner noch einmal genau.` });
  const word = numberWord(n);
  return {
    ...base(stufe, stufe === 1 ? 1 : 3, `waehlen:${n}`),
    prompt: 'Welches Zahlwort passt zu der Zahl?',
    expression: fmt(n),
    answer: choiceAnswer(rng, softWord(word), wrong),
    hints: ['Lies zuerst die Tausender: alle Ziffern vor den letzten drei.', 'Lies dann die letzten drei Ziffern: Hunderter, Zehner, Einer.'],
    steps: [
      `Die Tausender: ${fmt(Math.floor(n / 1000))} → ${thousandsWord(Math.floor(n / 1000))}tausend.`,
      `Die letzten drei Ziffern: ${String(n % 1000).padStart(3, '0')}${n % 1000 > 0 ? ` → ${numberWord(n % 1000)}` : ''}.`,
      `Das Zahlwort heißt ${word}.`,
    ],
    praise: 'Du hast Tausender und den Rest getrennt gelesen.',
    srText: `Welches Zahlwort passt zu der Zahl ${n}?`,
    knobel: stufe === 3 ? true : undefined,
  };
}

export function nullenZaehlen(n: number): Exercise {
  const word = numberWord(n);
  const zeros = zeroCount(n);
  const extra = extraZeroBug(n);
  const missing = missingZeroBug(n);
  return {
    ...base(3, 3, `nullen:${n}`),
    prompt: 'Wie viele Nullen hat diese Zahl, wenn du sie mit Ziffern schreibst?',
    expression: softWord(word),
    // a label instead of the unit 'Nullen', so the shown solution also reads well for 1 zero
    answer: { kind: 'number', value: zeros, before: 'Anzahl der Nullen:', label: 'Anzahl Nullen' },
    hints: ['Schreibe die Zahl zuerst mit Ziffern auf.', 'Nach „tausend“ kommen genau drei Stellen.'],
    steps: [...diktatSteps(n), `${fmt(n)} hat ${zeros} ${zeros === 1 ? 'Null' : 'Nullen'}.`],
    bugs: bugList(zeros, [
      ['tausend-als-000', extra !== null ? zeroCount(extra) : null, 'Schreibe die Zahl auf. „tausend“ bedeutet nicht, dass drei Nullen dazukommen.'],
      ['null-fehlt', missing !== null ? zeroCount(missing) : null, 'Nach „tausend“ kommen immer drei Stellen. Fülle mit Nullen auf und zähle dann.'],
    ]),
    praise: 'Du hast die Zahl erst aufgeschrieben und dann die Nullen gezählt.',
    srText: `Wie viele Nullen hat die Zahl ${word}, wenn du sie mit Ziffern schreibst?`,
    knobel: true,
  };
}

// ─── Number choice per Stufe ─────────────────────────────────────────────────

function numberFor(rng: Rng, stufe: Stufe): number {
  if (stufe === 1) {
    if (rng.chance(0.5)) return rng.int(1, 99) * 1000 + rng.int(1, 99);
    return randomDigits(rng, rng.int(4, 5), rng.int(0, 2));
  }
  if (stufe === 2) {
    const th = rng.chance(0.5) ? randomDigits(rng, 3, 1) : randomDigits(rng, 3, 0);
    const r = rng.chance(0.6) ? rng.int(1, 99) : rng.pick([randomDigits(rng, 3, 1), rng.int(1, 9) * 100]);
    return th * 1000 + r;
  }
  const pattern = rng.int(0, 9);
  if (pattern === 0) return 1_000_000;
  if (pattern <= 3) return rng.pick([rng.int(1, 9) * 100, rng.int(1, 9) * 100 + rng.int(1, 9), rng.int(1, 9) * 110]) * 1000 + rng.int(1, 9);
  if (pattern <= 5) return rng.int(10, 99) * 1000 + rng.pick([rng.int(1, 9), rng.int(1, 9) * 10, rng.int(1, 9) * 100 + rng.int(1, 9)]);
  const th = rng.pick([909, 990, 999, 101, 110, 100, 505, 770, 808]);
  return th * 1000 + rng.pick([rng.int(1, 9) * 101, rng.int(1, 9) * 10, rng.int(1, 9) * 11, rng.int(1, 9) * 100 + rng.int(1, 9)]);
}

function generate(rng: Rng, stufe: Stufe): Exercise {
  const n = numberFor(rng, stufe);
  const roll = rng.next();
  if (stufe < 3) return roll < 0.8 || n === 1_000_000 ? diktat(n, stufe) : wortWaehlen(rng, n, stufe);
  if (roll < 0.5 || n === 1_000_000) return diktat(n, 3);
  if (roll < 0.75) return nullenZaehlen(n);
  return wortWaehlen(rng, n, 3);
}

export const zahlwortSkill: SkillDef = {
  id: ID,
  topicId: 'zahlen',
  title: 'Zahlwörter',
  description: 'Du schreibst Zahlwörter mit Ziffern und findest das passende Zahlwort.',
  stufen: {
    1: 'Zahlwörter bis 100 000 mit Ziffern schreiben',
    2: 'Sechsstellige Zahlwörter mit Nullen',
    3: 'Knifflige Zahlwörter bis zur Million',
  },
  kmk: KMK,
  generate,
};
