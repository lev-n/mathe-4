/**
 * Phrases of the misconception families (src/topics/errorFamilies.ts): "Du hast <object> jetzt fünfmal <participle>."
 *
 * Kept apart from the family table so that the texts of the progress view and the round summary
 * (src/ui/practice/growthText.ts) need only these strings, not the per-skill Bug-id lists of errorFamilies.ts.
 * This file imports types only; keep it that way (errorFamilies.test.ts checks it).
 *
 * A phrase names what the child did right (du-form, no traits, no speed, no superlatives, no "falsch") and fits
 * every task kind of every skill in its family. The keys are the family ids stored in the progress: never rename
 * or reuse one. Every family in errorFamilies.ts has a phrase here and every phrase a family (errorFamilies.test.ts).
 */
import type { SubtractionMethod } from '../core/types';

/** "Du hast <object> jetzt fünfmal <participle>." */
export interface FamilyPhrase {
  object: string;
  participle: string;
}

export interface FamilyPhrases {
  readonly phrase: FamilyPhrase;
  /** Written subtraction with the Ergänzen method (the hints say "Erweitern" and "gemerkte 1"). */
  readonly ergaenzen?: FamilyPhrase;
}

function say(object: string, participle: string, ergaenzen?: FamilyPhrase): FamilyPhrases {
  return ergaenzen ? { phrase: { object, participle }, ergaenzen } : { phrase: { object, participle } };
}

