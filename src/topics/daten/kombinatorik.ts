/**
 * Kombinatorik: Möglichkeiten systematisch zählen (Baumdiagramm, Tabelle).
 * Stufe 1: zwei Mengen (≤ 3 · 4) mit Baumdiagramm.
 * Stufe 2: zwei Mengen bis 4 · 4 ohne Bild; Reihenfolgen von 3 Dingen; Händeschütteln (3–5 Kinder).
 * Stufe 3: drei Mengen (≤ 36) mit Baumdiagramm; rückwärts rechnen; eine Wahl kommt dazu; 5–6 Kinder.
 */
import { fmt } from '../../core/format';
import type { Exercise, Rng, SkillDef, Step, Stufe, Visual } from '../../core/types';
import { listDe, makeExercise, numberBugs, speech } from './shared';

const SKILL = { id: 'daten.kombinatorik', kmk: ['DZ.kombinatorik', 'PK.problemloesen'] };

interface Dim {
  title: string;
  /** Accusative with article: 'einen Belag' (Du wählst …) */
  acc: string;
  /** Nominative with article: 'ein Belag' (Es kommt … dazu) */
  nom: string;
  opts: string[];
}

interface CombTheme {
  id: string;
  intro: string;
  emoji: string;
  dims: [Dim, Dim, Dim];
}

const THEMES: readonly CombTheme[] = [
  {
    id: 'eis',
    intro: 'Im Eiscafé kannst du wählen.',
    emoji: '🍦',
    dims: [
      { title: 'Eissorten', acc: 'eine Eissorte', nom: 'eine Eissorte', opts: ['Vanille', 'Schoko', 'Erdbeere', 'Zitrone', 'Mango'] },
      { title: 'Gefäße', acc: 'ein Gefäß', nom: 'ein Gefäß', opts: ['Waffel', 'Becher', 'Schale', 'Hörnchen'] },
      { title: 'Extras', acc: 'ein Extra', nom: 'ein Extra', opts: ['Sahne', 'Streusel', 'Keks', 'Soße'] },
    ],
  },
  {
    id: 'kleidung',
    intro: 'Im Schrank liegen diese Sachen.',
    emoji: '👕',
    dims: [
      { title: 'T-Shirts', acc: 'ein T-Shirt', nom: 'ein T-Shirt', opts: ['rot', 'blau', 'gelb', 'grün', 'weiß'] },
      { title: 'Hosen', acc: 'eine Hose', nom: 'eine Hose', opts: ['Jeans', 'Shorts', 'Jogginghose', 'Latzhose', 'Cordhose'] },
      { title: 'Mützen', acc: 'eine Mütze', nom: 'eine Mütze', opts: ['Wollmütze', 'Kappe', 'Sonnenhut', 'Stirnband'] },
    ],
  },
  {
    id: 'pausenbrot',
    intro: 'Für das Pausenbrot gibt es diese Sachen.',
    emoji: '🥪',
    dims: [
      { title: 'Brotsorten', acc: 'eine Brotsorte', nom: 'eine Brotsorte', opts: ['Vollkorn', 'Toast', 'Brötchen', 'Laugenbrot', 'Knäckebrot'] },
      { title: 'Beläge', acc: 'einen Belag', nom: 'ein Belag', opts: ['Käse', 'Gurke', 'Ei', 'Tomate', 'Quark'] },
      { title: 'Getränke', acc: 'ein Getränk', nom: 'ein Getränk', opts: ['Wasser', 'Saft', 'Tee', 'Milch'] },
    ],
  },
  {
    id: 'mensa',
    intro: 'In der Mensa gibt es heute diese Gerichte.',
    emoji: '🍝',
    dims: [
      { title: 'Vorspeisen', acc: 'eine Vorspeise', nom: 'eine Vorspeise', opts: ['Suppe', 'Salat', 'Melone', 'Gemüse'] },
      { title: 'Hauptgerichte', acc: 'ein Hauptgericht', nom: 'ein Hauptgericht', opts: ['Nudeln', 'Pizza', 'Reis', 'Kartoffeln', 'Fisch'] },
      { title: 'Nachtische', acc: 'einen Nachtisch', nom: 'ein Nachtisch', opts: ['Eis', 'Obst', 'Pudding', 'Joghurt'] },
    ],
  },
];

const NAMES = ['Anna', 'Ben', 'Cem', 'Dana', 'Elif', 'Finn', 'Greta', 'Hamid'];

function lines(dims: readonly Dim[], opts: readonly string[][]): string {
  return dims.map((d, i) => `${d.title}: ${opts[i].join(', ')}.`).join(' ');
}

