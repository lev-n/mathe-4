/**
 * Topic (e) Geometrie: Flächen, Umfang, Symmetrie, Körper, Netze, Würfelgebäude.
 * Teaching order: ebene Figuren → Flächeninhalt → Umfang → Symmetrie → Spiegeln → Körper →
 * Ecken/Kanten/Flächen → Würfelnetze → Würfelgebäude.
 */
import type { TopicModule } from '../../core/types';
import { figurenSkill } from './figuren';
import { flaecheSkill } from './flaeche';
import { umfangSkill } from './umfang';
import { symmetrieSkill } from './symmetrie';
import { spiegelnSkill } from './spiegeln';
import { koerperSkill } from './koerper';
import { eckenKantenFlaechenSkill } from './ecken-kanten-flaechen';
import { wuerfelnetzeSkill } from './wuerfelnetze';
import { wuerfelgebaeudeSkill } from './wuerfelgebaeude';

const topic: TopicModule = {
  topicId: 'geometrie',
  skills: [
    figurenSkill,
    flaecheSkill,
    umfangSkill,
    symmetrieSkill,
    spiegelnSkill,
    koerperSkill,
    eckenKantenFlaechenSkill,
    wuerfelnetzeSkill,
    wuerfelgebaeudeSkill,
  ],
};
export default topic;
