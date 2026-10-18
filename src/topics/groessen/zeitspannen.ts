/**
 * Zeitspannen: Anfang, Ende, Dauer; Zeiteinheiten s, min, h, Tag, Woche, Monat, Jahr.
 * Durations are always written in mixed notation ('1 h 25 min'), never as decimal hours.
 * Stufe 1: time units (3 h = 180 min, Viertelstunde), spans within one hour or up to the full hour.
 * Stufe 2: spans across hours (8:45 Uhr → 10:20 Uhr), Anfangs-/Endzeitpunkt, h min ↔ min.
 * Stufe 3: overnight spans, three-step journeys, weeks between dates, larger conversions.
 */
import { fmtDuration, fmtTime, NBSP, TIMES } from '../../core/format';
import type { Bug, Exercise, MultiField, Rng, SkillDef, Step, Stufe } from '../../core/types';
import { build, multiBugs, numberBugs, pickPerson, safeHints, speak } from './helpers';

/** Minutes since midnight → '14:05 Uhr' (wraps at 24 h). */
export function clock(t: number): string {
  const d = ((t % 1440) + 1440) % 1440;
  return fmtTime(Math.floor(d / 60), d % 60);
}

/** Worked steps for the duration from start to end (minutes since midnight; end may be next day, then the steps go via midnight). */
export function spanSteps(start: number, end: number): Step[] {
  const steps: Step[] = [];
  const hops: number[] = [];
  let at = start;
  const hop = (to: number) => {
    if (to > at && to <= end) {
      // arriving at midnight is written '24:00 Uhr'; the next step starts at '0:00 Uhr'
      steps.push(`${clock(at)} → ${to === 1440 ? fmtTime(24, 0) : clock(to)}: ${fmtDuration(to - at)}`);
      hops.push(to - at);
      at = to;
    }
  };
  hop(Math.ceil(at / 60) * 60);
  if (end > 1440) hop(1440);
  hop(Math.floor(end / 60) * 60);
  hop(end);
  if (hops.length > 1) steps.push(`${hops.map(fmtDuration).join(' + ')} = ${fmtDuration(end - start)}`);
  return steps;
}

/** Steps for start + duration → end. */
function endSteps(start: number, dur: number): Step[] {
  const h = Math.floor(dur / 60);
  const m = dur % 60;
  const steps: Step[] = [];
  let at = start;
  if (h > 0) {
    steps.push(`${clock(at)} + ${h}${NBSP}h = ${clock(at + h * 60)}`);
    at += h * 60;
  }
  if (m > 0) {
    const toFull = 60 - (at % 60);
    if (at % 60 !== 0 && m > toFull) {
      steps.push(`${clock(at)} + ${toFull}${NBSP}min = ${clock(at + toFull)}`);
      steps.push(`${clock(at + toFull)} + ${m - toFull}${NBSP}min = ${clock(at + m)}`);
    } else {
      steps.push(`${clock(at)} + ${m}${NBSP}min = ${clock(at + m)}`);
    }
  }
  return steps;
}

/** Steps for end − duration → start (hours first, then minutes in steps down to the full hour). */
function backSteps(end: number, dur: number): Step[] {
  const h = Math.floor(dur / 60);
  const m = dur % 60;
  const steps: Step[] = [];
  let at = end;
  if (h > 0) {
    steps.push(`${clock(at)} − ${h}${NBSP}h = ${clock(at - h * 60)}`);
    at -= h * 60;
  }
  if (m > 0) {
    const toFull = at % 60;
    if (toFull > 0 && m > toFull) {
      steps.push(`${clock(at)} − ${toFull}${NBSP}min = ${clock(at - toFull)}`);
      steps.push(`${clock(at - toFull)} − ${m - toFull}${NBSP}min = ${clock(at - m)}`);
    } else {
      steps.push(`${clock(at)} − ${m}${NBSP}min = ${clock(at - m)}`);
    }
  }
  return steps;
}

function durationFields(total: number): MultiField[] {
  return [
    { id: 'h', value: Math.floor(total / 60), after: 'h', label: 'Stunden' },
    { id: 'min', value: total % 60, after: 'min', label: 'Minuten' },
  ];
}

function timeFields(t: number): MultiField[] {
  const d = ((t % 1440) + 1440) % 1440;
  return [
    { id: 'h', value: Math.floor(d / 60), after: ':', label: 'Stunden' },
    { id: 'min', value: d % 60, after: 'Uhr', label: 'Minuten' },
  ];
}

