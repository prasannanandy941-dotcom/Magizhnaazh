import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, ChevronDown, Maximize2, X, ListChecks } from 'lucide-react';
import { Vendor, VendorFacilities } from '../../../../packages/shared-types';

export type VenueFacilities = VendorFacilities;

export const FACILITY_FILTERS = [
  { key: 'acRoom', label: 'AC room', icon: 'ti-snowflake' },
  { key: 'fansOnly', label: 'Fans only', icon: 'ti-wind' },
  { key: 'vipRoom', label: 'VIP room' },
  { key: 'vipFrontChairs', label: 'VIP front chairs' },
  { key: 'garlands', label: 'Garlands' },
  { key: 'brideGroomRoom', label: 'Bride and groom room', icon: 'ti-bed' },
  { key: 'guestRoomAttachedWashroom', label: 'Guest rooms' },
  { key: 'dormitoryHall', label: 'Dormitory hall' },
  { key: 'separateGuestWashroom', label: 'Separate guest washroom' },
  { key: 'waterFilter', label: 'Water filter' },
  { key: 'cookingUtensils', label: 'Cooking utensils' },
  { key: 'catering', label: 'Catering included', icon: 'ti-tools-kitchen-2', matchValue: 'included' },
  { key: 'decoration', label: 'Decoration', matchValue: 'included' },
  { key: 'djService', label: 'DJ available', matchValue: 'included' },
  { key: 'transport', label: 'Transport', matchValue: 'included' },
] as const;

// Each facility maps to a small GALLERY of real photos showing that amenity in
// a venue / celebration context (e.g. AC = climate-controlled decorated halls,
// Fans = ceiling fans, Bride & groom = bridal rooms, etc.). The first image is
// used as the card thumbnail; clicking a card opens the full gallery.
const IMG = (id: string) =>
  `https://images.unsplash.com/${id}?w=600&h=400&fit=crop&auto=format&q=70`;

export const FACILITY_IMAGES: Record<string, string[]> = {
  acRoom: [
    'photo-1712314947761-a8d718bd8c32',
    'photo-1786062841848-18177898b3a7',
    'photo-1780542900375-0cf459e38fbb',
    'photo-1655516433028-9e0e1599cf8b',
  ].map(IMG),
  fansOnly: [
    'photo-1555470100-1728256970aa',
    'photo-1609519479841-5fd3b2884e17',
    'photo-1576503963299-fcd31822b523',
  ].map(IMG),
  vipRoom: [
    'photo-1664268075328-e040b499c2e9',
    'photo-1734380018680-561810a375f2',
    'photo-1598299827130-5aa1d5149c8d',
  ].map(IMG),
  vipFrontChairs: [
    'photo-1522673607200-164d1b6ce486',
    'photo-1554198886-2330d3d55f67',
    'photo-1522058171200-e61f77c7353d',
  ].map(IMG),
  garlands: [
    'photo-1764286954620-28029fbae9b6',
    'photo-1664990106113-5121900ed371',
    'photo-1705475388142-a2700c4caeb5',
  ].map(IMG),
  brideGroomRoom: [
    'photo-1764269715774-43b6b03bcfda',
    'photo-1626868824739-50f7c73e9761',
    'photo-1764269715830-ea3b5c6b8531',
  ].map(IMG),
  guestRoomAttachedWashroom: [
    'photo-1760573776062-7d2a7baeb49d',
    'photo-1769123300291-81262063e667',
    'photo-1754597302822-4b96f3442d3f',
  ].map(IMG),
  dormitoryHall: [
    'photo-1520277739336-7bf67edfa768',
    'photo-1555854877-bab0e564b8d5',
    'photo-1709805619372-40de3f158e83',
  ].map(IMG),
  separateGuestWashroom: [
    'photo-1584622650111-993a426fbf0a',
    'photo-1695002817411-203c7f19dfa3',
    'photo-1620626011761-996317b8d101',
    'photo-1661107259637-4e1c55462428',
  ].map(IMG),
  waterFilter: [
    'photo-1669211659110-3f3db4119b65',
    'photo-1589986005992-68bc7aa343c2',
    'photo-1628239532623-c035054bff4e',
  ].map(IMG),
  cookingUtensils: [
    'photo-1604414499020-f9ac575bc5ec',
    'photo-1586969593928-1c87c1f9c2ef',
    'photo-1580929753603-10519c6e480a',
  ].map(IMG),
  catering: [
    'photo-1555244162-803834f70033',
    'photo-1646578515903-67873a5398f9',
    'photo-1581546085212-f25477a9d4fb',
    'photo-1565897968925-4dc1642f65cc',
  ].map(IMG),
  decoration: [
    'photo-1605553426886-c0a99033fda0',
    'photo-1640355105827-2aa98e908a7b',
    'photo-1762709118823-7fe9c9afa8ff',
    'photo-1780303864944-737d88c789f4',
  ].map(IMG),
  djService: [
    'photo-1574155376612-bfa4ed8aabfd',
    'photo-1599739291060-4578e77dac5d',
    'photo-1624929303661-22c5bce0169b',
    'photo-1574793954837-b7938eb5a662',
  ].map(IMG),
  transport: [
    'photo-1570118054363-ff4d296962f5',
    'photo-1603521801204-8d9c70dd08c8',
    'photo-1509749837427-ac94a2553d0e',
  ].map(IMG),
};

function Checkbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <label className="flex items-center gap-2 text-sm text-gray-200">
      <input type="checkbox" checked={checked} onChange={onChange} />
      <span>{label}</span>
    </label>
  );
}

function TierSelect({ label, value, onChange }: { label: string; value: VenueFacilities['catering']; onChange: (v: VenueFacilities['catering']) => void }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-sm text-gray-200">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as VenueFacilities['catering'])}
        className="bg-[#1a1c28] text-gray-200 border border-[#2e3142] rounded px-2 py-1 text-sm"
      >
        <option value="included">Included</option>
        <option value="extra_cost">Available (extra cost)</option>
        <option value="not_offered">Not offered</option>
      </select>
    </div>
  );
}

function FacilityGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <p className="text-[#c9a84c] text-sm font-medium mb-2">{title}</p>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-2">{children}</div>
    </div>
  );
}

// VENDOR SIDE: form to add/edit a venue's facilities
export function FacilitiesForm({
  facilities,
  onChange,
}: {
  facilities: VenueFacilities;
  onChange: (f: VenueFacilities) => void;
}) {
  const toggle = (key: keyof VenueFacilities) => onChange({ ...facilities, [key]: !facilities[key] });
  const setTier = (key: 'catering' | 'decoration' | 'djService' | 'transport', val: VenueFacilities['catering']) =>
    onChange({ ...facilities, [key]: val });

  return (
    <div>
      <FacilityGroup title="Accommodation and rooms">
        <Checkbox label="Bride and groom room (attached washroom)" checked={facilities.brideGroomRoom} onChange={() => toggle('brideGroomRoom')} />
        <Checkbox label="Guest rooms (attached washroom)" checked={facilities.guestRoomAttachedWashroom} onChange={() => toggle('guestRoomAttachedWashroom')} />
        <Checkbox label="Dormitory hall (shared)" checked={facilities.dormitoryHall} onChange={() => toggle('dormitoryHall')} />
        <Checkbox label="VIP room / lounge" checked={facilities.vipRoom} onChange={() => toggle('vipRoom')} />
      </FacilityGroup>

      <FacilityGroup title="Comfort and washrooms">
        <Checkbox label="AC available" checked={facilities.acRoom} onChange={() => toggle('acRoom')} />
        <Checkbox label="Fans only" checked={facilities.fansOnly} onChange={() => toggle('fansOnly')} />
        <Checkbox label="VIP front chairs (premium seating)" checked={facilities.vipFrontChairs} onChange={() => toggle('vipFrontChairs')} />
        <Checkbox label="Separate washroom for guests" checked={facilities.separateGuestWashroom} onChange={() => toggle('separateGuestWashroom')} />
      </FacilityGroup>

      <FacilityGroup title="Kitchen">
        <Checkbox label="Cooking utensils provided" checked={facilities.cookingUtensils} onChange={() => toggle('cookingUtensils')} />
        <Checkbox label="Water filter / RO" checked={facilities.waterFilter} onChange={() => toggle('waterFilter')} />
      </FacilityGroup>

      <FacilityGroup title="Event services">
        <Checkbox label="Flower garlands / maalai" checked={facilities.garlands} onChange={() => toggle('garlands')} />
        <TierSelect label="Catering" value={facilities.catering} onChange={(v) => setTier('catering', v)} />
        <TierSelect label="Decoration" value={facilities.decoration} onChange={(v) => setTier('decoration', v)} />
        <TierSelect label="DJ / music" value={facilities.djService} onChange={(v) => setTier('djService', v)} />
        <TierSelect label="Transport" value={facilities.transport} onChange={(v) => setTier('transport', v)} />
      </FacilityGroup>
    </div>
  );
}

