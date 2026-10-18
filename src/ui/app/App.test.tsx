// @vitest-environment jsdom
import { StrictMode } from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { TopicId } from '../../core/types';
import { store } from '../../state/store';
import { DEFAULT_SETTINGS } from '../../state/types';
import { TOPICS, getTopicMeta } from '../../topics/registry';
import App from './App';
import { navigate } from './router';

vi.mock('../../topics/registry', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../topics/registry')>();
  const { fakeModule } = await import('../pages/testFixtures');
  return {
    ...actual,
    loadTopic: vi.fn((id: TopicId) => Promise.resolve(fakeModule(id))),
    loadAllTopics: vi.fn(() => Promise.resolve(actual.TOPICS.map((t) => fakeModule(t.id)))),
  };
});

vi.mock('../practice/PracticePage', () => ({
  default: ({ plan, onExit, onNavigate }: { plan: { mode: string }; onExit: () => void; onNavigate: (p: unknown) => void }) => (
    <div>
      <h1>Übung {plan.mode}</h1>
      <input aria-label="Antwort" />
      <button type="button" onClick={onExit}>
        Runde verlassen
      </button>
      <button type="button" onClick={() => onNavigate({ mode: 'skill', skillId: 'zahlen.runden', stufe: 3 })}>
        Nächste Stufe
      </button>
    </div>
  ),
}));

function h1() {
  return screen.getByRole('heading', { level: 1 });
}

beforeEach(() => {
  window.history.replaceState(null, '', '/');
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
});

afterEach(() => {
  cleanup();
  store.updateSettings({ ...DEFAULT_SETTINGS });
  document.documentElement.className = '';
});

describe('router', () => {
  it('renders the home page at /', async () => {
    render(<App />);
    expect(h1().textContent).toBe('Hallo! Was möchtest du heute üben?');
    expect(document.title).toBe('Mathe 4 – Üben für die 4. Klasse');
    // 7 topic cards
    for (const t of TOPICS) {
      expect(screen.getByRole('link', { name: new RegExp(t.title) }).getAttribute('href')).toBe(`/thema/${t.id}`);
    }
    await waitFor(() => expect(screen.getAllByText('Noch nicht geübt').length).toBeGreaterThan(0));
  });

  it('navigates with links, moves focus to the new <h1>, updates the title and scrolls up', async () => {
    render(<App />);
    fireEvent.click(screen.getByRole('link', { name: 'Mein Fortschritt' }));
    expect(window.location.pathname).toBe('/fortschritt');
    expect(h1().textContent).toBe('Mein Fortschritt');
    expect(document.activeElement).toBe(h1());
    expect(document.title).toBe('Mein Fortschritt – Mathe 4');
    expect(window.scrollTo).toHaveBeenCalledWith(0, 0);
    expect(screen.getByRole('link', { name: 'Mein Fortschritt' }).getAttribute('aria-current')).toBe('page');
  });

  it('supports back and forward (popstate)', async () => {
    render(<App />);
    fireEvent.click(screen.getByRole('link', { name: 'Für Erwachsene' }));
    expect(h1().textContent).toBe('Für Eltern und Lehrkräfte');
    act(() => window.history.back());
    await waitFor(() => expect(h1().textContent).toBe('Hallo! Was möchtest du heute üben?'));
    expect(window.location.pathname).toBe('/');
    expect(document.activeElement).toBe(h1());
    act(() => window.history.forward());
    await waitFor(() => expect(h1().textContent).toBe('Für Eltern und Lehrkräfte'));
  });

  it('does not intercept modified clicks (open in new tab)', () => {
    render(<App />);
    const link = screen.getByRole('link', { name: 'Arbeitsblätter' });
    expect(link.getAttribute('href')).toBe('/arbeitsblatt');
    // jsdom cannot open a new tab: stop the browser default after React has seen the event
    let defaultPreventedByApp: boolean | null = null;
    const stop = (e: Event) => {
      defaultPreventedByApp = e.defaultPrevented;
      e.preventDefault();
    };
    document.addEventListener('click', stop);
    fireEvent.click(link, { ctrlKey: true });
    document.removeEventListener('click', stop);
    expect(defaultPreventedByApp).toBe(false);
    expect(window.location.pathname).toBe('/');
  });

  it('shows a 404 page for unknown paths', () => {
    window.history.replaceState(null, '', '/gibt-es-nicht');
    render(<App />);
    expect(h1().textContent).toBe('Diese Seite gibt es nicht');
    expect(document.title).toBe('Seite nicht gefunden – Mathe 4');
    fireEvent.click(screen.getByRole('link', { name: 'Zur Startseite' }));
    expect(h1().textContent).toBe('Hallo! Was möchtest du heute üben?');
  });

  it('shows 404 for an unknown skill of a valid topic (after loading the topic)', async () => {
    window.history.replaceState(null, '', '/ueben/zahlen.gibtsnicht/1');
    render(<App />);
    await waitFor(() => expect(h1().textContent).toBe('Diese Seite gibt es nicht'));
  });

  it('does not steal focus on the first page load (also under StrictMode)', () => {
    render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
    expect(document.activeElement).toBe(document.body);
    expect(window.scrollTo).not.toHaveBeenCalled();
  });

  it('skip link moves focus to the page heading', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('link', { name: 'Zum Inhalt springen' }));
    expect(document.activeElement).toBe(h1());
  });

  it('every page has the footer links Datenschutz and Impressum', () => {
    render(<App />);
    const footer = screen.getByRole('contentinfo');
    expect(footer.querySelector('a[href="/datenschutz"]')).toBeTruthy();
    expect(footer.querySelector('a[href="/impressum"]')).toBeTruthy();
  });
});

