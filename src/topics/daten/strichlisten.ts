/**
 * Strichlisten und Tabellen lesen.
 * Stufe 1: einen Wert aus einer Strichliste ablesen, die größte/kleinste Zeile finden.
 * Stufe 2: Unterschiede und Summen aus Strichliste oder Tabelle.
 * Stufe 3: fehlende Zahl aus der Gesamtzahl, Zählfehler korrigieren, Zahl in Fünferbündel zerlegen.
 */
import { fmt } from '../../core/format';
import type { Exercise, Rng, SkillDef, Stufe } from '../../core/types';
import {
  argMax,
  argMin,
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
  tally,
  table,
  THEMES,
  valuesText,
} from './shared';

const SKILL = { id: 'daten.strichlisten', kmk: ['DZ.daten', 'PK.darstellen'] };

const HINT_BUNDLE = 'Ein Bündel mit Querstrich steht für 5 Striche.';
const BUG_FOUR = 'Ein Fünferbündel hat 5 Striche: 4 senkrechte und einen Querstrich. Zähle den Querstrich mit.';
const BUG_ONE = 'Ein Bündel steht für 5 Striche, nicht für 1. Zähle die Bündel in Fünferschritten.';

const bundles = (v: number) => Math.floor(v / 5);
/** What a child gets who counts a Fünferbündel as 4 (forgets the diagonal). */
const asFour = (v: number) => v - bundles(v);

/** 'In der Zeile „Autos“: 5, 10 und noch 3 Striche: 10 + 3 = 13.' */
export function countSteps(label: string, v: number): string {
  const b = bundles(v);
  const r = v % 5;
  if (b === 0) return r === 1 ? `In der Zeile „${label}“ ist 1 einzelner Strich.` : `In der Zeile „${label}“ sind ${fmt(r)} einzelne Striche.`;
  const fives = Array.from({ length: b }, (_, i) => fmt(5 * (i + 1))).join(', ');
  if (r === 0) return `In der Zeile „${label}“ zählst du die Bündel in Fünferschritten: ${fives}.`;
  const singles = r === 1 ? 'Dazu kommt 1 einzelner Strich' : `Dazu kommen ${fmt(r)} einzelne Striche`;
  return `In der Zeile „${label}“ zählst du die Bündel in Fünferschritten: ${fives}. ${singles}: ${fmt(5 * b)} + ${fmt(r)} = ${fmt(v)}.`;
}

// ─── Stufe 1 ─────────────────────────────────────────────────────────────────

function readValue(rng: Rng): Exercise {
  const theme = rng.pick(THEMES);
  const n = rng.int(3, 4);
  const cats = pickCategories(rng, theme, n);
  const values = distinctValues(rng, n, 3, 19, 1);
  const candidates = values.map((v, i) => (v >= 5 ? i : -1)).filter((i) => i >= 0);
  const t = rng.pick(candidates);
  const c = cats[t];
  const v = values[t];
  const visual = tally(theme, cats, values);
  const prompt = theme.howMany(c);
  return makeExercise(SKILL, 1, ['lesen', theme.id, cats.join('-'), values.join('-'), t], {
    ab: 1,
    prompt,
    visual,
    emoji: theme.emoji,
    answer: { kind: 'number', value: v, unit: theme.unit, label: `Anzahl ${c}` },
    hints: [HINT_BUNDLE, `Zähle in der Zeile „${c}“ zuerst die Bündel in Fünferschritten. Zähle dann die einzelnen Striche dazu.`],
    steps: [countSteps(c, v), theme.says(c, v)],
    bugs: numberBugs(v, [
      ['buendel-als-vier', asFour(v), BUG_FOUR],
      ['buendel-als-eins', bundles(v) + (v % 5), BUG_ONE],
    ]),
    praise: 'Du hast in Fünferschritten gezählt und die einzelnen Striche dazugenommen.',
    srText: speech(describeVisual(visual), prompt),
  });
}

