import React, { useState, useEffect } from 'react';
import { X, Star, MapPin, Check, ShieldCheck, Upload, Calendar as CalendarIcon, MessageSquare, Send, CreditCard, Sparkles, Camera, Bus, Flame, Gift, ListChecks, Phone, Copy, Clock, RefreshCw } from 'lucide-react';
import { Vendor } from '../../../../packages/shared-types';
import { fetchVendorById, uploadReferenceImage } from '../api';
import { PortfolioGrid } from './Portfolio';
import { DecorationGrid } from './DecorationThemes';
import { MakeupGrid } from './MakeupLooks';
import { TransportGrid } from './TransportOptions';
import { PriestGrid } from './PriestServices';
import { GiftGrid } from './ReturnGifts';
import { GenericCategoryGrid } from './CategoryOptions';
import { CustomRequestBox } from './CateringMenu';
import { getVendorCoverImage } from './vendorUtils';

// Category-appropriate name for the "Services" tab (the vendor's list of
// offered, priced options). e.g. a Catering vendor's options ARE their menu, a
// Transport vendor's are vehicles, a Priest's are rituals. Falls back to
// "Services" for anything not listed.
const SERVICES_TAB_LABEL: Record<string, string> = {
  Catering: 'Menu',
  Decoration: 'Decor Options',
  'Makeup & Beauty': 'Beauty Services',
  Media: 'Shoots & Coverage',
  Transport: 'Vehicles',
  'Pujari/Priest': 'Rituals',
  Invitation: 'Invite Options',
  Printing: 'Print Items',
  'Return Gifts': 'Gift Options',
  Entertainment: 'Acts & Shows',
  'Music/DJ': 'Music Options',
  Lighting: 'Lighting Options',
  Flowers: 'Floral Options',
  Mehendi: 'Mehendi Designs',
  'Event Host/Anchor': 'Hosting Services',
  Security: 'Security Services',
  Cleaning: 'Cleaning Services',
  'Rental Equipment': 'Rental Items',
  'Utensils for Rent': 'Utensil Items',
  'Wedding Planner': 'Planning Services',
  'Corporate Event Services': 'Corporate Services',
};
const servicesTabLabel = (category: string) => SERVICES_TAB_LABEL[category] ?? 'Services';

const isVideoUrl = (url: string | null) => {
  if (!url) return false;
  const cleanUrl = url.toLowerCase().split('?')[0].split('#')[0];
  return (
    cleanUrl.endsWith('.mp4') ||
    cleanUrl.endsWith('.webm') ||
    cleanUrl.endsWith('.ogg') ||
    cleanUrl.endsWith('.mov') ||
    cleanUrl.endsWith('.m4v')
  );
};

interface VendorDetailModalProps {
  vendor: Vendor;
  onClose: () => void;
  // Whether a customer is signed in — uploading reference images requires it.
  isAuthenticated?: boolean;
  // Opens the sign-in modal when a guest tries an action that needs an account.
  onRequireAuth?: () => void;
  onBookVendor: (
    vendor: Vendor,
    packageId?: string,
    price?: number,
    notes?: string,
    eventDate?: string,
    selectedOptions?: string[],
    referenceImages?: string[]
  ) => void;
}

