/**
 * Säulen- und Balkendiagramme lesen.
 * Stufe 1: einen Wert ablesen (Achse in 1er-, 2er- oder 5er-Schritten), höchste/niedrigste Säule.
 * Stufe 2: Unterschiede, Summen, Gesamtzahl; Werte auch zwischen zwei Linien (2er-/10er-Schritte).
 * Stufe 3: fehlende Säule aus der Gesamtzahl, Spannweite, Vergleich mit zwei Säulen zusammen.
 */
import { fmt } from '../../core/format';
import type { Exercise, Rng, SkillDef, Stufe } from '../../core/types';
import {
  argMax,
  cap,
  argMin,
  barChart,
  describeVisual,
  distinctValues,
  makeExercise,
  moreText,
  numberBugs,
  pickCategories,
  qty,
  shuffledChoice,
  speech,
  sum,
  THEMES,
  valuesText,
} from './shared';

const SKILL = { id: 'daten.saeulendiagramme', kmk: ['DZ.daten'] };

interface Words {
  /** 'Säule' / 'Balken' */
  noun: string;
  plural: string;
  /** 'die Säule' / 'der Balken' */
  nom: string;
  /** 'die Säule' / 'den Balken' */
  acc: string;
  /** 'der Säule' / 'des Balkens' */
  gen: string;
  maxAcc: string;
  maxNom: string;
  minAcc: string;
  minNom: string;
  whichMax: string;
  whichMin: string;
}

const SAEULE: Words = {
  noun: 'Säule',
  plural: 'Säulen',
  nom: 'die Säule',
  acc: 'die Säule',
  gen: 'der Säule',
  maxAcc: 'die höchste Säule',
  maxNom: 'die höchste Säule',
  minAcc: 'die niedrigste Säule',
  minNom: 'die niedrigste Säule',
  whichMax: 'welche Säule die höchste ist',
  whichMin: 'welche Säule die niedrigste ist',
};
const BALKEN: Words = {
  noun: 'Balken',
  plural: 'Balken',
  nom: 'der Balken',
  acc: 'den Balken',
  gen: 'des Balkens',
  maxAcc: 'den längsten Balken',
  maxNom: 'der längste Balken',
  minAcc: 'den kürzesten Balken',
  minNom: 'der kürzeste Balken',
  whichMax: 'welcher Balken der längste ist',
  whichMin: 'welcher Balken der kürzeste ist',
};

function stepHint(step: number): string {
  return step === 1 ? 'Die Zahlen an der Achse gehen in Einerschritten.' : `Die Zahlen an der Achse gehen in ${fmt(step)}er-Schritten.`;
}

function gridBug(diff: number, step: number) {
  return step > 1
    ? (['linien-gezaehlt', diff / step, `Schau auf die Zahlen an der Achse. Von Linie zu Linie geht es hier in ${fmt(step)}er-Schritten.`] as const)
    : null;
}

/** Values for a Stufe and axis step; Stufe 2 also uses values halfway between grid lines. */
export function valueRange(stufe: Stufe, step: number): { min: number; max: number; by: number } {
  if (stufe === 1) {
    if (step === 1) return { min: 2, max: 11, by: 1 };
    if (step === 2) return { min: 2, max: 22, by: 2 };
    return { min: 5, max: 55, by: 5 };
  }
  if (step === 2) return { min: 2, max: 22, by: 1 };
  if (step === 5) return { min: 5, max: 55, by: 5 };
  return { min: 10, max: 100, by: 5 };
}

// ─── Stufe 1 ─────────────────────────────────────────────────────────────────

