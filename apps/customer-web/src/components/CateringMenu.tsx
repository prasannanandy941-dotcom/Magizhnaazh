import React, { useEffect, useRef, useState } from 'react';
import { X, ChevronLeft, ChevronRight, UtensilsCrossed, Pencil, Send, CheckCircle2, Minus, Plus, ImageOff } from 'lucide-react';
import { CateringMenuCategory, CateringMenuItem, CateringMenuCategoryType } from '../../../../packages/shared-types';

// Colour accents + labels per menu category type.
export const MENU_TYPE_STYLE: Record<
  CateringMenuCategoryType,
  { label: string; dot: string; badge: string }
> = {
  veg: { label: 'Veg', dot: 'bg-emerald-400', badge: 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40' },
  'non-veg': { label: 'Non-Veg', dot: 'bg-rose-500', badge: 'bg-rose-950/80 text-rose-300 border border-rose-500/40' },
  'starters-veg': { label: 'Starters (Veg)', dot: 'bg-amber-400', badge: 'bg-amber-950/80 text-amber-300 border border-amber-500/40' },
  'starters-non-veg': { label: 'Starters (Non-Veg)', dot: 'bg-orange-500', badge: 'bg-orange-950/80 text-orange-300 border border-orange-500/40' },
  'cool-drinks': { label: 'Cool Drinks', dot: 'bg-cyan-400', badge: 'bg-cyan-950/80 text-cyan-300 border border-cyan-500/40' },
  desserts: { label: 'Desserts', dot: 'bg-pink-400', badge: 'bg-pink-950/80 text-pink-300 border border-pink-500/40' },
  mocktails: { label: 'Mocktails', dot: 'bg-fuchsia-400', badge: 'bg-fuchsia-950/80 text-fuchsia-300 border border-fuchsia-500/40' },
  snacks: { label: 'Snacks', dot: 'bg-lime-400', badge: 'bg-lime-950/80 text-lime-300 border border-lime-500/40' },
};

const item = (name: string, price: number, image: string, description?: string): CateringMenuItem => ({
  id: `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
  name,
  price,
  image,
  available: true,
  description,
});

// A standard catering menu shown at the marketplace level (Catering tab), for
// browsing before picking a vendor. Individual caterers set their own real
// vendor.cateringMenu from the vendor portal — that's what customers actually
// select items from and book against.
export const STANDARD_CATERING_MENU: CateringMenuCategory[] = [
  {
    id: 'std-veg',
    title: 'Veg',
    type: 'veg',
    image: 'https://images.unsplash.com/photo-1680993032090-1ef7ea9b51e5?w=1200&auto=format&q=75',
    items: [
      item('Vengaya Sambar & Steamed Rice', 150, 'https://images.unsplash.com/photo-1680993032090-1ef7ea9b51e5?w=600&auto=format&q=70'),
      item('Paneer Butter Masala', 180, 'https://images.unsplash.com/photo-1680993032090-1ef7ea9b51e5?w=600&auto=format&q=70'),
      item('Chettinad Kootu', 130, 'https://images.unsplash.com/photo-1680993032090-1ef7ea9b51e5?w=600&auto=format&q=70'),
      item('Curd Rice', 90, 'https://images.unsplash.com/photo-1680993032090-1ef7ea9b51e5?w=600&auto=format&q=70'),
      item('Ven Pongal', 100, 'https://images.unsplash.com/photo-1680993032090-1ef7ea9b51e5?w=600&auto=format&q=70'),
    ],
  },
  {
    id: 'std-nonveg',
    title: 'Non-Veg',
    type: 'non-veg',
    image: 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=1200&auto=format&q=75',
    items: [
      item('Chicken Chettinad', 220, 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=600&auto=format&q=70'),
      item('Hyderabadi Chicken Biryani', 250, 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=600&auto=format&q=70'),
      item('Mutton Kuzhambu', 280, 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=600&auto=format&q=70'),
      item('Meen Kuzhambu (Fish)', 240, 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=600&auto=format&q=70'),
    ],
  },
  {
    id: 'std-starters-veg',
    title: 'Starters (Veg)',
    type: 'starters-veg',
    image: 'https://images.unsplash.com/photo-1666001120694-3ebe8fd207be?w=1200&auto=format&q=75',
    items: [
      item('Paneer Tikka', 140, 'https://images.unsplash.com/photo-1666001120694-3ebe8fd207be?w=600&auto=format&q=70'),
      item('Gobi 65', 120, 'https://images.unsplash.com/photo-1666001120694-3ebe8fd207be?w=600&auto=format&q=70'),
      item('Onion Pakoda', 90, 'https://images.unsplash.com/photo-1666001120694-3ebe8fd207be?w=600&auto=format&q=70'),
    ],
  },
  {
    id: 'std-starters-nonveg',
    title: 'Starters (Non-Veg)',
    type: 'starters-non-veg',
    image: 'https://images.unsplash.com/photo-1666001120694-3ebe8fd207be?w=1200&auto=format&q=75',
    items: [
      item('Chicken 65', 160, 'https://images.unsplash.com/photo-1666001120694-3ebe8fd207be?w=600&auto=format&q=70'),
      item('Fish Fingers', 170, 'https://images.unsplash.com/photo-1666001120694-3ebe8fd207be?w=600&auto=format&q=70'),
      item('Prawn Thokku', 190, 'https://images.unsplash.com/photo-1666001120694-3ebe8fd207be?w=600&auto=format&q=70'),
    ],
  },
  {
    id: 'std-cool-drinks',
    title: 'Cool Drinks',
    type: 'cool-drinks',
    image: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=1200&auto=format&q=75',
    items: [
      item('Fresh Lime Soda', 60, 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=600&auto=format&q=70'),
      item('Rose Milk', 70, 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=600&auto=format&q=70'),
      item('Watermelon Cooler', 80, 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=600&auto=format&q=70'),
    ],
  },
  {
    id: 'std-desserts',
    title: 'Desserts',
    type: 'desserts',
    image: 'https://images.unsplash.com/photo-1635952346904-95f2ccfcd029?w=1200&auto=format&q=75',
    items: [
      item('Gulab Jamun', 80, 'https://images.unsplash.com/photo-1635952346904-95f2ccfcd029?w=600&auto=format&q=70'),
      item('Semiya Payasam', 70, 'https://images.unsplash.com/photo-1635952346904-95f2ccfcd029?w=600&auto=format&q=70'),
      item('Mysore Pak', 90, 'https://images.unsplash.com/photo-1635952346904-95f2ccfcd029?w=600&auto=format&q=70'),
    ],
  },
  {
    id: 'std-mocktails',
    title: 'Mocktails',
    type: 'mocktails',
    image: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=1200&auto=format&q=75',
    items: [
      item('Mango Mocktail', 90, 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=600&auto=format&q=70'),
      item('Madurai Jigarthanda', 100, 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=600&auto=format&q=70'),
      item('Falooda', 110, 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=600&auto=format&q=70'),
    ],
  },
  {
    id: 'std-snacks',
    title: 'Snacks',
    type: 'snacks',
    image: 'https://images.unsplash.com/photo-1666001120694-3ebe8fd207be?w=1200&auto=format&q=75',
    items: [
      item('Veg Cutlet', 70, 'https://images.unsplash.com/photo-1666001120694-3ebe8fd207be?w=600&auto=format&q=70'),
      item('Crispy Corn', 90, 'https://images.unsplash.com/photo-1666001120694-3ebe8fd207be?w=600&auto=format&q=70'),
      item('Masala Vada', 60, 'https://images.unsplash.com/photo-1666001120694-3ebe8fd207be?w=600&auto=format&q=70'),
    ],
  },
];

// Full-screen, swipeable page viewer — one page per menu category (image on
// top + item list below). When `onQtyChange` is supplied, each available item
// gets a quantity stepper so the customer can build a real order; otherwise
// it's a read-only browse view (used for the generic marketplace menu).
export const CateringMenuViewer: React.FC<{
  categories: CateringMenuCategory[];
  initialIndex: number;
  onClose: () => void;
  cart?: Record<string, number>;
  onQtyChange?: (item: CateringMenuItem, categoryTitle: string, qty: number) => void;
}> = ({ categories, initialIndex, onClose, cart, onQtyChange }) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(initialIndex);

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
    const el = trackRef.current;
    if (el) el.scrollLeft = initialIndex * el.clientWidth;
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
      className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/90 backdrop-blur-sm p-4 sm:p-8"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Catering menu"
    >
      <div className="relative w-full max-w-3xl" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close menu"
          className="absolute -top-3 -right-3 z-20 w-9 h-9 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center text-slate-200 hover:text-white hover:bg-slate-800 transition-colors shadow-lg"
        >
          <X className="w-4 h-4" />
        </button>

        <div
          ref={trackRef}
          onScroll={onScroll}
          className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar rounded-2xl border border-slate-800 shadow-2xl bg-slate-900"
        >
          {categories.map((cat) => {
            const s = MENU_TYPE_STYLE[cat.type];
            return (
              <div key={cat.id} className="snap-center shrink-0 w-full">
                <div className="relative h-44 sm:h-56 w-full bg-slate-950">
                  <img src={cat.image} alt={cat.title} className="w-full h-full object-cover" draggable={false} />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/20 to-transparent" />
                  <span className={`absolute top-4 left-4 flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${s.badge}`}>
                    <span className={`w-2 h-2 rounded-full ${s.dot}`} /> {s.label}
                  </span>
                  <h3 className="absolute bottom-4 left-4 right-4 text-white font-display font-bold text-2xl">{cat.title}</h3>
                </div>
                <div className="p-5 max-h-[42vh] overflow-y-auto space-y-2">
                  {cat.items.map((it) => {
                    const qty = cart?.[it.id] ?? 0;
                    return (
                      <div
                        key={it.id}
                        className={`flex items-center gap-3 p-2.5 rounded-xl border ${
                          it.available ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-950/30 border-slate-800/60 opacity-50'
                        }`}
                      >
                        <div className="w-14 h-14 rounded-lg overflow-hidden bg-slate-900 border border-slate-800 shrink-0">
                          {it.image ? (
                            <img src={it.image} alt={it.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-600">
                              <ImageOff className="w-4 h-4" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-white truncate">{it.name}</p>
                          {it.description && <p className="text-[11px] text-slate-400 truncate">{it.description}</p>}
                          <p className="text-xs font-bold text-amber-400">
                            ₹{it.price.toLocaleString('en-IN')}
                            {!it.available && <span className="ml-2 text-rose-400 font-semibold">Unavailable</span>}
                          </p>
                        </div>

                        {onQtyChange && it.available && (
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => onQtyChange(it, cat.title, Math.max(0, qty - 1))}
                              disabled={qty === 0}
                              className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 text-white flex items-center justify-center disabled:opacity-30"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="w-5 text-center text-sm font-bold text-white">{qty}</span>
                            <button
                              type="button"
                              onClick={() => onQtyChange(it, cat.title, qty + 1)}
                              className="w-7 h-7 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center hover:bg-amber-400"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {cat.items.length === 0 && <p className="text-xs text-slate-500">No items added to this card yet.</p>}
                </div>
              </div>
            );
          })}
        </div>

        {categories.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => slide(-1)}
              aria-label="Previous category"
              disabled={index === 0}
              className="absolute left-2 top-20 sm:top-24 z-10 w-10 h-10 rounded-full bg-slate-950/70 border border-slate-700 backdrop-blur-sm flex items-center justify-center text-white hover:bg-slate-900 transition-colors disabled:opacity-30"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => slide(1)}
              aria-label="Next category"
              disabled={index === categories.length - 1}
              className="absolute right-2 top-20 sm:top-24 z-10 w-10 h-10 rounded-full bg-slate-950/70 border border-slate-700 backdrop-blur-sm flex items-center justify-center text-white hover:bg-slate-900 transition-colors disabled:opacity-30"
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            <span className="absolute top-3 left-3 z-10 px-2.5 py-1 rounded-full bg-slate-950/70 backdrop-blur-sm text-white text-xs font-semibold">
              {index + 1} / {categories.length}
            </span>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              {categories.map((cat, i) => (
                <button
                  key={cat.id}
                  type="button"
                  aria-label={`Go to ${cat.title}`}
                  onClick={() => goTo(i)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    i === index ? 'bg-amber-500 text-slate-950' : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {cat.title}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// Reusable "Write what you want" box — a free-text custom request the customer
// can save. Persists to localStorage under `storageKey`; `onSaved` fires with
// the saved text (used e.g. to attach the note to a booking).
export const CustomRequestBox: React.FC<{
  storageKey: string;
  onSaved?: (text: string) => void;
  triggerLabel?: string;
  label?: string;
  placeholder?: string;
}> = ({
  storageKey,
  onSaved,
  triggerLabel = 'Write what you want',
  label = 'Tell the caterer exactly what you want',
  placeholder = 'e.g. 300 guests, pure-veg only for 50 people, add Chicken Biryani & Jigarthanda, no onion/garlic for elders, serve by 8 PM…',
}) => {
  const [saved, setSaved] = useState('');
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  // Load any previously saved request for this storage key.
  useEffect(() => {
    try {
      setSaved(localStorage.getItem(storageKey) ?? '');
    } catch {
      /* ignore storage errors */
    }
  }, [storageKey]);

  const openEditor = () => {
    setDraft(saved);
    setEditing(true);
  };

  const saveRequest = () => {
    const text = draft.trim();
    setSaved(text);
    try {
      if (text) localStorage.setItem(storageKey, text);
      else localStorage.removeItem(storageKey);
    } catch {
      /* ignore storage errors */
    }
    setEditing(false);
    onSaved?.(text);
  };

  if (editing) {
    return (
      <div className="mb-4 p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
        <label className="block text-xs font-semibold text-slate-300 mb-2">
          {label}
        </label>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          autoFocus
          rows={3}
          placeholder={placeholder}
          className="w-full resize-y rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-200 placeholder:text-slate-500 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
        />
        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={saveRequest}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-md transition-all"
          >
            <Send className="w-3.5 h-3.5" /> Save request
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white font-semibold text-xs transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  if (saved) {
    return (
      <div className="mb-4 p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/30">
        <div className="flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
          <div className="flex-1">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-emerald-300 uppercase tracking-wide">Your request</span>
              <button
                type="button"
                onClick={openEditor}
                className="flex items-center gap-1 text-[11px] font-semibold text-slate-300 hover:text-white"
              >
                <Pencil className="w-3 h-3" /> Edit
              </button>
            </div>
            <p className="text-sm text-slate-200 mt-1 whitespace-pre-wrap">{saved}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={openEditor}
      className="mb-4 flex items-center gap-1.5 text-xs px-3.5 py-2 rounded-full border border-dashed border-amber-500/50 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 transition-colors"
    >
      <Pencil className="w-3.5 h-3.5" /> {triggerLabel}
    </button>
  );
};

// Marketplace-level "Menu" chip row (mirrors the Venue facility chips).
// Clicking a category chip opens the swipeable menu viewer at that category.
export const CateringMenuChips: React.FC<{
  categories?: CateringMenuCategory[];
  onSelect?: (id: string, label: string) => void;
  isSelected?: (id: string) => boolean;
}> = ({ categories = STANDARD_CATERING_MENU, onSelect, isSelected }) => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="flex items-center gap-1.5 text-xs font-bold text-amber-400 mr-1">
          <UtensilsCrossed className="w-3.5 h-3.5" /> Menu
        </span>
        {categories.map((cat, idx) => {
          const s = MENU_TYPE_STYLE[cat.type];
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => { setOpenIndex(idx); onSelect?.(cat.id, cat.title); }}
              className={`group flex items-center gap-1.5 text-xs px-3.5 py-1.5 rounded-full border transition-colors ${
                isSelected?.(cat.id)
                  ? 'border-indigo-500 bg-indigo-600/20 text-white'
                  : 'border-slate-800 bg-slate-900 text-slate-300 hover:text-white hover:border-amber-500/50'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${s.dot}`} />
              {cat.title}
            </button>
          );
        })}
      </div>

      {openIndex !== null && (
        <CateringMenuViewer categories={categories} initialIndex={openIndex} onClose={() => setOpenIndex(null)} />
      )}
    </>
  );
};
