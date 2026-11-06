import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router';
import App from './App';
import { loadKit } from './game3d/kit';
import { loadBears } from './game3d/bearModel';
import { loadCritters } from './game3d/critterModel';
import './index.css';
import './ui.css';
import './start.css';
import './result.css';
import './menu.css';
import './play-hud.css';

/* start fetching the 3D forest, bear and animal models right away, so the game can begin without waiting */
loadKit();
loadBears();
loadCritters();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>,
);
