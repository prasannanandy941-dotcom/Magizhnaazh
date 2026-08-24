import React, { useEffect, useRef, useState } from 'react';
import { X, ChevronLeft, ChevronRight, Bus, IndianRupee, CheckCircle2, Check, Plus } from 'lucide-react';

export interface TransportTier {
  name: string;
  price: number;
  features: string[];
}

export interface TransportOption {
  id: string;
  title: string;
  note: string;
  images: string[];
  tiers: TransportTier[];
}

const IMG = (id: string) => `https://images.unsplash.com/${id}?w=1200&auto=format&q=75`;
const THUMB = (id: string) => `https://images.unsplash.com/${id}?w=600&h=400&fit=crop&auto=format&q=70`;

const TIER_TONE = [
  { badge: 'bg-slate-800 text-slate-200 border border-slate-700', ring: 'border-slate-700' },
  { badge: 'bg-sky-950/70 text-sky-300 border border-sky-500/40', ring: 'border-sky-500/40' },
  { badge: 'bg-amber-950/70 text-amber-300 border border-amber-500/40', ring: 'border-amber-500/40' },
];

// Transport / fleet options with vehicle-class price tiers.
export const STANDARD_TRANSPORT: TransportOption[] = [
  {
    id: 'airport',
    title: 'Airport Pickup',
    note: 'Per pickup · meet & greet',
    images: ['photo-1561380263-46623ae537fb', 'photo-1555396273-b2d1cd0e3828', 'photo-1673433106870-0c8994e28d33'],
    tiers: [
      { name: 'Sedan (4)', price: 1800, features: ['AC sedan (Dzire/Etios)', 'Meet & greet at arrival', 'One-way drop', 'Flight tracking'] },
      { name: 'SUV (6)', price: 2800, features: ['AC SUV (Innova)', 'Extra luggage space', 'Meet & greet', 'Water bottles'] },
      { name: 'Luxury (4)', price: 5000, features: ['Luxury sedan (Camry/Merc)', 'Uniformed chauffeur', 'Welcome kit & water', 'Name placard'] },
    ],
  },
  {
    id: 'railway',
    title: 'Railway Station Pickup',
    note: 'Per pickup · one way',
    images: ['photo-1637995735729-c43250f1ef47', 'photo-1639494095806-1680b909cb33', 'photo-1630284405364-96ebd3e8ca60'],
    tiers: [
      { name: 'Sedan (4)', price: 900, features: ['AC sedan', 'Platform coordination', 'One-way drop', 'Luggage help'] },
      { name: 'SUV (6)', price: 1500, features: ['AC SUV (Innova)', 'Extra luggage', 'Coordinator call', 'Water bottles'] },
      { name: 'Tempo (12)', price: 2500, features: ['12-seat tempo traveller', 'Group luggage', 'Driver + helper', 'Multiple families'] },
    ],
  },
  {
    id: 'bride-groom-vehicle',
    title: 'Bride & Groom Vehicle',
    note: 'Decorated wedding car',
    images: ['photo-1592514313074-794923c98162', 'photo-1571113908007-5d6aae13d73e', 'photo-1682376932352-c12b203568b3'],
    tiers: [
      { name: 'Decorated Sedan', price: 6000, features: ['Fresh-flower decoration', 'Ribbons & name board', 'Uniformed chauffeur', 'Half-day use'] },
      { name: 'Luxury (Audi/BMW)', price: 15000, features: ['Premium luxury car', 'Designer floral decor', 'Red-carpet arrival', 'Full-day chauffeur'] },
      { name: 'Vintage / Convertible', price: 25000, features: ['Classic vintage car', 'Full theme decoration', 'Chauffeur in costume', 'Photo-shoot friendly'] },
    ],
  },
  {
    id: 'guest-vehicle',
    title: 'Guest Vehicle',
    note: 'Buses & vans for guests',
    images: ['photo-1570118054363-ff4d296962f5', 'photo-1509749837427-ac94a2553d0e', 'photo-1534011056808-50c1c6082fe7'],
    tiers: [
      { name: 'Tempo Traveller (12)', price: 4000, features: ['12-seat AC traveller', 'Driver included', 'Day rental', 'Push-back seats'] },
      { name: 'Mini Bus (25)', price: 7000, features: ['25-seat AC mini coach', 'Driver + fuel', 'Multiple trips', 'Luggage carrier'] },
      { name: 'Coach (45)', price: 12000, features: ['45-seat AC coach', 'Driver + cleaner', 'Full-day shuttle', 'Mic & music system'] },
    ],
  },
  {
    id: 'bus-stop',
    title: 'Bus Stop Pickup',
    note: 'Local pickup & shuttle',
    images: ['photo-1684789007864-aa316b522a3b', 'photo-1760783543604-2bbb47b47bba', 'photo-1770511445813-02fad29c1b43'],
    tiers: [
      { name: 'Car (4)', price: 700, features: ['AC car pickup', 'Point-to-point', 'On-call timing', 'Luggage help'] },
      { name: 'Van (10)', price: 1500, features: ['10-seat van', 'Group pickup', 'Driver included', 'Multiple stops'] },
      { name: 'Mini Bus (25)', price: 3500, features: ['25-seat shuttle', 'Repeat trips', 'Driver + helper', 'Venue coordination'] },
    ],
  },
];

