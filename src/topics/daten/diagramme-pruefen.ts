/**
 * Diagramme kritisch lesen: Aussagen prüfen, irreführende Diagramme erkennen.
 * Stufe 1: Welche Aussage passt zum Diagramm? (meiste, wenigste, Wert, Vergleich)
 * Stufe 2: Aussagen mit Rechnung prüfen (doppelt so viele, zusammen, … mehr).
 * Stufe 3: abgeschnittene Achse (beginnt nicht bei 0), Bilddiagramme mit verschiedenen Legenden.
 */
import { fmt } from '../../core/format';
import type { Exercise, Rng, SkillDef, Stufe } from '../../core/types';
import {
  barChart,
  cap,
  describeVisual,
  distinctValues,
  hashText,
  makeExercise,
  numberBugs,
  pickCategories,
  pictogram,
  PICTO_THEMES,
  qty,
  shuffledChoice,
  speech,
  SURVEY_THEMES,
  THEMES,
  timesWord,
  valuesText,
  type Opt,
  type Pictogram,
} from './shared';

const SKILL = { id: 'daten.diagramme-pruefen', kmk: ['DZ.daten', 'PK.argumentieren'] };

// ─── Stufe 1: Welche Aussage passt? ──────────────────────────────────────────

type Kind = 'most' | 'least' | 'value' | 'more';

function statementsS1(rng: Rng, n: number, cats: string[], values: number[], step: number, picto: boolean, theme: (typeof THEMES)[number]) {
  const maxI = values.indexOf(Math.max(...values));
  const minI = values.indexOf(Math.min(...values));
  const readAgain = (c: string) => (picto ? `Zähle die Bilder bei „${c}“ noch einmal und denk an die Legende.` : `Lies bei „${c}“ noch einmal genau an der Achse ab.`);
  const make = (kind: Kind, truth: boolean): Opt => {
    const others = (ex: number[]) => cats.map((_, i) => i).filter((i) => !ex.includes(i));
    switch (kind) {
      case 'most': {
        if (truth) return { label: theme.mostIs(cats[maxI]) };
        const i = rng.pick(others([maxI]));
        return { label: theme.mostIs(cats[i]), whyWrong: `Bei „${cats[i]}“ ist es nicht am meisten. Vergleiche alle Werte.` };
      }
      case 'least': {
        if (truth) return { label: theme.leastIs(cats[minI]) };
        const i = rng.pick(others([minI]));
        return { label: theme.leastIs(cats[i]), whyWrong: `Bei „${cats[i]}“ ist es nicht am wenigsten. Vergleiche alle Werte.` };
      }
      case 'value': {
        const i = rng.int(0, n - 1);
        if (truth) return { label: theme.says(cats[i], values[i]) };
        const off = values[i] + (rng.chance(0.5) || values[i] - step <= 0 ? step : -step);
        return { label: theme.says(cats[i], off), whyWrong: readAgain(cats[i]) };
      }
      case 'more': {
        const [i, j] = rng.sample(cats.map((_, k) => k), 2);
        const [big, small] = values[i] > values[j] ? [i, j] : [j, i];
        if (truth) return { label: theme.moreThan(cats[big], cats[small]) };
        return { label: theme.moreThan(cats[small], cats[big]), whyWrong: `Vergleiche „${cats[small]}“ und „${cats[big]}“ noch einmal genau.` };
      }
    }
  };
  const kinds = rng.shuffle<Kind>(['most', 'least', 'value', 'more']);
  return { correct: make(kinds[0], true), wrong: [make(kinds[1], false), make(kinds[2], false), make(kinds[3], false)] };
}

function stufe1(rng: Rng): Exercise {
  const picto = rng.chance(0.35);
  const theme = rng.pick(picto ? PICTO_THEMES : THEMES);
  const n = rng.int(3, 4);
  const cats = pickCategories(rng, theme, n);
  const step = rng.pick([2, 5, 10]);
  const values = picto ? distinctValues(rng, n, 1, 8, 1).map((k) => k * step) : distinctValues(rng, n, step, step * 10, step);
  const visual = picto ? pictogram(theme, cats, values, step) : barChart(theme, cats, values, step, rng.chance(0.3));
  const { correct, wrong } = statementsS1(rng, n, cats, values, step, picto, theme);
  const answer = shuffledChoice(rng, correct, wrong, 3);
  const prompt = 'Welche Aussage passt zum Diagramm?';
  return makeExercise(SKILL, 1, ['aussage', picto ? 'bild' : 'saeule', step, theme.id, cats.join('-'), values.join('-'), hashText(answer.options.map((o) => o.label).join('|'))], {
    ab: 1,
    prompt,
    visual,
    emoji: theme.emoji,
    answer,
    hints: ['Prüfe jede Aussage einzeln am Diagramm.', picto ? 'Rechne die Bilder mit der Legende in Zahlen um.' : 'Lies die Werte genau an der Achse ab.'],
    steps: [`Lies ab: ${valuesText(cats, values)}.`, `Diese Aussage stimmt: ${correct.label}`],
    praise: 'Du hast jede Aussage genau am Diagramm geprüft.',
    srText: speech(describeVisual(visual), prompt, answer.kind === 'choice' ? answer.options.map((o) => o.label).join(' Oder: ') : ''),
  });
}

