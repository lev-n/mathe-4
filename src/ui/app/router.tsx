/**
 * Tiny History-API router (no dependency).
 *
 * - `useLocation()` returns { path, key }. `key` changes on every navigation (also when the same path is
 *   navigated to again, e.g. "Noch eine Runde"), so pages can be remounted with `key`.
 * - `navigate(to)` pushes a history entry (replaces it when the path is unchanged or `replace` is set).
 * - Back/forward (popstate) are picked up automatically. Hash-only changes (in-page anchors) do not count
 *   as navigation.
 * - `<Link>` renders a real <a href> and intercepts plain left clicks.
 */
import { useSyncExternalStore } from 'react';
import type { AnchorHTMLAttributes, MouseEvent } from 'react';

export interface AppLocation {
  /** location.pathname, without trailing slash (except '/'). */
  path: string;
  /** Increments on each navigation. */
  key: number;
}

let serverPath = '/';

/** Build-time prerendering only: the path to render where there is no window (src/seo/prerender.tsx). */
export function setServerPath(path: string): void {
  serverPath = path;
}

function readPath(): string {
  if (typeof window === 'undefined') return serverPath;
  const p = window.location.pathname || '/';
  return p.length > 1 && p.endsWith('/') ? p.replace(/\/+$/, '') || '/' : p;
}

let counter = 0;
let snapshot: AppLocation = { path: readPath(), key: counter };
const listeners = new Set<() => void>();

function emit(): void {
  listeners.forEach((l) => l());
}

function onPopState(): void {
  emit();
}

function subscribe(listener: () => void): () => void {
  if (listeners.size === 0 && typeof window !== 'undefined') window.addEventListener('popstate', onPopState);
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && typeof window !== 'undefined') window.removeEventListener('popstate', onPopState);
  };
}

function getSnapshot(): AppLocation {
  const path = readPath();
  if (path !== snapshot.path) snapshot = { path, key: ++counter };
  return snapshot;
}

export function useLocation(): AppLocation {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/** Current location outside React. */
export function currentLocation(): AppLocation {
  return getSnapshot();
}

export function navigate(to: string, options: { replace?: boolean } = {}): void {
  const target = new URL(to, window.location.href);
  const samePath = target.pathname === window.location.pathname && target.search === window.location.search;
  if (options.replace || samePath) window.history.replaceState(null, '', to);
  else window.history.pushState(null, '', to);
  snapshot = { path: readPath(), key: ++counter };
  emit();
}

export type LinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & {
  to: string;
  replace?: boolean;
};

function isPlainLeftClick(e: MouseEvent<HTMLAnchorElement>): boolean {
  return e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;
}

/** Internal link: a real <a href> (works with middle-click, "open in new tab", no JS) that navigates in-app. */
export function Link({ to, replace, onClick, target, ...rest }: LinkProps) {
  return (
    <a
      {...rest}
      href={to}
      target={target}
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented || !isPlainLeftClick(e) || (target && target !== '_self')) return;
        e.preventDefault();
        navigate(to, { replace });
      }}
    />
  );
}

/** Nav link with aria-current="page" when its path is active. */
export function NavLink({ to, exact = true, ...rest }: LinkProps & { exact?: boolean }) {
  const { path } = useLocation();
  const active = exact ? path === to : path === to || path.startsWith(to + '/');
  return <Link {...rest} to={to} aria-current={active ? 'page' : undefined} />;
}
