/**
 * Würfelgebäude, Baupläne und Ansichten.
 * heights[row][col] = cubes stacked on that field; row 0 = hinten (back), last row = vorne (front).
 * Drawings ('iso') are seen from vorne-rechts-oben. Generated iso buildings never get higher towards the
 * front or towards the right, so every tower top is visible and the count is unambiguous
 * ("Kein Würfel schwebt": below every cube there is a cube).
 * Stufe 1: sum a Bauplan; count a single row of towers.
 * Stufe 2: count including hidden cubes; read a Bauplan number from a drawing; larger Baupläne with gaps.
 * Stufe 3: Bauplan → Ansicht von vorne / von rechts; drawing → Ansicht von oben; drawing → Bauplan;
 *          how many cubes are missing to a Quader.
 */
import { fmt } from '../../core/format';
import type { ChoiceOption, Exercise, Rng, SkillDef, Stufe, Visual } from '../../core/types';
import { BugList, letter, makeChoice, praiseFrom, sumText } from './shared';

const ID = 'geometrie.wuerfelgebaeude';

type Heights = number[][];

function base(stufe: Stufe, key: string, kmk: string[] = ['RF.raum']): Pick<Exercise, 'key' | 'topicId' | 'skillId' | 'stufe' | 'kmk'> {
  return { key: `${ID}:${stufe}:${key}`, topicId: 'geometrie', skillId: ID, stufe, kmk };
}

const hid = (h: Heights) => h.map((r) => r.join('')).join('-');
export const total = (h: Heights): number => h.flat().reduce((a, b) => a + b, 0);
export const towers = (h: Heights): number => h.flat().filter((v) => v > 0).length;

/** Ansicht von vorne: highest tower in each column, left to right. */
export function frontView(h: Heights): number[] {
  return h[0].map((_, c) => Math.max(...h.map((row) => row[c])));
}
/** Ansicht von rechts: highest tower in each row, from vorne (left) to hinten (right). */
export function sideView(h: Heights): number[] {
  return h.map((row) => Math.max(...row)).reverse();
}

/** Cubes that cannot be seen in the drawing (front, right and top neighbour present). Exact for monotone buildings. */
export function hiddenCubes(h: Heights): number {
  let n = 0;
  for (let r = 0; r < h.length; r++) {
    for (let c = 0; c < h[r].length; c++) {
      for (let z = 0; z < h[r][c]; z++) {
        const front = r + 1 < h.length && h[r + 1][c] > z;
        const right = c + 1 < h[r].length && h[r][c + 1] > z;
        const top = z + 1 < h[r][c];
        if (front && right && top) n++;
      }
    }
  }
  return n;
}

/** Monotone building (never higher towards front or right), first row/column and last row/column used. */
function monotone(rng: Rng, R: number, C: number, maxH: number): Heights {
  for (;;) {
    const h: Heights = [];
    for (let r = 0; r < R; r++) {
      h.push([]);
      for (let c = 0; c < C; c++) {
        const ub = Math.min(r > 0 ? h[r - 1][c] : maxH, c > 0 ? h[r][c - 1] : maxH);
        const lb = r === 0 && c === 0 ? 1 : 0;
        h[r].push(ub < lb ? 0 : rng.int(lb, ub));
      }
    }
    if (h[R - 1][0] > 0 && h[0][C - 1] > 0) return h;
  }
}

function anyHeights(rng: Rng, R: number, C: number, min: number, max: number): Heights {
  return Array.from({ length: R }, () => Array.from({ length: C }, () => rng.int(min, max)));
}

const ROW_WORD = (R: number, r: number) => (R === 2 ? (r === 0 ? 'hinten' : 'vorne') : r === 0 ? 'hinten' : r === R - 1 ? 'vorne' : 'in der Mitte');

/** Spoken plan: 'hinten von links: 3, 2. vorne von links: 1, 1.' */
function speakPlan(h: Heights): string {
  return h.map((row, r) => `${cap(ROW_WORD(h.length, r))} von links: ${row.map((v) => fmt(v)).join(', ')}`).join('. ') + '.';
}

