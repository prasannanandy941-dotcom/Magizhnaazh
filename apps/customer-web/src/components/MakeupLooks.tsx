import React, { useEffect, useRef, useState } from 'react';
import { X, ChevronLeft, ChevronRight, Palette, IndianRupee, CheckCircle2, Check, Plus } from 'lucide-react';

export interface MakeupTier {
  name: string;
  price: number;
  features: string[];
}

export interface MakeupLook {
  id: string;
  title: string;
  occasion: string;
  images: string[];
  tiers: MakeupTier[];
}

const IMG = (id: string) => `https://images.unsplash.com/${id}?w=1200&auto=format&q=75`;
const THUMB = (id: string) => `https://images.unsplash.com/${id}?w=600&h=400&fit=crop&auto=format&q=70`;

// Tier accent by position (Classic → HD/Signature → Airbrush/Bridal).
const TIER_TONE = [
  { badge: 'bg-slate-800 text-slate-200 border border-slate-700', ring: 'border-slate-700' },
  { badge: 'bg-rose-950/70 text-rose-300 border border-rose-500/40', ring: 'border-rose-500/40' },
  { badge: 'bg-violet-950/70 text-violet-300 border border-violet-500/40', ring: 'border-violet-500/40' },
];

// Makeup & Beauty looks by occasion, each with price tiers.
export const STANDARD_MAKEUP: MakeupLook[] = [
  {
    id: 'bridal',
    title: 'Bridal Makeup',
    occasion: 'Wedding day',
    images: ['photo-1600685890506-593fdf55949b', 'photo-1669257965114-225af79f3455', 'photo-1641382161166-4f3c320f0c6d'],
    tiers: [
      { name: 'Classic', price: 8000, features: ['Foundation & base', 'Eye makeup + kajal', 'Lips & blush', 'Bindi & basic setting'] },
      { name: 'HD', price: 15000, features: ['HD long-wear base', 'Dramatic eyes + lashes', 'Contour & highlight', 'Setting spray', 'Draping assist'] },
      { name: 'Airbrush', price: 25000, features: ['Airbrush flawless base', '12-hr waterproof wear', 'Premium lashes', 'Full contour & baking', 'Saree draping + hair', 'Touch-up kit'] },
    ],
  },
  {
    id: 'reception',
    title: 'Reception & Engagement',
    occasion: 'Evening glam',
    images: ['photo-1619002117199-47c7f0427d21', 'photo-1594647210801-5124307f3d51', 'photo-1622207691293-5cd80466dab3'],
    tiers: [
      { name: 'Classic', price: 6000, features: ['Base & eye makeup', 'Lips & blush', 'Setting'] },
      { name: 'HD', price: 12000, features: ['HD glam base', 'Smokey / shimmer eyes', 'Contour & highlight', 'Lashes'] },
      { name: 'Airbrush', price: 18000, features: ['Airbrush glam', 'Long-wear finish', 'Premium lashes', 'Hair styling included'] },
    ],
  },
  {
    id: 'party-guest',
    title: 'Party & Guest',
    occasion: 'Family / guests',
    images: ['photo-1622336889416-8d790ad807d7', 'photo-1636023730877-233b9237d4ec', 'photo-1602910344008-22f323cc1817'],
    tiers: [
      { name: 'Classic', price: 2500, features: ['Quick base', 'Eye & lip', 'Blush'] },
      { name: 'HD', price: 5000, features: ['HD base', 'Defined eyes + lashes', 'Contour'] },
      { name: 'Airbrush', price: 8000, features: ['Airbrush finish', 'Glam eyes', 'Long-wear'] },
    ],
  },
  {
    id: 'haldi-mehndi',
    title: 'Haldi & Mehndi',
    occasion: 'Pre-wedding',
    images: ['photo-1542042161784-26ab9e041e89', 'photo-1505932794465-147d1f1b2c97', 'photo-1587271598589-3f91d0872f66'],
    tiers: [
      { name: 'Classic', price: 3000, features: ['Dewy natural base', 'Soft eyes', 'Tinted lips'] },
      { name: 'HD', price: 6000, features: ['HD dewy base', 'Floral-tone eyes', 'Highlight', 'Hair braid'] },
      { name: 'Airbrush', price: 9000, features: ['Airbrush glow', 'Haldi-proof waterproof', 'Lashes', 'Floral hair styling'] },
    ],
  },
  {
    id: 'hair-draping',
    title: 'Hair & Saree Draping',
    occasion: 'Styling add-on',
    images: ['photo-1549236177-77e8271c34b6', 'photo-1581674210501-c760093514e8', 'photo-1722440044170-8df784901428'],
    tiers: [
      { name: 'Basic', price: 1500, features: ['Blow-dry / straightening', 'Simple bun or braid', 'Basic saree pleats'] },
      { name: 'Signature', price: 3000, features: ['Designer hairstyle', 'Hair accessories set', 'Designer saree draping'] },
      { name: 'Bridal', price: 6000, features: ['Bridal hairdo + extensions', 'Flower / jewellery setting', 'Bridal drape + pinning', 'Dupatta setting'] },
    ],
  },
  {
    id: 'ornaments',
    title: 'Ornaments & Jewellery',
    occasion: 'Bridal jewellery on rent',
    images: ['photo-1756483560049-e7b2208f99a0', 'photo-1600862754152-80a263dd564f', 'photo-1722410180687-b05b50922362'],
    tiers: [
      { name: 'Imitation', price: 1500, features: ['Necklace + earrings', 'Maang tikka', '1-day rental', 'Sanitised & insured'] },
      { name: 'Temple Set', price: 4000, features: ['Full temple set', 'Necklace + long haram', 'Jhumkas & vanki', 'Oddiyanam (waist belt)', 'Hair jada set'] },
      { name: 'Kundan / Polki', price: 8000, features: ['Premium kundan set', 'Choker + long haram', 'Matha patti & nath', 'Hand & hair jewellery', 'Styling assistant'] },
    ],
  },
  {
    id: 'pre-bridal',
    title: 'Pre-Bridal Skin & Hair',
    occasion: 'Prep sessions',
    images: ['photo-1731514771613-991a02407132', 'photo-1664549761426-6a1cb1032854', 'photo-1761718210089-ba3bb5ccb54f'],
    tiers: [
      { name: 'Single', price: 2000, features: ['Cleanup / facial', 'Threading', 'Basic manicure'] },
      { name: '3-Session', price: 5500, features: ['3 facials over a month', 'Body polishing', 'Mani + Pedi', 'Hair spa'] },
      { name: 'Bridal Package', price: 12000, features: ['Full pre-bridal facials', 'De-tan & polishing', 'Mani/Pedi + waxing', 'Hair spa + trim', 'Skin consultation'] },
    ],
  },
];

