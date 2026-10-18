import { BOX, fmt, MINUS, PLUS } from '../../core/format';
import type { Exercise, Rng, SkillDef, Stufe } from '../../core/types';
import { bugList, choiceAnswer, type WrongOption } from './shared';

const ID = 'zahlen.zahlenfolgen';
const KMK = ['MS.muster', 'ZO.zahlraum'];

function base(stufe: Stufe, ab: 1 | 2 | 3, key: string) {
  return { key: `${ID}:${stufe}:${key}`, topicId: 'zahlen' as const, skillId: ID, stufe, ab, kmk: KMK };
}

const signed = (d: number) => `${d < 0 ? MINUS : PLUS} ${fmt(Math.abs(d))}`;

/** Arithmetic sequence with one missing term (index `gap`) or the next two terms (gap = -1). */
export function folge(start: number, step: number, shown: number, gap: number, stufe: Stufe): Exercise {
  const terms = Array.from({ length: shown + (gap < 0 ? 2 : 0) }, (_, i) => start + i * step);
  const display = gap < 0 ? [...terms.slice(0, shown).map((t) => fmt(t)), BOX, BOX] : terms.map((t, i) => (i === gap ? BOX : fmt(t)));
  const dir = step > 0 ? 'größer' : 'kleiner';
  const common = {
    ...base(stufe, stufe === 1 ? 1 : 2, `folge:${start}:${step}:${shown}:${gap}`),
    expression: display.join(', '),
    hints: ['Wie verändert sich die Zahl von einem Schritt zum nächsten?', `Die Zahlen werden immer um denselben Betrag ${dir}.`],
    praise: 'Du hast die Regel erkannt und richtig weitergezählt.',
  };
  if (gap < 0) {
    const [n1, n2] = terms.slice(shown);
    return {
      ...common,
      prompt: 'Setze die Zahlenfolge fort. Wie heißen die nächsten zwei Zahlen?',
      answer: {
        kind: 'multi',
        fields: [
          { id: 'n1', value: n1, label: 'nächste Zahl' },
          { id: 'n2', value: n2, label: 'übernächste Zahl' },
        ],
      },
      steps: [`Die Regel heißt: immer ${signed(step)}.`, `${fmt(terms[shown - 1])} ${signed(step)} = ${fmt(n1)}`, `${fmt(n1)} ${signed(step)} = ${fmt(n2)}`],
      bugs: bugList({ n1, n2 }, [
        ['richtung', { n1: terms[shown - 1] - step, n2: terms[shown - 1] - 2 * step }, `Die Zahlen werden ${dir}. Rechne in diese Richtung weiter.`],
        ['schritt-zehnmal', { n1: terms[shown - 1] + 10 * step, n2: terms[shown - 1] + 20 * step }, 'Prüfe, an welcher Stelle sich die Zahlen ändern.'],
      ]),
      srText: `Setze die Zahlenfolge fort: ${terms.slice(0, shown).join(', ')}. Wie heißen die nächsten zwei Zahlen?`,
    };
  }
  const value = terms[gap];
  const before = gap > 0 ? terms[gap - 1] : terms[gap + 1];
  return {
    ...common,
    prompt: gap === shown - 1 ? 'Welche Zahl kommt als Nächstes?' : 'Welche Zahl fehlt in der Zahlenfolge?',
    answer: { kind: 'number', value, label: 'Fehlende Zahl' },
    steps: [
      `Die Regel heißt: immer ${signed(step)}.`,
      gap > 0 ? `${fmt(before)} ${signed(step)} = ${fmt(value)}` : `${fmt(before)} ${signed(-step)} = ${fmt(value)}`,
      `Die fehlende Zahl ist ${fmt(value)}.`,
    ],
    bugs: bugList(value, [
      ['richtung', gap > 0 ? before - step : before + step, `Die Zahlen werden ${dir}. Rechne in diese Richtung.`],
      ['schritt-zehnmal', gap > 0 ? before + 10 * step : null, 'Prüfe, an welcher Stelle sich die Zahlen ändern.'],
      ['schritt-zehntel', gap > 0 && step % 10 === 0 ? before + step / 10 : null, 'Prüfe, an welcher Stelle sich die Zahlen ändern.'],
    ]),
    srText: `Zahlenfolge: ${terms.map((t, i) => (i === gap ? 'Lücke' : String(t))).join(', ')}. Welche Zahl gehört in die Lücke?`,
  };
}

