/**
 * Ebene Figuren und ihre Eigenschaften: Rechteck, Quadrat (besonderes Rechteck), Dreieck, Kreis,
 * Sechseck, Achteck, Parallelogramm; rechter Winkel, parallel, senkrecht.
 * Stufe 1: name a drawn figure; count its Ecken or Seiten.
 * Stufe 2: properties (rechte Winkel, Seiten, parallele Seiten) and "Welche Figur hat …?".
 * Stufe 3: Quadrat ↔ Rechteck reasoning, "Wer bin ich?", how many Quadrate hide in a grid.
 * Distractors are never superclasses of the right answer (a Quadrat is also a Rechteck!).
 */
import { fmt } from '../../core/format';
import type { ChoiceOption, Exercise, NumberAnswer, Rng, ShapeKind, SkillDef, Stufe, Visual } from '../../core/types';
import { rectCells } from './grid';
import { BugList, choiceList, makeChoice, placeOnGrid, praiseFrom } from './shared';
import { SHAPES } from './shapes';

const ID = 'geometrie.figuren';

function base(stufe: Stufe, key: string, kmk: string[] = ['RF.figuren']): Pick<Exercise, 'key' | 'topicId' | 'skillId' | 'stufe' | 'kmk'> {
  return { key: `${ID}:${stufe}:${key}`, topicId: 'geometrie', skillId: ID, stufe, kmk };
}

const KOERPER = 'ist ein Körper. Diese Figur ist flach.';

// ─── Stufe 1 ────────────────────────────────────────────────────────────────

interface NameItem {
  shape: ShapeKind;
  correct: string;
  pool: ChoiceOption[];
}

const NAME_ITEMS: NameItem[] = [
  {
    shape: 'quadrat', correct: 'Quadrat', pool: [
      { label: 'Würfel', whyWrong: `Ein Würfel ${KOERPER}` },
      { label: 'Dreieck', whyWrong: 'Zähle die Ecken: Ein Dreieck hat 3 Ecken.' },
      { label: 'Sechseck', whyWrong: 'Zähle die Ecken: Ein Sechseck hat 6 Ecken.' },
      { label: 'Kreis', whyWrong: 'Ein Kreis hat keine Ecken. Diese Figur hat Ecken.' },
    ],
  },
  {
    shape: 'rechteck', correct: 'Rechteck', pool: [
      { label: 'Quadrat', whyWrong: 'Bei einem Quadrat sind alle Seiten gleich lang. Hier sind zwei Seiten länger.' },
      { label: 'Quader', whyWrong: `Ein Quader ${KOERPER}` },
      { label: 'Dreieck', whyWrong: 'Zähle die Ecken: Ein Dreieck hat 3 Ecken.' },
      { label: 'Achteck', whyWrong: 'Zähle die Ecken: Ein Achteck hat 8 Ecken.' },
    ],
  },
  {
    shape: 'dreieck', correct: 'Dreieck', pool: [
      { label: 'Viereck', whyWrong: 'Zähle die Ecken noch einmal.' },
      { label: 'Pyramide', whyWrong: `Eine Pyramide ${KOERPER}` },
      { label: 'Sechseck', whyWrong: 'Zähle die Ecken: Ein Sechseck hat 6 Ecken.' },
      { label: 'Kreis', whyWrong: 'Ein Kreis hat keine Ecken. Diese Figur hat Ecken.' },
    ],
  },
  {
    shape: 'gleichseitiges-dreieck', correct: 'Dreieck', pool: [
      { label: 'Viereck', whyWrong: 'Zähle die Ecken noch einmal.' },
      { label: 'Pyramide', whyWrong: `Eine Pyramide ${KOERPER}` },
      { label: 'Kegel', whyWrong: `Ein Kegel ${KOERPER}` },
      { label: 'Sechseck', whyWrong: 'Zähle die Ecken: Ein Sechseck hat 6 Ecken.' },
    ],
  },
  {
    shape: 'kreis', correct: 'Kreis', pool: [
      { label: 'Kugel', whyWrong: `Eine Kugel ${KOERPER}` },
      { label: 'Achteck', whyWrong: 'Ein Achteck hat 8 Ecken. Diese Figur hat keine Ecken.' },
      { label: 'Zylinder', whyWrong: `Ein Zylinder ${KOERPER}` },
      { label: 'Sechseck', whyWrong: 'Ein Sechseck hat 6 Ecken. Diese Figur hat keine Ecken.' },
    ],
  },
  {
    shape: 'sechseck', correct: 'Sechseck', pool: [
      { label: 'Achteck', whyWrong: 'Zähle die Ecken noch einmal. Ein Achteck hat 8 Ecken.' },
      { label: 'Fünfeck', whyWrong: 'Zähle die Ecken noch einmal. Ein Fünfeck hat 5 Ecken.' },
      { label: 'Kreis', whyWrong: 'Ein Kreis hat keine Ecken. Diese Figur hat Ecken.' },
      { label: 'Siebeneck', whyWrong: 'Zähle die Ecken noch einmal. Ein Siebeneck hat 7 Ecken.' },
    ],
  },
  {
    shape: 'achteck', correct: 'Achteck', pool: [
      { label: 'Sechseck', whyWrong: 'Zähle die Ecken noch einmal. Ein Sechseck hat 6 Ecken.' },
      { label: 'Kreis', whyWrong: 'Ein Kreis hat keine Ecken. Diese Figur hat Ecken.' },
      { label: 'Zehneck', whyWrong: 'Zähle die Ecken noch einmal. Ein Zehneck hat 10 Ecken.' },
      { label: 'Siebeneck', whyWrong: 'Zähle die Ecken noch einmal. Ein Siebeneck hat 7 Ecken.' },
    ],
  },
  {
    shape: 'parallelogramm', correct: 'Parallelogramm', pool: [
      { label: 'Rechteck', whyWrong: 'Ein Rechteck hat 4 rechte Winkel. Hier sind die Ecken schief.' },
      { label: 'Raute', whyWrong: 'Bei einer Raute sind alle 4 Seiten gleich lang. Hier sind zwei Seiten länger.' },
      { label: 'Quadrat', whyWrong: 'Ein Quadrat hat 4 rechte Winkel und 4 gleich lange Seiten. Hier ist beides nicht so.' },
      { label: 'Dreieck', whyWrong: 'Zähle die Ecken: Ein Dreieck hat 3 Ecken.' },
    ],
  },
];

