import { describe, expect, it } from 'vitest';
import { createRng, deriveSeed } from './rng';

describe('createRng', () => {
  it('is deterministic per seed', () => {
    const a = createRng(42);
    const b = createRng(42);
    expect(Array.from({ length: 20 }, () => a.next())).toEqual(Array.from({ length: 20 }, () => b.next()));
  });
  it('int stays in range and hits both ends', () => {
    const r = createRng(1);
    const seen = new Set<number>();
    for (let i = 0; i < 2000; i++) {
      const v = r.int(3, 7);
      expect(v).toBeGreaterThanOrEqual(3);
      expect(v).toBeLessThanOrEqual(7);
      seen.add(v);
    }
    expect([...seen].sort()).toEqual([3, 4, 5, 6, 7]);
    expect(() => r.int(5, 1)).toThrow();
  });
  it('shuffle and sample keep elements', () => {
    const r = createRng(7);
    const items = [1, 2, 3, 4, 5, 6];
    expect(r.shuffle(items).sort()).toEqual(items);
    const s = r.sample(items, 3);
    expect(new Set(s).size).toBe(3);
    expect(() => r.sample(items, 7)).toThrow();
    expect(() => r.pick([])).toThrow();
  });
  it('deriveSeed spreads seeds', () => {
    const seeds = new Set(Array.from({ length: 100 }, (_, i) => deriveSeed(123, i)));
    expect(seeds.size).toBe(100);
  });
});
