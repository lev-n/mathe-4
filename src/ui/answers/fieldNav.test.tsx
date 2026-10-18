// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useRef, useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Answer, CheckResult, Response } from '../../core/types';
import Keypad, { keypadTarget } from '../keypad/Keypad';
import { withoutRepeatedLabel } from '../practice/ItemView';
import AnswerInput from './AnswerInput';
import {
  advanceOrSubmit,
  answerFields,
  enterTarget,
  firstEmptyRequiredField,
  firstWrongField,
  initialField,
  previousField,
  revealField,
  showRegion,
} from './fieldNav';

afterEach(cleanup);

// ── Pure navigation rules on plain DOM ──────────────────────────────────────

function dom(html: string): HTMLElement {
  const root = document.createElement('div');
  root.innerHTML = html;
  document.body.appendChild(root);
  return root;
}
const byId = (root: HTMLElement, id: string) => root.querySelector<HTMLElement>(`#${id}`)!;

describe('fieldNav rules', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('Enter skips filled fields and goes to the next empty one in reading order', () => {
    const root = dom(`
      <input id="a" data-answer-field value="3">
      <input id="b" data-answer-field value="4">
      <input id="c" data-answer-field value="">
      <input id="d" data-answer-field value="">`);
    const fields = answerFields(root);
    expect(enterTarget(fields, byId(root, 'a'))).toBe(byId(root, 'c'));
    expect(enterTarget(fields, byId(root, 'c'))).toBe(byId(root, 'd'));
  });

  it('wraps around to the first empty field before the current one', () => {
    const root = dom(`
      <input id="a" data-answer-field value="">
      <input id="b" data-answer-field value="1">
      <input id="c" data-answer-field value="2">`);
    expect(enterTarget(answerFields(root), byId(root, 'c'))).toBe(byId(root, 'a'));
  });

  it('checks (null) when every field is filled, or only the current one is still empty', () => {
    const full = dom(`<input id="a" data-answer-field value="1"><input id="b" data-answer-field value="2">`);
    expect(enterTarget(answerFields(full), byId(full, 'b'))).toBeNull();
    const last = dom(`<input id="x" data-answer-field value="1"><input id="y" data-answer-field value="">`);
    expect(enterTarget(answerFields(last), byId(last, 'y'))).toBeNull();
  });

  it('an optional field is visited once going forward, but never by wrap-around', () => {
    const root = dom(`
      <input id="q" data-answer-field value="7">
      <input id="r" data-answer-field data-answer-optional value="">`);
    const fields = answerFields(root);
    expect(enterTarget(fields, byId(root, 'q'))).toBe(byId(root, 'r'));
    expect(enterTarget(fields, byId(root, 'r'))).toBeNull();
  });

  it('follows data-answer-order and data-answer-empty over DOM order and values', () => {
    const root = dom(`
      <input id="zehner" data-answer-field data-answer-order="2" data-answer-empty="false" value="">
      <input id="einer" data-answer-field data-answer-order="1" data-answer-empty="true" value="">
      <input id="ueb" data-answer-field data-answer-order="0" value="900">`);
    const fields = answerFields(root);
    expect(fields.map((f) => f.id)).toEqual(['ueb', 'einer', 'zehner']);
    expect(enterTarget(fields, byId(root, 'ueb'))).toBe(byId(root, 'einer'));
    expect(enterTarget(fields, byId(root, 'zehner'))).toBe(byId(root, 'einer'));
    expect(initialField(fields)).toBe(byId(root, 'einer'));
  });

  it('ignores disabled and hidden fields; Shift+Enter goes back one field', () => {
    const root = dom(`
      <input id="a" data-answer-field value="">
      <input id="b" data-answer-field value="" disabled>
      <div hidden><input id="c" data-answer-field value=""></div>
      <input id="d" data-answer-field value="">`);
    const fields = answerFields(root);
    expect(fields.map((f) => f.id)).toEqual(['a', 'd']);
    expect(previousField(fields, byId(root, 'd'))).toBe(byId(root, 'a'));
    expect(previousField(fields, byId(root, 'a'))).toBeNull();
  });

  it('finds the first wrong and the first empty required field', () => {
    const root = dom(`
      <input id="a" data-answer-field value="1">
      <input id="b" data-answer-field data-answer-wrong value="2">
      <input id="c" data-answer-field data-answer-optional value="">
      <input id="d" data-answer-field value="">`);
    const fields = answerFields(root);
    expect(firstWrongField(fields)).toBe(byId(root, 'b'));
    expect(firstEmptyRequiredField(fields)).toBe(byId(root, 'd'));
    expect(initialField(fields)).toBe(byId(root, 'd'));
  });

  it('from a non-field input (helper box) Enter goes to the first empty required field, else checks', () => {
    const root = dom(`<input id="carry" value=""><input id="a" data-answer-field value=""><input id="b" data-answer-field value="5">`);
    const submit = vi.fn();
    advanceOrSubmit(root, byId(root, 'carry'), submit);
    expect(document.activeElement).toBe(byId(root, 'a'));
    (byId(root, 'a') as HTMLInputElement).value = '4';
    advanceOrSubmit(root, byId(root, 'carry'), submit);
    expect(submit).toHaveBeenCalledOnce();
  });
});

