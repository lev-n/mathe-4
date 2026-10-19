/**
 * Progress store with § 25 TDDDG opt-in (docs/research.md P1, P14).
 *
 * - Nothing is written to storage before setConsent('granted').
 * - On start, a valid 'mathe4.v1' document is loaded and consent counts as 'granted';
 *   otherwise consent is 'unknown' and progress lives in memory only. A document written by a newer app version
 *   (e.g. after a rollback of the site) is never overwritten: consent is 'denied' and nothing is written until it is
 *   gone ("Fortschritt löschen"), so the newer version finds its progress again.
 * - 'denied' keeps progress in memory for this visit (not persisted, asked again next visit).
 * - Every storage call is wrapped in try/catch (Safari private mode, quota, blocked storage):
 *   on failure the app keeps working from memory, and getSaveStatus() reports 'failed' so the UI
 *   never claims that progress is saved when it is not.
 * - With consent, the state is saved after every change.
 * - Several tabs share one document: when another tab writes it, this tab takes it over (so the next
 *   answer here cannot overwrite the other tab's progress); when another tab removes it ("Nicht mehr
 *   merken", "Fortschritt löschen") or a newer app version wrote it, this tab stops writing.
 */
import { badgeById, evaluateBadges } from './badges';
import { insertDay, isDay, today } from './dates';
import { applyGrowth, emptyGrowth } from './growth';
import { applyAnswer } from './mastery';
import { IMPORT_MESSAGES, parseText, sanitizeSettingsPatch, serializeState } from './schema';
import { DEFAULT_SETTINGS } from './types';
import type { AnswerEvent, AnswerOutcome, BadgeDef, Consent, Day, ProgressState, SaveStatus, Settings } from './types';

export const STORAGE_KEY = 'mathe4.v1';

export interface Store {
  get(): ProgressState;
  subscribe(listener: () => void): () => void;
  getConsent(): Consent;
  /** 'granted' writes the current in-memory state immediately; 'denied' keeps everything in memory only. */
  setConsent(consent: 'granted' | 'denied'): void;
  /**
   * Whether the last write worked ('ok' until something was written). 'failed' while consent is
   * 'granted' means the browser does not let us store anything (blocked, full, private mode).
   */
  getSaveStatus(): SaveStatus;
  recordAnswer(event: AnswerEvent): AnswerOutcome;
  /** Call at the end of a round; returns badges earned by finishing it. */
  recordRound(round: { day: Day; answered: number; firstTry: number }): BadgeDef[];
  /** Returns true if this is a new personal best. */
  recordBlitz(score: number): boolean;
  updateSettings(patch: Partial<Settings>): void;
  /** "Fortschritt löschen": wipe memory and storage (settings are kept in memory). */
  reset(): void;
  /** "Nicht mehr merken": remove from storage, keep in memory, consent → 'denied'. */
  forget(): void;
  exportJson(): string;
  importJson(text: string): { ok: true } | { ok: false; error: string };
}

export function emptyState(): ProgressState {
  return {
    version: 3,
    skills: {},
    facts: {},
    days: [],
    badges: {},
    totals: { answered: 0, firstTry: 0, rounds: 0, checksPassed: 0 },
    growth: emptyGrowth(),
    settings: { ...DEFAULT_SETTINGS },
  };
}

const isKnownBadge = (id: string) => badgeById(id) !== undefined;

/** The stored document: its state if it is valid, and whether a newer app version wrote it. */
function readStored(storage: Storage | null): { state: ProgressState | null; newer: boolean } {
  if (!storage) return { state: null, newer: false };
  try {
    const text = storage.getItem(STORAGE_KEY);
    if (text === null) return { state: null, newer: false };
    const parsed = parseText(text, isKnownBadge);
    return parsed.ok ? { state: parsed.state, newer: false } : { state: null, newer: parsed.error === 'newer-version' };
  } catch {
    return { state: null, newer: false };
  }
}

/** Reads and validates the stored document; null if absent, unreadable or invalid. */
export function loadFromStorage(storage: Storage | null): ProgressState | null {
  return readStored(storage).state;
}

