import React, { useEffect, useMemo, useState } from 'react';

// ---------------------------------------------------------------------------
// Pagination ("paging"): show a long list one page at a time — e.g. 10 rows
// per page with "Showing 1–10 of 45", Prev / page numbers / Next and a
// rows-per-page choice. Goes back to page 1 when `resetKey` changes (a search
// or filter changed the list).
//
//   const pager = usePagination(items, 10, filtersKey);
//   {pager.pageItems.map(...)}
//   <Pagination pager={pager} label="users" />
// ---------------------------------------------------------------------------
export function usePagination<T>(items: T[], initialPageSize = 10, resetKey: unknown = null) {
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [page, setPage] = useState(1);
  const total = items.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  useEffect(() => { setPage(1); }, [resetKey, pageSize]);
  // Keep the page valid if rows were removed (e.g. deleting the last item on a page).
  useEffect(() => { if (page > pageCount) setPage(pageCount); }, [page, pageCount]);

  const start = (page - 1) * pageSize;
  const pageItems = useMemo(() => items.slice(start, start + pageSize), [items, start, pageSize]);

  return {
    page,
    pageCount,
    pageSize,
    total,
    from: total === 0 ? 0 : start + 1,
    to: Math.min(start + pageSize, total),
    pageItems,
    setPage: (p: number) => setPage(Math.min(pageCount, Math.max(1, p))),
    setPageSize,
  };
}

export type Pager = ReturnType<typeof usePagination>;

// Page numbers to show: always first and last, the current page and its
// neighbours, with "…" for the gaps — e.g. 1 … 4 5 6 … 12.
export function pageNumbers(page: number, pageCount: number): (number | '…')[] {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, i) => i + 1);
  const pages = new Set([1, pageCount, page - 1, page, page + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= pageCount).sort((a, b) => a - b);
  const out: (number | '…')[] = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push('…');
    out.push(p);
  });
  return out;
}

export function Pagination({
  pager,
  label = 'items',
  pageSizes = [10, 20, 50, 100],
}: {
  pager: Pager;
  label?: string;
  pageSizes?: number[];
}) {
  if (pager.total === 0) return null;
  const btn = 'min-w-9 h-9 px-3 rounded-xl border text-xs font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed';
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-slate-800 text-xs text-slate-400">
      <span>
        Showing <strong className="text-slate-200">{pager.from}–{pager.to}</strong> of{' '}
        <strong className="text-slate-200">{pager.total}</strong> {label}
      </span>

      <nav className="flex items-center gap-1.5" aria-label="Pagination">
        <button
          type="button"
          onClick={() => pager.setPage(pager.page - 1)}
          disabled={pager.page <= 1}
          className={`${btn} border-slate-700 text-slate-300 hover:border-amber-400/60`}
        >
          ‹ Prev
        </button>
        {pageNumbers(pager.page, pager.pageCount).map((p, i) =>
          p === '…' ? (
            <span key={`gap-${i}`} className="px-1 text-slate-500">…</span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => pager.setPage(p)}
              aria-current={p === pager.page ? 'page' : undefined}
              className={`${btn} ${
                p === pager.page
                  ? 'bg-indigo-600 border-indigo-600 text-white'
                  : 'border-slate-700 text-slate-300 hover:border-amber-400/60'
              }`}
            >
              {p}
            </button>
          ),
        )}
        <button
          type="button"
          onClick={() => pager.setPage(pager.page + 1)}
          disabled={pager.page >= pager.pageCount}
          className={`${btn} border-slate-700 text-slate-300 hover:border-amber-400/60`}
        >
          Next ›
        </button>
      </nav>

      <label className="flex items-center gap-2">
        Rows per page
        <select
          value={pager.pageSize}
          onChange={(e) => pager.setPageSize(Number(e.target.value))}
          className="h-9 px-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 text-xs font-semibold"
        >
          {pageSizes.map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
      </label>
    </div>
  );
}
