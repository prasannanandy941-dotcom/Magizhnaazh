import React, { useEffect, useRef, useState } from 'react';
import { X, ChevronLeft, ChevronRight, Music, IndianRupee, CheckCircle2 } from 'lucide-react';

export interface MusicTier {
  name: string;
  price: number;
  features: string[];
}

export interface MusicOption {
  id: string;
  title: string;
  occasion: string;
  images: string[];
  tiers: MusicTier[];
}

const TIER_TONE = [
  { badge: 'bg-slate-800 text-slate-200 border border-slate-700', ring: 'border-slate-700' },
  { badge: 'bg-violet-950/70 text-violet-300 border border-violet-500/40', ring: 'border-violet-500/40' },
  { badge: 'bg-indigo-950/70 text-indigo-300 border border-indigo-500/40', ring: 'border-indigo-500/40' },
];

const IMG = (id: string) => `https://images.unsplash.com/${id}?w=1200&auto=format&q=75`;

export const STANDARD_MUSIC: MusicOption[] = [
  {
    id: 'dj-package',
    title: 'DJ Package',
    occasion: 'Reception / Sangeet',
    images: ['photo-1470225620780-dba8ba36b745', 'photo-1541126274323-dbac58d14741', 'photo-1571266028243-d220c6a7edbf'].map(IMG),
    tiers: [
      { name: 'Basic', price: 8000, features: ['DJ for 3 hours', 'Standard sound system', 'Basic lighting'] },
      { name: 'Standard', price: 15000, features: ['DJ for 5 hours', 'Premium sound system', 'Dance floor lighting', 'MC announcements'] },
      { name: 'Premium', price: 25000, features: ['DJ for full event', 'Concert-grade sound', 'Laser + LED lighting', 'Live remix requests', 'Fog machine'] },
    ],
  },
  {
    id: 'live-band',
    title: 'Live Band',
    occasion: 'Wedding / Reception',
    images: ['photo-1565035010268-a3816f98589a', 'photo-1600779547877-be592ef5aad3', 'photo-1501612780327-45045538702b'].map(IMG),
    tiers: [
      { name: 'Basic', price: 20000, features: ['3-piece live band', '2-hour performance', 'Acoustic set'] },
      { name: 'Standard', price: 35000, features: ['5-piece live band', '3-hour performance', 'Bollywood + classical mix'] },
      { name: 'Premium', price: 55000, features: ['Full 8-piece band', '4-hour performance', 'Custom song requests', 'Backup vocalists'] },
    ],
  },
  {
    id: 'anchor-mc',
    title: 'Anchor / MC',
    occasion: 'Full event hosting',
    images: ['photo-1629327896333-7ecec1515ae5', 'photo-1631220706319-657942774d02', 'photo-1543062591-e3c0fdb97350'].map(IMG),
    tiers: [
      { name: 'Basic', price: 5000, features: ['MC for 3 hours', 'Bilingual hosting', 'Basic script'] },
      { name: 'Standard', price: 10000, features: ['MC for full event', 'Custom scripted intros', 'Crowd engagement games'] },
      { name: 'Premium', price: 18000, features: ['Celebrity-style MC', 'Full event coordination', 'Games + prizes management'] },
    ],
  },
  {
    id: 'sound-lighting',
    title: 'Sound & Lighting Setup',
    occasion: 'Venue-wide',
    images: ['photo-1670028514318-0ac718c0590d', 'photo-1525018923-1ebe8261a6a6', 'photo-1573339887617-d674bc961c31'].map(IMG),
    tiers: [
      { name: 'Basic', price: 10000, features: ['2 speakers + mixer', 'Basic stage lighting'] },
      { name: 'Standard', price: 20000, features: ['Full PA system', 'Ambient + stage lighting', 'Wireless mics x2'] },
      { name: 'Premium', price: 35000, features: ['Concert-grade PA', 'Full venue LED lighting', 'Wireless mics x4', 'Technician on-site'] },
    ],
  },
  {
    id: 'nadaswaram',
    title: 'Nadaswaram & Thavil',
    occasion: 'Muhurtham / traditional',
    images: ['photo-1579018372296-afd56f194ebc', 'photo-1716803715970-3279b12bf43f', 'photo-1597241250946-79df35c45f48'].map(IMG),
    tiers: [
      { name: 'Basic', price: 6000, features: ['Nadaswaram + thavil duo', '2-hour muhurtham', 'Traditional mangala isai'] },
      { name: 'Standard', price: 12000, features: ['4-member ensemble', 'Half-day coverage', 'Reception welcome (swagatham)'] },
      { name: 'Premium', price: 20000, features: ['6-member troupe', 'Full-day temple-style', 'Sruti box + coordination', 'Guest welcome procession'] },
    ],
  },
  {
    id: 'dhol-baaja',
    title: 'Dhol & Band Baaja',
    occasion: 'Baraat / entry',
    images: ['photo-1555447405-057915b40299', 'photo-1753597944492-d598253f84f9', 'photo-1762708547916-ac8d2f3af1fc'].map(IMG),
    tiers: [
      { name: 'Basic', price: 5000, features: ['2 dhol players', 'Baraat procession', '1-hour energetic set'] },
      { name: 'Standard', price: 10000, features: ['Dhol + 6-piece brass band', 'Procession + grand entry', 'Costumed performers'] },
      { name: 'Premium', price: 18000, features: ['Full baaja band (10)', 'Dhol + trumpets + drums', 'LED lights & sparklers', 'Choreographed entry'] },
    ],
  },
  {
    id: 'carnatic',
    title: 'Carnatic / Classical',
    occasion: 'Concert / background',
    images: ['photo-1646765444015-5881f0fab3e8', 'photo-1646765495885-8a61595cb9cf', 'photo-1633411988188-6e63354a9019'].map(IMG),
    tiers: [
      { name: 'Basic', price: 8000, features: ['Solo vocalist + accompaniment', '2-hour recital', 'Devotional & film ragas'] },
      { name: 'Standard', price: 15000, features: ['Vocal + veena / violin', 'Mridangam accompaniment', '3-hour concert'] },
      { name: 'Premium', price: 28000, features: ['Full concert ensemble', 'Named artist', 'PA & stage coordination', 'Custom kriti requests'] },
    ],
  },
  {
    id: 'bhajan',
    title: 'Bhajan / Devotional',
    occasion: 'Pooja / satsang',
    images: ['photo-1570797803365-c6eb43b1f040', 'photo-1568219656418-15c329312bf1', 'photo-1632478772753-607413cf877a'].map(IMG),
    tiers: [
      { name: 'Basic', price: 4000, features: ['Singer + harmonium + tabla', '2-hour bhajan', 'Popular devotional set'] },
      { name: 'Standard', price: 8000, features: ['4-member bhajan group', 'Kirtan & aarti', 'Handheld percussion'] },
      { name: 'Premium', price: 14000, features: ['Full devotional troupe', 'Harmonium, tabla, dholak', 'PA system included', 'Custom bhajan requests'] },
    ],
  },
];

