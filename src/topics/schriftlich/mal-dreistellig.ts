import type { SkillDef } from '../../core/types';
import { attempt, randLen, ueberschlagOk, writtenItem } from './common';
import { threeDigitOperands, useKnownProduct } from './multiplikation';

const ID = 'schriftlich.mal-dreistellig';
const KMK = ['ZO.schriftlich'];

/** NRW extra (optional, hidden unless ctx.nrwExtras): multiplication by a three-digit number. */
export const malDreistelligSkill: SkillDef = {
  id: ID,
  topicId: 'schriftlich',
  title: 'Mal dreistellige Zahlen',
  description: 'Du multiplizierst mit einer dreistelligen Zahl und addierst drei Teilprodukte.',
  stufen: {
    1: 'Dreistellig mal dreistellig, ohne Nullen',
    2: 'Mit Nullen im zweiten Faktor, mit Überschlag',
    3: 'Große Produkte und Knobelaufgaben',
  },
  kmk: KMK,
  optional: 'nrw',
  generate(rng, stufe, ctx) {
    const method = ctx.subtractionMethod;
    if (stufe === 1) {
      const operands = attempt<[number, number]>(
        () => {
          const a = randLen(rng, 3);
          const b = randLen(rng, 3);
          return String(b).includes('0') ? null : [a, b];
        },
        () => [624, 315],
      );
      return writtenItem({
        skillId: ID, stufe, ab: 1, op: 'mul', operands, method, withUeberschlag: false, kmk: KMK, rng,
        prompt: 'Rechne schriftlich. Für jede Ziffer des zweiten Faktors gibt es ein Teilprodukt.',
      });
    }
    if (stufe === 2) {
      return writtenItem({
        skillId: ID, stufe, ab: 2, op: 'mul', operands: threeDigitOperands(rng, true), method, withUeberschlag: true, kmk: [...KMK, 'ZO.runden'], rng,
        prompt: 'Mach zuerst einen Überschlag. Achte auf die 0 im zweiten Faktor.',
      });
    }
    if (rng.chance(0.4)) return useKnownProduct(rng, ID, stufe, true, method);
    const operands = attempt<[number, number]>(
      () => {
        const a = randLen(rng, 4);
        const b = randLen(rng, 3);
        const p = a * b;
        return p <= 1_000_000 && p >= 400_000 && ueberschlagOk('mul', [a, b]) ? [a, b] : null;
      },
      () => [2468, 357],
    );
    return writtenItem({
      skillId: ID, stufe, ab: 2, op: 'mul', operands, method, withUeberschlag: true, kmk: [...KMK, 'ZO.runden'], rng,
      prompt: 'Mach zuerst einen Überschlag. Rechne dann mit drei Teilprodukten.',
    });
  },
};
