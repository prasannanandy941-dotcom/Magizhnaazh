import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { PublicInviteRoute } from './components/PublicInviteRoute';
import './index.css';

// No router dependency — the app only ever needs to distinguish the public,
// unauthenticated /invite/:token page (shared RSVP links) from everything
// else, which is the normal logged-in App shell.
const inviteMatch = window.location.pathname.match(/^\/invite\/([^/]+)\/?$/);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {inviteMatch ? <PublicInviteRoute token={decodeURIComponent(inviteMatch[1])} /> : <App />}
  </React.StrictMode>
);
