/**
 * Ebene Figuren with optional dashed symmetry axes. Sechseck and Achteck are regular, the Trapez is
 * gleichschenklig, the Dreieck has three different side lengths, the Parallelogramm has clearly
 * different side lengths (so it cannot be mistaken for a Raute). The aria-label describes the figure
 * by its properties (not by its name, so naming tasks stay tasks).
 */
import type { ShapeKind, VisualOf } from '../../core/types';
import type { VisualProps } from './types';

const W = 200;
const H = 160;
const CX = 100;
const CY = 80;

type P = [number, number];

function regular(n: number, r: number, rotDeg: number): P[] {
  return Array.from({ length: n }, (_, i) => {
    const a = ((rotDeg + (360 / n) * i) * Math.PI) / 180;
    return [Math.round((CX + r * Math.cos(a)) * 10) / 10, Math.round((CY + r * Math.sin(a)) * 10) / 10] as P;
  });
}

const POLYGONS: Record<Exclude<ShapeKind, 'kreis'>, P[]> = {
  quadrat: [[45, 25], [155, 25], [155, 135], [45, 135]],
  rechteck: [[20, 40], [180, 40], [180, 125], [20, 125]],
  dreieck: [[20, 140], [180, 140], [50, 30]],
  'gleichseitiges-dreieck': [[25, 142], [175, 142], [100, 12.1]],
  sechseck: regular(6, 70, 0),
  achteck: regular(8, 72, 22.5),
  // clearly not a Raute: long sides 140, slanted sides ≈ 81 (a near-rhombic drawing made 'Raute' a second plausible name)
  parallelogramm: [[10, 115], [150, 115], [190, 45], [50, 45]],
  trapez: [[15, 130], [185, 130], [140, 35], [60, 35]],
  raute: [[100, 10], [165, 80], [100, 150], [35, 80]],
};

const mid = (a: P, b: P): P => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];

/** Symmetry axes as line segments (extended a little beyond the figure). */
function axes(shape: ShapeKind): [P, P][] {
  const ext = (a: P, b: P, k = 0.18): [P, P] => {
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    return [[a[0] - dx * k, a[1] - dy * k], [b[0] + dx * k, b[1] + dy * k]];
  };
  switch (shape) {
    case 'quadrat': {
      const [a, b, c, d] = POLYGONS.quadrat;
      return [ext(mid(a, b), mid(d, c)), ext(mid(a, d), mid(b, c)), ext(a, c, 0.1), ext(b, d, 0.1)];
    }
    case 'rechteck': {
      const [a, b, c, d] = POLYGONS.rechteck;
      return [ext(mid(a, b), mid(d, c)), ext(mid(a, d), mid(b, c), 0.06)];
    }
    case 'gleichseitiges-dreieck': {
      const [a, b, c] = POLYGONS['gleichseitiges-dreieck'];
      return [ext(c, mid(a, b), 0.08), ext(a, mid(b, c), 0.08), ext(b, mid(a, c), 0.08)];
    }
    case 'raute': {
      const [a, b, c, d] = POLYGONS.raute;
      return [ext(a, c, 0.05), ext(d, b, 0.12)];
    }
    case 'trapez': {
      const [a, b, c, d] = POLYGONS.trapez;
      return [ext(mid(d, c), mid(a, b), 0.12)];
    }
    case 'sechseck':
    case 'achteck': {
      const p = POLYGONS[shape];
      const n = p.length;
      const out: [P, P][] = [];
      for (let i = 0; i < n / 2; i++) {
        out.push(ext(p[i], p[i + n / 2], 0.08));
        out.push(ext(mid(p[i], p[i + 1]), mid(p[i + n / 2], p[(i + n / 2 + 1) % n]), 0.1));
      }
      return out;
    }
    case 'kreis':
      return [0, 45, 90, 135].map((deg) => {
        const a = (deg * Math.PI) / 180;
        const r = 78;
        return [[CX - r * Math.cos(a), CY - r * Math.sin(a)], [CX + r * Math.cos(a), CY + r * Math.sin(a)]] as [P, P];
      });
    default:
      return [];
  }
}

const DESCRIPTION: Record<ShapeKind, string> = {
  quadrat: '4 Ecken, 4 gleich lange Seiten und 4 rechte Winkel',
  rechteck: '4 Ecken und 4 rechte Winkel, zwei lange und zwei kurze Seiten',
  dreieck: '3 Ecken, alle Seiten sind verschieden lang',
  'gleichseitiges-dreieck': '3 Ecken und 3 gleich lange Seiten',
  kreis: 'ganz rund, ohne Ecken',
  sechseck: '6 Ecken und 6 gleich lange Seiten',
  achteck: '8 Ecken und 8 gleich lange Seiten',
  parallelogramm: '4 Ecken, schief, gegenüberliegende Seiten sind parallel und gleich lang',
  trapez: '4 Ecken, die obere und die untere Seite sind parallel, oben ist sie kürzer',
  raute: '4 Ecken, 4 gleich lange Seiten, schief',
};

export function shapeAriaLabel(shape: ShapeKind, showAxes?: boolean): string {
  let text = `Flache Figur: ${DESCRIPTION[shape]}.`;
  if (showAxes) {
    const n = axes(shape).length;
    if (shape === 'kreis') text += ' Gestrichelt sind einige Symmetrieachsen durch den Mittelpunkt eingezeichnet.';
    else if (n === 0) text += ' Die Figur hat keine Symmetrieachse.';
    else text += ` Gestrichelt ${n === 1 ? 'ist 1 Symmetrieachse' : `sind ${n} Symmetrieachsen`} eingezeichnet.`;
  }
  return text;
}

export default function ShapeVisual({ visual, print }: VisualProps<VisualOf<'shape'>>) {
  const { shape, showAxes } = visual;
  const style = {
    fill: print ? 'var(--surface)' : 'var(--fill-1)',
    stroke: 'var(--ink)',
    strokeWidth: 3,
    strokeLinejoin: 'round' as const,
  };
  return (
    <svg className="visual visual-shape" viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" aria-label={shapeAriaLabel(shape, showAxes)} data-shape={shape}>
      {shape === 'kreis' ? (
        <circle cx={CX} cy={CY} r={66} style={style} />
      ) : (
        <polygon points={POLYGONS[shape].map(([x, y]) => `${x},${y}`).join(' ')} style={style} />
      )}
      {showAxes &&
        axes(shape).map(([a, b], i) => (
          <line
            key={i}
            x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]}
            style={{ stroke: print ? 'var(--ink)' : 'var(--focus)', strokeWidth: 2.5, strokeDasharray: '8 6', strokeLinecap: 'round' }}
            data-testid="shape-axis"
          />
        ))}
    </svg>
  );
}
