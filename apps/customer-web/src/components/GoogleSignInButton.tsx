import React, { useEffect, useRef } from 'react';

// The OAuth Web-app Client ID, baked in at build time. When it's absent the
// whole button renders nothing, so the app degrades gracefully to email/password.
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

const GIS_SRC = 'https://accounts.google.com/gsi/client';

// Load Google Identity Services once, shared across every button instance.
let gisPromise: Promise<void> | null = null;
function loadGis(): Promise<void> {
  if ((window as any).google?.accounts?.id) return Promise.resolve();
  if (gisPromise) return gisPromise;
  gisPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${GIS_SRC}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Failed to load Google sign-in.')));
      return;
    }
    const s = document.createElement('script');
    s.src = GIS_SRC;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Failed to load Google sign-in.'));
    document.head.appendChild(s);
  });
  return gisPromise;
}

interface GoogleSignInButtonProps {
  // Called with the Google-issued ID token once the user picks an account.
  onCredential: (credential: string) => void;
  // Google's own button theme — 'outline' reads well on our dark cards.
  theme?: 'outline' | 'filled_black' | 'filled_blue';
  text?: 'signin_with' | 'signup_with' | 'continue_with';
}

export const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({
  onCredential,
  theme = 'outline',
  text = 'continue_with',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  // Keep the latest callback without re-initialising GIS on every render.
  const onCredentialRef = useRef(onCredential);
  onCredentialRef.current = onCredential;

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || !containerRef.current) return;
    let cancelled = false;

    loadGis()
      .then(() => {
        if (cancelled || !containerRef.current) return;
        const google = (window as any).google;
        google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: (resp: { credential?: string }) => {
            if (resp?.credential) onCredentialRef.current(resp.credential);
          },
        });
        const width = Math.min(containerRef.current.offsetWidth || 360, 400);
        // Clear any previously-rendered button so a prop change (e.g. signin ↔
        // signup toggling the label) doesn't stack two Google buttons.
        containerRef.current.innerHTML = '';
        google.accounts.id.renderButton(containerRef.current, {
          type: 'standard',
          theme,
          size: 'large',
          text,
          shape: 'pill',
          logo_alignment: 'center',
          width,
        });
      })
      .catch((err) => console.error(err));

    return () => {
      cancelled = true;
    };
  }, [theme, text]);

  if (!GOOGLE_CLIENT_ID) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-slate-800" />
        <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500">or</span>
        <div className="h-px flex-1 bg-slate-800" />
      </div>
      <div ref={containerRef} className="flex justify-center [color-scheme:light]" />
    </div>
  );
};