function stufe1(rng: Rng): Exercise {
  const theme = rng.pick(THEMES);
  const n = rng.int(3, 5);
  const cats = pickCategories(rng, theme, n);
  const step = rng.pick([1, 2, 5]);
  const r = valueRange(1, step);
  const values = distinctValues(rng, n, r.min, r.max, r.by);
  const horizontal = rng.chance(0.35);
  const w = horizontal ? BALKEN : SAEULE;
  const visual = barChart(theme, cats, values, step, horizontal);
  const sr = describeVisual(visual);

  if (rng.chance(0.6)) {
    const t = rng.int(0, n - 1);
    const c = cats[t];
    const v = values[t];
    const prompt = theme.howMany(c);
    return makeExercise(SKILL, 1, ['lesen', horizontal ? 'b' : 's', step, theme.id, cats.join('-'), values.join('-'), t], {
      ab: 1,
      prompt,
      visual,
      emoji: theme.emoji,
      answer: { kind: 'number', value: v, unit: theme.unit, label: `Anzahl ${c}` },
      hints: [`Suche ${w.acc} für „${c}“. Fahre vom Ende ${w.gen} zur Achse.`, stepHint(step)],
      steps: [`${cap(w.nom)} für „${c}“ endet bei ${fmt(v)}.`, theme.says(c, v)],
      bugs: numberBugs(v, [gridBug(v, step)]),
      praise: 'Du hast genau an der Achse abgelesen.',
      srText: speech(sr, prompt),
    });
  }

  const most = rng.chance(0.6);
  const t = most ? argMax(values) : argMin(values);
  const prompt = most ? theme.mostQ : theme.leastQ;
  const answer = shuffledChoice(
    rng,
    { label: cats[t] },
    cats
      .map((c) => ({
        label: c,
        whyWrong: `Vergleiche ${w.acc} für „${c}“ mit den anderen. Gesucht ist ${most ? w.maxNom : w.minNom}.`,
      }))
      .filter((_, i) => i !== t),
  );
  return makeExercise(SKILL, 1, [most ? 'max' : 'min', horizontal ? 'b' : 's', step, theme.id, cats.join('-'), values.join('-')], {
    ab: 1,
    prompt,
    visual,
    emoji: theme.emoji,
    answer,
    hints: [`Suche ${most ? w.maxAcc : w.minAcc}.`, 'Vergleiche die Enden mit den Linien an der Achse.'],
    steps: [`Lies alle Werte ab: ${valuesText(cats, values)}.`, `Der ${most ? 'größte' : 'kleinste'} Wert ist ${fmt(values[t])}.`, most ? theme.mostIs(cats[t]) : theme.leastIs(cats[t])],
    praise: `Du hast alle ${w.plural} miteinander verglichen.`,
    srText: speech(sr, prompt),
  });
}

// ─── Stufe 2 ─────────────────────────────────────────────────────────────────

function stufe2(rng: Rng): Exercise {
  const theme = rng.pick(THEMES);
  const mode = rng.pick(['diff', 'diff', 'sum2', 'total'] as const);
  const n = mode === 'total' ? 4 : rng.int(4, 6);
  const cats = pickCategories(rng, theme, n);
  const step = rng.pick([2, 5, 10]);
  const r = valueRange(2, step);
  const values = distinctValues(rng, n, r.min, r.max, r.by);
  const horizontal = rng.chance(0.35);
  const w = horizontal ? BALKEN : SAEULE;
  const visual = barChart(theme, cats, values, step, horizontal);
  const sr = describeVisual(visual);
  const readHint = `Lies die Werte genau an der Achse ab. ${stepHint(step)}`;
  const between = values.some((v) => v % step !== 0);
  const hint2 = between ? `Endet ${w.nom} zwischen zwei Linien, liegt der Wert genau in der Mitte.` : null;
  const keyBase = [mode, horizontal ? 'b' : 's', step, theme.id, cats.join('-'), values.join('-')];

  if (mode === 'total') {
    const total = sum(values);
    const prompt = theme.totalQ;
    return makeExercise(SKILL, 2, keyBase, {
      ab: 2,
      prompt,
      visual,
      emoji: theme.emoji,
      answer: { kind: 'number', value: total, unit: theme.unit, label: 'Anzahl insgesamt' },
      hints: [readHint, ...(hint2 ? [hint2] : []), 'Addiere alle Werte. Lass keinen aus.'],
      steps: [`Lies alle Werte ab: ${valuesText(cats, values)}.`, `${values.map((v) => fmt(v)).join(' + ')} = ${fmt(total)}`, `Insgesamt sind es ${qty(total, theme)}.`],
      bugs: numberBugs(total, values.map((v, i) => [`wert-${i}-vergessen`, total - v, `Hast du wirklich alle ${w.plural} addiert?`] as const)),
      praise: 'Du hast alle Werte genau abgelesen und zusammengezählt.',
      srText: speech(sr, prompt),
    });
  }

  const [i, j] = rng.sample(cats.map((_, k) => k), 2);
  const a = values[i] > values[j] ? i : j;
  const b = a === i ? j : i;
  const va = values[a];
  const vb = values[b];
  if (mode === 'diff') {
    const d = va - vb;
    const prompt = `${theme.moreThan(cats[a], cats[b])} Wie viele mehr?`;
    return makeExercise(SKILL, 2, [...keyBase, a, b], {
      ab: 2,
      prompt,
      visual,
      emoji: theme.emoji,
      answer: { kind: 'number', value: d, unit: theme.unit, label: 'Unterschied' },
      hints: [readHint, ...(hint2 ? [hint2] : []), 'Rechne den größeren Wert minus den kleineren Wert.'],
      steps: [theme.says(cats[a], va), theme.says(cats[b], vb), `${fmt(va)} − ${fmt(vb)} = ${fmt(d)}`, moreText(d, theme)],
      bugs: numberBugs(d, [['plus-statt-minus', va + vb, 'Gefragt ist, wie viele es mehr sind. Rechne minus.'], gridBug(d, step)]),
      praise: 'Du hast beide Werte abgelesen und den Unterschied berechnet.',
      srText: speech(sr, prompt),
    });
  }
  const s = va + vb;
  const prompt = theme.sumQ(cats[a], cats[b]);
  return makeExercise(SKILL, 2, [...keyBase, a, b], {
    ab: 2,
    prompt,
    visual,
    emoji: theme.emoji,
    answer: { kind: 'number', value: s, unit: theme.unit, label: 'Anzahl zusammen' },
    hints: [readHint, ...(hint2 ? [hint2] : []), 'Addiere die beiden Werte.'],
    steps: [theme.says(cats[a], va), theme.says(cats[b], vb), `${fmt(va)} + ${fmt(vb)} = ${fmt(s)}`, `Zusammen sind es ${qty(s, theme)}.`],
    bugs: numberBugs(s, [['minus-statt-plus', va - vb, 'Gefragt ist, wie viele es zusammen sind. Rechne plus.'], gridBug(s, step)]),
    praise: 'Du hast beide Werte genau abgelesen und addiert.',
    srText: speech(sr, prompt),
  });
}

