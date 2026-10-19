// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { IMPROVEMENT_BANNED_PHRASES } from '../../core/testing';
import { BADGES } from '../../state/badges';
import type { RoundNote, SkillGrowthView } from '../../state/growth';
import { ERROR_FAMILIES } from '../../topics/errorFamilies';
import { afterPracticeAnnouncement, agoPhrase, growthViewLines, noteParts, overcomeSentence, spokenText, summaryAnnouncement, type NoteParts } from './growthText';
import { EFFORT_PHRASES, TWIN_SOLVED_PHRASES } from './phrases';
import { ImprovedNotes } from './RoundSummary';

afterEach(cleanup);

const title = (id: string) => ({ 'zahlen.runden': 'Runden', 'schriftlich.addition': 'Schriftlich addieren' })[id] ?? id;
const line = (p: NoteParts) => (p.head ? `${p.head}: ${p.text}` : p.text);

const NOTES: RoundNote[] = [
  { kind: 'behalten', skillId: 'zahlen.runden', stufe: 2, days: 4 },
  { kind: 'behalten', skillId: 'kopfrechnen.einmaleins', stufe: 1, days: 9, factKey: '3x7' },
  { kind: 'fakten', count: 3, days: 3 },
  { kind: 'besser', skillId: 'zahlen.runden', stufe: 2, early: 4, recent: 9 },
  { kind: 'besser', skillId: 'zahlen.runden', stufe: 1, early: 0, recent: 8 },
  { kind: 'besser', skillId: 'zahlen.runden', stufe: 3, early: 3, recent: 8, carried: true },
  { kind: 'fehler', skillId: 'schriftlich.addition', stufe: 2, tag: 'uebertrag', run: 5 },
  { kind: 'zwilling', count: 1 },
  { kind: 'zwilling', count: 2 },
  { kind: 'selbst', count: 1 },
  { kind: 'selbst', count: 4 },
];

describe('round notes ("Das hast du verbessert")', () => {
  it('name what the child did, compared only with their own earlier answers', () => {
    expect(NOTES.map((n) => line(noteParts(n, title)))).toEqual([
      'Runden – Stufe 2: Vor ein paar Tagen war das noch knifflig. Heute hast du so eine Aufgabe in der Wiederholung auf Anhieb gelöst.',
      '3 · 7: Vor mehr als einer Woche war das noch knifflig. Heute hast du es in der Wiederholung auf Anhieb gewusst.',
      '3 Einmaleins-Aufgaben waren vor ein paar Tagen noch knifflig. Heute hast du sie in der Wiederholung auf Anhieb gewusst.',
      'Runden – Stufe 2: Am Anfang 4 von 10 auf Anhieb, jetzt 9 von 10.',
      'Runden – Stufe 1: Am Anfang war das noch knifflig – jetzt 8 von 10 auf Anhieb.',
      'Runden – Stufe 3: Früher 3 von 10 auf Anhieb, jetzt 8 von 10.',
      'Schriftlich addieren: Du hast den Übertrag jetzt fünfmal richtig beachtet.',
      'Nach dem Lösungsweg hast du die ähnliche Aufgabe auf Anhieb gelöst.',
      'Nach den Lösungswegen hast du 2 ähnliche Aufgaben auf Anhieb gelöst.',
      'Bei einer Aufgabe hast du deine Antwort im zweiten Versuch selbst verbessert.',
      'Bei 4 Aufgaben hast du deine Antwort im zweiten Versuch selbst verbessert.',
    ]);
  });

  it('keeps the skill title apart from the sentence (titles can end in "?" or contain commas)', () => {
    const odd = (id: string) => ({ 'kopfrechnen.kopf-schriftlich': 'Kopf oder schriftlich?', 'kopfrechnen.mal-durch-zehn': 'Mal und durch 10, 100, 1000' })[id] ?? id;
    expect(noteParts({ kind: 'besser', skillId: 'kopfrechnen.kopf-schriftlich', stufe: 2, early: 4, recent: 9 }, odd)).toEqual({
      head: 'Kopf oder schriftlich? – Stufe 2',
      text: 'Am Anfang 4 von 10 auf Anhieb, jetzt 9 von 10.',
    });
    expect(noteParts({ kind: 'fehler', skillId: 'kopfrechnen.mal-durch-zehn', stufe: 1, tag: 'nullen', run: 5 }, odd)).toEqual({
      head: 'Mal und durch 10, 100, 1000',
      text: 'Du hast die Nullen jetzt fünfmal richtig gesetzt.',
    });
  });

  it('a lasting improvement measured from a miss day taken over from older progress says "Früher"', () => {
    expect(noteParts({ kind: 'behalten', skillId: 'zahlen.runden', stufe: 1, days: 4, carried: true }, title).text).toBe(
      'Früher war das noch knifflig. Heute hast du so eine Aufgabe in der Wiederholung auf Anhieb gelöst.',
    );
  });

  it('time phrases for a miss day the app saw itself', () => {
    expect([3, 6, 7, 8, 13, 14, 40].map(agoPhrase)).toEqual([
      'Vor ein paar Tagen',
      'Vor ein paar Tagen',
      'Vor einer Woche',
      'Vor mehr als einer Woche',
      'Vor mehr als einer Woche',
      'Vor ein paar Wochen',
      'Vor ein paar Wochen',
    ]);
  });

  it('error phrases: word order for prepositional objects, the child’s subtraction method, a calm fallback', () => {
    expect(overcomeSentence('alle-schritte')).toBe('Du hast jetzt fünfmal an alle Rechenschritte gedacht.');
    expect(overcomeSentence('entbuendeln', 5, 'jetzt ', 'abziehen')).toBe('Du hast das Entbündeln jetzt fünfmal richtig gemacht.');
    expect(overcomeSentence('entbuendeln', 5, 'jetzt ', 'ergaenzen')).toBe('Du hast das Erweitern mit der gemerkten 1 jetzt fünfmal richtig gemacht.');
    expect(overcomeSentence('unbekannt')).toBe('Du hast die knifflige Stelle in diesen Aufgaben jetzt fünfmal richtig gelöst.');
    expect(overcomeSentence('uebertrag', 5, '')).toBe('Du hast den Übertrag fünfmal richtig beachtet.');
    expect(overcomeSentence('quadrate')).toBe('Du hast jetzt fünfmal auch die großen Quadrate mitgezählt.');
  });

  it('every family sentence is a grammatical "Du hast …" sentence without traps, for both methods', () => {
    for (const f of ERROR_FAMILIES) {
      for (const method of ['abziehen', 'ergaenzen'] as const) {
        const sentence = overcomeSentence(f.id, 5, 'jetzt ', method);
        expect(sentence, f.id).toMatch(/^Du hast .+ fünfmal .+\.$/);
        expect(sentence, f.id).not.toMatch(/\s{2}|\s\./);
        for (const banned of IMPROVEMENT_BANNED_PHRASES) expect(sentence.toLowerCase(), `${f.id}: ${banned}`).not.toContain(banned);
      }
    }
  });
});

