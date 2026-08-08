import React, { useState } from 'react';
import { Search, MapPin, Calendar as CalendarIcon, Users, IndianRupee, Sparkles, ShieldCheck, ArrowRight } from 'lucide-react';

interface HeroSectionProps {
  onSearch: (params: { eventType: string; city: string; guests: number; budget: number }) => void;
  openEventWizard: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onSearch, openEventWizard }) => {
  const [eventType, setEventType] = useState('Wedding');
  const [city, setCity] = useState('Chennai');
  const [guests, setGuests] = useState(500);
  const [budget, setBudget] = useState(800000);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch({ eventType, city, guests, budget });
  };

  return (
    <div className="relative overflow-hidden pt-12 pb-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-indigo-600/20 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-6xl mx-auto text-center relative z-10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900/80 border border-indigo-500/30 text-indigo-300 text-xs font-semibold uppercase tracking-wider mb-6 shadow-inner">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>India's #1 Smart Event Marketplace Platform</span>
        </div>

        <h1 className="font-display font-extrabold text-4xl sm:text-6xl lg:text-7xl tracking-tight text-white leading-tight mb-6">
          Plan Your Perfect Event — <br />
          <span className="text-gradient-purple">Everything in One Place</span>
        </h1>

        <p className="max-w-2xl mx-auto text-slate-400 text-base sm:text-lg mb-10 leading-relaxed font-sans">
          Discover verified venues, traditional caterers, candid photographers, luxury decorators, and design Canva-like web invitations with automated smart budget calculations.
        </p>

        <form 
          onSubmit={handleSearchSubmit}
          className="glass-card p-4 sm:p-5 rounded-3xl border border-slate-800 shadow-2xl max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-center text-left"
        >
          <div className="bg-slate-900/80 p-3 rounded-2xl border border-slate-800/80 hover:border-indigo-500/40 transition-colors">
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Event Type
            </label>
            <select
              value={eventType}
              onChange={(e) => setEventType(e.target.value)}
              className="w-full bg-transparent text-slate-100 font-semibold text-sm focus:outline-none cursor-pointer"
            >
              <option value="Wedding" className="bg-slate-900">💒 Wedding</option>
              <option value="Birthday" className="bg-slate-900">🎂 Birthday Party</option>
              <option value="Engagement" className="bg-slate-900">💍 Engagement</option>
              <option value="Anniversary" className="bg-slate-900">✨ Anniversary</option>
              <option value="Baby Shower" className="bg-slate-900">👶 Baby Shower</option>
              <option value="Corporate Event" className="bg-slate-900">🏢 Corporate Event</option>
            </select>
          </div>

          <div className="bg-slate-900/80 p-3 rounded-2xl border border-slate-800/80 hover:border-indigo-500/40 transition-colors">
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
              <MapPin className="w-3 h-3 text-indigo-400" /> Location
            </label>
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full bg-transparent text-slate-100 font-semibold text-sm focus:outline-none cursor-pointer"
            >
              <option value="Chennai" className="bg-slate-900">Chennai</option>
              <option value="Coimbatore" className="bg-slate-900">Coimbatore</option>
              <option value="Madurai" className="bg-slate-900">Madurai</option>
              <option value="Bangalore" className="bg-slate-900">Bangalore</option>
            </select>
          </div>

          <div className="bg-slate-900/80 p-3 rounded-2xl border border-slate-800/80 hover:border-indigo-500/40 transition-colors">
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
              <Users className="w-3 h-3 text-amber-400" /> Guests
            </label>
            <input
              type="number"
              value={guests}
              onChange={(e) => setGuests(Number(e.target.value))}
              step={50}
              min={10}
              className="w-full bg-transparent text-slate-100 font-semibold text-sm focus:outline-none"
            />
          </div>

          <div className="bg-slate-900/80 p-3 rounded-2xl border border-slate-800/80 hover:border-indigo-500/40 transition-colors">
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
              <IndianRupee className="w-3 h-3 text-emerald-400" /> Total Budget
            </label>
            <div className="text-slate-100 font-bold text-sm">
              ₹{(budget / 100000).toFixed(1)} Lakhs
            </div>
          </div>

          <button
            type="submit"
            className="w-full h-full py-4 px-6 bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-700 hover:from-indigo-500 hover:to-violet-500 text-white font-bold rounded-2xl shadow-xl shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Search className="w-5 h-5" />
            <span>Search Vendors</span>
          </button>
        </form>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm text-slate-400">
          <span className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" /> 100% Verified Vendors
          </span>
          <span className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" /> Smart Percentage Allocator
          </span>
          <button
            onClick={openEventWizard}
            className="text-amber-400 hover:text-amber-300 font-semibold underline underline-offset-4 flex items-center gap-1"
          >
            Or launch 7-step planning wizard <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