/** "Hundert-Minuten-Stunde": subtracting clock times like decimal numbers (10:20 − 8:45 → 175 → 1 h 75 min). */
export function decimalSpan(start: number, end: number): { h: number; min: number } {
  const a = Math.floor(start / 60) * 100 + (start % 60);
  const b = Math.floor(end / 60) * 100 + (end % 60);
  const d = b - a;
  return { h: Math.floor(d / 100), min: d % 100 };
}

const HUNDRED_HINT = 'Eine Stunde hat 60 Minuten, nicht 100. Ergänze zuerst bis zur vollen Stunde.';

/**
 * Every situation has a plausible duration (minutes) and plausible start hours, so that the numbers
 * support the child's sense of time (a film lasts about 2 h, a cake bakes under an hour).
 */
interface Timed {
  min: number;
  max: number;
  /** Earliest and latest start hour. */
  from: number;
  to: number;
}

interface Event extends Timed {
  context: (name: string, a: string, b: string) => string;
  question: (name: string) => string;
}

const SPANS: readonly Event[] = [
  { min: 10, max: 180, from: 6, to: 20, context: (n, a, b) => `${n} fährt um ${a} mit dem Bus los. Um ${b} kommt der Bus an.`, question: () => 'Wie lange dauert die Fahrt?' },
  { min: 80, max: 150, from: 13, to: 20, context: (_n, a, b) => `Der Kinofilm beginnt um ${a}. Er endet um ${b}.`, question: () => 'Wie lange dauert der Film?' },
  { min: 60, max: 240, from: 9, to: 17, context: (n, a, b) => `${n} geht um ${a} ins Schwimmbad. Um ${b} geht es nach Hause.`, question: (n) => `Wie lange ist ${n} im Schwimmbad?` },
  { min: 60, max: 120, from: 14, to: 18, context: (_n, a, b) => `Das Fußballtraining beginnt um ${a}. Es ist um ${b} zu Ende.`, question: () => 'Wie lange dauert das Training?' },
  { min: 60, max: 300, from: 8, to: 13, context: (_n, a, b) => `Die Wanderung startet um ${a}. Die Klasse kommt um ${b} an der Hütte an.`, question: () => 'Wie lange wandert die Klasse?' },
  { min: 25, max: 70, from: 8, to: 18, context: (_n, a, b) => `Der Kuchen kommt um ${a} in den Ofen. Um ${b} ist er fertig.`, question: () => 'Wie lange backt der Kuchen?' },
  { min: 120, max: 300, from: 9, to: 15, context: (_n, a, b) => `Das Schulfest beginnt um ${a}. Es endet um ${b}.`, question: () => 'Wie lange dauert das Schulfest?' },
  { min: 15, max: 150, from: 8, to: 19, context: (n, a, b) => `${n} beginnt um ${a} mit einem Puzzle. Um ${b} ist das Puzzle fertig.`, question: (n) => `Wie lange puzzelt ${n}?` },
  { min: 15, max: 120, from: 9, to: 17, context: (n, a, b) => `${n} geht um ${a} in die Bücherei. Um ${b} geht es wieder nach Hause.`, question: (n) => `Wie lange ist ${n} in der Bücherei?` },
];

interface Forward extends Timed {
  context: (name: string, pr: string, start: string, dur: string) => string;
  question: (name: string) => string;
}

const FORWARD: readonly Forward[] = [
  { min: 80, max: 150, from: 13, to: 20, context: (_n, _p, a, d) => `Der Film beginnt um ${a}. Er dauert ${d}.`, question: () => 'Wann ist der Film zu Ende?' },
  { min: 10, max: 240, from: 6, to: 20, context: (n, _p, a, d) => `${n} fährt um ${a} los. Die Fahrt dauert ${d}.`, question: (n) => `Wann kommt ${n} an?` },
  { min: 60, max: 80, from: 9, to: 19, context: (_n, _p, a, d) => `Das Handballspiel beginnt um ${a}. Es dauert mit Pause ${d}.`, question: () => 'Wann ist das Spiel zu Ende?' },
  { min: 15, max: 75, from: 8, to: 19, context: (n, p, a, d) => `${n} beginnt um ${a} mit dem Aufräumen. ${p} braucht ${d}.`, question: (n) => `Wann ist ${n} fertig?` },
];

