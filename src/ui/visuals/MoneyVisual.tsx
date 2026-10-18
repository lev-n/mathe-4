/**
 * Euro coins and notes (values in Cent), drawn in the given order and wrapped into rows.
 * Every piece carries its value as text, so colour is never the only signal.
 */
import { fmt } from '../../core/format';
import type { VisualOf } from '../../core/types';
import type { VisualProps } from './types';
import './MoneyVisual.css';

type Money = VisualOf<'money'>;

const MAX_W = 520;
const GAP = 10;
const PAD = 8;
const NOTE_W = 120;
const NOTE_H = 64;

/** Coin diameters (big enough for a 16 px label). */
const COIN_D: Record<number, number> = { 1: 44, 2: 46, 5: 50, 10: 48, 20: 52, 50: 56, 100: 54, 200: 60 };

export function isNote(cents: number): boolean {
  return cents >= 500;
}

export function moneyText(cents: number): string {
  return cents >= 100 ? `${fmt(cents / 100)} €` : `${cents} ct`;
}

/** 'Geld: 1 Schein zu 20 Euro, 2 Münzen zu 1 Euro, 1 Münze zu 50 Cent.' (largest value first) */
export function moneyLabel(v: Money): string {
  const counts = new Map<number, number>();
  v.items.forEach((c) => counts.set(c, (counts.get(c) ?? 0) + 1));
  const parts = [...counts.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([c, n]) => {
      const kind = isNote(c) ? (n === 1 ? 'Schein' : 'Scheine') : n === 1 ? 'Münze' : 'Münzen';
      const value = c >= 100 ? `${fmt(c / 100)} Euro` : `${c} Cent`;
      return `${n} ${kind} zu ${value}`;
    });
  return parts.length ? `Geld: ${parts.join(', ')}.` : 'Kein Geld.';
}

function coinClass(c: number): string {
  if (c <= 5) return 'mn-coin mn-coin--copper';
  if (c < 100) return 'mn-coin mn-coin--gold';
  return 'mn-coin mn-coin--euro';
}

interface Placed { cents: number; x: number; y: number; w: number; h: number }

/** Flow layout: left to right, wrap at MAX_W; items in a row are vertically centred. */
function layout(items: number[]): { placed: Placed[]; width: number; height: number } {
  const placed: Placed[] = [];
  let x = PAD;
  let y = PAD;
  let rowH = 0;
  let rowStart = 0;
  let width = 0;
  const finishRow = () => {
    for (let i = rowStart; i < placed.length; i++) placed[i].y = y + (rowH - placed[i].h) / 2;
  };
  for (const cents of items) {
    const w = isNote(cents) ? NOTE_W : (COIN_D[cents] ?? 50);
    const h = isNote(cents) ? NOTE_H : (COIN_D[cents] ?? 50);
    if (x + w > MAX_W - PAD && x > PAD) {
      finishRow();
      y += rowH + GAP;
      x = PAD;
      rowH = 0;
      rowStart = placed.length;
    }
    placed.push({ cents, x, y, w, h });
    x += w + GAP;
    rowH = Math.max(rowH, h);
    width = Math.max(width, x - GAP + PAD);
  }
  finishRow();
  return { placed, width: Math.max(width, 2 * PAD + 10), height: y + rowH + PAD };
}

export default function MoneyVisual({ visual, print }: VisualProps<Money>) {
  const { placed, width, height } = layout(visual.items);
  return (
    <svg
      className={`visual visual-money${print ? ' visual--print' : ''}`}
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      role="img"
      aria-label={moneyLabel(visual)}
    >
      {placed.map((p, i) =>
        isNote(p.cents) ? (
          <g key={i} data-testid="money-note">
            <rect className={`mn-note mn-note--${p.cents / 100}`} x={p.x} y={p.y} width={p.w} height={p.h} rx={6} />
            <rect className="mn-note-inner" x={p.x + 6} y={p.y + 6} width={p.w - 12} height={p.h - 12} rx={4} />
            <rect className="mn-plate" x={p.x + p.w / 2 - 34} y={p.y + p.h / 2 - 15} width={68} height={30} rx={6} />
            <text className="mn-label mn-label--note" x={p.x + p.w / 2} y={p.y + p.h / 2 + 7} textAnchor="middle">
              {moneyText(p.cents)}
            </text>
          </g>
        ) : (
          <g key={i} data-testid="money-coin">
            <circle className={coinClass(p.cents)} cx={p.x + p.w / 2} cy={p.y + p.h / 2} r={p.w / 2} />
            {p.cents >= 100 && <circle className="mn-coin-ring" cx={p.x + p.w / 2} cy={p.y + p.h / 2} r={p.w / 2 - 6} />}
            <text className="mn-label" x={p.x + p.w / 2} y={p.y + p.h / 2 + 6} textAnchor="middle">
              {moneyText(p.cents)}
            </text>
          </g>
        ),
      )}
    </svg>
  );
}
