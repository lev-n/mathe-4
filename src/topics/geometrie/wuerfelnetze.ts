/**
 * Würfelnetze. All 35 free hexominoes are enumerated; a folding simulation decides which 11 are nets.
 * Every shape is shown in a random rotation/reflection.
 * Stufe 1: "Ist das ein Würfelnetz?" – nets with a row of four vs. clearly impossible shapes (2×2 block, 5 in a row).
 * Stufe 2: any hexomino – Würfelnetz ja/nein; pick the one net out of three.
 * Stufe 3: opposite faces (letters, colours, dice: opposite numbers sum to 7); which net fits a coloured cube
 *          (three colours seen at once meet at a corner, so no two of them are opposite); which two squares
 *          overlap; why a shape cannot fold (choose a reason).
 */
import type { Cell, ChoiceOption, ColorName, Exercise, Rng, SkillDef, Stufe, Visual } from '../../core/types';
import { cellSet, cellsId, ck, describeCells, sortCells, transform } from './grid';
import { cornerFits, foldFaces, hasSquareBlock, hexominoes, longestLine, OPPOSITE, oppositeCells, overlappingPairs, type Hexomino } from './hexomino';
import { letter, makeChoice, praiseFrom } from './shared';

const ID = 'geometrie.wuerfelnetze';

function base(stufe: Stufe, key: string, kmk: string[] = ['RF.raum']): Pick<Exercise, 'key' | 'topicId' | 'skillId' | 'stufe' | 'kmk'> {
  return { key: `${ID}:${stufe}:${key}`, topicId: 'geometrie', skillId: ID, stufe, kmk };
}

/** Face names (from foldFaces ids) for worked solutions: 0 east … 5 bottom. */
const FACE_WORD = ['rechts', 'links', 'vorne', 'hinten', 'oben', 'unten'];

const COLORS: readonly ColorName[] = ['rot', 'blau', 'gelb', 'gruen', 'lila', 'orange'];
const COLOR_WORD: Record<ColorName, string> = { rot: 'Rot', blau: 'Blau', gelb: 'Gelb', gruen: 'Grün', lila: 'Lila', orange: 'Orange' };

/** Random orientation of a hexomino, cells sorted (row by row). */
function orient(rng: Rng, h: Hexomino): Cell[] {
  return sortCells(transform(h.cells, rng.int(0, 7)));
}

/** foldFaces with a chosen root cell (the root becomes 'unten'). */
function foldFrom(cells: readonly Cell[], root: number): number[] {
  const order = [root, ...cells.map((_, i) => i).filter((i) => i !== root)];
  const faces = foldFaces(order.map((i) => cells[i]));
  const out: number[] = new Array(cells.length);
  order.forEach((orig, k) => (out[orig] = faces[k]));
  return out;
}

function degree(cells: readonly Cell[], i: number): number {
  const set = cellSet(cells);
  const [x, y] = cells[i];
  return [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dy]) => set.has(ck([x + dx, y + dy]))).length;
}

function bestRoot(cells: readonly Cell[]): number {
  let best = 0;
  for (let i = 1; i < cells.length; i++) if (degree(cells, i) > degree(cells, best)) best = i;
  return best;
}

function netVisual(cells: Cell[], faces?: (string | null)[], highlight?: number[]): Visual {
  const v: Visual = { type: 'net', cells };
  if (faces) v.faces = faces;
  if (highlight && highlight.length) v.highlight = highlight;
  return v;
}

/** Worked-solution picture: every square labelled with the cube side it becomes (faces from foldFrom). */
function foldedLabels(cells: Cell[], faces: readonly number[]): Visual {
  const dup = new Set(faces.filter((f, i) => faces.indexOf(f) !== i));
  const highlight = faces.map((f, i) => (dup.has(f) ? i : -1)).filter((i) => i >= 0);
  return netVisual(cells, faces.map((f) => FACE_WORD[f]), highlight);
}

