/**
 * "Für Eltern und Lehrkräfte": how the app works (docs/research.md in plain German), all settings,
 * storage status + backup/restore/delete, and the curriculum alignment.
 */
import { useRef, useState } from 'react';
import type { ChangeEvent, ReactNode } from 'react';
import type { TopicId } from '../../core/types';
import { TOPIC_ALIGNMENT } from '../../data/curriculum';
import { DOC_TITLES } from '../../seo/meta';
import { badgeById } from '../../state/badges';
import { today } from '../../state/dates';
import { IMPORT_MESSAGES, MAX_IMPORT_CHARS, parseText } from '../../state/schema';
import { STORAGE_KEY, store } from '../../state/store';
import type { ProgressState, Settings } from '../../state/types';
import { useConsent, useProgress, useSaveStatus, useSettings } from '../../state/useProgress';
import { SAVE_FAILED_ADULT } from '../practice/phrases';
import { TOPICS } from '../../topics/registry';
import { formatDay } from '../app/labels';
import { PageTitle } from '../app/PageTitle';
import { Link } from '../app/router';
import { PATHS } from '../app/routes';

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Triggers a file download of `text` (Blob + temporary <a download>). */
export function downloadText(filename: string, text: string, type = 'application/json'): void {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  a.className = 'visually-hidden';
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function readFileText(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error ?? new Error('read failed'));
    reader.readAsText(file);
  });
}

export const backupFilename = (day: string): string => `mathe4-fortschritt-${day}.json`;

function update(patch: Partial<Settings>) {
  store.updateSettings(patch);
}

// ─── Small form controls (labels are the hit area, ≥ 48 px) ──────────────────

function Toggle({ checked, onChange, label, hint, id }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: ReactNode; id: string }) {
  return (
    <div className="setting">
      <label className="check-row" htmlFor={id}>
        <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} aria-describedby={hint ? `${id}-hint` : undefined} />
        <span className="check-row__title">{label}</span>
      </label>
      {hint && (
        <p className="hint setting__hint" id={`${id}-hint`}>
          {hint}
        </p>
      )}
    </div>
  );
}

