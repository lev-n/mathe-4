/**
 * Umfang in Kästchenlängen (or cm when 1 Kästchen = 1 cm). No formula.
 * Stufe 1: rectangles – walk around and add the four sides.
 * Stufe 2: L-, T-, U-shapes and free figures – walk around the outline.
 * Stufe 3: same area, different perimeter (compare two figures) and vice versa (same perimeter, different
 *          area); which rectangle of n Kästchen has the largest/smallest Umfang; what happens to the Umfang
 *          when one Kästchen is removed/added.
 */
import { fmt, fmtQty } from '../../core/format';
import type { Cell, Exercise, NumberAnswer, Rng, SkillDef, Stufe } from '../../core/types';
import {
  borderCellCount,
  bounds,
  cellSet,
  cellsId,
  ck,
  describeCells,
  emptyNeighbours,
  isSimpleFigure,
  lFigure,
  outlineSides,
  perimeterOf,
  randomPolyomino,
  rectCells,
  tFigure,
  transformFigure,
  uFigure,
  type Figure,
} from './grid';
import { canonicalId } from './hexomino';
import { BugList, kaestchen, laengen, makeChoice, placeOnGrid, praiseFrom, sumText, twoFiguresGrid } from './shared';

const ID = 'geometrie.umfang';

function base(stufe: Stufe, key: string): Pick<Exercise, 'key' | 'topicId' | 'skillId' | 'stufe' | 'kmk'> {
  return { key: `${ID}:${stufe}:${key}`, topicId: 'geometrie', skillId: ID, stufe, kmk: stufe === 3 ? ['RF.flaeche', 'PK.argumentieren'] : ['RF.flaeche'] };
}

type Unit = 'kaestchen' | 'cm';

function answerOf(value: number, unit: Unit): NumberAnswer {
  return { kind: 'number', value, unit: unit === 'cm' ? 'cm' : 'Kästchenlängen', before: 'Umfang:' };
}

const len = (n: number, unit: Unit) => (unit === 'cm' ? fmtQty(n, 'cm') : laengen(n));

const AREA_HINT = 'Du hast die Kästchen gezählt – das ist der Flächeninhalt. Für den Umfang zählst du die Kästchenlängen am Rand.';
const BORDER_HINT = 'Du hast die Kästchen am Rand gezählt. Zähle die Randlinien: An einer Ecke hat ein Kästchen zwei Randlinien.';

function unitPrompt(unit: Unit): string {
  return unit === 'cm' ? 'Ein Kästchen ist 1 cm lang. Wie lang ist der Umfang der Figur?' : 'Wie lang ist der Umfang? Zähle die Kästchenlängen am Rand.';
}

// ─── Stufe 1 ────────────────────────────────────────────────────────────────

function rectangle(rng: Rng): Exercise {
  const w = rng.int(2, 7);
  const h = rng.int(2, 5);
  const unit: Unit = rng.chance(0.25) ? 'cm' : 'kaestchen';
  const p = 2 * (w + h);
  const { visual } = placeOnGrid(rectCells({ x: 0, y: 0, w, h }));
  const bugs = new BugList(p)
    .add('flaeche', w * h, AREA_HINT)
    .add('zwei-seiten', w + h, 'Du hast nur zwei Seiten gezählt. Gehe einmal ganz um das Rechteck herum.')
    .add('randkaestchen', 2 * (w + h) - 4, BORDER_HINT);
  return {
    ...base(1, `${w}x${h}:${unit}`),
    ab: 1,
    prompt: unitPrompt(unit),
    visual,
    answer: answerOf(p, unit),
    hints: [
      'Fahre mit dem Finger einmal um das Rechteck herum.',
      'Zähle die Kästchenlängen oben, rechts, unten und links.',
      'Gegenüberliegende Seiten sind gleich lang. Addiere alle vier Seiten.',
    ],
    steps: [
      `Oben: ${len(w, unit)}, rechts: ${len(h, unit)}, unten: ${len(w, unit)}, links: ${len(h, unit)}.`,
      `${sumText([w, h, w, h])} = ${fmt(p)}`,
      `Der Umfang ist ${len(p, unit)}.`,
    ],
    bugs: bugs.list,
    praise: praiseFrom(rng, ['Du bist einmal ganz um das Rechteck herumgegangen.', 'Du hast alle vier Seiten addiert.', 'Du hast Kästchenlängen gezählt, nicht Kästchen.']),
    srText: `Ein Rechteck im Kästchengitter, ${fmt(w)} Kästchen breit und ${fmt(h)} Kästchen hoch. ${unitPrompt(unit)}`,
  };
}

