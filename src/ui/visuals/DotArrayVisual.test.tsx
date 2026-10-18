// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import DotArrayVisual, { dotArrayAriaLabel } from './DotArrayVisual';

describe('DotArrayVisual', () => {
  it('draws rows × cols dots with a German aria-label', () => {
    const { container } = render(<DotArrayVisual visual={{ type: 'dotArray', rows: 6, cols: 7, splitAfterRow: 5, splitAfterCol: 5 }} />);
    expect(container.querySelectorAll('circle')).toHaveLength(42);
    const label = screen.getByRole('img').getAttribute('aria-label');
    expect(label).toBe('Punktefeld: 6 Reihen mit je 7 Punkten. Nach 5 Reihen ist eine Lücke. In jeder Reihe ist nach 5 Punkten eine Lücke.');
  });

  it('leaves a gap after the split row', () => {
    const { container } = render(<DotArrayVisual visual={{ type: 'dotArray', rows: 7, cols: 2, splitAfterRow: 5 }} print />);
    const y = (id: string) => Number(container.querySelector(`[data-dot="${id}"]`)?.getAttribute('cy'));
    expect(y('5-0') - y('4-0')).toBeGreaterThan(y('4-0') - y('3-0'));
  });

  it('uses singular forms', () => {
    expect(dotArrayAriaLabel({ type: 'dotArray', rows: 1, cols: 1 })).toBe('Punktefeld: 1 Reihe mit je 1 Punkt.');
  });
});
