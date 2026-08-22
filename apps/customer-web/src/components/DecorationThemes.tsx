import React, { useEffect, useRef, useState } from 'react';
import { X, ChevronLeft, ChevronRight, Sparkles, IndianRupee, CheckCircle2, Check, Plus } from 'lucide-react';

export interface DecorationTier {
  name: 'Economy' | 'Premium' | 'Luxury';
  price: number;
  features: string[];
}

export interface DecorationTheme {
  id: string;
  title: string;
  tradition: string;
  images: string[];
  tiers: DecorationTier[];
}

const IMG = (id: string) => `https://images.unsplash.com/${id}?w=1200&auto=format&q=75`;
const THUMB = (id: string) => `https://images.unsplash.com/${id}?w=600&h=400&fit=crop&auto=format&q=70`;

const TIER_STYLE: Record<DecorationTier['name'], { badge: string; ring: string }> = {
  Economy: { badge: 'bg-slate-800 text-slate-200 border border-slate-700', ring: 'border-slate-700' },
  Premium: { badge: 'bg-amber-950/70 text-amber-300 border border-amber-500/40', ring: 'border-amber-500/40' },
  Luxury: { badge: 'bg-violet-950/70 text-violet-300 border border-violet-500/40', ring: 'border-violet-500/40' },
};

