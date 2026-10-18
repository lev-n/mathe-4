/**
 * Core contracts shared by every part of the app.
 *
 * Generators (src/topics/**) are pure functions: (rng, stufe, ctx) → Exercise.
 * Exercises are plain data (no functions) so they can be tested, de-duplicated,
 * printed on worksheets and rendered by generic UI components.
 *
 * See docs/research.md for the reasoning behind the fields (hints, steps, bugs, praise …).
 */

// ─── Basics ──────────────────────────────────────────────────────────────────

/** Difficulty level shown to children as "Stufe 1/2/3" (≈ KMK Anforderungsbereich I/II/III). */
export type Stufe = 1 | 2 | 3;
export const STUFEN: readonly Stufe[] = [1, 2, 3];

export type TopicId =
  | 'zahlen'
  | 'schriftlich'
  | 'kopfrechnen'
  | 'groessen'
  | 'geometrie'
  | 'daten'
  | 'sachaufgaben';

export type SubtractionMethod = 'abziehen' | 'ergaenzen';

/** Seeded pseudo-random generator. Never use Math.random() in generators. */
export interface Rng {
  /** The seed this generator was created with (shown on worksheets). */
  readonly seed: number;
  /** Uniform float in [0, 1). */
  next(): number;
  /** Uniform integer in [min, max] (both inclusive). */
  int(min: number, max: number): number;
  /** Random element of a non-empty array. */
  pick<T>(items: readonly T[]): T;
  /** New shuffled copy of an array (Fisher–Yates). */
  shuffle<T>(items: readonly T[]): T[];
  /** true with probability p. */
  chance(p: number): boolean;
  /** n distinct elements of an array, in random order. */
  sample<T>(items: readonly T[], n: number): T[];
}

/** Grid cell coordinate: x = column (0 = left), y = row (0 = top). */
export type Cell = readonly [x: number, y: number];

export type ColorName = 'rot' | 'blau' | 'gelb' | 'gruen' | 'lila' | 'orange';

// ─── Visuals (declarative; rendered by src/ui/visuals/*) ──────────────────────

export type PlaceColumn = 'M' | 'HT' | 'ZT' | 'T' | 'H' | 'Z' | 'E';

export type SolidKind =
  | 'wuerfel'
  | 'quader'
  | 'kugel'
  | 'zylinder'
  | 'kegel'
  | 'pyramide'
  | 'prisma';

export type ShapeKind =
  | 'quadrat'
  | 'rechteck'
  | 'dreieck'
  | 'gleichseitiges-dreieck'
  | 'kreis'
  | 'sechseck'
  | 'achteck'
  | 'parallelogramm'
  | 'trapez'
  | 'raute';

export type PictoIcon = 'person' | 'stern' | 'ball' | 'buch' | 'apfel' | 'herz';

/** Symmetry axis on a grid. `at` = position in cell units from the left (vertical) or top (horizontal). */
export interface Axis {
  orientation: 'vertical' | 'horizontal' | 'diagonal';
  /** vertical/horizontal: line position in cell units (e.g. 4 = line between column 3 and 4). Ignored for diagonal (top-left → bottom-right of a square grid). */
  at: number;
}

/** A digit of a written calculation drawn as a labelled empty box. place 0 = Einer; index = operand row (row 'operand'). */
export interface WrittenMask {
  row: 'operand' | 'result';
  index?: number;
  place: number;
  label: string;
}

