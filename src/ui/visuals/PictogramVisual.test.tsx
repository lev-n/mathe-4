// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import type { PictoIcon, VisualOf } from '../../core/types';
import PictogramVisual from './PictogramVisual';

afterEach(cleanup);

const base: VisualOf<'pictogram'> = {
  type: 'pictogram',
  title: 'Lieblingstiere',
  categories: ['Katzen', 'Hasen', 'Pandas'],
  values: [30, 25, 10],
  iconValue: 10,
  icon: 'herz',
};

describe('PictogramVisual', () => {
  it('draws whole and half pictures and a legend', () => {
    render(<PictogramVisual visual={base} />);
    expect(screen.getAllByTestId('pg-full')).toHaveLength(3 + 2 + 1);
    const halves = screen.getAllByTestId('pg-half');
    expect(halves).toHaveLength(1);
    // The half picture is clipped by an existing clipPath.
    const ref = halves[0].getAttribute('clip-path')!.match(/url\(#(.+)\)/)![1];
    expect(document.getElementById(ref)?.tagName.toLowerCase()).toBe('clippath');
    expect(screen.getByTestId('pg-legend').textContent).toContain('= 10');
  });

  it('hides the legend (and its value in the aria-label) when showKey is false', () => {
    render(<PictogramVisual visual={{ ...base, showKey: false }} />);
    expect(screen.queryByTestId('pg-legend')).toBeNull();
    expect(screen.getAllByTestId('pg-full')).toHaveLength(3 + 2 + 1);
    const label = screen.getByRole('img').getAttribute('aria-label')!;
    expect(label).toContain('ohne Legende');
    expect(label).not.toContain('bedeutet');
  });

  it('aria-label describes pictures and legend in German, without giving the values', () => {
    render(<PictogramVisual visual={base} />);
    const label = screen.getByRole('img').getAttribute('aria-label')!;
    expect(label).toContain('Bilddiagramm „Lieblingstiere“');
    expect(label).toContain('Ein Bild (Herz) bedeutet 10');
    expect(label).toContain('Hasen: 2 Bilder und ein halbes Bild');
    expect(label).toContain('Pandas: 1 Bild');
    expect(label).not.toContain('25');
    expect(label).not.toContain('30');
  });

  it.each<PictoIcon>(['person', 'stern', 'ball', 'buch', 'apfel', 'herz'])('renders the icon %s', (icon) => {
    const { container } = render(<PictogramVisual visual={{ ...base, icon, iconValue: 2, values: [4, 2, 6] }} />);
    expect(container.querySelectorAll(`.pg-icon--${icon}`).length).toBe(2 + 1 + 3 + 1);
  });

  it('print mode adds the print modifier', () => {
    render(<PictogramVisual visual={base} print />);
    expect(screen.getByRole('img').getAttribute('class')).toContain('visual--print');
  });
});
