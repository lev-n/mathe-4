import { DOC_TITLES } from '../../seo/meta';
import { PageTitle } from '../app/PageTitle';
import { Link } from '../app/router';
import { PATHS } from '../app/routes';

/** Also used for an unknown skill under /ueben/ (PracticeRoute). Search engines get noindex via src/seo/meta.ts. */
export const NOT_FOUND_TITLE = DOC_TITLES.notFound;

export default function NotFoundPage() {
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