const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

/** '3 + 2 = 5' or just '3' for a single value. */
function addUp(values: number[]): string {
  const v = values.filter((x) => x > 0);
  const sum = v.reduce((a, b) => a + b, 0);
  return v.length > 1 ? `${sumText(v)} = ${fmt(sum)}` : fmt(sum);
}

const KEIN_SCHWEBEN = 'Kein Würfel schwebt: Unter jedem Würfel steht ein Würfel.';

const iso = (heights: Heights): Visual => ({ type: 'cubeBuilding', heights, view: 'iso' });
const plan = (heights: Heights): Visual => ({ type: 'cubeBuilding', heights, view: 'plan' });

// ─── Stufe 1 ────────────────────────────────────────────────────────────────

function planSum(rng: Rng, stufe: 1 | 2): Exercise {
  const R = stufe === 1 ? 2 : rng.int(2, 3);
  const C = stufe === 1 ? rng.int(2, 3) : 3;
  const h = stufe === 1 ? anyHeights(rng, R, C, 1, 3) : anyHeights(rng, R, C, 0, 4);
  if (stufe === 2 && towers(h) === R * C) h[rng.int(0, R - 1)][rng.int(0, C - 1)] = 0;
  if (total(h) === 0) h[0][0] = 2;
  const n = total(h);
  const bugs = new BugList(n)
    .add('felder', R * C, 'Du hast die Felder gezählt. Die Zahl in einem Feld sagt, wie viele Würfel dort übereinander stehen.')
    .add('tuerme', towers(h), 'Du hast die Türme gezählt. Addiere die Zahlen: Jede Zahl sagt, wie viele Würfel im Turm sind.');
  const values = h.flat().filter((v) => v > 0);
  return {
    ...base(stufe, `bauplan:${hid(h)}`),
    ab: stufe,
    prompt: 'Das ist ein Bauplan. Wie viele Würfel brauchst du für das Gebäude?',
    visual: plan(h),
    answer: { kind: 'number', value: n, unit: 'Würfel' },
    bugs: bugs.list,
    hints: ['Jede Zahl im Bauplan sagt, wie viele Würfel auf diesem Feld übereinander stehen.', 'Addiere alle Zahlen im Bauplan.'],
    steps: [
      'Die Zahlen sagen, wie hoch jeder Turm ist. Ein leeres Feld heißt: kein Würfel.',
      `${sumText(values)} = ${fmt(n)}`,
      `Du brauchst ${fmt(n)} Würfel.`,
    ],
    praise: praiseFrom(rng, ['Du hast den Bauplan richtig gelesen und alle Zahlen addiert.', 'Du hast gewusst, was die Zahlen im Bauplan bedeuten.']),
    srText: `Ein Bauplan von oben. Die Zahlen sagen, wie viele Würfel übereinander stehen: ${speakPlan(h)} Wie viele Würfel brauchst du für das Gebäude?`,
  };
}

function rowCount(rng: Rng): Exercise {
  const C = rng.int(2, 4);
  const h: Heights = [Array.from({ length: C }, () => rng.int(1, 4))];
  const n = total(h);
  const bugs = new BugList(n).add('tuerme', C, 'Du hast nur die Türme gezählt. Zähle in jedem Turm die Würfel übereinander.');
  return {
    ...base(1, `reihe:${hid(h)}`),
    ab: 1,
    prompt: 'Wie viele Würfel sind es?',
    visual: iso(h),
    answer: { kind: 'number', value: n, unit: 'Würfel' },
    bugs: bugs.list,
    hints: ['Zähle Turm für Turm.', 'Zähle in jedem Turm die Würfel von unten nach oben. Addiere dann.'],
    steps: [`Die Türme haben von links nach rechts ${h[0].map((v) => fmt(v)).join(', ')} Würfel.`, `${sumText(h[0])} = ${fmt(n)}`, `Es sind ${fmt(n)} Würfel.`],
    praise: praiseFrom(rng, ['Du hast Turm für Turm gezählt.', 'Du hast jeden Würfel genau einmal gezählt.']),
    srText: `Eine Reihe aus ${fmt(C)} Würfeltürmen. Von links: ${h[0].map((v) => fmt(v)).join(', ')} Würfel. Wie viele Würfel sind es zusammen?`,
  };
}

