import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { initLanguageThen } from '../../../packages/shared-ui/i18n/runtime';
import '../../../packages/shared-ui/light-theme.css';
import './index.css';

// Load the saved language first so the first paint is already translated.
initLanguageThen(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
});
