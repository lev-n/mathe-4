/**
 * Messbecher with a ml scale on the left (a tick every stepMl, labels at "nice" values) and liquid up to fillMl.
 * The liquid surface is drawn as a thick line, so the level is visible without relying on colour.
 */
import { fmt } from '../../core/format';
import type { VisualOf } from '../../core/types';
import type { VisualProps } from './types';
import './ContainerVisual.css';

type Container = VisualOf<'container'>;

const W = 276;
const H = 310;
const LEFT = 100;
const RIGHT = 212;
const TOP = 34;
const BOTTOM = 290;

/** Label every k-th tick so that there are at most 10 labels, preferring round values. */
export function labelEvery(capacity: number, step: number): number {
  const ticks = Math.round(capacity / step);
  for (const k of [1, 2, 4, 5, 10, 20, 25, 50, 100]) {
    if (ticks / k <= 10 && Math.round(ticks) % k === 0) return k;
  }
  return Math.ceil(ticks / 10);
}

/**
 * Screen-reader text. The level is described from the last labelled number below the surface,
 * the way the scale is read ('2 Striche über die Zahl 500'), not by counting every tick from the bottom.
 */
export function containerLabel(v: Container): string {
  const step = Math.max(1, v.stepMl);
  const ls = labelEvery(Math.max(1, v.capacityMl), step) * step;
  const last = Math.floor(v.fillMl / ls) * ls;
  const after = (v.fillMl - last) / step;
  const strich = after === 1 ? 'Strich' : 'Striche';
  let level: string;
  if (v.fillMl <= 0) level = 'Der Messbecher ist leer.';
  else if (!Number.isInteger(after)) level = `Die Flüssigkeit steht zwischen zwei Strichen über ${last === 0 ? 'dem Boden' : `der Zahl ${fmt(last)}`}.`;
  else if (after === 0) level = `Die Flüssigkeit reicht genau bis zur Zahl ${fmt(last)}.`;
  else if (last === 0) level = `Die Flüssigkeit reicht ${after} ${strich} über den Boden.`;
  else level = `Die Flüssigkeit reicht ${after} ${strich} über die Zahl ${fmt(last)}.`;
  return `Messbecher bis ${fmt(v.capacityMl)} ml. Ein Strich bedeutet ${fmt(step)} ml. ${level}`;
}

export default function ContainerVisual({ visual, print }: VisualProps<Container>) {
  const capacity = Math.max(1, visual.capacityMl);
  const step = Math.max(1, Math.min(capacity, visual.stepMl));
  const fill = Math.max(0, Math.min(capacity, visual.fillMl));
  const y = (ml: number) => BOTTOM - (ml / capacity) * (BOTTOM - TOP);
  const ticks = Math.round(capacity / step);
  const every = labelEvery(capacity, step);
  return (
    <svg
      className={`visual visual-container${print ? ' visual--print' : ''}`}
      viewBox={`0 0 ${W} ${H}`}
      width={W}
      height={H}
      role="img"
      aria-label={containerLabel(visual)}
    >
      <text className="ct-unit" x={LEFT - 14} y={TOP - 14} textAnchor="end">
        ml
      </text>
      {fill > 0 && <rect className="ct-liquid" x={LEFT} y={y(fill)} width={RIGHT - LEFT} height={BOTTOM - y(fill)} data-testid="container-liquid" />}
      {fill > 0 && <line className="ct-surface" x1={LEFT} y1={y(fill)} x2={RIGHT} y2={y(fill)} />}
      <path className="ct-handle" d={`M ${RIGHT} ${TOP + 40} C ${RIGHT + 54} ${TOP + 40}, ${RIGHT + 54} ${TOP + 150}, ${RIGHT} ${TOP + 150}`} />
      <path className="ct-body" d={`M ${LEFT - 6} ${TOP - 8} L ${LEFT} ${BOTTOM} L ${RIGHT} ${BOTTOM} L ${RIGHT + 6} ${TOP - 8}`} />
      {Array.from({ length: ticks + 1 }, (_, i) => {
        const ml = i * step;
        const labelled = i % every === 0;
        return (
          <g key={i}>
            <line className={labelled ? 'ct-tick ct-tick--major' : 'ct-tick'} x1={LEFT} y1={y(ml)} x2={LEFT + (labelled ? 26 : 14)} y2={y(ml)} />
            {labelled && i > 0 && (
              <text className="ct-num" x={LEFT - 14} y={y(ml) + 6} textAnchor="end">
                {fmt(ml)}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