const NUM_WORD = ['Kein', 'Ein', 'Zwei', 'Drei', 'Vier', 'Fünf', 'Sechs'];

/** How a fold fails: groups of squares on the same cube side and the number of open sides. */
function overlapStats(faces: readonly number[]): { groups: number[]; open: number } {
  const count = new Map<number, number>();
  faces.forEach((f) => count.set(f, (count.get(f) ?? 0) + 1));
  return { groups: [...count.values()].filter((n) => n > 1).sort((a, b) => a - b), open: 6 - count.size };
}

/** 'Zwei Quadrate landen auf derselben Würfelseite (markiert). Eine Seite bleibt offen.' – matches the picture. */
function overlapSentence(faces: readonly number[], marked = true): string {
  const { groups, open } = overlapStats(faces);
  const mark = marked ? ' (markiert)' : '';
  const landing = groups.length === 1
    ? `${NUM_WORD[groups[0]]} Quadrate landen auf derselben Würfelseite${mark}.`
    : groups.length === 2 && groups.every((g) => g === 2)
      ? `Zwei Paare von Quadraten landen jeweils auf derselben Würfelseite${mark}.`
      : `Mehrere Quadrate landen auf derselben Würfelseite${mark}.`;
  const rest = open === 1 ? 'Eine Seite bleibt offen.' : `${NUM_WORD[open]} Seiten bleiben offen.`;
  return `${landing} ${rest}`;
}

type Defect = 'block' | 'reihe' | 'falten';

function defectOf(cells: readonly Cell[]): Defect {
  if (hasSquareBlock(cells)) return 'block';
  if (longestLine(cells) >= 5) return 'reihe';
  return 'falten';
}

/** Why a non-net does not fold (feedback for "Ja" / for picking it). Accurate for every non-net. */
function defectText(cells: readonly Cell[]): string {
  const defect = defectOf(cells);
  if (defect === 'block') return 'Vier Quadrate bilden zusammen ein großes Quadrat. Beim Falten liegen zwei davon aufeinander.';
  if (defect === 'reihe') {
    return longestLine(cells) >= 6
      ? 'Sechs Quadrate liegen in einer Reihe. Beim Falten liegt das fünfte auf dem ersten und das sechste auf dem zweiten.'
      : 'Fünf Quadrate liegen in einer Reihe. Beim Falten liegt das fünfte auf dem ersten.';
  }
  // no 2 × 2 block: the fold is a tree, so the overlaps do not depend on the starting square
  const { groups } = overlapStats(foldFaces(cells));
  const what = groups.length === 1 ? 'landen zwei Quadrate' : 'landen zwei Paare von Quadraten jeweils';
  return `Beim Falten ${what} auf derselben Würfelseite. Falte in Gedanken Schritt für Schritt.`;
}

const IS_NET_HINT = 'Falte in Gedanken: Nimm ein Quadrat als Boden und klappe die anderen hoch. Jede Würfelseite wird genau einmal bedeckt.';

// ─── Ja/Nein ────────────────────────────────────────────────────────────────

