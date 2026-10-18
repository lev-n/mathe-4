/**
 * Größen vergleichen und ordnen – über Einheiten und Schreibweisen hinweg.
 * Stufe 1: compare n big unit with a value in the small unit (4 m □ 350 cm).
 * Stufe 2: order 4 quantities written in different notations (2 m 5 cm | 250 cm | 2,15 m).
 * Stufe 3: 3-decimal commas (km, kg, l), largest of four, odd one out among equal notations.
 */
import { fmtDuration, NBSP } from '../../core/format';
import type { Bug, ChoiceOption, Exercise, Rng, SkillDef, Stufe } from '../../core/types';
import { build, makeChoice, speak } from './helpers';
import { mixed, q, UNIT_DATIVE, UNIT_NAME, type Unit } from './conversions';

export interface Dim {
  id: string;
  big: Unit | 'h';
  small: Unit | 'min';
  f: number;
  /** Value step in the small unit. */
  step: number;
  /** Comma notation allowed on Stufe 2 (€ and m). */
  comma2: boolean;
  /** ½ ¼ ¾ allowed (kg, l). */
  fractions: boolean;
}

export const DIMS: Record<string, Dim> = {
  m: { id: 'm', big: 'm', small: 'cm', f: 100, step: 1, comma2: true, fractions: false },
  cm: { id: 'cm', big: 'cm', small: 'mm', f: 10, step: 1, comma2: false, fractions: false },
  km: { id: 'km', big: 'km', small: 'm', f: 1000, step: 5, comma2: false, fractions: false },
  kg: { id: 'kg', big: 'kg', small: 'g', f: 1000, step: 50, comma2: false, fractions: true },
  l: { id: 'l', big: 'l', small: 'ml', f: 1000, step: 50, comma2: false, fractions: true },
  euro: { id: 'euro', big: '€', small: 'ct', f: 100, step: 1, comma2: true, fractions: false },
  h: { id: 'h', big: 'h', small: 'min', f: 60, step: 5, comma2: false, fractions: false },
};

export type Notation = 'small' | 'mixed' | 'comma' | 'fraction' | 'big';

const FRACTION_CHARS: Record<number, string> = { 250: '¼', 500: '½', 750: '¾' };

/** All notations that can show value v (in the small unit) on this Stufe. */
export function notations(d: Dim, v: number, stufe: Stufe): Notation[] {
  const out: Notation[] = ['small'];
  if (d.id === 'h') {
    if (v >= 60) out.push('mixed');
    return out;
  }
  if (v >= d.f && v % d.f !== 0) out.push('mixed');
  if (v % d.f === 0) out.push('big');
  if ((d.comma2 || stufe === 3) && v % d.f !== 0) out.push('comma');
  if (d.fractions && FRACTION_CHARS[v % d.f] !== undefined) out.push('fraction');
  return out;
}

export function render(d: Dim, v: number, n: Notation): string {
  if (d.id === 'h') return n === 'mixed' ? fmtDuration(v) : q(v, 'min');
  const big = d.big as Unit;
  const small = d.small as Unit;
  const a = Math.floor(v / d.f);
  const b = v % d.f;
  switch (n) {
    case 'small': return q(v, small);
    case 'big': return q(a, big);
    case 'mixed': return mixed(a, big, b, small);
    case 'comma': return q(v / d.f, big, Math.round(Math.log10(d.f)));
    case 'fraction': return `${a > 0 ? `${a}${NBSP}` : ''}${FRACTION_CHARS[b]}${NBSP}${big}`;
  }
}

/** The plain number shown in a label (for the "nur Zahlen verglichen" misconception). */
function rawNumber(label: string): number {
  const m = label.replace(/\u202F/g, '').match(/^\d+(,\d+)?/);
  return m ? Number(m[0].replace(',', '.')) : NaN;
}

function smallName(d: Dim): string {
  return d.id === 'h' ? 'Minuten' : UNIT_NAME[d.small as Unit];
}

/** Dative plural ('In Zentimetern: …'). */
function smallDative(d: Dim): string {
  return d.id === 'h' ? 'Minuten' : UNIT_DATIVE[d.small as Unit];
}

// ─── Stufe 1: compare ────────────────────────────────────────────────────────

