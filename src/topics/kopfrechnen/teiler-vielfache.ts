import { BOX, DIV, TIMES } from '../../core/format';
import type { Exercise, Rng, SkillDef, Stufe } from '../../core/types';
import { bugList, choiceAnswer, joinDe, type WrongOption } from '../zahlen/shared';

const ID = 'kopfrechnen.teiler-vielfache';
const KMK = ['ZO.kopfrechnen', 'PK.problemloesen'];

function base(stufe: Stufe, ab: 1 | 2 | 3, key: string) {
  return { key: `${ID}:${stufe}:${key}`, topicId: 'kopfrechnen' as const, skillId: ID, stufe, ab, kmk: KMK };
}

export function divisors(n: number): number[] {
  return Array.from({ length: n }, (_, i) => i + 1).filter((d) => n % d === 0);
}

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
export const lcm = (a: number, b: number) => (a * b) / gcd(a, b);

/** 'q · d = n' or the two neighbouring multiples. */
function why(n: number, d: number): string {
  if (n % d === 0) return `${d} ${TIMES} ${n / d} = ${n}.`;
  const q = Math.floor(n / d);
  return `${d} ${TIMES} ${q} = ${d * q} und ${d} ${TIMES} ${q + 1} = ${d * (q + 1)}. ${n} liegt dazwischen.`;
}

// ─── Stufe 1 ─────────────────────────────────────────────────────────────────

export function vielfachesWaehlen(rng: Rng, m: number, k: number): Exercise {
  const x = m * k;
  const cands = [x + 1, x - 1, x + m + 1, x - m + 2, x + 2].filter((y) => y > 1 && y % m !== 0);
  const wrong: WrongOption[] = cands.map((y) => ({ label: String(y), whyWrong: `${y} ist kein Vielfaches von ${m}: ${why(y, m)}` }));
  return {
    ...base(1, 1, `waehlen:${m}:${k}`),
    prompt: `Welche Zahl ist ein Vielfaches von ${m}?`,
    answer: choiceAnswer(rng, String(x), rng.shuffle(wrong)),
    hints: [`Vielfache von ${m} sind die Ergebnisse der ${m}er-Reihe.`, `Zähle in ${m}er-Schritten: ${m}, ${2 * m}, ${3 * m} …`],
    steps: [`${m} ${TIMES} ${k} = ${x}`, `Also ist ${x} ein Vielfaches von ${m}.`],
    praise: `Du hast die ${m}er-Reihe genutzt.`,
    srText: `Welche Zahl ist ein Vielfaches von ${m}?`,
  };
}

export function naechstesVielfaches(m: number, k: number): Exercise {
  const x = m * k;
  const v = x + m;
  return {
    ...base(1, 1, `naechstes:${m}:${k}`),
    prompt: `Welches Vielfache von ${m} kommt nach ${x}?`,
    answer: { kind: 'number', value: v, label: 'Nächstes Vielfaches' },
    hints: [`Vielfache von ${m} liegen immer ${m} auseinander.`, `Rechne ${x} + ${m}.`],
    steps: [`${x} = ${m} ${TIMES} ${k}`, `Das nächste Vielfache: ${m} ${TIMES} ${k + 1} = ${v}`],
    bugs: bugList(v, [
      ['plus-eins', x + 1, `Das ist der Nachfolger. Vielfache von ${m} kommen in ${m}er-Schritten.`],
      ['falsche-reihe', m > 2 ? x + m - 1 : null, `Das ist ${m - 1} mehr. Vielfache von ${m} kommen in ${m}er-Schritten.`],
    ]),
    praise: `Du bist in ${m}er-Schritten weitergegangen.`,
    srText: `Welches Vielfache von ${m} kommt nach ${x}?`,
  };
}

