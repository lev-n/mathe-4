import { MINUS, fmt, toSpeech } from '../../core/format';
import type { Bug, Exercise, MultiField, Rng, SkillDef, Step, Stufe, SubtractionMethod } from '../../core/types';
import { TOPIC, addColumnSteps, attempt, canon, equationOf, mulDigitSteps, randLen, subColumnSteps, weighted } from './common';
import { type DigitMask, digitAt, layoutAdd, layoutMul, numLength, placeDative, writtenVisual } from './layout';

const ID = 'schriftlich.ziffernraetsel';
const LABELS = ['A', 'B', 'C', 'D'];

export type PuzzleOp = 'add' | 'sub' | 'mul';

export interface Puzzle {
  op: PuzzleOp;
  operands: number[];
  result: number;
  masks: DigitMask[];
  /** Correct digit per mask (same order). */
  values: number[];
}

function numberOf(p: Puzzle, m: DigitMask): number {
  return m.row === 'result' ? p.result : p.operands[m.index ?? 0];
}

/**
 * Replace masked digits by the given values (null if a leading digit would become 0, unless `leadingZero`).
 * Uses the digit count of the shown numbers, so a leading 0 keeps its place.
 */
export function fillPuzzle(p: Puzzle, values: readonly number[], leadingZero = false): { operands: number[]; result: number } | null {
  const operands = p.operands.slice();
  let result = p.result;
  for (let i = 0; i < p.masks.length; i++) {
    const m = p.masks[i];
    const shownLen = numLength(m.row === 'result' ? p.result : p.operands[m.index ?? 0]);
    const n = m.row === 'result' ? result : operands[m.index ?? 0];
    if (!leadingZero && m.place === shownLen - 1 && values[i] === 0 && shownLen > 1) return null;
    const next = n + (values[i] - digitAt(n, m.place)) * 10 ** m.place;
    if (m.row === 'result') result = next;
    else operands[m.index ?? 0] = next;
  }
  return { operands, result };
}

function holds(op: PuzzleOp, operands: readonly number[], result: number): boolean {
  if (op === 'add') return operands.reduce((s, n) => s + n, 0) === result;
  if (op === 'sub') return operands[0] - operands[1] === result;
  return operands[0] * operands[1] === result;
}

/**
 * Number of digit assignments that solve the puzzle (stops counting at 2).
 * `leadingZero`: also count solutions with a leading 0 – children are not told that a number never starts with 0.
 */
export function countSolutions(p: Puzzle, leadingZero = false): number {
  const k = p.masks.length;
  let count = 0;
  const values = new Array<number>(k).fill(0);
  const total = 10 ** k;
  for (let code = 0; code < total; code++) {
    let c = code;
    for (let i = 0; i < k; i++) {
      values[i] = c % 10;
      c = Math.floor(c / 10);
    }
    const filled = fillPuzzle(p, values, leadingZero);
    if (filled && holds(p.op, filled.operands, filled.result)) {
      count++;
      if (count > 1) return count;
    }
  }
  return count;
}

function randomCalc(rng: Rng, stufe: Stufe, op: PuzzleOp): number[] | null {
  if (op === 'add') {
    const len = stufe === 1 ? 3 : stufe === 2 ? 4 : rng.int(4, 5);
    const ops = [randLen(rng, len), randLen(rng, rng.int(len - 1, len))];
    return layoutAdd(ops).carries.some((c) => c > 0) ? ops : null;
  }
  if (op === 'sub') {
    const len = stufe === 1 ? 3 : stufe === 2 ? 4 : rng.int(4, 5);
    const a = randLen(rng, len);
    const b = randLen(rng, rng.int(len - 1, len));
    return b < a && numLength(a - b) >= len - 1 ? [a, b] : null;
  }
  const a = randLen(rng, stufe === 2 ? 3 : rng.int(3, 4));
  const m = rng.int(3, 9);
  return layoutMul(a, m).carryCount > 0 ? [a, m] : null;
}

