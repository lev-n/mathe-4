/**
 * Punktefeld for the Einmaleins: rows × cols dots, optionally with a gap after a row and/or column
 * (Kraft der Fünf). Hand-written SVG.
 */
import type { VisualOf } from '../../core/types';
import type { VisualProps } from './types';

const STEP = 28;
const R = 10;
const GAP = 16;
const PAD = 14;

export function dotArrayAriaLabel(v: VisualOf<'dotArray'>): string {
  const parts = [`Punktefeld: ${v.rows} ${v.rows === 1 ? 'Reihe' : 'Reihen'} mit je ${v.cols} ${v.cols === 1 ? 'Punkt' : 'Punkten'}.`];
  if (v.splitAfterRow && v.splitAfterRow < v.rows) parts.push(`Nach ${v.splitAfterRow} Reihen ist eine Lücke.`);
  if (v.splitAfterCol && v.splitAfterCol < v.cols) parts.push(`In jeder Reihe ist nach ${v.splitAfterCol} Punkten eine Lücke.`);
  return parts.join(' ');
}

export default function DotArrayVisual({ visual, print }: VisualProps<VisualOf<'dotArray'>>) {
  const { rows, cols, splitAfterRow, splitAfterCol } = visual;
  const rowGap = splitAfterRow && splitAfterRow < rows ? GAP : 0;
  const colGap = splitAfterCol && splitAfterCol < cols ? GAP : 0;
  const W = PAD * 2 + cols * STEP + colGap;
  const H = PAD * 2 + rows * STEP + rowGap;
  const cx = (c: number) => PAD + STEP / 2 + c * STEP + (colGap && c >= (splitAfterCol ?? 0) ? colGap : 0);
  const cy = (r: number) => PAD + STEP / 2 + r * STEP + (rowGap && r >= (splitAfterRow ?? 0) ? rowGap : 0);
  return (
    <svg className="visual visual-dotarray" viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" aria-label={dotArrayAriaLabel(visual)}>
      {Array.from({ length: rows }, (_, r) =>
        Array.from({ length: cols }, (_, c) => (
          <circle
            key={`${r}-${c}`}
            cx={cx(c)}
            cy={cy(r)}
            r={R}
            data-dot={`${r}-${c}`}
            style={{ fill: print ? 'var(--ink)' : 'var(--c-blau)', stroke: 'var(--ink)', strokeWidth: 1 }}
          />
        )),
      )}
    </svg>
  );
}
