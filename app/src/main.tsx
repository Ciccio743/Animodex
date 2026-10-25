import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, HashRouter } from 'react-router';
import './styles/index.css';
import { App } from './app/App';
import { DataProvider } from './hooks/DataProvider';

// Le fichier unique peut être servi depuis n'importe quel dossier (ex. GitHub Pages) : routes dans le #.
const Router = __SINGLE_FILE__ ? HashRouter : BrowserRouter;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Router>
      <DataProvider>
        <App />
      </DataProvider>
    </Router>
  </StrictMode>,
);
