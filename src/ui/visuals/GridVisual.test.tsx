// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import GridVisual, { describeGridCells, halfCellPoints } from './GridVisual';

afterEach(cleanup);

describe('GridVisual', () => {
  it('renders filled cells, half cells, outline and a dashed axis with a German aria-label', () => {
    const { container } = render(
      <GridVisual
        visual={{
          type: 'grid', width: 6, height: 4, cells: [[1, 1], [2, 1], [1, 2]],
          halfCells: [{ cell: [2, 2], corner: 'tl' }], axis: { orientation: 'vertical', at: 3 }, showOutline: true, caption: 'Figur A',
        }}
      />,
    );
    const img = screen.getByRole('img');
    const label = img.getAttribute('aria-label')!;
    expect(label).toContain('Figur A.');
    expect(label).toContain('6 Kästchen breit und 4 Kästchen hoch');
    expect(label).toContain('Zeile 2: Spalte 2 und 3. Zeile 3: Spalte 2');
    expect(label).toContain('Halbe Kästchen');
    expect(label).toContain('senkrechte Symmetrieachse zwischen Spalte 3 und 4');
    expect(container.querySelectorAll('[data-cell]')).toHaveLength(3);
    expect(container.querySelectorAll('[data-half]')).toHaveLength(1);
    const axis = screen.getByTestId('grid-axis');
    expect(axis.getAttribute('x1')).toBe(String(14 + 3 * 32));
    expect((axis as unknown as SVGElement).style.strokeDasharray).toBeTruthy();
    expect(img.getAttribute('class')).toContain('visual');
    expect(img.getAttribute('viewBox')).toMatch(/^0 0 \d+ \d+$/);
  });

  it('uses only token colours and a hatch pattern in print mode', () => {
    const { container } = render(<GridVisual visual={{ type: 'grid', width: 3, height: 3, cells: [[0, 0]] }} print />);
    expect(container.querySelector('pattern')).toBeTruthy();
    const html = container.innerHTML;
    expect(html).not.toMatch(/#[0-9a-f]{6}\b|rgb\(/i); // colours come from tokens (var(--…))
    expect(html).toContain('var(--ink)');
  });

  it('half cells: corner names the right angle', () => {
    expect(halfCellPoints([0, 0], 'bl')).toEqual([[0, 1], [0, 0], [1, 1]]);
    expect(halfCellPoints([2, 3], 'tr')).toEqual([[3, 3], [3, 4], [2, 3]]);
  });

  it('describes rows with runs', () => {
    expect(describeGridCells([[0, 0], [1, 0], [2, 0], [5, 0], [3, 1]])).toBe('Zeile 1: Spalte 1 bis 3, Spalte 6. Zeile 2: Spalte 4');
  });
});
