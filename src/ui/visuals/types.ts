import type { CSSProperties } from 'react';
import type { Visual } from '../../core/types';

/**
 * Contract for every visual renderer (src/ui/visuals/*Visual.tsx):
 * - Hand-written SVG (or semantic HTML for tables), no libraries; `className="visual"` on the root <svg>,
 *   a viewBox and width/height attributes so it scales (max-width 100 %).
 * - Accessible: role="img" + German aria-label describing the content (e.g. 'Säulendiagramm Lieblingsobst:
 *   Äpfel 12, Bananen 8'), or an HTML <table> with caption where the data is tabular.
 * - Colours only from CSS custom properties in src/styles/tokens.css (var(--ink), var(--c-rot) …);
 *   colour is never the only carrier of information (add labels/patterns).
 * - Must render correctly in print (print = true: black/white friendly, no hover/animation).
 * - Text in SVG ≥ 16 px at the default rendered size.
 */
export interface VisualProps<V extends Visual = Visual> {
  visual: V;
  print?: boolean;
}

/** Class for data pictures whose labels have to be read off (charts, ruler, scale, tally, bag). */
export const READABLE = 'visual--readable';

/**
 * Style for a READABLE picture drawn `width` px wide: on narrow screens it keeps at least `minScale` of that
 * size (16–18 px labels stay about 12 px or larger) and scrolls sideways inside its .visual-wrap instead of
 * shrinking further (src/styles/base.css). Without layout (print, worksheets) it changes nothing.
 */
export function readableStyle(width: number, minScale: number): CSSProperties {
  return { '--vw': `${Math.round(width)}px`, '--min-scale': String(minScale) } as CSSProperties;
}
