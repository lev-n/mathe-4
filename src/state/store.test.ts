import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BANNED_PHRASES } from '../core/testing';
import { IMPORT_MESSAGES, serializeState } from './schema';
import { STORAGE_KEY, createStore, emptyState, loadFromStorage } from './store';
import type { Store } from './store';
import { ev, memoryStorage, quotaStorage, sharedTabs, throwingStorage } from './testkit';
import type { FakeStorage } from './testkit';
import { DEFAULT_SETTINGS } from './types';

/** Exercise every mutating API once. */
function useEverything(s: Store) {
  for (let i = 0; i < 9; i++) s.recordAnswer(ev());
  s.recordAnswer(ev({ firstTry: false, bugTags: ['abrunden'], bugIds: ['abrunden'] }));
  s.recordAnswer(ev({ skillId: 'kopfrechnen.einmaleins', topicId: 'kopfrechnen', factKey: '6x7', latencyMs: 1500 }));
  s.recordRound({ day: '2026-10-19', answered: 10, firstTry: 9 });
  s.recordBlitz(12);
  s.updateSettings({ largeText: true });
  s.exportJson();
  s.importJson(s.exportJson());
  s.importJson('kaputt');
}

function stored(storage: FakeStorage) {
  const text = storage.data.get(STORAGE_KEY);
  return text === undefined ? undefined : JSON.parse(text);
}

describe('consent (§ 25 TDDDG)', () => {
  it('writes nothing before consent, whatever happens', () => {
    const storage = memoryStorage();
    const s = createStore(storage);
    expect(s.getConsent()).toBe('unknown');
    useEverything(s);
    s.reset();
    useEverything(s);
    expect(storage.length).toBe(0);
    expect(storage.writes).toBe(0);
    expect(storage.removes).toBe(0);
    expect(s.get().totals.answered).toBe(11);
    expect(s.get().growth.errors['zahlen.runden']).toBeDefined();
  });

  it('improvement tracking lives in memory until consent, then it is written with the rest', () => {
    const storage = memoryStorage();
    const s = createStore(storage);
    s.recordAnswer(ev({ firstTry: false, bugTags: ['abrunden'], bugIds: ['abrunden'] }));
    expect(s.get().growth.errors['zahlen.runden'].abrunden.day).toBe('2026-10-19');
    expect(storage.writes).toBe(0);
    s.setConsent('granted');
    expect(stored(storage).growth).toEqual(s.get().growth);
    s.setConsent('denied');
    expect(storage.data.has(STORAGE_KEY)).toBe(false);
    expect(s.get().growth.stufen['zahlen.runden#1']).toEqual({ earlyN: 1, earlyOk: 0, earlyWrong: 1, after: 0, miss: '2026-10-19' });
  });

  it("'granted' writes the current state immediately and after every change", () => {
    const storage = memoryStorage();
    const s = createStore(storage);
    s.recordAnswer(ev());
    s.setConsent('granted');
    expect(s.getConsent()).toBe('granted');
    expect(stored(storage).totals.answered).toBe(1);

    const writes = storage.writes;
    s.recordAnswer(ev());
    expect(storage.writes).toBe(writes + 1);
    s.recordRound({ day: '2026-10-19', answered: 2, firstTry: 2 });
    expect(stored(storage).totals.rounds).toBe(1);
    s.updateSettings({ weeklyGoal: 5 });
    expect(stored(storage).settings.weeklyGoal).toBe(5);
    s.recordBlitz(8);
    expect(stored(storage).blitzBest).toBe(8);
    expect(storage.writes).toBe(writes + 4);
    expect(JSON.parse(storage.data.get(STORAGE_KEY)!)).toEqual({ app: 'mathe4', ...s.get() });
  });

  it('a later visit loads the stored state and counts as granted', () => {
    const storage = memoryStorage();
    const a = createStore(storage);
    a.setConsent('granted');
    for (let i = 0; i < 8; i++) a.recordAnswer(ev());
    const b = createStore(storage);
    expect(b.getConsent()).toBe('granted');
    expect(b.get()).toEqual(a.get());
    expect(b.get().skills['zahlen.runden#1'].state).toBe('sicher');
  });

  it("'denied' keeps progress in memory only and asks again next visit", () => {
    const storage = memoryStorage();
    const s = createStore(storage);
    s.setConsent('denied');
    s.recordAnswer(ev());
    expect(s.getConsent()).toBe('denied');
    expect(s.get().totals.answered).toBe(1);
    expect(storage.length).toBe(0);
    expect(createStore(storage).getConsent()).toBe('unknown');
  });

  it("'denied' after 'granted' removes what was stored", () => {
    const storage = memoryStorage();
    const s = createStore(storage);
    s.setConsent('granted');
    s.recordAnswer(ev());
    s.setConsent('denied');
    expect(storage.length).toBe(0);
    expect(s.get().totals.answered).toBe(1);
    s.recordAnswer(ev());
    expect(storage.length).toBe(0);
  });

  it('forget(): removes the key, consent denied, memory kept', () => {
    const storage = memoryStorage();
    const s = createStore(storage);
    s.setConsent('granted');
    s.recordAnswer(ev());
    s.forget();
    expect(storage.data.has(STORAGE_KEY)).toBe(false);
    expect(s.getConsent()).toBe('denied');
    expect(s.get().totals.answered).toBe(1);
    s.recordAnswer(ev());
    expect(storage.length).toBe(0);
  });

  it('reset(): clears progress in memory and storage, keeps settings', () => {
    const storage = memoryStorage();
    const s = createStore(storage);
    s.setConsent('granted');
    s.updateSettings({ largeText: true, weeklyGoal: 2 });
    for (let i = 0; i < 8; i++) s.recordAnswer(ev());
    s.reset();
    const expected = { ...emptyState(), settings: { ...DEFAULT_SETTINGS, largeText: true, weeklyGoal: 2 } };
    expect(s.get()).toEqual(expected);
    expect(stored(storage)).toEqual({ app: 'mathe4', ...expected });
    expect(s.getConsent()).toBe('granted');
  });

  it('reset() without consent leaves storage alone', () => {
    const storage = memoryStorage({ [STORAGE_KEY]: 'kaputt' });
    const s = createStore(storage);
    s.recordAnswer(ev());
    s.reset();
    expect(s.get().totals.answered).toBe(0);
    expect(storage.data.get(STORAGE_KEY)).toBe('kaputt');
    expect(storage.writes + storage.removes).toBe(0);
  });
});

