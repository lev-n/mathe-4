/**
 * Facts about the ebene Figuren as drawn by ShapeVisual (Sechseck and Achteck are regular,
 * Trapez is gleichschenklig, Dreieck is a general triangle without equal sides).
 */
import type { ShapeKind } from '../../core/types';

export interface ShapeFacts {
  kind: ShapeKind;
  /** 'das Quadrat' */
  nom: string;
  /** 'ein Quadrat' */
  ein: string;
  name: string;
  ecken: number;
  /** Number of symmetry axes (Infinity for the circle). */
  axes: number;
  rechteWinkel: number;
  /** Pairs of parallel sides. */
  parallelPaare: number;
  gleicheSeiten: boolean;
}

export const SHAPES: Record<ShapeKind, ShapeFacts> = {
  quadrat: { kind: 'quadrat', nom: 'das Quadrat', ein: 'ein Quadrat', name: 'Quadrat', ecken: 4, axes: 4, rechteWinkel: 4, parallelPaare: 2, gleicheSeiten: true },
  rechteck: { kind: 'rechteck', nom: 'das Rechteck', ein: 'ein Rechteck', name: 'Rechteck', ecken: 4, axes: 2, rechteWinkel: 4, parallelPaare: 2, gleicheSeiten: false },
  dreieck: { kind: 'dreieck', nom: 'das Dreieck', ein: 'ein Dreieck', name: 'Dreieck', ecken: 3, axes: 0, rechteWinkel: 0, parallelPaare: 0, gleicheSeiten: false },
  'gleichseitiges-dreieck': { kind: 'gleichseitiges-dreieck', nom: 'das gleichseitige Dreieck', ein: 'ein gleichseitiges Dreieck', name: 'Gleichseitiges Dreieck', ecken: 3, axes: 3, rechteWinkel: 0, parallelPaare: 0, gleicheSeiten: true },
  kreis: { kind: 'kreis', nom: 'der Kreis', ein: 'ein Kreis', name: 'Kreis', ecken: 0, axes: Infinity, rechteWinkel: 0, parallelPaare: 0, gleicheSeiten: false },
  sechseck: { kind: 'sechseck', nom: 'das Sechseck', ein: 'ein Sechseck', name: 'Sechseck', ecken: 6, axes: 6, rechteWinkel: 0, parallelPaare: 3, gleicheSeiten: true },
  achteck: { kind: 'achteck', nom: 'das Achteck', ein: 'ein Achteck', name: 'Achteck', ecken: 8, axes: 8, rechteWinkel: 0, parallelPaare: 4, gleicheSeiten: true },
  parallelogramm: { kind: 'parallelogramm', nom: 'das Parallelogramm', ein: 'ein Parallelogramm', name: 'Parallelogramm', ecken: 4, axes: 0, rechteWinkel: 0, parallelPaare: 2, gleicheSeiten: false },
  trapez: { kind: 'trapez', nom: 'das Trapez', ein: 'ein Trapez', name: 'Trapez', ecken: 4, axes: 1, rechteWinkel: 0, parallelPaare: 1, gleicheSeiten: false },
  raute: { kind: 'raute', nom: 'die Raute', ein: 'eine Raute', name: 'Raute', ecken: 4, axes: 2, rechteWinkel: 0, parallelPaare: 2, gleicheSeiten: true },
};