const BACKWARD: readonly Forward[] = [
  { min: 10, max: 240, from: 6, to: 20, context: (_n, _p, a, d) => `Der Zug kommt um ${a} an. Die Fahrt dauert ${d}.`, question: () => 'Wann ist der Zug losgefahren?' },
  { min: 120, max: 420, from: 8, to: 14, context: (_n, _p, a, d) => `Der Ausflug endet um ${a}. Er hat ${d} gedauert.`, question: () => 'Wann hat der Ausflug begonnen?' },
  { min: 15, max: 90, from: 12, to: 18, context: (n, p, a, d) => `${n} ist um ${a} mit den Hausaufgaben fertig. ${p} hat ${d} gebraucht.`, question: (n) => `Wann hat ${n} angefangen?` },
  { min: 35, max: 70, from: 7, to: 17, context: (_n, _p, a, d) => `Das Brot ist um ${a} fertig gebacken. Es war ${d} im Ofen.`, question: () => 'Wann kam das Brot in den Ofen?' },
];

const NIGHT: Event = {
  min: 480, max: 720, from: 19, to: 23,
  context: (n, a, b) => `${n} geht um ${a} schlafen. Am Morgen wacht ${n} um ${b} auf.`,
  question: (n) => `Wie lange schläft ${n}?`,
};

/** Situations that fit a span from `start` lasting `dur` minutes; the first (a bus or train ride) fits almost always. */
function fitting<T extends Timed>(list: readonly T[], start: number, dur: number): T[] {
  const ok = list.filter((e) => dur >= e.min && dur <= e.max && start >= e.from * 60 && start <= e.to * 60 + 59);
  return ok.length ? ok : [list[0]];
}

// ─── Stufe 1 ─────────────────────────────────────────────────────────────────

interface UnitConv { key: string; expr: string; value: number; unit: string; bugs: (Bug | false)[]; hint: string; step: string; praise: string }

/** Unit names after 'Ergebnis in …' (dative plural). */
const UNIT_LABEL: Record<string, string> = { min: 'Minuten', h: 'Stunden', s: 'Sekunden', Tage: 'Tagen', Wochen: 'Wochen', Monate: 'Monaten' };

