// Topic (d) Größen und Messen: skills in teaching order.
import type { TopicModule } from '../../core/types';
import { geldSkill } from './geld';
import { wechselgeldSkill } from './wechselgeld';
import { laengenSkill } from './laengen';
import { gewichteSkill } from './gewichte';
import { hohlmasseSkill } from './hohlmasse';
import { uhrzeitSkill } from './uhrzeit';
import { zeitspannenSkill } from './zeitspannen';
import { vergleichenSkill } from './vergleichen';
import { schaetzenSkill } from './schaetzen';
import { tonnenSkill } from './tonnen';

const topic: TopicModule = {
  topicId: 'groessen',
  skills: [
    geldSkill,
    wechselgeldSkill,
    laengenSkill,
    gewichteSkill,
    hohlmasseSkill,
    uhrzeitSkill,
    zeitspannenSkill,
    vergleichenSkill,
    schaetzenSkill,
    tonnenSkill,
  ],
};
export default topic;
