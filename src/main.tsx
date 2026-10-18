import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import '@fontsource-variable/atkinson-hyperlegible-next/wght.css';
import '@fontsource-variable/atkinson-hyperlegible-mono/wght.css';
import '@fontsource/andika/400.css';
import '@fontsource/andika/700.css';
import './styles/fonts.css';
import './styles/tokens.css';
import './styles/base.css';
import { prerenderKey } from './seo/meta';
import App, { preloadRoute } from './ui/app/App';
import { currentLocation } from './ui/app/router';
import { matchRoute } from './ui/app/routes';

const container = document.getElementById('root')!;
const app = (
  <StrictMode>
    <App />
  </StrictMode>
);
const { path } = currentLocation();
const route = matchRoute(path);

// Pages prerendered at build time (scripts/prerender.mjs) carry data-route: their HTML stays on screen and
// React attaches to it. Everything else (practice rounds, personal pages, the dev server) renders afresh.
if (container.dataset.route === prerenderKey(route, path)) {
  const hydrate = () => hydrateRoot(container, app);
  preloadRoute(route).then(hydrate, hydrate);
} else {
  createRoot(container).render(app);
}
