import { BOX, fmt, PLUS, TIMES } from '../../core/format';
import type { Exercise, Rng, SkillDef, Stufe } from '../../core/types';
import { bugList, colOf, columnsFor, digitAt, PLACE_NAME, PV } from '../zahlen/shared';

const ID = 'kopfrechnen.verdoppeln-halbieren';
const KMK = ['ZO.kopfrechnen', 'ZO.strategien'];

function base(stufe: Stufe, ab: 1 | 2 | 3, key: string) {
  return { key: `${ID}:${stufe}:${key}`, topicId: 'kopfrechnen' as const, skillId: ID, stufe, ab, kmk: KMK };
}

/** Place-value parts of n: 4 750 → [4 000, 700, 50]. */
function parts(n: number): number[] {
  return columnsFor(n)
    .map((c) => digitAt(n, c) * PV[c])
    .filter((v) => v > 0);
}

/** Each digit doubled, carries forgotten: 4 750 → 8 400. */
export function doubleNoCarry(n: number): number {
  return Number(String(n).split('').map((d) => (2 * Number(d)) % 10).join(''));
}

/** Each digit halved, remainders forgotten: 37 800 → 13 400. */
export function halveNoCarry(n: number): number {
  return Number(String(n).split('').map((d) => Math.floor(Number(d) / 2)).join(''));
}

const join = (xs: number[]) => xs.map((x) => fmt(x)).join(` ${PLUS} `);

/** Worked steps for doubling: place-value parts one by one; a single part as a count of bundles (300 = 3 Hunderter). */
export function doubleSteps(n: number): string[] {
  const v = 2 * n;
  const ps = parts(n);
  if (ps.length === 1 && n >= 10) {
    const k = String(n).length - 1;
    const d = n / 10 ** k;
    const name = PLACE_NAME[colOf(10 ** k)];
    return [`${fmt(n)} sind ${d} ${name}.`, `Das Doppelte davon sind ${2 * d} ${name}.`, `Das Doppelte von ${fmt(n)} ist ${fmt(v)}.`];
  }
  return [`Zerlege: ${fmt(n)} = ${join(ps)}`, `Verdopple jeden Teil: ${join(ps.map((p) => 2 * p))}`, `Zusammen: ${fmt(v)}`];
}

export function verdoppeln(n: number, stufe: Stufe): Exercise {
  const v = 2 * n;
  return {
    ...base(stufe, stufe === 1 ? 1 : 2, `doppelt:${n}`),
    prompt: 'Verdopple die Zahl.',
    expression: `Das Doppelte von ${fmt(n)} = ${BOX}`,
    answer: { kind: 'number', value: v, label: 'Doppeltes' },
    hints: ['Zerlege die Zahl in ihre Stellenwerte.', 'Verdopple jeden Teil und addiere dann.'],
    steps: doubleSteps(n),
    bugs: bugList(v, [
      ['uebertrag-vergessen', doubleNoCarry(n), 'Achte auf den Übertrag. Ergibt eine Ziffer doppelt 10 oder mehr, wächst die Stelle links.'],
      ['halbiert', n % 2 === 0 ? n / 2 : null, 'Du hast halbiert. Verdoppeln heißt: noch einmal so viel.'],
    ]),
    praise: /[5-9]/.test(String(n)) ? 'Du hast stellenweise verdoppelt und an den Übertrag gedacht.' : 'Du hast jede Stelle verdoppelt.',
    srText: `Wie viel ist das Doppelte von ${n}?`,
  };
}

/**
 * Worked steps for halving. Several place-value parts are halved one by one. A single part gets a real strategy:
 * an odd one is split into an even part and one bundle (90 = 80 + 10 → 40 + 5), an even one (or a 1 followed by
 * zeros) is halved as a count of bundles (1000 = 10 Hunderter → 5 Hunderter).
 */
export function halfSteps(n: number): string[] {
  const v = n / 2;
  const ps = parts(n);
  if (ps.length === 1 && n >= 10) {
    const k = String(n).length - 1;
    const d = n / 10 ** k;
    if (d % 2 === 1 && d > 1) {
      const split = [(d - 1) * 10 ** k, 10 ** k];
      return [`Zerlege: ${fmt(n)} = ${join(split)}`, `Halbiere jeden Teil: ${join(split.map((p) => p / 2))}`, `Zusammen: ${fmt(v)}`];
    }
    const [count, unit] = d === 1 ? [10, 10 ** (k - 1)] : [d, 10 ** k];
    const name = PLACE_NAME[colOf(unit)];
    return [`${fmt(n)} sind ${count} ${name}.`, `Die Hälfte davon sind ${count / 2} ${name}.`, `Die Hälfte von ${fmt(n)} ist ${fmt(v)}.`];
  }
  return [`Zerlege: ${fmt(n)} = ${join(ps)}`, `Halbiere jeden Teil: ${join(ps.map((p) => p / 2))}`, `Zusammen: ${fmt(v)}`];
}

