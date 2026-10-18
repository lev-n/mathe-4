/**
 * Darstellungen wechseln: Strichliste → Tabelle → Diagramm.
 * Stufe 1: Strichliste in eine Tabelle übertragen; passende Strichliste zur Tabelle wählen.
 * Stufe 2: passendes Säulendiagramm zur Strichliste, passendes Bilddiagramm zur Tabelle.
 * Stufe 3: Säulendiagramm → Bilddiagramm mit halben Bildern, Bilddiagramm → Tabelle, Achse beachten.
 */
import { fmt } from '../../core/format';
import type { Exercise, MultiField, Rng, SkillDef, Stufe, Visual } from '../../core/types';
import {
  barChart,
  describeVisual,
  distinctValues,
  makeExercise,
  pickCategories,
  pictogram,
  pictoText,
  PICTO_THEMES,
  speech,
  tally,
  table,
  tallyText,
  THEMES,
  valuesText,
  visualChoice,
  type BarChart,
  type DataTheme,
} from './shared';
import { countSteps } from './strichlisten';

const SKILL = { id: 'daten.darstellungen', kmk: ['DZ.daten', 'PK.darstellen'] };

const asFour = (v: number) => v - Math.floor(v / 5);

function swap<T>(arr: readonly T[], i: number, j: number): T[] {
  const out = arr.slice();
  [out[i], out[j]] = [out[j], out[i]];
  return out;
}

function withValue(values: readonly number[], i: number, v: number): number[] {
  return values.map((x, k) => (k === i ? v : x));
}

/** Two different indices whose values differ (values are distinct anyway). */
function twoIndices(rng: Rng, n: number): [number, number] {
  const [i, j] = rng.sample(Array.from({ length: n }, (_, k) => k), 2);
  return [i, j];
}

function optionsSpeech(answer: Exercise['answer']): string {
  if (answer.kind !== 'choice') return '';
  return answer.options.map((o) => `${o.label}: ${o.visual ? describeVisual(o.visual) : ''}`).join(' ');
}

function correctLabel(answer: Exercise['answer']): string {
  return answer.kind === 'choice' ? answer.options[answer.correct].label : '';
}

// ─── Stufe 1 ─────────────────────────────────────────────────────────────────

function tallyToTable(rng: Rng): Exercise {
  const theme = rng.pick(THEMES);
  const n = rng.int(3, 4);
  const cats = pickCategories(rng, theme, n);
  const values = distinctValues(rng, n, 3, 20, 1);
  const visual = tally(theme, cats, values);
  const fields: MultiField[] = cats.map((c, i) => ({ id: `z${i}`, value: values[i], before: `${c}:`, label: `Anzahl ${c}` }));
  const prompt = 'Übertrage die Strichliste in die Tabelle. Schreibe zu jeder Zeile die Zahl.';
  return makeExercise(SKILL, 1, ['tabelle', theme.id, cats.join('-'), values.join('-')], {
    ab: 1,
    prompt,
    visual,
    emoji: theme.emoji,
    answer: { kind: 'multi', fields },
    hints: ['Ein Bündel mit Querstrich steht für 5 Striche.', 'Zähle jede Zeile in Fünferschritten. Zähle dann die einzelnen Striche dazu.'],
    steps: [...cats.map((c, i) => countSteps(c, values[i])), { text: `So sieht die Tabelle aus: ${valuesText(cats, values)}.`, visual: table(theme, cats, values) }],
    bugs: values.flatMap((v, i) =>
      v >= 5
        ? [
            { id: `vier-${i}`, match: { [`z${i}`]: asFour(v) }, hint: `Zeile „${cats[i]}“: Ein Fünferbündel hat 5 Striche, 4 senkrechte und einen Querstrich.` },
            { id: `eins-${i}`, match: { [`z${i}`]: Math.floor(v / 5) + (v % 5) }, hint: `Zeile „${cats[i]}“: Ein Bündel steht für 5 Striche, nicht für 1.` },
          ]
        : [],
    ),
    praise: 'Du hast jede Strichliste genau in eine Zahl übersetzt.',
    srText: speech(describeVisual(visual), prompt),
  });
}

