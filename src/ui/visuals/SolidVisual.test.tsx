// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import type { SolidKind } from '../../core/types';
import SolidVisual from './SolidVisual';

afterEach(cleanup);

const ALL: SolidKind[] = ['wuerfel', 'quader', 'kugel', 'zylinder', 'kegel', 'pyramide', 'prisma'];
const NAMES = /würfel|quader|kugel|zylinder|kegel|pyramide|prisma/i;

describe('SolidVisual', () => {
  it.each(ALL)('%s: accessible drawing that does not reveal the name', (solid) => {
    const { container } = render(<SolidVisual visual={{ type: 'solid', solid }} />);
    const img = screen.getByRole('img');
    const label = img.getAttribute('aria-label')!;
    expect(label).toMatch(/^Zeichnung eines Körpers/);
    expect(label).not.toMatch(NAMES);
    expect(container.innerHTML).not.toMatch(/NaN|undefined/);
  });

  it('draws the hidden edges of polyhedra dashed and matches the visible counts used by the generators', () => {
    const counts: Partial<Record<SolidKind, [number, number]>> = { wuerfel: [9, 3], quader: [9, 3], pyramide: [5, 3], prisma: [6, 3] };
    for (const [solid, [visible, hidden]] of Object.entries(counts) as [SolidKind, [number, number]][]) {
      const { container } = render(<SolidVisual visual={{ type: 'solid', solid }} />);
      expect(container.querySelectorAll('line[data-edge="visible"]')).toHaveLength(visible);
      expect(container.querySelectorAll('line[data-edge="hidden"]')).toHaveLength(hidden);
      cleanup();
    }
  });

  it('Zylinder and Kegel have a dashed back curve (their hidden Kante)', () => {
    for (const solid of ['zylinder', 'kegel'] as SolidKind[]) {
      const { container } = render(<SolidVisual visual={{ type: 'solid', solid }} />);
      expect(container.querySelectorAll('path[data-edge="hidden"]').length).toBe(1);
      cleanup();
    }
  });

  it('the Kugel has no line that could be counted as a Kante: only its outline, no equator, no dashes', () => {
    const { container } = render(<SolidVisual visual={{ type: 'solid', solid: 'kugel' }} />);
    expect(container.querySelectorAll('[data-edge="hidden"]')).toHaveLength(0);
    expect(container.querySelectorAll('line')).toHaveLength(0);
    // the only stroked path is the outline circle
    expect(container.querySelectorAll('path[data-edge="visible"]')).toHaveLength(1);
    const label = screen.getByRole('img').getAttribute('aria-label')!;
    expect(label).not.toMatch(/Kante|gestrichelt/);
  });

  it('a coloured Würfel names every visible side and its colour in words (not by colour alone)', () => {
    const { container } = render(<SolidVisual visual={{ type: 'solid', solid: 'wuerfel', faceColors: { front: 'rot', top: 'blau', side: 'gelb' } }} />);
    const img = screen.getByRole('img');
    expect(img.getAttribute('aria-label')).toBe('Zeichnung eines Würfels von schräg oben. Oben ist Blau, vorne Rot, rechts Gelb.');
    expect([...container.querySelectorAll('[data-testid="solid-colour"] text')].map((t) => t.textContent)).toEqual(['oben: Blau', 'vorne: Rot', 'rechts: Gelb']);
    const fills = [...container.querySelectorAll('polygon')].map((p) => (p as SVGElement).style.fill);
    expect(fills).toEqual(['var(--c-blau)', 'var(--c-gelb)', 'var(--c-rot)']);
    // legend under the cube: the picture stays as narrow as the plain Würfel (readable on phones)
    expect(Number(img.getAttribute('width'))).toBe(220);
    expect(Number(img.getAttribute('height'))).toBeGreaterThan(180);
  });
});