// ─── Stufe 3 ─────────────────────────────────────────────────────────────────

function missingBar(rng: Rng): Exercise {
  const theme = rng.pick(THEMES);
  const n = rng.int(5, 6);
  const allCats = pickCategories(rng, theme, n);
  const allValues = distinctValues(rng, n, 15, 95, 5);
  const t = rng.int(0, n - 1);
  const c = allCats[t];
  const v = allValues[t];
  const cats = allCats.filter((_, i) => i !== t);
  const values = allValues.filter((_, i) => i !== t);
  const total = sum(allValues);
  const sk = sum(values);
  const horizontal = rng.chance(0.3);
  const w = horizontal ? BALKEN : SAEULE;
  const visual = barChart(theme, cats, values, 10, horizontal);
  const context = `${cap(w.nom)} für „${c}“ fehlt. Insgesamt sind es ${qty(total, theme)}.`;
  const prompt = theme.howMany(c);
  return makeExercise(SKILL, 3, ['fehlt', horizontal ? 'b' : 's', theme.id, allCats.join('-'), allValues.join('-'), t], {
    ab: 3,
    knobel: true,
    context,
    prompt,
    visual,
    emoji: theme.emoji,
    answer: { kind: 'number', value: v, unit: theme.unit, label: `Anzahl ${c}` },
    hints: ['Lies alle Werte im Diagramm ab und addiere sie.', 'Wie viel fehlt dann noch bis zur Gesamtzahl?'],
    steps: [
      `Lies ab: ${valuesText(cats, values)}.`,
      `Zusammen: ${values.map((x) => fmt(x)).join(' + ')} = ${fmt(sk)}.`,
      `Bis zur Gesamtzahl fehlen: ${fmt(total)} − ${fmt(sk)} = ${fmt(v)}.`,
      theme.says(c, v),
    ],
    bugs: numberBugs(v, [
      ['alles-addiert', total + sk, 'Die Gesamtzahl enthält schon alle Werte. Rechne von der Gesamtzahl aus minus.'],
      ['nur-summe', sk, 'Das ist die Summe der Werte im Diagramm. Wie viel fehlt noch bis zur Gesamtzahl?'],
      ...values.map((k, i) => [`wert-${i}-vergessen`, v + k, 'Hast du alle Werte aus dem Diagramm abgezogen? Prüfe jeden Wert.'] as const),
    ]),
    praise: 'Du hast von der Gesamtzahl aus zurückgerechnet.',
    srText: speech(describeVisual(visual), context, prompt),
  });
}

function spread(rng: Rng): Exercise {
  const theme = rng.pick(THEMES);
  const n = rng.int(4, 6);
  const cats = pickCategories(rng, theme, n);
  const values = distinctValues(rng, n, 10, 100, 5);
  const horizontal = rng.chance(0.35);
  const w = horizontal ? BALKEN : SAEULE;
  const visual = barChart(theme, cats, values, 10, horizontal);
  const sorted = [...values].sort((x, y) => x - y);
  const max = sorted[n - 1];
  const min = sorted[0];
  const d = max - min;
  const prompt = horizontal
    ? 'Wie groß ist der Unterschied zwischen dem längsten und dem kürzesten Balken?'
    : 'Wie groß ist der Unterschied zwischen der höchsten und der niedrigsten Säule?';
  return makeExercise(SKILL, 3, ['spanne', horizontal ? 'b' : 's', theme.id, cats.join('-'), values.join('-')], {
    ab: 2,
    prompt,
    visual,
    emoji: theme.emoji,
    answer: { kind: 'number', value: d, unit: theme.unit, label: 'Unterschied' },
    hints: [`Suche zuerst ${w.maxAcc} und ${w.minAcc}.`, 'Lies beide Werte ab und rechne minus.'],
    steps: [
      `Lies alle Werte ab: ${valuesText(cats, values)}.`,
      `Der größte Wert ist ${fmt(max)}, der kleinste ist ${fmt(min)}.`,
      `${fmt(max)} − ${fmt(min)} = ${fmt(d)}`,
      `Der Unterschied beträgt ${qty(d, theme)}.`,
    ],
    bugs: numberBugs(d, [
      ['plus-statt-minus', max + min, 'Gefragt ist der Unterschied. Rechne minus.'],
      ['nicht-kleinster', max - sorted[1], `Prüfe noch einmal, ${w.whichMin}.`],
      ['nicht-groesster', sorted[n - 2] - min, `Prüfe noch einmal, ${w.whichMax}.`],
    ]),
    praise: 'Du hast den größten und den kleinsten Wert gefunden und verglichen.',
    srText: speech(describeVisual(visual), prompt),
  });
}