function tableToTally(rng: Rng): Exercise {
  const theme = rng.pick(THEMES);
  const n = 3;
  const cats = pickCategories(rng, theme, n);
  const values = distinctValues(rng, n, 3, 20, 1);
  const visual = table(theme, cats, values);
  const [i, j] = twoIndices(rng, n);
  const k = rng.int(0, n - 1);
  const wrong = rng.shuffle([
    { visual: tally(theme, cats, swap(values, i, j)), whyWrong: `In dieser Strichliste sind „${cats[i]}“ und „${cats[j]}“ vertauscht.` },
    { visual: tally(theme, cats, withValue(values, k, values[k] + 1)), whyWrong: `Zähle die Striche bei „${cats[k]}“ noch einmal. Ein Strich ist zu viel.` },
    {
      visual: tally(theme, cats, withValue(values, k, values[k] >= 6 ? values[k] - 5 : values[k] + 5)),
      whyWrong: `Zähle die Fünferbündel bei „${cats[k]}“ noch einmal.`,
    },
  ]);
  const correct = tally(theme, cats, values);
  const answer = visualChoice(rng, 'Strichliste', correct, wrong);
  const prompt = 'Welche Strichliste passt zur Tabelle?';
  return makeExercise(SKILL, 1, ['strichliste', theme.id, cats.join('-'), values.join('-')], {
    ab: 1,
    prompt,
    visual,
    emoji: theme.emoji,
    answer,
    hints: ['Ein Fünferbündel steht für 5 Striche.', 'Prüfe jede Zeile: Passt die Zahl der Striche zur Zahl in der Tabelle?'],
    steps: [`Übersetze jede Zahl in Striche: ${cats.map((c, x) => `${c} ${fmt(values[x])} = ${tallyText(values[x])}`).join(', ')}.`, { text: `${correctLabel(answer)} passt.`, visual: correct }],
    praise: 'Du hast jede Zeile genau verglichen.',
    srText: speech(describeVisual(visual), prompt, optionsSpeech(answer)),
  });
}

// ─── Stufe 2 ─────────────────────────────────────────────────────────────────

/** Bar charts in one choice share the same axis so only the bars differ. */
function sameAxis(charts: BarChart[]): BarChart[] {
  const axisMax = Math.max(...charts.map((c) => c.axisMax));
  return charts.map((c) => ({ ...c, axisMax }));
}

function tallyToBars(rng: Rng): Exercise {
  const theme = rng.pick(THEMES);
  const n = rng.int(3, 4);
  const cats = pickCategories(rng, theme, n);
  let values = distinctValues(rng, n, 2, 20, 1);
  if (!values.some((v) => v >= 10)) values = withValue(values, 0, 12);
  const visual = tally(theme, cats, values);
  const [i, j] = twoIndices(rng, n);
  const big = values.indexOf(Math.max(...values));
  const k = rng.int(0, n - 1);
  const charts = sameAxis([
    barChart(theme, cats, values, 2, false),
    barChart(theme, cats, swap(values, i, j), 2, false),
    barChart(theme, cats, withValue(values, big, asFour(values[big])), 2, false),
    barChart(theme, cats, withValue(values, k, values[k] + 2), 2, false),
  ]);
  const wrong = rng.shuffle([
    { visual: charts[1], whyWrong: `In diesem Diagramm sind die Säulen für „${cats[i]}“ und „${cats[j]}“ vertauscht.` },
    { visual: charts[2], whyWrong: `Bei „${cats[big]}“ ist die Säule zu niedrig. Hier wurde ein Fünferbündel nur als 4 gezählt.` },
    { visual: charts[3], whyWrong: `Bei „${cats[k]}“ ist die Säule zu hoch. Zähle die Striche noch einmal.` },
  ]);
  const answer = visualChoice(rng, 'Diagramm', charts[0], wrong);
  const prompt = 'Welches Säulendiagramm passt zur Strichliste?';
  return makeExercise(SKILL, 2, ['saeulen', theme.id, cats.join('-'), values.join('-')], {
    ab: 2,
    prompt,
    visual,
    emoji: theme.emoji,
    answer,
    hints: ['Zähle zuerst jede Zeile der Strichliste.', 'Prüfe dann jede Säule an der Achse. Die Achse geht in 2er-Schritten.'],
    steps: [`Die Strichliste zeigt: ${valuesText(cats, values)}.`, { text: `${correctLabel(answer)} zeigt genau diese Zahlen.`, visual: charts[0] }],
    praise: 'Du hast jede Säule mit der Strichliste verglichen.',
    srText: speech(describeVisual(visual), prompt, optionsSpeech(answer)),
  });
}

