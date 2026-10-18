import { fmt, toSpeech } from '../../core/format';
import type { ChoiceOption, Exercise, Rng, SkillDef, Step, Stufe, SubtractionMethod, WrittenOp } from '../../core/types';
import { BUG_LIBRARY, bugCandidates, bugsFor, buggyPartials, remainderBugs, type BugCandidate } from './bugs';
import {
  NAMES,
  TOPIC,
  addColumnSteps,
  attempt,
  canon,
  expressionOf,
  equationOf,
  mulDigitSteps,
  randLen,
  solutionSteps,
  subColumnSteps,
  ueberschlagOk,
  uniqueBugs,
  weighted,
} from './common';
import { correctResult, digitAt, firstDiffPlace, numLength, partialsSpeech, placeDative, placeName, placeStelle, writtenVisual } from './layout';

const ID = 'schriftlich.fehlerdetektiv';

/** Bugs that can be planted (column-local, visible in a correctly aligned layout). */
const PLANTABLE: Record<WrittenOp, readonly string[]> = {
  add: ['add.no-carry', 'add.carry-twice', 'add.carry-too-small', 'add.carry-swapped', 'add.last-carry'],
  sub: ['sub.smaller-from-larger', 'sub.no-reduce', 'sub.zero-minus-n', 'sub.zero-minus-n-zero', 'sub.across-zero', 'sub.borrow-added'],
  mul: ['mul.no-carry', 'mul.carry-before', 'mul.last-carry', 'mul.unshifted', 'mul.zero-skipped', 'mul.sum-no-carry'],
  div: ['div.missing-zero', 'div.missing-end-zero', 'div.drop-first', 'div.digitwise'],
};
/** Bugs that may appear as wrong explanations (distractors). */
const EXPLAINABLE = (op: WrittenOp) => PLANTABLE[op].concat(op === 'sub' ? ['sub.added'] : op === 'div' ? ['div.rest-too-big'] : []);

export interface Planted {
  op: WrittenOp;
  operands: number[];
  method: SubtractionMethod;
  bug: BugCandidate;
  /** Rightmost place where the shown result differs from the correct one. */
  place: number;
  shown: number;
}

function randomOperands(rng: Rng, stufe: Stufe, op: WrittenOp): number[] | null {
  switch (op) {
    case 'add': {
      if (stufe === 1) return [randLen(rng, rng.int(3, 4)), randLen(rng, rng.int(3, 4))];
      const k = stufe === 2 ? rng.int(2, 3) : rng.int(2, 3);
      const ops = Array.from({ length: k }, () => randLen(rng, stufe === 2 ? rng.int(4, 5) : rng.int(5, 6)));
      return ops.reduce((s, n) => s + n, 0) <= 1_000_000 ? ops : null;
    }
    case 'sub': {
      const la = stufe === 1 ? rng.int(3, 4) : stufe === 2 ? rng.int(4, 5) : rng.int(5, 6);
      let a = randLen(rng, la);
      if (stufe > 1 && rng.chance(0.4)) {
        const ds = String(a).split('');
        ds[rng.int(1, la - 2)] = '0';
        a = Number(ds.join(''));
      }
      const b = randLen(rng, rng.int(Math.max(3, la - 1), la));
      return b < a ? [a, b] : null;
    }
    case 'mul':
      return stufe < 3 ? [randLen(rng, rng.int(3, 4)), rng.int(3, 9)] : [randLen(rng, rng.int(3, 4)), rng.chance(0.3) ? rng.int(2, 9) * 10 : rng.int(12, 99)];
    case 'div': {
      const d = rng.int(3, 9);
      const q = randLen(rng, rng.int(3, 4));
      const ds = String(q).split('');
      if (rng.chance(0.6)) ds[rng.int(1, ds.length - 1)] = '0';
      const a = Number(ds.join('')) * d + (rng.chance(0.4) ? rng.int(1, d - 1) : 0);
      return numLength(a) <= 6 ? [a, d] : null;
    }
  }
}

/**
 * Plant a bug: operands + a misconception that shows as a wrong result.
 * The first wrong digit must sit in the column where the misconception happened (0 − 5 → 5 would otherwise
 * move the visible mistake one column to the left, away from the 0). `withUeberschlag`: the solution shows an
 * Überschlag, so it has to fit the result.
 */
