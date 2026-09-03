import React, { useState, useEffect } from 'react';
import { X, Star, MapPin, Check, ShieldCheck, Upload, Calendar as CalendarIcon, MessageSquare, Send, CreditCard, Sparkles, Camera, Bus, Flame, Gift, ListChecks, Phone, Copy, Clock, RefreshCw, Plus, Maximize2 } from 'lucide-react';
import { Vendor, Review, getVendorTrustBadges, getLiveDeals, bestDealForAmount, AVAILABILITY_SLOTS, isSlotBooked, openSlots, offeredSlotIds } from '../../../../packages/shared-types';
import { fetchVendorById, uploadReferenceImage, fetchVendorReviews } from '../api';
import { PortfolioGrid } from './Portfolio';
import { DecorationGrid } from './DecorationThemes';
import { MakeupGrid } from './MakeupLooks';
import { TransportGrid } from './TransportOptions';
import { PriestGrid } from './PriestServices';
import { GiftGrid } from './ReturnGifts';
import { GenericCategoryGrid } from './CategoryOptions';
import { CustomRequestBox } from './CateringMenu';
import { getVendorCoverImage } from './vendorUtils';
import { GoldSparkles } from './GoldSparkles';

// Category-appropriate name for the "Services" tab (the vendor's list of
// offered, priced options). e.g. a Catering vendor's options ARE their menu, a
// Transport vendor's are vehicles, a Priest's are rituals. Falls back to
// "Services" for anything not listed.
const SERVICES_TAB_LABEL: Record<string, string> = {
  Catering: 'Food Services',
  Venue: 'Hall Facilities',
  Decoration: 'Decor Services',
  'Makeup & Beauty': 'Beauty Services',
  Media: 'Shoot Services',
  Transport: 'Vehicles & Services',
  'Pujari/Priest': 'Ceremony Services',
  Invitation: 'Design Services',
  Printing: 'Print Services',
  'Return Gifts': 'Gifting Choices',
  Entertainment: 'Performances Offered',
  'Music/DJ': 'Sound Services',
  Lighting: 'Lighting Services',
  Flowers: 'Floral Services',
  Mehendi: 'Designs & Services',
  'Event Host/Anchor': 'Hosting Services',
  Security: 'Protection & Staffing',
  Cleaning: 'Housekeeping Services',
  'Rental Equipment': 'Rental Options',
  'Utensils for Rent': 'Services',
  'Wedding Planner': 'Planning Service',
  'Corporate Event Services': 'Corporate Solutions',
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
    referenceImages?: string[],
    timeSlot?: string
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

  const [activeTab, setActiveTab] = useState<'overview' | 'portfolio' | 'themes' | 'looks' | 'fleet' | 'ceremonies' | 'gifts' | 'options' | 'services' | 'amenities' | 'packages' | 'gallery' | 'reviews' | 'upload'>('overview');
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsLoaded, setReviewsLoaded] = useState(false);

  // Load public reviews the first time the shopper opens the Reviews tab.
  useEffect(() => {
    if (activeTab !== 'reviews' || reviewsLoaded) return;
    fetchVendorReviews(initialVendor.id)
      .then((res) => setReviews(res.data?.reviews || []))
      .catch(() => setReviews([]))
      .finally(() => setReviewsLoaded(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, initialVendor.id]);
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

  // All picks (options, service rates, amenity rates, themes…) share one flat
  // `selectedOptions` list, and the booking sends that whole list so the vendor
  // sees every selection. For DISPLAY only, we split it back by which tab a pick
  // came from, so the "Your Selected Options" bar on each tab shows just that
  // tab's own selections (e.g. Options picks under Options, Print Items rates
  // under Print Items) instead of everything at once.
  const serviceKeySet = new Set<string>();
  (vendor.offeredOptions || []).forEach((o) => {
    const items = vendor.offeredOptionItems?.[o] || [];
    if (items.length > 0) items.forEach((item) => serviceKeySet.add(rateOptionLabel(o, item)));
    else serviceKeySet.add(o);
  });
  const amenityKeySet = new Set<string>();
  amenityRateGroups.forEach(([group, list]) =>
    list.forEach((item) => amenityKeySet.add(rateOptionLabel(group, item)))
  );
  const selectionsForActiveTab = selectedOptions.filter((opt) => {
    if (activeTab === 'services') return serviceKeySet.has(opt);
    if (activeTab === 'amenities') return amenityKeySet.has(opt);
    // The remaining option-style tabs (options/themes/looks/fleet/ceremonies/
    // gifts) use plain labels — show whatever isn't a service/amenity rate key.
    return !serviceKeySet.has(opt) && !amenityKeySet.has(opt);
  });

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
  // Time-of-day slot the customer picks for the chosen date (Morning/Afternoon/Evening).
  const [selectedSlot, setSelectedSlot] = useState('');
  // Whenever the date changes, reset the slot to the first one still open.
  useEffect(() => {
    if (!selectedEventDate) { setSelectedSlot(''); return; }
    const open = openSlots(vendor, selectedEventDate);
    setSelectedSlot(open.length ? open[0].id : '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEventDate, vendor.bookedSlots, vendor.bookedDates]);

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
  // Gallery images the customer picks ("I want a design like this one"). They're
  // sent to the vendor as reference images alongside the customer's own uploads.
  const [selectedGalleryImages, setSelectedGalleryImages] = useState<string[]>([]);
  const toggleGalleryImage = (img: string) =>
    setSelectedGalleryImages((prev) => (prev.includes(img) ? prev.filter((x) => x !== img) : [...prev, img]));

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

  // Auto-apply the vendor's best live offer to the running total.
  const appliedDeal = bestDealForAmount(vendor, referencePrice);
  const dealDiscount = appliedDeal?.discount ?? 0;
  const netPrice = Math.max(0, referencePrice - dealDiscount);
  // The concrete price the booking is created with — discounted when an offer
  // applies, otherwise the package price (or undefined to use starting price).
  const bookingPrice = appliedDeal ? netPrice : effectivePkgPrice;

  // A flat advanceAmount the vendor set overrides the percentage-based calc.
  const flatAdvance = vendor.policies.advanceAmount;
  const advanceIsFlat = typeof flatAdvance === 'number' && flatAdvance > 0;
  const advanceAmountDue = advanceIsFlat
    ? (netPrice > 0 ? Math.min(flatAdvance!, netPrice) : flatAdvance!)
    : Math.round((netPrice * vendor.policies.advancePercentage) / 100);
  const advanceLabel = advanceIsFlat ? 'Advance required' : `Advance required (${vendor.policies.advancePercentage}%)`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="glass-card max-w-4xl w-full rounded-3xl border border-amber-500/30 shadow-2xl shadow-[0_0_60px_-15px_rgba(245,158,11,0.4)] overflow-hidden my-8 max-h-[90vh] flex flex-col bg-gradient-to-b from-[#1b1030] via-[#140b22] to-[#0d0716] relative isolate">
        <GoldSparkles count={42} />
        <div className="relative px-6 py-4 border-b border-amber-500/20 flex items-center justify-between bg-gradient-to-r from-[#241541] via-[#1a1030] to-[#241541]">
          <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-400/60 to-transparent"></div>
          <div>
            <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">{vendor.category}</span>
            <h2 className="font-display font-bold text-2xl bg-gradient-to-r from-amber-100 via-white to-amber-200 bg-clip-text text-transparent">{vendor.businessName}</h2>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-800/80 border border-amber-500/20 text-slate-300 hover:text-white hover:border-amber-400/50 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center gap-4 px-6 border-b border-amber-500/15 bg-[#120a1e]/70">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-3 font-semibold text-xs border-b-2 transition-colors ${
              activeTab === 'overview' ? 'border-amber-500 text-amber-400' : 'border-transparent text-slate-400 hover:text-white'
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

          {isGenericOptions && !hasServices && (
            <button
              onClick={() => setActiveTab('options')}
              className={`py-3 font-semibold text-xs border-b-2 transition-colors flex items-center gap-1 ${
                activeTab === 'options' ? 'border-amber-500 text-amber-400' : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" /> {servicesTabLabel(vendor.category)}
            </button>
          )}

          {hasServices && (
            <button
              onClick={() => setActiveTab('services')}
              className={`py-3 font-semibold text-xs border-b-2 transition-colors flex items-center gap-1 ${
                activeTab === 'services' ? 'border-amber-500 text-amber-400' : 'border-transparent text-slate-400 hover:text-white'
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
              <ListChecks className="w-3.5 h-3.5" /> {hasServices ? 'Amenities' : servicesTabLabel(vendor.category)}
            </button>
          )}

          {vendor.category !== 'Wedding Planner' && (
            <button
              onClick={() => setActiveTab('packages')}
              className={`py-3 font-semibold text-xs border-b-2 transition-colors ${
                activeTab === 'packages' ? 'border-amber-500 text-amber-400' : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              {vendor.category === 'Venue' ? 'Halls' : 'Packages'} ({vendor.packages.length})
            </button>
          )}

          <button
            onClick={() => setActiveTab('gallery')}
            className={`py-3 font-semibold text-xs border-b-2 transition-colors ${
              activeTab === 'gallery' ? 'border-amber-500 text-amber-400' : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            Gallery ({vendor.galleryImages.length + (vendor.galleryVideos?.length ?? 0)})
          </button>

          <button
            onClick={() => setActiveTab('reviews')}
            className={`py-3 font-semibold text-xs border-b-2 transition-colors ${
              activeTab === 'reviews' ? 'border-amber-500 text-amber-400' : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            Reviews ({vendor.reviewCount})
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

              {(() => {
                const badges = getVendorTrustBadges(vendor);
                const tone: Record<string, string> = {
                  verified: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300',
                  rating: 'bg-amber-500/15 border-amber-500/30 text-amber-300',
                  popular: 'bg-pink-500/15 border-pink-500/30 text-pink-300',
                  experience: 'bg-indigo-500/15 border-indigo-500/30 text-indigo-300',
                  tenure: 'bg-slate-700/40 border-slate-600/50 text-slate-300',
                };
                return badges.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {badges.map((b) => (
                      <span key={b.key} className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border ${tone[b.tone]}`}>
                        {b.tone === 'verified' && <ShieldCheck className="w-3.5 h-3.5" />}
                        {b.tone === 'rating' && <Star className="w-3.5 h-3.5 fill-current" />}
                        {b.label}
                      </span>
                    ))}
                  </div>
                ) : null;
              })()}

              {(() => {
                const live = getLiveDeals(vendor);
                return live.length > 0 ? (
                  <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-500/10 to-pink-500/10 border border-amber-500/30 space-y-2.5">
                    <h4 className="font-bold text-sm text-amber-300 flex items-center gap-1.5">🎉 Offers from {vendor.businessName}</h4>
                    {live.map((d) => (
                      <div key={d.id} className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-white">{d.title}</p>
                          {d.description && <p className="text-xs text-slate-400">{d.description}</p>}
                          <p className="text-[10px] text-slate-500 mt-0.5">
                            {d.minOrderAmount ? `On orders over ₹${d.minOrderAmount.toLocaleString('en-IN')}` : 'On any order'}
                            {d.expiresAt ? ` · until ${new Date(d.expiresAt).toLocaleDateString()}` : ''}
                          </p>
                        </div>
                        <span className="shrink-0 px-3 py-1.5 rounded-xl bg-amber-500 text-slate-950 text-xs font-bold">
                          {d.discountType === 'percent' ? `${d.discountValue}% OFF` : `₹${d.discountValue.toLocaleString('en-IN')} OFF`}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : null;
              })()}

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
              {selectedPkg && (
                <div className="sm:col-span-2 p-4 rounded-2xl bg-indigo-950/40 border border-indigo-500/60 shadow-lg shadow-indigo-500/10">
                  <span className="text-[11px] font-bold text-slate-400 uppercase">Selected {vendor.category === 'Venue' ? 'Hall' : 'Package'}</span>
                  <div className="text-white font-bold text-sm">
                    {selectedPkg.packageName}{chosenTier ? ` — ${chosenTier.name}` : ''} — <span className="text-amber-400">₹{(effectivePkgPrice ?? 0).toLocaleString('en-IN')}{vendor.category === 'Security' ? ' per person' : ''}</span>
                  </div>
                </div>
              )}
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
                          <span className="text-slate-400">Price per guard / shift:</span>
                          <span className="font-bold text-amber-400">₹{pkg.price.toLocaleString('en-IN')}</span>
                        </div>
                      </div>
                      {pkg.security && (() => {
                        const s = pkg.security;
                        const chip = 'text-[11px] px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-200';
                        const incl: [string, boolean | undefined][] = [
                          ['Metal detectors', s.metalDetectors], ['CCTV', s.cctv], ['VIP protection', s.vipProtection], ['Gate / crowd mgmt', s.crowdManagement],
                        ];
                        return (
                          <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-2" onClick={(e) => e.stopPropagation()}>
                            <span className="text-[10px] font-bold text-slate-400 uppercase block">Security details</span>
                            <div className="flex flex-wrap gap-1.5">
                              {s.type && <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-200 font-bold">{s.type}</span>}
                              {s.gender && <span className={chip}>{s.gender}</span>}
                            </div>
                            <div className="space-y-1 text-[11px] text-slate-300">
                              {s.numGuards ? <div>Guards: <span className="text-white font-semibold">{s.numGuards}</span></div> : null}
                              {s.hoursShifts ? <div>Hours / shifts: <span className="text-white font-semibold">{s.hoursShifts}</span></div> : null}
                            </div>
                            {incl.some(([, v]) => v !== undefined) && (
                              <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
                                {incl.filter(([, v]) => v !== undefined).map(([label, v]) => (
                                  <span key={label} className="text-slate-400">{label}: <b className={v ? 'text-emerald-400' : 'text-slate-500'}>{v ? 'Yes' : 'No'}</b></span>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })()}
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
                          ₹{pkg.price.toLocaleString('en-IN')}
                        </span>
                      </div>
                      {selectedPkgId === pkg.id && (
                        <span className="inline-block mt-2 text-[10px] font-bold uppercase text-indigo-300 bg-indigo-500/15 px-2 py-0.5 rounded-full">Selected</span>
                      )}
                      {pkg.description && (
                        <p className="text-xs text-slate-400 mt-3 border-t border-slate-800/80 pt-3">{pkg.description}</p>
                      )}
                      {pkg.catering && (() => {
                        const c = pkg.catering;
                        const chip = 'text-[11px] px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-200';
                        const incl: [string, boolean | undefined][] = [
                          ['Welcome drinks', c.welcomeDrinks],
                          ['Serving staff', c.servingStaff],
                          ['Free tasting', c.freeTasting],
                        ];
                        return (
                          <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-2" onClick={(e) => e.stopPropagation()}>
                            <span className="text-[10px] font-bold text-slate-400 uppercase block">Menu details</span>
                            <div className="flex flex-wrap gap-1.5">
                              {c.menuTier && <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-200 font-bold">{c.menuTier}</span>}
                              {(c.foodTypes || []).map((f) => <span key={`f-${f}`} className={chip}>{f}</span>)}
                              {(c.cuisines || []).map((f) => <span key={`c-${f}`} className={chip}>{f}</span>)}
                            </div>
                            <div className="space-y-1 text-[11px] text-slate-300">
                              {(c.starters || c.mains || c.desserts) ? <div>Dishes: {c.starters || 0} starters · {c.mains || 0} mains · {c.desserts || 0} desserts</div> : null}
                              {c.minGuests ? <div>Minimum guests: <span className="text-white font-semibold">{c.minGuests}</span></div> : null}
                              {c.serviceStyle ? <div>Service style: <span className="text-white font-semibold">{c.serviceStyle}</span></div> : null}
                              {(c.liveCounters || []).length > 0 ? <div>Live counters: {c.liveCounters!.join(', ')}</div> : null}
                            </div>
                            {/* Items & prices per food type */}
                            {c.foodTypeItems && Object.entries(c.foodTypeItems).some(([_, its]) => (its || []).some((it) => it.name && it.name.trim())) && (
                              <div className="mt-2.5 pt-2.5 border-t border-slate-800/80 space-y-2">
                                <span className="text-[10px] font-bold text-slate-400 uppercase block">Menu Items & Rates</span>
                                {Object.entries(c.foodTypeItems).map(([type, its]) => {
                                  const list = (its || []).filter((it) => it.name && it.name.trim());
                                  if (list.length === 0) return null;
                                  const dot = type === 'Non-Veg' ? 'bg-rose-500' : type === 'Jain' ? 'bg-amber-400' : 'bg-emerald-500';
                                  const labelColor = type === 'Non-Veg' ? 'text-rose-400' : type === 'Jain' ? 'text-amber-300' : 'text-emerald-400';
                                  return (
                                    <div key={type} className="space-y-1">
                                      <div className="flex items-center gap-1.5">
                                        <span className={`w-2 h-2 rounded-full ${dot}`} />
                                        <span className={`text-[10px] font-bold uppercase ${labelColor}`}>
                                          {type} Items ({list.length})
                                        </span>
                                      </div>
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                        {list.map((it, idx) => (
                                          <div key={idx} className="flex items-center justify-between text-[11px] bg-slate-950/70 px-2.5 py-1.5 rounded-lg border border-slate-800/70">
                                            <span className="text-slate-200 font-medium">{it.name}</span>
                                            {it.price !== undefined && it.price > 0 && (
                                              <span className="font-bold text-amber-400">₹{it.price.toLocaleString('en-IN')}</span>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                            {/* Items & prices per cuisine */}
                            {c.cuisineItems && Object.entries(c.cuisineItems).some(([_, its]) => (its || []).some((it) => it.name && it.name.trim())) && (
                              <div className="mt-2.5 pt-2.5 border-t border-slate-800/80 space-y-2">
                                <span className="text-[10px] font-bold text-slate-400 uppercase block">Cuisine Items & Rates</span>
                                {Object.entries(c.cuisineItems).map(([type, its]) => {
                                  const list = (its || []).filter((it) => it.name && it.name.trim());
                                  if (list.length === 0) return null;
                                  return (
                                    <div key={type} className="space-y-1">
                                      <div className="flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-indigo-400" />
                                        <span className="text-[10px] font-bold uppercase text-indigo-300">
                                          {type} Items ({list.length})
                                        </span>
                                      </div>
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                        {list.map((it, idx) => (
                                          <div key={idx} className="flex items-center justify-between text-[11px] bg-slate-950/70 px-2.5 py-1.5 rounded-lg border border-slate-800/70">
                                            <span className="text-slate-200 font-medium">{it.name}</span>
                                            {it.price !== undefined && it.price > 0 && (
                                              <span className="font-bold text-amber-400">₹{it.price.toLocaleString('en-IN')}</span>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                            {/* Items & prices per course (Starters, Mains, Desserts) */}
                            {c.courseItems && Object.entries(c.courseItems).some(([_, its]) => (its || []).some((it) => (it.name && it.name.trim()) || it.photo)) && (
                              <div className="mt-2.5 pt-2.5 border-t border-slate-800/80 space-y-2">
                                <span className="text-[10px] font-bold text-slate-400 uppercase block">Dishes by Course</span>
                                {Object.entries(c.courseItems).map(([course, its]) => {
                                  const list = (its || []).filter((it) => (it.name && it.name.trim()) || it.photo);
                                  if (list.length === 0) return null;
                                  const dot = course === 'Starters' ? 'bg-amber-400' : course === 'Mains' ? 'bg-emerald-400' : 'bg-purple-400';
                                  const labelColor = course === 'Starters' ? 'text-amber-400' : course === 'Mains' ? 'text-emerald-400' : 'text-purple-400';
                                  return (
                                    <div key={course} className="space-y-1">
                                      <div className="flex items-center gap-1.5">
                                        <span className={`w-2 h-2 rounded-full ${dot}`} />
                                        <span className={`text-[10px] font-bold uppercase ${labelColor}`}>
                                          {course} ({list.length})
                                        </span>
                                      </div>
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                        {list.map((it, idx) => (
                                          <div key={idx} className="flex items-center justify-between gap-2 text-[11px] bg-slate-950/70 p-1.5 rounded-lg border border-slate-800/70">
                                            <div className="flex items-center gap-2 min-w-0">
                                              {it.photo && (
                                                <img src={it.photo} alt={it.name || 'Dish'} className="w-8 h-8 rounded object-cover border border-slate-800 shrink-0" />
                                              )}
                                              <span className="text-slate-200 font-medium truncate">{it.name || 'Dish'}</span>
                                            </div>
                                            {it.price !== undefined && it.price > 0 && (
                                              <span className="font-bold text-amber-400 shrink-0">₹{it.price.toLocaleString('en-IN')}</span>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                            {incl.some(([, v]) => v !== undefined) && (
                              <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
                                {incl.filter(([, v]) => v !== undefined).map(([label, v]) => (
                                  <span key={label} className="text-slate-400">{label}: <b className={v ? 'text-emerald-400' : 'text-slate-500'}>{v ? 'Yes' : 'No'}</b></span>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })()}

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

                      {vendor.category === 'Venue' && pkg.venue && (() => {
                        const v = pkg.venue;
                        const chip = 'text-[11px] px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-200';
                        const amenities: [string, boolean | undefined][] = [
                          ['Parking', v.parking], ['Power backup', v.powerBackup], ['Bridal/green room', v.bridalRoom],
                          ['Stage', v.stageIncluded], ['Valet', v.valetService],
                        ];
                        return (
                          <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-2" onClick={(e) => e.stopPropagation()}>
                            <span className="text-[10px] font-bold text-slate-400 uppercase block">Hall details</span>
                            <div className="flex flex-wrap gap-1.5">
                              {v.hallType && <span className={chip}>{v.hallType}</span>}
                              {v.hallClass && <span className={chip}>{v.hallClass}</span>}
                              {(v.sessions || []).map((s) => <span key={s} className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-200 font-bold">{s}</span>)}
                            </div>
                            <div className="space-y-1 text-[11px] text-slate-300">
                              {pkg.capacityPersons ? <div>Seating capacity: <span className="text-white font-semibold">{pkg.capacityPersons}</span></div> : null}
                              {v.accommodationRooms ? <div>Accommodation rooms: <span className="text-white font-semibold">{v.accommodationRooms}</span></div> : null}
                              {v.cateringPolicy ? <div>Catering: {v.cateringPolicy}</div> : null}
                            </div>
                            {amenities.some(([, val]) => val !== undefined) && (
                              <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
                                {amenities.filter(([, val]) => val !== undefined).map(([label, val]) => (
                                  <span key={label} className="text-slate-400">{label}: <b className={val ? 'text-emerald-400' : 'text-slate-500'}>{val ? 'Yes' : 'No'}</b></span>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      {vendor.category === 'Decoration' && pkg.decoration && (() => {
                        const d = pkg.decoration;
                        const chip = 'text-[11px] px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-200';
                        const incl: [string, boolean | undefined][] = [
                          ['Couple sofa', d.coupleSofa], ['Lighting', d.lighting],
                        ];
                        return (
                          <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-2" onClick={(e) => e.stopPropagation()}>
                            <span className="text-[10px] font-bold text-slate-400 uppercase block">Decoration details</span>
                            <div className="flex flex-wrap gap-1.5">
                              {d.tier && <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-200 font-bold">{d.tier}</span>}
                              {(d.themes || []).map((t) => <span key={`t-${t}`} className={chip}>{t}</span>)}
                              {d.flowers && <span className={chip}>{d.flowers} flowers</span>}
                            </div>
                            <div className="space-y-1 text-[11px] text-slate-300">
                              {(d.areas || []).length > 0 ? <div>Areas: {d.areas!.join(', ')}</div> : null}
                              {d.mandapType ? <div>Mandap: <span className="text-white font-semibold">{d.mandapType}</span></div> : null}
                              {d.functionsCovered ? <div>Functions covered: <span className="text-white font-semibold">{d.functionsCovered}</span></div> : null}
                            </div>
                            {incl.some(([, v]) => v !== undefined) && (
                              <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
                                {incl.filter(([, v]) => v !== undefined).map(([label, v]) => (
                                  <span key={label} className="text-slate-400">{label}: <b className={v ? 'text-emerald-400' : 'text-slate-500'}>{v ? 'Yes' : 'No'}</b></span>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      {vendor.category === 'Makeup & Beauty' && pkg.makeup && (() => {
                        const m = pkg.makeup;
                        const chip = 'text-[11px] px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-200';
                        const incl: [string, boolean | undefined][] = [
                          ['Hairstyling', m.hairstyling], ['Draping', m.draping], ['Trial session', m.trialSession], ['Travel to venue', m.travelToVenue],
                        ];
                        return (
                          <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-2" onClick={(e) => e.stopPropagation()}>
                            <span className="text-[10px] font-bold text-slate-400 uppercase block">Makeup details</span>
                            <div className="flex flex-wrap gap-1.5">
                              {m.finish && <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-200 font-bold">{m.finish}</span>}
                              {(m.makeupTypes || []).map((t) => <span key={`m-${t}`} className={chip}>{t}</span>)}
                            </div>
                            <div className="space-y-1 text-[11px] text-slate-300">
                              {m.looksCount ? <div>Looks / functions: <span className="text-white font-semibold">{m.looksCount}</span></div> : null}
                              {m.extraFamilyMembers ? <div>Extra family members covered: <span className="text-white font-semibold">{m.extraFamilyMembers}</span></div> : null}
                            </div>
                            {incl.some(([, v]) => v !== undefined) && (
                              <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
                                {incl.filter(([, v]) => v !== undefined).map(([label, v]) => (
                                  <span key={label} className="text-slate-400">{label}: <b className={v ? 'text-emerald-400' : 'text-slate-500'}>{v ? 'Yes' : 'No'}</b></span>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      {vendor.category === 'Media' && pkg.media && (() => {
                        const m = pkg.media;
                        const chip = 'text-[11px] px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-200';
                        const incl: [string, boolean | undefined][] = [
                          ['Pre-wedding', m.preWedding], ['Drone', m.drone], ['Teaser', m.teaser], ['4K film', m.film4k],
                        ];
                        return (
                          <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-2" onClick={(e) => e.stopPropagation()}>
                            <span className="text-[10px] font-bold text-slate-400 uppercase block">Media details</span>
                            <div className="flex flex-wrap gap-1.5">
                              {m.tier && <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-200 font-bold">{m.tier}</span>}
                              {m.coverage && <span className={chip}>{m.coverage}</span>}
                              {(m.styles || []).map((s) => <span key={`s-${s}`} className={chip}>{s}</span>)}
                            </div>
                            <div className="space-y-1 text-[11px] text-slate-300">
                              {m.daysOrEvents ? <div>Days / events: <span className="text-white font-semibold">{m.daysOrEvents}</span></div> : null}
                              {m.hoursCoverage ? <div>Hours of coverage: <span className="text-white font-semibold">{m.hoursCoverage}</span></div> : null}
                              {m.crewCount ? <div>Crew: <span className="text-white font-semibold">{m.crewCount}</span></div> : null}
                              {(m.editedPhotos || m.albumPages) ? <div>Deliverables: {m.editedPhotos ? `${m.editedPhotos} edited photos` : ''}{m.editedPhotos && m.albumPages ? ' · ' : ''}{m.albumPages ? `${m.albumPages} album pages` : ''}</div> : null}
                            </div>
                            {incl.some(([, v]) => v !== undefined) && (
                              <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
                                {incl.filter(([, v]) => v !== undefined).map(([label, v]) => (
                                  <span key={label} className="text-slate-400">{label}: <b className={v ? 'text-emerald-400' : 'text-slate-500'}>{v ? 'Yes' : 'No'}</b></span>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      {vendor.category === 'Transport' && pkg.transport && (() => {
                        const t = pkg.transport;
                        const chip = 'text-[11px] px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-200';
                        const incl: [string, boolean | undefined][] = [
                          ['Driver + fuel', t.driverFuel], ['Car decoration', t.carDecoration],
                        ];
                        return (
                          <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-2" onClick={(e) => e.stopPropagation()}>
                            <span className="text-[10px] font-bold text-slate-400 uppercase block">Vehicle details</span>
                            <div className="flex flex-wrap gap-1.5">
                              {t.tier && <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-200 font-bold">{t.tier}</span>}
                              {t.vehicleType && <span className={chip}>{t.vehicleType}</span>}
                              {t.use && <span className={chip}>For {t.use}</span>}
                              {t.pricingBasis && <span className={chip}>{t.pricingBasis}</span>}
                            </div>
                            <div className="space-y-1 text-[11px] text-slate-300">
                              {t.numVehicles ? <div>Vehicles: <span className="text-white font-semibold">{t.numVehicles}</span></div> : null}
                              {t.seatsPerVehicle ? <div>Seats / vehicle: <span className="text-white font-semibold">{t.seatsPerVehicle}</span></div> : null}
                              {t.kmHoursIncluded ? <div>Km / hours included: <span className="text-white font-semibold">{t.kmHoursIncluded}</span></div> : null}
                            </div>
                            {incl.some(([, v]) => v !== undefined) && (
                              <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
                                {incl.filter(([, v]) => v !== undefined).map(([label, v]) => (
                                  <span key={label} className="text-slate-400">{label}: <b className={v ? 'text-emerald-400' : 'text-slate-500'}>{v ? 'Yes' : 'No'}</b></span>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      {vendor.category === 'Pujari/Priest' && pkg.priest && (() => {
                        const pr = pkg.priest;
                        const chip = 'text-[11px] px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-200';
                        const incl: [string, boolean | undefined][] = [
                          ['Samagri included', pr.samagriIncluded], ['Muhurtham consult', pr.muhurthamConsult],
                        ];
                        return (
                          <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-2" onClick={(e) => e.stopPropagation()}>
                            <span className="text-[10px] font-bold text-slate-400 uppercase block">Ceremony details</span>
                            <div className="flex flex-wrap gap-1.5">
                              {pr.ceremonyType && <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-200 font-bold">{pr.ceremonyType}</span>}
                              {pr.community && <span className={chip}>{pr.community}</span>}
                              {(pr.languages || []).map((l) => <span key={`l-${l}`} className={chip}>{l}</span>)}
                            </div>
                            <div className="space-y-1 text-[11px] text-slate-300">
                              {pr.numPriests ? <div>Priests: <span className="text-white font-semibold">{pr.numPriests}</span></div> : null}
                              {pkg.capacityPersons ? <div>Persons: <span className="text-white font-semibold">{pkg.capacityPersons}</span></div> : null}
                              {pkg.durationHours ? <div>Duration: <span className="text-white font-semibold">{pkg.durationHours} hrs</span></div> : null}
                            </div>
                            {incl.some(([, v]) => v !== undefined) && (
                              <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
                                {incl.filter(([, v]) => v !== undefined).map(([label, v]) => (
                                  <span key={label} className="text-slate-400">{label}: <b className={v ? 'text-emerald-400' : 'text-slate-500'}>{v ? 'Yes' : 'No'}</b></span>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      {vendor.category === 'Invitation' && pkg.invitation && (() => {
                        const iv = pkg.invitation;
                        const chip = 'text-[11px] px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-200';
                        return (
                          <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-2" onClick={(e) => e.stopPropagation()}>
                            <span className="text-[10px] font-bold text-slate-400 uppercase block">Invitation details</span>
                            <div className="flex flex-wrap gap-1.5">
                              {iv.tier && <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-200 font-bold">{iv.tier}</span>}
                              {iv.type && <span className={chip}>{iv.type}</span>}
                              {iv.design && <span className={chip}>{iv.design}</span>}
                              {(iv.languages || []).map((l) => <span key={`il-${l}`} className={chip}>{l}</span>)}
                            </div>
                            <div className="space-y-1 text-[11px] text-slate-300">
                              {iv.quantity ? <div>Quantity: <span className="text-white font-semibold">{iv.quantity}</span></div> : null}
                              {iv.revisions ? <div>Design revisions: <span className="text-white font-semibold">{iv.revisions}</span></div> : null}
                              {iv.deliveryTime ? <div>Delivery: <span className="text-white font-semibold">{iv.deliveryTime}</span></div> : null}
                              {(iv.addOns || []).length > 0 ? <div>Add-ons: {iv.addOns!.join(', ')}</div> : null}
                            </div>
                          </div>
                        );
                      })()}

                      {vendor.category === 'Printing' && pkg.printing && (() => {
                        const pr = pkg.printing;
                        const chip = 'text-[11px] px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-200';
                        return (
                          <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-2" onClick={(e) => e.stopPropagation()}>
                            <span className="text-[10px] font-bold text-slate-400 uppercase block">Printing details</span>
                            <div className="flex flex-wrap gap-1.5">
                              {pr.product && <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-200 font-bold">{pr.product}</span>}
                              {(pr.finishes || []).map((f) => <span key={`pf-${f}`} className={chip}>{f}</span>)}
                            </div>
                            <div className="space-y-1 text-[11px] text-slate-300">
                              {pr.size ? <div>Size: <span className="text-white font-semibold">{pr.size}</span></div> : null}
                              {pr.quantity ? <div>Quantity: <span className="text-white font-semibold">{pr.quantity}</span></div> : null}
                              {pr.deliveryTime ? <div>Delivery: <span className="text-white font-semibold">{pr.deliveryTime}</span></div> : null}
                            </div>
                            {pr.designIncluded !== undefined && (
                              <div className="text-[11px]"><span className="text-slate-400">Design included: <b className={pr.designIncluded ? 'text-emerald-400' : 'text-slate-500'}>{pr.designIncluded ? 'Yes' : 'No'}</b></span></div>
                            )}
                          </div>
                        );
                      })()}

                      {vendor.category === 'Return Gifts' && pkg.returnGifts && (() => {
                        const rg = pkg.returnGifts;
                        const chip = 'text-[11px] px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-200';
                        return (
                          <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-2" onClick={(e) => e.stopPropagation()}>
                            <span className="text-[10px] font-bold text-slate-400 uppercase block">Return gift details</span>
                            <div className="flex flex-wrap gap-1.5">
                              {rg.tier && <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-200 font-bold">{rg.tier}</span>}
                              {rg.giftType && <span className={chip}>{rg.giftType}</span>}
                            </div>
                            <div className="space-y-1 text-[11px] text-slate-300">
                              {rg.countOfGifts ? <div>Count of gifts: <span className="text-white font-semibold">{rg.countOfGifts}</span></div> : null}
                              {rg.minQuantity ? <div>Minimum quantity: <span className="text-white font-semibold">{rg.minQuantity}</span></div> : null}
                              {rg.packingTimeDays ? <div>Packing time: <span className="text-white font-semibold">{rg.packingTimeDays} days</span></div> : null}
                              {rg.packagingType ? <div>Packaging: <span className="text-white font-semibold">{rg.packagingType}</span></div> : null}
                              {rg.bulkDiscount ? <div>Bulk discount: <span className="text-white font-semibold">{rg.bulkDiscount}</span></div> : null}
                            </div>
                            {rg.customization !== undefined && (
                              <div className="text-[11px]"><span className="text-slate-400">Customization (name / date): <b className={rg.customization ? 'text-emerald-400' : 'text-slate-500'}>{rg.customization ? 'Yes' : 'No'}</b></span></div>
                            )}
                          </div>
                        );
                      })()}

                      {vendor.category === 'Entertainment' && pkg.entertainment && (() => {
                        const en = pkg.entertainment;
                        const incl: [string, boolean | undefined][] = [
                          ['Equipment', en.equipmentIncluded], ['Travel', en.travelIncluded],
                        ];
                        return (
                          <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-2" onClick={(e) => e.stopPropagation()}>
                            <span className="text-[10px] font-bold text-slate-400 uppercase block">Act details</span>
                            <div className="flex flex-wrap gap-1.5">
                              {en.actType && <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-200 font-bold">{en.actType}</span>}
                            </div>
                            <div className="space-y-1 text-[11px] text-slate-300">
                              {pkg.capacityPersons ? <div>Performers: <span className="text-white font-semibold">{pkg.capacityPersons}</span></div> : null}
                              {pkg.durationHours ? <div>Duration: <span className="text-white font-semibold">{pkg.durationHours} hrs</span></div> : null}
                            </div>
                            {incl.some(([, v]) => v !== undefined) && (
                              <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
                                {incl.filter(([, v]) => v !== undefined).map(([label, v]) => (
                                  <span key={label} className="text-slate-400">{label}: <b className={v ? 'text-emerald-400' : 'text-slate-500'}>{v ? 'Yes' : 'No'}</b></span>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      {vendor.category === 'Music/DJ' && pkg.musicDj && (() => {
                        const md = pkg.musicDj;
                        const chip = 'text-[11px] px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-200';
                        const incl: [string, boolean | undefined][] = [
                          ['Sound system', md.soundSystem], ['Lighting', md.lighting], ['MC / host', md.mcHost], ['Generator', md.generator],
                        ];
                        return (
                          <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-2" onClick={(e) => e.stopPropagation()}>
                            <span className="text-[10px] font-bold text-slate-400 uppercase block">Music / DJ details</span>
                            <div className="flex flex-wrap gap-1.5">
                              {md.tier && <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-200 font-bold">{md.tier}</span>}
                              {md.type && <span className={chip}>{md.type}</span>}
                              {md.venueType && <span className={chip}>{md.venueType}</span>}
                            </div>
                            <div className="space-y-1 text-[11px] text-slate-300">
                              {md.hours ? <div>Hours: <span className="text-white font-semibold">{md.hours}</span></div> : null}
                              {md.numArtists ? <div>Artists: <span className="text-white font-semibold">{md.numArtists}</span></div> : null}
                            </div>
                            {incl.some(([, v]) => v !== undefined) && (
                              <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
                                {incl.filter(([, v]) => v !== undefined).map(([label, v]) => (
                                  <span key={label} className="text-slate-400">{label}: <b className={v ? 'text-emerald-400' : 'text-slate-500'}>{v ? 'Yes' : 'No'}</b></span>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      {vendor.category === 'Lighting' && pkg.lighting && (() => {
                        const lt = pkg.lighting;
                        const chip = 'text-[11px] px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-200';
                        const incl: [string, boolean | undefined][] = [
                          ['Power backup', lt.powerBackup], ['Setup + teardown', lt.setupTeardown],
                        ];
                        return (
                          <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-2" onClick={(e) => e.stopPropagation()}>
                            <span className="text-[10px] font-bold text-slate-400 uppercase block">Lighting details</span>
                            <div className="flex flex-wrap gap-1.5">
                              {lt.tier && <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-200 font-bold">{lt.tier}</span>}
                              {(lt.lightingTypes || []).map((l) => <span key={`lt-${l}`} className={chip}>{l}</span>)}
                            </div>
                            <div className="space-y-1 text-[11px] text-slate-300">
                              {lt.areaCovered ? <div>Area covered: <span className="text-white font-semibold">{lt.areaCovered}</span></div> : null}
                              {lt.numFixtures ? <div>Fixtures: <span className="text-white font-semibold">{lt.numFixtures}</span></div> : null}
                              {lt.numFunctions ? <div>Functions covered: <span className="text-white font-semibold">{lt.numFunctions}</span></div> : null}
                            </div>
                            {incl.some(([, v]) => v !== undefined) && (
                              <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
                                {incl.filter(([, v]) => v !== undefined).map(([label, v]) => (
                                  <span key={label} className="text-slate-400">{label}: <b className={v ? 'text-emerald-400' : 'text-slate-500'}>{v ? 'Yes' : 'No'}</b></span>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      {vendor.category === 'Flowers' && pkg.flowers && (() => {
                        const fl = pkg.flowers;
                        const chip = 'text-[11px] px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-200';
                        return (
                          <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-2" onClick={(e) => e.stopPropagation()}>
                            <span className="text-[10px] font-bold text-slate-400 uppercase block">Flower details</span>
                            <div className="flex flex-wrap gap-1.5">
                              {fl.variety && <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-200 font-bold">{fl.variety}</span>}
                              {fl.flowerKind && <span className={chip}>{fl.flowerKind}</span>}
                              {(fl.items || []).map((it) => <span key={`fi-${it}`} className={chip}>{it}</span>)}
                            </div>
                            <div className="space-y-1 text-[11px] text-slate-300">
                              {fl.quantity ? <div>Quantity: <span className="text-white font-semibold">{fl.quantity}</span></div> : null}
                              {fl.deliveryTiming ? <div>Delivery timing: <span className="text-white font-semibold">{fl.deliveryTiming}</span></div> : null}
                              {fl.whichFunction ? <div>Function: <span className="text-white font-semibold">{fl.whichFunction}</span></div> : null}
                            </div>
                          </div>
                        );
                      })()}

                      {vendor.category === 'Mehendi' && pkg.mehendi && (() => {
                        const mh = pkg.mehendi;
                        const chip = 'text-[11px] px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-200';
                        const incl: [string, boolean | undefined][] = [
                          ['Organic henna', mh.organicHenna], ['Travel', mh.travelIncluded],
                        ];
                        return (
                          <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-2" onClick={(e) => e.stopPropagation()}>
                            <span className="text-[10px] font-bold text-slate-400 uppercase block">Mehendi details</span>
                            <div className="flex flex-wrap gap-1.5">
                              {mh.tier && <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-200 font-bold">{mh.tier}</span>}
                              {mh.type && <span className={chip}>{mh.type}</span>}
                              {mh.intricacy && <span className={chip}>{mh.intricacy}</span>}
                            </div>
                            <div className="space-y-1 text-[11px] text-slate-300">
                              {mh.numArtists ? <div>Artists (guest stalls): <span className="text-white font-semibold">{mh.numArtists}</span></div> : null}
                              {mh.perHandPrice ? <div>Per-hand price (guests): <span className="text-white font-semibold">₹{mh.perHandPrice.toLocaleString('en-IN')}</span></div> : null}
                              {mh.durationHours ? <div>Duration: <span className="text-white font-semibold">{mh.durationHours} hrs</span></div> : null}
                            </div>
                            {incl.some(([, v]) => v !== undefined) && (
                              <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
                                {incl.filter(([, v]) => v !== undefined).map(([label, v]) => (
                                  <span key={label} className="text-slate-400">{label}: <b className={v ? 'text-emerald-400' : 'text-slate-500'}>{v ? 'Yes' : 'No'}</b></span>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      {vendor.category === 'Event Host/Anchor' && pkg.eventHost && (() => {
                        const eh = pkg.eventHost;
                        const chip = 'text-[11px] px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-200';
                        const incl: [string, boolean | undefined][] = [
                          ['Games / scripting', eh.gamesScripting], ['Travel', eh.travelIncluded],
                        ];
                        return (
                          <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-2" onClick={(e) => e.stopPropagation()}>
                            <span className="text-[10px] font-bold text-slate-400 uppercase block">Host / Anchor details</span>
                            <div className="flex flex-wrap gap-1.5">
                              {eh.eventType && <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-200 font-bold">{eh.eventType}</span>}
                              {eh.hostMode && <span className={chip}>{eh.hostMode}</span>}
                              {(eh.languages || []).map((l) => <span key={`eh-${l}`} className={chip}>{l}</span>)}
                            </div>
                            <div className="space-y-1 text-[11px] text-slate-300">
                              {eh.hours ? <div>Hours: <span className="text-white font-semibold">{eh.hours}</span></div> : null}
                              {eh.numEvents ? <div>Events: <span className="text-white font-semibold">{eh.numEvents}</span></div> : null}
                            </div>
                            {incl.some(([, v]) => v !== undefined) && (
                              <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
                                {incl.filter(([, v]) => v !== undefined).map(([label, v]) => (
                                  <span key={label} className="text-slate-400">{label}: <b className={v ? 'text-emerald-400' : 'text-slate-500'}>{v ? 'Yes' : 'No'}</b></span>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      {vendor.category === 'Rental Equipment' && pkg.rental && (() => {
                        const rt = pkg.rental;
                        const chip = 'text-[11px] px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-200';
                        const incl: [string, boolean | undefined][] = [
                          ['Setup + teardown', rt.setupTeardown], ['Delivery', rt.delivery],
                        ];
                        return (
                          <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-2" onClick={(e) => e.stopPropagation()}>
                            <span className="text-[10px] font-bold text-slate-400 uppercase block">Rental details</span>
                            <div className="flex flex-wrap gap-1.5">
                              {(rt.items || []).map((it) => <span key={`rt-${it}`} className={chip}>{it}</span>)}
                            </div>
                            <div className="space-y-1 text-[11px] text-slate-300">
                              {rt.quantity ? <div>Quantity: <span className="text-white font-semibold">{rt.quantity}</span></div> : null}
                              {rt.securityDeposit ? <div>Security deposit: <span className="text-white font-semibold">₹{rt.securityDeposit.toLocaleString('en-IN')}</span></div> : null}
                            </div>
                            {incl.some(([, v]) => v !== undefined) && (
                              <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
                                {incl.filter(([, v]) => v !== undefined).map(([label, v]) => (
                                  <span key={label} className="text-slate-400">{label}: <b className={v ? 'text-emerald-400' : 'text-slate-500'}>{v ? 'Yes' : 'No'}</b></span>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      {vendor.category === 'Utensils for Rent' && pkg.utensils && (() => {
                        const u = pkg.utensils;
                        const chip = 'text-[11px] px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-200';
                        return (
                          <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-2" onClick={(e) => e.stopPropagation()}>
                            <span className="text-[10px] font-bold text-slate-400 uppercase block">Utensils details</span>
                            <div className="flex flex-wrap gap-1.5">
                              {u.material && <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-200 font-bold">{u.material}</span>}
                              {!u.vesselTypePrices && (u.vesselTypes || []).map((v) => <span key={`u-${v}`} className={chip}>{v}</span>)}
                            </div>

                            {u.vesselTypePrices && Object.keys(u.vesselTypePrices).length > 0 && (
                              <div className="space-y-1">
                                <span className="text-[10px] font-bold text-slate-500 uppercase block">Vessel types</span>
                                {Object.entries(u.vesselTypePrices).map(([type, price]) => (
                                  <div key={type} className="flex items-center justify-between text-[11px]">
                                    <span className="text-slate-400">{type}</span>
                                    <span className="text-amber-300 font-semibold">{price === 0 ? 'Included' : `₹${Number(price).toLocaleString('en-IN')}`}</span>
                                  </div>
                                ))}
                              </div>
                            )}

                            <div className="space-y-1 text-[11px]">
                              {u.basePrice != null && u.basePrice > 0 ? (
                                <div className="flex items-center justify-between">
                                  <span className="text-slate-400">Base rental:</span>
                                  <span className="text-amber-300 font-semibold">₹{u.basePrice.toLocaleString('en-IN')}</span>
                                </div>
                              ) : null}
                              {u.guestCount ? (
                                <div className="flex items-center justify-between">
                                  <span className="text-slate-400">Guest count served:</span>
                                  <span className="text-white font-semibold">{u.guestCount}</span>
                                </div>
                              ) : null}
                              {u.securityDeposit ? (
                                <div className="flex items-center justify-between">
                                  <span className="text-slate-400">Security deposit:</span>
                                  <span className="text-white font-semibold">₹{u.securityDeposit.toLocaleString('en-IN')}</span>
                                </div>
                              ) : null}
                              {u.deliveryPickupPrice != null && (
                                <div className="flex items-center justify-between">
                                  <span className="text-slate-400">Delivery + pickup:</span>
                                  <span className="text-emerald-400 font-semibold">{u.deliveryPickupPrice === 0 ? 'Free' : `₹${Number(u.deliveryPickupPrice).toLocaleString('en-IN')}`}</span>
                                </div>
                              )}
                              {u.cleaningIncluded !== undefined && (
                                <div className="flex items-center justify-between">
                                  <span className="text-slate-400">Cleaning included:</span>
                                  <span className={`font-semibold ${u.cleaningIncluded ? 'text-emerald-400' : 'text-slate-500'}`}>{u.cleaningIncluded ? 'Yes' : 'No'}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })()}

                      {vendor.category === 'Wedding Planner' && pkg.weddingPlanner && (() => {
                        const w = pkg.weddingPlanner;
                        const incl: [string, boolean | undefined][] = [
                          ['Vendor coordination', w.vendorCoordination], ['Budget management', w.budgetManagement], ['Guest management', w.guestManagement],
                        ];
                        return (
                          <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-2" onClick={(e) => e.stopPropagation()}>
                            <span className="text-[10px] font-bold text-slate-400 uppercase block">Planning details</span>
                            <div className="flex flex-wrap gap-1.5">
                              {w.scope && <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-200 font-bold">{w.scope}</span>}
                            </div>
                            <div className="space-y-1 text-[11px] text-slate-300">
                              {w.numFunctions ? <div>Functions: <span className="text-white font-semibold">{w.numFunctions}</span></div> : null}
                              {w.teamSize ? <div>On-ground team: <span className="text-white font-semibold">{w.teamSize}</span></div> : null}
                              {w.planningMeetings ? <div>Planning meetings: <span className="text-white font-semibold">{w.planningMeetings}</span></div> : null}
                            </div>
                            {incl.some(([, v]) => v !== undefined) && (
                              <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
                                {incl.filter(([, v]) => v !== undefined).map(([label, v]) => (
                                  <span key={label} className="text-slate-400">{label}: <b className={v ? 'text-emerald-400' : 'text-slate-500'}>{v ? 'Yes' : 'No'}</b></span>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      {vendor.category === 'Corporate Event Services' && pkg.corporate && (() => {
                        const c = pkg.corporate;
                        const addons: [string, number | undefined][] = [
                          ['AV + stage + branding', c.avStageBranding], ['Registration desk', c.registrationDesk], ['Catering coordination', c.cateringCoordination], ['MC / host', c.mcHost],
                        ];
                        const offered = addons.filter(([, v]) => typeof v === 'number');
                        return (
                          <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-2" onClick={(e) => e.stopPropagation()}>
                            <span className="text-[10px] font-bold text-slate-400 uppercase block">Event details</span>
                            {c.eventType && (
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="text-slate-400">Event Type</span>
                                <span className="text-amber-300 font-semibold">{c.eventType}</span>
                              </div>
                            )}
                            {typeof c.basePrice === 'number' && c.basePrice > 0 && (
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="text-slate-400">Base Setup</span>
                                <span className="text-amber-300 font-semibold">₹{c.basePrice.toLocaleString('en-IN')}</span>
                              </div>
                            )}
                            {c.eventTypePrices && Object.keys(c.eventTypePrices).length > 0 && (
                              <div className="space-y-1">
                                <span className="text-[10px] font-bold text-slate-500 uppercase block">Event types</span>
                                {Object.entries(c.eventTypePrices).map(([type, price]) => (
                                  <div key={type} className="flex items-center justify-between text-[11px]">
                                    <span className="text-slate-400">{type}</span>
                                    <span className="text-amber-300 font-semibold">{price === 0 ? 'Included' : `₹${Number(price).toLocaleString('en-IN')}`}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                            <div className="space-y-1 text-[11px] text-slate-300">
                              {c.numAttendees ? <div>Attendees: <span className="text-white font-semibold">{c.numAttendees}</span></div> : null}
                              {c.numDays ? <div>Days: <span className="text-white font-semibold">{c.numDays}</span></div> : null}
                            </div>
                            {offered.length > 0 && (
                              <div className="space-y-1">
                                <span className="text-[10px] font-bold text-slate-500 uppercase block">Add-ons</span>
                                {offered.map(([label, v]) => (
                                  <div key={label} className="flex items-center justify-between text-[11px]">
                                    <span className="text-slate-400">{label}</span>
                                    <span className="text-amber-300 font-semibold">{v === 0 ? 'Included' : `₹${(v as number).toLocaleString('en-IN')}`}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })()}


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

              {vendor.galleryImages.length > 0 && (
                <p className="text-xs text-slate-400">
                  Tap <span className="text-indigo-300 font-semibold">View</span> to see a design full-screen, or <span className="text-emerald-300 font-semibold">Select</span> the ones you like — your picks are sent to <span className="text-amber-400 font-semibold">{vendor.businessName}</span> with your booking.
                </p>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {vendor.galleryImages.map((img, idx) => {
                  const picked = selectedGalleryImages.includes(img);
                  return (
                    <div
                      key={idx}
                      className={`relative h-40 rounded-xl overflow-hidden bg-slate-900 border transition-colors ${
                        picked ? 'border-emerald-500 ring-2 ring-emerald-500/40' : 'border-slate-800 hover:border-indigo-500'
                      }`}
                    >
                      <img src={img} alt={`Gallery ${idx}`} className="w-full h-full object-cover" />

                      {picked && (
                        <span className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-bold shadow">
                          <Check className="w-3 h-3" /> Selected
                        </span>
                      )}

                      {/* View (lightbox) + Select toggle live in a bottom bar so
                          the two actions are always distinct and tappable. */}
                      <div className="absolute inset-x-0 bottom-0 flex items-stretch gap-px bg-gradient-to-t from-slate-950/90 to-transparent p-2 pt-6">
                        <button
                          type="button"
                          onClick={() => { setSelectedImage(img); setLightboxImage(img); }}
                          className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-l-lg bg-slate-900/80 hover:bg-slate-800 text-white text-[11px] font-semibold transition-colors"
                        >
                          <Maximize2 className="w-3 h-3" /> View
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleGalleryImage(img)}
                          aria-pressed={picked}
                          className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-r-lg text-[11px] font-bold transition-colors ${
                            picked ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-indigo-600/90 hover:bg-indigo-500 text-white'
                          }`}
                        >
                          {picked ? <><Check className="w-3 h-3" /> Selected</> : <><Plus className="w-3 h-3" /> Select</>}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {selectedGalleryImages.length > 0 && (
                <div className="px-1 py-2 flex items-center gap-2 text-xs font-semibold text-emerald-300">
                  <Check className="w-3.5 h-3.5" />
                  {selectedGalleryImages.length} design{selectedGalleryImages.length === 1 ? '' : 's'} selected — sent to the vendor with your booking.
                </div>
              )}
            </div>
          )}

          {activeTab === 'reviews' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
                <div>
                  <h4 className="font-bold text-white">Verified customer reviews</h4>
                  <p className="text-xs text-slate-400 mt-1">From customers whose booking with {vendor.businessName} was completed.</p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-2xl font-bold text-amber-400 flex items-center gap-1 justify-end">
                    <Star className="w-5 h-5 fill-amber-400" /> {vendor.ratingAverage || '0.0'}
                  </span>
                  <span className="text-xs text-slate-400">{vendor.reviewCount} review{vendor.reviewCount === 1 ? '' : 's'}</span>
                </div>
              </div>

              {!reviewsLoaded ? (
                <p className="text-center text-sm text-slate-400 py-10">Loading reviews…</p>
              ) : reviews.length === 0 ? (
                <p className="text-center text-sm text-slate-400 py-10">No reviews yet. Be the first to book and review this vendor.</p>
              ) : (
                reviews.map((r) => (
                  <div key={r.id} className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center text-slate-950 font-bold text-xs">
                          {(r.customerName || 'C').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white">{r.customerName || 'Customer'}</p>
                          <p className="text-[10px] text-slate-500">{r.eventType ? `${r.eventType} · ` : ''}{new Date(r.createdAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <Star key={n} className={`w-4 h-4 ${n <= r.overallRating ? 'text-amber-400 fill-amber-400' : 'text-slate-700'}`} />
                        ))}
                      </div>
                    </div>
                    {r.comment && <p className="text-sm text-slate-300 mt-2.5 italic">"{r.comment}"</p>}

                    {r.vendorReply && (
                      <div className="mt-3 ml-4 pl-3 border-l-2 border-indigo-500/40">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wide">Response from {vendor.businessName}</span>
                          {r.vendorReplyAt && <span className="text-[10px] text-slate-500">{new Date(r.vendorReplyAt).toLocaleDateString()}</span>}
                        </div>
                        <p className="text-sm text-slate-300">{r.vendorReply}</p>
                      </div>
                    )}
                  </div>
                ))
              )}
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

            {/* Time-slot picker for the chosen date — a booked slot leaves the rest of the day open. */}
            {selectedEventDate && (
              <div className="mt-4">
                <span className="text-[11px] font-bold text-slate-400 uppercase flex items-center gap-1.5 mb-2">
                  <Clock className="w-3.5 h-3.5 text-indigo-400" /> Pick a time slot for {new Date(selectedEventDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                </span>
                <div className="flex flex-wrap gap-2">
                  {AVAILABILITY_SLOTS.filter((s) => offeredSlotIds(vendor, selectedEventDate).includes(s.id)).map((s) => {
                    const booked = isSlotBooked(vendor, selectedEventDate, s.id);
                    const active = selectedSlot === s.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        disabled={booked}
                        onClick={() => setSelectedSlot(s.id)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-semibold border text-center transition-colors ${
                          booked
                            ? 'bg-slate-950 border-slate-800 text-slate-600 line-through cursor-not-allowed'
                            : active
                              ? 'bg-indigo-600 border-indigo-600 text-white font-bold'
                              : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-indigo-500/50'
                        }`}
                      >
                        {s.label}{booked ? ' — Booked' : ''}
                      </button>
                    );
                  })}
                </div>
                {openSlots(vendor, selectedEventDate).length === 0 && (
                  <p className="text-[11px] text-amber-400 mt-2">All slots on this date are booked — pick another date.</p>
                )}
              </div>
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

        {selectionsForActiveTab.length > 0 && ['themes', 'looks', 'fleet', 'ceremonies', 'gifts', 'options', 'services', 'amenities'].includes(activeTab) && (
          <div className="px-6 py-4 border-t border-slate-800 bg-emerald-950/20">
            <div className="flex items-center justify-between mb-2">
              <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-300 uppercase">
                <ListChecks className="w-3.5 h-3.5" /> Your Selected Options
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {selectionsForActiveTab.map((opt) => (
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

        <div className="relative px-6 py-4 border-t border-amber-500/20 bg-gradient-to-r from-[#241541] via-[#1a1030] to-[#241541] flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="pointer-events-none absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-400/60 to-transparent"></div>
          <div>
            {/* The advance-and-pay footer shows only the advance amount + the
                Book button. The selected package/hall summary now lives inside
                the Packages tab itself. */}
            <span className="text-[11px] font-bold text-amber-300/80 uppercase">{advanceLabel}</span>
            <div className="text-white font-bold text-lg">
              ₹{advanceAmountDue.toLocaleString('en-IN')}
            </div>
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
            className="glass-card w-full max-w-sm rounded-3xl border border-amber-500/30 shadow-2xl shadow-[0_0_50px_-14px_rgba(245,158,11,0.5)] overflow-hidden relative isolate bg-gradient-to-b from-[#1b1030] via-[#140b22] to-[#0d0716]"
            onClick={(e) => e.stopPropagation()}
          >
            <GoldSparkles count={30} />
            <div className="relative px-6 py-4 border-b border-amber-500/20 bg-gradient-to-r from-[#241541] via-[#1a1030] to-[#241541] flex items-center justify-between">
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
                  <span className={`font-semibold ${appliedDeal ? 'text-slate-500 line-through' : 'text-white'}`}>₹{referencePrice.toLocaleString('en-IN')}</span>
                </div>
                {appliedDeal && (
                  <>
                    <div className="flex items-center justify-between text-sm mt-2">
                      <span className="text-emerald-400 flex items-center gap-1">🎉 {appliedDeal.deal.title}</span>
                      <span className="text-emerald-400 font-semibold">− ₹{dealDiscount.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm mt-2 pt-2 border-t border-slate-800">
                      <span className="text-slate-300 font-semibold">You pay</span>
                      <span className="text-white font-bold">₹{netPrice.toLocaleString('en-IN')}</span>
                    </div>
                  </>
                )}
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
                    bookingPrice,
                    customRequest || undefined,
                    selectedEventDate || undefined,
                    (() => {
                      // Include the chosen package tier so the vendor sees which
                      // tier (e.g. "…— Premium") the customer booked.
                      const tierLabel = selectedPkg && chosenTier ? [`${selectedPkg.packageName} — ${chosenTier.name}`] : [];
                      const combined = [...selectedOptions, ...tierLabel];
                      return combined.length > 0 ? combined : undefined;
                    })(),
                    (() => {
                      // Send both the customer's own uploads AND any gallery
                      // designs they selected as reference images to the vendor.
                      const refs = [...customerUploads, ...selectedGalleryImages];
                      return refs.length > 0 ? refs : undefined;
                    })(),
                    selectedSlot || undefined
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