function compare(stufe: Stufe, rng: Rng): Exercise {
  const d = rng.pick(Object.values(DIMS));
  const n = rng.int(2, 9);
  const rel = rng.pick(['<', '>', '='] as const);
  const unitStep = d.id === 'h' ? 5 : d.f / 10;
  const k = rng.int(1, 9) * unitStep;
  const bigV = n * d.f;
  const otherV = rel === '=' ? bigV : rel === '<' ? bigV + k : bigV - k;
  const bigText = d.id === 'h' ? `${n}${NBSP}h` : q(n, d.big as Unit);
  const otherText = d.id === 'h' ? q(otherV, 'min') : q(otherV, d.small as Unit);
  const swap = rng.chance(0.5);
  const [lv, rv] = swap ? [otherV, bigV] : [bigV, otherV];
  const [lt, rt] = swap ? [otherText, bigText] : [bigText, otherText];
  const correct = lv < rv ? '<' : lv > rv ? '>' : '=';
  const rawL = rawNumber(lt);
  const rawR = rawNumber(rt);
  const raw = rawL < rawR ? '<' : rawL > rawR ? '>' : '=';
  const conv = `${bigText} = ${d.id === 'h' ? q(bigV, 'min') : q(bigV, d.small as Unit)}`;
  const options: ChoiceOption[] = (['<', '>', '='] as const)
    .filter((s) => s !== correct)
    .map((s) => ({
      label: s,
      whyWrong: s === raw
        ? `Du hast nur die Zahlen verglichen. Wandle zuerst in dieselbe Einheit um: ${conv}.`
        : `Wandle zuerst in dieselbe Einheit um: ${conv}. Vergleiche dann.`,
    }));
  const answer = makeChoice(rng, { label: correct }, options, { layout: 'symbols', order: ['<', '>', '='] });
  const expression = `${lt} □ ${rt}`;
  return build(vergleichenSkill, stufe, {
    key: `vergleich:${d.id}:${lv}:${rv}`,
    ab: 1,
    prompt: 'Setze <, > oder = ein.',
    expression,
    answer,
    hints: [`Wandle beide Angaben in ${smallName(d)} um.`, 'Vergleiche erst dann die Zahlen.'],
    steps: [conv, `${d.id === 'h' ? q(lv, 'min') : q(lv, d.small as Unit)} ${correct} ${d.id === 'h' ? q(rv, 'min') : q(rv, d.small as Unit)}`, `Also: ${lt} ${correct} ${rt}`],
    praise: correct === raw && correct !== '='
      ? 'Du hast beide Angaben in dieselbe Einheit umgewandelt und dann verglichen.'
      : 'Du hast nicht nur auf die Zahlen, sondern auch auf die Einheiten geschaut.',
    srText: `Vergleiche ${speak(lt)} mit ${speak(rt)}. Ist die linke Angabe kleiner als, größer als oder gleich der rechten?`,
    kmk: ['GM.einheiten'],
  });
}

// ─── Stufe 2/3: order ────────────────────────────────────────────────────────

function distinctValues(rng: Rng, d: Dim, count: number): number[] {
  const a = rng.int(1, 4);
  const lo = Math.max(d.step, a * d.f - d.f / 2);
  const hi = (a + 1) * d.f + d.f / 2;
  const values = new Set<number>();
  // one "small rest" value (2 m 5 cm) and its glued look-alike (250 cm) make the order tricky
  if (d.id !== 'h') {
    const b = d.f === 10 ? rng.int(1, 9) : rng.int(1, 9) * (d.f === 1000 ? (d.step === 50 ? 50 : 10) : 1);
    if (b < d.f) values.add(a * d.f + b);
    const glued = Number(`${a}${b}`);
    if (glued !== a * d.f + b && glued > 0 && glued < hi * 2) values.add(glued);
  }
  let guard = 0;
  while (values.size < count && guard++ < 200) {
    const v = Math.round(rng.int(lo, hi) / d.step) * d.step;
    if (v > 0) values.add(v);
  }
  return [...values].slice(0, count);
}

/** The leading number of a quantity as written ('2 m 5 cm' → 2, '250 cm' → 250, '2,15 m' → 2.15), or null. */
export function bareNumber(item: string): number | null {
  const m = /^(\d{1,3}(?:[\u202F\u00A0 ]\d{3})*|\d+)(?:,(\d+))?(?!\d)/.exec(item);
  if (!m) return null;
  return Number(`${m[1].replace(/[\u202F\u00A0 ]/g, '')}.${m[2] ?? '0'}`);
}

/** Misconception 'only the numbers compared, units ignored' as an order bug (when it gives a clear, different order). */
function unitsIgnoredBug(items: readonly string[], correct: readonly number[], up: boolean, unitName: string): Bug[] {
  const bare = items.map(bareNumber);
  if (bare.some((b) => b === null) || new Set(bare).size !== bare.length) return [];
  const nums = bare as number[];
  const wrong = items.map((_, i) => i).sort((i, j) => (up ? nums[i] - nums[j] : nums[j] - nums[i]));
  if (wrong.every((v, i) => v === correct[i])) return [];
  return [{ id: 'nur-zahlen-verglichen', match: wrong, hint: `Du hast nur die Zahlen verglichen. Achte auch auf die Einheiten: Wandle alles in ${unitName} um.` }];
}

