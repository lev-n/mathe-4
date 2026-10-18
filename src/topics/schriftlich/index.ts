/**
 * Topic (b) "Schriftlich rechnen": written addition, subtraction, multiplication and division,
 * Überschlag & Probe, Fehlerdetektiv, Ziffernrätsel and choosing a way to calculate.
 * Skills are listed in teaching order; ids are stable forever.
 */
import type { TopicModule } from '../../core/types';
import { additionSkill } from './addition';
import { divisionSkill } from './division';
import { fehlerdetektivSkill } from './fehlerdetektiv';
import { malDreistelligSkill } from './mal-dreistellig';
import { multiplikationSkill } from './multiplikation';
import { rechenwegSkill } from './rechenweg';
import { subtraktionSkill } from './subtraktion';
import { ueberschlagProbeSkill } from './ueberschlag-probe';
import { ziffernraetselSkill } from './ziffernraetsel';

const topic: TopicModule = {
  topicId: 'schriftlich',
  skills: [
    additionSkill,
    subtraktionSkill,
    ueberschlagProbeSkill,
    multiplikationSkill,
    malDreistelligSkill,
    divisionSkill,
    rechenwegSkill,
    ziffernraetselSkill,
    fehlerdetektivSkill,
  ],
};

export default topic;
