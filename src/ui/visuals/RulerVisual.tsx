/**
 * Lineal in cm with mm ticks (long tick every cm, medium every 5 mm) and an object (bar) above it
 * from startMm to startMm + lengthMm. Dashed guide lines lead from the bar ends down to the scale.
 */
import type { VisualOf } from '../../core/types';
import { READABLE, readableStyle, type VisualProps } from './types';
import './RulerVisual.css';

type Ruler = VisualOf<'ruler'>;

const PX_PER_MM = 4;
const MARGIN = 24;
/** Room on the right for the unit label 'cm'. */
const RIGHT = 52;
const BAR_Y = 16;
const BAR_H = 26;
const RULER_Y = 58;
const RULER_H = 58;

/** '7 cm' or '7 cm 4 mm' */
function pos(mm: number): string {
  const cm = Math.floor(mm / 10);
  const rest = mm % 10;
  return rest === 0 ? `${cm} cm` : `${cm} cm ${rest} mm`;
}

export function rulerLabel(v: Ruler): string {
  const start = Math.max(0, Math.round(v.startMm));
  const end = start + Math.max(0, Math.round(v.lengthMm));
  return `Lineal von 0 bis ${v.maxCm} cm. Darüber liegt ein Streifen. Er beginnt bei ${pos(start)} und endet bei ${pos(end)}.`;
}

export default function RulerVisual({ visual, print }: VisualProps<Ruler>) {
  const maxMm = Math.max(10, Math.round(visual.maxCm) * 10);
  const start = Math.max(0, Math.min(maxMm, Math.round(visual.startMm)));
  const end = Math.max(start, Math.min(maxMm, start + Math.round(visual.lengthMm)));
  const width = MARGIN + maxMm * PX_PER_MM + RIGHT;
  const height = RULER_Y + RULER_H + 8;
  const x = (mm: number) => MARGIN + mm * PX_PER_MM;
  return (
    <svg
      className={`visual visual-ruler ${READABLE}${print ? ' visual--print' : ''}`}
      style={readableStyle(width, 0.72)}
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      role="img"
      aria-label={rulerLabel(visual)}
    >
      <rect className="rl-bar" x={x(start)} y={BAR_Y} width={x(end) - x(start)} height={BAR_H} rx={5} data-testid="ruler-bar" />
      <line className="rl-guide" x1={x(start)} y1={BAR_Y + BAR_H} x2={x(start)} y2={RULER_Y} />
      <line className="rl-guide" x1={x(end)} y1={BAR_Y + BAR_H} x2={x(end)} y2={RULER_Y} />
      <rect className="rl-body" x={MARGIN - 12} y={RULER_Y} width={maxMm * PX_PER_MM + 24} height={RULER_H} rx={4} />
      {Array.from({ length: maxMm + 1 }, (_, mm) => {
        const len = mm % 10 === 0 ? 24 : mm % 5 === 0 ? 16 : 10;
        return <line key={mm} className={mm % 10 === 0 ? 'rl-tick rl-tick--cm' : 'rl-tick'} x1={x(mm)} y1={RULER_Y} x2={x(mm)} y2={RULER_Y + len} />;
      })}
      {Array.from({ length: maxMm / 10 + 1 }, (_, cm) => (
        <text key={cm} className="rl-num" x={x(cm * 10)} y={RULER_Y + 46} textAnchor="middle">
          {cm}
        </text>
      ))}
      <text className="rl-unit" x={x(maxMm) + 34} y={RULER_Y + 46} textAnchor="middle">
        cm
      </text>
    </svg>
  );
}