describe('corrupt or unknown stored data is ignored safely', () => {
  const bad = [
    'kaputt',
    '',
    'null',
    '[]',
    '{"app":"mathe4","version":2}',
    '{"app":"mathe4","version":3}',
    '{"app":"mathe4","version":1,"skills":{"zahlen.runden#1":{"attempts":-1}}}',
    JSON.stringify({ ...JSON.parse(serializeState(emptyState())), app: 'anderes' }),
  ];
  it.each(bad)('%s', (text) => {
    const storage = memoryStorage({ [STORAGE_KEY]: text });
    const s = createStore(storage);
    expect(s.getConsent()).toBe('unknown');
    expect(s.get()).toEqual(emptyState());
    s.recordAnswer(ev());
    expect(storage.data.get(STORAGE_KEY)).toBe(text);
    // after opt-in, the valid state replaces it
    s.setConsent('granted');
    expect(stored(storage).totals.answered).toBe(1);
  });

  it('a document from a newer app version (a rollback of the site) is never overwritten, even after "Ja, merken"', () => {
    const text = JSON.stringify({ ...JSON.parse(serializeState(emptyState())), version: 4, totals: { answered: 99 } });
    const storage = memoryStorage({ [STORAGE_KEY]: text });
    const s = createStore(storage);
    expect(s.getConsent()).toBe('denied');
    expect(s.get()).toEqual(emptyState());
    s.recordAnswer(ev());
    s.setConsent('granted');
    s.recordAnswer(ev());
    expect(storage.data.get(STORAGE_KEY)).toBe(text);
    expect(storage.writes).toBe(0);
    // honest: the UI must not claim that progress is saved, and it can name the reason
    expect(s.getSaveStatus()).toBe('newer');
    // "Fortschritt löschen" is an explicit choice to delete what is stored: then saving works again
    s.reset();
    expect(stored(storage)).toMatchObject({ version: 3, totals: { answered: 0 } });
    s.recordAnswer(ev());
    expect(stored(storage).totals.answered).toBe(1);
    expect(s.getSaveStatus()).toBe('ok');
  });

  it('saving never gets stuck: when another tab removes the newer document or writes a valid one, this tab saves again', () => {
    const newer = JSON.stringify({ ...JSON.parse(serializeState(emptyState())), version: 4 });
    const { data, tabs } = sharedTabs(2);
    data.set(STORAGE_KEY, newer);
    const a = createStore(tabs[0].storage, tabs[0].events);
    const b = createStore(tabs[1].storage, tabs[1].events);
    expect(a.getConsent()).toBe('denied');
    // B deletes the progress ("Fortschritt löschen") and opts in again, then answers
    b.reset();
    b.setConsent('granted');
    b.recordAnswer(ev());
    expect(a.getConsent()).toBe('granted');
    a.recordAnswer(ev());
    a.recordAnswer(ev());
    expect(a.getSaveStatus()).toBe('ok');
    expect(JSON.parse(data.get(STORAGE_KEY)!).totals.answered).toBe(3);
    // "Nicht mehr merken" also frees a tab that only saw the newer document
    data.set(STORAGE_KEY, newer);
    const c = createStore(tabs[0].storage);
    c.forget();
    c.setConsent('granted');
    c.recordAnswer(ev());
    expect(c.getSaveStatus()).toBe('ok');
  });

  it('a document stored by v1 (with session ids) is migrated on load and saved without them', () => {
    const v1 = {
      app: 'mathe4',
      version: 1,
      skills: { 'zahlen.runden#1': { attempts: 3, recent: [true, true, true], sessions: ['s1pw4oocmvdwgrwy'], state: 'geuebt', box: 0, checks: [], last: '2026-10-18' } },
      facts: {},
      days: ['2026-10-18'],
      badges: {},
      totals: { answered: 3, firstTry: 3, rounds: 0, checksPassed: 0 },
      settings: DEFAULT_SETTINGS,
    };
    const storage = memoryStorage({ [STORAGE_KEY]: JSON.stringify(v1) });
    const s = createStore(storage);
    expect(s.getConsent()).toBe('granted');
    expect(s.get().skills['zahlen.runden#1'].practiceDays).toBe(1);
    s.recordAnswer(ev({ day: '2026-10-19' }));
    const text = storage.data.get(STORAGE_KEY)!;
    expect(JSON.parse(text).version).toBe(3);
    expect(JSON.parse(text).skills['zahlen.runden#1'].practiceDays).toBe(2);
    expect(text).not.toContain('s1pw4oocmvdwgrwy');
    expect(text).not.toContain('sessions');
  });

  it('loadFromStorage returns null for missing storage or key', () => {
    expect(loadFromStorage(null)).toBeNull();
    expect(loadFromStorage(memoryStorage())).toBeNull();
    expect(loadFromStorage(throwingStorage())).toBeNull();
  });
});

