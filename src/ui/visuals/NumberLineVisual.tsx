/**
 * Zahlenstrahl: base line with an arrow, short ticks every minorStep, long ticks every majorStep,
 * labels at every major tick (labelMajor) plus explicit labels, and marks (arrows with a letter/text).
 * Labels that would overlap are staggered on a second row. Hand-written SVG.
 *
 * NumberLineAxis and the geometry helpers are shared with src/ui/answers/NumberLineInput.tsx.
 */
import { useEffect, useRef, type CSSProperties } from 'react';
import { fmt } from '../../core/format';
import type { VisualOf } from '../../core/types';
import type { VisualProps } from './types';
import './NumberLineVisual.css';

export interface AxisSpec {
  min: number;
  max: number;
  majorStep: number;
  minorStep: number;
  labelMajor: boolean;
  labels?: number[];
}

/**
 * Geometry (viewBox units = px at the default size). On screen the line is never drawn narrower than
 * NL_MIN_WIDTH px (labels stay ≥ 15 px, ticks stay tappable); narrower containers scroll it sideways (.nl-scroll).
 */
export const NL = { W: 640, PAD: 52, Y: 74, FONT: 18 } as const;
export const NL_MIN_WIDTH = 560;
/** Inline style for an .nl-scroll wrapper (the CSS reads the minimum width from this custom property). */
export const nlScrollStyle = { '--nl-min-width': `${NL_MIN_WIDTH}px` } as CSSProperties;

export function xScale(min: number, max: number): (v: number) => number {
  return (v) => NL.PAD + ((v - min) / (max - min)) * (NL.W - 2 * NL.PAD);
}

/** min, min + step, … max (integer steps, no floating drift). */
export function tickValues(min: number, max: number, step: number): number[] {
  const count = Math.round((max - min) / step);
  return Array.from({ length: count + 1 }, (_, i) => min + i * step).filter((v) => v <= max + 1e-9);
}

export function labelValues(a: AxisSpec): number[] {
  const set = new Set<number>((a.labels ?? []).filter((v) => v >= a.min && v <= a.max));
  if (a.labelMajor) tickValues(a.min, a.max, a.majorStep).forEach((v) => set.add(v));
  return [...set].sort((x, y) => x - y);
}

const textWidth = (s: string) => s.length * NL.FONT * 0.58 + 8;

/** Place labels on up to two rows so they never overlap; labels that do not fit are left out. */
export function layoutLabels(a: AxisSpec): { value: number; x: number; row: 0 | 1 }[] {
  const xOf = xScale(a.min, a.max);
  const explicit = new Set(a.labels ?? []);
  const lastRight: [number, number] = [-Infinity, -Infinity];
  const out: { value: number; x: number; row: 0 | 1 }[] = [];
  for (const value of labelValues(a)) {
    const x = xOf(value);
    const w = textWidth(fmt(value));
    const left = x - w / 2;
    let row: 0 | 1 | null = left >= lastRight[0] ? 0 : left >= lastRight[1] ? 1 : null;
    if (row === null && explicit.has(value)) row = 1;
    if (row === null) continue;
    lastRight[row] = x + w / 2;
    out.push({ value, x, row });
  }
  return out;
}

/** Height of the drawing for an axis (taller when labels are staggered). */
export function axisHeight(a: AxisSpec): number {
  return NL.Y + (layoutLabels(a).some((l) => l.row === 1) ? 74 : 52);
}

export function NumberLineAxis({ axis, print }: { axis: AxisSpec; print?: boolean }) {
  const xOf = xScale(axis.min, axis.max);
  const majors = new Set(tickValues(axis.min, axis.max, axis.majorStep));
  const ink = 'var(--ink)';
  const x0 = xOf(axis.min);
  const x1 = xOf(axis.max);
  return (
    <g data-testid="numberline-axis">
      <line x1={x0 - 10} y1={NL.Y} x2={x1 + 22} y2={NL.Y} style={{ stroke: ink, strokeWidth: 2.5 }} />
      <polygon points={`${x1 + 32},${NL.Y} ${x1 + 20},${NL.Y - 7} ${x1 + 20},${NL.Y + 7}`} style={{ fill: ink }} />
      {tickValues(axis.min, axis.max, axis.minorStep).map((v) => {
        const major = majors.has(v);
        const h = major ? 15 : 8;
        return <line key={v} x1={xOf(v)} y1={NL.Y - h} x2={xOf(v)} y2={NL.Y + h} data-tick={major ? 'major' : 'minor'} style={{ stroke: ink, strokeWidth: major ? 2.5 : 1.5 }} />;
      })}
      {layoutLabels(axis).map((l) => (
        <text
          key={l.value}
          x={l.x}
          y={NL.Y + (l.row === 0 ? 40 : 62)}
          textAnchor="middle"
          data-label={l.value}
          style={{ fill: print ? ink : 'var(--text)', fontSize: NL.FONT, fontVariantNumeric: 'tabular-nums' }}
        >
          {fmt(l.value)}
        </text>
      ))}
    </g>
  );
}

