import React, { useEffect, useRef, useState } from 'react';
import { X, ChevronLeft, ChevronRight, Camera, Check, Plus } from 'lucide-react';

export interface PortfolioStyle {
  id: string;
  title: string;
  priceFrom?: number; // ₹ starting price for this shoot style
  images: string[];
}

const IMG = (id: string) => `https://images.unsplash.com/${id}?w=1200&auto=format&q=75`;
const THUMB = (id: string) => `https://images.unsplash.com/${id}?w=600&h=400&fit=crop&auto=format&q=70`;

// Standard photography portfolio shown on the Photography tab.
export const STANDARD_PORTFOLIO: PortfolioStyle[] = [
  {
    id: 'candid',
    title: 'Candid',
    priceFrom: 25000,
    images: ['photo-1574397188309-e83dfe918ecb', 'photo-1670296047577-36c2c1281a85', 'photo-1640290699030-b477f95f13b2'],
  },
  {
    id: 'traditional',
    title: 'Traditional',
    priceFrom: 20000,
    images: ['photo-1587271636175-90d58cdad458', 'photo-1597157639073-69284dc0fdaf', 'photo-1633104502699-b2ecf0fee294'],
  },
  {
    id: 'pre-wedding',
    title: 'Pre-Wedding',
    priceFrom: 15000,
    images: ['photo-1715285977619-6d9357168f46', 'photo-1686294588684-9607a670181c', 'photo-1696315289610-347fd85dd91a'],
  },
  {
    id: 'post-wedding',
    title: 'Post-Wedding',
    priceFrom: 18000,
    images: ['photo-1563808599481-34a342e44508', 'photo-1630526720753-aa4e71acf67d', 'photo-1621621667797-e06afc217fb0'],
  },
  {
    id: 'reception',
    title: 'Reception',
    priceFrom: 18000,
    images: ['photo-1723373457175-31b09fa7d405', 'photo-1613256253373-352901921b9c', 'photo-1722805740128-b01efd09b4b7'],
  },
  {
    id: 'cinematic',
    title: 'Cinematic',
    priceFrom: 35000,
    images: [
      'photo-1615966650071-855b15f29ad1',
      'photo-1542460533-50ac46fb13d7',
      'photo-1591969852023-190295e484bd',
      'photo-1568815641398-b3f655da2f8a',
    ],
  },
  {
    id: 'drone',
    title: 'Drone',
    priceFrom: 30000,
    images: ['photo-1667317067965-7b55b73bb522', 'photo-1604043155802-e929b1c20738', 'photo-1553387789-2b36a3f5de14'],
  },
  {
    id: 'live-streaming',
    title: 'Live Streaming',
    priceFrom: 22000,
    images: ['photo-1594394489098-74ac04c0fc2e', 'photo-1625690303837-654c9666d2d0', 'photo-1497015289639-54688650d173'],
  },
  {
    id: 'led-screens',
    title: 'LED Screens',
    priceFrom: 40000,
    images: ['photo-1596040078821-9b5f50e71ea5', 'photo-1604355714851-c1d5990e1696', 'photo-1631903234610-c25aed8d104c'],
  },
];

// Full-screen, swipeable photo gallery for a single style.
export const PortfolioGalleryViewer: React.FC<{
  style: PortfolioStyle;
  onClose: () => void;
}> = ({ style, onClose }) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const images = style.images.map(IMG);

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
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className="fixed inset-0 z-[70] overflow-y-auto bg-slate-950/90 backdrop-blur-sm p-4 sm:p-8 flex justify-center items-start md:items-center"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`${style.title} portfolio`}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close gallery"
        className="fixed top-4 right-4 z-[80] w-10 h-10 rounded-full bg-slate-900/90 border border-slate-700 flex items-center justify-center text-slate-200 hover:text-white hover:bg-slate-800 transition-colors shadow-lg"
      >
        <X className="w-5 h-5" />
      </button>

      <div className="relative w-full max-w-4xl" onClick={(e) => e.stopPropagation()}>

        <div
          ref={trackRef}
          onScroll={onScroll}
          className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar rounded-2xl border border-slate-800 shadow-2xl bg-slate-900"
        >
          {images.map((src, i) => (
            <div key={i} className="snap-center shrink-0 w-full flex items-center justify-center">
              <img
                src={src}
                alt={`${style.title} ${i + 1}`}
                className="w-full max-h-[80vh] object-contain select-none"
                draggable={false}
              />
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
              className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-slate-950/70 border border-slate-700 backdrop-blur-sm flex items-center justify-center text-white hover:bg-slate-900 transition-colors disabled:opacity-30"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => slide(1)}
              aria-label="Next photo"
              disabled={index === images.length - 1}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-slate-950/70 border border-slate-700 backdrop-blur-sm flex items-center justify-center text-white hover:bg-slate-900 transition-colors disabled:opacity-30"
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
                  className={`h-1.5 rounded-full transition-all ${
                    i === index ? 'w-5 bg-white' : 'w-1.5 bg-white/50 hover:bg-white/80'
                  }`}
                />
              ))}
            </div>
          </>
        )}

        <div className="pointer-events-none absolute top-3 left-3 z-10 flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-full bg-slate-950/70 backdrop-blur-sm text-white text-xs font-semibold">
            {style.title}
          </span>
          <span className="px-2.5 py-1 rounded-full bg-slate-950/70 backdrop-blur-sm text-white text-xs font-semibold">
            {index + 1} / {images.length}
          </span>
        </div>
      </div>
    </div>
  );
};

