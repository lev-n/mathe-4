/**
 * Tabular data as a semantic HTML <table> with caption (screen readers navigate it natively).
 * The first column holds row labels (<th scope="row">) when the table has a header for it and the column
 * holds labels ('Hund', '1 Heft', '1 + 6'). A first column of plain numbers is data (e.g. the 0/1 digits of
 * the Bit-Kärtchen table), unless the header's corner cell is an operator sign (Einmaleins-Tafel).
 * Placeholders '□' / '?' are drawn as empty boxes; numeric cells are right-aligned with tabular digits.
 */
import { BOX } from '../../core/format';
import type { VisualOf } from '../../core/types';
import type { VisualProps } from './types';
import './TableVisual.css';

const NUMERIC = /^[−\-+]?[\d   .,]+(\s?(€|ct|cm|mm|m|km|g|kg|t|ml|l|min|h|s|Stück))?$/;

/** Clock times ('7:48', '14:05 Uhr') line up like numbers in Fahrpläne. */
const CLOCK_TIME = /^\d{1,2}:\d{2}(\s?Uhr)?$/;

export function isNumericCell(text: string): boolean {
  const t = text.trim();
  return NUMERIC.test(t) || CLOCK_TIME.test(t);
}

const isGap = (text: string) => text.trim() === BOX || text.trim() === '?';

/** Corner cell of an operation table ('·', '+' …): the first column then labels the rows. */
const OPERATOR_CORNER = /^[·+−\-:×]$/;

export function hasRowHeaders(header: readonly string[], rows: readonly (readonly string[])[]): boolean {
  if (header.length === 0 || rows.length === 0 || !rows.every((r) => r.length > 1)) return false;
  if (OPERATOR_CORNER.test(header[0].trim())) return true;
  return !rows.every((r) => isNumericCell(r[0] ?? '') || isGap(r[0] ?? ''));
}

function Cell({ text }: { text: string }) {
  if (isGap(text)) {
    return (
      <>
        <span className="table-visual__gap" aria-hidden="true" />
        <span className="visually-hidden">Lücke</span>
      </>
    );
  }
  return <>{text}</>;
}

export default function TableVisual({ visual, print }: VisualProps<VisualOf<'table'>>) {
  const { caption, header, rows } = visual;
  const rowHeaders = hasRowHeaders(header, rows);
  const numericColumn = (i: number) => rows.every((r) => isNumericCell(r[i] ?? '') || isGap(r[i] ?? ''));
  return (
    <div className={`table-visual-wrap${print ? ' table-visual-wrap--print' : ''}`}>
      <table className="table-visual" aria-label={caption ? undefined : 'Tabelle'}>
        {caption && <caption>{caption}</caption>}
        {header.length > 0 && (
          <thead>
            <tr>
              {header.map((h, i) => (
                <th key={i} scope="col" className={(i > 0 || !rowHeaders) && numericColumn(i) ? 'is-num' : undefined}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {rows.map((row, r) => (
            <tr key={r}>
              {row.map((cell, c) =>
                c === 0 && rowHeaders ? (
                  <th key={c} scope="row">
                    <Cell text={cell} />
                  </th>
                ) : (
                  <td key={c} className={isNumericCell(cell) ? 'is-num' : undefined}>
                    <Cell text={cell} />
                  </td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