describe('storage failures fall back to memory', () => {
  it('throwing storage: every API works and nothing throws', () => {
    const s = createStore(throwingStorage());
    expect(s.getConsent()).toBe('unknown');
    expect(() => {
      s.setConsent('granted');
      useEverything(s);
      s.reset();
      s.recordAnswer(ev());
      s.forget();
      s.setConsent('granted');
      s.setConsent('denied');
    }).not.toThrow();
    expect(s.get().totals.answered).toBe(1);
    expect(s.getConsent()).toBe('denied');
  });

  it('quota exceeded on write (Safari private mode): keeps working from memory', () => {
    const storage = quotaStorage();
    const s = createStore(storage);
    s.setConsent('granted');
    for (let i = 0; i < 8; i++) expect(() => s.recordAnswer(ev())).not.toThrow();
    expect(s.get().skills['zahlen.runden#1'].state).toBe('sicher');
    expect(storage.writes).toBeGreaterThan(0);
    expect(storage.length).toBe(0);
  });

  it('works without any storage', () => {
    const s = createStore(null);
    s.setConsent('granted');
    s.recordAnswer(ev());
    expect(s.get().totals.answered).toBe(1);
    expect(s.getConsent()).toBe('granted');
  });
});

describe('navigator.storage.persist()', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const flush = async () => {
    for (let i = 0; i < 5; i++) await Promise.resolve();
  };

  it('is requested once, only after opt-in', async () => {
    const persist = vi.fn(() => Promise.resolve(true));
    vi.stubGlobal('navigator', { storage: { persist } });
    const storage = memoryStorage();
    const s = createStore(storage);
    s.recordAnswer(ev());
    s.setConsent('denied');
    expect(persist).not.toHaveBeenCalled();
    s.setConsent('granted');
    s.setConsent('granted');
    s.forget();
    s.setConsent('granted');
    await flush();
    expect(persist).toHaveBeenCalledTimes(1);
    // a later visit with stored data does not ask again
    createStore(storage);
    await flush();
    expect(persist).toHaveBeenCalledTimes(1);
  });

  it('never where the browser would ask the child with a pop-up (permission state "prompt", e.g. Firefox)', async () => {
    const persist = vi.fn(() => Promise.resolve(true));
    const query = vi.fn(() => Promise.resolve({ state: 'prompt' }));
    vi.stubGlobal('navigator', { storage: { persist }, permissions: { query } });
    createStore(memoryStorage()).setConsent('granted');
    await flush();
    expect(query).toHaveBeenCalledWith({ name: 'persistent-storage' });
    expect(persist).not.toHaveBeenCalled();

    query.mockImplementation(() => Promise.resolve({ state: 'denied' }));
    createStore(memoryStorage()).setConsent('granted');
    await flush();
    expect(persist).not.toHaveBeenCalled();
  });

  it('when it cannot prompt: permission already granted, or no prompt exists for it (Safari)', async () => {
    const persist = vi.fn(() => Promise.resolve(true));
    vi.stubGlobal('navigator', { storage: { persist }, permissions: { query: () => Promise.resolve({ state: 'granted' }) } });
    createStore(memoryStorage()).setConsent('granted');
    await flush();
    expect(persist).toHaveBeenCalledTimes(1);
    // unknown permission name: rejected query or synchronous TypeError
    vi.stubGlobal('navigator', { storage: { persist }, permissions: { query: () => Promise.reject(new TypeError('unknown')) } });
    createStore(memoryStorage()).setConsent('granted');
    await flush();
    expect(persist).toHaveBeenCalledTimes(2);
    vi.stubGlobal('navigator', { storage: { persist }, permissions: { query: () => { throw new TypeError('unknown'); } } });
    createStore(memoryStorage()).setConsent('granted');
    await flush();
    expect(persist).toHaveBeenCalledTimes(3);
  });

  it('missing API, throwing API or a rejected promise are harmless', async () => {
    vi.stubGlobal('navigator', {});
    expect(() => createStore(memoryStorage()).setConsent('granted')).not.toThrow();
    vi.stubGlobal('navigator', { storage: {} });
    expect(() => createStore(memoryStorage()).setConsent('granted')).not.toThrow();
    vi.stubGlobal('navigator', { storage: { persist: () => { throw new Error('nope'); } } });
    expect(() => createStore(memoryStorage()).setConsent('granted')).not.toThrow();
    const rejected = vi.fn(() => Promise.reject(new Error('denied')));
    vi.stubGlobal('navigator', { storage: { persist: rejected } });
    createStore(memoryStorage()).setConsent('granted');
    await flush();
    expect(rejected).toHaveBeenCalledTimes(1);
    vi.stubGlobal('navigator', { storage: { persist: rejected }, permissions: { query: () => Promise.resolve(undefined) } });
    expect(() => createStore(memoryStorage()).setConsent('granted')).not.toThrow();
    await flush();
    expect(rejected).toHaveBeenCalledTimes(1);
  });
});

