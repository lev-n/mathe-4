/**
 * Küchenwaage with a round dial: 0 … maxGrams over a 270° arc, a tick every stepGrams,
 * labels at round values (at most 11) and a pointer with an arrow tip.
 */
import { fmt } from '../../core/format';
import type { VisualOf } from '../../core/types';
import { READABLE, readableStyle, type VisualProps } from './types';
import './ScaleVisual.css';

type Scale = VisualOf<'scale'>;

const SIZE = 360;
const C = SIZE / 2;
/** Inner radius of the tick ring; ticks point outwards, labels sit outside, the pointer stays inside. */
const R = 104;
/** Labels sit between the major ticks (end at R + 18 = 122) and the rim (inner edge 174), with room for 4-digit numbers. */
const LABEL_R = 146;
const SWEEP = 270;
const START = -135;

/** Gram distance between two labelled ticks (a multiple of step, at most 10 intervals). */
export function labelStep(max: number, step: number): number {
  const candidates = [step, 2 * step, 5 * step, 10 * step, 100, 200, 250, 500, 1000, 2000, 5000]
    .filter((c) => c >= step && c % step === 0)
    .sort((a, b) => a - b);
  return candidates.find((c) => max / c <= 10) ?? max;
}

export function scaleLabel(v: Scale): string {
  const step = Math.max(1, v.stepGrams);
  const ls = labelStep(v.maxGrams, step);
  const last = Math.floor(v.grams / ls) * ls;
  const after = (v.grams - last) / step;
  let where: string;
  if (v.grams === 0) where = 'Der Zeiger steht auf 0.';
  else if (after === 0) where = `Der Zeiger zeigt genau auf die Zahl ${fmt(last)}.`;
  else if (Number.isInteger(after)) where = `Der Zeiger steht ${after} ${after === 1 ? 'Strich' : 'Striche'} nach der Zahl ${fmt(last)}.`;
  else where = `Der Zeiger steht zwischen zwei Strichen nach der Zahl ${fmt(last)}.`;
  return `Küchenwaage bis ${fmt(v.maxGrams)} g. Ein Strich bedeutet ${fmt(step)} g. ${where}`;
}

function polar(deg: number, r: number): [number, number] {
  const rad = ((deg - 90) * Math.PI) / 180;
  return [C + r * Math.cos(rad), C + r * Math.sin(rad)];
}

export default function ScaleVisual({ visual, print }: VisualProps<Scale>) {
  const max = Math.max(1, visual.maxGrams);
  const step = Math.max(1, Math.min(max, visual.stepGrams));
  const grams = Math.max(0, Math.min(max, visual.grams));
  const ls = labelStep(max, step);
  const angle = (g: number) => START + (g / max) * SWEEP;
  const ticks = Math.round(max / step);
  const [px, py] = polar(angle(grams), R - 20);
  const [bx1, by1] = polar(angle(grams) - 90, 7);
  const [bx2, by2] = polar(angle(grams) + 90, 7);
  const [tx, ty] = polar(angle(grams), R - 2);
  return (
    <svg
      className={`visual visual-scale ${READABLE}${print ? ' visual--print' : ''}`}
      style={readableStyle(SIZE, 0.72)}
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      width={SIZE}
      height={SIZE}
      role="img"
      aria-label={scaleLabel(visual)}
    >
      <circle className="sc-dial" cx={C} cy={C} r={C - 4} />
      {Array.from({ length: ticks + 1 }, (_, i) => {
        const g = i * step;
        const major = g % ls === 0;
        const [x1, y1] = polar(angle(g), R);
        const [x2, y2] = polar(angle(g), R + (major ? 18 : 9));
        return <line key={i} className={major ? 'sc-tick sc-tick--major' : 'sc-tick'} x1={x1} y1={y1} x2={x2} y2={y2} />;
      })}
      {Array.from({ length: Math.floor(max / ls) + 1 }, (_, i) => {
        const g = i * ls;
        const [x, y] = polar(angle(g), LABEL_R);
        return (
          <text key={i} className="sc-num" x={x} y={y + 6} textAnchor="middle">
            {fmt(g)}
          </text>
        );
      })}
      <text className="sc-unit" x={C} y={C + 64} textAnchor="middle">
        g
      </text>
      <polygon className="sc-pointer" points={`${bx1},${by1} ${tx},${ty} ${bx2},${by2}`} data-testid="scale-pointer" />
      <line className="sc-pointer-line" x1={C} y1={C} x2={px} y2={py} />
      <circle className="sc-center" cx={C} cy={C} r={10} />
    </svg>
  );
}
