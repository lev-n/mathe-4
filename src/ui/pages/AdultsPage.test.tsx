// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { IMPORT_MESSAGES, serializeState } from '../../state/schema';
import { emptyState, store } from '../../state/store';
import type { Consent, ProgressState } from '../../state/types';
import { TOPICS } from '../../topics/registry';
import AdultsPage, { MAX_IMPORT_BYTES, backupFilename, hasProgress } from './AdultsPage';

// Mocked store: we only check that the UI calls the store API correctly.
vi.mock('../../state/store', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../state/store')>();
  let state: ProgressState = actual.emptyState();
  let consent: Consent = 'unknown';
  let saveStatus: 'ok' | 'failed' = 'ok';
  const listeners = new Set<() => void>();
  const emit = () => listeners.forEach((l) => l());
  const fake = {
    get: () => state,
    subscribe: (l: () => void) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    getConsent: () => consent,
    getSaveStatus: () => saveStatus,
    setConsent: vi.fn((c: 'granted' | 'denied') => {
      consent = c;
      emit();
    }),
    forget: vi.fn(() => {
      consent = 'denied';
      emit();
    }),
    reset: vi.fn(),
    updateSettings: vi.fn(),
    exportJson: vi.fn(() => '{"version":1,"days":["2026-10-17"]}'),
    importJson: vi.fn((): { ok: true } | { ok: false; error: string } => ({ ok: true })),
    recordAnswer: vi.fn(),
    recordRound: vi.fn(() => []),
    recordBlitz: vi.fn(() => false),
    __setConsent: (c: Consent) => {
      consent = c;
    },
    __setState: (s: ProgressState) => {
      state = s;
    },
    __setSaveStatus: (v: 'ok' | 'failed') => {
      saveStatus = v;
    },
  };
  return { ...actual, store: fake };
});

type FakeStore = typeof store & { __setConsent: (c: Consent) => void; __setState: (s: ProgressState) => void; __setSaveStatus: (v: 'ok' | 'failed') => void };
const fake = store as FakeStore;

let clicked: { href: string; download: string }[] = [];