function yesNo(rng: Rng, stufe: 1 | 2): Exercise {
  const all = hexominoes();
  const wantNet = rng.chance(0.5);
  const pool = all.filter((h) => {
    if (h.net !== wantNet) return false;
    if (stufe === 2) return true;
    return h.net ? longestLine(h.cells) === 4 : defectOf(h.cells) !== 'falten';
  });
  const h = rng.pick(pool);
  const cells = orient(rng, h);
  const faces = foldFrom(cells, bestRoot(cells));
  const yes: ChoiceOption = { label: 'Ja, das ist ein Würfelnetz.' };
  const no: ChoiceOption = { label: 'Nein, das ist kein Würfelnetz.' };
  const answer = h.net
    ? makeChoice(rng, yes, [{ ...no, whyWrong: IS_NET_HINT }], { keepOrder: true, correctIndex: 0 })
    : makeChoice(rng, no, [{ ...yes, whyWrong: defectText(cells) }], { keepOrder: true, correctIndex: 1 });
  const result = h.net
    ? 'Jedes Quadrat wird eine andere Würfelseite. Das ist ein Würfelnetz.'
    : `${overlapSentence(faces)} Das ist kein Würfelnetz.`;
  return {
    ...base(stufe, `janein:${cellsId(cells)}`),
    ab: stufe,
    prompt: 'Kannst du dieses Netz zu einem Würfel falten?',
    visual: netVisual(cells),
    answer,
    hints: [
      'Stell dir vor, du schneidest das Netz aus und faltest es.',
      'Nimm ein Quadrat als Boden. Klappe die Nachbarn hoch. Wohin kommen die anderen Quadrate?',
      'Ein Würfel hat 6 Seiten. Jede Seite muss genau einmal bedeckt sein.',
    ],
    steps: [
      'Nimm ein Quadrat in der Mitte als Boden (unten).',
      'Klappe die anderen Quadrate hoch und schreibe auf, welche Würfelseite sie werden.',
      { text: result, visual: foldedLabels(cells, faces) },
    ],
    praise: praiseFrom(rng, ['Du hast das Netz in Gedanken genau gefaltet.', 'Du hast geprüft, ob jede Würfelseite genau einmal vorkommt.']),
    srText: `Ein Netz aus 6 Quadraten. ${describeCells(cells)}. Kannst du dieses Netz zu einem Würfel falten?`,
  };
}

function pickNet(rng: Rng): Exercise {
  const all = hexominoes();
  const net = rng.pick(all.filter((h) => h.net));
  const nonNets = rng.sample(all.filter((h) => !h.net), 2);
  const netCells = orient(rng, net);
  const wrongCells = nonNets.map((h) => orient(rng, h));
  const answer = makeChoice(
    rng,
    { label: '', visual: netVisual(netCells) },
    wrongCells.map((c) => ({ label: '', visual: netVisual(c), whyWrong: `Dieses Netz geht nicht. ${defectText(c)}` })),
    { layout: 'grid', relabel: (i) => `Netz ${letter(i)}` },
  );
  const correctLabel = answer.options[answer.correct].label;
  return {
    ...base(2, `welches:${net.id}:${nonNets.map((h) => h.id).sort((a, b) => a - b).join(',')}`),
    ab: 2,
    prompt: 'Welches Netz kannst du zu einem Würfel falten?',
    answer,
    hints: [
      'Suche Netze, bei denen vier Quadrate ein großes Quadrat bilden. Die gehen nicht.',
      'Suche Netze mit fünf Quadraten in einer Reihe. Die gehen auch nicht.',
      'Falte die übrigen Netze in Gedanken.',
    ],
    steps: [
      'Ein Würfelnetz hat keinen Block aus 2 · 2 Quadraten und nie 5 Quadrate in einer Reihe.',
      { text: `${correctLabel} lässt sich falten: Jedes Quadrat wird eine andere Würfelseite.`, visual: foldedLabels(netCells, foldFrom(netCells, bestRoot(netCells))) },
      `Die richtige Antwort ist ${correctLabel}.`,
    ],
    praise: praiseFrom(rng, ['Du hast die Netze geschickt ausgeschlossen und dann gefaltet.', 'Du hast jedes Netz in Gedanken genau geprüft.']),
    srText: `Drei Netze aus je 6 Quadraten. ${answer.options.map((o) => `${o.label}: ${describeCells((o.visual as { cells: Cell[] }).cells)}`).join('. ')}. Welches Netz kannst du zu einem Würfel falten?`,
  };
}

// ─── Stufe 3 ────────────────────────────────────────────────────────────────

