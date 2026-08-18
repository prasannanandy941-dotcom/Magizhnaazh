import React, { useEffect, useRef, useState } from 'react';
import { X, ChevronLeft, ChevronRight, Flame, IndianRupee, CheckCircle2, Check, Plus } from 'lucide-react';

export interface PriestTier {
  name: string;
  price: number;
  features: string[];
}

export interface PriestCeremony {
  id: string;
  title: string;
  note: string;
  images: string[];
  tiers: PriestTier[];
}

const IMG = (id: string) => `https://images.unsplash.com/${id}?w=1200&auto=format&q=75`;
const THUMB = (id: string) => `https://images.unsplash.com/${id}?w=600&h=400&fit=crop&auto=format&q=70`;

const TIER_TONE = [
  { badge: 'bg-slate-800 text-slate-200 border border-slate-700', ring: 'border-slate-700' },
  { badge: 'bg-amber-950/70 text-amber-300 border border-amber-500/40', ring: 'border-amber-500/40' },
  { badge: 'bg-orange-950/70 text-orange-300 border border-orange-500/40', ring: 'border-orange-500/40' },
];

// Standard tier structure: Priest Only / Priest + Samagri / Full Purohit Package.
const TIERS = (a: number, b: number, c: number): PriestTier[] => [
  { name: 'Priest Only', price: a, features: ['Experienced purohit', 'Mantras & full procedure', 'You arrange samagri', 'Muhurtham guidance'] },
  { name: 'Priest + Samagri', price: b, features: ['Purohit + all samagri', 'Puja items, flowers, prasadam', 'Kalash & setup', 'Step-by-step guidance'] },
  { name: 'Full Purohit Package', price: c, features: ['Senior purohit + assistant', 'Complete samagri kit', 'Kalash, homam & decoration', 'Sankalpam in your gotra', 'Prasadam & coordination'] },
];

export const PRIEST_TRADITIONS = 'Tamil (Iyer / Iyengar) · Telugu · Kannada · Hindi';

// Ceremonies a pujari / purohit conducts, with inclusion-based price tiers.
export const STANDARD_PRIEST: PriestCeremony[] = [
  {
    id: 'wedding',
    title: 'Wedding (Vivaham)',
    note: 'Muhurtham, kanyadaanam, saptapadi & homam',
    images: ['photo-1774024051976-7b5a15542a05', 'photo-1759210420960-c5db3160b9d5', 'photo-1636559527737-ea8576ae6571'],
    tiers: TIERS(8000, 15000, 30000),
  },
  {
    id: 'engagement',
    title: 'Engagement (Nichayam)',
    note: 'Nichayathartham & ring ceremony puja',
    images: ['photo-1680490964889-67a5ab8d8b54', 'photo-1702505433756-88130191bb4b', 'photo-1669465006376-7b5f1b777921'],
    tiers: TIERS(2500, 5000, 9000),
  },
  {
    id: 'griha-pravesh',
    title: 'Griha Pravesh',
    note: 'Housewarming — kalash, Ganapathi & Vaastu puja',
    images: ['photo-1676043967328-ab4a45fc2730', 'photo-1605764803170-c20b43be4d00', 'photo-1725410600441-975b2522b0b8'],
    tiers: TIERS(3000, 6000, 11000),
  },
  {
    id: 'naming',
    title: 'Naming & Cradle',
    note: 'Namakaranam & cradle ceremony',
    images: ['photo-1672814863510-4f79eaacda95', 'photo-1669465006376-7b5f1b777921', 'photo-1702505433756-88130191bb4b'],
    tiers: TIERS(2500, 5000, 9000),
  },
  {
    id: 'seemantham',
    title: 'Seemantham (Baby Shower)',
    note: 'Valaikappu / godh bharai blessings',
    images: ['photo-1725410600441-975b2522b0b8', 'photo-1605764803170-c20b43be4d00', 'photo-1680490964889-67a5ab8d8b54'],
    tiers: TIERS(3000, 6000, 10000),
  },
  {
    id: 'satyanarayan',
    title: 'Satyanarayan & Homam',
    note: 'Ganapathi / Satyanarayan puja & homam',
    images: ['photo-1630764883473-e8c2056f0589', 'photo-1662852744966-143f1dde2634', 'photo-1646137148895-425961f5bcd9'],
    tiers: TIERS(2000, 4500, 8000),
  },
  {
    id: 'upanayanam',
    title: 'Upanayanam',
    note: 'Sacred-thread (poonal) ceremony & homam',
    images: ['photo-1623225692725-e73a4a00b311', 'photo-1654156577076-e0350ba86cc1', 'photo-1607893117264-586f93fe4468'],
    tiers: TIERS(6000, 12000, 20000),
  },
];

const priceRange = (c: PriestCeremony) => {
  const lo = c.tiers[0]?.price ?? 0;
  const hi = c.tiers[c.tiers.length - 1]?.price ?? 0;
  return `₹${lo.toLocaleString('en-IN')}–₹${hi.toLocaleString('en-IN')}`;
};

