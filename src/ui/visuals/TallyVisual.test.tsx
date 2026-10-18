// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import TallyVisual, { strokes, tallyText } from './TallyVisual';

afterEach(cleanup);

describe('TallyVisual', () => {
  it('draws bundles of five: four upright strokes and one diagonal', () => {
    render(<TallyVisual visual={{ type: 'tally', title: 'Verkehrszählung', rows: [{ label: 'Autos', count: 13 }, { label: 'Taxis', count: 4 }, { label: 'Mopeds', count: 0 }] }} />);
    const [autos, taxis, mopeds] = screen.getAllByTestId('tl-row');
    expect(within(autos).getAllByTestId('tl-diag')).toHaveLength(2);
    expect(within(autos).getAllByTestId('tl-stroke')).toHaveLength(2 * 4 + 3);
    expect(within(taxis).queryAllByTestId('tl-diag')).toHaveLength(0);
    expect(within(taxis).getAllByTestId('tl-stroke')).toHaveLength(4);
    expect(within(mopeds).queryAllByTestId('tl-stroke')).toHaveLength(0);
  });

  it('the diagonal crosses all four strokes of its bundle', () => {
    const s = strokes(5, 100, 10);
    const upright = s.filter((x) => !x.diagonal);
    const diag = s.find((x) => x.diagonal)!;
    expect(upright).toHaveLength(4);
    expect(diag.x1).toBeLessThan(Math.min(...upright.map((x) => x.x1)));
    expect(diag.x2).toBeGreaterThan(Math.max(...upright.map((x) => x.x1)));
  });

  it('long rows wrap onto a second line after 10 bundles', () => {
    const s = strokes(57, 0, 0);
    expect(s.filter((x) => x.diagonal)).toHaveLength(11);
    expect(new Set(s.map((x) => x.y1 > 30)).size).toBe(2);
  });

  it('German aria-label names bundles and single strokes', () => {
    render(<TallyVisual visual={{ type: 'tally', title: 'Verkehrszählung', rows: [{ label: 'Autos', count: 13 }, { label: 'Taxis', count: 1 }] }} />);
    const label = screen.getByRole('img').getAttribute('aria-label')!;
    expect(label).toBe('Strichliste „Verkehrszählung“. Autos: 2 Fünferbündel und 3 Striche. Taxis: 1 Strich.');
    expect(tallyText(10)).toBe('2 Fünferbündel');
  });

  it('long labels keep a gap to the separator line (Atkinson Hyperlegible Next ≈ 10.7 px per character at 18 px)', () => {
    for (const label of ['Wohnwagen', 'Schwimmen', 'Donnerstag']) {
      const { container, unmount } = render(<TallyVisual visual={{ type: 'tally', rows: [{ label, count: 7 }, { label: 'Ei', count: 2 }] }} />);
      const textX = Number(container.querySelector('.tl-cat')!.getAttribute('x'));
      const sep = [...container.querySelectorAll('.tl-sep')].find((l) => l.getAttribute('x1') === l.getAttribute('x2'))!;
      const sepX = Number(sep.getAttribute('x1'));
      expect(sepX - (textX + label.length * 10.7), label).toBeGreaterThanOrEqual(8);
      unmount();
    }
  });

  it('print mode adds the print modifier', () => {
    render(<TallyVisual visual={{ type: 'tally', rows: [{ label: 'A', count: 3 }] }} print />);
    expect(screen.getByRole('img').getAttribute('class')).toContain('visual--print');
  });
});
