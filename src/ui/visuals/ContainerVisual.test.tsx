// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import ContainerVisual, { containerLabel, labelEvery } from './ContainerVisual';

afterEach(cleanup);

describe('ContainerVisual', () => {
  it('renders an accessible Messbecher with at most 10 scale labels', () => {
    render(<ContainerVisual visual={{ type: 'container', capacityMl: 1000, fillMl: 600, stepMl: 50 }} />);
    const svg = screen.getByRole('img');
    expect(svg.getAttribute('aria-label')).toBe('Messbecher bis 1000 ml. Ein Strich bedeutet 50 ml. Die Flüssigkeit reicht genau bis zur Zahl 600.');
    const labels = [...svg.querySelectorAll('.ct-num')].map((t) => t.textContent);
    expect(labels.length).toBeLessThanOrEqual(10);
    expect(labels).toContain('600');
    expect(svg.querySelectorAll('.ct-tick')).toHaveLength(21);
  });

  it('the liquid height is proportional to the amount', () => {
    render(<ContainerVisual visual={{ type: 'container', capacityMl: 500, fillMl: 250, stepMl: 50 }} />);
    const liquid = screen.getByTestId('container-liquid');
    expect(Number(liquid.getAttribute('height'))).toBeCloseTo((290 - 34) / 2, 5);
  });

  it('empty cup, print mode and label spacing', () => {
    render(<ContainerVisual visual={{ type: 'container', capacityMl: 2000, fillMl: 0, stepMl: 100 }} print />);
    expect(screen.queryByTestId('container-liquid')).toBeNull();
    expect(screen.getByRole('img').getAttribute('class')).toContain('visual--print');
    expect(containerLabel({ type: 'container', capacityMl: 2000, fillMl: 0, stepMl: 100 })).toContain('leer');
    expect(labelEvery(2000, 100)).toBe(2);
    expect(containerLabel({ type: 'container', capacityMl: 1000, fillMl: 650, stepMl: 50 })).toContain('reicht 1 Strich über die Zahl 600.');
    expect(containerLabel({ type: 'container', capacityMl: 2000, fillMl: 100, stepMl: 100 })).toContain('reicht 1 Strich über den Boden.');
    expect(labelEvery(1000, 250)).toBe(1);
  });
});