// ─── Stufe 2 ────────────────────────────────────────────────────────────────

function countHidden(rng: Rng): Exercise {
  let h: Heights;
  do h = monotone(rng, rng.int(2, 3), rng.int(2, 3), rng.int(2, 3));
  while (hiddenCubes(h) < 1 || total(h) > 20);
  const n = total(h);
  const hidden = hiddenCubes(h);
  const bugs = new BugList(n)
    .add('nur-sichtbare', n - hidden, `Du hast nur die Würfel gezählt, die du siehst. ${KEIN_SCHWEBEN} Manche sind versteckt.`)
    .add('nur-oben', towers(h), 'Du hast nur die oberen Würfel gezählt. Zähle in jedem Turm alle Würfel bis zum Boden.');
  const perRow = h.map((row) => row.reduce((a, b) => a + b, 0));
  return {
    ...base(2, `versteckt:${hid(h)}`),
    ab: 2,
    context: KEIN_SCHWEBEN,
    prompt: 'Wie viele Würfel hat das Gebäude?',
    visual: iso(h),
    answer: { kind: 'number', value: n, unit: 'Würfel' },
    bugs: bugs.list,
    hints: [
      'Zähle Turm für Turm. Wie hoch ist jeder Turm?',
      'Hinter und unter den vorderen Würfeln sind Würfel versteckt. Kein Würfel schwebt.',
      'Schreibe dir einen Bauplan: Zu jedem Feld die Höhe des Turms.',
    ],
    steps: [
      { text: 'So sieht der Bauplan aus. Jede Zahl ist die Höhe eines Turms:', visual: plan(h) },
      h.map((row, r) => `${cap(ROW_WORD(h.length, r))}: ${addUp(row)}`).join('. ') + '.',
      `${sumText(perRow)} = ${fmt(n)}`,
      `Das Gebäude hat ${fmt(n)} Würfel. ${fmt(hidden)} davon ${hidden === 1 ? 'ist' : 'sind'} versteckt.`,
    ],
    praise: praiseFrom(rng, ['Du hast auch an die versteckten Würfel gedacht.', 'Du hast Turm für Turm bis zum Boden gezählt.']),
    srText: `Ein Würfelgebäude, schräg von vorne gezeichnet. ${KEIN_SCHWEBEN} Turmhöhen, Reihe für Reihe: ${speakPlan(h)} Wie viele Würfel hat das Gebäude?`,
  };
}

function readPlanNumber(rng: Rng): Exercise {
  const h = monotone(rng, rng.int(2, 3), rng.int(2, 3), 3);
  const cells: [number, number][] = [];
  h.forEach((row, r) => row.forEach((v, c) => v > 0 && cells.push([r, c])));
  const [r, c] = rng.pick(cells);
  const R = h.length;
  const C = h[0].length;
  const colWord = C === 2 ? (c === 0 ? 'links' : 'rechts') : c === 0 ? 'links' : c === C - 1 ? 'rechts' : 'in der Mitte';
  const rowWord = ROW_WORD(R, r);
  const where = rowWord === 'in der Mitte' && colWord === 'in der Mitte' ? 'genau in der Mitte' : rowWord === 'in der Mitte' ? `in der mittleren Reihe ${colWord}` : `${rowWord} ${colWord}`;
  const value = h[r][c];
  return {
    ...base(2, `bauplan-lesen:${hid(h)}:${r}.${c}`),
    ab: 2,
    context: KEIN_SCHWEBEN,
    prompt: `Welche Zahl steht im Bauplan auf dem Feld ${where}?`,
    visual: iso(h),
    answer: { kind: 'number', value, before: 'Zahl:' },
    hints: [`Suche im Bild den Turm ${where}. Vorne ist unten im Bild.`, 'Zähle die Würfel dieses Turms von unten bis oben – auch die versteckten.'],
    steps: [
      `Der Turm ${where} ist ${fmt(value)} Würfel hoch.`,
      { text: `Im Bauplan steht dort eine ${fmt(value)}.`, visual: plan(h) },
    ],
    praise: praiseFrom(rng, ['Du hast das Bild genau mit dem Bauplan verbunden.', 'Du hast die Turmhöhe sicher bestimmt.']),
    srText: `Ein Würfelgebäude. Turmhöhen: ${speakPlan(h)} Welche Zahl steht im Bauplan auf dem Feld ${where}?`,
  };
}