function timeUnit(rng: Rng): UnitConv {
  const v = rng.int(1, 8);
  if (v === 1) {
    const n = rng.int(2, 5);
    return { key: `h-min:${n}`, expr: `${n}${NBSP}h = □${NBSP}min`, value: n * 60, unit: 'min', bugs: [{ id: 'hundert', match: n * 100, hint: 'Eine Stunde hat 60 Minuten, nicht 100.' }], hint: 'Wie viele Minuten hat eine Stunde?', step: `${n} ${TIMES} 60${NBSP}min = ${n * 60}${NBSP}min`, praise: 'Du hast mit 1\u00A0h = 60\u00A0min gerechnet.' };
  }
  if (v === 2) {
    const n = rng.int(2, 6);
    return { key: `min-h:${n}`, expr: `${n * 60}${NBSP}min = □${NBSP}h`, value: n, unit: 'h', bugs: [{ id: 'zehner', match: n * 6, hint: 'Teile durch 60, denn eine Stunde hat 60 Minuten.' }], hint: 'Wie oft passen 60 Minuten hinein?', step: `${n * 60} : 60 = ${n}, also ${n * 60}${NBSP}min = ${n}${NBSP}h`, praise: 'Du hast durch 60 geteilt, weil 1\u00A0h 60\u00A0min hat.' };
  }
  if (v === 3) {
    const n = rng.int(2, 5);
    return { key: `min-s:${n}`, expr: `${n}${NBSP}min = □${NBSP}s`, value: n * 60, unit: 's', bugs: [{ id: 'hundert', match: n * 100, hint: 'Eine Minute hat 60 Sekunden, nicht 100.' }], hint: 'Wie viele Sekunden hat eine Minute?', step: `${n} ${TIMES} 60${NBSP}s = ${n * 60}${NBSP}s`, praise: 'Du hast mit 1\u00A0min = 60\u00A0s gerechnet.' };
  }
  if (v === 4) {
    const which = rng.pick([['Viertelstunde', 15, 25, 'ein Viertel'], ['halbe Stunde', 30, 50, 'die Hälfte'], ['Dreiviertelstunde', 45, 75, 'drei Viertel']] as const);
    const n = rng.int(1, 3);
    const label = n === 1 ? `1 ${which[0]}` : `${n} ${which[0] === 'halbe Stunde' ? 'halbe Stunden' : which[0] + 'n'}`;
    return {
      key: `bruch:${which[1]}:${n}`,
      expr: `${label} = □${NBSP}min`,
      value: n * which[1],
      unit: 'min',
      bugs: [{ id: 'hundert', match: n * which[2], hint: 'Eine ganze Stunde hat 60 Minuten, nicht 100. Nimm davon den passenden Teil.' }],
      hint: `Eine Stunde hat 60 Minuten. Wie viel ist ${which[3]} davon?`,
      step: n === 1 ? `1 ${which[0]} = ${which[1]}${NBSP}min` : `${n} ${TIMES} ${which[1]}${NBSP}min = ${n * which[1]}${NBSP}min`,
      praise: `Du hast gewusst: Eine ${which[0]} hat ${which[1]} Minuten.`,
    };
  }
  if (v === 5) {
    const n = rng.int(2, 4);
    return { key: `tag-h:${n}`, expr: `${n} Tage = □${NBSP}h`, value: n * 24, unit: 'h', bugs: [{ id: 'zwoelf', match: n * 12, hint: 'Ein Tag hat 24 Stunden: Tag und Nacht zusammen.' }], hint: 'Wie viele Stunden hat ein Tag?', step: `${n} ${TIMES} 24${NBSP}h = ${n * 24}${NBSP}h`, praise: 'Du hast mit 1 Tag = 24 Stunden gerechnet.' };
  }
  if (v === 6) {
    const n = rng.int(2, 8);
    return { key: `woche-tag:${n}`, expr: `${n} Wochen = □ Tage`, value: n * 7, unit: 'Tage', bugs: [{ id: 'schultage', match: n * 5, hint: 'Eine Woche hat 7 Tage, auch Samstag und Sonntag.' }], hint: 'Wie viele Tage hat eine Woche?', step: `${n} ${TIMES} 7 Tage = ${n * 7} Tage`, praise: 'Du hast mit 1 Woche = 7 Tage gerechnet.' };
  }
  if (v === 7) {
    const n = rng.int(2, 5);
    return { key: `jahr-monat:${n}`, expr: `${n} Jahre = □ Monate`, value: n * 12, unit: 'Monate', bugs: [{ id: 'zehn', match: n * 10, hint: 'Ein Jahr hat 12 Monate, von Januar bis Dezember.' }], hint: 'Wie viele Monate hat ein Jahr?', step: `${n} ${TIMES} 12 Monate = ${n * 12} Monate`, praise: 'Du hast mit 1 Jahr = 12 Monate gerechnet.' };
  }
  const n = rng.int(2, 6);
  return { key: `tage-woche:${n}`, expr: `${n * 7} Tage = □ Wochen`, value: n, unit: 'Wochen', bugs: [{ id: 'durch-5', match: (n * 7) / 5, hint: 'Eine Woche hat 7 Tage. Teile durch 7.' }], hint: 'Wie oft passen 7 Tage hinein?', step: `${n * 7} : 7 = ${n}`, praise: 'Du hast durch 7 geteilt, weil eine Woche 7 Tage hat.' };
}

function unitExercise(stufe: Stufe, rng: Rng): Exercise {
  const u = timeUnit(rng);
  return build(zeitspannenSkill, stufe, {
    key: `einheit:${u.key}`,
    ab: 1,
    prompt: 'Wandle um.',
    expression: u.expr,
    answer: { kind: 'number', value: u.value, unit: u.unit, label: `Ergebnis in ${UNIT_LABEL[u.unit]}` },
    hints: safeHints([u.hint], u.value, 'Denke an die Umrechnungszahl.'),
    steps: [u.step],
    bugs: numberBugs(u.bugs, u.value),
    praise: u.praise,
    srText: `Wandle um. ${speak(u.expr)}`,
    kmk: ['GM.zeit', 'GM.einheiten'],
  });
}

function shortSpan(stufe: Stufe, rng: Rng): Exercise {
  const who = pickPerson(rng);
  const h = rng.int(7, 17);
  const toFull = rng.chance(0.5);
  const m1 = rng.int(1, 8) * 5;
  const start = h * 60 + m1;
  const end = toFull ? (h + 1) * 60 : h * 60 + Math.min(11, rng.int(m1 / 5 + 3, 13)) * 5;
  const value = end - start;
  const ev = rng.pick(fitting(SPANS, start, value));
  const context = ev.context(who.name, clock(start), clock(end));
  const question = ev.question(who.name);
  return build(zeitspannenSkill, stufe, {
    key: `kurz:${start}:${end}`,
    ab: 1,
    context,
    prompt: question,
    answer: { kind: 'number', value, unit: 'min', label: 'Dauer in Minuten' },
    hints: safeHints(['Zähle von der Anfangszeit bis zur Endzeit.', 'Eine Stunde hat 60 Minuten.'], value, 'Ergänze bis zur Endzeit.'),
    steps: [...spanSteps(start, end), `Es dauert ${fmtDuration(value)}.`],
    bugs: numberBugs(
      [
        toFull && { id: 'hundert', match: 100 - m1, hint: HUNDRED_HINT },
        end % 60 > 0 && { id: 'endzeit', match: end % 60, hint: 'Das sind die Minuten der Endzeit. Gefragt ist, wie lange es dauert.' },
      ],
      value,
    ),
    praise: toFull ? 'Du hast bis zur vollen Stunde ergänzt.' : 'Du hast von der Anfangszeit bis zur Endzeit weitergezählt.',
    srText: `${speak(context)} ${question} Antworte in Minuten.`,
    kmk: ['GM.zeit'],
  });
}