// Full-screen viewer: swipeable ceremony photos + price tiers.
export const PriestViewer: React.FC<{ ceremony: PriestCeremony; onClose: () => void }> = ({ ceremony, onClose }) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [selectedTier, setSelectedTier] = useState<number | null>(null);
  const images = ceremony.images.map(IMG);

  useEffect(() => setSelectedTier(null), [ceremony.id]);

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
      aria-label={`${ceremony.title} ceremony`}
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
                <img src={src} alt={`${ceremony.title} ${i + 1}`} className="w-full h-full object-cover" draggable={false} />
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
            <h3 className="text-white font-display font-bold text-2xl">{ceremony.title}</h3>
            <p className="text-xs text-slate-400 mt-0.5">{ceremony.note} · {priceRange(ceremony)}</p>
            <p className="text-[11px] text-amber-400/80 mt-1">Traditions: {PRIEST_TRADITIONS}</p>
          </div>

          <h4 className="text-sm font-bold text-white mb-3">Choose service level</h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {ceremony.tiers.map((tier, i) => {
              const tone = TIER_TONE[Math.min(i, 2)];
              const isSelected = selectedTier === i;
              return (
                <button
                  key={tier.name}
                  type="button"
                  onClick={() => setSelectedTier(i)}
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
              You picked the {ceremony.tiers[selectedTier].name} package — ₹{ceremony.tiers[selectedTier].price.toLocaleString('en-IN')}. Mention this when you book a vendor for {ceremony.title}.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

// Marketplace-level "Ceremonies" chip row for Pujari / Priest.
export const PriestChips: React.FC<{
  ceremonies?: PriestCeremony[];
  onSelect?: (id: string, label: string) => void;
  isSelected?: (id: string) => boolean;
}> = ({ ceremonies = STANDARD_PRIEST, onSelect, isSelected }) => {
  const [openId, setOpenId] = useState<string | null>(null);
  const open = ceremonies.find((c) => c.id === openId) || null;

  return (
    <>
      <div className="mb-2 flex items-center gap-1.5 text-xs font-bold text-amber-300">
        <Flame className="w-3.5 h-3.5" /> Ceremonies
        <span className="ml-2 text-[11px] font-normal text-slate-400">{PRIEST_TRADITIONS}</span>
      </div>
      <div className="flex flex-wrap items-center gap-2 mb-6">
        {ceremonies.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => { setOpenId(c.id); onSelect?.(c.id, c.title); }}
            className={`group flex items-center gap-1.5 text-xs px-3.5 py-1.5 rounded-full border transition-colors ${
              isSelected?.(c.id)
                ? 'border-indigo-500 bg-indigo-600/20 text-white'
                : 'border-slate-800 bg-slate-900 text-slate-300 hover:text-white hover:border-amber-500/50'
            }`}
          >
            {c.title}
            <span className="ml-1 font-bold text-amber-400">₹{c.tiers[0].price.toLocaleString('en-IN')}+</span>
          </button>
        ))}
      </div>

      {open && <PriestViewer ceremony={open} onClose={() => setOpenId(null)} />}
    </>
  );
};

// Card grid of ceremonies for the vendor detail modal. When `onToggle` is
// supplied, each card also gets a select toggle so the customer can pick
// which ceremonies they want — those picks travel with the booking.
export const PriestGrid: React.FC<{
  ceremonies?: PriestCeremony[];
  selected?: string[];
  onToggle?: (title: string) => void;
}> = ({ ceremonies = STANDARD_PRIEST, selected, onToggle }) => {
  const [openId, setOpenId] = useState<string | null>(null);
  const open = ceremonies.find((c) => c.id === openId) || null;

  return (
    <div>
      <p className="text-sm text-slate-300 mb-1">
        Ceremonies conducted — <span className="text-amber-300 font-semibold">{ceremonies.length} functions</span>, each with service-level pricing.
      </p>
      <p className="text-[11px] text-slate-500 mb-4">Traditions: {PRIEST_TRADITIONS}</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {ceremonies.map((c) => {
          const isSelected = !!selected?.includes(c.title);
          return (
            <div
              key={c.id}
              className={`group relative h-44 rounded-2xl overflow-hidden border text-left ${isSelected ? 'border-emerald-500 ring-2 ring-emerald-500/40' : 'border-slate-800'}`}
            >
              <button
                type="button"
                onClick={() => setOpenId(c.id)}
                className="absolute inset-0 w-full h-full text-left focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
                title={`View ${c.title}`}
              >
                <img
                  src={THUMB(c.images[0])}
                  alt={c.title}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent" />
                <div className="absolute bottom-3 left-3 right-3">
                  <h4 className="text-white font-display font-bold text-sm leading-tight">{c.title}</h4>
                  <span className="text-[11px] text-amber-400 font-semibold">from ₹{c.tiers[0].price.toLocaleString('en-IN')}</span>
                </div>
              </button>
              {onToggle && (
                <button
                  type="button"
                  onClick={() => onToggle(c.title)}
                  aria-label={isSelected ? `Remove ${c.title}` : `Add ${c.title}`}
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

      {open && <PriestViewer ceremony={open} onClose={() => setOpenId(null)} />}
    </div>
  );
};
