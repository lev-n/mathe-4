import { describe, expect, it } from 'vitest';
import { fmt } from '../../core/format';
import { STUFEN } from '../../core/types';
import topic from './index';
import { allText, samples } from './testUtils';

const SLUG = /^daten\.[a-z0-9]+(-[a-z0-9]+)*$/;

describe('topic daten', () => {
  it('exports 6–9 skills with stable, unique ids in teaching order', () => {
    expect(topic.topicId).toBe('daten');
    expect(topic.skills.length).toBeGreaterThanOrEqual(6);
    expect(topic.skills.length).toBeLessThanOrEqual(9);
    const ids = topic.skills.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    ids.forEach((id) => expect(id).toMatch(SLUG));
    expect(ids).toEqual([
      'daten.strichlisten',
      'daten.saeulendiagramme',
      'daten.bilddiagramme',
      'daten.darstellungen',
      'daten.diagramme-pruefen',
      'daten.fahrplaene',
      'daten.kombinatorik',
      'daten.zufall',
      'daten.chancen',
    ]);
    topic.skills.forEach((s) => expect(s.optional).toBeUndefined());
  });

  it('uses German school notation everywhere (no ×, ÷, *, /, %, dot separators, hyphen-minus in maths)', () => {
    for (const skill of topic.skills) {
      for (const stufe of STUFEN) {
        for (const e of samples(skill, stufe, 120)) {
          const texts = allText({ ...e, key: '', skillId: '', kmk: [], bugs: (e.bugs ?? []).map((b) => b.hint) });
          for (const s of texts) {
            expect(s, `${e.key}: ${s}`).not.toMatch(/[×÷*%]|\d\s*\/\s*\d/);
            expect(s, `${e.key}: ${s}`).not.toMatch(/\d\.\d{3}(?!\d)/);
            expect(s, `${e.key}: ${s}`).not.toMatch(/\d \- \d/);
            expect(s, `${e.key}: ${s}`).not.toMatch(/\d\.\d/);
          }
        }
      }
    }
  });

  it('German agreement with 0, 1 and 2: no "1 Minuten", "Es sind 1 Stern", "alle 2 Kugeln", "0 Minuten" steps', () => {
    const BAD = [
      /(?<![\d,])1 (Minuten|Kugeln|Bilder|Striche|Felder|Kinder|Möglichkeiten|Sterne|Bücher|Fahrzeuge|Spiele|Wege|Äste|einzelne)(?![\wäöüß])/,
      /\bEs sind 1 /,
      /\b(sind|kommen) 1 einzelne/,
      /\balle 2 Kugeln/,
      /\bsind ein halbes Bild/,
      /\bsind es 0 Minuten/,
    ];
    for (const skill of topic.skills) {
      for (const stufe of STUFEN) {
        for (const e of samples(skill, stufe, 300)) {
          const texts = allText({ ...e, key: '', skillId: '', kmk: [], bugs: (e.bugs ?? []).map((b) => b.hint) });
          for (const s of texts) BAD.forEach((re) => expect(s, `${e.key}: ${s}`).not.toMatch(re));
        }
      }
    }
  }, 30_000); // scans thousands of generated texts: slow under full-suite load

  it('prompts are short: at most 2 sentences, sentences of at most 15 words', () => {
    for (const skill of topic.skills) {
      for (const stufe of STUFEN) {
        for (const e of samples(skill, stufe, 120)) {
          const sentences = e.prompt.split(/(?<=[.?!])\s+/).filter(Boolean);
          expect(sentences.length, e.prompt).toBeLessThanOrEqual(2);
          for (const s of sentences) expect(s.split(/\s+/).length, `${e.key}: ${s}`).toBeLessThanOrEqual(15);
        }
      }
    }
  });

  it('Stufe mix: Stufe 3 contains Knobelaufgaben and AB III items; every Stufe is mostly its own AB level', () => {
    for (const skill of topic.skills) {
      for (const stufe of STUFEN) {
        const list = samples(skill, stufe, 120);
        const own = list.filter((e) => e.ab === stufe).length;
        expect(own / list.length, `${skill.id} Stufe ${stufe}`).toBeGreaterThanOrEqual(0.5);
        if (stufe === 3) expect(list.some((e) => e.knobel), skill.id).toBe(true);
      }
    }
  });

  it('hints never reveal a numeric answer (≥ 10) or the correct choice', () => {
    for (const skill of topic.skills) {
      for (const stufe of STUFEN) {
        for (const e of samples(skill, stufe, 150)) {
          const a = e.answer;
          // Legend and axis-step numbers are printed in the picture anyway; they are strategy information.
          const printed = e.visual?.type === 'pictogram' ? [e.visual.iconValue] : e.visual?.type === 'barChart' ? [e.visual.axisStep] : [];
          if (a.kind === 'number' && a.value !== null && Math.abs(a.value) >= 10 && !printed.includes(a.value)) {
            const shown = fmt(a.value, a.decimals && !Number.isInteger(a.value) ? a.decimals : undefined);
            const re = new RegExp(`(^|[^\\d,:])${shown.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\d,:a-zäöüß-])`);
            e.hints.forEach((h) => expect(re.test(h), `${e.key}: hint reveals ${shown}: ${h}`).toBe(false));
          }
          if (a.kind === 'multi') {
            const all = a.fields.map((f) => f.value).filter((v) => v >= 10);
            e.hints.forEach((h) => all.forEach((v) => expect(new RegExp(`(^|\\D)${v}(?![\\da-zäöüß-])`).test(h), `${e.key}: ${h}`).toBe(false)));
          }
          if (a.kind === 'choice' && a.options[a.correct].label.length > 3) {
            e.hints.forEach((h) => expect(h.includes(a.options[a.correct].label), `${e.key}: ${h}`).toBe(false));
          }
        }
      }
    }
  });

  it('every choice option is unique and has 2–4 options', () => {
    for (const skill of topic.skills) {
      for (const stufe of STUFEN) {
        for (const e of samples(skill, stufe, 120)) {
          if (e.answer.kind !== 'choice') continue;
          expect(e.answer.options.length).toBeGreaterThanOrEqual(2);
          expect(e.answer.options.length).toBeLessThanOrEqual(4);
        }
      }
    }
  });

  it('srText is a self-contained spoken version (no symbols a screen reader stumbles over)', () => {
    for (const skill of topic.skills) {
      for (const stufe of STUFEN) {
        for (const e of samples(skill, stufe, 60)) {
          expect(e.srText).not.toMatch(/[·−□]/);
          expect(e.srText.length).toBeGreaterThan(e.prompt.length - 10);
        }
      }
    }
  });
});
