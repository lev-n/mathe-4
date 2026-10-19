/**
 * German texts for improvements (docs/research.md M16, M15): the round summary notes "Das hast du verbessert",
 * the progress view "So hast du dich verbessert" and the screen-reader announcement after a round.
 * Every line names what the child did and compares only with the child's own earlier answers: no traits, no speed,
 * no superlatives, no "falsch".
 */
import { TIMES, fmt, toSpeech } from '../../core/format';
import type { Stufe, SubtractionMethod } from '../../core/types';
import { GROWTH_WINDOW, OVERCOME_RUN, type RoundNote, type SkillGrowthView } from '../../state/growth';
import { factFactors } from '../../state/facts';
import type { BadgeDef, MasteryState } from '../../state/types';
import { familyPhrase, type FamilyPhrase } from '../../topics/errorFamilies';
import { MASTERY_LABEL, stufeLabel } from '../app/labels';
import { summaryText } from './phrases';

export const IMPROVED_HEADING = 'Das hast du verbessert';
export const GROWTH_VIEW_HEADING = 'So hast du dich verbessert';

/** "Du hast <object> jetzt fünfmal <participle>." (src/topics/errorFamilies.ts) */
export type ErrorPhrase = FamilyPhrase;

/**
 * Phrase of a stored error-library tag (a misconception family id, src/topics/errorFamilies.ts). Written
 * subtraction is worded for the child's method ('ergaenzen': Erweitern with the gemerkte 1).
 */
export function errorPhrase(tag: string, method: SubtractionMethod = 'abziehen'): ErrorPhrase {
  return familyPhrase(tag, method);
}

const TIMES_WORD: Record<number, string> = { 5: 'fünfmal', 6: 'sechsmal', 7: 'siebenmal', 8: 'achtmal', 9: 'neunmal', 10: 'zehnmal' };

/** A prepositional object ('an alle Rechenschritte') reads better after "jetzt fünfmal". */
const PREPOSITION = /^(an|auf|mit|in|zu|bei|für) /;

/**
 * 'Du hast den Übertrag jetzt fünfmal richtig beachtet.' / 'Du hast jetzt fünfmal an alle Rechenschritte gedacht.'
 * (`now` = '' in the progress view: no "jetzt").
 */
export function overcomeSentence(tag: string, run: number = OVERCOME_RUN, now = 'jetzt ', method: SubtractionMethod = 'abziehen'): string {
  const { object, participle } = errorPhrase(tag, method);
  const times = `${now}${TIMES_WORD[run] ?? `${fmt(run)}-mal`}`;
  return PREPOSITION.test(object) ? `Du hast ${times} ${object} ${participle}.` : `Du hast ${object} ${times} ${participle}.`;
}

/** '3 · 7' for the fact key '3x7'. */
export function factLabel(factKey: string): string {
  const [a, b] = factFactors(factKey);
  return `${a} ${TIMES} ${b}`;
}

/**
 * When the miss was, as a phrase that stays true when the miss day is only an upper bound (progress migrated from
 * an older version stores the last practice day instead of the miss day): 'Vor ein paar Tagen', …
 */
export function agoPhrase(days: number): string {
  if (days >= 14) return 'Vor ein paar Wochen';
  if (days >= 8) return 'Vor mehr als einer Woche';
  if (days === 7) return 'Vor einer Woche';
  return 'Vor ein paar Tagen';
}

const lower = (phrase: string) => phrase.charAt(0).toLowerCase() + phrase.slice(1);

const levelPhrase = (state: MasteryState) => `jetzt ist die Stufe „${MASTERY_LABEL[state]}“`;

const of10 = (n: number) => `${fmt(n)} von ${fmt(GROWTH_WINDOW)}`;

/** 'Am Anfang' – or 'Früher' when the early window came from older saved progress and is not the real start. */
const startWord = (carried: boolean | undefined) => (carried ? 'Früher' : 'Am Anfang');

/**
 * "Am Anfang 4 von 10 auf Anhieb, jetzt 9 von 10." – a very low start is said in words, never "0 von 10" (M15).
 * `now` is the second half ("jetzt 9 von 10" or "jetzt ist die Stufe „Sicher“").
 */
function fromTo(early: number, carried: boolean | undefined, now: string, nowIsCount: boolean): string {
  const start = startWord(carried);
  if (early <= 1) return `${start} war das noch knifflig – ${now}${nowIsCount ? ' auf Anhieb' : ''}.`;
  return `${start} ${of10(early)} auf Anhieb${nowIsCount ? ', ' : ' – '}${now}.`;
}