function tableToPicto(rng: Rng): Exercise {
  const theme = rng.pick(PICTO_THEMES);
  const n = 3;
  const cats = pickCategories(rng, theme, n);
  const iv = rng.pick([2, 10]);
  const halves = distinctValues(rng, n, 2, 14, 1);
  if (halves.every((h) => h % 2 === 0)) halves[0] = halves.includes(halves[0] + 1) ? halves[0] - 1 : halves[0] + 1;
  const values = halves.map((h) => (h * iv) / 2);
  const visual = table(theme, cats, values);
  const halfRow = values.findIndex((v) => v % iv !== 0);
  const otherIv = iv === 10 ? 5 : 10;
  const [i, j] = twoIndices(rng, n);
  const wrong: { visual: Visual; whyWrong: string }[] = [
    { visual: pictogram(theme, cats, swap(values, i, j), iv), whyWrong: `Hier sind „${cats[i]}“ und „${cats[j]}“ vertauscht.` },
    { visual: pictogram(theme, cats, withValue(values, halfRow, values[halfRow] - iv / 2), iv), whyWrong: `Bei „${cats[halfRow]}“ fehlt das halbe Bild.` },
  ];
  // Same number of pictures, but a different legend (only if all values stay whole numbers).
  const relabeled = values.map((v) => (v / iv) * otherIv);
  if (relabeled.every((v) => Number.isInteger(v) && Number.isInteger((2 * v) / otherIv))) {
    wrong.push({ visual: pictogram(theme, cats, relabeled, otherIv), whyWrong: `Schau auf die Legende: Hier bedeutet ein Bild ${fmt(otherIv)}. Dann passen die Zahlen nicht.` });
  }
  const correct = pictogram(theme, cats, values, iv);
  const answer = visualChoice(rng, 'Diagramm', correct, rng.shuffle(wrong));
  const prompt = 'Welches Bilddiagramm passt zur Tabelle?';
  return makeExercise(SKILL, 2, ['bild', iv, theme.id, cats.join('-'), values.join('-')], {
    ab: 2,
    prompt,
    visual,
    emoji: theme.emoji,
    answer,
    hints: ['Schau bei jedem Diagramm zuerst auf die Legende.', 'Rechne für jede Zeile aus, wie viele Bilder es sein müssen.'],
    steps: [
      `Ein Bild bedeutet ${fmt(iv)}. ${cats.map((c, x) => `${c}: ${fmt(values[x])} = ${pictoText(values[x], iv)}`).join('. ')}.`,
      { text: `${correctLabel(answer)} passt.`, visual: correct },
    ],
    praise: 'Du hast die Legende beachtet und jede Zeile geprüft.',
    srText: speech(describeVisual(visual), prompt, optionsSpeech(answer)),
  });
}

// ─── Stufe 3 ─────────────────────────────────────────────────────────────────

