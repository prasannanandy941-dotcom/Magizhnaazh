import React, { useState } from 'react';
import { Event, Vendor } from '../shared/shared-types';
import { IndianRupee, AlertTriangle, Sparkles, CheckCircle2, TrendingUp, Filter, Star, MapPin } from 'lucide-react';
import { calculateVendorScore } from '../shared/shared-utils';

interface SmartBudgetPlannerProps {
  event: Event;
  vendors: Vendor[];
  onSelectVendor: (vendor: Vendor) => void;
  onUpdateEventBudget: (updatedBreakdown: Event['budgetBreakdown']) => void;
}

export const SmartBudgetPlanner: React.FC<SmartBudgetPlannerProps> = ({
  event,
  vendors,
  onSelectVendor,
  onUpdateEventBudget,
}) => {
  const [breakdown, setBreakdown] = useState(event.budgetBreakdown);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('All');

  const totalAllocated = breakdown.reduce((acc, curr) => acc + curr.allocatedAmount, 0);
  const totalSpent = breakdown.reduce((acc, curr) => acc + curr.actualSpent, 0);
  const remainingBudget = event.totalBudget - totalSpent;

  const handlePercentageChange = (categoryId: string, newPercentage: number) => {
    const updated = breakdown.map((item) => {
      if (item.id === categoryId) {
        const allocatedAmount = Math.round((event.totalBudget * newPercentage) / 100);
        return { ...item, allocatedPercentage: newPercentage, allocatedAmount };
      }
      return item;
    });
    setBreakdown(updated);
    onUpdateEventBudget(updated);
  };

  const recommendedVendors = vendors
    .map((v) => {
      const catBudget = breakdown.find((b) => b.category === v.category);
      const remainingCatBudget = catBudget ? catBudget.allocatedAmount - catBudget.actualSpent : 0;
      const score = calculateVendorScore(v, remainingCatBudget, event.location.city);

      return {
        vendor: v,
        score,
        remainingCatBudget,
        fitsBudget: v.startingPrice <= remainingCatBudget || remainingCatBudget === 0,
      };
    })
    .filter((r) => activeCategoryFilter === 'All' || r.vendor.category === activeCategoryFilter)
    .sort((a, b) => b.score - a.score);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 text-xs font-bold border border-amber-500/20 mb-2">
            <Sparkles className="w-3.5 h-3.5" /> Smart Percentage Allocator Engine
          </div>
          <h2 className="font-display font-bold text-3xl text-white">Event Budget Dashboard</h2>
          <p className="text-slate-400 text-sm mt-1">{event.title} • {event.location.city}</p>
        </div>

        <div className="p-4 rounded-2xl glass-card border border-indigo-500/30 flex items-center gap-6">
          <div>
            <span className="text-[11px] font-bold uppercase text-slate-400 block">Total Budget Target</span>
            <span className="font-display font-extrabold text-2xl text-white">
              ₹{event.totalBudget.toLocaleString('en-IN')}
            </span>
          </div>

          <div className="h-8 w-px bg-slate-800" />

          <div>
            <span className="text-[11px] font-bold uppercase text-slate-400 block">Remaining Funds</span>
            <span className="font-display font-extrabold text-2xl text-emerald-400">
              ₹{remainingBudget.toLocaleString('en-IN')}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="glass-card p-6 rounded-3xl border border-slate-800">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Allocated Budget</span>
          <div className="font-display font-extrabold text-3xl text-white mt-2">
            ₹{totalAllocated.toLocaleString('en-IN')}
          </div>
          <p className="text-xs text-slate-400 mt-2">
            {((totalAllocated / event.totalBudget) * 100).toFixed(0)}% of total target allocated
          </p>
        </div>

        <div className="glass-card p-6 rounded-3xl border border-slate-800">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Actual Spent to Date</span>
          <div className="font-display font-extrabold text-3xl text-amber-400 mt-2">
            ₹{totalSpent.toLocaleString('en-IN')}
          </div>
          <p className="text-xs text-slate-400 mt-2">
            Booked vendor deposit commitments
          </p>
        </div>

        <div className="glass-card p-6 rounded-3xl border border-slate-800">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Budget Health Score</span>
          <div className="font-display font-extrabold text-3xl text-emerald-400 mt-2 flex items-center gap-2">
            <span>94 / 100</span>
            <CheckCircle2 className="w-6 h-6 text-emerald-400" />
          </div>
          <p className="text-xs text-slate-400 mt-2">
            Optimal allocation balance
          </p>
        </div>
      </div>

      <div className="glass-card p-6 rounded-3xl border border-slate-800">
        <h3 className="font-display font-bold text-xl text-white mb-6">Category Budget Breakdown & Adjustment</h3>

        <div className="space-y-4">
          {breakdown.map((item) => {
            const isOverBudget = item.actualSpent > item.allocatedAmount;

            return (
              <div
                key={item.id}
                className={`p-4 rounded-2xl border transition-all ${
                  isOverBudget
                    ? 'bg-rose-950/20 border-rose-500/40'
                    : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                  <div>
                    <span className="font-bold text-sm text-white">{item.category}</span>
                    {isOverBudget && (
                      <span className="ml-3 inline-flex items-center gap-1 text-[11px] font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
                        <AlertTriangle className="w-3 h-3" /> Over Budget Warning!
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-6 text-xs font-semibold">
                    <div>
                      <span className="text-slate-400 block">Allocated</span>
                      <span className="text-amber-400 font-bold">₹{item.allocatedAmount.toLocaleString('en-IN')}</span>
                    </div>

                    <div>
                      <span className="text-slate-400 block">Spent</span>
                      <span className="text-white font-bold">₹{item.actualSpent.toLocaleString('en-IN')}</span>
                    </div>

                    <div>
                      <span className="text-slate-400 block">Remaining</span>
                      <span className="text-emerald-400 font-bold">
                        ₹{Math.max(0, item.allocatedAmount - item.actualSpent).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min={1}
                    max={50}
                    value={item.allocatedPercentage}
                    onChange={(e) => handlePercentageChange(item.id, Number(e.target.value))}
                    className="w-full accent-indigo-500 cursor-pointer"
                  />
                  <span className="text-xs font-bold text-slate-300 w-12 text-right">
                    {item.allocatedPercentage}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="glass-card p-6 sm:p-8 rounded-3xl border border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="font-display font-bold text-2xl text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" /> Smart Vendor Recommendations
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Vendors scored based on your category budget allocation, rating, experience, and location compatibility.
            </p>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0">
            {['All', 'Venue', 'Catering', 'Photography', 'Decoration'].map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategoryFilter(cat)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  activeCategoryFilter === cat
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {recommendedVendors.map(({ vendor, score, remainingCatBudget, fitsBudget }) => (
            <div
              key={vendor.id}
              onClick={() => onSelectVendor(vendor)}
              className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-indigo-500/50 transition-all cursor-pointer flex items-center gap-4 group"
            >
              <div className="w-20 h-20 rounded-xl overflow-hidden bg-slate-950 shrink-0">
                <img src={vendor.galleryImages[0]} alt={vendor.businessName} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="font-bold text-sm text-white truncate group-hover:text-indigo-400 transition-colors">
                    {vendor.businessName}
                  </h4>
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-extrabold text-[11px] shrink-0">
                    {score}% Match
                  </span>
                </div>

                <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-indigo-400" /> {vendor.location.city} • {vendor.category}
                </p>

                <div className="mt-2 flex items-center justify-between text-xs">
                  <span className="font-bold text-amber-400">
                    Starting ₹{vendor.startingPrice.toLocaleString('en-IN')}
                  </span>

                  {fitsBudget ? (
                    <span className="text-emerald-400 font-bold text-[11px] flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Within Category Budget
                    </span>
                  ) : (
                    <span className="text-rose-400 text-[11px]">Slightly exceeds budget</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