// ─── Stufe 3 ────────────────────────────────────────────────────────────────

const same = (a: number[], b: number[]) => a.length === b.length && a.every((v, i) => v === b[i]);

/** A silhouette as a visual: front views as one row; side views as one column seen from the right. */
function viewVisual(sil: number[], kind: 'front' | 'side'): Visual {
  if (kind === 'front') return { type: 'cubeBuilding', heights: [sil], view: 'front' };
  return { type: 'cubeBuilding', heights: sil.slice().reverse().map((v) => [v]), view: 'side' };
}

function planToView(rng: Rng): Exercise {
  const kind = rng.pick(['front', 'side'] as const);
  for (;;) {
    const R = rng.int(2, 3);
    const C = rng.int(2, 3);
    const h = anyHeights(rng, R, C, 0, 3);
    if (h.some((row) => row.every((v) => v === 0)) || h[0].every((_, c) => h.every((row) => row[c] === 0))) continue;
    const correct = kind === 'front' ? frontView(h) : sideView(h);
    const cand: { sil: number[]; why: string }[] = [];
    const add = (sil: number[], why: string) => {
      if (sil.some((v) => v > 6) || sil.every((v) => v === 0)) return;
      if (same(sil, correct) || cand.some((x) => same(x.sil, sil))) return;
      cand.push({ sil, why });
    };
    if (kind === 'front') {
      add(correct.slice().reverse(), 'Das ist die Ansicht von hinten: Links und rechts sind vertauscht.');
      add(h[R - 1].slice(), 'Du hast nur die vordere Reihe angeschaut. Höhere Türme dahinter siehst du von vorne auch.');
      add(h[0].map((_, c) => h.reduce((a, row) => a + row[c], 0)), 'Du hast die Würfel hintereinander zusammengezählt. Von vorne siehst du nur den höchsten Turm.');
      add(h[0].slice(), 'Du hast nur die hintere Reihe angeschaut. Von vorne siehst du in jeder Spalte den höchsten Turm.');
    } else {
      add(correct.slice().reverse(), 'Das ist die Ansicht von links: Vorne und hinten sind vertauscht.');
      add(h.map((row) => row[C - 1]).reverse(), 'Du hast nur die rechte Spalte angeschaut. Höhere Türme dahinter siehst du von rechts auch.');
      add(h.map((row) => row.reduce((a, b) => a + b, 0)).reverse(), 'Du hast die Würfel nebeneinander zusammengezählt. Von rechts siehst du nur den höchsten Turm.');
    }
    if (cand.length < 2) continue;
    const wrong = rng.sample(cand, Math.min(3, cand.length));
    const answer = makeChoice(
      rng,
      { label: '', visual: viewVisual(correct, kind) },
      wrong.map((w) => ({ label: '', visual: viewVisual(w.sil, kind), whyWrong: w.why })),
      { layout: 'grid', relabel: (i) => `Ansicht ${letter(i)}` },
    );
    const dir = kind === 'front' ? 'von vorne' : 'von rechts';
    const correctLabel = answer.options[answer.correct].label;
    return {
      ...base(3, `ansicht:${kind}:${hid(h)}`),
      ab: 3,
      knobel: true,
      prompt: `Das ist ein Bauplan. Wie sieht das Gebäude ${dir} aus?`,
      visual: plan(h),
      answer,
      hints: [
        kind === 'front' ? 'Vorne ist im Bauplan unten. Schau von unten auf den Bauplan.' : 'Stell dich in Gedanken rechts neben den Bauplan. Vorne ist dann links.',
        kind === 'front' ? 'In jeder Spalte siehst du nur den höchsten Turm.' : 'In jeder Reihe siehst du nur den höchsten Turm.',
      ],
      steps: [
        kind === 'front'
          ? `Suche in jeder Spalte den höchsten Turm, von links nach rechts: ${correct.map((v) => fmt(v)).join(', ')}.`
          : `Suche in jeder Reihe den höchsten Turm, von vorne nach hinten: ${correct.map((v) => fmt(v)).join(', ')}.`,
        { text: `So sieht das Gebäude ${dir} aus. Richtig ist ${correctLabel}.`, visual: viewVisual(correct, kind) },
      ],
      praise: praiseFrom(rng, ['Du hast in jeder Reihe den höchsten Turm gefunden.', 'Du hast dich in Gedanken auf die richtige Seite gestellt.']),
      srText: `Ein Bauplan: ${speakPlan(h)} Wie sieht das Gebäude ${dir} aus? ${answer.options.map((o) => `${o.label}: Türme mit ${(kind === 'front' ? (o.visual as { heights: number[][] }).heights[0] : (o.visual as { heights: number[][] }).heights.map((r) => r[0]).reverse()).join(', ')} Würfeln`).join('. ')}.`,
    };
  }
}

