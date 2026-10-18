// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import ClockVisual, { clockLabel } from './ClockVisual';

afterEach(cleanup);

/** Angle of a hand line in degrees, 0 = 12 o'clock, clockwise. */
function angleOf(el: Element): number {
  const x1 = Number(el.getAttribute('x1'));
  const y1 = Number(el.getAttribute('y1'));
  const x2 = Number(el.getAttribute('x2'));
  const y2 = Number(el.getAttribute('y2'));
  const deg = (Math.atan2(x2 - x1, -(y2 - y1)) * 180) / Math.PI;
  return (deg + 360) % 360;
}

describe('ClockVisual', () => {
  it('renders an accessible SVG with 12 numbers and German hand description', () => {
    render(<ClockVisual visual={{ type: 'clock', hours: 8, minutes: 20 }} />);
    const img = screen.getByRole('img');
    expect(img.tagName.toLowerCase()).toBe('svg');
    expect(img.getAttribute('aria-label')).toBe(
      'Uhr mit Zeigern. Der kurze Stundenzeiger steht zwischen der 8 und der 9. Der lange Minutenzeiger zeigt auf die 4.',
    );
    expect(img.querySelectorAll('text')).toHaveLength(12);
    expect(screen.queryByTestId('clock-digital')).toBeNull();
  });

  it('places the hands at the right angles (hour hand moves with the minutes)', () => {
    render(<ClockVisual visual={{ type: 'clock', hours: 14, minutes: 30 }} />);
    expect(angleOf(screen.getByTestId('clock-minute-hand'))).toBeCloseTo(180, 5);
    expect(angleOf(screen.getByTestId('clock-hour-hand'))).toBeCloseTo(75, 5);
  });

  it('the minute hand is longer than the hour hand (not only a colour difference)', () => {
    render(<ClockVisual visual={{ type: 'clock', hours: 3, minutes: 0 }} />);
    const len = (el: Element) => Math.hypot(Number(el.getAttribute('x2')) - Number(el.getAttribute('x1')), Number(el.getAttribute('y2')) - Number(el.getAttribute('y1')));
    expect(len(screen.getByTestId('clock-minute-hand'))).toBeGreaterThan(len(screen.getByTestId('clock-hour-hand')) + 20);
  });

  it('shows the digital display in 24-h notation when requested and in print mode', () => {
    render(<ClockVisual visual={{ type: 'clock', hours: 18, minutes: 5, showDigital: true }} print />);
    expect(screen.getByTestId('clock-digital').textContent).toBe('18:05');
    expect(screen.getByRole('img').getAttribute('class')).toContain('visual--print');
    expect(screen.getByRole('img').getAttribute('aria-label')).toContain('Digitalanzeige zeigt 18:05');
  });

  it('describes single-minute positions', () => {
    expect(clockLabel({ type: 'clock', hours: 7, minutes: 43 })).toContain('steht 3 Striche nach der 8');
    expect(clockLabel({ type: 'clock', hours: 12, minutes: 1 })).toContain('steht 1 Strich nach der 12');
    expect(clockLabel({ type: 'clock', hours: 0, minutes: 0 })).toContain('zeigt auf die 12');
  });
});