function oppositeFace(rng: Rng): Exercise {
  const net = rng.pick(hexominoes().filter((h) => h.net));
  const cells = orient(rng, net);
  const useColors = rng.chance(0.4);
  const names = useColors ? rng.shuffle(COLORS) : rng.shuffle(['A', 'B', 'C', 'D', 'E', 'F']);
  const word = (i: number) => (useColors ? COLOR_WORD[names[i] as ColorName] : names[i]);
  const asked = rng.int(0, 5);
  const faces = foldFrom(cells, asked);
  const opp = faces.indexOf(OPPOSITE[faces[asked]]);
  const neighbours = cells.map((_, i) => i).filter((i) => i !== asked && i !== opp);
  const wrong = rng.sample(neighbours, 3);
  const thing = useColors ? 'Farbe' : 'Buchstabe';
  const prompt = `Du faltest das Netz zu einem Würfel. Welche${useColors ? '' : 'r'} ${thing} liegt dann gegenüber von ${word(asked)}?`;
  return {
    ...base(3, `gegenueber:${useColors ? 'farbe' : 'buchstabe'}:${cellsId(cells)}:${names.join('')}:${asked}`),
    ab: 3,
    knobel: true,
    prompt,
    visual: netVisual(cells, cells.map((_, i) => names[i]), [asked]),
    answer: makeChoice(rng, { label: word(opp) }, wrong.map((i) => ({
      label: word(i),
      whyWrong: `${word(i)} stößt beim Falten an ${word(asked)} – an einer Kante. Gegenüber heißt: Die beiden Seiten berühren sich nicht.`,
    }))),
    hints: [
      `Lege ${word(asked)} in Gedanken als Boden hin.`,
      'Die Quadrate, die an den Boden stoßen, werden die Seitenwände.',
      'In einer Reihe aus drei Quadraten liegen das erste und das dritte gegenüber.',
    ],
    steps: [
      `${word(asked)} ist unten. Die direkten Nachbarn klappst du hoch: Sie werden Seitenwände.`,
      { text: 'So landen die Quadrate am Würfel:', visual: foldedLabels(cells, faces) },
      `Oben, also gegenüber von ${word(asked)}, liegt ${word(opp)}.`,
    ],
    praise: praiseFrom(rng, ['Du hast das Netz in Gedanken Schritt für Schritt gefaltet.', 'Du hast gegenüberliegende Seiten sicher gefunden.']),
    srText: `Ein Würfelnetz aus 6 Quadraten. ${rowsWithLabels(cells, cells.map((_, i) => word(i)))} ${prompt}`,
    kmk: ['RF.raum', 'PK.problemloesen'],
  };
}

/** 'Zeile 1: Spalte 2 (A). Zeile 2: Spalte 1 (B), Spalte 2 (C) …' */
function rowsWithLabels(cells: readonly Cell[], labels: readonly (string | null)[]): string {
  const rows = new Map<number, string[]>();
  sortCells(cells).forEach((c) => {
    const i = cells.findIndex((d) => d[0] === c[0] && d[1] === c[1]);
    const text = `Spalte ${c[0] + 1}${labels[i] ? ` (${labels[i]})` : ' (leer)'}`;
    if (!rows.has(c[1])) rows.set(c[1], []);
    rows.get(c[1])!.push(text);
  });
  return [...rows.entries()].map(([y, t]) => `Zeile ${y + 1}: ${t.join(', ')}.`).join(' ');
}