// ─── Stufe 2 ────────────────────────────────────────────────────────────────

function compositeFigure(rng: Rng): Figure {
  for (;;) {
    const kind = rng.pick(['L', 'T', 'U', 'frei', 'frei'] as const);
    let f: Figure;
    if (kind === 'L') {
      const W = rng.int(3, 6);
      const H = rng.int(3, 5);
      f = lFigure(W, H, rng.int(1, W - 1), rng.int(1, H - 1));
    } else if (kind === 'T') {
      const W = rng.int(3, 6);
      const stems = [1, 2].filter((s) => s <= W - 2 && (W - s) % 2 === 0);
      f = tFigure(W, rng.int(1, 2), rng.pick(stems), rng.int(1, 3));
    } else if (kind === 'U') {
      const H = rng.int(2, 4);
      f = uFigure(rng.int(1, 2), rng.int(1, 2), rng.int(1, 2), H, rng.int(1, H - 1));
    } else {
      f = { kind: 'frei', cells: randomPolyomino(rng, rng.int(6, 14), 6, 5), parts: [] };
    }
    if (f.cells.length < 5 || f.cells.length > 30) continue;
    return f.kind === 'frei' ? f : transformFigure(f, rng.int(0, 7));
  }
}

function composite(rng: Rng): Exercise {
  const fig = compositeFigure(rng);
  const unit: Unit = rng.chance(0.25) ? 'cm' : 'kaestchen';
  const p = perimeterOf(fig.cells);
  const sides = outlineSides(fig.cells);
  const b = bounds(fig.cells);
  const { visual, cells } = placeOnGrid(fig.cells);
  const bugs = new BugList(p)
    .add('flaeche', fig.cells.length, AREA_HINT)
    .add('randkaestchen', borderCellCount(fig.cells), BORDER_HINT)
    .add('rechteck-drumherum', 2 * (b.w + b.h), 'Das ist der Umfang des Rechtecks um die Figur. In den Einbuchtungen kommen noch Randlinien dazu.');
  return {
    ...base(2, `${fig.kind}:${cellsId(fig.cells)}:${unit}`),
    ab: 2,
    prompt: unitPrompt(unit),
    visual,
    answer: answerOf(p, unit),
    hints: [
      'Starte an einer Ecke und fahre mit dem Finger einmal um die Figur herum.',
      'Zähle bei jeder geraden Seite die Kästchenlängen.',
      'Addiere alle Seiten. Vergiss die Seiten in den Einbuchtungen nicht.',
    ],
    steps: [
      `Starte oben links und gehe im Uhrzeigersinn einmal um die Figur herum. Die Figur hat ${fmt(sides.length)} gerade Seiten.`,
      `Die Seiten sind so lang: ${sides.map((s) => fmt(s)).join(', ')}.`,
      `${sumText(sides)} = ${fmt(p)}`,
      `Der Umfang ist ${len(p, unit)}.`,
    ],
    bugs: bugs.list,
    praise: praiseFrom(rng, ['Du bist einmal ganz um die Figur herumgegangen.', 'Du hast auch an die Seiten in den Einbuchtungen gedacht.', 'Du hast jede Randlinie genau einmal gezählt.']),
    srText: `Eine Figur im Kästchengitter. Angemalt sind: ${describeCells(cells)}. ${unitPrompt(unit)}`,
  };
}

// ─── Stufe 3 ────────────────────────────────────────────────────────────────

