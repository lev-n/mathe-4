import { describe, expect, it } from 'vitest';
import { BANNED_PHRASES } from '../core/testing';
import { applyAnswer } from './mastery';
import { IMPORT_MESSAGES, MAX_IMPORT_CHARS, MIGRATIONS, migrate, migrateV1toV2, parseDocument, parseSettings, parseText, sanitizeSettingsPatch, serializeState, validateState } from './schema';
import type { Migration } from './schema';
import { emptyState } from './store';
import { ev } from './testkit';
import { DEFAULT_SETTINGS } from './types';
import type { ProgressState } from './types';

function richState(): ProgressState {
  let s = emptyState();
  for (let i = 0; i < 8; i++) s = applyAnswer(s, ev()).state;
  s = applyAnswer(s, ev({ skillId: 'kopfrechnen.einmaleins', topicId: 'kopfrechnen', factKey: '3x7', latencyMs: 2000 })).state;
  s = applyAnswer(s, ev({ skillId: 'zahlen.binaer', optional: true, day: '2026-10-20' })).state;
  s = applyAnswer(s, ev({ purpose: 'review', day: '2026-10-20' })).state;
  return { ...s, badges: { 'zahlen-sicher': '2026-10-19' }, blitzBest: 17, settings: { ...s.settings, weeklyGoal: 4, nrwExtras: true } };
}

const doc = (state: ProgressState) => JSON.parse(serializeState(state)) as Record<string, unknown>;

describe('serialisation round trip', () => {
  it('parseText(serializeState(s)) gives back the same state (incl. optional flags)', () => {
    const s = richState();
    const r = parseText(serializeState(s));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.state).toEqual(s);
    expect(r.settingsValid).toBe(true);
    expect((r.state.skills['zahlen.binaer#1'] as { optional?: boolean }).optional).toBe(true);
    expect(r.state.reviewed).toEqual({ day: '2026-10-20', count: 1 });
    expect(r.state.lastPlayed).toEqual({ skillId: 'zahlen.binaer', stufe: 1 });
  });

  it('keeps a valid lastPlayed and drops a malformed one without rejecting the document', () => {
    const ok = doc(richState());
    expect(validateState(ok)!.state.lastPlayed).toEqual({ skillId: 'zahlen.binaer', stufe: 1 });
    for (const bad of [{ skillId: 'musik.noten', stufe: 1 }, { skillId: 'zahlen.runden', stufe: 4 }, { skillId: 3, stufe: 1 }, 'zahlen.runden', null]) {
      const d = doc(richState());
      d.lastPlayed = bad;
      const r = validateState(d);
      expect(r, JSON.stringify(bad)).not.toBeNull();
      expect(r!.state.lastPlayed).toBeUndefined();
    }
    const extra = doc(richState());
    extra.lastPlayed = { skillId: 'zahlen.runden', stufe: 2, at: '2026-10-19T14:37' };
    expect(validateState(extra)!.state.lastPlayed).toEqual({ skillId: 'zahlen.runden', stufe: 2 });
  });

  it('writes the app marker and the version', () => {
    const d = doc(emptyState());
    expect(d.app).toBe('mathe4');
    expect(d.version).toBe(2);
  });

  it('accepts a document without the app marker if it looks like a state', () => {
    const { app: _app, ...rest } = doc(richState());
    void _app;
    expect(parseDocument(rest).ok).toBe(true);
  });
});

