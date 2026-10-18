/**
 * Körper erkennen und benennen: Würfel, Quader, Kugel, Zylinder, Kegel, Pyramide, Prisma.
 * Stufe 1: name a drawn solid; find a solid among drawings; can it roll?
 * Stufe 2: everyday objects → Körper.
 * Stufe 3: "Wer bin ich?" riddles and "Welche Flächen hat …?".
 * A Würfel is a special Quader, so "Quader" is never offered as a wrong option for a Würfel.
 * Keys name the question only (solid, object, riddle), not the distractors: the same picture with other
 * distractors is the same question for the child, so the recent-key check keeps it out of a round.
 */
import type { ChoiceOption, Exercise, Rng, SkillDef, SolidKind, Stufe } from '../../core/types';
import { choiceList, letter, makeChoice, praiseFrom } from './shared';
import { CONFUSIONS, SOLIDS, SOLID_KINDS, whyNotSolid } from './solids';

const ID = 'geometrie.koerper';

function base(stufe: Stufe, key: string, kmk: string[] = ['RF.figuren']): Pick<Exercise, 'key' | 'topicId' | 'skillId' | 'stufe' | 'kmk'> {
  return { key: `${ID}:${stufe}:${key}`, topicId: 'geometrie', skillId: ID, stufe, kmk };
}

const PROPERTY: Record<SolidKind, string> = {
  wuerfel: 'Er hat 6 gleich große quadratische Flächen.',
  quader: 'Er hat 6 rechteckige Flächen, nicht alle sind gleich groß.',
  kugel: 'Sie ist überall rund.',
  zylinder: 'Er hat oben und unten einen gleich großen Kreis.',
  kegel: 'Er hat unten einen Kreis und oben eine Spitze.',
  pyramide: 'Sie hat unten ein Quadrat und oben eine Spitze.',
  prisma: 'Es hat vorne und hinten ein gleiches Dreieck.',
};

const SEEK: Record<SolidKind, string> = {
  wuerfel: 'Suche einen Körper mit lauter gleich großen Quadraten als Flächen.',
  quader: 'Suche einen Körper mit rechteckigen Flächen, die nicht alle gleich groß sind.',
  kugel: 'Suche einen Körper, der überall rund ist.',
  zylinder: 'Suche einen Körper mit einem Kreis oben und einem Kreis unten.',
  kegel: 'Suche einen Körper mit einem Kreis unten und einer Spitze oben.',
  pyramide: 'Suche einen Körper mit einem Quadrat unten und einer Spitze oben.',
  prisma: 'Suche einen Körper mit einem Dreieck vorne und einem Dreieck hinten.',
};

/** Distractors for a solid: plausible confusions, but never a superclass (Quader for Würfel). */
function distractors(rng: Rng, actual: SolidKind, n = 3): SolidKind[] {
  const conf = CONFUSIONS[actual].filter((k) => !(actual === 'wuerfel' && k === 'quader'));
  const rest = SOLID_KINDS.filter((k) => k !== actual && !conf.includes(k) && !(actual === 'wuerfel' && k === 'quader'));
  // mostly typical confusions, plus one other solid for variety
  const fromConf = rng.shuffle(conf).slice(0, Math.min(conf.length, n >= 3 ? n - 1 : n));
  const others = rng.shuffle([...rest, ...conf.filter((c) => !fromConf.includes(c))]);
  return [...fromConf, ...others].slice(0, n);
}

const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

// ─── Stufe 1 ────────────────────────────────────────────────────────────────

function nameSolid(rng: Rng): Exercise {
  const solid = rng.pick(SOLID_KINDS);
  const wrong = distractors(rng, solid);
  const f = SOLIDS[solid];
  return {
    ...base(1, `name:${solid}`),
    ab: 1,
    prompt: 'Wie heißt dieser Körper?',
    visual: { type: 'solid', solid },
    answer: makeChoice(rng, { label: cap(f.nom) }, wrong.map((w) => ({ label: cap(SOLIDS[w].nom), whyWrong: whyNotSolid(w, solid) }))),
    hints: ['Schau dir die Flächen an: Sind sie eckig oder rund?', 'Hat der Körper eine Spitze? Kann er rollen?'],
    steps: [`${PROPERTY[solid]}`, `Das ist ${f.ein}.`],
    praise: praiseFrom(rng, ['Du hast genau auf die Flächen geachtet.', 'Du hast den Körper an seinen Flächen erkannt.']),
    srText: `Ein Körper. Er hat ${f.faces}. Wie heißt dieser Körper?`,
  };
}

