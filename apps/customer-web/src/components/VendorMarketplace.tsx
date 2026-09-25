import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Star, MapPin, Heart, CheckCircle2, SlidersHorizontal, ArrowUpDown, Layers, Phone, Eye,
  LayoutGrid, UtensilsCrossed, Building2, Sparkles, Brush, Camera, Video, Car, Flame,
  Mail, Printer, Gift, PartyPopper, Music, Lightbulb, Flower2, Hand, Mic, Shield,
  SprayCan, Package, Utensils, ClipboardList, Briefcase, MoreHorizontal,
  ChevronLeft, ChevronRight, X, Search, ChevronDown, Check,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Vendor, VendorCategory, VENDOR_CATEGORIES, getLiveDeals, openSlots } from '../../../../packages/shared-types';
import { STATIC_CITY_GROUPS } from '../../../../packages/shared-utils';
import { FacilityChips, filterVenuesByFacilities } from './FacilitiesForm';
import { useInfiniteList, LoadMoreSentinel } from '../../../../packages/shared-ui/lazy';
import { Trie } from '../../../../packages/shared-utils/dataStructures';

// A search-box suggestion: a vendor, a category or a city.
type Suggestion =
  | { kind: 'vendor'; label: string; vendor: Vendor }
  | { kind: 'category'; label: string }
  | { kind: 'city'; label: string };
import { CateringMenuChips } from './CateringMenu';
import { PortfolioChips } from './Portfolio';
import { DecorationChips } from './DecorationThemes';
import { MakeupChips } from './MakeupLooks';
import { TransportChips } from './TransportOptions';
import { PriestChips } from './PriestServices';
import { GiftChips } from './ReturnGifts';
import { MusicDjChips } from './MusicDjOptions';
import { GenericCategoryChips } from './CategoryOptions';
import { getVendorCoverImage, categoryCoverImage } from './vendorUtils';

// Categories with their own bespoke chips component (rendered explicitly
// below). Every other category falls back to GenericCategoryChips so no
// category tab is left with a blank options panel.
const BESPOKE_CATEGORIES = new Set<string>([
  'Venue', 'Catering', 'Decoration', 'Makeup & Beauty', 'Transport', 'Pujari/Priest', 'Return Gifts', 'Music/DJ',
]);

interface VendorMarketplaceProps {
  vendors: Vendor[];
  onSelectVendor: (vendor: Vendor) => void;
  wishlist: string[];
  toggleWishlist: (vendorId: string) => void;
  selectedCompareIds: string[];
  toggleCompare: (vendorId: string) => void;
  openCompareModal: () => void;
  selectedCity: string;
  maxBudget: number | null;
  onCityChange: (city: string) => void;
  selectedCategory?: string;
  onCategoryChange?: (category: string) => void;
  // Ordered [state, cities][] for the city filter — sourced from the backend's
  // serviceable cities (falls back to the full India catalogue).
  cityGroups?: [string, string[]][];
  // The logged-in customer's current event date/title — when set, the list
  // narrows to vendors still open on that date.
  eventDate?: string;
  eventTitle?: string;
}

const CATEGORIES: (VendorCategory | 'All')[] = ['All', ...VENDOR_CATEGORIES];

// A small icon for each category chip so the filter row reads at a glance.
const CATEGORY_ICONS: Record<string, LucideIcon> = {
  All: LayoutGrid,
  Catering: UtensilsCrossed,
  Venue: Building2,
  Decoration: Sparkles,
  'Makeup & Beauty': Brush,
  Media: Camera,
  Transport: Car,
  'Pujari/Priest': Flame,
  Invitation: Mail,
  Printing: Printer,
  'Return Gifts': Gift,
  Entertainment: PartyPopper,
  'Music/DJ': Music,
  Lighting: Lightbulb,
  Flowers: Flower2,
  Mehendi: Hand,
  'Event Host/Anchor': Mic,
  Security: Shield,
  Cleaning: SprayCan,
  'Rental Equipment': Package,
  'Utensils for Rent': Utensils,
  'Wedding Planner': ClipboardList,
  'Corporate Event Services': Briefcase,
  Other: MoreHorizontal,
};

