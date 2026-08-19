import React, { useState, useEffect } from 'react';
import { Store, Star, Upload, Check, LogOut, Loader2, Plus, SlidersHorizontal, ChevronDown, Receipt, X } from 'lucide-react';
import { User, Vendor, Booking, Review, VendorFacilities, OfferedOptionItem, VENDOR_CATEGORIES, CATEGORY_OPTIONS, CATERING_OPTION_STYLE, MEDIA_QUALITY_OPTIONS, MEDIA_EQUIPMENT_OPTIONS, mediaExtraField } from '../../../packages/shared-types';
import { STATIC_CITY_GROUPS } from '../../../packages/shared-utils';
import { AuthGate } from './components/AuthGate';
import { FloralGoldBackground } from './components/FloralGoldBackground';
import { fetchMyVendor, updateVendor, fetchVendorBookings, confirmBooking, sendCounterQuote, updateBookingStatus, fetchVendorReviews, GATEWAY_URL } from './api';

// Work-progress stages a confirmed booking moves through, tracked on the
// existing BookingStatus field — applies to every vendor category, not just
// catering, since there's nothing category-specific about "are we done yet".
const ORDER_STEPS: { key: string; label: string }[] = [
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'completed', label: 'Completed' },
];

// Mirrors STATUS_LABEL in customer-web/MyOrders.tsx so both sides describe
// the same BookingStatus values the same way.
const STATUS_LABEL: Record<string, string> = {
  enquiry: 'Enquiry',
  quote_requested: 'Quote Requested',
  quote_received: 'Quote Received',
  quote_sent: 'Counter Sent',
  negotiation: 'Negotiating',
  pending_payment: 'Advance Claimed — Confirm',
  confirmed: 'Confirmed',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
};

// Amenity toggles a vendor can advertise (these become the chips customers filter by).
// These are Venue-specific concepts (AC room, dormitory hall, etc.) and only apply to Venue vendors.
const AMENITY_OPTIONS: { key: keyof VendorFacilities; label: string }[] = [
  { key: 'acRoom', label: 'AC room' },
  { key: 'fansOnly', label: 'Fans only' },
  { key: 'vipRoom', label: 'VIP room' },
  { key: 'vipFrontChairs', label: 'VIP front chairs' },
  { key: 'garlands', label: 'Garlands' },
  { key: 'brideGroomRoom', label: 'Bride & groom room' },
  { key: 'guestRoomAttachedWashroom', label: 'Guest rooms' },
  { key: 'dormitoryHall', label: 'Dormitory hall' },
  { key: 'separateGuestWashroom', label: 'Separate guest washroom' },
  { key: 'cookingUtensils', label: 'Cooking utensils' },
  { key: 'waterFilter', label: 'Water filter' },
];
const SERVICE_TIERS: { key: keyof VendorFacilities; label: string }[] = [
  { key: 'catering', label: 'Catering' },
  { key: 'decoration', label: 'Decoration' },
  { key: 'djService', label: 'DJ / Music' },
  { key: 'transport', label: 'Transport' },
];

// Extra options every category gets in addition to its CATEGORY_OPTIONS.
// (Advance was removed — a vendor's advance is set in Business Profile, not as
// a bookable option.)
const UNIVERSAL_OPTIONS: string[] = [];

// Options that are a simple yes/we-offer-this with no per-item breakdown, so
// their card hides the "Add items" editor entirely.
const NO_ITEM_OPTIONS = new Set<string>(['Live Streaming', 'Same-Day Edit', 'Highlight Reel', 'LED Screens']);

// Example item name shown as the placeholder in the per-option item editor,
// tailored to each vendor category so a caterer sees a dish and a cleaner sees
// a cleaning service (not "Paneer Butter Masala"). Falls back to a generic
// example for anything not listed.
const ITEM_NAME_EXAMPLE: Record<string, string> = {
  Catering: 'Paneer Butter Masala',
  Venue: 'AC Banquet Hall',
  Decoration: 'Rose & Marigold Backdrop',
  'Makeup & Beauty': 'HD Bridal Makeup',
  Media: 'Candid Album / Cinematic Reel',
  Transport: 'Innova Crysta (per trip)',
  'Pujari/Priest': 'Wedding Homam Ritual',
  Invitation: 'Digital E-Invite Design',
  Printing: 'Wedding Cards (per 100)',
  'Return Gifts': 'Silver Coin Gift Box',
  Entertainment: 'Live Band (2 hours)',
  'Music/DJ': 'DJ Setup (4 hours)',
  Lighting: 'Fairy Light Setup',
  Flowers: 'Jasmine Garland (per metre)',
  Mehendi: 'Bridal Mehendi (full hands)',
  'Event Host/Anchor': 'Wedding Anchor (per event)',
  Security: 'Bouncer (per guard)',
  Cleaning: 'Deep Cleaning (per hall)',
  'Rental Equipment': 'Chairs (per 100)',
  'Utensils for Rent': 'Cooking Vessel (per set)',
  'Wedding Planner': 'Full Planning Package',
  'Corporate Event Services': 'Conference Setup',
  Other: 'Service item',
};

const inr = (n: number) => `₹${(n ?? 0).toLocaleString('en-IN')}`;

