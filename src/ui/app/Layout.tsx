import type { ReactNode } from 'react';
import type { ComponentType } from 'react';
import { AdultsIcon, HomeIcon, LogoMark, ProgressIcon, SheetIcon } from './icons';
import { Link, NavLink } from './router';
import { PATHS } from './routes';

const NAV: ReadonlyArray<{ to: string; label: string; Icon: ComponentType }> = [
  { to: PATHS.home, label: 'Start', Icon: HomeIcon },
  { to: PATHS.progress, label: 'Mein Fortschritt', Icon: ProgressIcon },
  { to: PATHS.worksheet, label: 'Arbeitsblätter', Icon: SheetIcon },
  { to: PATHS.adults, label: 'Für Erwachsene', Icon: AdultsIcon },
];

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
                    <NavLink to={item.to}>
                      <item.Icon />
                      <span>{item.label}</span>
                    </NavLink>
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
          <p className="site-footer__note">Mathe 4 – Mathe üben für die 4. Klasse, ohne Anmeldung, ohne Werbung.</p>
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