function compareSameArea(rng: Rng): Exercise {
  let a: Cell[];
  let b: Cell[];
  let pa = 0;
  let pb = 0;
  const n = rng.int(6, 12);
  const wantEqual = rng.chance(0.25);
  for (;;) {
    a = randomPolyomino(rng, n, 5, 4);
    b = randomPolyomino(rng, n, 5, 4);
    pa = perimeterOf(a);
    pb = perimeterOf(b);
    if (canonicalId(a) === canonicalId(b)) continue;
    if (wantEqual ? pa === pb : pa !== pb) break;
  }
  const grid = twoFiguresGrid(a, b, 'Links Figur A, rechts Figur B');
  const larger = pa > pb ? 'A' : 'B';
  const smaller = larger === 'A' ? 'B' : 'A';
  const gleich = 'Beide haben den gleichen Umfang.';
  const COUNT = 'Zähle bei beiden Figuren die Kästchenlängen am Rand und vergleiche.';
  const answer = wantEqual
    ? makeChoice(rng, { label: gleich }, [
        { label: 'Figur A', whyWrong: `${COUNT} Beide Ergebnisse sind gleich.` },
        { label: 'Figur B', whyWrong: `${COUNT} Beide Ergebnisse sind gleich.` },
      ], { keepOrder: true, correctIndex: 2 })
    : makeChoice(rng, { label: `Figur ${larger}` }, [
        { label: `Figur ${smaller}`, whyWrong: `Bei Figur ${smaller} liegen die Kästchen dichter beieinander. ${COUNT}` },
        { label: gleich, whyWrong: 'Gleich viele Kästchen heißt nicht gleich langer Rand. Zähle die Randlinien beider Figuren.' },
      ], { keepOrder: true, correctIndex: larger === 'A' ? 0 : 1 });
  const result = wantEqual
    ? `Beide Figuren haben einen Umfang von ${laengen(pa)}.`
    : `Figur ${larger} hat den größeren Umfang.`;
  return {
    ...base(3, `vergleich:${cellsId(a)}:${cellsId(b)}`),
    ab: 3,
    knobel: true,
    prompt: `Beide Figuren haben ${fmt(n)} Kästchen. Welche Figur hat den größeren Umfang?`,
    visual: grid.visual,
    answer,
    hints: [
      'Gleicher Flächeninhalt bedeutet nicht gleicher Umfang.',
      'Zähle bei Figur A die Kästchenlängen am Rand. Dann bei Figur B.',
    ],
    steps: [
      `Figur A: ${sumText(outlineSides(a))} = ${laengen(pa)}.`,
      `Figur B: ${sumText(outlineSides(b))} = ${laengen(pb)}.`,
      result,
    ],
    praise: praiseFrom(rng, ['Du hast den Umfang beider Figuren gezählt und verglichen.', 'Du hast gemerkt: Gleich viele Kästchen können verschieden langen Rand haben.']),
    srText: `Zwei Figuren mit je ${fmt(n)} Kästchen. Figur A: ${describeCells(grid.a)}. Figur B: ${describeCells(grid.b)}. Welche Figur hat den größeren Umfang? Oder haben beide den gleichen Umfang?`,
  };
}

/** The other way round: the same Umfang, but different Flächeninhalt. */
function compareSamePerimeter(rng: Rng): Exercise {
  let a: Cell[] = [];
  let b: Cell[] = [];
  let p = 0;
  for (let found = false; !found; ) {
    a = randomPolyomino(rng, rng.int(5, 10), 5, 4);
    p = perimeterOf(a);
    for (let i = 0; i < 40 && !found; i++) {
      const n = rng.int(4, 14);
      if (Math.abs(n - a.length) < 2) continue; // the difference should be countable, not a near tie
      b = randomPolyomino(rng, n, 5, 4);
      found = perimeterOf(b) === p;
    }
  }
  if (rng.chance(0.5)) [a, b] = [b, a];
  const grid = twoFiguresGrid(a, b, 'Links Figur A, rechts Figur B');
  const larger = a.length > b.length ? 'A' : 'B';
  const smaller = larger === 'A' ? 'B' : 'A';
  const gleich = 'Beide sind gleich groß.';
  const answer = makeChoice(rng, { label: `Figur ${larger}` }, [
    { label: `Figur ${smaller}`, whyWrong: `Der Rand von Figur ${smaller} ist genauso lang, aber es passen weniger Kästchen hinein. Zähle die Kästchen beider Figuren.` },
    { label: gleich, whyWrong: 'Gleich langer Rand heißt nicht gleich großer Flächeninhalt. Zähle die Kästchen beider Figuren.' },
  ], { keepOrder: true, correctIndex: larger === 'A' ? 0 : 1 });
  const prompt = 'Beide Figuren haben den gleichen Umfang. Welche Figur hat den größeren Flächeninhalt?';
  return {
    ...base(3, `gleicher-umfang:${cellsId(a)}:${cellsId(b)}`),
    ab: 3,
    knobel: true,
    prompt,
    visual: grid.visual,
    answer,
    hints: [
      'Gleicher Umfang bedeutet nicht gleicher Flächeninhalt.',
      'Zähle bei beiden Figuren die Kästchen und vergleiche.',
    ],
    steps: [
      `Figur A: Umfang ${sumText(outlineSides(a))} = ${laengen(p)}. Flächeninhalt: ${kaestchen(a.length)}.`,
      `Figur B: Umfang ${sumText(outlineSides(b))} = ${laengen(p)}. Flächeninhalt: ${kaestchen(b.length)}.`,
      `Der Umfang ist gleich, aber Figur ${larger} hat mehr Kästchen. Figur ${larger} hat den größeren Flächeninhalt.`,
    ],
    praise: praiseFrom(rng, ['Du hast Umfang und Flächeninhalt sauber auseinandergehalten.', 'Du hast gemerkt: Gleich langer Rand kann verschieden viel Fläche umschließen.']),
    srText: `Zwei Figuren mit gleich langem Umfang. Figur A: ${describeCells(grid.a)}. Figur B: ${describeCells(grid.b)}. Welche Figur hat den größeren Flächeninhalt? Oder sind beide gleich groß?`,
  };
}

