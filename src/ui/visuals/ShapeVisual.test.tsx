// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import type { ShapeKind } from '../../core/types';
import ShapeVisual from './ShapeVisual';

afterEach(cleanup);

const AXES: Record<ShapeKind, number> = {
  quadrat: 4, rechteck: 2, dreieck: 0, 'gleichseitiges-dreieck': 3, kreis: 4, sechseck: 6, achteck: 8, parallelogramm: 0, trapez: 1, raute: 2,
};

describe('ShapeVisual', () => {
  it.each(Object.keys(AXES) as ShapeKind[])('%s: aria-label without the name; symmetry axes on demand', (shape) => {
    render(<ShapeVisual visual={{ type: 'shape', shape }} />);
    const label = screen.getByRole('img').getAttribute('aria-label')!;
    expect(label).toMatch(/^Flache Figur: /);
    expect(label.toLowerCase()).not.toContain(shape.split('-').pop()!);
    expect(screen.queryAllByTestId('shape-axis')).toHaveLength(0);
    cleanup();
    render(<ShapeVisual visual={{ type: 'shape', shape, showAxes: true }} />);
    expect(screen.queryAllByTestId('shape-axis')).toHaveLength(AXES[shape]);
    expect(screen.getByRole('img').getAttribute('aria-label')).toMatch(/Symmetrieachse/);
  });

  const sides = (shape: ShapeKind): number[] => {
    const { container } = render(<ShapeVisual visual={{ type: 'shape', shape }} />);
    const pts = container.querySelector('polygon')!.getAttribute('points')!.split(' ').map((p) => p.split(',').map(Number));
    cleanup();
    return pts.map((p, i) => Math.hypot(pts[(i + 1) % pts.length][0] - p[0], pts[(i + 1) % pts.length][1] - p[1]));
  };

  it('the Parallelogramm is clearly not a Raute (and the Raute is one)', () => {
    const p = sides('parallelogramm');
    expect(Math.max(...p) / Math.min(...p)).toBeGreaterThanOrEqual(1.5);
    expect(Math.abs(p[0] - p[2])).toBeLessThan(0.5); // opposite sides equal
    expect(Math.abs(p[1] - p[3])).toBeLessThan(0.5);
    const r = sides('raute');
    expect(Math.max(...r) / Math.min(...r)).toBeLessThan(1.05);
  });
});
