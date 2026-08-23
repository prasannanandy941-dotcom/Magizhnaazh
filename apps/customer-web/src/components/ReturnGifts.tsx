import React, { useEffect, useRef, useState } from 'react';
import { X, ChevronLeft, ChevronRight, Gift, IndianRupee, CheckCircle2, Check, Plus } from 'lucide-react';

export interface GiftTier {
  name: string;
  price: number; // per piece
  features: string[];
}

export interface GiftType {
  id: string;
  title: string;
  note: string;
  images: string[];
  tiers: GiftTier[];
}

const IMG = (id: string) => `https://images.unsplash.com/${id}?w=1200&auto=format&q=75`;
const THUMB = (id: string) => `https://images.unsplash.com/${id}?w=600&h=400&fit=crop&auto=format&q=70`;

const TIER_TONE = [
  { badge: 'bg-slate-800 text-slate-200 border border-slate-700', ring: 'border-slate-700' },
  { badge: 'bg-emerald-950/70 text-emerald-300 border border-emerald-500/40', ring: 'border-emerald-500/40' },
  { badge: 'bg-teal-950/70 text-teal-300 border border-teal-500/40', ring: 'border-teal-500/40' },
];

// Per-piece budget tiers for return gifts.
const TIERS = (a: number, b: number, c: number): GiftTier[] => [
  { name: 'Budget', price: a, features: ['Wrapped & labelled', 'Bulk 50+ pieces', 'Assorted designs', 'Delivery to venue'] },
  { name: 'Standard', price: b, features: ['Premium packaging', 'Personalised tag', 'Bulk 25+ pieces', 'Venue delivery + spares'] },
  { name: 'Premium', price: c, features: ['Luxury gift box', 'Custom name & date', 'Ribbon & thank-you card', 'Curated selection', 'Doorstep + venue delivery'] },
];

// Return-gift types, each with a gallery and per-piece pricing.
export const STANDARD_GIFTS: GiftType[] = [
  {
    id: 'traditional',
    title: 'Traditional (Silver & Brass)',
    note: 'Pooja items, silver coins, kumkum boxes',
    images: ['photo-1644061925268-053b6a592c2e', 'photo-1587561137874-245949d2a2fe', 'photo-1670339367678-2c75387b2151'],
    tiers: TIERS(40, 120, 350),
  },
  {
    id: 'sweets',
    title: 'Sweets & Dry Fruits',
    note: 'Mithai boxes & dry-fruit packs',
    images: ['photo-1710857397974-f0617001c39e', 'photo-1598799170795-45f90ddfb662', 'photo-1633168850968-76be3bb0a2fc'],
    tiers: TIERS(50, 150, 400),
  },
  {
    id: 'eco',
    title: 'Eco-Friendly Plants',
    note: 'Succulents, seed pens, jute bags',
    images: ['photo-1615737183238-2a9f1788608e', 'photo-1576163000465-e98b32b27419', 'photo-1636009966369-1bcdb2c258d0'],
    tiers: TIERS(30, 80, 180),
  },
  {
    id: 'personalized',
    title: 'Personalized Gifts',
    note: 'Photo mugs, frames, keychains',
    images: ['photo-1622595701760-039942e936de', 'photo-1509046725455-ad9638a050e8', 'photo-1600611987061-6a9a2081809e'],
    tiers: TIERS(60, 150, 350),
  },
  {
    id: 'hampers',
    title: 'Hampers & Favors',
    note: 'Decorated pouches & mini gift boxes',
    images: ['photo-1720798231559-287de1c8a3e5', 'photo-1706795042710-08025d8a03bf', 'photo-1772787429296-2bcb698f3195'],
    tiers: TIERS(40, 100, 250),
  },
  {
    id: 'kids',
    title: 'Kids Gifts',
    note: 'Toys, stationery & chocolates',
    images: ['photo-1726726192162-8ef4aeddf6ff', 'photo-1627109849234-722d28f9ed5a', 'photo-1588773468510-076c73682a62'],
    tiers: TIERS(30, 90, 200),
  },
];

const priceRange = (g: GiftType) => {
  const lo = g.tiers[0]?.price ?? 0;
  const hi = g.tiers[g.tiers.length - 1]?.price ?? 0;
  return `₹${lo}–₹${hi} / piece`;
};

