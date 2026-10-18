// @vitest-environment jsdom
/**
 * The prerendered HTML must be exactly what the browser's first render produces, or React throws it
 * away (a flash, and a recoverable error). Each page is rendered like the build does, then hydrated by a
 * fresh copy of the app (vi.resetModules: nothing loaded yet, so preloadRoute must fetch what is needed).
 */
import { StrictMode, act } from 'react';
import { hydrateRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { serializeState } from '../state/schema';
import { STORAGE_KEY, emptyState } from '../state/store';
import { loadAllTopics } from '../topics/registry';
import { preloadRoute as preloadForServer } from '../ui/app/App';
import { PRERENDERED_PATHS, renderBody } from './prerender';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | null = null;

// The "server" side renders with this file's module graph. Load everything it needs before the first
// vi.resetModules(), or the lazy worksheet page would be imported into a later (client) graph.
beforeAll(async () => {
  await loadAllTopics();
  await preloadForServer({ name: 'worksheet' });
});

afterEach(() => {
  act(() => root?.unmount());
  root = null;
  document.body.innerHTML = '';
  document.documentElement.className = '';
  localStorage.clear();
  vi.restoreAllMocks();
});

async function hydrate(path: string) {
  window.history.replaceState(null, '', path);
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
  const html = await renderBody(path);
  const container = document.createElement('div');
  container.id = 'root';
  container.innerHTML = html;
  document.body.appendChild(container);
  const prerendered = container.innerHTML;

  const errors: string[] = [];
  vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => void errors.push(args.map(String).join(' ')));
  vi.resetModules();
  const { default: App, preloadRoute } = await import('../ui/app/App');
  const { matchRoute } = await import('../ui/app/routes');
  await preloadRoute(matchRoute(path));
  await act(async () => {
    root = hydrateRoot(
      container,
      <StrictMode>
        <App />
      </StrictMode>,
      { onRecoverableError: (e) => void errors.push(`recoverable: ${String(e)}`) },
    );
  });
  // Let lazy chunks (the worksheet page) resolve and hydrate.
  await act(async () => {
    await new Promise((r) => setTimeout(r, 50));
  });
  return { prerendered, container, errors };
}

describe('hydration of the prerendered pages', () => {
  it.each(PRERENDERED_PATHS)('%s hydrates without a mismatch', async (path) => {
    const { prerendered, container, errors } = await hydrate(path);
    expect(errors).toEqual([]);
    expect(container.querySelector('h1')).not.toBeNull();
    // Unchanged after hydration (the worksheet form then fills in its random Blatt-Nummer).
    const seed = (html: string) => html.replace(/(id="ws-seed"[^>]*value=")\d*/, '$1');
    expect(seed(container.innerHTML)).toBe(seed(prerendered));
  }, 30_000);

  it('a returning visitor: hydrates the first-visit HTML, then shows the stored progress and settings', async () => {
    const state = emptyState();
    state.settings = { ...state.settings, nrwExtras: true, blitzrunde: true, largeText: true };
    state.days = ['2026-01-05'];
    localStorage.setItem(STORAGE_KEY, serializeState(state));

    const home = await hydrate('/');
    expect(home.errors).toEqual([]);
    expect(home.container.querySelector('.topic-card--blitz')).not.toBeNull();
    expect(home.container.textContent).toContain('Du hast schon an einem Tag geübt.');
    expect(document.documentElement.classList.contains('large-text')).toBe(true);
    act(() => root?.unmount());
    root = null;
    document.body.innerHTML = '';

    const topic = await hydrate('/thema/zahlen');
    expect(topic.errors).toEqual([]);
    expect(topic.container.textContent).toContain('Zusatz NRW');
  }, 30_000);
});
