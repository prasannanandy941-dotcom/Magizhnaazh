import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { configureLanguageScope, initLanguageThen } from '../../../packages/shared-ui/i18n/runtime';
import '../../../packages/shared-ui/light-theme.css';
import './index.css';

// Load the saved language first so the first paint is already translated.
configureLanguageScope('admin');
initLanguageThen(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
});
