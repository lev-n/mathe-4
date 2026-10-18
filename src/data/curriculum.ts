/**
 * Curriculum tags (KMK Bildungsstandards Mathematik Primarbereich, i. d. F. vom 23.06.2022)
 * plus pointers into LehrplanPLUS Bayern (Jgst. 3/4) and the NRW Lehrplan Mathematik (2021).
 * Tags are paraphrased content foci; see docs/research.md §4.15 for the full alignment table.
 */
import type { TopicId } from '../core/types';

export type Leitidee =
  | 'Zahl und Operation'
  | 'Raum und Form'
  | 'Muster, Strukturen und funktionaler Zusammenhang'
  | 'Größen und Messen'
  | 'Daten und Zufall';

export interface KmkTag {
  leitidee: Leitidee | 'Prozessbezogene Kompetenz';
  text: string;
}

export const KMK_TAGS = {
  'ZO.stellenwert': { leitidee: 'Zahl und Operation', text: 'Dezimales Stellenwertsystem verstehen und nutzen (Bündeln, Stellenwerte)' },
  'ZO.zahlraum': { leitidee: 'Zahl und Operation', text: 'Zahlen bis 1 000 000 darstellen, ordnen, vergleichen; im Zahlenraum orientieren (Zahlenstrahl, Nachbarzahlen)' },
  'ZO.runden': { leitidee: 'Zahl und Operation', text: 'Runden und Überschlagen' },
  'ZO.kopfrechnen': { leitidee: 'Zahl und Operation', text: 'Grundaufgaben des Kopfrechnens (Einmaleins) gedächtnismäßig beherrschen, Umkehrungen ableiten, auf analoge Aufgaben übertragen' },
  'ZO.strategien': { leitidee: 'Zahl und Operation', text: 'Flexibel und vorteilhaft rechnen; Rechengesetze und Zusammenhänge zwischen Operationen nutzen' },
  'ZO.schriftlich': { leitidee: 'Zahl und Operation', text: 'Schriftliche Verfahren der Addition, Subtraktion und Multiplikation verstehen und geläufig ausführen' },
  'ZO.division': { leitidee: 'Zahl und Operation', text: 'Schriftliche Division (länderspezifisch: Bayern verbindlich, NRW erläutern; nicht in den KMK-Standards)' },
  'ZO.kontrolle': { leitidee: 'Zahl und Operation', text: 'Ergebnisse kontrollieren (Überschlag, Umkehraufgabe); Rechenfehler finden, erklären und berichtigen' },
  'ZO.sachrechnen': { leitidee: 'Zahl und Operation', text: 'Rechenoperationen in Sachsituationen anwenden; Ergebnisse auf Plausibilität prüfen' },
  'MS.muster': { leitidee: 'Muster, Strukturen und funktionaler Zusammenhang', text: 'Muster und Strukturen erkennen, fortsetzen und beschreiben (Zahlenfolgen, Päckchen, Gleichheit von Termen)' },
  'MS.funktional': { leitidee: 'Muster, Strukturen und funktionaler Zusammenhang', text: 'Funktionale Beziehungen erkennen und nutzen (je mehr – desto mehr, Menge–Preis-Tabellen)' },
  'RF.raum': { leitidee: 'Raum und Form', text: 'Räumliches Vorstellungsvermögen: Bauplan ↔ Bauwerk, Körper ↔ Netz, gedanklich falten und drehen' },
  'RF.figuren': { leitidee: 'Raum und Form', text: 'Körper und ebene Figuren erkennen, benennen, beschreiben und klassifizieren' },
  'RF.symmetrie': { leitidee: 'Raum und Form', text: 'Achsensymmetrie erkennen und Figuren spiegeln' },
  'RF.flaeche': { leitidee: 'Raum und Form', text: 'Flächeninhalt und Umfang mit Einheitsquadraten vergleichen und bestimmen' },
  'GM.vorstellung': { leitidee: 'Größen und Messen', text: 'Größenvorstellungen besitzen (Repräsentanten, Schätzen, Plausibilität)' },
  'GM.einheiten': { leitidee: 'Größen und Messen', text: 'Standardeinheiten kennen, umwandeln und verschiedene Schreibweisen nutzen (2,5 km | 2500 m | 2 km 500 m)' },
  'GM.zeit': { leitidee: 'Größen und Messen', text: 'Uhrzeiten und Zeitspannen bestimmen' },
  'GM.sachsituationen': { leitidee: 'Größen und Messen', text: 'Mit Größen in Sachsituationen rechnen' },
  'DZ.daten': { leitidee: 'Daten und Zufall', text: 'Daten erfassen, in Tabellen und Diagrammen darstellen, Informationen entnehmen, Darstellungen kritisch prüfen' },
  'DZ.kombinatorik': { leitidee: 'Daten und Zufall', text: 'Anzahl von Möglichkeiten systematisch bestimmen (Baumdiagramm, Tabelle)' },
  'DZ.zufall': { leitidee: 'Daten und Zufall', text: 'Zufallsereignisse beschreiben (sicher, möglich, unmöglich) und Chancen vergleichen' },
  'PK.argumentieren': { leitidee: 'Prozessbezogene Kompetenz', text: 'Mathematisch argumentieren (begründen, Aussagen prüfen)' },
  'PK.modellieren': { leitidee: 'Prozessbezogene Kompetenz', text: 'Mathematisch modellieren (Sachsituation ↔ Rechnung)' },
  'PK.problemloesen': { leitidee: 'Prozessbezogene Kompetenz', text: 'Probleme mathematisch lösen (Knobelaufgaben, Strategien)' },
  'PK.darstellen': { leitidee: 'Prozessbezogene Kompetenz', text: 'Mathematische Darstellungen verwenden und wechseln' },
} as const satisfies Record<string, KmkTag>;

