import { describe, expect, it } from 'vitest';
import { SITE_URL } from '../config/site';
import { TOPICS } from '../topics/registry';
import { matchRoute } from '../ui/app/routes';
import type { Route } from '../ui/app/routes';
import { headHtml, jsonLdText, robotsTxt, sitemapXml } from './head';
import { documentTitle, pageMeta, prerenderKey } from './meta';
import { PRERENDERED_PATHS } from './prerender';

/** One path for every kind of route. */
const SAMPLE_PATHS = [
  ...PRERENDERED_PATHS,
  '/fortschritt',
  '/abzeichen',
  '/wiederholen',
  '/blitz',
  '/ueben/zahlen.runden/2',
  '/mix/geometrie',
  '/gibt-es-nicht',
];

describe('pageMeta', () => {
  it('covers every kind of route', () => {
    const kinds = new Set(SAMPLE_PATHS.map((p) => matchRoute(p).name));
    const all: Route['name'][] = ['home', 'topic', 'practice', 'progress', 'badges', 'worksheet', 'adults', 'privacy', 'imprint', 'notFound'];
    expect([...kinds].sort()).toEqual([...all].sort());
  });

  it('indexes exactly the start page, the topic pages, the worksheets and the adults page, each with a self-canonical', () => {
    const indexed = SAMPLE_PATHS.filter((p) => pageMeta(matchRoute(p)).index);
    expect(indexed).toEqual(['/', ...TOPICS.map((t) => `/thema/${t.id}`), '/arbeitsblatt', '/erwachsene']);
    for (const p of SAMPLE_PATHS) {
      const meta = pageMeta(matchRoute(p));
      // A noindex page with a canonical would send mixed signals.
      expect(meta.canonical).toBe(meta.index ? `${SITE_URL}${p}` : null);
    }
  });

  it('gives indexed pages unique titles (≤ 60 characters) and unique descriptions (70–160 characters)', () => {
    const metas = SAMPLE_PATHS.map((p) => pageMeta(matchRoute(p))).filter((m) => m.index);
    for (const m of metas) {
      expect(m.title!.length, m.title!).toBeLessThanOrEqual(60);
      expect(m.title).toMatch(/– Mathe 4$/);
      expect(m.description.length, m.description).toBeGreaterThanOrEqual(70);
      expect(m.description.length, m.description).toBeLessThanOrEqual(160);
      expect(m.description).toContain('4. Klasse');
    }
    expect(new Set(metas.map((m) => m.title)).size).toBe(metas.length);
    expect(new Set(metas.map((m) => m.description)).size).toBe(metas.length);
  });

  it('documentTitle: start page, other pages', () => {
    expect(documentTitle(null)).toBe('Mathe üben für die 4. Klasse, kostenlos – Mathe 4');
    expect(documentTitle('Impressum')).toBe('Impressum – Mathe 4');
  });

  it('prerenderKey: the path, or one key for every unknown path', () => {
    expect(prerenderKey(matchRoute('/thema/zahlen'), '/thema/zahlen')).toBe('/thema/zahlen');
    expect(prerenderKey(matchRoute('/gibt-es-nicht'), '/gibt-es-nicht')).toBe('404');
    expect(prerenderKey(matchRoute('/404'), '/404')).toBe('404');
  });
});

describe('head markup', () => {
  it('escapes text in attributes and the title', () => {
    const html = headHtml({ title: 'A & B <c> "d"', description: `it's "x"`, canonical: null, index: false });
    expect(html).toContain('<title>A &amp; B &lt;c&gt; &quot;d&quot;</title>');
    expect(html).toContain('content="it&#39;s &quot;x&quot;"');
    expect(html).toContain('<meta name="robots" content="noindex" />');
    expect(html).not.toContain('rel="canonical"');
    expect(html).not.toContain('og:url');
  });

  it('JSON-LD can never close its <script> element', () => {
    const text = jsonLdText({ name: '</script><script>alert(1)</script>' });
    expect(text).not.toContain('<');
    expect(JSON.parse(text)).toEqual({ name: '</script><script>alert(1)</script>' });
  });

  it('sitemap.xml and robots.txt', () => {
    expect(sitemapXml([`${SITE_URL}/`, `${SITE_URL}/thema/zahlen`])).toBe(
      `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
        `  <url>\n    <loc>${SITE_URL}/</loc>\n  </url>\n  <url>\n    <loc>${SITE_URL}/thema/zahlen</loc>\n  </url>\n</urlset>\n`,
    );
    expect(robotsTxt()).toBe(`User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`);
  });
});