describe('save status: the UI must not claim progress is saved when it is not', () => {
  it("is 'ok' after successful writes", () => {
    const s = createStore(memoryStorage());
    expect(s.getSaveStatus()).toBe('ok');
    s.setConsent('granted');
    s.recordAnswer(ev());
    expect(s.getSaveStatus()).toBe('ok');
  });

  it("is 'failed' after opt-in when storage is blocked, missing or full, and listeners hear it", () => {
    for (const storage of [throwingStorage(), null, quotaStorage()]) {
      const s = createStore(storage);
      const listener = vi.fn();
      s.subscribe(listener);
      s.recordAnswer(ev());
      expect(s.getSaveStatus()).toBe('ok'); // nothing was written before consent
      s.setConsent('granted');
      expect(s.getConsent()).toBe('granted');
      expect(s.getSaveStatus()).toBe('failed');
      expect(listener).toHaveBeenCalledTimes(2);
      s.recordAnswer(ev());
      expect(s.getSaveStatus()).toBe('failed');
      // after "Nicht mehr merken" nothing is expected to be saved
      s.forget();
      expect(s.getSaveStatus()).toBe('ok');
    }
  });

  it("recovers to 'ok' when a later write works again", () => {
    const storage = memoryStorage();
    const realSetItem = storage.setItem.bind(storage);
    let full = true;
    storage.setItem = (k: string, v: string) => {
      if (full) throw new Error('QuotaExceededError');
      realSetItem(k, v);
    };
    const s = createStore(storage);
    s.setConsent('granted');
    expect(s.getSaveStatus()).toBe('failed');
    full = false;
    s.recordAnswer(ev());
    expect(s.getSaveStatus()).toBe('ok');
    expect(stored(storage).totals.answered).toBe(1);
  });
});

