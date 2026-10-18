/**
 * Static <head> markup for the prerendered HTML files, plus sitemap.xml and robots.txt. The browser
 * updates the same tags after client-side navigation (useHeadSync), but crawlers and link previews
 * read them from these files, so everything that matters is here without JavaScript.
 */
import { SITE_URL } from '../config/site';
import { APP_NAME, HOME_DESCRIPTION, absoluteUrl } from './meta';
import type { PageMeta } from './meta';
import type { JsonLd } from './structuredData';

/** Social preview image (1200 × 630, public/og-image.png). */
export const OG_IMAGE = {
  path: '/og-image.png',
  width: 1200,
  height: 630,
  alt: 'Mathe 4: Mathe üben für die 4. Klasse – kostenlos, ohne Anmeldung, ohne Werbung',
} as const;

const escapeHtml = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

/** JSON for a <script type="application/ld+json"> block; `<` is escaped so the text can never close the element. */
export const jsonLdText = (data: JsonLd): string => JSON.stringify(data).replace(/</g, '\\u003c');

/** The page-specific <head> tags: title, description, canonical, robots, Open Graph / X card, JSON-LD. */
export function headHtml(meta: PageMeta, jsonLd: JsonLd | null = null): string {
  const title = meta.title ?? APP_NAME;
  const tag = (name: string, attrs: Record<string, string>) =>
    `<${name}${Object.entries(attrs)
      .map(([k, v]) => ` ${k}="${escapeHtml(v)}"`)
      .join('')} />`;
  const lines = [
    `<title>${escapeHtml(title)}</title>`,
    tag('meta', { name: 'description', content: meta.description }),
    meta.canonical ? tag('link', { rel: 'canonical', href: meta.canonical }) : null,
    meta.index ? null : tag('meta', { name: 'robots', content: 'noindex' }),
    tag('meta', { property: 'og:type', content: 'website' }),
    tag('meta', { property: 'og:site_name', content: APP_NAME }),
    tag('meta', { property: 'og:locale', content: 'de_DE' }),
    tag('meta', { property: 'og:title', content: title }),
    tag('meta', { property: 'og:description', content: meta.description }),
    meta.canonical ? tag('meta', { property: 'og:url', content: meta.canonical }) : null,
    tag('meta', { property: 'og:image', content: absoluteUrl(OG_IMAGE.path) }),
    tag('meta', { property: 'og:image:type', content: 'image/png' }),
    tag('meta', { property: 'og:image:width', content: String(OG_IMAGE.width) }),
    tag('meta', { property: 'og:image:height', content: String(OG_IMAGE.height) }),
    tag('meta', { property: 'og:image:alt', content: OG_IMAGE.alt }),
    tag('meta', { name: 'twitter:card', content: 'summary_large_image' }),
    jsonLd ? `<script type="application/ld+json">${jsonLdText(jsonLd)}</script>` : null,
  ];
  return lines.filter((l) => l !== null).join('\n    ');
}

/** Head of the app shell that serves practice rounds and the personal pages (they set their own title): never indexed. */
export const appShellHead = (): string => headHtml({ title: null, description: HOME_DESCRIPTION, canonical: null, index: false });

/** sitemap.xml with the indexed pages. No lastmod: Google only uses it when it is reliably accurate. */
export function sitemapXml(urls: readonly string[]): string {
  const entries = urls.map((u) => `  <url>\n    <loc>${escapeHtml(u)}</loc>\n  </url>`);
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join('\n')}\n</urlset>\n`;
}

/** All crawlers are welcome (search engines and AI search alike); noindex pages stay crawlable so the tag is seen. */
export function robotsTxt(): string {
  return `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`;
}