function dice(rng: Rng): Exercise {
  const net = rng.pick(hexominoes().filter((h) => h.net));
  const cells = orient(rng, net);
  const faces = foldFrom(cells, 0);
  // assign dice numbers: opposite faces sum to 7
  const pairs = rng.shuffle([[1, 6], [2, 5], [3, 4]]).map((p) => (rng.chance(0.5) ? p : [p[1], p[0]]));
  const value = new Map<number, number>(); // face id → number
  [[0, 1], [2, 3], [4, 5]].forEach(([a, b], k) => {
    value.set(a, pairs[k][0]);
    value.set(b, pairs[k][1]);
  });
  const numbers = faces.map((f) => value.get(f)!);
  const q = rng.int(0, 5);
  const opp = faces.indexOf(OPPOSITE[faces[q]]);
  // show the opposite number and 1–2 neighbours; hide the rest
  const neighbours = cells.map((_, i) => i).filter((i) => i !== q && i !== opp);
  const shown = new Set([opp, ...rng.sample(neighbours, rng.int(1, 2))]);
  const labels = cells.map((_, i) => (i === q ? '?' : shown.has(i) ? String(numbers[i]) : null));
  const answerValue = 7 - numbers[opp];
  const bugs = neighbours
    .filter((i) => shown.has(i))
    .map((i) => ({ id: `nachbar-${numbers[i]}`, match: 7 - numbers[i], hint: `Die ${numbers[i]} stößt beim Falten an das Fragezeichen. Suche die Zahl, die genau gegenüber liegt.` }))
    .filter((b) => b.match !== answerValue);
  const bugsUnique = bugs.filter((b, i) => bugs.findIndex((c) => c.match === b.match) === i);
  bugsUnique.push(...(numbers[opp] !== answerValue ? [{ id: 'gleiche-zahl', match: numbers[opp], hint: `Gegenüber der ${numbers[opp]} liegt eine andere Zahl. Zusammen ergeben sie 7.` }] : []));
  return {
    ...base(3, `wuerfel:${cellsId(cells)}:${labels.map((l) => l ?? '-').join('')}`, ['RF.raum', 'PK.problemloesen']),
    ab: 3,
    knobel: true,
    context: 'Auf einem Spielwürfel ergeben die Zahlen auf gegenüberliegenden Seiten zusammen immer 7.',
    prompt: 'Welche Zahl gehört auf das Feld mit dem Fragezeichen?',
    visual: netVisual(cells, labels, [q]),
    answer: { kind: 'number', value: answerValue },
    bugs: bugsUnique,
    hints: [
      'Falte das Netz in Gedanken. Welches Feld liegt gegenüber vom Fragezeichen?',
      'In einer Reihe aus drei Quadraten liegen das erste und das dritte gegenüber.',
      'Gegenüberliegende Zahlen ergeben zusammen 7.',
    ],
    steps: [
      { text: 'So landen die Quadrate am Würfel, wenn das Fragezeichen unten liegt:', visual: foldedLabels(cells, foldFrom(cells, q)) },
      `Gegenüber vom Fragezeichen liegt die ${numbers[opp]}.`,
      `7 − ${numbers[opp]} = ${answerValue}. Auf das Feld gehört die ${answerValue}.`,
    ],
    praise: praiseFrom(rng, ['Du hast die gegenüberliegende Seite gefunden und die 7er-Regel genutzt.', 'Du hast das Netz in Gedanken gefaltet und geschickt gerechnet.']),
    srText: `Auf einem Spielwürfel ergeben gegenüberliegende Zahlen zusammen 7. Ein Würfelnetz aus 6 Quadraten: ${rowsWithLabels(cells, labels.map((l) => (l === '?' ? 'Fragezeichen' : l)))} Welche Zahl gehört auf das Feld mit dem Fragezeichen?`,
    emoji: '🎲',
  };
}

/**
 * Net ↔ coloured cube: "Schräg von oben siehst du Rot, Blau und Gelb zugleich." Three sides seen at once meet at
 * a corner, so no two of them may be opposite in the net. Exactly one of three coloured nets passes.
 */
