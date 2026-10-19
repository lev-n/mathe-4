/**
 * "Besser geworden" (kind 4) must not reward chance (docs/research.md §7.2). Simulated children practise one Stufe
 * through the real reducers: rounds of 10 on days 1–3 apart, a due review first. Children whose ability never changes
 * must almost never get it; children who really learn should often get it. Fixed seeds, so the result is stable.
 */
import { describe, expect, it } from 'vitest';
import { createRng } from '../core/rng';
import { addDays } from './dates';
import { applyGrowth } from './growth';
import { applyAnswer } from './mastery';
import { emptyState } from './store';
import { ev } from './testkit';
import type { ProgressState, RoundPurpose } from './types';

const KEY = 'zahlen.runden#1';

/** True when "besser" fired for one child. `p(session, sessionNoise)` is the first-try probability. */
function child(seed: number, p: (session: number, noise: number) => number, sessions = 8): boolean {
  const rng = createRng(seed);
  let state: ProgressState = emptyState();
  let day = '2026-01-05';
  for (let s = 0; s < sessions; s++) {
    // a good or a bad day (no learning): normal noise, sd 0.1
    const noise = 0.1 * Math.sqrt(-2 * Math.log(Math.max(1e-12, rng.next()))) * Math.cos(2 * Math.PI * rng.next());
    const prog = state.skills[KEY];
    const items: RoundPurpose[] = prog && prog.box >= 1 && prog.due !== undefined && prog.due <= day ? ['review'] : [];
    items.push(...Array<RoundPurpose>(10).fill('practice'));
    for (const purpose of items) {
      const firstTry = rng.chance(Math.min(0.99, Math.max(0.01, p(s, noise))));
      const wrongAttempt = !firstTry && rng.chance(0.85);
      const usedHint = !firstTry && (!wrongAttempt || rng.chance(0.3));
      const event = ev({ day, purpose, firstTry, wrongAttempt, usedHint, solved: firstTry || rng.chance(0.8) });
      const applied = applyAnswer(state, event, day);
      const grown = applyGrowth(state, applied.state, event, day);
      if (grown.events.some((e) => e.kind === 'besser')) return true;
      state = grown.state;
    }
    day = addDays(day, rng.int(1, 3));
  }
  return false;
}

const rate = (p: (session: number, noise: number) => number, seeds = 300) => {
  let n = 0;
  for (let seed = 1; seed <= seeds; seed++) if (child(seed, p)) n += 1;
  return n / seeds;
};

describe('kind 4 in simulation: real learning, not chance', () => {
  it('children who do not get better almost never get it (the rule before fired for 22–55 % of them)', () => {
    for (const ability of [0.6, 0.7, 0.8]) {
      expect(rate(() => ability), `constant ${ability}`).toBeLessThanOrEqual(0.05);
      expect(rate((_s, noise) => ability + noise), `good and bad days around ${ability}`).toBeLessThanOrEqual(0.06);
    }
  });

  it('children who learn (from 4 of 10 to 9 of 10 over three sessions) mostly get it', () => {
    expect(rate((s) => 0.4 + 0.5 * Math.min(1, s / 3))).toBeGreaterThanOrEqual(0.6);
  });
});
