/**
 * Glücksrad with equal sectors in the given order, clockwise; the first sector lies centred under the pointer.
 * Every sector carries its colour word on a white label, so colour is never the only signal.
 * The Zeiger is fixed above the wheel and points down (the wheel turns, the pointer does not).
 */
import { fmt } from '../../core/format';
import type { ColorName, VisualOf } from '../../core/types';
import type { VisualProps } from './types';
import './SpinnerVisual.css';

type Spinner = VisualOf<'spinner'>;

const R = 150;
const CX = 170;
const CY = 196;
const W = 340;
const H = 366;
const LABEL_R = 0.64 * R;

export const COLOR_WORD: Record<ColorName, string> = { rot: 'rot', blau: 'blau', gelb: 'gelb', gruen: 'grün', lila: 'lila', orange: 'orange' };

function listDe(items: string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} und ${items[items.length - 1]}`;
}

export function spinnerLabel(v: Spinner): string {
  const counts: { color: ColorName; n: number }[] = [];
  v.sectors.forEach((c) => {
    const g = counts.find((x) => x.color === c);
    if (g) g.n++;
    else counts.push({ color: c, n: 1 });
  });
  const parts = counts.map((g) => `${g.n === 1 ? '1 Feld' : `${fmt(g.n)} Felder`} ${COLOR_WORD[g.color]}`);
  const n = v.sectors.length;
  return `Glücksrad mit ${fmt(n)} gleich großen ${n === 1 ? 'Feld' : 'Feldern'}: ${listDe(parts)}. Der Zeiger ist oben.`;
}

const point = (deg: number, r: number): [number, number] => {
  const a = (deg * Math.PI) / 180;
  return [Math.round((CX + r * Math.cos(a)) * 100) / 100, Math.round((CY + r * Math.sin(a)) * 100) / 100];
};

export default function SpinnerVisual({ visual, print }: VisualProps<Spinner>) {
  const { sectors } = visual;
  const n = Math.max(1, sectors.length);
  const step = 360 / n;
  // Rotate by half a sector so the fixed pointer never points at a border between two fields.
  const startDeg = -90 - step / 2;
  return (
    <svg className={`visual visual-spinner${print ? ' visual--print' : ''}`} viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" aria-label={spinnerLabel(visual)}>
      {sectors.length === 1 ? (
        <circle className={`sp-sector sp-sector--${sectors[0]}`} cx={CX} cy={CY} r={R} data-testid="sp-sector" />
      ) : (
        sectors.map((c, i) => {
          const a0 = startDeg + i * step;
          const a1 = a0 + step;
          const [x0, y0] = point(a0, R);
          const [x1, y1] = point(a1, R);
          const large = step > 180 ? 1 : 0;
          return <path key={i} className={`sp-sector sp-sector--${c}`} d={`M${CX} ${CY} L${x0} ${y0} A${R} ${R} 0 ${large} 1 ${x1} ${y1} Z`} data-testid="sp-sector" />;
        })
      )}
      <circle className="sp-rim" cx={CX} cy={CY} r={R} />
      {sectors.map((c, i) => {
        const [lx, ly] = sectors.length === 1 ? [CX, CY + R * 0.45] : point(startDeg + (i + 0.5) * step, LABEL_R);
        const word = COLOR_WORD[c];
        const w = word.length * 9.6 + 14;
        return (
          <g key={`l${i}`} data-testid="sp-label">
            <rect className="sp-label-box" x={lx - w / 2} y={ly - 13} width={w} height={26} rx={7} />
            <text className="sp-label" x={lx} y={ly + 6} textAnchor="middle">
              {word}
            </text>
          </g>
        );
      })}
      <circle className="sp-hub" cx={CX} cy={CY} r={9} />
      <polygon className="sp-pointer" points={`${CX - 16},6 ${CX + 16},6 ${CX},${CY - R + 18}`} data-testid="sp-pointer" />
    </svg>
  );
}