describe('several tabs share one stored document', () => {
  it("a write in another tab is taken over, so the next answer here keeps the other tab's progress", () => {
    const { data, tabs } = sharedTabs(2);
    const a = createStore(tabs[0].storage, tabs[0].events);
    a.setConsent('granted');
    const b = createStore(tabs[1].storage, tabs[1].events);
    expect(b.getConsent()).toBe('granted');
    // tab A makes 'zahlen.runden#1' sicher, then tab B answers one item of another skill
    for (let i = 0; i < 8; i++) a.recordAnswer(ev());
    expect(b.get().skills['zahlen.runden#1'].state).toBe('sicher');
    b.recordAnswer(ev({ skillId: 'zahlen.stellenwert', day: '2026-10-20' }));
    const saved = JSON.parse(data.get(STORAGE_KEY)!);
    expect(Object.keys(saved.skills).sort()).toEqual(['zahlen.runden#1', 'zahlen.stellenwert#1']);
    expect(saved.skills['zahlen.runden#1'].state).toBe('sicher');
    expect(saved.totals.answered).toBe(9);
    expect(a.get()).toEqual(b.get());
  });

  it('listeners are notified and settings follow as well', () => {
    const { tabs } = sharedTabs(2);
    const a = createStore(tabs[0].storage, tabs[0].events);
    const b = createStore(tabs[1].storage, tabs[1].events);
    const listener = vi.fn();
    b.subscribe(listener);
    a.setConsent('granted');
    a.updateSettings({ largeText: true });
    expect(listener).toHaveBeenCalledTimes(2);
    expect(b.get().settings.largeText).toBe(true);
  });

  it("a tab that has not answered the consent question takes over the other tab's 'Ja, merken'", () => {
    const { data, tabs } = sharedTabs(2);
    const a = createStore(tabs[0].storage, tabs[0].events);
    const b = createStore(tabs[1].storage, tabs[1].events);
    a.recordAnswer(ev());
    a.setConsent('granted');
    expect(b.getConsent()).toBe('granted');
    // B's next answer is saved on top of A's progress instead of replacing it
    b.recordAnswer(ev({ skillId: 'geometrie.umfang', topicId: 'geometrie' }));
    expect(JSON.parse(data.get(STORAGE_KEY)!).totals.answered).toBe(2);
  });

  it('"Nicht mehr merken" in another tab stops this tab from writing the document back', () => {
    const { data, tabs } = sharedTabs(2);
    const a = createStore(tabs[0].storage, tabs[0].events);
    a.setConsent('granted');
    a.recordAnswer(ev());
    const b = createStore(tabs[1].storage, tabs[1].events);
    b.forget();
    expect(a.getConsent()).toBe('denied');
    a.recordAnswer(ev());
    expect(data.has(STORAGE_KEY)).toBe(false);
    expect(a.get().totals.answered).toBe(2);
  });

  it('"Fortschritt löschen" in another tab empties this tab too and saving goes on', () => {
    const { data, tabs } = sharedTabs(2);
    const a = createStore(tabs[0].storage, tabs[0].events);
    a.setConsent('granted');
    for (let i = 0; i < 3; i++) a.recordAnswer(ev());
    const b = createStore(tabs[1].storage, tabs[1].events);
    b.reset();
    expect(a.get().totals.answered).toBe(0);
    expect(a.getConsent()).toBe('granted');
    a.recordAnswer(ev());
    expect(JSON.parse(data.get(STORAGE_KEY)!).totals.answered).toBe(1);
  });

  it('a document from a newer app version in another tab is never overwritten from here', () => {
    const { data, tabs } = sharedTabs(2);
    const a = createStore(tabs[0].storage, tabs[0].events);
    a.setConsent('granted');
    a.recordAnswer(ev());
    const newer = JSON.stringify({ ...JSON.parse(data.get(STORAGE_KEY)!), version: 99 });
    tabs[1].storage.setItem(STORAGE_KEY, newer);
    expect(a.getConsent()).toBe('denied');
    a.recordAnswer(ev());
    expect(data.get(STORAGE_KEY)).toBe(newer);
  });

  it('ignores other keys, other storage areas and tabs without consent when the document is removed', () => {
    const { tabs } = sharedTabs(2);
    const a = createStore(tabs[0].storage, tabs[0].events);
    const listener = vi.fn();
    a.subscribe(listener);
    tabs[1].storage.setItem('andere-app', '1');
    tabs[1].storage.removeItem('andere-app');
    expect(listener).not.toHaveBeenCalled();
    // an event for a different Storage object (e.g. sessionStorage) is not ours
    const events = { listeners: [] as Array<(e: { key: string | null; storageArea: Storage | null }) => void> };
    const c = createStore(memoryStorage(), { addEventListener: (_t, l) => events.listeners.push(l) });
    c.setConsent('granted');
    events.listeners.forEach((l) => l({ key: STORAGE_KEY, storageArea: memoryStorage() }));
    expect(c.getConsent()).toBe('granted');
  });
});

