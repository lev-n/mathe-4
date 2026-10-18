/**
 * Uhrzeit lesen: analoge Uhr, Sprechweise ('halb drei', 'Viertel nach acht'), 24-Stunden-Schreibweise.
 * Stufe 1: analog in 5-min steps (Vormittag), spoken form ↔ clock.
 * Stufe 2: afternoon/evening times in 24-h notation, spoken ↔ digital.
 * Stufe 3: minute-exact reading, 'fünf vor halb', clocks that run fast/slow, minutes to the full hour.
 */
import { fmtTime, NBSP } from '../../core/format';
import type { Bug, ChoiceOption, Exercise, MultiField, Rng, SkillDef, Stufe } from '../../core/types';
import { build, makeChoice, multiBugs, numberBugs, safeHints } from './helpers';

const PRAISE_HALB = 'Du hast bei „halb“ an die nächste volle Stunde gedacht.';
const PRAISE_VOR = 'Du hast bei „vor“ an die nächste volle Stunde gedacht.';
const PRAISE_PM = 'Du hast nach 12 Uhr richtig weitergezählt.';

const HOUR_WORDS = ['zwölf', 'eins', 'zwei', 'drei', 'vier', 'fünf', 'sechs', 'sieben', 'acht', 'neun', 'zehn', 'elf', 'zwölf'];

/** 1–12 */
export function h12(h: number): number {
  const x = h % 12;
  return x === 0 ? 12 : x;
}

/** Spoken German time for 5-minute steps: spoken(8, 15) → 'Viertel nach acht', spoken(2, 30) → 'halb drei'. */
export function spoken(h: number, m: number): string {
  const cur = h12(h);
  const next = h12(cur + 1);
  const w = (x: number) => HOUR_WORDS[x];
  switch (m) {
    case 0: return cur === 1 ? 'ein Uhr' : `${w(cur)} Uhr`;
    case 5: return `fünf nach ${w(cur)}`;
    case 10: return `zehn nach ${w(cur)}`;
    case 15: return `Viertel nach ${w(cur)}`;
    case 20: return `zwanzig nach ${w(cur)}`;
    case 25: return `fünf vor halb ${w(next)}`;
    case 30: return `halb ${w(next)}`;
    case 35: return `fünf nach halb ${w(next)}`;
    case 40: return `zwanzig vor ${w(next)}`;
    case 45: return `Viertel vor ${w(next)}`;
    case 50: return `zehn vor ${w(next)}`;
    case 55: return `fünf vor ${w(next)}`;
    default: throw new RangeError(`spoken: minutes must be a multiple of 5, got ${m}`);
  }
}

