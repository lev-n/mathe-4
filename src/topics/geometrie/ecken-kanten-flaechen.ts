/**
 * Ecken, Kanten und Flächen von Körpern zählen.
 * Facts: Würfel/Quader 8/12/6, quadratische Pyramide 5/8/5, dreiseitiges Prisma 6/9/5,
 * Zylinder 0 Ecken/2 Kanten/3 Flächen, Kegel 1 Kante/2 Flächen (plus Spitze), Kugel 0/0/1.
 * Convention (stated in tasks and steps): gebogene Flächen und gebogene Kanten werden mitgezählt;
 * die Spitze eines Kegels heißt Spitze – wir fragen nie nach den Ecken eines Kegels.
 * Stufe 1: one count for Würfel, Quader, Pyramide or Prisma; what meets where (Kanten an einer Ecke …).
 * Stufe 2: all three counts; Kantenmodelle (Stäbchen = Kanten, Knetkugeln = Ecken); Sticker = Flächen.
 * Stufe 3: curved solids; two different Kantenmodelle together; which solid has 6/9/5 …; how many models from n Stäbchen.
 */
import { fmt } from '../../core/format';
import type { Bug, Exercise, MultiAnswer, MultiField, Rng, SkillDef, SolidKind, Stufe } from '../../core/types';
import { BugList, makeChoice, praiseFrom } from './shared';
import { SOLIDS } from './solids';

const ID = 'geometrie.ecken-kanten-flaechen';

type Part = 'ecken' | 'kanten' | 'flaechen';
const PART_NAME: Record<Part, string> = { ecken: 'Ecken', kanten: 'Kanten', flaechen: 'Flächen' };
const PART_ONE: Record<Part, string> = { ecken: 'Ecke', kanten: 'Kante', flaechen: 'Fläche' };
/** '1 Kante', '0 Ecken', '3 Flächen' */
const countWord = (n: number, p: Part) => `${fmt(n)} ${n === 1 ? PART_ONE[p] : PART_NAME[p]}`;
const POLYHEDRA: readonly SolidKind[] = ['wuerfel', 'quader', 'pyramide', 'prisma'];
const NAMES = ['Mia', 'Ben', 'Lena', 'Emil', 'Aylin', 'Noah', 'Sofia', 'Jonas', 'Mila', 'Elias'];

function base(stufe: Stufe, key: string, kmk: string[] = ['RF.figuren']): Pick<Exercise, 'key' | 'topicId' | 'skillId' | 'stufe' | 'kmk'> {
  return { key: `${ID}:${stufe}:${key}`, topicId: 'geometrie', skillId: ID, stufe, kmk };
}

const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

const WHAT_IS: Record<Part, string> = {
  ecken: 'Ecken sind die Punkte, an denen Kanten zusammentreffen.',
  kanten: 'Kanten sind die Linien, an denen zwei Flächen zusammenstoßen.',
  flaechen: 'Flächen sind die Seiten, auf die du den Körper stellen könntest.',
};

const HIDDEN_HINT: Record<Part, string> = {
  ecken: 'Du hast nur die Ecken gezählt, die du vorne siehst. Denk auch an die versteckte Ecke hinten.',
  kanten: 'Du hast nur die durchgezogenen Linien gezählt. Die gestrichelten Linien sind versteckte Kanten hinten – zähle sie mit.',
  flaechen: 'Du hast nur die Flächen gezählt, die du siehst. Denk auch an die Flächen hinten und unten.',
};

