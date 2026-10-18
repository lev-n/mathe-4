/**
 * Würfelgebäude. heights[row][col] = cubes stacked on a field; row 0 = hinten, last row = vorne.
 * - 'iso': oblique drawing seen from vorne-rechts-oben (front, top and right faces visible), floor tiles for
 *   every field, "vorne" written below.
 * - 'plan': Bauplan (top view with numbers), "hinten" above, "vorne" below.
 * - 'front' / 'side' / 'top': orthographic views (Ansicht von vorne, von rechts, von oben).
 *   'side' is seen from the right: the front row appears on the left.
 */
import type { ReactElement } from 'react';
import type { VisualOf } from '../../core/types';
import type { VisualProps } from './types';

type Heights = number[][];

const S = 36; // cube edge in the drawing
const DX = 18; // depth offset per row (to the right)
const DY = 13; // depth offset per row (upwards)
const PAD = 8;
const LABEL_H = 26;

const rowWord = (R: number, r: number) => (R === 1 ? 'Reihe' : r === 0 ? 'hinten' : r === R - 1 ? 'vorne' : 'Mitte');

function speakRows(h: Heights): string {
  return h.map((row, r) => `${rowWord(h.length, r)} von links: ${row.join(', ')}`).join('; ');
}

export function frontSilhouette(h: Heights): number[] {
  return h[0].map((_, c) => Math.max(0, ...h.map((row) => row[c])));
}
export function sideSilhouette(h: Heights): number[] {
  return h.map((row) => Math.max(0, ...row)).reverse();
}

export function cubeBuildingAriaLabel(v: VisualOf<'cubeBuilding'>): string {
  const h = v.heights;
  switch (v.view) {
    case 'iso':
      return `Würfelgebäude, schräg von vorne gezeichnet. Turmhöhen: ${speakRows(h)}.`;
    case 'plan':
      return `Bauplan von oben, vorne ist unten. Die Zahlen sind Turmhöhen: ${speakRows(h)}. Ein leeres Feld heißt: kein Würfel.`;
    case 'front':
      return `Ansicht von vorne: Spalten mit ${frontSilhouette(h).join(', ')} Würfeln übereinander, von links nach rechts.`;
    case 'side':
      return `Ansicht von rechts: Spalten mit ${sideSilhouette(h).join(', ')} Würfeln übereinander, von vorne nach hinten.`;
    case 'top':
      return `Ansicht von oben, vorne ist unten. Belegte Felder: ${h
        .map((row, r) => `${rowWord(h.length, r)}: ${row.map((x) => (x > 0 ? 'belegt' : 'leer')).join(', ')}`)
        .join('; ')}.`;
  }
}

function IsoView({ h, print }: { h: Heights; print?: boolean }) {
  const R = h.length;
  const C = h[0].length;
  const maxH = Math.max(1, ...h.flat());
  const W = C * S + R * DX + 2 * PAD;
  const baseY = PAD + R * DY + maxH * S; // ground line of the front row
  const Hh = baseY + PAD + LABEL_H;
  const corner = (r: number, c: number, z: number): [number, number] => {
    const d = R - 1 - r;
    return [PAD + c * S + d * DX, baseY - z * S - d * DY];
  };
  const p = (pts: [number, number][]) => pts.map(([x, y]) => `${x},${y}`).join(' ');
  const tone = (t: 'front' | 'top' | 'side') => (print ? 'var(--surface)' : t === 'front' ? 'var(--fill-1)' : t === 'top' ? 'var(--primary-soft)' : 'var(--fill-hidden)');
  const stroke = { stroke: 'var(--ink)', strokeWidth: 1.8, strokeLinejoin: 'round' as const };
  const floor: ReactElement[] = [];
  const cubes: ReactElement[] = [];
  for (let r = 0; r < R; r++) {
    for (let c = 0; c < C; c++) {
      const [x, y] = corner(r, c, 0);
      floor.push(
        <polygon
          key={`f${r},${c}`}
          points={p([[x, y], [x + S, y], [x + S + DX, y - DY], [x + DX, y - DY]])}
          style={{ fill: print ? 'var(--surface)' : 'var(--surface-2)', stroke: 'var(--grid-line)', strokeWidth: 1 }}
        />,
      );
    }
  }
  // painter's order: back to front, left to right, bottom to top
  for (let r = 0; r < R; r++) {
    for (let c = 0; c < C; c++) {
      for (let z = 0; z < h[r][c]; z++) {
        const [x, y] = corner(r, c, z);
        cubes.push(
          <g key={`c${r},${c},${z}`} data-cube={`${r},${c},${z}`}>
            <polygon points={p([[x, y - S], [x + S, y - S], [x + S + DX, y - S - DY], [x + DX, y - S - DY]])} style={{ fill: tone('top'), ...stroke }} />
            <polygon points={p([[x + S, y], [x + S + DX, y - DY], [x + S + DX, y - S - DY], [x + S, y - S]])} style={{ fill: tone('side'), ...stroke }} />
            <rect x={x} y={y - S} width={S} height={S} style={{ fill: tone('front'), ...stroke }} />
          </g>,
        );
      }
    }
  }
  return (
    <svg className="visual visual-cubes" viewBox={`0 0 ${W} ${Hh}`} width={W} height={Hh} role="img" aria-label={cubeBuildingAriaLabel({ type: 'cubeBuilding', heights: h, view: 'iso' })}>
      {floor}
      {cubes}
      <text x={PAD + (C * S) / 2} y={baseY + 20} textAnchor="middle" style={{ fill: 'var(--text-muted)', fontSize: 16 }}>
        vorne
      </text>
    </svg>
  );
}