function tree(opts: string[][]): Visual {
  return { type: 'tree', levels: opts };
}

/** All combinations as text: 'Vanille – Waffel, Vanille – Becher, …' (for the worked solution). */
export function combinations(opts: readonly string[][]): string[] {
  return opts.reduce<string[][]>((acc, level) => acc.flatMap((path) => level.map((o) => [...path, o])), [[]]).map((p) => p.join(' – '));
}

/** All orders of three items. */
export function permutations3<T>(items: readonly [T, T, T]): T[][] {
  const [a, b, c] = items;
  return [
    [a, b, c],
    [a, c, b],
    [b, a, c],
    [b, c, a],
    [c, a, b],
    [c, b, a],
  ];
}

export const handshakes = (n: number) => (n * (n - 1)) / 2;
const newPairs = (k: number) => (k === 1 ? '1 neues Paar' : `${fmt(k)} neue Paare`);

const PRODUCT_HINT = 'Jede Wahl passt mit jeder anderen Wahl zusammen. Rechne mal, nicht plus.';
/** Largest Baumdiagramm drawn in full (18 ends ≈ 640 px tall); counting its ends is part of the task. */
export const MAX_TREE_ENDS = 18;

/**
 * Worked steps for three sets. When the task shows the full Baumdiagramm (≤ 18 ends), the solution repeats it.
 * Larger trees (up to 36 ends, > 600 px tall) are drawn only for the first choice of the first set; the text
 * carries the step to all branches, so the picture stays on one screen.
 */
export function threeSetSteps(dims: readonly Dim[], opts: readonly string[][], fullTree: boolean): Step[] {
  const [s0, s1, s2] = opts.map((o) => o.length);
  const total = s0 * s1 * s2;
  if (fullTree) {
    return [
      {
        text: `Vom Start gehen ${fmt(s0)} Äste aus. Jeder teilt sich in ${fmt(s1)} Äste und jeder davon noch einmal in ${fmt(s2)} Äste.`,
        visual: tree(opts.map((o) => [...o])),
      },
      `${fmt(s0)} · ${fmt(s1)} = ${fmt(s0 * s1)} und ${fmt(s0 * s1)} · ${fmt(s2)} = ${fmt(total)}`,
      `Es gibt ${fmt(total)} Möglichkeiten.`,
    ];
  }
  const first = opts[0][0];
  return [
    {
      text: `Vom Start gehen ${fmt(s0)} Äste aus. Das Bild zeigt nur den Ast „${first}“. Er teilt sich in ${fmt(s1)} Äste und jeder davon noch einmal in ${fmt(s2)} Äste.`,
      visual: tree([[first], [...opts[1]], [...opts[2]]]),
    },
    `Bei „${first}“ gibt es ${fmt(s1)} · ${fmt(s2)} = ${fmt(s1 * s2)} Wege.`,
    `Bei den anderen ${dims[0].title} ist es genauso: ${fmt(s0)} · ${fmt(s1 * s2)} = ${fmt(total)}`,
    `Es gibt ${fmt(total)} Möglichkeiten.`,
  ];
}

// ─── Produkte von Mengen ─────────────────────────────────────────────────────

