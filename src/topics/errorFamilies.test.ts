import { describe, expect, it } from 'vitest';
import { createRng } from '../core/rng';
import { BANNED_PHRASES } from '../core/testing';
import type { GenContext, Stufe, SubtractionMethod } from '../core/types';
import { STUFEN } from '../core/types';
import { normalizeTag } from '../state/growth';
import { ERROR_FAMILIES, FALLBACK_PHRASE, bugKey, familyOf, familyPhrase, tagFor, tagsFor } from './errorFamilies';
import { loadAllTopics } from './registry';

const METHODS: SubtractionMethod[] = ['abziehen', 'ergaenzen'];
const sentence = (tag: string, method: SubtractionMethod = 'abziehen') => {
  const { object, participle } = familyPhrase(tag, method);
  return `Du hast ${object} jetzt fünfmal ${participle}.`;
};
const familyIds = new Set(ERROR_FAMILIES.map((f) => f.id));

describe('errorFamilies: the table', () => {
  it('family ids are unique, stable slugs that the progress store keeps unchanged', () => {
    expect(familyIds.size).toBe(ERROR_FAMILIES.length);
    for (const { id } of ERROR_FAMILIES) {
      expect(id, id).toMatch(/^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$/);
      expect(id, id).not.toMatch(/-\d+$|-\d+-|-[A-Z]$/);
      expect(normalizeTag(id), id).toBe(id);
    }
  });

  it('every (skill, bug key) belongs to exactly one family; every family applies to a skill', () => {
    const owner = new Map<string, string>();
    const conflicts: string[] = [];
    for (const f of ERROR_FAMILIES) {
      expect(Object.keys(f.skills).length, f.id).toBeGreaterThan(0);
      for (const [skillId, keys] of Object.entries(f.skills)) {
        expect(skillId, f.id).toMatch(/^[a-z]+\.[a-z0-9-]+$/);
        expect(keys.length, `${f.id} ${skillId}`).toBeGreaterThan(0);
        for (const key of keys) {
          // the table lists normalised keys only
          expect(bugKey(key), `${f.id} ${skillId} ${key}`).toBe(key);
          const k = `${skillId}|${key}`;
          if (owner.has(k)) conflicts.push(`${k}: ${owner.get(k)} and ${f.id}`);
          owner.set(k, f.id);
        }
      }
    }
    expect(conflicts).toEqual([]);
  });

  it('a stored family id given again keeps its family (no collision with a raw bug id of the same skill)', () => {
    for (const f of ERROR_FAMILIES) for (const skillId of Object.keys(f.skills)) expect(tagFor(skillId, f.id), `${skillId} ${f.id}`).toBe(f.id);
  });
});

