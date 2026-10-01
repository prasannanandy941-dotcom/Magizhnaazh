import React, { useEffect, useState, useRef } from 'react';
import { RefreshCw } from 'lucide-react';

const THRESHOLD = 55; // Pixels needed to trigger reload

export const PullToRefresh: React.FC = () => {
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const startY = useRef(0);
  const startX = useRef(0);
  const isPulling = useRef(false);

  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      // Only initiate pull-to-refresh if already at the top of the page
      if (window.scrollY > 4 || document.documentElement.scrollTop > 4) {
        isPulling.current = false;
        return;
      }
      if (e.touches.length !== 1) return;

      startY.current = e.touches[0].clientY;
      startX.current = e.touches[0].clientX;
      isPulling.current = true;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isPulling.current || refreshing) return;
      if (window.scrollY > 4 || document.documentElement.scrollTop > 4) {
        isPulling.current = false;
        setPullDistance(0);
        return;
      }

      const currentY = e.touches[0].clientY;
      const currentX = e.touches[0].clientX;
      const diffY = currentY - startY.current;
      const diffX = currentX - startX.current;

      // Must be a vertical downward drag
      if (diffY > 6 && Math.abs(diffY) > Math.abs(diffX) * 1.15) {
        // Prevent default native overscroll if possible
        if (e.cancelable && diffY > 15) {
          e.preventDefault();
        }
        // Smooth logarithmic resistance
        const dampened = Math.min(Math.pow(diffY, 0.82) * 1.5, 80);
        setPullDistance(dampened);
      } else if (diffY <= 0) {
        setPullDistance(0);
      }
    };

    const handleTouchEnd = () => {
      if (!isPulling.current) return;
      isPulling.current = false;

      if (pullDistance >= THRESHOLD && !refreshing) {
        setRefreshing(true);
        setPullDistance(THRESHOLD);

        // Haptic feedback if available
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          try { navigator.vibrate(20); } catch { /* ignore */ }
        }

        // Tell the native wrapper too (older app builds ignore it)
        const w = window as any;
        if (w.ReactNativeWebView && typeof w.ReactNativeWebView.postMessage === 'function') {
          w.ReactNativeWebView.postMessage(JSON.stringify({ type: 'reload' }));
        }

        // Also reload the web page directly
        setTimeout(() => {
          window.location.reload();
        }, 150);
      } else {
        setPullDistance(0);
      }
    };

    const handleTouchCancel = () => {
      isPulling.current = false;
      if (!refreshing) {
        setPullDistance(0);
      }
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });
    window.addEventListener('touchcancel', handleTouchCancel, { passive: true });

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', handleTouchCancel);
    };
  }, [pullDistance, refreshing]);

  if (pullDistance <= 0 && !refreshing) {
    return null;
  }

  const isReady = pullDistance >= THRESHOLD;
  const progressPercent = Math.min(100, Math.round((pullDistance / THRESHOLD) * 100));

  return (
    <div
      aria-hidden="true"
      className="fixed top-2 left-1/2 -translate-x-1/2 z-[100] pointer-events-none transition-transform duration-75"
      style={{
        transform: `translate(-50%, ${Math.min(pullDistance, 55)}px)`,
        opacity: Math.max(0.2, progressPercent / 100),
      }}
    >
      <div
        className={`w-10 h-10 rounded-full flex items-center justify-center shadow-xl transition-colors ${
          isReady || refreshing
            ? 'bg-gradient-to-tr from-amber-500 to-amber-300 text-slate-950 shadow-amber-500/40 ring-2 ring-amber-300'
            : 'bg-slate-900/95 border border-amber-500/50 text-amber-300'
        }`}
      >
        <RefreshCw
          className={`w-5 h-5 transition-transform ${
            refreshing ? 'animate-spin' : ''
          }`}
          style={{
            transform: refreshing ? undefined : `rotate(${pullDistance * 5}deg)`,
          }}
        />
      </div>
    </div>
  );
};