function order(stufe: Stufe, rng: Rng): Exercise {
  const pool = stufe === 3 ? [DIMS.km, DIMS.kg, DIMS.l, DIMS.m, DIMS.euro] : [DIMS.m, DIMS.km, DIMS.kg, DIMS.l, DIMS.euro, DIMS.h, DIMS.cm];
  const d = rng.pick(pool);
  const count = stufe === 3 ? 5 : 4;
  const values = rng.shuffle(distinctValues(rng, d, count));
  const used = new Set<Notation>();
  const items = values.map((v) => {
    const opts = notations(d, v, stufe);
    const fresh = opts.filter((o) => !used.has(o));
    const n = rng.pick(fresh.length ? fresh : opts);
    used.add(n);
    return render(d, v, n);
  });
  const up = rng.chance(0.5);
  const idx = values.map((_, i) => i).sort((i, j) => (up ? values[i] - values[j] : values[j] - values[i]));
  const smallOf = (v: number) => (d.id === 'h' ? q(v, 'min') : q(v, d.small as Unit));
  return build(vergleichenSkill, stufe, {
    key: `ordnen:${d.id}:${up ? 'auf' : 'ab'}:${items.join('|')}`,
    ab: stufe === 3 ? 3 : 2,
    prompt: up ? 'Ordne von klein nach groß.' : 'Ordne von groß nach klein.',
    answer: { kind: 'order', items, correct: idx, direction: up ? 'aufsteigend' : 'absteigend' },
    bugs: unitsIgnoredBug(items, idx, up, smallName(d)),
    hints: [`Wandle alle Angaben in ${smallName(d)} um.`, 'Schreibe die umgewandelten Zahlen auf und vergleiche sie dann.'],
    steps: [
      `In ${smallDative(d)}: ${items.map((t, i) => (t === smallOf(values[i]) ? t : `${t} = ${smallOf(values[i])}`)).join('; ')}`,
      `Reihenfolge: ${idx.map((i) => items[i]).join(up ? ' < ' : ' > ')}`,
    ],
    praise: 'Du hast alle Angaben in dieselbe Einheit umgewandelt und dann geordnet.',
    srText: `${up ? 'Ordne von klein nach groß' : 'Ordne von groß nach klein'}: ${items.map(speak).join('; ')}.`,
    kmk: ['GM.einheiten', 'PK.darstellen'],
  });
}

// ─── Stufe 3: largest / odd one out ──────────────────────────────────────────

/** Label for v (in the small unit) in the given notation; comma labels show 3 decimals or only as many as needed ('2,5 km'). */
function extremeLabel(v: number, big: Unit, small: Unit, n: 'comma' | 'comma3' | 'mixed' | 'small'): string {
  if (n === 'comma') return q(v / 1000, big);
  if (n === 'comma3') return q(v / 1000, big, 3);
  if (n === 'mixed') return mixed(Math.floor(v / 1000), big, v % 1000, small);
  return q(v, small);
}

function largest(stufe: Stufe, rng: Rng): Exercise {
  const d = rng.pick([DIMS.km, DIMS.kg, DIMS.l]);
  const big = d.big as Unit;
  const small = d.small as Unit;
  const a = rng.int(1, 3);
  const h = rng.int(1, 9);
  // All values share the whole number a, so only the part after the comma decides. The pair a,h / a,0h
  // ('2,5 km' / '2,05 km') looks alike but differs by a factor of 10; the other two values are random.
  const rest = new Set<number>([h * 100, h * 10]);
  let guard = 0;
  while (rest.size < 3 && guard++ < 50) rest.add(rng.int(1, 9) * 100 + rng.int(1, 9) * 10 + rng.pick([0, 5]));
  while (rest.size < 4 && guard++ < 100) rest.add(rng.chance(0.5) ? rng.int(1, 9) : rng.int(11, 99));
  const uniq = rng.shuffle([...rest].map((r) => a * 1000 + r));
  const want = rng.chance(0.5) ? 'größte' : 'kleinste';
  const target = want === 'größte' ? Math.max(...uniq) : Math.min(...uniq);
  // notations are assigned at random (at least two comma numbers), so the surface form never gives the answer
  const notes = rng.shuffle(['comma', 'comma', 'mixed', rng.pick(['comma3', 'mixed', 'small'] as const)] as const) as ('comma' | 'comma3' | 'mixed' | 'small')[];
  const ti = uniq.indexOf(target);
  if (!notes[ti].startsWith('comma') && rng.chance(0.25)) {
    const ci = notes.findIndex((n) => n.startsWith('comma'));
    [notes[ti], notes[ci]] = [notes[ci], notes[ti]];
  }
  const labels = uniq.map((v, i) => extremeLabel(v, big, small, notes[i]));
  const correct = labels[ti];
  const wrongs = uniq
    .map((v, i) => ({ v, label: labels[i] }))
    .filter((o) => o.v !== target)
    .map((o) => ({
      label: o.label,
      whyWrong: `${o.label} = ${q(o.v, small)}. Wandle alle Angaben in ${UNIT_NAME[small]} um und vergleiche dann.`,
    }));
  const answer = makeChoice(rng, { label: correct }, wrongs);
  return build(vergleichenSkill, stufe, {
    key: `extrem:${d.id}:${want}:${labels.join('|')}`,
    ab: 3,
    prompt: `Welche Angabe ist die ${want}?`,
    answer,
    hints: [`Wandle alle Angaben in ${UNIT_NAME[small]} um.`, `Nach dem Komma gehören 3 Stellen zu den ${UNIT_DATIVE[small]}. Ergänze fehlende Nullen.`],
    steps: [...labels.map((l, i) => `${l} = ${q(uniq[i], small)}`), `Die ${want} Angabe ist ${correct}.`],
    praise: 'Du hast die Kommazahlen sicher umgewandelt.',
    srText: `Welche Angabe ist die ${want}? ${answer.options.map((o) => speak(o.label)).join('; ')}.`,
    kmk: ['GM.einheiten'],
  });
}