function countSteps(solid: SolidKind, part: Part): string[] {
  const f = SOLIDS[solid];
  const n = f[part];
  const how: Record<SolidKind, Record<Part, string>> = {
    wuerfel: { ecken: 'Oben 4 Ecken und unten 4 Ecken: 4 + 4 = 8.', kanten: 'Oben 4, unten 4 und 4 senkrechte Kanten: 4 + 4 + 4 = 12.', flaechen: 'Oben, unten, vorne, hinten, links und rechts: 6 Flächen.' },
    quader: { ecken: 'Oben 4 Ecken und unten 4 Ecken: 4 + 4 = 8.', kanten: 'Oben 4, unten 4 und 4 senkrechte Kanten: 4 + 4 + 4 = 12.', flaechen: 'Oben, unten, vorne, hinten, links und rechts: 6 Flächen.' },
    pyramide: { ecken: 'Unten 4 Ecken und oben die Spitze: 4 + 1 = 5.', kanten: 'Unten 4 Kanten und 4 Kanten hinauf zur Spitze: 4 + 4 = 8.', flaechen: 'Unten 1 Quadrat und rundherum 4 Dreiecke: 1 + 4 = 5.' },
    prisma: { ecken: 'Vorne 3 Ecken und hinten 3 Ecken: 3 + 3 = 6.', kanten: 'Vorne 3, hinten 3 und 3 Kanten dazwischen: 3 + 3 + 3 = 9.', flaechen: 'Vorne und hinten je 1 Dreieck, dazwischen 3 Rechtecke: 2 + 3 = 5.' },
    zylinder: { ecken: 'Ein Zylinder hat keine Ecken.', kanten: 'Oben und unten ist je eine gebogene Kante: 1 + 1 = 2.', flaechen: 'Oben und unten je ein Kreis und dazwischen 1 gebogene Fläche: 2 + 1 = 3.' },
    kegel: { ecken: 'Ein Kegel hat eine Spitze, aber keine Ecken.', kanten: 'Unten am Kreis ist 1 gebogene Kante.', flaechen: 'Unten 1 Kreis und 1 gebogene Fläche: 1 + 1 = 2.' },
    kugel: { ecken: 'Eine Kugel hat keine Ecken.', kanten: 'Eine Kugel hat keine Kanten.', flaechen: 'Eine Kugel hat nur 1 gebogene Fläche.' },
  };
  return [how[solid][part], `${cap(f.ein)} hat ${countWord(n, part)}.`];
}

// ─── Stufe 1 ────────────────────────────────────────────────────────────────

function singleCount(rng: Rng): Exercise {
  const solid = rng.pick(POLYHEDRA);
  const part = rng.pick<Part>(['ecken', 'kanten', 'flaechen']);
  const f = SOLIDS[solid];
  const value = f[part];
  const bugs = new BugList(value).add('nur-sichtbare', f.visible[part], HIDDEN_HINT[part]);
  for (const other of ['ecken', 'kanten', 'flaechen'] as Part[]) {
    if (other !== part) bugs.add(`verwechselt-${other}`, f[other], `Du hast die ${PART_NAME[other]} gezählt. ${WHAT_IS[part]}`);
  }
  return {
    ...base(1, `${solid}:${part}`),
    ab: 1,
    prompt: `Wie viele ${PART_NAME[part]} hat ${f.ein}?`,
    visual: { type: 'solid', solid },
    answer: { kind: 'number', value, unit: PART_NAME[part] },
    hints: [WHAT_IS[part], 'Die gestrichelten Linien zeigen, was hinten versteckt ist. Zähle es mit.', 'Zähle geordnet: erst vorne, dann hinten.'],
    steps: countSteps(solid, part),
    bugs: bugs.list,
    praise: praiseFrom(rng, ['Du hast auch an die versteckten Teile hinten gedacht.', 'Du hast geordnet gezählt: erst vorne, dann hinten.']),
    srText: `Abgebildet ist ${f.ein}. Verdeckte Kanten sind gestrichelt. Wie viele ${PART_NAME[part]} hat ${f.ein}?`,
  };
}

interface MeetItem {
  id: string;
  solid: SolidKind;
  prompt: string;
  value: number;
  unit: string;
  bugs: [number, string][];
  hints: string[];
  steps: string[];
}

