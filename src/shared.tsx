import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/newsreader/latin-400.css';
import '@fontsource/newsreader/latin-400-italic.css';
import '@fontsource/instrument-sans/latin-400.css';
import '@fontsource/instrument-sans/latin-600.css';
import './styles/tokens.css';
import './styles/base.css';
import './styles/components.css';
import { SharedView } from './ui/screens/SharedView';
import { applyTheme } from './state/theme';

applyTheme();
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SharedView />
  </StrictMode>,
);