describe('progress view lines ("So hast du dich verbessert")', () => {
  it('positive lines only, carried windows say "Früher", a very low start is said in words', () => {
    const view: SkillGrowthView = {
      stufen: [
        { stufe: 1, window: { early: 4, best: 9 }, kept: 0 },
        { stufe: 2, level: 'gemeistert', early: 1, kept: 1 },
        { stufe: 3, window: { early: 2, best: 8 }, carried: true, kept: 3 },
      ],
      overcome: ['uebertrag', 'unbekannt', 'auch-unbekannt'],
    };
    expect(growthViewLines(view)).toEqual([
      'Stufe 1: Am Anfang 4 von 10 auf Anhieb, später 9 von 10.',
      'Stufe 2: Am Anfang war das noch knifflig – jetzt ist die Stufe „Gemeistert“.',
      'Stufe 2: In der Wiederholung hast du auf Anhieb gelöst, was vorher noch knifflig war.',
      'Stufe 3: Früher 2 von 10 auf Anhieb, später 8 von 10.',
      'Stufe 3: In der Wiederholung hast du schon 3-mal auf Anhieb gelöst, was vorher noch knifflig war.',
      'Du hast den Übertrag fünfmal richtig beachtet.',
      // two unknown tags share the fallback: said once
      'Du hast die knifflige Stelle in diesen Aufgaben fünfmal richtig gelöst.',
    ]);
  });
});

describe('screen readers', () => {
  it('the announcement is short and complete, in spoken form', () => {
    const badge = BADGES.find((b) => b.id === 'behalten')!;
    expect(summaryAnnouncement(8, 10, ['a', 'b'], [badge])).toBe('8 von 10 geschafft – 2 Aufgaben waren noch knifflig. Darunter steht, was du verbessert hast. Neues Abzeichen: Gut behalten.');
    expect(summaryAnnouncement(3, 3, [], [])).toBe('3 von 3 geschafft.');
    expect(afterPracticeAnnouncement('Tschüss!', 0, [badge, BADGES.find((b) => b.id === 'besser-geworden')!])).toBe('Tschüss! Neue Abzeichen: Gut behalten, Besser geworden.');
  });

  it('a fact note is read as "3 mal 7", not "3 Punkt 7"; the shown text stays "3 · 7"', () => {
    const parts = noteParts(NOTES[1], title);
    const spoken = spokenText(line(parts))!;
    expect(spoken).toMatch(/^3 mal 7: /);
    expect(spokenText(line(noteParts(NOTES[0], title)))).toBeUndefined();
    render(<ImprovedNotes notes={[{ key: 'f', ...parts, spoken, big: true }]} />);
    const item = screen.getByRole('listitem');
    expect(item.querySelector('[aria-hidden="true"]')!.textContent).toBe(`${parts.head}: ${parts.text}`);
    expect(item.querySelector('[aria-hidden="true"] strong')!.textContent).toBe('3 · 7');
    expect(item.querySelector(':scope > .visually-hidden')!.textContent).toBe(spoken);
    expect(screen.getByRole('heading', { level: 3, name: 'Das hast du verbessert' })).toBeTruthy();
  });
});

describe('improvement wording never uses the traps of improvement praise', () => {
  it('notes, progress lines, badges and in-item lines', () => {
    const texts = [
      ...NOTES.map((n) => line(noteParts(n, title))),
      ...growthViewLines({ stufen: [{ stufe: 1, window: { early: 4, best: 9 }, level: 'sicher', early: 4, kept: 2 }], overcome: ['uebertrag'] }),
      ...BADGES.filter((b) => b.improvement).flatMap((b) => [b.title, b.description]),
      ...TWIN_SOLVED_PHRASES,
      ...EFFORT_PHRASES,
    ];
    for (const t of texts) {
      for (const banned of IMPROVEMENT_BANNED_PHRASES) expect(t.toLowerCase(), `${banned} in ${t}`).not.toContain(banned);
      expect(t, t).not.toMatch(/(^|\s)0 von 10|schneller|schlau|Fehler!/);
    }
    // the twin lines name an action; at most one starts with "Diesmal" (it points back at the miss)
    expect(TWIN_SOLVED_PHRASES.filter((p) => p.startsWith('Diesmal'))).toHaveLength(1);
  });
});