const priceRange = (l: MakeupLook) => {
  const lo = l.tiers[0]?.price ?? 0;
  const hi = l.tiers[l.tiers.length - 1]?.price ?? 0;
  return `₹${lo.toLocaleString('en-IN')}–₹${hi.toLocaleString('en-IN')}`;
};

// Full-screen viewer: swipeable look photos + price tiers.
export const MakeupLookViewer: React.FC<{ look: MakeupLook; onClose: () => void; onPickTier?: (label: string) => void }> = ({ look, onClose, onPickTier }) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [selectedTier, setSelectedTier] = useState<number | null>(null);
  const images = look.images.map(IMG);

  useEffect(() => setSelectedTier(null), [look.id]);

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
      aria-label={`${look.title} makeup`}
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
                <img src={src} alt={`${look.title} ${i + 1}`} className="w-full h-full object-cover" draggable={false} />
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
            <h3 className="text-white font-display font-bold text-2xl">{look.title}</h3>
            <p className="text-xs text-slate-400 mt-0.5">{look.occasion} · {priceRange(look)}</p>
          </div>

          <h4 className="text-sm font-bold text-white mb-3">Choose your finish</h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {look.tiers.map((tier, i) => {
              const tone = TIER_TONE[Math.min(i, 2)];
              const isSelected = selectedTier === i;
              return (
                <button
                  key={tier.name}
                  type="button"
                  onClick={() => {
                    setSelectedTier(i);
                    onPickTier?.(`${look.title} — ${tier.name} (₹${tier.price.toLocaleString('en-IN')})`);
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
                    {tier.price.toLocaleString('en-IN')}
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
              Added to your booking: {look.title} — {look.tiers[selectedTier].name} package (₹{look.tiers[selectedTier].price.toLocaleString('en-IN')}).
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

// Marketplace-level "Looks" chip row for Makeup & Beauty.
export const MakeupChips: React.FC<{
  looks?: MakeupLook[];
  onSelect?: (id: string, label: string) => void;
  isSelected?: (id: string) => boolean;
}> = ({ looks = STANDARD_MAKEUP, onSelect, isSelected }) => {
  const [openId, setOpenId] = useState<string | null>(null);
  const open = looks.find((l) => l.id === openId) || null;

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <span className="flex items-center gap-1.5 text-xs font-bold text-rose-300 mr-1">
          <Palette className="w-3.5 h-3.5" /> Looks
        </span>
        {looks.map((l) => (
          <button
            key={l.id}
            type="button"
            onClick={() => { setOpenId(l.id); onSelect?.(l.id, l.title); }}
            className={`group flex items-center gap-1.5 text-xs px-3.5 py-1.5 rounded-full border transition-colors ${
              isSelected?.(l.id)
                ? 'border-indigo-500 bg-indigo-600/20 text-white'
                : 'border-slate-800 bg-slate-900 text-slate-300 hover:text-white hover:border-rose-500/50'
            }`}
          >
            {l.title}
            <span className="ml-1 font-bold text-amber-400">₹{l.tiers[0].price.toLocaleString('en-IN')}+</span>
          </button>
        ))}
      </div>

      {open && <MakeupLookViewer look={open} onClose={() => setOpenId(null)} />}
    </>
  );
};

// Card grid of looks for the vendor detail modal. When `onToggle` is
// supplied, each card also gets a select toggle so the customer can pick
// which looks they want — those picks travel with the booking.
export const MakeupGrid: React.FC<{
  looks?: MakeupLook[];
  selected?: string[];
  onToggle?: (title: string) => void;
  onPickTier?: (label: string) => void;
}> = ({ looks = STANDARD_MAKEUP, selected, onToggle, onPickTier }) => {
  const [openId, setOpenId] = useState<string | null>(null);
  const open = looks.find((l) => l.id === openId) || null;
  const lookSelected = (title: string) => !!selected?.some((o) => o === title || o.startsWith(`${title} — `));

  return (
    <div>
      <p className="text-sm text-slate-300 mb-4">
        Makeup by occasion &amp; finish — <span className="text-rose-300 font-semibold">{looks.length} looks</span>, each with Classic / HD / Airbrush pricing.
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {looks.map((l) => {
          const isSelected = lookSelected(l.title);
          return (
            <div
              key={l.id}
              className={`group relative h-44 rounded-2xl overflow-hidden border text-left ${isSelected ? 'border-emerald-500 ring-2 ring-emerald-500/40' : 'border-slate-800'}`}
            >
              <button
                type="button"
                onClick={() => setOpenId(l.id)}
                className="absolute inset-0 w-full h-full text-left focus:outline-none focus:ring-2 focus:ring-rose-500 cursor-pointer"
                title={`View ${l.title}`}
              >
                <img
                  src={THUMB(l.images[0])}
                  alt={l.title}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent" />
                <div className="absolute bottom-3 left-3 right-3">
                  <h4 className="text-white font-display font-bold text-sm leading-tight">{l.title}</h4>
                  <span className="text-[11px] text-amber-400 font-semibold">from ₹{l.tiers[0].price.toLocaleString('en-IN')}</span>
                </div>
              </button>
              {onToggle && (
                <button
                  type="button"
                  onClick={() => onToggle(l.title)}
                  aria-label={isSelected ? `Remove ${l.title}` : `Add ${l.title}`}
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

      {open && <MakeupLookViewer look={open} onClose={() => setOpenId(null)} onPickTier={onPickTier} />}
    </div>
  );
};
