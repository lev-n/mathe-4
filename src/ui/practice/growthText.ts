/**
 * German texts for improvements (docs/research.md M16, M15): the round summary notes "Das hast du verbessert",
 * the progress view "So hast du dich verbessert" and the screen-reader announcement after a round.
 * Every line names what the child did and compares only with the child's own earlier answers: no traits, no speed,
 * no superlatives, no "falsch".
 */
import { TIMES, fmt } from '../../core/format';
import type { Stufe } from '../../core/types';
import { GROWTH_WINDOW, OVERCOME_RUN, type RoundNote, type SkillGrowthView } from '../../state/growth';
import { factFactors } from '../../state/facts';
import type { BadgeDef, MasteryState } from '../../state/types';
import { MASTERY_LABEL, stufeLabel } from '../app/labels';
import { summaryText } from './phrases';

export const IMPROVED_HEADING = 'Das hast du verbessert';
export const GROWTH_VIEW_HEADING = 'So hast du dich verbessert';

/** "Du hast <object> jetzt fünfmal <participle>." */
export interface ErrorPhrase {
  object: string;
  participle: string;
}

/** Misconception families of the error library (normalised Bug ids, src/state/growth.ts normalizeTag). */
const ERROR_PHRASES: readonly { re: RegExp; phrase: ErrorPhrase }[] = [
  { re: /^(add|mul)\.(no-carry|no-carry-cut|carry-|last-carry|sum-no-carry)|^zr\.carry/, phrase: { object: 'den Übertrag', participle: 'richtig beachtet' } },
  { re: /^sub\.(no-reduce|smaller-from-larger|zero-minus-n|across-zero|borrow-added)/, phrase: { object: 'richtig entbündelt', participle: '' } },
  { re: /^div\.missing(-end)?-zero/, phrase: { object: 'an die Null im Ergebnis', participle: 'gedacht' } },
  { re: /^div\.rest/, phrase: { object: 'an den Rest', participle: 'gedacht' } },
  { re: /^mul\.unshifted/, phrase: { object: 'die Teilergebnisse richtig', participle: 'eingerückt' } },
  { re: /^faktor/, phrase: { object: 'die richtige Umrechnungszahl', participle: 'genommen' } },
  { re: /^null-(fehlt|vorn|hinten)$/, phrase: { object: 'an die Null nach dem Komma', participle: 'gedacht' } },
];

const FALLBACK: ErrorPhrase = { object: 'einen Fehler, der dir vorher passiert war,', participle: 'vermieden' };

export function errorPhrase(tag: string): ErrorPhrase {
  return ERROR_PHRASES.find((p) => p.re.test(tag))?.phrase ?? FALLBACK;
}

const TIMES_WORD: Record<number, string> = { 5: 'fünfmal', 6: 'sechsmal', 7: 'siebenmal', 8: 'achtmal', 9: 'neunmal', 10: 'zehnmal' };

/** 'Du hast den Übertrag jetzt fünfmal richtig beachtet.' */
export function overcomeSentence(tag: string, run: number = OVERCOME_RUN, now = 'jetzt '): string {
  const { object, participle } = errorPhrase(tag);
  const times = TIMES_WORD[run] ?? `${fmt(run)}-mal`;
  // 'richtig entbündelt' has no object: "Du hast jetzt fünfmal richtig entbündelt."
  return participle ? `Du hast ${object} ${now}${times} ${participle}.` : `Du hast ${now}${times} ${object}.`;
}

/** '3 · 7' for the fact key '3x7'. */
export function factLabel(factKey: string): string {
  const [a, b] = factFactors(factKey);
  return `${a} ${TIMES} ${b}`;
}

/**
 * How long after the miss, as a phrase that stays true when the miss day is only an upper bound
 * (progress migrated from an older version stores the last practice day instead of the miss day).
 */
export function laterPhrase(days: number): string {
  if (days >= 14) return 'Wochen später';
  if (days >= 7) return 'Eine Woche später';
  return 'Ein paar Tage später';
}