/**
 * Asks the browser not to evict our storage (only after opt-in; never throws, never awaited).
 * Only where this cannot open a browser dialog: Firefox asks the user with a permission pop-up,
 * which a child would get in the middle of a round (§ 6.4: no pop-ups during a round). So persist()
 * is called when the permission is already granted, or when the browser has no permission prompt
 * for it at all (no Permissions API, or it does not know 'persistent-storage', e.g. Safari).
 */
function requestPersistentStorage(): void {
  const nav: Navigator | undefined = typeof navigator === 'undefined' ? undefined : navigator;
  const persist = () => {
    try {
      nav?.storage?.persist?.().then(undefined, () => undefined);
    } catch {
      // Not supported or blocked: progress is still saved, just without the persistence hint.
    }
  };
  try {
    if (typeof nav?.storage?.persist !== 'function') return;
    const query = nav.permissions?.query({ name: 'persistent-storage' }) as Promise<PermissionStatus | undefined> | undefined;
    if (typeof query?.then !== 'function') return persist();
    // A rejected query means the browser does not know this permission, so it has no prompt for it.
    query.then((status) => {
      if (status?.state === 'granted') persist();
    }, persist);
  } catch {
    // query() threw synchronously (unknown permission name): no prompt either.
    persist();
  }
}

/** The part of `window` the store needs to hear about writes from other tabs. */
export interface StorageEvents {
  addEventListener(type: 'storage', listener: (event: Pick<StorageEvent, 'key' | 'storageArea'>) => void): void;
}

/**
 * @param storage injected for tests; null = no persistence available.
 * @param events where 'storage' events from other tabs arrive (window in the browser).
 */