// Marketplace-level "Portfolio" chip row (mirrors Venue facilities / Catering menu).
export const PortfolioChips: React.FC<{
  styles?: PortfolioStyle[];
  onSelect?: (id: string, label: string) => void;
  isSelected?: (id: string) => boolean;
}> = ({ styles = STANDARD_PORTFOLIO, onSelect, isSelected }) => {
  const [openId, setOpenId] = useState<string | null>(null);
  const openStyle = styles.find((s) => s.id === openId) || null;

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <span className="flex items-center gap-1.5 text-xs font-bold text-indigo-300 mr-1">
          <Camera className="w-3.5 h-3.5" /> Portfolio
        </span>
        {styles.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => { setOpenId(s.id); onSelect?.(s.id, s.title); }}
            className={`group flex items-center gap-1.5 text-xs px-3.5 py-1.5 rounded-full border transition-colors ${
              isSelected?.(s.id)
                ? 'border-indigo-500 bg-indigo-600/20 text-white'
                : 'border-slate-800 bg-slate-900 text-slate-300 hover:text-white hover:border-indigo-500/50'
            }`}
          >
            {s.title}
            {s.priceFrom != null && (
              <span className="ml-1 font-bold text-amber-400">₹{s.priceFrom.toLocaleString('en-IN')}+</span>
            )}
          </button>
        ))}
      </div>

      {openStyle && <PortfolioGalleryViewer style={openStyle} onClose={() => setOpenId(null)} />}
    </>
  );
};

// Card grid of portfolio styles for the vendor detail modal. When `onToggle`
// is supplied, each card also gets a select toggle so the customer can pick
// which shoot styles they want — those picks travel with the booking.
export const PortfolioGrid: React.FC<{
  styles?: PortfolioStyle[];
  selected?: string[];
  onToggle?: (title: string) => void;
}> = ({ styles = STANDARD_PORTFOLIO, selected, onToggle }) => {
  const [openId, setOpenId] = useState<string | null>(null);
  const openStyle = styles.find((s) => s.id === openId) || null;

  return (
    <div>
      <p className="text-sm text-slate-300 mb-4">
        Explore sample shoots by style — <span className="text-indigo-300 font-semibold">{styles.length} albums</span>. Tap to view photos{onToggle ? ', or select the ones you want.' : '.'}
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {styles.map((s) => {
          const isSelected = !!selected?.includes(s.title);
          return (
            <div
              key={s.id}
              className={`group relative h-44 rounded-2xl overflow-hidden border text-left ${isSelected ? 'border-emerald-500 ring-2 ring-emerald-500/40' : 'border-slate-800'}`}
            >
              <button
                type="button"
                onClick={() => setOpenId(s.id)}
                className="absolute inset-0 w-full h-full text-left focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                title={`View ${s.title}`}
              >
                <img
                  src={THUMB(s.images[0])}
                  alt={s.title}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent" />
                <span className="absolute top-3 right-3 flex items-center gap-1 px-2 h-6 rounded-full bg-slate-950/70 backdrop-blur-sm text-white text-[10px] font-semibold">
                  <Camera className="w-3 h-3" /> {s.images.length}
                </span>
                <div className="absolute bottom-3 left-3 right-3">
                  <h4 className="text-white font-display font-bold text-base leading-tight">{s.title}</h4>
                  {s.priceFrom != null && (
                    <span className="text-[11px] text-amber-400 font-semibold">from ₹{s.priceFrom.toLocaleString('en-IN')}</span>
                  )}
                </div>
              </button>
              {onToggle && (
                <button
                  type="button"
                  onClick={() => onToggle(s.title)}
                  aria-label={isSelected ? `Remove ${s.title}` : `Add ${s.title}`}
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

      {openStyle && <PortfolioGalleryViewer style={openStyle} onClose={() => setOpenId(null)} />}
    </div>
  );
};
