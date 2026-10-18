/**
 * App shell: router, layout, settings → <html> classes, focus management, lazy pages.
 */
import { Suspense, lazy } from 'react';
import { useSettings } from '../../state/useProgress';
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

const WorksheetPage = lazy(() => import('../pages/WorksheetPage'));

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
  const route = matchRoute(location.path);

  return (
    <Layout minimal={isPracticeRoute(route)}>
      <ErrorBoundary key={location.path}>
        <Suspense fallback={<Loading />}>{renderRoute(route, location.key)}</Suspense>
      </ErrorBoundary>
    </Layout>
  );
}