// Full-screen viewer: swipeable gift photos + per-piece tiers.
export const GiftViewer: React.FC<{ gift: GiftType; onClose: () => void; onPickTier?: (label: string) => void }> = ({ gift, onClose, onPickTier }) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [selectedTier, setSelectedTier] = useState<number | null>(null);
  const images = gift.images.map(IMG);

  useEffect(() => setSelectedTier(null), [gift.id]);

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
      aria-label={`${gift.title} return gift`}
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

        <div className="relative">
          <div ref={trackRef} onScroll={onScroll} className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar">
            {images.map((src, i) => (
              <div key={i} className="snap-center shrink-0 w-full h-60 sm:h-80 bg-slate-950">
                <img src={src} alt={`${gift.title} ${i + 1}`} className="w-full h-full object-cover" draggable={false} />
              </div>
            ))}
          </div>

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

        <div className="p-5">
          <div className="mb-4">
            <h3 className="text-white font-display font-bold text-2xl">{gift.title}</h3>
            <p className="text-xs text-slate-400 mt-0.5">{gift.note} · {priceRange(gift)}</p>
          </div>

          <h4 className="text-sm font-bold text-white mb-3">Choose by budget (per piece)</h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {gift.tiers.map((tier, i) => {
              const tone = TIER_TONE[Math.min(i, 2)];
              const isSelected = selectedTier === i;
              return (
                <button
                  key={tier.name}
                  type="button"
                  onClick={() => {
                    setSelectedTier(i);
                    onPickTier?.(`${gift.title} — ${tier.name} (₹${tier.price}/piece)`);
                  }}
                  aria-pressed={isSelected}
                  className={`text-left rounded-xl border p-4 flex flex-col transition-colors ${
                    isSelected ? 'border-amber-400 bg-amber-500/10 ring-2 ring-amber-400/60' : `${tone.ring} bg-slate-950/40 hover:border-slate-600`
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className={`self-start px-2.5 py-1 rounded-full text-[11px] font-bold ${tone.badge}`}>{tier.name}</span>
                    {isSelected && (
                      <span className="flex items-center gap-1 text-[11px] font-bold text-amber-400">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Selected
                      </span>
                    )}
                  </div>
                  <div className="mt-2 font-display font-extrabold text-amber-400 text-lg flex items-center">
                    <IndianRupee className="w-4 h-4" />
                    {tier.price}
                    <span className="ml-1 text-xs text-slate-400 font-normal">/ piece</span>
                  </div>
                  <ul className="mt-3 space-y-1.5">
                    {tier.features.map((f, j) => (
                      <li key={j} className="text-xs text-slate-300 flex items-start gap-1.5">
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
              Added to your booking: {gift.title} — {gift.tiers[selectedTier].name} (₹{gift.tiers[selectedTier].price}/piece).
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

// Marketplace-level "Gift Types" chip row for Return Gifts.
export const GiftChips: React.FC<{
  gifts?: GiftType[];
  onSelect?: (id: string, label: string) => void;
  isSelected?: (id: string) => boolean;
}> = ({ gifts = STANDARD_GIFTS, onSelect, isSelected }) => {
  const [openId, setOpenId] = useState<string | null>(null);
  const open = gifts.find((g) => g.id === openId) || null;

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-300 mr-1">
          <Gift className="w-3.5 h-3.5" /> Gift Types
        </span>
        {gifts.map((g) => (
          <button
            key={g.id}
            type="button"
            onClick={() => { setOpenId(g.id); onSelect?.(g.id, g.title); }}
            className={`group flex items-center gap-1.5 text-xs px-3.5 py-1.5 rounded-full border transition-colors ${
              isSelected?.(g.id)
                ? 'border-indigo-500 bg-indigo-600/20 text-white'
                : 'border-slate-800 bg-slate-900 text-slate-300 hover:text-white hover:border-emerald-500/50'
            }`}
          >
            {g.title}
            <span className="ml-1 font-bold text-amber-400">₹{g.tiers[0].price}/pc+</span>
          </button>
        ))}
      </div>

      {open && <GiftViewer gift={open} onClose={() => setOpenId(null)} />}
    </>
  );
};

// Card grid of gift types for the vendor detail modal. When `onToggle` is
// supplied, each card also gets a select toggle so the customer can pick
// which gift types they want — those picks travel with the booking.
export const GiftGrid: React.FC<{
  gifts?: GiftType[];
  selected?: string[];
  onToggle?: (title: string) => void;
  onPickTier?: (label: string) => void;
}> = ({ gifts = STANDARD_GIFTS, selected, onToggle, onPickTier }) => {
  const [openId, setOpenId] = useState<string | null>(null);
  const open = gifts.find((g) => g.id === openId) || null;
  const giftSelected = (title: string) => !!selected?.some((o) => o === title || o.startsWith(`${title} — `));

  return (
    <div>
      <p className="text-sm text-slate-300 mb-4">
        Return gifts by type &amp; budget — <span className="text-emerald-300 font-semibold">{gifts.length} categories</span>, priced per piece.
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {gifts.map((g) => {
          const isSelected = giftSelected(g.title);
          return (
            <div
              key={g.id}
              className={`group relative h-44 rounded-2xl overflow-hidden border text-left ${isSelected ? 'border-emerald-500 ring-2 ring-emerald-500/40' : 'border-slate-800'}`}
            >
              <button
                type="button"
                onClick={() => setOpenId(g.id)}
                className="absolute inset-0 w-full h-full text-left focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                title={`View ${g.title}`}
              >
                <img
                  src={THUMB(g.images[0])}
                  alt={g.title}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent" />
                <div className="absolute bottom-3 left-3 right-3">
                  <h4 className="text-white font-display font-bold text-sm leading-tight">{g.title}</h4>
                  <span className="text-[11px] text-amber-400 font-semibold">from ₹{g.tiers[0].price}/pc</span>
                </div>
              </button>
              {onToggle && (
                <button
                  type="button"
                  onClick={() => onToggle(g.title)}
                  aria-label={isSelected ? `Remove ${g.title}` : `Add ${g.title}`}
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

      {open && <GiftViewer gift={open} onClose={() => setOpenId(null)} onPickTier={onPickTier} />}
    </div>
  );
};
