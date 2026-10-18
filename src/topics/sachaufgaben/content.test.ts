/**
 * Content rules the shared invariant suite cannot see: stories that are possible and realistic, process praise that
 * names what the story asked for, and German grammar in generated sentences.
 */
import { describe, expect, it } from 'vitest';
import { createRng } from '../../core/rng';
import type { Exercise, Stufe } from '../../core/types';
import topic from './index';
import { angabenSkill } from './angaben';
import { einschrittigSkill } from './einschrittig';
import { mehrschrittigSkill } from './mehrschrittig';
import { mengePreisSkill, recipeSteps } from './menge-preis';
import { modellierenSkill } from './modellieren';
import { restSkill } from './rest';
import { oneStepStory } from './stories';
import { ueberschlagSkill } from './ueberschlag';
import { num, samples } from '../groessen/test-utils';

const N = (s: string) => s.replace(/[  ]/g, ' ');
const every = (skill: Parameters<typeof samples>[0], stufen: Stufe[] = [1, 2, 3]) => stufen.flatMap((s) => samples(skill, s));
const text = (ex: Exercise) => N(JSON.stringify(ex));

describe('sachaufgaben: stories are possible', () => {
  it('modellieren: the note in "Welche Frage passt?" always covers the purchase', () => {
    let seen = 0;
    for (const ex of samples(modellierenSkill, 2, 600)) {
      const m = ex.key.match(/:frage:q1:(\d+):(\d+):(\d+)$/);
      if (!m) continue;
      seen++;
      expect(Number(m[3]), ex.key).toBeGreaterThan(Number(m[1]) * Number(m[2]));
    }
    expect(seen).toBeGreaterThan(20);
  });

  it('angaben: the extra money fact never contradicts the purchase; the Turnverein facts stand alone', () => {
    for (const ex of every(angabenSkill)) {
      const m = N(ex.context ?? '').match(/kauft (\d+) \S+ für die Schule\. Ein \S+ kostet (\d+) €\. \S+ hat (\d+) € dabei/);
      if (m) expect(num(m[3]), ex.key).toBeGreaterThan(num(m[1]) * num(m[2]));
      expect(ex.context ?? '', ex.key).not.toMatch(/Außerdem|dort/);
      if (/Turnverein/.test(ex.context ?? '')) expect(ex.context, ex.key).toMatch(/^Im Turnverein trainieren Mädchen und Jungen\./);
    }
  });

  it('angaben Stufe 1: all needed data are given (missing data start on Stufe 2)', () => {
    for (const ex of samples(angabenSkill, 1)) expect(ex.answer.kind === 'number' && ex.answer.value, ex.key).not.toBeNull();
  });
});

describe('sachaufgaben: realistic numbers for the situation', () => {
  it('rest: group sizes, prices and amounts fit the situation', () => {
    for (const ex of every(restSkill)) {
      const c = N(ex.context ?? '');
      let m;
      if ((m = c.match(/In (?:ein|jedes) Auto passen (\d+) Kinder/))) expect(num(m[1]), c).toBeLessThanOrEqual(4);
      if ((m = c.match(/In ein Boot passen (\d+)/))) expect(num(m[1]), c).toBeLessThanOrEqual(8);
      if ((m = c.match(/In ein Zelt passen (\d+)/))) expect(num(m[1]), c).toBeLessThanOrEqual(6);
      if ((m = c.match(/An einen Tisch passen (\d+)/))) expect(num(m[1]), c).toBeLessThanOrEqual(12);
      if ((m = c.match(/In eine Schachtel passen (\d+) Eier/))) expect([6, 10], c).toContain(num(m[1]));
      if ((m = c.match(/hat (\d+) €\. Eine Fahrkarte für das Karussell kostet (\d+) €/))) {
        expect(num(m[1]), c).toBeLessThanOrEqual(50);
        expect(num(m[2]), c).toBeLessThanOrEqual(5);
      }
      if ((m = c.match(/Der Aufzug darf (\d+) Personen/))) expect(num(m[1]), c).toBeLessThanOrEqual(13);
      if ((m = c.match(/^(\d+) Kinder (?:fahren zum Sportfest|wollen mit dem Aufzug|machen eine Bootsfahrt)/))) expect(num(m[1]), c).toBeLessThanOrEqual(100);
      expect(c).not.toMatch(/Springseil/);
      if ((m = c.match(/Für (?:ein Lesezeichen|ein Armband) braucht man (\d+) cm/))) expect(num(m[1]), c).toBeLessThanOrEqual(25);
    }
  });

  it('one-step stories: quantities per unit stay realistic (muffins per table, Lose per half-day, Kekse per Blech)', () => {
    for (const stufe of [1, 2, 3] as const) {
      for (let seed = 1; seed <= 400; seed++) {
        const st = oneStepStory(createRng(seed * 97 + stufe), stufe);
        const c = N(st.context);
        let m;
        if ((m = c.match(/([\d ]+) Muffins werden gerecht auf (\d+) Tische/))) expect(num(m[1]) / num(m[2]), c).toBeLessThanOrEqual(30);
        if ((m = c.match(/am Vormittag ([\d ]+) Lose/))) expect(num(m[1]), c).toBeLessThanOrEqual(400);
        if ((m = c.match(/Heute kommen ([\d ]+) neue Bücher/))) expect(num(m[1]), c).toBeLessThanOrEqual(300);
        if ((m = c.match(/Auf jedem Blech liegen (\d+) Kekse/))) expect(num(m[1]), c).toBeLessThanOrEqual(40);
        if ((m = c.match(/backen die Eltern (\d+) Bleche/))) expect(num(m[1]), c).toBeLessThanOrEqual(10);
        if ((m = c.match(/Schulgarten werden ([\d ]+) Blumenzwiebeln gesetzt\. In jede Reihe kommen (\d+)/))) expect(num(m[1]) / num(m[2]), c).toBeLessThanOrEqual(30);
        if ((m = c.match(/Gemüsegarten gibt es (\d+) Reihen\. In jeder Reihe stehen (\d+)/))) expect(num(m[2]), c).toBeLessThanOrEqual(30);
      }
    }
  });
});

