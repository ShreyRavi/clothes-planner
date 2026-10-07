import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/newsreader/latin-400.css';
import '@fontsource/newsreader/latin-400-italic.css';
import '@fontsource/instrument-sans/latin-400.css';
import '@fontsource/instrument-sans/latin-500.css';
import '@fontsource/instrument-sans/latin-600.css';
import './styles/tokens.css';
import './styles/base.css';
import './styles/components.css';
import { App, boot } from './ui/App';
import { applyTheme } from './state/theme';
import { registerSW } from 'virtual:pwa-register';

applyTheme();
registerSW({ immediate: true });

boot().finally(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