function colourCube(rng: Rng): Exercise {
  const shapes = rng.sample(hexominoes().filter((h) => h.net), 3).map((h) => orient(rng, h));
  const seen = rng.sample(COLORS, 3);
  const word = (c: ColorName) => COLOR_WORD[c];
  /** Pairs among the three seen colours that are opposite in this coloured net. */
  const clashes = (cells: Cell[], colours: ColorName[]): [ColorName, ColorName][] => {
    const opp = oppositeCells(cells);
    const out: [ColorName, ColorName][] = [];
    for (let i = 0; i < 3; i++) {
      for (let j = i + 1; j < 3; j++) {
        if (opp[colours.indexOf(seen[i])] === colours.indexOf(seen[j])) out.push([seen[i], seen[j]]);
      }
    }
    return out;
  };
  const colouring = (cells: Cell[], fits: boolean): ColorName[] => {
    for (;;) {
      const colours = rng.shuffle(COLORS);
      if ((clashes(cells, colours).length === 0) === fits) return colours;
    }
  };
  const nets = shapes.map((cells, i) => ({ cells, colours: colouring(cells, i === 0) }));
  const answer = makeChoice(
    rng,
    { label: '', visual: netVisual(nets[0].cells, nets[0].colours) },
    nets.slice(1).map((n) => {
      const [a, b] = clashes(n.cells, n.colours)[0];
      return {
        label: '',
        visual: netVisual(n.cells, n.colours),
        whyWrong: `In diesem Netz liegen ${word(a)} und ${word(b)} gegenüber. Gegenüberliegende Seiten siehst du nie zugleich.`,
      };
    }),
    { layout: 'grid', relabel: (i) => `Netz ${letter(i)}` },
  );
  const correctLabel = answer.options[answer.correct].label;
  const list = `${word(seen[0])}, ${word(seen[1])} und ${word(seen[2])}`;
  // The picture fixes which seen colour is in front, on top and on the right. Of the two mirror orders only
  // one is what the correct net folds into: keep seen[0] in front and swap top/side if needed.
  const at = (c: ColorName) => nets[0].colours.indexOf(c);
  const [top, side] = cornerFits(nets[0].cells, at(seen[0]), at(seen[1]), at(seen[2])) ? [seen[1], seen[2]] : [seen[2], seen[1]];
  const cube: Visual = { type: 'solid', solid: 'wuerfel', faceColors: { front: seen[0], top, side } };
  const context = `Ein Würfel hat sechs verschiedene Farben. Schräg von oben siehst du ${list} zugleich.`;
  const prompt = 'Aus welchem Netz kannst du diesen Würfel falten?';
  const check = answer.options.map((o, i) => {
    const n = nets.find((x) => (o.visual as { cells: Cell[] }).cells === x.cells)!;
    const c = clashes(n.cells, n.colours);
    return i === answer.correct
      ? `${o.label}: Keine zwei dieser Farben liegen gegenüber. Das passt.`
      : `${o.label}: ${word(c[0][0])} liegt gegenüber von ${word(c[0][1])}. Das passt nicht.`;
  });
  return {
    ...base(3, `farbwuerfel:${seen.join('-')}:${nets.map((n) => `${cellsId(n.cells)}/${n.colours.join('')}`).join(':')}`, ['RF.raum', 'PK.problemloesen']),
    ab: 3,
    knobel: true,
    context,
    prompt,
    visual: cube,
    answer,
    hints: [
      'Seiten, die du zugleich siehst, stoßen an einer Ecke zusammen.',
      'Gegenüberliegende Seiten siehst du nie zugleich. Suche in jedem Netz die Seite gegenüber.',
      'In einer Reihe aus drei Quadraten liegen das erste und das dritte gegenüber.',
    ],
    steps: [
      `${list} stoßen an einer Ecke zusammen. Also darf keine dieser Farben gegenüber einer anderen liegen.`,
      ...check,
      {
        text: `Richtig ist ${correctLabel}. Markiert sind ${list}: Keine zwei davon liegen gegenüber.`,
        visual: netVisual(nets[0].cells, nets[0].colours, seen.map((c) => nets[0].colours.indexOf(c))),
      },
    ],
    praise: praiseFrom(rng, ['Du hast gegenüberliegende Seiten sicher gefunden.', 'Du hast jedes Netz in Gedanken gefaltet und geprüft.']),
    srText: `${context} Vorne ist ${word(seen[0])}, oben ${word(top)}, rechts ${word(side)}. ${prompt} ${answer.options
      .map((o) => {
        const n = nets.find((x) => (o.visual as { cells: Cell[] }).cells === x.cells)!;
        return `${o.label}: ${rowsWithLabels(n.cells, n.colours.map(word))}`;
      })
      .join(' ')}`,
  };
}