// ── Every answer type through AnswerInput ───────────────────────────────────

const TASK_ID = 'task-sr';

function Harness({ answer, onSubmit = () => {}, result = null, keypad = false }: { answer: Answer; onSubmit?: () => void; result?: CheckResult | null; keypad?: boolean }) {
  const [response, setResponse] = useState<Response | null>(null);
  const scope = useRef<HTMLDivElement>(null);
  return (
    <>
      <p id={TASK_ID}>Die Aufgabe.</p>
      <div ref={scope}>
        <AnswerInput
          answer={answer}
          response={response}
          onChange={setResponse}
          onSubmit={onSubmit}
          disabled={false}
          result={result}
          reveal={false}
          idBase="t"
          keypad={keypad}
          describedBy={TASK_ID}
        />
      </div>
      {keypad && <Keypad scopeRef={scope} onSubmit={(f) => advanceOrSubmit(scope.current, f, onSubmit)} submitDisabled={false} comma={false} />}
    </>
  );
}

const fields = () => answerFields(document.body);
const enter = (el: Element, init: { shiftKey?: boolean } = {}) => fireEvent.keyDown(el, { key: 'Enter', ...init });
const typeInto = (el: Element, value: string) => fireEvent.change(el, { target: { value } });
const describedByTask = (el: Element | null) => (el?.getAttribute('aria-describedby') ?? '').split(' ').includes(TASK_ID);

const MULTI: Answer = {
  kind: 'multi',
  fields: [
    { id: 'km', value: 2, after: 'km' },
    { id: 'm', value: 50, after: 'm' },
    { id: 'cm', value: 30, after: 'cm' },
  ],
};

describe('number', () => {
  it('initial field is the input, described by the task; Enter checks; "Nicht lösbar" counts as filled', () => {
    const onSubmit = vi.fn();
    render(<Harness answer={{ kind: 'number', value: null, offerUnsolvable: true }} onSubmit={onSubmit} />);
    const input = screen.getByLabelText('Deine Antwort');
    expect(initialField(fields())).toBe(input);
    expect(describedByTask(input)).toBe(true);
    expect(input.dataset.answerEmpty).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: /Nicht lösbar/ }));
    expect(input.dataset.answerEmpty).toBe('false');
    enter(input);
    expect(onSubmit).toHaveBeenCalledOnce();
  });

  it('a wrong answer marks the input as the first wrong field', () => {
    render(<Harness answer={{ kind: 'number', value: 56 }} result={{ correct: false }} />);
    expect(firstWrongField(fields())).toBe(screen.getByLabelText('Deine Antwort'));
  });
});

describe('multi', () => {
  it('Enter moves to the next empty field (skipping filled ones), wraps around, then checks; Shift+Enter goes back', () => {
    const onSubmit = vi.fn();
    render(<Harness answer={MULTI} onSubmit={onSubmit} />);
    const [km, m, cm] = screen.getAllByRole('textbox');
    expect(initialField(fields())).toBe(km);
    [km, m, cm].forEach((f) => expect(describedByTask(f)).toBe(true));

    typeInto(km, '2');
    typeInto(m, '50');
    km.focus();
    enter(km); // m is filled → skipped
    expect(document.activeElement).toBe(cm);
    enter(cm, { shiftKey: true });
    expect(document.activeElement).toBe(m);

    typeInto(m, '');
    typeInto(cm, '30');
    cm.focus();
    enter(cm); // nothing after cm → wrap to the empty m
    expect(document.activeElement).toBe(m);
    expect(onSubmit).not.toHaveBeenCalled();

    typeInto(m, '50');
    enter(m);
    expect(onSubmit).toHaveBeenCalledOnce();
  });

  it('the first wrong field is the first field marked wrong', () => {
    render(<Harness answer={MULTI} result={{ correct: false, fieldCorrect: { km: true, m: false, cm: false } }} />);
    expect(firstWrongField(fields())).toBe(screen.getAllByRole('textbox')[1]);
  });

  it('Ziffernblock Prüfen behaves like Enter: next empty field first, then check', () => {
    const onSubmit = vi.fn();
    render(<Harness answer={MULTI} onSubmit={onSubmit} keypad />);
    const [km, m, cm] = screen.getAllByRole('textbox');
    expect(km.getAttribute('inputmode')).toBe('none');
    km.focus();
    fireEvent.click(screen.getByRole('button', { name: '2' }));
    fireEvent.click(screen.getByRole('button', { name: 'Prüfen' }));
    expect(document.activeElement).toBe(m);
    expect(onSubmit).not.toHaveBeenCalled();
    typeInto(m, '50');
    typeInto(cm, '30');
    fireEvent.click(screen.getByRole('button', { name: 'Prüfen' }));
    expect(onSubmit).toHaveBeenCalledOnce();
  });
});