/** Where Ecken, Kanten and Flächen meet – one look at a single place of the solid. */
const MEET_ITEMS: MeetItem[] = [
  {
    id: 'kanten-an-ecke', solid: 'wuerfel', prompt: 'Wie viele Kanten treffen sich an einer Ecke des Würfels?', value: 3, unit: 'Kanten',
    bugs: [
      [2, 'Schau auch nach hinten: Von jeder Ecke geht noch eine dritte Kante weg.'],
      [12, 'Das sind alle Kanten des Würfels. Gefragt sind nur die Kanten an einer Ecke.'],
    ],
    hints: ['Such dir eine Ecke aus.', 'Fahre jede Kante entlang, die von dieser Ecke weggeht.'],
    steps: ['Von jeder Ecke geht eine Kante zur Seite, eine nach oben oder unten und eine nach vorne oder hinten.', 'An jeder Ecke des Würfels treffen sich 3 Kanten.'],
  },
  {
    id: 'kanten-an-spitze', solid: 'pyramide', prompt: 'Wie viele Kanten treffen sich an der Spitze der Pyramide?', value: 4, unit: 'Kanten',
    bugs: [
      [3, 'Die gestrichelte Kante hinten führt auch zur Spitze. Zähle sie mit.'],
      [8, 'Das sind alle Kanten der Pyramide. Gefragt sind nur die Kanten an der Spitze.'],
    ],
    hints: ['Fahre mit dem Finger von der Spitze nach unten.', 'Die gestrichelten Linien zeigen, was hinten versteckt ist. Zähle es mit.'],
    steps: ['Von jeder Ecke der quadratischen Grundfläche führt eine Kante hinauf zur Spitze.', 'Die Grundfläche hat 4 Ecken. An der Spitze treffen sich 4 Kanten.'],
  },
  {
    id: 'flaechen-an-kante', solid: 'wuerfel', prompt: 'Wie viele Flächen stoßen an einer Kante des Würfels zusammen?', value: 2, unit: 'Flächen',
    bugs: [
      [3, 'An einer Ecke treffen sich 3 Flächen. Schau nur auf eine Kante: links und rechts davon liegt je eine Fläche.'],
      [6, 'Das sind alle Flächen des Würfels. Gefragt sind nur die Flächen an einer Kante.'],
    ],
    hints: ['Such dir eine Kante aus.', 'Welche Flächen berühren diese Kante?'],
    steps: ['Eine Kante ist die Linie, an der zwei Flächen zusammenstoßen.', 'An jeder Kante des Würfels stoßen 2 Flächen zusammen.'],
  },
  {
    id: 'ecken-einer-flaeche', solid: 'wuerfel', prompt: 'Wie viele Ecken hat eine einzige Fläche des Würfels?', value: 4, unit: 'Ecken',
    bugs: [[8, 'Das sind die Ecken des ganzen Würfels. Gefragt ist nur eine Fläche.']],
    hints: ['Schau dir nur die vordere Fläche an.', 'Welche Form hat diese Fläche?'],
    steps: ['Jede Fläche des Würfels ist ein Quadrat.', 'Ein Quadrat hat 4 Ecken. Eine Fläche des Würfels hat 4 Ecken.'],
  },
];

function meetCount(rng: Rng): Exercise {
  const item = rng.pick(MEET_ITEMS);
  const bugs = new BugList(item.value);
  item.bugs.forEach(([v, h], i) => bugs.add(`${item.id}-${i}`, v, h));
  return {
    ...base(1, `treffen:${item.id}`),
    ab: 1,
    prompt: item.prompt,
    visual: { type: 'solid', solid: item.solid },
    answer: { kind: 'number', value: item.value, unit: item.unit },
    hints: item.hints,
    steps: item.steps,
    bugs: bugs.list,
    praise: praiseFrom(rng, ['Du hast genau an einer Stelle des Körpers gezählt.', 'Du hast Ecken, Kanten und Flächen sicher unterschieden.']),
    srText: `Abgebildet ist ${SOLIDS[item.solid].ein}. Verdeckte Kanten sind gestrichelt. ${item.prompt}`,
  };
}

// ─── Stufe 2 ────────────────────────────────────────────────────────────────

