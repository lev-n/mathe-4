// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { VisualOf } from '../../core/types';
import { writtenVisual } from '../../topics/schriftlich/layout';
import WrittenVisual, { describeWritten } from './WrittenVisual';

afterEach(cleanup);

const v = (spec: Parameters<typeof writtenVisual>[0]) => writtenVisual(spec);

function rowsText(container: HTMLElement): string[] {
  return [...container.querySelectorAll('tr')].map((tr) => [...tr.querySelectorAll('td')].map((td) => td.textContent ?? '').join('|'));
}

describe('WrittenVisual', () => {
  it('renders an addition with carries and a German aria-label', () => {
    const { container, getByRole } = render(<WrittenVisual visual={v({ type: 'written', op: 'add', operands: [4567, 2845], showSolution: true })} />);
    const img = getByRole('img');
    expect(img.getAttribute('aria-label')).toBe('Schriftliche Addition: 4567 plus 2845, Ergebnis 7412. Übertrag 1 bei den Zehnern, 1 bei den Hundertern, 1 bei den Tausendern.');
    const rows = rowsText(container);
    expect(rows[0]).toBe('|4|5|6|7');
    expect(rows[1]).toBe('+|2|8|4|5');
    // carry row: carries into T, H, Z (written small above the line)
    expect(rows[2]).toBe('|1|1|1|');
    expect(rows[3]).toBe('|7|4|1|2');
    expect(container.querySelector('tr.wv-result')).not.toBeNull();
  });

  it('shows Entbündeln marks for Abziehen (crossed digit, new value above)', () => {
    const { container } = render(<WrittenVisual visual={v({ type: 'written', op: 'sub', operands: [805, 328], method: 'abziehen', showSolution: true })} />);
    const rows = rowsText(container);
    expect(rows[0]).toBe('|7|9|15'); // new values
    expect(rows[1]).toBe('|8|0|5');
    expect(rows[2]).toBe('−|3|2|8');
    expect(rows[3]).toBe('|4|7|7');
    expect(container.querySelectorAll('.wv-struck')).toHaveLength(3);
  });

  it('Abziehen: a digit made smaller and then entbündelt shows both stages (4 → 3 → 13)', () => {
    // 743 − 168: Einer 3 → 13; Zehner first 4 → 3 (Entbündeln for the Einer), then 3 → 13; Hunderter 7 → 6
    const { container, getByRole } = render(<WrittenVisual visual={v({ type: 'written', op: 'sub', operands: [743, 168], method: 'abziehen', showSolution: true })} />);
    const rows = rowsText(container);
    expect(rows[0]).toBe('||13|'); // second stage, above the crossed-out 3
    expect(rows[1]).toBe('|6|3|13'); // first stage: the smaller digit (the 3 is crossed out again)
    expect(rows[2]).toBe('|7|4|3');
    expect(rows[3]).toBe('−|1|6|8');
    expect(rows[4]).toBe('|5|7|5');
    const struck = [...container.querySelectorAll('.wv-struck')].map((td) => td.textContent);
    expect(struck).toEqual(['3', '7', '4', '3']); // the small 3, then the whole Minuend
    expect(getByRole('img').getAttribute('aria-label')).toContain('bei den Zehnern: aus 4 wird 3, dann 13');
  });

  it('shows the gemerkte 1 for Ergänzen', () => {
    const { container, getByRole } = render(<WrittenVisual visual={v({ type: 'written', op: 'sub', operands: [652, 237], method: 'ergaenzen', showSolution: true })} />);
    const rows = rowsText(container);
    expect(rows[0]).toBe('|6|5|12'); // extended 1 before the 2
    expect(rows[2]).toBe('||1|'); // gemerkte 1 at the Zehner
    expect(rows[3]).toBe('|4|1|5');
    expect(getByRole('img').getAttribute('aria-label')).toContain('Erweitert bei den Einern');
  });

  it('shows shifted partial products for multiplication', () => {
    const { container } = render(<WrittenVisual visual={v({ type: 'written', op: 'mul', operands: [1254, 37], showSolution: true })} />);
    const rows = rowsText(container);
    expect(rows[0]).toBe('1|2|5|4|·|3|7');
    expect(rows[1]).toBe('||3|7|6|2|'); // 1254 · 3 ends under the 3
    expect(rows[2]).toBe('|||8|7|7|8'); // 1254 · 7 ends under the 7
    expect(rows[rows.length - 1]).toBe('||4|6|3|9|8');
  });

  it('writes the division in one line with the step subtractions below', () => {
    const { container, getByRole } = render(<WrittenVisual visual={v({ type: 'written', op: 'div', operands: [5435, 4], showSolution: true })} />);
    const rows = rowsText(container);
    expect(rows[0].replace(/\|/g, '')).toBe('5435:4=1358R3');
    expect(rows[1].replace(/\|/g, '')).toBe('−4');
    expect(rows[2].replace(/\|/g, '')).toBe('14');
    expect(rows[rows.length - 1].replace(/\|/g, '')).toBe('3');
    expect(getByRole('img').getAttribute('aria-label')).toBe('Schriftliche Division: 5435 geteilt durch 4, Ergebnis 1358 Rest 3.');
  });

  it('shows a planted result, partial products and a highlighted column (Fehlerdetektiv)', () => {
    const visual = v({ type: 'written', op: 'add', operands: [354, 457], showSolution: false, shownResult: 921, highlightColumn: 1 });
    const { container, getByRole } = render(<WrittenVisual visual={visual} />);
    expect(container.querySelector('.wv-marker')?.textContent).toBe('▼');
    const hl = [...container.querySelectorAll('.wv-hl')].map((td) => td.textContent);
    expect(hl).toEqual(['5', '5', '2']);
    expect(getByRole('img').getAttribute('aria-label')).toContain('darunter steht als Ergebnis 921. Markiert sind die Zehner');
  });

  it('multiplication by one digit marks the result digit and the digit of the first factor it comes from', () => {
    // Fehlerdetektiv: 9503 · 5 shown as 55555, the mistake in the Zehner (5 · 0 + Übertrag 1)
    const visual = v({ type: 'written', op: 'mul', operands: [9503, 5], showSolution: false, shownResult: 55555, highlightColumn: 1 });
    const { container } = render(<WrittenVisual visual={visual} />);
    const top = [...container.querySelectorAll('tr.wv-top td')];
    const hlTop = top.filter((td) => td.classList.contains('wv-hl')).map((td) => td.textContent);
    expect(hlTop).toEqual(['0']); // the Zehner digit of 9503, not the '·' or the 5
    const markerCol = [...container.querySelectorAll('tr.wv-marker-row td')].findIndex((td) => td.textContent === '▼');
    expect(top[markerCol].textContent).toBe('0');
    const res = [...container.querySelectorAll('tr.wv-result-plain td')];
    expect(res.filter((td) => td.classList.contains('wv-hl')).map((td) => td.textContent)).toEqual(['5']);
    expect(res.findIndex((td) => td.classList.contains('wv-hl'))).toBe(res.length - 2); // Zehner of the result
  });

  it('describes partial products for screen readers (solution and Fehlerdetektiv)', () => {
    expect(describeWritten(v({ type: 'written', op: 'mul', operands: [1254, 37], showSolution: true }))).toContain(
      'Teilprodukte: 3762, um eine Stelle eingerückt und 8778.',
    );
    const shown = v({
      type: 'written', op: 'mul', operands: [1550, 85], showSolution: false, shownResult: 85550,
      shownPartials: [{ value: 8000, shift: 1 }, { value: 5550, shift: 0 }],
    });
    expect(describeWritten(shown)).toBe(
      'Schriftliche Multiplikation: 1550 mal 85, darunter steht als Ergebnis 85550. Teilprodukte: 8000, um eine Stelle eingerückt und 5550.',
    );
  });

  it('widens the grid for a shown result that is longer than the Minuend', () => {
    const { container } = render(<WrittenVisual visual={v({ type: 'written', op: 'sub', operands: [742, 358], showSolution: false, shownResult: 1100 })} />);
    const rows = rowsText(container);
    expect(rows[rows.length - 1]).toBe('|1|1|0|0');
    expect(rows[0]).toBe('||7|4|2');
  });

  it('draws masks as labelled gaps (Ziffernrätsel)', () => {
    const visual = v({
      type: 'written', op: 'add', operands: [814, 87], showSolution: false, shownResult: 901,
      masks: [{ row: 'operand', index: 0, place: 1, label: 'A' }],
    });
    const { container, getByRole } = render(<WrittenVisual visual={visual} />);
    expect(container.querySelector('.wv-mask')?.textContent).toBe('A');
    expect(getByRole('img').getAttribute('aria-label')).toContain('8 Lücke A 4 plus 87');
  });

  it('supports print mode', () => {
    const { container } = render(<WrittenVisual visual={v({ type: 'written', op: 'mul', operands: [473, 6], showSolution: true })} print />);
    expect(container.querySelector('.written-visual--print')).not.toBeNull();
  });

  it('describes every operation in German without symbols', () => {
    const ops: VisualOf<'written'>[] = [
      v({ type: 'written', op: 'mul', operands: [4738, 6], showSolution: true }),
      v({ type: 'written', op: 'sub', operands: [100000, 43572], method: 'abziehen', showSolution: true }),
    ];
    for (const o of ops) expect(describeWritten(o)).not.toMatch(/[·−×÷]| : /);
  });
});
