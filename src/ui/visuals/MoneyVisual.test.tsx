// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import MoneyVisual, { moneyLabel } from './MoneyVisual';

afterEach(cleanup);

describe('MoneyVisual', () => {
  it('draws notes and coins with visible value labels', () => {
    render(<MoneyVisual visual={{ type: 'money', items: [2000, 500, 200, 50, 50, 2] }} />);
    expect(screen.getAllByTestId('money-note')).toHaveLength(2);
    expect(screen.getAllByTestId('money-coin')).toHaveLength(4);
    const texts = [...screen.getByRole('img').querySelectorAll('text')].map((t) => t.textContent);
    expect(texts).toEqual(['20 €', '5 €', '2 €', '50 ct', '50 ct', '2 ct']);
  });

  it('has a German aria-label that counts each kind of piece', () => {
    render(<MoneyVisual visual={{ type: 'money', items: [100, 2000, 100, 50] }} />);
    expect(screen.getByRole('img').getAttribute('aria-label')).toBe('Geld: 1 Schein zu 20 Euro, 2 Münzen zu 1 Euro, 1 Münze zu 50 Cent.');
  });

  it('wraps many pieces into several rows and supports print mode', () => {
    const items = [10000, 5000, 2000, 1000, 500, 200, 100, 50, 20, 10, 5, 2, 1];
    render(<MoneyVisual visual={{ type: 'money', items }} print />);
    const svg = screen.getByRole('img');
    expect(Number(svg.getAttribute('width'))).toBeLessThanOrEqual(520);
    expect(Number(svg.getAttribute('height'))).toBeGreaterThan(100);
    expect(svg.getAttribute('class')).toContain('visual--print');
  });

  it('labels an empty purse', () => {
    expect(moneyLabel({ type: 'money', items: [] })).toBe('Kein Geld.');
  });
});
