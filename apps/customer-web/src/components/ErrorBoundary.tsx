import React from 'react';

// Without this, an unhandled render-time exception anywhere in the tree
// unmounts the whole app to a blank white screen — indistinguishable from a
// crash, and easy to mistake for "signed out" if it happens to coincide with
// a session check. Catches it instead and offers a way back in.
export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error('Unhandled error in app tree:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-slate-950 text-center">
          <div className="max-w-sm space-y-4">
            <h1 className="text-lg font-bold text-white">Something went wrong</h1>
            <p className="text-sm text-slate-400">
              This page hit an unexpected error. Your account is still signed in — reloading usually fixes it.
              If you were mid-payment, check My Orders before trying again; it may have already gone through.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold text-sm"
            >
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
