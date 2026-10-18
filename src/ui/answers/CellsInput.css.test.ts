import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync(new URL('./CellsInput.css', import.meta.url), 'utf8');

describe('CellsInput.css', () => {
  it('hover tints only apply to real pointers (on touch screens :hover sticks and a switched-off cell looks half painted)', () => {
    const at = css.indexOf('@media (hover: hover)');
    expect(at).toBeGreaterThan(0);
    expect(css.slice(0, at)).not.toMatch(/:hover/);
    // nothing after the media block either
    const block = css.slice(at);
    const end = block.indexOf('\n}\n');
    expect(block.slice(end)).not.toMatch(/:hover/);
  });
});
