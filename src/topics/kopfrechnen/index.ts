/**
 * Topic (c) "Kopfrechnen und Einmaleins": Einmaleins (Leitner-based fact choice), Ableiten, · und : mit
 * Stufenzahlen, Analogieaufgaben, Verdoppeln/Halbieren, Ergänzen, vorteilhaft rechnen, Päckchen,
 * Teiler und Vielfache. Skills in teaching order.
 */
import type { TopicModule } from '../../core/types';
import { einmaleinsSkill } from './einmaleins';
import { ableitenSkill } from './ableiten';
import { malDurchZehnSkill } from './mal-durch-zehn';
import { stufenzahlenSkill } from './stufenzahlen';
import { verdoppelnHalbierenSkill } from './verdoppeln-halbieren';
import { ergaenzenSkill } from './ergaenzen';
import { vorteilhaftSkill } from './vorteilhaft';
import { paeckchenSkill } from './paeckchen';
import { teilerVielfacheSkill } from './teiler-vielfache';

const topic: TopicModule = {
  topicId: 'kopfrechnen',
  skills: [
    einmaleinsSkill,
    ableitenSkill,
    malDurchZehnSkill,
    stufenzahlenSkill,
    verdoppelnHalbierenSkill,
    ergaenzenSkill,
    vorteilhaftSkill,
    paeckchenSkill,
    teilerVielfacheSkill,
  ],
};
export default topic;
