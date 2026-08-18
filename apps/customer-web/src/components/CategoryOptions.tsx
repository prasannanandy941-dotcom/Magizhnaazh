import React, { useState } from 'react';
import {
  X, ChevronLeft, ChevronRight, Check, Plus,
  Video, Mail, Printer, PartyPopper, Lightbulb, Flower2, Palette, Mic2, Shield, SprayCan, Package, ClipboardList, Briefcase, Tag, UtensilsCrossed,
  type LucideIcon,
} from 'lucide-react';
import { VendorCategory, CATEGORY_OPTIONS, CATERING_OPTION_STYLE } from '../../../../packages/shared-types';

const IMG = (id: string) => `https://images.unsplash.com/${id}?w=1200&auto=format&q=75`;
const THUMB = (id: string) => `https://images.unsplash.com/${id}?w=600&h=400&fit=crop&auto=format&q=70`;

// Generic fallback for every category that doesn't have a bespoke chips/grid
// component of its own yet (Venue, Photography, Decoration, Makeup & Beauty,
// Transport, Pujari/Priest, Return Gifts and Music/DJ all have one — see
// VendorMarketplace.tsx). Driven entirely by the shared CATEGORY_OPTIONS list
// so every category gets a browsable options row + a matching detail grid
// instead of a blank panel. Catering also renders here, with its options
// additionally colour-coded via CATERING_OPTION_STYLE (green Veg, red
// Non-Veg, etc.) since that's the one category with a fixed colour
// convention customers already expect.

const CATEGORY_ICON: Partial<Record<VendorCategory, LucideIcon>> = {
  Catering: UtensilsCrossed,
  Videography: Video,
  Invitation: Mail,
  Printing: Printer,
  Entertainment: PartyPopper,
  Lighting: Lightbulb,
  Flowers: Flower2,
  Mehendi: Palette,
  'Event Host/Anchor': Mic2,
  Security: Shield,
  Cleaning: SprayCan,
  'Rental Equipment': Package,
  'Utensils for Rent': UtensilsCrossed,
  'Wedding Planner': ClipboardList,
  'Corporate Event Services': Briefcase,
  Other: Tag,
};

// Small, reused pool of already-verified-working Unsplash photo ids (borrowed
// from the other category components in this folder) grouped per category so
// every option has a 2-3 image gallery without needing bespoke photography
// curated for all 13 of these categories.
const CATEGORY_IMAGES: Partial<Record<VendorCategory, string[]>> = {
  Catering: ['photo-1680993032090-1ef7ea9b51e5', 'photo-1589302168068-964664d93dc0', 'photo-1666001120694-3ebe8fd207be', 'photo-1635952346904-95f2ccfcd029', 'photo-1551024709-8f23befc6f87'],
  Videography: ['photo-1580707221190-bd94d9087b7f', 'photo-1629756048377-09540f52caa1', 'photo-1611550287705-7ff8b459c8eb'],
  Invitation: ['photo-1632610992723-82d7c212f6d7', 'photo-1721176487015-5408ae0e9bc2', 'photo-1656104717095-9d062b0d4e8d'],
  Printing: ['photo-1503694978374-8a2fa686963a', 'photo-1581508512961-0e3b9524db40', 'photo-1562155695-fb6e1f95fcfd'],
  Entertainment: ['photo-1563841930606-67e2bce48b78', 'photo-1470229722913-7c0e2dbbafd3', 'photo-1524368535928-5b5e00ddc76b'],
  Lighting: ['photo-1576514129883-2f1d47a65da6', 'photo-1558620013-a08999547a36', 'photo-1599739291060-4578e77dac5d'],
  Flowers: ['photo-1469371670807-013ccf25f16a', 'photo-1727081203667-4792c134061a', 'photo-1521129866021-4313ccf20e9e'],
  Mehendi: ['photo-1732118400647-a81e3b37be87', 'photo-1753597500229-d2534c9a01f8', 'photo-1762162089047-97e09435984d'],
  'Event Host/Anchor': ['photo-1702562546665-4632bdb96e04', 'photo-1538449327350-43b4fcfd35ac', 'photo-1485814837398-ed2048f57499'],
  Security: ['photo-1566245024852-04fbf7842ce9', 'photo-1652739758426-56a564265f9e', 'photo-1653592956557-48ae49fc5ef5'],
  Cleaning: ['photo-1580842402762-6f5868c17412', 'photo-1615506355925-dd0a54d099dd', 'photo-1758599668203-05ee0bca83ef'],
  'Rental Equipment': ['photo-1695393386569-cf141ff2c552', 'photo-1675376616537-c8aa9ddc9977', 'photo-1692166927778-056466153552'],
  'Utensils for Rent': ['photo-1675376616537-c8aa9ddc9977', 'photo-1695393386569-cf141ff2c552', 'photo-1589302168068-964664d93dc0'],
  'Wedding Planner': ['photo-1568847811512-803314424fdc', 'photo-1691480174869-436af8fd6eba', 'photo-1614468037859-af91cfe3abb3'],
  'Corporate Event Services': ['photo-1540575467063-178a50c2df87', 'photo-1587825140708-dfaf72ae4b04', 'photo-1531058020387-3be344556be6'],
  Other: ['photo-1529636798458-92182e662485', 'photo-1605553426886-c0a99033fda0', 'photo-1611430009613-3cd989684b41'],
};