// Decoration themes organised by tradition, each with Economy / Premium / Luxury budgets.
export const STANDARD_DECORATION: DecorationTheme[] = [
  {
    id: 'south-indian',
    title: 'South Indian Traditional',
    tradition: 'Tamil / Kerala / Telugu',
    images: ['photo-1587271636175-90d58cdad458', 'photo-1587271407850-8d438ca9fdf2', 'photo-1760080839536-1936f4ec2c23'],
    tiers: [
      { name: 'Economy', price: 25000, features: ['Banana & coconut mandap', 'Marigold + artificial florals', 'Standard stage lighting', 'Couple seating'] },
      { name: 'Premium', price: 60000, features: ['Fresh jasmine & rose mandap', 'Themed backdrop & drapes', 'Brass lamps (kuthuvilakku)', 'Entrance kolam & arch', 'Uplighting'] },
      { name: 'Luxury', price: 120000, features: ['Full fresh-flower kalyana mandapam', 'Temple-style carved set', 'Chandeliers & pin-spot lights', 'Poornakumbham entrance walkway', 'Dedicated decor team'] },
    ],
  },
  {
    id: 'royal-mandap',
    title: 'Royal Mandap',
    tradition: 'North Indian / Rajwada',
    images: ['photo-1756190564669-215843660e93', 'photo-1761472606347-bfebc5a3e546', 'photo-1773745060497-4cc1df774c72'],
    tiers: [
      { name: 'Economy', price: 80000, features: ['4-pillar mandap', 'Drape canopy', 'Floral pillars', 'Stage lighting'] },
      { name: 'Premium', price: 175000, features: ['Fresh-flower royal mandap', 'Palace-style arches', 'Crystal chandeliers', 'Grand entrance gate', 'Guest walkway decor'] },
      { name: 'Luxury', price: 350000, features: ['Palace themed set design', 'Imported fresh flowers', 'Fibre carvings & props', 'Fountain & foyer decor', 'Ceiling drapes across hall', 'Live decor management'] },
    ],
  },
  {
    id: 'reception-stage',
    title: 'Reception Stage',
    tradition: 'Modern / Fusion',
    images: ['photo-1605553426886-c0a99033fda0', 'photo-1640355105827-2aa98e908a7b', 'photo-1762709118823-7fe9c9afa8ff', 'photo-1780303864944-737d88c789f4'],
    tiers: [
      { name: 'Economy', price: 35000, features: ['Backdrop panel + sofa', 'Artificial flower frame', 'LED spotlights', 'Couple seating'] },
      { name: 'Premium', price: 75000, features: ['Themed floral backdrop', 'Designer couch & carpet', 'Uplighting + fairy lights', 'Welcome board & arch'] },
      { name: 'Luxury', price: 150000, features: ['Custom 3D themed stage', 'Fresh-flower wall', 'Moving-head & pin lighting', 'Entrance tunnel', 'Photo-booth corner', 'Centerpieces on guest tables'] },
    ],
  },
  {
    id: 'haldi-mehndi',
    title: 'Haldi & Mehndi',
    tradition: 'Pre-Wedding Function',
    images: ['photo-1607512566084-a20ed291d623', 'photo-1771992228898-79342c9c1c39', 'photo-1645257236324-9f431c6f3120'],
    tiers: [
      { name: 'Economy', price: 12000, features: ['Marigold string backdrop', 'Floor cushions', 'Basic props', 'Umbrella decor'] },
      { name: 'Premium', price: 25000, features: ['Marigold + genda phool wall', 'Low seating with bolsters', 'Hanging pots & wheels', 'Selfie props & signage'] },
      { name: 'Luxury', price: 50000, features: ['Full floral cabana', 'Swing (jhula) with flowers', 'Rustic themed set', 'Fun props & neon signs', 'Rangoli & pathway decor'] },
    ],
  },
  {
    id: 'christian',
    title: 'Christian Wedding',
    tradition: 'Church / Beach',
    images: ['photo-1529636798458-92182e662485', 'photo-1611430009613-3cd989684b41', 'photo-1641834916652-c7436fd6f99a'],
    tiers: [
      { name: 'Economy', price: 30000, features: ['Floral arch / gazebo', 'Aisle chair bows', 'Candle stands', 'White drapes'] },
      { name: 'Premium', price: 70000, features: ['Fresh-flower arch', 'Aisle petals & runners', 'Pew / chair florals', 'Entrance & signage'] },
      { name: 'Luxury', price: 140000, features: ['Grand floral canopy', 'Full aisle installation', 'Hanging florals & drapes', 'Reception table decor', 'Fairy-light ambience'] },
    ],
  },
  {
    id: 'garlands',
    title: 'Garlands & Floral Strings',
    tradition: 'Flowers / Maalai',
    images: ['photo-1764286954620-28029fbae9b6', 'photo-1664990106113-5121900ed371', 'photo-1705475388142-a2700c4caeb5'],
    tiers: [
      { name: 'Economy', price: 5000, features: ['Varmala (exchange) pair', 'Basic marigold hall strings', 'Entrance door garland', 'Fresh flowers'] },
      { name: 'Premium', price: 12000, features: ['Fresh jasmine + rose varmala', 'Stage & entrance garlands', 'Pillar & backdrop strings', 'Car garland'] },
      { name: 'Luxury', price: 25000, features: ['Designer imported-flower varmala', 'Full floral-string backdrop', 'Hanging garland ceiling', 'Car + entrance + pathway garlands', 'On-site florist team'] },
    ],
  },
  {
    id: 'birthday',
    title: 'Birthday & Baby Shower',
    tradition: 'Kids / Family',
    images: ['photo-1741969494307-55394e3e4071', 'photo-1643175816971-a463dee6ae61', 'photo-1710854897963-d45e8e26f7fc'],
    tiers: [
      { name: 'Economy', price: 8000, features: ['Balloon arch', 'Themed backdrop cloth', 'Cake table decor', 'Name banner'] },
      { name: 'Premium', price: 18000, features: ['Balloon + foil theme wall', 'Cake table + props', 'Photo corner', 'Custom name cutout'] },
      { name: 'Luxury', price: 40000, features: ['Full character theme set', 'Balloon ceiling & pillars', 'Dessert table styling', 'Entrance & welcome board', 'Fog / bubble entry'] },
    ],
  },
];

const priceRange = (t: DecorationTheme) => {
  const lo = t.tiers[0]?.price ?? 0;
  const hi = t.tiers[t.tiers.length - 1]?.price ?? 0;
  return `₹${lo.toLocaleString('en-IN')}–₹${hi.toLocaleString('en-IN')}`;
};