const levelWord = (state: MasteryState) => `„${MASTERY_LABEL[state]}“`;

const of10 = (n: number) => `${fmt(n)} von ${fmt(GROWTH_WINDOW)}`;

/** One line of "Das hast du verbessert". `title` gives the skill's title. */
export function noteText(note: RoundNote, title: (skillId: string) => string): string {
  switch (note.kind) {
    case 'behalten': {
      const what = note.factKey ? factLabel(note.factKey) : `${title(note.skillId)}, ${stufeLabel(note.stufe)}`;
      return `${what}: Das war vorher noch knifflig. ${laterPhrase(note.days)} hast du es in der Wiederholung auf Anhieb gelöst.`;
    }
    case 'fakten':
      return `${fmt(note.count)} Einmaleins-Aufgaben waren vorher noch knifflig. ${laterPhrase(note.days)} hast du sie in der Wiederholung auf Anhieb gelöst.`;
    case 'besser': {
      const head = `${title(note.skillId)}, ${stufeLabel(note.stufe)}: Am Anfang ${of10(note.early)} auf Anhieb`;
      if (note.recent !== undefined) return `${head}, jetzt ${of10(note.recent)}.`;
      return `${head}, jetzt ${levelWord(note.level ?? 'sicher')}.`;
    }
    case 'fehler':
      return `${title(note.skillId)}: ${overcomeSentence(note.tag, note.run)}`;
    case 'zwilling':
      return note.count === 1
        ? 'Nach dem Lösungsweg hast du die ähnliche Aufgabe auf Anhieb gelöst.'
        : `Nach dem Lösungsweg hast du ${fmt(note.count)} ähnliche Aufgaben auf Anhieb gelöst.`;
    case 'selbst':
      return note.count === 1
        ? 'Eine Aufgabe hast du im zweiten Versuch selbst gelöst.'
        : `${fmt(note.count)} Aufgaben hast du im zweiten Versuch selbst gelöst.`;
  }
}

/** True for the larger improvements (kinds 3–5), which get the emphasised style. */
export function isBigNote(note: RoundNote): boolean {
  return note.kind !== 'zwilling' && note.kind !== 'selbst';
}

/** Lines of the progress view for one skill ("Stufe 2: Am Anfang 4 von 10 auf Anhieb, jetzt 9 von 10."). */
export function growthViewLines(view: SkillGrowthView): string[] {
  const lines: string[] = [];
  for (const s of view.stufen) {
    const head = `${stufeLabel(s.stufe as Stufe)}: `;
    if (s.window) lines.push(`${head}Am Anfang ${of10(s.window.early)} auf Anhieb, jetzt ${of10(s.window.recent)}.`);
    else if (s.level && s.early !== undefined) lines.push(`${head}Am Anfang ${of10(s.early)} auf Anhieb, jetzt ${levelWord(s.level)}.`);
    if (s.kept > 0) {
      lines.push(
        s.kept === 1
          ? `${head}Etwas, das vorher knifflig war, hast du Tage später in der Wiederholung auf Anhieb gelöst.`
          : `${head}${fmt(s.kept)}-mal hast du Tage später in der Wiederholung auf Anhieb gelöst, was vorher knifflig war.`,
      );
    }
  }
  for (const tag of view.overcome) lines.push(overcomeSentence(tag, OVERCOME_RUN, ''));
  return lines;
}

/** Polite live-region text when the round summary appears. */
export function summaryAnnouncement(solved: number, answered: number, notes: readonly string[], badges: readonly BadgeDef[]): string {
  const parts = [summaryText(solved, answered)];
  if (notes.length > 0) parts.push(`${IMPROVED_HEADING}: ${notes.join(' ')}`);
  if (badges.length > 0) parts.push(`${badges.length === 1 ? 'Neues Abzeichen' : 'Neue Abzeichen'}: ${badges.map((b) => b.title).join(', ')}.`);
  return parts.join(' ');
}
