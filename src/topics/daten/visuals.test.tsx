// @vitest-environment jsdom
/**
 * Every visual the daten generators produce (task, choice options, worked steps) renders with the
 * daten visual components: no NaN coordinates, a German aria-label, a sensible size.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { STUFEN, type Exercise, type Visual } from '../../core/types';
import BagVisual from '../../ui/visuals/BagVisual';
import BarChartVisual from '../../ui/visuals/BarChartVisual';
import DiceVisual from '../../ui/visuals/DiceVisual';
import PictogramVisual from '../../ui/visuals/PictogramVisual';
import SpinnerVisual from '../../ui/visuals/SpinnerVisual';
import TallyVisual from '../../ui/visuals/TallyVisual';
import TreeVisual from '../../ui/visuals/TreeVisual';
import topic from './index';
import { samples } from './testUtils';

afterEach(cleanup);

function renderOwn(v: Visual) {
  switch (v.type) {
    case 'barChart':
      return render(<BarChartVisual visual={v} />);
    case 'pictogram':
      return render(<PictogramVisual visual={v} />);
    case 'tally':
      return render(<TallyVisual visual={v} />);
    case 'spinner':
      return render(<SpinnerVisual visual={v} />);
    case 'bag':
      return render(<BagVisual visual={v} />);
    case 'dice':
      return render(<DiceVisual visual={v} />);
    case 'tree':
      return render(<TreeVisual visual={v} />);
    default:
      return null; // 'table' belongs to another component
  }
}

function visualsOf(e: Exercise): Visual[] {
  const out: Visual[] = [];
  if (e.visual) out.push(e.visual);
  if (e.answer.kind === 'choice') e.answer.options.forEach((o) => o.visual && out.push(o.visual));
  e.steps.forEach((s) => typeof s !== 'string' && s.visual && out.push(s.visual));
  return out;
}

describe('daten visuals render from generated exercises', () => {
  it('all types used by the generators render cleanly', () => {
    const seen = new Set<string>();
    for (const skill of topic.skills) {
      for (const stufe of STUFEN) {
        for (const e of samples(skill, stufe, 25)) {
          for (const v of visualsOf(e)) {
            const r = renderOwn(v);
            if (!r) continue;
            seen.add(v.type);
            const svg = r.container.querySelector('svg')!;
            expect(svg.getAttribute('role')).toBe('img');
            expect(svg.getAttribute('aria-label')!.length).toBeGreaterThan(10);
            const w = Number(svg.getAttribute('width'));
            const h = Number(svg.getAttribute('height'));
            expect(w).toBeGreaterThan(50);
            expect(w).toBeLessThanOrEqual(1000);
            expect(h).toBeGreaterThan(40);
            expect(h).toBeLessThanOrEqual(1300);
            expect(r.container.innerHTML).not.toMatch(/NaN|undefined|Infinity/);
            cleanup();
          }
        }
      }
    }
    expect([...seen].sort()).toEqual(['bag', 'barChart', 'dice', 'pictogram', 'spinner', 'tally', 'tree']);
  });
});
