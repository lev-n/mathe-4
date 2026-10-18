// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import NumberLineInput, { snapValue } from './NumberLineInput';
import type { AnswerOf, CheckResult, Response } from '../../core/types';

const answer: AnswerOf<'numberline'> = {
  kind: 'numberline',
  min: 30_000,
  max: 40_000,
  majorStep: 1_000,
  minorStep: 500,
  step: 500,
  value: 34_500,
  tolerance: 0,
  labelMajor: true,
};

function Harness(props: { onSubmit?: () => void; disabled?: boolean; reveal?: boolean; result?: CheckResult | null; initial?: number; onChange?: (r: Response) => void }) {
  const [response, setResponse] = useState<Response | null>(props.initial === undefined ? null : { kind: 'numberline', value: props.initial });
  return (
    <NumberLineInput
      answer={answer}
      response={response}
      onChange={(r) => {
        setResponse(r);
        props.onChange?.(r);
      }}
      onSubmit={props.onSubmit ?? (() => {})}
      disabled={props.disabled ?? false}
      result={props.result ?? null}
      reveal={props.reveal ?? false}
      idBase="t1"
      keypad={false}
    />
  );
}

describe('NumberLineInput', () => {
  it('is an APG slider with German value text and no visible value', () => {
    render(<Harness />);
    const slider = screen.getByRole('slider', { name: 'Pfeil auf dem Zahlenstrahl' });
    expect(slider.getAttribute('aria-valuemin')).toBe('30000');
    expect(slider.getAttribute('aria-valuemax')).toBe('40000');
    expect(slider.getAttribute('aria-valuetext')).toBe('Noch kein Pfeil gesetzt');
    expect(slider.tabIndex).toBe(0);
    expect(screen.getByText(/Tippe auf die Stelle am Zahlenstrahl/)).toBeTruthy();
  });

  it('moves with arrow keys, PageUp/PageDown, Home and End', () => {
    render(<Harness />);
    const slider = screen.getByRole('slider');
    fireEvent.keyDown(slider, { key: 'ArrowRight' });
    expect(slider.getAttribute('aria-valuenow')).toBe('30500');
    expect(slider.getAttribute('aria-valuetext')).toBe('30\u202F500');
    fireEvent.keyDown(slider, { key: 'PageUp' });
    expect(slider.getAttribute('aria-valuenow')).toBe('31500');
    fireEvent.keyDown(slider, { key: 'ArrowLeft' });
    expect(slider.getAttribute('aria-valuenow')).toBe('31000');
    fireEvent.keyDown(slider, { key: 'End' });
    expect(slider.getAttribute('aria-valuenow')).toBe('40000');
    fireEvent.keyDown(slider, { key: 'ArrowRight' });
    expect(slider.getAttribute('aria-valuenow')).toBe('40000');
    fireEvent.keyDown(slider, { key: 'Home' });
    expect(slider.getAttribute('aria-valuenow')).toBe('30000');
    fireEvent.keyDown(slider, { key: 'PageDown' });
    expect(slider.getAttribute('aria-valuenow')).toBe('30000');
  });

  it('submits with Enter only when a value is set', () => {
    const onSubmit = vi.fn();
    render(<Harness onSubmit={onSubmit} />);
    const slider = screen.getByRole('slider');
    fireEvent.keyDown(slider, { key: 'Enter' });
    expect(onSubmit).not.toHaveBeenCalled();
    fireEvent.keyDown(slider, { key: 'ArrowRight' });
    fireEvent.keyDown(slider, { key: 'Enter' });
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('places the arrow where the line is tapped (snapped to the step)', () => {
    const onChange = vi.fn();
    const { container } = render(<Harness onChange={onChange} />);
    const svg = container.querySelector('svg')!;
    svg.getBoundingClientRect = () => ({ left: 0, top: 0, width: 640, height: 130, right: 640, bottom: 130, x: 0, y: 0, toJSON: () => ({}) });
    const slider = screen.getByRole('slider');
    // x for 34 500: PAD + 0.45 · (640 − 2 · PAD) = 52 + 0.45 · 536 = 293.2
    fireEvent.pointerDown(slider, { clientX: 295, pointerId: 1 });
    expect(onChange).toHaveBeenLastCalledWith({ kind: 'numberline', value: 34_500 });
    expect(container.querySelector('[data-marker="set"]')).not.toBeNull();
    fireEvent.pointerMove(slider, { clientX: 400, pointerId: 1 });
    expect(slider.getAttribute('aria-valuenow')).toBe('36500');
    fireEvent.pointerUp(slider, { pointerId: 1 });
    fireEvent.pointerMove(slider, { clientX: 100, pointerId: 1 });
    expect(slider.getAttribute('aria-valuenow')).toBe('36500');
  });

  it('ignores input when disabled', () => {
    const onChange = vi.fn();
    render(<Harness disabled onChange={onChange} initial={32_000} />);
    const slider = screen.getByRole('slider');
    fireEvent.keyDown(slider, { key: 'ArrowRight' });
    expect(onChange).not.toHaveBeenCalled();
    expect(slider.getAttribute('aria-disabled')).toBe('true');
  });

  it('marks a wrong arrow with colour and text, and reveals the solution', () => {
    const { container, rerender } = render(<Harness initial={32_000} result={{ correct: false }} />);
    expect(container.querySelector('[data-marker="wrong"]')).not.toBeNull();
    expect(screen.getByText('Dein Pfeil steht noch nicht an der richtigen Stelle.')).toBeTruthy();
    rerender(<Harness initial={32_000} reveal />);
    expect(container.querySelector('[data-marker="solution"]')).not.toBeNull();
    expect(screen.getByText(/Die richtige Stelle ist 34\s500/)).toBeTruthy();
  });

  it('print mode shows an empty static line', () => {
    const { container } = render(
      <NumberLineInput answer={answer} response={null} onChange={() => {}} onSubmit={() => {}} disabled={false} result={null} reveal={false} idBase="p" keypad={false} print />,
    );
    expect(screen.queryByRole('slider')).toBeNull();
    expect(screen.getByRole('img').getAttribute('aria-label')).toContain('zum Eintragen');
    expect(container.querySelector('[data-marker]')).toBeNull();
  });

  it('labels both ends when the answer has no major labels', () => {
    const { container } = render(
      <NumberLineInput
        answer={{ ...answer, min: 0, max: 1_000_000, majorStep: 100_000, minorStep: 100_000, step: 10_000, value: 640_000, tolerance: 20_000, labelMajor: false }}
        response={null}
        onChange={() => {}}
        onSubmit={() => {}}
        disabled={false}
        result={null}
        reveal={false}
        idBase="e"
        keypad={false}
      />,
    );
    expect([...container.querySelectorAll('[data-label]')].map((t) => t.getAttribute('data-label'))).toEqual(['0', '1000000']);
  });

  it('uses explicit labels from the answer when given', () => {
    const { container } = render(
      <NumberLineInput
        answer={{ ...answer, labelMajor: false, labels: [30_000, 35_000] }}
        response={null}
        onChange={() => {}}
        onSubmit={() => {}}
        disabled={false}
        result={null}
        reveal={false}
        idBase="l"
        keypad={false}
      />,
    );
    expect([...container.querySelectorAll('[data-label]')].map((t) => t.getAttribute('data-label'))).toEqual(['30000', '35000']);
  });

  it('snaps and clamps', () => {
    expect(snapValue(34_740, answer)).toBe(34_500);
    expect(snapValue(29_000, answer)).toBe(30_000);
    expect(snapValue(50_000, answer)).toBe(40_000);
  });

  it('step buttons move the arrow one step (touch screens) and are off when disabled', () => {
    const { rerender } = render(<Harness />);
    const slider = screen.getByRole('slider');
    const right = screen.getByRole('button', { name: 'Pfeil einen Schritt nach rechts' });
    const left = screen.getByRole('button', { name: 'Pfeil einen Schritt nach links' });
    fireEvent.click(right);
    expect(slider.getAttribute('aria-valuenow')).toBe('30500');
    fireEvent.click(right);
    fireEvent.click(left);
    expect(slider.getAttribute('aria-valuenow')).toBe('30500');
    rerender(<Harness disabled />);
    expect((screen.getByRole('button', { name: 'Pfeil einen Schritt nach rechts' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('on a sideways-scrolling line a touch places the arrow on release, not when a swipe starts', () => {
    const onChange = vi.fn();
    const { container } = render(<Harness onChange={onChange} />);
    const svg = container.querySelector('svg')!;
    svg.getBoundingClientRect = () => ({ left: 0, top: 0, width: 640, height: 130, right: 640, bottom: 130, x: 0, y: 0, toJSON: () => ({}) });
    const box = container.querySelector('.nl-scroll') as HTMLElement;
    Object.defineProperty(box, 'scrollWidth', { configurable: true, value: 560 });
    Object.defineProperty(box, 'clientWidth', { configurable: true, value: 288 });
    const slider = screen.getByRole('slider');
    // a swipe: the browser scrolls and cancels the pointer → nothing placed
    fireEvent.pointerDown(slider, { clientX: 295, pointerId: 1, pointerType: 'touch' });
    fireEvent.pointerCancel(slider, { pointerId: 1, pointerType: 'touch' });
    fireEvent.pointerUp(slider, { clientX: 295, pointerId: 1, pointerType: 'touch' });
    expect(onChange).not.toHaveBeenCalled();
    // a tap: placed on release
    fireEvent.pointerDown(slider, { clientX: 295, pointerId: 2, pointerType: 'touch' });
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.pointerUp(slider, { clientX: 295, pointerId: 2, pointerType: 'touch' });
    expect(onChange).toHaveBeenLastCalledWith({ kind: 'numberline', value: 34_500 });
  });

  it('keeps a readable minimum width and scrolls instead of shrinking', () => {
    const { container } = render(<Harness />);
    const box = container.querySelector('.nl-scroll') as HTMLElement;
    expect(box.style.getPropertyValue('--nl-min-width')).toBe('560px');
    expect(box.querySelector('[role="slider"]')).not.toBeNull();
  });
});