function fieldsFor(parts: Part[], values: Record<Part, number>): MultiField[] {
  return parts.map((p) => ({ id: p, value: values[p], before: `${PART_NAME[p]}:`, label: `Anzahl der ${PART_NAME[p]}` }));
}

function allCounts(rng: Rng): Exercise {
  const solid = rng.pick(POLYHEDRA);
  const f = SOLIDS[solid];
  const answer: MultiAnswer = { kind: 'multi', fields: fieldsFor(['ecken', 'kanten', 'flaechen'], f) };
  const bugs: Bug[] = [
    { id: 'ecken-kanten-vertauscht', match: { ecken: f.kanten, kanten: f.ecken }, hint: 'Du hast Ecken und Kanten vertauscht. Ecken sind Punkte, Kanten sind Linien.' },
    { id: 'nur-sichtbare-kanten', match: { kanten: f.visible.kanten }, hint: HIDDEN_HINT.kanten },
    { id: 'nur-sichtbare-ecken', match: { ecken: f.visible.ecken }, hint: HIDDEN_HINT.ecken },
    { id: 'nur-sichtbare-flaechen', match: { flaechen: f.visible.flaechen }, hint: HIDDEN_HINT.flaechen },
  ];
  return {
    ...base(2, `alle:${solid}`),
    ab: 2,
    prompt: `Wie viele Ecken, Kanten und Flächen hat ${f.ein}?`,
    visual: { type: 'solid', solid },
    answer,
    hints: ['Zähle zuerst die Ecken, dann die Kanten, dann die Flächen.', 'Die gestrichelten Linien sind versteckte Kanten hinten. Zähle sie mit.'],
    steps: [...countSteps(solid, 'ecken').slice(0, 1), ...countSteps(solid, 'kanten').slice(0, 1), ...countSteps(solid, 'flaechen').slice(0, 1), `${cap(f.ein)} hat ${f.ecken} Ecken, ${f.kanten} Kanten und ${f.flaechen} Flächen.`],
    bugs,
    praise: praiseFrom(rng, ['Du hast Ecken, Kanten und Flächen sauber unterschieden.', 'Du hast auch die versteckten Teile mitgezählt.']),
    srText: `Abgebildet ist ${f.ein}. Verdeckte Kanten sind gestrichelt. Wie viele Ecken, Kanten und Flächen hat ${f.ein}?`,
  };
}

function plural(solid: SolidKind, n: number): string {
  const pl: Record<SolidKind, string> = { wuerfel: 'Würfel', quader: 'Quader', pyramide: 'Pyramiden', prisma: 'Prismen', zylinder: 'Zylinder', kegel: 'Kegel', kugel: 'Kugeln' };
  return n === 1 ? SOLIDS[solid].einen : `${fmt(n)} ${pl[solid]}`;
}