const SHAPE_DESCRIPTION: Record<ShapeKind, string> = {
  quadrat: '4 gleich lange Seiten und 4 rechte Winkel',
  rechteck: '4 rechte Winkel. Gegenüberliegende Seiten sind gleich lang',
  dreieck: '3 Ecken und 3 Seiten',
  'gleichseitiges-dreieck': '3 Ecken und 3 gleich lange Seiten',
  kreis: 'keine Ecken und keine geraden Seiten',
  sechseck: '6 Ecken und 6 Seiten',
  achteck: '8 Ecken und 8 Seiten',
  parallelogramm: '4 Ecken, aber keine rechten Winkel. Gegenüberliegende Seiten sind parallel',
  trapez: '4 Ecken. Zwei Seiten sind parallel',
  raute: '4 gleich lange Seiten',
};

function nameTask(rng: Rng): Exercise {
  const item = rng.pick(NAME_ITEMS);
  const wrong = rng.sample(item.pool, 3);
  const visual: Visual = { type: 'shape', shape: item.shape };
  return {
    // keyed by the figure only: the same figure with other distractors is the same question for the child
    ...base(1, `name:${item.shape}`),
    ab: 1,
    prompt: 'Wie heißt diese Figur?',
    visual,
    answer: makeChoice(rng, { label: item.correct }, wrong),
    hints: ['Zähle die Ecken der Figur.', 'Schau auch auf die Seiten: Sind sie gleich lang? Gibt es rechte Winkel?'],
    steps: [
      `Die Figur hat ${SHAPE_DESCRIPTION[item.shape]}.`,
      `Die Figur heißt ${item.correct}.`,
    ],
    praise: praiseFrom(rng, ['Du hast auf Ecken und Seiten geachtet.', 'Du hast die Figur an ihren Ecken erkannt.']),
    srText: `Eine flache Figur. Sie hat ${SHAPE_DESCRIPTION[item.shape]}. Wie heißt diese Figur? Zur Wahl: ${choiceList([item.correct, ...wrong.map((w) => w.label)].sort())}`,
  };
}

function eckenTask(rng: Rng): Exercise {
  const shape = rng.pick<ShapeKind>(['dreieck', 'quadrat', 'rechteck', 'sechseck', 'achteck', 'parallelogramm', 'gleichseitiges-dreieck']);
  const part = rng.pick(['ecken', 'seiten'] as const);
  const n = SHAPES[shape].ecken;
  const word = part === 'ecken' ? 'Ecken' : 'Seiten';
  const name = SHAPES[shape].name.replace('Gleichseitiges', 'gleichseitiges');
  return {
    ...base(1, `${part}:${shape}`),
    ab: 1,
    prompt: `Wie viele ${word} hat diese Figur?`,
    visual: { type: 'shape', shape },
    answer: { kind: 'number', value: n, unit: word },
    hints: part === 'ecken'
      ? ['Tippe mit dem Finger auf jede Ecke und zähle mit.', 'Fange bei einer Ecke an, die du dir merkst. Höre auf, wenn du wieder dort bist.']
      : ['Eine Seite ist eine gerade Linie von Ecke zu Ecke.', 'Fahre einmal rundherum und zähle jede gerade Linie. Höre auf, wenn du wieder am Anfang bist.'],
    steps: part === 'ecken'
      ? ['Zähle die Ecken einmal rundherum.', `Die Figur hat ${fmt(n)} Ecken. Sie heißt ${name}.`]
      : ['Zähle die geraden Seiten einmal rundherum.', `Die Figur hat ${fmt(n)} Seiten – genauso viele wie Ecken. Sie heißt ${name}.`],
    praise: part === 'ecken'
      ? praiseFrom(rng, ['Du hast jede Ecke genau einmal gezählt.', 'Du bist einmal sorgfältig rundherum gegangen.'])
      : praiseFrom(rng, ['Du hast jede Seite genau einmal gezählt.', 'Du bist einmal sorgfältig rundherum gegangen.']),
    srText: `Eine flache Figur: ${SHAPES[shape].ein}. Wie viele ${word} hat diese Figur?`,
  };
}

// ─── Stufe 2 ────────────────────────────────────────────────────────────────

