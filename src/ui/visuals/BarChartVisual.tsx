/**
 * Säulendiagramm (vertical) or Balkendiagramm (horizontal), hand-written SVG.
 * - Labelled value axis with a grid line at every axisStep; the axis normally starts at 0.
 *   axisStart > 0 draws a truncated axis on purpose (Stufe 3 "Diagramme kritisch lesen").
 * - Bars carry no numbers: reading them is the task. The aria-label lists every value so that
 *   screen-reader users get the same information.
 */
import { fmt } from '../../core/format';
import type { VisualOf } from '../../core/types';
import { READABLE, readableStyle, type VisualProps } from './types';
import './BarChartVisual.css';

type BarChart = VisualOf<'barChart'>;

const PAD = 14;
const CHAR = 10; // approx. width of one character at 18 px
const TITLE_H = 34;

function listDe(items: string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} und ${items[items.length - 1]}`;
}

export function barChartLabel(v: BarChart): string {
  const kind = v.horizontal ? 'Balkendiagramm' : 'Säulendiagramm';
  const values = listDe(v.categories.map((c, i) => `${c} ${fmt(v.values[i])}`));
  const start = v.axisStart ?? 0;
  const axis = start > 0 ? ` Achtung: Die Achse beginnt bei ${fmt(start)}, nicht bei 0.` : '';
  const unit = v.valueLabel ? ` ${v.valueLabel}:` : '';
  return `${kind} „${v.title}“.${unit} ${values}.${axis}`;
}

/** Tick values from axisStart to axisMax and how often a label is printed (every k-th tick). */
function ticks(v: BarChart, lengthPx: number, minGap: number) {
  const start = v.axisStart ?? 0;
  const out: number[] = [];
  for (let t = start; t <= v.axisMax + 1e-9; t += v.axisStep) out.push(Math.round(t * 1000) / 1000);
  const spacing = lengthPx / Math.max(1, out.length - 1);
  const every = Math.max(1, Math.ceil(minGap / spacing));
  return { list: out, every };
}

function scale(v: BarChart, value: number, lengthPx: number): number {
  const start = v.axisStart ?? 0;
  const range = Math.max(1e-9, v.axisMax - start);
  const clamped = Math.min(Math.max(value, start), v.axisMax);
  return ((clamped - start) / range) * lengthPx;
}

function Vertical({ v, label, cls }: { v: BarChart; label: string; cls: string }) {
  const plotH = 264;
  // Every grid line gets its number as long as the lines are ≥ 20 px apart (≤ 13 lines).
  const tickInfo = ticks(v, plotH, 20);
  const tickW = Math.max(...tickInfo.list.map((t) => fmt(t).length)) * CHAR + 10;
  const unitH = v.valueLabel ? 28 : 0;
  const plotTop = TITLE_H + unitH + 14;
  const left = PAD + tickW;
  const slot = Math.max(72, Math.max(...v.categories.map((c) => c.length)) * CHAR + 16);
  const plotW = slot * v.categories.length;
  const barW = Math.min(52, slot * 0.6);
  const bottom = plotTop + plotH;
  const width = Math.max(left + plotW + PAD + 6, (v.title.length + 2) * 11 + 2 * PAD);
  const height = bottom + 44 + PAD;
  const y = (value: number) => bottom - scale(v, value, plotH);
  return (
    <svg className={cls} style={readableStyle(width, 0.7)} viewBox={`0 0 ${width} ${height}`} width={width} height={height} role="img" aria-label={label}>
      <text className="bc-title" x={width / 2} y={24} textAnchor="middle">
        {v.title}
      </text>
      {v.valueLabel && (
        <text className="bc-unit" x={PAD} y={TITLE_H + 20}>
          {v.valueLabel}
        </text>
      )}
      {tickInfo.list.map((t, i) => (
        <g key={t}>
          <line className="bc-grid" x1={left} x2={left + plotW} y1={y(t)} y2={y(t)} data-testid="bc-grid" />
          {i % tickInfo.every === 0 && (
            <text className="bc-tick" x={left - 8} y={y(t) + 6} textAnchor="end">
              {fmt(t)}
            </text>
          )}
        </g>
      ))}
      {v.values.map((value, i) => {
        const h = scale(v, value, plotH);
        const x = left + i * slot + (slot - barW) / 2;
        return <rect key={i} className="bc-bar" x={x} y={bottom - h} width={barW} height={h} data-testid="bc-bar" />;
      })}
      <line className="bc-axis" x1={left} x2={left} y1={plotTop - 8} y2={bottom} />
      <line className="bc-axis" x1={left} x2={left + plotW} y1={bottom} y2={bottom} />
      {v.categories.map((c, i) => (
        <text key={c + i} className="bc-cat" x={left + i * slot + slot / 2} y={bottom + 28} textAnchor="middle">
          {c}
        </text>
      ))}
    </svg>
  );
}

function Horizontal({ v, label, cls }: { v: BarChart; label: string; cls: string }) {
  const plotW = 440;
  const tickInfo = ticks(v, plotW, Math.max(...[v.axisMax, v.axisStart ?? 0].map((t) => fmt(t).length)) * CHAR + 8);
  const catW = Math.max(...v.categories.map((c) => c.length)) * CHAR + 14;
  const left = PAD + catW;
  const rowH = 46;
  const barH = 28;
  const plotTop = TITLE_H + 12;
  const plotH = rowH * v.categories.length;
  const bottom = plotTop + plotH;
  const width = Math.max(left + plotW + PAD + 20, (v.title.length + 2) * 11 + 2 * PAD);
  const height = bottom + 34 + (v.valueLabel ? 30 : 0) + PAD;
  const x = (value: number) => left + scale(v, value, plotW);
  return (
    <svg className={cls} style={readableStyle(width, 0.7)} viewBox={`0 0 ${width} ${height}`} width={width} height={height} role="img" aria-label={label}>
      <text className="bc-title" x={width / 2} y={24} textAnchor="middle">
        {v.title}
      </text>
      {tickInfo.list.map((t, i) => (
        <g key={t}>
          <line className="bc-grid" x1={x(t)} x2={x(t)} y1={plotTop} y2={bottom} data-testid="bc-grid" />
          {i % tickInfo.every === 0 && (
            <text className="bc-tick" x={x(t)} y={bottom + 24} textAnchor="middle">
              {fmt(t)}
            </text>
          )}
        </g>
      ))}
      {v.values.map((value, i) => (
        <rect key={i} className="bc-bar" x={left} y={plotTop + i * rowH + (rowH - barH) / 2} width={scale(v, value, plotW)} height={barH} data-testid="bc-bar" />
      ))}
      <line className="bc-axis" x1={left} x2={left} y1={plotTop} y2={bottom} />
      <line className="bc-axis" x1={left} x2={left + plotW + 8} y1={bottom} y2={bottom} />
      {v.categories.map((c, i) => (
        <text key={c + i} className="bc-cat" x={left - 10} y={plotTop + i * rowH + rowH / 2 + 6} textAnchor="end">
          {c}
        </text>
      ))}
      {v.valueLabel && (
        <text className="bc-unit" x={left + plotW / 2} y={bottom + 54} textAnchor="middle">
          {v.valueLabel}
        </text>
      )}
    </svg>
  );
}

export default function BarChartVisual({ visual, print }: VisualProps<BarChart>) {
  const label = barChartLabel(visual);
  const cls = `visual visual-barchart ${READABLE}${print ? ' visual--print' : ''}`;
  return visual.horizontal ? <Horizontal v={visual} label={label} cls={cls} /> : <Vertical v={visual} label={label} cls={cls} />;
}