// ─── Stufe 2 ─────────────────────────────────────────────────────────────────

function duration(stufe: Stufe, rng: Rng, overnight = false): Exercise {
  const who = pickPerson(rng);
  let start: number;
  let end: number;
  if (overnight) {
    start = rng.int(19, 22) * 60 + rng.int(0, 11) * 5;
    end = 24 * 60 + rng.int(5, 8) * 60 + rng.int(0, 11) * 5;
  } else {
    // Mostly the end minutes are smaller than the start minutes (8:45 → 10:20), so the full hour is crossed.
    const h1 = rng.int(7, 16);
    const m1 = rng.int(1, 11) * 5;
    const cross = rng.chance(0.75);
    const dh = cross ? rng.int(2, 3) : rng.int(1, 2);
    const m2 = cross ? rng.int(0, m1 / 5 - 1) * 5 : rng.int(m1 / 5, 11) * 5;
    start = h1 * 60 + m1;
    end = (h1 + dh) * 60 + m2;
  }
  const total = end - start;
  const fields = durationFields(total);
  const ev: Event = overnight ? NIGHT : rng.pick(fitting(SPANS, start, total));
  const context = ev.context(who.name, clock(start), clock(end));
  const question = ev.question(who.name);
  const dec = decimalSpan(start, overnight ? end - 1440 : end);
  const bugs: Bug[] = [];
  if (!overnight) {
    bugs.push({ id: 'hundert', match: dec, hint: HUNDRED_HINT });
    const hDiff = Math.floor(end / 60) - Math.floor(start / 60);
    bugs.push({ id: 'kleiner-von-groesser', match: { h: hDiff, min: Math.abs((end % 60) - (start % 60)) }, hint: 'Rechne nicht die Minuten einfach umgekehrt. Ergänze lieber bis zur vollen Stunde.' });
  } else {
    const s2 = start / 60;
    const e2 = (end - 1440) / 60;
    const back = Math.round((s2 - e2) * 60);
    bugs.push({ id: 'rueckwaerts', match: { h: Math.floor(back / 60), min: back % 60 }, hint: 'Das ist die Zeit vom Aufwachen bis zum Schlafengehen. Rechne vom Abend über Mitternacht bis zum Morgen.' });
    bugs.push({ id: 'bis-mitternacht', match: { h: Math.floor((1440 - start) / 60), min: (1440 - start) % 60 }, hint: 'Das ist nur die Zeit bis Mitternacht. Zähle die Stunden bis zum Aufwachen dazu.' });
  }
  return build(zeitspannenSkill, stufe, {
    key: `dauer:${overnight ? 'nacht:' : ''}${start}:${end}`,
    ab: overnight ? 3 : 2,
    context,
    prompt: question,
    answer: { kind: 'multi', fields },
    hints: overnight
      ? ['Rechne in Schritten: erst bis Mitternacht (24:00 Uhr), dann bis zum Morgen.', 'Ergänze zuerst bis zur vollen Stunde.']
      : ['Ergänze zuerst bis zur nächsten vollen Stunde.', 'Zähle dann die ganzen Stunden und die restlichen Minuten dazu.'],
    steps: [...spanSteps(start, end), `Es dauert ${fmtDuration(total)}.`],
    bugs: multiBugs(bugs, fields),
    praise: overnight
      ? 'Du hast über Mitternacht hinweg gerechnet.'
      : end % 60 < start % 60
        ? 'Du hast zuerst bis zur vollen Stunde ergänzt und dann weitergezählt.'
        : 'Du hast erst die ganzen Stunden und dann die Minuten gezählt.',
    srText: `${speak(context)} ${question} Schreibe in Stunden und Minuten.`,
    kmk: ['GM.zeit'],
  });
}