// ─── Accessible description ──────────────────────────────────────────────────

const plural = (k: number, one: string, many: string) => `${k} ${k === 1 ? one : many}`;

/** Where a mark is, in tick counts from the nearest label on its left (never its value). */
export function describeMarkPosition(a: AxisSpec, value: number): string {
  const labels = labelValues(a);
  const ref = [...labels].reverse().find((x) => x <= value) ?? a.min;
  const d = value - ref;
  if (d === 0) return `genau bei ${ref}`;
  const onTick = Math.abs(d / a.minorStep - Math.round(d / a.minorStep)) < 1e-9;
  if (!onTick) {
    const idx = Math.floor((value - a.min) / a.majorStep);
    const f = (value - a.min - idx * a.majorStep) / a.majorStep;
    const where = f < 0.5 ? 'näher am linken Strich' : f > 0.5 ? 'näher am rechten Strich' : 'in der Mitte';
    return `im ${idx + 1}. Abschnitt von links, ${where}`;
  }
  if (a.majorStep === a.minorStep) return `${plural(Math.round(d / a.minorStep), 'Strich', 'Striche')} rechts von ${ref}`;
  const big = Math.floor(d / a.majorStep);
  const small = Math.round((d - big * a.majorStep) / a.minorStep);
  const bits = [big > 0 ? plural(big, 'langen Abschnitt', 'lange Abschnitte') : '', small > 0 ? plural(small, 'kleinen Abschnitt', 'kleine Abschnitte') : ''].filter(Boolean);
  return `${bits.join(' und ')} rechts von ${ref}`;
}

export function numberLineAriaLabel(v: VisualOf<'numberLine'>): string {
  const majors = Math.round((v.max - v.min) / v.majorStep);
  const perMajor = Math.round(v.majorStep / v.minorStep);
  const parts = [`Zahlenstrahl von ${v.min} bis ${v.max}.`];
  parts.push(
    perMajor > 1
      ? `Lange Striche teilen ihn in ${majors} Abschnitte. Jeder Abschnitt hat ${perMajor} kleine Abschnitte.`
      : `Striche teilen ihn in ${majors} gleiche Abschnitte.`,
  );
  const shown = layoutLabels(v).map((l) => l.value);
  if (shown.length) parts.push(`Beschriftet: ${shown.join(', ')}.`);
  for (const m of v.marks ?? []) parts.push(`Pfeil ${m.label.replace(/\u202F/g, '')}: ${describeMarkPosition(v, m.value)}.`);
  return parts.join(' ');
}

export default function NumberLineVisual({ visual, print }: VisualProps<VisualOf<'numberLine'>>) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const firstMark = visual.marks?.length ? Math.min(...visual.marks.map((m) => m.value)) : null;
  // A line that scrolls sideways on a narrow screen starts with the first arrow in view (not cut off).
  useEffect(() => {
    const box = scrollRef.current;
    if (!box || firstMark === null || box.scrollWidth <= box.clientWidth + 1) return;
    const svgWidth = box.firstElementChild?.getBoundingClientRect().width ?? 0;
    if (svgWidth <= 0) return;
    const px = (xScale(visual.min, visual.max)(firstMark) / NL.W) * svgWidth;
    if (px > box.clientWidth - 48) box.scrollLeft = Math.max(0, px - box.clientWidth / 2);
  }, [firstMark, visual.min, visual.max]);
  // Without arrows, the empty band above the line (room for arrow labels) is cropped: on phones that space
  // is needed to keep the task, the answer field and the Ziffernblock on screen together.
  const top = visual.marks?.length ? 0 : NL.Y - 26;
  const H = axisHeight(visual) - top;
  const xOf = xScale(visual.min, visual.max);
  const markColour = print ? 'var(--ink)' : 'var(--topic-zahlen)';
  const svg = (
    <svg
      className="visual visual-numberline"
      viewBox={`0 ${top} ${NL.W} ${H}`}
      width={NL.W}
      height={H}
      role="img"
      aria-label={numberLineAriaLabel(visual)}
    >
      <NumberLineAxis axis={visual} print={print} />
      {(visual.marks ?? []).map((m) => {
        const x = xOf(m.value);
        return (
          <g key={`${m.value}-${m.label}`} data-mark={m.label}>
            <line x1={x} y1={NL.Y - 50} x2={x} y2={NL.Y - 12} style={{ stroke: markColour, strokeWidth: 3 }} />
            <polygon points={`${x},${NL.Y - 3} ${x - 7},${NL.Y - 15} ${x + 7},${NL.Y - 15}`} style={{ fill: markColour }} />
            <text x={x} y={NL.Y - 56} textAnchor="middle" style={{ fill: print ? 'var(--ink)' : 'var(--text)', fontSize: 20, fontWeight: 700 }}>
              {m.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
  // On paper the line fits the page; on screen a narrow container scrolls it instead of shrinking the labels.
  return print ? svg : (
    <div className="nl-scroll" style={nlScrollStyle} ref={scrollRef}>
      {svg}
    </div>
  );
}