/** Build a puzzle with exactly one solution. */
export function makePuzzle(rng: Rng, stufe: Stufe, op: PuzzleOp, k: number): Puzzle {
  return attempt<Puzzle>(
    () => {
      const operands = randomCalc(rng, stufe, op);
      if (!operands) return null;
      const result = op === 'add' ? operands[0] + operands[1] : op === 'sub' ? operands[0] - operands[1] : operands[0] * operands[1];
      const cells: DigitMask[] = [];
      operands.forEach((n, index) => {
        // the one-digit factor is masked only on Stufe 3
        if (op === 'mul' && index === 1 && stufe < 3) return;
        for (let place = 0; place < numLength(n); place++) cells.push({ row: 'operand', index, place, label: '' });
      });
      for (let place = 0; place < numLength(result); place++) cells.push({ row: 'result', place, label: '' });
      const chosen = rng.sample(cells, k);
      // Stufe 1–2: every gap in its own column
      if (stufe < 3 && new Set(chosen.map((m) => m.place)).size < k) return null;
      chosen.sort((x, y) => x.place - y.place || (x.row === y.row ? (x.index ?? 0) - (y.index ?? 0) : x.row === 'operand' ? -1 : 1));
      const masks = chosen.map((m, i) => ({ ...m, label: LABELS[i] }));
      const p: Puzzle = { op, operands, result, masks, values: [] };
      p.values = masks.map((m) => digitAt(numberOf(p, m), m.place));
      // unique even if a gap at the front could be 0 (the rule "no leading 0" is never stated)
      return countSolutions(p, true) === 1 ? p : null;
    },
    () => ({
      op: 'add',
      operands: [456, 378],
      result: 834,
      masks: [{ row: 'operand', index: 0, place: 1, label: 'A' }],
      values: [5],
    }),
  );
}

/** Digits of a number with masked cells shown as their letter: 4A52. */
export function maskedDigits(p: Puzzle, row: 'operand' | 'result', index = 0): string {
  const n = row === 'result' ? p.result : p.operands[index];
  const len = numLength(n);
  let out = '';
  for (let place = len - 1; place >= 0; place--) {
    const m = p.masks.find((x) => x.row === row && (row === 'result' || (x.index ?? 0) === index) && x.place === place);
    out += m ? m.label : String(digitAt(n, place));
  }
  return out;
}

/** The carry/borrow a column receives (0 if none). */
function carryInto(p: Puzzle, place: number): number {
  if (place === 0) return 0;
  if (p.op === 'add') return layoutAdd(p.operands).carries[place] ?? 0;
  if (p.op === 'sub') return p.operands[0] % 10 ** place < p.operands[1] % 10 ** place ? 1 : 0;
  return layoutMul(p.operands[0], p.operands[1]).partials[0].carries[place] ?? 0;
}

/** Bug per gap: the digit a child gets when ignoring the carry/borrow from the right. */
export function puzzleBugs(p: Puzzle, method: SubtractionMethod): Bug[] {
  const bugs: Bug[] = [];
  p.masks.forEach((m, i) => {
    const cin = carryInto(p, m.place);
    if (cin === 0) return;
    const v = p.values[i];
    let wrong: number | null = null;
    if (p.op === 'add') wrong = m.row === 'result' ? (v - cin + 10) % 10 : (v + cin) % 10;
    else if (p.op === 'sub') wrong = m.row === 'result' || m.index === 1 ? (v + cin) % 10 : (v - cin + 10) % 10;
    else if (m.row === 'result' && m.place < numLength(p.operands[0])) wrong = (v - cin + 10) % 10;
    if (wrong === null || wrong === v) return;
    const prev = placeDative(m.place - 1);
    const hint =
      p.op === 'sub'
        ? method === 'abziehen'
          ? `Denk bei ${m.label} daran: Bei den ${prev} wurde entbündelt.`
          : `Denk bei ${m.label} an die gemerkte 1 von den ${prev}.`
        : `Denk bei ${m.label} an den Übertrag von den ${prev}.`;
    bugs.push({ id: `zr.carry-${m.label}`, match: { [m.label]: wrong }, hint });
  });
  return bugs;
}

function columnSteps(p: Puzzle, method: SubtractionMethod): string[] {
  if (p.op === 'add') return addColumnSteps(p.operands);
  if (p.op === 'sub') return subColumnSteps(p.operands[0], p.operands[1], method);
  return mulDigitSteps(p.operands[0], p.operands[1]);
}

function speech(p: Puzzle): string {
  const sp = (s: string) => s.split('').join(' ');
  const opWord = p.op === 'add' ? 'plus' : p.op === 'sub' ? 'minus' : 'mal';
  const left = p.operands.map((_, i) => sp(maskedDigits(p, 'operand', i))).join(` ${opWord} `);
  return `${left} gleich ${sp(maskedDigits(p, 'result'))}`;
}