function barsToPicto(rng: Rng): Exercise {
  const theme = rng.pick(PICTO_THEMES);
  const n = 4;
  const cats = pickCategories(rng, theme, n);
  const halves = distinctValues(rng, n, 2, 16, 1);
  if (halves.every((h) => h % 2 === 0)) halves[0] = halves.includes(halves[0] + 1) ? halves[0] - 1 : halves[0] + 1;
  const values = halves.map((h) => h * 5);
  const visual = barChart(theme, cats, values, 10, rng.chance(0.4));
  const halfRow = values.findIndex((v) => v % 10 !== 0);
  const wholeRow = values.findIndex((v) => v % 10 === 0);
  const [i, j] = twoIndices(rng, n);
  const wrong = rng.shuffle([
    { visual: pictogram(theme, cats, withValue(values, halfRow, values[halfRow] - 5), 10), whyWrong: `Bei „${cats[halfRow]}“ fehlt das halbe Bild für die 5.` },
    { visual: pictogram(theme, cats, swap(values, i, j), 10), whyWrong: `Hier sind „${cats[i]}“ und „${cats[j]}“ vertauscht.` },
    ...(wholeRow >= 0
      ? [{ visual: pictogram(theme, cats, withValue(values, wholeRow, values[wholeRow] + 5), 10), whyWrong: `Bei „${cats[wholeRow]}“ ist ein halbes Bild zu viel.` }]
      : []),
  ]);
  const correct = pictogram(theme, cats, values, 10);
  const answer = visualChoice(rng, 'Bilddiagramm', correct, wrong);
  const prompt = 'Welches Bilddiagramm zeigt die gleichen Zahlen wie das Säulendiagramm?';
  return makeExercise(SKILL, 3, ['saeule-bild', theme.id, cats.join('-'), values.join('-')], {
    ab: 3,
    prompt,
    visual,
    emoji: theme.emoji,
    answer,
    hints: ['Lies zuerst alle Werte im Säulendiagramm ab.', 'Ein Bild bedeutet 10. Für 5 brauchst du ein halbes Bild.'],
    steps: [`Lies ab: ${valuesText(cats, values)}.`, `Mit 1 Bild = 10: ${cats.map((c, x) => `${c} ${pictoText(values[x], 10)}`).join(', ')}.`, { text: `${correctLabel(answer)} passt.`, visual: correct }],
    praise: 'Du hast zwischen zwei Diagrammen genau übersetzt.',
    srText: speech(describeVisual(visual), prompt, optionsSpeech(answer)),
  });
}

function pictoToTable(rng: Rng): Exercise {
  const theme = rng.pick(PICTO_THEMES);
  const n = rng.int(3, 4);
  const cats = pickCategories(rng, theme, n);
  const iv = rng.pick([2, 10]);
  const halves = distinctValues(rng, n, 2, 14, 1);
  if (halves.every((h) => h % 2 === 0)) halves[0] = halves.includes(halves[0] + 1) ? halves[0] - 1 : halves[0] + 1;
  const values = halves.map((h) => (h * iv) / 2);
  const visual = pictogram(theme, cats, values, iv);
  const asText = (vals: number[]) => tableOf(theme, cats, vals);
  const [i, j] = twoIndices(rng, n);
  const wrong = rng.shuffle([
    { visual: asText(values.map((v) => v / iv)), whyWrong: `In dieser Tabelle stehen die Anzahlen der Bilder. Ein Bild bedeutet aber ${fmt(iv)}.` },
    { visual: asText(values.map((v) => Math.floor(v / iv) * iv)), whyWrong: 'In dieser Tabelle wurden die halben Bilder vergessen.' },
    { visual: asText(swap(values, i, j)), whyWrong: `Hier sind „${cats[i]}“ und „${cats[j]}“ vertauscht.` },
  ]);
  const correct = asText(values);
  const answer = visualChoice(rng, 'Tabelle', correct, wrong);
  const prompt = 'Welche Tabelle passt zum Bilddiagramm?';
  return makeExercise(SKILL, 3, ['bild-tabelle', iv, theme.id, cats.join('-'), values.join('-')], {
    ab: 3,
    prompt,
    visual,
    emoji: theme.emoji,
    answer,
    hints: [`Schau auf die Legende: Ein Bild bedeutet ${fmt(iv)}.`, 'Ein halbes Bild bedeutet die Hälfte davon.'],
    steps: [`Rechne jede Zeile um: ${cats.map((c, x) => `${c} ${pictoText(values[x], iv)} = ${fmt(values[x])}`).join(', ')}.`, { text: `${correctLabel(answer)} passt.`, visual: correct }],
    praise: 'Du hast ganze und halbe Bilder richtig umgerechnet.',
    srText: speech(describeVisual(visual), prompt, optionsSpeech(answer)),
  });
}

