// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import BagVisual from './BagVisual';

afterEach(cleanup);

describe('BagVisual', () => {
  it('draws every Kugel, grouped by colour, each group labelled with its colour word', () => {
    render(<BagVisual visual={{ type: 'bag', balls: [{ color: 'rot', count: 7 }, { color: 'gruen', count: 3 }, { color: 'lila', count: 1 }] }} />);
    expect(screen.getAllByTestId('bg-ball')).toHaveLength(11);
    const groups = screen.getAllByTestId('bg-group');
    expect(groups).toHaveLength(3);
    expect(within(groups[0]).getAllByTestId('bg-ball')).toHaveLength(7);
    expect(groups.map((g) => g.querySelector('text')!.textContent)).toEqual(['rot', 'grün', 'lila']);
  });

  it('German aria-label with counts and colour words', () => {
    render(<BagVisual visual={{ type: 'bag', balls: [{ color: 'rot', count: 5 }, { color: 'blau', count: 1 }] }} />);
    expect(screen.getByRole('img').getAttribute('aria-label')).toBe('Säckchen mit 6 Kugeln: 5 rote Kugeln und 1 blaue Kugel.');
  });

  it('20 Kugeln of one colour fit in rows of five', () => {
    render(<BagVisual visual={{ type: 'bag', balls: [{ color: 'gelb', count: 20 }] }} />);
    const ys = new Set(screen.getAllByTestId('bg-ball').map((b) => b.querySelector('circle')!.getAttribute('cy')));
    expect(ys.size).toBe(4);
  });

  it('print mode adds the print modifier', () => {
    render(<BagVisual visual={{ type: 'bag', balls: [{ color: 'rot', count: 2 }] }} print />);
    expect(screen.getByRole('img').getAttribute('class')).toContain('visual--print');
  });
});
