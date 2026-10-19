/**
 * Datenschutzerklärung in two layers (docs/research.md P2/P4/P5):
 * a short "Für Kinder erklärt" box, then the full text for adults.
 * Operator data comes from src/config/operator.ts (placeholders while empty — never invented).
 */
import { OPERATOR } from '../../config/operator';
import { DOC_TITLES } from '../../seo/meta';
import { STORAGE_KEY } from '../../state/store';
import { PageTitle } from '../app/PageTitle';
import { Link } from '../app/router';
import { PATHS } from '../app/routes';
import { KIDS_PRIVACY } from '../app/kidsPrivacy';
import { OperatorAddress, OperatorContact } from './OperatorDetails';

export { KIDS_PRIVACY };

export default function PrivacyPage() {
  return (
    <div className="page legal-page">
      <PageTitle docTitle={DOC_TITLES.privacy}>Datenschutz</PageTitle>

      <section className="kids-box" aria-labelledby="kids-title">
        <h2 id="kids-title">Für Kinder erklärt</h2>
        <ul>
          {KIDS_PRIVACY.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </section>

      <div className="prose">
        <h2>Datenschutzerklärung für Erwachsene</h2>

        <h3>1. Verantwortlicher</h3>
        <p>Verantwortlich für die Datenverarbeitung auf dieser Website im Sinne der Datenschutz-Grundverordnung (DSGVO) ist:</p>
        <OperatorAddress />
        <OperatorContact />
        {OPERATOR.dataProtectionOfficer.trim() && <p>Datenschutzbeauftragte bzw. Datenschutzbeauftragter: {OPERATOR.dataProtectionOfficer}</p>}

        <h3>2. Das Wichtigste in Kürze</h3>
        <p>Mathe 4 ist so gebaut, dass möglichst keine personenbezogenen Daten entstehen:</p>
        <ul>
          <li>keine Benutzerkonten und keine Eingabefelder für Namen, Alter, Klasse oder Schule,</li>
          <li>keine Cookies,</li>
          <li>keine Analyse- oder Tracking-Werkzeuge, keine Werbung, kein Profiling,</li>
          <li>
            keine Anfragen an andere Anbieter: Schriften, Bilder und Programmcode kommen vom selben Server, es gibt
            keine eingebundenen Videos, Karten oder Social-Media-Knöpfe,
          </li>
          <li>alle Aufgaben werden im Browser erzeugt und geprüft; Antworten werden nicht an einen Server geschickt.</li>
        </ul>

        <h3>3. Hosting durch Google Firebase Hosting</h3>
        <p>
          Die Website wird über Firebase Hosting bereitgestellt, einen Dienst der Google Ireland Limited, Gordon House, Barrow
          Street, Dublin 4, Irland („Google“). Für die schnelle Auslieferung nutzt Google ein Content-Delivery-Netzwerk des
          Unterauftragsverarbeiters Fastly.
        </p>
        <p>
          Beim Aufruf der Website verarbeitet Google technisch notwendige Daten in Server-Protokollen, insbesondere die
          IP-Adresse, Datum und Uhrzeit des Abrufs, die abgerufene Datei sowie Angaben zum Browser. Das ist nötig, um die
          Website auszuliefern und um ihre Sicherheit und Stabilität zu gewährleisten, zum Beispiel zur Abwehr von Missbrauch.
          Nach Angaben von Google werden IP-Adressen dafür einige Monate gespeichert.
        </p>
        <p>
          Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO. Das berechtigte Interesse liegt in einer sicheren und zuverlässigen
          Bereitstellung der Website. Für die Verarbeitung gelten die Datenverarbeitungsbedingungen von Google (Data
          Processing and Security Terms).
        </p>

        <h3>4. Übermittlung in Drittländer</h3>
        <p>
          Es kann nicht ausgeschlossen werden, dass Daten auch in den USA verarbeitet werden. Google LLC ist nach dem
          EU-US Data Privacy Framework zertifiziert; die Übermittlung stützt sich auf den Angemessenheitsbeschluss der
          Europäischen Kommission vom 10. Juli 2023 (Art. 45 DSGVO). Zusätzlich sind EU-Standardvertragsklauseln vereinbart
          (Art. 46 Abs. 2 lit. c DSGVO).
        </p>

        <h3>5. Speicherung des Lernstands im Browser</h3>
        <p>
          Beim Aufruf schreibt Mathe 4 nichts auf Ihr Gerät. Erst wenn das Kind oder Sie ausdrücklich „Ja, merken“ wählen,
          speichert die App den Lernstand im lokalen Speicher des Browsers (localStorage) unter dem Eintrag „{STORAGE_KEY}“.
          Das Speichern geschieht auf ausdrücklichen Wunsch und ist für diese gewünschte Funktion unbedingt erforderlich
          (§ 25 Abs. 2 Nr. 2 TDDDG).
        </p>
        <p>Gespeichert werden nur zusammengefasste Lerndaten und Einstellungen:</p>
        <ul>
          <li>
            je Übungsbereich und Stufe: Anzahl der Aufgaben, ob die letzten Aufgaben im ersten Versuch gelöst wurden, an wie
            vielen Tagen geübt wurde, Lernstand, Ergebnisse der Wiederholungen, Wiederholungsstufe sowie letzter und nächster
            Übungstag,
          </li>
          <li>je Einmaleins-Aufgabe: wie oft sie geübt und richtig gelöst wurde, Wiederholungsstufe und nächster Wiederholungstag,</li>
          <li>
            für die Abzeichen fürs Besserwerden: je Übungsbereich und Stufe, wie viele der ersten 10 Aufgaben im ersten Versuch
            gelöst wurden und bei wie vielen etwas danebenging, das beste Ergebnis von 10 Aufgaben danach, der Tag, an dem zuletzt
            eine Aufgabe danebenging, und wie oft sie später in der Wiederholung klappte; je Übungsbereich, welche typischen
            Fehlerarten vorkamen (zum Beispiel „Übertrag vergessen“), wie oft sie danach vermieden wurden und der Tag dazu; je
            Einmaleins-Aufgabe der Tag, an dem sie zuletzt danebenging (jeweils nur das Datum, ohne Uhrzeit),
          </li>
          <li>Übungstage und die Zahl der Wiederholungen am selben Tag (nur das Datum, ohne Uhrzeit),</li>
          <li>welche Übung und Stufe zuletzt geübt wurde (für „Weiter üben“, ohne Datum und Uhrzeit),</li>
          <li>erhaltene Abzeichen mit Datum, die eigene beste Blitzrunde und einfache Summen, zum Beispiel die Zahl gelöster Aufgaben,</li>
          <li>die Einstellungen dieser Seite.</li>
        </ul>
        <p>
          Es werden keine Namen, kein Alter, keine Klasse oder Schule und keine frei eingegebenen Texte gespeichert. Die Daten
          verlassen das Gerät nicht; der Betreiber erhält sie nicht, verarbeitet sie nicht und kann sie nicht einsehen.
        </p>

        <h3>6. Löschen</h3>
        <p>
          Unter <Link to={PATHS.adults}>„Für Erwachsene“</Link> löscht „Fortschritt löschen“ alle gespeicherten Lerndaten.
          Mit „Nicht mehr merken“ können Sie das Speichern jederzeit beenden; der Eintrag wird dann vom Gerät entfernt. Sie
          können den Eintrag auch in den Einstellungen Ihres Browsers löschen („Websitedaten löschen“).
        </p>

        <h3>7. Kontakt per E-Mail</h3>
        <p>
          Wenn Sie uns eine E-Mail schreiben, verarbeiten wir Ihre Angaben nur, um Ihre Anfrage zu beantworten (Art. 6 Abs. 1
          lit. f DSGVO). Die Daten werden gelöscht, sobald sie dafür nicht mehr nötig sind und keine gesetzlichen
          Aufbewahrungspflichten bestehen.
        </p>

        <h3>8. Ihre Rechte</h3>
        <p>Sie haben nach der DSGVO folgende Rechte:</p>
        <ul>
          <li>Auskunft über die verarbeiteten Daten (Art. 15),</li>
          <li>Berichtigung unrichtiger Daten (Art. 16),</li>
          <li>Löschung (Art. 17),</li>
          <li>Einschränkung der Verarbeitung (Art. 18) und Mitteilung darüber an Empfänger (Art. 19),</li>
          <li>Datenübertragbarkeit (Art. 20),</li>
          <li>Widerspruch gegen eine Verarbeitung auf Grundlage von Art. 6 Abs. 1 lit. f (Art. 21),</li>
          <li>Beschwerde bei einer Datenschutz-Aufsichtsbehörde (Art. 77).</li>
        </ul>
        <p>
          Da der Betreiber selbst keine personenbezogenen Daten speichert, kann er Sie in der Regel nicht identifizieren (Art.
          11 DSGVO). Wenden Sie sich mit Fragen gern an die oben genannte Kontaktadresse.
        </p>

        <p className="legal-page__date">Stand: Oktober 2026</p>
      </div>
    </div>
  );
}