export type KmkTagId = keyof typeof KMK_TAGS;

export function isKmkTag(id: string): id is KmkTagId {
  return Object.prototype.hasOwnProperty.call(KMK_TAGS, id);
}

/** Where each topic sits in the curricula (shown on the page for parents and teachers). */
export const TOPIC_ALIGNMENT: Record<TopicId, { kmk: Leitidee[]; bayern: string; nrw: string }> = {
  zahlen: {
    kmk: ['Zahl und Operation', 'Muster, Strukturen und funktionaler Zusammenhang'],
    bayern: 'LehrplanPLUS 3/4, Lernbereich 1.1 Zahlen bis zur Million',
    nrw: 'Lehrplan 2021, Zahlen und Operationen: Zahlverständnis bis 1 000 000',
  },
  schriftlich: {
    kmk: ['Zahl und Operation'],
    bayern: 'LB 1.2: schriftliche Addition, Subtraktion (Abziehverfahren), Multiplikation (ein- und zweistellige Multiplikatoren), Division (Divisoren bis 10, auch mit Rest)',
    nrw: 'Ziffernrechnen: Addition, Subtraktion, Multiplikation sicher ausführen; Division durch einstellige Divisoren erläutern',
  },
  kopfrechnen: {
    kmk: ['Zahl und Operation', 'Muster, Strukturen und funktionaler Zusammenhang'],
    bayern: 'LB 1.2: Einmaleins automatisiert und flexibel, Übertragen auf Stufenzahlen, vorteilhaftes Rechnen',
    nrw: 'Schnelles Kopfrechnen; alle Zahlensätze des kleinen Einmaleins automatisiert',
  },
  groessen: {
    kmk: ['Größen und Messen'],
    bayern: 'LB 3.1–3.3: Längen, Gewichte, Rauminhalte, Zeit, Geld; Kommaschreibweise bei m/cm und €/ct',
    nrw: 'Größen und Messen: Geldwerte, Längen, Zeit, Gewichte, Rauminhalte (optional Tonne, Datenmengen)',
  },
  geometrie: {
    kmk: ['Raum und Form', 'Größen und Messen'],
    bayern: 'LB 2: Würfelgebäude und Baupläne, Würfel- und Quadernetze, Achsensymmetrie, Flächeninhalt',
    nrw: 'Raum und Form: Körper, Netze, Symmetrie, Flächeninhalt und Umfang durch Auslegen',
  },
  daten: {
    kmk: ['Daten und Zufall'],
    bayern: 'LB 4.1 Daten (Tabellen, Diagramme, Fahrpläne), LB 4.2 Zufall und Wahrscheinlichkeit',
    nrw: 'Daten, Häufigkeiten, Wahrscheinlichkeiten',
  },
  sachaufgaben: {
    kmk: ['Zahl und Operation', 'Größen und Messen', 'Muster, Strukturen und funktionaler Zusammenhang'],
    bayern: 'LB 1.3 Sachsituationen; LB 3.3 Sachaufgaben mit Größen',
    nrw: 'Sachsituationen modellieren; Ergebnisse auf die Situation beziehen',
  },
};