/** Part of the day for a 24-h hour. */
export function dayPart(h: number): string {
  if (h >= 5 && h <= 9) return 'Morgen';
  if (h >= 10 && h <= 11) return 'Vormittag';
  if (h >= 12 && h <= 13) return 'Mittag';
  if (h >= 14 && h <= 17) return 'Nachmittag';
  if (h >= 18 && h <= 21) return 'Abend';
  return 'Nacht';
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function dayPartPhrase(h: number): string {
  const p = dayPart(h);
  return p === 'Nacht' ? 'in der Nacht' : `am ${p}`;
}

/** Screen-reader description of the hands (same wording as ClockVisual). */
export function describeHands(h: number, m: number): string {
  const cur = h12(h);
  const next = h12(cur + 1);
  const hour = m === 0 ? `Der kurze Stundenzeiger zeigt auf die ${cur}.` : `Der kurze Stundenzeiger steht zwischen der ${cur} und der ${next}.`;
  const num = m === 0 ? 12 : Math.floor(m / 5);
  const rest = m % 5;
  const minute = rest === 0
    ? `Der lange Minutenzeiger zeigt auf die ${num === 0 ? 12 : num}.`
    : `Der lange Minutenzeiger steht ${rest} ${rest === 1 ? 'Strich' : 'Striche'} nach der ${num === 0 ? 12 : num}.`;
  return `${hour} ${minute}`;
}

function timeFields(h: number, m: number): MultiField[] {
  return [
    { id: 'h', value: h, after: ':', label: 'Stunden' },
    { id: 'min', value: m, after: 'Uhr', label: 'Minuten' },
  ];
}

/** Typical misreadings of an analog clock showing h:m (h 0–23 as intended answer). */
function readingBugs(h: number, m: number, pm: boolean): Bug[] {
  const bugs: Bug[] = [];
  if (m % 5 === 0 && m > 0) {
    const swappedH = m / 5;
    bugs.push({ id: 'zeiger-vertauscht', match: { h: pm ? swappedH + 12 : swappedH, min: (h12(h) * 5) % 60 }, hint: 'Der kurze Zeiger zeigt die Stunden, der lange Zeiger die Minuten.' });
  }
  if (m >= 30) bugs.push({ id: 'naechste-stunde', match: { h: h + 1, min: m }, hint: 'Der kurze Zeiger ist noch nicht bei der nächsten Zahl. Diese Stunde ist noch nicht vorbei.' });
  if (pm) bugs.push({ id: 'ohne-12', match: { h: h - 12, min: m }, hint: 'Nach 12 Uhr mittags zählst du weiter: 13 Uhr, 14 Uhr, 15 Uhr …' });
  return bugs;
}

// ─── Variants ────────────────────────────────────────────────────────────────

/** Analog clock → digital (Stufe 1: Vormittag, Stufe 2: afternoon/evening, Stufe 3: 1-min). */
function readClock(stufe: Stufe, rng: Rng): Exercise {
  const pm = stufe >= 2 && (stufe === 2 || rng.chance(0.6));
  const h = pm ? rng.int(13, 22) : rng.int(6, 11);
  const m = stufe === 3 ? rng.int(1, 59) : rng.int(0, 11) * 5;
  const mm = stufe === 3 && m % 5 === 0 ? m + 1 : m;
  const fields = timeFields(h, mm);
  const part = dayPart(h);
  return build(uhrzeitSkill, stufe, {
    key: `lesen:${h}:${mm}`,
    ab: stufe === 3 ? 2 : stufe,
    prompt: `Es ist ${part}. Wie spät ist es? Schreibe mit Ziffern.`,
    visual: { type: 'clock', hours: h, minutes: mm },
    answer: { kind: 'multi', fields },
    hints: [
      'Lies zuerst den kurzen Zeiger: Welche Stunde hat schon begonnen?',
      stufe === 3 ? 'Zähle beim langen Zeiger in Fünferschritten und dann die einzelnen Striche.' : 'Zähle beim langen Zeiger in Fünferschritten.',
      ...(pm ? ['Nach 12 Uhr mittags zählst du weiter: Rechne die Stunde plus 12.'] : []),
    ],
    steps: [
      `Der kurze Zeiger steht ${mm === 0 ? 'auf' : 'nach'} der ${h12(h)}. Die Stunde ist ${h12(h)}.`,
      `Der lange Zeiger zeigt ${mm} ${mm === 1 ? 'Minute' : 'Minuten'}.`,
      ...(pm ? [`Es ist ${part}: ${h12(h)} + 12 = ${h}`] : []),
      `Es ist ${fmtTime(h, mm)}.`,
    ],
    bugs: multiBugs(readingBugs(h, mm, pm), fields),
    praise: pm
      ? PRAISE_PM
      : stufe === 3
        ? 'Du hast die Minuten am langen Zeiger genau abgelesen.'
        : mm >= 30
          ? 'Du hast erkannt: Der kurze Zeiger ist noch nicht bei der nächsten Stunde.'
          : 'Du hast den kurzen und den langen Zeiger gut unterschieden.',
    srText: `Es ist ${part}. Wie spät ist es? ${describeHands(h, mm)} Schreibe die Uhrzeit mit Ziffern: zuerst die Stunden, dann die Minuten.`,
    kmk: ['GM.zeit'],
  });
}

/**
 * Wrong spoken forms with an explanation. analog = a clock with hands is shown; otherwise only the digital time
 * (h in 24-h notation), so the explanations talk about minutes and hours instead of hands.
 */
function spokenDistractors(h: number, m: number, analog = true): ChoiceOption[] {
  const out: ChoiceOption[] = [];
  const halfish = m >= 25 && m <= 35;
  const shown = fmtTime(h, m);
  const nextWord = HOUR_WORDS[h12(h + 1)];
  out.push({
    label: spoken(h12(h) - 1 === 0 ? 12 : h12(h) - 1, m),
    whyWrong: halfish
      ? 'Bei „halb“ nennst du die nächste volle Stunde: „halb neun“ heißt 30 Minuten vor neun.'
      : m > 35
        ? 'Bei „vor“ nennst du die nächste volle Stunde.'
        : analog
          ? 'Schau genau auf den kurzen Zeiger: Welche Zahl hat er gerade überschritten?'
          : `Bei „nach“ nennst du die Stunde, die schon begonnen hat. Bei ${shown} ist das ${HOUR_WORDS[h12(h)]}.`,
  });
  out.push({
    label: spoken(h12(h) + 1, m),
    whyWrong: analog
      ? 'Der kurze Zeiger hat die nächste Zahl noch nicht erreicht.'
      : m >= 25
        ? `Bei „${halfish ? 'halb' : 'vor'}“ nennst du die nächste volle Stunde. Nach ${shown} kommt als Nächstes ${h + 1} Uhr, also ${nextWord}.`
        : `Bei „nach“ nennst du die Stunde, die schon begonnen hat. Bei ${shown} ist das ${HOUR_WORDS[h12(h)]}.`,
  });
  if (m === 25 || m === 35) {
    out.push({
      label: spoken(h, 60 - m),
      whyWrong: analog
        ? 'Steht der lange Zeiger vor oder nach der 6? Davor heißt es „vor halb“, danach „nach halb“.'
        : `${shown} ist 5 Minuten ${m === 25 ? 'vor' : 'nach'} halb. Deshalb heißt es „fünf ${m === 25 ? 'vor' : 'nach'} halb“.`,
    });
  } else if (m !== 0 && m !== 30) {
    out.push({
      label: spoken(m > 30 ? h12(h) + 1 : h12(h) - 1 === 0 ? 12 : h12(h) - 1, 60 - m),
      whyWrong: analog
        ? 'Rechts von der 12 heißt es „nach“, links von der 12 heißt es „vor“.'
        : m < 30
          ? `Bei ${shown} sind ${m} Minuten nach der vollen Stunde vergangen. Deshalb heißt es „nach“.`
          : `Bei ${shown} fehlen noch ${60 - m} Minuten bis zur vollen Stunde. Deshalb heißt es „vor“.`,
    });
  }
  if (analog && m % 5 === 0 && m > 0 && m / 5 !== h12(h)) {
    out.push({ label: spoken(m / 5, (h12(h) * 5) % 60), whyWrong: 'Der kurze Zeiger zeigt die Stunden, der lange Zeiger die Minuten.' });
  }
  return out;
}

/** Analog clock → choose the spoken form. */
function chooseSpoken(stufe: Stufe, rng: Rng): Exercise {
  const h = rng.int(1, 12);
  const m = rng.pick([0, 15, 30, 45, 30, 15, 45, 5, 10, 20, 40, 50, 55, 25, 35].filter((x) => stufe >= 2 || ![25, 35].includes(x)));
  const right = spoken(h, m);
  const answer = makeChoice(rng, { label: right }, rng.shuffle(spokenDistractors(h, m)));
  return build(uhrzeitSkill, stufe, {
    key: `sprechen:${h}:${m}`,
    ab: 1,
    prompt: 'Wie sagt man zu dieser Uhrzeit?',
    visual: { type: 'clock', hours: h, minutes: m },
    answer,
    hints: ['Wo steht der lange Zeiger: rechts („nach“) oder links („vor“)?', 'Bei „halb“ und „vor“ nennst du die nächste volle Stunde.'],
    steps: [describeHands(h, m), `Man sagt: ${right}.`],
    praise: m === 0
      ? 'Du hast erkannt: Der lange Zeiger steht auf der 12, es ist eine volle Stunde.'
      : m >= 25 && m <= 35
        ? PRAISE_HALB
        : m >= 40
          ? PRAISE_VOR
          : 'Du hast erkannt: Steht der lange Zeiger rechts von der 12, heißt es „nach“.',
    srText: `Wie sagt man zu dieser Uhrzeit? ${describeHands(h, m)} Wähle aus: ${answer.options.map((o) => o.label).join('; ')}.`,
    kmk: ['GM.zeit'],
  });
}

/** Spoken + part of day → digital (24 h on Stufe 2/3). */
function spokenToDigital(stufe: Stufe, rng: Rng): Exercise {
  const pm = stufe >= 2 && rng.chance(0.75);
  const h = pm ? rng.int(13, 21) : rng.int(6, 11);
  const options = stufe === 1 ? [0, 15, 30, 45] : stufe === 2 ? [15, 30, 45, 10, 20, 40, 50] : [25, 35, 40, 20, 5, 55];
  const m = rng.pick(options);
  const words = spoken(h, m);
  const part = dayPartPhrase(h);
  const fields = timeFields(h, m);
  const bugs: Bug[] = [];
  if (m >= 25) bugs.push({ id: 'halb-verwechselt', match: { h: h + 1, min: m }, hint: `Bei „${words}“ ist es noch nicht ${HOUR_WORDS[h12(h + 1)]} Uhr. Diese Stunde hat noch nicht begonnen.` });
  if (m >= 40) bugs.push({ id: 'vor-nach', match: { h: h + 1, min: 60 - m }, hint: '„vor“ heißt: Es fehlen noch Minuten bis zur vollen Stunde.' });
  if (m === 25) bugs.push({ id: 'fuenf-vor-halb', match: { h, min: 35 }, hint: '„fünf vor halb“ heißt: 5 Minuten bevor es halb ist.' });
  if (m === 35) bugs.push({ id: 'fuenf-nach-halb', match: { h, min: 25 }, hint: '„fünf nach halb“ heißt: 5 Minuten nachdem es halb war.' });
  if (pm) bugs.push({ id: 'ohne-12', match: { h: h - 12, min: m }, hint: `${cap(part)} ist es nach 12 Uhr mittags. Zähle weiter: 13, 14, 15 …` });
  return build(uhrzeitSkill, stufe, {
    key: `digital:${h}:${m}`,
    ab: stufe === 1 ? 1 : 2,
    prompt: `Schreibe mit Ziffern: ${words} ${part}.`,
    answer: { kind: 'multi', fields },
    hints: [
      m >= 25 ? 'Bei „halb“ und „vor“ ist die genannte Stunde noch nicht erreicht.' : '„nach“ heißt: Die Stunde hat schon begonnen.',
      ...(pm ? ['Nach 12 Uhr mittags zählst du weiter: Rechne die Stunde plus 12.'] : ['Wie viele Minuten sind ein Viertel, wie viele eine halbe Stunde?']),
    ],
    steps: [
      m === 0 ? `${cap(words)} heißt: genau ${h12(h)} Uhr.` : `${cap(words)} heißt: ${m} Minuten nach ${h12(h)}.`,
      ...(pm ? [`${cap(part)}: ${h12(h)} + 12 = ${h}`] : []),
      `Es ist ${fmtTime(h, m)}.`,
    ],
    bugs: multiBugs(bugs, fields),
    praise: m >= 25
      ? `${m <= 35 ? PRAISE_HALB : PRAISE_VOR}${pm ? ' Und du hast nach 12 Uhr weitergezählt.' : ''}`
      : pm
        ? PRAISE_PM
        : m === 0
          ? 'Du hast die volle Stunde richtig mit Ziffern geschrieben.'
          : 'Du hast „nach“ richtig in Minuten übersetzt.',
    srText: `Schreibe die Uhrzeit mit Ziffern: ${words} ${part}. Zuerst die Stunden, dann die Minuten.`,
    kmk: ['GM.zeit'],
  });
}

/** Digital 24 h → spoken (choice). */
function digitalToSpoken(stufe: Stufe, rng: Rng): Exercise {
  const h = rng.int(13, 23);
  const m = rng.pick([15, 30, 45, 30, 10, 20, 40, 50]);
  const right = spoken(h, m);
  const shown = fmtTime(h, m);
  const answer = makeChoice(rng, { label: right }, rng.shuffle(spokenDistractors(h, m, false)));
  return build(uhrzeitSkill, stufe, {
    key: `ansage:${h}:${m}`,
    ab: 2,
    prompt: `Wie sagt man zu ${shown}?`,
    expression: shown,
    answer,
    hints: [`Ziehe 12 ab: Welche Stunde ist das auf der Uhr mit Zeigern?`, 'Bei „halb“ und „vor“ nennst du die nächste volle Stunde.'],
    steps: [
      `${h} − 12 = ${h - 12}`,
      m < 30
        ? `${shown} ist ${m} Minuten nach ${h - 12} Uhr.`
        : m === 30
          ? `${shown} ist eine halbe Stunde nach ${h - 12} Uhr, also eine halbe Stunde vor ${h - 11} Uhr.`
          : `${shown} ist ${60 - m} Minuten vor ${h - 11} Uhr.`,
      `Man sagt: ${right}.`,
    ],
    praise: m >= 25 && m <= 35 ? PRAISE_HALB : m >= 40 ? PRAISE_VOR : 'Du hast 12 abgezogen und die Uhrzeit richtig gesagt.',
    srText: `Wie sagt man zu ${shown}? Wähle aus: ${answer.options.map((o) => o.label).join('; ')}.`,
    kmk: ['GM.zeit'],
  });
}

/** Clock runs fast or slow (Knobel). */
function wrongClock(stufe: Stufe, rng: Rng): Exercise {
  const fast = rng.chance(0.5);
  const diff = rng.pick([5, 10, 15, 20]);
  const realH = rng.int(7, 20);
  const realM = rng.int(0, 11) * 5;
  const real = realH * 60 + realM;
  const shownT = real + (fast ? diff : -diff);
  const sh = Math.floor(shownT / 60);
  const sm = shownT % 60;
  const fields = timeFields(realH, realM);
  const other = real + (fast ? 2 * diff : -2 * diff);
  return build(uhrzeitSkill, stufe, {
    key: `uhr-${fast ? 'vor' : 'nach'}:${sh}:${sm}:${diff}`,
    ab: 3,
    knobel: true,
    context: `Die Küchenuhr geht ${diff} Minuten ${fast ? 'vor' : 'nach'}. Sie zeigt ${fmtTime(sh, sm)}.`,
    prompt: 'Wie spät ist es wirklich?',
    emoji: '⏰',
    answer: { kind: 'multi', fields },
    hints: [`„Die Uhr geht vor“ heißt: Sie zeigt schon eine spätere Zeit. „Sie geht nach“ heißt: Sie ist noch nicht so weit.`, fast ? 'Ist die wirkliche Zeit früher oder später als die Anzeige?' : 'Muss die wirkliche Zeit später oder früher sein als die Anzeige?'],
    steps: [
      fast ? `Die Uhr ist ${diff} Minuten zu weit.` : `Die Uhr ist ${diff} Minuten zurück.`,
      `${fmtTime(sh, sm)} ${fast ? '−' : '+'} ${diff}${NBSP}min = ${fmtTime(realH, realM)}`,
      `Es ist wirklich ${fmtTime(realH, realM)}.`,
    ],
    bugs: multiBugs([{ id: 'andere-richtung', match: { h: Math.floor(other / 60), min: other % 60 }, hint: fast ? 'Die Uhr geht vor: Sie zeigt mehr als die wirkliche Zeit. Ziehe ab.' : 'Die Uhr geht nach: Sie zeigt weniger als die wirkliche Zeit. Zähle dazu.' }], fields),
    praise: 'Du hast überlegt, ob die wirkliche Zeit früher oder später ist.',
    srText: `Die Küchenuhr geht ${diff} Minuten ${fast ? 'vor' : 'nach'}. Sie zeigt ${fmtTime(sh, sm)}. Wie spät ist es wirklich? Schreibe zuerst die Stunden, dann die Minuten.`,
    kmk: ['GM.zeit', 'PK.problemloesen'],
  });
}

/** Minutes until the full hour from an analog clock. */
function toFullHour(stufe: Stufe, rng: Rng): Exercise {
  const h = rng.int(1, 12);
  const m = rng.int(7, 58);
  const value = 60 - m;
  return build(uhrzeitSkill, stufe, {
    key: `bis-voll:${h}:${m}`,
    ab: 2,
    prompt: 'Wie viele Minuten fehlen bis zur nächsten vollen Stunde?',
    visual: { type: 'clock', hours: h, minutes: m },
    answer: { kind: 'number', value, unit: 'min', label: 'Minuten bis zur vollen Stunde' },
    hints: safeHints(['Lies zuerst die Minuten am langen Zeiger ab.', 'Eine Stunde hat 60 Minuten. Wie viele fehlen bis 60?'], value, 'Ergänze bis 60.'),
    steps: [`Der lange Zeiger zeigt ${m} Minuten.`, `60 − ${m} = ${value}`, `Es fehlen ${value} Minuten.`],
    bugs: numberBugs(
      [
        { id: 'minuten-abgelesen', match: m, hint: 'Das sind die Minuten, die schon vergangen sind. Gefragt ist, wie viele noch fehlen.' },
        { id: 'bis-100', match: 100 - m, hint: 'Eine Stunde hat 60 Minuten, nicht 100.' },
      ],
      value,
    ),
    praise: 'Du hast bis 60 Minuten ergänzt.',
    srText: `Wie viele Minuten fehlen bis zur nächsten vollen Stunde? ${describeHands(h, m)}`,
    kmk: ['GM.zeit'],
  });
}

export const uhrzeitSkill: SkillDef = {
  id: 'groessen.uhrzeit',
  topicId: 'groessen',
  title: 'Uhrzeit',
  description: 'Du liest die Uhr und sagst Uhrzeiten auf verschiedene Arten.',
  stufen: {
    1: 'Uhr ablesen in 5-Minuten-Schritten',
    2: 'Nachmittag und Abend: 13 bis 23 Uhr',
    3: 'Minutengenau ablesen, Uhren, die vor- oder nachgehen',
  },
  kmk: ['GM.zeit'],
  generate(rng, stufe) {
    if (stufe === 1) {
      const v = rng.int(1, 3);
      if (v === 1) return readClock(1, rng);
      if (v === 2) return chooseSpoken(1, rng);
      return spokenToDigital(1, rng);
    }
    if (stufe === 2) {
      const v = rng.int(1, 4);
      if (v === 1) return readClock(2, rng);
      if (v === 2) return digitalToSpoken(2, rng);
      if (v === 3) return chooseSpoken(2, rng);
      return spokenToDigital(2, rng);
    }
    const v = rng.int(1, 4);
    if (v === 1) return readClock(3, rng);
    if (v === 2) return wrongClock(3, rng);
    if (v === 3) return spokenToDigital(3, rng);
    return toFullHour(3, rng);
  },
};
