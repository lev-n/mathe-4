// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import CubeBuildingVisual, { frontSilhouette, sideSilhouette } from './CubeBuildingVisual';

afterEach(cleanup);

const h = [[3, 1, 0], [2, 1, 1]];

describe('CubeBuildingVisual', () => {
  it('iso: one drawn cube per cube, label with tower heights', () => {
    const { container } = render(<CubeBuildingVisual visual={{ type: 'cubeBuilding', heights: h, view: 'iso' }} />);
    expect(container.querySelectorAll('[data-cube]')).toHaveLength(8);
    expect(screen.getByRole('img').getAttribute('aria-label')).toBe('Würfelgebäude, schräg von vorne gezeichnet. Turmhöhen: hinten von links: 3, 1, 0; vorne von links: 2, 1, 1.');
    expect(screen.getByText('vorne')).toBeTruthy();
  });

  it('plan: numbers in the fields, empty field for 0', () => {
    render(<CubeBuildingVisual visual={{ type: 'cubeBuilding', heights: h, view: 'plan' }} />);
    expect(screen.getByText('3')).toBeTruthy();
    expect(screen.queryByText('0')).toBeNull();
    expect(screen.getByText('hinten')).toBeTruthy();
    expect(screen.getByRole('img').getAttribute('aria-label')).toMatch(/^Bauplan von oben, vorne ist unten/);
  });

  it('views: front = max per column, side (von rechts) = max per row from front to back', () => {
    expect(frontSilhouette(h)).toEqual([3, 1, 1]);
    expect(sideSilhouette(h)).toEqual([2, 3]);
    const { container } = render(<CubeBuildingVisual visual={{ type: 'cubeBuilding', heights: h, view: 'front' }} />);
    expect(container.querySelectorAll('rect')).toHaveLength(5);
    expect(screen.getByRole('img').getAttribute('aria-label')).toBe('Ansicht von vorne: Spalten mit 3, 1, 1 Würfeln übereinander, von links nach rechts.');
    cleanup();
    render(<CubeBuildingVisual visual={{ type: 'cubeBuilding', heights: h, view: 'side' }} />);
    expect(screen.getByRole('img').getAttribute('aria-label')).toContain('Ansicht von rechts: Spalten mit 2, 3 Würfeln');
    cleanup();
    render(<CubeBuildingVisual visual={{ type: 'cubeBuilding', heights: h, view: 'top' }} />);
    expect(screen.getByRole('img').getAttribute('aria-label')).toContain('hinten: belegt, belegt, leer');
  });
});