export function halbieren(n: number, stufe: Stufe): Exercise {
  const v = n / 2;
  return {
    ...base(stufe, stufe === 1 ? 1 : 2, `haelfte:${n}`),
    prompt: 'Halbiere die Zahl.',
    expression: `Die Hälfte von ${fmt(n)} = ${BOX}`,
    answer: { kind: 'number', value: v, label: 'Hälfte' },
    hints: ['Zerlege die Zahl in ihre Stellenwerte.', `Halbiere jeden Teil. Bei einer ungeraden Ziffer hilft: Die Hälfte von ${n === 70 ? '30 ist 15' : '70 ist 35'}.`],
    steps: halfSteps(n),
    bugs: bugList(v, [
      ['rest-vergessen', halveNoCarry(n), 'Bei einer ungeraden Ziffer bleibt ein Rest. Er wandert in die nächste Stelle.'],
      ['verdoppelt', 2 * n, 'Du hast verdoppelt. Halbieren heißt: in zwei gleiche Teile teilen.'],
    ]),
    praise: /[13579]/.test(String(n).slice(0, -1)) ? 'Du hast stellenweise halbiert und an die ungeraden Ziffern gedacht.' : 'Du hast jede Stelle halbiert.',
    srText: `Wie viel ist die Hälfte von ${n}?`,
  };
}

export function rueckwaerts(result: number, op: 'verdoppelt' | 'halbiert'): Exercise {
  const v = op === 'verdoppelt' ? result / 2 : result * 2;
  return {
    ...base(3, 3, `rueck:${op}:${result}`),
    prompt: `Ich ${op === 'verdoppelt' ? 'verdopple' : 'halbiere'} eine Zahl und erhalte ${fmt(result)}. Wie heißt meine Zahl?`,
    answer: { kind: 'number', value: v, label: 'Gesuchte Zahl' },
    hints: ['Rechne rückwärts.', op === 'verdoppelt' ? 'Das Gegenteil von Verdoppeln ist Halbieren.' : 'Das Gegenteil von Halbieren ist Verdoppeln.'],
    steps: [`Rückwärts: ${op === 'verdoppelt' ? 'halbieren' : 'verdoppeln'}.`, `${op === 'verdoppelt' ? 'Die Hälfte' : 'Das Doppelte'} von ${fmt(result)} ist ${fmt(v)}.`, `Probe: ${fmt(v)} ${op === 'verdoppelt' ? 'verdoppelt' : 'halbiert'} ergibt ${fmt(result)}.`],
    bugs: bugList(v, [
      ['vorwaerts', op === 'verdoppelt' ? result * 2 : result % 2 === 0 ? result / 2 : null, `Du hast noch einmal ${op === 'verdoppelt' ? 'verdoppelt' : 'halbiert'}. Rechne rückwärts.`],
    ]),
    praise: 'Du hast rückwärts gerechnet und mit der Probe geprüft.',
    srText: `Ich ${op === 'verdoppelt' ? 'verdopple' : 'halbiere'} eine Zahl und erhalte ${result}. Wie heißt meine Zahl?`,
    knobel: true,
  };
}

export function zweimalHalbieren(n: number): Exercise {
  const half = n / 2;
  const v = n / 4;
  return {
    ...base(3, 2, `zweimal:${n}`),
    prompt: 'Halbiere die Zahl zweimal hintereinander.',
    expression: `${fmt(n)} → ${BOX} → ${BOX}`,
    answer: {
      kind: 'multi',
      fields: [
        { id: 'h1', value: half, before: `${fmt(n)} →`, label: 'Nach dem ersten Halbieren' },
        { id: 'h2', value: v, before: '→', label: 'Nach dem zweiten Halbieren' },
      ],
    },
    hints: ['Halbiere zuerst einmal.', 'Halbiere das Ergebnis noch einmal.'],
    steps: [`Die Hälfte von ${fmt(n)} ist ${fmt(half)}.`, `Die Hälfte von ${fmt(half)} ist ${fmt(v)}.`, `Zweimal halbieren heißt: durch 4 teilen.`],
    bugs: bugList({ h1: half, h2: v }, [['rest-vergessen', { h1: half, h2: halveNoCarry(half) }, 'Bei einer ungeraden Ziffer bleibt ein Rest. Er wandert in die nächste Stelle.']]),
    praise: 'Du hast zweimal sauber halbiert.',
    srText: `Halbiere ${n} zweimal hintereinander. Schreibe beide Ergebnisse auf.`,
    knobel: true,
  };
}

