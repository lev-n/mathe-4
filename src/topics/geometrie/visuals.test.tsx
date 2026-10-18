// @vitest-environment jsdom
/** Smoke test: every visual the geometry generators produce renders as an accessible SVG. */
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import type { Exercise, Visual } from '../../core/types';
import GridVisual from '../../ui/visuals/GridVisual';
import SolidVisual from '../../ui/visuals/SolidVisual';
import ShapeVisual from '../../ui/visuals/ShapeVisual';
import NetVisual from '../../ui/visuals/NetVisual';
import CubeBuildingVisual from '../../ui/visuals/CubeBuildingVisual';
import topic from './index';
import { samples } from './test-utils';

afterEach(cleanup);

function View({ v, print }: { v: Visual; print?: boolean }) {
  switch (v.type) {
    case 'grid': return <GridVisual visual={v} print={print} />;
    case 'solid': return <SolidVisual visual={v} print={print} />;
    case 'shape': return <ShapeVisual visual={v} print={print} />;
    case 'net': return <NetVisual visual={v} print={print} />;
    case 'cubeBuilding': return <CubeBuildingVisual visual={v} print={print} />;
    default: throw new Error(`unexpected visual ${v.type} in geometry`);
  }
}

function visualsOf(ex: Exercise): Visual[] {
  const out: Visual[] = [];
  if (ex.visual) out.push(ex.visual);
  if (ex.answer.kind === 'choice') ex.answer.options.forEach((o) => o.visual && out.push(o.visual));
  ex.steps.forEach((s) => typeof s !== 'string' && s.visual && out.push(s.visual));
  return out;
}

describe('geometry visuals render for generated exercises', () => {
  for (const skill of topic.skills) {
    it(skill.id, () => {
      for (const stufe of [1, 2, 3] as const) {
        for (const ex of samples(skill, stufe, 25)) {
          for (const v of visualsOf(ex)) {
            for (const print of [false, true]) {
              const { container } = render(<View v={v} print={print} />);
              const svg = container.querySelector('svg')!;
              expect(svg.getAttribute('role')).toBe('img');
              expect(svg.getAttribute('aria-label')!.length).toBeGreaterThan(10);
              expect(container.innerHTML).not.toMatch(/NaN|undefined|Infinity/);
              cleanup();
            }
          }
        }
      }
    });
  }

  it('the topic lists 9 skills with unique ids in teaching order', () => {
    expect(topic.topicId).toBe('geometrie');
    const ids = topic.skills.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual([
      'geometrie.figuren', 'geometrie.flaeche', 'geometrie.umfang', 'geometrie.symmetrie', 'geometrie.spiegeln',
      'geometrie.koerper', 'geometrie.ecken-kanten-flaechen', 'geometrie.wuerfelnetze', 'geometrie.wuerfelgebaeude',
    ]);
    ids.forEach((id) => expect(id).toMatch(/^geometrie\.[a-z-]+$/));
  });
});