export function regel(rng: Rng, start: number, step: number): Exercise {
  const terms = [0, 1, 2, 3].map((i) => start + i * step);
  const s = Math.abs(step);
  const candidates = [-step, step > 0 ? step - s / 5 : step + s / 5, step / 10, step * 10].filter((d) => Number.isInteger(d) && d !== 0 && d !== step);
  const wrong: WrongOption[] = candidates.map((d) => ({
    label: signed(d),
    whyWrong: `${fmt(terms[0])} ${signed(d)} = ${fmt(terms[0] + d)}, nicht ${fmt(terms[1])}.`,
  }));
  return {
    ...base(3, 2, `regel:${start}:${step}`),
    prompt: 'Wie heißt die Regel der Zahlenfolge?',
    expression: terms.map((t) => fmt(t)).join(', '),
    answer: choiceAnswer(rng, signed(step), wrong),
    hints: ['Rechne den Unterschied zwischen zwei Nachbarzahlen aus.', 'Werden die Zahlen größer oder kleiner?'],
    steps: [`${fmt(terms[0])} ${signed(step)} = ${fmt(terms[1])}`, `${fmt(terms[1])} ${signed(step)} = ${fmt(terms[2])}`, `Die Regel heißt ${signed(step)}.`],
    praise: 'Du hast die Regel an mehreren Zahlen geprüft.',
    srText: `Zahlenfolge: ${terms.join(', ')}. Wie heißt die Regel?`,
  };
}

export type Pattern = 'wachsend' | 'verdoppeln' | 'abwechselnd';

/** Knobel-Folgen: growing steps, doubling, alternating + and −. Returns terms (last one asked). */
export function patternTerms(pattern: Pattern, start: number, a: number, b: number): number[] {
  const t = [start];
  for (let i = 1; i < 6; i++) {
    const prev = t[i - 1];
    if (pattern === 'wachsend') t.push(prev + a + (i - 1) * b);
    else if (pattern === 'verdoppeln') t.push(prev * 2);
    else t.push(i % 2 === 1 ? prev + a : prev - b);
  }
  return t;
}

export function knobelFolge(pattern: Pattern, start: number, a: number, b: number): Exercise {
  const all = patternTerms(pattern, start, a, b);
  const shown = pattern === 'abwechselnd' ? 5 : 4;
  const terms = all.slice(0, shown + 1);
  const value = terms[shown];
  const last = terms[shown - 1];
  const lastStep = last - terms[shown - 2];
  const rule =
    pattern === 'wachsend'
      ? `Die Schritte werden immer um ${fmt(b)} größer.`
      : pattern === 'verdoppeln'
        ? 'Jede Zahl ist das Doppelte der Zahl davor.'
        : `Abwechselnd ${signed(a)} und ${signed(-b)}.`;
  return {
    ...base(3, 3, `knobel:${pattern}:${start}:${a}:${b}`),
    prompt: 'Welche Zahl kommt als Nächstes? Finde die Regel.',
    expression: [...terms.slice(0, shown).map((t) => fmt(t)), BOX].join(', '),
    answer: { kind: 'number', value, label: 'Nächste Zahl' },
    hints: ['Schreibe die Unterschiede zwischen den Zahlen auf.', pattern === 'verdoppeln' ? 'Vergleiche jede Zahl mit der Zahl davor. Wie oft passt sie hinein?' : 'Ist der Unterschied immer gleich? Oder ändert er sich nach einer Regel?'],
    steps: [
      `Unterschiede: ${terms.slice(1, shown).map((t, i) => signed(t - terms[i])).join(', ')}.`,
      rule,
      `${fmt(last)} ${pattern === 'verdoppeln' ? '· 2' : signed(value - last)} = ${fmt(value)}`,
    ],
    bugs: bugList(value, [
      ['gleicher-schritt', last + lastStep, 'Der Schritt bleibt hier nicht gleich. Schau dir alle Unterschiede an.'],
    ]),
    praise: 'Du hast die Regel hinter der Folge entdeckt.',
    srText: `Zahlenfolge: ${terms.slice(0, shown).join(', ')}. Welche Zahl kommt als Nächstes?`,
    knobel: true,
  };
}