const priceRange = (o: TransportOption) => {
  const lo = o.tiers[0]?.price ?? 0;
  const hi = o.tiers[o.tiers.length - 1]?.price ?? 0;
  return `₹${lo.toLocaleString('en-IN')}–₹${hi.toLocaleString('en-IN')}`;
};

// Full-screen viewer: swipeable vehicle photos + price tiers.
export const TransportViewer: React.FC<{ option: TransportOption; onClose: () => void; onPickTier?: (label: string) => void }> = ({ option, onClose, onPickTier }) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [selectedTier, setSelectedTier] = useState<number | null>(null);
  const images = option.images.map(IMG);

  useEffect(() => setSelectedTier(null), [option.id]);

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
      aria-label={`${option.title} transport`}
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
                <img src={src} alt={`${option.title} ${i + 1}`} className="w-full h-full object-cover" draggable={false} />
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
            <h3 className="text-white font-display font-bold text-2xl">{option.title}</h3>
            <p className="text-xs text-slate-400 mt-0.5">{option.note} · {priceRange(option)}</p>
          </div>

          <h4 className="text-sm font-bold text-white mb-3">Choose vehicle</h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {option.tiers.map((tier, i) => {
              const tone = TIER_TONE[Math.min(i, 2)];
              const isSelected = selectedTier === i;
              return (
                <button
                  key={tier.name}
                  type="button"
                  onClick={() => {
                    setSelectedTier(i);
                    onPickTier?.(`${option.title} — ${tier.name} (₹${tier.price.toLocaleString('en-IN')})`);
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
              Added to your booking: {option.title} — {option.tiers[selectedTier].name} (₹{option.tiers[selectedTier].price.toLocaleString('en-IN')}).
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

// Marketplace-level "Fleet" chip row for Transport.
export const TransportChips: React.FC<{
  options?: TransportOption[];
  onSelect?: (id: string, label: string) => void;
  isSelected?: (id: string) => boolean;
}> = ({ options = STANDARD_TRANSPORT, onSelect, isSelected }) => {
  const [openId, setOpenId] = useState<string | null>(null);
  const open = options.find((o) => o.id === openId) || null;

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <span className="flex items-center gap-1.5 text-xs font-bold text-sky-300 mr-1">
          <Bus className="w-3.5 h-3.5" /> Fleet
        </span>
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => { setOpenId(o.id); onSelect?.(o.id, o.title); }}
            className={`group flex items-center gap-1.5 text-xs px-3.5 py-1.5 rounded-full border transition-colors ${
              isSelected?.(o.id)
                ? 'border-indigo-500 bg-indigo-600/20 text-white'
                : 'border-slate-800 bg-slate-900 text-slate-300 hover:text-white hover:border-sky-500/50'
            }`}
          >
            {o.title}
            <span className="ml-1 font-bold text-amber-400">₹{o.tiers[0].price.toLocaleString('en-IN')}+</span>
          </button>
        ))}
      </div>

      {open && <TransportViewer option={open} onClose={() => setOpenId(null)} />}
    </>
  );
};

// Card grid of transport options for the vendor detail modal. When
// `onToggle` is supplied, each card also gets a select toggle so the
// customer can pick which services they want — those picks travel with the
// booking.
export const TransportGrid: React.FC<{
  options?: TransportOption[];
  selected?: string[];
  onToggle?: (title: string) => void;
  onPickTier?: (label: string) => void;
}> = ({ options = STANDARD_TRANSPORT, selected, onToggle, onPickTier }) => {
  const [openId, setOpenId] = useState<string | null>(null);
  const open = options.find((o) => o.id === openId) || null;
  const optionSelected = (title: string) => !!selected?.some((o) => o === title || o.startsWith(`${title} — `));

  return (
    <div>
      <p className="text-sm text-slate-300 mb-4">
        Transport options — <span className="text-sky-300 font-semibold">{options.length} services</span>, each with vehicle-class pricing.
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {options.map((o) => {
          const isSelected = optionSelected(o.title);
          return (
            <div
              key={o.id}
              className={`group relative h-44 rounded-2xl overflow-hidden border text-left ${isSelected ? 'border-emerald-500 ring-2 ring-emerald-500/40' : 'border-slate-800'}`}
            >
              <button
                type="button"
                onClick={() => setOpenId(o.id)}
                className="absolute inset-0 w-full h-full text-left focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer"
                title={`View ${o.title}`}
              >
                <img
                  src={THUMB(o.images[0])}
                  alt={o.title}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent" />
                <div className="absolute bottom-3 left-3 right-3">
                  <h4 className="text-white font-display font-bold text-sm leading-tight">{o.title}</h4>
                  <span className="text-[11px] text-amber-400 font-semibold">from ₹{o.tiers[0].price.toLocaleString('en-IN')}</span>
                </div>
              </button>
              {onToggle && (
                <button
                  type="button"
                  onClick={() => onToggle(o.title)}
                  aria-label={isSelected ? `Remove ${o.title}` : `Add ${o.title}`}
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

      {open && <TransportViewer option={open} onClose={() => setOpenId(null)} onPickTier={onPickTier} />}
    </div>
  );
};