describe('recordAnswer / recordRound / recordBlitz', () => {
  it('returns the mastery change and badges earned by the answer (once)', () => {
    const s = createStore(null);
    let out = s.recordAnswer(ev());
    expect(out).toEqual({ before: 'neu', after: 'geuebt', newBadges: [], suggestNextStufe: false, growth: [] });
    for (let i = 0; i < 6; i++) out = s.recordAnswer(ev({ day: '2026-10-21' }));
    expect(out.suggestNextStufe).toBe(true);
    out = s.recordAnswer(ev({ day: '2026-10-21' }));
    expect(out.before).toBe('geuebt');
    expect(out.after).toBe('sicher');
    expect(out.newBadges.map((b) => b.id)).toEqual(['zahlen-sicher']);
    expect(s.get().badges).toEqual({ 'zahlen-sicher': '2026-10-21' });
    expect(s.recordAnswer(ev({ day: '2026-10-21' })).newBadges).toEqual([]);
    // a third practice day in the same week (weekly goal 3) is no reason for a badge
    expect(s.recordAnswer(ev({ day: '2026-10-22' })).newBadges).toEqual([]);
  });

  it('optional NRW extras never earn badges', () => {
    const s = createStore(null);
    let last;
    for (let i = 0; i < 8; i++) last = s.recordAnswer(ev({ skillId: 'zahlen.binaer', optional: true }));
    expect(last!.after).toBe('sicher');
    expect(last!.newBadges).toEqual([]);
    expect(s.recordRound({ day: '2026-10-19', answered: 8, firstTry: 8 })).toEqual([]);
    expect(s.get().badges).toEqual({});
  });

  it('Blitzrunde answers change nothing', () => {
    const s = createStore(null);
    const before = s.get();
    const out = s.recordAnswer(ev({ purpose: 'blitz', factKey: '3x7' }));
    expect(out).toEqual({ before: 'neu', after: 'neu', newBadges: [], suggestNextStufe: false, growth: [] });
    expect(s.get()).toBe(before);
  });

  it('a malformed event day falls back to today', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 21, 12, 0));
    try {
      const s = createStore(null);
      s.recordAnswer(ev({ day: '21.10.2026' }));
      expect(s.get().days).toEqual(['2026-10-21']);
    } finally {
      vi.useRealTimers();
    }
  });

  it('recordRound counts finished rounds and practice days, but rounds and days earn no badge', () => {
    const s = createStore(null);
    s.recordAnswer(ev({ day: '2026-10-19' }));
    s.recordAnswer(ev({ day: '2026-10-20' }));
    expect(s.recordRound({ day: '2026-10-20', answered: 0, firstTry: 0 })).toEqual([]);
    expect(s.get().totals.rounds).toBe(0);
    const badges = s.recordRound({ day: '2026-10-25', answered: 10, firstTry: 7 });
    expect(badges).toEqual([]);
    expect(s.get().totals.rounds).toBe(1);
    expect(s.get().days).toEqual(['2026-10-19', '2026-10-20', '2026-10-25']);
    expect(s.get().badges).toEqual({});
  });

  it('recordBlitz keeps the own best only', () => {
    const s = createStore(null);
    expect(s.recordBlitz(0)).toBe(false);
    expect(s.get().blitzBest).toBe(0);
    expect(s.recordBlitz(12)).toBe(true);
    expect(s.recordBlitz(10)).toBe(false);
    expect(s.recordBlitz(12)).toBe(false);
    expect(s.recordBlitz(15)).toBe(true);
    expect(s.recordBlitz(-1)).toBe(false);
    expect(s.recordBlitz(2.5)).toBe(false);
    expect(s.get().blitzBest).toBe(15);
  });
});

