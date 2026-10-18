/** Small hooks shared by the app shell and the pages. */
import { useEffect, useRef, useState } from 'react';
import type { TopicId, TopicModule } from '../../core/types';
import type { Settings } from '../../state/types';
import { documentTitle } from '../../seo/meta';
import { TOPICS, loadTopic, loadedTopic } from '../../topics/registry';

/** Sets document.title to '<title> – Mathe 4' (or the start page title for null), see src/seo/meta.ts. */
export function useDocumentTitle(title: string | null): void {
  useEffect(() => {
    document.title = documentTitle(title);
  }, [title]);
}

/** Settings → classes on <html> (see src/styles/tokens.css). */
export const SETTING_CLASSES = [
  ['largeText', 'large-text'],
  ['wideSpacing', 'wide-spacing'],
  ['schoolFont', 'school-font'],
  ['reduceMotion', 'reduce-motion'],
] as const satisfies readonly (readonly [keyof Settings, string])[];

type ClassFlags = Pick<Settings, (typeof SETTING_CLASSES)[number][0]>;

export function applySettingClasses(flags: ClassFlags, root: HTMLElement = document.documentElement): void {
  for (const [key, cls] of SETTING_CLASSES) root.classList.toggle(cls, Boolean(flags[key]));
}

export function useHtmlSettings(settings: Settings): void {
  const { largeText, wideSpacing, schoolFont, reduceMotion } = settings;
  useEffect(() => {
    applySettingClasses({ largeText, wideSpacing, schoolFont, reduceMotion });
  }, [largeText, wideSpacing, schoolFont, reduceMotion]);
}

export type LoadState<T> = { status: 'loading' } | { status: 'ready'; data: T } | { status: 'error' };

/**
 * Lazily loads one topic module (cached by the registry). A module that is already loaded is 'ready' on
 * the first render, so a prerendered topic page hydrates with the same content it was rendered with.
 */
export function useTopicModule(topicId: TopicId | null): LoadState<TopicModule> {
  const [state, setState] = useState<{ id: TopicId | null; value: LoadState<TopicModule> }>({ id: null, value: { status: 'loading' } });
  useEffect(() => {
    if (!topicId) return;
    let alive = true;
    loadTopic(topicId).then(
      (mod) => alive && setState({ id: topicId, value: { status: 'ready', data: mod } }),
      () => alive && setState({ id: topicId, value: { status: 'error' } }),
    );
    return () => {
      alive = false;
    };
  }, [topicId]);
  if (state.id === topicId) return state.value;
  const loaded = topicId ? loadedTopic(topicId) : undefined;
  return loaded ? { status: 'ready', data: loaded } : { status: 'loading' };
}

/**
 * Lazily loads the given topic modules and reports each one as soon as it arrives
 * (so a slow or broken chunk never blocks the others). Pass only what the page needs.
 */
export function useTopicModules(ids: readonly TopicId[]): Partial<Record<TopicId, TopicModule | 'error'>> {
  const key = [...new Set(ids)].sort().join(',');
  const [mods, setMods] = useState<Partial<Record<TopicId, TopicModule | 'error'>>>({});
  useEffect(() => {
    let alive = true;
    const wanted = key ? (key.split(',') as TopicId[]) : [];
    for (const id of wanted) {
      loadTopic(id).then(
        (mod) => alive && setMods((m) => (m[id] === mod ? m : { ...m, [id]: mod })),
        () => alive && setMods((m) => ({ ...m, [id]: 'error' })),
      );
    }
    return () => {
      alive = false;
    };
  }, [key]);
  return mods;
}

/** All seven topic modules. */
export function useAllTopicModules(): Partial<Record<TopicId, TopicModule | 'error'>> {
  return useTopicModules(TOPICS.map((t) => t.id));
}

/**
 * After a navigation (not on first load): scroll to top and move focus to the page <h1> inside #main.
 * Lazy pages render their <h1> later, so we wait for it (MutationObserver). If something inside the
 * page already took focus (e.g. an answer field), we leave it there.
 */
export function useRouteFocus(locationKey: number, mainId = 'main'): void {
  // Remember the handled location (not a "first run" flag) so StrictMode's double effect run is a no-op.
  const handled = useRef(locationKey);
  useEffect(() => {
    if (handled.current === locationKey) return;
    handled.current = locationKey;
    try {
      window.scrollTo(0, 0);
    } catch {
      /* not available (tests, old browsers) */
    }
    const main = document.getElementById(mainId);
    if (!main) return;

    const focusedInsidePage = () => {
      const active = document.activeElement;
      return active !== null && active !== main && active !== document.body && main.contains(active);
    };
    const tryFocus = (): boolean => {
      if (focusedInsidePage()) return true;
      const h1 = main.querySelector<HTMLElement>('h1');
      if (!h1) return false;
      if (!h1.hasAttribute('tabindex')) h1.setAttribute('tabindex', '-1');
      h1.focus({ preventScroll: true });
      return true;
    };
    if (tryFocus()) return;

    const observer = new MutationObserver(() => {
      if (tryFocus()) cleanup();
    });
    const timer = window.setTimeout(() => {
      cleanup();
      const active = document.activeElement;
      if (!active || active === document.body) main.focus({ preventScroll: true });
    }, 5000);
    function cleanup() {
      observer.disconnect();
      window.clearTimeout(timer);
    }
    observer.observe(main, { childList: true, subtree: true });
    return cleanup;
  }, [locationKey, mainId]);
}
