// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import DiceVisual from './DiceVisual';

afterEach(cleanup);

describe('DiceVisual', () => {
  it('each face shows as many pips as its value', () => {
    render(<DiceVisual visual={{ type: 'dice', values: [1, 2, 3, 4, 5, 6] }} />);
    const faces = screen.getAllByTestId('dice-face');
    expect(faces.map((f) => within(f).queryAllByTestId('dice-pip').length)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(screen.getByRole('img').getAttribute('aria-label')).toBe('Die sechs Seiten eines Würfels mit 1, 2, 3, 4, 5 und 6 Augen.');
  });

  it('German aria-label for one or two dice', () => {
    render(<DiceVisual visual={{ type: 'dice', values: [4] }} />);
    expect(screen.getByRole('img').getAttribute('aria-label')).toBe('Ein Würfel zeigt 4 Augen.');
    cleanup();
    render(<DiceVisual visual={{ type: 'dice', values: [3, 5] }} />);
    expect(screen.getByRole('img').getAttribute('aria-label')).toBe('2 Würfel zeigen 3 und 5 Augen.');
  });

  it('values outside 1–6 are written as numbers', () => {
    render(<DiceVisual visual={{ type: 'dice', values: [7] }} />);
    expect(screen.queryAllByTestId('dice-pip')).toHaveLength(0);
    expect(screen.getByTestId('dice-face').textContent).toBe('7');
  });
});
