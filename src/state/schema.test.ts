import { describe, expect, it } from 'vitest';
import { BANNED_PHRASES } from '../core/testing';
import { applyAnswer } from './mastery';
import { applyGrowth, seedGrowth } from './growth';
import { IMPORT_MESSAGES, MAX_IMPORT_CHARS, MIGRATIONS, migrate, migrateV1toV2, migrateV2toV3, parseDocument, parseSettings, parseText, sanitizeSettingsPatch, serializeState, validateState } from './schema';
import type { Migration } from './schema';
import { createStore, emptyState } from './store';
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

/** richState() with improvement tracking in every part of `growth`. */
function grownState(): ProgressState {
  let s = richState();
  const events = [
    ev({ day: '2026-10-21', firstTry: false, bugTags: ['abrunden-1', 'aufgerundet'], bugIds: ['abrunden-1'] }),
    ev({ day: '2026-10-22', bugTags: ['abrunden'] }),
    // a fact miss in a review arms its lasting improvement
    ev({ skillId: 'kopfrechnen.einmaleins', topicId: 'kopfrechnen', factKey: '4x6', firstTry: false, day: '2026-10-22', purpose: 'review' }),
  ];
  for (const e of events) s = applyGrowth(s, applyAnswer(s, e).state, e, e.day).state;
  return s;
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
    expect(d.version).toBe(3);
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

  it('the current schema (v3) needs no migration; unknown older versions are ignored safely', () => {
    expect(Object.keys(MIGRATIONS)).toEqual(['1', '2']);
    const d = doc(richState());
    expect(migrate(d)).toEqual({ ok: true, data: d });
    expect(parseDocument({ ...d, version: 0 })).toEqual({ ok: false, error: 'invalid' });
    expect(parseDocument({ ...d, version: 4 })).toEqual({ ok: false, error: 'newer-version' });
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
    expect(r.state.version).toBe(3);
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

describe('v2 → v3: improvement tracking is added and seeded conservatively', () => {
  /** A document as v2 stored it (no `growth`). */
  const v2 = () => ({
    app: 'mathe4',
    version: 2,
    skills: {
      // still 'geuebt' with a full window of 10: the early window starts from it, it ended on `last`
      'zahlen.runden#1': { attempts: 14, recent: [false, false, false, true, true, true, false, true, true, false], practiceDays: 2, state: 'geuebt', box: 0, checks: [], last: '2026-10-15' },
      // 'geuebt' with 3 answers: the window keeps filling
      'zahlen.runden#2': { attempts: 3, recent: [true, true, false], practiceDays: 1, state: 'geuebt', box: 0, checks: [], last: '2026-10-16' },
      // 'sicher' without a miss in recent: nothing to seed
      'geometrie.umfang#1': { attempts: 10, recent: Array(10).fill(true), practiceDays: 2, state: 'sicher', sicherSince: '2026-10-10', box: 1, due: '2026-10-11', checks: [], last: '2026-10-12' },
      // 'sicher' with a miss in recent: only the miss (on `last` or earlier)
      'schriftlich.addition#2': { attempts: 12, recent: [true, false, true, true, true, true, true, true, true, true], practiceDays: 3, state: 'sicher', sicherSince: '2026-10-12', box: 2, due: '2026-10-20', checks: [true], last: '2026-10-17' },
    },
    facts: { '3x7': { box: 2, due: '2026-10-20', seen: 4, correct: 3 } },
    days: ['2026-10-12', '2026-10-15', '2026-10-16', '2026-10-17'],
    badges: { 'zahlen-sicher': '2026-10-12' },
    totals: { answered: 39, firstTry: 30, afterHint: 2, rounds: 4, checksPassed: 1 },
    settings: { ...DEFAULT_SETTINGS, weeklyGoal: 2 },
  });

  it('a stored v2 document loads as v3; everything v2 had stays the same', () => {
    const r = parseText(JSON.stringify(v2()));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.state.version).toBe(3);
    expect(r.state.skills).toEqual(v2().skills);
    expect(r.state.facts).toEqual(v2().facts);
    expect(r.state.badges).toEqual(v2().badges);
    expect(r.state.totals).toEqual(v2().totals);
    expect(r.state.growth).toEqual({
      stufen: {
        // still 'geuebt': its misses count (more answers than the window, so it is not the real start: carried)
        'zahlen.runden#1': { earlyN: 10, earlyOk: 5, earlyWrong: 5, earlyDay: '2026-10-15', carried: true, after: 0, miss: '2026-10-15', missCarried: true },
        'zahlen.runden#2': { earlyN: 3, earlyOk: 2, earlyWrong: 1, after: 0, miss: '2026-10-16', missCarried: true },
        // 'sicher': a closed window without misses, so old (or help-only) misses never turn into rewards
        'geometrie.umfang#1': { earlyN: 10, earlyOk: 10, earlyWrong: 0, earlyDay: '2026-10-12', after: 0 },
        'schriftlich.addition#2': { earlyN: 10, earlyOk: 9, earlyWrong: 0, earlyDay: '2026-10-17', carried: true, after: 0 },
      },
      errors: {},
      facts: {},
    });
    expect(migrateV2toV3(v2())).toEqual({ ...v2(), version: 3 });
  });

  it('migrated progress keeps working: the seeded start and miss of a Geübt entry lead to later improvements', () => {
    const s = createStore(null);
    expect(s.importJson(JSON.stringify(v2()))).toEqual({ ok: true });
    // a 'sicher' entry from v2 gives no reward for its old misses
    const old = s.recordAnswer(ev({ skillId: 'schriftlich.addition', topicId: 'schriftlich', stufe: 2, purpose: 'review', day: '2026-10-20' }));
    expect(old.growth).toEqual([]);
    // the seeded early window (5 of 10, 5 misses) of a 'geuebt' entry: 'Sicher' on a later day is "besser"
    const seen = Array.from({ length: 4 }, () => s.recordAnswer(ev({ day: '2026-10-19' })).growth).flat();
    expect(seen).toEqual([{ kind: 'besser', skillId: 'zahlen.runden', stufe: 1, early: 5, level: 'sicher', carried: true }]);
    // and its seeded miss (on the last v2 day) is kept in a review days later
    const review = s.recordAnswer(ev({ day: '2026-10-20', purpose: 'review' }));
    // the seeded miss day is only an upper bound: the event says so ("Früher …")
    expect(review.growth).toEqual([{ kind: 'behalten', skillId: 'zahlen.runden', stufe: 1, days: 5, carried: true }]);
  });

  it('invalid v2 entries stay invalid (the seeding never repairs them)', () => {
    const d = v2();
    (d.skills['zahlen.runden#1'] as Record<string, unknown>).recent = ['ja'];
    expect(parseDocument(d)).toEqual({ ok: false, error: 'invalid' });
    const text = JSON.stringify(v2()).replace('"skills":{', '"skills":{"__proto__":{"attempts":1,"recent":[false],"practiceDays":1,"state":"geuebt","box":0,"checks":[],"last":"2026-10-16"},');
    expect(parseText(text)).toEqual({ ok: false, error: 'invalid' });
  });

  it('a v2 document that already carries a growth field (not from us) is seeded from its skills instead', () => {
    const r = parseDocument({ ...v2(), growth: { stufen: { 'zahlen.runden#1': { earlyN: 10, earlyOk: 0, earlyWrong: 10, after: 10, improved: true, kept: 9 } }, errors: {}, facts: {} } });
    expect(r.ok && r.state.growth.stufen['zahlen.runden#1']).toEqual({ earlyN: 10, earlyOk: 5, earlyWrong: 5, earlyDay: '2026-10-15', carried: true, after: 0, miss: '2026-10-15', missCarried: true });
  });

  it('a v1 document is migrated through v2 to v3', () => {
    const v1 = { ...v2(), version: 1, skills: { 'zahlen.runden#2': { attempts: 1, recent: [false], sessions: ['a'], state: 'geuebt', box: 0, checks: [], last: '2026-10-16' } } };
    const r = parseDocument(v1);
    expect(r.ok && r.state.version).toBe(3);
    expect(r.ok && r.state.growth.stufen).toEqual({ 'zahlen.runden#2': { earlyN: 1, earlyOk: 0, earlyWrong: 1, after: 0, miss: '2026-10-16', missCarried: true } });
  });

  it('round trip keeps the growth data exactly', () => {
    const s = grownState();
    expect(Object.keys(s.growth.errors)).toEqual(['zahlen.runden']);
    expect(s.growth.facts).toEqual({ '4x6': '2026-10-22' });
    const r = parseText(serializeState(s));
    expect(r.ok && r.state).toEqual(s);
  });
});

describe('validation of the improvement tracking: derived data never makes stored progress unloadable', () => {
  const base = () => doc(grownState());
  type G = { stufen: Record<string, Record<string, unknown>>; errors: Record<string, Record<string, Record<string, unknown>>>; facts: Record<string, unknown> };
  const g = (d: Record<string, unknown>) => d.growth as G;
  const stufe = (d: Record<string, unknown>) => g(d).stufen['zahlen.runden#1'];
  const parsedGrowth = (d: Record<string, unknown>) => {
    const r = parseDocument(d);
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error('not ok');
    // everything else is untouched
    expect(r.state.skills).toEqual(grownState().skills);
    expect(r.state.badges).toEqual(grownState().badges);
    return r.state.growth;
  };

  it('a missing or broken growth is rebuilt from the skills', () => {
    for (const bad of [undefined, null, [], 'kaputt', 3]) {
      const d = base();
      d.growth = bad;
      expect(parsedGrowth(d), String(bad)).toEqual(seedGrowth(grownState().skills));
    }
  });

  const dropped: Array<[string, (d: Record<string, unknown>) => unknown, (gr: ReturnType<typeof parsedGrowth>) => void]> = [
    ['stufen missing', (d) => delete (d.growth as Record<string, unknown>).stufen, (gr) => expect(gr.stufen).toEqual({})],
    ['a bad skill key', (d) => (g(d).stufen['zahlen.runden#7'] = stufe(d)), (gr) => expect(gr.stufen['zahlen.runden#7']).toBeUndefined()],
    ['an entry without a skill entry (orphan)', (d) => (g(d).stufen['geometrie.flaeche#2'] = stufe(d)), (gr) => expect(gr.stufen['geometrie.flaeche#2']).toBeUndefined()],
    ['earlyN not a count', (d) => (stufe(d).earlyN = 'zehn'), (gr) => expect(gr.stufen['zahlen.runden#1']).toBeUndefined()],
    ['after negative', (d) => (stufe(d).after = -1), (gr) => expect(gr.stufen['zahlen.runden#1']).toBeUndefined()],
    ['after above 10 (clamped)', (d) => (stufe(d).after = 11), (gr) => expect(gr.stufen['zahlen.runden#1'].after).toBe(10)],
    ['earlyOk above earlyN (clamped)', (d) => (stufe(d).earlyOk = 99), (gr) => expect(gr.stufen['zahlen.runden#1'].earlyOk).toBe(gr.stufen['zahlen.runden#1'].earlyN)],
    ['miss not a day (field dropped)', (d) => (stufe(d).miss = 20261019), (gr) => expect(gr.stufen['zahlen.runden#1']).not.toHaveProperty('miss')],
    ['earlyDay while the window is not full (field dropped)', (d) => (stufe(d).earlyDay = '2026-10-19'), (gr) => expect(gr.stufen['zahlen.runden#1']).not.toHaveProperty('earlyDay')],
    ['kept fractional (field dropped)', (d) => (stufe(d).kept = 1.5), (gr) => expect(gr.stufen['zahlen.runden#1']).not.toHaveProperty('kept')],
    ['improved not true (field dropped)', (d) => (stufe(d).improved = '2026-10-19'), (gr) => expect(gr.stufen['zahlen.runden#1']).not.toHaveProperty('improved')],
    ['errors for an unknown topic', (d) => (g(d).errors['musik.noten'] = {}), (gr) => expect(gr.errors['musik.noten']).toBeUndefined()],
    ['errors of a skill without entries', (d) => (g(d).errors['geometrie.flaeche'] = { x: { day: '2026-10-19', seen: 2, run: 5, done: '2026-10-20' } }), (gr) => expect(gr.errors['geometrie.flaeche']).toBeUndefined()],
    ['errors not an object', (d) => (g(d).errors['zahlen.runden'] = [] as unknown as Record<string, Record<string, unknown>>), (gr) => expect(gr.errors['zahlen.runden']).toBeUndefined()],
    ['a non-canonical fact key', (d) => (g(d).facts['6x4'] = '2026-10-19'), (gr) => expect(gr.facts).toEqual({ '4x6': '2026-10-22' })],
    ['a fact miss that is not a day', (d) => (g(d).facts['4x6'] = true), (gr) => expect(gr.facts).toEqual({})],
  ];

  it.each(dropped)('%s → dropped or clamped, the rest loads', (_name, mutate, check) => {
    const d = base();
    mutate(d);
    check(parsedGrowth(d));
  });

  it('tags are re-normalised, merged, trimmed or dropped', () => {
    const d = base();
    const errors = g(d).errors['zahlen.runden'];
    errors['abrunden-3'] = { day: '2026-10-25', seen: 1, run: 2 }; // merges with 'abrunden' (later day, more evidence)
    errors['ein tag'] = { day: '2026-10-19', seen: 1, run: 0 }; // dropped
    errors.ohneTag = { seen: 1, run: 0 }; // no day: dropped
    errors.kaputt = { day: '2026-10-19', seen: 1, run: 0, done: 'ja' }; // bad done: the field is dropped
    errors.lauf = { day: '2026-10-19', seen: 7, run: 9 }; // clamped to the current limits
    for (let i = 0; i < 14; i++) errors[`extra${'abcdefghijklmn'[i]}x`] = { day: `2026-09-${String(i + 1).padStart(2, '0')}`, seen: 1, run: 0 };
    const tracks = parsedGrowth(d).errors['zahlen.runden'];
    expect(Object.keys(tracks)).toHaveLength(12);
    expect(tracks.abrunden).toEqual({ day: '2026-10-25', seen: 1, run: 2 });
    expect(tracks.lauf).toEqual({ day: '2026-10-19', seen: 2, run: 5 });
    expect(tracks.kaputt).toEqual({ day: '2026-10-19', seen: 1, run: 0 });
    for (const gone of ['ein tag', 'ohneTag', 'abrunden-3', 'extraax']) expect(tracks[gone], gone).toBeUndefined();
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
