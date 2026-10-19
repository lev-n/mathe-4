/**
 * Misconception families of the error library (docs/research.md M16, improvement kind 3, badge
 * "Stolperstein überwunden").
 *
 * Raw Bug ids are not stable misconception tags: the bug builders dedupe by value, so one misconception surfaces
 * under sibling ids (add.no-carry / add.no-carry-cut / add.last-carry); index ids split one misconception
 * (zeile-0-vergessen … zeile-3-vergessen, nachbar-5, fehlt-0, zr.carry-A); and one bare id means different things
 * in different skills ('addiert', 'vertauscht', 'aufgerundet', 'nachbar', 'mal' …). So the improvement tracking
 * stores the FAMILY of a bug, looked up per skill: tagFor(skillId, bugId).
 *
 * Family ids are stored in the consent-gated progress (growth.errors[skillId][familyId] in 'mathe4.v1'): never rename
 * or reuse one. They are lower-case slugs that src/state/growth.ts normalizeTag() leaves unchanged (no '-<digits>'
 * segment, no '-<capital letter>' ending). Bug ids themselves are internal and may change, as long as the table
 * below follows. The phrase of each family ("Du hast <object> jetzt fünfmal <participle>.") lives in
 * src/topics/errorPhrases.ts, keyed by the family id.
 *
 * What the tests check (errorFamilies.test.ts): each (skill, bug key) of the table belongs to one family, and a
 * generator sweep (every skill, Stufe 1–3, both subtraction methods, NRW extras on, a fixed set of seeds) finds no
 * emitted Bug id without a family of its skill and no table entry that it never emits. The sweep is a sample of
 * the generators, not a proof: a Bug id that only rare inputs produce can still be missing here, and then tagFor
 * falls back to the id itself (with FALLBACK_PHRASE in the texts).
 */
import { FAMILY_PHRASES, type FamilyId, type FamilyPhrase } from './errorPhrases';

export { FALLBACK_PHRASE, familyPhrase, type FamilyPhrase, type FamilyId } from './errorPhrases';

export interface ErrorFamily {
  /** Stable tag stored in the progress. */
  readonly id: string;
  /** From src/topics/errorPhrases.ts. */
  readonly phrase: FamilyPhrase;
  /** Written subtraction with the Ergänzen method (the hints say "Erweitern" and "gemerkte 1"). */
  readonly ergaenzen?: FamilyPhrase;
  /** skillId → the normalised Bug ids (bugKey) of this misconception in that skill. */
  readonly skills: Readonly<Record<string, readonly string[]>>;
}

/** A family: its phrase comes from errorPhrases.ts; `skills` maps skillId → space-separated Bug keys. */
function fam(id: FamilyId, skills: Record<string, string>): ErrorFamily {
  const parsed: Record<string, readonly string[]> = {};
  for (const [skillId, keys] of Object.entries(skills)) parsed[skillId] = keys.split(/\s+/).filter(Boolean);
  const { phrase, ergaenzen } = FAMILY_PHRASES[id];
  return ergaenzen ? { id, phrase, ergaenzen, skills: parsed } : { id, phrase, skills: parsed };
}

const ADD_CARRY = 'add.no-carry add.no-carry-cut add.carry-twice add.carry-too-small add.carry-swapped add.last-carry';
const MUL_CARRY = 'mul.no-carry mul.carry-before mul.last-carry mul.sum-no-carry';
const SUB_BORROW = 'sub.smaller-from-larger sub.no-reduce sub.zero-minus-n sub.zero-minus-n-zero sub.across-zero sub.borrow-added';

