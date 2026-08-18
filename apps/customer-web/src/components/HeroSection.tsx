import React, { useState, useEffect } from 'react';
import { Search, MapPin, Calendar as CalendarIcon, Users, IndianRupee, Sparkles, ShieldCheck, ArrowRight } from 'lucide-react';
import { STATIC_CITY_GROUPS, detectUserCity } from '../../../../packages/shared-utils';

interface HeroSectionProps {
  onSearch: (params: { eventType: string; city: string; guests: number; budget: number }) => void;
  openEventWizard: () => void;
  // Ordered [state, cities][] for the location dropdown — sourced from the
  // backend's serviceable cities (falls back to the full India catalogue).
  cityGroups?: [string, string[]][];
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onSearch, openEventWizard, cityGroups }) => {
  const groups = cityGroups && cityGroups.length > 0 ? cityGroups : STATIC_CITY_GROUPS;
  const [eventType, setEventType] = useState('Wedding');
  const [city, setCity] = useState('Chennai');
  const [cityAutoDetected, setCityAutoDetected] = useState(false);
  const [guests, setGuests] = useState(500);
  const [budget, setBudget] = useState(800000);

  // Auto-detect the visitor's city from their browser location so vendors near
  // them surface first. Silently keeps the default if permission is denied or
  // the detected place isn't in our catalogue. Skipped once the user picks a
  // city manually.
  useEffect(() => {
    let cancelled = false;
    detectUserCity().then((detected) => {
      if (!cancelled && detected) {
        setCity(detected);
        setCityAutoDetected(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch({ eventType, city, guests, budget });
  };

  return (
    <div className="relative pt-12 pb-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto text-center relative z-10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#2a1220]/80 border border-[#d4af37]/30 text-[#e8c874] text-xs font-semibold uppercase tracking-wider mb-6 shadow-inner">
          <Sparkles className="w-3.5 h-3.5 text-[#f0c869]" />
          <span>India's #1 Smart Event Marketplace Platform</span>
        </div>

        <h1 className="font-display font-extrabold text-4xl sm:text-6xl lg:text-7xl tracking-tight text-[#fdf1f5] leading-tight mb-6">
          Plan Your Perfect Event — <br />
          <span className="text-gradient-gold">Everything in One Place</span>
        </h1>

        <p className="max-w-2xl mx-auto text-[#e0b8cc] text-base sm:text-lg mb-10 leading-relaxed font-sans">
          Discover verified venues, traditional caterers, candid photographers, luxury decorators, and design Canva-like web invitations with automated smart budget calculations.
        </p>

        <form
          onSubmit={handleSearchSubmit}
          className="glass-card-gold p-4 sm:p-5 rounded-3xl shadow-2xl max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-center text-left"
        >
          <div className="bg-[#26101c]/80 p-3 rounded-2xl border border-[#6b2140]/60 hover:border-[#d4af37]/50 transition-colors">
            <label className="block text-[11px] font-bold text-[#cf9bb3] uppercase tracking-wider mb-1">
              Event Type
            </label>
            <select
              value={eventType}
              onChange={(e) => setEventType(e.target.value)}
              className="w-full bg-transparent text-[#fdf1f5] font-semibold text-sm focus:outline-none cursor-pointer"
            >
              <option value="Wedding" className="bg-[#26101c]">💒 Wedding</option>
              <option value="Birthday" className="bg-[#26101c]">🎂 Birthday Party</option>
              <option value="Engagement" className="bg-[#26101c]">💍 Engagement</option>
              <option value="Anniversary" className="bg-[#26101c]">✨ Anniversary</option>
              <option value="Baby Shower" className="bg-[#26101c]">👶 Baby Shower</option>
              <option value="Corporate Event" className="bg-[#26101c]">🏢 Corporate Event</option>
            </select>
          </div>

          <div className="bg-[#26101c]/80 p-3 rounded-2xl border border-[#6b2140]/60 hover:border-[#d4af37]/50 transition-colors">
            <label className="block text-[11px] font-bold text-[#cf9bb3] uppercase tracking-wider mb-1 flex items-center gap-1">
              <MapPin className="w-3 h-3 text-[#d4af37]" /> Location
              {cityAutoDetected && (
                <span className="text-[9px] text-[#e8c874] normal-case tracking-normal">· detected</span>
              )}
            </label>
            <select
              value={city}
              onChange={(e) => {
                setCity(e.target.value);
                setCityAutoDetected(false);
              }}
              className="w-full bg-transparent text-[#fdf1f5] font-semibold text-sm focus:outline-none cursor-pointer"
            >
              {groups.map(([state, cities]) => (
                <optgroup key={state} label={state} className="bg-[#26101c]">
                  {cities.map((c) => (
                    <option key={`${state}-${c}`} value={c} className="bg-[#26101c]">
                      {c}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          <div className="bg-[#26101c]/80 p-3 rounded-2xl border border-[#6b2140]/60 hover:border-[#d4af37]/50 transition-colors">
            <label className="block text-[11px] font-bold text-[#cf9bb3] uppercase tracking-wider mb-1 flex items-center gap-1">
              <Users className="w-3 h-3 text-[#f0c869]" /> Guests
            </label>
            <input
              type="number"
              value={guests === 0 ? '' : guests}
              onChange={(e) => {
                const raw = e.target.value.replace(/^0+(?=\d)/, '');
                setGuests(raw === '' ? 0 : Number(raw));
              }}
              placeholder="e.g. 500"
              step={1}
              min={1}
              className="w-full bg-transparent text-[#fdf1f5] font-semibold text-sm focus:outline-none"
            />
          </div>

          <div className="bg-[#26101c]/80 p-3 rounded-2xl border border-[#6b2140]/60 hover:border-[#d4af37]/50 transition-colors">
            <label className="block text-[11px] font-bold text-[#cf9bb3] uppercase tracking-wider mb-1 flex items-center gap-1">
              <IndianRupee className="w-3 h-3 text-[#e85d8a]" /> Total Budget
            </label>
            <div className="flex items-center gap-1">
              <span className="text-[#fdf1f5] font-bold text-sm">₹</span>
              <input
                type="number"
                value={budget === 0 ? '' : Math.round(budget / 100000)}
                onChange={(e) => {
                  const raw = e.target.value.replace(/^0+(?=\d)/, '');
                  const lakhs = raw === '' ? 0 : Number(raw);
                  setBudget(lakhs * 100000);
                }}
                placeholder="e.g. 8"
                step={1}
                min={1}
                className="w-14 bg-transparent text-[#fdf1f5] font-bold text-sm focus:outline-none"
              />
              <span className="text-[#fdf1f5] font-bold text-sm">Lakhs</span>
            </div>
          </div>

          <button
            type="submit"
            className="shine-sweep w-full h-full py-4 px-6 bg-gradient-to-r from-[#c9a648] via-[#d4af37] to-[#b8860b] hover:from-[#d4af37] hover:to-[#c9a648] text-[#1a0a14] font-bold rounded-2xl shadow-xl shadow-[#d4af37]/25 flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Search className="w-5 h-5" />
            <span>Search Vendors</span>
          </button>
        </form>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm text-[#e0b8cc]">
          <span className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#e85d8a]" /> 100% Verified Vendors
          </span>
          <span className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#f0c869]" /> Smart Percentage Allocator
          </span>
          <button
            onClick={openEventWizard}
            className="text-[#e8c874] hover:text-[#f0c869] font-semibold underline underline-offset-4 flex items-center gap-1"
          >
            Or launch 7-step planning wizard <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};