describe('practice routes', () => {
  it('lazy-loads the practice page with minimal chrome and exits to the topic', async () => {
    render(<App />);
    act(() => navigate('/ueben/zahlen.runden/2'));
    await waitFor(() => expect(h1().textContent).toBe('Übung skill'));
    expect(screen.queryByRole('navigation', { name: 'Hauptmenü' })).toBeNull();
    expect(screen.getByRole('contentinfo').querySelector('a[href="/datenschutz"]')).toBeTruthy();
    await waitFor(() => expect(document.title).toBe('Runden – Stufe 2 – Mathe 4'));
    fireEvent.click(screen.getByRole('button', { name: 'Runde verlassen' }));
    expect(window.location.pathname).toBe('/thema/zahlen');
    await waitFor(() => expect(h1().textContent).toBe(getTopicMeta('zahlen').title));
    expect(screen.getByRole('navigation', { name: 'Hauptmenü' })).toBeTruthy();
  });

  it('onNavigate starts the new plan', async () => {
    render(<App />);
    act(() => navigate('/ueben/zahlen.runden/2'));
    await waitFor(() => expect(h1().textContent).toBe('Übung skill'));
    fireEvent.click(screen.getByRole('button', { name: 'Nächste Stufe' }));
    expect(window.location.pathname).toBe('/ueben/zahlen.runden/3');
    await waitFor(() => expect(document.title).toBe('Runden – Stufe 3 – Mathe 4'));
  });

  it('does not move focus away from a field the practice page focused itself', async () => {
    render(<App />);
    act(() => navigate('/wiederholen'));
    const input = await screen.findByRole('textbox', { name: 'Antwort' });
    input.focus();
    await new Promise((r) => setTimeout(r, 20));
    expect(document.activeElement).toBe(input);
  });

  it('blitz route explains that the Blitzrunde is off unless enabled', async () => {
    window.history.replaceState(null, '', '/blitz');
    const { unmount } = render(<App />);
    expect(h1().textContent).toBe('Blitzrunde');
    expect(screen.getByText('Die Blitzrunde ist gerade ausgeschaltet.')).toBeTruthy();
    unmount();
    act(() => store.updateSettings({ blitzrunde: true }));
    render(<App />);
    await waitFor(() => expect(h1().textContent).toBe('Übung blitz'));
  });
});

describe('settings → <html> classes', () => {
  it('applies and removes large-text, wide-spacing, school-font and reduce-motion', () => {
    render(<App />);
    const html = document.documentElement;
    for (const cls of ['large-text', 'wide-spacing', 'school-font', 'reduce-motion']) expect(html.classList.contains(cls)).toBe(false);
    act(() => store.updateSettings({ largeText: true, wideSpacing: true, schoolFont: true, reduceMotion: true }));
    for (const cls of ['large-text', 'wide-spacing', 'school-font', 'reduce-motion']) expect(html.classList.contains(cls), cls).toBe(true);
    act(() => store.updateSettings({ largeText: false, schoolFont: false }));
    expect(html.classList.contains('large-text')).toBe(false);
    expect(html.classList.contains('school-font')).toBe(false);
    expect(html.classList.contains('wide-spacing')).toBe(true);
    expect(html.classList.contains('reduce-motion')).toBe(true);
  });
});