function oddOne(stufe: Stufe, rng: Rng): Exercise {
  const d = rng.pick([DIMS.km, DIMS.kg, DIMS.l, DIMS.m, DIMS.euro]);
  const big = d.big as Unit;
  const small = d.small as Unit;
  const places = Math.round(Math.log10(d.f));
  const a = rng.int(1, 9);
  const b = d.f === 1000 ? rng.pick([5, 50, 500, 250, 750, 20, 80]) : rng.pick([5, 50, 30, 7]);
  const v = a * d.f + b;
  const equal = [q(v / d.f, big, places), q(v, small), mixed(a, big, b, small)];
  // odd one: the typical slip of this value
  const oddCandidates: { label: string; v: number }[] = [];
  if (b < d.f / 10) oddCandidates.push({ label: q(Number(`${a}${b}`), small), v: Number(`${a}${b}`) });
  if (b % 10 === 0) oddCandidates.push({ label: mixed(a, big, b / 10, small), v: a * d.f + b / 10 });
  oddCandidates.push({ label: q(a * d.f + b * 10, small), v: a * d.f + b * 10 });
  oddCandidates.push({ label: q(v * 10, small), v: v * 10 });
  const odd = rng.pick(oddCandidates.filter((o) => o.v !== v && !equal.includes(o.label)));
  const answer = makeChoice(
    rng,
    { label: odd.label },
    equal.map((l) => ({ label: l, whyWrong: `${l} ist genauso viel wie ${equal.filter((x) => x !== l).join(' und ')}. Prüfe die anderen Angaben.` })),
  );
  return build(vergleichenSkill, stufe, {
    key: `passt-nicht:${d.id}:${v}:${odd.v}`,
    ab: 3,
    knobel: true,
    prompt: 'Drei Angaben sind gleich groß. Welche passt nicht dazu?',
    answer,
    hints: [`Wandle jede Angabe in ${UNIT_NAME[small]} um.`, 'Achte auf die Nullen und auf die Stellen nach dem Komma.'],
    steps: [`${equal.join(' = ')}`, `${odd.label} ist nicht gleich ${q(v, small)}.`],
    praise: 'Du hast alle Schreibweisen geprüft und die unpassende gefunden.',
    srText: `Drei Angaben sind gleich groß. Welche passt nicht dazu? ${answer.options.map((o) => speak(o.label)).join('; ')}.`,
    kmk: ['GM.einheiten', 'PK.darstellen', 'PK.argumentieren'],
  });
}

export const vergleichenSkill: SkillDef = {
  id: 'groessen.vergleichen',
  topicId: 'groessen',
  title: 'Größen vergleichen',
  description: 'Du vergleichst und ordnest Größen mit verschiedenen Einheiten.',
  stufen: {
    1: 'Zwei Größen vergleichen: <, > oder =',
    2: 'Vier Größen in verschiedenen Schreibweisen ordnen',
    3: 'Kommazahlen vergleichen, unpassende Angabe finden',
  },
  kmk: ['GM.einheiten', 'GM.vorstellung'],
  generate(rng, stufe) {
    if (stufe === 1) return compare(1, rng);
    if (stufe === 2) return rng.chance(0.75) ? order(2, rng) : compare(2, rng);
    const v = rng.int(1, 3);
    if (v === 1) return order(3, rng);
    if (v === 2) return largest(3, rng);
    return oddOne(3, rng);
  },
};
