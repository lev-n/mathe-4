// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { STORAGE_KEY, createStore, store } from './store';
import type { Store } from './store';
import { ev, quotaStorage } from './testkit';
import { useConsent, useProgress, useSaveStatus, useSettings, useStoreConsent, useStoreProgress, useStoreSaveStatus } from './useProgress';

afterEach(() => cleanup());

function Probe({ s, onRender }: { s: Store; onRender: () => void }) {
  onRender();
  const progress = useStoreProgress(s);
  const consent = useStoreConsent(s);
  return createElement('p', { 'data-testid': 'probe' }, `${progress.totals.answered}|${consent}`);
}

describe('useStoreProgress / useStoreConsent', () => {
  it('re-render when the store changes and stay stable otherwise', () => {
    const s = createStore(null);
    let renders = 0;
    render(createElement(Probe, { s, onRender: () => (renders += 1) }));
    expect(screen.getByTestId('probe').textContent).toBe('0|unknown');
    const afterMount = renders;

    act(() => {
      s.recordAnswer(ev());
    });
    expect(screen.getByTestId('probe').textContent).toBe('1|unknown');
    act(() => {
      s.setConsent('denied');
    });
    expect(screen.getByTestId('probe').textContent).toBe('1|denied');
    // unchanged settings patch → no new snapshot → no re-render
    const before = renders;
    act(() => {
      s.updateSettings({ keypad: 'auto' });
    });
    expect(renders).toBe(before);
    expect(renders).toBeLessThanOrEqual(afterMount + 2);
  });

  it('useStoreSaveStatus reports a failed write after opt-in', () => {
    const s = createStore(quotaStorage());
    function SaveProbe() {
      return createElement('p', { 'data-testid': 'save' }, `${useStoreConsent(s)}|${useStoreSaveStatus(s)}`);
    }
    render(createElement(SaveProbe));
    expect(screen.getByTestId('save').textContent).toBe('unknown|ok');
    act(() => {
      s.setConsent('granted');
    });
    expect(screen.getByTestId('save').textContent).toBe('granted|failed');
  });
});

function AppProbe() {
  const progress = useProgress();
  const consent = useConsent();
  const settings = useSettings();
  const saveStatus = useSaveStatus();
  return createElement('p', { 'data-testid': 'app' }, `${progress.totals.answered}|${consent}|${settings.weeklyGoal}|${progress.days.length}|${saveStatus}`);
}

describe('hooks on the app store', () => {
  it('read the singleton store; nothing reaches localStorage before consent', () => {
    render(createElement(AppProbe));
    expect(screen.getByTestId('app').textContent).toBe('0|unknown|3|0|ok');
    act(() => {
      store.recordAnswer(ev());
      store.updateSettings({ weeklyGoal: 4 });
    });
    expect(screen.getByTestId('app').textContent).toBe('1|unknown|4|1|ok');
    expect(window.localStorage.length).toBe(0);

    act(() => {
      store.setConsent('granted');
    });
    expect(screen.getByTestId('app').textContent).toBe('1|granted|4|1|ok');
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY)!).totals.answered).toBe(1);
    act(() => {
      store.forget();
    });
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(screen.getByTestId('app').textContent).toBe('1|denied|4|1|ok');
  });
});