function moreThanTwo(rng: Rng): Exercise {
  const theme = rng.pick(THEMES);
  const n = rng.int(4, 5);
  const cats = pickCategories(rng, theme, n);
  // Construct directly: two small values b, c and a largest value a ≥ b + c + 10, the rest in between.
  const [small1, small2] = distinctValues(rng, 2, 10, 40, 5);
  const [big] = distinctValues(rng, 1, small1 + small2 + 10, 100, 5);
  const middle = distinctValues(rng, n - 3, Math.max(small1, small2) + 5, big - 5, 5);
  const order = rng.shuffle([0, 1, 2, ...middle.map((_, k) => 3 + k)]);
  const raw = [big, small1, small2, ...middle];
  const values = order.map((k) => raw[k]);
  const a = order.indexOf(0);
  const b = order.indexOf(1);
  const c = order.indexOf(2);
  const [va, vb, vc] = [values[a], values[b], values[c]];
  const d = va - vb - vc;
  const horizontal = rng.chance(0.35);
  const visual = barChart(theme, cats, values, 10, horizontal);
  const prompt = `${theme.moreThan(cats[a], theme.group(cats[b], cats[c]))} Wie viele mehr?`;
  return makeExercise(SKILL, 3, ['mehr2', horizontal ? 'b' : 's', theme.id, cats.join('-'), values.join('-')], {
    ab: 3,
    knobel: true,
    prompt,
    visual,
    emoji: theme.emoji,
    answer: { kind: 'number', value: d, unit: theme.unit, label: 'Unterschied' },
    hints: [`Addiere zuerst die Werte für „${cats[b]}“ und „${cats[c]}“.`, `Vergleiche dann mit „${cats[a]}“: Rechne minus.`],
    steps: [
      `Lies ab: „${cats[a]}“ ${fmt(va)}, „${cats[b]}“ ${fmt(vb)}, „${cats[c]}“ ${fmt(vc)}.`,
      `Zusammen: ${fmt(vb)} + ${fmt(vc)} = ${fmt(vb + vc)}.`,
      `${fmt(va)} − ${fmt(vb + vc)} = ${fmt(d)}`,
      moreText(d, theme),
    ],
    bugs: numberBugs(d, [
      ['nur-einer-b', va - vb, `Du hast nur mit einem Wert verglichen. Nimm „${cats[b]}“ und „${cats[c]}“ zusammen.`],
      ['nur-einer-c', va - vc, `Du hast nur mit einem Wert verglichen. Nimm „${cats[b]}“ und „${cats[c]}“ zusammen.`],
      ['alles-addiert', va + vb + vc, 'Gefragt ist, wie viele es mehr sind. Rechne zum Schluss minus.'],
    ]),
    praise: 'Du hast zuerst zusammengefasst und dann verglichen.',
    srText: speech(describeVisual(visual), prompt),
  });
}

function generate(rng: Rng, stufe: Stufe): Exercise {
  if (stufe === 1) return stufe1(rng);
  if (stufe === 2) return stufe2(rng);
  const roll = rng.next();
  if (roll < 0.4) return missingBar(rng);
  if (roll < 0.7) return moreThanTwo(rng);
  return spread(rng);
}

export const saeulendiagrammeSkill: SkillDef = {
  id: SKILL.id,
  topicId: 'daten',
  title: 'Säulen- und Balkendiagramme',
  description: 'Du liest Werte aus Säulen- und Balkendiagrammen ab und vergleichst sie.',
  stufen: {
    1: 'Werte ablesen, höchste Säule finden',
    2: 'Unterschiede und Summen, auch zwischen den Linien',
    3: 'Fehlende Säulen und Vergleiche mit mehreren Werten',
  },
  kmk: SKILL.kmk,
  generate,
};
