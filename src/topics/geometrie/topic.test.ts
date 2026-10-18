import { describe, expect, it } from 'vitest';
import { STUFEN, type Exercise } from '../../core/types';
import topic from './index';
import { samples } from './test-utils';

describe('geometrie topic – cross-skill checks', () => {
  it('choice answers do not always put the correct option in the same place', () => {
    for (const skill of topic.skills) {
      for (const stufe of STUFEN) {
        const positions = new Set<number>();
        let choices = 0;
        for (const ex of samples(skill, stufe, 200)) {
          if (ex.answer.kind !== 'choice') continue;
          choices++;
          positions.add(ex.answer.correct);
        }
        if (choices >= 10) expect(positions.size, `${skill.id} Stufe ${stufe}`).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it('every skill has all three Stufen and uses only the topic id prefix', () => {
    for (const skill of topic.skills) {
      expect(skill.topicId).toBe('geometrie');
      expect(skill.id.startsWith('geometrie.')).toBe(true);
      expect(skill.optional).toBeUndefined();
      for (const stufe of STUFEN) expect(skill.stufen[stufe].split(' ').length).toBeLessThanOrEqual(12);
    }
  });

  it('Stufe 3 offers Knobelaufgaben in every skill', () => {
    for (const skill of topic.skills) {
      expect(samples(skill, 3, 200).some((e) => e.knobel), skill.id).toBe(true);
    }
  });

  it('texts use German school notation (no ×, *, / or dots as thousands separators)', () => {
    for (const skill of topic.skills) {
      for (const stufe of STUFEN) {
        for (const ex of samples(skill, stufe, 60)) {
          const text = JSON.stringify([ex.prompt, ex.context ?? '', ex.hints, ex.steps.map((s) => (typeof s === 'string' ? s : s.text)), ex.praise, ex.srText]);
          expect(text).not.toMatch(/[×*÷]|\d\.\d{3}\b| \/ /);
        }
      }
    }
  });

  it('srText is plain speakable text (no maths symbols left for the screen reader)', () => {
    for (const skill of topic.skills) {
      for (const stufe of STUFEN) {
        for (const ex of samples(skill, stufe, 60)) expect(ex.srText, ex.key).not.toMatch(/[·−□≈]/);
      }
    }
  });

  it('prompts are short: at most 2 sentences of ≤ 15 words each (knobel prompts may add one condition sentence)', () => {
    for (const skill of topic.skills) {
      for (const stufe of STUFEN) {
        for (const ex of samples(skill, stufe, 60)) {
          const sentences = ex.prompt.split(/(?<=[.?!])\s+/).filter(Boolean);
          expect(sentences.length, ex.prompt).toBeLessThanOrEqual(2);
          sentences.forEach((s) => expect(s.split(/\s+/).length, `${ex.key}: "${s}"`).toBeLessThanOrEqual(15));
        }
      }
    }
  });

  it('no punctuation slips in any child-facing text ("..", ".,", " ." or doubled spaces)', () => {
    const texts = (ex: Exercise): string[] => [
      ex.prompt, ex.context ?? '', ex.srText, ex.praise, ...ex.hints,
      ...ex.steps.map((s) => (typeof s === 'string' ? s : s.text)),
      ...(ex.bugs ?? []).map((b) => b.hint),
      ...(ex.answer.kind === 'choice' ? ex.answer.options.flatMap((o) => [o.label, o.whyWrong ?? '']) : []),
    ];
    for (const skill of topic.skills) {
      for (const stufe of STUFEN) {
        for (const ex of samples(skill, stufe, 150)) {
          for (const t of texts(ex)) expect(t, ex.key).not.toMatch(/\.\.|\.,|,\.| \.|  /);
        }
      }
    }
  });
});
