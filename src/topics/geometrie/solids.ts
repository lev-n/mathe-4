/**
 * Facts about the seven Körper of the Grundschule.
 * Conventions for curved solids (stated in the tasks and worked solutions):
 * - gebogene (gekrümmte) Flächen count as Flächen: Zylinder 3 (2 Kreise + Mantel), Kegel 2, Kugel 1.
 * - gebogene Kanten count as Kanten: Zylinder 2, Kegel 1, Kugel 0.
 * - the Spitze of a Kegel is called Spitze, not Ecke; we never ask for the Ecken of a Kegel.
 */
import type { SolidKind } from '../../core/types';

export interface SolidFacts {
  kind: SolidKind;
  /** Name without article. */
  name: string;
  /** 'der Würfel' */
  nom: string;
  /** 'den Würfel' */
  acc: string;
  /** 'ein Würfel' */
  ein: string;
  /** 'dem Würfel' */
  dat: string;
  /** 'einen Würfel' (accusative) */
  einen: string;
  /** 'eines Würfels' */
  gen: string;
  ecken: number;
  kanten: number;
  flaechen: number;
  curved: boolean;
  /** What a child sees in the drawing of SolidVisual (hidden parts dashed) if it counts only solid lines. */
  visible: { ecken: number; kanten: number; flaechen: number };
  /** Short description of the faces (worked solutions). */
  faces: string;
}

export const SOLIDS: Record<SolidKind, SolidFacts> = {
  wuerfel: {
    kind: 'wuerfel', name: 'Würfel', nom: 'der Würfel', acc: 'den Würfel', ein: 'ein Würfel', dat: 'dem Würfel', einen: 'einen Würfel', gen: 'eines Würfels',
    ecken: 8, kanten: 12, flaechen: 6, curved: false,
    visible: { ecken: 7, kanten: 9, flaechen: 3 },
    faces: '6 gleich große Quadrate',
  },
  quader: {
    kind: 'quader', name: 'Quader', nom: 'der Quader', acc: 'den Quader', ein: 'ein Quader', dat: 'dem Quader', einen: 'einen Quader', gen: 'eines Quaders',
    ecken: 8, kanten: 12, flaechen: 6, curved: false,
    visible: { ecken: 7, kanten: 9, flaechen: 3 },
    faces: '6 Rechtecke, je 2 gegenüberliegende sind gleich groß',
  },
  pyramide: {
    kind: 'pyramide', name: 'Pyramide', nom: 'die Pyramide', acc: 'die Pyramide', ein: 'eine Pyramide', dat: 'der Pyramide', einen: 'eine Pyramide', gen: 'einer Pyramide',
    ecken: 5, kanten: 8, flaechen: 5, curved: false,
    visible: { ecken: 4, kanten: 5, flaechen: 2 },
    faces: '1 Quadrat als Grundfläche und 4 Dreiecke',
  },
  prisma: {
    kind: 'prisma', name: 'Prisma', nom: 'das Prisma', acc: 'das Prisma', ein: 'ein Prisma', dat: 'dem Prisma', einen: 'ein Prisma', gen: 'eines Prismas',
    ecken: 6, kanten: 9, flaechen: 5, curved: false,
    visible: { ecken: 5, kanten: 6, flaechen: 2 },
    faces: '2 Dreiecke und 3 Rechtecke',
  },
  zylinder: {
    kind: 'zylinder', name: 'Zylinder', nom: 'der Zylinder', acc: 'den Zylinder', ein: 'ein Zylinder', dat: 'dem Zylinder', einen: 'einen Zylinder', gen: 'eines Zylinders',
    ecken: 0, kanten: 2, flaechen: 3, curved: true,
    visible: { ecken: 0, kanten: 2, flaechen: 2 },
    faces: '2 Kreisflächen und 1 gebogene Fläche',
  },
  kegel: {
    kind: 'kegel', name: 'Kegel', nom: 'der Kegel', acc: 'den Kegel', ein: 'ein Kegel', dat: 'dem Kegel', einen: 'einen Kegel', gen: 'eines Kegels',
    ecken: 0, kanten: 1, flaechen: 2, curved: true,
    visible: { ecken: 0, kanten: 1, flaechen: 1 },
    faces: '1 Kreisfläche und 1 gebogene Fläche, oben eine Spitze',
  },
  kugel: {
    kind: 'kugel', name: 'Kugel', nom: 'die Kugel', acc: 'die Kugel', ein: 'eine Kugel', dat: 'der Kugel', einen: 'eine Kugel', gen: 'einer Kugel',
    ecken: 0, kanten: 0, flaechen: 1, curved: true,
    visible: { ecken: 0, kanten: 0, flaechen: 1 },
    faces: '1 gebogene Fläche',
  },
};

