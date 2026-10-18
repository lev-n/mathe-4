/**
 * Toggle grid for "Spiegelbild ergänzen" (answer kind 'cells').
 * - A group of aria-pressed buttons (≥ 48 px) with a roving tabindex: arrow keys move, Home/End jump
 *   within a row (Ctrl+Home/End to the first/last cell), Space toggles (native button activation).
 *   Enter means "Prüfen" like in every other input (docs P7): it submits once a cell is painted and never toggles.
 * - Given cells are pre-filled (striped) and aria-disabled. The symmetry axis is drawn as a dashed line.
 * - After a check, extra cells are marked "−" (zu viel) and missing cells "+" (fehlt), with colour,
 *   border style and icon; a short text summary sits below the grid.
 * - reveal: the solution cells are shown with "✓". print: a static grid with only the given half.
 * The response contains only the cells the child switched on (never the given ones).
 */
import { useMemo, useRef, useState, type KeyboardEvent } from 'react';
import type { AnswerOf, Axis, Cell } from '../../core/types';
import GridVisual from '../visuals/GridVisual';
import { describedByIds, type AnswerInputProps } from './types';
import './CellsInput.css';

const k = (x: number, y: number) => `${x},${y}`;
const toSet = (cells: readonly Cell[] | undefined) => new Set((cells ?? []).map((c) => k(c[0], c[1])));

function axisDescription(axis?: Axis): string {
  if (!axis) return '';
  if (axis.orientation === 'vertical') return `Die Spiegelachse liegt senkrecht zwischen Spalte ${axis.at} und ${axis.at + 1}.`;
  if (axis.orientation === 'horizontal') return `Die Spiegelachse liegt waagerecht zwischen Zeile ${axis.at} und ${axis.at + 1}.`;
  return 'Die Spiegelachse geht schräg von oben links nach unten rechts.';
}

function AxisOverlay({ axis, width, height }: { axis: Axis; width: number; height: number }) {
  if (axis.orientation === 'diagonal') {
    return (
      <svg className="cells-axis cells-axis--diagonal" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden="true" focusable="false">
        <line x1={0} y1={0} x2={width} y2={height} vectorEffect="non-scaling-stroke" />
      </svg>
    );
  }
  const pos = `calc(var(--cells-gap) + ${axis.at} * (var(--cells-size) + var(--cells-gap)) - var(--cells-gap) / 2)`;
  return axis.orientation === 'vertical' ? (
    <span className="cells-axis cells-axis--vertical" style={{ left: pos }} aria-hidden="true" data-testid="cells-axis" />
  ) : (
    <span className="cells-axis cells-axis--horizontal" style={{ top: pos }} aria-hidden="true" data-testid="cells-axis" />
  );
}