function findSolid(rng: Rng): Exercise {
  const solid = rng.pick(SOLID_KINDS);
  const wrong = distractors(rng, solid).filter((w) => !(solid === 'quader' && w === 'wuerfel'));
  while (wrong.length < 3) {
    const extra = SOLID_KINDS.find((k) => k !== solid && !wrong.includes(k) && !(solid === 'quader' && k === 'wuerfel'))!;
    wrong.push(extra);
  }
  const f = SOLIDS[solid];
  const answer = makeChoice(
    rng,
    { label: '', visual: { type: 'solid', solid } },
    wrong.map((w) => ({ label: '', visual: { type: 'solid', solid: w }, whyWrong: `Das ist ${SOLIDS[w].nom}. ${PROPERTY[w]}` })),
    { layout: 'grid', relabel: (i) => `Körper ${letter(i)}` },
  );
  return {
    ...base(1, `finde:${solid}`),
    ab: 1,
    prompt: `Welcher Körper ist ${f.ein}?`,
    answer,
    hints: [`Überlege: Wie sieht ${f.ein} aus?`, SEEK[solid]],
    steps: [`${cap(f.ein)}: ${PROPERTY[solid]}`, `Gesucht ist Körper ${answer.options[answer.correct].label.slice(-1)}.`],
    praise: praiseFrom(rng, ['Du hast die Körper genau verglichen.', 'Du hast auf die Form der Flächen geachtet.']),
    srText: `Welcher Körper ist ${f.ein}? Zur Wahl stehen ${answer.options.length} Körper. ${answer.options.map((o) => `${o.label}: ${SOLIDS[(o.visual as { solid: SolidKind }).solid].faces}`).join('. ')}.`,
  };
}

const ROLL: Record<SolidKind, string> = {
  kugel: 'Dieser Körper ist überall rund. Er rollt in jede Richtung.',
  zylinder: 'Dieser Körper hat eine gebogene Fläche. Darauf kann er rollen.',
  kegel: 'Dieser Körper hat eine gebogene Fläche. Darauf kann er im Kreis rollen.',
  wuerfel: 'Dieser Körper hat nur ebene Flächen und Ecken. Er kann kippen, aber nicht rollen.',
  quader: 'Dieser Körper hat nur ebene Flächen und Ecken. Er kann kippen, aber nicht rollen.',
  pyramide: 'Dieser Körper hat nur ebene Flächen und Ecken. Er kann kippen, aber nicht rollen.',
  prisma: 'Dieser Körper hat nur ebene Flächen und Ecken. Er kann kippen, aber nicht rollen.',
};

function canRoll(rng: Rng): Exercise {
  const solid = rng.pick(SOLID_KINDS);
  const f = SOLIDS[solid];
  const yes: ChoiceOption = { label: 'Ja, er kann rollen.' };
  const no: ChoiceOption = { label: 'Nein, er kann nicht rollen.' };
  const answer = f.curved
    ? makeChoice(rng, yes, [{ ...no, whyWrong: ROLL[solid] }], { keepOrder: true, correctIndex: 0 })
    : makeChoice(rng, no, [{ ...yes, whyWrong: ROLL[solid] }], { keepOrder: true, correctIndex: 1 });
  return {
    ...base(1, `rollen:${solid}`),
    ab: 1,
    prompt: 'Kann dieser Körper rollen?',
    visual: { type: 'solid', solid },
    answer,
    hints: ['Hat der Körper eine gebogene Fläche?', 'Ein Körper mit nur ebenen Flächen kann kippen, aber nicht rollen.'],
    steps: [ROLL[solid], `Also: ${f.curved ? 'Ja' : 'Nein'}. Der Körper ist ${f.ein}.`],
    praise: praiseFrom(rng, ['Du hast auf gebogene und ebene Flächen geachtet.', 'Du hast dir genau vorgestellt, wie sich der Körper bewegt.']),
    srText: `Ein Körper. Er hat ${f.faces}. Kann dieser Körper rollen?`,
  };
}