export const SOLID_KINDS: readonly SolidKind[] = ['wuerfel', 'quader', 'kugel', 'zylinder', 'kegel', 'pyramide', 'prisma'];

/** Solids children often confuse with each other – plausible distractors. */
export const CONFUSIONS: Record<SolidKind, SolidKind[]> = {
  wuerfel: ['quader', 'prisma', 'pyramide'],
  quader: ['wuerfel', 'prisma', 'zylinder'],
  kugel: ['zylinder', 'kegel', 'wuerfel'],
  zylinder: ['kegel', 'prisma', 'quader', 'kugel'],
  kegel: ['pyramide', 'zylinder', 'kugel'],
  pyramide: ['kegel', 'prisma', 'wuerfel'],
  prisma: ['pyramide', 'quader', 'zylinder'],
};

/** Why a confused name does not fit (shown as ChoiceOption.whyWrong). */
export function whyNotSolid(chosen: SolidKind, actual: SolidKind): string {
  const pair = `${chosen}>${actual}`;
  const specific: Record<string, string> = {
    'quader>wuerfel': 'Ein Würfel ist ein besonderer Quader. Hier sind alle Kanten gleich lang – so heißt er Würfel.',
    'wuerfel>quader': 'Schau auf die Kanten: Sie sind nicht alle gleich lang. Beim Würfel wären alle Flächen Quadrate.',
    'kegel>pyramide': 'Schau auf die Grundfläche: Sie ist eckig, kein Kreis. Ein Kegel hat unten einen Kreis.',
    'pyramide>kegel': 'Schau auf die Grundfläche: Sie ist rund. Eine Pyramide hat unten ein Vieleck mit Ecken.',
    'zylinder>kegel': 'Ein Zylinder hat oben und unten einen Kreis. Dieser Körper läuft oben spitz zu.',
    'kegel>zylinder': 'Ein Kegel hat oben eine Spitze. Dieser Körper hat oben und unten einen gleich großen Kreis.',
    'prisma>zylinder': 'Ein Prisma hat nur ebene Flächen und Ecken. Dieser Körper ist rund und kann rollen.',
    'zylinder>prisma': 'Ein Zylinder hat runde Flächen. Hier sind vorne und hinten Dreiecke.',
    'pyramide>prisma': 'Eine Pyramide hat oben eine Spitze. Hier sind vorne und hinten gleiche Dreiecke.',
    'prisma>pyramide': 'Ein Prisma hat zwei gleiche Dreiecke als Grund- und Deckfläche. Hier treffen sich alle Dreiecke oben in einer Spitze.',
    'zylinder>kugel': 'Ein Zylinder hat zwei flache Kreisflächen. Dieser Körper ist überall rund.',
    'kegel>kugel': 'Ein Kegel hat eine Spitze und eine flache Kreisfläche. Dieser Körper ist überall rund.',
    'kugel>zylinder': 'Eine Kugel ist überall rund. Dieser Körper hat oben und unten flache Kreisflächen.',
    'kugel>kegel': 'Eine Kugel hat keine Spitze. Dieser Körper hat eine Spitze und unten einen Kreis.',
  };
  if (specific[pair]) return specific[pair];
  const nom = SOLIDS[chosen].nom;
  // a full sentence follows the colon, so it starts with a capital letter
  return `Vergleiche die Flächen: ${nom[0].toUpperCase()}${nom.slice(1)} hat ${SOLIDS[chosen].faces}.`;
}