function extreme(rng: Rng): Exercise {
  const theme = rng.pick(THEMES);
  const n = rng.int(3, 4);
  const cats = pickCategories(rng, theme, n);
  const values = distinctValues(rng, n, 3, 22, 1);
  const most = rng.chance(0.6);
  const t = most ? argMax(values) : argMin(values);
  const visual = tally(theme, cats, values);
  const prompt = most ? theme.mostQ : theme.leastQ;
  const answer = shuffledChoice(
    rng,
    { label: cats[t] },
    cats
      .map((c, i) => ({
        label: c,
        whyWrong: `In der Zeile „${c}“ sind es ${fmt(values[i])} Striche. Zähle auch die anderen Zeilen. Wo sind es ${most ? 'mehr' : 'weniger'}?`,
      }))
      .filter((_, i) => i !== t),
  );
  return makeExercise(SKILL, 1, [most ? 'max' : 'min', theme.id, cats.join('-'), values.join('-')], {
    ab: 1,
    prompt,
    visual,
    emoji: theme.emoji,
    answer,
    hints: [HINT_BUNDLE, 'Zähle jede Zeile in Fünferschritten. Vergleiche dann die Zahlen.'],
    steps: [`Zähle jede Zeile: ${valuesText(cats, values)}.`, `Die ${most ? 'größte' : 'kleinste'} Zahl ist ${fmt(values[t])}.`, most ? theme.mostIs(cats[t]) : theme.leastIs(cats[t])],
    praise: 'Du hast alle Zeilen gezählt und verglichen.',
    srText: speech(describeVisual(visual), prompt),
  });
}

// ─── Stufe 2 ─────────────────────────────────────────────────────────────────