function endTime(stufe: Stufe, rng: Rng, backwards: boolean): Exercise {
  const who = pickPerson(rng);
  const start = rng.int(8, 17) * 60 + rng.int(1, 11) * 5;
  let dur = rng.int(4, 23) * 5;
  if (rng.chance(0.5)) dur += 60;
  // make the minutes cross the full hour most of the time
  if ((start % 60) + (dur % 60) < 60 && rng.chance(0.7)) dur = Math.floor(dur / 60) * 60 + (65 - (start % 60)) + rng.int(0, 4) * 5;
  const end = start + dur;
  const fields = timeFields(backwards ? start : end);
  const durText = fmtDuration(dur);
  const pr = who.p === 'sie' ? 'Sie' : 'Er';
  const tpl = rng.pick(fitting(backwards ? BACKWARD : FORWARD, start, dur));
  const ctx = tpl.context(who.name, pr, clock(backwards ? end : start), durText);
  const question = tpl.question(who.name);
  const bugs: Bug[] = [];
  if (!backwards) {
    const naive = Math.floor(start / 60) * 100 + (start % 60) + Math.floor(dur / 60) * 100 + (dur % 60);
    bugs.push({ id: 'hundert', match: { h: Math.floor(naive / 100), min: naive % 100 }, hint: 'Eine Stunde hat nur 60 Minuten. Bei 60 Minuten beginnt die nächste Stunde.' });
    bugs.push({ id: 'rueckwaerts', match: { h: Math.floor((start - dur) / 60), min: (start - dur) % 60 }, hint: 'Das Ende kommt nach dem Anfang. Rechne vorwärts.' });
    const sumMin = (start % 60) + (dur % 60);
    if (sumMin >= 60) bugs.push({ id: 'ohne-uebertrag', match: { h: Math.floor(start / 60) + Math.floor(dur / 60), min: sumMin }, hint: `${sumMin} Minuten gibt es auf der Uhr nicht. Nach 60 Minuten beginnt die nächste Stunde.` });
  } else {
    const naive = Math.floor(end / 60) * 100 + (end % 60) - (Math.floor(dur / 60) * 100 + (dur % 60));
    bugs.push({ id: 'hundert', match: { h: Math.floor(naive / 100), min: naive % 100 }, hint: 'Eine Stunde hat 60 Minuten, nicht 100. Rechne erst bis zur vollen Stunde zurück.' });
    bugs.push({ id: 'vorwaerts', match: { h: Math.floor((end + dur) / 60) % 24, min: (end + dur) % 60 }, hint: 'Der Anfang liegt vor dem Ende. Rechne rückwärts.' });
  }
  return build(zeitspannenSkill, stufe, {
    key: `${backwards ? 'anfang' : 'ende'}:${start}:${dur}:${backwards ? BACKWARD.indexOf(tpl) : FORWARD.indexOf(tpl)}`,
    ab: backwards ? 3 : 2,
    context: ctx,
    prompt: question,
    answer: { kind: 'multi', fields },
    hints: backwards
      ? ['Rechne von der Endzeit rückwärts.', 'Ziehe zuerst die Stunden ab, dann die Minuten in Schritten bis zur vollen Stunde.']
      : ['Zähle zuerst die ganzen Stunden dazu.', 'Gehe dann mit den Minuten in Schritten über die volle Stunde.'],
    steps: backwards
      ? [...backSteps(end, dur), `Anfang: ${clock(start)}`]
      : [...endSteps(start, dur), `Ende: ${clock(end)}`],
    bugs: multiBugs(bugs, fields),
    praise: backwards
      ? 'Du hast rückwärts über die volle Stunde gerechnet.'
      : (start % 60) + (dur % 60) >= 60
        ? 'Du hast mit den Minuten über die volle Stunde hinweg gerechnet.'
        : 'Du hast erst die Stunden und dann die Minuten dazugezählt.',
    srText: `${speak(ctx)} ${question} Schreibe zuerst die Stunden, dann die Minuten.`,
    kmk: ['GM.zeit'],
  });
}

