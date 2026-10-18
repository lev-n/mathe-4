/**
 * Baumdiagramm drawn left to right: a start point, then for every option of level 0 a branch to every
 * option of level 1, and so on (the full tree). The aria-label describes the levels but not the number
 * of ends, so counting the paths stays the task.
 */
import type { VisualOf } from '../../core/types';
import type { VisualProps } from './types';
import './TreeVisual.css';

type Tree = VisualOf<'tree'>;

const PAD = 12;
const LEAF_H = 34;
const BOX_H = 26;
const COL_GAP = 46;
const CHAR = 9.6;

function listDe(items: string[], conj: string): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} ${conj} ${items[items.length - 1]}`;
}

export function treeLabel(v: Tree): string {
  const levels = v.levels.filter((l) => l.length > 0);
  if (levels.length === 0) return 'Leeres Baumdiagramm.';
  const parts = levels.map((l, i) => (i === 0 ? `Zuerst: ${listDe(l, 'oder')}.` : `Danach jeweils: ${listDe(l, 'oder')}.`));
  return `Baumdiagramm. ${parts.join(' ')}`;
}

interface Node {
  depth: number;
  index: number;
  label: string;
  y: number;
}

export function layoutTree(levels: string[][]): { nodes: Node[]; leaves: number } {
  const lens = levels.map((l) => l.length);
  const leaves = lens.reduce((a, b) => a * b, 1);
  const nodes: Node[] = [];
  let count = 1;
  levels.forEach((level, d) => {
    count *= level.length;
    const under = lens.slice(d + 1).reduce((a, b) => a * b, 1);
    for (let k = 0; k < count; k++) {
      nodes.push({ depth: d, index: k, label: level[k % level.length], y: PAD + (k * under + under / 2) * LEAF_H });
    }
  });
  return { nodes, leaves };
}

export default function TreeVisual({ visual, print }: VisualProps<Tree>) {
  const levels = visual.levels.filter((l) => l.length > 0);
  const { nodes, leaves } = layoutTree(levels);
  const height = leaves * LEAF_H + 2 * PAD;
  const rootX = PAD + 8;
  const rootY = PAD + (leaves * LEAF_H) / 2;
  const boxW = levels.map((l) => Math.max(...l.map((s) => s.length)) * CHAR + 18);
  const colX: number[] = [];
  levels.forEach((_, d) => colX.push(d === 0 ? rootX + COL_GAP : colX[d - 1] + boxW[d - 1] + COL_GAP));
  const width = levels.length ? colX[levels.length - 1] + boxW[levels.length - 1] + PAD : 2 * PAD + 16;
  const byKey = new Map(nodes.map((n) => [`${n.depth}:${n.index}`, n]));
  return (
    <svg className={`visual visual-tree${print ? ' visual--print' : ''}`} viewBox={`0 0 ${width} ${height}`} width={width} height={height} role="img" aria-label={treeLabel(visual)}>
      {nodes.map((n) => {
        const parent = n.depth === 0 ? null : byKey.get(`${n.depth - 1}:${Math.floor(n.index / levels[n.depth].length)}`)!;
        const x1 = parent ? colX[parent.depth] + boxW[parent.depth] : rootX;
        const y1 = parent ? parent.y : rootY;
        return <line key={`e${n.depth}:${n.index}`} className="tr-edge" x1={x1} y1={y1} x2={colX[n.depth]} y2={n.y} />;
      })}
      <circle className="tr-root" cx={rootX} cy={rootY} r={6} />
      {nodes.map((n) => (
        <g key={`n${n.depth}:${n.index}`} data-testid={n.depth === levels.length - 1 ? 'tr-leaf' : 'tr-node'}>
          <rect className="tr-box" x={colX[n.depth]} y={n.y - BOX_H / 2} width={boxW[n.depth]} height={BOX_H} rx={6} />
          <text className="tr-text" x={colX[n.depth] + boxW[n.depth] / 2} y={n.y + 6} textAnchor="middle">
            {n.label}
          </text>
        </g>
      ))}
    </svg>
  );
}
