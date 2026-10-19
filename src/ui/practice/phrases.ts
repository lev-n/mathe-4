/**
 * German phrase bank for the practice flow (docs/research.md M15, §6.4).
 * Process and effort praise only; no trait or speed praise, no superlatives, never "falsch".
 */
import { formatAnswer } from '../../core/check';
import { BOX, fmt, toSpeech } from '../../core/format';
import type { Answer, AnswerOf, Exercise, Stufe } from '../../core/types';

/** Shown in the heading of a correct answer. */
export const CORRECT_HEADING = 'Richtig!';

/** Solved on the 2nd try: effort praise (rotates). */
export const EFFORT_PHRASES = [
  'Geschafft – du bist drangeblieben.',
  'Du hast es noch einmal versucht und es geschafft.',
  'Gut, dass du noch einmal genau hingeschaut hast.',
  'Du hast den Hinweis genutzt und es geschafft.',
  'Beim zweiten Versuch hat es geklappt.',
  'Du hast nicht aufgegeben.',
] as const;

export const RETRY_HEADING = 'Noch nicht ganz – probier es noch einmal.';
export const SOLUTION_HEADING = 'Lass uns das zusammen anschauen.';
export const SOLUTION_PREFIX = 'Die Lösung: ';

/** Normalising sentences (at most one per session). */
export const NORMALISING_PHRASES = [
  'Fehler helfen beim Lernen.',
  'Knifflige Aufgaben sind Training für deinen Kopf.',
  'Das kannst du noch nicht ganz – aber du lernst es gerade.',
] as const;

export const TWIN_NOTE = 'Gleich kommt eine ähnliche Aufgabe. Dann weißt du, worauf du achten musst.';

/** A Zwillingsaufgabe solved first try after the worked solution: a small, calm acknowledgement (M16; rotates). */
export const TWIN_SOLVED_PHRASES = [
  'Diesmal hast du es auf Anhieb gelöst.',
  'Du hast genutzt, was du im Lösungsweg gesehen hast.',
  'Diesmal hat es gleich geklappt.',
  'Du hast den Lösungsweg auf die neue Aufgabe übertragen.',
  'Jetzt hast du es selbst gelöst.',
  'Du hast dir gemerkt, worauf du achten musst.',
] as const;

/** Intro line of the 'So geht's' example after the Einstiegs-Check (the child has already tried). */
export const EXAMPLE_INTRO = 'Hier siehst du an einem Beispiel, wie es geht.';
/** Intro line when the example comes back after 2 items in a row needed the solution. */
export const EXAMPLE_AGAIN_INTRO = 'Schau dir noch einmal an, wie es geht.';

/** The same answer was checked again without a change (not counted as an attempt). */
export const UNCHANGED_ANSWER = 'Das ist noch dieselbe Antwort. Ändere sie zuerst und prüfe dann noch einmal.';
export const TWIN_LABEL = 'Eine ähnliche Aufgabe wie vorhin';

export const BREAK_QUESTION = 'Du übst schon eine ganze Weile. Zeit für eine kleine Pause?';
export const BREAK_CONFIRM = 'Gute Idee, eine Pause zu machen!';
export const GOODBYE = 'Super, dass du heute geübt hast. Bis zum nächsten Mal!';

export const CONSENT_QUESTION = 'Soll ich mir deinen Fortschritt auf diesem Gerät merken?';
export const CONSENT_NOTE = 'Wird nur auf diesem Gerät gespeichert. Nichts wird verschickt.';
/** Consent is given, but the browser does not let us store anything (blocked, full, private mode). */
export const SAVE_FAILED_CHILD = 'Speichern geht in diesem Browser gerade nicht. Dein Fortschritt gilt nur, bis die Seite geschlossen wird.';
export const SAVE_FAILED_ADULT = 'Speichern ist in diesem Browser gerade nicht möglich. Der Fortschritt gilt nur, bis die Seite geschlossen wird.';

export const EMPTY_REVIEW = 'Heute ist nichts zu wiederholen.';

/** Rotating pick (deterministic for a given counter). */
export function rotate<T>(items: readonly T[], n: number): T {
  return items[((n % items.length) + items.length) % items.length];
}

export function streakText(n: number): string {
  return `${n} richtig hintereinander!`;
}

/**
 * '8 von 10 geschafft – 2 Aufgaben waren noch knifflig.'
 * Success-framed and honest: missed items of a Stufe that is not 'Sicher' yet are not scheduled for a later
 * review, so the summary does not promise that ("üben wir später noch einmal").
 */
export function summaryText(solved: number, answered: number): string {
  const rest = answered - solved;
  if (solved === 0 && answered > 0) {
    return answered === 1
      ? 'Du hast die Aufgabe bearbeitet. Sie war noch knifflig.'
      : `Du hast alle ${answered} Aufgaben bearbeitet. Sie waren noch knifflig.`;
  }
  const head = `${solved} von ${answered} geschafft`;
  if (rest <= 0) return `${head}.`;
  return `${head} – ${rest} ${rest === 1 ? 'Aufgabe war' : 'Aufgaben waren'} noch knifflig.`;
}

export function stufeLabel(stufe: Stufe): string {
  return `Stufe ${stufe}`;
}

/** Remove a trailing full stop so sentences can be joined. */
function sentence(text: string): string {
  const t = text.trim();
  return /[.!?…]$/.test(t) ? t : `${t}.`;
}