// ─── Generator ───────────────────────────────────────────────────────────────

function generate(rng: Rng, stufe: Stufe): Exercise {
  if (stufe === 1) {
    const step = rng.pick([1_000, 10_000, 1_000, 100]);
    const shown = 4;
    const twoMore = rng.chance(0.3);
    const count = shown + (twoMore ? 2 : 0);
    const maxStart = 100_000 - (count - 1) * step;
    const unit = step >= 10_000 ? 1_000 : step === 1_000 ? 100 : 10;
    const start = rng.int(Math.ceil(1_000 / unit), Math.floor(maxStart / unit)) * unit;
    return folge(start, step, shown, twoMore ? -1 : shown - 1, 1);
  }
  if (stufe === 2) {
    const step = rng.pick([5_000, 25_000, 100_000, 10_000, 50_000, 2_500]) * (rng.chance(0.4) ? -1 : 1);
    const s = Math.abs(step);
    const shown = 5;
    const span = (shown + 1) * s;
    const unit = s >= 25_000 ? 1_000 : 100;
    const lo = Math.max(100_000, step < 0 ? span : 0);
    const hi = 1_000_000 - (step > 0 ? span : 0);
    const start = rng.int(Math.ceil(lo / unit), Math.floor(hi / unit)) * unit;
    const twoMore = rng.chance(0.25);
    return folge(start, step, twoMore ? 4 : shown, twoMore ? -1 : rng.int(1, shown - 1), 2);
  }
  const v = rng.pick(['regel', 'wachsend', 'verdoppeln', 'abwechselnd'] as const);
  if (v === 'regel') {
    const step = rng.pick([25_000, 2_500, 250, 12_500, 50_000, 125_000]) * (rng.chance(0.3) ? -1 : 1);
    const lo = step < 0 ? 4 * Math.abs(step) : 1_000;
    const hi = 1_000_000 - (step > 0 ? 4 * step : 0);
    const unit = Math.abs(step) >= 2_500 ? 500 : 10;
    return regel(rng, rng.int(Math.ceil(lo / unit), Math.floor(hi / unit)) * unit, step);
  }
  if (v === 'wachsend') {
    const b = rng.pick([1_000, 2_000, 5_000, 10_000]);
    const a = b * rng.int(1, 3);
    return knobelFolge('wachsend', rng.int(1, 40) * 1_000, a, b);
  }
  if (v === 'verdoppeln') {
    const start = rng.pick([1_250, 3_125, 1_500, 2_500, 6_250, 7_500, 4_000, 3_000, 1_200, 5_000, 2_000, 12_500]);
    return knobelFolge('verdoppeln', start, 0, 0);
  }
  const a = rng.pick([10_000, 20_000, 5_000, 100_000]);
  const b = rng.pick([1_000, 2_000, 500]) * (a >= 20_000 ? 2 : 1);
  return knobelFolge('abwechselnd', rng.int(10, 300) * 1_000, a, b);
}

export const zahlenfolgenSkill: SkillDef = {
  id: ID,
  topicId: 'zahlen',
  title: 'Zahlenfolgen',
  description: 'Du zählst in großen Schritten und setzt Zahlenfolgen fort.',
  stufen: {
    1: 'In Schritten von 1000 und 10 000 weiterzählen',
    2: 'Schritte wie 5000 oder 25 000, auch rückwärts',
    3: 'Regeln finden und knifflige Folgen fortsetzen',
  },
  kmk: KMK,
  generate,
};
