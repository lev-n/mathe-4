import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync(new URL('./NumberLineInput.css', import.meta.url), 'utf8');

describe('NumberLineInput.css', () => {
  it('the size container around the slider has an explicit width (otherwise the line collapses to 0 px)', () => {
    const rule = /\.nl-input__scroll\s*\{([^}]*)\}/.exec(css)?.[1] ?? '';
    expect(rule).toMatch(/container-type:\s*inline-size/);
    expect(rule).toMatch(/width:\s*100%/);
  });
});
