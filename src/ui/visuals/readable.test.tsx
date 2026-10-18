// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { Visual } from '../../core/types';
import VisualView from './Visual';

afterEach(cleanup);

/** Data pictures whose labels have to be read off: they must not shrink to unreadable text on phones. */
const READABLE_VISUALS: Visual[] = [
  { type: 'barChart', title: 'Lieblingsobst', categories: ['Äpfel', 'Birnen', 'Kirschen'], values: [12, 8, 5], axisMax: 15, axisStep: 1 },
  { type: 'barChart', title: 'Lieblingsobst', categories: ['Äpfel', 'Birnen'], values: [12, 8], axisMax: 15, axisStep: 5, horizontal: true },
  { type: 'ruler', maxCm: 12, startMm: 0, lengthMm: 74 },
  { type: 'pictogram', title: 'Bücher', categories: ['Mo', 'Di'], values: [6, 4], iconValue: 2, icon: 'buch' },
  { type: 'scale', maxGrams: 1000, stepGrams: 50, grams: 450 },
  { type: 'tally', title: 'Lieblingstiere', rows: [{ label: 'Hund', count: 7 }, { label: 'Katze', count: 4 }] },
  { type: 'bag', balls: [{ color: 'rot', count: 3 }, { color: 'blau', count: 2 }] },
];

/** Smallest SVG font size in a visual's CSS file (px). */
function minFontPx(css: string): number {
  return Math.min(...[...css.matchAll(/font-size:\s*(\d+(?:\.\d+)?)px/g)].map((m) => Number(m[1])));
}

const CSS_FILE: Record<string, string> = {
  barChart: './BarChartVisual.css',
  ruler: './RulerVisual.css',
  pictogram: './PictogramVisual.css',
  scale: './ScaleVisual.css',
  tally: './TallyVisual.css',
  bag: './BagVisual.css',
};

describe('readable data pictures on small phones', () => {
  it.each(READABLE_VISUALS.map((v) => [v.type + (v.type === 'barChart' && v.horizontal ? ' (Balken)' : ''), v] as const))(
    '%s keeps at least ~12 px labels and never shrinks below its minimum width',
    (_name, visual) => {
      const { container } = render(<VisualView visual={visual} />);
      const svg = container.querySelector('svg.visual')!;
      expect(svg.classList.contains('visual--readable')).toBe(true);
      const width = Number(svg.getAttribute('width'));
      const style = (svg as SVGElement).style;
      expect(style.getPropertyValue('--vw')).toBe(`${Math.round(width)}px`);
      const minScale = Number(style.getPropertyValue('--min-scale'));
      const smallest = minFontPx(readFileSync(new URL(CSS_FILE[visual.type], import.meta.url), 'utf8'));
      expect(smallest * minScale, `${visual.type}: ${smallest} px × ${minScale}`).toBeGreaterThanOrEqual(11.5);
    },
  );

  it('print pictures are left alone (worksheets size them for paper)', () => {
    const { container } = render(<VisualView visual={READABLE_VISUALS[0]} print />);
    expect(container.querySelector('svg')!.classList.contains('visual--print')).toBe(true);
  });

  it('base.css lets the picture scroll sideways instead of shrinking it below --min-scale', () => {
    const file = '../../styles/base.css'; // (a variable: Vite would turn a literal new URL(…) into an asset URL)
    const css = readFileSync(new URL(file, import.meta.url), 'utf8');
    expect(css).toMatch(/\.visual-wrap:has\(> \.visual--readable:not\(\.visual--print\)\)\s*\{[^}]*overflow-x:\s*auto/);
    expect(css).toMatch(/\.visual-wrap > \.visual--readable:not\(\.visual--print\)\s*\{[^}]*min-width:\s*calc\(var\(--vw, 0px\) \* var\(--min-scale, 0\.7\)\)/);
  });
});
