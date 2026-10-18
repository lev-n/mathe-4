/**
 * Strichliste: one row per category, strokes in bundles of five (four upright strokes + one diagonal),
 * followed by the remaining single strokes. Long rows wrap after 10 bundles.
 * The aria-label names bundles and single strokes, so counting stays the task.
 */
import { fmt } from '../../core/format';
import type { VisualOf } from '../../core/types';
import { READABLE, readableStyle, type VisualProps } from './types';
import './TallyVisual.css';

type Tally = VisualOf<'tally'>;

const PAD = 14;
/**
 * Estimated width of one label character at 18 px. Atkinson Hyperlegible Next averages about 10.7 px, so 11 keeps
 * a gap of about 10 px between the longest label ('Wohnwagen', 'Donnerstag') and the separator line.
 */
const CHAR = 11;
const STROKE_GAP = 8;
const STROKE_H = 28;
const BUNDLE_W = 3 * STROKE_GAP; // distance first → fourth stroke
const BUNDLE_PITCH = BUNDLE_W + 22;
const LINE_H = 40;
const MAX_BUNDLES_PER_LINE = 10;

export function tallyText(count: number): string {
  const b = Math.floor(count / 5);
  const r = count % 5;
  const bundles = b > 0 ? `${fmt(b)} Fünferbündel` : '';
  const single = r > 0 ? (r === 1 ? '1 Strich' : `${fmt(r)} Striche`) : '';
  if (bundles && single) return `${bundles} und ${single}`;
  return bundles || single || 'keine Striche';
}

export function tallyLabel(v: Tally): string {
  const head = v.title ? `Strichliste „${v.title}“.` : 'Strichliste.';
  return `${head} ${v.rows.map((r) => `${r.label}: ${tallyText(r.count)}`).join('. ')}.`;
}

/** Line segments for one row of strokes, starting at (x0, y0 = top of the strokes). */
export function strokes(count: number, x0: number, y0: number): { x1: number; y1: number; x2: number; y2: number; diagonal: boolean }[] {
  const out: { x1: number; y1: number; x2: number; y2: number; diagonal: boolean }[] = [];
  const bundles = Math.floor(count / 5);
  const rest = count % 5;
  const pos = (k: number) => ({ line: Math.floor(k / MAX_BUNDLES_PER_LINE), col: k % MAX_BUNDLES_PER_LINE });
  for (let k = 0; k < bundles; k++) {
    const { line, col } = pos(k);
    const x = x0 + col * BUNDLE_PITCH;
    const y = y0 + line * LINE_H;
    for (let s = 0; s < 4; s++) out.push({ x1: x + s * STROKE_GAP, y1: y, x2: x + s * STROKE_GAP, y2: y + STROKE_H, diagonal: false });
    out.push({ x1: x - 6, y1: y + STROKE_H - 3, x2: x + BUNDLE_W + 6, y2: y + 3, diagonal: true });
  }
  const { line, col } = pos(bundles);
  const xs = x0 + col * BUNDLE_PITCH;
  const ys = y0 + line * LINE_H;
  for (let s = 0; s < rest; s++) out.push({ x1: xs + s * STROKE_GAP, y1: ys, x2: xs + s * STROKE_GAP, y2: ys + STROKE_H, diagonal: false });
  return out;
}

/** Lines needed for a row: every bundle and the group of single strokes take one position each. */
function linesFor(count: number): number {
  const slots = Math.floor(count / 5) + (count % 5 > 0 ? 1 : 0);
  return Math.max(1, Math.ceil(slots / MAX_BUNDLES_PER_LINE));
}

export default function TallyVisual({ visual, print }: VisualProps<Tally>) {
  const { title, rows } = visual;
  const catW = Math.max(4, ...rows.map((r) => r.label.length)) * CHAR + 16;
  const left = PAD + catW + 16;
  const maxBundles = Math.max(0, ...rows.map((r) => Math.floor(r.count / 5)));
  const bundlesInLine = Math.min(MAX_BUNDLES_PER_LINE, maxBundles + 1);
  const width = Math.max(left + bundlesInLine * BUNDLE_PITCH + PAD + 8, ((title ?? '').length + 2) * 11 + 2 * PAD, 240);
  const top = title ? 44 : PAD;
  const rowHeights = rows.map((r) => 14 + linesFor(r.count) * LINE_H);
  const rowTops = rowHeights.reduce<number[]>((acc, _h, i) => [...acc, i === 0 ? top : acc[i - 1] + rowHeights[i - 1]], []);
  const height = (rows.length ? rowTops[rows.length - 1] + rowHeights[rows.length - 1] : top) + PAD;
  return (
    <svg
      className={`visual visual-tally ${READABLE}${print ? ' visual--print' : ''}`}
      style={readableStyle(width, 0.67)}
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      role="img"
      aria-label={tallyLabel(visual)}
    >
      {title && (
        <text className="tl-title" x={width / 2} y={26} textAnchor="middle">
          {title}
        </text>
      )}
      <rect className="tl-frame" x={PAD} y={top} width={width - 2 * PAD} height={height - top - PAD} rx={6} />
      <line className="tl-sep" x1={left - 14} x2={left - 14} y1={top} y2={height - PAD} />
      {rows.map((r, i) => (
        <g key={r.label + i} data-testid="tl-row">
          {i > 0 && <line className="tl-sep" x1={PAD} x2={width - PAD} y1={rowTops[i]} y2={rowTops[i]} />}
          <text className="tl-cat" x={PAD + 10} y={rowTops[i] + 11 + STROKE_H / 2 + 6}>
            {r.label}
          </text>
          {strokes(r.count, left, rowTops[i] + 11).map((s, k) => (
            <line key={k} className={s.diagonal ? 'tl-stroke tl-stroke--diag' : 'tl-stroke'} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} data-testid={s.diagonal ? 'tl-diag' : 'tl-stroke'} />
          ))}
        </g>
      ))}
    </svg>
  );
}
