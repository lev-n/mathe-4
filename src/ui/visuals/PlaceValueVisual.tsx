/**
 * Stellenwerttafel (M HT ZT T H Z E) with digits or Plättchen. Hand-written SVG.
 * Thousands columns get a soft topic background, a thick line separates Tausender and Hunderter.
 * `highlight` marks one column with a tint, a dashed outline and a ▼ marker above it (not colour only).
 */
import type { PlaceColumn, VisualOf } from '../../core/types';
import type { VisualProps } from './types';

const NAMES: Record<PlaceColumn, string> = {
  M: 'Millionen',
  HT: 'Hunderttausender',
  ZT: 'Zehntausender',
  T: 'Tausender',
  H: 'Hunderter',
  Z: 'Zehner',
  E: 'Einer',
};
const THOUSANDS: PlaceColumn[] = ['M', 'HT', 'ZT', 'T'];

const COL_W = 64;
const HEAD_H = 44;
const DIGIT_ROW_H = 60;
const PAD = 4;
const TOKEN_R = 9;
const TOKEN_STROKE = 1.5;
const TOKEN_GAP = 22;
/** Tokens mode: three Plättchen per row (2 gaps + 2 radii + strokes = 63.5) keep ≥ 10 px clearance to the column lines. */
export const TOKEN_COL_W = 84;
const MARK_H = 24;

/**
 * Spoken description, e.g. 'Stellenwerttafel von Hunderttausender bis Einer. Hunderttausender: 3, …'.
 * Full place names only: screen readers would spell 'HT' letter by letter.
 */
export function placeValueAriaLabel(v: VisualOf<'placeValue'>): string {
  const first = NAMES[v.columns[0]];
  const last = NAMES[v.columns[v.columns.length - 1]];
  const parts = [v.columns.length > 1 ? `Stellenwerttafel von ${first} bis ${last}.` : `Stellenwerttafel mit der Spalte ${first}.`];
  v.rows.forEach((row, i) => {
    const cells = v.columns.map((c, j) => {
      const x = row.values[j];
      if (x === null || x === undefined) return `${NAMES[c]}: leer`;
      return v.mode === 'tokens' ? `${NAMES[c]}: ${x} Plättchen` : `${NAMES[c]}: ${x}`;
    });
    const prefix = row.label ? `${row.label}: ` : v.rows.length > 1 ? `Zeile ${i + 1}: ` : '';
    parts.push(`${prefix}${cells.join(', ')}.`);
  });
  if (v.highlight && v.columns.includes(v.highlight)) parts.push(`Markiert ist die Spalte ${NAMES[v.highlight]}.`);
  return parts.join(' ');
}

/** Token centres inside a cell (3 per row). */
function tokenPositions(count: number, cx: number, top: number): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i < count; i++) {
    const row = Math.floor(i / 3);
    const inRow = Math.min(3, count - row * 3);
    const col = i % 3;
    out.push([cx + (col - (inRow - 1) / 2) * TOKEN_GAP, top + 18 + row * TOKEN_GAP]);
  }
  return out;
}

