/**
 * Netz (hexomino) on a grid. faces[i] labels cells[i]: a letter, a number, '?', a word ('oben') or a
 * colour name ('rot', 'blau', 'gelb', 'gruen', 'lila', 'orange'). Colour faces are filled with the colour
 * AND carry the colour word on a white chip (colour is never the only carrier of information).
 * highlight[i] = index of a cell drawn with a thick dashed frame (also named in the aria-label).
 */
import type { Cell, ColorName, VisualOf } from '../../core/types';
import type { VisualProps } from './types';

const CELL = 68;
const PAD = 6;

const COLOR_WORD: Record<ColorName, string> = { rot: 'Rot', blau: 'Blau', gelb: 'Gelb', gruen: 'Grün', lila: 'Lila', orange: 'Orange' };
const isColor = (s: string | null | undefined): s is ColorName => !!s && s in COLOR_WORD;

export function faceText(label: string | null | undefined): string | null {
  if (!label) return null;
  return isColor(label) ? COLOR_WORD[label] : label;
}

export function netAriaLabel(cells: readonly Cell[], faces?: readonly (string | null)[], highlight?: readonly number[]): string {
  const order = cells.map((c, i) => ({ c, i })).sort((a, b) => a.c[1] - b.c[1] || a.c[0] - b.c[0]);
  const minX = Math.min(...cells.map((c) => c[0]));
  const minY = Math.min(...cells.map((c) => c[1]));
  const rows = new Map<number, string[]>();
  for (const { c, i } of order) {
    const label = faceText(faces?.[i]);
    const text = `Spalte ${c[0] - minX + 1}${label ? ` (${label === '?' ? 'Fragezeichen' : label})` : ''}`;
    const y = c[1] - minY;
    if (!rows.has(y)) rows.set(y, []);
    rows.get(y)!.push(text);
  }
  let out = `Netz aus ${cells.length} Quadraten. ${[...rows.entries()].map(([y, t]) => `Zeile ${y + 1}: ${t.join(', ')}`).join('. ')}.`;
  if (highlight?.length) {
    const marked = highlight.map((i) => faceText(faces?.[i]) ?? `Zeile ${cells[i][1] - minY + 1}, Spalte ${cells[i][0] - minX + 1}`);
    out += ` Markiert: ${marked.join(', ')}.`;
  }
  return out;
}

export default function NetVisual({ visual, print }: VisualProps<VisualOf<'net'>>) {
  const { cells, faces, highlight = [] } = visual;
  const minX = Math.min(...cells.map((c) => c[0]));
  const minY = Math.min(...cells.map((c) => c[1]));
  const w = Math.max(...cells.map((c) => c[0])) - minX + 1;
  const h = Math.max(...cells.map((c) => c[1])) - minY + 1;
  const W = w * CELL + 2 * PAD;
  const H = h * CELL + 2 * PAD;
  const marked = new Set(highlight);
  return (
    <svg className="visual visual-net" viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" aria-label={netAriaLabel(cells, faces, highlight)}>
      {cells.map(([cx, cy], i) => {
        const x = PAD + (cx - minX) * CELL;
        const y = PAD + (cy - minY) * CELL;
        const raw = faces?.[i] ?? null;
        const label = faceText(raw);
        const colour = isColor(raw) && !print ? `var(--c-${raw})` : null;
        const long = !!label && label.length > 2;
        return (
          <g key={`${cx},${cy}`} data-cell={`${cx},${cy}`}>
            <rect
              x={x} y={y} width={CELL} height={CELL}
              style={{ fill: colour ?? (print ? 'var(--surface)' : 'var(--primary-soft)'), stroke: 'var(--ink)', strokeWidth: 2.5 }}
            />
            {label && colour && (
              <rect x={x + 4} y={y + CELL / 2 - 13} width={CELL - 8} height={26} rx={6} style={{ fill: 'var(--surface)', stroke: 'none' }} />
            )}
            {label && (
              <text
                x={x + CELL / 2}
                y={y + CELL / 2}
                textAnchor="middle"
                dominantBaseline="central"
                style={{ fill: 'var(--text)', fontSize: long ? 16 : 28, fontWeight: 700 }}
              >
                {label}
              </text>
            )}
            {marked.has(i) && (
              <rect
                x={x + 5} y={y + 5} width={CELL - 10} height={CELL - 10} rx={4}
                style={{ fill: 'none', stroke: print ? 'var(--ink)' : 'var(--focus)', strokeWidth: 4, strokeDasharray: '6 4' }}
                data-testid="net-highlight"
              />
            )}
          </g>
        );
      })}
    </svg>
  );
}
