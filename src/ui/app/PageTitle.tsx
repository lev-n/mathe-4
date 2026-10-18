import type { ReactNode } from 'react';
import { useDocumentTitle } from './hooks';

/**
 * The page <h1>. tabIndex -1 so the router can move focus here after a navigation.
 * Also sets document.title ('<docTitle> – Mathe 4'; docTitle null = home page title).
 */
export function PageTitle({ children, docTitle, className }: { children: ReactNode; docTitle: string | null; className?: string }) {
  useDocumentTitle(docTitle);
  return (
    <h1 tabIndex={-1} className={className ? `page-title ${className}` : 'page-title'}>
      {children}
    </h1>
  );
}

/** Calm loading text (no spinner animation). */
export function Loading({ text = 'Einen Moment, die Seite wird geladen …' }: { text?: string }) {
  return (
    <p className="loading" role="status">
      {text}
    </p>
  );
}