// ─── Stufe 2: everyday objects ──────────────────────────────────────────────

interface ObjectItem {
  id: string;
  text: string;
  emoji?: string;
  solid: SolidKind;
  /** A flat figure children confuse with the solid. */
  flat?: ChoiceOption;
}

const KREIS: ChoiceOption = { label: 'Der Kreis', whyWrong: 'Ein Kreis ist flach. Diesen Gegenstand kannst du rundherum anfassen – er ist ein Körper.' };

const OBJECTS: ObjectItem[] = [
  { id: 'fussball', text: 'Ein Fußball', emoji: '⚽', solid: 'kugel', flat: KREIS },
  { id: 'murmel', text: 'Eine Murmel', emoji: '🔵', solid: 'kugel', flat: KREIS },
  { id: 'orange', text: 'Eine Orange', emoji: '🍊', solid: 'kugel', flat: KREIS },
  { id: 'seifenblase', text: 'Eine Seifenblase', emoji: '🫧', solid: 'kugel', flat: KREIS },
  { id: 'tennisball', text: 'Ein Tennisball', emoji: '🎾', solid: 'kugel', flat: KREIS },
  { id: 'globus', text: 'Ein Globus ohne Ständer', emoji: '🌍', solid: 'kugel', flat: KREIS },
  { id: 'dose', text: 'Eine Konservendose', emoji: '🥫', solid: 'zylinder' },
  { id: 'kerze', text: 'Eine dicke Kerze', emoji: '🕯️', solid: 'zylinder' },
  { id: 'baumstamm', text: 'Ein Baumstamm', emoji: '🪵', solid: 'zylinder' },
  { id: 'klopapier', text: 'Eine Rolle Klopapier', emoji: '🧻', solid: 'zylinder' },
  { id: 'trinkhalm', text: 'Ein Trinkhalm', solid: 'zylinder' },
  { id: 'eistuete', text: 'Eine Eistüte aus Waffel', emoji: '🍦', solid: 'kegel' },
  { id: 'partyhut', text: 'Ein spitzer Partyhut', emoji: '🥳', solid: 'kegel' },
  { id: 'schultuete', text: 'Eine runde Schultüte', solid: 'kegel' },
  { id: 'huetchen', text: 'Ein Hütchen für den Sportunterricht', solid: 'kegel' },
  { id: 'schuhkarton', text: 'Ein Schuhkarton', emoji: '📦', solid: 'quader', flat: { label: 'Das Rechteck', whyWrong: 'Ein Rechteck ist flach. Ein Schuhkarton ist ein Körper mit 6 Flächen.' } },
  { id: 'ziegel', text: 'Ein Ziegelstein', emoji: '🧱', solid: 'quader' },
  { id: 'radiergummi', text: 'Ein Radiergummi', solid: 'quader' },
  { id: 'buch', text: 'Ein dickes Buch', emoji: '📕', solid: 'quader' },
  { id: 'butter', text: 'Ein Stück Butter', emoji: '🧈', solid: 'quader' },
  { id: 'kirchturm', text: 'Ein Kirchturmdach mit quadratischem Boden', emoji: '⛪', solid: 'pyramide' },
  { id: 'aegypten', text: 'Ein großes Bauwerk aus Stein in Ägypten', emoji: '🏜️', solid: 'pyramide' },
  { id: 'zelt', text: 'Ein Zelt mit dreieckigem Eingang', emoji: '⛺', solid: 'prisma' },
  { id: 'kaese', text: 'Ein Stück Käse in Keilform', emoji: '🧀', solid: 'prisma' },
  { id: 'satteldach', text: 'Das Dach eines Hauses mit zwei schrägen Seiten', emoji: '🏠', solid: 'prisma' },
];