/** Table with decimal comma for wrong 'number of pictures' tables (3,5 Bilder). */
function tableOf(theme: DataTheme, cats: string[], values: number[]): Visual {
  return { type: 'table', caption: theme.title, header: [theme.catHeader, 'Anzahl'], rows: cats.map((c, i) => [c, fmt(values[i])]) };
}

function axisCheck(rng: Rng): Exercise {
  const theme = rng.pick(THEMES);
  const n = rng.int(3, 4);
  const cats = pickCategories(rng, theme, n);
  const values = distinctValues(rng, n, 5, 50, 5);
  const visual = table(theme, cats, values);
  const k = rng.int(0, n - 1);
  const [i, j] = twoIndices(rng, n);
  const others = sameAxis([
    barChart(theme, cats, values, 5, true),
    barChart(theme, cats, swap(values, i, j), 5, true),
    barChart(theme, cats, withValue(values, k, values[k] + 5), 5, true),
  ]);
  // Same picture, different scale: every bar has the same length, but the axis counts in tens.
  const doubled: BarChart = { ...others[0], values: values.map((v) => 2 * v), axisMax: 2 * others[0].axisMax, axisStep: 10 };
  const wrong = [
    { visual: doubled, whyWrong: 'Die Balken sehen gleich aus. Aber schau auf die Zahlen an der Achse: Sie gehen hier in 10er-Schritten.' },
    ...rng.shuffle([
      { visual: others[1], whyWrong: `Hier sind die Balken für „${cats[i]}“ und „${cats[j]}“ vertauscht.` },
      { visual: others[2], whyWrong: `Der Balken für „${cats[k]}“ ist zu lang.` },
    ]),
  ];
  const answer = visualChoice(rng, 'Diagramm', others[0], wrong);
  const prompt = 'Welches Balkendiagramm passt zur Tabelle? Achte auf die Achse.';
  return makeExercise(SKILL, 3, ['achse', theme.id, cats.join('-'), values.join('-')], {
    ab: 3,
    knobel: true,
    prompt,
    visual,
    emoji: theme.emoji,
    answer,
    hints: ['Lies bei jedem Diagramm zuerst die Zahlen an der Achse.', 'Prüfe dann für jede Zeile der Tabelle, wo der Balken enden muss.'],
    steps: [`Die Tabelle zeigt: ${valuesText(cats, values)}.`, 'Zwei Diagramme sehen gleich aus. Nur bei einem geht die Achse in 5er-Schritten und passt zu den Zahlen.', { text: `${correctLabel(answer)} passt.`, visual: others[0] }],
    praise: 'Du hast nicht nur auf die Balken, sondern auch auf die Achse geschaut.',
    srText: speech(describeVisual(visual), prompt, optionsSpeech(answer)),
  });
}

function generate(rng: Rng, stufe: Stufe): Exercise {
  if (stufe === 1) return rng.chance(0.55) ? tallyToTable(rng) : tableToTally(rng);
  if (stufe === 2) return rng.chance(0.55) ? tallyToBars(rng) : tableToPicto(rng);
  const roll = rng.next();
  if (roll < 0.35) return barsToPicto(rng);
  if (roll < 0.7) return pictoToTable(rng);
  return axisCheck(rng);
}

export const darstellungenSkill: SkillDef = {
  id: SKILL.id,
  topicId: 'daten',
  title: 'Darstellungen wechseln',
  description: 'Du übersetzt Strichlisten, Tabellen und Diagramme ineinander.',
  stufen: {
    1: 'Strichliste und Tabelle übersetzen',
    2: 'Das passende Diagramm finden',
    3: 'Halbe Bilder und Achsen genau prüfen',
  },
  kmk: SKILL.kmk,
  generate,
};
