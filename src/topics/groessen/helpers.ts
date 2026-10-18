/**
 * Small helpers shared by the generators of the topics 'groessen' and 'sachaufgaben'.
 * Everything here is pure (randomness only via the Rng parameter).
 */
import { fmt, toSpeech } from '../../core/format';
import type { Bug, ChoiceAnswer, ChoiceOption, Exercise, MultiField, Rng, SkillDef, Stufe } from '../../core/types';

// ─── Numbers ─────────────────────────────────────────────────────────────────

/** Round to a fixed number of decimals (avoids binary noise like 0.1 + 0.2). */
export function roundTo(x: number, decimals: number): number {
  const f = 10 ** decimals;
  return Math.round(x * f) / f;
}

/** true if x can be typed with at most `decimals` decimal places. */
export function representable(x: number, decimals = 0): boolean {
  if (!Number.isFinite(x)) return false;
  const scaled = x * 10 ** decimals;
  return Math.abs(scaled - Math.round(scaled)) < 1e-6;
}

// ─── Bugs ────────────────────────────────────────────────────────────────────

type MaybeBug = Bug | null | undefined | false;

/**
 * Keep only bugs that make sense for a number answer: typeable with the allowed decimals,
 * not negative, different from the correct value and from earlier bugs.
 */
export function numberBugs(bugs: MaybeBug[], correct: number | null, decimals = 0): Bug[] {
  const out: Bug[] = [];
  const seen = new Set<number>();
  for (const b of bugs) {
    if (!b || typeof b.match !== 'number') continue;
    if (!representable(b.match, decimals) || b.match < 0) continue;
    const m = roundTo(b.match, decimals);
    if (correct !== null && Math.abs(m - correct) < 1e-9) continue;
    if (seen.has(m)) continue;
    seen.add(m);
    out.push({ ...b, match: m });
  }
  return out;
}

/** Same for multi answers: every matched field exists, values are typeable, and at least one field differs. */
export function multiBugs(bugs: MaybeBug[], fields: MultiField[]): Bug[] {
  const out: Bug[] = [];
  const seen = new Set<string>();
  for (const b of bugs) {
    if (!b || typeof b.match !== 'object' || Array.isArray(b.match)) continue;
    const m = b.match;
    const keys = Object.keys(m);
    if (keys.length === 0) continue;
    let ok = true;
    let differs = false;
    for (const k of keys) {
      const f = fields.find((x) => x.id === k);
      if (!f || !representable(m[k], f.decimals ?? 0) || m[k] < 0) ok = false;
      else if (Math.abs(m[k] - f.value) > 1e-9) differs = true;
    }
    if (!ok || !differs) continue;
    const sig = JSON.stringify(fields.map((f) => (f.id in m ? m[f.id] : f.value)));
    if (seen.has(sig)) continue;
    seen.add(sig);
    out.push(b);
  }
  return out;
}

// ─── Choices ─────────────────────────────────────────────────────────────────

export interface ChoiceOpts {
  layout?: ChoiceAnswer['layout'];
  /** Total number of options (default 4). */
  max?: number;
  /** Keep this fixed label order instead of shuffling (e.g. ['<', '>', '=']). */
  order?: string[];
}

/** Build a choice answer: de-duplicates labels, caps the count, shuffles with rng. */
export function makeChoice(rng: Rng, correct: ChoiceOption, wrongs: ChoiceOption[], opts: ChoiceOpts = {}): ChoiceAnswer {
  const seen = new Set<string>([correct.label]);
  const ws: ChoiceOption[] = [];
  for (const w of wrongs) {
    if (seen.has(w.label)) continue;
    seen.add(w.label);
    ws.push(w);
  }
  const chosen = ws.slice(0, (opts.max ?? 4) - 1);
  const right: ChoiceOption = { label: correct.label, ...(correct.visual ? { visual: correct.visual } : {}) };
  let all: ChoiceOption[];
  if (opts.order) {
    const pool = [right, ...chosen];
    all = opts.order.map((l) => pool.find((o) => o.label === l)).filter((o): o is ChoiceOption => !!o);
  } else {
    all = rng.shuffle([right, ...chosen]);
  }
  const answer: ChoiceAnswer = { kind: 'choice', options: all, correct: all.indexOf(right) };
  if (opts.layout) answer.layout = opts.layout;
  return answer;
}

