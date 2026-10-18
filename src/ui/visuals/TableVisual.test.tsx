// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import TableVisual, { hasRowHeaders, isNumericCell } from './TableVisual';

afterEach(cleanup);

describe('TableVisual', () => {
  it('renders a semantic table with caption, column and row headers', () => {
    const { getByRole, getAllByRole } = render(
      <TableVisual visual={{ type: 'table', caption: 'Lieblingstiere', header: ['Tier', 'Anzahl'], rows: [['Hund', '12'], ['Katze', '8']] }} />,
    );
    const table = getByRole('table', { name: 'Lieblingstiere' });
    expect(table.querySelector('caption')!.textContent).toBe('Lieblingstiere');
    expect(getAllByRole('columnheader').map((h) => h.textContent)).toEqual(['Tier', 'Anzahl']);
    expect(getAllByRole('rowheader').map((h) => h.textContent)).toEqual(['Hund', 'Katze']);
    expect(getAllByRole('cell').map((c) => c.textContent)).toEqual(['12', '8']);
    expect(getAllByRole('cell')[0].className).toContain('is-num');
  });

  it('has an accessible name without caption and draws placeholders as boxes', () => {
    const { getByRole, getByText } = render(
      <TableVisual visual={{ type: 'table', header: ['Menge', 'Preis'], rows: [['1', '2,50 €'], ['3', '□']] }} />,
    );
    expect(getByRole('table', { name: 'Tabelle' })).toBeTruthy();
    expect(getByText('Lücke')).toBeTruthy();
  });

  it('a first column of plain digits is data, not row headings (Bit-Kärtchen)', () => {
    const header = ['16 Punkte', '8 Punkte', '4 Punkte', '2 Punkte', '1 Punkt'];
    const { queryAllByRole, getAllByRole } = render(<TableVisual visual={{ type: 'table', header, rows: [['0', '0', '1', '1', '1']] }} />);
    expect(queryAllByRole('rowheader')).toHaveLength(0);
    expect(getAllByRole('cell').map((c) => c.textContent)).toEqual(['0', '0', '1', '1', '1']);
    expect(getAllByRole('columnheader').every((h) => h.className === 'is-num')).toBe(true);
    expect(hasRowHeaders(header, [['0', '0', '1', '1', '1']])).toBe(false);
    expect(hasRowHeaders(['Menge', 'Preis'], [['1 Heft', '0,80 €']])).toBe(true);
    expect(hasRowHeaders(['Aufgabe', 'Ergebnis'], [['1 + 6', '7']])).toBe(true);
    expect(hasRowHeaders(['·', '1', '2'], [['3', '3', '6']])).toBe(true);
  });

  it('detects numeric cells in German notation', () => {
    expect(isNumericCell('345 678')).toBe(true);
    expect(isNumericCell('2,50 €')).toBe(true);
    expect(isNumericCell('12 kg')).toBe(true);
    expect(isNumericCell('Montag')).toBe(false);
  });

  it('treats clock times as numeric cells (Fahrpläne line up)', () => {
    expect(isNumericCell('7:48')).toBe(true);
    expect(isNumericCell('14:05 Uhr')).toBe(true);
    expect(isNumericCell('3 500 : 7')).toBe(false);
  });

  it('supports print mode', () => {
    const { container } = render(<TableVisual visual={{ type: 'table', header: ['a'], rows: [['1']] }} print />);
    expect(container.querySelector('.table-visual-wrap--print')).not.toBeNull();
  });
});