/** showTree 'auto': draw the Baumdiagramm when it has at most MAX_TREE_ENDS ends. */
function product(rng: Rng, stufe: Stufe, nDims: 2 | 3, treeMode: boolean | 'auto'): Exercise {
  const theme = rng.pick(THEMES);
  let sizes: number[];
  if (nDims === 2) {
    sizes = stufe === 1 ? [rng.int(2, 3), rng.int(2, 4)] : [rng.int(2, 4), rng.int(2, 4)];
    if (stufe === 2 && sizes[0] * sizes[1] < 6) sizes[1] = 3;
  } else {
    sizes = [rng.int(2, 4), rng.int(2, 3), rng.int(2, 3)];
  }
  const dims = theme.dims.slice(0, nDims);
  const opts = dims.map((d, i) => rng.sample(d.opts, sizes[i]));
  const total = sizes.reduce((a, b) => a * b, 1);
  const showTree = treeMode === 'auto' ? total <= MAX_TREE_ENDS : treeMode;
  const visual = showTree ? tree(opts) : undefined;
  const context = `${theme.intro} ${lines(dims, opts)}`;
  const prompt = `Du wählst ${listDe(dims.map((d) => d.acc))}. Wie viele Möglichkeiten gibt es?`;
  const formula = sizes.map((s) => fmt(s)).join(' · ');
  const all = combinations(opts);
  const steps: Step[] =
    nDims === 2
      ? [
          { text: `Für jede Wahl bei „${dims[0].title}“ gibt es ${fmt(sizes[1])} Möglichkeiten bei „${dims[1].title}“.`, visual: tree(opts) },
          `${formula} = ${fmt(total)}`,
          `Es gibt ${fmt(total)} Möglichkeiten: ${all.join(', ')}.`,
        ]
      : threeSetSteps(dims, opts, showTree);
  const hints = showTree
    ? ['Jeder Weg im Baumdiagramm vom Anfang bis ganz rechts ist eine Möglichkeit.', 'Zähle die Enden ganz rechts. Oder rechne: Anzahl mal Anzahl.']
    : ['Zeichne ein Baumdiagramm oder eine Tabelle.', `Überlege: Wie viele Möglichkeiten gibt es für jede Wahl bei „${dims[0].title}“?`];
  return makeExercise(SKILL, stufe, ['produkt', theme.id, opts.map((o) => o.join('-')).join('_'), showTree ? 'baum' : 'text'], {
    ab: stufe === 1 ? 1 : nDims === 3 ? 3 : 2,
    context,
    prompt,
    visual,
    emoji: theme.emoji,
    answer: { kind: 'number', value: total, unit: 'Möglichkeiten', label: 'Anzahl der Möglichkeiten' },
    hints,
    steps,
    bugs: numberBugs(total, [
      ['plus-statt-mal', sizes.reduce((a, b) => a + b, 0), PRODUCT_HINT],
      nDims === 3 ? ['dritte-vergessen', sizes[0] * sizes[1], `Denk auch an „${dims[2].title}“. Jeder Weg teilt sich noch einmal.`] : null,
      nDims === 3 ? ['halb-addiert', sizes[0] * sizes[1] + sizes[2], 'Du hast zum Schluss plus gerechnet. Jeder Weg teilt sich noch einmal: Rechne mal.'] : null,
    ]),
    praise: showTree ? 'Du hast alle Wege im Baumdiagramm gezählt.' : 'Du hast erkannt, dass du die Anzahlen malnehmen kannst.',
    srText: speech(context, showTree ? `Baumdiagramm: ${opts.map((o) => listDe(o, 'oder')).join('; danach jeweils ')}.` : '', prompt),
  });
}

function inverse(rng: Rng): Exercise {
  const theme = rng.pick(THEMES);
  const [d0, d1] = theme.dims;
  const a = rng.int(2, 4);
  const b = rng.int(2, 4);
  const total = a * b;
  const context = `Es gibt ${fmt(a)} ${d0.title}. Du wählst ${d0.acc} und ${d1.acc}. So gibt es ${fmt(total)} Möglichkeiten.`;
  const prompt = `Wie viele ${d1.title} gibt es?`;
  return makeExercise(SKILL, 3, ['rueckwaerts', theme.id, a, b], {
    ab: 3,
    knobel: true,
    context,
    prompt,
    emoji: theme.emoji,
    answer: { kind: 'number', value: b, unit: d1.title, label: `Anzahl ${d1.title}` },
    hints: [`Die Anzahl der Möglichkeiten ist ${fmt(a)} mal die Anzahl der ${d1.title}.`, `Welche Zahl mal ${fmt(a)} ergibt ${fmt(total)}?`],
    steps: [`${fmt(a)} · □ = ${fmt(total)}`, `${fmt(total)} : ${fmt(a)} = ${fmt(b)}`, `Es gibt ${fmt(b)} ${d1.title}.`],
    bugs: numberBugs(b, [
      ['minus-statt-geteilt', total - a, `Rechne nicht minus. Überlege: ${fmt(a)} mal wie viel ergibt ${fmt(total)}?`],
      ['gesamtzahl', total, 'Das ist die Zahl aller Möglichkeiten. Gesucht ist ein Teil davon.'],
    ]),
    praise: 'Du hast rückwärts gerechnet: geteilt statt mal.',
    srText: speech(context, prompt),
  });
}