export const VendorDetailModal: React.FC<VendorDetailModalProps> = ({ vendor: initialVendor, onClose, onBookVendor, isAuthenticated, onRequireAuth }) => {
  // Start from whatever the marketplace list had cached, then refresh with
  // the live record so vendor-side edits (new availability dates, packages,
  // gallery, options) show up immediately instead of only after a full page
  // reload of the marketplace.
  const [vendor, setVendor] = useState(initialVendor);
  useEffect(() => {
    setVendor(initialVendor);
    fetchVendorById(initialVendor.id)
      .then((res) => {
        if (res.data?.vendor) setVendor(res.data.vendor);
      })
      .catch(() => {
        /* keep showing the cached vendor if the refresh fails */
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialVendor.id]);

  const [activeTab, setActiveTab] = useState<'overview' | 'portfolio' | 'themes' | 'looks' | 'fleet' | 'ceremonies' | 'gifts' | 'options' | 'services' | 'amenities' | 'packages' | 'gallery' | 'upload'>('overview');
  const isDecoration = vendor.category === 'Decoration';
  const isMakeup = vendor.category === 'Makeup & Beauty';
  const isTransport = vendor.category === 'Transport';
  const isPriest = vendor.category === 'Pujari/Priest';
  const isReturnGifts = vendor.category === 'Return Gifts';
  // Categories with their own real data model (Venue's structured facilities)
  // or an existing bespoke tab above are excluded; everything else gets the
  // generic CATEGORY_OPTIONS-driven tab.
  const isGenericOptions = vendor.category !== 'Venue'
    && !isDecoration && !isMakeup && !isTransport && !isPriest && !isReturnGifts;
  // Service-type options the customer picks off whichever category grid is
  // showing (Portfolio styles, Decoration themes, Photography types, etc.) —
  // works the same way for every category since it's just a list of labels.
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const toggleOption = (title: string) => {
    setSelectedOptions((prev) => (prev.includes(title) ? prev.filter((x) => x !== title) : [...prev, title]));
  };

  // Decoration themes can be picked as a plain theme OR at a specific budget
  // tier ("Royal Mandap — Premium (₹1,75,000)"). These helpers keep only one
  // entry per theme so a chosen tier replaces the plain pick and vice-versa.
  const toggleTheme = (title: string) => {
    setSelectedOptions((prev) => {
      const has = prev.some((o) => o === title || o.startsWith(`${title} — `));
      if (has) return prev.filter((o) => o !== title && !o.startsWith(`${title} — `));
      return [...prev, title];
    });
  };
  const pickThemeTier = (label: string) => {
    const title = label.split(' — ')[0];
    setSelectedOptions((prev) => [
      ...prev.filter((o) => o !== title && !o.startsWith(`${title} — `)),
      label,
    ]);
  };

  // Priced rate options the vendor listed under their amenities (AC room, VIP
  // chairs, …). They live in offeredOptionItems under the amenity label, so
  // they're the entries not already surfaced as "Services Offered" options.
  // Shown as their own selectable tab so customers can pick specific rates.
  const offeredSet = new Set(vendor.offeredOptions || []);
  const amenityRateGroups = Object.entries(vendor.offeredOptionItems || {}).filter(
    ([key, list]) => !offeredSet.has(key) && Array.isArray(list) && list.length > 0
  );
  const hasAmenityRates = amenityRateGroups.length > 0;
  const hasServices = (vendor.offeredOptions || []).length > 0;
  // A stable, human-readable label used as the selection key — it's what the
  // vendor sees on the booking, so it must fully describe the picked rate.
  const rateOptionLabel = (group: string, item: { name: string; price?: number; note?: string }) =>
    `${group}: ${item.name}${item.price ? ` — ₹${item.price.toLocaleString('en-IN')}` : ''}${item.note ? ` (${item.note})` : ''}`;

  // Free-text request tied to this specific vendor — travels with the
  // booking as specialInstructions, so it actually reaches the vendor
  // (unlike the old marketplace-level boxes, which only ever saved locally).
  const requestKey = `magizh_vendor_request_${vendor.id}`;
  const [customRequest, setCustomRequest] = useState('');
  useEffect(() => {
    try {
      setCustomRequest(localStorage.getItem(requestKey) ?? '');
    } catch {
      /* ignore storage errors */
    }
  }, [requestKey]);

  // No package is pre-selected — the customer must actively pick one (and can
  // click it again to deselect). Undefined means "no package, use starting price".
  const [selectedPkgId, setSelectedPkgId] = useState<string | undefined>(undefined);
  // Which price tier (if any) the customer chose within each package, keyed by
  // package id. The chosen tier's price is used for the booking.
  const [selectedTierByPkg, setSelectedTierByPkg] = useState<Record<string, { name: string; price: number }>>({});
  const hasFixedAvailability = (vendor.availableDates?.length ?? 0) > 0;
  const [selectedEventDate, setSelectedEventDate] = useState(hasFixedAvailability ? vendor.availableDates[0] : '');

  // "Book & Pay Advance" opens a small panel showing exactly what this
  // vendor's advance requirement comes to in rupees, a way to call the
  // vendor directly, and an explicit Confirm Order action.
  const [advancePanelOpen, setAdvancePanelOpen] = useState(false);
  const [upiCopied, setUpiCopied] = useState(false);
  const copyUpiId = () => {
    if (!vendor.upiId) return;
    navigator.clipboard.writeText(vendor.upiId).then(() => {
      setUpiCopied(true);
      setTimeout(() => setUpiCopied(false), 2000);
    });
  };

  // The vendor's uploaded QR is a static image, but we present each customer
  // with a fresh, time-limited "payment session": a unique reference code and
  // a 5-minute countdown. When the window runs out, a new session (new ref +
  // reset timer) is generated automatically so a stale QR is never left on
  // screen; the same happens once an order is confirmed, retiring the QR the
  // customer just paid against.
  const QR_VALIDITY_MS = 5 * 60 * 1000;
  const [qrRef, setQrRef] = useState('');
  const [qrExpiresAt, setQrExpiresAt] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(0);

  const generateQrRef = () =>
    `PAY-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

  const startNewQrSession = () => {
    setQrRef(generateQrRef());
    setQrExpiresAt(Date.now() + QR_VALIDITY_MS);
  };

  // Start a fresh QR session whenever the pay panel is opened.
  useEffect(() => {
    if (advancePanelOpen) startNewQrSession();
  }, [advancePanelOpen]);

  // Tick the countdown once per second while the panel is open; when it hits
  // zero, roll straight into a new session (auto-regenerate).
  useEffect(() => {
    if (!advancePanelOpen || !qrExpiresAt) return;
    const tick = () => {
      const remaining = Math.max(0, Math.round((qrExpiresAt - Date.now()) / 1000));
      setSecondsLeft(remaining);
      if (remaining <= 0) startNewQrSession();
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [advancePanelOpen, qrExpiresAt]);

  const countdownLabel = `${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, '0')}`;

  const [selectedImage, setSelectedImage] = useState(getVendorCoverImage(vendor));
  useEffect(() => {
    setSelectedImage(getVendorCoverImage(vendor));
  }, [vendor]);
  // Full-screen preview of a gallery image when the customer taps it.
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState('');
  // Reference images the customer uploads for this vendor — these travel with
  // the booking so the vendor sees exactly what the customer wants.
  const [customerUploads, setCustomerUploads] = useState<string[]>([]);

  const handleLocalUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Uploading attaches images to a booking, which needs an account. Prompt a
    // guest to sign in instead of failing with a raw "Authentication required".
    if (!isAuthenticated) {
      e.target.value = '';
      setUploadSuccess('Please sign in first to upload reference images.');
      onRequireAuth?.();
      return;
    }

    setUploading(true);
    setUploadSuccess('');
    try {
      const fileUrl = await uploadReferenceImage(file);
      setCustomerUploads((prev) => [...prev, fileUrl]);
      setUploadSuccess('File uploaded — it will be shared with the vendor when you book.');
    } catch (err: any) {
      setUploadSuccess(err?.message || 'Upload failed — please try again.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const removeUpload = (url: string) => setCustomerUploads((prev) => prev.filter((u) => u !== url));

  const selectedPkg = vendor.packages.find((p) => p.id === selectedPkgId);
  // The tier the customer chose within the selected package (if any) — its
  // price overrides the package's flat price for the booking.
  const chosenTier = selectedPkgId ? selectedTierByPkg[selectedPkgId] : undefined;
  const effectivePkgPrice = chosenTier?.price ?? selectedPkg?.price;

  const pickPkgTier = (pkg: typeof vendor.packages[number], tier: { name: string; price: number }) => {
    setSelectedPkgId(pkg.id);
    setSelectedTierByPkg((prev) => ({ ...prev, [pkg.id]: tier }));
  };

  // Vendors without packages set up yet still have a startingPrice — fall
  // back to that as the reference total so the advance isn't computed
  // against a nonexistent ₹0 package price.
  const referencePrice = effectivePkgPrice || vendor.startingPrice || 0;

  // A flat advanceAmount the vendor set overrides the percentage-based calc.
  const flatAdvance = vendor.policies.advanceAmount;
  const advanceIsFlat = typeof flatAdvance === 'number' && flatAdvance > 0;
  const advanceAmountDue = advanceIsFlat
    ? (referencePrice > 0 ? Math.min(flatAdvance!, referencePrice) : flatAdvance!)
    : Math.round((referencePrice * vendor.policies.advancePercentage) / 100);
  const advanceLabel = advanceIsFlat ? 'Advance required' : `Advance required (${vendor.policies.advancePercentage}%)`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="glass-card max-w-4xl w-full rounded-3xl border border-slate-800 shadow-2xl overflow-hidden my-8 max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div>
            <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">{vendor.category}</span>
            <h2 className="font-display font-bold text-2xl text-white">{vendor.businessName}</h2>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center gap-4 px-6 border-b border-slate-800 bg-slate-950/50">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-3 font-semibold text-xs border-b-2 transition-colors ${
              activeTab === 'overview' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            Overview
          </button>

          {isDecoration && (
            <button
              onClick={() => setActiveTab('themes')}
              className={`py-3 font-semibold text-xs border-b-2 transition-colors flex items-center gap-1 ${
                activeTab === 'themes' ? 'border-pink-500 text-pink-400' : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" /> Themes
            </button>
          )}

          {isMakeup && (
            <button
              onClick={() => setActiveTab('looks')}
              className={`py-3 font-semibold text-xs border-b-2 transition-colors flex items-center gap-1 ${
                activeTab === 'looks' ? 'border-rose-500 text-rose-400' : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" /> Looks
            </button>
          )}

          {isTransport && (
            <button
              onClick={() => setActiveTab('fleet')}
              className={`py-3 font-semibold text-xs border-b-2 transition-colors flex items-center gap-1 ${
                activeTab === 'fleet' ? 'border-sky-500 text-sky-400' : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <Bus className="w-3.5 h-3.5" /> Fleet
            </button>
          )}

          {isPriest && (
            <button
              onClick={() => setActiveTab('ceremonies')}
              className={`py-3 font-semibold text-xs border-b-2 transition-colors flex items-center gap-1 ${
                activeTab === 'ceremonies' ? 'border-amber-500 text-amber-400' : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <Flame className="w-3.5 h-3.5" /> Ceremonies
            </button>
          )}

          {isReturnGifts && (
            <button
              onClick={() => setActiveTab('gifts')}
              className={`py-3 font-semibold text-xs border-b-2 transition-colors flex items-center gap-1 ${
                activeTab === 'gifts' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <Gift className="w-3.5 h-3.5" /> Gifts
            </button>
          )}

          {isGenericOptions && (
            <button
              onClick={() => setActiveTab('options')}
              className={`py-3 font-semibold text-xs border-b-2 transition-colors flex items-center gap-1 ${
                activeTab === 'options' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" /> Options
            </button>
          )}

          {hasServices && (
            <button
              onClick={() => setActiveTab('services')}
              className={`py-3 font-semibold text-xs border-b-2 transition-colors flex items-center gap-1 ${
                activeTab === 'services' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <ListChecks className="w-3.5 h-3.5" /> {servicesTabLabel(vendor.category)}
            </button>
          )}

          {hasAmenityRates && (
            <button
              onClick={() => setActiveTab('amenities')}
              className={`py-3 font-semibold text-xs border-b-2 transition-colors flex items-center gap-1 ${
                activeTab === 'amenities' ? 'border-amber-500 text-amber-400' : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <ListChecks className="w-3.5 h-3.5" /> Amenity Options
            </button>
          )}

          <button
            onClick={() => setActiveTab('packages')}
            className={`py-3 font-semibold text-xs border-b-2 transition-colors ${
              activeTab === 'packages' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            {vendor.category === 'Venue' ? 'Halls' : 'Packages'} ({vendor.packages.length})
          </button>

          <button
            onClick={() => setActiveTab('gallery')}
            className={`py-3 font-semibold text-xs border-b-2 transition-colors ${
              activeTab === 'gallery' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            Gallery ({vendor.galleryImages.length + (vendor.galleryVideos?.length ?? 0)})
          </button>

          <button
            onClick={() => setActiveTab('upload')}
            className={`py-3 font-semibold text-xs border-b-2 transition-colors flex items-center gap-1 ${
              activeTab === 'upload' ? 'border-amber-500 text-amber-400' : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Upload className="w-3.5 h-3.5" /> Local Disk Upload
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="h-72 w-full rounded-2xl overflow-hidden bg-slate-900 relative">
                <img src={selectedImage} alt={vendor.businessName} className="w-full h-full object-cover" />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
                  <span className="text-xs text-slate-400 block">Rating</span>
                  <span className="text-lg font-bold text-amber-400 flex items-center gap-1 mt-1">
                    <Star className="w-4 h-4 fill-amber-400" /> {vendor.ratingAverage} ({vendor.reviewCount})
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
                  <span className="text-xs text-slate-400 block">Experience</span>
                  <span className="text-lg font-bold text-white mt-1 block">{vendor.yearsOfExperience} Years</span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
                  <span className="text-xs text-slate-400 block">Starting Price</span>
                  <span className="text-lg font-bold text-emerald-400 mt-1 block">₹{vendor.startingPrice.toLocaleString('en-IN')}</span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
                  <span className="text-xs text-slate-400 block">Advance Required</span>
                  <span className="text-lg font-bold text-indigo-400 mt-1 block">
                    {advanceIsFlat ? `₹${flatAdvance!.toLocaleString('en-IN')}` : `${vendor.policies.advancePercentage}%`}
                  </span>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800/80">
                <h4 className="font-bold text-sm text-white mb-2">About {vendor.businessName}</h4>
                <p className="text-slate-300 text-sm leading-relaxed">{vendor.description}</p>
                <div className="mt-4 flex items-center gap-2 text-xs text-slate-400">
                  <MapPin className="w-4 h-4 text-indigo-400" />
                  <span>{vendor.location.address}, {vendor.location.city}, {vendor.location.state} - {vendor.location.pincode}</span>
                </div>

                {/* Return Gifts vendors: pieces per order + any bulk discount. */}
                {isReturnGifts && (vendor.giftCount || vendor.giftDiscount) && (
                  <div className="mt-4 pt-4 border-t border-slate-800/80 flex flex-wrap gap-2">
                    {!!vendor.giftCount && (
                      <span className="text-xs px-3 py-1.5 rounded-full bg-indigo-600/15 border border-indigo-500/30 text-indigo-200 font-semibold">
                        🎁 {vendor.giftCount} gifts per order
                      </span>
                    )}
                    {vendor.giftDiscount && (
                      <span className="text-xs px-3 py-1.5 rounded-full bg-emerald-600/15 border border-emerald-500/30 text-emerald-200 font-semibold">
                        Discount: {vendor.giftDiscount}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'options' && (
            <GenericCategoryGrid
              category={vendor.category}
              selected={selectedOptions}
              onToggle={toggleOption}
              optionItems={vendor.offeredOptionItems}
              offeredOptionImages={vendor.offeredOptionImages}
            />
          )}

          {activeTab === 'services' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-400">
                Pick what you want — tap to select, and it's added to your booking request.
              </p>
              {(vendor.offeredOptions || []).map((o) => {
                const price = vendor.offeredOptionPrices?.[o];
                const items = vendor.offeredOptionItems?.[o] || [];
                const optionQuality = vendor.offeredOptionQuality?.[o];
                const optionImages = vendor.offeredOptionImages?.[o] || [];
                return (
                  <div key={o} className="rounded-2xl bg-slate-900/40 border border-slate-800 p-4">
                    <div className="flex items-center gap-2 mb-2.5 flex-wrap">
                      <h4 className="text-sm font-bold text-indigo-300">{o}</h4>
                      {optionQuality && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 font-semibold">{optionQuality}</span>
                      )}
                      {!!price && <span className="text-xs text-amber-400 font-semibold">from ₹{price.toLocaleString('en-IN')}</span>}
                    </div>
                    {optionImages.length > 0 && (
                      <div className="flex gap-2 overflow-x-auto pb-1 mb-3">
                        {optionImages.map((url) => (
                          <img
                            key={url}
                            src={url}
                            alt={o}
                            onClick={() => setLightboxImage(url)}
                            className="h-24 w-32 object-cover rounded-lg border border-slate-800 cursor-pointer hover:border-indigo-400 shrink-0"
                          />
                        ))}
                      </div>
                    )}
                    {items.length > 0 ? (
                      <div className="space-y-2">
                        {items.map((item, i) => {
                          const key = rateOptionLabel(o, item);
                          const picked = selectedOptions.includes(key);
                          return (
                            <button
                              key={i}
                              type="button"
                              onClick={() => toggleOption(key)}
                              className={`w-full flex items-center justify-between gap-3 p-3 rounded-xl border text-left transition-colors ${
                                picked ? 'bg-emerald-500/15 border-emerald-500/50' : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                              }`}
                            >
                              <span className="flex items-center gap-2.5 text-sm text-slate-200">
                                <span className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                                  picked ? 'bg-emerald-500 border-emerald-500' : 'border-slate-600'
                                }`}>
                                  {picked && <Check className="w-3 h-3 text-slate-950" />}
                                </span>
                                {item.photo && (
                                  <img
                                    src={item.photo}
                                    alt={item.name}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setLightboxImage(item.photo!);
                                    }}
                                    className="h-10 w-10 object-cover rounded-lg border border-slate-800 shrink-0 cursor-zoom-in"
                                  />
                                )}
                                <span>
                                  {item.name}
                                  {item.note && <span className="text-slate-500 text-xs"> · {item.note}</span>}
                                </span>
                              </span>
                              <span className="text-emerald-400 font-semibold text-sm shrink-0">₹{(item.price ?? 0).toLocaleString('en-IN')}</span>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      // No priced items — the whole service is selectable on its own.
                      <button
                        type="button"
                        onClick={() => toggleOption(o)}
                        className={`w-full flex items-center gap-2.5 p-3 rounded-xl border text-left text-sm transition-colors ${
                          selectedOptions.includes(o) ? 'bg-emerald-500/15 border-emerald-500/50 text-slate-200' : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <span className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                          selectedOptions.includes(o) ? 'bg-emerald-500 border-emerald-500' : 'border-slate-600'
                        }`}>
                          {selectedOptions.includes(o) && <Check className="w-3 h-3 text-slate-950" />}
                        </span>
                        Select this service
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === 'amenities' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-400">
                Pick the amenity options you want — tap to select, and they're added to your booking request.
              </p>
              {amenityRateGroups.map(([group, list]) => (
                <div key={group} className="rounded-2xl bg-slate-900/40 border border-slate-800 p-4">
                  <h4 className="text-sm font-bold text-amber-300 mb-2.5">{group}</h4>
                  <div className="space-y-2">
                    {list.map((item, i) => {
                      const key = rateOptionLabel(group, item);
                      const picked = selectedOptions.includes(key);
                      return (
                        <button
                          key={i}
                          type="button"
                          onClick={() => toggleOption(key)}
                          className={`w-full flex items-center justify-between gap-3 p-3 rounded-xl border text-left transition-colors ${
                            picked ? 'bg-emerald-500/15 border-emerald-500/50' : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <span className="flex items-center gap-2.5 text-sm text-slate-200">
                            <span className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                              picked ? 'bg-emerald-500 border-emerald-500' : 'border-slate-600'
                            }`}>
                              {picked && <Check className="w-3 h-3 text-slate-950" />}
                            </span>
                            <span>
                              {item.name}
                              {item.note && <span className="text-slate-500 text-xs"> · {item.note}</span>}
                            </span>
                          </span>
                          <span className="text-emerald-400 font-semibold text-sm shrink-0">₹{(item.price ?? 0).toLocaleString('en-IN')}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}


          {activeTab === 'themes' && <DecorationGrid selected={selectedOptions} onToggle={toggleTheme} onPickTier={pickThemeTier} />}

          {activeTab === 'looks' && <MakeupGrid selected={selectedOptions} onToggle={toggleTheme} onPickTier={pickThemeTier} />}

          {activeTab === 'fleet' && <TransportGrid selected={selectedOptions} onToggle={toggleTheme} onPickTier={pickThemeTier} />}

          {activeTab === 'ceremonies' && <PriestGrid selected={selectedOptions} onToggle={toggleTheme} onPickTier={pickThemeTier} />}

          {activeTab === 'gifts' && (
            <div className="space-y-4">
              {(vendor.giftCount != null || vendor.giftDiscount) && (
                <div className="flex flex-wrap gap-3">
                  {vendor.giftCount != null && (
                    <div className="flex-1 min-w-[140px] p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Count of gifts</span>
                      <span className="text-lg font-bold text-white">{vendor.giftCount} pieces</span>
                    </div>
                  )}
                  {vendor.giftDiscount && (
                    <div className="flex-1 min-w-[140px] p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                      <span className="text-[10px] text-emerald-300 uppercase font-bold block">Discount</span>
                      <span className="text-sm font-semibold text-emerald-200">{vendor.giftDiscount}</span>
                    </div>
                  )}
                </div>
              )}
              <GiftGrid selected={selectedOptions} onToggle={toggleTheme} onPickTier={pickThemeTier} />
            </div>
          )}

          {activeTab === 'packages' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {vendor.packages.map((pkg) => (
                <div
                  key={pkg.id}
                  onClick={() => setSelectedPkgId((cur) => (cur === pkg.id ? undefined : pkg.id))}
                  className={`p-5 rounded-2xl border cursor-pointer transition-all ${
                    selectedPkgId === pkg.id
                      ? 'bg-indigo-950/40 border-indigo-500 shadow-lg shadow-indigo-500/10'
                      : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {vendor.category === 'Security' ? (
                    <>
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-white text-base flex items-center gap-2">
                          <span className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                            selectedPkgId === pkg.id ? 'bg-indigo-500 border-indigo-500' : 'border-slate-600'
                          }`}>
                            {selectedPkgId === pkg.id && <Check className="w-3 h-3 text-white" />}
                          </span>
                          {pkg.packageName}
                        </h4>
                      </div>
                      {selectedPkgId === pkg.id && (
                        <span className="inline-block mt-2 text-[10px] font-bold uppercase text-indigo-300 bg-indigo-500/15 px-2 py-0.5 rounded-full">Selected</span>
                      )}

                      <div className="mt-4 space-y-1.5 text-xs border-t border-slate-800/80 pt-3">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Cost per person:</span>
                          <span className="font-bold text-amber-400">₹{pkg.price.toLocaleString('en-IN')}</span>
                        </div>
                        {pkg.capacityPersons !== undefined && (
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">Availability of persons:</span>
                            <span className="font-bold text-white">{pkg.capacityPersons} guards</span>
                          </div>
                        )}
                      </div>
                    </>
                  ) : vendor.category === 'Catering' ? (
                    <>
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-white text-base flex items-center gap-2">
                          <span className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                            selectedPkgId === pkg.id ? 'bg-indigo-500 border-indigo-500' : 'border-slate-600'
                          }`}>
                            {selectedPkgId === pkg.id && <Check className="w-3 h-3 text-white" />}
                          </span>
                          {pkg.packageName}
                        </h4>
                        <span className="font-display font-extrabold text-amber-400 text-base shrink-0">
                          ₹{pkg.price.toLocaleString('en-IN')} / plate
                        </span>
                      </div>
                      {selectedPkgId === pkg.id && (
                        <span className="inline-block mt-2 text-[10px] font-bold uppercase text-indigo-300 bg-indigo-500/15 px-2 py-0.5 rounded-full">Selected</span>
                      )}
                      {pkg.description && (
                        <p className="text-xs text-slate-400 mt-3 border-t border-slate-800/80 pt-3">{pkg.description}</p>
                      )}
                      {pkg.images && pkg.images.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-slate-800/80" onClick={(e) => e.stopPropagation()}>
                          <span className="text-[10px] font-bold text-slate-400 uppercase block mb-2">Menu Card / Photos</span>
                          <div className="flex gap-2 overflow-x-auto pb-1">
                            {pkg.images.map((img, idx) => (
                              <div
                                key={idx}
                                onClick={() => setLightboxImage(img)}
                                className="relative group w-20 h-24 rounded-lg overflow-hidden border border-slate-800 hover:border-indigo-400 cursor-pointer shrink-0 bg-slate-950"
                              >
                                <img src={img} alt={`Menu Page ${idx + 1}`} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                  <span className="text-[10px] font-bold text-white uppercase bg-slate-900/90 px-1.5 py-0.5 rounded">Zoom</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {pkg.tiers && pkg.tiers.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-slate-800/80" onClick={(e) => e.stopPropagation()}>
                          <span className="text-[10px] font-bold text-slate-400 uppercase block mb-2">Choose serving option</span>
                          <div className="grid grid-cols-1 gap-2">
                            {pkg.tiers.map((t, ti) => {
                              const picked = selectedPkgId === pkg.id && chosenTier?.name === t.name && chosenTier?.price === t.price;
                              return (
                                <button
                                  key={ti}
                                  type="button"
                                  onClick={() => pickPkgTier(pkg, t)}
                                  className={`flex items-center justify-between gap-3 p-2.5 rounded-xl border text-left transition-colors ${
                                    picked ? 'bg-emerald-500/15 border-emerald-500/50' : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                                  }`}
                                >
                                  <span className="flex items-center gap-2 text-sm text-slate-200">
                                    <span className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                                      picked ? 'bg-emerald-500 border-emerald-500' : 'border-slate-600'
                                    }`}>
                                      {picked && <Check className="w-3 h-3 text-slate-950" />}
                                    </span>
                                    {t.name || 'Option'}
                                  </span>
                                  <span className="text-emerald-400 font-semibold text-sm shrink-0">₹{(t.price ?? 0).toLocaleString('en-IN')}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-white text-base flex items-center gap-2">
                          <span className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                            selectedPkgId === pkg.id ? 'bg-indigo-500 border-indigo-500' : 'border-slate-600'
                          }`}>
                            {selectedPkgId === pkg.id && <Check className="w-3 h-3 text-white" />}
                          </span>
                          {pkg.packageName}
                        </h4>
                        <span className="font-display font-extrabold text-amber-400 text-lg">
                          ₹{pkg.price.toLocaleString('en-IN')}
                        </span>
                      </div>
                      {selectedPkgId === pkg.id && (
                        <span className="inline-block mt-2 text-[10px] font-bold uppercase text-indigo-300 bg-indigo-500/15 px-2 py-0.5 rounded-full">Selected</span>
                      )}

                      <p className="text-xs text-slate-400 mt-2">{pkg.description}</p>

                      {/* Hall / Package Photos */}
                      {pkg.images && pkg.images.length > 0 && (
                        <div className="space-y-1.5 mt-3 mb-3">
                          <div className="h-36 w-full rounded-xl overflow-hidden bg-slate-950 relative">
                            <img src={pkg.images[0]} alt={pkg.packageName} className="w-full h-full object-cover" />
                          </div>
                          {pkg.images.length > 1 && (
                            <div className="flex gap-1.5 overflow-x-auto pb-1">
                              {pkg.images.map((img, idx) => (
                                <img
                                  key={idx}
                                  src={img}
                                  alt={`pkg-${idx}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setLightboxImage(img);
                                  }}
                                  className="h-10 w-14 object-cover rounded border border-slate-800 hover:border-indigo-400 cursor-pointer shrink-0"
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      <ul className="mt-4 space-y-2">
                        {pkg.includedServices.map((svc, i) => (
                          <li key={i} className="text-xs text-slate-300 flex items-center gap-2">
                            <Check className="w-3.5 h-3.5 text-emerald-400" /> {svc}
                          </li>
                        ))}
                      </ul>

                      {/* Vendor-defined price tiers — pick one; its price is used. */}
                      {pkg.tiers && pkg.tiers.length > 0 && (
                        <div className="mt-4 pt-3 border-t border-slate-800/80" onClick={(e) => e.stopPropagation()}>
                          <span className="text-[10px] font-bold text-slate-400 uppercase block mb-2">Choose a tier</span>
                          <div className="grid grid-cols-1 gap-2">
                            {pkg.tiers.map((t, ti) => {
                              const picked = selectedPkgId === pkg.id && chosenTier?.name === t.name && chosenTier?.price === t.price;
                              return (
                                <button
                                  key={ti}
                                  type="button"
                                  onClick={() => pickPkgTier(pkg, t)}
                                  className={`flex items-center justify-between gap-3 p-2.5 rounded-xl border text-left transition-colors ${
                                    picked ? 'bg-emerald-500/15 border-emerald-500/50' : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                                  }`}
                                >
                                  <span className="flex items-center gap-2 text-sm text-slate-200">
                                    <span className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                                      picked ? 'bg-emerald-500 border-emerald-500' : 'border-slate-600'
                                    }`}>
                                      {picked && <Check className="w-3 h-3 text-slate-950" />}
                                    </span>
                                    {t.name || 'Tier'}
                                  </span>
                                  <span className="text-emerald-400 font-semibold text-sm shrink-0">₹{(t.price ?? 0).toLocaleString('en-IN')}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

          {activeTab === 'gallery' && (
            <div className="space-y-4">
              {(vendor.galleryVideos ?? []).map((vid, i) => (
                <div key={i} className="relative rounded-2xl overflow-hidden border border-slate-800 bg-black">
                  <video
                    src={vid}
                    controls
                    autoPlay
                    muted
                    loop
                    playsInline
                    className="w-full max-h-80 object-cover bg-black"
                  />
                  <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-slate-950/80 text-white text-[11px] font-semibold">
                    ▶ Video
                  </span>
                </div>
              ))}

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {vendor.galleryImages.map((img, idx) => (
                  <div
                    key={idx}
                    onClick={() => { setSelectedImage(img); setLightboxImage(img); }}
                    className="h-40 rounded-xl overflow-hidden bg-slate-900 border border-slate-800 cursor-pointer hover:border-indigo-500 transition-colors"
                  >
                    <img src={img} alt={`Gallery ${idx}`} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'upload' && (
            <div className="p-8 rounded-2xl bg-slate-900/60 border border-slate-800 text-center max-w-lg mx-auto">
              <Upload className="w-12 h-12 text-indigo-400 mx-auto mb-4" />
              <h4 className="font-bold text-lg text-white">Share reference files</h4>
              <p className="text-xs text-slate-400 mt-2 mb-6">
                Upload photos or videos of what you want (a decoration style, a setup you like). They're attached to your booking, so <span className="text-amber-400 font-semibold">{vendor.businessName}</span> sees exactly what you're expecting after you confirm and pay the advance.
              </p>

              <label className="cursor-pointer inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-lg transition-all">
                <span>{uploading ? 'Uploading…' : 'Select Image/Video to Upload'}</span>
                <input type="file" accept="image/*,video/*" onChange={handleLocalUpload} className="hidden" disabled={uploading} />
              </label>

              {uploadSuccess && <p className="text-xs text-emerald-400 mt-4 font-semibold">{uploadSuccess}</p>}

              {customerUploads.length > 0 && (
                <>
                  <p className="text-[11px] text-slate-400 uppercase font-bold mt-6 mb-2 text-left">Your uploads ({customerUploads.length})</p>
                  <div className="grid grid-cols-3 gap-2">
                    {customerUploads.map((url) => (
                      <div key={url} className="relative group">
                        {isVideoUrl(url) ? (
                          <div className="relative h-24 w-full rounded-lg border border-slate-800 overflow-hidden bg-black flex items-center justify-center">
                            <video src={url} className="w-full h-full object-cover" preload="metadata" />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/40 cursor-pointer" onClick={() => setLightboxImage(url)}>
                              <span className="text-white text-lg">▶</span>
                            </div>
                          </div>
                        ) : (
                          <img
                            src={url}
                            alt="Reference"
                            onClick={() => setLightboxImage(url)}
                            className="h-24 w-full object-cover rounded-lg border border-slate-800 cursor-pointer"
                          />
                        )}
                        <button
                          type="button"
                          onClick={() => removeUpload(url)}
                          aria-label="Remove"
                          className="absolute top-1 right-1 w-6 h-6 rounded-full bg-slate-950/80 text-slate-300 hover:text-rose-400 flex items-center justify-center"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

        </div>

        {/* Availability date picker lives only on the Gallery tab (not repeated
            under every tab) — same for every vendor. */}
        {activeTab === 'gallery' && (hasFixedAvailability || (vendor.bookedDates?.length ?? 0) > 0) && (
          <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/60">
            <span className="text-[11px] font-bold text-slate-400 uppercase flex items-center gap-1.5 mb-2">
              <CalendarIcon className="w-3.5 h-3.5 text-indigo-400" /> {vendor.businessName} is only open on these dates — pick one to book
            </span>
            <div className="flex flex-wrap gap-2">
              {vendor.availableDates.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setSelectedEventDate(d)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                    selectedEventDate === d
                      ? 'bg-indigo-600 border-indigo-600 text-white'
                      : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white hover:border-indigo-500/50'
                  }`}
                >
                  {new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </button>
              ))}
              {/* Already-booked dates — visible but not selectable. */}
              {(vendor.bookedDates ?? []).map((d) => (
                <span
                  key={d}
                  className="px-3 py-1.5 rounded-full text-xs font-semibold border border-slate-800 bg-slate-950 text-slate-600 line-through cursor-not-allowed flex items-center gap-1"
                  title="This date is already booked"
                >
                  {new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  <span className="not-italic no-underline text-[9px] text-rose-400 font-bold">BOOKED</span>
                </span>
              ))}
            </div>
            {vendor.availableDates.length === 0 && (vendor.bookedDates?.length ?? 0) > 0 && (
              <p className="text-[11px] text-amber-400 mt-2">All listed dates are booked — check back or contact the vendor for other dates.</p>
            )}
          </div>
        )}

        {/* Special request lives only on the Overview tab, for every vendor. */}
        {activeTab === 'overview' && (
          <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/60">
            <h4 className="text-xs font-bold text-slate-400 uppercase mb-3">Special Request (optional)</h4>
            <CustomRequestBox
              storageKey={requestKey}
              onSaved={setCustomRequest}
              triggerLabel={`Write a request for ${vendor.businessName}`}
              label={`Tell ${vendor.businessName} exactly what you want`}
            />
            <p className="text-[11px] text-slate-500">This is shared with {vendor.businessName} along with your booking.</p>
          </div>
        )}

        {selectedOptions.length > 0 && ['themes', 'looks', 'fleet', 'ceremonies', 'gifts', 'options', 'services', 'amenities'].includes(activeTab) && (
          <div className="px-6 py-4 border-t border-slate-800 bg-emerald-950/20">
            <div className="flex items-center justify-between mb-2">
              <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-300 uppercase">
                <ListChecks className="w-3.5 h-3.5" /> Your Selected Options
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {selectedOptions.map((opt) => (
                <span
                  key={opt}
                  className="flex items-center gap-1.5 pl-3 pr-2 py-1.5 rounded-full bg-emerald-600/20 border border-emerald-500/40 text-emerald-200 text-xs font-semibold"
                >
                  {opt}
                  <button
                    type="button"
                    onClick={() => toggleOption(opt)}
                    aria-label={`Remove ${opt}`}
                    className="w-4 h-4 rounded-full flex items-center justify-center hover:bg-emerald-500/40 hover:text-white transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/80 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            {/* The chosen package/hall summary lives on the Packages tab only, so
                each tab shows what belongs to it (options on the option tabs,
                the package here). Other tabs show a neutral booking summary so
                the Book button below is never orphaned. */}
            {activeTab === 'packages' ? (
              <>
                <span className="text-[11px] font-bold text-slate-400 uppercase">Selected {vendor.category === 'Venue' ? 'Hall' : 'Package'}</span>
                <div className="text-white font-bold text-sm">
                  {selectedPkg
                    ? <>{selectedPkg.packageName}{chosenTier ? ` — ${chosenTier.name}` : ''} — <span className="text-amber-400">₹{(effectivePkgPrice ?? 0).toLocaleString('en-IN')}{vendor.category === 'Security' ? ' per person' : vendor.category === 'Catering' && !chosenTier ? ' per plate' : ''}</span></>
                    : <span className="text-slate-400">No package — starting price ₹{(vendor.startingPrice || 0).toLocaleString('en-IN')}</span>}
                </div>
              </>
            ) : (
              <>
                <span className="text-[11px] font-bold text-slate-400 uppercase">Your Booking</span>
                <div className="text-white font-bold text-sm">
                  {selectedOptions.length > 0 || selectedPkg
                    ? `${selectedOptions.length + (selectedPkg ? 1 : 0)} selection${selectedOptions.length + (selectedPkg ? 1 : 0) === 1 ? '' : 's'} — ready to book`
                    : <span className="text-slate-400">Pick options or a package to book</span>}
                </div>
              </>
            )}
            {customRequest && (
              <div className="mt-1 flex items-center gap-1 text-[11px] text-emerald-400 font-semibold">
                <Check className="w-3 h-3" /> Your request will be shared with the vendor
              </div>
            )}
            {hasFixedAvailability && !selectedEventDate && (
              <div className="mt-1 flex items-center gap-1 text-[11px] text-rose-400 font-semibold">
                Pick an available date above to book
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={() => setAdvancePanelOpen(true)}
              disabled={hasFixedAvailability && !selectedEventDate}
              className="shine-sweep w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <CreditCard className="w-4 h-4" /> Book & Pay Advance
            </button>
          </div>
        </div>
      </div>

      {advancePanelOpen && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/90 backdrop-blur-sm p-4"
          onClick={() => setAdvancePanelOpen(false)}
        >
          <div
            className="glass-card w-full max-w-sm rounded-3xl border border-slate-800 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between">
              <h3 className="font-display font-bold text-lg text-white">Book & Pay Advance</h3>
              <button
                type="button"
                onClick={() => setAdvancePanelOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">{selectedPkg?.packageName || 'Starting Price'}</span>
                  <span className="text-white font-semibold">₹{referencePrice.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex items-center justify-between text-sm mt-2 pt-2 border-t border-slate-800">
                  <span className="text-slate-400">{advanceLabel}</span>
                  <span className="text-amber-400 font-bold">₹{advanceAmountDue.toLocaleString('en-IN')}</span>
                </div>
              </div>

              {(vendor.qrCodeImage || vendor.upiId) && (
                <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col items-center gap-3">
                  {vendor.qrCodeImage && (
                    <div className="relative">
                      <img
                        src={vendor.qrCodeImage}
                        alt={`${vendor.businessName} UPI QR code`}
                        className={`w-40 h-40 rounded-xl object-cover border border-slate-800 transition-opacity ${secondsLeft <= 0 ? 'opacity-30' : ''}`}
                      />
                      {secondsLeft <= 0 && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-[11px] font-semibold text-amber-400 bg-slate-950/80 px-2 py-1 rounded-lg">
                            Generating new QR…
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Live payment session: countdown + unique reference.
                      Only meaningful when there's an actual QR to scan, so it
                      is hidden for vendors that provide a UPI ID alone. */}
                  {vendor.qrCodeImage && (
                    <>
                      <div className="w-full flex items-center justify-between text-[11px]">
                        <span className={`flex items-center gap-1.5 font-semibold ${secondsLeft <= 30 ? 'text-red-400' : 'text-emerald-400'}`}>
                          <Clock className="w-3.5 h-3.5" />
                          Valid for {countdownLabel}
                        </span>
                        <button
                          type="button"
                          onClick={startNewQrSession}
                          className="flex items-center gap-1 text-slate-400 hover:text-white transition-colors"
                        >
                          <RefreshCw className="w-3 h-3" /> New QR
                        </button>
                      </div>
                      {qrRef && (
                        <span className="text-[10px] text-slate-500 font-mono tracking-wide">Ref: {qrRef}</span>
                      )}
                    </>
                  )}

                  {vendor.upiId && (
                    <button
                      type="button"
                      onClick={copyUpiId}
                      className="w-full py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-xs font-semibold flex items-center justify-between gap-2 transition-colors"
                    >
                      <span className="text-slate-400">UPI ID</span>
                      <span className="flex items-center gap-1.5">
                        {vendor.upiId}
                        {upiCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                      </span>
                    </button>
                  )}
                  <p className="text-[11px] text-slate-500 text-center">Scan or pay via UPI, then confirm your order below.</p>
                </div>
              )}

              {vendor.contactPhone && (
                <a
                  href={`tel:${vendor.contactPhone}`}
                  className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold text-sm shadow-md flex items-center justify-center gap-2 transition-colors"
                >
                  <Phone className="w-4 h-4" /> Call {vendor.contactPhone}
                </a>
              )}

              <button
                type="button"
                onClick={() => {
                  onBookVendor(
                    vendor,
                    selectedPkg?.id,
                    effectivePkgPrice,
                    customRequest || undefined,
                    selectedEventDate || undefined,
                    (() => {
                      // Include the chosen package tier so the vendor sees which
                      // tier (e.g. "…— Premium") the customer booked.
                      const tierLabel = selectedPkg && chosenTier ? [`${selectedPkg.packageName} — ${chosenTier.name}`] : [];
                      const combined = [...selectedOptions, ...tierLabel];
                      return combined.length > 0 ? combined : undefined;
                    })(),
                    customerUploads.length > 0 ? customerUploads : undefined
                  );
                  // Retire the QR the customer just paid against and roll a
                  // fresh session so the same code can't be reused.
                  startNewQrSession();
                  setAdvancePanelOpen(false);
                }}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold text-sm shadow-md flex items-center justify-center gap-2"
              >
                Confirm Order
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full-screen gallery image preview. */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/95 backdrop-blur-sm p-4"
          onClick={() => setLightboxImage(null)}
        >
          <button
            type="button"
            onClick={() => setLightboxImage(null)}
            aria-label="Close image"
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-slate-800/80 text-slate-200 hover:text-white flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
          {isVideoUrl(lightboxImage) ? (
            <video
              src={lightboxImage}
              controls
              autoPlay
              onClick={(e) => e.stopPropagation()}
              className="max-w-full max-h-[90vh] rounded-xl object-contain shadow-2xl"
            />
          ) : (
            <img
              src={lightboxImage}
              alt={`${vendor.businessName} photo`}
              onClick={(e) => e.stopPropagation()}
              className="max-w-full max-h-[90vh] rounded-xl object-contain shadow-2xl"
            />
          )}
        </div>
      )}
    </div>
  );
};

