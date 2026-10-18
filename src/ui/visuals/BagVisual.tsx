/**
 * Säckchen with Kugeln. Kugeln of one colour are grouped (rows of up to 5) and every group carries its
 * colour word underneath, so colour is never the only signal (also in black-and-white print).
 */
import { fmt } from '../../core/format';
import type { ColorName, VisualOf } from '../../core/types';
import { READABLE, readableStyle, type VisualProps } from './types';
import './BagVisual.css';

type Bag = VisualOf<'bag'>;

const BALL_R = 12;
const PITCH = 29;
const PER_ROW = 5;
const GROUP_GAP = 22;
const SIDE = 34;
const NECK_H = 46;
const LABEL_H = 30;

const WORD: Record<ColorName, string> = { rot: 'rot', blau: 'blau', gelb: 'gelb', gruen: 'grün', lila: 'lila', orange: 'orange' };
const ADJ: Record<ColorName, string> = { rot: 'rote', blau: 'blaue', gelb: 'gelbe', gruen: 'grüne', lila: 'lila', orange: 'orange' };

function listDe(items: string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} und ${items[items.length - 1]}`;
}

export function bagLabel(v: Bag): string {
  const groups = v.balls.filter((b) => b.count > 0);
  const total = groups.reduce((a, b) => a + b.count, 0);
  const parts = groups.map((b) => `${fmt(b.count)} ${ADJ[b.color]} ${b.count === 1 ? 'Kugel' : 'Kugeln'}`);
  return `Säckchen mit ${fmt(total)} ${total === 1 ? 'Kugel' : 'Kugeln'}: ${listDe(parts)}.`;
}

export default function BagVisual({ visual, print }: VisualProps<Bag>) {
  const groups = visual.balls.filter((b) => b.count > 0);
  const cols = groups.map((g) => Math.max(Math.min(g.count, PER_ROW) * PITCH, WORD[g.color].length * 10 + 10));
  const rows = groups.map((g) => Math.ceil(g.count / PER_ROW));
  const innerW = cols.reduce((a, b) => a + b, 0) + GROUP_GAP * Math.max(0, groups.length - 1);
  const ballsH = Math.max(1, ...rows) * PITCH;
  const width = Math.max(innerW + 2 * SIDE + 24, 200);
  const bodyTop = NECK_H;
  const ballsTop = bodyTop + 44;
  const bodyBottom = ballsTop + ballsH + LABEL_H + 16;
  const height = bodyBottom + 8;
  const cx = width / 2;
  const mouth = Math.max(70, width * 0.42);
  // Sack outline: narrow mouth at the top, round shoulders, wide rounded bottom.
  const body = [
    `M${cx - mouth / 2} ${bodyTop}`,
    `C${cx - mouth / 2 - 30} ${bodyTop + 14} 6 ${bodyTop + 26} 6 ${bodyTop + 74}`,
    `L6 ${bodyBottom - 40}`,
    `Q6 ${bodyBottom} 46 ${bodyBottom}`,
    `L${width - 46} ${bodyBottom}`,
    `Q${width - 6} ${bodyBottom} ${width - 6} ${bodyBottom - 40}`,
    `L${width - 6} ${bodyTop + 74}`,
    `C${width - 6} ${bodyTop + 26} ${cx + mouth / 2 + 30} ${bodyTop + 14} ${cx + mouth / 2} ${bodyTop}`,
    'Z',
  ].join(' ');
  // Gathered neck above the mouth, tied with a cord.
  const neck = `M${cx - mouth / 2} ${bodyTop} Q${cx - 26} ${bodyTop - 6} ${cx - 20} ${bodyTop - 22} L${cx - 30} 6 L${cx + 30} 6 L${cx + 20} ${bodyTop - 22} Q${cx + 26} ${bodyTop - 6} ${cx + mouth / 2} ${bodyTop} Z`;
  const xs = cols.reduce<number[]>((acc, _w, i) => [...acc, i === 0 ? (width - innerW) / 2 : acc[i - 1] + cols[i - 1] + GROUP_GAP], []);
  return (
    <svg className={`visual visual-bag ${READABLE}${print ? ' visual--print' : ''}`} style={readableStyle(width, 0.67)} viewBox={`0 0 ${width} ${height}`} width={width} height={height} role="img" aria-label={bagLabel(visual)}>
      <path className="bg-body" d={body} />
      <path className="bg-neck" d={neck} />
      <path className="bg-tie" d={`M${cx - 24} ${bodyTop - 16} Q${cx} ${bodyTop - 8} ${cx + 24} ${bodyTop - 16}`} />
      <path className="bg-tie" d={`M${cx + 16} ${bodyTop - 13} q14 10 6 22 M${cx + 16} ${bodyTop - 13} q22 2 24 16`} />
      {groups.map((g, gi) => {
        const colW = cols[gi];
        const x = xs[gi];
        const n = g.count;
        const perRow = Math.min(n, PER_ROW);
        const offset = x + (colW - perRow * PITCH) / 2;
        return (
          <g key={gi} data-testid="bg-group">
            {Array.from({ length: n }, (_, k) => {
              const bx = offset + (k % PER_ROW) * PITCH + PITCH / 2;
              const by = ballsTop + Math.floor(k / PER_ROW) * PITCH + PITCH / 2;
              return (
                <g key={k} data-testid="bg-ball">
                  <circle className={`bg-ball bg-ball--${g.color}`} cx={bx} cy={by} r={BALL_R} />
                  <circle className="bg-shine" cx={bx - 4} cy={by - 4} r={3} />
                </g>
              );
            })}
            <text className="bg-label" x={x + colW / 2} y={ballsTop + ballsH + 22} textAnchor="middle">
              {WORD[g.color]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