const SYMBOL_WORDS: Record<string, string> = { '<': 'ist kleiner als', '>': 'ist größer als', '=': 'gleich', '≈': 'ist ungefähr' };

/** Text that joins two fields of a multi answer without a comma ('=', '<', '+', '→' …). */
const ENDS_WITH_LINK = /[=<>+\u2212\u00B7:\u2248\u2192-]$/;
const STARTS_WITH_LINK = /^[=<>+\u2212\u00B7:\u2248\u2192-]/;

function num(value: number, decimals?: number): string {
  return fmt(value, decimals && !Number.isInteger(value) ? decimals : undefined);
}

/** Multi answer as one readable line: '17:55 Uhr', 'A = 5, B = 0', '3 · 6 = 2 · 6 + 1 · 6 = 12 + 6 = 18'. */
function multiText(a: AnswerOf<'multi'>): string {
  let out = '';
  a.fields.forEach((f, i) => {
    const prev = a.fields[i - 1];
    const value = num(f.value, f.decimals);
    if (prev?.after === ':') {
      // Clock time: hours and minutes belong together ('6:05 Uhr', never '6 : 5 Uhr' = 'geteilt durch').
      out += `:${String(f.value).padStart(2, '0')}${f.after ? ` ${f.after}` : ''}`;
      return;
    }
    const piece = [f.before, value, f.after === ':' ? undefined : f.after].filter(Boolean).join(' ');
    if (i > 0) out += ENDS_WITH_LINK.test(prev?.after?.trim() ?? '') || STARTS_WITH_LINK.test(f.before?.trim() ?? '') ? ' ' : ', ';
    out += piece;
  });
  return out;
}

/**
 * The solution as shown after 'Die Lösung: ' (worked solution, 'So geht's'). Like formatAnswer, but a
 * clock time reads '6:05 Uhr' (not '6 : 5 Uhr') and separate fields are separated by commas.
 */
export function solutionText(a: Answer): string {
  return a.kind === 'multi' ? multiText(a) : formatAnswer(a);
}

/** The answer in words for the live region, or null if there is nothing useful to say. */
function spokenAnswer(ex: Exercise, a: Answer, context: 'correct' | 'solution'): string | null {
  switch (a.kind) {
    case 'number': {
      if (a.value === null) return 'Die Aufgabe ist nicht lösbar – es fehlt eine Angabe.';
      const value = num(a.value, a.decimals) + (a.unit ? ` ${a.unit}` : '');
      // An answer sentence ('Mia bekommt 2,60 € zurück.') or label ('Flächeninhalt: 6 Kästchen') is spoken as it is.
      if (a.before || a.after) return [a.before, value, a.after].filter(Boolean).join(' ');
      return `Die Lösung ist ${value}`;
    }
    case 'choice': {
      const label = a.options[a.correct].label.trim();
      if (label in SYMBOL_WORDS) {
        if (ex.expression && ex.expression.split(BOX).length === 2) return ex.expression.replace(BOX, label);
        return `Die Lösung: ${SYMBOL_WORDS[label]}`;
      }
      return `Die Lösung: ${label}`;
    }
    case 'multi':
      return `Die Lösung: ${multiText(a)}`;
    case 'written':
      return a.op === 'div' && a.remainder ? `Die Lösung ist ${fmt(a.result)} Rest ${fmt(a.remainder)}` : `Die Lösung ist ${fmt(a.result)}`;
    case 'numberline':
      return `Die Lösung ist ${fmt(a.value)}`;
    case 'cells':
      return context === 'solution' ? 'Die richtigen Kästchen sind im Gitter mit einem Haken markiert' : null;
    case 'order':
      return `Die Reihenfolge: ${a.correct.map((i) => a.items[i]).join(', dann ')}`;
  }
}

/**
 * Spoken result for the live region, e.g. '7 mal 8 ist 56.'
 * Uses the expression with the box filled in when possible, otherwise wording that fits the answer kind
 * ('Die Lösung ist 42.', 'Mia bekommt 2,60 € zurück.', 'Die Lösung: 6:25 Uhr.'). Empty if there is
 * nothing useful to say (a correct drawing).
 */
export function spokenSolution(ex: Exercise, context: 'correct' | 'solution' = 'solution'): string {
  const a = ex.answer;
  if (ex.expression && a.kind === 'number' && a.value !== null) {
    const boxes = ex.expression.split(BOX).length - 1;
    if (boxes === 1) {
      const filled = ex.expression.replace(BOX, num(a.value, a.decimals));
      const spoken = toSpeech(filled).replace(/ gleich /g, ' ist ');
      return sentence(spoken);
    }
  }
  const text = spokenAnswer(ex, a, context);
  return text ? sentence(toSpeech(text)) : '';
}

/** Full sentence for the live region after a correct answer. */
export function announceCorrect(ex: Exercise, praise: string): string {
  return [CORRECT_HEADING, spokenSolution(ex, 'correct'), sentence(praise)].filter(Boolean).join(' ');
}

export function announceRetry(hint: string | null): string {
  return hint ? `${RETRY_HEADING} ${sentence(hint)}` : RETRY_HEADING;
}

export function announceSolution(ex: Exercise): string {
  return [SOLUTION_HEADING, spokenSolution(ex, 'solution'), 'Die Rechenschritte stehen unter der Aufgabe.'].filter(Boolean).join(' ');
}