// ─── Stufe 2: Aussagen mit Rechnung ──────────────────────────────────────────

function stufe2(rng: Rng): Exercise {
  const theme = rng.pick(THEMES);
  const n = 4;
  const cats = pickCategories(rng, theme, n);
  // Build the data with one exact 'doppelt so viele' pair.
  const vb = rng.pick([10, 15, 20, 25, 30, 35, 40, 45]);
  const va = 2 * vb;
  const pool = Array.from({ length: 18 }, (_, i) => 10 + 5 * i).filter((v) => v !== va && v !== vb);
  const rest = rng.sample(pool, n - 2);
  const order = rng.shuffle([0, 1, 2, 3]);
  const raw = [va, vb, ...rest];
  const values = order.map((k) => raw[k]);
  const a = order.indexOf(0);
  const b = order.indexOf(1);
  const c = order.indexOf(2);
  const step = rng.pick([5, 10]);
  const visual = barChart(theme, cats, values, step, rng.chance(0.3));
  const at = theme.at;
  const moreBy = (x: number, y: number, d: number) => `${cap(at(cats[x]))} sind es ${qty(d, theme)} mehr als ${at(cats[y])}.`;

  const sumAB = va + vb;
  const [hi, lo] = values[a] > values[c] ? [a, c] : [c, a];
  const diff = values[hi] - values[lo];
  const statements: Record<'twice' | 'sum' | 'more', { yes: Opt; no: Opt }> = {
    twice: {
      yes: { label: theme.twice(cats[a], cats[b]) },
      no: { label: theme.twice(cats[a], cats[c]), whyWrong: `Rechne nach: Das Doppelte von ${fmt(values[c])} ist ${fmt(2 * values[c])}.` },
    },
    sum: {
      yes: { label: theme.sumIs(cats[a], cats[b], sumAB) },
      no: { label: theme.sumIs(cats[a], cats[b], sumAB + (rng.chance(0.5) ? 10 : -10)), whyWrong: 'Lies beide Werte noch einmal ab und addiere sie genau.' },
    },
    more: {
      yes: { label: moreBy(hi, lo, diff) },
      no: { label: moreBy(hi, lo, diff + (rng.chance(0.5) || diff <= 5 ? 5 : -5)), whyWrong: 'Lies beide Werte genau ab und rechne minus.' },
    },
  };
  const kinds = rng.shuffle(['twice', 'sum', 'more'] as const);
  const correct = statements[kinds[0]].yes;
  const answer = shuffledChoice(rng, correct, [statements[kinds[1]].no, statements[kinds[2]].no], 3);
  const prompt = 'Welche Aussage stimmt? Rechne nach.';
  const check: Record<(typeof kinds)[number], string> = {
    twice: `${fmt(vb)} · 2 = ${fmt(va)}. ${theme.twice(cats[a], cats[b])}`,
    sum: `${fmt(va)} + ${fmt(vb)} = ${fmt(sumAB)}. ${theme.sumIs(cats[a], cats[b], sumAB)}`,
    more: `${fmt(values[hi])} − ${fmt(values[lo])} = ${fmt(diff)}. ${moreBy(hi, lo, diff)}`,
  };
  return makeExercise(SKILL, 2, ['rechnen', step, theme.id, cats.join('-'), values.join('-'), kinds.join('-'), answer.kind === 'choice' ? answer.correct : 0], {
    ab: 2,
    prompt,
    visual,
    emoji: theme.emoji,
    answer,
    hints: ['Lies zuerst alle Werte ab.', 'Rechne bei jeder Aussage nach: plus, minus oder das Doppelte.'],
    steps: [`Lies ab: ${valuesText(cats, values)}.`, check[kinds[0]], `Diese Aussage stimmt: ${correct.label}`],
    praise: 'Du hast die Aussagen nachgerechnet, bevor du entschieden hast.',
    srText: speech(describeVisual(visual), prompt, answer.kind === 'choice' ? answer.options.map((o) => o.label).join(' Oder: ') : ''),
  });
}

// ─── Stufe 3: irreführende Diagramme ─────────────────────────────────────────