function everyday(rng: Rng): Exercise {
  const item = rng.pick(OBJECTS);
  const solidWrong = distractors(rng, item.solid, item.flat ? 2 : 3);
  const wrong: ChoiceOption[] = solidWrong.map((w) => ({ label: cap(SOLIDS[w].nom), whyWrong: whyNotSolid(w, item.solid) }));
  if (item.flat) wrong.push(item.flat);
  const f = SOLIDS[item.solid];
  const prompt = `${item.text}: Welchem Körper sieht das am ähnlichsten?`;
  return {
    ...base(2, `alltag:${item.id}`),
    ab: 2,
    prompt,
    ...(item.emoji ? { emoji: item.emoji } : {}),
    answer: makeChoice(rng, { label: cap(f.nom) }, wrong),
    hints: ['Stell dir den Gegenstand vor dir vor.', 'Hat er Ecken? Ist er rund? Hat er eine Spitze?'],
    steps: [`${cap(f.nom)} hat ${f.faces}.`, `${item.text} hat ungefähr die Form ${f.gen}.`],
    praise: praiseFrom(rng, ['Du hast die Form im Alltag wiedererkannt.', 'Du hast dir den Gegenstand genau vorgestellt.']),
    srText: `${prompt} Zur Wahl: ${choiceList([cap(f.nom), ...wrong.map((w) => w.label)].sort())}`,
  };
}

// ─── Stufe 3 ────────────────────────────────────────────────────────────────

interface Riddle {
  id: string;
  text: string;
  solid: SolidKind;
  wrong: ChoiceOption[];
  knobel?: boolean;
}

