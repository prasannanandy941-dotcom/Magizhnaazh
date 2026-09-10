import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, ChevronDown } from 'lucide-react';
import { Vendor, VENDOR_CATEGORIES } from '../../../../packages/shared-types';
import { fetchVendors } from '../api';

// The admin category list mirrors exactly what a vendor can pick at sign-up
// (VENDOR_CATEGORIES in shared-types). It is a fixed set, so there is no
// add / delete here — this tab is a read-only reference plus a live count of
// how many vendors registered under each one.
const KNOWN = new Set<string>(VENDOR_CATEGORIES);

export const CategoriesTab: React.FC<{ token: string }> = () => {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchVendors()
      .then((res) => {
        if (!cancelled) setVendors(res.data?.vendors || []);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Vendors grouped by category. Anything whose category isn't one of the known
  // vendor-side categories is folded into "Other" so it still shows up.
  const byCategory = useMemo(() => {
    const map: Record<string, Vendor[]> = {};
    for (const v of vendors) {
      const key = KNOWN.has(v.category as string) ? (v.category as string) : 'Other';
      (map[key] ||= []).push(v);
    }
    return map;
  }, [vendors]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display font-bold text-2xl text-white">Vendor Categories</h2>
        <p className="text-slate-400 text-sm mt-1">
          The {VENDOR_CATEGORIES.length} categories a vendor can choose when they register. Vendors who
          pick <span className="text-white font-semibold">Other</span> are listed under that row so you
          can see what kind of vendor signed up.
        </p>
      </div>

      <div className="glass-card rounded-3xl border border-slate-800 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading...
          </div>
        ) : (
          <div className="divide-y divide-slate-800/60">
            {VENDOR_CATEGORIES.map((name) => {
              const list = byCategory[name] || [];
              const isOther = name === 'Other';
              const isOpen = expanded === name;
              const canExpand = isOther && list.length > 0;
              return (
                <div key={name}>
                  <div
                    className={`flex items-center justify-between gap-3 p-4 ${canExpand ? 'hover:bg-slate-900/40 cursor-pointer' : ''}`}
                    onClick={canExpand ? () => setExpanded(isOpen ? null : name) : undefined}
                  >
                    <span className="flex items-center gap-2.5 min-w-0">
                      {canExpand && (
                        <ChevronDown className={`w-4 h-4 text-slate-500 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                      )}
                      <span className={`font-bold text-white truncate ${canExpand ? '' : 'pl-6'}`}>{name}</span>
                    </span>
                    <span className="shrink-0 px-2 py-0.5 rounded-full bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 text-[10px] font-bold">
                      {list.length} {list.length === 1 ? 'vendor' : 'vendors'}
                    </span>
                  </div>

                  {isOther && isOpen && (
                    <div className="px-4 pb-4 pl-12 space-y-2">
                      {list.map((v) => (
                        <div key={v.id} className="rounded-xl bg-slate-900/60 border border-slate-800 p-3">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-white text-sm truncate">{v.businessName}</span>
                            <span className="text-[11px] text-slate-400 shrink-0">{v.location?.city || '—'}</span>
                          </div>
                          {v.description && (
                            <p className="text-xs text-slate-400 mt-1">{v.description}</p>
                          )}
                          <div className="text-[11px] text-slate-500 mt-1.5 flex flex-wrap gap-x-3">
                            {v.contactEmail && <span>{v.contactEmail}</span>}
                            {v.contactPhone && <span>{v.contactPhone}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