describe('errorFamilies: tagFor', () => {
  it('sibling ids of one misconception give one family', () => {
    for (const id of ['add.no-carry', 'add.no-carry-cut', 'add.last-carry', 'add.carry-twice', 'add.carry-too-small', 'add.carry-swapped']) {
      expect(tagFor('schriftlich.addition', id), id).toBe('uebertrag');
    }
    for (const id of ['mul.no-carry', 'mul.carry-before', 'mul.last-carry', 'mul.sum-no-carry']) expect(tagFor('schriftlich.multiplikation', id), id).toBe('uebertrag');
    for (const id of ['sub.smaller-from-larger', 'sub.no-reduce', 'sub.zero-minus-n', 'sub.zero-minus-n-zero', 'sub.across-zero', 'sub.borrow-added']) {
      expect(tagFor('schriftlich.subtraktion', id), id).toBe('entbuendeln');
    }
    expect(tagFor('schriftlich.division', 'div.missing-zero')).toBe(tagFor('schriftlich.division', 'div.missing-end-zero'));
  });

  it('index ids (row, item, face, gap letter, operator, factor) give one family', () => {
    const cases: [string, string[], string][] = [
      ['daten.strichlisten', ['zeile-0-vergessen', 'zeile-1-vergessen', 'zeile-3-vergessen', 'zahl-2-vergessen'], 'alle-werte'],
      ['daten.saeulendiagramme', ['wert-0-vergessen', 'wert-4-vergessen', 'nur-einer-b', 'nur-einer-c'], 'alle-werte'],
      ['daten.darstellungen', ['vier-0', 'vier-2', 'vier-3'], 'fuenferbuendel'],
      ['geometrie.wuerfelnetze', ['nachbar-1', 'nachbar-5', 'nachbar-6'], 'wuerfelnetz'],
      ['sachaufgaben.angaben', ['fehlt-0', 'fehlt-4', 'summe'], 'nicht-loesbar'],
      ['sachaufgaben.angaben', ['ueberfluessig-0', 'ueberfluessig-1'], 'ueberfluessig'],
      ['sachaufgaben.einschrittig', ['rechenart-+', 'rechenart--', 'rechenart-*', 'rechenart-:', 'signalwort'], 'rechenart'],
      ['groessen.laengen', ['faktor-10', 'faktor-100', 'faktor-1000', 'cm-statt-mm'], 'umrechnungszahl'],
      ['groessen.wechselgeld', ['nur-ware-0', 'ware-vergessen-2'], 'alle-werte'],
      ['schriftlich.ziffernraetsel', ['zr.carry-A', 'zr.carry-C'], 'uebertrag'],
      ['schriftlich.ziffernraetsel', ['zr.borrow-A', 'zr.borrow-B'], 'entbuendeln'],
      ['geometrie.figuren', ['rw-parallelogramm-0', 'rw-parallelogramm-1', 'dreieck-rechte-winkel-2', 'seiten-quadrat-0'], 'figuren'],
      ['geometrie.ecken-kanten-flaechen', ['kanten-an-ecke-0', 'kanten-an-ecke-1', 'verwechselt-ecken'], 'ekf'],
      ['geometrie.symmetrie', ['achsen-0', 'achsen-1'], 'symmetrie'],
      ['daten.fahrplaene', ['zeile-0', 'zeile-4', 'haltestelle-3', 'bus-weg'], 'fahrplan'],
    ];
    for (const [skillId, ids, family] of cases) for (const id of ids) expect(tagFor(skillId, id), `${skillId} ${id}`).toBe(family);
  });

  it('the same bare id in different skills gives different families', () => {
    const cases: [string, string, string][] = [
      ['zahlen.runden', 'aufgerundet', 'runden'],
      ['sachaufgaben.rest', 'aufgerundet', 'rest-deuten'],
      ['daten.strichlisten', 'aufgerundet', 'fuenferbuendel'],
      ['groessen.wechselgeld', 'addiert', 'rechenart'],
      ['groessen.geld', 'addiert', 'komma'],
      ['zahlen.stellenwert', 'addiert', 'stellenwert'],
      ['sachaufgaben.menge-preis', 'addiert', 'zuordnung'],
      ['kopfrechnen.ableiten', 'nachbar', 'hilfsaufgabe'],
      ['geometrie.wuerfelnetze', 'nachbar', 'wuerfelnetz'],
      ['zahlen.buendeln', 'vertauscht', 'stellenwert'],
      ['groessen.laengen', 'vertauscht', 'einheiten'],
      ['geometrie.ecken-kanten-flaechen', 'vertauscht', 'ekf'],
      ['kopfrechnen.einmaleins', 'vertauscht', 'tauschaufgabe'],
      ['sachaufgaben.rest', 'mal', 'rechenart'],
      ['sachaufgaben.menge-preis', 'mal', 'situation'],
      ['sachaufgaben.mehrschrittig', 'alle', 'alle-schritte'],
      ['daten.zufall', 'alle', 'sicher-ziehen'],
      ['geometrie.figuren', 'plus-eins', 'quadrate'],
      ['kopfrechnen.teiler-vielfache', 'plus-eins', 'teiler'],
      ['groessen.zeitspannen', 'rueckwaerts', 'rechenrichtung'],
      ['groessen.laengen', 'rueckwaerts', 'messen'],
      ['geometrie.ecken-kanten-flaechen', 'nur-sichtbare', 'versteckt'],
      ['geometrie.wuerfelgebaeude', 'nur-sichtbare', 'wuerfel-zaehlen'],
      ['groessen.zeitspannen', 'kleiner-von-groesser', 'zeiteinheiten'],
      ['groessen.wechselgeld', 'kleiner-von-groesser', 'cent-ergaenzen'],
      ['kopfrechnen.verdoppeln-halbieren', 'uebertrag-vergessen', 'uebertrag'],
    ];
    for (const [skillId, id, family] of cases) expect(tagFor(skillId, id), `${skillId} ${id}`).toBe(family);
  });

  it('ids renamed in the generators keep two misconceptions of one skill apart', () => {
    expect(tagFor('kopfrechnen.stufenzahlen', 'uebertrag-vergessen')).toBe('uebertrag');
    expect(tagFor('kopfrechnen.stufenzahlen', 'entbuendeln-vergessen')).toBe('entbuendeln-kopf');
    expect(tagFor('kopfrechnen.stufenzahlen', 'kleiner-minus-groesser')).toBe('entbuendeln-kopf');
    expect(tagFor('groessen.laengen', 'addiert')).toBe('komma');
    expect(tagFor('groessen.laengen', 'weg-addiert')).toBe('rechenart');
    expect(tagFor('sachaufgaben.mehrschrittig', 'alle-zwei-punkte')).toBe('alle-schritte');
  });

  it('keeps words and numbers that are part of the misconception', () => {
    const words = ['sub.zero-minus-n', 'hs.minus-s', 'mul.double-plus-a', 'viertel-4', 'durch-5', 'durch-10', 'bis-100', 'ohne-12', 'strich-100', 'strich-10g'];
    for (const id of [...words, 'tausend-als-000', 'ohne-1-und-zahl', 'jede-ziffer-zu-10', 'ziffern-zu-10']) expect(bugKey(id), id).toBe(id);
    expect(tagFor('schriftlich.subtraktion', 'sub.zero-minus-n')).toBe('entbuendeln');
    expect(tagFor('schriftlich.rechenweg', 'hs.minus-s')).toBe('hilfsaufgabe');
    expect(tagFor('schriftlich.multiplikation', 'mul.double-plus-a')).toBe('hilfsaufgabe');
    expect(tagFor('groessen.gewichte', 'viertel-4')).toBe('umrechnungszahl');
    expect(tagFor('groessen.zeitspannen', 'durch-5')).toBe('zeiteinheiten');
    expect(tagFor('groessen.uhrzeit', 'bis-100')).toBe('zeiteinheiten');
    expect(tagFor('groessen.uhrzeit', 'ohne-12')).toBe('uhr-lesen');
    expect(tagFor('zahlen.zahlwort', 'tausend-als-000')).toBe('nullen');
    expect(tagFor('kopfrechnen.teiler-vielfache', 'ohne-1-und-zahl')).toBe('teiler');
  });

  it('unknown skills or ids fall back to the id without its index parts, which growth.ts keeps as it is', () => {
    expect(tagFor('kopfrechnen.test', 'one-more')).toBe('one-more');
    // families are per skill: a known id in a skill that does not list it is not guessed
    expect(tagFor('kopfrechnen.test', 'add.no-carry')).toBe('add.no-carry');
    expect(tagFor('schriftlich.addition', 'neu.fehler-3')).toBe('neu.fehler');
    expect(tagFor('neu.skill', 'zeile-12')).toBe('zeile');
    expect(tagFor('neu.skill', 'zeile-12-vergessen')).toBe('zeile-vergessen');
    expect(tagFor('neu.skill', 'luecke-B')).toBe('luecke');
    expect(tagFor('neu.skill', 'rechenart-+')).toBe('rechenart');
    for (const id of ['one-more', 'neu.fehler-3', 'zeile-12', 'faktor-10000', 'x-1-y-22', 'luecke-B', 'rechenart-:', 'toString']) {
      const tag = tagFor('neu.skill', id)!;
      expect(tag, id).not.toBeNull();
      expect(normalizeTag(tag), id).toBe(tag);
    }
  });

  it('ids that are no usable tag give null; prototype names are plain strings', () => {
    for (const bad of ['', ' ', 'mit leerzeichen', 'ü-fehler', '__proto__', '<script>', '-x', 'x'.repeat(49)]) expect(tagFor('schriftlich.addition', bad), bad).toBeNull();
    expect(tagFor('schriftlich.addition', 3 as unknown as string)).toBeNull();
    expect(tagFor('constructor', 'toString')).toBe('toString');
    expect(tagFor('schriftlich.addition', 'constructor')).toBe('constructor');
    expect(familyOf('schriftlich.addition', 'constructor')).toBeNull();
    expect(familyOf('__proto__', 'add.no-carry')).toBeNull();
  });

  it('tagsFor: distinct tags in order, unusable ids dropped', () => {
    expect(tagsFor('schriftlich.addition', ['add.no-carry', 'add.carry-twice', 'add.misaligned', 'sub.no-reduce', 'kaputt id', 'add.last-carry'])).toEqual([
      'uebertrag',
      'stellengerecht',
      'entbuendeln',
    ]);
    expect(tagsFor('daten.strichlisten', ['zeile-0-vergessen', 'zeile-1-vergessen', 'zeile-2-vergessen'])).toEqual(['alle-werte']);
    expect(tagsFor('schriftlich.addition', undefined)).toEqual([]);
    expect(tagsFor('schriftlich.addition', [])).toEqual([]);
  });
});