export function plantBug(rng: Rng, stufe: Stufe, op: WrittenOp, method: SubtractionMethod, needDistractors: number, withUeberschlag = false): Planted {
  return attempt<Planted>(
    () => {
      const operands = randomOperands(rng, stufe, op);
      if (!operands) return null;
      if (withUeberschlag && op !== 'div' && !ueberschlagOk(op, operands)) return null;
      const cands = bugCandidates(op, operands, method).filter((c) => PLANTABLE[op].includes(c.def.id));
      if (cands.length === 0) return null;
      const bug = rng.pick(cands);
      const correct = correctResult(op, operands);
      const shown = bug.value;
      if (shown <= 0 || Math.abs(numLength(shown) - numLength(correct)) > 1) return null;
      const place = firstDiffPlace(correct, shown);
      const where = bug.def.place?.(operands, method);
      if (where !== undefined && where !== null && where !== place) return null;
      const planted: Planted = { op, operands, method, bug, place, shown };
      return explanationOptions(planted).length - 1 >= needDistractors ? planted : null;
    },
    () => {
      const operands = op === 'add' ? [456, 278] : op === 'sub' ? [742, 358] : op === 'mul' ? [473, 6] : [4230, 6];
      const bug = bugCandidates(op, operands, method).find((c) => PLANTABLE[op].includes(c.def.id))!;
      return { op, operands, method, bug, place: firstDiffPlace(correctResult(op, operands), bug.value), shown: bug.value };
    },
  );
}

/** Explanation options: the planted bug first, then distractors that would show a different digit at the place. */
export function explanationOptions(pl: Planted): ChoiceOption[] {
  const { op, operands, method, place, shown } = pl;
  const right: ChoiceOption = { label: pl.bug.def.label(method) };
  const out: ChoiceOption[] = [right];
  const labels = new Set([right.label]);
  for (const def of BUG_LIBRARY[op]) {
    if (def.id === pl.bug.def.id || !EXPLAINABLE(op).includes(def.id)) continue;
    if (def.methods && !def.methods.includes(method)) continue;
    const label = def.label(method);
    if (labels.has(label)) continue;
    const v = def.compute(operands, method);
    if (v === null || v === shown || v < 0) continue;
    if (op === 'div') {
      out.push({ label, whyWrong: `Dann stünde im Ergebnis ${fmt(v)}. Prüfe die Schritte noch einmal.` });
    } else {
      const d = digitAt(v, place);
      if (d === digitAt(shown, place) || numLength(v) <= place) continue;
      out.push({ label, whyWrong: `Dann stünde bei den ${placeDative(place)} eine ${d}. Rechne die ${placeName(place)} selbst nach.` });
    }
    labels.add(label);
  }
  return out;
}

function columnStep(pl: Planted): string | null {
  const { op, operands, method, place } = pl;
  if (op === 'add') return addColumnSteps(operands)[place] ?? null;
  if (op === 'sub') return subColumnSteps(operands[0], operands[1], method)[place] ?? null;
  if (op === 'mul' && numLength(operands[1]) === 1) {
    const steps = mulDigitSteps(operands[0], operands[1]);
    return steps[Math.min(place, steps.length - 1)];
  }
  return null;
}

function givenText(pl: Planted): string {
  const rem = shownRemainder(pl) ?? 0;
  return `${expressionOf(pl.op, pl.operands)} = ${fmt(pl.shown)}${rem ? ` R ${rem}` : ''}`;
}

/** The remainder a child with this misconception writes next to the wrong quotient. */
function shownRemainder(pl: Planted): number | undefined {
  if (pl.op !== 'div') return undefined;
  const [a, d] = pl.operands;
  if (pl.bug.def.id === 'div.drop-first') return (a % 10 ** (String(a).length - 1)) % d;
  if (pl.bug.def.id === 'div.digitwise') return 0;
  return a % d;
}

function shownPartials(pl: Planted): { value: number; shift: number }[] | undefined {
  return pl.op === 'mul' ? (buggyPartials(pl.bug.def.id, pl.operands[0], pl.operands[1]) ?? undefined) : undefined;
}

function shownVisual(pl: Planted, highlight: boolean) {
  return writtenVisual({
    type: 'written',
    op: pl.op,
    operands: pl.operands.slice(),
    method: pl.op === 'sub' ? pl.method : undefined,
    showSolution: false,
    highlightColumn: highlight ? pl.place : undefined,
    shownResult: pl.shown,
    shownRemainder: shownRemainder(pl),
    shownPartials: shownPartials(pl),
  });
}

/** Screen-reader text of the given (wrong) calculation, with the partial products of a multi-digit multiplication. */
function givenSpeech(pl: Planted): string {
  const parts = partialsSpeech(shownPartials(pl));
  return `${toSpeech(givenText(pl))}.${parts ? ` ${parts}.` : ''}`;
}

function solvedVisual(pl: Planted) {
  return writtenVisual({ type: 'written', op: pl.op, operands: pl.operands.slice(), method: pl.op === 'sub' ? pl.method : undefined, showSolution: true });
}

function kmkFor(op: WrittenOp): string[] {
  return ['ZO.kontrolle', op === 'div' ? 'ZO.division' : 'ZO.schriftlich', 'PK.argumentieren'];
}