/** Ansicht von oben: which fields carry a tower (1) – the heights cannot be seen from above. */
const occupied = (h: Heights): Heights => h.map((row) => row.map((v) => (v > 0 ? 1 : 0)));
const topView = (o: Heights): Visual => ({ type: 'cubeBuilding', heights: o, view: 'top' });
const speakTop = (o: Heights): string =>
  o.map((row, r) => `${cap(ROW_WORD(o.length, r))} von links: ${row.map((v) => (v ? 'belegt' : 'leer')).join(', ')}`).join('. ') + '.';

function isoToTop(rng: Rng): Exercise {
  for (;;) {
    const h = monotone(rng, rng.int(2, 3), rng.int(2, 3), 3);
    // a building without empty fields looks the same from above whichever way it is turned
    if (h.flat().every((v) => v > 0)) continue;
    const R = h.length;
    const C = h[0].length;
    const correct = occupied(h);
    const cand: ChoiceOption[] = [];
    const ids = new Set([hid(correct)]);
    const add = (o: Heights, why: string) => {
      if (ids.has(hid(o)) || o.flat().every((v) => v === 0)) return;
      ids.add(hid(o));
      cand.push({ label: '', visual: topView(o), whyWrong: why });
    };
    add(correct.map((row) => row.slice().reverse()), 'Links und rechts sind vertauscht. Schau im Bild: Auf welcher Seite fehlt ein Turm?');
    add(correct.slice().reverse().map((row) => row.slice()), 'Vorne und hinten sind vertauscht. In der Ansicht von oben ist vorne unten.');
    const empty: [number, number][] = [];
    const full: [number, number][] = [];
    correct.forEach((row, r) => row.forEach((v, c) => (v ? full : empty).push([r, c])));
    const [er, ec] = rng.pick(empty);
    add(correct.map((row, r) => row.map((v, c) => (r === er && c === ec ? 1 : v))), 'Auf einem Feld ist hier ein Würfel. Im Gebäude steht dort aber kein Turm.');
    if (full.length > 1) {
      const [fr, fc] = rng.pick(full);
      add(correct.map((row, r) => row.map((v, c) => (r === fr && c === fc ? 0 : v))), 'Hier fehlt ein Feld. Auch einen niedrigen Turm siehst du von oben.');
    }
    if (cand.length < 2) continue;
    const answer = makeChoice(rng, { label: '', visual: topView(correct) }, rng.sample(cand, Math.min(3, cand.length)), {
      layout: 'grid',
      relabel: (i) => `Ansicht ${letter(i)}`,
    });
    const correctLabel = answer.options[answer.correct].label;
    return {
      ...base(3, `ansicht-oben:${hid(h)}`),
      ab: 3,
      knobel: true,
      context: KEIN_SCHWEBEN,
      prompt: 'Wie sieht das Gebäude von oben aus?',
      visual: iso(h),
      answer,
      hints: [
        'Stell dir vor, du schaust von oben auf das Gebäude. Vorne ist dann unten.',
        'Von oben siehst du jedes Feld, auf dem ein Turm steht – egal, wie hoch er ist.',
      ],
      steps: [
        `Turmhöhen: ${speakPlan(h)}`,
        `Von oben siehst du jedes Feld mit mindestens einem Würfel. Leer ${R * C - towers(h) === 1 ? 'ist 1 Feld' : `sind ${fmt(R * C - towers(h))} Felder`}.`,
        { text: `So sieht das Gebäude von oben aus. Richtig ist ${correctLabel}.`, visual: topView(correct) },
      ],
      praise: praiseFrom(rng, ['Du hast dich in Gedanken über das Gebäude gestellt.', 'Du hast genau geschaut, wo kein Turm steht.']),
      srText: `Ein Würfelgebäude, schräg von vorne gezeichnet. Turmhöhen: ${speakPlan(h)} Wie sieht das Gebäude von oben aus? ${answer.options
        .map((o) => `${o.label}: ${speakTop((o.visual as { heights: Heights }).heights)}`)
        .join(' ')}`,
    };
  }
}

