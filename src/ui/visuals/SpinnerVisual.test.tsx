// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import type { ColorName } from '../../core/types';
import SpinnerVisual from './SpinnerVisual';

afterEach(cleanup);

const WORDS = ['rot', 'blau', 'gelb', 'grün', 'lila', 'orange'];

describe('SpinnerVisual', () => {
  it('draws one sector and one colour word per field', () => {
    const sectors: ColorName[] = ['rot', 'blau', 'rot', 'gelb', 'rot', 'blau', 'gruen', 'lila'];
    render(<SpinnerVisual visual={{ type: 'spinner', sectors }} />);
    expect(screen.getAllByTestId('sp-sector')).toHaveLength(8);
    const labels = screen.getAllByTestId('sp-label').map((l) => l.textContent);
    expect(labels).toEqual(['rot', 'blau', 'rot', 'gelb', 'rot', 'blau', 'grün', 'lila']);
    labels.forEach((l) => expect(WORDS).toContain(l));
    expect(screen.getByTestId('sp-pointer')).toBeTruthy();
  });

  it('colour is never the only signal: every sector class has a matching visible word', () => {
    render(<SpinnerVisual visual={{ type: 'spinner', sectors: ['orange', 'gruen', 'orange'] }} />);
    const classes = screen.getAllByTestId('sp-sector').map((s) => s.getAttribute('class'));
    expect(classes).toEqual(['sp-sector sp-sector--orange', 'sp-sector sp-sector--gruen', 'sp-sector sp-sector--orange']);
    expect(screen.getAllByTestId('sp-label').map((l) => l.textContent)).toEqual(['orange', 'grün', 'orange']);
  });

  it('German aria-label counts the fields per colour', () => {
    render(<SpinnerVisual visual={{ type: 'spinner', sectors: ['rot', 'blau', 'rot'] }} />);
    expect(screen.getByRole('img').getAttribute('aria-label')).toBe('Glücksrad mit 3 gleich großen Feldern: 2 Felder rot und 1 Feld blau. Der Zeiger ist oben.');
  });

  it('a single-colour wheel is a full circle', () => {
    render(<SpinnerVisual visual={{ type: 'spinner', sectors: ['gelb'] }} />);
    expect(screen.getAllByTestId('sp-sector')[0].tagName.toLowerCase()).toBe('circle');
  });

  it('print mode adds the print modifier', () => {
    render(<SpinnerVisual visual={{ type: 'spinner', sectors: ['rot', 'blau'] }} print />);
    expect(screen.getByRole('img').getAttribute('class')).toContain('visual--print');
  });
});