function overlapPair(rng: Rng): Exercise {
  const pool = hexominoes().filter((h) => !h.net && !hasSquareBlock(h.cells) && overlappingPairs(h.cells).length === 1);
  const h = rng.pick(pool);
  const cells = orient(rng, h);
  const [[a, b]] = overlappingPairs(cells);
  const names = rng.shuffle(['A', 'B', 'C', 'D', 'E', 'F']);
  const pairLabel = (i: number, j: number) => [names[i], names[j]].sort().join(' und ');
  // Plausible wrong pairs: never two squares that share an edge (they can never lie on each other);
  // prefer squares in the same row or column, or two to three steps apart.
  const dist = (i: number, j: number) => Math.abs(cells[i][0] - cells[j][0]) + Math.abs(cells[i][1] - cells[j][1]);
  const others: [number, number][] = [];
  for (let i = 0; i < 6; i++) for (let j = i + 1; j < 6; j++) if (!(i === a && j === b) && dist(i, j) > 1) others.push([i, j]);
  const plausible = (p: [number, number]) => cells[p[0]][0] === cells[p[1]][0] || cells[p[0]][1] === cells[p[1]][1] || dist(p[0], p[1]) <= 3;
  const preferred = rng.shuffle(others.filter(plausible));
  const wrong = [...preferred, ...rng.shuffle(others.filter((p) => !plausible(p)))].slice(0, 3);
  return {
    ...base(3, `aufeinander:${cellsId(cells)}:${names.join('')}`, ['RF.raum', 'PK.argumentieren']),
    ab: 3,
    knobel: true,
    prompt: 'Dieses Netz ist kein Würfelnetz. Welche zwei Quadrate liegen beim Falten aufeinander?',
    visual: netVisual(cells, names.slice()),
    answer: makeChoice(rng, { label: pairLabel(a, b) }, wrong.map(([i, j]) => ({
      label: pairLabel(i, j),
      whyWrong: `${pairLabel(i, j)} landen auf verschiedenen Würfelseiten. Falte noch einmal Schritt für Schritt von einem Quadrat aus.`,
    }))),
    hints: [
      'Nimm ein Quadrat als Boden und klappe die anderen der Reihe nach hoch.',
      'Schreibe zu jedem Quadrat, welche Würfelseite es wird: unten, oben, vorne, hinten, links, rechts.',
      'Zwei Quadrate bekommen dieselbe Seite.',
    ],
    steps: [
      'Falte das Netz in Gedanken und notiere für jedes Quadrat die Würfelseite.',
      { text: 'Die markierten Quadrate landen auf derselben Seite:', visual: foldedLabels(cells, foldFrom(cells, bestRoot(cells))) },
      `${pairLabel(a, b)} liegen aufeinander. Dafür bleibt eine Würfelseite offen.`,
    ],
    praise: praiseFrom(rng, ['Du hast das Netz Schritt für Schritt gefaltet.', 'Du hast genau herausgefunden, wo das Netz nicht passt.']),
    srText: `Ein Netz aus 6 Quadraten: ${rowsWithLabels(cells, names)} Dieses Netz ist kein Würfelnetz. Welche zwei Quadrate liegen beim Falten aufeinander?`,
  };
}

function isMirrorSymmetric(cells: readonly Cell[]): boolean {
  const id = cellsId(cells);
  return [4, 5, 6, 7].some((t) => cellsId(transform(cells, t)) === id);
}