export type Visual =
  /** Stellenwerttafel. values[i] belongs to columns[i]; null = empty cell. mode 'tokens' draws Plättchen instead of digits. highlight marks one column (e.g. the decisive digit when rounding). */
  | { type: 'placeValue'; columns: PlaceColumn[]; rows: { label?: string; values: (number | null)[] }[]; mode: 'digits' | 'tokens'; highlight?: PlaceColumn }
  /** Zahlenstrahl. Ticks every minorStep, longer ticks every majorStep. Labels at every major tick if labelMajor, plus explicit `labels`. Marks are arrows with a letter/text. */
  | { type: 'numberLine'; min: number; max: number; majorStep: number; minorStep: number; labelMajor: boolean; labels?: number[]; marks?: { value: number; label: string }[] }
  /** Punktefeld for Einmaleins (rows × cols dots), optionally split by a gap after a row/column. */
  | { type: 'dotArray'; rows: number; cols: number; splitAfterRow?: number; splitAfterCol?: number }
  /**
   * Column layout of a written calculation. showSolution draws result, carries and partial products.
   * shownResult/shownRemainder/shownPartials draw a given (e.g. planted wrong) result instead of the computed one
   * (Fehlerdetektiv); masks draw single digits as labelled empty boxes (Ziffernrätsel).
   */
  | {
      type: 'written';
      op: WrittenOp;
      operands: number[];
      method?: SubtractionMethod;
      showSolution: boolean;
      highlightColumn?: number;
      shownResult?: number;
      /** div: remainder shown next to shownResult. */
      shownRemainder?: number;
      /** mul with a multi-digit second factor: partial products as written, highest digit first. */
      shownPartials?: { value: number; shift: number }[];
      masks?: WrittenMask[];
    }
  /** Square grid with filled cells (area/perimeter/symmetry figures). halfCells are triangles (diagonal halves). */
  | { type: 'grid'; width: number; height: number; cells: Cell[]; halfCells?: { cell: Cell; corner: 'tl' | 'tr' | 'bl' | 'br' }[]; axis?: Axis; showOutline?: boolean; caption?: string }
  /**
   * Körper drawing. faceColors (Würfel only): the three visible sides coloured, with a legend naming each
   * side and colour in words ("Würfel aus einem Farbnetz"); the generator must pick a colouring that the
   * folded net really shows from front-right-above.
   */
  | { type: 'solid'; solid: SolidKind; faceColors?: { front: ColorName; top: ColorName; side: ColorName } }
  | { type: 'shape'; shape: ShapeKind; showAxes?: boolean }
  /** Hexomino / net on a grid. faces[i] (optional) is a label or color name drawn on cells[i]. */
  | { type: 'net'; cells: Cell[]; faces?: (string | null)[]; highlight?: number[] }
  /** Würfelgebäude. heights[row][col] = number of stacked cubes; row 0 = back. view 'plan' = Bauplan (top view with numbers). */
  | { type: 'cubeBuilding'; heights: number[][]; view: 'iso' | 'plan' | 'front' | 'side' | 'top' }
  | { type: 'barChart'; title: string; categories: string[]; values: number[]; axisMax: number; axisStep: number; horizontal?: boolean; axisStart?: number; valueLabel?: string }
  /** Bilddiagramm. showKey false hides the legend (tasks that ask what one picture means). */
  | { type: 'pictogram'; title: string; categories: string[]; values: number[]; iconValue: number; icon: PictoIcon; showKey?: boolean }
  | { type: 'tally'; title?: string; rows: { label: string; count: number }[] }
  | { type: 'table'; caption?: string; header: string[]; rows: string[][] }
  /** Glücksrad with equal sectors in the given order. */
  | { type: 'spinner'; sectors: ColorName[] }
  /** Säckchen with Kugeln. */
  | { type: 'bag'; balls: { color: ColorName; count: number }[] }
  | { type: 'dice'; values: number[] }
  /** Baumdiagramm: levels[i] = options at depth i (full tree is drawn). */
  | { type: 'tree'; levels: string[][] }
  /** Analog clock (+ optional digital display). hours 0–23. */
  | { type: 'clock'; hours: number; minutes: number; showDigital?: boolean }
  /** Coins and notes, values in Cent: 1,2,5,10,20,50,100,200,500,1000,2000,5000,10000,20000. */
  | { type: 'money'; items: number[] }
  /** Lineal in cm with mm ticks; an object (bar) from startMm to startMm+lengthMm is drawn above it. */
  | { type: 'ruler'; maxCm: number; startMm: number; lengthMm: number }
  /** Messbecher. */
  | { type: 'container'; capacityMl: number; fillMl: number; stepMl: number }
  /** Küchenwaage (dial). */
  | { type: 'scale'; maxGrams: number; stepGrams: number; grams: number };

export type VisualType = Visual['type'];
export type VisualOf<T extends VisualType> = Extract<Visual, { type: T }>;

// ─── Answers ─────────────────────────────────────────────────────────────────

export type WrittenOp = 'add' | 'sub' | 'mul' | 'div';

export interface NumberAnswer {
  kind: 'number';
  /** Correct value. null = the task is not solvable and "Nicht lösbar" is correct (requires offerUnsolvable). */
  value: number | null;
  /** Unit shown after the input field (the child does not type it), e.g. '€', 'cm', 'Kästchen'. */
  unit?: string;
  /** Max. allowed decimal places (0 or undefined = integer, decimal comma not accepted). */
  decimals?: number;
  /** Text directly before/after the input, e.g. an Antwortsatz: before 'Lena bezahlt', after '€.' */
  before?: string;
  after?: string;
  /** Show a "Nicht lösbar – es fehlt eine Angabe" button. */
  offerUnsolvable?: boolean;
  /** Visible label for screen readers if before/after is not descriptive. */
  label?: string;
}