function edgeModel(rng: Rng): Exercise {
  const solid = rng.pick(POLYHEDRA);
  const n = rng.int(1, 4);
  const f = SOLIDS[solid];
  const name = rng.pick(NAMES);
  const st = n * f.kanten;
  const kg = n * f.ecken;
  const answer: MultiAnswer = {
    kind: 'multi',
    fields: [
      { id: 'staebchen', value: st, before: 'Stäbchen:', label: 'Anzahl der Stäbchen' },
      { id: 'kugeln', value: kg, before: 'Knetkugeln:', label: 'Anzahl der Knetkugeln' },
    ],
  };
  const bugs: Bug[] = [{ id: 'vertauscht', match: { staebchen: kg, kugeln: st }, hint: 'Stäbchen und Knetkugeln sind vertauscht. Ein Stäbchen ist eine Kante, eine Knetkugel ist eine Ecke.' }];
  if (n > 1) bugs.push({ id: 'nur-ein-modell', match: { staebchen: f.kanten, kugeln: f.ecken }, hint: `Das reicht für ein Modell. ${name} baut aber ${fmt(n)} Modelle.` });
  bugs.push({ id: 'nur-sichtbare', match: { staebchen: n * f.visible.kanten }, hint: 'Denk auch an die Kanten hinten, die man auf dem Bild nur gestrichelt sieht.' });
  const context = `${name} baut ${plural(solid, n)} als ${n === 1 ? 'Kantenmodell' : 'Kantenmodelle'}. Für jede Kante braucht ${name} ein Stäbchen, für jede Ecke eine Knetkugel.`;
  return {
    ...base(2, `modell:${solid}:${n}`, ['RF.figuren', 'PK.modellieren']),
    ab: 2,
    context,
    prompt: `Wie viele Stäbchen und wie viele Knetkugeln braucht ${name}?`,
    visual: { type: 'solid', solid },
    answer,
    hints: [`Wie viele Kanten und Ecken hat ${f.ein}?`, n > 1 ? `Es sind ${fmt(n)} Modelle. Rechne für alle zusammen.` : 'Stäbchen gehören zu den Kanten, Knetkugeln zu den Ecken.'],
    steps: [
      `${cap(f.ein)} hat ${f.kanten} Kanten und ${f.ecken} Ecken.`,
      n > 1 ? `Für ${fmt(n)} Modelle: ${fmt(n)} · ${fmt(f.kanten)} = ${fmt(st)} Stäbchen und ${fmt(n)} · ${fmt(f.ecken)} = ${fmt(kg)} Knetkugeln.` : `Also ${fmt(st)} Stäbchen und ${fmt(kg)} Knetkugeln.`,
      `${name} braucht ${fmt(st)} Stäbchen und ${fmt(kg)} Knetkugeln.`,
    ],
    bugs,
    praise: praiseFrom(rng, ['Du hast Stäbchen den Kanten und Knetkugeln den Ecken zugeordnet.', 'Du hast an alle Modelle gedacht.']),
    srText: `${context} Wie viele Stäbchen und wie viele Knetkugeln braucht ${name}?`,
    emoji: '🧩',
  };
}

function stickers(rng: Rng): Exercise {
  const solid = rng.pick(POLYHEDRA);
  const n = rng.int(2, 5);
  const f = SOLIDS[solid];
  const name = rng.pick(NAMES);
  const value = n * f.flaechen;
  const bugs = new BugList(value)
    .add('ein-koerper', f.flaechen, `Das sind die Flächen von einem Körper. Es sind aber ${fmt(n)} Körper.`)
    .add('nur-sichtbare', n * f.visible.flaechen, 'Denk auch an die Flächen hinten und unten.')
    .add('ecken-gezaehlt', n * f.ecken, 'Du hast mit den Ecken gerechnet. Die Sticker kommen auf die Flächen.');
  const context = `${name} hat ${plural(solid, n)} aus Holz. Auf jede Fläche klebt ${name} einen Sticker.`;
  return {
    ...base(2, `sticker:${solid}:${n}`, ['RF.figuren', 'PK.modellieren']),
    ab: 2,
    context,
    prompt: `Wie viele Sticker braucht ${name}?`,
    visual: { type: 'solid', solid },
    answer: { kind: 'number', value, unit: 'Sticker' },
    bugs: bugs.list,
    hints: [`Wie viele Flächen hat ${f.ein}?`, `Es sind ${fmt(n)} Körper. Rechne für alle zusammen.`],
    steps: [`${cap(f.ein)} hat ${f.flaechen} Flächen.`, `${fmt(n)} · ${fmt(f.flaechen)} = ${fmt(value)}`, `${name} braucht ${fmt(value)} Sticker.`],
    praise: praiseFrom(rng, ['Du hast alle Flächen gezählt, auch unten.', 'Du hast die Flächen für alle Körper zusammengerechnet.']),
    srText: `${context} Wie viele Sticker braucht ${name}?`,
    emoji: '⭐',
  };
}

// ─── Stufe 3 ────────────────────────────────────────────────────────────────