interface NumItem {
  id: string;
  prompt: string;
  shape?: ShapeKind;
  value: number;
  unit: string;
  bugs: [number, string][];
  steps: string[];
  hints: string[];
}

const NUM_S2: NumItem[] = [
  {
    id: 'rw-rechteck', prompt: 'Wie viele rechte Winkel hat ein Rechteck?', shape: 'rechteck', value: 4, unit: 'rechte Winkel',
    bugs: [[2, 'Schau in jede der vier Ecken: Jede Ecke ist ein rechter Winkel.']],
    hints: ['Ein rechter Winkel sieht aus wie die Ecke eines Blatts Papier.', 'Prüfe jede Ecke einzeln.'],
    steps: ['Prüfe jede Ecke, zum Beispiel mit der Ecke eines Blatts Papier.', 'Alle 4 Ecken sind rechte Winkel. Ein Rechteck hat 4 rechte Winkel.'],
  },
  {
    id: 'rw-quadrat', prompt: 'Wie viele rechte Winkel hat ein Quadrat?', shape: 'quadrat', value: 4, unit: 'rechte Winkel',
    bugs: [[2, 'Schau in jede der vier Ecken: Jede Ecke ist ein rechter Winkel.']],
    hints: ['Ein rechter Winkel sieht aus wie die Ecke eines Blatts Papier.', 'Prüfe jede Ecke einzeln.'],
    steps: ['Prüfe jede Ecke, zum Beispiel mit der Ecke eines Blatts Papier.', 'Alle 4 Ecken sind rechte Winkel. Ein Quadrat hat 4 rechte Winkel.'],
  },
  {
    id: 'rw-parallelogramm', prompt: 'Wie viele rechte Winkel hat dieses Parallelogramm?', shape: 'parallelogramm', value: 0, unit: 'rechte Winkel',
    bugs: [[4, 'Lege die Ecke eines Blatts Papier an: Die Ecken sind schief, nicht rechtwinklig.'], [2, 'Lege die Ecke eines Blatts Papier an jede Ecke. Keine passt genau.']],
    hints: ['Ein rechter Winkel sieht aus wie die Ecke eines Blatts Papier.', 'Prüfe jede Ecke: Passt die Papierecke genau hinein?'],
    steps: ['Prüfe jede Ecke mit der Ecke eines Blatts Papier.', 'Zwei Ecken sind spitzer, zwei sind stumpfer. Dieses Parallelogramm hat 0 rechte Winkel.'],
  },
  {
    id: 'seiten-sechseck', prompt: 'Wie viele Seiten hat ein Sechseck?', shape: 'sechseck', value: 6, unit: 'Seiten',
    bugs: [],
    hints: ['Eine Seite ist eine gerade Linie von Ecke zu Ecke.', 'Zähle die Seiten einmal rundherum.'],
    steps: ['Zähle die geraden Linien von Ecke zu Ecke.', 'Ein Sechseck hat 6 Ecken und 6 Seiten.'],
  },
  {
    id: 'seiten-achteck', prompt: 'Wie viele Seiten hat ein Achteck?', shape: 'achteck', value: 8, unit: 'Seiten',
    bugs: [],
    hints: ['Eine Seite ist eine gerade Linie von Ecke zu Ecke.', 'Zähle die Seiten einmal rundherum.'],
    steps: ['Zähle die geraden Linien von Ecke zu Ecke.', 'Ein Achteck hat 8 Ecken und 8 Seiten.'],
  },
  {
    id: 'seiten-quadrat', prompt: 'Wie viele Seiten eines Quadrats sind gleich lang?', shape: 'quadrat', value: 4, unit: 'Seiten',
    bugs: [[2, 'Miss alle vier Seiten nach: Beim Quadrat sind nicht nur zwei, sondern alle Seiten gleich lang.']],
    hints: ['Vergleiche die Seiten miteinander.', 'Lege in Gedanken ein Lineal an jede Seite.'],
    steps: ['Beim Quadrat sind alle Seiten gleich lang.', 'Alle 4 Seiten sind gleich lang.'],
  },
  {
    id: 'rw-zwei-rechtecke', prompt: 'Wie viele rechte Winkel haben 2 Rechtecke zusammen?', shape: 'rechteck', value: 8, unit: 'rechte Winkel',
    bugs: [[4, 'Das sind die rechten Winkel von einem Rechteck. Es sind aber 2 Rechtecke.'], [2, 'Jedes Rechteck hat 4 rechte Winkel – in jeder Ecke einen.']],
    hints: ['Wie viele rechte Winkel hat ein Rechteck?', 'Rechne für 2 Rechtecke.'],
    steps: ['Ein Rechteck hat 4 rechte Winkel.', '2 Rechtecke haben 4 + 4 = 8 rechte Winkel.'],
  },
  {
    id: 'ecken-sechseck-dreieck', prompt: 'Wie viele Ecken haben ein Sechseck und ein Dreieck zusammen?', value: 9, unit: 'Ecken',
    bugs: [[2, 'Du hast die Figuren gezählt. Gesucht sind die Ecken.']],
    hints: ['Der Name verrät die Anzahl der Ecken.', 'Addiere die Ecken beider Figuren.'],
    steps: ['Ein Sechseck hat 6 Ecken, ein Dreieck hat 3 Ecken.', '6 + 3 = 9. Zusammen sind es 9 Ecken.'],
  },
  {
    id: 'parallel-rechteck', prompt: 'Ein Rechteck hat parallele Seiten. Wie viele Paare paralleler Seiten sind es?', shape: 'rechteck', value: 2, unit: 'Paare',
    bugs: [[4, 'Ein Paar besteht aus zwei Seiten. Ein Rechteck hat 4 Seiten, also wie viele Paare?'], [1, 'Oben und unten sind parallel. Schau auch nach links und rechts.']],
    hints: ['Parallele Seiten laufen nebeneinander her und treffen sich nie.', 'Ein Paar sind zwei Seiten, die parallel sind.'],
    steps: ['Oben und unten sind parallel: 1 Paar.', 'Links und rechts sind parallel: noch 1 Paar.', 'Ein Rechteck hat 2 Paare paralleler Seiten.'],
  },
];