function mixedMinutes(stufe: Stufe, rng: Rng): Exercise {
  const big = stufe === 3;
  const h = big ? rng.int(3, 9) : rng.int(1, 3);
  const m = rng.chance(0.4) ? rng.int(1, 9) : rng.int(2, 11) * 5;
  const total = h * 60 + m;
  if (rng.chance(0.5)) {
    const expr = `${h}${NBSP}h ${m}${NBSP}min = □${NBSP}min`;
    return build(zeitspannenSkill, stufe, {
      key: `hmin-min:${h}:${m}`,
      ab: 2,
      prompt: 'Wandle um.',
      expression: expr,
      answer: { kind: 'number', value: total, unit: 'min', label: 'Dauer in Minuten' },
      hints: safeHints(['Wandle zuerst die Stunden in Minuten um.', 'Eine Stunde hat 60 Minuten. Zähle dann die Minuten dazu.'], total, 'Eine Stunde hat 60 Minuten.'),
      steps: [`${h}${NBSP}h = ${h} ${TIMES} 60${NBSP}min = ${h * 60}${NBSP}min`, `${h * 60}${NBSP}min + ${m}${NBSP}min = ${total}${NBSP}min`],
      bugs: numberBugs(
        [
          { id: 'hundert', match: h * 100 + m, hint: 'Eine Stunde hat 60 Minuten, nicht 100.' },
          { id: 'nur-addiert', match: h + m, hint: 'Wandle zuerst die Stunden in Minuten um.' },
        ],
        total,
      ),
      praise: 'Du hast die Stunden in Minuten umgewandelt und die Minuten dazugezählt.',
      srText: `Wandle um. ${speak(expr)}`,
      kmk: ['GM.zeit', 'GM.einheiten'],
    });
  }
  const expr = `${total}${NBSP}min = □${NBSP}h □${NBSP}min`;
  const fields = durationFields(total);
  return build(zeitspannenSkill, stufe, {
    key: `min-hmin:${total}`,
    ab: 2,
    prompt: 'Wandle um.',
    expression: expr,
    answer: { kind: 'multi', fields },
    hints: ['Wie viele ganze Stunden zu 60 Minuten passen hinein?', 'Die übrigen Minuten schreibst du hinter die Stunden.'],
    steps: [`${h} ${TIMES} 60${NBSP}min = ${h * 60}${NBSP}min`, `${total}${NBSP}min − ${h * 60}${NBSP}min = ${m}${NBSP}min`, `${total}${NBSP}min = ${fmtDuration(total)}`],
    bugs: multiBugs([{ id: 'hundert', match: { h: Math.floor(total / 100), min: total % 100 }, hint: 'Eine Stunde hat 60 Minuten, nicht 100.' }], fields),
    praise: 'Du hast die ganzen Stunden zu je 60 Minuten abgetrennt.',
    srText: `Wandle um in Stunden und Minuten. ${speak(expr)}`,
    kmk: ['GM.zeit', 'GM.einheiten'],
  });
}

// ─── Stufe 3 ─────────────────────────────────────────────────────────────────

function journey(stufe: Stufe, rng: Rng): Exercise {
  const who = pickPerson(rng);
  const start = rng.int(7, 15) * 60 + rng.int(0, 11) * 5;
  const leg1 = rng.int(5, 16) * 5 + (rng.chance(0.5) ? 60 : 0);
  const wait = rng.int(2, 5) * 5;
  const leg2 = rng.int(3, 10) * 5;
  const end = start + leg1 + wait + leg2;
  const fields = timeFields(end);
  const pr = who.p === 'sie' ? 'Sie' : 'Er';
  const context = `${who.name} fährt um ${clock(start)} mit dem Zug los. Die Fahrt dauert ${fmtDuration(leg1)}. Dann wartet ${who.p} ${wait}${NBSP}min. ${pr} fährt noch ${leg2}${NBSP}min mit dem Bus.`;
  const without = (t: number) => ({ h: Math.floor(t / 60), min: t % 60 });
  return build(zeitspannenSkill, stufe, {
    key: `reise:${start}:${leg1}:${wait}:${leg2}`,
    ab: 3,
    knobel: true,
    context,
    prompt: `Wann kommt ${who.name} an?`,
    emoji: '🚆',
    answer: { kind: 'multi', fields },
    hints: ['Rechne Schritt für Schritt: Zug, Warten, Bus.', 'Du kannst auch zuerst alle Zeiten addieren und dann zur Abfahrtszeit dazuzählen.'],
    steps: [
      `Zug: ${clock(start)} + ${fmtDuration(leg1)} = ${clock(start + leg1)}`,
      `Warten: ${clock(start + leg1)} + ${wait}${NBSP}min = ${clock(start + leg1 + wait)}`,
      `Bus: ${clock(start + leg1 + wait)} + ${leg2}${NBSP}min = ${clock(end)}`,
      `${who.name} kommt um ${clock(end)} an.`,
    ],
    bugs: multiBugs(
      [
        { id: 'warten-vergessen', match: without(end - wait), hint: 'Vergiss die Wartezeit nicht. Auch beim Warten vergeht Zeit.' },
        { id: 'bus-vergessen', match: without(end - leg2), hint: 'Nach dem Warten fährt das Kind noch mit dem Bus.' },
        { id: 'nur-zug', match: without(start + leg1), hint: 'Das ist erst die Ankunft des Zuges. Rechne weiter.' },
      ],
      fields,
    ),
    praise: 'Du hast alle drei Zeitabschnitte nacheinander dazugezählt.',
    srText: `${speak(context)} Wann kommt ${who.name} an? Schreibe zuerst die Stunden, dann die Minuten.`,
    kmk: ['GM.zeit', 'GM.sachsituationen'],
  });
}