function oneMore(rng: Rng): Exercise {
  const theme = rng.pick(THEMES);
  const dims = theme.dims.slice(0, 2);
  const a = rng.int(2, 3);
  const b = rng.int(2, 4);
  const pool0 = rng.sample(dims[0].opts, a + 1);
  const opts = [pool0.slice(0, a), rng.sample(dims[1].opts, b)];
  const extra = pool0[a];
  const context = `${theme.intro} ${lines(dims, opts)} Du wählst ${dims[0].acc} und ${dims[1].acc}.`;
  const prompt = `Jetzt kommt noch ${dims[0].nom} dazu: ${extra}. Wie viele Möglichkeiten gibt es jetzt mehr?`;
  return makeExercise(SKILL, 3, ['dazu', theme.id, opts.map((o) => o.join('-')).join('_'), extra], {
    ab: 3,
    knobel: true,
    context,
    prompt,
    emoji: theme.emoji,
    answer: { kind: 'number', value: b, unit: 'Möglichkeiten', label: 'Anzahl der neuen Möglichkeiten' },
    hints: [`Mit „${extra}“ entstehen neue Wege im Baumdiagramm.`, `Wie viele ${dims[1].title} passen zu „${extra}“?`],
    steps: [
      `Vorher: ${fmt(a)} · ${fmt(b)} = ${fmt(a * b)} Möglichkeiten.`,
      `Nachher: ${fmt(a + 1)} · ${fmt(b)} = ${fmt((a + 1) * b)} Möglichkeiten.`,
      `${fmt((a + 1) * b)} − ${fmt(a * b)} = ${fmt(b)}. „${extra}“ passt zu jeder Wahl bei „${dims[1].title}“.`,
      `Es gibt ${fmt(b)} Möglichkeiten mehr.`,
    ],
    bugs: numberBugs(b, [
      ['nur-eine', 1, `„${extra}“ passt zu jeder Wahl bei „${dims[1].title}“. Es kommen mehrere Möglichkeiten dazu.`],
      ['alle-nachher', (a + 1) * b, 'Das sind jetzt alle Möglichkeiten. Gefragt ist, wie viele dazukommen.'],
      ['alle-vorher', a * b, 'So viele waren es vorher. Gefragt ist, wie viele dazukommen.'],
    ]),
    praise: 'Du hast überlegt, wie viele neue Wege entstehen.',
    srText: speech(context, prompt),
  });
}

// ─── Reihenfolgen ────────────────────────────────────────────────────────────

const BOOKS = ['Märchenbuch', 'Tierbuch', 'Comic', 'Atlas', 'Lexikon', 'Rätselheft'];

function orders(rng: Rng): Exercise {
  const kind = rng.pick(['reihe', 'ziffern', 'buecher'] as const);
  let items: [string, string, string];
  let context: string;
  let prompt: string;
  if (kind === 'reihe') {
    items = rng.sample(NAMES, 3) as [string, string, string];
    context = `${listDe(items)} stellen sich in eine Reihe.`;
    prompt = 'Wie viele verschiedene Reihenfolgen gibt es?';
  } else if (kind === 'ziffern') {
    items = rng.sample([1, 2, 3, 4, 5, 6, 7, 8, 9], 3).map(String) as [string, string, string];
    context = `Du hast drei Ziffernkarten: ${listDe(items)}.`;
    prompt = 'Wie viele verschiedene dreistellige Zahlen kannst du damit legen?';
  } else {
    items = rng.sample(BOOKS, 3) as [string, string, string];
    context = `Du stellst drei Bücher ins Regal: ${listDe(items)}.`;
    prompt = 'Wie viele verschiedene Reihenfolgen gibt es?';
  }
  const all = permutations3(items).map((p) => (kind === 'ziffern' ? p.join('') : p.join(' – ')));
  return makeExercise(SKILL, 2, ['reihenfolge', kind, items.join('-')], {
    ab: 2,
    context,
    prompt,
    answer: { kind: 'number', value: 6, unit: kind === 'ziffern' ? 'Zahlen' : 'Reihenfolgen', label: 'Anzahl' },
    hints: ['Gehe systematisch vor: Wer oder was kann ganz vorne stehen?', 'Wenn der erste Platz fest ist: Wie viele Möglichkeiten bleiben für den zweiten Platz?'],
    steps: [
      'Für den 1. Platz gibt es 3 Möglichkeiten, für den 2. Platz noch 2, für den 3. Platz bleibt 1.',
      '3 · 2 · 1 = 6',
      `Alle Möglichkeiten: ${all.join(', ')}.`,
      `Es gibt 6 ${kind === 'ziffern' ? 'Zahlen' : 'Reihenfolgen'}.`,
    ],
    bugs: numberBugs(6, [
      ['nur-erster-platz', 3, 'Das sind nur die Möglichkeiten für den ersten Platz. Überlege für jeden Platz.'],
      ['mit-wiederholung', 9, 'Jedes Ding kann nur einmal vorkommen. Für den 2. Platz bleiben nur noch 2.'],
      ['alle-plaetze-drei', 27, 'Jedes Ding gibt es nur einmal. Für den 2. Platz bleiben nur noch 2, für den 3. Platz nur 1.'],
    ]),
    praise: 'Du bist systematisch vorgegangen und hast keine Reihenfolge vergessen.',
    srText: speech(context, prompt),
  });
}

