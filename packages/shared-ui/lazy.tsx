import React, { useEffect, useRef, useState } from 'react';

// ---------------------------------------------------------------------------
// 1) LAZY CODE — load a screen's JavaScript only when it is first shown.
//
// React.lazy() needs a module whose *default* export is the component, but our
// components use named exports (export const MyOrders = ...). lazyNamed wraps
// the dynamic import so we can keep named exports:
//
//   const MyOrders = lazyNamed(() => import('./components/MyOrders'), 'MyOrders');
//
// Vite turns every `import('...')` into a separate JS file ("chunk") that the
// browser downloads the first time that component renders. Render lazy
// components inside <Suspense fallback={...}> — the fallback shows while the
// chunk downloads (usually a split second).
// ---------------------------------------------------------------------------
export function lazyNamed<M extends Record<string, unknown>, K extends keyof M>(
  loader: () => Promise<M>,
  name: K,
): M[K] {
  return React.lazy(async () => ({ default: (await loader())[name] as React.ComponentType<unknown> })) as unknown as M[K];
}

// Spinner shown while a lazy screen's code downloads.
export function LazyFallback({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-24 text-sm text-slate-400" role="status" aria-live="polite">
      <span className="w-5 h-5 rounded-full border-2 border-amber-400/80 border-t-transparent animate-spin" />
      {label}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 3) LAZY DATA (infinite scroll) — show a long list in batches.
//
// Instead of drawing hundreds of cards/rows at once, show the first
// `pageSize` items; when the invisible "sentinel" element under the list
// scrolls into view (IntersectionObserver), show the next batch. Fewer DOM
// nodes and fewer images at once = a faster first screen, especially on
// phones. Reset back to the first batch whenever `resetKey` changes (e.g. a
// filter or search changed).
//
//   const { visible, hasMore, sentinelRef, showMore } = useInfiniteList(items, 12, filtersKey);
//   {visible.map(...)}
//   <LoadMoreSentinel sentinelRef={sentinelRef} hasMore={hasMore} onClick={showMore} />
// ---------------------------------------------------------------------------
export function useInfiniteList<T>(items: T[], pageSize: number, resetKey: unknown = null) {
  const [count, setCount] = useState(pageSize);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  // Set by showUpTo() so a reset happening in the same click (e.g. switching
  // tab AND jumping to an item) still keeps that item on screen.
  const revealTo = useRef(0);

  useEffect(() => {
    setCount(Math.max(pageSize, revealTo.current));
    revealTo.current = 0;
  }, [resetKey, pageSize]);

  const hasMore = count < items.length;
  const showMore = () => setCount((c) => Math.min(c + pageSize, items.length));
  // Make sure the item at `index` is rendered (e.g. before scrolling to it).
  const showUpTo = (index: number) => {
    revealTo.current = index + 1;
    setCount((c) => Math.max(c, index + 1));
  };

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      (entries) => { if (entries.some((e) => e.isIntersecting)) showMore(); },
      { rootMargin: '400px 0px' }, // start loading a little before the bottom is reached
    );
    io.observe(el);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMore, count, items.length]);

  return { visible: items.slice(0, count), hasMore, sentinelRef, showMore, showUpTo, shown: Math.min(count, items.length), total: items.length };
}

// The sentinel + a manual "Load more" button (fallback for old browsers, and
// visible feedback of how many items are shown).
export function LoadMoreSentinel({ sentinelRef, hasMore, onClick, shown, total }: {
  sentinelRef: React.RefObject<HTMLDivElement>;
  hasMore: boolean;
  onClick: () => void;
  shown?: number;
  total?: number;
}) {
  if (!hasMore) return null;
  return (
    <div ref={sentinelRef} className="flex flex-col items-center gap-2 py-6">
      <button
        type="button"
        onClick={onClick}
        className="px-5 py-2 rounded-xl border border-slate-700 bg-slate-900/60 text-slate-300 text-xs font-bold hover:border-amber-400/60"
      >
        Load more{shown !== undefined && total !== undefined ? ` (${shown} of ${total})` : ''}
      </button>
    </div>
  );
}