interface ChoiceItem {
  id: string;
  prompt: string;
  correct: string;
  wrong: ChoiceOption[];
  steps: string[];
  hints: string[];
  visual?: Visual;
  /** Picture on the correct option (the wrong options carry their own); shown as a grid of pictures. */
  correctVisual?: Visual;
  kmk?: string[];
}

const CHOICE_S2: ChoiceItem[] = [
  {
    id: 'quadrat-eigenschaften', prompt: 'Welche Figur hat 4 gleich lange Seiten und 4 rechte Winkel?', correct: 'Quadrat',
    wrong: [
      { label: 'Rechteck', whyWrong: 'Ein Rechteck hat 4 rechte Winkel, aber meist sind zwei Seiten länger. Gesucht ist die Figur mit lauter gleich langen Seiten.' },
      { label: 'Parallelogramm', whyWrong: 'Ein Parallelogramm hat meistens schiefe Ecken. Gesucht ist die Figur mit 4 rechten Winkeln und lauter gleich langen Seiten.' },
      { label: 'Sechseck', whyWrong: 'Ein Sechseck hat 6 Seiten.' },
    ],
    hints: ['Welche Vierecke haben 4 rechte Winkel?', 'Bei welchem davon sind alle Seiten gleich lang?'],
    steps: ['4 rechte Winkel haben Rechteck und Quadrat.', 'Alle 4 Seiten gleich lang sind nur beim Quadrat. Die Figur heißt Quadrat.'],
  },
  {
    id: 'rechteck-eigenschaften', prompt: 'Welche Figur hat 4 rechte Winkel, aber nicht alle Seiten gleich lang?', correct: 'Rechteck',
    wrong: [
      { label: 'Quadrat', whyWrong: 'Beim Quadrat sind alle 4 Seiten gleich lang.' },
      { label: 'Parallelogramm', whyWrong: 'Ein Parallelogramm hat meistens schiefe Ecken. Ein Viereck mit 4 rechten Winkeln heißt Rechteck.' },
      { label: 'Dreieck', whyWrong: 'Ein Dreieck hat nur 3 Ecken.' },
    ],
    hints: ['Welche Vierecke haben 4 rechte Winkel?', 'Bei welchem davon sind zwei Seiten länger als die anderen?'],
    steps: ['4 rechte Winkel haben Rechteck und Quadrat.', 'Beim Quadrat sind alle Seiten gleich lang. Die gesuchte Figur heißt Rechteck.'],
  },
  {
    id: 'keine-ecken', prompt: 'Welche flache Figur hat keine Ecken?', correct: 'Kreis',
    wrong: [
      { label: 'Kugel', whyWrong: 'Eine Kugel ist ein Körper. Gesucht ist eine flache Figur.' },
      { label: 'Achteck', whyWrong: 'Ein Achteck hat 8 Ecken.' },
      { label: 'Sechseck', whyWrong: 'Ein Sechseck hat 6 Ecken.' },
    ],
    hints: ['Denk an eine Figur, die überall rund ist.', 'Eine Kugel kannst du anfassen und rollen. Gesucht ist etwas Flaches.'],
    steps: ['Vielecke haben Ecken. Flach und ganz rund ist nur eine Figur.', 'Die Figur heißt Kreis.'],
  },
  {
    id: 'sechs-ecken', prompt: 'Welche Figur hat genau 6 Ecken?', correct: 'Sechseck',
    wrong: [
      { label: 'Achteck', whyWrong: 'Ein Achteck hat 8 Ecken.' },
      { label: 'Würfel', whyWrong: 'Ein Würfel ist ein Körper mit 8 Ecken.' },
      { label: 'Dreieck', whyWrong: 'Ein Dreieck hat 3 Ecken.' },
    ],
    hints: ['Der Name verrät die Anzahl der Ecken.', 'Ein Dreieck hat 3 Ecken, ein Viereck hat 4 Ecken …'],
    steps: ['Der Name sagt, wie viele Ecken eine Figur hat.', 'Ein Sechseck hat genau 6 Ecken.'],
  },
  {
    id: 'parallelogramm-eigenschaften', prompt: 'Welche Figur hat 2 Paare paralleler Seiten, aber keinen rechten Winkel?', correct: 'Parallelogramm',
    wrong: [
      { label: 'Rechteck', whyWrong: 'Ein Rechteck hat 2 Paare paralleler Seiten, aber auch 4 rechte Winkel.' },
      { label: 'Dreieck', whyWrong: 'Ein Dreieck hat keine parallelen Seiten.' },
      { label: 'Kreis', whyWrong: 'Ein Kreis hat keine geraden Seiten.' },
    ],
    hints: ['Parallele Seiten laufen nebeneinander her und treffen sich nie.', 'Welche Figur mit parallelen Seiten hat schiefe Ecken?'],
    steps: ['2 Paare paralleler Seiten haben Rechteck, Quadrat und Parallelogramm.', 'Ohne rechten Winkel ist nur das Parallelogramm. Die Figur heißt Parallelogramm.'],
  },
  {
    id: 'acht-ecken', prompt: 'Welche Figur hat genau 8 Ecken?', correct: 'Achteck',
    wrong: [
      { label: 'Sechseck', whyWrong: 'Ein Sechseck hat 6 Ecken.' },
      { label: 'Würfel', whyWrong: 'Ein Würfel hat zwar 8 Ecken, ist aber ein Körper. Gesucht ist eine flache Figur.' },
      { label: 'Kreis', whyWrong: 'Ein Kreis hat keine Ecken.' },
    ],
    hints: ['Der Name verrät die Anzahl der Ecken.', 'Achte darauf, dass die Figur flach ist.'],
    steps: ['Der Name sagt, wie viele Ecken eine Figur hat.', 'Ein Achteck hat genau 8 Ecken.'],
  },
  {
    // about the drawn Vierecke: a Rechteck is also a (special) Parallelogramm, so no general claim here
    id: 'kein-rechter-winkel', prompt: 'Welches dieser Vierecke hat keinen rechten Winkel?', correct: 'Parallelogramm',
    correctVisual: { type: 'shape', shape: 'parallelogramm' },
    wrong: [
      { label: 'Rechteck', visual: { type: 'shape', shape: 'rechteck' }, whyWrong: 'Dieses Rechteck hat 4 rechte Winkel.' },
      { label: 'Quadrat', visual: { type: 'shape', shape: 'quadrat' }, whyWrong: 'Dieses Quadrat hat 4 rechte Winkel.' },
    ],
    hints: ['Ein rechter Winkel sieht aus wie die Ecke eines Blatts Papier.', 'Welches Viereck hat schiefe Ecken?'],
    steps: ['Rechteck und Quadrat haben in jeder Ecke einen rechten Winkel.', 'Dieses Parallelogramm hat schiefe Ecken. Es hat keinen rechten Winkel.'],
  },
  {
    id: 'senkrecht-quadrat', prompt: 'Zwei Seiten eines Quadrats treffen sich in einer Ecke. Wie stehen sie zueinander?', correct: 'senkrecht zueinander',
    visual: { type: 'shape', shape: 'quadrat' },
    wrong: [{ label: 'parallel zueinander', whyWrong: 'Parallele Seiten treffen sich nie. Diese Seiten treffen sich in einer Ecke.' }],
    hints: ['Wie sieht die Ecke eines Quadrats aus?', 'Seiten, die sich im rechten Winkel treffen, heißen senkrecht zueinander.'],
    steps: ['Die beiden Seiten treffen sich in einer Ecke.', 'Jede Ecke des Quadrats ist ein rechter Winkel. Die Seiten stehen senkrecht zueinander.'],
  },
  {
    id: 'benachbart-senkrecht', prompt: 'Zwei Seiten eines Rechtecks treffen sich in einer Ecke. Wie stehen sie zueinander?', correct: 'senkrecht zueinander',
    visual: { type: 'shape', shape: 'rechteck' },
    wrong: [{ label: 'parallel zueinander', whyWrong: 'Parallele Seiten treffen sich nie. Diese Seiten treffen sich in einer Ecke.' }],
    hints: ['Wie sieht die Ecke eines Rechtecks aus?', 'Seiten, die sich im rechten Winkel treffen, heißen senkrecht zueinander.'],
    steps: ['Die beiden Seiten treffen sich in einer Ecke.', 'Jede Ecke des Rechtecks ist ein rechter Winkel. Die Seiten stehen senkrecht zueinander.'],
  },
  {
    id: 'gegenueber-parallel', prompt: 'Wie liegen gegenüberliegende Seiten eines Rechtecks zueinander?', correct: 'parallel zueinander',
    visual: { type: 'shape', shape: 'rechteck' },
    wrong: [{ label: 'senkrecht zueinander', whyWrong: 'Senkrechte Seiten treffen sich im rechten Winkel. Gegenüberliegende Seiten treffen sich nie.' }],
    hints: ['Verlängere in Gedanken die obere und die untere Seite.', 'Treffen sie sich irgendwann?'],
    steps: ['Die obere und die untere Seite haben überall den gleichen Abstand.', 'Sie treffen sich nie. Gegenüberliegende Seiten sind parallel zueinander.'],
  },
];