export function App() {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem('magizhnaazh_vendor_user');
    return stored ? JSON.parse(stored) : null;
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('magizhnaazh_vendor_token'));

  const handleAuthSuccess = (loggedInUser: User, newToken: string) => {
    localStorage.setItem('magizhnaazh_vendor_user', JSON.stringify(loggedInUser));
    localStorage.setItem('magizhnaazh_vendor_token', newToken);
    setUser(loggedInUser);
    setToken(newToken);
  };

  const handleLogout = () => {
    localStorage.removeItem('magizhnaazh_vendor_user');
    localStorage.removeItem('magizhnaazh_vendor_token');
    setUser(null);
    setToken(null);
    setMyVendor(null);
    setBookings([]);
  };

  const [activeTab, setActiveTab] = useState<'dashboard' | 'reviews' | 'portfolio' | 'facilities' | 'availability' | 'profile'>('dashboard');
  const [reviews, setReviews] = useState<Review[]>([]);
  const [facilities, setFacilities] = useState<Partial<VendorFacilities>>({});
  const [savingFacilities, setSavingFacilities] = useState(false);
  const [facilitiesNotice, setFacilitiesNotice] = useState('');
  const [offeredOptions, setOfferedOptions] = useState<string[]>([]);
  const [offeredOptionPrices, setOfferedOptionPrices] = useState<Record<string, number>>({});
  const [offeredOptionItems, setOfferedOptionItems] = useState<Record<string, OfferedOptionItem[]>>({});
  // Option-level quality tier for options that have no item list (e.g. Live Streaming).
  const [offeredOptionQuality, setOfferedOptionQuality] = useState<Record<string, string>>({});
  // Which offered option's item-editor is currently expanded (only one open at a time).
  const [expandedOption, setExpandedOption] = useState<string | null>(null);
  const [customOption, setCustomOption] = useState('');
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [newDate, setNewDate] = useState('');
  const [savingAvailability, setSavingAvailability] = useState(false);
  const [availabilityNotice, setAvailabilityNotice] = useState('');

  const [myVendor, setMyVendor] = useState<Vendor | null>(null);
  const [vendorLoading, setVendorLoading] = useState(true);
  const [vendorNotFound, setVendorNotFound] = useState(false);

  const [businessName, setBusinessName] = useState('');
  const [category, setCategory] = useState('Venue');
  const [city, setCity] = useState('Chennai');
  const [startingPrice, setStartingPrice] = useState(50000);
  const [advancePercentage, setAdvancePercentage] = useState(20);
  const [advanceAmount, setAdvanceAmount] = useState(0);
  const [contactPhone, setContactPhone] = useState('');
  const [upiId, setUpiId] = useState('');
  const [qrCodeImage, setQrCodeImage] = useState('');
  const [description, setDescription] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileNotice, setProfileNotice] = useState('');

  const [uploading, setUploading] = useState(false);
  const [uploadNotice, setUploadNotice] = useState('');
  const [uploadingQr, setUploadingQr] = useState(false);
  const [uploadQrNotice, setUploadQrNotice] = useState('');

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);

  const loadVendorAndBookings = async () => {
    if (!token) return;
    setVendorLoading(true);
    setVendorNotFound(false);
    try {
      const res = await fetchMyVendor(token);
      if (res.success && res.data?.vendor) {
        const v = res.data.vendor;
        setMyVendor(v);
        setBusinessName(v.businessName);
        setCategory(v.category);
        setCity(v.location.city);
        setStartingPrice(v.startingPrice);
        setAdvancePercentage(v.policies?.advancePercentage ?? 20);
        setAdvanceAmount(v.policies?.advanceAmount ?? 0);
        setContactPhone(v.contactPhone || '');
        setUpiId(v.upiId || '');
        setQrCodeImage(v.qrCodeImage || '');
        setDescription(v.description);
        setFacilities(v.facilities || {});
        setOfferedOptions(v.offeredOptions || []);
        setOfferedOptionPrices(v.offeredOptionPrices || {});
        setOfferedOptionItems(v.offeredOptionItems || {});
        setOfferedOptionQuality(v.offeredOptionQuality || {});
        setAvailableDates(v.availableDates || []);

        setBookingsLoading(true);
        const bkRes = await fetchVendorBookings(token, v.id);
        setBookings(bkRes.data?.bookings || []);
        setBookingsLoading(false);

        // Load customer reviews for this vendor (public endpoint).
        fetchVendorReviews(v.id)
          .then((rv) => setReviews(rv.data?.reviews || []))
          .catch(() => setReviews([]));
      } else {
        setVendorNotFound(true);
      }
    } catch (err) {
      setVendorNotFound(true);
    } finally {
      setVendorLoading(false);
    }
  };

  useEffect(() => {
    if (user && token) {
      loadVendorAndBookings();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, token]);

  const handleSaveProfile = async () => {
    if (!token || !myVendor) return;
    setSavingProfile(true);
    setProfileNotice('');
    try {
      const res = await updateVendor(token, myVendor.id, {
        businessName,
        category,
        description,
        city,
        startingPrice,
        contactPhone,
        upiId,
        policies: { ...(myVendor.policies || {}), advancePercentage, advanceAmount: advanceAmount || null },
      } as any);
      if (res.data?.vendor) {
        setMyVendor(res.data.vendor);
        setAdvancePercentage(res.data.vendor.policies?.advancePercentage ?? advancePercentage);
        setAdvanceAmount(res.data.vendor.policies?.advanceAmount ?? 0);
        setContactPhone(res.data.vendor.contactPhone || '');
        setUpiId(res.data.vendor.upiId || '');
      }
      setProfileNotice('Profile changes saved.');
    } catch (err: any) {
      setProfileNotice(err.message || 'Could not save changes.');
    } finally {
      setSavingProfile(false);
      setTimeout(() => setProfileNotice(''), 4000);
    }
  };

  const toggleAmenity = (key: keyof VendorFacilities) =>
    setFacilities((prev) => ({ ...prev, [key]: !prev[key] }));
  const setServiceTier = (key: keyof VendorFacilities, val: string) =>
    setFacilities((prev) => ({ ...prev, [key]: val }));

  const toggleOffered = (opt: string) => {
    const removing = offeredOptions.includes(opt);
    setOfferedOptions((prev) => (prev.includes(opt) ? prev.filter((o) => o !== opt) : [...prev, opt]));
    // Clear the price too when deselecting, so a later re-add starts blank
    // instead of silently resurrecting a stale price the vendor never set.
    setOfferedOptionPrices((prev) => {
      if (!(opt in prev)) return prev;
      const next = { ...prev };
      delete next[opt];
      return next;
    });
    // Same for the option's line-items, and collapse its editor if open.
    if (removing) {
      setOfferedOptionItems((prev) => {
        if (!(opt in prev)) return prev;
        const next = { ...prev };
        delete next[opt];
        return next;
      });
      setExpandedOption((cur) => (cur === opt ? null : cur));
      setOfferedOptionQuality((prev) => {
        if (!(opt in prev)) return prev;
        const next = { ...prev };
        delete next[opt];
        return next;
      });
    }
  };

  // Option-level quality (for NO_ITEM_OPTIONS like Live Streaming).
  const setOptionQuality = (opt: string, val: string) =>
    setOfferedOptionQuality((prev) => {
      if (val === '') {
        if (!(opt in prev)) return prev;
        const next = { ...prev };
        delete next[opt];
        return next;
      }
      return { ...prev, [opt]: val };
    });

  // --- Per-option line-item editing (name + rate + optional note) ---
  const addOptionItem = (opt: string) =>
    setOfferedOptionItems((prev) => ({
      ...prev,
      [opt]: [...(prev[opt] || []), { name: '', price: 0, note: '' }],
    }));

  const updateOptionItem = (opt: string, index: number, field: keyof OfferedOptionItem, raw: string) =>
    setOfferedOptionItems((prev) => {
      const list = [...(prev[opt] || [])];
      const item = { ...list[index] };
      if (field === 'price') {
        item.price = raw === '' ? 0 : Number(raw);
      } else if (field === 'areaCharge') {
        item.areaCharge = raw === '' ? 0 : Number(raw);
      } else if (field === 'name') {
        item.name = raw;
      } else if (field === 'equipments') {
        item.equipments = raw;
      } else if (field === 'quality') {
        item.quality = raw;
      } else {
        item.note = raw;
      }
      list[index] = item;
      return { ...prev, [opt]: list };
    });

  const removeOptionItem = (opt: string, index: number) =>
    setOfferedOptionItems((prev) => {
      const list = (prev[opt] || []).filter((_, i) => i !== index);
      const next = { ...prev };
      if (list.length) next[opt] = list;
      else delete next[opt];
      return next;
    });

  // Takes the raw input string (not a pre-parsed number) so an emptied field
  // can go back to truly empty instead of snapping to 0 — a 0 fallback here
  // would make the input un-clearable, since backspacing to "" would
  // immediately redisplay "0" and any further typing would land after it
  // (e.g. typing "45" into a "0"-filled field would end up as "045").
  const setOfferedOptionPrice = (opt: string, raw: string) => {
    setOfferedOptionPrices((prev) => {
      if (raw === '') {
        if (!(opt in prev)) return prev;
        const next = { ...prev };
        delete next[opt];
        return next;
      }
      return { ...prev, [opt]: Number(raw) };
    });
  };

  // Renders one offered option as an expandable card: the option chip + a
  // "from" price on top, and — when expanded — an editable list of named,
  // priced line-items (with an optional note) the vendor offers under it.
  // Used for both preset category options and custom ones, so every vendor,
  // whatever their category, can break an option down into priced items.
  const renderOfferedOptionCard = (opt: string, accent: 'emerald' | 'indigo') => {
    const items = offeredOptionItems[opt] || [];
    const isOpen = expandedOption === opt;
    const headerBg = accent === 'emerald' ? 'bg-emerald-600' : 'bg-indigo-600';
    return (
      <div key={opt} className="rounded-2xl border border-slate-800 bg-slate-900/40 overflow-hidden">
        <div className={`flex items-center gap-2 flex-wrap px-3.5 py-2 ${headerBg}`}>
          <span className="flex items-center gap-1.5 text-xs text-white font-bold">
            <Check className="w-3 h-3" />
            {CATERING_OPTION_STYLE[opt] && <span className={`w-2 h-2 rounded-full ${CATERING_OPTION_STYLE[opt].dot}`} />}
            {opt}
          </span>
          {!NO_ITEM_OPTIONS.has(opt) && (
            <button
              type="button"
              onClick={() => setExpandedOption((cur) => (cur === opt ? null : opt))}
              className="ml-auto flex items-center gap-1 text-[11px] text-white font-bold px-2 py-1 rounded-lg bg-black/20 hover:bg-black/30"
            >
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              {items.length > 0 ? `${items.length} item${items.length === 1 ? '' : 's'}` : 'Add items'}
            </button>
          )}
          {NO_ITEM_OPTIONS.has(opt) && myVendor?.category === 'Media' && (
            <select
              value={offeredOptionQuality[opt] ?? ''}
              onChange={(e) => setOptionQuality(opt, e.target.value)}
              className="ml-auto w-36 p-1.5 rounded-lg bg-black/20 text-white text-[11px] font-bold focus:outline-none"
            >
              <option value="">Quality (optional)</option>
              {MEDIA_QUALITY_OPTIONS.map((q) => (
                <option key={q} value={q} className="bg-slate-900">{q}</option>
              ))}
            </select>
          )}
          <button
            type="button"
            onClick={() => toggleOffered(opt)}
            aria-label={`Remove ${opt}`}
            className={`w-5 h-5 rounded-full flex items-center justify-center text-white hover:bg-white/20 shrink-0 ${NO_ITEM_OPTIONS.has(opt) && myVendor?.category !== 'Media' ? 'ml-auto' : ''}`}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
        {isOpen && !NO_ITEM_OPTIONS.has(opt) && (
          <div className="p-3 space-y-2">
            {items.length === 0 && (
              <p className="text-[11px] text-slate-500">
                No items yet — add {opt.toLowerCase()} items with a rate. Customers see each one on your listing.
              </p>
            )}
            {items.map((item, i) => (
              <div key={i} className="flex items-center gap-2 flex-wrap">
                <input
                  type="text"
                  value={item.name}
                  onChange={(e) => updateOptionItem(opt, i, 'name', e.target.value)}
                  placeholder={`Item name (e.g. ${ITEM_NAME_EXAMPLE[myVendor?.category ?? ''] ?? 'Service item'})`}
                  className="flex-1 min-w-[150px] p-2 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs"
                />
                <div className="flex items-center gap-1">
                  <span className="text-slate-400 text-xs">₹</span>
                  <input
                    type="number"
                    value={item.price === 0 ? '' : item.price}
                    onChange={(e) => updateOptionItem(opt, i, 'price', e.target.value)}
                    placeholder="rate"
                    className="w-20 p-2 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs"
                  />
                </div>
                {myVendor?.category === 'Media' && (
                  <>
                    {mediaExtraField(opt) === 'equipments' && (
                      <select
                        value={item.equipments ?? ''}
                        onChange={(e) => updateOptionItem(opt, i, 'equipments', e.target.value)}
                        className="w-36 p-2 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs"
                      >
                        <option value="">Equipments (optional)</option>
                        {MEDIA_EQUIPMENT_OPTIONS.map((eq) => (
                          <option key={eq} value={eq}>{eq}</option>
                        ))}
                      </select>
                    )}
                    <select
                      value={item.quality ?? ''}
                      onChange={(e) => updateOptionItem(opt, i, 'quality', e.target.value)}
                      className="w-32 p-2 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs"
                    >
                      <option value="">Quality (optional)</option>
                      {MEDIA_QUALITY_OPTIONS.map((q) => (
                        <option key={q} value={q}>{q}</option>
                      ))}
                    </select>
                    <div className="flex items-center gap-1" title="Extra charge for outstation / other areas">
                      <span className="text-slate-400 text-xs">+₹</span>
                      <input
                        type="number"
                        value={item.areaCharge ? item.areaCharge : ''}
                        onChange={(e) => updateOptionItem(opt, i, 'areaCharge', e.target.value)}
                        placeholder="area charge"
                        className="w-24 p-2 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs"
                      />
                    </div>
                  </>
                )}
                <input
                  type="text"
                  value={item.note ?? ''}
                  onChange={(e) => updateOptionItem(opt, i, 'note', e.target.value)}
                  placeholder="note (optional)"
                  className="flex-1 min-w-[120px] p-2 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs"
                />
                <button
                  type="button"
                  onClick={() => removeOptionItem(opt, i)}
                  aria-label="Remove item"
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-400 hover:bg-slate-800 shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => addOptionItem(opt)}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white font-bold hover:bg-slate-700"
            >
              <Plus className="w-3.5 h-3.5" /> Add item
            </button>
          </div>
        )}
      </div>
    );
  };

  const addCustomOption = () => {
    const val = customOption.trim();
    if (val && !offeredOptions.includes(val)) {
      setOfferedOptions((prev) => [...prev, val]);
    }
    setCustomOption('');
  };

  const handleSaveFacilities = async () => {
    if (!token || !myVendor) return;
    setSavingFacilities(true);
    setFacilitiesNotice('');
    try {
      const res = await updateVendor(token, myVendor.id, { facilities, offeredOptions, offeredOptionPrices, offeredOptionItems, offeredOptionQuality } as any);
      if (res.data?.vendor) {
        setMyVendor(res.data.vendor);
        setFacilities(res.data.vendor.facilities || {});
        setOfferedOptions(res.data.vendor.offeredOptions || []);
        setOfferedOptionPrices(res.data.vendor.offeredOptionPrices || {});
        setOfferedOptionItems(res.data.vendor.offeredOptionItems || {});
        setOfferedOptionQuality(res.data.vendor.offeredOptionQuality || {});
      }
      setFacilitiesNotice('Options saved — these now show on your marketplace listing.');
    } catch (err: any) {
      setFacilitiesNotice(err.message || 'Could not save options.');
    } finally {
      setSavingFacilities(false);
      setTimeout(() => setFacilitiesNotice(''), 4000);
    }
  };

  const addDate = () => {
    if (newDate && !availableDates.includes(newDate)) setAvailableDates((prev) => [...prev, newDate].sort());
    setNewDate('');
  };
  const removeDate = (d: string) => setAvailableDates((prev) => prev.filter((x) => x !== d));

  const handleSaveAvailability = async () => {
    if (!token || !myVendor) return;
    setSavingAvailability(true);
    setAvailabilityNotice('');
    try {
      const res = await updateVendor(token, myVendor.id, { availableDates } as any);
      if (res.data?.vendor) {
        setMyVendor(res.data.vendor);
        setAvailableDates(res.data.vendor.availableDates || []);
      }
      setAvailabilityNotice('Availability saved — customers see only your open dates.');
    } catch (err: any) {
      setAvailabilityNotice(err.message || 'Could not save availability.');
    } finally {
      setSavingAvailability(false);
      setTimeout(() => setAvailabilityNotice(''), 4000);
    }
  };

  const handleLocalUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !myVendor || !token) return;

    setUploading(true);
    setUploadNotice('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(`${GATEWAY_URL}/api/v1/vendors/${myVendor.id}/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const json = await res.json();
      if (json.success && json.data?.fileUrl) {
        setMyVendor((prev) => (prev ? { ...prev, galleryImages: [...prev.galleryImages, json.data.fileUrl] } : prev));
        setUploadNotice('Portfolio image saved to local disk storage (/uploads)!');
      } else {
        setUploadNotice(json.message || 'Upload failed.');
      }
    } catch (err) {
      setUploadNotice('Upload failed — is the gateway running?');
    } finally {
      setUploading(false);
    }
  };

  const handleQrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !myVendor || !token) return;

    setUploadingQr(true);
    setUploadQrNotice('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(`${GATEWAY_URL}/api/v1/vendors/${myVendor.id}/upload-qr`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const json = await res.json();
      if (json.success && json.data?.fileUrl) {
        setQrCodeImage(json.data.fileUrl);
        setMyVendor((prev) => (prev ? { ...prev, qrCodeImage: json.data.fileUrl } : prev));
        setUploadQrNotice('UPI QR code saved!');
      } else {
        setUploadQrNotice(json.message || 'Upload failed.');
      }
    } catch (err) {
      setUploadQrNotice('Upload failed — is the gateway running?');
    } finally {
      setUploadingQr(false);
    }
  };

  const [counterAmount, setCounterAmount] = useState<Record<string, string>>({});

  const refreshBookings = async () => {
    if (token && myVendor) {
      const bkRes = await fetchVendorBookings(token, myVendor.id);
      setBookings(bkRes.data?.bookings || []);
    }
  };

  const handleAcceptQuote = async (id: string) => {
    if (!token) return;
    await confirmBooking(token, id);
    await refreshBookings();
  };

  const handleSendCounter = async (id: string) => {
    if (!token) return;
    const amt = Number(counterAmount[id]);
    if (!amt || amt <= 0) return;
    await sendCounterQuote(token, id, amt);
    setCounterAmount((prev) => ({ ...prev, [id]: '' }));
    await refreshBookings();
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    if (!token) return;
    await updateBookingStatus(token, id, status);
    await refreshBookings();
  };

  const confirmedBookings = bookings.filter((b) => b.status === 'confirmed' || b.status === 'in_progress' || b.status === 'completed');
  const totalEarnings = confirmedBookings.reduce((acc, b) => acc + b.advanceAmountPaid, 0);
  const [earningsExpanded, setEarningsExpanded] = useState(false);

  if (!user) {
    return <AuthGate onAuthSuccess={handleAuthSuccess} />;
  }

  return (
    <div className="relative min-h-screen text-slate-100 flex flex-col font-sans">
      {/* App-wide romantic-celebration backdrop, fixed behind all scrolling content */}
      <div className="fixed inset-0 -z-10">
        <FloralGoldBackground />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 glass-card border-b border-slate-800 bg-slate-950/70 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center font-bold text-slate-950">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <span className="font-display font-extrabold text-xl text-white">Magizhnaazh Vendor Portal</span>
              <span className="block text-[10px] text-amber-400 font-bold uppercase tracking-wider">Business Partner Workspace</span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-semibold">
            <span className="hidden sm:block text-slate-400">
              Signed in as <strong className="text-slate-200">{user.name}</strong>
            </span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-rose-500/40 text-rose-400 font-bold text-xs transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" /> Sign Out
            </button>
          </div>
        </div>
      </header>

      {vendorLoading && (
        <div className="flex-1 flex items-center justify-center py-32 text-slate-400 gap-2">
          <Loader2 className="w-5 h-5 animate-spin" /> Loading your vendor listing...
        </div>
      )}

      {!vendorLoading && vendorNotFound && (
        <main className="flex-1 max-w-xl mx-auto px-4 py-16 w-full">
          <div className="glass-card p-8 rounded-3xl border border-slate-800 space-y-2 text-center">
            <h2 className="font-display font-bold text-xl text-white">No Listing Found</h2>
            <p className="text-xs text-slate-400">
              We couldn't find a marketplace listing for this account. Contact support to get this resolved.
            </p>
          </div>
        </main>
      )}

      {!vendorLoading && myVendor && (
      <main className="flex-1 max-w-7xl mx-auto px-4 py-10 w-full space-y-8">

        {/* Vendor Header Summary */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="font-display font-bold text-3xl text-white">{myVendor.businessName}</h1>
            <p className="text-slate-400 text-sm mt-1">{myVendor.category} • {myVendor.location.city}</p>
          </div>

          <button
            type="button"
            onClick={() => setEarningsExpanded((s) => !s)}
            aria-expanded={earningsExpanded}
            className="p-4 rounded-2xl glass-card border border-emerald-500/30 flex items-center gap-3 hover:border-emerald-500/60 transition-colors"
          >
            <div className="text-left">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">Total Earnings</span>
              <span className="font-display font-extrabold text-2xl text-emerald-400">
                ₹{totalEarnings.toLocaleString('en-IN')}
              </span>
            </div>
            <ChevronDown className={`w-4 h-4 text-slate-500 shrink-0 transition-transform ${earningsExpanded ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {earningsExpanded && (
          <div className="glass-card p-6 rounded-3xl border border-emerald-500/30">
            <h3 className="font-display font-bold text-lg text-white flex items-center gap-2 mb-4">
              <Receipt className="w-5 h-5 text-emerald-400" /> Where Your Earnings Came From
            </h3>
            {confirmedBookings.length === 0 ? (
              <p className="text-xs text-slate-500">No confirmed bookings yet.</p>
            ) : (
              <ul className="space-y-1.5">
                {confirmedBookings.map((b) => (
                  <li key={b.id} className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
                    <span className="text-slate-200">
                      {b.packageName} <span className="text-slate-500">({b.bookingNumber})</span>
                    </span>
                    <span className="text-emerald-400 font-semibold">₹{b.advanceAmountPaid.toLocaleString('en-IN')}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex items-center gap-4 border-b border-slate-800">
          {[
            { key: 'dashboard', label: 'Bookings & Quotes' },
            { key: 'reviews', label: `Reviews${reviews.length ? ` (${reviews.length})` : ''}` },
            { key: 'facilities', label: 'Facilities & Options' },
            { key: 'availability', label: 'Availability' },
            { key: 'portfolio', label: 'Local Disk Portfolio' },
            { key: 'profile', label: 'Business Profile' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`py-3 font-semibold text-xs border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-amber-500 text-amber-400'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="glass-card p-5 rounded-2xl border border-slate-800">
                <span className="text-xs font-bold text-slate-400 uppercase">Confirmed Bookings</span>
                <div className="font-display font-extrabold text-2xl text-white mt-1">{confirmedBookings.length}</div>
              </div>

              <div className="glass-card p-5 rounded-2xl border border-slate-800">
                <span className="text-xs font-bold text-amber-400 uppercase">Pending Quotes</span>
                <div className="font-display font-extrabold text-2xl text-amber-400 mt-1">
                  {bookings.filter((b) => b.status === 'quote_requested' || b.status === 'enquiry').length}
                </div>
              </div>

              <div className="glass-card p-5 rounded-2xl border border-slate-800">
                <span className="text-xs font-bold text-slate-400 uppercase">Partner Rating</span>
                <div className="font-display font-extrabold text-2xl text-amber-400 mt-1 flex items-center gap-1">
                  <Star className="w-5 h-5 fill-amber-400" /> {myVendor.ratingAverage} ({myVendor.reviewCount} Reviews)
                </div>
              </div>
            </div>

            {bookings.length > 0 && (
              <div className="glass-card p-6 rounded-3xl border border-slate-800">
                <h3 className="font-bold text-lg text-white mb-4">Booking Analytics</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase mb-3">Bookings by status</p>
                    {(() => {
                      const byStatus = bookings.reduce((acc, b) => { acc[b.status] = (acc[b.status] || 0) + 1; return acc; }, {} as Record<string, number>);
                      const max = Math.max(1, ...Object.values(byStatus));
                      return (
                        <div className="space-y-2">
                          {Object.entries(byStatus).map(([s, n]) => (
                            <div key={s}>
                              <div className="flex justify-between text-xs mb-1"><span className="text-slate-300 capitalize">{s.replace(/_/g, ' ')}</span><span className="text-slate-400 font-semibold">{n}</span></div>
                              <div className="h-2 rounded-full bg-slate-800 overflow-hidden"><div className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500" style={{ width: `${(n / max) * 100}%` }} /></div>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                  <div className="grid grid-cols-2 gap-3 content-start">
                    <div className="p-3 rounded-2xl bg-slate-900/70 border border-slate-800">
                      <span className="text-[10px] font-bold uppercase text-slate-400 block">Gross Booked</span>
                      <span className="text-lg font-extrabold text-white">{inr(confirmedBookings.reduce((a, b) => a + b.agreedPrice, 0))}</span>
                    </div>
                    <div className="p-3 rounded-2xl bg-slate-900/70 border border-slate-800">
                      <span className="text-[10px] font-bold uppercase text-slate-400 block">Advance In</span>
                      <span className="text-lg font-extrabold text-emerald-400">{inr(totalEarnings)}</span>
                    </div>
                    <div className="p-3 rounded-2xl bg-slate-900/70 border border-slate-800">
                      <span className="text-[10px] font-bold uppercase text-slate-400 block">Total Requests</span>
                      <span className="text-lg font-extrabold text-white">{bookings.length}</span>
                    </div>
                    <div className="p-3 rounded-2xl bg-slate-900/70 border border-slate-800">
                      <span className="text-[10px] font-bold uppercase text-slate-400 block">Rating</span>
                      <span className="text-lg font-extrabold text-amber-400 flex items-center gap-1"><Star className="w-4 h-4 fill-amber-400" />{myVendor.ratingAverage}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="glass-card rounded-3xl border border-slate-800 overflow-hidden">
              <div className="p-6 border-b border-slate-800">
                <h3 className="font-bold text-lg text-white">Client Bookings & Quote Requests</h3>
              </div>

              {bookingsLoading ? (
                <div className="p-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading bookings...
                </div>
              ) : bookings.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">No bookings yet.</div>
              ) : (
                <div className="divide-y divide-slate-800/80">
                  {bookings.map((b) => (
                    <div key={b.id} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-900/40">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-base">{b.bookingNumber}</span>
                          <span className={`px-2.5 py-0.5 rounded-full font-bold text-xs ${
                            b.status === 'pending_payment' ? 'bg-amber-500/20 text-amber-300' : 'bg-indigo-500/20 text-indigo-300'
                          }`}>
                            {STATUS_LABEL[b.status] || b.status}
                          </span>
                        </div>

                        <p className="text-xs text-slate-400 mt-1">
                          Package: <strong className="text-slate-200">{b.packageName}</strong> • Date: <strong className="text-amber-400">{b.eventDate}</strong>
                        </p>

                        {b.selectedOptions && b.selectedOptions.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {b.selectedOptions.map((opt) => (
                              <span key={opt} className="px-2.5 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-200 text-[11px] font-semibold">
                                {opt}
                              </span>
                            ))}
                          </div>
                        )}

                        {b.specialInstructions && <p className="text-xs text-slate-300 mt-2 italic">"{b.specialInstructions}"</p>}

                        {(b.status === 'confirmed' || b.status === 'in_progress' || b.status === 'completed') && (
                          <div className="mt-3 flex items-center gap-1.5 flex-wrap">
                            {ORDER_STEPS.map((step) => {
                              const isActive = b.status === step.key;
                              const isPast = ORDER_STEPS.findIndex((s) => s.key === b.status) > ORDER_STEPS.findIndex((s) => s.key === step.key);
                              return (
                                <button
                                  key={step.key}
                                  onClick={() => handleUpdateStatus(b.id, step.key)}
                                  className={`px-2.5 py-1 rounded-full text-[10px] font-bold border transition-colors ${
                                    isActive
                                      ? 'bg-amber-500 border-amber-500 text-slate-950'
                                      : isPast
                                        ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                                  }`}
                                >
                                  {step.label}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      <div className="text-right">
                        <span className="font-display font-extrabold text-xl text-emerald-400 block">
                          ₹{b.agreedPrice.toLocaleString('en-IN')}
                        </span>
                        <span className="text-[11px] text-slate-400 block">
                          Advance Paid: ₹{b.advanceAmountPaid.toLocaleString('en-IN')}
                        </span>

                        {b.status === 'pending_payment' && (
                          <div className="mt-3 flex flex-col items-end gap-1.5">
                            <p className="text-[10px] text-amber-300 text-right max-w-[220px]">
                              Customer says they've paid the advance via UPI. Verify it landed, then confirm.
                            </p>
                            <button
                              onClick={() => handleAcceptQuote(b.id)}
                              className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs shadow-md"
                            >
                              Confirm Advance Received
                            </button>
                          </div>
                        )}

                        {(b.status === 'quote_requested' || b.status === 'enquiry' || b.status === 'quote_sent') && (
                          <div className="mt-3 flex flex-col items-end gap-2">
                            <button
                              onClick={() => handleAcceptQuote(b.id)}
                              className="px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs shadow-md"
                            >
                              Accept Booking Quote
                            </button>
                            <div className="flex items-center gap-1.5">
                              <input
                                type="number"
                                placeholder="Counter ₹"
                                value={counterAmount[b.id] ?? ''}
                                onChange={(e) => setCounterAmount((prev) => ({ ...prev, [b.id]: e.target.value }))}
                                className="w-28 p-2 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs"
                              />
                              <button
                                onClick={() => handleSendCounter(b.id)}
                                className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white font-bold text-xs hover:bg-slate-700"
                              >
                                Counter
                              </button>
                            </div>
                          </div>
                        )}
                        {b.quotesHistory && b.quotesHistory.length > 0 && (
                          <p className="text-[10px] text-slate-500 mt-1">{b.quotesHistory.length} quote(s) exchanged</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Customer Reviews Tab */}
        {activeTab === 'reviews' && (
          <div className="space-y-5">
            <div className="glass-card p-6 rounded-3xl border border-slate-800 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-lg text-white flex items-center gap-2">
                  <Star className="w-5 h-5 text-amber-400 fill-amber-400" /> Customer Reviews
                </h3>
                <p className="text-xs text-slate-400 mt-1">Verified feedback from customers after their booking was completed.</p>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1.5 justify-end">
                  <Star className="w-6 h-6 text-amber-400 fill-amber-400" />
                  <span className="font-display font-extrabold text-3xl text-white">
                    {reviews.length ? (reviews.reduce((s, r) => s + r.overallRating, 0) / reviews.length).toFixed(1) : '0.0'}
                  </span>
                </div>
                <span className="text-xs text-slate-400">{reviews.length} review{reviews.length === 1 ? '' : 's'}</span>
              </div>
            </div>

            {reviews.length === 0 ? (
              <div className="glass-card p-12 rounded-3xl border border-slate-800 text-center text-sm text-slate-400">
                No reviews yet. Once a customer's booking is marked completed, they can rate and review you — it'll appear here.
              </div>
            ) : (
              <div className="space-y-3">
                {reviews.map((r) => (
                  <div key={r.id} className="glass-card p-5 rounded-2xl border border-slate-800">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center text-slate-950 font-bold text-xs">
                          {(r.customerName || 'C').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white">{r.customerName || 'Customer'}</p>
                          <p className="text-[10px] text-slate-500">{r.eventType} · {new Date(r.createdAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <Star key={n} className={`w-4 h-4 ${n <= r.overallRating ? 'text-amber-400 fill-amber-400' : 'text-slate-700'}`} />
                        ))}
                      </div>
                    </div>
                    {r.comment && <p className="text-sm text-slate-300 mt-2.5 italic">"{r.comment}"</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Portfolio & Local Storage Upload Tab */}
        {activeTab === 'portfolio' && (
          <div className="space-y-6">
            <div className="p-8 rounded-3xl glass-card border border-slate-800 text-center max-w-xl mx-auto">
              <Upload className="w-12 h-12 text-amber-400 mx-auto mb-4 animate-pulse" />
              <h3 className="font-bold text-xl text-white">Local Storage Portfolio Upload</h3>
              <p className="text-xs text-slate-400 mt-2 mb-6">
                Upload business images directly to local disk directory <code className="text-amber-400 font-mono">/uploads/vendor-{myVendor.id}</code> using <code className="text-indigo-400 font-mono">LocalStorageProvider</code>.
              </p>

              <label className="cursor-pointer inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold text-xs shadow-lg transition-all hover:scale-105">
                <span>Choose Image to Upload</span>
                <input type="file" accept="image/*" onChange={handleLocalUpload} className="hidden" />
              </label>

              {uploading && <p className="text-xs text-indigo-400 mt-4">Saving file to local disk...</p>}
              {uploadNotice && <p className="text-xs text-emerald-400 mt-4 font-semibold">{uploadNotice}</p>}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {myVendor.galleryImages.map((img, idx) => (
                <div key={idx} className="h-44 rounded-2xl overflow-hidden bg-slate-900 border border-slate-800">
                  <img src={img} alt={`Portfolio ${idx}`} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Facilities & Options Tab */}
        {activeTab === 'facilities' && (
          <div className="glass-card p-6 sm:p-8 rounded-3xl border border-slate-800 max-w-3xl space-y-6">
            <div>
              <h3 className="font-bold text-xl text-white flex items-center gap-2">
                <SlidersHorizontal className="w-5 h-5 text-amber-400" /> Facilities &amp; Options
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Tick what you offer. These become the filter chips customers see on your marketplace listing.
              </p>
            </div>

            {/* Venue-only amenities & event-service tiers */}
            {myVendor.category === 'Venue' && (
              <>
                <div>
                  <p className="text-xs font-bold text-amber-400 uppercase mb-3">Amenities</p>
                  <div className="flex flex-wrap gap-2">
                    {AMENITY_OPTIONS.map((a) => {
                      const on = !!facilities[a.key];
                      return (
                        <button
                          key={a.key}
                          type="button"
                          onClick={() => toggleAmenity(a.key)}
                          className={`flex items-center gap-1.5 text-xs px-3.5 py-1.5 rounded-full border transition-colors ${
                            on ? 'bg-amber-500 border-amber-500 text-slate-950 font-bold' : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white'
                          }`}
                        >
                          {on && <Check className="w-3 h-3" />} {a.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-bold text-amber-400 uppercase mb-3">Event services</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {SERVICE_TIERS.map((s) => (
                      <div key={s.key} className="flex items-center justify-between gap-2 p-3 rounded-xl bg-slate-900 border border-slate-800">
                        <span className="text-sm text-slate-200">{s.label}</span>
                        <select
                          value={(facilities[s.key] as string) || 'not_offered'}
                          onChange={(e) => setServiceTier(s.key, e.target.value)}
                          className="bg-slate-950 text-slate-200 border border-slate-800 rounded-lg px-2 py-1.5 text-xs"
                        >
                          <option value="included">Included</option>
                          <option value="extra_cost">Available (extra cost)</option>
                          <option value="not_offered">Not offered</option>
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Category-specific service chips, plus universal ones (like Advance) every category gets */}
            {(() => {
              const suggestedOptions = [...(CATEGORY_OPTIONS[myVendor.category] || []), ...UNIVERSAL_OPTIONS];
              return (
              <div className="space-y-5">
                {suggestedOptions.length > 0 ? (
                  <>
                    <div>
                      <p className="text-xs font-bold text-emerald-400 uppercase mb-1">
                        Available at {myVendor.category} — you offer this
                      </p>
                      <p className="text-[11px] text-slate-500 mb-3">
                        Expand each to add named items with their own rates (and a note) — e.g. under Veg, list each dish. Customers see them on your listing. Click the ✕ to remove.
                      </p>
                      {suggestedOptions.filter((opt) => offeredOptions.includes(opt)).length > 0 ? (
                        <div className="space-y-2">
                          {suggestedOptions
                            .filter((opt) => offeredOptions.includes(opt))
                            .map((opt) => renderOfferedOptionCard(opt, 'emerald'))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500">
                          Nothing selected yet — tick options below to add them to your listing.
                        </p>
                      )}
                    </div>

                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase mb-1">
                        Not available at {myVendor.category} yet — click to add
                      </p>
                      <p className="text-[11px] text-slate-500 mb-3">
                        Common {myVendor.category} options you haven't turned on. Booking these isn't possible for customers until you do.
                      </p>
                      {suggestedOptions.filter((opt) => !offeredOptions.includes(opt)).length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {suggestedOptions
                            .filter((opt) => !offeredOptions.includes(opt))
                            .map((opt) => (
                              <button
                                key={opt}
                                type="button"
                                onClick={() => toggleOffered(opt)}
                                className="flex items-center gap-1.5 text-xs px-3.5 py-1.5 rounded-full border bg-slate-900 border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition-colors"
                              >
                                <Plus className="w-3 h-3" />
                                {CATERING_OPTION_STYLE[opt] && <span className={`w-2 h-2 rounded-full ${CATERING_OPTION_STYLE[opt].dot}`} />}
                                {opt}
                              </button>
                            ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500">Every preset {myVendor.category} option is already offered.</p>
                      )}
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-slate-500">
                    No preset options for "{myVendor.category}" yet — add what you offer below.
                  </p>
                )}
              </div>
              );
            })()}

            {/* Any vendor can add a custom option not covered by the preset list */}
            <div>
              <p className="text-xs font-bold text-amber-400 uppercase mb-3">Add your own option</p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={customOption}
                  onChange={(e) => setCustomOption(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomOption(); } }}
                  placeholder="e.g. Same-day delivery"
                  className="flex-1 p-3 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm"
                />
                <button
                  type="button"
                  onClick={addCustomOption}
                  className="px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white font-bold text-xs flex items-center gap-1.5 hover:bg-slate-700"
                >
                  <Plus className="w-4 h-4" /> Add
                </button>
              </div>
              {offeredOptions.filter((o) => !(CATEGORY_OPTIONS[myVendor.category] || []).includes(o) && !UNIVERSAL_OPTIONS.includes(o)).length > 0 && (
                <div className="space-y-2 mt-3">
                  {offeredOptions
                    .filter((o) => !(CATEGORY_OPTIONS[myVendor.category] || []).includes(o) && !UNIVERSAL_OPTIONS.includes(o))
                    .map((opt) => renderOfferedOptionCard(opt, 'indigo'))}
                </div>
              )}
            </div>

            {facilitiesNotice && <p className="text-xs text-emerald-400 font-semibold">{facilitiesNotice}</p>}

            <button
              onClick={handleSaveFacilities}
              disabled={savingFacilities}
              className="px-6 py-3 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs shadow-md disabled:opacity-60 flex items-center gap-2"
            >
              {savingFacilities && <Loader2 className="w-4 h-4 animate-spin" />} Save Options
            </button>
          </div>
        )}

        {/* Availability Tab */}
        {activeTab === 'availability' && (
          <div className="glass-card p-6 sm:p-8 rounded-3xl border border-slate-800 max-w-2xl space-y-5">
            <div>
              <h3 className="font-bold text-xl text-white">Availability Calendar</h3>
              <p className="text-xs text-slate-400 mt-1">Add the dates you're open to book. Customers can only request these dates.</p>
            </div>

            <div className="flex items-end gap-2">
              <div className="flex-1">
                <label className="block text-xs text-slate-400 mb-1">Add an available date</label>
                <input
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="w-full p-3 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm"
                />
              </div>
              <button
                type="button"
                onClick={addDate}
                className="px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white font-bold text-xs flex items-center gap-1.5 hover:bg-slate-700"
              >
                <Plus className="w-4 h-4" /> Add
              </button>
            </div>

            {availableDates.length === 0 ? (
              <p className="text-xs text-slate-500">No open dates yet — add some above.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {availableDates.map((d) => (
                  <span key={d} className="flex items-center gap-1.5 pl-3 pr-2 py-1.5 rounded-full bg-emerald-600/20 border border-emerald-500/40 text-emerald-200 text-xs font-semibold">
                    {new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    <button type="button" onClick={() => removeDate(d)} aria-label={`Remove ${d}`} className="w-4 h-4 rounded-full flex items-center justify-center hover:bg-emerald-500/40 hover:text-white">×</button>
                  </span>
                ))}
              </div>
            )}

            {availabilityNotice && <p className="text-xs text-emerald-400 font-semibold">{availabilityNotice}</p>}

            <button
              onClick={handleSaveAvailability}
              disabled={savingAvailability}
              className="px-6 py-3 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs shadow-md disabled:opacity-60 flex items-center gap-2"
            >
              {savingAvailability && <Loader2 className="w-4 h-4 animate-spin" />} Save Availability
            </button>
          </div>
        )}

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="glass-card p-6 sm:p-8 rounded-3xl border border-slate-800 max-w-2xl mx-auto space-y-4">
            <h3 className="font-bold text-xl text-white">Vendor Profile Settings</h3>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Business Name</label>
              <input
                type="text"
                name="businessName"
                autoComplete="organization"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="w-full p-3 rounded-xl bg-slate-900 border border-slate-800 text-white font-bold text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full p-3 rounded-xl bg-slate-900 border border-slate-800 text-white font-semibold text-xs"
                >
                  {VENDOR_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">City / Locality</label>
                <select
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full p-3 rounded-xl bg-slate-900 border border-slate-800 text-white font-semibold text-xs"
                >
                  {STATIC_CITY_GROUPS.map(([state, cities]) => (
                    <optgroup key={state} label={state} className="bg-slate-900">
                      {cities.map((c) => (
                        <option key={`${state}-${c}`} value={c} className="bg-slate-900">{c}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Starting Price (₹)</label>
                <input
                  type="number"
                  value={startingPrice === 0 ? '' : startingPrice}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/^0+(?=\d)/, '');
                    e.target.value = raw;
                    setStartingPrice(raw === '' ? 0 : Number(raw));
                  }}
                  className="w-full p-3 rounded-xl bg-slate-900 border border-slate-800 text-white font-semibold text-xs"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Advance Required (%)</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={advancePercentage === 0 ? '' : advancePercentage}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/^0+(?=\d)/, '');
                    e.target.value = raw;
                    const n = raw === '' ? 0 : Math.min(100, Math.max(0, Number(raw)));
                    setAdvancePercentage(n);
                  }}
                  className="w-full p-3 rounded-xl bg-slate-900 border border-slate-800 text-white font-semibold text-xs"
                />
                <p className="text-[10px] text-slate-500 mt-1">What customers pay upfront to confirm a booking with you.</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Advance Amount (₹) — optional override</label>
                <input
                  type="number"
                  min={0}
                  value={advanceAmount === 0 ? '' : advanceAmount}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/^0+(?=\d)/, '');
                    e.target.value = raw;
                    setAdvanceAmount(raw === '' ? 0 : Number(raw));
                  }}
                  className="w-full p-3 rounded-xl bg-slate-900 border border-slate-800 text-white font-semibold text-xs"
                />
                <p className="text-[10px] text-slate-500 mt-1">If set, customers see this fixed amount instead of the % above.</p>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Call / Contact Number</label>
                <input
                  type="tel"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="+91 90000 00000"
                  className="w-full p-3 rounded-xl bg-slate-900 border border-slate-800 text-white font-semibold text-xs"
                />
                <p className="text-[10px] text-slate-500 mt-1">Shown to customers so they can call you directly.</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">UPI ID</label>
                <input
                  type="text"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  placeholder="yourbusiness@upi"
                  className="w-full p-3 rounded-xl bg-slate-900 border border-slate-800 text-white font-semibold text-xs"
                />
                <p className="text-[10px] text-slate-500 mt-1">Customers see this when paying your advance.</p>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Payment QR Code</label>
                <div className="flex items-center gap-3">
                  {qrCodeImage && (
                    <img src={qrCodeImage} alt="UPI QR code" className="w-12 h-12 rounded-lg object-cover border border-slate-800" />
                  )}
                  <label className="flex-1 flex items-center justify-center gap-1.5 px-3 py-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 text-xs font-bold cursor-pointer transition-colors">
                    {uploadingQr ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                    {qrCodeImage ? 'Replace' : 'Upload'}
                    <input type="file" accept="image/*" onChange={handleQrUpload} className="hidden" disabled={uploadingQr} />
                  </label>
                </div>
                {uploadQrNotice && <p className="text-[10px] text-emerald-400 mt-1">{uploadQrNotice}</p>}
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Business Description</label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full p-3 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs"
              />
            </div>

            {profileNotice && <p className="text-xs text-emerald-400 font-semibold">{profileNotice}</p>}

            <button
              onClick={handleSaveProfile}
              disabled={savingProfile}
              className="px-6 py-3 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs shadow-md disabled:opacity-60 flex items-center gap-2"
            >
              {savingProfile && <Loader2 className="w-4 h-4 animate-spin" />} Save Profile Changes
            </button>
          </div>
        )}

      </main>
      )}

      <footer className="border-t border-slate-800 py-6 text-center text-xs text-slate-500">
        © 2026 Magizhnaazh Vendor Management Portal — Port 3001
      </footer>
    </div>
  );
}