function isoToPlan(rng: Rng): Exercise {
  for (;;) {
    const h = monotone(rng, 2, rng.int(2, 3), 3);
    const R = h.length;
    const C = h[0].length;
    const cand: ChoiceOption[] = [];
    const ids = new Set([hid(h)]);
    const add = (p: Heights, why: string) => {
      if (ids.has(hid(p)) || p.flat().some((v) => v < 0 || v > 4)) return;
      ids.add(hid(p));
      cand.push({ label: '', visual: plan(p), whyWrong: why });
    };
    add(h.map((row) => row.slice().reverse()), 'Dieser Bauplan ist seitenverkehrt: Links und rechts sind vertauscht.');
    add(h.slice().reverse().map((row) => row.slice()), 'Bei diesem Bauplan sind vorne und hinten vertauscht. Vorne ist im Bauplan unten.');
    const r = rng.int(0, R - 1);
    const c = rng.int(0, C - 1);
    add(h.map((row, rr) => row.map((v, cc) => (rr === r && cc === c ? (v > 1 ? v - 1 : v + 1) : v))), 'Prüfe jede Turmhöhe. An einer Stelle passt die Zahl nicht – denk an versteckte Würfel.');
    if (cand.length < 2) continue;
    const answer = makeChoice(rng, { label: '', visual: plan(h) }, cand.slice(0, 3), { layout: 'grid', relabel: (i) => `Bauplan ${letter(i)}` });
    return {
      ...base(3, `bauplan-finden:${hid(h)}`),
      ab: 3,
      knobel: true,
      context: KEIN_SCHWEBEN,
      prompt: 'Welcher Bauplan passt zum Gebäude?',
      visual: iso(h),
      answer,
      hints: ['Im Bauplan ist vorne unten und hinten oben.', 'Bestimme für jedes Feld die Höhe des Turms – auch versteckte Würfel zählen.'],
      steps: [
        `Turmhöhen: ${speakPlan(h)}`,
        { text: `Das ist ${answer.options[answer.correct].label}:`, visual: plan(h) },
      ],
      praise: praiseFrom(rng, ['Du hast vorne, hinten, links und rechts genau beachtet.', 'Du hast jede Turmhöhe sorgfältig mit dem Bauplan verglichen.']),
      srText: `Ein Würfelgebäude, schräg von vorne gezeichnet. Turmhöhen: ${speakPlan(h)} Welcher Bauplan passt? ${answer.options.map((o) => `${o.label}: ${speakPlan((o.visual as { heights: Heights }).heights)}`).join(' ')}`,
    };
  }
}