function RadioGroup<T extends string | number>({
  legend,
  name,
  value,
  options,
  onChange,
  hint,
  segmented = false,
}: {
  legend: string;
  name: string;
  value: T;
  options: { value: T; label: string; hint?: string }[];
  onChange: (v: T) => void;
  hint?: ReactNode;
  segmented?: boolean;
}) {
  return (
    <fieldset className="choice-group setting">
      <legend>{legend}</legend>
      {hint && <p className="hint setting__hint">{hint}</p>}
      <div className={segmented ? 'segmented' : 'check-list'}>
        {options.map((o) => (
          <label key={String(o.value)} className={segmented ? 'segmented__item' : 'check-row'}>
            <input type="radio" name={name} value={String(o.value)} checked={value === o.value} onChange={() => onChange(o.value)} />
            <span>
              <span className="check-row__title">{o.label}</span>
              {o.hint && <span className="check-row__desc">{o.hint}</span>}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

// ─── Sections ───────────────────────────────────────────────────────────────

function HowItWorks() {
  return (
    <section aria-labelledby="how-title" className="prose">
      <h2 id="how-title">So funktioniert das Üben</h2>

      <h3>Selbst rechnen statt nur lesen</h3>
      <p>
        Jede Aufgabe verlangt eine eigene Antwort. Wer Wissen aktiv aus dem Gedächtnis abruft, behält es besser als beim
        bloßen Wiederlesen. Dieser Testungseffekt gehört zu den am besten belegten Befunden der Lernforschung.
      </p>

      <h3>Rückmeldung, die weiterhilft</h3>
      <ul>
        <li>Der Knopf „Tipp“ ist immer sichtbar. Er gibt einen Denkanstoß, aber nie die Lösung.</li>
        <li>
          Stimmt eine Antwort noch nicht, kommt ein gezielter Hinweis – oft passend zum typischen Fehler, etwa einem
          vergessenen Übertrag – und ein zweiter Versuch.
        </li>
        <li>
          Nach dem zweiten Fehlversuch zeigt die App den Lösungsweg mit den Zahlen der Aufgabe und danach eine ähnliche
          „Zwillingsaufgabe“.
        </li>
      </ul>
      <p>
        Erklärende Rückmeldungen wirken in Studien deutlich stärker als die reine Auskunft, ob eine Antwort stimmt.
      </p>

      <h3>Lob für den Weg, nicht für die Person</h3>
      <p>
        Rückmeldungen benennen, was das Kind getan hat: „Richtig! Du hast an den Übertrag gedacht.“ oder „Geschafft – du
        bist drangeblieben.“ Eigenschaften, Tempo oder Superlative werden nicht gelobt. Dass solches Prozesslob langfristig
        hilft, ist vor allem in Beobachtungsstudien gezeigt; es kostet aber nichts und birgt wenig Risiko.
      </p>

      <h3>Drei Stufen, nichts ist gesperrt</h3>
      <p>
        Stufe 1 bis 3 entsprechen grob den Anforderungsbereichen I bis III der KMK-Bildungsstandards: Grundlagen, Zusammenhänge
        herstellen, Verallgemeinern und Begründen. Die App schlägt eine Stufe vor („Empfohlen“), das Kind darf aber jede Stufe wählen.
      </p>

      <h3>Sterne zeigen den Lernstand</h3>
      <ul>
        <li>1 Stern – Geübt: Die Stufe wurde bearbeitet.</li>
        <li>
          2 Sterne – Sicher: Mindestens 8 der letzten 10 Aufgaben wurden im ersten Versuch ohne Tipp gelöst, darunter die
          letzten 3.
        </li>
        <li>
          3 Sterne – Gemeistert: Zusätzlich wurden mindestens 4 der letzten 5 Kontrollen im ersten Versuch gelöst (Wiederholungen
          frühestens 3 Tage nach „Sicher“), und die Stufe wurde an mindestens 3 verschiedenen Tagen geübt.
        </li>
      </ul>
      <p>
        Sterne bedeuten nur den Lernstand, nie die Leistung in einer einzelnen Runde. Die Schwellen sind begründete
        Faustregeln, keine geprüften Normen.
      </p>

      <h3>Wiederholen mit Abstand</h3>
      <p>
        Was sicher sitzt, kommt nach 1, 3, 7, 14 und 28 Tagen wieder („Heute wiederholen“, höchstens 8 Aufgaben am Tag).
        Verteiltes Üben hält Wissen deutlich länger als Üben am Stück – Kinder verteilen ihr Üben aber selten von selbst.
        Überfällige Aufgaben warten einfach, ohne Mahnung.
      </p>

      <h3>Gemischte Übung</h3>
      <p>
        Sobald zwei Bereiche eines Themas „Sicher“ sind, gibt es gemischte Runden. Dabei sinkt die Trefferquote oft
        vorübergehend. Das ist normal und gewollt: Das Kind muss jedes Mal neu entscheiden, welcher Rechenweg passt.
        Langfristig bleibt dadurch mehr hängen.
      </p>

      <h3>Warum es keine Zeitlimits, Serien und Ranglisten gibt</h3>
      <ul>
        <li>
          <strong>Keine Uhr:</strong> Zeitdruck kann Stress und Matheangst verstärken. Die freiwillige Blitzrunde (2 Minuten,
          nur mit bereits gemeisterten Einmaleins-Aufgaben) ist zunächst ausgeschaltet und zählt nicht für Sterne oder Abzeichen.
        </li>
        <li>
          <strong>Keine Tagesserien:</strong> „Streaks“ wirken über die Angst, etwas zu verlieren. Stattdessen gibt es ein
          freiwilliges Wochenziel, das sich jeden Montag still zurücksetzt, und einen Zähler der Übungstage, der nie sinkt.
        </li>
        <li>
          <strong>Keine Ranglisten:</strong> Vergleiche mit anderen können Kindern schaden, die (noch) hinten liegen. Jedes
          Kind sieht nur die eigene Entwicklung.
        </li>
        <li>
          <strong>Keine Punkte, Münzen oder Shops:</strong> Angekündigte Belohnungen können die Freude an der Sache mindern –
          bei Kindern stärker als bei Erwachsenen. Abzeichen kommen deshalb überraschend und benennen eine Fähigkeit oder einen
          Fortschritt.
        </li>
      </ul>

      <h3>Abzeichen fürs Besserwerden</h3>
      <p>
        Die wichtigsten Abzeichen gibt es nicht fürs Richtigmachen beim ersten Mal, sondern dafür, dass etwas, das am Anfang
        schwerfiel, später gelingt: an einem anderen Tag oder in der Wiederholung nach ein paar Tagen. Verglichen wird nur mit dem
        eigenen früheren Stand. Kleine Fortschritte in einer Runde bekommen nur einen kurzen Satz. Mit absichtlich verkehrten
        Antworten allein lässt sich kein Abzeichen verdienen: Jedes braucht echte Erfolge an späteren Tagen oder in einer
        Wiederholung. Unter „Mein Fortschritt“ zeigt „So hast du dich verbessert“, was besser geworden ist. Dafür werden
        nur Zahlen, Fehlerarten und Tage gespeichert, wie alles andere nur auf diesem Gerät und erst nach „Ja, merken“.
      </p>

      <h3>Faires Design</h3>
      <p>
        Das Kind kann jede Runde jederzeit mit einem Klick verlassen. Es gibt kein automatisches Weiterspielen, keine Pop-ups während
        einer Runde, keine Erinnerungen, keine E-Mails und keinen Ton. Nach etwa 20 Minuten schlägt die App eine Pause vor.
        Eine Runde hat 10 Aufgaben und dauert etwa 10 bis 15 Minuten.
      </p>

      <h3>Worauf das beruht</h3>
      <p>
        Die Gestaltung stützt sich auf eine Auswertung der Forschung zu Lernen, Motivation, Barrierefreiheit und Datenschutz
        (unter anderem Metaanalysen zu Abrufübung, verteiltem und gemischtem Üben, Rückmeldung, Lösungsbeispielen und
        Belohnungen) sowie auf die KMK-Bildungsstandards 2022. Viele Effekte sind in Studien mit älteren Lernenden belegt und
        bei Grundschulkindern kleiner oder unsicherer.
      </p>
    </section>
  );
}

function SettingsSection() {
  const s = useSettings();
  const consent = useConsent();
  const saveStatus = useSaveStatus();
  return (
    <section aria-labelledby="settings-title" className="settings">
      <h2 id="settings-title">Einstellungen</h2>
      {consent === 'granted' && saveStatus !== 'ok' ? (
        <p className="notice" data-testid="settings-status">
          <span>Die Einstellungen gelten sofort. {SAVE_FAILED_ADULT}</span>
        </p>
      ) : consent === 'granted' ? (
        <p data-testid="settings-status">Die Einstellungen gelten sofort und werden mit dem Fortschritt auf diesem Gerät gespeichert.</p>
      ) : (
        // Without the opt-in nothing is written to storage (§ 25 TDDDG), so settings last only for this visit.
        <p className="notice" data-testid="settings-status">
          <span>
            Die Einstellungen gelten sofort, aber nur, bis die Seite geschlossen wird. Damit sie erhalten bleiben, wählen Sie
            unten <a href="#storage-title">„Fortschritt auf diesem Gerät merken“</a>.
          </span>
        </p>
      )}

      <RadioGroup
        legend="Schriftliche Subtraktion"
        name="set-sub"
        value={s.subtractionMethod}
        onChange={(v) => update({ subtractionMethod: v })}
        hint="Wählen Sie das Verfahren, das in der Klasse gelernt wird. Innerhalb einer Übung wird nie gemischt."
        options={[
          {
            value: 'abziehen',
            label: 'Abziehen (Entbündeln) – z. B. Bayern',
            hint: 'Ist die obere Ziffer zu klein, wird an der nächsten Stelle entbündelt, z. B. 1 Zehner in 10 Einer getauscht.',
          },
          {
            value: 'ergaenzen',
            label: 'Ergänzen (Erweitern)',
            hint: 'Man ergänzt von der unteren zur oberen Ziffer. Reicht es nicht, werden beide Zahlen um gleich viel erweitert (Übertrag unten).',
          },
        ]}
      />

      <fieldset className="choice-group setting">
        <legend>Inhalte</legend>
        <Toggle
          id="set-nrw"
          checked={s.nrwExtras}
          onChange={(v) => update({ nrwExtras: v })}
          label="NRW-Zusatzthemen zeigen"
          hint="Tonne, Datenmengen, Binärzahlen und Multiplikation mit dreistelligen Zahlen. Sie zählen nicht für Abzeichen."
        />
        <Toggle
          id="set-blitz"
          checked={s.blitzrunde}
          onChange={(v) => update({ blitzrunde: v })}
          label="Blitzrunde erlauben"
          hint="2 Minuten Einmaleins mit Aufgaben, die schon gemeistert sind. Ohne Einfluss auf Sterne und Abzeichen."
        />
      </fieldset>

      <RadioGroup
        legend="Wochenziel: Übungstage pro Woche"
        name="set-goal"
        value={s.weeklyGoal}
        onChange={(v) => update({ weeklyGoal: v })}
        hint="Das Ziel setzt sich jeden Montag still zurück. Es geht nichts verloren."
        segmented
        options={[1, 2, 3, 4, 5].map((n) => ({ value: n, label: String(n) }))}
      />

      <fieldset className="choice-group setting">
        <legend>Darstellung</legend>
        <Toggle id="set-large" checked={s.largeText} onChange={(v) => update({ largeText: v })} label="Schrift größer" hint="Alle Texte 25 % größer." />
        <Toggle
          id="set-spacing"
          checked={s.wideSpacing}
          onChange={(v) => update({ wideSpacing: v })}
          label="Mehr Abstand"
          hint="Mehr Platz zwischen Buchstaben, Wörtern und Zeilen. Das kann beim Lesen helfen."
        />
        <Toggle
          id="set-motion"
          checked={s.reduceMotion}
          onChange={(v) => update({ reduceMotion: v })}
          label="Animationen aus"
          hint="Alles erscheint sofort, ohne Bewegung."
        />
        <Toggle
          id="set-font"
          checked={s.schoolFont}
          onChange={(v) => update({ schoolFont: v })}
          label="Schulschrift (Andika)"
          hint="Eine Schrift mit Buchstabenformen wie in der Grundschule."
        />
      </fieldset>

      <RadioGroup
        legend="Ziffernblock auf dem Bildschirm"
        name="set-keypad"
        value={s.keypad}
        onChange={(v) => update({ keypad: v })}
        options={[
          { value: 'auto', label: 'Automatisch', hint: 'An bei Geräten mit Touchscreen, sonst aus.' },
          { value: 'on', label: 'An' },
          { value: 'off', label: 'Aus', hint: 'Die Tastatur des Geräts wird benutzt.' },
        ]}
      />
    </section>
  );
}

type Message = { kind: 'ok' | 'error'; text: string } | null;

/**
 * Files larger than this cannot be a valid backup (≤ MAX_IMPORT_CHARS characters, and UTF-8 needs at most
 * 3 bytes per UTF-16 code unit; ×4 leaves headroom), so they are rejected before being read into memory.
 */
export const MAX_IMPORT_BYTES = MAX_IMPORT_CHARS * 4;

/** True if loading a file would overwrite something (asks for confirmation first). */
export function hasProgress(state: ProgressState): boolean {
  return (
    state.totals.answered > 0 ||
    state.days.length > 0 ||
    Object.keys(state.skills).length > 0 ||
    Object.keys(state.facts).length > 0 ||
    Object.keys(state.badges).length > 0 ||
    state.blitzBest !== undefined
  );
}

const isKnownBadge = (id: string) => badgeById(id) !== undefined;
const lastDay = (days: readonly string[]): string => (days.length > 0 ? formatDay(days[days.length - 1]) : 'noch keiner');
const importError = (text: string): Message => ({ kind: 'error', text: `Die Datei konnte nicht geladen werden: ${text}` });

/** Pending confirmation: "Fortschritt löschen" or loading a file over existing progress. */
type Pending = { kind: 'delete' } | { kind: 'import'; text: string; fileLastDay: string } | null;

export function StorageSection() {
  const consent = useConsent();
  const saveStatus = useSaveStatus();
  const progress = useProgress();
  const [message, setMessage] = useState<Message>(null);
  const [pending, setPending] = useState<Pending>(null);
  const confirmRef = useRef<HTMLDivElement>(null);
  const deleteRef = useRef<HTMLButtonElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const focusLater = (el: { current: HTMLElement | null }) => window.setTimeout(() => el.current?.focus(), 0);

  function exportProgress() {
    try {
      downloadText(backupFilename(today()), store.exportJson());
      setMessage({ kind: 'ok', text: 'Die Datei mit dem Fortschritt wurde heruntergeladen.' });
    } catch {
      setMessage({ kind: 'error', text: 'Die Datei konnte nicht erstellt werden.' });
    }
  }

  function applyImport(text: string) {
    const result = store.importJson(text);
    if (!result.ok) {
      setMessage(importError(result.error));
      return;
    }
    const kept = store.getConsent() === 'granted';
    setMessage({
      kind: 'ok',
      text: kept
        ? 'Der Fortschritt wurde geladen.'
        : 'Der Fortschritt wurde geladen. Damit er erhalten bleibt, wählen Sie oben „Fortschritt auf diesem Gerät merken“.',
    });
  }

  async function importProgress(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setPending(null);
    if (file.size > MAX_IMPORT_BYTES) {
      setMessage(importError(IMPORT_MESSAGES['too-large']));
      return;
    }
    let text: string;
    try {
      text = await readFileText(file);
    } catch {
      setMessage({ kind: 'error', text: 'Die Datei konnte nicht gelesen werden.' });
      return;
    }
    // Check the file first, so nobody is asked to replace their progress with a broken file.
    const parsed = parseText(text, isKnownBadge);
    if (!parsed.ok) {
      setMessage(importError(IMPORT_MESSAGES[parsed.error]));
      return;
    }
    if (!hasProgress(store.get())) {
      applyImport(text);
      return;
    }
    setMessage(null);
    setPending({ kind: 'import', text, fileLastDay: lastDay(parsed.state.days) });
    focusLater(confirmRef);
  }

  function confirmImport() {
    if (pending?.kind !== 'import') return;
    applyImport(pending.text);
    setPending(null);
    focusLater(fileRef);
  }

  function askDelete() {
    setPending({ kind: 'delete' });
    setMessage(null);
    focusLater(confirmRef);
  }

  function cancel() {
    const kind = pending?.kind;
    setPending(null);
    focusLater(kind === 'import' ? fileRef : deleteRef);
  }

  function confirmDelete() {
    store.reset();
    setPending(null);
    setMessage({ kind: 'ok', text: 'Der Fortschritt wurde gelöscht.' });
    focusLater(deleteRef);
  }

  return (
    <section aria-labelledby="storage-title" className="storage">
      <h2 id="storage-title">Fortschritt speichern</h2>
      <div className="status-box" data-testid="storage-status">
        {consent === 'granted' ? (
          <>
            {saveStatus === 'newer' ? (
              <p>
                <strong>{SAVE_FAILED_ADULT}</strong> Auf diesem Gerät ist Fortschritt aus einer neueren Version von Mathe 4
                gespeichert. Er wird hier nicht überschrieben. Laden Sie die Seite neu, oder löschen Sie ihn mit „Fortschritt
                löschen“, damit wieder gespeichert wird.
              </p>
            ) : saveStatus === 'failed' ? (
              <p>
                <strong>{SAVE_FAILED_ADULT}</strong> Der Browser lässt das Speichern nicht zu (zum Beispiel im privaten Modus
                oder wenn der Speicher voll ist). Mit „Fortschritt sichern“ können Sie ihn in einer Datei aufbewahren.
              </p>
            ) : (
              <p>
                <strong>Der Fortschritt wird auf diesem Gerät gespeichert</strong> – im Browser unter dem Eintrag „{STORAGE_KEY}“.
                Nichts wird verschickt.
              </p>
            )}
            <button type="button" className="btn" onClick={() => store.forget()}>
              Nicht mehr merken
            </button>
            <p className="hint">Löscht den Eintrag auf diesem Gerät. Bis zum Schließen der Seite bleibt der Fortschritt erhalten.</p>
          </>
        ) : (
          <>
            <p>
              <strong>Der Fortschritt wird zurzeit nicht gespeichert.</strong> Er geht verloren, wenn die Seite geschlossen wird.
            </p>
            <button type="button" className="btn" onClick={() => store.setConsent('granted')}>
              Fortschritt auf diesem Gerät merken
            </button>
            <p className="hint">Wird nur in diesem Browser gespeichert. Nichts wird verschickt.</p>
          </>
        )}
      </div>
      <p className="hint">
        Der Fortschritt gehört zu einem Kind: Mathe 4 kennt keine Namen und unterscheidet nicht, wer übt. Üben mehrere Kinder
        im selben Browser, mischt sich ihr Fortschritt. Dann hilft ein eigenes Browser-Profil für jedes Kind.
      </p>

      <h3>Sichern und laden</h3>
      <p>
        Mit einer Sicherungsdatei können Sie den Fortschritt aufbewahren oder auf ein anderes Gerät übertragen. Manche
        Browser (z. B. Safari) und Gastzugänge auf Schulgeräten löschen gespeicherte Daten nach einiger Zeit.
      </p>
      <div className="row">
        <button type="button" className="btn" onClick={exportProgress}>
          Fortschritt sichern
        </button>
        <label className="btn file-btn">
          Fortschritt laden
          <input ref={fileRef} type="file" accept="application/json,.json" className="visually-hidden" onChange={importProgress} />
        </label>
      </div>
      {pending?.kind === 'import' && (
        <div className="confirm-box" ref={confirmRef} tabIndex={-1} role="group" aria-labelledby="import-confirm-text">
          <p id="import-confirm-text">
            <strong>Den jetzigen Fortschritt durch die Datei ersetzen?</strong> Sterne, Abzeichen und Übungstage auf diesem
            Gerät werden überschrieben.
          </p>
          <p data-testid="import-days">
            Letzter Übungstag in der Datei: {pending.fileLastDay}. Auf diesem Gerät: {lastDay(progress.days)}.
          </p>
          <p className="hint">Mit „Erst sichern“ bewahren Sie den jetzigen Fortschritt vorher in einer Datei auf.</p>
          <div className="row">
            <button type="button" className="btn btn--primary" onClick={confirmImport}>
              Ja, ersetzen
            </button>
            <button type="button" className="btn" onClick={exportProgress}>
              Erst sichern
            </button>
            <button type="button" className="btn" onClick={cancel}>
              Abbrechen
            </button>
          </div>
        </div>
      )}

      <h3>Löschen</h3>
      {pending?.kind !== 'delete' ? (
        <button ref={deleteRef} type="button" className="btn" onClick={askDelete}>
          Fortschritt löschen
        </button>
      ) : (
        <div className="confirm-box" ref={confirmRef} tabIndex={-1} role="group" aria-labelledby="confirm-text">
          <p id="confirm-text">
            <strong>Wirklich den ganzen Fortschritt löschen?</strong> Sterne, Abzeichen und Übungstage werden entfernt. Die
            Einstellungen bleiben.
          </p>
          <div className="row">
            <button type="button" className="btn btn--primary" onClick={confirmDelete}>
              Ja, löschen
            </button>
            <button type="button" className="btn" onClick={cancel}>
              Abbrechen
            </button>
          </div>
        </div>
      )}

      <p className={message ? `message message--${message.kind}` : 'message'} role="status" data-testid="storage-message">
        {message?.text}
      </p>
    </section>
  );
}

/** Keep digit groups like '1 000 000' together (curriculum texts use plain spaces). */
function keepNumbersTogether(text: string): string {
  return text.replace(/(\d) (?=\d{3}(?!\d))/g, '$1\u202F');
}

function CurriculumSection() {
  return (
    <section aria-labelledby="curriculum-title">
      <h2 id="curriculum-title">Bezug zum Lehrplan</h2>
      <p>
        Grundlage sind die KMK-Bildungsstandards Mathematik für den Primarbereich (Fassung vom 23.06.2022), der LehrplanPLUS
        Bayern (Jahrgangsstufen 3/4) und der Lehrplan Mathematik NRW (2021).
      </p>
      <table className="align-table" role="table">
        <caption className="visually-hidden">Themen von Mathe 4 und ihr Bezug zu KMK, Bayern und NRW</caption>
        <thead role="rowgroup">
          <tr role="row">
            <th scope="col" role="columnheader">Thema</th>
            <th scope="col" role="columnheader">KMK-Leitideen</th>
            <th scope="col" role="columnheader">Bayern (LehrplanPLUS)</th>
            <th scope="col" role="columnheader">NRW (Lehrplan 2021)</th>
          </tr>
        </thead>
        <tbody role="rowgroup">
          {TOPICS.map((t) => {
            const a = TOPIC_ALIGNMENT[t.id as TopicId];
            return (
              <tr key={t.id} role="row">
                <th scope="row" role="rowheader">
                  {t.title}
                </th>
                <td role="cell" data-label="KMK-Leitideen">
                  {a.kmk.join(', ')}
                </td>
                <td role="cell" data-label="Bayern">
                  {keepNumbersTogether(a.bayern)}
                </td>
                <td role="cell" data-label="NRW">
                  {keepNumbersTogether(a.nrw)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="note">
        <strong>Schriftliche Division ist länderspezifisch.</strong> Sie ist nicht Teil der KMK-Bildungsstandards. In Bayern
        ist sie verbindlich (Divisoren bis 10, auch mit Rest), in NRW wird das Verfahren mit einstelligen Divisoren erläutert.
        Mathe 4 übt sie mit einstelligen Divisoren und kennzeichnet sie entsprechend.
      </p>
      <p>
        Zum Ausdrucken gibt es <Link to={PATHS.worksheet}>Arbeitsblätter mit Lösungsblatt</Link>.
      </p>
    </section>
  );
}

export default function AdultsPage() {
  return (
    <div className="page adults-page">
      <PageTitle docTitle={DOC_TITLES.adults}>Für Eltern und Lehrkräfte</PageTitle>
      <p className="lead">
        Mathe 4 ist ein kostenloses Übungsportal für die 4. Klasse. Es braucht keine Anmeldung, zeigt keine Werbung und
        schickt keine Daten an Dritte.
      </p>
      <nav aria-label="Auf dieser Seite" className="toc">
        <ul>
          <li>
            <a href="#how-title">So funktioniert das Üben</a>
          </li>
          <li>
            <a href="#settings-title">Einstellungen</a>
          </li>
          <li>
            <a href="#storage-title">Fortschritt speichern</a>
          </li>
          <li>
            <a href="#curriculum-title">Bezug zum Lehrplan</a>
          </li>
        </ul>
      </nav>
      <HowItWorks />
      <SettingsSection />
      <StorageSection />
      <CurriculumSection />
      <p className="legal-links">
        <Link to={PATHS.privacy}>Datenschutz</Link> · <Link to={PATHS.imprint}>Impressum</Link>
      </p>
    </div>
  );
}