/** Family id → phrase. */
export const FAMILY_PHRASES = {
  // ─── Schriftlich rechnen ───────────────────────────────────────────────────
  uebertrag: say('den Übertrag', 'richtig beachtet'),
  // written subtraction: worded for the child's method (Entbündeln, or Erweitern with the gemerkte 1)
  entbuendeln: say('das Entbündeln', 'richtig gemacht', { object: 'das Erweitern mit der gemerkten 1', participle: 'richtig gemacht' }),
  // mental subtraction: always Entbündeln (the subtraction method is about written subtraction)
  'entbuendeln-kopf': say('das Entbündeln', 'richtig gemacht'),
  stellengerecht: say('die Zahlen', 'stellengerecht untereinandergeschrieben'),
  teilprodukte: say('alle Teilprodukte', 'an die richtige Stelle geschrieben'),
  'null-im-ergebnis': say('die Null im Ergebnis', 'mitgeschrieben'),
  rest: say('den Rest', 'richtig beachtet'),
  'rest-mitnehmen': say('den Rest', 'zur nächsten Stelle mitgenommen'),
  'teilen-anfang': say('den Anfang beim Teilen', 'richtig gewählt'),
  'rest-deuten': say('den Rest', 'passend zur Geschichte beachtet'),
  rechenart: say('die passende Rechenart', 'gewählt'),
  rechenrichtung: say('die Rechenrichtung', 'richtig gewählt'),
  'ziffern-legen': say('die Ziffern', 'an passende Stellen gesetzt'),
  hilfsaufgabe: say('die Hilfsaufgabe', 'richtig genutzt'),
  'fehler-finden': say('den Fehler in der Rechnung', 'gefunden und verbessert'),

  // ─── Zahlen, Runden, Stellenwerte ──────────────────────────────────────────
  runden: say('die Rundungsregel', 'richtig angewendet'),
  nullen: say('die Nullen', 'richtig gesetzt'),
  stellenwert: say('die Stellenwerte', 'richtig beachtet'),
  zahlendreher: say('Zehner und Einer', 'in der richtigen Reihenfolge geschrieben'),
  nachbarzahlen: say('die Nachbarzahlen', 'richtig bestimmt'),
  abstand: say('die Abstände zwischen den Zahlen', 'richtig genutzt'),
  // reading a number off the line and placing the arrow on it
  zahlenstrahl: say('den Zahlenstrahl', 'genau genutzt'),
  binaer: say('die Punkte auf den Karten', 'richtig zusammengezählt'),
  muster: say('das Muster', 'richtig fortgesetzt'),

  // ─── Größen ────────────────────────────────────────────────────────────────
  komma: say('die Stellen vor und nach dem Komma', 'richtig beachtet'),
  umrechnungszahl: say('die Umrechnungszahl', 'richtig gewählt'),
  einheiten: say('die Einheiten', 'richtig beachtet'),
  zeiteinheiten: say('die Zeiteinheiten', 'richtig beachtet'),
  'uhr-lesen': say('die Uhrzeit', 'richtig abgelesen'),
  ergaenzen: say('jede Stelle', 'richtig ergänzt'),
  'cent-ergaenzen': say('die Cent', 'richtig ergänzt'),
  // change and missing money: the Euro broken into Cent is taken off the Euro (the hints say "angebrochen")
  'euro-wechseln': say('den angebrochenen Euro', 'richtig mitgerechnet'),
  messen: say('die Skala', 'genau abgelesen'),
  'geld-zaehlen': say('das Geld', 'richtig zusammengezählt'),
  stueckelung: say('die Scheine und Münzen', 'passend ausgewählt'),
  vergleichsgroesse: say('deine Vergleichsgrößen', 'passend genutzt'),

  // ─── Daten ─────────────────────────────────────────────────────────────────
  'diagramm-lesen': say('das Diagramm', 'genau abgelesen'),
  fuenferbuendel: say('die Fünferbündel', 'richtig gezählt'),
  bildwert: say('den Wert der Bilder', 'richtig beachtet'),
  'alle-werte': say('alle Zahlen', 'mitgerechnet'),
  anzahl: say('die Anzahl', 'richtig beachtet'),
  frage: say('die Frage', 'genau beantwortet'),
  fahrplan: say('die passende Zeile und Spalte', 'gefunden'),
  moeglichkeiten: say('alle Möglichkeiten', 'systematisch gezählt'),
  'sicher-ziehen': say('auch den Fall mit Pech', 'bedacht'),
  // "gleich wahrscheinlich" (the difference) and "wahrscheinlicher" (the difference and one more)
  chancen: say('den Unterschied zwischen den Farben', 'genau bedacht'),

  // ─── Sachaufgaben ──────────────────────────────────────────────────────────
  'alle-schritte': say('an alle Rechenschritte', 'gedacht'),
  'nicht-loesbar': say('nicht lösbare Aufgaben', 'erkannt'),
  ueberfluessig: say('die überflüssigen Angaben', 'weggelassen'),
  zuordnung: say('die Mengen und Preise', 'richtig zugeordnet'),
  situation: say('die Situation', 'genau durchdacht'),
  // a fence around a bed (lengths in m, no grid)
  'alle-seiten': say('alle vier Seiten', 'zusammengerechnet'),

  // ─── Geometrie ─────────────────────────────────────────────────────────────
  ekf: say('Ecken, Kanten und Flächen', 'richtig unterschieden'),
  versteckt: say('die versteckten Teile', 'mitgezählt'),
  'wuerfel-zaehlen': say('alle Würfel', 'mitgezählt'),
  wuerfelnetz: say('die gegenüberliegenden Flächen', 'richtig gefunden'),
  figuren: say('die Eigenschaften der Figuren', 'genau geprüft'),
  quadrate: say('auch die großen Quadrate', 'mitgezählt'),
  symmetrie: say('die Symmetrieachsen', 'richtig gefunden'),
  'flaeche-umfang': say('Flächeninhalt und Umfang', 'richtig unterschieden'),
  kaestchen: say('alle Kästchen', 'richtig gezählt'),
  // the perimeter of a figure on the grid
  randlinien: say('alle Randlinien', 'mitgezählt'),

  // ─── Kopfrechnen ───────────────────────────────────────────────────────────
  einmaleins: say('die Einmaleins-Aufgaben', 'genau ausgerechnet'),
  tauschaufgabe: say('Tausch- und Umkehraufgaben', 'richtig genutzt'),
  ausgleichen: say('das Ausgleichen', 'richtig gemacht'),
  teiler: say('die Teiler und Vielfachen', 'richtig bestimmt'),
} satisfies Record<string, FamilyPhrases>;

export type FamilyId = keyof typeof FAMILY_PHRASES;

/** Phrase for tags without a family (a new Bug id that has not been added to the table yet). */
export const FALLBACK_PHRASE: FamilyPhrase = { object: 'die knifflige Stelle in diesen Aufgaben', participle: 'richtig gelöst' };

/** A Map, so that prototype names ('constructor', '__proto__') are no family. */
const BY_ID: ReadonlyMap<string, FamilyPhrases> = new Map(Object.entries(FAMILY_PHRASES));

/** "Du hast <object> jetzt fünfmal <participle>." for a stored tag (a family id); unknown tags get FALLBACK_PHRASE. */
export function familyPhrase(tag: string, method: SubtractionMethod = 'abziehen'): FamilyPhrase {
  const p = BY_ID.get(tag);
  if (!p) return FALLBACK_PHRASE;
  return method === 'ergaenzen' && p.ergaenzen ? p.ergaenzen : p.phrase;
}
