import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}
interface State {
  failed: boolean;
}

/**
 * Catches render errors and failed lazy chunk loads (e.g. offline) and shows a calm message
 * instead of a blank page. Keyed by path in App, so navigating elsewhere resets it.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: unknown, info: ErrorInfo): void {
    console.error('Mathe 4: page failed to render', error, info.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="page page--narrow">
        <h1 tabIndex={-1} className="page-title">
          Das hat nicht geklappt
        </h1>
        <p>Diese Seite konnte gerade nicht geladen werden. Vielleicht ist die Internetverbindung unterbrochen.</p>
        <p>Probier es gleich noch einmal.</p>
        <div className="row">
          <button type="button" className="btn btn--primary" onClick={() => window.location.reload()}>
            Seite neu laden
          </button>
          <a className="btn" href="/">
            Zur Startseite
          </a>
        </div>
      </div>
    );
  }
}