// Full-screen viewer: swipeable photos of a theme + its budget tiers.
export const DecorationThemeViewer: React.FC<{ theme: DecorationTheme; onClose: () => void; onPickTier?: (label: string) => void }> = ({ theme, onClose, onPickTier }) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [selectedTier, setSelectedTier] = useState<number | null>(null);
  const images = theme.images.map(IMG);

  useEffect(() => setSelectedTier(null), [theme.id]);

  const slide = (dir: number) => {
    const el = trackRef.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth, behavior: 'smooth' });
  };
  const goTo = (i: number) => {
    const el = trackRef.current;
    if (el) el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' });
  };
  const onScroll = () => {
    const el = trackRef.current;
    if (!el) return;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    setIndex((prev) => (prev !== i ? i : prev));
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') slide(1);
      else if (e.key === 'ArrowLeft') slide(-1);
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/90 backdrop-blur-sm p-4 sm:p-8"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`${theme.title} decoration`}
    >
      <div
        className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-800 shadow-2xl bg-slate-900 no-scrollbar"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 z-20 w-9 h-9 rounded-full bg-slate-900/90 border border-slate-700 flex items-center justify-center text-slate-200 hover:text-white hover:bg-slate-800 transition-colors shadow-lg"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Photo carousel */}
        <div className="relative">
          <div ref={trackRef} onScroll={onScroll} className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar">
            {images.map((src, i) => (
              <div key={i} className="snap-center shrink-0 w-full h-60 sm:h-80 bg-slate-950">
                <img src={src} alt={`${theme.title} ${i + 1}`} className="w-full h-full object-cover" draggable={false} />
              </div>
            ))}
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent pointer-events-none" />

          {images.length > 1 && (
            <>
              <button
                type="button"
                onClick={() => slide(-1)}
                aria-label="Previous photo"
                disabled={index === 0}
                className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-slate-950/70 border border-slate-700 backdrop-blur-sm flex items-center justify-center text-white hover:bg-slate-900 transition-colors disabled:opacity-30"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={() => slide(1)}
                aria-label="Next photo"
                disabled={index === images.length - 1}
                className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-slate-950/70 border border-slate-700 backdrop-blur-sm flex items-center justify-center text-white hover:bg-slate-900 transition-colors disabled:opacity-30"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
              <div className="absolute bottom-3 inset-x-0 z-10 flex items-center justify-center gap-1.5">
                {images.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    aria-label={`Go to photo ${i + 1}`}
                    onClick={() => goTo(i)}
                    className={`h-1.5 rounded-full transition-all ${i === index ? 'w-5 bg-white' : 'w-1.5 bg-white/50 hover:bg-white/80'}`}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {/* Title + budget tiers */}
        <div className="p-5">
          <div className="mb-4">
            <h3 className="text-white font-display font-bold text-2xl">{theme.title}</h3>
            <p className="text-xs text-slate-400 mt-0.5">{theme.tradition} · {priceRange(theme)}</p>
          </div>

          <h4 className="text-sm font-bold text-white mb-3">Choose by budget</h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {theme.tiers.map((tier, i) => {
              const s = TIER_STYLE[tier.name];
              const isSelected = selectedTier === i;
              return (
                <button
                  key={tier.name}
                  type="button"
                  onClick={() => {
                    setSelectedTier(i);
                    // Record the exact tier the customer picked so it travels
                    // with the booking (e.g. "Royal Mandap — Premium (₹1,75,000)").
                    onPickTier?.(`${theme.title} — ${tier.name} (₹${tier.price.toLocaleString('en-IN')})`);
                  }}
                  aria-pressed={isSelected}
                  className={`text-left rounded-xl border p-4 flex flex-col transition-colors ${
                    isSelected ? 'border-amber-400 bg-amber-500/10 ring-2 ring-amber-400/60' : `${s.ring} bg-slate-950/40 hover:border-slate-600`
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className={`self-start px-2.5 py-1 rounded-full text-[11px] font-bold ${s.badge}`}>{tier.name}</span>
                    {isSelected && (
                      <span className="flex items-center gap-1 text-[11px] font-bold text-amber-400">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Selected
                      </span>
                    )}
                  </div>
                  <div className="mt-2 font-display font-extrabold text-amber-400 text-lg flex items-center">
                    <IndianRupee className="w-4 h-4" />
                    {tier.price.toLocaleString('en-IN')}
                  </div>
                  <ul className="mt-3 space-y-1.5">
                    {tier.features.map((f, i) => (
                      <li key={i} className="text-xs text-slate-300 flex items-start gap-1.5">
                        <span className="mt-1 w-1 h-1 rounded-full bg-slate-500 shrink-0" /> {f}
                      </li>
                    ))}
                  </ul>
                </button>
              );
            })}
          </div>

          {selectedTier !== null && (
            <p className="mt-4 text-xs text-emerald-400 font-semibold">
              Added to your booking: {theme.title} — {theme.tiers[selectedTier].name} package (₹{theme.tiers[selectedTier].price.toLocaleString('en-IN')}).
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

// Marketplace-level "Themes" chip row for Decoration.
export const DecorationChips: React.FC<{
  themes?: DecorationTheme[];
  onSelect?: (id: string, label: string) => void;
  isSelected?: (id: string) => boolean;
}> = ({ themes = STANDARD_DECORATION, onSelect, isSelected }) => {
  const [openId, setOpenId] = useState<string | null>(null);
  const open = themes.find((t) => t.id === openId) || null;

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <span className="flex items-center gap-1.5 text-xs font-bold text-pink-300 mr-1">
          <Sparkles className="w-3.5 h-3.5" /> Themes
        </span>
        {themes.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => { setOpenId(t.id); onSelect?.(t.id, t.title); }}
            className={`group flex items-center gap-1.5 text-xs px-3.5 py-1.5 rounded-full border transition-colors ${
              isSelected?.(t.id)
                ? 'border-indigo-500 bg-indigo-600/20 text-white'
                : 'border-slate-800 bg-slate-900 text-slate-300 hover:text-white hover:border-pink-500/50'
            }`}
          >
            {t.title}
            <span className="ml-1 font-bold text-amber-400">₹{t.tiers[0].price.toLocaleString('en-IN')}+</span>
          </button>
        ))}
      </div>

      {open && <DecorationThemeViewer theme={open} onClose={() => setOpenId(null)} />}
    </>
  );
};

// Card grid of themes for the vendor detail modal. When `onToggle` is
// supplied, each card also gets a select toggle so the customer can pick
// which themes they want — those picks travel with the booking.
export const DecorationGrid: React.FC<{
  themes?: DecorationTheme[];
  selected?: string[];
  onToggle?: (title: string) => void;
  onPickTier?: (label: string) => void;
}> = ({ themes = STANDARD_DECORATION, selected, onToggle, onPickTier }) => {
  const [openId, setOpenId] = useState<string | null>(null);
  const open = themes.find((t) => t.id === openId) || null;
  // A theme counts as selected whether the customer picked the plain theme or a
  // specific budget tier ("Royal Mandap — Premium (…)").
  const themeSelected = (title: string) => !!selected?.some((o) => o === title || o.startsWith(`${title} — `));

  return (
    <div>
      <p className="text-sm text-slate-300 mb-4">
        Decoration by tradition &amp; budget — <span className="text-pink-300 font-semibold">{themes.length} themes</span>, each with Economy / Premium / Luxury options.
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {themes.map((t) => {
          const isSelected = themeSelected(t.title);
          return (
            <div
              key={t.id}
              className={`group relative h-44 rounded-2xl overflow-hidden border text-left ${isSelected ? 'border-emerald-500 ring-2 ring-emerald-500/40' : 'border-slate-800'}`}
            >
              <button
                type="button"
                onClick={() => setOpenId(t.id)}
                className="absolute inset-0 w-full h-full text-left focus:outline-none focus:ring-2 focus:ring-pink-500 cursor-pointer"
                title={`View ${t.title}`}
              >
                <img
                  src={THUMB(t.images[0])}
                  alt={t.title}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent" />
                <div className="absolute bottom-3 left-3 right-3">
                  <h4 className="text-white font-display font-bold text-sm leading-tight">{t.title}</h4>
                  <span className="text-[11px] text-amber-400 font-semibold">from ₹{t.tiers[0].price.toLocaleString('en-IN')}</span>
                </div>
              </button>
              {onToggle && (
                <button
                  type="button"
                  onClick={() => onToggle(t.title)}
                  aria-label={isSelected ? `Remove ${t.title}` : `Add ${t.title}`}
                  className={`absolute top-3 left-3 z-10 w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
                    isSelected ? 'bg-emerald-500 text-slate-950' : 'bg-slate-950/70 backdrop-blur-sm text-white hover:bg-slate-900'
                  }`}
                >
                  {isSelected ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {open && <DecorationThemeViewer theme={open} onClose={() => setOpenId(null)} onPickTier={onPickTier} />}
    </div>
  );
};