describe('sachaufgaben: worked steps a child can follow', () => {
  it('recipes go via a whole number of persons, never through a decimal', () => {
    expect(recipeSteps(400, 6, 9, 'g')).toEqual(['Für 3 Personen: 400 g : 2 = 200 g', 'Für 9 Personen: 200 g · 3 = 600 g']);
    expect(recipeSteps(250, 4, 6, 'g')).toEqual(['Für 2 Personen: 250 g : 2 = 125 g', 'Für 6 Personen: 125 g · 3 = 375 g']);
    for (const ex of samples(mengePreisSkill, 2)) {
      if (!/:rezept:/.test(ex.key)) continue;
      for (const s of ex.steps.map((x) => N(String(x)))) {
        const m = s.match(/(\d+) (?:g|ml) : (\d+) = (\d+)/);
        if (m) expect(num(m[1]) % num(m[2]), s).toBe(0);
        expect(s).not.toMatch(/: \d+ · \d+/);
      }
      expect(ex.prompt).toMatch(/^Wie viel (Gramm|Milliliter) /);
    }
  });
});

describe('sachaufgaben: process praise and hints fit the item', () => {
  it('einschrittig: "wer mehr und wer weniger" only in comparison stories', () => {
    for (const ex of every(einschrittigSkill)) {
      if (!ex.knobel) expect(ex.praise, ex.key).not.toMatch(/mehr und wer weniger|täuschen/);
    }
  });

  it('menge-preis: the praise names the step of the item; "je weniger" items talk about fewer children', () => {
    for (const ex of every(mengePreisSkill)) {
      if (/:ueber-eins:|:eins:/.test(ex.key)) expect(ex.praise, ex.key).toMatch(/Preis für 1/);
      if (/:nicht-proportional:/.test(ex.key)) expect(ex.prompt, ex.key).not.toMatch(/zusammen/);
      const m = ex.key.match(/:umgekehrt:[^:]+:(\d+):\d+:(\d+)$/);
      if (m) {
        const fewer = Number(m[2]) < Number(m[1]);
        expect(ex.praise + ex.hints.join(' '), ex.key).toMatch(fewer ? /weniger Kinder teilen/ : /mehr Kinder teilen/);
      }
    }
  });

  it('ueberschlag: the decision praise matches the decision; no rule about signposts', () => {
    for (const ex of samples(ueberschlagSkill, 2)) {
      expect(text(ex)).not.toMatch(/Schild/);
      if (!/:entscheiden:/.test(ex.key) || ex.answer.kind !== 'choice') continue;
      const exact = ex.answer.options[ex.answer.correct].label === 'Ich muss genau rechnen.';
      expect(ex.praise, ex.key).toMatch(exact ? /genau stimmen/ : /Überschlag/);
    }
  });
});

describe('sachaufgaben: grammar', () => {
  it('number and gender agreement in generated sentences', () => {
    for (const skill of topic.skills) {
      for (const ex of every(skill)) {
        const t = text(ex);
        expect(t, ex.key).not.toMatch(/(?<![\d,])1 (Stunden|Busse|Minuten)\b|bleiben 1 m frei|kein Fußball/);
        expect(t, ex.key).not.toMatch(/(Flaschen \S+|Brezeln|Bananen|Äpfel|Joghurts|Müsliriegel), nicht nur eines/);
        expect(t, ex.key).not.toMatch(/Wie viel (Äpfel|Mehl|Milch|Zucker) braucht/);
        expect(t, ex.key).not.toMatch(/€ und [^."]* € und /);
      }
    }
  });

  it('mehrschrittig: contexts fit the shop and the season', () => {
    for (const ex of every(mehrschrittigSkill)) {
      expect(text(ex), ex.key).not.toMatch(/Bleche Waffeln|Preisliste Bäckerei/);
    }
    for (const ex of samples(ueberschlagSkill, 1)) expect(ex.context ?? '').not.toMatch(/Winter/);
  });

  it('rest: rounding down is worded for the situation (no "Fahrkarten sind voll")', () => {
    for (const ex of every(restSkill)) {
      expect(text(ex), ex.key).not.toMatch(/(Fahrkarten|Sträuße|Mannschaften) sind voll\b|volle (Fahrkarten|Sträuße|Mannschaften)/);
    }
  });
});
