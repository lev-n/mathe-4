// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import RulerVisual, { rulerLabel } from './RulerVisual';

afterEach(cleanup);

describe('RulerVisual', () => {
  it('renders cm labels 0…maxCm and an mm tick for every millimetre', () => {
    render(<RulerVisual visual={{ type: 'ruler', maxCm: 10, startMm: 0, lengthMm: 74 }} />);
    const svg = screen.getByRole('img');
    const nums = [...svg.querySelectorAll('.rl-num')].map((t) => t.textContent);
    expect(nums).toEqual(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10']);
    expect(svg.querySelectorAll('.rl-tick')).toHaveLength(101);
    expect(svg.getAttribute('aria-label')).toBe('Lineal von 0 bis 10 cm. Darüber liegt ein Streifen. Er beginnt bei 0 cm und endet bei 7 cm 4 mm.');
  });

  it('draws the bar exactly from start to end (4 px per mm)', () => {
    render(<RulerVisual visual={{ type: 'ruler', maxCm: 12, startMm: 20, lengthMm: 35 }} />);
    const bar = screen.getByTestId('ruler-bar');
    expect(Number(bar.getAttribute('width'))).toBe(35 * 4);
    expect(Number(bar.getAttribute('x'))).toBe(24 + 20 * 4);
  });

  it('supports print mode', () => {
    render(<RulerVisual visual={{ type: 'ruler', maxCm: 15, startMm: 0, lengthMm: 100 }} print />);
    expect(screen.getByRole('img').getAttribute('class')).toContain('visual--print');
    expect(rulerLabel({ type: 'ruler', maxCm: 15, startMm: 15, lengthMm: 40 })).toContain('beginnt bei 1 cm 5 mm und endet bei 5 cm 5 mm');
  });
});