export function istTeiler(d: number, n: number): Exercise {
  const yes = n % d === 0;
  return {
    ...base(1, 2, `istteiler:${d}:${n}`),
    prompt: `Ist ${d} ein Teiler von ${n}?`,
    // no □: the answer is Ja/Nein, not a number
    expression: `${n} ${DIV} ${d}`,
    // fixed order: 'Ja' first, 'Nein' second
    answer: {
      kind: 'choice',
      options: yes
        ? [{ label: `Ja, ${n} ${DIV} ${d} geht ohne Rest.` }, { label: `Nein, ${n} ${DIV} ${d} geht nicht ohne Rest.`, whyWrong: `Prüfe mit der Malaufgabe: ${why(n, d)}` }]
        : [{ label: `Ja, ${n} ${DIV} ${d} geht ohne Rest.`, whyWrong: `Prüfe mit der Malaufgabe: ${why(n, d)}` }, { label: `Nein, ${n} ${DIV} ${d} geht nicht ohne Rest.` }],
      correct: yes ? 0 : 1,
    },
    hints: [`Suche in der ${d}er-Reihe: Kommt ${n} darin vor?`, `Prüfe mit einer Malaufgabe: ${d} ${TIMES} ${BOX} = ${n}?`],
    steps: [why(n, d), yes ? `${d} ist ein Teiler von ${n}.` : `${d} ist kein Teiler von ${n}.`],
    praise: 'Du hast mit der Malaufgabe geprüft.',
    srText: `Ist ${d} ein Teiler von ${n}?`,
  };
}

// ─── Stufe 2 ─────────────────────────────────────────────────────────────────

export function teilerpaare(n: number, smalls: number[]): Exercise {
  const fields = smalls.map((d) => ({ id: `d${d}`, value: n / d, before: `= ${d} ${TIMES}`, label: `Partner von ${d}` }));
  return {
    ...base(2, 2, `paare:${n}`),
    prompt: `Finde die Teilerpaare von ${n}.`,
    expression: `${n} = 1 ${TIMES} ${n}`,
    answer: { kind: 'multi', fields },
    hints: ['Zu jedem Teiler gehört ein Partner. Zusammen malgenommen ergeben sie die Zahl.', `Rechne ${n} ${DIV} ${smalls[0]}, dann ${n} ${DIV} ${smalls[1] ?? smalls[0]} …`],
    steps: [...smalls.map((d) => `${d} ${TIMES} ${n / d} = ${n}`), `Teiler von ${n}: ${joinDe(divisors(n).map(String))}.`],
    praise: 'Du hast die Teiler als Paare gefunden.',
    srText: `Finde die Teilerpaare von ${n}. ${n} ist 1 mal ${n}. ${smalls.map((d) => `${d} mal Lücke`).join(', ')}.`,
  };
}

export function anzahlTeiler(n: number): Exercise {
  const ds = divisors(n);
  return {
    ...base(2, 2, `anzahl:${n}`),
    prompt: `Wie viele Teiler hat ${n}?`,
    answer: { kind: 'number', value: ds.length, unit: 'Teiler', label: 'Anzahl Teiler' },
    hints: ['Suche die Teiler in Paaren: 1 und die Zahl selbst, dann 2 und …', 'Vergiss nicht die 1 und die Zahl selbst.'],
    steps: [`Teilerpaare: ${ds.filter((d) => d * d <= n).map((d) => (d * d === n ? `${d} ${TIMES} ${d}` : `${d} ${TIMES} ${n / d}`)).join(', ')}`, `Teiler: ${joinDe(ds.map(String))}.`, `Das sind ${ds.length} Teiler.`],
    bugs: bugList(ds.length, [
      ['ohne-1-und-zahl', ds.length - 2, 'Auch 1 und die Zahl selbst sind Teiler.'],
      ['eins-vergessen', ds.length - 1, 'Fast! Hast du an die 1 und an die Zahl selbst gedacht?'],
    ]),
    praise: 'Du hast systematisch in Paaren gesucht.',
    srText: `Wie viele Teiler hat ${n}?`,
  };
}

export function keinTeiler(rng: Rng, n: number, x: number, others: number[]): Exercise {
  const wrong: WrongOption[] = others.map((d) => ({ label: String(d), whyWrong: `${d} ${TIMES} ${n / d} = ${n}. Also ist ${d} ein Teiler.` }));
  return {
    ...base(2, 2, `kein:${n}:${x}:${others.join('-')}`),
    prompt: `Welche Zahl ist kein Teiler von ${n}?`,
    answer: choiceAnswer(rng, String(x), wrong),
    hints: ['Prüfe jede Zahl mit einer Malaufgabe.', `Passt die Zahl ohne Rest in ${n}?`],
    steps: [...others.map((d) => `${d} ${TIMES} ${n / d} = ${n}`), why(n, x), `${x} ist kein Teiler von ${n}.`],
    praise: 'Du hast jede Zahl genau geprüft.',
    srText: `Welche Zahl ist kein Teiler von ${n}?`,
  };
}