// CUSTOMER SIDE: filter chip row on the marketplace page
export function FacilityChips({
  active,
  onToggle,
}: {
  active: string[];
  onToggle: (key: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {FACILITY_FILTERS.map((f) => (
        <button
          key={f.key}
          onClick={() => onToggle(f.key)}
          className={`text-xs px-3.5 py-1.5 rounded-full border transition-colors ${
            active.includes(f.key)
              ? 'bg-indigo-600 border-indigo-600 text-white'
              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          {'icon' in f && <i className={`ti ${f.icon} mr-1`} aria-hidden="true" />}
          {f.label}
        </button>
      ))}
    </div>
  );
}

// CUSTOMER SIDE: collapsible bar that collects everything the client has picked
// from the facility chips. Toggle open/closed with the arrow button.
export function FacilitySelectionBar({
  active,
  onToggle,
  onClear,
}: {
  active: string[];
  onToggle: (key: string) => void;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(true);

  return (
    <div className="mb-4 rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-white">
          <ListChecks className="w-4 h-4 text-indigo-400" />
          Your selected amenities
          <span className="ml-1 px-2 py-0.5 rounded-full bg-indigo-600 text-white text-[11px] font-bold">
            {active.length}
          </span>
        </span>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="px-4 pb-4">
          {active.length === 0 ? (
            <p className="text-xs text-slate-500">No amenities selected yet — tap the chips above to add what you need.</p>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              {active.map((key) => {
                const f = FACILITY_FILTERS.find((x) => x.key === key);
                if (!f) return null;
                return (
                  <span
                    key={key}
                    className="flex items-center gap-1.5 pl-3 pr-2 py-1.5 rounded-full bg-indigo-600/20 border border-indigo-500/40 text-indigo-200 text-xs font-semibold"
                  >
                    {f.label}
                    <button
                      type="button"
                      onClick={() => onToggle(key)}
                      aria-label={`Remove ${f.label}`}
                      className="w-4 h-4 rounded-full flex items-center justify-center hover:bg-indigo-500/40 hover:text-white transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                );
              })}
              <button
                type="button"
                onClick={onClear}
                className="ml-1 text-[11px] font-semibold text-slate-400 hover:text-white underline"
              >
                Clear all
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Larger, uncropped version of a facility photo for the lightbox view.
const largeImage = (url: string) => `${url.split('?')[0]}?w=1400&auto=format&q=80`;

type Lightbox = { images: string[]; label: string; index: number };

// CUSTOMER SIDE: shows a photo card for each currently-selected facility.
// Clicking a card opens a gallery of that facility's photos in a swipeable,
// side-scrolling lightbox carousel.
export function FacilityImagePreview({ active }: { active: string[] }) {
  const [lightbox, setLightbox] = useState<Lightbox | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const open = lightbox !== null;

  // Scroll the filmstrip by one slide in the given direction.
  const slide = (dir: number) => {
    const el = trackRef.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth, behavior: 'smooth' });
  };

  // Jump directly to a slide (used by the dot indicators).
  const goTo = (i: number) => {
    const el = trackRef.current;
    if (el) el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' });
  };

  // Keep the active index in sync as the user scrolls/swipes sideways.
  const onScroll = () => {
    const el = trackRef.current;
    if (!el) return;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    setLightbox((lb) => (lb && lb.index !== i ? { ...lb, index: i } : lb));
  };

  // Arrow-key navigation + Escape to close, and lock body scroll while open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightbox(null);
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
  }, [open]);

  if (active.length === 0) return null;

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-6">
        {active.map((key) => {
          const filter = FACILITY_FILTERS.find((f) => f.key === key);
          const imgs = FACILITY_IMAGES[key];
          if (!filter || !imgs || imgs.length === 0) return null;

          return (
            <button
              key={key}
              type="button"
              onClick={() => setLightbox({ images: imgs.map(largeImage), label: filter.label, index: 0 })}
              className="group relative rounded-xl overflow-hidden h-28 border border-slate-800 cursor-zoom-in text-left focus:outline-none focus:ring-2 focus:ring-indigo-500"
              title={`View ${filter.label} (${imgs.length} photos)`}
            >
              <img
                src={imgs[0]}
                alt={filter.label}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 to-transparent" />
              <span className="absolute top-2 right-2 flex items-center gap-1 px-1.5 h-6 rounded-full bg-slate-950/70 backdrop-blur-sm text-white text-[10px] font-semibold">
                <Maximize2 className="w-3 h-3" /> {imgs.length}
              </span>
              <span className="absolute bottom-2 left-2 text-white text-xs font-bold">{filter.label}</span>
            </button>
          );
        })}
      </div>

      {lightbox && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-4 sm:p-8"
          onClick={() => setLightbox(null)}
          role="dialog"
          aria-modal="true"
          aria-label={lightbox.label}
        >
          <div className="relative w-full max-w-5xl" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setLightbox(null)}
              aria-label="Close"
              className="absolute -top-3 -right-3 z-20 w-9 h-9 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center text-slate-200 hover:text-white hover:bg-slate-800 transition-colors shadow-lg"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Side-scrolling / swipeable filmstrip */}
            <div
              ref={trackRef}
              onScroll={onScroll}
              className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar rounded-2xl border border-slate-800 shadow-2xl bg-slate-900"
            >
              {lightbox.images.map((src, i) => (
                <div key={i} className="snap-center shrink-0 w-full flex items-center justify-center">
                  <img
                    src={src}
                    alt={`${lightbox.label} ${i + 1}`}
                    className="w-full max-h-[78vh] object-contain select-none"
                    draggable={false}
                  />
                </div>
              ))}
            </div>

            {lightbox.images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => slide(-1)}
                  aria-label="Previous"
                  className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-slate-950/70 border border-slate-700 backdrop-blur-sm flex items-center justify-center text-white hover:bg-slate-900 transition-colors disabled:opacity-30"
                  disabled={lightbox.index === 0}
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={() => slide(1)}
                  aria-label="Next"
                  className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-slate-950/70 border border-slate-700 backdrop-blur-sm flex items-center justify-center text-white hover:bg-slate-900 transition-colors disabled:opacity-30"
                  disabled={lightbox.index === lightbox.images.length - 1}
                >
                  <ChevronRight className="w-5 h-5" />
                </button>

                <span className="absolute top-3 left-3 z-10 px-2.5 py-1 rounded-full bg-slate-950/70 backdrop-blur-sm text-white text-xs font-semibold">
                  {lightbox.index + 1} / {lightbox.images.length}
                </span>

                <div className="absolute bottom-14 inset-x-0 z-10 flex items-center justify-center gap-1.5">
                  {lightbox.images.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      aria-label={`Go to photo ${i + 1}`}
                      onClick={() => goTo(i)}
                      className={`h-1.5 rounded-full transition-all ${
                        i === lightbox.index ? 'w-5 bg-white' : 'w-1.5 bg-white/50 hover:bg-white/80'
                      }`}
                    />
                  ))}
                </div>
              </>
            )}

            <div className="pointer-events-none absolute bottom-0 inset-x-0 bg-gradient-to-t from-slate-950/90 to-transparent rounded-b-2xl px-5 py-4">
              <span className="text-white font-display font-bold text-lg">{lightbox.label}</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function filterVenuesByFacilities<T extends { facilities?: Partial<VenueFacilities> }>(
  venues: T[],
  activeFacilityKeys: string[]
): T[] {
  return venues.filter((v) =>
    activeFacilityKeys.every((key) => {
      const filter = FACILITY_FILTERS.find((f) => f.key === key);
      const val = v.facilities?.[key as keyof VenueFacilities];
      return filter && 'matchValue' in filter ? val === filter.matchValue : val === true;
    })
  );
}