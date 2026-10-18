// Verifies the colour tokens in tokens.css meet the contrast targets from docs/research.md.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync(new URL('./tokens.css', import.meta.url), 'utf8');
const token = (name: string): string => {
  const m = css.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`));
  if (!m) throw new Error(`token --${name} not found`);
  return m[1];
};
const lum = (hex: string) => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
export const contrast = (a: string, b: string) => {
  const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
};

describe('colour tokens', () => {
  it('task text ≥ 7:1 on surfaces', () => {
    for (const bg of ['surface', 'bg', 'surface-2']) expect(contrast(token('text'), token(bg))).toBeGreaterThanOrEqual(7);
  });
  it('muted text and feedback text ≥ 4.5:1', () => {
    for (const fg of ['text-muted', 'ok', 'retry', 'primary']) {
      for (const bg of ['surface', 'bg']) expect(contrast(token(fg), token(bg)), `${fg} on ${bg}`).toBeGreaterThanOrEqual(4.5);
    }
    expect(contrast(token('ok'), token('ok-soft'))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(token('retry'), token('retry-soft'))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(token('on-primary'), token('primary'))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(token('on-primary'), token('primary-hover'))).toBeGreaterThanOrEqual(4.5);
  });
  it('borders, focus ring and topic accents ≥ 3:1', () => {
    for (const fg of ['border', 'focus', 'grid-line', 'topic-zahlen', 'topic-schriftlich', 'topic-kopfrechnen', 'topic-groessen', 'topic-geometrie', 'topic-daten', 'topic-sachaufgaben']) {
      expect(contrast(token(fg), token('surface')), fg).toBeGreaterThanOrEqual(3);
    }
  });
  it('topic accents are readable as text on their soft backgrounds', () => {
    for (const t of ['zahlen', 'schriftlich', 'kopfrechnen', 'groessen', 'geometrie', 'daten', 'sachaufgaben']) {
      expect(contrast(token(`topic-${t}`), token(`topic-${t}-bg`)), t).toBeGreaterThanOrEqual(4.5);
    }
  });
});