// ─── Händeschütteln / jeder gegen jeden ──────────────────────────────────────

function pairs(rng: Rng, stufe: 2 | 3): Exercise {
  const n = stufe === 2 ? rng.int(3, 5) : rng.int(5, 6);
  const names = rng.sample(NAMES, n);
  const kind = rng.pick(['haende', 'turnier', 'anstossen'] as const);
  const answer = handshakes(n);
  const first = names[0];
  const story = {
    haende: {
      context: `${listDe(names)} treffen sich. Jedes Kind gibt jedem anderen Kind genau einmal die Hand.`,
      prompt: 'Wie oft werden Hände geschüttelt?',
      unit: 'Mal',
      hint: `Beginne mit ${first}: Wie vielen Kindern gibt ${first} die Hand?`,
      result: (k: number) => `Es werden ${fmt(k)}-mal Hände geschüttelt.`,
    },
    turnier: {
      context: `${listDe(names)} spielen Tischtennis. Jedes Kind spielt genau einmal gegen jedes andere Kind.`,
      prompt: 'Wie viele Spiele gibt es?',
      unit: 'Spiele',
      hint: `Beginne mit ${first}: Gegen wie viele Kinder spielt ${first}?`,
      result: (k: number) => `Es gibt ${fmt(k)} Spiele.`,
    },
    anstossen: {
      context: `${listDe(names)} stoßen mit Saft an. Jedes Glas stößt genau einmal an jedes andere Glas.`,
      prompt: 'Wie oft klirren die Gläser?',
      unit: 'Mal',
      hint: `Beginne mit ${first}: Mit wie vielen Kindern stößt ${first} an?`,
      result: (k: number) => `Die Gläser klirren ${fmt(k)}-mal.`,
    },
  }[kind];
  const parts = Array.from({ length: n - 1 }, (_, i) => n - 1 - i);
  return makeExercise(SKILL, stufe, ['paare', kind, names.join('-')], {
    ab: stufe,
    knobel: stufe === 3,
    context: story.context,
    prompt: story.prompt,
    emoji: kind === 'turnier' ? '🏓' : kind === 'anstossen' ? '🥤' : '🤝',
    answer: { kind: 'number', value: answer, unit: story.unit, label: 'Anzahl' },
    hints: [story.hint, `Zähle bei ${names[1]} nur die neuen Paare. ${first} und ${names[1]} sind schon gezählt.`],
    steps: [
      `${names[0]}: ${fmt(n - 1)} Paare. ${names[1]}: noch ${newPairs(n - 2)}.${n > 3 ? ` ${names[2]}: noch ${newPairs(n - 3)}.` : ''}${n > 4 ? ' Und so weiter.' : ''}`,
      `${parts.map((p) => fmt(p)).join(' + ')} = ${fmt(answer)}`,
      story.result(answer),
    ],
    bugs: numberBugs(answer, [
      ['doppelt-gezaehlt', n * (n - 1), `Du hast jedes Paar doppelt gezählt. ${names[0]} und ${names[1]} ist dasselbe Paar wie ${names[1]} und ${names[0]}.`],
      ['nur-ein-kind', n - 1, `Das sind nur die Paare von ${names[0]}. Denk auch an die anderen Kinder.`],
      ['alle-mal-alle', n * n, 'Niemand macht das mit sich selbst. Und jedes Paar zählt nur einmal.'],
    ]),
    praise: 'Du hast jedes Paar genau einmal gezählt.',
    srText: speech(story.context, story.prompt),
  });
}

function generate(rng: Rng, stufe: Stufe): Exercise {
  if (stufe === 1) return product(rng, 1, 2, true);
  if (stufe === 2) {
    const roll = rng.next();
    if (roll < 0.4) return product(rng, 2, 2, false);
    if (roll < 0.7) return orders(rng);
    return pairs(rng, 2);
  }
  const roll = rng.next();
  if (roll < 0.35) return product(rng, 3, 3, 'auto');
  if (roll < 0.6) return inverse(rng);
  if (roll < 0.8) return oneMore(rng);
  return pairs(rng, 3);
}

export const kombinatorikSkill: SkillDef = {
  id: SKILL.id,
  topicId: 'daten',
  title: 'Möglichkeiten zählen',
  description: 'Du findest alle Möglichkeiten mit einem Baumdiagramm oder einer Rechnung.',
  stufen: {
    1: 'Zwei Dinge kombinieren, mit Baumdiagramm',
    2: 'Kombinieren, Reihenfolgen, Händeschütteln',
    3: 'Drei Dinge kombinieren und rückwärts rechnen',
  },
  kmk: SKILL.kmk,
  generate,
};