function rectangleChoice(rng: Rng): Exercise {
  const n = rng.pick([12, 16, 18, 20, 24, 30, 36]);
  const largest = rng.chance(0.5);
  const pairs: [number, number][] = [];
  for (let r = 1; r * r <= n; r++) if (n % r === 0) pairs.push([r, n / r]);
  // largest Umfang: 1 row; smallest: the most square rectangle
  const best = largest ? pairs[0] : pairs[pairs.length - 1];
  const others = pairs.filter((p) => p !== best);
  const chosen = others.length > 3 ? [others[0], others[others.length - 1], ...rng.sample(others.slice(1, -1), 1)].slice(0, 3) : others;
  const label = ([r, c]: [number, number]) => (r === 1 ? `1 Reihe mit ${fmt(c)} Kästchen` : `${fmt(r)} Reihen mit je ${fmt(c)} Kästchen`);
  const per = ([r, c]: [number, number]) => 2 * (r + c);
  const answer = makeChoice(
    rng,
    { label: label(best) },
    chosen.map((p) => ({
      label: label(p),
      whyWrong: `Dieses Rechteck hat einen Umfang von ${laengen(per(p))}. ${largest ? 'Ein anderes Rechteck hat einen längeren Rand.' : 'Ein anderes Rechteck hat einen kürzeren Rand.'}`,
    })),
  );
  const word = largest ? 'größten' : 'kleinsten';
  return {
    ...base(3, `rechtecke:${n}:${largest ? 'max' : 'min'}:${chosen.map((p) => p.join('x')).sort().join('-')}`),
    ab: 3,
    knobel: true,
    prompt: `Du legst aus ${fmt(n)} Kästchen ein Rechteck. Welches Rechteck hat den ${word} Umfang?`,
    answer,
    hints: [
      'Zeichne die Rechtecke auf Kästchenpapier oder stell sie dir vor.',
      'Berechne für jedes Rechteck den Umfang: alle vier Seiten addieren.',
      largest ? 'Je länger und schmaler das Rechteck, desto länger ist der Rand.' : 'Je näher das Rechteck an einem Quadrat ist, desto kürzer ist der Rand.',
    ],
    steps: [
      ...[best, ...chosen].sort((p, q) => p[0] - q[0]).map((p) => `${label(p)}: ${sumText([p[1], p[0], p[1], p[0]])} = ${laengen(per(p))}.`),
      `Den ${word} Umfang hat: ${label(best)}.`,
    ],
    praise: praiseFrom(rng, ['Du hast den Umfang aller Rechtecke verglichen.', 'Du hast gemerkt: Gleicher Flächeninhalt, aber verschieden langer Rand.']),
    srText: `Du legst aus ${fmt(n)} Kästchen ein Rechteck. Welches Rechteck hat den ${word} Umfang?`,
  };
}

type Change = 'ecke-weg' | 'rand-weg' | 'anbauen' | 'luecke-fuellen';