function PlanView({ h, top, print }: { h: Heights; top?: boolean; print?: boolean }) {
  const R = h.length;
  const C = h[0].length;
  const CELL = 48;
  const W = C * CELL + 2 * PAD;
  const Hh = R * CELL + 2 * PAD + 2 * LABEL_H;
  const y0 = PAD + LABEL_H;
  return (
    <svg
      className="visual visual-cubes"
      viewBox={`0 0 ${W} ${Hh}`}
      width={W}
      height={Hh}
      role="img"
      aria-label={cubeBuildingAriaLabel({ type: 'cubeBuilding', heights: h, view: top ? 'top' : 'plan' })}
    >
      <text x={W / 2} y={PAD + 16} textAnchor="middle" style={{ fill: 'var(--text-muted)', fontSize: 16 }}>
        hinten
      </text>
      {h.map((row, r) =>
        row.map((v, c) => {
          const x = PAD + c * CELL;
          const y = y0 + r * CELL;
          const filled = top && v > 0;
          return (
            <g key={`${r},${c}`}>
              <rect
                x={x} y={y} width={CELL} height={CELL}
                style={{ fill: filled ? (print ? 'var(--fill-hidden)' : 'var(--fill-1)') : 'var(--surface)', stroke: 'var(--ink)', strokeWidth: 2 }}
              />
              {!top && v > 0 && (
                <text x={x + CELL / 2} y={y + CELL / 2} textAnchor="middle" dominantBaseline="central" style={{ fill: 'var(--text)', fontSize: 26, fontWeight: 700 }}>
                  {v}
                </text>
              )}
            </g>
          );
        }),
      )}
      <text x={W / 2} y={y0 + R * CELL + 20} textAnchor="middle" style={{ fill: 'var(--text-muted)', fontSize: 16 }}>
        vorne
      </text>
    </svg>
  );
}

function SilhouetteView({ cols, label, print }: { cols: number[]; label: string; print?: boolean }) {
  const SQ = 30;
  const maxH = Math.max(1, ...cols);
  const W = cols.length * SQ + 2 * PAD;
  const Hh = maxH * SQ + 2 * PAD + 4;
  const ground = PAD + maxH * SQ;
  return (
    <svg className="visual visual-cubes" viewBox={`0 0 ${W} ${Hh}`} width={W} height={Hh} role="img" aria-label={label}>
      {cols.map((n, c) =>
        Array.from({ length: n }, (_, z) => (
          <rect
            key={`${c},${z}`}
            x={PAD + c * SQ} y={ground - (z + 1) * SQ} width={SQ} height={SQ}
            style={{ fill: print ? 'var(--surface)' : 'var(--fill-1)', stroke: 'var(--ink)', strokeWidth: 2 }}
          />
        )),
      )}
      <line x1={PAD - 4} y1={ground} x2={PAD + cols.length * SQ + 4} y2={ground} style={{ stroke: 'var(--ink)', strokeWidth: 3 }} />
    </svg>
  );
}

export default function CubeBuildingVisual({ visual, print }: VisualProps<VisualOf<'cubeBuilding'>>) {
  const h = visual.heights;
  switch (visual.view) {
    case 'iso':
      return <IsoView h={h} print={print} />;
    case 'plan':
      return <PlanView h={h} print={print} />;
    case 'top':
      return <PlanView h={h} top print={print} />;
    case 'front':
      return <SilhouetteView cols={frontSilhouette(h)} label={cubeBuildingAriaLabel(visual)} print={print} />;
    case 'side':
      return <SilhouetteView cols={sideSilhouette(h)} label={cubeBuildingAriaLabel(visual)} print={print} />;
  }
}