export const ziffernraetselSkill: SkillDef = {
  id: ID,
  topicId: 'schriftlich',
  title: 'Ziffernrätsel',
  description: 'In einer Rechnung fehlen Ziffern. Du findest heraus, welche es sind.',
  stufen: {
    1: 'Eine Ziffer fehlt bei plus oder minus',
    2: 'Zwei Ziffern fehlen, auch beim Malnehmen',
    3: 'Drei Ziffern fehlen – echte Knobelrätsel',
  },
  kmk: ['ZO.schriftlich', 'PK.problemloesen'],
  generate(rng, stufe, ctx) {
    const method = ctx.subtractionMethod;
    const op: PuzzleOp =
      stufe === 1 ? (rng.chance(0.5) ? 'add' : 'sub') : weighted(rng, [['add', 4], ['sub', 3], ['mul', 3]] as const);
    const k = stufe;
    const p = makePuzzle(rng, stufe, op, k);
    const fields: MultiField[] = p.masks.map((m, i) => ({ id: m.label, value: p.values[i], before: `${m.label} =`, label: `Ziffer ${m.label}` }));
    const cols = columnSteps(p, method);
    const steps: Step[] = p.masks.map((m, i) => {
      const v = p.values[i];
      if (p.op === 'sub' && m.row === 'operand') {
        const [a, b] = p.operands;
        return m.index === 0
          ? `${m.label} = ${v}. Die Umkehraufgabe ${fmt(p.result)} + ${fmt(b)} = ${fmt(a)} hat bei den ${placeDative(m.place)} eine ${v}.`
          : `${m.label} = ${v}. Die Aufgabe ${fmt(a)} ${MINUS} ${fmt(p.result)} = ${fmt(b)} hat bei den ${placeDative(m.place)} eine ${v}.`;
      }
      return `${m.label} = ${v}. ${cols[Math.min(m.place, cols.length - 1)]}`;
    });
    steps.push({
      text: `Die Lösung: ${p.masks.map((m, i) => `${m.label} = ${p.values[i]}`).join(', ')}. ${equationOf(p.op, p.operands)}.`,
      visual: writtenVisual({ type: 'written', op: p.op, operands: p.operands.slice(), method: p.op === 'sub' ? method : undefined, showSolution: true }),
    });
    const letters = p.masks.map((m) => m.label);
    const lettersText = letters.length === 1 ? letters[0] : `${letters.slice(0, -1).join(', ')} und ${letters[letters.length - 1]}`;
    const ex: Exercise = {
      key: `${ID}:${stufe}:${canon(p.op, p.operands)}:${p.masks.map((m) => `${m.row === 'result' ? 'r' : `o${m.index}`}${m.place}`).join(',')}`,
      topicId: TOPIC,
      skillId: ID,
      stufe,
      ab: stufe === 1 ? 1 : stufe === 2 ? 2 : 3,
      prompt: k === 1 ? 'Welche Ziffer fehlt? Rechne Spalte für Spalte.' : 'Welche Ziffern fehlen? Jeder Buchstabe steht für eine Ziffer.',
      visual: writtenVisual({
        type: 'written',
        op: p.op,
        operands: p.operands.slice(),
        method: p.op === 'sub' ? method : undefined,
        showSolution: false,
        shownResult: p.result,
        masks: p.masks,
      }),
      answer: { kind: 'multi', fields },
      hints: [
        'Fang bei den Einern an. Welche Ziffer passt in die Lücke?',
        p.op === 'add'
          ? 'Denk an den Übertrag aus der Spalte rechts daneben.'
          : p.op === 'sub'
            ? 'Die Umkehraufgabe hilft: Ergebnis plus Subtrahend gibt den Minuenden.'
            : 'Denk an das Einmaleins und an den Übertrag.',
        'Prüfe am Ende: Rechne die ganze Aufgabe mit deinen Ziffern nach.',
      ],
      steps,
      bugs: puzzleBugs(p, method),
      praise: k === 1 ? 'Du hast die Spalte genau durchdacht.' : 'Du hast Spalte für Spalte geknobelt und alle Lücken gefunden.',
      srText: `Ziffernrätsel: ${toSpeech(speech(p))}. Welche Ziffer${k === 1 ? '' : 'n'} steh${k === 1 ? 't' : 'en'} für ${lettersText}?`,
      kmk: ['ZO.schriftlich', 'PK.problemloesen'],
    };
    if (stufe === 3) ex.knobel = true;
    return ex;
  },
};