export const ERROR_FAMILIES: readonly ErrorFamily[] = [
  // ─── Schriftlich rechnen ───────────────────────────────────────────────────
  fam('uebertrag', {
    'schriftlich.addition': ADD_CARRY,
    'schriftlich.subtraktion': 'add.no-carry add.no-carry-cut add.carry-twice add.carry-swapped add.last-carry', // Probe with plus
    'schriftlich.fehlerdetektiv': `${ADD_CARRY} ${MUL_CARRY}`,
    'schriftlich.multiplikation': MUL_CARRY,
    'schriftlich.mal-dreistellig': MUL_CARRY,
    'schriftlich.ziffernraetsel': 'zr.carry', // plus and mal puzzles
    'kopfrechnen.verdoppeln-halbieren': 'uebertrag-vergessen',
    'kopfrechnen.stufenzahlen': 'uebertrag-vergessen', // plus tasks only
  }),
  // Written subtraction: the hints follow the child's method (Entbündeln, or Erweitern with the gemerkte 1).
  fam('entbuendeln', {
    'schriftlich.addition': SUB_BORROW, // Umkehraufgabe with minus
    'schriftlich.subtraktion': SUB_BORROW,
    'schriftlich.fehlerdetektiv': SUB_BORROW,
    'schriftlich.ziffernraetsel': 'zr.borrow', // minus puzzles
  }),
  // Mental subtraction: always Entbündeln (the subtraction method is about written subtraction).
  fam('entbuendeln-kopf', {
    'kopfrechnen.stufenzahlen': 'kleiner-minus-groesser entbuendeln-vergessen',
  }),
  fam('stellengerecht', {
    'schriftlich.addition': 'add.misaligned',
    'schriftlich.subtraktion': 'add.misaligned',
    'schriftlich.fehlerdetektiv': 'add.misaligned',
  }),
  fam('teilprodukte', {
    'schriftlich.multiplikation': 'mul.ones-only mul.unshifted mul.zero-skipped',
    'schriftlich.mal-dreistellig': 'mul.ones-only mul.unshifted mul.zero-skipped',
    'schriftlich.fehlerdetektiv': 'mul.ones-only mul.unshifted',
  }),
  fam('null-im-ergebnis', {
    'schriftlich.division': 'div.missing-zero div.missing-end-zero',
    'schriftlich.fehlerdetektiv': 'div.missing-zero div.missing-end-zero',
  }),
  fam('rest', {
    'schriftlich.division': 'div.rest-too-big div.rest-vergessen',
    'schriftlich.fehlerdetektiv': 'div.rest-too-big div.rest-vergessen',
    'schriftlich.ueberschlag-probe': 'probe.rest-abgezogen probe.rest-vergessen probe.rest-zuerst',
  }),
  fam('rest-mitnehmen', {
    'schriftlich.division': 'div.digitwise',
    'schriftlich.fehlerdetektiv': 'div.digitwise',
    'kopfrechnen.verdoppeln-halbieren': 'rest-vergessen',
  }),
  fam('teilen-anfang', {
    'schriftlich.division': 'div.drop-first',
    'schriftlich.fehlerdetektiv': 'div.drop-first',
  }),
  fam('rest-deuten', {
    'schriftlich.division': 'div.rest-ignored div.rest-instead div.divisor',
    'sachaufgaben.rest': 'abgerundet aufgerundet rest quotient',
    'zahlen.buendeln': 'aufgerundet',
    'geometrie.ecken-kanten-flaechen': 'aufgerundet',
    'daten.fahrplaene': 'aufgerundet',
  }),
  fam('rechenart', {
    'schriftlich.addition': 'sub.added',
    'schriftlich.subtraktion': 'sub.added sub.inverse-minus',
    'schriftlich.fehlerdetektiv': 'sub.added',
    'kopfrechnen.einmaleins': 'plus minus',
    'kopfrechnen.mal-durch-zehn': 'falsche-richtung',
    'kopfrechnen.verdoppeln-halbieren': 'halbiert verdoppelt',
    'groessen.wechselgeld': 'addiert',
    'groessen.schaetzen': 'addiert',
    'groessen.laengen': 'weg-addiert',
    'daten.strichlisten': 'alles-addiert dazugezaehlt minus-statt-plus plus-statt-minus',
    'daten.saeulendiagramme': 'alles-addiert minus-statt-plus plus-statt-minus',
    'daten.bilddiagramme': 'minus-statt-plus plus-statt-minus',
    'daten.fahrplaene': 'euro-als-anzahl',
    'sachaufgaben.einschrittig': 'rechenart signalwort',
    'sachaufgaben.mehrschrittig': 'addiert alles-addiert',
    'sachaufgaben.rest': 'mal',
  }),
  fam('rechenrichtung', {
    'groessen.zeitspannen': 'rueckwaerts vorwaerts',
    'groessen.uhrzeit': 'andere-richtung', // the clock runs fast or slow: subtract or add
    'kopfrechnen.verdoppeln-halbieren': 'vorwaerts',
  }),
  fam('ziffern-legen', {
    'zahlen.vergleichen': 'groesste-gebildet kleinste-gebildet null-vorne',
    'schriftlich.addition': 'add.one-big-number',
    'schriftlich.subtraktion': 'sub.small-desc',
  }),
  fam('hilfsaufgabe', {
    'schriftlich.rechenweg': 'hs.minus-s hs.plus-instead hs.second-part hs.second-part-sum',
    'schriftlich.multiplikation': 'mul.minus-factor mul.plus-factor mul.plus-one mul.double-plus-a mul.wrong-direction',
    'schriftlich.mal-dreistellig': 'mul.minus-factor mul.plus-factor mul.plus-one mul.wrong-direction',
    'kopfrechnen.ableiten': 'einer-vergessen falscher-faktor nachbar nicht-malgenommen nur-eins plus-zwei zehner-als-eins',
  }),
  fam('fehler-finden', {
    'schriftlich.fehlerdetektiv': 'fd.unchanged',
  }),

  // ─── Zahlen, Runden, Stellenwerte ──────────────────────────────────────────
  fam('runden', {
    'zahlen.runden': 'abgerundet abgeschnitten aufgerundet falsche-stelle-gross falsche-stelle-klein mitte nicht-genullt unveraendert ziel zu-gross',
    'schriftlich.ueberschlag-probe': 'ue.cut ue.exact',
    'sachaufgaben.ueberschlag': 'abgeschnitten genau',
  }),
  fam('nullen', {
    'zahlen.zahlwort': 'null-fehlt null-fehlt-innen tausend-als-000 zu-viele-nullen', // zeros after "tausend", no comma
    'zahlen.stellenwert': 'null-vergessen',
    'zahlen.buendeln': 'eine-stelle-zu-viel eine-stelle-zu-wenig',
    'schriftlich.ueberschlag-probe': 'ue.zeros-extra ue.zeros-lost',
    'schriftlich.rechenweg': 'hs.zeros',
    'kopfrechnen.mal-durch-zehn': 'innere-null-weg null-zu-viel null-zu-wenig stelle-zu-viel stelle-zu-wenig',
    'kopfrechnen.stufenzahlen': 'null-zu-viel null-zu-wenig',
    'kopfrechnen.paeckchen': 'null-zu-wenig',
    'groessen.geld': 'null-fehlt null-weg null-vorn',
    'groessen.laengen': 'null-fehlt',
    'groessen.gewichte': 'null-fehlt',
    'groessen.hohlmasse': 'null-fehlt',
    'groessen.tonnen': 'null-fehlt',
  }),
  fam('stellenwert', {
    'zahlen.stellenwert':
      'addiert falsche-spalte-links falsche-spalte-rechts nicht-sechsstellig nur-altes nur-dazu nur-neues nur-weg nur-ziffer regel-vergessen ' +
      'reihenfolge spalten-gezaehlt stelle-links stelle-rechts stelle-zu-gross stelle-zu-klein stellen-gezaehlt unveraendert zu-weit-links',
    'zahlen.buendeln': 'abgeschrieben falsche-stelle nur-ziffer vertauscht',
  }),
  fam('zahlendreher', {
    'zahlen.zahlwort': 'dreher-rest dreher-tausender',
  }),
  fam('nachbarzahlen', {
    'zahlen.nachbarzahlen': 'gegeben stelle-zu-gross stelle-zu-klein uebergang verwechselt vorgaenger-nachfolger zahl-selbst',
  }),
  fam('abstand', {
    'zahlen.nachbarzahlen': 'abstand gerundet halber-abstand mit-raendern',
    'zahlen.zahlenstrahl': 'abstand halber-abstand',
  }),
  fam('zahlenstrahl', {
    'zahlen.zahlenstrahl': 'einer-mehr einer-weniger lang-kurz-vertauscht schritt-zu-gross schritt-zu-klein striche-gezaehlt',
  }),
  fam('binaer', {
    'zahlen.binaer': 'eins-dazu karten-gezaehlt naechste-karte nur-groesste umgedreht ziffern-gelesen',
  }),
  fam('muster', {
    'zahlen.zahlenfolgen': 'gleicher-schritt richtung schritt-zehnmal schritt-zehntel',
    'kopfrechnen.paeckchen': 'gleicher-schritt nicht-veraendert',
  }),

  // ─── Größen ────────────────────────────────────────────────────────────────
  fam('komma', {
    'groessen.geld': 'addiert zehner-cent null-hinten nur-cent nur-euro',
    'groessen.laengen': 'addiert komma-weg',
    'groessen.gewichte': 'komma-weg',
    'groessen.hohlmasse': 'komma-weg',
    'groessen.tonnen': 'komma-weg',
  }),
  fam('umrechnungszahl', {
    'groessen.geld': 'faktor',
    'groessen.laengen': 'faktor cm-statt-mm',
    'groessen.gewichte': 'faktor durch-10 viertel-4',
    'groessen.hohlmasse': 'faktor durch-10 viertel-4',
    'groessen.tonnen': 'faktor durch-10',
    'groessen.schaetzen': 'faktor',
    'sachaufgaben.rest': 'meter',
  }),
  fam('einheiten', {
    'groessen.geld': 'abgeschrieben cent-als-euro',
    'groessen.laengen': 'abgeschrieben nur-addiert vertauscht',
    'groessen.gewichte': 'abgeschrieben nur-addiert vertauscht',
    'groessen.hohlmasse': 'abgeschrieben nur-addiert vertauscht',
    'groessen.tonnen': 'abgeschrieben nur-addiert vertauscht',
    'groessen.vergleichen': 'nur-zahlen-verglichen',
    'sachaufgaben.menge-preis': 'cent',
  }),
  fam('zeiteinheiten', {
    'groessen.uhrzeit': 'bis-100',
    'groessen.zeitspannen': 'durch-5 hundert kleiner-von-groesser nur-addiert ohne-uebertrag schultage tage zehn zehner zwoelf',
    'daten.fahrplaene': 'hundert-minuten nur-minuten',
    'sachaufgaben.mehrschrittig': 'hundert',
  }),
  fam('uhr-lesen', {
    'groessen.uhrzeit': 'fuenf-nach-halb fuenf-vor-halb halb-verwechselt naechste-stunde ohne-12 vor-nach zeiger-vertauscht',
  }),
  fam('ergaenzen', {
    'kopfrechnen.ergaenzen': 'eins-zu-viel eins-zu-wenig jede-ziffer-zu-10',
  }),
  fam('cent-ergaenzen', {
    'groessen.wechselgeld': 'kleiner-von-groesser ziffern-zu-10',
  }),
  // Change and missing money: the Euro broken into Cent is taken off the Euro (Ergänzen, not written subtraction).
  fam('euro-wechseln', {
    'groessen.wechselgeld': 'euro-nicht-entbuendelt',
    'sachaufgaben.mehrschrittig': 'euro-nicht-entbuendelt',
  }),
  fam('messen', {
    'groessen.laengen': 'ein-cm-daneben ende-abgelesen naechster-cm rueckwaerts striche-gezaehlt',
    'groessen.gewichte': 'strich-10g strich-zu-viel',
    'groessen.hohlmasse': 'strich-100 strich-zu-viel striche-gezaehlt',
  }),
  fam('geld-zaehlen', {
    'groessen.geld': 'cent-vergessen stueck-gezaehlt',
  }),
  fam('stueckelung', {
    'groessen.geld': 'cent-muenzen-vergessen mehr sorten', // fewest notes and coins
  }),
  fam('vergleichsgroesse', {
    'groessen.schaetzen': 'meter-gleich-schritt',
  }),

  // ─── Daten ─────────────────────────────────────────────────────────────────
  fam('diagramm-lesen', {
    'daten.saeulendiagramme': 'linien-gezaehlt nicht-groesster nicht-kleinster',
    'daten.diagramme-pruefen': 'ab-null-gezaehlt linien-gezaehlt',
  }),
  fam('fuenferbuendel', {
    'daten.strichlisten': 'aufgerundet buendel-als-eins buendel-als-vier vierer-buendel zehner-buendel',
    'daten.darstellungen': 'vier eins',
  }),
  fam('bildwert', {
    'daten.bilddiagramme':
      'additiv-gedacht alte-anzahl bilder-gezaehlt bilder-gezaehlt-halb ganze-bilder-gezaehlt halb-als-ganz halb-vergessen halbe-vergessen ' +
      'mal-statt-geteilt nur-legende wert-statt-bilder',
  }),
  fam('alle-werte', {
    'daten.strichlisten': 'zeile-vergessen zahl-vergessen',
    'daten.saeulendiagramme': 'wert-vergessen nur-einer',
    'daten.bilddiagramme': 'zeile-vergessen',
    'groessen.wechselgeld': 'nur-ware ware-vergessen',
    'daten.fahrplaene': 'zweites-vergessen',
    'groessen.gewichte': 'ganzes-vergessen',
    'groessen.hohlmasse': 'ganzes-vergessen',
    'groessen.tonnen': 'ganzes-vergessen',
  }),
  fam('anzahl', {
    'daten.fahrplaene': 'alles-mal einmal je-einer menge-vergessen',
    'groessen.gewichte': 'nur-einmal',
    'groessen.hohlmasse': 'nur-ein-glas nur-ein-liter',
    'groessen.tonnen': 'eine-kiste',
    'groessen.schaetzen': 'pro-kg pro-liter',
    'geometrie.ecken-kanten-flaechen': 'ein-koerper je-ein-modell nur-ein-modell',
    'sachaufgaben.menge-preis': 'eine-zeile',
  }),
  fam('frage', {
    'groessen.wechselgeld': 'nur-summe rueckgeld',
    'groessen.gewichte': 'verbraucht',
    'groessen.hohlmasse': 'eingegossen',
    'groessen.tonnen': 'geladen',
    'groessen.laengen': 'gegangen',
    'groessen.uhrzeit': 'minuten-abgelesen',
    'groessen.zeitspannen': 'endzeit',
    'geometrie.flaeche': 'flaeche-der-figur ganzes-rechteck',
    'geometrie.wuerfelgebaeude': 'ganzer-quader vorhandene',
    'daten.fahrplaene': 'einzelpreis familienkarte',
    'daten.strichlisten': 'nur-summe',
    'daten.saeulendiagramme': 'nur-summe',
    'sachaufgaben.menge-preis': 'gesamt einzelpreis',
  }),
  fam('fahrplan', {
    'daten.fahrplaene': 'bus-weg haltestelle uebernaechster zeile',
  }),
  fam('moeglichkeiten', {
    'daten.kombinatorik':
      'alle-mal-alle alle-nachher alle-plaetze-drei alle-vorher doppelt-gezaehlt dritte-vergessen gesamtzahl halb-addiert ' +
      'minus-statt-geteilt mit-wiederholung nur-ein-kind nur-eine nur-erster-platz plus-statt-mal',
  }),
  fam('sicher-ziehen', {
    'daten.zufall': 'alle anzahl-farben eine plus-eins-vergessen zielfarbe zwei',
  }),
  fam('chancen', {
    'daten.chancen': 'alle-zusammen anzahl-andere eine-zu-viel nur-gleich',
  }),

  // ─── Sachaufgaben ──────────────────────────────────────────────────────────
  fam('alle-schritte', {
    'sachaufgaben.mehrschrittig':
      'alle alle-zwei-punkte alle-erwachsenenpreis anzahl-vergessen beides-mal bus-nicht-geteilt ein-brett ein-heft einmal-rezept essen-vergessen ' +
      'ganze-linie je-eins kinder-vergessen koerbe nur-bus nur-einkauf nur-erstes nur-hefte tor-vergessen verbrauch verkauft zweite-ware-vergessen',
    'groessen.zeitspannen': 'bis-mitternacht bus-vergessen nur-zug warten-vergessen',
    'kopfrechnen.mal-durch-zehn': 'nur-ein-schritt',
    'daten.strichlisten': 'nicht-korrigiert',
  }),
  fam('nicht-loesbar', {
    'sachaufgaben.angaben': 'fehlt summe produkt differenz',
  }),
  fam('ueberfluessig', {
    'sachaufgaben.angaben': 'ueberfluessig',
  }),
  fam('zuordnung', {
    'sachaufgaben.menge-preis': 'addiert additiv mal-personen preis-mal-anzahl',
  }),
  fam('situation', {
    'sachaufgaben.menge-preis': 'geteilt mal proportional',
  }),
  // A fence around a bed (lengths in m); 'randlinien' is the perimeter of a figure on the grid.
  fam('alle-seiten', {
    'sachaufgaben.mehrschrittig': 'zwei-seiten',
  }),

  // ─── Geometrie ─────────────────────────────────────────────────────────────
  fam('ekf', {
    'geometrie.ecken-kanten-flaechen':
      'verwechselt-ecken verwechselt-kanten verwechselt-flaechen ecken-kanten-vertauscht vertauscht ecken-gezaehlt ecken-statt-kanten ' +
      'kanten-an-ecke kanten-an-spitze flaechen-an-kante ecken-einer-flaeche flaechen-null gebogene-flaeche-vergessen kanten-null umriss-als-kante',
  }),
  fam('versteckt', {
    'geometrie.ecken-kanten-flaechen': 'nur-sichtbare nur-sichtbare-ecken nur-sichtbare-kanten nur-sichtbare-flaechen',
  }),
  fam('wuerfel-zaehlen', {
    'geometrie.wuerfelgebaeude': 'felder nur-oben nur-sichtbare tuerme',
  }),
  fam('wuerfelnetz', {
    'geometrie.wuerfelnetze': 'gleiche-zahl nachbar',
  }),
  fam('figuren', {
    'geometrie.figuren': 'rw-rechteck rw-quadrat rw-parallelogramm rw-zwei-rechtecke seiten-quadrat parallel-rechteck ecken-sechseck-dreieck dreieck-rechte-winkel',
  }),
  fam('quadrate', {
    'geometrie.figuren': 'nur-kleine ohne-mittlere plus-eins',
  }),
  fam('symmetrie', {
    'geometrie.symmetrie': 'achsen',
  }),
  fam('flaeche-umfang', {
    'geometrie.flaeche': 'umfang',
    'geometrie.umfang': 'flaeche',
    'sachaufgaben.mehrschrittig': 'flaeche',
  }),
  fam('kaestchen', {
    'geometrie.flaeche': 'breite-plus-hoehe halbe-als-ganze halbe-vergessen luecke-als-eins nicht-abgezogen randkaestchen rechteck-drumherum',
  }),
  fam('randlinien', {
    'geometrie.umfang': 'randkaestchen rechteck-drumherum zwei-seiten',
  }),

  // ─── Kopfrechnen ───────────────────────────────────────────────────────────
  fam('einmaleins', {
    'kopfrechnen.einmaleins': 'eine-reihe-mehr eine-reihe-weniger eins-mehr eins-weniger nachbar-mehr nachbar-weniger',
  }),
  fam('tauschaufgabe', {
    'kopfrechnen.einmaleins': 'ohne-tausch vertauscht',
  }),
  fam('ausgleichen', {
    'kopfrechnen.vorteilhaft': 'gegensinnig gleichsinnig nicht-ausgeglichen verkehrt-ausgeglichen',
    'kopfrechnen.paeckchen': 'gleichsinnig plus-ausgleich',
  }),
  fam('teiler', {
    'kopfrechnen.teiler-vielfache': 'alle-teiler einer-zu-viel eins-vergessen falsche-reihe grenze ohne-1-und-zahl plus-eins produkt',
  }),
];