describe('migrate', () => {
  const fake: Record<number, Migration> = {
    0: (d) => ({ ...d, version: 1, skills: d.skillMap ?? {}, skillMap: undefined }),
    1: (d) => ({ ...d, version: 2, renamed: true }),
  };

  it('runs the steps from the stored version up to the target', () => {
    const r = migrate({ version: 0, skillMap: { a: 1 } }, fake, 2);
    expect(r).toEqual({ ok: true, data: { version: 2, skills: { a: 1 }, skillMap: undefined, renamed: true } });
    expect(migrate({ version: 2, x: 1 }, fake, 2)).toEqual({ ok: true, data: { version: 2, x: 1 } });
  });

  it('rejects newer, unknown or broken versions', () => {
    expect(migrate({ version: 3 }, fake, 2)).toEqual({ ok: false, error: 'newer-version' });
    expect(migrate({ version: -1 }, fake, 2)).toEqual({ ok: false, error: 'invalid' });
    expect(migrate({ version: '1' }, fake, 2)).toEqual({ ok: false, error: 'invalid' });
    expect(migrate({ version: 1.5 }, fake, 2)).toEqual({ ok: false, error: 'invalid' });
    expect(migrate({}, fake, 2)).toEqual({ ok: false, error: 'invalid' });
    // missing step
    expect(migrate({ version: 0 }, { 1: fake[1] }, 2)).toEqual({ ok: false, error: 'invalid' });
    // step that throws or forgets to bump the version
    expect(migrate({ version: 0 }, { 0: () => { throw new Error('x'); } }, 1)).toEqual({ ok: false, error: 'invalid' });
    expect(migrate({ version: 0 }, { 0: (d) => d }, 1)).toEqual({ ok: false, error: 'invalid' });
    // prototype keys are not steps
    expect(migrate({ version: 0 }, {}, 1)).toEqual({ ok: false, error: 'invalid' });
  });

  it('the current schema (v2) needs no migration; unknown older versions are ignored safely', () => {
    expect(Object.keys(MIGRATIONS)).toEqual(['1']);
    const d = doc(richState());
    expect(migrate(d)).toEqual({ ok: true, data: d });
    expect(parseDocument({ ...d, version: 0 })).toEqual({ ok: false, error: 'invalid' });
    expect(parseDocument({ ...d, version: 3 })).toEqual({ ok: false, error: 'newer-version' });
  });
});

describe('v1 → v2: session ids are replaced by a count', () => {
  /** A document as v1 stored it: session ids built from random bits plus Date.now() in base 36. */
  const v1 = () => ({
    app: 'mathe4',
    version: 1,
    skills: {
      'zahlen.runden#1': { attempts: 12, recent: Array(10).fill(true), sessions: ['s1ps9wxbmvdxiwpl', 's8k2mvdxj0aa', 's1ps9wxbmvdxiwpl', 'sx3mvdy1b2'], state: 'sicher', sicherSince: '2026-10-01', box: 2, due: '2026-10-20', checks: [true], last: '2026-10-17' },
      'geometrie.umfang#2': { attempts: 1, recent: [false], sessions: ['a'], state: 'geuebt', box: 0, checks: [], last: '2026-10-17', optional: false },
    },
    facts: { '3x7': { box: 2, due: '2026-10-20', seen: 4, correct: 3 } },
    days: ['2026-10-01', '2026-10-17'],
    badges: { 'zahlen-sicher': '2026-10-01', wochenziel: '2026-10-05' },
    totals: { answered: 13, firstTry: 11, afterHint: 1, rounds: 2, checksPassed: 1 },
    blitzBest: 4,
    settings: { weeklyGoal: 2 },
  });

  it('a stored v1 document loads: ids become the number of distinct sessions, nothing else changes', () => {
    const r = parseText(JSON.stringify(v1()), (id) => id !== 'wochenziel');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.state.version).toBe(2);
    expect(r.state.skills['zahlen.runden#1']).toEqual({ attempts: 12, recent: Array(10).fill(true), practiceDays: 3, state: 'sicher', sicherSince: '2026-10-01', box: 2, due: '2026-10-20', checks: [true], last: '2026-10-17' });
    expect(r.state.skills['geometrie.umfang#2'].practiceDays).toBe(1);
    expect(r.state.facts).toEqual(v1().facts);
    expect(r.state.badges).toEqual({ 'zahlen-sicher': '2026-10-01' });
    expect(r.state.totals).toEqual(v1().totals);
    expect(r.state.blitzBest).toBe(4);
    expect(r.state.settings.weeklyGoal).toBe(2);
    const saved = serializeState(r.state);
    for (const id of ['s1ps9wxbmvdxiwpl', 's8k2mvdxj0aa', 'sx3mvdy1b2', 'sessions']) expect(saved).not.toContain(id);
  });

  it('caps the count at the 5 sessions v1 kept', () => {
    const d = v1();
    d.skills['zahlen.runden#1'].sessions = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];
    const r = parseDocument(d);
    expect(r.ok && r.state.skills['zahlen.runden#1'].practiceDays).toBe(5);
  });

  it('v1 entries that were invalid stay invalid', () => {
    const bad: Array<(d: ReturnType<typeof v1>) => void> = [
      (d) => ((d.skills['zahlen.runden#1'] as Record<string, unknown>).sessions = [42]),
      (d) => (d.skills['zahlen.runden#1'].sessions = ['']),
      (d) => (d.skills['zahlen.runden#1'].sessions = ['x'.repeat(65)]),
      (d) => delete (d.skills['zahlen.runden#1'] as Record<string, unknown>).sessions,
      (d) => ((d.skills as Record<string, unknown>)['zahlen.runden#1'] = 'kaputt'),
      (d) => ((d as Record<string, unknown>).skills = []),
    ];
    for (const mutate of bad) {
      const d = v1();
      mutate(d);
      expect(parseDocument(d)).toEqual({ ok: false, error: 'invalid' });
    }
  });

  it('does not let a __proto__ key slip through the migration', () => {
    const text = JSON.stringify(v1()).replace('"skills":{', '"skills":{"__proto__":{"attempts":1,"recent":[],"sessions":["a"],"state":"geuebt","box":0,"checks":[]},');
    expect(parseText(text)).toEqual({ ok: false, error: 'invalid' });
    expect(Object.keys(migrateV1toV2(JSON.parse(text)).skills as object)).toContain('__proto__');
  });
});