export default function PlaceValueVisual({ visual, print }: VisualProps<VisualOf<'placeValue'>>) {
  const { columns, rows, mode } = visual;
  const colW = mode === 'tokens' ? TOKEN_COL_W : COL_W;
  const maxTokens = mode === 'tokens' ? Math.max(0, ...rows.flatMap((r) => r.values.map((x) => x ?? 0))) : 0;
  const rowH = mode === 'tokens' ? Math.max(72, Math.ceil(maxTokens / 3) * TOKEN_GAP + 16) : DIGIT_ROW_H;
  const labelW = rows.some((r) => r.label) ? Math.max(...rows.map((r) => (r.label ?? '').length)) * 12 + 24 : 0;
  const hlIndex = visual.highlight ? columns.indexOf(visual.highlight) : -1;
  const top0 = PAD + (hlIndex >= 0 ? MARK_H : 0);
  const W = PAD * 2 + labelW + columns.length * colW;
  const H = top0 + PAD + HEAD_H + rows.length * rowH;
  const x0 = PAD + labelW;
  const colX = (i: number) => x0 + i * colW;
  const ink = 'var(--ink)';
  const tokenFill = print ? ink : 'var(--topic-zahlen)';
  const splitAt = columns.findIndex((c) => !THOUSANDS.includes(c));

  return (
    <svg
      className="visual visual-placevalue"
      viewBox={`0 0 ${W} ${H}`}
      width={W}
      height={H}
      role="img"
      aria-label={placeValueAriaLabel(visual)}
    >
      {columns.map((c, i) => (
        <g key={c}>
          <rect
            x={colX(i)}
            y={top0}
            width={colW}
            height={HEAD_H}
            style={{ fill: print ? 'var(--surface)' : THOUSANDS.includes(c) ? 'var(--topic-zahlen-bg)' : 'var(--surface-2)', stroke: 'var(--grid-line)', strokeWidth: 1.5 }}
          />
          <text x={colX(i) + colW / 2} y={top0 + HEAD_H / 2 + 7} textAnchor="middle" style={{ fill: ink, fontSize: 20, fontWeight: 700 }}>
            {c}
          </text>
        </g>
      ))}
      {rows.map((row, r) => {
        const top = top0 + HEAD_H + r * rowH;
        return (
          <g key={r} data-row={r}>
            {row.label && (
              <text x={x0 - 10} y={top + rowH / 2 + 7} textAnchor="end" style={{ fill: ink, fontSize: 20 }}>
                {row.label}
              </text>
            )}
            {columns.map((c, i) => {
              const v = row.values[i];
              return (
                <g key={c}>
                  <rect
                    x={colX(i)}
                    y={top}
                    width={colW}
                    height={rowH}
                    style={{ fill: i === hlIndex && !print ? 'var(--primary-soft)' : 'var(--surface)', stroke: 'var(--grid-line)', strokeWidth: 1.5 }}
                  />
                  {mode === 'digits' && v !== null && v !== undefined && (
                    <text
                      x={colX(i) + colW / 2}
                      y={top + rowH / 2 + 11}
                      textAnchor="middle"
                      data-cell={`${r}-${c}`}
                      style={{ fill: ink, fontSize: 32, fontFamily: 'var(--font-mono)' }}
                    >
                      {v}
                    </text>
                  )}
                  {mode === 'tokens' &&
                    v !== null &&
                    v !== undefined &&
                    tokenPositions(v, colX(i) + colW / 2, top).map(([cx, cy], k) => (
                      <circle key={k} cx={cx} cy={cy} r={TOKEN_R} data-token={c} style={{ fill: tokenFill, stroke: ink, strokeWidth: TOKEN_STROKE }} />
                    ))}
                </g>
              );
            })}
          </g>
        );
      })}
      {splitAt > 0 && (
        <line x1={colX(splitAt)} y1={top0} x2={colX(splitAt)} y2={H - PAD} style={{ stroke: ink, strokeWidth: 3 }} />
      )}
      <rect x={x0} y={top0} width={columns.length * colW} height={H - top0 - PAD} style={{ fill: 'none', stroke: ink, strokeWidth: 2 }} />
      {hlIndex >= 0 && (
        <g data-highlight={columns[hlIndex]}>
          <rect
            x={colX(hlIndex) + 3}
            y={top0 + 3}
            width={colW - 6}
            height={H - top0 - PAD - 6}
            style={{ fill: 'none', stroke: print ? ink : 'var(--primary)', strokeWidth: 3, strokeDasharray: '7 4' }}
          />
          <text x={colX(hlIndex) + colW / 2} y={PAD + MARK_H - 6} textAnchor="middle" style={{ fill: print ? ink : 'var(--primary)', fontSize: 20 }}>
            ▼
          </text>
        </g>
      )}
    </svg>
  );
}