export function createStore(storage: Storage | null, events: StorageEvents | null = null): Store {
  const { state: loaded, newer } = readStored(storage);
  let state: ProgressState = loaded ?? emptyState();
  let consent: Consent = loaded ? 'granted' : newer ? 'denied' : 'unknown';
  /** A newer app version's document is in storage: never write over it. */
  let newerStored = newer;
  let saveStatus: SaveStatus = 'ok';
  let persistRequested = false;
  const listeners = new Set<() => void>();

  const emit = () => {
    for (const l of [...listeners]) l();
  };

  function save(): void {
    if (consent !== 'granted') return;
    let ok = false;
    if (storage && !newerStored) {
      try {
        storage.setItem(STORAGE_KEY, serializeState(state));
        ok = true;
      } catch {
        // Quota exceeded, private mode or blocked storage: keep working from memory.
      }
    }
    saveStatus = newerStored ? 'newer' : ok ? 'ok' : 'failed';
  }

  /** Another tab changed (or removed) the stored document. */
  function onStorageEvent(event: Pick<StorageEvent, 'key' | 'storageArea'>): void {
    if (!storage || (event.storageArea && event.storageArea !== storage)) return;
    if (event.key !== null && event.key !== STORAGE_KEY) return; // key null = storage.clear()
    let text: string | null;
    try {
      text = storage.getItem(STORAGE_KEY);
    } catch {
      return;
    }
    const parsed = text === null ? null : parseText(text, isKnownBadge);
    // Only while a newer version's document is actually stored: removed or replaced by a valid one, saving works again.
    newerStored = parsed !== null && !parsed.ok && parsed.error === 'newer-version';
    if (parsed?.ok) {
      // The other tab has consent and the newest progress. Every change made here was written and
      // taken over there as well, so nothing of this tab's saved progress is lost.
      state = parsed.state;
      consent = 'granted';
      saveStatus = 'ok';
      emit();
    } else {
      if (consent === 'granted') {
        // Removed in another tab ("Nicht mehr merken", "Fortschritt löschen" removes first) or written
        // by a newer app version: never write it back from here. Progress of this visit stays in memory.
        consent = 'denied';
        saveStatus = 'ok';
        emit();
      }
    }
  }
  if (events) {
    try {
      events.addEventListener('storage', onStorageEvent);
    } catch {
      // No events: tabs just do not sync.
    }
  }

  function removeStored(): void {
    if (!storage) return;
    try {
      storage.removeItem(STORAGE_KEY);
    } catch {
      // ignore: nothing we can do, memory state stays valid
    }
  }

  function commit(next: ProgressState): void {
    state = next;
    save();
    emit();
  }

  function withNewBadges(next: ProgressState, day: Day): { state: ProgressState; badges: BadgeDef[] } {
    const ids = evaluateBadges(next);
    if (ids.length === 0) return { state: next, badges: [] };
    const badges = { ...next.badges };
    for (const id of ids) badges[id] = day;
    return { state: { ...next, badges }, badges: ids.map((id) => badgeById(id)).filter((b): b is BadgeDef => b !== undefined) };
  }

  const validDay = (d: unknown): Day => (isDay(d) ? d : today());

  return {
    get: () => state,

    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    getConsent: () => consent,

    getSaveStatus: () => saveStatus,

    setConsent(next) {
      if (next === 'granted') {
        const wasGranted = consent === 'granted';
        consent = 'granted';
        save();
        if (!wasGranted && !persistRequested) {
          persistRequested = true;
          requestPersistentStorage();
        }
        emit();
      } else if (next === 'denied') {
        // If we stored something before, honour the new choice and remove it.
        if (consent === 'granted') removeStored();
        consent = 'denied';
        saveStatus = 'ok';
        emit();
      }
    },

    recordAnswer(event) {
      const day = validDay(event.day);
      const applied = applyAnswer(state, event, day);
      if (!applied.counted) return { before: applied.before, after: applied.after, newBadges: [], suggestNextStufe: false, growth: [] };
      // Improvements are measured against the child's own earlier answers (docs/research.md M16).
      const grown = applyGrowth(state, applied.state, event, day);
      let next = grown.state;
      let newBadges: BadgeDef[] = [];
      // Optional NRW extras never earn badges.
      if (!event.optional) ({ state: next, badges: newBadges } = withNewBadges(next, day));
      commit(next);
      return { before: applied.before, after: applied.after, newBadges, suggestNextStufe: applied.suggestNextStufe, growth: grown.events };
    },

    recordRound(round) {
      if (!(Number.isFinite(round.answered) && round.answered > 0)) return [];
      const day = validDay(round.day);
      const counted: ProgressState = {
        ...state,
        days: insertDay(state.days, day),
        totals: { ...state.totals, rounds: state.totals.rounds + 1 },
      };
      const { state: next, badges } = withNewBadges(counted, day);
      commit(next);
      return badges;
    },

    recordBlitz(score) {
      if (!Number.isInteger(score) || score < 0 || score > 100_000) return false;
      const best = state.blitzBest;
      if (best !== undefined && score <= best) return false;
      commit({ ...state, blitzBest: score });
      // The very first Blitzrunde is only a "new best" if something was solved.
      return best === undefined ? score > 0 : true;
    },

    updateSettings(patch) {
      const clean = sanitizeSettingsPatch(patch);
      const changed = (Object.keys(clean) as (keyof Settings)[]).some((k) => clean[k] !== state.settings[k]);
      if (!changed) return;
      commit({ ...state, settings: { ...state.settings, ...clean } });
    },

    reset() {
      // Remove first so old progress is gone even if writing the empty state fails. "Fortschritt löschen" also
      // removes a newer version's document (the adult chose to delete the progress on this device).
      if (consent === 'granted' || newerStored) removeStored();
      newerStored = false;
      commit({ ...emptyState(), settings: state.settings });
    },

    forget() {
      removeStored();
      newerStored = false;
      consent = 'denied';
      saveStatus = 'ok';
      emit();
    },

    exportJson: () => serializeState(state),

    importJson(text) {
      const parsed = parseText(text, isKnownBadge);
      if (!parsed.ok) return { ok: false, error: IMPORT_MESSAGES[parsed.error] };
      commit({ ...parsed.state, settings: parsed.settingsValid ? parsed.state.settings : state.settings });
      return { ok: true };
    },
  };
}

/** window.localStorage, or null where it is missing or blocked (accessing it can throw a SecurityError). */
function safeLocalStorage(): Storage | null {
  try {
    // Through `window` so non-browser runtimes (Node's experimental global localStorage) are not touched.
    return typeof window === 'undefined' ? null : (window.localStorage ?? null);
  } catch {
    return null;
  }
}

export const store: Store = createStore(safeLocalStorage(), typeof window === 'undefined' ? null : window);