function whyNot(rng: Rng): Exercise {
  const h = rng.pick(hexominoes().filter((x) => !x.net));
  const cells = orient(rng, h);
  const sym = isMirrorSymmetric(cells);
  const line = longestLine(cells);
  const faces = foldFrom(cells, bestRoot(cells));
  const { open } = overlapStats(faces);
  const correct = open === 1
    ? 'Beim Falten liegen zwei Quadrate aufeinander. Eine Würfelseite bleibt offen.'
    : `Beim Falten liegen Quadrate aufeinander. ${NUM_WORD[open]} Würfelseiten bleiben offen.`;
  const wrong: ChoiceOption[] = [
    { label: 'Es hat zu wenige Quadrate.', whyWrong: 'Zähle nach: Es sind genau 6 Quadrate – so viele, wie ein Würfel Seiten hat.' },
    sym
      ? { label: 'Es ist symmetrisch.', whyWrong: 'Das stimmt zwar, ist aber nicht der Grund. Auch das Kreuz ist symmetrisch und ein Würfelnetz.' }
      : { label: 'Es ist nicht symmetrisch.', whyWrong: 'Das stimmt zwar, ist aber nicht der Grund. Viele Würfelnetze sind nicht symmetrisch.' },
    line === 4
      ? { label: 'Es hat eine Reihe aus 4 Quadraten.', whyWrong: 'Das stimmt zwar, ist aber nicht der Grund. Viele Würfelnetze haben eine Viererreihe.' }
      : line < 4
        ? { label: 'Es hat keine Reihe aus 4 Quadraten.', whyWrong: 'Das stimmt zwar, ist aber nicht der Grund. Es gibt auch Würfelnetze ohne Viererreihe, zum Beispiel die Treppe.' }
        : { label: 'Ein Würfelnetz muss wie ein Kreuz aussehen.', whyWrong: 'Es gibt 11 verschiedene Würfelnetze. Nur eines davon sieht wie ein Kreuz aus.' },
  ];
  return {
    ...base(3, `warum:${cellsId(cells)}`, ['RF.raum', 'PK.argumentieren']),
    ab: 3,
    knobel: true,
    prompt: 'Dieses Netz lässt sich nicht zu einem Würfel falten. Warum nicht?',
    visual: netVisual(cells),
    answer: makeChoice(rng, { label: correct }, wrong),
    hints: ['Falte das Netz in Gedanken.', 'Prüfe bei jeder Antwort: Ist das wirklich der Grund, warum es nicht klappt?'],
    steps: [
      { text: 'Beim Falten bekommt jedes Quadrat eine Würfelseite. Die markierten Quadrate landen auf derselben Seite:', visual: foldedLabels(cells, faces) },
      `${overlapSentence(faces, false)} Darum ist es kein Würfelnetz.`,
    ],
    praise: praiseFrom(rng, ['Du hast den echten Grund vom bloß wahren Satz unterschieden.', 'Du hast genau begründet, warum das Netz nicht passt.']),
    srText: `Ein Netz aus 6 Quadraten: ${describeCells(cells)}. Dieses Netz lässt sich nicht zu einem Würfel falten. Warum nicht?`,
  };
}

export const wuerfelnetzeSkill: SkillDef = {
  id: ID,
  topicId: 'geometrie',
  title: 'Würfelnetze',
  description: 'Du faltest Netze in Gedanken und prüfst, ob ein Würfel entsteht.',
  stufen: {
    1: 'Würfelnetz – ja oder nein?',
    2: 'Alle Netze prüfen und das richtige finden',
    3: 'Gegenüberliegende Seiten und Begründungen',
  },
  kmk: ['RF.raum'],
  generate(rng, stufe) {
    if (stufe === 1) return yesNo(rng, 1);
    if (stufe === 2) return rng.chance(0.6) ? yesNo(rng, 2) : pickNet(rng);
    const r = rng.next();
    if (r < 0.28) return oppositeFace(rng);
    if (r < 0.48) return dice(rng);
    if (r < 0.64) return colourCube(rng);
    if (r < 0.82) return overlapPair(rng);
    return whyNot(rng);
  },
};