const priceRange = (m: MusicOption) => {
  const lo = m.tiers[0]?.price ?? 0;
  const hi = m.tiers[m.tiers.length - 1]?.price ?? 0;
  return `₹${lo.toLocaleString('en-IN')}–₹${hi.toLocaleString('en-IN')}`;
};

export const MusicOptionViewer: React.FC<{ option: MusicOption; onClose: () => void }> = ({ option, onClose }) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [selectedTier, setSelectedTier] = useState<number | null>(null);
  const images = option.images;

  // Reset the tier choice whenever a different option is opened, so a pick
  // made on "DJ Package" doesn't carry over and look pre-selected on "Live Band".
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
      aria-label={`${option.title} option`}
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
            <p className="text-xs text-slate-400 mt-0.5">{option.occasion} · {priceRange(option)}</p>
          </div>

          <h4 className="text-sm font-bold text-white mb-3">Choose your package</h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {option.tiers.map((tier, i) => {
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
              You picked the {option.tiers[selectedTier].name} package — ₹{option.tiers[selectedTier].price.toLocaleString('en-IN')}. Mention this when you book a vendor for {option.title}.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export const MusicDjChips: React.FC<{
  options?: MusicOption[];
  onSelect?: (id: string, label: string) => void;
  isSelected?: (id: string) => boolean;
}> = ({ options = STANDARD_MUSIC, onSelect, isSelected }) => {
  const [openId, setOpenId] = useState<string | null>(null);
  const open = options.find((o) => o.id === openId) || null;

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <span className="flex items-center gap-1.5 text-xs font-bold text-violet-300 mr-1">
          <Music className="w-3.5 h-3.5" /> Entertainment
        </span>
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => { setOpenId(o.id); onSelect?.(o.id, o.title); }}
            className={`group flex items-center gap-1.5 text-xs px-3.5 py-1.5 rounded-full border transition-colors ${
              isSelected?.(o.id)
                ? 'border-indigo-500 bg-indigo-600/20 text-white'
                : 'border-slate-800 bg-slate-900 text-slate-300 hover:text-white hover:border-violet-500/50'
            }`}
          >
            {o.title}
            <span className="ml-1 font-bold text-amber-400">₹{o.tiers[0].price.toLocaleString('en-IN')}+</span>
          </button>
        ))}
      </div>

      {open && <MusicOptionViewer option={open} onClose={() => setOpenId(null)} />}
    </>
  );
};
