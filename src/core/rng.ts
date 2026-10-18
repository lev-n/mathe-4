import type { Rng } from './types';

/** mulberry32 — small, fast, good enough for exercise generation. */
export function createRng(seed: number): Rng {
  let a = seed >>> 0;
  const next = (): number => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const int = (min: number, max: number): number => {
    if (!Number.isFinite(min) || !Number.isFinite(max) || max < min) {
      throw new RangeError(`rng.int: invalid range [${min}, ${max}]`);
    }
    return min + Math.floor(next() * (Math.floor(max) - Math.ceil(min) + 1));
  };
  const rng: Rng = {
    seed: seed >>> 0,
    next,
    int,
    pick<T>(items: readonly T[]): T {
      if (items.length === 0) throw new RangeError('rng.pick: empty array');
      return items[int(0, items.length - 1)];
    },
    shuffle<T>(items: readonly T[]): T[] {
      const out = items.slice();
      for (let i = out.length - 1; i > 0; i--) {
        const j = int(0, i);
        [out[i], out[j]] = [out[j], out[i]];
      }
      return out;
    },
    chance(p: number): boolean {
      return next() < p;
    },
    sample<T>(items: readonly T[], n: number): T[] {
      if (n > items.length) throw new RangeError('rng.sample: n larger than array');
      return rng.shuffle(items).slice(0, n);
    },
  };
  return rng;
}

/** A fresh random seed (non-deterministic). Only for the UI, never inside generators. */
export function randomSeed(): number {
  try {
    const buf = new Uint32Array(1);
    crypto.getRandomValues(buf);
    return buf[0];
  } catch {
    return Math.floor(Math.random() * 2 ** 32);
  }
}

/** Derive a child seed (e.g. item i of a worksheet with seed s). */
export function deriveSeed(seed: number, index: number): number {
  let h = (seed ^ Math.imul(index + 1, 0x9e3779b1)) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}