export interface ChoiceOption {
  label: string;
  visual?: Visual;
  /** Targeted feedback when this (wrong) option is chosen. */
  whyWrong?: string;
}

export interface ChoiceAnswer {
  kind: 'choice';
  options: ChoiceOption[];
  correct: number;
  /**
   * 'symbols' = short labels like <, >, =; 'grid' = options with visuals;
   * 'scale' = short words forming an ordered scale (sicher / möglich / unmöglich), one row, never shuffled. Default 'list'.
   */
  layout?: 'list' | 'symbols' | 'grid' | 'scale';
}

export interface MultiField {
  id: string;
  value: number;
  /** Text before/after this field, e.g. '3,45 € =' [3] '€' [45] 'ct'. */
  before?: string;
  after?: string;
  decimals?: number;
  label?: string;
}

export interface MultiAnswer {
  kind: 'multi';
  fields: MultiField[];
}

export interface WrittenAnswer {
  kind: 'written';
  op: WrittenOp;
  /** add: 2–4 Summanden; sub: [Minuend, Subtrahend]; mul: [Faktor1, Faktor2]; div: [Dividend, Divisor] */
  operands: number[];
  /** Ergebnis (Summe, Differenz, Produkt, Quotient). */
  result: number;
  /** Rest (div only, 0 if none). */
  remainder?: number;
  method?: SubtractionMethod;
  /**
   * Expected Überschlag value (e.g. 8 000 for 4 873 + 3 125). When set, the child first writes an Überschlag:
   * it is required and checked loosely (CheckResult.ueberschlagOk), but never part of `correct`.
   */
  ueberschlag?: number;
}

export interface CellsAnswer {
  kind: 'cells';
  width: number;
  height: number;
  /** Pre-filled cells that the child cannot toggle. */
  given: Cell[];
  /** Cells the child must switch on (in addition to `given`). */
  solution: Cell[];
  axis?: Axis;
}

export interface NumberLineAnswer {
  kind: 'numberline';
  min: number;
  max: number;
  majorStep: number;
  minorStep: number;
  /** Snapping step of the marker (usually minorStep). */
  step: number;
  value: number;
  /** Accepted absolute deviation (0 = exact). */
  tolerance: number;
  labelMajor: boolean;
  /** Explicitly labelled values (in addition to major labels if labelMajor). Default: both ends when !labelMajor. */
  labels?: number[];
}

export interface OrderAnswer {
  kind: 'order';
  /** Items in display order. */
  items: string[];
  /** Indices of `items` in the correct order. */
  correct: number[];
  direction: 'aufsteigend' | 'absteigend';
}

export type Answer =
  | NumberAnswer
  | ChoiceAnswer
  | MultiAnswer
  | WrittenAnswer
  | CellsAnswer
  | NumberLineAnswer
  | OrderAnswer;

export type AnswerKind = Answer['kind'];
export type AnswerOf<K extends AnswerKind> = Extract<Answer, { kind: K }>;

/** What the child entered. Raw text is parsed by src/core/parse.ts. */
export type Response =
  | { kind: 'number'; text: string; unsolvable?: boolean }
  | { kind: 'choice'; index: number }
  | { kind: 'multi'; values: Record<string, string> }
  | { kind: 'written'; result: string; remainder?: string; ueberschlag?: string }
  | { kind: 'cells'; cells: Cell[] }
  | { kind: 'numberline'; value: number }
  | { kind: 'order'; order: number[] };

/**
 * A typical wrong answer (misconception / "bug") with a targeted hint.
 * match: number for number/written/numberline answers (for written div: the wrong quotient),
 *        Record<fieldId, number> for multi answers,
 *        number[] for order answers (an index order like OrderAnswer.correct).
 * (Choice answers use ChoiceOption.whyWrong instead.)
 * Bug ids are internal (never shown to children).
 */
export interface Bug {
  id: string;
  match: number | Record<string, number> | number[];
  /**
   * Written div only: the bug also requires this remainder (empty remainder = 0). Lets a remainder mistake
   * with a correct quotient (e.g. 'Rest vergessen': match = correct quotient, remainder 0) carry its own hint.
   */
  remainder?: number;
  hint: string;
}