describe('settings, subscriptions and snapshots', () => {
  it('updateSettings ignores invalid values and unchanged patches', () => {
    const s = createStore(null);
    const listener = vi.fn();
    s.subscribe(listener);
    s.updateSettings({ weeklyGoal: 9, keypad: 'off' });
    expect(s.get().settings).toEqual({ ...DEFAULT_SETTINGS, keypad: 'off' });
    expect(listener).toHaveBeenCalledTimes(1);
    const snap = s.get();
    s.updateSettings({ keypad: 'off' });
    s.updateSettings({} as never);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(s.get()).toBe(snap);
  });

  it('notifies subscribers on every change; snapshots are stable in between', () => {
    const s = createStore(null);
    const listener = vi.fn();
    const unsubscribe = s.subscribe(listener);
    const a = s.get();
    expect(s.get()).toBe(a);
    s.recordAnswer(ev());
    expect(listener).toHaveBeenCalledTimes(1);
    const b = s.get();
    expect(b).not.toBe(a);
    expect(s.get()).toBe(b);
    s.setConsent('denied');
    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe();
    s.recordAnswer(ev());
    expect(listener).toHaveBeenCalledTimes(2);
  });
});

describe('export / import', () => {
  let source: Store;
  beforeEach(() => {
    source = createStore(null);
    for (let i = 0; i < 8; i++) source.recordAnswer(ev());
    source.recordAnswer(ev({ skillId: 'kopfrechnen.einmaleins', topicId: 'kopfrechnen', factKey: '4x8', latencyMs: 2500 }));
    // improvement tracking: an error-library tag and a missed Einmaleins fact
    source.recordAnswer(ev({ firstTry: false, bugTags: ['abrunden'], bugIds: ['abrunden'] }));
    source.recordAnswer(ev({ skillId: 'kopfrechnen.einmaleins', topicId: 'kopfrechnen', factKey: '6x7', firstTry: false, purpose: 'review' }));
    source.recordBlitz(9);
    source.updateSettings({ subtractionMethod: 'ergaenzen', weeklyGoal: 4 });
  });

  it('round trip: import(export()) reproduces the state', () => {
    const target = createStore(null);
    expect(target.importJson(source.exportJson())).toEqual({ ok: true });
    expect(target.get()).toEqual(source.get());
    expect(target.get().growth.errors['zahlen.runden']).toEqual({ abrunden: { day: '2026-10-19', seen: 1, run: 0 } });
    expect(target.get().growth.facts).toEqual({ '6x7': '2026-10-19' });
  });

  it('a backup from before the improvement tracking (v2) still imports, and tracking goes on from there', () => {
    const v2 = JSON.parse(source.exportJson());
    delete v2.growth;
    v2.version = 2;
    const target = createStore(null);
    expect(target.importJson(JSON.stringify(v2))).toEqual({ ok: true });
    expect(target.get().version).toBe(3);
    expect(target.get().skills).toEqual(source.get().skills);
    target.recordAnswer(ev({ firstTry: false, bugTags: ['abrunden'], bugIds: ['abrunden'], day: '2026-10-20' }));
    expect(target.get().growth.errors['zahlen.runden'].abrunden).toEqual({ day: '2026-10-20', seen: 1, run: 0 });
  });

  it("a backup with the removed 'Dranbleiber' badge and its count imports without them", () => {
    const old = JSON.parse(source.exportJson());
    old.badges = { ...old.badges, dranbleiber: '2026-10-15' };
    old.totals = { ...old.totals, afterHint: 12 };
    const target = createStore(null);
    expect(target.importJson(JSON.stringify(old))).toEqual({ ok: true });
    expect(target.get().badges.dranbleiber).toBeUndefined();
    expect(target.get().totals).not.toHaveProperty('afterHint');
    expect(target.exportJson()).not.toMatch(/dranbleiber|afterHint/);
  });

  it('import replaces progress and saves it when consent was given', () => {
    const storage = memoryStorage();
    const target = createStore(storage);
    target.setConsent('granted');
    target.recordAnswer(ev({ skillId: 'geometrie.umfang', topicId: 'geometrie' }));
    expect(target.importJson(source.exportJson())).toEqual({ ok: true });
    expect(target.get().skills['geometrie.umfang#1']).toBeUndefined();
    expect(stored(storage)).toEqual({ app: 'mathe4', ...source.get() });
  });

  it('keeps the current settings when the file has no valid settings', () => {
    const target = createStore(null);
    target.updateSettings({ largeText: true });
    const file = JSON.parse(source.exportJson());
    file.settings = { weeklyGoal: 'viele' };
    expect(target.importJson(JSON.stringify(file))).toEqual({ ok: true });
    expect(target.get().settings).toEqual({ ...DEFAULT_SETTINGS, largeText: true });
    expect(target.get().skills).toEqual(source.get().skills);
    delete file.settings;
    expect(target.importJson(JSON.stringify(file))).toEqual({ ok: true });
    expect(target.get().settings.largeText).toBe(true);
  });

  it('rejects malformed files with a friendly German message and keeps the state', () => {
    const target = createStore(null);
    target.recordAnswer(ev());
    const before = target.get();
    const good = JSON.parse(source.exportJson());
    const files: Array<[string, string]> = [
      ['', IMPORT_MESSAGES.empty],
      ['{', IMPORT_MESSAGES['not-json']],
      ['{"foo":1}', IMPORT_MESSAGES['not-mathe4']],
      [JSON.stringify({ ...good, version: 99 }), IMPORT_MESSAGES['newer-version']],
      [JSON.stringify({ ...good, totals: { answered: 'viele' } }), IMPORT_MESSAGES.invalid],
      [JSON.stringify({ ...good, skills: { 'zahlen.runden#1': { attempts: 1 } } }), IMPORT_MESSAGES.invalid],
    ];
    for (const [text, message] of files) {
      const r = target.importJson(text);
      expect(r).toEqual({ ok: false, error: message });
      if (!r.ok) for (const banned of BANNED_PHRASES) expect(r.error.toLowerCase()).not.toContain(banned);
    }
    expect(target.get()).toBe(before);
  });

  it('the export contains aggregates only (no free text, no names)', () => {
    const file = JSON.parse(source.exportJson());
    expect(Object.keys(file).sort()).toEqual(['app', 'badges', 'blitzBest', 'days', 'facts', 'growth', 'lastPlayed', 'reviewed', 'settings', 'skills', 'totals', 'version']);
    expect(file.lastPlayed).toEqual({ skillId: expect.any(String), stufe: expect.any(Number) });
    expect(Object.keys(file.lastPlayed).sort()).toEqual(['skillId', 'stufe']);
  });
});