function completeCuboid(rng: Rng): Exercise {
  let h: Heights;
  do h = monotone(rng, 2, rng.int(2, 3), rng.int(2, 3));
  while (Math.max(...h.flat()) < 2);
  const R = h.length;
  const C = h[0].length;
  const H = Math.max(...h.flat());
  const full = R * C * H;
  if (total(h) === full) h[R - 1][C - 1] -= 1; // never already complete
  const n2 = total(h);
  const value = full - n2;
  const bugs = new BugList(value)
    .add('vorhandene', n2, 'Das sind die Würfel, die schon da sind. Gefragt ist, wie viele noch fehlen.')
    .add('ganzer-quader', full, 'So viele Würfel hat der ganze Quader. Ziehe die vorhandenen Würfel ab.');
  return {
    ...base(3, `quader:${hid(h)}`, ['RF.raum', 'PK.problemloesen']),
    ab: 3,
    knobel: true,
    context: KEIN_SCHWEBEN,
    prompt: `Baue das Gebäude zu einem Quader aus ${fmt(R)} Reihen, ${fmt(C)} Spalten und ${fmt(H)} Schichten aus. Wie viele Würfel fehlen noch?`,
    visual: iso(h),
    answer: { kind: 'number', value, unit: 'Würfel', before: 'Es fehlen' },
    bugs: bugs.list,
    hints: [
      'Wie viele Würfel hat der fertige Quader? Eine Schicht hat Reihen · Spalten Würfel.',
      'Wie viele Würfel hat das Gebäude jetzt? Denk an die versteckten.',
      'Ziehe ab.',
    ],
    steps: [
      `Eine Schicht hat ${fmt(R)} · ${fmt(C)} = ${fmt(R * C)} Würfel. ${fmt(H)} Schichten: ${fmt(H)} · ${fmt(R * C)} = ${fmt(full)} Würfel.`,
      `Das Gebäude hat jetzt ${addUp(h.flat())} Würfel.`,
      `${fmt(full)} − ${fmt(n2)} = ${fmt(value)}`,
      `Es fehlen noch ${fmt(value)} Würfel.`,
    ],
    praise: praiseFrom(rng, ['Du hast den ganzen Quader berechnet und das Gebäude abgezogen.', 'Du hast Schichten geschickt genutzt.']),
    srText: `Ein Würfelgebäude, schräg von vorne gezeichnet. ${KEIN_SCHWEBEN} Turmhöhen: ${speakPlan(h)} Baue es zu einem Quader aus ${fmt(R)} Reihen, ${fmt(C)} Spalten und ${fmt(H)} Schichten aus. Wie viele Würfel fehlen noch?`,
  };
}

export const wuerfelgebaeudeSkill: SkillDef = {
  id: ID,
  topicId: 'geometrie',
  title: 'Würfelgebäude',
  description: 'Du zählst Würfel, liest Baupläne und stellst dir Ansichten vor.',
  stufen: {
    1: 'Würfel zählen und Baupläne lesen',
    2: 'Versteckte Würfel mitzählen',
    3: 'Bauplan und Ansichten von vorne, von der Seite und von oben',
  },
  kmk: ['RF.raum'],
  generate(rng, stufe) {
    if (stufe === 1) return rng.chance(0.55) ? planSum(rng, 1) : rowCount(rng);
    if (stufe === 2) {
      const r = rng.next();
      if (r < 0.55) return countHidden(rng);
      if (r < 0.8) return readPlanNumber(rng);
      return planSum(rng, 2);
    }
    const r = rng.next();
    if (r < 0.32) return planToView(rng);
    if (r < 0.5) return isoToTop(rng);
    if (r < 0.75) return isoToPlan(rng);
    return completeCuboid(rng);
  },
};
