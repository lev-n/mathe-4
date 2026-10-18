import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { SITE_URL } from '../config/site';
import { TOPICS, loadAllTopics } from '../topics/registry';
import { matchRoute } from '../ui/app/routes';
import { pageMeta } from './meta';
import { APP_SHELL_FILE, NOT_FOUND_FILE, PRERENDERED_PATHS, fileFor, fillTemplate, prerenderSite } from './prerender';
import type { OutputFile } from './prerender';

const TEMPLATE = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
const FIREBASE = JSON.parse(readFileSync(new URL('../../firebase.json', import.meta.url), 'utf8')) as {
  hosting: { rewrites: { source: string; destination: string }[]; cleanUrls: boolean };
};

let files: Map<string, string>;
beforeAll(async () => {
  const out: OutputFile[] = await prerenderSite(TEMPLATE);
  files = new Map(out.map((f) => [f.file, f.content]));
}, 60_000);

const all = (html: string, re: RegExp) => [...html.matchAll(new RegExp(re.source, 'g'))];
const jsonLd = (html: string) => all(html, /<script type="application\/ld\+json">([^<]*)<\/script>/).map((m) => JSON.parse(m[1]));

describe('prerendered pages', () => {
  it('writes every page, 404.html, the app shell, sitemap.xml and robots.txt', () => {
    expect([...files.keys()].sort()).toEqual(
      [...PRERENDERED_PATHS.map(fileFor), NOT_FOUND_FILE, APP_SHELL_FILE, 'sitemap.xml', 'robots.txt'].sort(),
    );
    expect(fileFor('/')).toBe('index.html');
    expect(fileFor('/thema/zahlen')).toBe('thema/zahlen.html');
  });

  it.each(PRERENDERED_PATHS)('%s: own head tags, real content, hydration marker', (path) => {
    const html = files.get(fileFor(path))!;
    const meta = pageMeta(matchRoute(path));
    expect(all(html, /<title>/)).toHaveLength(1);
    expect(html).toContain(`<title>${meta.title}</title>`);
    expect(all(html, /<meta name="description"/)).toHaveLength(1);
    expect(all(html, /rel="canonical"/)).toHaveLength(meta.index ? 1 : 0);
    if (meta.index) expect(html).toContain(`<link rel="canonical" href="${SITE_URL}${path}" />`);
    expect(html.includes('<meta name="robots" content="noindex" />')).toBe(!meta.index);
    expect(html).toContain(`<div id="root" data-route="${path}"><div class="app">`);
    expect(all(html, /<h1[ >]/)).toHaveLength(1);
    // Blocked by the CSP: inline scripts (React's streaming helpers) and style attributes.
    expect(all(html, /<script(?! type="(?:module"|application\/ld\+json"))/)).toHaveLength(0);
    expect(html).not.toMatch(/<[a-z][^>]*\sstyle=/);
    expect(html).not.toContain('wird geladen');
  });

  it('topic pages list every skill a first visitor sees, also in their structured data', async () => {
    const mods = await loadAllTopics();
    for (const mod of mods) {
      const html = files.get(`thema/${mod.topicId}.html`)!;
      const skills = mod.skills.filter((s) => !s.optional);
      for (const s of skills) expect(html).toContain(`>${s.title}<`);
      const [ld] = jsonLd(html);
      const resource = ld['@graph'].find((n: { '@type': string }) => n['@type'] === 'LearningResource');
      expect(resource.teaches).toEqual(skills.map((s) => s.title));
      expect(resource.url).toBe(`${SITE_URL}/thema/${mod.topicId}`);
      const crumbs = ld['@graph'].find((n: { '@type': string }) => n['@type'] === 'BreadcrumbList');
      expect(crumbs.itemListElement.map((i: { item: string }) => i.item)).toEqual([`${SITE_URL}/`, `${SITE_URL}/thema/${mod.topicId}`]);
    }
  });

  it('the start page names the site (WebSite) and links every topic', () => {
    const html = files.get('index.html')!;
    expect(jsonLd(html)).toEqual([
      expect.objectContaining({
        '@context': 'https://schema.org',
        '@graph': [expect.objectContaining({ '@type': 'WebSite', name: 'Mathe 4', url: `${SITE_URL}/` })],
      }),
    ]);
    for (const t of TOPICS) expect(html).toContain(`href="/thema/${t.id}"`);
  });

  it('404.html and the app shell are never indexed; the shell has no content to hydrate', () => {
    const notFound = files.get(NOT_FOUND_FILE)!;
    expect(notFound).toContain('<meta name="robots" content="noindex" />');
    expect(notFound).toContain('<div id="root" data-route="404">');
    expect(notFound).toContain('Diese Seite gibt es nicht');
    const shell = files.get(APP_SHELL_FILE)!;
    expect(shell).toContain('<meta name="robots" content="noindex" />');
    expect(shell).toContain('<div id="root"></div>');
    expect(shell).not.toContain('rel="canonical"');
  });

  it('sitemap.xml lists exactly the indexed pages; robots.txt points to it', () => {
    const locs = all(files.get('sitemap.xml')!, /<loc>([^<]*)<\/loc>/).map((m) => m[1]);
    const indexed = PRERENDERED_PATHS.filter((p) => pageMeta(matchRoute(p)).index).map((p) => `${SITE_URL}${p}`);
    expect(locs).toEqual(indexed);
    expect(files.get('robots.txt')).toContain(`Sitemap: ${SITE_URL}/sitemap.xml`);
  });

  it('fillTemplate fails loudly when index.html no longer has the expected tags', () => {
    expect(() => fillTemplate(TEMPLATE.replace(/<title>[^<]*<\/title>/, ''), '', '', '/')).toThrow(/<title>/);
    expect(() => fillTemplate(TEMPLATE.replace('<div id="root"></div>', ''), '', '', '/')).toThrow(/root/);
  });
});

describe('firebase.json', () => {
  // Firebase globs: ** matches across slashes, * within one segment.
  const glob = (g: string) => new RegExp(`^${g.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*\*/g, '\0').replace(/\*/g, '[^/]*').replace(/\0/g, '.*')}$`);
  const rewritten = (path: string) => FIREBASE.hosting.rewrites.find((r) => glob(r.source).test(path));
  const served = (path: string) => (rewritten(path) ? 'shell' : PRERENDERED_PATHS.includes(path) ? 'file' : '404');

  it('serves every client-only route from the app shell, prerendered pages as files, and 404 for the rest', () => {
    expect(FIREBASE.hosting.cleanUrls).toBe(true);
    for (const r of FIREBASE.hosting.rewrites) expect(r.destination).toBe(`/${APP_SHELL_FILE}`);
    for (const p of ['/fortschritt', '/abzeichen', '/wiederholen', '/blitz', '/ueben/zahlen.runden/2', '/mix/geometrie']) {
      expect(matchRoute(p).name).not.toBe('notFound');
      expect(served(p), p).toBe('shell');
    }
    for (const p of PRERENDERED_PATHS) expect(served(p), p).toBe('file');
    for (const p of ['/gibt-es-nicht', '/thema', '/thema/gibt-es-nicht', '/arbeitsblatt/x']) {
      expect(matchRoute(p).name).toBe('notFound');
      expect(served(p), p).toBe('404');
    }
  });
});