function combine(rng: Rng): Exercise {
  const theme = rng.pick(THEMES);
  const mode = rng.pick(['diff', 'sum2', 'total'] as const);
  const fromTally = rng.chance(0.6);
  const n = mode === 'total' ? rng.int(3, 4) : rng.int(3, 5);
  const cats = pickCategories(rng, theme, n);
  const values = distinctValues(rng, n, 4, fromTally ? 35 : 60, 1);
  const visual = fromTally ? tally(theme, cats, values) : table(theme, cats, values);
  const readHint = fromTally ? 'Zähle die Zeilen in Fünferschritten.' : 'Suche die passenden Zeilen in der Tabelle.';
  const keyBase = [mode, fromTally ? 'strich' : 'tab', theme.id, cats.join('-'), values.join('-')];

  if (mode === 'total') {
    const total = sum(values);
    const prompt = theme.totalQ;
    return makeExercise(SKILL, 2, keyBase, {
      ab: 2,
      prompt,
      visual,
      emoji: theme.emoji,
      answer: { kind: 'number', value: total, unit: theme.unit, label: 'Anzahl insgesamt' },
      hints: [readHint, 'Addiere die Zahlen aller Zeilen. Lass keine Zeile aus.'],
      steps: [`Lies alle Werte ab: ${valuesText(cats, values)}.`, `${values.map((v) => fmt(v)).join(' + ')} = ${fmt(total)}`, `Insgesamt sind es ${qty(total, theme)}.`],
      bugs: numberBugs(total, [
        ...values.map((v, i) => [`zeile-${i}-vergessen`, total - v, 'Hast du wirklich alle Zeilen addiert? Prüfe Zeile für Zeile.'] as const),
        fromTally ? ['buendel-als-vier', sum(values.map(asFour)), BUG_FOUR] : null,
      ]),
      praise: 'Du hast alle Zeilen genau abgelesen und zusammengezählt.',
      srText: speech(describeVisual(visual), prompt),
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
      hints: [readHint, 'Rechne die größere Zahl minus die kleinere Zahl.'],
      steps: [theme.says(cats[a], va), theme.says(cats[b], vb), `${fmt(va)} − ${fmt(vb)} = ${fmt(d)}`, moreText(d, theme)],
      bugs: numberBugs(d, [
        ['plus-statt-minus', va + vb, 'Gefragt ist, wie viele es mehr sind. Rechne minus.'],
        fromTally ? ['buendel-als-vier', asFour(va) - asFour(vb), BUG_FOUR] : null,
      ]),
      praise: 'Du hast den Unterschied mit einer Minusaufgabe berechnet.',
      srText: speech(describeVisual(visual), prompt),
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
    hints: [readHint, 'Lies beide Werte ab und addiere sie.'],
    steps: [theme.says(cats[a], va), theme.says(cats[b], vb), `${fmt(va)} + ${fmt(vb)} = ${fmt(s)}`, `Zusammen sind es ${qty(s, theme)}.`],
    bugs: numberBugs(s, [
      ['minus-statt-plus', va - vb, 'Gefragt ist, wie viele es zusammen sind. Rechne plus.'],
      fromTally ? ['buendel-als-vier', asFour(va) + asFour(vb), BUG_FOUR] : null,
    ]),
    praise: 'Du hast beide Werte genau abgelesen und addiert.',
    srText: speech(describeVisual(visual), prompt),
  });
}

// ─── Stufe 3 ─────────────────────────────────────────────────────────────────

function missingValue(rng: Rng): Exercise {
  const theme = rng.pick(THEMES);
  const n = rng.int(4, 5);
  const cats = pickCategories(rng, theme, n);
  const values = distinctValues(rng, n, 8, 60, 1);
  const t = rng.int(0, n - 1);
  const v = values[t];
  const total = sum(values);
  const known = values.filter((_, i) => i !== t);
  const sk = sum(known);
  const visual = table(theme, cats, values.map((x, i) => (i === t ? null : x)), total);
  const context = `In der Tabelle fehlt eine Zahl. Insgesamt sind es ${qty(total, theme)}.`;
  const prompt = theme.howMany(cats[t]);
  return makeExercise(SKILL, 3, ['fehlt', theme.id, cats.join('-'), values.join('-'), t], {
    ab: 3,
    knobel: true,
    context,
    prompt,
    visual,
    emoji: theme.emoji,
    answer: { kind: 'number', value: v, unit: theme.unit, label: `Anzahl ${cats[t]}` },
    hints: ['Die Zahl bei „Zusammen“ ist die Summe aller Zeilen.', 'Addiere die bekannten Zahlen. Wie viel fehlt dann noch bis zur Gesamtzahl?'],
    steps: [
      `Addiere die bekannten Zahlen: ${known.map((x) => fmt(x)).join(' + ')} = ${fmt(sk)}.`,
      `Bis zur Gesamtzahl fehlen: ${fmt(total)} − ${fmt(sk)} = ${fmt(v)}.`,
      theme.says(cats[t], v),
    ],
    bugs: numberBugs(v, [
      ['alles-addiert', total + sk, 'Die Gesamtzahl enthält schon alle Zeilen. Rechne von der Gesamtzahl aus minus.'],
      ['nur-summe', sk, `Das ist die Summe der bekannten Zahlen. Wie viel fehlt noch bis ${fmt(total)}?`],
      ...known.map((k, i) => [`zahl-${i}-vergessen`, v + k, 'Hast du alle bekannten Zahlen abgezogen? Prüfe jede Zeile.'] as const),
    ]),
    praise: 'Du hast von der Gesamtzahl aus zurückgerechnet.',
    srText: speech(describeVisual(visual), context, prompt),
  });
}

function correction(rng: Rng): Exercise {
  const theme = rng.pick(THEMES);
  const n = rng.int(3, 4);
  const cats = pickCategories(rng, theme, n);
  const values = distinctValues(rng, n, 6, 30, 1);
  const t = rng.int(0, n - 1);
  const k = rng.int(2, 4);
  const total = sum(values);
  const answer = total - k;
  const visual = tally(theme, cats, values);
  const name = rng.pick(['Lena', 'Jonas', 'Aylin', 'Finn', 'Mila', 'Luca']);
  const context = `${name} hat sich verzählt. In der Zeile „${cats[t]}“ sind ${fmt(k)} Striche zu viel.`;
  const prompt = `Wie viele ${theme.unit} sind es wirklich insgesamt?`;
  return makeExercise(SKILL, 3, ['korrektur', theme.id, cats.join('-'), values.join('-'), t, k, name], {
    ab: 3,
    context,
    prompt,
    visual,
    emoji: theme.emoji,
    answer: { kind: 'number', value: answer, unit: theme.unit, label: 'Anzahl insgesamt' },
    hints: ['Zähle zuerst alle Zeilen der Strichliste zusammen.', 'Denk an die Striche, die zu viel sind.'],
    steps: [
      `Lies alle Werte ab: ${valuesText(cats, values)}.`,
      `Zusammen: ${values.map((x) => fmt(x)).join(' + ')} = ${fmt(total)}.`,
      `${fmt(k)} Striche sind zu viel: ${fmt(total)} − ${fmt(k)} = ${fmt(answer)}.`,
      `Es sind wirklich ${qty(answer, theme)}.`,
    ],
    bugs: numberBugs(answer, [
      ['nicht-korrigiert', total, `Das ist die Zahl mit dem Fehler. Nimm die ${fmt(k)} Striche weg, die zu viel sind.`],
      ['dazugezaehlt', total + k, 'Die Striche sind zu viel. Ziehe sie ab, statt sie dazuzuzählen.'],
      ['buendel-als-vier', sum(values.map(asFour)) - k, BUG_FOUR],
    ]),
    praise: 'Du hast alle Zeilen addiert und an den Zählfehler gedacht.',
    srText: speech(describeVisual(visual), context, prompt),
  });
}

function splitIntoBundles(rng: Rng): Exercise {
  const name = rng.pick(['Tim', 'Lina', 'Paul', 'Emma', 'Noah', 'Sofia']);
  const v = rng.chance(0.8) ? rng.int(23, 99) : 5 * rng.int(5, 19);
  const b = Math.floor(v / 5);
  const r = v % 5;
  const prompt = `${name} will ${fmt(v)} als Strichliste zeichnen. Wie viele Fünferbündel und einzelne Striche malt ${name === 'Tim' || name === 'Paul' || name === 'Noah' ? 'er' : 'sie'}?`;
  return makeExercise(SKILL, 3, ['buendeln', v, name], {
    ab: 2,
    prompt,
    answer: {
      kind: 'multi',
      fields: [
        { id: 'b', value: b, after: 'Fünferbündel', label: 'Anzahl der Fünferbündel' },
        { id: 'r', value: r, before: 'und', after: 'einzelne Striche', label: 'Anzahl der einzelnen Striche' },
      ],
    },
    hints: [HINT_BUNDLE, `Wie oft passt die 5 in ${fmt(v)}? Was übrig bleibt, sind einzelne Striche.`],
    steps:
      r === 0
        ? [`${fmt(v)} : 5 = ${fmt(b)}`, `Probe: ${fmt(b)} · 5 = ${fmt(v)}`, `Es sind ${fmt(b)} Fünferbündel und 0 einzelne Striche.`]
        : [`${fmt(v)} : 5 = ${fmt(b)} R ${fmt(r)}`, `Probe: ${fmt(b)} · 5 + ${fmt(r)} = ${fmt(v)}`, `Es sind ${fmt(b)} Fünferbündel und ${r === 1 ? '1 einzelner Strich' : `${fmt(r)} einzelne Striche`}.`],
    bugs: [
      ...(r > 0 ? [{ id: 'aufgerundet', match: { b: b + 1 }, hint: 'Ein Bündel ist erst mit 5 Strichen voll. Die übrigen Striche bleiben einzeln.' }] : []),
      { id: 'vierer-buendel', match: { b: Math.floor(v / 4), r: v % 4 }, hint: 'Ein Fünferbündel hat 5 Striche: 4 senkrechte und einen Querstrich.' },
      { id: 'zehner-buendel', match: { b: Math.floor(v / 10), r: v % 10 }, hint: 'Ein Bündel steht für 5 Striche, nicht für 10.' },
    ],
    praise: 'Du hast in Fünferbündel aufgeteilt und den Rest beachtet.',
    srText: speech(prompt),
  });
}

function generate(rng: Rng, stufe: Stufe): Exercise {
  if (stufe === 1) return rng.chance(0.65) ? readValue(rng) : extreme(rng);
  if (stufe === 2) return combine(rng);
  const roll = rng.next();
  if (roll < 0.4) return missingValue(rng);
  if (roll < 0.75) return correction(rng);
  return splitIntoBundles(rng);
}

export const strichlistenSkill: SkillDef = {
  id: SKILL.id,
  topicId: 'daten',
  title: 'Strichlisten und Tabellen',
  description: 'Du liest Strichlisten und Tabellen und rechnest mit den Zahlen.',
  stufen: {
    1: 'Einen Wert ablesen, die meisten finden',
    2: 'Unterschiede und Summen berechnen',
    3: 'Fehlende Zahlen und Zählfehler',
  },
  kmk: SKILL.kmk,
  generate,
};

/** Exposed for tests. */
export const _internal = { asFour, bundles };
