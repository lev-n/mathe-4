/**
 * App shell: router, layout, settings → <html> classes, focus management, head tags, lazy pages.
 */
import { Suspense, lazy } from 'react';
import { useHeadSync } from '../../seo/useHeadSync';
import { useSettings } from '../../state/useProgress';
import { TOPICS, loadTopic } from '../../topics/registry';
import { ErrorBoundary } from './ErrorBoundary';
import { useHtmlSettings, useRouteFocus } from './hooks';
import { Layout, MAIN_ID } from './Layout';
import { Loading } from './PageTitle';
import { useLocation } from './router';
import { isPracticeRoute, matchRoute } from './routes';
import type { Route } from './routes';
import HomePage from '../pages/HomePage';
import TopicPage from '../pages/TopicPage';
import PracticeRoute from '../pages/PracticeRoute';
import ProgressPage from '../pages/ProgressPage';
import BadgesPage from '../pages/BadgesPage';
import AdultsPage from '../pages/AdultsPage';
import PrivacyPage from '../pages/PrivacyPage';
import ImprintPage from '../pages/ImprintPage';
import NotFoundPage from '../pages/NotFoundPage';
import './app.css';
import '../pages/pages.css';

type WorksheetModule = typeof import('../pages/WorksheetPage');
let worksheetModule: WorksheetModule | undefined;
const loadWorksheetPage = () => import('../pages/WorksheetPage').then((m) => (worksheetModule = m));
// Once preloaded, the module is handed to React.lazy synchronously (a thenable that resolves at once), so the
// page renders without suspending. A prerendered worksheet page then hydrates in one pass: a suspended
// boundary that gets an update before it hydrates (e.g. stored progress) would be re-rendered from scratch.
const WorksheetPage = lazy(() =>
  worksheetModule ? ({ then: (resolve: (m: WorksheetModule) => void) => resolve(worksheetModule!) } as Promise<WorksheetModule>) : loadWorksheetPage(),
);

/**
 * Loads what the first render of a prerendered page needs, so that hydration renders the same content
 * the build did (a topic page's skills, the worksheet form with its preselected first topic).
 */
export function preloadRoute(route: Route): Promise<unknown> {
  switch (route.name) {
    case 'topic':
      return loadTopic(route.topicId);
    case 'worksheet':
      return Promise.all([loadWorksheetPage(), loadTopic(TOPICS[0].id)]);
    default:
      return Promise.resolve();
  }
}

function renderRoute(route: Route, navKey: number) {
  switch (route.name) {
    case 'home':
      return <HomePage />;
    case 'topic':
      return <TopicPage topicId={route.topicId} />;
    case 'practice':
      return <PracticeRoute plan={route.plan} navKey={navKey} />;
    case 'progress':
      return <ProgressPage />;
    case 'badges':
      return <BadgesPage />;
    case 'worksheet':
      return <WorksheetPage />;
    case 'adults':
      return <AdultsPage />;
    case 'privacy':
      return <PrivacyPage />;
    case 'imprint':
      return <ImprintPage />;
    case 'notFound':
      return <NotFoundPage />;
  }
}

export default function App() {
  const settings = useSettings();
  useHtmlSettings(settings);
  const location = useLocation();
  useRouteFocus(location.key, MAIN_ID);
  useHeadSync(location.path);
  const route = matchRoute(location.path);

  return (
    <Layout minimal={isPracticeRoute(route)}>
      <ErrorBoundary key={location.path}>
        <Suspense fallback={<Loading />}>{renderRoute(route, location.key)}</Suspense>
      </ErrorBoundary>
    </Layout>
  );
}
