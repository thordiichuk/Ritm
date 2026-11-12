import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/tokens.css';
import './styles/base.css';
import './components/today/today.css';
import './components/habits/habits.css';
import './components/focus/focus.css';
import './components/review/review.css';
import './components/stats/stats.css';
import './components/flora/flora.css';
import './components/welcome/welcome.css';
import { App } from './App';
import { initAccount } from './sync/account';
import { shouldShowWelcome } from './lib/welcome';

if (shouldShowWelcome()) {
  history.replaceState(null, '', location.pathname + location.search + '#/welcome');
  window.dispatchEvent(new HashChangeEvent('hashchange'));
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

void initAccount();
