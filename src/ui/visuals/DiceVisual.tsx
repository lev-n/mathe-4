/**
 * Würfel faces with pips (Augen) in the usual arrangement. values [1, 2, 3, 4, 5, 6] shows the six sides
 * of one die. Values outside 1–6 are written as a number on the face.
 */
import { fmt } from '../../core/format';
import type { VisualOf } from '../../core/types';
import type { VisualProps } from './types';
import './DiceVisual.css';

type Dice = VisualOf<'dice'>;

const SIZE = 64;
const GAP = 16;
const PAD = 8;
const PER_ROW = 6;

/** Pip positions on a 3 × 3 raster (0 = left/top, 1 = middle, 2 = right/bottom). */
const PIPS: Record<number, [number, number][]> = {
  1: [[1, 1]],
  2: [[0, 0], [2, 2]],
  3: [[0, 0], [1, 1], [2, 2]],
  4: [[0, 0], [2, 0], [0, 2], [2, 2]],
  5: [[0, 0], [2, 0], [1, 1], [0, 2], [2, 2]],
  6: [[0, 0], [2, 0], [0, 1], [2, 1], [0, 2], [2, 2]],
};

function listDe(items: string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} und ${items[items.length - 1]}`;
}

export function diceLabel(v: Dice): string {
  const vals = v.values;
  if (vals.length === 6 && vals.every((x, i) => x === i + 1)) return 'Die sechs Seiten eines Würfels mit 1, 2, 3, 4, 5 und 6 Augen.';
  if (vals.length === 1) return `Ein Würfel zeigt ${fmt(vals[0])} ${vals[0] === 1 ? 'Auge' : 'Augen'}.`;
  return `${fmt(vals.length)} Würfel zeigen ${listDe(vals.map((x) => fmt(x)))} Augen.`;
}

export default function DiceVisual({ visual, print }: VisualProps<Dice>) {
  const n = Math.max(1, visual.values.length);
  const perRow = Math.min(n, PER_ROW);
  const rows = Math.ceil(n / PER_ROW);
  const width = PAD * 2 + perRow * SIZE + (perRow - 1) * GAP;
  const height = PAD * 2 + rows * SIZE + (rows - 1) * GAP;
  return (
    <svg className={`visual visual-dice${print ? ' visual--print' : ''}`} viewBox={`0 0 ${width} ${height}`} width={width} height={height} role="img" aria-label={diceLabel(visual)}>
      {visual.values.map((value, i) => {
        const x = PAD + (i % PER_ROW) * (SIZE + GAP);
        const y = PAD + Math.floor(i / PER_ROW) * (SIZE + GAP);
        const pips = PIPS[value];
        return (
          <g key={i} data-testid="dice-face">
            <rect className="dc-face" x={x} y={y} width={SIZE} height={SIZE} rx={11} />
            {pips
              ? pips.map(([px, py], k) => <circle key={k} className="dc-pip" cx={x + 16 + px * 16} cy={y + 16 + py * 16} r={6} data-testid="dice-pip" />)
              : (
                <text className="dc-num" x={x + SIZE / 2} y={y + SIZE / 2 + 9} textAnchor="middle">
                  {fmt(value)}
                </text>
              )}
          </g>
        );
      })}
    </svg>
  );
}
