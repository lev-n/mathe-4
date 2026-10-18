/**
 * "Holdover" touches (docs/research.md P8): after a screen change, a tap that lands on a newly rendered
 * control at the previous tap position is ignored for 400 ms.
 *
 * Only pointer-originated clicks (event.detail > 0) are filtered; keyboard activation is never blocked.
 */
import { useCallback, useLayoutEffect, useRef } from 'react';

export const HOLDOVER_MS = 400;

function now(): number {
  return typeof performance !== 'undefined' && typeof performance.now === 'function' ? performance.now() : Date.now();
}

/** Pure decision used by the hook (exported for tests). */
export function isHoldoverClick(detail: number, msSinceChange: number, holdMs = HOLDOVER_MS): boolean {
  return detail > 0 && msSinceChange < holdMs;
}

/**
 * @param screenKey changes whenever the screen changes (new item, feedback shown, summary …)
 * @returns guard(event) → true if the click must be ignored
 */
export function useHoldover(screenKey: string | number): (event: { detail: number }) => boolean {
  const changedAt = useRef<number>(now());
  useLayoutEffect(() => {
    changedAt.current = now();
  }, [screenKey]);
  return useCallback((event: { detail: number }) => isHoldoverClick(event.detail, now() - changedAt.current), []);
}