function numTask(rng: Rng, stufe: Stufe, item: NumItem, ab: 1 | 2 | 3, knobel?: boolean): Exercise {
  const bugs = new BugList(item.value);
  item.bugs.forEach(([v, h], i) => bugs.add(`${item.id}-${i}`, v, h));
  const answer: NumberAnswer = { kind: 'number', value: item.value, unit: item.unit };
  return {
    ...base(stufe, `zahl:${item.id}`),
    ab,
    knobel,
    prompt: item.prompt,
    visual: item.shape ? { type: 'shape', shape: item.shape } : undefined,
    answer,
    hints: item.hints,
    steps: item.steps,
    bugs: bugs.list,
    praise: praiseFrom(rng, ['Du hast jede Ecke und jede Seite genau geprüft.', 'Du hast die Eigenschaften der Figur sorgfältig untersucht.']),
    srText: item.shape ? `Abgebildet ist ${SHAPES[item.shape].ein}. ${item.prompt}` : item.prompt,
  };
}

function choiceTask(rng: Rng, stufe: Stufe, item: ChoiceItem, ab: 1 | 2 | 3, knobel?: boolean): Exercise {
  const options = [item.correct, ...item.wrong.map((w) => w.label)];
  return {
    ...base(stufe, `wahl:${item.id}`, item.kmk ?? ['RF.figuren']),
    ab,
    knobel,
    ...splitPrompt(item.prompt),
    visual: item.visual,
    answer: item.correctVisual
      ? makeChoice(rng, { label: item.correct, visual: item.correctVisual }, item.wrong, { layout: 'grid' })
      : makeChoice(rng, { label: item.correct }, item.wrong),
    hints: item.hints,
    steps: item.steps,
    praise: praiseFrom(rng, ['Du hast die Eigenschaften genau verglichen.', 'Du hast jede Möglichkeit sorgfältig geprüft.']),
    srText: `${item.prompt} Zur Wahl: ${choiceList(options.slice().sort())}`,
  };
}

