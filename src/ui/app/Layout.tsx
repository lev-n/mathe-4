import type { ReactNode } from 'react';
import { LogoMark } from './icons';
import { Link, NavLink } from './router';
import { PATHS } from './routes';

const NAV = [
  { to: PATHS.home, label: 'Start' },
  { to: PATHS.progress, label: 'Mein Fortschritt' },
  { to: PATHS.worksheet, label: 'Arbeitsblätter' },
  { to: PATHS.adults, label: 'Für Erwachsene' },
] as const;

export const MAIN_ID = 'main';

function focusMainHeading(): void {
  const main = document.getElementById(MAIN_ID);
  if (!main) return;
  const target = main.querySelector<HTMLElement>('h1') ?? main;
  if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
  target.focus();
}

/**
 * Page chrome. `minimal` (during practice): logo only, no navigation, so the child can concentrate;
 * the practice page has its own always-visible exit. The footer with the legal links stays on every screen.
 */
export function Layout({ children, minimal = false }: { children: ReactNode; minimal?: boolean }) {
  return (
    <div className={minimal ? 'app app--minimal' : 'app'}>
      <a
        className="skip-link"
        href={`#${MAIN_ID}`}
        onClick={(e) => {
          e.preventDefault();
          focusMainHeading();
        }}
      >
        Zum Inhalt springen
      </a>
      <header className="site-header">
        <div className="site-header__inner">
          <Link to={PATHS.home} className="logo" aria-label="Mathe 4 – zur Startseite">
            <LogoMark />
            <span className="logo__text" aria-hidden="true">
              Mathe 4
            </span>
          </Link>
          {!minimal && (
            <nav className="site-nav" aria-label="Hauptmenü">
              <ul>
                {NAV.map((item) => (
                  <li key={item.to}>
                    <NavLink to={item.to}>{item.label}</NavLink>
                  </li>
                ))}
              </ul>
            </nav>
          )}
        </div>
      </header>
      <main id={MAIN_ID} className="site-main" tabIndex={-1}>
        {children}
      </main>
      <footer className="site-footer">
        <div className="site-footer__inner">
          <p className="site-footer__note">Mathe 4 – ohne Anmeldung, ohne Werbung.</p>
          <ul className="site-footer__links">
            <li>
              <NavLink to={PATHS.privacy}>Datenschutz</NavLink>
            </li>
            <li>
              <NavLink to={PATHS.imprint}>Impressum</NavLink>
            </li>
          </ul>
        </div>
      </footer>
    </div>
  );
}
