import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * On touch screens :hover sticks to the last tapped element, so a button or answer option keeps a
 * grey "hover" tint and looks disabled or still selected. Interactive controls that stay on screen after a
 * tap only get hover tints for real pointers.
 */
const FILES = [
  '../styles/base.css',
  '../ui/answers/CellsInput.css',
  '../ui/answers/ChoiceInput.css',
  '../ui/answers/OrderInput.css',
  '../ui/answers/NumberLineInput.css',
  '../ui/keypad/keypad.css',
];

/** :hover selectors that are not inside an `@media (hover: hover) …` block. */
function unguardedHover(css: string): string[] {
  const out: string[] = [];
  const text = css.replace(/\/\*[\s\S]*?\*\//g, '');
  let depth = 0;
  let guardDepth = -1;
  let selector = '';
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '{') {
      const sel = selector.trim();
      if (sel.startsWith('@media') && /\(hover:\s*hover\)/.test(sel) && guardDepth < 0) guardDepth = depth;
      else if (guardDepth < 0 && sel.includes(':hover') && !sel.startsWith('a:hover') && sel !== 'a:hover') out.push(sel);
      depth++;
      selector = '';
    } else if (ch === '}') {
      depth--;
      if (depth === guardDepth) guardDepth = -1;
      selector = '';
    } else if (ch === ';') {
      selector = '';
    } else {
      selector += ch;
    }
  }
  return out;
}

describe('hover tints only for real pointers', () => {
  it.each(FILES)('%s', (file) => {
    const css = readFileSync(new URL(file, import.meta.url), 'utf8');
    expect(unguardedHover(css)).toEqual([]);
  });

  it('the checker finds unguarded rules', () => {
    expect(unguardedHover('.x:hover { color: red; }')).toEqual(['.x:hover']);
    expect(unguardedHover('@media (hover: hover) and (pointer: fine) { .x:hover { color: red; } } .y { color: blue; }')).toEqual([]);
  });
});