/** "Wo steckt der Fehler?" — choose the column. */
function whereItem(rng: Rng, stufe: Stufe, op: WrittenOp, method: SubtractionMethod): Exercise {
  const pl = plantBug(rng, stufe, op, method, 0);
  const correct = correctResult(op, pl.operands);
  const width = Math.max(numLength(correct), numLength(pl.shown));
  const lo = Math.max(0, Math.min(pl.place - rng.int(0, 2), width - 4));
  const places = Array.from({ length: Math.min(4, width) }, (_, i) => lo + i).filter((p) => p < width);
  const options: ChoiceOption[] = places
    .slice()
    .reverse()
    .map((q) => {
      if (q === pl.place) return { label: `Bei den ${placeDative(q)}` };
      if (q < pl.place) return { label: `Bei den ${placeDative(q)}`, whyWrong: `Bei den ${placeDative(q)} stimmt die Ziffer. Prüfe weiter links.` };
      const alsoWrong = digitAt(correct, q) !== digitAt(pl.shown, q);
      return {
        label: `Bei den ${placeDative(q)}`,
        whyWrong: alsoWrong
          ? 'Hier stimmt die Ziffer auch nicht. Der Fehler fängt aber weiter rechts an.'
          : `Bei den ${placeDative(q)} stimmt die Ziffer. Prüfe Spalte für Spalte von rechts.`,
      };
    });
  const name = rng.pick(NAMES);
  const col = columnStep(pl);
  const steps: Step[] = ['Prüfe Spalte für Spalte von rechts.'];
  if (pl.place > 0) steps.push(`Bis zu den ${placeDative(pl.place - 1)} stimmt alles.`);
  if (col) steps.push(`So ist es richtig – ${col}`);
  steps.push(`Was ist passiert? ${pl.bug.def.label(method)}`);
  steps.push({ text: `Der Fehler steckt bei den ${placeDative(pl.place)}. Richtig ist: ${equationOf(op, pl.operands)}.`, visual: solvedVisual(pl) });
  const prompt = 'Wo steckt der Fehler? Prüfe Spalte für Spalte von rechts.';
  return {
    key: `${ID}:${stufe}:wo:${canon(op, pl.operands)}:${pl.bug.def.id}${op === 'sub' ? `:${method[0]}` : ''}`,
    topicId: TOPIC,
    skillId: ID,
    stufe,
    ab: 2,
    context: `${name} hat schriftlich gerechnet.`,
    prompt,
    emoji: '🔍',
    visual: shownVisual(pl, false),
    answer: { kind: 'choice', options, correct: options.findIndex((o) => !o.whyWrong) },
    hints: ['Rechne jede Spalte selbst nach. Fang bei den Einern an.', 'Vergleiche deine Ziffer mit der Ziffer im Ergebnis. Wo ist sie zum ersten Mal anders?'],
    steps,
    praise: 'Du hast Spalte für Spalte genau geprüft.',
    srText: `${name} hat schriftlich gerechnet: ${givenSpeech(pl)} ${prompt}`,
    kmk: kmkFor(op),
  };
}

/** "Wo steckt der Fehler? Was ist passiert?" — choose the explanation. */
function whyItem(rng: Rng, stufe: Stufe, op: WrittenOp, method: SubtractionMethod, highlight: boolean): Exercise {
  const pl = plantBug(rng, stufe, op, method, 2);
  const all = explanationOptions(pl);
  if (all.length < 3) return op === 'div' ? correctItem(rng, stufe, op, method) : whereItem(rng, stufe, op, method);
  const pickedWrong = rng.sample(all.slice(1), Math.min(3, all.length - 1));
  const options = rng.shuffle([all[0], ...pickedWrong]);
  const name = rng.pick(NAMES);
  const col = columnStep(pl);
  const prompt = highlight ? 'Wo steckt der Fehler? Was ist in der markierten Spalte passiert?' : 'Wo steckt der Fehler? Was ist hier passiert?';
  const steps: Step[] = [];
  if (op === 'div') steps.push('Rechne die Division Schritt für Schritt nach.');
  else steps.push(`Prüfe Spalte für Spalte von rechts. Bei den ${placeDative(pl.place)} passt die Ziffer nicht.`);
  if (col) steps.push(`So ist es richtig – ${col}`);
  steps.push({ text: `${pl.bug.def.label(method)} Richtig ist: ${equationOf(op, pl.operands)}.`, visual: solvedVisual(pl) });
  return {
    key: `${ID}:${stufe}:warum${highlight ? '-m' : ''}:${canon(op, pl.operands)}:${pl.bug.def.id}${op === 'sub' ? `:${method[0]}` : ''}`,
    topicId: TOPIC,
    skillId: ID,
    stufe,
    ab: stufe === 3 ? 3 : 2,
    context: `${name} hat schriftlich gerechnet.`,
    prompt,
    emoji: '🔍',
    visual: shownVisual(pl, highlight),
    answer: { kind: 'choice', options, correct: options.indexOf(all[0]) },
    hints: [
      highlight ? `Rechne die ${placeName(pl.place)} selbst nach.` : 'Rechne selbst nach und vergleiche Schritt für Schritt.',
      op === 'div' ? 'Welche Erklärung passt genau zu dem Ergebnis, das dort steht?' : 'Welche Erklärung passt genau zu der Ziffer, die dort steht?',
    ],
    steps,
    praise: 'Du hast den Fehler genau erklärt.',
    srText: `${name} hat schriftlich gerechnet: ${givenSpeech(pl)}${highlight ? ` Markiert sind die ${placeName(pl.place)}.` : ''} ${prompt}`,
    kmk: kmkFor(op),
    knobel: stufe === 3,
  };
}