export interface CategoryOption {
  id: string;
  title: string;
  images: string[];
}

// Per-option image galleries, keyed by the exact option label. Used when an
// option needs photos that specifically match its name rather than the rotated
// category pool (which mixes unrelated shots). Add an entry here whenever a
// category's options would otherwise show off-topic images.
const OPTION_IMAGE_OVERRIDES: Record<string, string[]> = {
  // Utensils for Rent — each vessel/serving item gets its own matching photos.
  'Cooking Vessels (Anda)': ['photo-1548688977-3e38ddc590f6', 'photo-1633504785850-018cae02cb47', 'photo-1652960018678-1f19799996c5'],
  'Serving Utensils': ['photo-1619367300924-485907ff690d', 'photo-1586969593928-1c87c1f9c2ef', 'photo-1683635635577-87781e475568'],
  'Steel Plates & Tumblers': ['photo-1647187407768-3a4ee3306b24', 'photo-1772455853962-617ace13746f', 'photo-1692107129051-9b536eb13a57'],
  'Buffet Counters': ['photo-1576842546422-60562b9242ae', 'photo-1662982696492-057328dce48b', 'photo-1660120447916-123439b05c40'],
  'Gas Stoves & Burners': ['photo-1607324772107-8ad6740ca195', 'photo-1728509741559-44172bcd86b3', 'photo-1595166986545-bf6dacb22b4e'],
  'Water Dispensers': ['photo-1780590107737-9381035b8265', 'photo-1763979513824-79d7fd923509', 'photo-1700497918461-c6bf827cad58'],
  'Steel Dining Sets': ['photo-1708193754228-75fa48241030', 'photo-1727124443486-659f329a08c2', 'photo-1586969593928-1c87c1f9c2ef'],
  'Traditional Brass & Copper': ['photo-1652960018678-1f19799996c5', 'photo-1687359254760-dc3fa6f89c43', 'photo-1750847009743-e0281d1bca7d'],
};

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

export function optionsForCategory(category: VendorCategory): CategoryOption[] {
  const labels = CATEGORY_OPTIONS[category] ?? [];
  const pool = CATEGORY_IMAGES[category] ?? CATEGORY_IMAGES.Other!;
  return labels.map((title, i) => ({
    id: slugify(title),
    title,
    // Prefer a per-option gallery when one is defined; otherwise rotate through
    // the category's small image pool so every option still gets a multi-photo
    // gallery instead of reusing a single static image.
    images: OPTION_IMAGE_OVERRIDES[title] ?? [pool[i % pool.length], pool[(i + 1) % pool.length], pool[(i + 2) % pool.length]],
  }));
}

const CategoryGalleryViewer: React.FC<{ option: CategoryOption; onClose: () => void }> = ({ option, onClose }) => {
  const [index, setIndex] = useState(0);
  const images = option.images.map(IMG);

  const go = (dir: number) => setIndex((i) => Math.min(images.length - 1, Math.max(0, i + dir)));

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/90 backdrop-blur-sm p-4 sm:p-8"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`${option.title} gallery`}
    >
      <div className="relative w-full max-w-4xl" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close gallery"
          className="absolute -top-3 -right-3 z-20 w-9 h-9 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center text-slate-200 hover:text-white hover:bg-slate-800 transition-colors shadow-lg"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="rounded-2xl border border-slate-800 shadow-2xl bg-slate-900 overflow-hidden flex items-center justify-center">
          <img src={images[index]} alt={`${option.title} ${index + 1}`} className="w-full max-h-[80vh] object-contain select-none" draggable={false} />
        </div>

        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="Previous photo"
              disabled={index === 0}
              className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-slate-950/70 border border-slate-700 backdrop-blur-sm flex items-center justify-center text-white hover:bg-slate-900 transition-colors disabled:opacity-30"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="Next photo"
              disabled={index === images.length - 1}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-slate-950/70 border border-slate-700 backdrop-blur-sm flex items-center justify-center text-white hover:bg-slate-900 transition-colors disabled:opacity-30"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}

        <div className="pointer-events-none absolute top-3 left-3 z-10 flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-full bg-slate-950/70 backdrop-blur-sm text-white text-xs font-semibold">{option.title}</span>
          <span className="px-2.5 py-1 rounded-full bg-slate-950/70 backdrop-blur-sm text-white text-xs font-semibold">{index + 1} / {images.length}</span>
        </div>
      </div>
    </div>
  );
};