const RIDDLES: Riddle[] = [
  {
    id: 'kugel', text: 'Ich bin ein Körper. Ich habe nur eine gebogene Fläche. Ich habe keine Ecken und keine Kanten.', solid: 'kugel',
    wrong: [
      { label: 'Der Kegel', whyWrong: 'Ein Kegel hat eine Kante und eine Spitze.' },
      { label: 'Der Zylinder', whyWrong: 'Ein Zylinder hat zwei Kanten.' },
      { label: 'Der Kreis', whyWrong: 'Ein Kreis ist flach. Gesucht ist ein Körper.' },
    ],
  },
  {
    id: 'kegel', text: 'Ich kann rollen. Ich habe eine Spitze.', solid: 'kegel',
    wrong: [
      { label: 'Die Kugel', whyWrong: 'Eine Kugel hat keine Spitze.' },
      { label: 'Die Pyramide', whyWrong: 'Eine Pyramide hat eine Spitze, aber sie kann nicht rollen.' },
      { label: 'Der Zylinder', whyWrong: 'Ein Zylinder kann rollen, hat aber keine Spitze.' },
    ],
  },
  {
    id: 'wuerfel', text: 'Ich habe 6 Flächen. Alle sind gleich große Quadrate.', solid: 'wuerfel',
    wrong: [
      { label: 'Das Prisma', whyWrong: 'Ein Prisma hat 5 Flächen, zwei davon sind Dreiecke.' },
      { label: 'Die Pyramide', whyWrong: 'Eine Pyramide hat 5 Flächen und eine Spitze.' },
      { label: 'Das Quadrat', whyWrong: 'Ein Quadrat ist eine flache Figur. Gesucht ist ein Körper mit 6 Flächen.' },
    ],
  },
  {
    id: 'quader', text: 'Ich habe 6 rechteckige Flächen. Nicht alle meine Kanten sind gleich lang.', solid: 'quader',
    wrong: [
      { label: 'Der Würfel', whyWrong: 'Beim Würfel sind alle Kanten gleich lang.' },
      { label: 'Das Prisma', whyWrong: 'Ein Prisma hat 5 Flächen, zwei davon sind Dreiecke.' },
      { label: 'Der Zylinder', whyWrong: 'Ein Zylinder hat runde Flächen.' },
    ],
  },
  {
    id: 'pyramide', text: 'Meine Grundfläche ist ein Quadrat. Meine anderen Flächen sind Dreiecke. Oben habe ich eine Spitze.', solid: 'pyramide',
    wrong: [
      { label: 'Der Kegel', whyWrong: 'Ein Kegel hat einen Kreis als Grundfläche.' },
      { label: 'Das Prisma', whyWrong: 'Ein Prisma hat keine Spitze.' },
      { label: 'Der Würfel', whyWrong: 'Ein Würfel hat nur Quadrate als Flächen.' },
    ],
  },
  {
    id: 'prisma', text: 'Ich habe 2 Dreiecke und 3 Rechtecke als Flächen.', solid: 'prisma',
    wrong: [
      { label: 'Die Pyramide', whyWrong: 'Eine Pyramide mit quadratischer Grundfläche hat 4 Dreiecke und eine Spitze.' },
      { label: 'Der Quader', whyWrong: 'Ein Quader hat nur Rechtecke als Flächen.' },
      { label: 'Der Kegel', whyWrong: 'Ein Kegel hat eine Kreisfläche und eine gebogene Fläche.' },
    ],
  },
  {
    id: 'zylinder', text: 'Ich habe 2 Kreise als Flächen und eine gebogene Fläche. Ich kann rollen.', solid: 'zylinder',
    wrong: [
      { label: 'Der Kegel', whyWrong: 'Ein Kegel hat nur einen Kreis.' },
      { label: 'Die Kugel', whyWrong: 'Eine Kugel hat keine flachen Kreisflächen.' },
      { label: 'Das Prisma', whyWrong: 'Ein Prisma hat Dreiecke und Rechtecke, aber keine Kreise.' },
    ],
  },
  {
    id: 'stapeln', text: 'Ich kann rollen. Man kann mich gut stapeln. Ich habe keine Spitze.', solid: 'zylinder',
    wrong: [
      { label: 'Die Kugel', whyWrong: 'Eine Kugel kann rollen, aber auf ihr bleibt nichts liegen. Man kann sie nicht gut stapeln.' },
      { label: 'Der Kegel', whyWrong: 'Ein Kegel hat eine Spitze.' },
      { label: 'Der Würfel', whyWrong: 'Einen Würfel kann man gut stapeln, aber er kann nicht rollen.' },
    ],
  },
  {
    id: 'acht-ecken', text: 'Ich habe 8 Ecken und 12 Kanten. Meine Flächen sind Rechtecke, aber nicht alle gleich groß.', solid: 'quader',
    wrong: [
      { label: 'Der Würfel', whyWrong: 'Ein Würfel hat 8 Ecken und 12 Kanten, aber alle seine Flächen sind gleich große Quadrate.' },
      { label: 'Das Prisma', whyWrong: 'Ein Prisma hat 6 Ecken und 9 Kanten.' },
      { label: 'Die Pyramide', whyWrong: 'Eine Pyramide hat 5 Ecken und 8 Kanten.' },
    ],
  },
  {
    id: 'neun-kanten', text: 'Ich habe 6 Ecken und 9 Kanten.', solid: 'prisma', knobel: true,
    wrong: [
      { label: 'Die Pyramide', whyWrong: 'Eine Pyramide hat 5 Ecken und 8 Kanten.' },
      { label: 'Der Würfel', whyWrong: 'Ein Würfel hat 8 Ecken und 12 Kanten.' },
      { label: 'Der Zylinder', whyWrong: 'Ein Zylinder hat keine Ecken.' },
    ],
  },
  {
    id: 'fuenf-ecken', text: 'Ich kann nicht rollen. Ich habe genau 5 Ecken.', solid: 'pyramide', knobel: true,
    wrong: [
      { label: 'Das Prisma', whyWrong: 'Ein Prisma hat 6 Ecken: 3 vorne und 3 hinten.' },
      { label: 'Der Würfel', whyWrong: 'Ein Würfel hat 8 Ecken.' },
      { label: 'Der Kegel', whyWrong: 'Ein Kegel kann rollen. Er hat eine Spitze, aber keine Ecken.' },
    ],
  },
];