/** "Wo steckt der Fehler? Rechne die Aufgabe richtig." — written answer. */
function correctItem(rng: Rng, stufe: Stufe, op: WrittenOp, method: SubtractionMethod): Exercise {
  // the worked solution starts with an Überschlag, so it has to fit
  const pl = plantBug(rng, stufe, op, method, 0, true);
  const correct = correctResult(op, pl.operands);
  const name = rng.pick(NAMES);
  const prompt = 'Wo steckt der Fehler? Rechne die Aufgabe richtig.';
  const answer: Exercise['answer'] =
    op === 'div'
      ? { kind: 'written', op, operands: pl.operands.slice(), result: correct, remainder: pl.operands[0] % pl.operands[1] }
      : op === 'sub'
        ? { kind: 'written', op, operands: pl.operands.slice(), result: correct, method }
        : { kind: 'written', op, operands: pl.operands.slice(), result: correct };
  const where = op === 'div' ? 'im Ergebnis' : `bei den ${placeDative(pl.place)}`;
  return {
    key: `${ID}:${stufe}:berichtige:${canon(op, pl.operands)}:${pl.bug.def.id}${op === 'sub' ? `:${method[0]}` : ''}`,
    topicId: TOPIC,
    skillId: ID,
    stufe,
    ab: 3,
    context: `${name} hat schriftlich gerechnet.`,
    prompt,
    emoji: '🔍',
    visual: shownVisual(pl, false),
    answer,
    hints: [
      'Rechne selbst Schritt für Schritt und vergleiche mit der Rechnung oben.',
      op === 'div' ? 'Prüfe jeden Schritt: teilen, malnehmen, abziehen, herunterholen.' : `Schau besonders genau auf die ${placeStelle(pl.place)}.`,
    ],
    steps: [`Der Fehler steckt ${where}. ${pl.bug.def.label(method)}`, ...solutionSteps(op, pl.operands, method, true)],
    bugs: [
      ...uniqueBugs(correct, [
        { id: 'fd.unchanged', match: pl.shown, hint: `Das ist noch das Ergebnis mit dem Fehler. ${pl.bug.hint}` },
        ...bugsFor(op, pl.operands, method),
      ]),
      ...(op === 'div' ? remainderBugs(pl.operands) : []),
    ],
    praise: 'Du hast den Fehler gefunden und richtig gerechnet.',
    srText: `${name} hat schriftlich gerechnet: ${givenSpeech(pl)} ${prompt}`,
    kmk: kmkFor(op),
    knobel: true,
  };
}

export const fehlerdetektivSkill: SkillDef = {
  id: ID,
  topicId: 'schriftlich',
  title: 'Fehlerdetektiv',
  description: 'Du findest heraus, wo in einer Rechnung etwas schiefgegangen ist – und warum.',
  stufen: {
    1: 'Plus und minus: Finde die Spalte mit dem Fehler',
    2: 'Auch Malaufgaben: Erkläre, was passiert ist',
    3: 'Alle Rechenarten: Fehler erklären und berichtigen',
  },
  kmk: ['ZO.kontrolle', 'ZO.schriftlich', 'PK.argumentieren'],
  generate(rng, stufe, ctx) {
    const method = ctx.subtractionMethod;
    if (stufe === 1) return whereItem(rng, stufe, rng.chance(0.5) ? 'add' : 'sub', method);
    if (stufe === 2) {
      const op = weighted(rng, [['add', 3], ['sub', 4], ['mul', 3]] as const);
      return rng.chance(0.7) ? whyItem(rng, stufe, op, method, true) : whereItem(rng, stufe, op, method);
    }
    const op = weighted(rng, [['add', 2], ['sub', 3], ['mul', 3], ['div', 3]] as const);
    return rng.chance(0.5) ? whyItem(rng, stufe, op, method, false) : correctItem(rng, stufe, op, method);
  },
};