// ─── Lookup ───────────────────────────────────────────────────────────────────

/** Bug ids whose trailing digit is part of the misconception, not an index ('a quarter: divide by 4'). */
const KEEP_DIGIT = new Set(['viertel-4', 'durch-5']);

/**
 * The Bug id without the parts that only number its variants: 'vier-2' → 'vier', 'zeile-0-vergessen' →
 * 'zeile-vergessen', 'faktor-1000' → 'faktor', 'zr.carry-A' → 'zr.carry', 'nur-einer-b' → 'nur-einer',
 * 'rechenart-+' → 'rechenart'. Words stay ('sub.zero-minus-n', 'hs.minus-s', 'mul.double-plus-a'), and so do numbers
 * that are part of the misconception ('durch-10', 'bis-100', 'ohne-12', 'viertel-4', 'tausend-als-000').
 */
export function bugKey(id: string): string {
  const s = id.trim();
  if (KEEP_DIGIT.has(s)) return s;
  return s
    .replace(/^rechenart-[-+*:]$/, 'rechenart') // the wrong operation that was used
    .replace(/^faktor-10{1,3}$/, 'faktor') // the wrong conversion factor
    .replace(/^(zr\.(?:carry|borrow))-[A-Z]$/, '$1') // the gap letter
    .replace(/^nur-einer-[a-z]$/, 'nur-einer') // which bar was left out
    .replace(/-\d-vergessen$/, '-vergessen') // which row was left out
    .replace(/-\d$/, ''); // row, item or face index
}

