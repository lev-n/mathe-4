/**
 * Bilddiagramm: one row per category, each picture stands for `iconValue` (legend below the rows).
 * A remainder of half an iconValue is drawn as the left half of a picture.
 * The aria-label describes the pictures (not the values), so the reading task stays a task.
 */
import { useId, type ReactNode } from 'react';
import { fmt } from '../../core/format';
import type { PictoIcon, VisualOf } from '../../core/types';
import { READABLE, readableStyle, type VisualProps } from './types';
import './PictogramVisual.css';

type Pictogram = VisualOf<'pictogram'>;

const PAD = 14;
const CHAR = 10;
const TITLE_H = 34;
const ICON = 32;
const PITCH = 38;
const ROW_H = 46;

function starPoints(): string {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? 11.5 : 4.8;
    const a = (-90 + i * 36) * (Math.PI / 180);
    pts.push(`${(12 + r * Math.cos(a)).toFixed(2)},${(12.6 + r * Math.sin(a)).toFixed(2)}`);
  }
  return pts.join(' ');
}

function pentagon(r: number): string {
  return Array.from({ length: 5 }, (_, i) => {
    const a = (-90 + i * 72) * (Math.PI / 180);
    return `${(12 + r * Math.cos(a)).toFixed(2)},${(12 + r * Math.sin(a)).toFixed(2)}`;
  }).join(' ');
}

/** Icon shapes in a 24 × 24 box. */
const SHAPES: Record<PictoIcon, ReactNode> = {
  person: (
    <>
      <circle cx={12} cy={6} r={4.5} />
      <path d="M4.5 23 V16.5 A7.5 7.5 0 0 1 19.5 16.5 V23 Z" />
    </>
  ),
  stern: <polygon points={starPoints()} />,
  ball: (
    <>
      <circle cx={12} cy={12} r={10.5} />
      <polygon className="pg-detail" points={pentagon(4)} />
    </>
  ),
  buch: (
    <>
      <rect x={3.5} y={2.5} width={17} height={19} rx={2} />
      <line className="pg-line" x1={7.5} y1={2.5} x2={7.5} y2={21.5} />
      <line className="pg-line" x1={10.5} y1={8} x2={17.5} y2={8} />
      <line className="pg-line" x1={10.5} y1={12} x2={17.5} y2={12} />
    </>
  ),
  apfel: (
    <>
      <path d="M12 7.5 C8 4.5 2.5 6 3 13 C3.5 19 8 22.5 12 20.5 C16 22.5 20.5 19 21 13 C21.5 6 16 4.5 12 7.5 Z" />
      <path className="pg-line" d="M12 7.5 C12 5 12.8 3 14.8 1.8" />
    </>
  ),
  herz: <path d="M12 21.5 C5 16 1.8 12.5 1.8 8.2 A5 5 0 0 1 12 6.4 A5 5 0 0 1 22.2 8.2 C22.2 12.5 19 16 12 21.5 Z" />,
};

const NOUN: Record<PictoIcon, string> = { person: 'Person', stern: 'Stern', ball: 'Ball', buch: 'Buch', apfel: 'Apfel', herz: 'Herz' };

function picturesText(value: number, iconValue: number): string {
  const full = Math.floor(value / iconValue + 1e-9);
  const half = value - full * iconValue > 1e-9;
  const fullText = full === 1 ? '1 Bild' : `${fmt(full)} Bilder`;
  if (full === 0) return half ? 'ein halbes Bild' : 'kein Bild';
  return half ? `${fullText} und ein halbes Bild` : fullText;
}

export function pictogramLabel(v: Pictogram): string {
  const rows = v.categories.map((c, i) => `${c}: ${picturesText(v.values[i], v.iconValue)}`).join('. ');
  const key = v.showKey === false ? `Bild: ${NOUN[v.icon]}, ohne Legende.` : `Ein Bild (${NOUN[v.icon]}) bedeutet ${fmt(v.iconValue)}.`;
  return `Bilddiagramm „${v.title}“. ${key} ${rows}.`;
}

function Icon({ icon, x, y, clipId }: { icon: PictoIcon; x: number; y: number; clipId?: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${ICON / 24})`} className={`pg-icon pg-icon--${icon}`} clipPath={clipId ? `url(#${clipId})` : undefined} data-testid={clipId ? 'pg-half' : 'pg-full'}>
      {SHAPES[icon]}
    </g>
  );
}

export default function PictogramVisual({ visual, print }: VisualProps<Pictogram>) {
  const clipId = `pg-half-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const { title, categories, values, iconValue, icon } = visual;
  const showKey = visual.showKey !== false;
  const catW = Math.max(...categories.map((c) => c.length)) * CHAR + 14;
  const left = PAD + catW + 12;
  const counts = values.map((v) => {
    const full = Math.floor(v / iconValue + 1e-9);
    return { full, half: v - full * iconValue > 1e-9 };
  });
  const maxIcons = Math.max(1, ...counts.map((c) => c.full + (c.half ? 1 : 0)));
  const rowsTop = TITLE_H + 10;
  const rowsBottom = rowsTop + ROW_H * categories.length;
  const legendY = rowsBottom + 18;
  const width = Math.max(left + maxIcons * PITCH + PAD, (title.length + 2) * 11 + 2 * PAD, 200);
  const height = showKey ? legendY + ICON + PAD : rowsBottom + PAD;
  return (
    <svg
      className={`visual visual-pictogram ${READABLE}${print ? ' visual--print' : ''}`}
      style={readableStyle(width, 0.67)}
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      role="img"
      aria-label={pictogramLabel(visual)}
    >
      <defs>
        <clipPath id={clipId}>
          <rect x={0} y={0} width={12} height={24} />
        </clipPath>
      </defs>
      <text className="pg-title" x={width / 2} y={24} textAnchor="middle">
        {title}
      </text>
      {categories.map((c, i) => {
        const y = rowsTop + i * ROW_H;
        return (
          <g key={c + i}>
            <line className="pg-row" x1={PAD} x2={width - PAD} y1={y + ROW_H} y2={y + ROW_H} />
            <text className="pg-cat" x={PAD} y={y + ROW_H / 2 + 6}>
              {c}
            </text>
            {Array.from({ length: counts[i].full }, (_, k) => (
              <Icon key={k} icon={icon} x={left + k * PITCH} y={y + (ROW_H - ICON) / 2} />
            ))}
            {counts[i].half && <Icon icon={icon} x={left + counts[i].full * PITCH} y={y + (ROW_H - ICON) / 2} clipId={clipId} />}
          </g>
        );
      })}
      <line className="pg-sep" x1={left - 8} x2={left - 8} y1={rowsTop} y2={rowsBottom} />
      {showKey && (
      <g className="pg-legend" data-testid="pg-legend">
        <rect className="pg-legend-box" x={PAD} y={legendY - 6} width={ICON + 18 + (fmt(iconValue).length + 2) * CHAR + 12} height={ICON + 12} rx={8} />
        <g transform={`translate(${PAD + 6} ${legendY}) scale(${ICON / 24})`} className={`pg-icon pg-icon--${icon}`}>
          {SHAPES[icon]}
        </g>
        <text className="pg-legend-text" x={PAD + ICON + 14} y={legendY + ICON / 2 + 6}>
          = {fmt(iconValue)}
        </text>
      </g>
      )}
    </svg>
  );
}
