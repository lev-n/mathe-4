/**
 * Bilddiagramme (Piktogramme) lesen: ein Bild steht für 2, 5 oder 10.
 * Stufe 1: ganze Bilder, einen Wert ablesen oder die meisten/wenigsten finden.
 * Stufe 2: halbe Bilder, Unterschiede, Summen, Gesamtzahl.
 * Stufe 3: Legende erschließen, Diagramm mit anderer Legende neu zeichnen, Gesamtzahl mit halben Bildern.
 */
import { fmt } from '../../core/format';
import type { Exercise, Rng, SkillDef, Stufe, Visual } from '../../core/types';
import {
  argMax,
  argMin,
  describeVisual,
  distinctValues,
  makeExercise,
  moreText,
  numberBugs,
  pickCategories,
  pictogram,
  pictoText,
  PICTO_THEMES,
  qty,
  shuffledChoice,
  speech,
  sum,
  valuesText,
  type BugSpec,
  type DataTheme,
} from './shared';

const SKILL = { id: 'daten.bilddiagramme', kmk: ['DZ.daten', 'PK.darstellen'] };

const legendHint = (iv: number, theme: DataTheme) => `Schau auf die Legende: Ein Bild bedeutet ${qty(iv, theme)}.`;
const HALF_HINT = 'Ein halbes Bild bedeutet die Hälfte davon.';

/**
 * Worked step for reading one row: '3 Bilder: 3 · 5 = 15.' / '2 ganze Bilder: 2 · 10 = 20. Das halbe Bild bedeutet 5: 20 + 5 = 25.'
 * A row with only half a picture gets no '0 · 10 = 0' step.
 */
export function readSteps(label: string, value: number, iv: number): string[] {
  const full = Math.floor(value / iv);
  const half = value - full * iv;
  const are = full === 1 && half === 0 ? 'ist' : 'sind';
  if (half === 0) return [`In der Zeile „${label}“ ${are} ${pictoText(value, iv)}.`, `${fmt(full)} · ${fmt(iv)} = ${fmt(value)}`];
  if (full === 0) return [`In der Zeile „${label}“ ist nur ein halbes Bild.`, `Ein halbes Bild bedeutet die Hälfte von ${fmt(iv)}: ${fmt(iv)} : 2 = ${fmt(half)}`];
  return [
    `In der Zeile „${label}“ sind ${pictoText(value, iv)}.`,
    `${fmt(full)} · ${fmt(iv)} = ${fmt(full * iv)}. Das halbe Bild bedeutet ${fmt(half)}.`,
    `${fmt(full * iv)} + ${fmt(half)} = ${fmt(value)}`,
  ];
}

/** Whole pictures and half pictures over all rows (each row has at most one half picture). */
export function pictureCounts(values: readonly number[], iv: number): { whole: number; halves: number } {
  let whole = 0;
  let halves = 0;
  for (const v of values) {
    const full = Math.floor(v / iv);
    whole += full;
    if (v - full * iv > 0) halves++;
  }
  return { whole, halves };
}

/**
 * Typical wrong totals when rows have half pictures: pictures counted instead of values, half pictures
 * counted as whole ones or forgotten. All values are whole numbers (no '17,5 Bilder').
 */
function pictureBugs(total: number, values: readonly number[], iv: number, theme: DataTheme): BugSpec[] {
  const { whole, halves } = pictureCounts(values, iv);
  const picturesHint = `Das ist die Zahl der Bilder. Ein Bild bedeutet aber ${qty(iv, theme)}.`;
  if (halves === 0) return [['bilder-gezaehlt', whole, picturesHint]];
  return [
    ['halb-als-ganz', (whole + halves) * iv, 'Ein halbes Bild bedeutet nur die Hälfte. Zähle die halben Bilder getrennt.'],
    ['halbe-vergessen', whole * iv, 'Vergiss die halben Bilder nicht. Ein halbes Bild bedeutet die Hälfte.'],
    ['bilder-gezaehlt', whole + halves, picturesHint],
    ['ganze-bilder-gezaehlt', whole, picturesHint],
    ['bilder-gezaehlt-halb', total / iv, picturesHint],
  ];
}

/** Values as icon counts in halves: halves=false → whole icons only. */
function iconValues(rng: Rng, n: number, iv: number, maxIcons: number, halves: boolean): number[] {
  if (halves) return distinctValues(rng, n, 1, maxIcons * 2, 1).map((h) => (h * iv) / 2);
  return distinctValues(rng, n, 1, maxIcons, 1).map((k) => k * iv);
}

