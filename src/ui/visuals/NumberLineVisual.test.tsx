// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import NumberLineVisual, { describeMarkPosition, layoutLabels, NL, NL_MIN_WIDTH, numberLineAriaLabel, tickValues } from './NumberLineVisual';
import type { VisualOf } from '../../core/types';

const zoom: VisualOf<'numberLine'> = {
  type: 'numberLine',
  min: 340_000,
  max: 350_000,
  majorStep: 1_000,
  minorStep: 500,
  labelMajor: false,
  labels: [340_000, 350_000],
  marks: [{ value: 343_500, label: 'A' }],
};

describe('NumberLineVisual', () => {
  it('renders ticks, labels and the mark', () => {
    const { container } = render(<NumberLineVisual visual={zoom} />);
    expect(container.querySelectorAll('[data-tick]')).toHaveLength(21);
    expect(container.querySelectorAll('[data-tick="major"]')).toHaveLength(11);
    expect([...container.querySelectorAll('[data-label]')].map((t) => t.textContent)).toEqual(['340\u202F000', '350\u202F000']);
    expect(container.querySelector('[data-mark="A"]')).not.toBeNull();
  });

  it('describes the mark position without giving away its value', () => {
    render(<NumberLineVisual visual={zoom} />);
    const label = screen.getByRole('img').getAttribute('aria-label') ?? '';
    expect(label).toContain('Zahlenstrahl von 340000 bis 350000.');
    expect(label).toContain('Pfeil A: 3 lange Abschnitte und 1 kleinen Abschnitt rechts von 340000.');
    expect(label).not.toContain('343500');
  });

  it('never lets labels overlap (staggers or thins them)', () => {
    const configs: VisualOf<'numberLine'>[] = [
      { type: 'numberLine', min: 0, max: 10_000, majorStep: 1_000, minorStep: 500, labelMajor: true },
      { type: 'numberLine', min: 0, max: 1_000_000, majorStep: 100_000, minorStep: 100_000, labelMajor: true },
      { type: 'numberLine', min: 90_000, max: 100_000, majorStep: 500, minorStep: 100, labelMajor: true },
    ];
    for (const c of configs) {
      const ls = layoutLabels(c);
      expect(ls.length).toBeGreaterThan(1);
      for (const row of [0, 1]) {
        const xs = ls.filter((l) => l.row === row);
        for (let i = 1; i < xs.length; i++) expect(xs[i].x - xs[i - 1].x).toBeGreaterThan(40);
      }
    }
  });

  it('helpers', () => {
    expect(tickValues(0, 1000, 250)).toEqual([0, 250, 500, 750, 1000]);
    expect(describeMarkPosition({ min: 0, max: 1_000_000, majorStep: 100_000, minorStep: 100_000, labelMajor: false, labels: [0, 1_000_000] }, 650_000)).toBe('im 7. Abschnitt von links, in der Mitte');
    expect(numberLineAriaLabel({ ...zoom, marks: [] })).toContain('Lange Striche teilen ihn in 10 Abschnitte. Jeder Abschnitt hat 2 kleine Abschnitte.');
  });

  it('renders in print mode', () => {
    const { container } = render(<NumberLineVisual visual={zoom} print />);
    expect(screen.getByRole('img')).toBeTruthy();
    expect(container.querySelector('.nl-scroll')).toBeNull();
  });

  it('on screen scrolls sideways below a readable minimum width instead of shrinking the labels', () => {
    const { container } = render(<NumberLineVisual visual={zoom} />);
    const box = container.querySelector('.nl-scroll') as HTMLElement;
    expect(box).not.toBeNull();
    expect(box.style.getPropertyValue('--nl-min-width')).toBe(`${NL_MIN_WIDTH}px`);
    // labels are 18 viewBox units: at the minimum width they are still ≥ 15 px
    expect((18 * NL_MIN_WIDTH) / NL.W).toBeGreaterThanOrEqual(15);
    expect(box.querySelector('svg[role="img"]')).not.toBeNull();
  });
});