/** Bar chart whose axis starts at s > 0, with a pair a, b where the bar of a is k times as high as the bar of b. */
function truncatedData(rng: Rng) {
  const theme = rng.pick(THEMES);
  const n = rng.int(3, 4);
  const cats = pickCategories(rng, theme, n);
  const s = rng.pick([30, 40, 50]);
  const h = rng.pick([5, 10]);
  const k = h === 10 ? rng.pick([2, 3]) : rng.pick([2, 3, 4]);
  const vb = s + h;
  const va = s + k * h;
  const used = new Set([va, vb]);
  const restPool = Array.from({ length: 8 }, (_, i) => s + 5 * (i + 1)).filter((v) => !used.has(v));
  const rest = rng.sample(restPool, n - 2);
  const order = rng.shuffle(Array.from({ length: n }, (_, i) => i));
  const raw = [va, vb, ...rest];
  const values = order.map((i) => raw[i]);
  const a = order.indexOf(0);
  const b = order.indexOf(1);
  const step = rng.pick([5, 10]);
  const visual = barChart(theme, cats, values, step, false, s);
  return { theme, cats, values, s, k, a, b, va, vb, step, visual };
}

function truncatedClaim(rng: Rng): Exercise {
  const d = truncatedData(rng);
  const { theme, cats, a, b, va, vb, s, k, visual } = d;
  const name = rng.pick(['Tim', 'Jonas', 'Leon', 'Paul']);
  const times = timesWord(k);
  const context = `${name} sagt: „${cap(theme.at(cats[a]))} ist die Säule ${times} so hoch wie ${theme.at(cats[b])}. Also sind es ${times} so viele.“`;
  const prompt = `Hat ${name} recht?`;
  const answer = shuffledChoice(
    rng,
    { label: `Nein. Die Achse beginnt bei ${fmt(s)}, nicht bei 0. Es sind ${fmt(va)} und ${fmt(vb)}.` },
    [
      { label: `Ja. Die Säule ist ${times} so hoch, also sind es ${times} so viele.`, whyWrong: 'Schau, wo die Achse beginnt. Die Säulen fangen nicht bei 0 an.' },
      { label: `Nein. ${cap(theme.at(cats[b]))} sind es mehr.`, whyWrong: `Die Säule ${theme.at(cats[a])} ist höher. Lies beide Werte an der Achse ab.` },
      { label: 'Das kann man nicht wissen. Es fehlen Zahlen.', whyWrong: 'Doch: An der Achse stehen Zahlen. Lies beide Werte ab und vergleiche.' },
    ],
    4,
  );
  return makeExercise(SKILL, 3, ['achse', theme.id, d.cats.join('-'), d.values.join('-'), s, d.step, name], {
    ab: 3,
    knobel: true,
    context,
    prompt,
    visual,
    emoji: theme.emoji,
    answer,
    hints: ['Schau genau: Bei welcher Zahl beginnt die Achse?', 'Lies beide Werte an der Achse ab. Vergleiche die Zahlen, nicht nur die Höhe.'],
    steps: [
      `Die Achse beginnt bei ${fmt(s)}, nicht bei 0. Deshalb sehen die Unterschiede größer aus.`,
      `${cap(theme.at(cats[a]))} sind es ${qty(va, theme)}, ${theme.at(cats[b])} ${qty(vb, theme)}.`,
      `${fmt(va)} ist nicht ${times} so viel wie ${fmt(vb)}. ${name} hat nicht recht.`,
    ],
    praise: 'Du hast bemerkt, dass die Achse nicht bei 0 beginnt.',
    srText: speech(describeVisual(visual), context, prompt),
  });
}

function truncatedRead(rng: Rng): Exercise {
  const d = truncatedData(rng);
  const { theme, cats, values, s, visual, step } = d;
  const t = rng.int(0, cats.length - 1);
  const v = values[t];
  const prompt = theme.howMany(cats[t]);
  return makeExercise(SKILL, 3, ['achse-wert', theme.id, cats.join('-'), values.join('-'), s, step, t], {
    ab: 2,
    prompt,
    visual,
    emoji: theme.emoji,
    answer: { kind: 'number', value: v, unit: theme.unit, label: `Anzahl ${cats[t]}` },
    hints: ['Schau genau: Bei welcher Zahl beginnt die Achse?', `Lies die Zahl ab, auf deren Höhe die Säule für „${cats[t]}“ endet.`],
    steps: [`Die Achse beginnt bei ${fmt(s)}.`, `Die Säule für „${cats[t]}“ endet bei ${fmt(v)}.`, theme.says(cats[t], v)],
    bugs: numberBugs(v, [
      ['ab-null-gezaehlt', v - s, `Die Achse beginnt bei ${fmt(s)}, nicht bei 0. Lies die Zahl an der Achse ab.`],
      ['linien-gezaehlt', (v - s) / step, `Lies die Zahl an der Achse ab. Die Achse beginnt bei ${fmt(s)}.`],
    ]),
    praise: 'Du hast genau auf die Achse geschaut.',
    srText: speech(describeVisual(visual), prompt),
  });
}

