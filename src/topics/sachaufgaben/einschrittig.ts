/**
 * Einschrittige Sachaufgaben with all four operations.
 * Stufe 1: numbers ≤ 1000, direct wording.
 * Stufe 2: numbers ≤ 10 000.
 * Stufe 3: wording that suggests the wrong operation ('… mehr als …' with −), unknown start, 'mal so viele' with :.
 */
import { fmt } from '../../core/format';
import type { Bug, SkillDef } from '../../core/types';
import { answerSentence, build, checkLine, numberBugs, safeHints, sentenceAnswer, speak, WRONG_OP_HINT } from './shared';
import { oneStepStory, term, wrongOpValues, type Op } from './stories';

/** Process praise that names what the story asked for (the operation the child had to recognise). */
const PRAISE: Record<Op, string> = {
  '+': 'Du hast erkannt, dass in der Geschichte etwas dazukommt.',
  '-': 'Du hast erkannt, welcher Teil in der Geschichte abgezogen wird.',
  '*': 'Du hast erkannt, dass gleich große Mengen mehrmals vorkommen.',
  ':': 'Du hast erkannt, dass hier gerecht verteilt oder eingeteilt wird.',
};

export const einschrittigSkill: SkillDef = {
  id: 'sachaufgaben.einschrittig',
  topicId: 'sachaufgaben',
  title: 'Rechengeschichten',
  description: 'Du liest eine kurze Geschichte und findest die passende Rechnung.',
  stufen: {
    1: 'Ein Rechenschritt, Zahlen bis 1000',
    2: 'Ein Rechenschritt, Zahlen bis 10 000',
    3: 'Knifflige Wörter: Genau lesen lohnt sich',
  },
  kmk: ['ZO.sachrechnen', 'PK.modellieren'],
  generate(rng, stufe) {
    const st = oneStepStory(rng, stufe);
    const calc = `${term(st.op, st.a, st.b)} = ${fmt(st.value)}`;
    const bugs: Bug[] = [];
    if (st.trap) {
      const v = st.trap.op === '-' ? Math.abs(st.a - st.b) : st.trap.op === '+' ? st.a + st.b : st.trap.op === '*' ? st.a * st.b : st.a / st.b;
      bugs.push({ id: 'signalwort', match: v, hint: st.trap.hint });
    }
    for (const w of wrongOpValues(st)) bugs.push({ id: `rechenart-${w.op}`, match: w.value, hint: WRONG_OP_HINT[w.op] });
    const valueText = fmt(st.value);
    return build(einschrittigSkill, stufe, {
      key: st.key,
      ab: stufe === 3 && st.trap ? 3 : stufe === 1 ? 1 : 2,
      knobel: st.trap ? true : undefined,
      context: st.context,
      prompt: st.question,
      emoji: st.emoji,
      answer: sentenceAnswer(st.value, st.before, st.after, st.question),
      hints: safeHints([st.hint, 'Stell dir die Geschichte wie einen kleinen Film vor. Welche Rechnung passt: plus, minus, mal oder geteilt?'], st.value, 'Lies die Geschichte noch einmal Satz für Satz.'),
      steps: [
        `Frage: ${st.question}`,
        ...(stufe >= 2 && st.op !== ':' ? [checkLine(st.op, st.a, st.b, st.value)] : []),
        `Rechnung: ${calc}`,
        ...(stufe >= 2 && st.op === ':' ? [checkLine(st.op, st.a, st.b, st.value)] : []),
        `Antwort: ${answerSentence(st.before, valueText, st.after)}`,
      ],
      bugs: numberBugs(bugs, st.value),
      praise: st.trap ? 'Du hast genau gelesen und dich nicht von einem Wort täuschen lassen.' : PRAISE[st.op],
      srText: `${speak(st.context)} ${st.question}`,
      kmk: ['ZO.sachrechnen', 'PK.modellieren'],
    });
  },
};
