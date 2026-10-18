import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/atkinson-hyperlegible-next/wght.css';
import '@fontsource-variable/atkinson-hyperlegible-mono/wght.css';
import '@fontsource/andika/400.css';
import '@fontsource/andika/700.css';
import './styles/fonts.css';
import './styles/tokens.css';
import './styles/base.css';
import App from './ui/app/App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