function curved(rng: Rng): Exercise {
  const solid = rng.pick<SolidKind>(['zylinder', 'kegel', 'kugel']);
  const f = SOLIDS[solid];
  const parts: Part[] = solid === 'kegel' ? ['kanten', 'flaechen'] : ['ecken', 'kanten', 'flaechen'];
  const answer: MultiAnswer = { kind: 'multi', fields: fieldsFor(parts, f) };
  const bugs: Bug[] = [];
  if (solid === 'zylinder') {
    bugs.push({ id: 'gebogene-flaeche-vergessen', match: { flaechen: 2 }, hint: 'Die gebogene Fläche zwischen den beiden Kreisen zählt auch als Fläche.' });
    bugs.push({ id: 'kanten-null', match: { kanten: 0 }, hint: 'Oben und unten stoßen der Kreis und die gebogene Fläche zusammen. Das sind gebogene Kanten.' });
  } else if (solid === 'kegel') {
    bugs.push({ id: 'gebogene-flaeche-vergessen', match: { flaechen: 1 }, hint: 'Die gebogene Fläche zählt auch als Fläche – zusammen mit dem Kreis unten.' });
    bugs.push({ id: 'kanten-null', match: { kanten: 0 }, hint: 'Unten stoßen der Kreis und die gebogene Fläche zusammen. Das ist eine gebogene Kante.' });
  } else {
    bugs.push({ id: 'flaechen-null', match: { flaechen: 0 }, hint: 'Die ganze Oberfläche der Kugel ist eine gebogene Fläche.' });
    bugs.push({ id: 'umriss-als-kante', match: { kanten: 1 }, hint: 'Der Kreis im Bild ist nur der Umriss der Kugel. Eine Kugel hat keine Kante: Nirgends stoßen zwei Flächen zusammen.' });
  }
  const what = parts.map((p) => PART_NAME[p]).join(solid === 'kegel' ? ' und ' : ', ').replace(/, ([^,]*)$/, ' und $1');
  return {
    ...base(3, `gebogen:${solid}`),
    ab: 3,
    knobel: true,
    prompt: `Wie viele ${what} hat ${f.ein}? Zähle gebogene Flächen und gebogene Kanten mit.`,
    visual: { type: 'solid', solid },
    answer,
    bugs,
    hints: ['Gebogene Flächen und gebogene Kanten zählen auch.', 'Stell dir vor, du fährst mit dem Finger über den Körper. Wo ist eine Kante, wo eine Fläche?'],
    steps: [
      'Abmachung: Gebogene Flächen und gebogene Kanten zählen wir mit.' + (solid === 'kegel' ? ' Die Spitze des Kegels heißt Spitze, nicht Ecke.' : ''),
      ...parts.map((p) => countSteps(solid, p)[0]),
      `${cap(f.ein)} hat ${parts.map((p) => countWord(f[p], p)).join(', ').replace(/, ([^,]*)$/, ' und $1')}.`,
    ],
    praise: praiseFrom(rng, ['Du hast auch die gebogenen Flächen mitgezählt.', 'Du hast die Abmachung für runde Körper genau beachtet.']),
    srText: `Abgebildet ist ${f.ein}. Wie viele ${what} hat ${f.ein}? Zähle gebogene Flächen und gebogene Kanten mit.`,
  };
}

