import { describe, expect, it } from 'vitest';
import topic from './index';

describe('topic schriftlich', () => {
  it('exports 6–9 skills with stable, unique ids in teaching order', () => {
    expect(topic.topicId).toBe('schriftlich');
    expect(topic.skills.length).toBeGreaterThanOrEqual(6);
    expect(topic.skills.length).toBeLessThanOrEqual(9);
    const ids = topic.skills.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    ids.forEach((id) => expect(id).toMatch(/^schriftlich\.[a-z0-9-]+$/));
    expect(ids).toEqual([
      'schriftlich.addition',
      'schriftlich.subtraktion',
      'schriftlich.ueberschlag-probe',
      'schriftlich.multiplikation',
      'schriftlich.mal-dreistellig',
      'schriftlich.division',
      'schriftlich.rechenweg',
      'schriftlich.ziffernraetsel',
      'schriftlich.fehlerdetektiv',
    ]);
  });

  it('only × 3-digit is an optional NRW extra', () => {
    expect(topic.skills.filter((s) => s.optional === 'nrw').map((s) => s.id)).toEqual(['schriftlich.mal-dreistellig']);
  });

  it('Stufe descriptions are short (≤ 12 words)', () => {
    for (const s of topic.skills) for (const st of [1, 2, 3] as const) expect(s.stufen[st].split(/\s+/).length).toBeLessThanOrEqual(12);
  });
});
