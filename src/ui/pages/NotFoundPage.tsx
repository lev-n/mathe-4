import { useEffect } from 'react';
import { PageTitle } from '../app/PageTitle';
import { Link } from '../app/router';
import { PATHS } from '../app/routes';

export const NOT_FOUND_TITLE = 'Seite nicht gefunden';

/**
 * Firebase Hosting answers every unknown path with index.html and status 200 (SPA rewrite), so search
 * engines are told not to index this page while it is shown.
 */
export function useNoIndex(): void {
  useEffect(() => {
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex';
    document.head.appendChild(meta);
    return () => meta.remove();
  }, []);
}

export default function NotFoundPage() {
  useNoIndex();
  return (
    <div className="page page--narrow not-found">
      <PageTitle docTitle={NOT_FOUND_TITLE}>Diese Seite gibt es nicht</PageTitle>
      <p>Vielleicht hat sich in der Adresse ein Tippfehler versteckt.</p>
      <p>Auf der Startseite findest du alle Themen.</p>
      <div className="row">
        <Link to={PATHS.home} className="btn btn--primary btn--lg">
          Zur Startseite
        </Link>
      </div>
    </div>
  );
}