/** Riddles: the clues become the context, the last sentence is the prompt (prompts stay ≤ 2 sentences). */
function splitPrompt(text: string): { prompt: string; context?: string } {
  const sentences = text.split(/(?<=[.?!])\s+/);
  if (sentences.length <= 2) return { prompt: text };
  return { context: sentences.slice(0, -1).join(' '), prompt: sentences[sentences.length - 1] };
}

// ─── Stufe 3 ────────────────────────────────────────────────────────────────

const CHOICE_S3: ChoiceItem[] = [
  {
    id: 'quadrat-ist-rechteck', prompt: 'Ist ein Quadrat auch ein Rechteck?', correct: 'Ja, denn es hat 4 rechte Winkel.',
    kmk: ['RF.figuren', 'PK.argumentieren'],
    wrong: [
      { label: 'Nein, denn beim Rechteck sind zwei Seiten länger.', whyWrong: 'Ein Rechteck braucht nur 4 rechte Winkel. Die Seiten dürfen auch alle gleich lang sein.' },
      { label: 'Ja, denn es hat 4 Ecken.', whyWrong: '4 Ecken hat auch ein Parallelogramm. Entscheidend sind die 4 rechten Winkel.' },
      { label: 'Nein, denn ein Quadrat hat keine rechten Winkel.', whyWrong: 'Schau in die Ecken eines Quadrats: Dort sind rechte Winkel.' },
    ],
    hints: ['Was muss eine Figur haben, damit sie Rechteck heißt?', 'Prüfe, ob das Quadrat diese Bedingung erfüllt.'],
    steps: ['Ein Rechteck ist ein Viereck mit 4 rechten Winkeln.', 'Ein Quadrat hat 4 rechte Winkel. Also ist jedes Quadrat ein besonderes Rechteck – mit 4 gleich langen Seiten.'],
  },
  {
    id: 'rechteck-ist-quadrat', prompt: 'Ist jedes Rechteck ein Quadrat?', correct: 'Nein, denn nicht alle Seiten müssen gleich lang sein.',
    kmk: ['RF.figuren', 'PK.argumentieren'],
    wrong: [
      { label: 'Ja, denn beide haben 4 rechte Winkel.', whyWrong: 'Ein Quadrat braucht zusätzlich 4 gleich lange Seiten. Ein langes, schmales Rechteck ist kein Quadrat.' },
      { label: 'Ja, denn beide haben 4 Ecken.', whyWrong: 'Gleich viele Ecken reichen nicht. Beim Quadrat müssen auch alle Seiten gleich lang sein.' },
    ],
    hints: ['Was braucht ein Quadrat, was ein Rechteck nicht braucht?', 'Denk an ein langes, schmales Rechteck.'],
    steps: ['Ein Quadrat hat 4 rechte Winkel und 4 gleich lange Seiten.', 'Ein Rechteck muss nur 4 rechte Winkel haben. Ein langes, schmales Rechteck ist kein Quadrat. Also: Nein.'],
  },
  {
    id: 'aussage-stimmt', prompt: 'Welche Aussage stimmt?', correct: 'Jedes Quadrat ist ein Rechteck.',
    kmk: ['RF.figuren', 'PK.argumentieren'],
    wrong: [
      { label: 'Jedes Rechteck ist ein Quadrat.', whyWrong: 'Ein langes, schmales Rechteck hat nicht 4 gleich lange Seiten. Es ist kein Quadrat.' },
      { label: 'Ein Parallelogramm hat immer 4 rechte Winkel.', whyWrong: 'Ein Parallelogramm hat meistens schiefe Ecken.' },
      { label: 'Ein Dreieck kann 2 rechte Winkel haben.', whyWrong: 'Bei zwei rechten Winkeln laufen zwei Seiten parallel. Sie treffen sich nie – so entsteht kein Dreieck.' },
    ],
    hints: ['Prüfe jede Aussage mit einer Skizze.', 'Eine Aussage mit „jedes“ stimmt nur, wenn es keine Ausnahme gibt.'],
    steps: ['Jedes Quadrat hat 4 rechte Winkel, also ist es ein Rechteck.', 'Für die anderen Aussagen gibt es Gegenbeispiele. Es stimmt: Jedes Quadrat ist ein Rechteck.'],
  },
  {
    id: 'raetsel-parallelogramm', prompt: 'Ich habe 4 Ecken. Gegenüberliegende Seiten sind parallel. Ich habe keinen rechten Winkel. Nicht alle Seiten sind gleich lang. Wer bin ich?', correct: 'Parallelogramm',
    wrong: [
      { label: 'Rechteck', whyWrong: 'Ein Rechteck hat 4 rechte Winkel.' },
      { label: 'Raute', whyWrong: 'Bei einer Raute sind alle Seiten gleich lang.' },
      { label: 'Quadrat', whyWrong: 'Ein Quadrat hat 4 rechte Winkel und gleich lange Seiten.' },
    ],
    hints: ['Streiche zuerst alle Figuren mit rechten Winkeln.', 'Prüfe dann die Seitenlängen.'],
    steps: ['Rechteck und Quadrat haben rechte Winkel – sie passen nicht.', 'Die Raute hat lauter gleich lange Seiten – sie passt auch nicht. Gesucht ist das Parallelogramm.'],
  },
  {
    id: 'raetsel-gleichseitig', prompt: 'Ich habe 3 Ecken. Alle meine Seiten sind gleich lang. Wer bin ich?', correct: 'Gleichseitiges Dreieck',
    wrong: [
      { label: 'Quadrat', whyWrong: 'Ein Quadrat hat 4 Ecken.' },
      { label: 'Pyramide', whyWrong: 'Eine Pyramide ist ein Körper, keine flache Figur.' },
      { label: 'Sechseck', whyWrong: 'Ein Sechseck hat 6 Ecken.' },
    ],
    hints: ['Welche Figur hat 3 Ecken?', 'Wie heißt sie, wenn alle Seiten gleich lang sind?'],
    steps: ['3 Ecken hat ein Dreieck.', 'Sind alle Seiten gleich lang, heißt es gleichseitiges Dreieck.'],
  },
  {
    id: 'raetsel-quadrat', prompt: 'Ich habe 4 rechte Winkel. Alle meine Seiten sind gleich lang. Wer bin ich?', correct: 'Quadrat',
    wrong: [
      { label: 'Gleichseitiges Dreieck', whyWrong: 'Gleich lange Seiten hat es, aber nur 3 Ecken und keinen rechten Winkel.' },
      { label: 'Achteck', whyWrong: 'Ein Achteck hat 8 Ecken und keine rechten Winkel.' },
      { label: 'Würfel', whyWrong: 'Ein Würfel ist ein Körper, keine flache Figur.' },
    ],
    hints: ['Welche Vierecke haben 4 rechte Winkel?', 'Bei welchem davon sind alle Seiten gleich lang?'],
    steps: ['4 Ecken mit rechten Winkeln: Das ist ein Viereck wie Rechteck oder Quadrat.', 'Alle Seiten gleich lang: Das ist das Quadrat.'],
  },
  {
    id: 'raetsel-rechteck', prompt: 'Ich habe 4 rechte Winkel. Zwei meiner Seiten sind länger als die anderen zwei. Wer bin ich?', correct: 'Rechteck',
    wrong: [
      { label: 'Quadrat', whyWrong: 'Beim Quadrat sind alle Seiten gleich lang.' },
      { label: 'Raute', whyWrong: 'Bei einer Raute sind alle vier Seiten gleich lang.' },
      { label: 'Quader', whyWrong: 'Ein Quader ist ein Körper, keine flache Figur.' },
    ],
    hints: ['Welche Vierecke haben 4 rechte Winkel?', 'Bei welchem davon sind zwei Seiten länger?'],
    steps: ['4 rechte Winkel haben Rechteck und Quadrat.', 'Zwei Seiten länger als die anderen: Das ist das Rechteck.'],
  },
  {
    id: 'raetsel-sechseck', prompt: 'Ich habe 6 Ecken und 6 gleich lange Seiten. Wer bin ich?', correct: 'Sechseck',
    wrong: [
      { label: 'Achteck', whyWrong: 'Ein Achteck hat 8 Ecken.' },
      { label: 'Würfel', whyWrong: 'Ein Würfel ist ein Körper. Er hat 6 Flächen, aber 8 Ecken.' },
      { label: 'Dreieck', whyWrong: 'Ein Dreieck hat 3 Ecken.' },
    ],
    hints: ['Zähle die Ecken im Namen mit.', 'Achte darauf: Gesucht ist eine flache Figur.'],
    steps: ['6 Ecken und 6 Seiten hat ein Sechseck.', 'Die Figur heißt Sechseck.'],
  },
  {
    id: 'raetsel-kreis', prompt: 'Ich bin flach. Ich habe keine Ecken und keine geraden Seiten. Wer bin ich?', correct: 'Kreis',
    wrong: [
      { label: 'Kugel', whyWrong: 'Eine Kugel ist nicht flach. Sie ist ein Körper.' },
      { label: 'Zylinder', whyWrong: 'Ein Zylinder ist ein Körper und hat Kanten.' },
      { label: 'Achteck', whyWrong: 'Ein Achteck hat 8 Ecken und gerade Seiten.' },
    ],
    hints: ['Achte auf das Wort „flach“.', 'Welche flache Figur ist überall rund?'],
    steps: ['Kugel und Zylinder sind Körper, also nicht flach.', 'Flach, ohne Ecken und ohne gerade Seiten ist der Kreis.'],
  },
];