function twoModels(rng: Rng): Exercise {
  const [a, b] = rng.sample(POLYHEDRA, 2);
  const na = rng.int(1, 2);
  const nb = rng.int(1, 2);
  const fa = SOLIDS[a];
  const fb = SOLIDS[b];
  const name = rng.pick(NAMES);
  const st = na * fa.kanten + nb * fb.kanten;
  const kg = na * fa.ecken + nb * fb.ecken;
  const context = `${name} baut ${plural(a, na)} und ${plural(b, nb)} als Kantenmodelle. Für jede Kante braucht ${name} ein Stäbchen, für jede Ecke eine Knetkugel.`;
  const answer: MultiAnswer = {
    kind: 'multi',
    fields: [
      { id: 'staebchen', value: st, before: 'Stäbchen:', label: 'Anzahl der Stäbchen' },
      { id: 'kugeln', value: kg, before: 'Knetkugeln:', label: 'Anzahl der Knetkugeln' },
    ],
  };
  const bugs: Bug[] = [
    { id: 'vertauscht', match: { staebchen: kg, kugeln: st }, hint: 'Stäbchen und Knetkugeln sind vertauscht. Ein Stäbchen ist eine Kante, eine Knetkugel ist eine Ecke.' },
  ];
  if (na > 1 || nb > 1) {
    bugs.push({ id: 'je-ein-modell', match: { staebchen: fa.kanten + fb.kanten, kugeln: fa.ecken + fb.ecken }, hint: 'Das reicht für je ein Modell. Schau noch einmal, wie viele Modelle es von jedem Körper sind.' });
  }
  const part = (n: number, f: typeof fa, what: 'kanten' | 'ecken') => (n === 1 ? fmt(f[what]) : `${fmt(n)} · ${fmt(f[what])}`);
  return {
    ...base(3, `zwei-modelle:${na}${a}+${nb}${b}`, ['RF.figuren', 'PK.modellieren']),
    ab: 3,
    knobel: true,
    context,
    prompt: `Wie viele Stäbchen und wie viele Knetkugeln braucht ${name} zusammen?`,
    answer,
    bugs,
    hints: [`Wie viele Kanten und Ecken hat ${fa.ein}? Und ${fb.ein}?`, 'Rechne für jeden Körper einzeln. Addiere dann.'],
    steps: [
      `${cap(fa.ein)}: ${fa.kanten} Kanten und ${fa.ecken} Ecken.`,
      `${cap(fb.ein)}: ${fb.kanten} Kanten und ${fb.ecken} Ecken.`,
      `Stäbchen: ${part(na, fa, 'kanten')} + ${part(nb, fb, 'kanten')} = ${fmt(st)}. Knetkugeln: ${part(na, fa, 'ecken')} + ${part(nb, fb, 'ecken')} = ${fmt(kg)}.`,
      `${name} braucht ${fmt(st)} Stäbchen und ${fmt(kg)} Knetkugeln.`,
    ],
    praise: praiseFrom(rng, ['Du hast für jeden Körper einzeln gezählt und dann addiert.', 'Du hast Kanten und Ecken sauber getrennt.']),
    srText: `${context} Wie viele Stäbchen und wie viele Knetkugeln braucht ${name} zusammen?`,
    emoji: '🧩',
  };
}

function whichSolid(rng: Rng): Exercise {
  const solid = rng.pick<SolidKind>(['pyramide', 'prisma', 'wuerfel']);
  const f = SOLIDS[solid];
  const others = POLYHEDRA.filter((s) => s !== solid && !(solid === 'wuerfel' && s === 'quader'));
  const wrong = [...others, solid === 'wuerfel' ? 'kegel' : 'zylinder'].slice(0, 3) as SolidKind[];
  const extra = solid === 'wuerfel' ? ' Alle Flächen sind gleich große Quadrate.' : '';
  const context = `Ein Körper hat ${f.ecken} Ecken, ${f.kanten} Kanten und ${f.flaechen} Flächen.${extra}`;
  const prompt = 'Welcher Körper ist es?';
  return {
    ...base(3, `welcher:${solid}`, ['RF.figuren', 'PK.argumentieren']),
    ab: 3,
    knobel: true,
    context,
    prompt,
    answer: makeChoice(rng, { label: cap(f.nom) }, wrong.map((w) => ({
      label: cap(SOLIDS[w].nom),
      whyWrong: SOLIDS[w].curved
        ? `${cap(SOLIDS[w].nom)} hat gebogene Flächen und keine Ecken.`
        : `${cap(SOLIDS[w].nom)} hat ${SOLIDS[w].ecken} Ecken, ${SOLIDS[w].kanten} Kanten und ${SOLIDS[w].flaechen} Flächen.`,
    }))),
    hints: ['Prüfe für jeden Körper: Wie viele Ecken hat er?', 'Passt die Zahl der Ecken, dann prüfe Kanten und Flächen.'],
    steps: [`Prüfe die Ecken: ${f.ecken} Ecken hat ${f.ein}.`, `Auch Kanten (${f.kanten}) und Flächen (${f.flaechen}) passen. Es ist ${f.nom}.`],
    praise: praiseFrom(rng, ['Du hast alle drei Angaben geprüft.', 'Du hast die Körper Schritt für Schritt ausgeschlossen.']),
    srText: `${context} ${prompt}`,
  };
}

