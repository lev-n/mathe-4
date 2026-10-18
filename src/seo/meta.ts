/**
 * Search and sharing metadata per route. One source for the build-time prerender (src/seo/prerender.tsx)
 * and for the head updates after client-side navigation (useHeadSync), so both always agree.
 *
 * Indexed are the pages that have content of their own for a first visitor: the start page, the seven
 * topic pages, the worksheet generator and the page for adults. Practice rounds (random tasks), the
 * personal pages (Fortschritt, Abzeichen), the legal pages and "not found" carry noindex.
 */
import { SITE_URL } from '../config/site';
import type { TopicMeta } from '../core/types';
import { getTopicMeta } from '../topics/registry';
import { PATHS, topicPath } from '../ui/app/routes';
import type { Route } from '../ui/app/routes';

export const APP_NAME = 'Mathe 4';

/** Page part of the document titles ('<docTitle> – Mathe 4'). The pages pass these to <PageTitle>. */
export const DOC_TITLES = {
  worksheet: 'Mathe-Arbeitsblätter 4. Klasse mit Lösungen',
  adults: 'Für Eltern und Lehrkräfte',
  privacy: 'Datenschutz',
  imprint: 'Impressum',
  notFound: 'Seite nicht gefunden',
} as const;

const HOME_TITLE = `Mathe üben für die 4. Klasse, kostenlos – ${APP_NAME}`;

/** '<docTitle> – Mathe 4'; null is the start page. */
export function documentTitle(docTitle: string | null): string {
  return docTitle ? `${docTitle} – ${APP_NAME}` : HOME_TITLE;
}

export const topicDocTitle = (topic: TopicMeta): string => `${topic.title} üben für die 4. Klasse`;

export const HOME_DESCRIPTION =
  'Kostenlos Mathe üben für die 4. Klasse: große Zahlen, schriftlich rechnen, Einmaleins, Größen, Geometrie, Daten und Sachaufgaben. Ohne Anmeldung, ohne Werbung.';

export const topicDescription = (topic: TopicMeta): string =>
  `${topic.title} üben für die 4. Klasse: ${topic.description}. Mit Tipps und Lösungswegen, kostenlos, ohne Anmeldung.`;

const DESCRIPTIONS = {
  worksheet:
    'Mathe-Arbeitsblätter für die 4. Klasse kostenlos erstellen und ausdrucken: alle Themen, drei Stufen, 6, 10 oder 15 Aufgaben und ein Lösungsblatt.',
  adults:
    'So hilft Mathe 4 Kindern der 4. Klasse beim Üben: Tipps und Lösungswege, Einstellungen, Fortschritt sichern und der Bezug zu KMK-Standards und Lehrplänen.',
  privacy: 'Datenschutz bei Mathe 4: keine Anmeldung, keine Cookies, keine Werbung, keine Analyse und keine Daten an Dritte.',
  imprint: `Impressum von ${APP_NAME}.`,
} as const;

export interface PageMeta {
  /** Document title; null where the page sets it itself (practice rounds, personal pages). */
  title: string | null;
  description: string;
  /** Absolute canonical URL; null for pages that must not be indexed. */
  canonical: string | null;
  index: boolean;
}

/** Absolute URL of an app path ('/' for the start page). */
export const absoluteUrl = (path: string): string => `${SITE_URL}${path}`;

const indexed = (path: string, title: string, description: string): PageMeta => ({ title, description, canonical: absoluteUrl(path), index: true });
const hidden = (title: string | null, description: string): PageMeta => ({ title, description, canonical: null, index: false });

export function pageMeta(route: Route): PageMeta {
  switch (route.name) {
    case 'home':
      return indexed(PATHS.home, documentTitle(null), HOME_DESCRIPTION);
    case 'topic': {
      const topic = getTopicMeta(route.topicId);
      return indexed(topicPath(topic.id), documentTitle(topicDocTitle(topic)), topicDescription(topic));
    }
    case 'worksheet':
      return indexed(PATHS.worksheet, documentTitle(DOC_TITLES.worksheet), DESCRIPTIONS.worksheet);
    case 'adults':
      return indexed(PATHS.adults, documentTitle(DOC_TITLES.adults), DESCRIPTIONS.adults);
    case 'privacy':
      return hidden(documentTitle(DOC_TITLES.privacy), DESCRIPTIONS.privacy);
    case 'imprint':
      return hidden(documentTitle(DOC_TITLES.imprint), DESCRIPTIONS.imprint);
    case 'notFound':
      return hidden(documentTitle(DOC_TITLES.notFound), HOME_DESCRIPTION);
    case 'progress':
    case 'badges':
    case 'practice':
      return hidden(null, HOME_DESCRIPTION);
  }
}

/**
 * Marks which HTML a prerendered file holds (data-route on #root). The client hydrates only when it
 * matches the current URL. Every unknown path shows the same "not found" page, so they share one key.
 */
export function prerenderKey(route: Route, path: string): string {
  return route.name === 'notFound' ? '404' : path;
}