export const VendorMarketplace: React.FC<VendorMarketplaceProps> = ({
  vendors,
  onSelectVendor,
  wishlist,
  toggleWishlist,
  selectedCompareIds,
  toggleCompare,
  openCompareModal,
  selectedCity,
  maxBudget,
  onCityChange,
  selectedCategory: selectedCategoryProp,
  onCategoryChange,
  cityGroups,
  eventDate: rawEventDate,
  eventTitle,
}) => {
  const groups = cityGroups && cityGroups.length > 0 ? cityGroups : STATIC_CITY_GROUPS;
  const [selectedCategory, setSelectedCategory] = useState<string>(selectedCategoryProp || 'All');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Trie for search-as-you-type. Built once per vendor list: every word of a
  // vendor's name, its category and its city are inserted, so typing "mug"
  // finds "Caterings of Mughals" and "cat" finds the Catering category.
  const searchTrie = useMemo(() => {
    const trie = new Trie<Suggestion>();
    const shared = new Map<string, Suggestion>(); // one object per category/city so the Trie dedupes them
    const once = (key: string, make: () => Suggestion) => {
      if (!shared.has(key)) shared.set(key, make());
      return shared.get(key)!;
    };
    for (const v of vendors) {
      const vendorSuggestion: Suggestion = { kind: 'vendor', label: v.businessName, vendor: v };
      trie.insert(v.businessName, vendorSuggestion);
      for (const word of v.businessName.split(/\s+/)) if (word.length > 1) trie.insert(word, vendorSuggestion);
      const cat = once(`category:${v.category}`, () => ({ kind: 'category', label: v.category }));
      trie.insert(v.category, cat);
      const city = v.location?.city;
      if (city) trie.insert(city, once(`city:${city.toLowerCase()}`, () => ({ kind: 'city', label: city })));
    }
    return trie;
  }, [vendors]);
  const suggestions = searchInput.trim() ? searchTrie.search(searchInput, 8) : [];

  const pickSuggestion = (sg: Suggestion) => {
    setShowSuggestions(false);
    if (sg.kind === 'vendor') {
      setSearchInput('');
      onSelectVendor(sg.vendor);
    } else if (sg.kind === 'category') {
      setSearchInput('');
      setSearchQuery('');
      setSelectedCategory(sg.label);
      onCategoryChange?.(sg.label);
    } else {
      setSearchInput('');
      setSearchQuery('');
      onCityChange(sg.label);
    }
  };
  const [sortBy, setSortBy] = useState<'rating' | 'price_low' | 'price_high'>('rating');
  const [activeFacilities, setActiveFacilities] = useState<string[]>([]);
  // Selected sub-category option chips (e.g. Catering → Veg / Non-Veg). Clicking
  // a chip filters the vendor list to vendors that offer that option (matched
  // against vendor.offeredOptions) instead of opening a photo gallery.
  const [activeOptions, setActiveOptions] = useState<string[]>([]);

  const categoryScrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const updateCategoryScroll = () => {
    const el = categoryScrollRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 6);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 6);
  };

  useEffect(() => {
    updateCategoryScroll();
    const el = categoryScrollRef.current;
    if (el) {
      el.addEventListener('scroll', updateCategoryScroll, { passive: true });
      window.addEventListener('resize', updateCategoryScroll);
    }
    return () => {
      el?.removeEventListener('scroll', updateCategoryScroll);
      window.removeEventListener('resize', updateCategoryScroll);
    };
  }, []);

  const scrollCategories = (dir: 'left' | 'right') => {
    const el = categoryScrollRef.current;
    if (!el) return;
    const scrollAmount = Math.max(220, Math.floor(el.clientWidth * 0.75));
    el.scrollBy({
      left: dir === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  const toggleFacility = (key: string) => {
    setActiveFacilities((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const toggleOption = (label: string) => {
    setActiveOptions((prev) =>
      prev.includes(label) ? prev.filter((k) => k !== label) : [...prev, label]
    );
  };

  const handleCategoryChange = (cat: string) => {
    setSelectedCategory(cat);
    onCategoryChange?.(cat);
    if (cat !== 'Venue') setActiveFacilities([]);
    setActiveOptions([]);
  };

  useEffect(() => {
    if (selectedCategoryProp && selectedCategoryProp !== selectedCategory) {
      setSelectedCategory(selectedCategoryProp);
    }
  }, [selectedCategoryProp, selectedCategory]);

  const filteredVendors = filterVenuesByFacilities(
    vendors.filter((v) => {
      const matchCat = selectedCategory === 'All' || v.category === selectedCategory;
      const q = searchQuery.toLowerCase();
      const matchSearch =
        v.businessName.toLowerCase().includes(q) ||
        v.description.toLowerCase().includes(q) ||
        v.category.toLowerCase().includes(q) ||
        (v.location?.city || '').toLowerCase().includes(q);
      const matchCity = selectedCity === 'All' || v.location.city.toLowerCase() === selectedCity.toLowerCase();
      const matchBudget = maxBudget === null || v.startingPrice <= maxBudget;
      // Sub-category option filter: keep only vendors that offer every selected
      // option. offeredOptions holds the labels the vendor ticked (Veg, Non-Veg,
      // theme names, etc.), matching the chip labels shown for the category.
      // Pool of everything this vendor "offers" — their explicit tags plus the
      // structured options they filled in their package (catering food types,
      // decoration themes/areas, makeup types, venue sessions/hall) — so a chip
      // matches a vendor who declared it anywhere, not only via an explicit tag.
      const optionPool = [
        ...(v.offeredOptions || []),
        ...((v.packages || []) as any[]).flatMap((p) => [
          ...((p.catering?.foodTypes as string[]) || []),
          ...((p.catering?.cuisines as string[]) || []),
          ...((p.decoration?.themes as string[]) || []),
          ...((p.decoration?.areas as string[]) || []),
          ...(p.decoration?.flowers ? [p.decoration.flowers as string] : []),
          ...((p.makeup?.makeupTypes as string[]) || []),
          ...((p.venue?.sessions as string[]) || []),
          ...(p.venue?.hallType ? [p.venue.hallType as string] : []),
          ...(p.venue?.hallClass ? [p.venue.hallClass as string] : []),
        ]),
      ];
      // Match a chip if a pool entry equals it, is a "<chip> — detail" variant, or
      // shares a whole word (so package "Royal" matches chip "Royal Mandap",
      // "Bridal" matches "Bridal Makeup", "Traditional" matches "South Indian
      // Traditional") — bridging the package vs. marketplace label sets. Splitting
      // on spaces only (not hyphens) keeps "Non-Veg" one token, so "Veg" never
      // matches "Non-Veg".
      const words = (s: string) => s.toLowerCase().split(/[\s&/,]+/).filter(Boolean);
      const chipMatches = (opt: string, o: string) => {
        if (o === opt || o.startsWith(`${opt} — `)) return true;
        const pw = words(o);
        return words(opt).some((w) => pw.includes(w));
      };
      const matchOptions =
        activeOptions.length === 0 ||
        activeOptions.every((opt) => optionPool.some((o) => chipMatches(opt, o)));
      return matchCat && matchSearch && matchCity && matchBudget && matchOptions;
    }),
    activeFacilities
  ).sort((a, b) => {
    if (sortBy === 'rating') return b.ratingAverage - a.ratingAverage;
    if (sortBy === 'price_low') return a.startingPrice - b.startingPrice;
    if (sortBy === 'price_high') return b.startingPrice - a.startingPrice;
    return 0;
  });

  // Vendors free on the customer's event date: they listed that date and still
  // have at least one session open on it. If none are, fall back to everyone so
  // the customer can pick another date from a vendor's calendar.
  const eventDate = rawEventDate ? rawEventDate.slice(0, 10) : '';
  const [showAllDates, setShowAllDates] = useState(false);
  useEffect(() => { setShowAllDates(false); }, [eventDate]);
  const freeOnEventDate = (v: Vendor) =>
    !!eventDate && (v.availableDates || []).includes(eventDate) && openSlots(v, eventDate).length > 0;
  const dateMatches = eventDate ? filteredVendors.filter(freeOnEventDate) : [];
  const narrowToDate = !!eventDate && dateMatches.length > 0 && !showAllDates;
  const displayedVendors = narrowToDate ? dateMatches : filteredVendors;
  // Sets: each card asks "is this vendor wishlisted / in compare?" — Set.has
  // is O(1), versus scanning the id array with .includes() for every card.
  const wishlistSet = useMemo(() => new Set(wishlist), [wishlist]);
  const compareSet = useMemo(() => new Set(selectedCompareIds), [selectedCompareIds]);
  // Infinite scroll: draw 12 vendor cards first, then 12 more each time the
  // bottom of the grid comes into view. Resets to the first 12 when any
  // filter, search, sort or the event-date view changes.
  const vendorPage = useInfiniteList(
    displayedVendors,
    12,
    [selectedCategory, searchQuery, sortBy, selectedCity, maxBudget, activeOptions.join('|'), activeFacilities.join('|'), narrowToDate].join('~'),
  );
  const eventDateLabel = eventDate
    ? new Date(`${eventDate}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : '';
  const categoryWord = selectedCategory !== 'All' ? `${selectedCategory} ` : '';

  return (
    <div id="vendor-marketplace-section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="font-display font-bold text-2xl sm:text-3xl text-white tracking-tight">
            Explore Verified Vendors
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Showing {displayedVendors.length} premium event partners
            {selectedCity !== 'All' ? ` in ${selectedCity}` : ' across India'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Search with Trie-powered suggestions */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={searchInput}
              onChange={(e) => { setSearchInput(e.target.value); setShowSuggestions(true); if (!e.target.value) setSearchQuery(''); }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              onKeyDown={(e) => { if (e.key === 'Enter') { setSearchQuery(searchInput.trim()); setShowSuggestions(false); } }}
              placeholder="Search vendors, categories, cities…"
              aria-label="Search vendors"
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 text-xs placeholder:text-slate-500 focus:outline-none focus:border-amber-400/60"
            />
            {showSuggestions && suggestions.length > 0 && (
              <ul className="absolute z-30 mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 shadow-xl overflow-hidden" role="listbox">
                {suggestions.map((sg, i) => (
                  <li key={`${sg.kind}-${sg.label}-${i}`}>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => pickSuggestion(sg)}
                      className="w-full text-left px-3 py-2 text-xs flex items-center justify-between gap-2 hover:bg-slate-800"
                    >
                      <span className="text-slate-200 truncate">{sg.label}</span>
                      <span className="shrink-0 text-[10px] uppercase font-bold text-slate-500">
                        {sg.kind === 'vendor' ? (sg.vendor.category) : sg.kind}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs">
            <MapPin className="w-3.5 h-3.5 text-indigo-400" />
            <select
              value={selectedCity}
              onChange={(e) => onCityChange(e.target.value)}
              className="bg-transparent text-slate-200 font-semibold focus:outline-none cursor-pointer"
            >
              <option value="All" className="bg-slate-900">All Cities</option>
              {groups.map(([state, cities]) => (
                <optgroup key={state} label={state} className="bg-slate-900">
                  {cities.map((c) => (
                    <option key={`${state}-${c}`} value={c} className="bg-slate-900">
                      {c}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs">
            <ArrowUpDown className="w-3.5 h-3.5 text-amber-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-transparent text-slate-200 font-semibold focus:outline-none cursor-pointer"
            >
              <option value="rating" className="bg-slate-900">Top Rated First</option>
              <option value="price_low" className="bg-slate-900">Price: Low to High</option>
              <option value="price_high" className="bg-slate-900">Price: High to Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* Categories Header Label */}
      <div className="flex items-center justify-between mb-3 px-1">
        <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-amber-400" />
          Categories
        </span>
        <span className="text-[11px] text-amber-400/80 font-medium sm:hidden flex items-center gap-1">
          Tap arrow to explore <ChevronRight className="w-3 h-3 inline" />
        </span>
      </div>

      {/* Category Row with Left & Right Arrow Navigation Buttons */}
      <div className="flex items-center gap-1.5 sm:gap-2 mb-8">
        {/* Left Arrow Button */}
        <button
          type="button"
          onClick={() => scrollCategories('left')}
          disabled={!canScrollLeft}
          aria-label="Scroll left to see previous categories"
          className={`w-9 h-9 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center shrink-0 border transition-all ${
            canScrollLeft
              ? 'bg-slate-900 border-slate-700 text-amber-400 hover:bg-slate-800 hover:border-amber-500/50 active:scale-95 shadow-md cursor-pointer'
              : 'bg-slate-950/40 border-slate-900 text-slate-700 opacity-20 cursor-not-allowed'
          }`}
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        {/* Scrollable Categories List */}
        <div
          ref={categoryScrollRef}
          onScroll={updateCategoryScroll}
          className="flex-1 flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth touch-pan-x py-1"
        >
          {CATEGORIES.map((cat) => {
            const Icon = CATEGORY_ICONS[cat] ?? Layers;
            const isActive = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={(e) => {
                  handleCategoryChange(cat);
                  e.currentTarget.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
                }}
                className={`flex items-center gap-2 pl-3 pr-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap shrink-0 transition-all ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 scale-105 ring-2 ring-indigo-400/30'
                    : 'bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <span
                  className={`flex items-center justify-center w-6 h-6 rounded-lg transition-colors ${
                    isActive ? 'bg-white/20' : 'bg-slate-800 text-amber-400'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                </span>
                {cat}
              </button>
            );
          })}
        </div>

        {/* Right Arrow Button to look at remaining categories */}
        <button
          type="button"
          onClick={() => scrollCategories('right')}
          disabled={!canScrollRight}
          aria-label="Scroll right to look at remaining categories"
          className={`w-9 h-9 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center shrink-0 border transition-all ${
            canScrollRight
              ? 'bg-slate-900 border-amber-500/60 text-amber-300 hover:bg-slate-800 hover:border-amber-400 active:scale-95 shadow-md shadow-amber-500/20 cursor-pointer animate-pulse'
              : 'bg-slate-950/40 border-slate-900 text-slate-700 opacity-20 cursor-not-allowed'
          }`}
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {selectedCategory === 'Venue' && (
        <FacilityChips active={activeFacilities} onToggle={toggleFacility} />
      )}

      {selectedCategory === 'Catering' && <CateringMenuChips onSelect={(_id, label) => toggleOption(label)} isSelected={(label) => activeOptions.includes(label)} />}

      {selectedCategory === 'Decoration' && <DecorationChips onSelect={(_id, label) => toggleOption(label)} isSelected={(label) => activeOptions.includes(label)} />}

      {selectedCategory === 'Makeup & Beauty' && <MakeupChips onSelect={(_id, label) => toggleOption(label)} isSelected={(label) => activeOptions.includes(label)} />}

      {selectedCategory === 'Transport' && <TransportChips onSelect={(_id, label) => toggleOption(label)} isSelected={(label) => activeOptions.includes(label)} />}

      {selectedCategory === 'Pujari/Priest' && <PriestChips onSelect={(_id, label) => toggleOption(label)} isSelected={(label) => activeOptions.includes(label)} />}

      {selectedCategory === 'Return Gifts' && <GiftChips onSelect={(_id, label) => toggleOption(label)} isSelected={(label) => activeOptions.includes(label)} />}

      {selectedCategory === 'Music/DJ' && <MusicDjChips onSelect={(_id, label) => toggleOption(label)} isSelected={(label) => activeOptions.includes(label)} />}

      {selectedCategory !== 'All' && !BESPOKE_CATEGORIES.has(selectedCategory) && (
        <GenericCategoryChips category={selectedCategory as VendorCategory} onSelect={(_id, label) => toggleOption(label)} isSelected={(label) => activeOptions.includes(label)} />
      )}

      {activeOptions.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-6 -mt-2">
          <span className="text-[11px] text-slate-500">Filtering by:</span>
          {activeOptions.map((opt) => (
            <button key={opt} type="button" onClick={() => toggleOption(opt)} className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full bg-indigo-600/20 border border-indigo-500 text-white">
              {opt} <span className="text-slate-300">✕</span>
            </button>
          ))}
          <button type="button" onClick={() => setActiveOptions([])} className="text-[11px] text-slate-400 hover:text-white underline">Clear</button>
        </div>
      )}

      {filteredVendors.length === 0 && (
        <div className="text-center py-20 px-4 bg-slate-900/40 border border-slate-800/80 rounded-3xl backdrop-blur-md max-w-xl mx-auto my-8">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-4 text-2xl shadow-inner">
            🏪
          </div>
          <h3 className="text-lg font-bold text-white mb-2">
            {vendors.length === 0 ? 'No Vendors Listed Yet' : 'No Vendors Match Your Filters'}
          </h3>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            {vendors.length === 0
              ? 'New verified vendor profiles created on the server will appear here live.'
              : activeOptions.length > 0
              ? `No ${selectedCategory !== 'All' ? selectedCategory + ' ' : ''}vendors offer ${activeOptions.join(' + ')} yet.`
              : 'Try clearing your category or city filters to see more results.'}
          </p>
          {activeOptions.length > 0 && (
            <button type="button" onClick={() => setActiveOptions([])} className="mt-3 inline-block text-xs font-semibold text-amber-400 hover:text-amber-300 underline">
              Clear option filters
            </button>
          )}
          {vendors.length > 0 && selectedCategory !== 'All' && (
            <button type="button" onClick={() => setSelectedCategory('All')} className="mt-3 inline-block text-xs font-semibold text-indigo-400 hover:text-indigo-300 underline ml-3">
              View All Categories
            </button>
          )}
        </div>
      )}

      {eventDate && filteredVendors.length > 0 && (
        dateMatches.length > 0 ? (
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
            <p className="text-sm text-emerald-100">
              {narrowToDate ? (
                <>Showing <strong>{dateMatches.length}</strong> {categoryWord}vendor{dateMatches.length === 1 ? '' : 's'} available on <strong className="text-amber-300">{eventDateLabel}</strong>{eventTitle ? <> for <strong>{eventTitle}</strong></> : null}.</>
              ) : (
                <>Showing all {categoryWord}vendors. <strong>{dateMatches.length}</strong> of them {dateMatches.length === 1 ? 'is' : 'are'} available on <strong className="text-amber-300">{eventDateLabel}</strong>.</>
              )}
            </p>
            <button type="button" onClick={() => setShowAllDates((v) => !v)}
              className="shrink-0 text-xs font-bold text-emerald-300 hover:text-emerald-200 underline underline-offset-2">
              {narrowToDate ? 'Show all vendors' : `Only vendors free on ${eventDateLabel}`}
            </button>
          </div>
        ) : (
          <div className="mb-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
            <p className="text-sm text-amber-100">
              No {categoryWord}vendors are available on your event date <strong className="text-amber-300">{eventDateLabel}</strong>{eventTitle ? <> ({eventTitle})</> : null}.
            </p>
            <p className="text-xs text-amber-200/80 mt-1">Showing all vendors instead — open a vendor to see their other available dates and pick one of those.</p>
          </div>
        )
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {vendorPage.visible.map((vendor) => {
          const isWishlisted = wishlistSet.has(vendor.id);
          const isCompared = compareSet.has(vendor.id);

          return (
            <div
              key={vendor.id}
              className="vendor-card glass-card glass-card-hover rounded-3xl overflow-hidden border border-amber-500/25 shadow-[0_0_40px_-20px_rgba(245,158,11,0.5)] hover:border-amber-400/50 hover:shadow-[0_0_45px_-14px_rgba(245,158,11,0.55)] transition-all flex flex-col group"
            >
              <div className="relative h-56 w-full overflow-hidden bg-slate-900">
                <img loading="lazy" decoding="async"
                  src={getVendorCoverImage(vendor)}
                  alt={vendor.businessName}
                  onError={(e) => {
                    // If even the chosen image fails, drop to the category cover
                    // (and stop retrying once we're already on it).
                    const fallback = categoryCoverImage(vendor.category);
                    if (e.currentTarget.src !== fallback) e.currentTarget.src = fallback;
                  }}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-80" />

                <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
                  <span className="px-3 py-1 rounded-full bg-slate-950/80 backdrop-blur-md text-slate-200 text-xs font-semibold border border-slate-700/50">
                    {vendor.category}
                  </span>

                  <button
                    onClick={() => toggleWishlist(vendor.id)}
                    className="w-9 h-9 rounded-full bg-slate-950/80 backdrop-blur-md flex items-center justify-center text-slate-300 hover:text-pink-500 transition-colors border border-slate-700/50"
                  >
                    <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-pink-500 text-pink-500' : ''}`} />
                  </button>
                </div>

                <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/90 text-slate-950 text-xs font-bold shadow-md">
                    <Star className="w-3.5 h-3.5 fill-slate-950" />
                    <span>{vendor.ratingAverage}</span>
                    <span className="text-[11px] font-normal text-slate-900">({vendor.reviewCount})</span>
                  </div>

                  {vendor.isVerified && (
                    <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-slate-950/80 px-2.5 py-1 rounded-lg border border-emerald-500/30">
                      <CheckCircle2 className="w-3 h-3" /> Verified
                    </span>
                  )}
                  {getLiveDeals(vendor).length > 0 && (
                    <span className="flex items-center gap-1 text-[11px] font-bold text-amber-300 bg-slate-950/80 px-2.5 py-1 rounded-lg border border-amber-500/40">
                      🎉 Offer
                    </span>
                  )}
                </div>
              </div>

              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="font-display font-bold text-lg text-white group-hover:text-indigo-400 transition-colors">
                    {vendor.businessName}
                  </h3>

                  <p className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                    <MapPin className="w-3.5 h-3.5 text-indigo-400" />
                    {vendor.location.address}, {vendor.location.city}
                  </p>

                  <p className="text-xs text-slate-300 mt-3 line-clamp-2 leading-relaxed">
                    {vendor.description}
                  </p>

                  <div className="mt-4 pt-4 border-t border-slate-800/80 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Starting From</span>
                      <span className="font-display font-extrabold text-xl text-amber-400">
                        ₹{vendor.startingPrice.toLocaleString('en-IN')}
                      </span>
                    </div>

                    <span className="text-xs text-slate-400 font-medium">
                      {vendor.packages.length} Packages
                    </span>
                  </div>
                </div>

                <div className="mt-5 pt-4 flex items-center gap-2">
                  <button
                    onClick={() => onSelectVendor(vendor)}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5"
                  >
                    <Eye className="w-4 h-4" /> View Details
                  </button>

                  <button
                    onClick={() => toggleCompare(vendor.id)}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-semibold transition-all flex items-center gap-1 ${
                      isCompared
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                    title="Compare Vendor"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    {isCompared ? 'Added' : 'Compare'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <LoadMoreSentinel
        sentinelRef={vendorPage.sentinelRef}
        hasMore={vendorPage.hasMore}
        onClick={vendorPage.showMore}
        shown={vendorPage.shown}
        total={vendorPage.total}
      />

      {selectedCompareIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900/95 border border-indigo-500/40 backdrop-blur-xl px-6 py-3.5 rounded-2xl shadow-2xl flex items-center gap-6 animate-bounce">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-amber-400" />
            <span className="text-sm font-bold text-white">
              {selectedCompareIds.length} Vendors Selected for Comparison
            </span>
          </div>

          <button
            onClick={openCompareModal}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold text-xs shadow-md hover:scale-105 transition-all"
          >
            Launch Comparison Table
          </button>
        </div>
      )}
    </div>
  );
};