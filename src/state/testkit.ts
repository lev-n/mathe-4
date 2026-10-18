/**
 * Test helpers for src/state/*.test.ts (fake storages and state builders).
 * Not imported by app code, so it never ends up in the bundle.
 */
import type { SkillDef, Stufe, TopicId } from '../core/types';
import { emptyState } from './store';
import type { StorageEvents } from './store';
import type { AnswerEvent, FactProgress, MasteryState, ProgressState, StufeProgress } from './types';

export interface FakeStorage extends Storage {
  readonly data: Map<string, string>;
  writes: number;
  removes: number;
  reads: number;
}

/** In-memory Storage that counts accesses. */
export function memoryStorage(initial: Record<string, string> = {}): FakeStorage {
  const data = new Map(Object.entries(initial));
  const s = {
    data,
    writes: 0,
    removes: 0,
    reads: 0,
    get length() {
      return data.size;
    },
    clear() {
      data.clear();
    },
    getItem(key: string) {
      s.reads += 1;
      return data.has(key) ? data.get(key)! : null;
    },
    key(i: number) {
      return [...data.keys()][i] ?? null;
    },
    removeItem(key: string) {
      s.removes += 1;
      data.delete(key);
    },
    setItem(key: string, value: string) {
      s.writes += 1;
      data.set(key, String(value));
    },
  };
  return s as unknown as FakeStorage;
}

type StorageListener = Parameters<StorageEvents['addEventListener']>[1];

/**
 * Browser tabs of one origin: they share one localStorage, and a change in one tab fires a 'storage'
 * event in every *other* tab, with `storageArea` = that tab's own Storage object (like browsers do).
 * Use `tab.storage` and `tab.events` for createStore.
 */
export function sharedTabs(count: number): { data: Map<string, string>; tabs: Array<{ storage: FakeStorage; events: StorageEvents }> } {
  const shared = memoryStorage();
  const tabs: Array<{ storage: FakeStorage; events: StorageEvents; listeners: StorageListener[] }> = [];
  const notifyOthers = (from: FakeStorage, key: string | null) => {
    for (const t of tabs) if (t.storage !== from) for (const l of [...t.listeners]) l({ key, storageArea: t.storage });
  };
  for (let i = 0; i < count; i++) {
    const listeners: StorageListener[] = [];
    const storage: FakeStorage = Object.assign(Object.create(shared) as FakeStorage, {
      setItem(key: string, value: string) {
        const changed = shared.data.get(key) !== String(value);
        shared.setItem(key, value);
        if (changed) notifyOthers(storage, key);
      },
      removeItem(key: string) {
        const had = shared.data.has(key);
        shared.removeItem(key);
        if (had) notifyOthers(storage, key);
      },
      clear() {
        shared.clear();
        notifyOthers(storage, null);
      },
    });
    tabs.push({ storage, listeners, events: { addEventListener: (_type, listener) => listeners.push(listener) } });
  }
  return { data: shared.data, tabs: tabs.map(({ storage, events }) => ({ storage, events })) };
}

function securityError(): Error {
  const e = new Error('The operation is insecure.');
  e.name = 'SecurityError';
  return e;
}

/** Storage where every access throws (blocked cookies / storage disabled). */
export function throwingStorage(): Storage {
  const fail = () => {
    throw securityError();
  };
  return {
    get length(): number {
      throw securityError();
    },
    clear: fail,
    getItem: fail,
    key: fail,
    removeItem: fail,
    setItem: fail,
  } as unknown as Storage;
}

/** Reads work, writes throw QuotaExceededError (Safari private mode, full disk). */
export function quotaStorage(initial: Record<string, string> = {}): FakeStorage {
  const s = memoryStorage(initial);
  s.setItem = () => {
    s.writes += 1;
    const e = new Error('The quota has been exceeded.');
    e.name = 'QuotaExceededError';
    throw e;
  };
  return s;
}

export function ev(partial: Partial<AnswerEvent> = {}): AnswerEvent {
  return {
    skillId: 'zahlen.runden',
    topicId: 'zahlen',
    stufe: 1,
    firstTry: true,
    solved: true,
    usedHint: false,
    purpose: 'practice',
    day: '2026-10-19',
    ...partial,
  };
}

export function stufe(partial: Partial<StufeProgress> & { optional?: true } = {}): StufeProgress {
  return { attempts: 1, recent: [true], practiceDays: 1, state: 'geuebt', box: 0, checks: [], ...partial };
}

/** A skill-Stufe entry in the given mastery state (sicher/gemeistert are scheduled in box 1). */
export function entry(state: MasteryState, extra: Partial<StufeProgress> & { optional?: true } = {}): StufeProgress {
  const scheduled = state === 'sicher' || state === 'gemeistert';
  return stufe({
    attempts: state === 'neu' ? 0 : 10,
    state,
    box: scheduled ? 1 : 0,
    ...(scheduled ? { sicherSince: '2026-10-01', due: '2026-10-02' } : {}),
    ...extra,
  });
}

export function withSkills(skills: Record<string, StufeProgress>, base: ProgressState = emptyState()): ProgressState {
  return { ...base, skills: { ...base.skills, ...skills } };
}

export function withFacts(facts: Record<string, FactProgress>, base: ProgressState = emptyState()): ProgressState {
  return { ...base, facts: { ...base.facts, ...facts } };
}

export const key = (skillId: string, s: Stufe) => `${skillId}#${s}`;

/** Minimal SkillDef for planning tests (generate is never called). */
export function skillDef(id: string, optional = false): SkillDef {
  return {
    id,
    topicId: id.split('.')[0] as TopicId,
    title: id,
    description: id,
    stufen: { 1: 'a', 2: 'b', 3: 'c' },
    kmk: [],
    ...(optional ? { optional: 'nrw' as const } : {}),
    generate: () => {
      throw new Error('not used');
    },
  };
}
