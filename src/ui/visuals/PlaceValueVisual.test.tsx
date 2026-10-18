// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import PlaceValueVisual, { placeValueAriaLabel } from './PlaceValueVisual';
import type { VisualOf } from '../../core/types';

const digits: VisualOf<'placeValue'> = {
  type: 'placeValue',
  columns: ['HT', 'ZT', 'T', 'H', 'Z', 'E'],
  rows: [{ values: [3, 0, 4, null, 2, 0] }],
  mode: 'digits',
};
const tokens: VisualOf<'placeValue'> = { ...digits, rows: [{ values: [3, null, 4, 9, 2, 1] }], mode: 'tokens' };

describe('PlaceValueVisual', () => {
  it('renders an SVG image with a German aria-label naming every column', () => {
    render(<PlaceValueVisual visual={digits} />);
    const img = screen.getByRole('img');
    expect(img.tagName.toLowerCase()).toBe('svg');
    const label = img.getAttribute('aria-label') ?? '';
    expect(label).toContain('Stellenwerttafel');
    expect(label).toContain('Hunderttausender: 3');
    expect(label).toContain('Hunderter: leer');
    expect(label).toContain('Stellenwerttafel von Hunderttausender bis Einer.');
    expect(label).not.toMatch(/\b(HT|ZT)\b/);
    expect(img.getAttribute('viewBox')).toMatch(/^0 0 \d+ \d+$/);
  });

  it('draws the digits (empty cells stay empty)', () => {
    const { container } = render(<PlaceValueVisual visual={digits} />);
    const shown = [...container.querySelectorAll('[data-cell]')].map((t) => t.textContent);
    expect(shown).toEqual(['3', '0', '4', '2', '0']);
  });

  it('draws one Plättchen per unit in tokens mode', () => {
    const { container } = render(<PlaceValueVisual visual={tokens} print />);
    expect(container.querySelectorAll('[data-token]')).toHaveLength(3 + 4 + 9 + 2 + 1);
    expect(container.querySelectorAll('[data-token="H"]')).toHaveLength(9);
    expect(placeValueAriaLabel(tokens)).toContain('Hunderter: 9 Plättchen');
  });

  it('labels several rows', () => {
    const v: VisualOf<'placeValue'> = { type: 'placeValue', columns: ['T', 'H', 'Z', 'E'], rows: [{ label: '345', values: [null, 3, 4, 5] }, { label: '3450', values: [3, 4, 5, 0] }], mode: 'digits' };
    render(<PlaceValueVisual visual={v} />);
    expect(screen.getByRole('img').getAttribute('aria-label')).toContain('3450: Tausender: 3');
    expect(screen.getByText('345')).toBeTruthy();
  });

  it('marks a highlighted column with an outline, a marker and in the aria-label', () => {
    const v: VisualOf<'placeValue'> = { type: 'placeValue', columns: ['T', 'H', 'Z', 'E'], rows: [{ values: [3, 4, 5, 6] }], mode: 'digits', highlight: 'Z' };
    const { container } = render(<PlaceValueVisual visual={v} />);
    expect(container.querySelector('[data-highlight="Z"]')).not.toBeNull();
    expect(screen.getByText('▼')).toBeTruthy();
    expect(screen.getByRole('img').getAttribute('aria-label')).toContain('Markiert ist die Spalte Zehner.');
  });

  it('keeps every Plättchen inside its own column with clearance to the column lines', () => {
    const full: VisualOf<'placeValue'> = { ...tokens, rows: [{ values: [9, 3, 8, 3, 9, 5] }] };
    const { container } = render(<PlaceValueVisual visual={full} />);
    const cells = [...container.querySelectorAll('g[data-row="0"] > g > rect')];
    expect(cells).toHaveLength(full.columns.length);
    full.columns.forEach((c, i) => {
      const x = Number(cells[i].getAttribute('x'));
      const w = Number(cells[i].getAttribute('width'));
      const tokensInCol = [...container.querySelectorAll(`[data-token="${c}"]`)];
      expect(tokensInCol.length).toBeGreaterThan(0);
      for (const t of tokensInCol) {
        const cx = Number(t.getAttribute('cx'));
        const outer = Number(t.getAttribute('r')) + 0.75; // radius + half the stroke
        expect(cx - outer - x).toBeGreaterThanOrEqual(8);
        expect(x + w - (cx + outer)).toBeGreaterThanOrEqual(8);
      }
    });
  });
});