function howManyModels(rng: Rng): Exercise {
  const solid = rng.pick<SolidKind>(['wuerfel', 'pyramide', 'prisma']);
  const f = SOLIDS[solid];
  const k = f.kanten;
  let sticks = 0;
  do sticks = rng.int(20, 50);
  while (sticks % k === 0 || Math.floor(sticks / k) < 2);
  const value = Math.floor(sticks / k);
  const rest = sticks % k;
  const name = rng.pick(NAMES);
  const bugs = new BugList(value)
    .add('aufgerundet', value + 1, `Für ein weiteres Modell fehlen Stäbchen. Es bleiben nur ${fmt(rest)} Stäbchen übrig.`)
    .add('ecken-statt-kanten', Math.floor(sticks / f.ecken), 'Du hast mit den Ecken gerechnet. Jedes Stäbchen ist eine Kante.');
  // dative plural after 'von'
  const pl: Record<string, string> = { wuerfel: 'Würfeln', pyramide: 'Pyramiden', prisma: 'Prismen' };
  const context = `${name} hat ${fmt(sticks)} Stäbchen und genug Knete. ${name} will daraus Kantenmodelle von ${pl[solid]} bauen.`;
  return {
    ...base(3, `wie-viele-modelle:${solid}:${sticks}`, ['RF.figuren', 'PK.modellieren']),
    ab: 3,
    knobel: true,
    context,
    prompt: `Wie viele ganze Modelle kann ${name} bauen?`,
    answer: { kind: 'number', value, unit: 'Modelle' },
    bugs: bugs.list,
    hints: [`Wie viele Kanten hat ${f.ein}? So viele Stäbchen braucht ein Modell.`, 'Wie oft passt diese Zahl in die Anzahl der Stäbchen?', 'Übrige Stäbchen reichen nicht für ein ganzes Modell.'],
    steps: [
      `${cap(f.ein)} hat ${k} Kanten. Ein Modell braucht ${k} Stäbchen.`,
      `${fmt(sticks)} : ${fmt(k)} = ${fmt(value)} R ${fmt(rest)}`,
      `${name} kann ${fmt(value)} ganze Modelle bauen. ${fmt(rest)} Stäbchen bleiben übrig.`,
    ],
    praise: praiseFrom(rng, ['Du hast an den Rest gedacht: Er reicht für kein ganzes Modell.', 'Du hast Kanten und Stäbchen richtig verbunden.']),
    srText: `${context} Wie viele ganze Modelle kann ${name} bauen?`,
    emoji: '🧩',
  };
}

export const eckenKantenFlaechenSkill: SkillDef = {
  id: ID,
  topicId: 'geometrie',
  title: 'Ecken, Kanten, Flächen',
  description: 'Du zählst Ecken, Kanten und Flächen von Körpern – auch die versteckten.',
  stufen: {
    1: 'Ecken, Kanten oder Flächen zählen',
    2: 'Alles zählen und Kantenmodelle bauen',
    3: 'Runde Körper und knifflige Modelle',
  },
  kmk: ['RF.figuren', 'RF.raum'],
  generate(rng, stufe) {
    if (stufe === 1) return rng.chance(0.75) ? singleCount(rng) : meetCount(rng);
    if (stufe === 2) {
      const r = rng.next();
      if (r < 0.35) return allCounts(rng);
      if (r < 0.75) return edgeModel(rng);
      return stickers(rng);
    }
    const r = rng.next();
    if (r < 0.3) return curved(rng);
    if (r < 0.55) return twoModels(rng);
    if (r < 0.75) return whichSolid(rng);
    return howManyModels(rng);
  },
};
