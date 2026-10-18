/**
 * Build-time prerendering. This is the entry of the SSR build that scripts/prerender.mjs runs after
 * `vite build`; the script only reads and writes files, everything else happens here.
 *
 * Every page with content for a first visitor becomes a static HTML file with its own head tags and
 * structured data. Crawlers that do not run JavaScript (most AI crawlers, link previews) see the real
 * page, and every visitor gets a first paint without waiting for the script. The browser then hydrates
 * the HTML (src/main.tsx). Practice rounds and the personal pages share one noindex app shell, and all
 * other paths get 404.html, which Firebase Hosting serves with status 404 (firebase.json).
 */
import { prerender } from 'react-dom/static';
import type { TopicId } from '../core/types';
import { DEFAULT_SETTINGS } from '../state/types';
import { visibleSkills } from '../state/selectors';
import { TOPICS, loadAllTopics, loadedTopic } from '../topics/registry';
import App from '../ui/app/App';
import { setServerPath } from '../ui/app/router';
import { PATHS, matchRoute, topicPath } from '../ui/app/routes';
import { appShellHead, headHtml, robotsTxt, sitemapXml } from './head';
import { absoluteUrl, pageMeta, prerenderKey } from './meta';
import { structuredData } from './structuredData';

export const PRERENDERED_PATHS: readonly string[] = [
  PATHS.home,
  ...TOPICS.map((t) => topicPath(t.id)),
  PATHS.worksheet,
  PATHS.adults,
  PATHS.privacy,
  PATHS.imprint,
];

/** Any path the router does not know renders the same "not found" page. */
const NOT_FOUND_SAMPLE = '/404';
export const NOT_FOUND_FILE = '404.html';
/** Firebase rewrites the client-only routes to this file. */
export const APP_SHELL_FILE = 'app.html';

/** '/' → 'index.html', '/thema/zahlen' → 'thema/zahlen.html' (served as /thema/zahlen via cleanUrls). */
export const fileFor = (path: string): string => (path === '/' ? 'index.html' : `${path.slice(1)}.html`);

/** The skills a first visitor sees on a topic page (optional NRW skills are off by default). */
function firstVisitSkills(topicId: TopicId) {
  const mod = loadedTopic(topicId);
  if (!mod) throw new Error(`Topic ${topicId} is not loaded`);
  return visibleSkills({ settings: DEFAULT_SETTINGS }, mod.skills);
}

/** The app's HTML for `path` as a first visitor sees it (all topic modules must be loaded). */
export async function renderBody(path: string): Promise<string> {
  setServerPath(path);
  // No size limit: React would otherwise stream large Suspense boundaries "outlined", with inline
  // scripts that move them into place, which the CSP (script-src 'self') blocks.
  const { prelude } = await prerender(<App />, { progressiveChunkSize: Number.POSITIVE_INFINITY });
  return new Response(prelude).text();
}

function replaceOnce(html: string, pattern: RegExp, replacement: string, what: string): string {
  const matches = html.match(new RegExp(pattern.source, 'g'));
  if (matches?.length !== 1) throw new Error(`index.html: expected exactly one ${what}, found ${matches?.length ?? 0}`);
  return html.replace(pattern, () => replacement);
}

/**
 * Puts a page into the built index.html: its head tags replace the default <title> and description,
 * and the rendered body goes into #root, marked with data-route so the client knows what it may hydrate.
 */
export function fillTemplate(template: string, head: string, body: string, key: string | null): string {
  let html = replaceOnce(template, /\n\s*<meta name="description"[^>]*>/, '', 'description meta tag');
  html = replaceOnce(html, /<title>[^<]*<\/title>/, head, '<title>');
  const root = key === null ? '<div id="root"></div>' : `<div id="root" data-route="${key}">${body}</div>`;
  return replaceOnce(html, /<div id="root"><\/div>/, root, 'empty <div id="root">');
}

export interface OutputFile {
  /** Path relative to dist/. */
  file: string;
  content: string;
}

/** All prerendered files: the pages, 404.html, the app shell, sitemap.xml and robots.txt. */
export async function prerenderSite(template: string): Promise<OutputFile[]> {
  await loadAllTopics();
  const out: OutputFile[] = [];
  const page = async (path: string, file: string) => {
    const route = matchRoute(path);
    const head = headHtml(pageMeta(route), structuredData(route, firstVisitSkills));
    out.push({ file, content: fillTemplate(template, head, await renderBody(path), prerenderKey(route, path)) });
  };
  for (const path of PRERENDERED_PATHS) await page(path, fileFor(path));
  await page(NOT_FOUND_SAMPLE, NOT_FOUND_FILE);
  out.push({ file: APP_SHELL_FILE, content: fillTemplate(template, appShellHead(), '', null) });

  const indexed = PRERENDERED_PATHS.filter((p) => pageMeta(matchRoute(p)).index);
  out.push({ file: 'sitemap.xml', content: sitemapXml(indexed.map(absoluteUrl)) });
  out.push({ file: 'robots.txt', content: robotsTxt() });
  return out;
}