/** Characters src/state/growth.ts accepts in a tag (same rule). */
const TAG_RE = /^[A-Za-z0-9][A-Za-z0-9._:+*-]{0,47}$/;

/** A tag for a Bug id without a family: also free of longer index segments, so growth.ts keeps it as it is. */
function fallbackTag(key: string): string | null {
  const tag = key.replace(/-\d+(?=-|$)/g, '').replace(/-[A-Z]$/, '');
  return TAG_RE.test(tag) ? tag : null;
}

/** skillId → bugKey → family id (built once). */
const INDEX: ReadonlyMap<string, ReadonlyMap<string, string>> = (() => {
  const index = new Map<string, Map<string, string>>();
  for (const f of ERROR_FAMILIES) {
    for (const [skillId, keys] of Object.entries(f.skills)) {
      let bySkill = index.get(skillId);
      if (!bySkill) index.set(skillId, (bySkill = new Map()));
      for (const key of keys) if (!bySkill.has(key)) bySkill.set(key, f.id);
    }
  }
  return index;
})();

const BY_ID: ReadonlyMap<string, ErrorFamily> = new Map(ERROR_FAMILIES.map((f) => [f.id, f]));

/** The family of a Bug id in a skill, or null if the table has none (then tagFor falls back to the id itself). */
export function familyOf(skillId: string, bugId: string): ErrorFamily | null {
  if (typeof bugId !== 'string') return null;
  const id = INDEX.get(skillId)?.get(bugKey(bugId));
  return id === undefined ? null : (BY_ID.get(id) ?? null);
}

/**
 * Error-library tag of a Bug id in a skill: the family id, or (unknown skill or id) the id without its index parts.
 * Null for ids that are no usable tag. Pure and cheap (called for every exercise).
 */
export function tagFor(skillId: string, bugId: string): string | null {
  if (typeof bugId !== 'string') return null;
  const key = bugKey(bugId);
  return INDEX.get(skillId)?.get(key) ?? fallbackTag(key);
}

/** Distinct tags of an exercise's (or an item's) Bug ids, in order. */
export function tagsFor(skillId: string, bugIds: readonly string[] | undefined): string[] {
  const out: string[] = [];
  for (const id of bugIds ?? []) {
    const tag = tagFor(skillId, id);
    if (tag !== null && !out.includes(tag)) out.push(tag);
  }
  return out;
}
