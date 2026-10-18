/**
 * Keeps the page-specific <head> tags in step with client-side navigation. A fresh page load already has
 * them from its prerendered file; after navigating inside the app, the canonical link (used by "Teilen"
 * in browsers), the description and the noindex of e.g. "not found" must follow the page now shown.
 * The document title stays with <PageTitle>, which knows titles that depend on loaded data.
 */
import { useEffect, useRef } from 'react';
import { matchRoute } from '../ui/app/routes';
import { APP_NAME, pageMeta } from './meta';
import type { PageMeta } from './meta';

function setHeadTag(doc: Document, tag: 'meta' | 'link', key: [string, string], attr: string, value: string | null): void {
  let el = doc.head.querySelector(`${tag}[${key[0]}="${key[1]}"]`);
  if (value === null) {
    el?.remove();
    return;
  }
  if (!el) {
    el = doc.createElement(tag);
    el.setAttribute(key[0], key[1]);
    doc.head.appendChild(el);
  }
  el.setAttribute(attr, value);
}

export function applyHead(meta: PageMeta, doc: Document = document): void {
  setHeadTag(doc, 'meta', ['name', 'description'], 'content', meta.description);
  setHeadTag(doc, 'link', ['rel', 'canonical'], 'href', meta.canonical);
  setHeadTag(doc, 'meta', ['name', 'robots'], 'content', meta.index ? null : 'noindex');
  setHeadTag(doc, 'meta', ['property', 'og:title'], 'content', meta.title ?? APP_NAME);
  setHeadTag(doc, 'meta', ['property', 'og:description'], 'content', meta.description);
  setHeadTag(doc, 'meta', ['property', 'og:url'], 'content', meta.canonical);
}

export function useHeadSync(path: string): void {
  const initialPath = useRef(path);
  useEffect(() => {
    applyHead(pageMeta(matchRoute(path)));
    // Structured data describes the page the file was prerendered for; drop it once another page is shown.
    if (path !== initialPath.current) {
      document.head.querySelectorAll('script[type="application/ld+json"]').forEach((s) => s.remove());
    }
  }, [path]);
}
