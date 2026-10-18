/**
 * React bindings for the progress store via useSyncExternalStore.
 * Snapshots are stable: store.get() returns the same object until something changes, and every
 * change produces a new object, so components re-render exactly when progress changes.
 */
import { useSyncExternalStore } from 'react';
import { store } from './store';
import type { Store } from './store';
import type { Consent, ProgressState, SaveStatus, Settings } from './types';

/** Progress of an explicit store (tests, previews). */
export function useStoreProgress(s: Store): ProgressState {
  return useSyncExternalStore(s.subscribe, s.get, s.get);
}

/** Consent of an explicit store (tests, previews). */
export function useStoreConsent(s: Store): Consent {
  return useSyncExternalStore(s.subscribe, s.getConsent, s.getConsent);
}

/** Save status of an explicit store (tests, previews). */
export function useStoreSaveStatus(s: Store): SaveStatus {
  return useSyncExternalStore(s.subscribe, s.getSaveStatus, s.getSaveStatus);
}

export function useProgress(): ProgressState {
  return useStoreProgress(store);
}

export function useConsent(): Consent {
  return useStoreConsent(store);
}

/**
 * 'failed' while consent is 'granted' means nothing can be stored in this browser (blocked, full,
 * private mode): the UI must then not say "Dein Fortschritt ist gespeichert".
 */
export function useSaveStatus(): SaveStatus {
  return useStoreSaveStatus(store);
}

export function useSettings(): Settings {
  return useProgress().settings;
}
