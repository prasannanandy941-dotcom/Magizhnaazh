import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import { ErrorBoundary } from './components/ErrorBoundary';
import { lazyNamed, LazyFallback } from '../../../packages/shared-ui/lazy';
import '../../../packages/shared-ui/light-theme.css';
import './index.css';

// No router dependency — the app only ever needs to distinguish the public,
// unauthenticated /invite/:token page (shared RSVP links) from everything
// else, which is the normal logged-in App shell.
// Lazy: a guest opening a shared invite link downloads only the invite page,
// and the main app never downloads the invite page's code.
const App = lazyNamed(() => import('./App'), 'App');
const PublicInviteRoute = lazyNamed(() => import('./components/PublicInviteRoute'), 'PublicInviteRoute');

const inviteMatch = window.location.pathname.match(/^(?:\/customer)?\/invite\/([^/]+)\/?$/);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <Suspense fallback={<LazyFallback />}>
        {inviteMatch ? <PublicInviteRoute token={decodeURIComponent(inviteMatch[1])} /> : <App />}
      </Suspense>
    </ErrorBoundary>
  </React.StrictMode>
);
