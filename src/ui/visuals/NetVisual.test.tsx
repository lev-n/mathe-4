// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import NetVisual from './NetVisual';

afterEach(cleanup);

const cross: [number, number][] = [[1, 0], [0, 1], [1, 1], [2, 1], [3, 1], [1, 2]];

describe('NetVisual', () => {
  it('describes the net row by row with labels and the highlight', () => {
    render(<NetVisual visual={{ type: 'net', cells: cross, faces: ['A', 'B', 'C', 'D', 'E', '?'], highlight: [5] }} />);
    const label = screen.getByRole('img').getAttribute('aria-label')!;
    expect(label).toBe('Netz aus 6 Quadraten. Zeile 1: Spalte 2 (A). Zeile 2: Spalte 1 (B), Spalte 2 (C), Spalte 3 (D), Spalte 4 (E). Zeile 3: Spalte 2 (Fragezeichen). Markiert: ?.');
    expect(screen.getAllByTestId('net-highlight')).toHaveLength(1);
    expect(screen.getByText('A')).toBeTruthy();
  });

  it('colour faces are filled with token colours and named in text', () => {
    const { container } = render(<NetVisual visual={{ type: 'net', cells: cross, faces: ['rot', 'blau', 'gelb', 'gruen', 'lila', 'orange'] }} />);
    expect(screen.getByText('Grün')).toBeTruthy();
    expect(container.innerHTML).toContain('var(--c-rot)');
    expect(screen.getByRole('img').getAttribute('aria-label')).toContain('(Rot)');
  });

  it('print mode: no colour fills, labels stay', () => {
    const { container } = render(<NetVisual visual={{ type: 'net', cells: cross, faces: ['rot', null, null, null, null, null] }} print />);
    expect(container.innerHTML).not.toContain('var(--c-rot)');
    expect(screen.getByText('Rot')).toBeTruthy();
  });
});