describe('errorFamilies: familyPhrase', () => {
  it('written subtraction follows the child’s method; mental subtraction and other families do not', () => {
    expect(familyPhrase('entbuendeln')).toEqual({ object: 'das Entbündeln', participle: 'richtig gemacht' });
    expect(familyPhrase('entbuendeln', 'abziehen')).toEqual({ object: 'das Entbündeln', participle: 'richtig gemacht' });
    expect(familyPhrase('entbuendeln', 'ergaenzen')).toEqual({ object: 'das Erweitern mit der gemerkten 1', participle: 'richtig gemacht' });
    expect(sentence('entbuendeln', 'ergaenzen')).toBe('Du hast das Erweitern mit der gemerkten 1 jetzt fünfmal richtig gemacht.');
    expect(familyPhrase('entbuendeln-kopf', 'ergaenzen')).toEqual({ object: 'das Entbündeln', participle: 'richtig gemacht' });
    expect(familyPhrase('uebertrag', 'ergaenzen')).toEqual(familyPhrase('uebertrag', 'abziehen'));
    expect(sentence('uebertrag')).toBe('Du hast den Übertrag jetzt fünfmal richtig beachtet.');
    // zahlen.zahlwort 'null-fehlt' is about the zeros after "tausend", not about a comma
    expect(sentence(tagFor('zahlen.zahlwort', 'null-fehlt')!)).toBe('Du hast die Nullen jetzt fünfmal richtig gesetzt.');
  });

  it('unknown tags (also raw bug ids and prototype names) get the fallback phrase', () => {
    expect(FALLBACK_PHRASE).toEqual({ object: 'die knifflige Stelle in diesen Aufgaben', participle: 'richtig gelöst' });
    for (const tag of ['one-more', 'add.no-carry', '', 'constructor', '__proto__', 'toString']) {
      for (const m of METHODS) expect(familyPhrase(tag, m), tag).toEqual(FALLBACK_PHRASE);
    }
  });

  it('every sentence names what the child did, in du-form, without banned words, traits or speed', () => {
    const traits = /\b(schlau|klug|clever|begabt|talent\w*|schnell\w*|langsam\w*|super|toll\w*|großartig\w*|beste[nmrs]?|meister\w*|fehlerfrei)\b/i;
    const all = [...ERROR_FAMILIES.flatMap((f) => METHODS.map((m) => sentence(f.id, m))), sentence('unbekannt')];
    for (const s of all) {
      expect(s).toMatch(/^Du hast .+ jetzt fünfmal .+\.$/);
      expect(s, s).not.toMatch(traits);
      expect(s, s).not.toMatch(/\s{2}|\s\.$/);
      const lower = s.toLowerCase();
      for (const banned of BANNED_PHRASES) expect(new RegExp(`(^|[^a-zäöüß])${banned}([^a-zäöüß]|$)`).test(lower), `"${banned}" in "${s}"`).toBe(false);
    }
  });

  it('within a skill, every family has its own sentence (the progress view lists them side by side)', () => {
    const bySkill = new Map<string, string[]>();
    for (const f of ERROR_FAMILIES) for (const skillId of Object.keys(f.skills)) bySkill.set(skillId, [...(bySkill.get(skillId) ?? []), f.id]);
    for (const [skillId, ids] of bySkill) {
      for (const m of METHODS) {
        const texts = ids.map((id) => sentence(id, m));
        expect(new Set(texts).size, `${skillId} ${m}: ${texts.join(' | ')}`).toBe(texts.length);
        expect(texts, skillId).not.toContain(sentence('unbekannt'));
      }
    }
  });
});

