/**
 * Impressum (§ 5 DDG, § 18 Abs. 2 MStV). Data from src/config/operator.ts — placeholders while empty, never invented.
 */
import { OPERATOR } from '../../config/operator';
import { PageTitle } from '../app/PageTitle';
import { Link } from '../app/router';
import { PATHS } from '../app/routes';
import { OperatorAddress, OperatorContact, Placeholder } from './OperatorDetails';

export default function ImprintPage() {
  const responsible = OPERATOR.contentResponsible.trim() || OPERATOR.name.trim();
  return (
    <div className="page legal-page">
      <PageTitle docTitle="Impressum">Impressum</PageTitle>
      <div className="prose">
        <h2>Angaben gemäß § 5 DDG</h2>
        <OperatorAddress />

        <h2>Kontakt</h2>
        <OperatorContact />

        <h2>Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV</h2>
        <p>
          {responsible || <Placeholder />}
          {OPERATOR.contentResponsibleAddress.trim() && (
            <>
              <br />
              {OPERATOR.contentResponsibleAddress}
            </>
          )}
          {!OPERATOR.contentResponsibleAddress.trim() && responsible && (
            <>
              <br />
              Anschrift wie oben
            </>
          )}
        </p>

        <h2>Über dieses Angebot</h2>
        <p>
          Mathe 4 ist ein kostenloses Übungsangebot für Kinder der 4. Klasse. Es gibt keine Werbung, keine Anmeldung und
          keine Käufe. Die Aufgaben werden im Browser erzeugt.
        </p>
        <p>
          Informationen zum Umgang mit Daten finden Sie unter <Link to={PATHS.privacy}>Datenschutz</Link>.
        </p>
      </div>
    </div>
  );
}