// Marketplace-level chip row — mirrors PortfolioChips / MakeupChips / etc.
export const GenericCategoryChips: React.FC<{
  category: VendorCategory;
  onSelect?: (id: string, label: string) => void;
  isSelected?: (id: string) => boolean;
}> = ({ category, onSelect, isSelected }) => {
  const options = optionsForCategory(category);
  const [openId, setOpenId] = useState<string | null>(null);
  const openOption = options.find((o) => o.id === openId) || null;
  const Icon = CATEGORY_ICON[category] ?? Tag;

  if (options.length === 0) return null;

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <span className="flex items-center gap-1.5 text-xs font-bold text-indigo-300 mr-1">
          <Icon className="w-3.5 h-3.5" /> {category}
        </span>
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => { setOpenId(o.id); onSelect?.(o.id, o.title); }}
            className={`group flex items-center gap-1.5 text-xs px-3.5 py-1.5 rounded-full border transition-colors ${
              isSelected?.(o.id)
                ? 'border-indigo-500 bg-indigo-600/20 text-white'
                : 'border-slate-800 bg-slate-900 text-slate-300 hover:text-white hover:border-indigo-500/50'
            }`}
          >
            {CATERING_OPTION_STYLE[o.title] && <span className={`w-2 h-2 rounded-full ${CATERING_OPTION_STYLE[o.title].dot}`} />}
            {o.title}
          </button>
        ))}
      </div>

      {openOption && <CategoryGalleryViewer option={openOption} onClose={() => setOpenId(null)} />}
    </>
  );
};

// Vendor-detail-modal grid — mirrors PortfolioGrid / MakeupGrid / etc. When
// `onToggle` is supplied, each card also gets a select toggle so the
// customer can pick which options they want — those picks travel with the
// booking. For Catering specifically, the toggle itself carries the
// category's colour (green Veg, red Non-Veg, etc.) instead of the generic
// emerald "selected" colour.
export const GenericCategoryGrid: React.FC<{
  category: VendorCategory;
  selected?: string[];
  onToggle?: (title: string) => void;
}> = ({ category, selected, onToggle }) => {
  const options = optionsForCategory(category);
  const [openId, setOpenId] = useState<string | null>(null);
  const openOption = options.find((o) => o.id === openId) || null;
  const Icon = CATEGORY_ICON[category] ?? Tag;

  if (options.length === 0) {
    return <p className="text-xs text-slate-500">No preset options for "{category}" yet.</p>;
  }

  return (
    <div>
      <p className="text-sm text-slate-300 mb-4">
        Browse {category} options — <span className="text-indigo-300 font-semibold">{options.length} categories</span>. Tap to view photos{onToggle ? ', or select the ones you want.' : '.'}
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {options.map((o) => {
          const isSelected = !!selected?.includes(o.title);
          const cateringStyle = CATERING_OPTION_STYLE[o.title];
          return (
            <div
              key={o.id}
              className={`group relative h-44 rounded-2xl overflow-hidden border text-left ${isSelected ? 'border-emerald-500 ring-2 ring-emerald-500/40' : 'border-slate-800'}`}
            >
              <button
                type="button"
                onClick={() => setOpenId(o.id)}
                className="absolute inset-0 w-full h-full text-left focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                title={`View ${o.title}`}
              >
                <img src={THUMB(o.images[0])} alt={o.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent" />
                {!onToggle && cateringStyle && (
                  <span className={`absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${cateringStyle.badge}`}>
                    <span className={`w-2 h-2 rounded-full ${cateringStyle.dot}`} />
                  </span>
                )}
                <span className="absolute top-3 right-3 flex items-center gap-1 px-2 h-6 rounded-full bg-slate-950/70 backdrop-blur-sm text-white text-[10px] font-semibold">
                  <Icon className="w-3 h-3" /> {o.images.length}
                </span>
                <div className="absolute bottom-3 left-3 right-3">
                  <h4 className="text-white font-display font-bold text-base leading-tight">{o.title}</h4>
                </div>
              </button>
              {onToggle && (
                <button
                  type="button"
                  onClick={() => onToggle(o.title)}
                  aria-label={isSelected ? `Remove ${o.title}` : `Add ${o.title}`}
                  className={`absolute top-3 left-3 z-10 w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
                    isSelected
                      ? cateringStyle
                        ? `${cateringStyle.dot} text-slate-950`
                        : 'bg-emerald-500 text-slate-950'
                      : 'bg-slate-950/70 backdrop-blur-sm text-white hover:bg-slate-900'
                  }`}
                >
                  {isSelected ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {openOption && <CategoryGalleryViewer option={openOption} onClose={() => setOpenId(null)} />}
    </div>
  );
};