export function geschickt(a: number, b: number): Exercise {
  const v = a * b;
  // double a and halve b until a becomes a Stufenzahl
  const chain: [number, number][] = [[a, b]];
  let [x, y] = [a, b];
  while (![10, 100, 1000].includes(x) && y % 2 === 0) {
    x *= 2;
    y /= 2;
    chain.push([x, y]);
  }
  return {
    ...base(3, 3, `geschickt:${a}:${b}`),
    prompt: 'Rechne geschickt: Verdopple die eine Zahl und halbiere die andere.',
    expression: `${a} ${TIMES} ${b} = ${BOX}`,
    answer: { kind: 'number', value: v, label: 'Ergebnis' },
    hints: [`Verdopple ${a} und halbiere ${b}. Das Ergebnis bleibt gleich.`, 'Mach weiter, bis du eine leichte Aufgabe hast.'],
    steps: [chain.map(([p, q]) => `${fmt(p)} ${TIMES} ${fmt(q)}`).join(' = '), `${fmt(x)} ${TIMES} ${fmt(y)} = ${fmt(v)}`],
    praise: 'Du hast mit Verdoppeln und Halbieren eine leichte Aufgabe gemacht.',
    srText: `Rechne geschickt: ${a} mal ${b}. Verdopple die eine Zahl und halbiere die andere.`,
    knobel: true,
  };
}

// ─── Generator ───────────────────────────────────────────────────────────────

function generate(rng: Rng, stufe: Stufe): Exercise {
  if (stufe === 1) {
    if (rng.chance(0.5)) return verdoppeln(rng.int(13, 499), 1);
    // often an odd number of tens or hundreds, so the half ends in 5 or 50
    const roll = rng.next();
    const n = roll < 0.4 ? (2 * rng.int(1, 49) + 1) * 10 : roll < 0.6 ? (2 * rng.int(0, 4) + 1) * 100 : 2 * rng.int(10, 500);
    return halbieren(n, 1);
  }
  if (stufe === 2) {
    if (rng.chance(0.5)) {
      const unit = rng.pick([10, 100]);
      return verdoppeln(rng.int(100, 499) * unit + (unit === 100 && rng.chance(0.3) ? rng.int(1, 9) * 10 : 0), 2);
    }
    return halbieren(rng.int(11, 999) * rng.pick([10, 100]), 2);
  }
  const v = rng.pick(['verdoppelt', 'halbiert', 'zweimal', 'geschickt'] as const);
  if (v === 'verdoppelt') return rueckwaerts(2 * rng.int(11, 499) * rng.pick([10, 100, 1000]), 'verdoppelt');
  if (v === 'halbiert') return rueckwaerts(rng.int(11, 499) * rng.pick([5, 50, 250]), 'halbiert');
  if (v === 'zweimal') return zweimalHalbieren(rng.int(3, 99) * rng.pick([20, 200, 2000]));
  const [a, b] = rng.pick([
    [25, rng.pick([8, 12, 16, 24, 28, 32, 36, 44])],
    [50, rng.pick([14, 16, 18, 22, 24, 26, 36, 48])],
    [5, rng.pick([14, 16, 18, 22, 24, 26, 28, 36, 48])],
    [125, rng.pick([8, 16, 24])],
  ] as [number, number][]);
  return geschickt(a, b);
}

export const verdoppelnHalbierenSkill: SkillDef = {
  id: ID,
  topicId: 'kopfrechnen',
  title: 'Verdoppeln und Halbieren',
  description: 'Du verdoppelst und halbierst große Zahlen im Kopf.',
  stufen: {
    1: 'Zahlen bis 1000 verdoppeln und halbieren',
    2: 'Zahlen bis 100 000 verdoppeln und halbieren',
    3: 'Rückwärts rechnen und geschickt rechnen',
  },
  kmk: KMK,
  generate,
};