describe('written', () => {
  const box = (label: string) => screen.getByLabelText(label) as HTMLInputElement;
  const digit = (key: string) => fireEvent.keyDown(document.activeElement!, { key });

  it('starts with the Überschlag, then the Einer; digits right to left; leading empty boxes are not missing', () => {
    const onSubmit = vi.fn();
    render(<Harness answer={{ kind: 'written', op: 'add', operands: [4567, 2845], result: 7412, ueberschlag: 8000 }} onSubmit={onSubmit} />);
    expect(initialField(fields())).toBe(box('Überschlag'));
    expect(describedByTask(box('Überschlag'))).toBe(true);
    expect(describedByTask(box('Ergebnis, Einer'))).toBe(true);
    typeInto(box('Überschlag'), '8000');
    box('Überschlag').focus();
    enter(box('Überschlag'));
    expect(document.activeElement).toBe(box('Ergebnis, Einer'));
    for (const d of '2147') digit(d);
    expect(document.activeElement).toBe(box('Ergebnis, Zehntausender'));
    enter(document.activeElement!); // the Zehntausender may stay empty
    expect(onSubmit).toHaveBeenCalledOnce();
  });

  it('a gap between typed digits is missing: Enter goes there first', () => {
    const onSubmit = vi.fn();
    render(<Harness answer={{ kind: 'written', op: 'add', operands: [4567, 2845], result: 7412 }} onSubmit={onSubmit} />);
    typeInto(box('Ergebnis, Einer'), '2');
    typeInto(box('Ergebnis, Hunderter'), '4');
    box('Ergebnis, Hunderter').focus();
    enter(box('Ergebnis, Hunderter'));
    expect(document.activeElement).toBe(box('Ergebnis, Zehner'));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('division: quotient, then the (optional) Rest, then check; the first wrong box after a check', () => {
    const onSubmit = vi.fn();
    const answer: Answer = { kind: 'written', op: 'div', operands: [23, 5], result: 4, remainder: 3 };
    const { unmount } = render(<Harness answer={answer} onSubmit={onSubmit} />);
    expect(initialField(fields())).toBe(box('Ergebnis, 1. Ziffer'));
    box('Ergebnis, 1. Ziffer').focus();
    digit('4');
    enter(document.activeElement!);
    expect(document.activeElement).toBe(box('Rest, 1. Ziffer'));
    enter(document.activeElement!);
    expect(onSubmit).toHaveBeenCalledOnce();
    unmount();
    render(<Harness answer={answer} result={{ correct: false, wrongColumns: [], remainderCorrect: false }} />);
    expect(firstWrongField(fields())).toBe(box('Rest, 1. Ziffer'));
  });

  it('the first wrong field follows the right-to-left order (lowest wrong place first)', () => {
    render(<Harness answer={{ kind: 'written', op: 'add', operands: [478, 256], result: 734 }} result={{ correct: false, wrongColumns: [1, 2] }} />);
    expect(firstWrongField(fields())).toBe(box('Ergebnis, Zehner'));
  });
});

describe('widgets keep their own Enter (choice, order, cells, number line)', () => {
  it('choice: the tab stop is the field; Enter selects, then checks', () => {
    const onSubmit = vi.fn();
    render(<Harness answer={{ kind: 'choice', options: [{ label: 'sicher' }, { label: 'möglich' }, { label: 'unmöglich' }], correct: 1 }} onSubmit={onSubmit} />);
    const radios = screen.getAllByRole('radio');
    expect(initialField(fields())).toBe(radios[0]);
    expect(describedByTask(screen.getByRole('radiogroup'))).toBe(true);
    radios[0].focus();
    enter(radios[0]);
    expect(onSubmit).not.toHaveBeenCalled();
    expect(radios[0].getAttribute('aria-checked')).toBe('true');
    enter(radios[0]);
    expect(onSubmit).toHaveBeenCalledOnce();
  });

  it('choice: a wrong selected option is the first wrong field', () => {
    function Wrong() {
      const [response, setResponse] = useState<Response | null>({ kind: 'choice', index: 2 });
      return <AnswerInput answer={{ kind: 'choice', options: [{ label: 'a' }, { label: 'b' }, { label: 'c', whyWrong: 'x' }], correct: 0 }} response={response} onChange={setResponse} onSubmit={() => {}} disabled={false} result={{ correct: false }} reveal={false} idBase="w" keypad={false} />;
    }
    render(<Wrong />);
    expect(firstWrongField(fields())).toBe(screen.getAllByRole('radio')[2]);
  });

  it('order: the first item is the field; Enter checks once all are placed; Zurücksetzen keeps focus in the task', () => {
    const onSubmit = vi.fn();
    render(<Harness answer={{ kind: 'order', items: ['30', '10', '20'], correct: [1, 2, 0], direction: 'aufsteigend' }} onSubmit={onSubmit} />);
    const items = screen.getAllByRole('button', { pressed: false });
    expect(initialField(fields())).toBe(items[0]);
    expect(describedByTask(screen.getByRole('group', { name: /Tippe der Reihe nach/ }))).toBe(true);
    items.forEach((b) => fireEvent.click(b));
    enter(items[2]);
    expect(onSubmit).toHaveBeenCalledOnce();
    const reset = screen.getByRole('button', { name: 'Zurücksetzen' });
    reset.focus();
    fireEvent.click(reset);
    expect(document.activeElement).toBe(items[0]);
  });

  it('cells: the first free cell is the field; Enter checks once a cell is painted; the first marked cell after a check', () => {
    const onSubmit = vi.fn();
    const answer: Answer = { kind: 'cells', width: 4, height: 2, given: [[0, 0]], solution: [[3, 0]] };
    const { unmount } = render(<Harness answer={answer} onSubmit={onSubmit} />);
    const first = initialField(fields())!;
    expect(first.getAttribute('aria-label')).toMatch(/^Kästchen Spalte 2, Zeile 1/);
    expect(describedByTask(screen.getByRole('group', { name: /Kästchengitter/ }))).toBe(true);
    fireEvent.click(first);
    enter(first);
    expect(onSubmit).toHaveBeenCalledOnce();
    unmount();
    function Checked() {
      const [response, setResponse] = useState<Response | null>({ kind: 'cells', cells: [[1, 0]] });
      return <AnswerInput answer={answer} response={response} onChange={setResponse} onSubmit={() => {}} disabled={false} result={{ correct: false, extraCells: [[1, 0]], missingCells: [[3, 0]] }} reveal={false} idBase="c" keypad={false} />;
    }
    render(<Checked />);
    expect(firstWrongField(fields())!.getAttribute('aria-label')).toMatch(/Spalte 2, Zeile 1.*zu viel/);
  });

  it('number line: the slider is the field; Enter checks once the arrow is placed; wrong → the slider', () => {
    const onSubmit = vi.fn();
    const answer: Answer = { kind: 'numberline', min: 0, max: 100, majorStep: 10, minorStep: 1, step: 1, value: 37, tolerance: 0, labelMajor: true };
    const { unmount } = render(<Harness answer={answer} onSubmit={onSubmit} />);
    const slider = screen.getByRole('slider');
    expect(initialField(fields())).toBe(slider);
    expect(describedByTask(slider)).toBe(true);
    enter(slider);
    expect(onSubmit).not.toHaveBeenCalled();
    fireEvent.keyDown(slider, { key: 'ArrowRight' });
    enter(slider);
    expect(onSubmit).toHaveBeenCalledOnce();
    unmount();
    function Wrong() {
      const [response, setResponse] = useState<Response | null>({ kind: 'numberline', value: 40 });
      return <AnswerInput answer={answer} response={response} onChange={setResponse} onSubmit={() => {}} disabled={false} result={{ correct: false }} reveal={false} idBase="n" keypad={false} />;
    }
    render(<Wrong />);
    expect(firstWrongField(fields())).toBe(screen.getByRole('slider'));
  });
});

// ── Keypad target, repeated labels, scrolling ───────────────────────────────


describe('Ziffernblock target without focus', () => {
  it('is the first answer field (Einer), never an ungraded helper box', () => {
    render(<Harness answer={{ kind: 'written', op: 'sub', operands: [805, 328], result: 477, method: 'abziehen' }} />);
    const scope = document.querySelector<HTMLElement>('.answer-input')!.parentElement!;
    (document.activeElement as HTMLElement | null)?.blur();
    expect(keypadTarget(scope, null)?.getAttribute('aria-label')).toBe('Ergebnis, Einer');
  });

  it('is the Überschlag when the task asks for one first', () => {
    render(<Harness answer={{ kind: 'written', op: 'add', operands: [4567, 2845], result: 7412, ueberschlag: 8000 }} />);
    const scope = document.querySelector<HTMLElement>('.answer-input')!.parentElement!;
    expect(keypadTarget(scope, null)?.getAttribute('aria-label') ?? keypadTarget(scope, null)?.id).toMatch(/ueb|Überschlag/);
  });
});

describe('withoutRepeatedLabel', () => {
  it('drops a number-field label that only repeats the prompt', () => {
    const a: Answer = { kind: 'number', value: 5, before: 'Jedes Kind bezahlt', after: '€.', label: 'Wie viel muss jedes Kind bezahlen?' };
    expect(withoutRepeatedLabel(a, 'Wie viel muss jedes Kind bezahlen?')).not.toHaveProperty('label');
    expect(withoutRepeatedLabel(a, 'Rechne.')).toBe(a);
  });
});

describe('revealField / showRegion (simulated layout)', () => {
  /** Give elements fixed viewport rects and record window.scrollBy. */
  function layout(view: number, rects: Record<string, [number, number]>) {
    vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(view);
    const scroll = vi.spyOn(window, 'scrollBy').mockImplementation(() => {});
    const els: Record<string, HTMLElement> = {};
    for (const [cls, [top, bottom]] of Object.entries(rects)) {
      const el = document.querySelector<HTMLElement>(`.${cls}`)!;
      el.getBoundingClientRect = () => ({ top, bottom, height: bottom - top, width: 300, left: 0, right: 300, x: 0, y: top, toJSON: () => ({}) }) as DOMRect;
      els[cls] = el;
    }
    return { scroll, els };
  }
  function itemDom() {
    document.body.innerHTML = `
      <div class="pr-item-layout has-keypad">
        <section class="pr-item">
          <p class="pr-prompt">Runde.</p>
          <div class="pr-answer"><input class="f" data-answer-field></div>
          <div class="pr-feedback">Noch nicht ganz.</div>
        </section>
        <div class="pr-keypad"></div>
      </div>`;
  }
  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it("a new task: the task text wins over the keypad's last row when not everything fits", () => {
    itemDom();
    vi.stubGlobal('matchMedia', (q: string) => ({ matches: q === '(max-width: 899px)', addEventListener() {}, removeEventListener() {} }));
    const { scroll, els } = layout(600, { 'pr-prompt': [-200, -160], f: [100, 170], 'pr-feedback': [180, 200], 'pr-keypad': [220, 520] });
    revealField(els.f, 'new');
    // task top (−200) to field bottom (170) fits in 600 − 16; with the keypad (520) it would not → task at the top
    expect(scroll).toHaveBeenCalledWith(0, -208);
    vi.unstubAllGlobals();
  });

  it('a new task already on screen, but the keypad does not fit: the task moves to the top to show more keypad', () => {
    itemDom();
    vi.stubGlobal('matchMedia', (q: string) => ({ matches: q === '(max-width: 899px)', addEventListener() {}, removeEventListener() {} }));
    const { scroll, els } = layout(600, { 'pr-prompt': [300, 340], f: [380, 450], 'pr-keypad': [470, 900] });
    revealField(els.f, 'new');
    expect(scroll).toHaveBeenCalledWith(0, 292);
    vi.unstubAllGlobals();
  });

  it('after a wrong answer: the hint below the field wins over the task text', () => {
    itemDom();
    const { scroll, els } = layout(600, { 'pr-prompt': [-400, -360], f: [500, 570], 'pr-feedback': [580, 700] });
    revealField(els.f, 'retry');
    // field + feedback (500–700) fit, the task (−400) would not: bottom of the feedback at the bottom edge
    expect(scroll).toHaveBeenCalledWith(0, 700 - 592);
  });

  it('showRegion: a region taller than the screen starts at its top', () => {
    itemDom();
    const { scroll, els } = layout(600, { 'pr-feedback': [-300, 900] });
    showRegion(els['pr-feedback']);
    expect(scroll).toHaveBeenCalledWith(0, -308);
  });
});