/** Trips with the holiday months in which they usually happen (3 weeks only in the summer holidays). */
const TRIPS: readonly { where: string; months: string[] }[] = [
  { where: 'ins Zeltlager', months: ['Juli', 'August'] },
  { where: 'ins Ferienlager', months: ['Juli', 'August'] },
  { where: 'an die Nordsee', months: ['Juli', 'August'] },
  { where: 'zu den Großeltern', months: ['Juli', 'August', 'Oktober', 'Dezember'] },
  { where: 'in die Berge', months: ['Juli', 'August'] },
];

function weeks(stufe: Stufe, rng: Rng): Exercise {
  const t = rng.pick(TRIPS);
  const n = rng.int(2, 3);
  const month = rng.pick(n === 3 ? t.months.filter((x) => x === 'Juli' || x === 'August') : t.months);
  const trip = t.where;
  const d1 = rng.int(1, 31 - 7 * n);
  const d2 = d1 + 7 * n;
  const who = pickPerson(rng);
  const context = `${who.name} fährt am ${d1}. ${month} ${trip}. Am ${d2}. ${month} fährt ${who.p} wieder nach Hause.`;
  return build(zeitspannenSkill, stufe, {
    key: `wochen:${month}:${d1}:${n}:${trip}`,
    ab: 3,
    context,
    prompt: `Wie viele Wochen ist ${who.name} weg?`,
    emoji: '📅',
    answer: { kind: 'number', value: n, before: 'Es sind', after: 'Wochen.', label: 'Anzahl der Wochen' },
    hints: ['Wie viele Tage liegen dazwischen?', 'Eine Woche hat 7 Tage.'],
    steps: [`${d2} − ${d1} = ${d2 - d1} Tage`, `${d2 - d1} : 7 = ${n}`, `Es sind ${n} Wochen.`],
    bugs: numberBugs(
      [
        { id: 'tage', match: d2 - d1, hint: 'Das sind Tage. Gefragt sind Wochen. Eine Woche hat 7 Tage.' },
        { id: 'schultage', match: (d2 - d1) / 5, hint: 'Eine Woche hat 7 Tage, auch Samstag und Sonntag.' },
      ],
      n,
    ),
    praise: 'Du hast die Tage gezählt und in Wochen umgerechnet.',
    srText: `${context} Wie viele Wochen ist ${who.name} weg?`,
    kmk: ['GM.zeit', 'GM.einheiten'],
  });
}

export const zeitspannenSkill: SkillDef = {
  id: 'groessen.zeitspannen',
  topicId: 'groessen',
  title: 'Zeitspannen',
  description: 'Du rechnest aus, wie lange etwas dauert und wann es beginnt oder endet.',
  stufen: {
    1: 'Zeiteinheiten umwandeln, kurze Zeitspannen',
    2: 'Über die volle Stunde: Dauer, Anfang, Ende',
    3: 'Über Nacht, mehrere Abschnitte, Wochen',
  },
  kmk: ['GM.zeit', 'GM.einheiten'],
  generate(rng, stufe) {
    if (stufe === 1) return rng.chance(0.5) ? unitExercise(1, rng) : shortSpan(1, rng);
    if (stufe === 2) {
      const v = rng.int(1, 4);
      if (v === 1) return duration(2, rng);
      if (v === 2) return endTime(2, rng, false);
      if (v === 3) return endTime(2, rng, true);
      return mixedMinutes(2, rng);
    }
    const v = rng.int(1, 4);
    if (v === 1) return duration(3, rng, true);
    if (v === 2) return journey(3, rng);
    if (v === 3) return weeks(3, rng);
    return mixedMinutes(3, rng);
  },
};
