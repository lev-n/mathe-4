// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import ScaleVisual, { labelStep, scaleLabel } from './ScaleVisual';

afterEach(cleanup);

describe('ScaleVisual', () => {
  it('renders an accessible dial with round labels', () => {
    render(<ScaleVisual visual={{ type: 'scale', maxGrams: 1000, stepGrams: 50, grams: 350 }} />);
    const svg = screen.getByRole('img');
    expect(svg.getAttribute('aria-label')).toBe('Küchenwaage bis 1000 g. Ein Strich bedeutet 50 g. Der Zeiger steht 1 Strich nach der Zahl 300.');
    const labels = [...svg.querySelectorAll('.sc-num')].map((t) => t.textContent);
    expect(labels).toEqual(['0', '100', '200', '300', '400', '500', '600', '700', '800', '900', '1000']);
    expect(svg.querySelectorAll('.sc-tick')).toHaveLength(21);
    expect(screen.getByTestId('scale-pointer')).toBeTruthy();
  });

  it('chooses at most 10 label intervals', () => {
    expect(labelStep(1000, 50)).toBe(100);
    expect(labelStep(2000, 50)).toBe(200);
    expect(labelStep(5000, 100)).toBe(500);
    expect(labelStep(1000, 100)).toBe(100);
  });

  it('describes the pointer on a label and supports print mode', () => {
    expect(scaleLabel({ type: 'scale', maxGrams: 5000, stepGrams: 100, grams: 1500 })).toContain('zeigt genau auf die Zahl 1500');
    render(<ScaleVisual visual={{ type: 'scale', maxGrams: 2000, stepGrams: 100, grams: 0 }} print />);
    expect(screen.getByRole('img').getAttribute('class')).toContain('visual--print');
    expect(screen.getByRole('img').getAttribute('aria-label')).toContain('Der Zeiger steht auf 0.');
  });
});