function riddle(rng: Rng): Exercise {
  const r = rng.pick(RIDDLES);
  const f = SOLIDS[r.solid];
  return {
    ...base(3, `raetsel:${r.id}`, ['RF.figuren', 'PK.argumentieren']),
    ab: 3,
    knobel: r.knobel,
    context: r.text,
    prompt: 'Wer bin ich?',
    answer: makeChoice(rng, { label: cap(f.nom) }, r.wrong),
    hints: ['Lies jeden Satz einzeln und streiche Körper, die nicht passen.', 'Stell dir jeden Körper vor: Wie viele Flächen, Ecken und Kanten hat er?'],
    steps: [
      'Prüfe jeden Hinweis einzeln.',
      `${cap(f.nom)} hat ${f.faces}${f.curved ? '' : `, ${f.ecken} Ecken und ${f.kanten} Kanten`}.`,
      { text: `Alle Hinweise passen zu ${f.dat}.`, visual: { type: 'solid', solid: r.solid } },
    ],
    praise: praiseFrom(rng, ['Du hast jeden Hinweis einzeln geprüft.', 'Du hast Körper, die nicht passen, geschickt ausgeschlossen.']),
    srText: `Rätsel: ${r.text} Wer bin ich? Zur Wahl: ${choiceList([cap(f.nom), ...r.wrong.map((w) => w.label)].sort())}`,
  };
}

const FACES: Record<SolidKind, string> = {
  wuerfel: '6 gleich große Quadrate',
  quader: '6 Rechtecke',
  kugel: '1 gebogene Fläche',
  zylinder: '2 Kreise und 1 gebogene Fläche',
  kegel: '1 Kreis und 1 gebogene Fläche',
  pyramide: '1 Quadrat und 4 Dreiecke',
  prisma: '2 Dreiecke und 3 Rechtecke',
};

function whichFaces(rng: Rng): Exercise {
  const solid = rng.pick(SOLID_KINDS);
  const wrongSolids = distractors(rng, solid).filter((w) => FACES[w] !== FACES[solid]);
  const f = SOLIDS[solid];
  return {
    ...base(3, `flaechen:${solid}`),
    ab: 3,
    prompt: `Welche Flächen hat ${f.ein}?`,
    visual: { type: 'solid', solid },
    answer: makeChoice(rng, { label: FACES[solid] }, wrongSolids.map((w) => ({ label: FACES[w], whyWrong: `Diese Flächen hat ${SOLIDS[w].ein}.` }))),
    hints: ['Stell dir vor, du stellst den Körper auf ein Stempelkissen. Welche Abdrücke entstehen?', 'Zähle alle Flächen, auch die versteckten hinten und unten.'],
    steps: [`Schau dir alle Seiten ${f.gen} an, auch hinten und unten.`, `${cap(f.ein)} hat ${FACES[solid]}.`],
    praise: praiseFrom(rng, ['Du hast auch an die versteckten Flächen gedacht.', 'Du hast jede Fläche des Körpers beachtet.']),
    srText: `Welche Flächen hat ${f.ein}? Zur Wahl: ${[FACES[solid], ...wrongSolids.map((w) => FACES[w])].join('; ')}.`,
  };
}

export const koerperSkill: SkillDef = {
  id: ID,
  topicId: 'geometrie',
  title: 'Körper erkennen',
  description: 'Du erkennst Würfel, Quader, Kugel, Zylinder, Kegel, Pyramide und Prisma.',
  stufen: {
    1: 'Körper benennen, finden und rollen lassen',
    2: 'Körper im Alltag wiedererkennen',
    3: 'Körper-Rätsel und Flächen',
  },
  kmk: ['RF.figuren'],
  generate(rng, stufe) {
    if (stufe === 1) {
      const r = rng.next();
      if (r < 0.45) return nameSolid(rng);
      if (r < 0.75) return findSolid(rng);
      return canRoll(rng);
    }
    if (stufe === 2) return everyday(rng);
    return rng.chance(0.55) ? riddle(rng) : whichFaces(rng);
  },
};