/** Distinct values with half pictures where at least one row ends with a half picture. */
function valuesWithHalf(rng: Rng, n: number, iv: number, maxIcons: number): number[] {
  const halves = distinctValues(rng, n, 1, maxIcons * 2, 1);
  if (halves.every((h) => h % 2 === 0)) {
    const odd = Array.from({ length: maxIcons }, (_, k) => 2 * k + 1).filter((h) => !halves.includes(h));
    halves[0] = rng.pick(odd);
  }
  return halves.map((h) => (h * iv) / 2);
}

// ─── Stufe 1 ─────────────────────────────────────────────────────────────────

function stufe1(rng: Rng): Exercise {
  const theme = rng.pick(PICTO_THEMES);
  const n = rng.int(3, 4);
  const cats = pickCategories(rng, theme, n);
  const iv = rng.pick([2, 5, 10]);
  const values = iconValues(rng, n, iv, 8, false);
  const visual = pictogram(theme, cats, values, iv);
  const sr = describeVisual(visual);

  if (rng.chance(0.6)) {
    // Ask for a row with at least 2 pictures (a single picture would just repeat the legend).
    const candidates = values.map((v, i) => (v >= 2 * iv ? i : -1)).filter((i) => i >= 0);
    const t = rng.pick(candidates);
    const c = cats[t];
    const v = values[t];
    const k = v / iv;
    const prompt = theme.howMany(c);
    return makeExercise(SKILL, 1, ['lesen', iv, theme.id, cats.join('-'), values.join('-'), t], {
      ab: 1,
      prompt,
      visual,
      emoji: theme.emoji,
      answer: { kind: 'number', value: v, unit: theme.unit, label: `Anzahl ${c}` },
      hints: [legendHint(iv, theme), `Zähle die Bilder in der Zeile „${c}“. Zähle dann in ${fmt(iv)}er-Schritten.`],
      steps: [...readSteps(c, v, iv), theme.says(c, v)],
      bugs: numberBugs(v, [['bilder-gezaehlt', k, `Ein Bild bedeutet hier ${qty(iv, theme)}, nicht 1. Zähle in ${fmt(iv)}er-Schritten.`]]),
      praise: 'Du hast die Legende beachtet und in Schritten gezählt.',
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
      .map((c) => ({ label: c, whyWrong: `Zähle die Bilder in der Zeile „${c}“ und vergleiche mit den anderen Zeilen. Wo sind ${most ? 'mehr' : 'weniger'} Bilder?` }))
      .filter((_, i) => i !== t),
  );
  return makeExercise(SKILL, 1, [most ? 'max' : 'min', iv, theme.id, cats.join('-'), values.join('-')], {
    ab: 1,
    prompt,
    visual,
    emoji: theme.emoji,
    answer,
    hints: [`Suche die Zeile mit den ${most ? 'meisten' : 'wenigsten'} Bildern.`, 'Alle Bilder bedeuten gleich viel. Du kannst also die Bilder vergleichen.'],
    steps: [`Zähle die Bilder: ${cats.map((c, i) => `${c} ${fmt(values[i] / iv)}`).join(', ')}.`, most ? theme.mostIs(cats[t]) : theme.leastIs(cats[t])],
    praise: 'Du hast die Zeilen verglichen.',
    srText: speech(sr, prompt),
  });
}

// ─── Stufe 2 ─────────────────────────────────────────────────────────────────

function stufe2(rng: Rng): Exercise {
  const theme = rng.pick(PICTO_THEMES);
  const mode = rng.pick(['halb', 'diff', 'diff', 'sum2', 'total'] as const);
  const iv = mode === 'halb' ? rng.pick([2, 10]) : rng.pick([2, 5, 10]);
  const halves = iv !== 5;
  const n = mode === 'total' ? rng.int(3, 4) : rng.int(3, 5);
  const cats = pickCategories(rng, theme, n);
  const values = mode === 'halb' ? valuesWithHalf(rng, n, iv, iv === 10 ? 9 : 8) : iconValues(rng, n, iv, iv === 10 ? 9 : 8, halves);
  const visual = pictogram(theme, cats, values, iv);
  const sr = describeVisual(visual);
  const hints = [legendHint(iv, theme), ...(halves && values.some((v) => v % iv !== 0) ? [HALF_HINT] : [])];
  const keyBase = [mode, iv, theme.id, cats.join('-'), values.join('-')];

  if (mode === 'halb') {
    const candidates = values.map((v, i) => (v % iv !== 0 ? i : -1)).filter((i) => i >= 0);
    const t = rng.pick(candidates);
    const c = cats[t];
    const v = values[t];
    const full = Math.floor(v / iv);
    const prompt = theme.howMany(c);
    return makeExercise(SKILL, 2, [...keyBase, t], {
      ab: 2,
      prompt,
      visual,
      emoji: theme.emoji,
      answer: { kind: 'number', value: v, unit: theme.unit, label: `Anzahl ${c}` },
      hints: [...hints.slice(0, 1), HALF_HINT],
      steps: [...readSteps(c, v, iv), theme.says(c, v)],
      bugs: numberBugs(v, [
        ['halb-als-ganz', v + iv / 2, 'Das letzte Bild ist nur halb. Es bedeutet nur die Hälfte.'],
        ['halb-vergessen', v - iv / 2, 'Vergiss das halbe Bild nicht. Es bedeutet die Hälfte.'],
        ['bilder-gezaehlt', full + 1, `Ein Bild bedeutet hier ${qty(iv, theme)}, nicht 1.`],
      ]),
      praise: 'Du hast das halbe Bild richtig gedeutet.',
      srText: speech(sr, prompt),
    });
  }

  if (mode === 'total') {
    const total = sum(values);
    const prompt = theme.totalQ;
    return makeExercise(SKILL, 2, keyBase, {
      ab: 2,
      prompt,
      visual,
      emoji: theme.emoji,
      answer: { kind: 'number', value: total, unit: theme.unit, label: 'Anzahl insgesamt' },
      hints: [...hints, 'Rechne jede Zeile aus. Addiere dann alle Werte.'],
      steps: [`Rechne jede Zeile aus: ${valuesText(cats, values)}.`, `${values.map((v) => fmt(v)).join(' + ')} = ${fmt(total)}`, `Insgesamt sind es ${qty(total, theme)}.`],
      bugs: numberBugs(total, [
        ...pictureBugs(total, values, iv, theme),
        ...values.map((v, i) => [`zeile-${i}-vergessen`, total - v, 'Hast du wirklich alle Zeilen addiert?'] as const),
      ]),
      praise: 'Du hast jede Zeile umgerechnet und alles addiert.',
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
      hints: [...hints, 'Rechne beide Zeilen aus und dann minus.'],
      steps: [theme.says(cats[a], va), theme.says(cats[b], vb), `${fmt(va)} − ${fmt(vb)} = ${fmt(d)}`, moreText(d, theme)],
      bugs: numberBugs(d, [
        ['bilder-gezaehlt', d / iv, `Das ist der Unterschied in Bildern. Ein Bild bedeutet aber ${qty(iv, theme)}.`],
        ['plus-statt-minus', va + vb, 'Gefragt ist, wie viele es mehr sind. Rechne minus.'],
      ]),
      praise: 'Du hast die Bilder in Zahlen umgerechnet und verglichen.',
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
    hints: [...hints, 'Rechne beide Zeilen aus und addiere sie.'],
    steps: [theme.says(cats[a], va), theme.says(cats[b], vb), `${fmt(va)} + ${fmt(vb)} = ${fmt(s)}`, `Zusammen sind es ${qty(s, theme)}.`],
    bugs: numberBugs(s, [
      ['bilder-gezaehlt', s / iv, `Das ist die Zahl der Bilder. Ein Bild bedeutet aber ${qty(iv, theme)}.`],
      ['minus-statt-plus', va - vb, 'Gefragt ist, wie viele es zusammen sind. Rechne plus.'],
    ]),
    praise: 'Du hast beide Zeilen umgerechnet und addiert.',
    srText: speech(sr, prompt),
  });
}

// ─── Stufe 3 ─────────────────────────────────────────────────────────────────

/** Legende erschließen: „Kiwis“ hat 4 Bilder = 20 Kinder; „Birnen“ hat 7 Bilder → ? */
function inferKey(rng: Rng): Exercise {
  const theme = rng.pick(PICTO_THEMES);
  const [c, d] = pickCategories(rng, theme, 2);
  const iv = rng.pick([2, 5, 10]);
  const [k, m] = distinctValues(rng, 2, 2, iv === 10 ? 9 : 8, 1);
  const v = k * iv;
  const answer = m * iv;
  const context = `In einem Bilddiagramm hat die Zeile „${c}“ ${fmt(k)} Bilder. Das sind ${qty(v, theme)}. Die Zeile „${d}“ hat ${fmt(m)} Bilder.`;
  const prompt = theme.howMany(d);
  // The diagram without its legend: the value of one picture is what the child works out.
  const visual: Visual = { ...pictogram(theme, [c, d], [v, answer], iv), showKey: false };
  return makeExercise(SKILL, 3, ['legende', iv, theme.id, c, d, k, m], {
    ab: 3,
    knobel: true,
    context,
    prompt,
    visual,
    emoji: theme.emoji,
    answer: { kind: 'number', value: answer, unit: theme.unit, label: `Anzahl ${d}` },
    hints: [`Finde zuerst heraus, wie viele ${theme.unit} ein Bild bedeutet.`, `${fmt(k)} Bilder sind ${qty(v, theme)}. Wie viel ist dann ein Bild?`],
    steps: [`${fmt(v)} : ${fmt(k)} = ${fmt(iv)}. Ein Bild bedeutet ${qty(iv, theme)}.`, `Die Zeile „${d}“ hat ${fmt(m)} Bilder: ${fmt(m)} · ${fmt(iv)} = ${fmt(answer)}.`, theme.says(d, answer)],
    bugs: numberBugs(answer, [
      ['bilder-gezaehlt', m, `Das ist die Zahl der Bilder. Rechne zuerst aus, wie viele ${theme.unit} ein Bild bedeutet.`],
      ['nur-legende', iv, `So viele ${theme.unit} bedeutet ein Bild. Die Zeile „${d}“ hat aber ${fmt(m)} Bilder.`],
      ['additiv-gedacht', v + (m - k), 'Ein Bild bedeutet mehr als 1. Rechne mit dem Wert eines Bildes.'],
    ]),
    praise: 'Du hast zuerst die Legende erschlossen und dann gerechnet.',
    srText: speech(context, prompt),
  });
}

/** Legend pairs (old → new) and values of the asked row that are whole pictures in both diagrams. */
const REDRAW: readonly { oldIv: number; newIv: number; targets: number[] }[] = [
  { oldIv: 5, newIv: 10, targets: [10, 20, 30, 40] },
  { oldIv: 10, newIv: 5, targets: [10, 15, 20, 25, 30, 35, 40, 45, 50, 60, 70, 80, 90] },
  { oldIv: 10, newIv: 2, targets: [10, 20, 30] },
  { oldIv: 2, newIv: 10, targets: [10, 20] },
];

/** Diagramm neu zeichnen: andere Legende → wie viele Bilder? */
function redraw(rng: Rng): Exercise {
  const theme = rng.pick(PICTO_THEMES);
  const n = rng.int(3, 4);
  const cats = pickCategories(rng, theme, n);
  const pair = rng.pick(REDRAW);
  const oldIv = pair.oldIv;
  const newIv = pair.newIv;
  const v = rng.pick(pair.targets);
  // Only the asked row must fit the new legend; the other rows are whole pictures in the old legend.
  const pool = Array.from({ length: 8 }, (_, k) => (k + 1) * oldIv).filter((x) => x !== v);
  const others = rng.sample(pool, n - 1);
  const t = rng.int(0, n - 1);
  const values = [...others.slice(0, t), v, ...others.slice(t)];
  const c = cats[t];
  const answer = v / newIv;
  const visual = pictogram(theme, cats, values, oldIv);
  const name = rng.pick(['Ole', 'Jana', 'Kemal', 'Nele']);
  const context = `${name} zeichnet das Diagramm neu. Dort bedeutet ein Bild ${qty(newIv, theme)}.`;
  const prompt = `Wie viele Bilder braucht ${name} für „${c}“?`;
  return makeExercise(SKILL, 3, ['neu', oldIv, newIv, theme.id, cats.join('-'), values.join('-'), t, name], {
    ab: 3,
    knobel: true,
    context,
    prompt,
    visual,
    emoji: theme.emoji,
    answer: { kind: 'number', value: answer, unit: 'Bilder', label: 'Anzahl der Bilder' },
    hints: [`Rechne zuerst aus, wie viele ${theme.unit} es in der Zeile „${c}“ sind.`, `Wie oft passt ${fmt(newIv)} in diese Zahl?`],
    steps: [...readSteps(c, v, oldIv), `Neu bedeutet ein Bild ${qty(newIv, theme)}: ${fmt(v)} : ${fmt(newIv)} = ${fmt(answer)}.`, `${name} braucht ${fmt(answer)} ${answer === 1 ? 'Bild' : 'Bilder'}.`],
    bugs: numberBugs(answer, [
      ['alte-anzahl', v / oldIv, `So viele Bilder sind es im alten Diagramm. Bei ${name} bedeutet ein Bild ${qty(newIv, theme)}.`],
      ['wert-statt-bilder', v, `Das ist die Zahl der ${theme.unit}. Gefragt ist, wie viele Bilder ${name} malt.`],
      ['mal-statt-geteilt', (v / oldIv) * newIv, `Teile die Zahl der ${theme.unit} durch ${fmt(newIv)}.`],
    ]),
    praise: 'Du hast erst in Zahlen umgerechnet und dann neu eingeteilt.',
    srText: speech(describeVisual(visual), context, prompt),
  });
}

function generate(rng: Rng, stufe: Stufe): Exercise {
  if (stufe === 1) return stufe1(rng);
  if (stufe === 2) return stufe2(rng);
  const roll = rng.next();
  if (roll < 0.45) return inferKey(rng);
  if (roll < 0.8) return redraw(rng);
  // Total with half pictures (AB II on Stufe 3 mix).
  return stufe2Total(rng);
}

function stufe2Total(rng: Rng): Exercise {
  const theme = rng.pick(PICTO_THEMES);
  const iv = rng.pick([2, 10]);
  const n = 4;
  const cats = pickCategories(rng, theme, n);
  const values = valuesWithHalf(rng, n, iv, iv === 10 ? 9 : 8);
  const visual = pictogram(theme, cats, values, iv);
  const total = sum(values);
  const prompt = theme.totalQ;
  return makeExercise(SKILL, 3, ['gesamt', iv, theme.id, cats.join('-'), values.join('-')], {
    ab: 2,
    prompt,
    visual,
    emoji: theme.emoji,
    answer: { kind: 'number', value: total, unit: theme.unit, label: 'Anzahl insgesamt' },
    hints: [legendHint(iv, theme), 'Zähle die ganzen Bilder und die halben Bilder getrennt.'],
    steps: [...totalSteps(values, iv), `Insgesamt sind es ${qty(total, theme)}.`],
    bugs: numberBugs(total, [
      ...pictureBugs(total, values, iv, theme),
      ...values.map((v, i) => [`zeile-${i}-vergessen`, total - v, 'Hast du wirklich alle Zeilen addiert?'] as const),
    ]),
    praise: 'Du hast die ganzen und die halben Bilder getrennt umgerechnet.',
    srText: speech(describeVisual(visual), prompt),
  });
}

/**
 * Whole-number worked steps for the total of a Bilddiagramm with half pictures (Klasse 4: no '17,5 · 2'):
 * whole pictures times the legend, half pictures times half the legend, then add.
 */
export function totalSteps(values: readonly number[], iv: number): string[] {
  const { whole, halves } = pictureCounts(values, iv);
  const halfValue = iv / 2;
  const wholeSum = whole * iv;
  const halfSum = halves * halfValue;
  const wholeStep = `Zähle die ganzen Bilder: ${whole === 1 ? '1 Bild' : `${fmt(whole)} Bilder`}. ${fmt(whole)} · ${fmt(iv)} = ${fmt(wholeSum)}`;
  if (halves === 0) return [wholeStep];
  const halfStep =
    halves === 1
      ? `Dazu kommt 1 halbes Bild. Es bedeutet ${fmt(halfValue)}.`
      : `Dazu kommen ${fmt(halves)} halbe Bilder. Ein halbes Bild bedeutet ${fmt(halfValue)}: ${fmt(halves)} · ${fmt(halfValue)} = ${fmt(halfSum)}`;
  return [wholeStep, halfStep, `${fmt(wholeSum)} + ${fmt(halfSum)} = ${fmt(wholeSum + halfSum)}`];
}

export const bilddiagrammeSkill: SkillDef = {
  id: SKILL.id,
  topicId: 'daten',
  title: 'Bilddiagramme',
  description: 'Du liest Bilddiagramme, bei denen ein Bild für mehrere steht.',
  stufen: {
    1: 'Ein Bild steht für 2, 5 oder 10',
    2: 'Halbe Bilder, Unterschiede und Summen',
    3: 'Legende herausfinden und neu zeichnen',
  },
  kmk: SKILL.kmk,
  generate,
};