const NUM_S3: NumItem[] = [
  {
    id: 'dreieck-rechte-winkel', prompt: 'Wie viele rechte Winkel kann ein Dreieck höchstens haben?', value: 1, unit: 'rechten Winkel',
    bugs: [
      [2, 'Probiere es aus: Bei zwei rechten Winkeln laufen zwei Seiten parallel. Sie treffen sich nie.'],
      [3, 'Zeichne es: Drei rechte Winkel passen nicht in ein Dreieck.'],
      [0, 'Es gibt Dreiecke mit einem rechten Winkel, zum Beispiel eine halbe Serviette.'],
    ],
    hints: ['Zeichne ein Dreieck mit einem rechten Winkel.', 'Versuche, noch einen zweiten rechten Winkel einzubauen. Was passiert mit den Seiten?'],
    steps: ['Ein Dreieck mit einem rechten Winkel gibt es, zum Beispiel ein halbes Quadrat.', 'Bei zwei rechten Winkeln würden zwei Seiten parallel laufen und sich nie treffen.', 'Ein Dreieck hat höchstens 1 rechten Winkel.'],
  },
];

/** How many Quadrate (all sizes) are in an m × n grid? */
function squaresTask(rng: Rng): Exercise {
  const [w, h] = rng.pick<[number, number]>([[2, 2], [3, 3], [2, 3], [3, 2], [2, 4], [4, 2], [3, 4], [4, 3]]);
  const bySize: { k: number; count: number }[] = [];
  for (let k = 1; k <= Math.min(w, h); k++) bySize.push({ k, count: (w - k + 1) * (h - k + 1) });
  const total = bySize.reduce((a, b) => a + b.count, 0);
  // margin 0: the grid is exactly the rectangle, so no extra grid squares around it can be counted
  const { visual } = placeOnGrid(rectCells({ x: 0, y: 0, w, h }), { margin: 0 });
  const bugs = new BugList(total).add('nur-kleine', w * h, 'Du hast die kleinen Quadrate gezählt. Es gibt auch größere Quadrate aus mehreren Kästchen.');
  if (bySize.length > 2) bugs.add('ohne-mittlere', w * h + bySize[bySize.length - 1].count, 'Denk auch an die Quadrate aus 2 · 2 Kästchen.');
  if (bySize.length >= 2) bugs.add('plus-eins', w * h + 1, 'Schau genau: Ein großes Quadrat aus mehreren Kästchen passt an mehreren Stellen.');
  const size = (k: number) => (k === 1 ? 'aus 1 Kästchen' : `aus ${fmt(k)} · ${fmt(k)} Kästchen`);
  return {
    ...base(3, `quadrate:${w}x${h}`, ['RF.figuren', 'PK.problemloesen']),
    ab: 3,
    knobel: true,
    prompt: 'Wie viele Quadrate siehst du? Zähle auch große Quadrate aus mehreren Kästchen.',
    visual,
    answer: { kind: 'number', value: total, unit: 'Quadrate' },
    bugs: bugs.list,
    hints: ['Zähle zuerst die kleinen Quadrate.', 'Suche dann Quadrate aus 2 · 2 Kästchen. Sie dürfen sich überlappen.', 'Gibt es noch größere Quadrate?'],
    steps: [
      ...bySize.map((s) => `Quadrate ${size(s.k)}: ${fmt(s.count)}`),
      `${bySize.map((s) => fmt(s.count)).join(' + ')} = ${fmt(total)}`,
      `Du siehst ${fmt(total)} Quadrate.`,
    ],
    praise: praiseFrom(rng, ['Du hast der Größe nach geordnet gezählt.', 'Du hast auch an die überlappenden großen Quadrate gedacht.']),
    srText: `Ein Rechteck aus ${fmt(h)} Reihen mit je ${fmt(w)} Kästchen. Wie viele Quadrate siehst du? Zähle auch große Quadrate aus mehreren Kästchen.`,
  };
}

export const figurenSkill: SkillDef = {
  id: ID,
  topicId: 'geometrie',
  title: 'Ebene Figuren',
  description: 'Du erkennst Figuren an ihren Ecken, Seiten und Winkeln.',
  stufen: {
    1: 'Figuren benennen und Ecken zählen',
    2: 'Rechte Winkel, parallele und senkrechte Seiten',
    3: 'Quadrat und Rechteck, Rätsel, Quadrate zählen',
  },
  kmk: ['RF.figuren'],
  generate(rng, stufe) {
    if (stufe === 1) return rng.chance(0.65) ? nameTask(rng) : eckenTask(rng);
    if (stufe === 2) {
      return rng.chance(0.45) ? numTask(rng, 2, rng.pick(NUM_S2), 2) : choiceTask(rng, 2, rng.pick(CHOICE_S2), 2);
    }
    const r = rng.next();
    if (r < 0.55) return choiceTask(rng, 3, rng.pick(CHOICE_S3), 3, true);
    if (r < 0.7) return numTask(rng, 3, NUM_S3[0], 3, true);
    return squaresTask(rng);
  },
};