beforeEach(() => {
  vi.clearAllMocks();
  fake.__setConsent('unknown');
  fake.__setState(emptyState());
  fake.__setSaveStatus('ok');
  clicked = [];
  URL.createObjectURL = vi.fn(() => 'blob:mathe4-test');
  URL.revokeObjectURL = vi.fn();
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
    clicked.push({ href: this.getAttribute('href') ?? '', download: this.download });
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function message() {
  return screen.getByTestId('storage-message').textContent ?? '';
}

/** A valid backup file (as written by "Fortschritt sichern"). */
function backup(days: string[] = ['2026-10-01']): string {
  return serializeState({ ...emptyState(), days });
}

const withProgress = (): ProgressState => ({
  ...emptyState(),
  days: ['2026-10-17'],
  totals: { answered: 10, firstTry: 8, afterHint: 1, rounds: 1, checksPassed: 0 },
});

describe('Fortschritt sichern / laden / löschen', () => {
  it('exports the store JSON as a file download', async () => {
    render(<AdultsPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Fortschritt sichern' }));
    expect(store.exportJson).toHaveBeenCalledOnce();
    expect(URL.createObjectURL).toHaveBeenCalledOnce();
    const blob = vi.mocked(URL.createObjectURL).mock.calls[0][0] as Blob;
    expect(blob.type).toBe('application/json');
    const text = await new Promise<string>((resolve) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.readAsText(blob);
    });
    expect(text).toBe('{"version":1,"days":["2026-10-17"]}');
    expect(clicked).toHaveLength(1);
    expect(clicked[0].href).toBe('blob:mathe4-test');
    expect(clicked[0].download).toMatch(/^mathe4-fortschritt-\d{4}-\d{2}-\d{2}\.json$/);
    expect(document.querySelectorAll('a[download]')).toHaveLength(0); // temporary link removed
    expect(message()).toContain('heruntergeladen');
  });

  it('imports a chosen file and reports success', async () => {
    render(<AdultsPage />);
    const input = screen.getByLabelText('Fortschritt laden') as HTMLInputElement;
    expect(input.type).toBe('file');
    const file = new File([backup()], 'sicherung.json', { type: 'application/json' });
    fireEvent.change(input, { target: { files: [file] } });
    // Nothing to lose on this device yet: loaded without asking.
    await waitFor(() => expect(store.importJson).toHaveBeenCalledWith(backup()));
    await waitFor(() => expect(message()).toMatch(/^Der Fortschritt wurde geladen\. Damit er erhalten bleibt/));
  });

  it('import with storage switched on says only that it was loaded', async () => {
    fake.__setConsent('granted');
    render(<AdultsPage />);
    fireEvent.change(screen.getByLabelText('Fortschritt laden'), { target: { files: [new File([backup()], 'a.json')] } });
    await waitFor(() => expect(message()).toBe('Der Fortschritt wurde geladen.'));
  });

  it('shows the store error when an import is rejected', async () => {
    vi.mocked(store.importJson).mockReturnValueOnce({ ok: false, error: 'Das ist keine Mathe-4-Datei.' });
    render(<AdultsPage />);
    const input = screen.getByLabelText('Fortschritt laden');
    fireEvent.change(input, { target: { files: [new File([backup()], 'x.json')] } });
    await waitFor(() => expect(message()).toBe('Die Datei konnte nicht geladen werden: Das ist keine Mathe-4-Datei.'));
  });

  it('checks the file before asking anything: a broken file never reaches the store', async () => {
    fake.__setState(withProgress());
    render(<AdultsPage />);
    fireEvent.change(screen.getByLabelText('Fortschritt laden'), { target: { files: [new File(['kaputt'], 'x.json')] } });
    await waitFor(() => expect(message()).toBe(`Die Datei konnte nicht geladen werden: ${IMPORT_MESSAGES['not-json']}`));
    expect(screen.queryByRole('group', { name: /ersetzen/ })).toBeNull();
    expect(store.importJson).not.toHaveBeenCalled();
  });

  it('rejects a file that is too large before reading it', async () => {
    const readSpy = vi.spyOn(FileReader.prototype, 'readAsText');
    render(<AdultsPage />);
    const file = new File(['{}'], 'riesig.json');
    Object.defineProperty(file, 'size', { value: MAX_IMPORT_BYTES + 1 });
    fireEvent.change(screen.getByLabelText('Fortschritt laden'), { target: { files: [file] } });
    await waitFor(() => expect(message()).toBe(`Die Datei konnte nicht geladen werden: ${IMPORT_MESSAGES['too-large']}`));
    expect(readSpy).not.toHaveBeenCalled();
    expect(store.importJson).not.toHaveBeenCalled();
  });

  it('asks before a file replaces existing progress (with the last practice days), and can back up first', async () => {
    fake.__setState(withProgress());
    render(<AdultsPage />);
    const input = screen.getByLabelText('Fortschritt laden');
    fireEvent.change(input, { target: { files: [new File([backup(['2026-09-30', '2026-10-01'])], 'alt.json')] } });
    const box = await screen.findByRole('group', { name: /Den jetzigen Fortschritt durch die Datei ersetzen\?/ });
    expect(store.importJson).not.toHaveBeenCalled();
    expect(within(box).getByTestId('import-days').textContent).toBe(
      'Letzter Übungstag in der Datei: 1.\u00A0Oktober 2026. Auf diesem Gerät: 17.\u00A0Oktober 2026.',
    );
    // "Erst sichern" downloads the current progress and keeps the question open
    fireEvent.click(within(box).getByRole('button', { name: 'Erst sichern' }));
    expect(store.exportJson).toHaveBeenCalledOnce();
    expect(clicked).toHaveLength(1);
    // "Abbrechen" keeps everything
    fireEvent.click(within(box).getByRole('button', { name: 'Abbrechen' }));
    expect(screen.queryByRole('group', { name: /ersetzen/ })).toBeNull();
    expect(store.importJson).not.toHaveBeenCalled();
    // choose again and confirm
    fireEvent.change(input, { target: { files: [new File([backup()], 'alt.json')] } });
    const again = await screen.findByRole('group', { name: /ersetzen/ });
    fireEvent.click(within(again).getByRole('button', { name: 'Ja, ersetzen' }));
    expect(store.importJson).toHaveBeenCalledWith(backup());
    expect(message()).toMatch(/^Der Fortschritt wurde geladen\./);
    expect(screen.queryByRole('group', { name: /ersetzen/ })).toBeNull();
  });

  it('knows when there is progress to lose', () => {
    expect(hasProgress(emptyState())).toBe(false);
    expect(hasProgress(withProgress())).toBe(true);
    expect(hasProgress({ ...emptyState(), blitzBest: 0 })).toBe(true);
    expect(hasProgress({ ...emptyState(), facts: { '3x7': { box: 1, seen: 1, correct: 1 } } })).toBe(true);
  });

  it('deletes only after an inline confirmation (no window.confirm)', () => {
    const confirmSpy = vi.spyOn(window, 'confirm');
    render(<AdultsPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Fortschritt löschen' }));
    expect(store.reset).not.toHaveBeenCalled();
    const box = screen.getByRole('group', { name: /Wirklich den ganzen Fortschritt löschen/ });
    fireEvent.click(within(box).getByRole('button', { name: 'Abbrechen' }));
    expect(store.reset).not.toHaveBeenCalled();
    expect(screen.queryByRole('group', { name: /Wirklich/ })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Fortschritt löschen' }));
    fireEvent.click(screen.getByRole('button', { name: 'Ja, löschen' }));
    expect(store.reset).toHaveBeenCalledOnce();
    expect(message()).toBe('Der Fortschritt wurde gelöscht.');
    expect(confirmSpy).not.toHaveBeenCalled();
  });

  it('switches storage on ("merken") and off ("Nicht mehr merken")', () => {
    render(<AdultsPage />);
    expect(screen.getByTestId('storage-status').textContent).toContain('zurzeit nicht gespeichert');
    fireEvent.click(screen.getByRole('button', { name: 'Fortschritt auf diesem Gerät merken' }));
    expect(store.setConsent).toHaveBeenCalledWith('granted');
    expect(screen.getByTestId('storage-status').textContent).toContain('mathe4.v1');
    fireEvent.click(screen.getByRole('button', { name: 'Nicht mehr merken' }));
    expect(store.forget).toHaveBeenCalledOnce();
    expect(screen.getByTestId('storage-status').textContent).toContain('zurzeit nicht gespeichert');
  });

  it('never says "gespeichert" while the browser blocks storage', () => {
    fake.__setConsent('granted');
    fake.__setSaveStatus('failed');
    render(<AdultsPage />);
    const status = screen.getByTestId('storage-status').textContent ?? '';
    expect(status).toContain('Speichern ist in diesem Browser gerade nicht möglich');
    expect(status).not.toContain('wird auf diesem Gerät gespeichert');
    expect(screen.getByTestId('settings-status').textContent).toContain('nur, bis die Seite geschlossen wird');
    expect(screen.getByRole('button', { name: 'Nicht mehr merken' })).toBeTruthy();
  });

  it('builds the backup file name from the day', () => {
    expect(backupFilename('2026-10-18')).toBe('mathe4-fortschritt-2026-10-18.json');
  });
});

describe('Einstellungen', () => {
  it('says that settings last only for this visit unless progress is saved', () => {
    render(<AdultsPage />);
    const status = screen.getByTestId('settings-status');
    expect(status.textContent).toMatch(/nur, bis die Seite geschlossen wird/);
    expect(within(status).getByRole('link', { name: '„Fortschritt auf diesem Gerät merken“' }).getAttribute('href')).toBe('#storage-title');
    act(() => store.setConsent('granted'));
    expect(screen.getByTestId('settings-status').textContent).toBe(
      'Die Einstellungen gelten sofort und werden mit dem Fortschritt auf diesem Gerät gespeichert.',
    );
  });

  it('writes every setting through store.updateSettings', () => {
    render(<AdultsPage />);
    fireEvent.click(screen.getByRole('radio', { name: /Ergänzen \(Erweitern\)/ }));
    expect(store.updateSettings).toHaveBeenLastCalledWith({ subtractionMethod: 'ergaenzen' });
    expect(screen.getByRole('radio', { name: /Abziehen \(Entbündeln\) – z\. B\. Bayern/ })).toBeTruthy();

    const toggles: [RegExp, string][] = [
      [/NRW-Zusatzthemen/, 'nrwExtras'],
      [/Blitzrunde erlauben/, 'blitzrunde'],
      [/Schrift größer/, 'largeText'],
      [/Mehr Abstand/, 'wideSpacing'],
      [/Animationen aus/, 'reduceMotion'],
      [/Schulschrift \(Andika\)/, 'schoolFont'],
    ];
    for (const [name, key] of toggles) {
      fireEvent.click(screen.getByRole('checkbox', { name }));
      expect(store.updateSettings).toHaveBeenLastCalledWith({ [key]: true });
    }

    const goal = screen.getByRole('group', { name: /Wochenziel/ });
    fireEvent.click(within(goal).getByRole('radio', { name: /5/ }));
    expect(store.updateSettings).toHaveBeenLastCalledWith({ weeklyGoal: 5 });
    expect(within(goal).getAllByRole('radio')).toHaveLength(5);

    const keypad = screen.getByRole('group', { name: /Ziffernblock/ });
    fireEvent.click(within(keypad).getByRole('radio', { name: /^Aus/ }));
    expect(store.updateSettings).toHaveBeenLastCalledWith({ keypad: 'off' });
  });
});

describe('Lehrplan', () => {
  it('shows the alignment table for all topics and the note on written division', () => {
    render(<AdultsPage />);
    const table = screen.getByRole('table');
    for (const t of TOPICS) expect(within(table).getByRole('rowheader', { name: t.title })).toBeTruthy();
    expect(screen.getByText(/Schriftliche Division ist länderspezifisch/)).toBeTruthy();
  });

  it('re-renders when the store emits', () => {
    render(<AdultsPage />);
    act(() => store.setConsent('granted'));
    expect(screen.getByRole('button', { name: 'Nicht mehr merken' })).toBeTruthy();
  });
});