/** Two Bilddiagramme with different legends: more pictures do not always mean more children. */
function unequalIcons(rng: Rng): Exercise {
  const theme = rng.pick(SURVEY_THEMES);
  const n = rng.int(3, 4);
  const cats = pickCategories(rng, theme, n);
  const t = rng.int(0, n - 1);
  const c = cats[t];
  const ivA = 2;
  const ivB = rng.pick([5, 10]);
  const na = rng.int(4, 8);
  const minNb = Math.ceil((na * ivA) / ivB);
  const nb = rng.int(Math.max(1, minNb), na - 1);
  const childrenA = na * ivA;
  const childrenB = nb * ivB;
  const otherIcons = rng.sample([1, 2, 3, 4, 5, 6, 7, 8].filter((x) => x !== na), n - 1);
  const values = cats.map((_, i) => (i === t ? na : otherIcons[i < t ? i : i - 1]) * ivA);
  const visual: Pictogram = { ...pictogram(theme, cats, values, ivA), title: `${theme.title} Klasse 4a` };
  const name = rng.pick(['Lisa', 'Emma', 'Hanna', 'Zoe']);
  const context = `In der Klasse 4b bedeutet ein Bild ${fmt(ivB)} Kinder. Dort hat die Zeile „${c}“ ${fmt(nb)} ${nb === 1 ? 'Bild' : 'Bilder'}. ${name} sagt: „In der 4a haben mehr Kinder für ${c} gestimmt. Dort sind mehr Bilder.“`;
  const prompt = `Hat ${name} recht?`;
  const equal = childrenA === childrenB;
  const correct: Opt = equal
    ? { label: `Nein. In beiden Klassen sind es ${fmt(childrenA)} Kinder.` }
    : { label: `Nein. In der 4b sind es ${fmt(childrenB)} Kinder, in der 4a nur ${fmt(childrenA)}.` };
  const wrong: Opt[] = [
    { label: 'Ja. Die 4a hat mehr Bilder, also mehr Kinder.', whyWrong: 'Ein Bild bedeutet in den beiden Diagrammen nicht gleich viel. Rechne die Bilder in Kinder um.' },
  ];
  if (childrenA > nb) {
    wrong.push({
      label: `Ja. In der 4a sind es ${fmt(childrenA)} Kinder, in der 4b nur ${fmt(nb)}.`,
      whyWrong: `In der 4b bedeutet ein Bild ${fmt(ivB)} Kinder. Rechne ${fmt(nb)} · ${fmt(ivB)}.`,
    });
  }
  if (!equal) wrong.push({ label: 'Nein. In beiden Klassen sind es gleich viele Kinder.', whyWrong: 'Rechne beide Zahlen genau aus und vergleiche sie.' });
  const answer = shuffledChoice(rng, correct, wrong, 4);
  return makeExercise(SKILL, 3, ['bilder', theme.id, cats.join('-'), values.join('-'), t, ivB, nb, name], {
    ab: 3,
    knobel: true,
    context,
    prompt,
    visual,
    emoji: theme.emoji,
    answer,
    hints: ['Schau auf die Legenden. Bedeutet ein Bild überall gleich viel?', 'Rechne für beide Klassen die Bilder in Kinder um.'],
    steps: [
      `4a: ${fmt(na)} Bilder · ${fmt(ivA)} = ${fmt(childrenA)} Kinder.`,
      `4b: ${fmt(nb)} ${nb === 1 ? 'Bild' : 'Bilder'} · ${fmt(ivB)} = ${fmt(childrenB)} Kinder.`,
      equal ? `In beiden Klassen sind es gleich viele. ${name} hat nicht recht.` : `In der 4b sind es mehr. ${name} hat nicht recht.`,
    ],
    praise: 'Du hast erkannt, dass ein Bild nicht überall gleich viel bedeutet.',
    srText: speech(describeVisual(visual), context, prompt),
  });
}

function generate(rng: Rng, stufe: Stufe): Exercise {
  if (stufe === 1) return stufe1(rng);
  if (stufe === 2) return stufe2(rng);
  const roll = rng.next();
  if (roll < 0.4) return truncatedClaim(rng);
  if (roll < 0.65) return truncatedRead(rng);
  return unequalIcons(rng);
}

export const diagrammePruefenSkill: SkillDef = {
  id: SKILL.id,
  topicId: 'daten',
  title: 'Diagramme prüfen',
  description: 'Du prüfst Aussagen zu Diagrammen und findest Tricks in Diagrammen.',
  stufen: {
    1: 'Welche Aussage passt zum Diagramm?',
    2: 'Aussagen nachrechnen',
    3: 'Achsen und Bilder genau prüfen',
  },
  kmk: SKILL.kmk,
  generate,
};
