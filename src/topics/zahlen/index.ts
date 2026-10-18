/**
 * Topic (a) "Zahlen bis 1 000 000": Stellenwert, Zahlwörter, Bündeln, Zahlenstrahl, Nachbarzahlen,
 * Vergleichen, Runden, Zahlenfolgen (+ optional NRW: Binärzahlen). Skills in teaching order.
 */
import type { TopicModule } from '../../core/types';
import { stellenwertSkill } from './stellenwert';
import { zahlwortSkill } from './zahlwort';
import { buendelnSkill } from './buendeln';
import { zahlenstrahlSkill } from './zahlenstrahl';
import { nachbarzahlenSkill } from './nachbarzahlen';
import { vergleichenSkill } from './vergleichen';
import { rundenSkill } from './runden';
import { zahlenfolgenSkill } from './zahlenfolgen';
import { binaerSkill } from './binaer';

const topic: TopicModule = {
  topicId: 'zahlen',
  skills: [
    stellenwertSkill,
    zahlwortSkill,
    buendelnSkill,
    zahlenstrahlSkill,
    nachbarzahlenSkill,
    vergleichenSkill,
    rundenSkill,
    zahlenfolgenSkill,
    binaerSkill,
  ],
};
export default topic;
