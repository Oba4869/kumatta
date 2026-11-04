import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router';
import App from './App';
import { loadKit } from './game3d/kit';
import { loadBears } from './game3d/bearModel';
import './index.css';
import './ui.css';
import './start.css';
import './result.css';
import './menu.css';

/* start fetching the 3D forest and bear models right away, so the game can begin without waiting */
loadKit();
loadBears();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>,
);