describe('validation rejects malformed documents', () => {
  const base = () => doc(richState());
  const skill = (d: Record<string, unknown>) => (d.skills as Record<string, Record<string, unknown>>)['zahlen.runden#1'];

  const cases: Array<[string, (d: Record<string, unknown>) => unknown]> = [
    ['negative attempts', (d) => (skill(d).attempts = -1)],
    ['fractional attempts', (d) => (skill(d).attempts = 1.5)],
    ['recent with strings', (d) => (skill(d).recent = ['ja'])],
    ['unknown mastery state', (d) => (skill(d).state = 'super')],
    ['box 6', (d) => (skill(d).box = 6)],
    ['impossible date', (d) => (skill(d).due = '2026-02-30')],
    ['practiceDays missing', (d) => delete skill(d).practiceDays],
    ['practiceDays negative', (d) => (skill(d).practiceDays = -1)],
    ['practiceDays a list (v1 sessions in a v2 document)', (d) => (skill(d).practiceDays = ['s1'])],
    ['reviewed with a bad day', (d) => (d.reviewed = { day: 'heute', count: 1 })],
    ['reviewed with a bad count', (d) => (d.reviewed = { day: '2026-10-19', count: 1.5 })],
    ['reviewed not an object', (d) => (d.reviewed = 3)],
    ['optional not boolean', (d) => (skill(d).optional = 'ja')],
    ['skill entry not an object', (d) => ((d.skills as Record<string, unknown>)['zahlen.runden#1'] = 5)],
    ['bad skill key', (d) => ((d.skills as Record<string, unknown>)['zahlen.runden#4'] = skill(d))],
    ['unknown topic', (d) => ((d.skills as Record<string, unknown>)['musik.noten#1'] = skill(d))],
    ['non-canonical fact key', (d) => ((d.facts as Record<string, unknown>)['7x3'] = { box: 1, seen: 1, correct: 1 })],
    ['fact with bad box', (d) => ((d.facts as Record<string, Record<string, unknown>>)['3x7'].box = -1)],
    ['days not days', (d) => (d.days = ['gestern'])],
    ['days not a list', (d) => (d.days = '2026-10-19')],
    ['badge with bad day', (d) => (d.badges = { 'zahlen-sicher': 'heute' })],
    ['totals missing', (d) => delete d.totals],
    ['totals with negative number', (d) => ((d.totals as Record<string, unknown>).rounds = -2)],
    ['blitzBest not a number', (d) => (d.blitzBest = 'viel')],
    ['skills is a list', (d) => (d.skills = [])],
    ['facts missing', (d) => delete d.facts],
  ];

  it.each(cases)('%s → invalid', (_name, mutate) => {
    const d = base();
    mutate(d);
    expect(parseDocument(d)).toEqual({ ok: false, error: 'invalid' });
  });

  it('rejects things that are not a Mathe-4 document', () => {
    expect(parseText('')).toEqual({ ok: false, error: 'empty' });
    expect(parseText('   ')).toEqual({ ok: false, error: 'empty' });
    expect(parseText('{nicht json')).toEqual({ ok: false, error: 'not-json' });
    expect(parseText('[]')).toEqual({ ok: false, error: 'not-mathe4' });
    expect(parseText('null')).toEqual({ ok: false, error: 'not-mathe4' });
    expect(parseText('42')).toEqual({ ok: false, error: 'not-mathe4' });
    expect(parseText('{"hello":"world"}')).toEqual({ ok: false, error: 'not-mathe4' });
    expect(parseText(JSON.stringify({ ...doc(emptyState()), app: 'anderes-spiel' }))).toEqual({ ok: false, error: 'not-mathe4' });
    expect(parseText('x'.repeat(MAX_IMPORT_CHARS + 1))).toEqual({ ok: false, error: 'too-large' });
    expect(parseText(undefined)).toEqual({ ok: false, error: 'empty' });
  });

  it('does not let __proto__ keys pollute anything', () => {
    const text = serializeState(emptyState()).replace('"skills":{}', '"skills":{"__proto__":{"polluted":true}}');
    expect(parseText(text)).toEqual({ ok: false, error: 'invalid' });
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });
});