// ─── Hints ───────────────────────────────────────────────────────────────────

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** true if `text` contains the number `shown` as a whole number (not as part of a longer one). */
export function mentionsNumber(text: string, shown: string): boolean {
  return new RegExp(`(?<![\\d,\u202F])${escapeRe(shown)}(?![\\d\u202F]|,\\d)`).test(text);
}

/**
 * Hints must never give the answer away. Drops hints that mention the answer
 * (≥ 100: any occurrence, as the shared test suite checks; 10–99: as a whole number).
 */
export function safeHints(hints: string[], value: number | null | undefined, fallback: string, decimals?: number): string[] {
  if (value === null || value === undefined || Math.abs(value) < 10) return hints.length ? hints : [fallback];
  const forms = [fmt(value)];
  if (decimals) forms.push(fmt(value, decimals));
  const strict = Math.abs(value) >= 100;
  const ok = hints.filter((h) => !forms.some((f) => (strict ? h.includes(f) : mentionsNumber(h, f))));
  return ok.length ? ok : [fallback];
}

// ─── Speech ──────────────────────────────────────────────────────────────────

const UNIT_WORDS: Record<string, [singular: string, plural: string]> = {
  mm: ['Millimeter', 'Millimeter'],
  cm: ['Zentimeter', 'Zentimeter'],
  km: ['Kilometer', 'Kilometer'],
  m: ['Meter', 'Meter'],
  kg: ['Kilogramm', 'Kilogramm'],
  g: ['Gramm', 'Gramm'],
  t: ['Tonne', 'Tonnen'],
  ml: ['Milliliter', 'Milliliter'],
  l: ['Liter', 'Liter'],
  ct: ['Cent', 'Cent'],
  '€': ['Euro', 'Euro'],
  h: ['Stunde', 'Stunden'],
  min: ['Minute', 'Minuten'],
  s: ['Sekunde', 'Sekunden'],
};

/** 'ein', 'zwei' … for the whole part of a spoken mixed fraction ('eineinhalb', 'zweidreiviertel'). */
const WHOLE_WORDS = ['', 'ein', 'zwei', 'drei', 'vier', 'fünf', 'sechs', 'sieben', 'acht', 'neun'];

const FRACTION_WORDS: Record<string, string> = { '½': 'einhalb', '¼': 'einviertel', '¾': 'dreiviertel' };

/** A fraction directly before a unit, spoken as one phrase ('½ l' → 'ein halber Liter'). */
const FRACTION_UNIT: Record<string, Record<string, string>> = {
  '½': { l: 'ein halber Liter', kg: 'ein halbes Kilogramm', t: 'eine halbe Tonne', h: 'eine halbe Stunde' },
  '¼': { l: 'ein viertel Liter', kg: 'ein viertel Kilogramm', t: 'eine viertel Tonne', h: 'eine Viertelstunde' },
  '¾': { l: 'drei viertel Liter', kg: 'drei viertel Kilogramm', t: 'drei viertel Tonnen', h: 'eine Dreiviertelstunde' },
};

/**
 * toSpeech() plus spoken unit names and fractions: '1 h 25 min' → '1 Stunde 25 Minuten', '1 ¼ t' → 'eineinviertel Tonnen',
 * '½ l' → 'ein halber Liter', '¾ kg' → 'drei viertel Kilogramm'.
 */
export function speak(text: string): string {
  return toSpeech(text)
    .replace(/(?<![\d,])(\d) ?([½¼¾])/g, (_all, n: string, fr: string) => `${WHOLE_WORDS[Number(n)] || n}${FRACTION_WORDS[fr]}`)
    .replace(/(?<!\S)([½¼¾]) (l|kg|t|h)(?=$|[\s.,;:!?)])/g, (_all, fr: string, unit: string) => FRACTION_UNIT[fr][unit])
    .replace(/½/g, 'ein halb')
    .replace(/¼/g, 'ein viertel')
    .replace(/¾/g, 'drei viertel')
    .replace(/(^|\s)(\S+) (mm|cm|km|kg|ml|ct|min|m|g|l|h|s|t|€)(?=$|[\s.,;:!?)])/g, (_all, pre: string, num: string, unit: string) => {
      const [sg, pl] = UNIT_WORDS[unit];
      return `${pre}${num} ${num === '1' || num === 'ein' ? sg : pl}`;
    })
    .replace(/\s+/g, ' ')
    .trim();
}