// ─── Stufe 3 ─────────────────────────────────────────────────────────────────

export function kgv(a: number, b: number): Exercise {
  const v = lcm(a, b);
  return {
    ...base(3, 3, `kgv:${a}:${b}`),
    prompt: `Wie heißt die kleinste Zahl, die ein Vielfaches von ${a} und von ${b} ist?`,
    answer: { kind: 'number', value: v, label: 'Kleinstes gemeinsames Vielfaches' },
    hints: [`Schreibe die ersten Vielfachen von ${Math.max(a, b)} auf.`, `Prüfe jede: Ist sie auch ein Vielfaches von ${Math.min(a, b)}?`],
    steps: [
      `Vielfache von ${Math.max(a, b)}: ${Array.from({ length: v / Math.max(a, b) }, (_, i) => (i + 1) * Math.max(a, b)).join(', ')}`,
      `${v} ist auch ein Vielfaches von ${Math.min(a, b)}: ${Math.min(a, b)} ${TIMES} ${v / Math.min(a, b)} = ${v}.`,
      `Die kleinste gemeinsame Zahl ist ${v}.`,
    ],
    bugs: bugList(v, [['produkt', a * b, `${a * b} passt auch, ist aber nicht die kleinste. Suche eine kleinere.`]]),
    praise: 'Du hast die Vielfachen systematisch verglichen.',
    srText: `Wie heißt die kleinste Zahl, die ein Vielfaches von ${a} und von ${b} ist?`,
    knobel: true,
  };
}

/** 'Ich bin ein Vielfaches von m (und von m2). Ich liege zwischen lo und hi.' — unique by construction. */
export function raetsel(m: number, m2: number | null, lo: number, hi: number): Exercise {
  const fits = (x: number) => x > lo && x < hi && x % m === 0 && (m2 === null || x % m2 === 0);
  const sol = Array.from({ length: 100 }, (_, i) => i + 1).filter(fits);
  const v = sol[0];
  const clue = m2 === null ? `Ich bin ein Vielfaches von ${m}.` : `Ich bin ein Vielfaches von ${m} und von ${m2}.`;
  const prompt = `${clue} Ich bin größer als ${lo} und kleiner als ${hi}. Wer bin ich?`;
  return {
    ...base(3, 3, `raetsel:${m}:${m2 ?? 0}:${lo}:${hi}`),
    prompt,
    answer: { kind: 'number', value: v, label: 'Gesuchte Zahl' },
    hints: [`Zähle die Vielfachen von ${m} auf.`, `Welche davon liegt zwischen ${lo} und ${hi}?`],
    steps: [
      `Vielfache von ${m} zwischen ${lo} und ${hi}: ${Array.from({ length: 100 }, (_, i) => i + 1).filter((x) => x > lo && x < hi && x % m === 0).join(', ')}.`,
      ...(m2 !== null ? [`Davon ist nur ${v} auch ein Vielfaches von ${m2}.`] : []),
      `Die gesuchte Zahl ist ${v}.`,
    ],
    bugs: bugList(v, [['grenze', hi % m === 0 && (m2 === null || hi % m2 === 0) ? hi : null, `${hi} ist nicht kleiner als ${hi}. Die Zahl muss dazwischen liegen.`]]),
    praise: 'Du hast alle Hinweise geprüft.',
    srText: prompt,
    knobel: true,
  };
}