describe('validation sanitises harmless deviations', () => {
  it('drops unknown fields and unknown badges, cuts lists, sorts and de-duplicates days', () => {
    const d = doc(richState());
    const sk = (d.skills as Record<string, Record<string, unknown>>)['zahlen.runden#1'];
    sk.recent = Array(15).fill(true);
    sk.checks = [true, false, true, true, true, true, false];
    sk.sessions = ['a', 'b', 'a', 'c', 'd', 'e', 'f'];
    sk.extra = 'weg damit';
    (d.reviewed as Record<string, unknown>).extra = 'weg';
    d.days = ['2026-10-20', '2026-10-19', '2026-10-20'];
    d.badges = { 'zahlen-sicher': '2026-10-19', 'gibt-es-nicht': '2026-10-19' };
    d.name = 'Max Mustermann';
    const r = validateState(d, (id) => id === 'zahlen-sicher');
    expect(r).not.toBeNull();
    const p = r!.state.skills['zahlen.runden#1'] as unknown as Record<string, unknown>;
    expect(p.recent).toHaveLength(10);
    expect(p.checks).toEqual([true, true, true, true, false]);
    expect(p.sessions).toBeUndefined();
    expect(p.extra).toBeUndefined();
    expect(r!.state.reviewed).toEqual({ day: '2026-10-20', count: 1 });
    expect(r!.state.days).toEqual(['2026-10-19', '2026-10-20']);
    expect(r!.state.badges).toEqual({ 'zahlen-sicher': '2026-10-19' });
    expect((r!.state as unknown as Record<string, unknown>).name).toBeUndefined();
  });

  it('falls back to default settings when the stored settings are invalid', () => {
    const d = doc(richState());
    (d.settings as Record<string, unknown>).weeklyGoal = 9;
    const r = parseDocument(d);
    expect(r.ok && r.settingsValid).toBe(false);
    expect(r.ok && r.state.settings).toEqual(DEFAULT_SETTINGS);
  });
});

describe('settings', () => {
  it('parseSettings fills missing fields with defaults and rejects invalid values', () => {
    expect(parseSettings({ weeklyGoal: 5 })).toEqual({ ...DEFAULT_SETTINGS, weeklyGoal: 5 });
    expect(parseSettings({ ...DEFAULT_SETTINGS, keypad: 'on', unknown: 1 })).toEqual({ ...DEFAULT_SETTINGS, keypad: 'on' });
    expect(parseSettings({ weeklyGoal: 0 })).toBeNull();
    expect(parseSettings({ weeklyGoal: 2.5 })).toBeNull();
    expect(parseSettings({ subtractionMethod: 'borgen' })).toBeNull();
    expect(parseSettings({ nrwExtras: 'yes' })).toBeNull();
    expect(parseSettings(undefined)).toBeNull();
    expect(parseSettings([])).toBeNull();
  });

  it('sanitizeSettingsPatch keeps only valid fields', () => {
    expect(sanitizeSettingsPatch({ weeklyGoal: 7, largeText: true, keypad: 'maybe', foo: 1 })).toEqual({ largeText: true });
    expect(sanitizeSettingsPatch({ subtractionMethod: 'ergaenzen', weeklyGoal: 1 })).toEqual({ subtractionMethod: 'ergaenzen', weeklyGoal: 1 });
    expect(sanitizeSettingsPatch(null)).toEqual({});
  });
});

describe('import messages', () => {
  it('are friendly German sentences without banned phrases', () => {
    for (const msg of Object.values(IMPORT_MESSAGES)) {
      expect(msg).toMatch(/^[A-ZÄÖÜ].*\.$/);
      const lower = msg.toLowerCase();
      for (const banned of BANNED_PHRASES) expect(lower.includes(banned), `${banned} in ${msg}`).toBe(false);
      expect(lower).not.toMatch(/fehler|error|ungültig|json/);
    }
  });
});