export default function CellsInput({ answer, response, onChange, onSubmit, disabled, result, reveal, idBase, print, describedBy }: AnswerInputProps<AnswerOf<'cells'>>) {
  const { width, height, given, solution, axis } = answer;
  const givenSet = useMemo(() => toSet(given), [given]);
  const solutionSet = useMemo(() => toSet(solution), [solution]);
  const on = useMemo(() => toSet(response?.kind === 'cells' ? response.cells : []), [response]);
  const firstFree = useMemo<[number, number]>(() => {
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) if (!givenSet.has(k(x, y))) return [x, y];
    return [0, 0];
  }, [width, height, givenSet]);
  const [focusState, setFocus] = useState<[number, number]>(firstFree);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  // a new exercise may have a smaller grid: keep one cell tabbable
  const focus = focusState[0] < width && focusState[1] < height ? focusState : firstFree;

  if (print) {
    return (
      <div className="cells-print">
        <GridVisual visual={{ type: 'grid', width, height, cells: given.slice(), ...(axis ? { axis } : {}) }} print />
      </div>
    );
  }

  const locked = disabled || reveal;
  const showMarks = !!result && !result.correct && !reveal;
  const extra = showMarks ? toSet(result?.extraCells) : new Set<string>();
  const missing = showMarks ? toSet(result?.missingCells) : new Set<string>();
  // marks only while the cell is still in the checked state
  const extraNow = [...extra].filter((c) => on.has(c));
  const missingNow = [...missing].filter((c) => !on.has(c));

  const toggle = (x: number, y: number) => {
    if (locked || givenSet.has(k(x, y))) return;
    const next = new Set(on);
    const key = k(x, y);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    const cells = [...next]
      .map((s) => s.split(',').map(Number) as unknown as Cell)
      .sort((a, b) => a[1] - b[1] || a[0] - b[0]);
    onChange({ kind: 'cells', cells });
  };

  const move = (x: number, y: number) => {
    const nx = Math.max(0, Math.min(width - 1, x));
    const ny = Math.max(0, Math.min(height - 1, y));
    setFocus([nx, ny]);
    refs.current[ny * width + nx]?.focus();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, x: number, y: number) => {
    switch (e.key) {
      case 'ArrowRight': move(x + 1, y); break;
      case 'ArrowLeft': move(x - 1, y); break;
      case 'ArrowDown': move(x, y + 1); break;
      case 'ArrowUp': move(x, y - 1); break;
      case 'Home': if (e.ctrlKey) move(0, 0); else move(0, y); break;
      case 'End': if (e.ctrlKey) move(width - 1, height - 1); else move(width - 1, y); break;
      case 'Enter':
        // Prüfen, not toggle: the native Enter activation would erase the cell the child just painted
        if (!locked && on.size > 0) onSubmit();
        break;
      default: return;
    }
    e.preventDefault();
  };

  const helpId = `${idBase}-cells-help`;
  const summary: string[] = [];
  if (extraNow.length) summary.push(extraNow.length === 1 ? '1 Kästchen ist zu viel (−).' : `${extraNow.length} Kästchen sind zu viel (−).`);
  if (missingNow.length) summary.push(missingNow.length === 1 ? '1 Kästchen fehlt noch (+).' : `${missingNow.length} Kästchen fehlen noch (+).`);

  return (
    <div className="cells-input">
      <p id={helpId} className="cells-help">
        Tippe ein Kästchen an, um es anzumalen. Noch einmal tippen macht es wieder weiß.
        <span className="visually-hidden"> Mit den Pfeiltasten wanderst du durch das Gitter, mit der Leertaste malst du an, mit der Eingabetaste prüfst du. {axisDescription(axis)}</span>
      </p>
      <div className="cells-scroll">
        <div
          className="cells-grid"
          role="group"
          aria-label={`Kästchengitter zum Anmalen, ${width} Spalten und ${height} Zeilen`}
          aria-describedby={describedByIds(describedBy, helpId)}
          style={{ gridTemplateColumns: `repeat(${width}, var(--cells-size))` }}
        >
          {Array.from({ length: height }, (_, y) =>
            Array.from({ length: width }, (_, x) => {
              const key = k(x, y);
              const isGiven = givenSet.has(key);
              const isOn = on.has(key);
              const isSolution = reveal && solutionSet.has(key);
              const isExtra = extra.has(key) && isOn;
              const isMissing = missing.has(key) && !isOn;
              const filled = isGiven || isOn || isSolution;
              const state = isGiven ? ', vorgegeben' : isSolution && !isOn ? ', Lösung' : isOn ? ', angemalt' : '';
              const mark = isExtra ? ', zu viel' : isMissing ? ', fehlt noch' : '';
              const cls = [
                'cells-cell',
                isGiven && 'is-given',
                !isGiven && isOn && 'is-on',
                isSolution && !isGiven && 'is-solution',
                isExtra && 'is-extra',
                isMissing && 'is-missing',
              ].filter(Boolean).join(' ');
              const tabbable = focus[0] === x && focus[1] === y;
              // answer fields (fieldNav.ts): the tab stop, and every marked cell (focus goes to the first after a check)
              const marked = isExtra || isMissing;
              return (
                <button
                  key={key}
                  ref={(el) => {
                    refs.current[y * width + x] = el;
                  }}
                  id={`${idBase}-cell-${x}-${y}`}
                  type="button"
                  className={cls}
                  tabIndex={tabbable ? 0 : -1}
                  aria-pressed={filled}
                  aria-disabled={isGiven || locked ? true : undefined}
                  aria-label={`Kästchen Spalte ${x + 1}, Zeile ${y + 1}${state}${mark}`}
                  data-answer-field={tabbable || marked ? '' : undefined}
                  data-answer-enter={tabbable || marked ? 'self' : undefined}
                  data-answer-empty={tabbable || marked ? String(on.size === 0) : undefined}
                  data-answer-wrong={marked ? '' : undefined}
                  onClick={() => toggle(x, y)}
                  onKeyDown={(e) => onKeyDown(e, x, y)}
                  onFocus={() => setFocus([x, y])}
                >
                  <span className="cells-icon" aria-hidden="true">
                    {isExtra ? '−' : isMissing ? '+' : isSolution && !isGiven && !isOn ? '✓' : ''}
                  </span>
                </button>
              );
            }),
          )}
          {axis && <AxisOverlay axis={axis} width={width} height={height} />}
        </div>
      </div>
      {summary.length > 0 && <p className="cells-summary">{summary.join(' ')}</p>}
    </div>
  );
}