// ─── Small grammar helpers ───────────────────────────────────────────────────

/** Singular for exactly 1, plural otherwise: plural(1, 'Stunde', 'Stunden') → 'Stunde'. */
export function plural(n: number, one: string, many: string): string {
  return n === 1 ? one : many;
}

/** 'A', 'A und B', 'A, B und C'. */
export function joinList(items: readonly string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} und ${items[items.length - 1]}`;
}

// ─── Exercise builder ────────────────────────────────────────────────────────

export type ExerciseBody = Omit<Exercise, 'topicId' | 'skillId' | 'stufe'>;

/** Fill in topic/skill/stufe and prefix the key with '<skillId>:<stufe>:'. */
export function build(skill: Pick<SkillDef, 'id' | 'topicId'>, stufe: Stufe, body: ExerciseBody): Exercise {
  const { key, ...rest } = body;
  const ex: Exercise = { key: `${skill.id}:${stufe}:${key}`, topicId: skill.topicId, skillId: skill.id, stufe, ...rest };
  if (ex.bugs && ex.bugs.length === 0) delete ex.bugs;
  return ex;
}

// ─── Names (diverse first names, with pronoun) ──────────────────────────────

export interface Person {
  name: string;
  /** 'sie' or 'er' */
  p: 'sie' | 'er';
}

export const PEOPLE: readonly Person[] = [
  { name: 'Lena', p: 'sie' }, { name: 'Ben', p: 'er' }, { name: 'Mira', p: 'sie' }, { name: 'Emil', p: 'er' },
  { name: 'Aylin', p: 'sie' }, { name: 'Jonas', p: 'er' }, { name: 'Fatma', p: 'sie' }, { name: 'Noah', p: 'er' },
  { name: 'Sofia', p: 'sie' }, { name: 'Luca', p: 'er' }, { name: 'Amira', p: 'sie' }, { name: 'Finn', p: 'er' },
  { name: 'Zoe', p: 'sie' }, { name: 'Mehmet', p: 'er' }, { name: 'Elif', p: 'sie' }, { name: 'Milan', p: 'er' },
  { name: 'Hanna', p: 'sie' }, { name: 'Yusuf', p: 'er' }, { name: 'Ida', p: 'sie' }, { name: 'Karim', p: 'er' },
  { name: 'Nele', p: 'sie' }, { name: 'Tom', p: 'er' }, { name: 'Leyla', p: 'sie' }, { name: 'Paul', p: 'er' },
  { name: 'Mia', p: 'sie' }, { name: 'Deniz', p: 'er' }, { name: 'Jana', p: 'sie' }, { name: 'Anton', p: 'er' },
  { name: 'Sara', p: 'sie' }, { name: 'Malik', p: 'er' }, { name: 'Lina', p: 'sie' }, { name: 'Arjun', p: 'er' },
  { name: 'Greta', p: 'sie' }, { name: 'Samir', p: 'er' }, { name: 'Ella', p: 'sie' }, { name: 'Kofi', p: 'er' },
  { name: 'Marie', p: 'sie' }, { name: 'Can', p: 'er' }, { name: 'Nora', p: 'sie' }, { name: 'Oskar', p: 'er' },
];

export function pickPerson(rng: Rng): Person {
  return rng.pick(PEOPLE);
}

/** Two different people. */
export function pickTwo(rng: Rng): [Person, Person] {
  const [a, b] = rng.sample(PEOPLE, 2);
  return [a, b];
}

/** 'Sie'/'Er' at sentence start. */
export function Pron(p: Person): string {
  return p.p === 'sie' ? 'Sie' : 'Er';
}

/** Possessive 'ihr'/'sein' (+ suffix, e.g. 'e', 'en'). */
export function poss(p: Person, suffix = ''): string {
  return (p.p === 'sie' ? 'ihr' : 'sein') + suffix;
}
