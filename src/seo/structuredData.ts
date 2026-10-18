/**
 * schema.org structured data (JSON-LD) for the prerendered pages. It only describes what the page
 * itself shows: the site name on the start page (Google "site names"), a breadcrumb trail, and the
 * topic pages and the worksheet generator as free learning resources for the 4th grade.
 */
import type { SkillDef, TopicId } from '../core/types';
import { TOPICS, getTopicMeta } from '../topics/registry';
import { PATHS, topicPath } from '../ui/app/routes';
import type { Route } from '../ui/app/routes';
import { APP_NAME, DOC_TITLES, HOME_DESCRIPTION, absoluteUrl, pageMeta } from './meta';

export type JsonLd = Record<string, unknown>;

const HOME_URL = absoluteUrl(PATHS.home);

const WEBSITE: JsonLd = {
  '@type': 'WebSite',
  '@id': `${HOME_URL}#website`,
  name: APP_NAME,
  url: HOME_URL,
  description: HOME_DESCRIPTION,
  inLanguage: 'de',
};

/** Shared by the learning resources: who they are for and on what terms. */
const LEARNING_RESOURCE = {
  '@type': 'LearningResource',
  inLanguage: 'de',
  isAccessibleForFree: true,
  isFamilyFriendly: true,
  educationalLevel: '4. Klasse (Grundschule)',
  audience: { '@type': 'EducationalAudience', educationalRole: 'student' },
  isPartOf: { '@id': WEBSITE['@id'] },
} as const;

function breadcrumb(name: string, path: string): JsonLd {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: APP_NAME, item: HOME_URL },
      { '@type': 'ListItem', position: 2, name, item: absoluteUrl(path) },
    ],
  };
}

/**
 * The page's JSON-LD document, or null if it has none. `skillsOf` returns the skills a first visitor
 * sees on a topic page (the build has every topic module loaded).
 */
export function structuredData(route: Route, skillsOf: (topicId: TopicId) => readonly SkillDef[]): JsonLd | null {
  const meta = pageMeta(route);
  let graph: JsonLd[];
  switch (route.name) {
    case 'home':
      graph = [WEBSITE];
      break;
    case 'topic': {
      const topic = getTopicMeta(route.topicId);
      const url = absoluteUrl(topicPath(topic.id));
      graph = [
        {
          ...LEARNING_RESOURCE,
          '@id': `${url}#lernangebot`,
          name: topic.title,
          description: meta.description,
          url,
          learningResourceType: 'Übungsaufgaben',
          interactivityType: 'active',
          teaches: skillsOf(topic.id).map((s) => s.title),
        },
        breadcrumb(topic.title, topicPath(topic.id)),
      ];
      break;
    }
    case 'worksheet': {
      const url = absoluteUrl(PATHS.worksheet);
      graph = [
        {
          ...LEARNING_RESOURCE,
          '@id': `${url}#lernangebot`,
          name: DOC_TITLES.worksheet,
          description: meta.description,
          url,
          learningResourceType: 'Arbeitsblatt',
          teaches: TOPICS.map((t) => t.title),
        },
        breadcrumb('Arbeitsblätter', PATHS.worksheet),
      ];
      break;
    }
    case 'adults':
      graph = [breadcrumb(DOC_TITLES.adults, PATHS.adults)];
      break;
    default:
      return null;
  }
  return { '@context': 'https://schema.org', '@graph': graph };
}