export function gruppen(n: number): Exercise {
  const ds = divisors(n);
  const ok = ds.filter((d) => d >= 2 && d <= n / 2);
  return {
    ...base(3, 3, `gruppen:${n}`),
    kmk: [...KMK, 'ZO.sachrechnen'],
    context: `${n} Kinder sollen gleich große Gruppen bilden. Es soll mindestens 2 Gruppen geben. In jeder Gruppe sind mindestens 2 Kinder.`,
    emoji: '👧',
    prompt: 'Wie viele verschiedene Gruppengrößen sind möglich?',
    answer: { kind: 'number', value: ok.length, unit: 'Möglichkeiten', label: 'Anzahl Möglichkeiten' },
    hints: [`Die Gruppengröße muss ein Teiler von ${n} sein.`, 'Gruppen mit 1 Kind oder nur eine große Gruppe zählen nicht.'],
    steps: [`Teiler von ${n}: ${joinDe(ds.map(String))}.`, `1 und ${n} fallen weg.`, `Möglich: Gruppen mit ${joinDe(ok.map(String))} Kindern. Das sind ${ok.length} Möglichkeiten.`],
    bugs: bugList(ok.length, [
      ['alle-teiler', ds.length, `1 Kind ist keine Gruppe, und ${n} Kinder sind nur eine Gruppe. Lass diese weg.`],
      ['einer-zu-viel', ds.length - 1, 'Prüfe die Bedingungen: mindestens 2 Gruppen, in jeder mindestens 2 Kinder.'],
    ]),
    praise: 'Du hast die Teiler genutzt und die Bedingungen geprüft.',
    srText: `${n} Kinder sollen gleich große Gruppen bilden. Es soll mindestens 2 Gruppen geben, in jeder mindestens 2 Kinder. Wie viele verschiedene Gruppengrößen sind möglich?`,
    knobel: true,
  };
}

// ─── Generator ───────────────────────────────────────────────────────────────

const RICH = [12, 18, 20, 24, 30, 36, 40, 42, 48, 60, 72, 80, 84, 90, 96, 100];

function generate(rng: Rng, stufe: Stufe): Exercise {
  if (stufe === 1) {
    const v = rng.pick(['waehlen', 'naechstes', 'istteiler'] as const);
    const m = rng.int(3, 9);
    if (v === 'waehlen') return vielfachesWaehlen(rng, m, rng.int(2, 10));
    if (v === 'naechstes') return naechstesVielfaches(m, rng.int(2, 9));
    const n = rng.chance(0.5) ? m * rng.int(3, 10) : m * rng.int(3, 9) + rng.int(1, m - 1);
    return istTeiler(m, n);
  }
  if (stufe === 2) {
    const v = rng.pick(['paare', 'anzahl', 'kein'] as const);
    const n = rng.pick(RICH);
    const ds = divisors(n);
    if (v === 'paare') {
      // all pairs (at most 5 for the numbers in RICH): the prompt asks for 'die Teilerpaare'
      const smalls = ds.filter((d) => d > 1 && d * d <= n);
      return teilerpaare(n, smalls);
    }
    if (v === 'anzahl') return anzahlTeiler(rng.int(10, 100));
    const non = Array.from({ length: 11 }, (_, i) => i + 2).filter((d) => n % d !== 0);
    const others = rng.sample(ds.filter((d) => d > 1 && d < n), 3).sort((a, b) => a - b);
    return keinTeiler(rng, n, rng.pick(non), others);
  }
  const v = rng.pick(['kgv', 'raetsel', 'raetsel', 'gruppen'] as const);
  if (v === 'kgv') {
    const pairs: [number, number][] = [];
    for (let a = 2; a <= 12; a++) for (let b = a + 1; b <= 12; b++) if (lcm(a, b) <= 100 && lcm(a, b) !== b) pairs.push([a, b]);
    const [a, b] = rng.pick(pairs);
    return rng.chance(0.5) ? kgv(a, b) : kgv(b, a);
  }
  if (v === 'gruppen') return gruppen(rng.pick([12, 16, 18, 20, 24, 28, 30, 32, 36]));
  // find a puzzle with exactly one solution
  for (;;) {
    const m = rng.int(3, 12);
    const m2 = rng.chance(0.4) ? rng.int(2, 6) : null;
    const lo = rng.int(1, 9) * 10;
    const hi = lo + 10;
    const count = Array.from({ length: 100 }, (_, i) => i + 1).filter((x) => x > lo && x < hi && x % m === 0 && (m2 === null || x % m2 === 0)).length;
    if (count === 1 && (m2 === null || (m % m2 !== 0 && m2 % m !== 0))) return raetsel(m, m2, lo, hi);
  }
}

export const teilerVielfacheSkill: SkillDef = {
  id: ID,
  topicId: 'kopfrechnen',
  title: 'Teiler und Vielfache',
  description: 'Du findest Teiler und Vielfache von Zahlen bis 100.',
  stufen: {
    1: 'Vielfache erkennen, Teiler prüfen',
    2: 'Teilerpaare und Anzahl der Teiler',
    3: 'Zahlenrätsel und gemeinsame Vielfache',
  },
  kmk: KMK,
  generate,
};
