// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import TreeVisual, { layoutTree } from './TreeVisual';

afterEach(cleanup);

describe('TreeVisual', () => {
  it('draws the full tree: 3 · 2 · 2 = 12 ends', () => {
    const levels = [['Vanille', 'Schoko', 'Erdbeere'], ['Waffel', 'Becher'], ['Sahne', 'ohne']];
    const { container } = render(<TreeVisual visual={{ type: 'tree', levels }} />);
    expect(screen.getAllByTestId('tr-leaf')).toHaveLength(12);
    expect(screen.getAllByTestId('tr-node')).toHaveLength(3 + 6);
    expect(container.querySelectorAll('.tr-edge')).toHaveLength(3 + 6 + 12);
  });

  it('every branch of level 1 repeats all options of level 2', () => {
    render(<TreeVisual visual={{ type: 'tree', levels: [['rot', 'blau'], ['Jeans', 'Shorts', 'Rock']] }} />);
    expect(screen.getAllByTestId('tr-leaf').map((l) => l.textContent)).toEqual(['Jeans', 'Shorts', 'Rock', 'Jeans', 'Shorts', 'Rock']);
  });

  it('German aria-label names the levels but not the number of ends', () => {
    render(<TreeVisual visual={{ type: 'tree', levels: [['rot', 'blau'], ['Jeans', 'Shorts', 'Rock']] }} />);
    const label = screen.getByRole('img').getAttribute('aria-label')!;
    expect(label).toBe('Baumdiagramm. Zuerst: rot oder blau. Danach jeweils: Jeans, Shorts oder Rock.');
    expect(label).not.toMatch(/\d/);
  });

  it('leaves are evenly spaced and parents sit in the middle of their children', () => {
    const { nodes } = layoutTree([['a', 'b'], ['x', 'y']]);
    const leaves = nodes.filter((n) => n.depth === 1).map((n) => n.y);
    expect(leaves[1] - leaves[0]).toBe(leaves[2] - leaves[1]);
    const parentA = nodes.find((n) => n.depth === 0 && n.index === 0)!;
    expect(parentA.y).toBe((leaves[0] + leaves[1]) / 2);
  });

  it('print mode adds the print modifier', () => {
    render(<TreeVisual visual={{ type: 'tree', levels: [['a', 'b']] }} print />);
    expect(screen.getByRole('img').getAttribute('class')).toContain('visual--print');
  });
});