/** One line of "Das hast du verbessert". `title` gives the skill's title; `method` is the child's subtraction method. */
export function noteText(note: RoundNote, title: (skillId: string) => string, method: SubtractionMethod = 'abziehen'): string {
  switch (note.kind) {
    case 'behalten':
      return note.factKey
        ? `${factLabel(note.factKey)}: ${agoPhrase(note.days)} war das noch knifflig. Heute hast du es in der Wiederholung auf Anhieb gewusst.`
        : `${title(note.skillId)}, ${stufeLabel(note.stufe)}: ${agoPhrase(note.days)} war das noch knifflig. Heute hast du so eine Aufgabe in der Wiederholung auf Anhieb gelöst.`;
    case 'fakten':
      return `${fmt(note.count)} Einmaleins-Aufgaben waren ${lower(agoPhrase(note.days))} noch knifflig. Heute hast du sie in der Wiederholung auf Anhieb gewusst.`;
    case 'besser': {
      const head = `${title(note.skillId)}, ${stufeLabel(note.stufe)}: `;
      return note.recent !== undefined
        ? head + fromTo(note.early, note.carried, `jetzt ${of10(note.recent)}`, true)
        : head + fromTo(note.early, note.carried, levelPhrase(note.level ?? 'sicher'), false);
    }
    case 'fehler':
      return `${title(note.skillId)}: ${overcomeSentence(note.tag, note.run, 'jetzt ', method)}`;
    case 'zwilling':
      return note.count === 1
        ? 'Nach dem Lösungsweg hast du die ähnliche Aufgabe auf Anhieb gelöst.'
        : `Nach dem Lösungsweg hast du ${fmt(note.count)} ähnliche Aufgaben auf Anhieb gelöst.`;
    case 'selbst':
      return note.count === 1
        ? 'Bei einer Aufgabe hast du deine Antwort im zweiten Versuch selbst verbessert.'
        : `Bei ${fmt(note.count)} Aufgaben hast du deine Antwort im zweiten Versuch selbst verbessert.`;
  }
}

/** True for the larger improvements (kinds 3–5), which get the emphasised style. */
export function isBigNote(note: RoundNote): boolean {
  return note.kind !== 'zwilling' && note.kind !== 'selbst';
}

/**
 * Lines of the progress view for one skill ("Stufe 2: Am Anfang 4 von 10 auf Anhieb, später 9 von 10."), each once.
 * Only what got better; the numbers never go down (StufeGrowthView.window keeps the best). `method` is the child's
 * subtraction method (the wording of the written-subtraction family).
 */
export function growthViewLines(view: SkillGrowthView, method: SubtractionMethod = 'abziehen'): string[] {
  const lines: string[] = [];
  const add = (line: string) => {
    // two tags without a family share the fallback sentence: say it once
    if (!lines.includes(line)) lines.push(line);
  };
  for (const s of view.stufen) {
    const head = `${stufeLabel(s.stufe as Stufe)}: `;
    if (s.window) add(head + fromTo(s.window.early, s.carried, `später ${of10(s.window.best)}`, true));
    else if (s.level && s.early !== undefined) add(head + fromTo(s.early, s.carried, levelPhrase(s.level), false));
    if (s.kept > 0) {
      add(
        s.kept === 1
          ? `${head}In der Wiederholung hast du auf Anhieb gelöst, was ein paar Tage vorher noch knifflig war.`
          : `${head}In der Wiederholung hast du schon ${fmt(s.kept)}-mal auf Anhieb gelöst, was ein paar Tage vorher noch knifflig war.`,
      );
    }
  }
  for (const tag of view.overcome) add(overcomeSentence(tag, OVERCOME_RUN, '', method));
  return lines;
}

/**
 * Polite live-region text after practice (round summary, or goodbye after a break): `lead` first, then short and
 * complete, because the focus moves to the heading at the same time and the child reads the notes there
 * ("Darunter steht …"). Spoken form (toSpeech).
 */
export function afterPracticeAnnouncement(lead: string, notes: number, badges: readonly BadgeDef[]): string {
  const parts = [lead];
  if (notes > 0) parts.push('Darunter steht, was du verbessert hast.');
  if (badges.length > 0) parts.push(`${badges.length === 1 ? 'Neues Abzeichen' : 'Neue Abzeichen'}: ${badges.map((b) => b.title).join(', ')}.`);
  return toSpeech(parts.join(' '));
}

/** Polite live-region text when the round summary appears. */
export function summaryAnnouncement(solved: number, answered: number, notes: readonly string[], badges: readonly BadgeDef[]): string {
  return afterPracticeAnnouncement(summaryText(solved, answered), notes.length, badges);
}

/** Text for screen readers when it differs from what is shown ('3 · 7' is read as '3 mal 7'), else undefined. */
export function spokenText(text: string): string | undefined {
  const spoken = toSpeech(text);
  return spoken === text ? undefined : spoken;
}
