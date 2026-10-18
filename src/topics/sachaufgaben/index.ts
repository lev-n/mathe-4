// Topic (g) Sachaufgaben: skills in teaching order.
import type { TopicModule } from '../../core/types';
import { einschrittigSkill } from './einschrittig';
import { modellierenSkill } from './modellieren';
import { mehrschrittigSkill } from './mehrschrittig';
import { angabenSkill } from './angaben';
import { restSkill } from './rest';
import { mengePreisSkill } from './menge-preis';
import { ueberschlagSkill } from './ueberschlag';

const topic: TopicModule = {
  topicId: 'sachaufgaben',
  skills: [einschrittigSkill, modellierenSkill, mehrschrittigSkill, angabenSkill, restSkill, mengePreisSkill, ueberschlagSkill],
};
export default topic;