describe('errorFamilies: generator sweep', () => {
  const SEEDS = 40;
  const ctxs: GenContext[] = METHODS.map((subtractionMethod) => ({ subtractionMethod, nrwExtras: true, today: '2026-10-19' }));

  it(`every Bug id of every skill (Stufe 1–3, both methods, NRW extras, ${SEEDS} seeds) has a family of that skill`, async () => {
    const mods = await loadAllTopics();
    const unmapped = new Map<string, number>();
    let exercises = 0;
    let withBugs = 0;
    for (const mod of mods) {
      for (const skill of mod.skills) {
        for (const stufe of STUFEN as readonly Stufe[]) {
          for (const ctx of ctxs) {
            for (let seed = 1; seed <= SEEDS; seed++) {
              const ex = skill.generate(createRng(seed * 104_729 + stufe * 31), stufe, ctx);
              exercises++;
              const ids = (ex.bugs ?? []).map((b) => b.id);
              if (ids.length > 0) withBugs++;
              for (const id of ids) {
                const family = familyOf(skill.id, id);
                const tag = tagFor(skill.id, id);
                if (!family || tag !== family.id || !Object.hasOwn(family.skills, skill.id)) {
                  const k = `${skill.id} ${id} → ${tag}`;
                  unmapped.set(k, (unmapped.get(k) ?? 0) + 1);
                }
              }
              for (const tag of tagsFor(skill.id, ids)) expect(familyIds.has(tag), `${skill.id} ${tag}`).toBe(true);
            }
          }
        }
      }
    }
    expect([...unmapped.keys()]).toEqual([]);
    expect(mods.flatMap((m) => m.skills).length).toBeGreaterThan(50);
    expect(exercises).toBeGreaterThan(10_000);
    expect(withBugs).toBeGreaterThan(exercises / 2);
  }, 30_000);
});
