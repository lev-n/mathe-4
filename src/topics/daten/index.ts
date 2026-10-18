/**
 * Topic (f) "Daten und Zufall" (KMK 2022 Leitidee Daten und Zufall; Bayern LB 4.1/4.2; NRW Daten, Häufigkeiten,
 * Wahrscheinlichkeiten). Skills in teaching order: reading data → changing representations → critical reading →
 * Fahrpläne/Preislisten → Kombinatorik → Zufall → Chancen.
 */
import type { TopicModule } from '../../core/types';
import { strichlistenSkill } from './strichlisten';
import { saeulendiagrammeSkill } from './saeulendiagramme';
import { bilddiagrammeSkill } from './bilddiagramme';
import { darstellungenSkill } from './darstellungen';
import { diagrammePruefenSkill } from './diagramme-pruefen';
import { fahrplaeneSkill } from './fahrplaene';
import { kombinatorikSkill } from './kombinatorik';
import { zufallSkill } from './zufall';
import { chancenSkill } from './chancen';

const topic: TopicModule = {
  topicId: 'daten',
  skills: [
    strichlistenSkill,
    saeulendiagrammeSkill,
    bilddiagrammeSkill,
    darstellungenSkill,
    diagrammePruefenSkill,
    fahrplaeneSkill,
    kombinatorikSkill,
    zufallSkill,
    chancenSkill,
  ],
};

export default topic;