/** A step of a worked solution. A plain string or text with an optional visual. */
export type Step = string | { text: string; visual?: Visual };

// ─── Exercise ────────────────────────────────────────────────────────────────

export interface Exercise {
  /** Canonical identity (skill + parameters) used to avoid repeats, e.g. 'zahlen.runden:2:345678:H'. */
  key: string;
  topicId: TopicId;
  skillId: string;
  stufe: Stufe;
  /** KMK Anforderungsbereich of this item. */
  ab: 1 | 2 | 3;
  /** Short German instruction, du-form, ≤ 2 sentences. */
  prompt: string;
  /** Optional story text for Sachaufgaben (short sentences). */
  context?: string;
  /** Optional large maths expression, e.g. '7 · 8 = □' or '345 678 ≈ □'. */
  expression?: string;
  visual?: Visual;
  answer: Answer;
  /** Strategy hints, shown one at a time (≥ 1). Never contain the answer. */
  hints: string[];
  /** Worked solution with the child's numbers (≥ 1). The last step states the result. */
  steps: Step[];
  /** Typical wrong answers with targeted hints. */
  bugs?: Bug[];
  /** Specific process praise, completing "Richtig! …", e.g. 'Du hast an den Übertrag gedacht.' */
  praise: string;
  /** Plain-text version for screen readers (operators spelled out, e.g. '7 mal 8'). */
  srText: string;
  /** KMK tags from src/data/curriculum.ts. */
  kmk: string[];
  /** Knobelaufgabe (harder thinking task). */
  knobel?: boolean;
  /** Einmaleins fact key ('3x7', smaller factor first) for per-fact spaced repetition. */
  factKey?: string;
  /** Decorative emoji for Sachaufgaben contexts (aria-hidden). */
  emoji?: string;
}

// ─── Skills & topics ─────────────────────────────────────────────────────────

export interface FactBox {
  box: number;
  due?: string;
}

/** Read-only context passed to generators. */
export interface GenContext {
  subtractionMethod: SubtractionMethod;
  /** Include optional NRW extras (Tonne, × 3-stellig, Binärzahlen …). */
  nrwExtras: boolean;
  /** Per-fact Leitner boxes for the Einmaleins trainer (key '3x7'). */
  facts?: Readonly<Record<string, FactBox>>;
  /** ISO date 'YYYY-MM-DD' (for due facts). */
  today?: string;
}

export interface SkillDef {
  /** Globally unique, `${topicId}.${slug}`, e.g. 'zahlen.runden'. Never change once released (stored in progress). */
  id: string;
  topicId: TopicId;
  /** Short German title, e.g. 'Runden'. */
  title: string;
  /** One child-friendly German sentence. */
  description: string;
  /** What each Stufe contains (child-friendly German, ≤ 12 words each). */
  stufen: Record<Stufe, string>;
  kmk: string[];
  /** 'nrw' = optional extra, hidden unless GenContext.nrwExtras; does not count toward mastery badges. */
  optional?: 'nrw';
  /** Pure: same rng seed + stufe + ctx ⇒ same exercise. */
  generate(rng: Rng, stufe: Stufe, ctx: GenContext): Exercise;
}

export interface TopicModule {
  topicId: TopicId;
  skills: SkillDef[];
}

export interface TopicMeta {
  id: TopicId;
  title: string;
  shortTitle: string;
  description: string;
  /** CSS custom property suffix, e.g. 'zahlen' → var(--topic-zahlen) / var(--topic-zahlen-bg). */
  color: TopicId;
}

// ─── Checking ────────────────────────────────────────────────────────────────

export interface CheckResult {
  correct: boolean;
  /** Input could not be interpreted (e.g. empty, '345,678' in an integer task). Not counted as an attempt; show this message. */
  invalid?: string;
  /** Targeted hint from a matched Bug or a wrong ChoiceOption. */
  bugHint?: string;
  /** multi: correctness per field id. */
  fieldCorrect?: Record<string, boolean>;
  /** written: wrong result digit positions, 0 = Einer (rightmost). */
  wrongColumns?: number[];
  /** written div: remainder correct? */
  remainderCorrect?: boolean;
  /** written with an Überschlag: the child's Überschlag is close enough to the expected one (within 25 %). */
  ueberschlagOk?: boolean;
  /** cells: cells that are on but should be off, and missing cells. */
  extraCells?: Cell[];
  missingCells?: Cell[];
}