function changeOne(rng: Rng): Exercise {
  const W = rng.int(3, 6);
  const H = rng.int(3, 5);
  const rect = rectCells({ x: 0, y: 0, w: W, h: H });
  const change = rng.pick<Change>(['ecke-weg', 'rand-weg', 'anbauen', 'luecke-fuellen']);
  let before: Cell[] = rect;
  let after: Cell[] = rect;
  let text = '';
  if (change === 'ecke-weg') {
    const corner = rng.pick<Cell>([[0, 0], [W - 1, 0], [0, H - 1], [W - 1, H - 1]]);
    after = rect.filter((c) => ck(c) !== ck(corner));
    text = 'Mia nimmt ein Kästchen an einer Ecke weg.';
  } else if (change === 'rand-weg' || change === 'luecke-fuellen') {
    const x = rng.int(1, W - 2);
    const y = rng.pick([0, H - 1]);
    const notched = rect.filter((c) => ck(c) !== ck([x, y]));
    if (change === 'rand-weg') {
      after = notched;
      text = 'Mia nimmt ein Kästchen in der Mitte einer Seite weg.';
    } else {
      before = notched;
      text = 'Mia füllt die Lücke mit einem Kästchen.';
    }
  } else {
    const set = cellSet(rect);
    const spots = emptyNeighbours(rect).filter((c) => !set.has(ck(c)));
    const add = rng.pick(spots);
    after = [...rect, add];
    text = 'Mia legt außen ein Kästchen an.';
  }
  if (!isSimpleFigure(before) || !isSimpleFigure(after)) throw new Error('umfang: unexpected figure');
  const pb = perimeterOf(before);
  const pa = perimeterOf(after);
  const grid = twoFiguresGrid(before, after, 'Links vorher, rechts nachher', 3);
  const same = 'Der Umfang bleibt gleich.';
  const bigger = 'Der Umfang wird größer.';
  const smaller = 'Der Umfang wird kleiner.';
  const correct = pa === pb ? same : pa > pb ? bigger : smaller;
  const WHY: Record<Change, Record<string, string>> = {
    'ecke-weg': {
      [bigger]: 'Zähle nach: Zwei Randlinien fallen weg, und zwei neue kommen dazu.',
      [smaller]: 'Weniger Kästchen heißt nicht weniger Rand. Zwei Randlinien fallen weg, aber zwei neue kommen dazu.',
    },
    'rand-weg': {
      [same]: 'Zähle nach: Eine Randlinie fällt weg, aber in der Lücke kommen drei neue dazu.',
      [smaller]: 'Weniger Kästchen heißt nicht weniger Rand. In der Lücke kommen neue Randlinien dazu.',
    },
    anbauen: {
      [same]: 'Zähle nach: Eine Randlinie fällt weg, aber das neue Kästchen bringt drei neue mit.',
      [smaller]: 'Das neue Kästchen bringt neue Randlinien mit. Eine fällt weg, drei kommen dazu.',
    },
    'luecke-fuellen': {
      [same]: 'Zähle nach: Drei Randlinien in der Lücke fallen weg, nur eine neue kommt dazu.',
      [bigger]: 'Mehr Kästchen heißt nicht mehr Rand. Beim Füllen der Lücke fallen Randlinien weg.',
    },
  };
  const why = WHY[change];
  const answer = makeChoice(
    rng,
    { label: correct },
    [same, bigger, smaller].filter((l) => l !== correct).map((l) => ({ label: l, whyWrong: why[l] })),
    { keepOrder: true, correctIndex: [same, bigger, smaller].indexOf(correct) },
  );
  const diff = pa - pb;
  return {
    ...base(3, `aendern:${change}:${cellsId(before)}:${cellsId(after)}`),
    ab: 3,
    knobel: change === 'ecke-weg',
    prompt: `${text} Was passiert mit dem Umfang?`,
    visual: grid.visual,
    answer,
    hints: [
      'Zähle den Umfang vorher.',
      'Zähle den Umfang nachher. Welche Randlinien fallen weg, welche kommen dazu?',
    ],
    steps: [
      `Vorher: ${sumText(outlineSides(before))} = ${laengen(pb)}.`,
      `Nachher: ${sumText(outlineSides(after))} = ${laengen(pa)}.`,
      diff === 0 ? `${same} Es fallen 2 Randlinien weg und 2 neue kommen dazu.` : diff > 0 ? `${bigger} Er wächst um ${laengen(diff)}.` : `${smaller} Er schrumpft um ${laengen(-diff)}.`,
    ],
    praise: praiseFrom(rng, ['Du hast den Umfang vorher und nachher genau verglichen.', 'Du hast auf die Randlinien geachtet, nicht nur auf die Kästchen.']),
    srText: `${text} Vorher: ${describeCells(grid.a)}. Nachher: ${describeCells(grid.b)}. Was passiert mit dem Umfang? Er bleibt gleich, wird größer oder wird kleiner.`,
  };
}

export const umfangSkill: SkillDef = {
  id: ID,
  topicId: 'geometrie',
  title: 'Umfang',
  description: 'Du zählst die Kästchenlängen einmal rund um eine Figur.',
  stufen: {
    1: 'Umfang von Rechtecken',
    2: 'Umfang von zusammengesetzten Figuren',
    3: 'Gleicher Flächeninhalt, anderer Umfang – und umgekehrt',
  },
  kmk: ['RF.flaeche', 'PK.argumentieren'],
  generate(rng, stufe) {
    if (stufe === 1) return rectangle(rng);
    if (stufe === 2) return composite(rng);
    const r = rng.next();
    if (r < 0.3) return compareSameArea(rng);
    if (r < 0.45) return compareSamePerimeter(rng);
    if (r < 0.65) return rectangleChoice(rng);
    return changeOne(rng);
  },
};
