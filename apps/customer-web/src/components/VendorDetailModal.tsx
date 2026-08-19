import React, { useState, useEffect } from 'react';
import { X, Star, MapPin, Check, ShieldCheck, Upload, Calendar as CalendarIcon, MessageSquare, Send, CreditCard, Sparkles, Camera, Bus, Flame, Gift, ListChecks, Phone, Copy } from 'lucide-react';
import { Vendor } from '../../../../packages/shared-types';
import { fetchVendorById } from '../api';
import { PortfolioGrid } from './Portfolio';
import { DecorationGrid } from './DecorationThemes';
import { MakeupGrid } from './MakeupLooks';
import { TransportGrid } from './TransportOptions';
import { PriestGrid } from './PriestServices';
import { GiftGrid } from './ReturnGifts';
import { GenericCategoryGrid } from './CategoryOptions';
import { CustomRequestBox } from './CateringMenu';

interface VendorDetailModalProps {
  vendor: Vendor;
  onClose: () => void;
  onBookVendor: (
    vendor: Vendor,
    packageId?: string,
    price?: number,
    notes?: string,
    eventDate?: string,
    selectedOptions?: string[]
  ) => void;
}

export const VendorDetailModal: React.FC<VendorDetailModalProps> = ({ vendor: initialVendor, onClose, onBookVendor }) => {
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

  const [activeTab, setActiveTab] = useState<'overview' | 'portfolio' | 'themes' | 'looks' | 'fleet' | 'ceremonies' | 'gifts' | 'options' | 'packages' | 'gallery' | 'upload'>('overview');
  const isPhotography = vendor.category === 'Photography';
  const isDecoration = vendor.category === 'Decoration';
  const isMakeup = vendor.category === 'Makeup & Beauty';
  const isTransport = vendor.category === 'Transport';
  const isPriest = vendor.category === 'Pujari/Priest';
  const isReturnGifts = vendor.category === 'Return Gifts';
  // Categories with their own real data model (Venue's structured facilities)
  // or an existing bespoke tab above are excluded; everything else gets the
  // generic CATEGORY_OPTIONS-driven tab.
  const isGenericOptions = vendor.category !== 'Venue'
    && !isPhotography && !isDecoration && !isMakeup && !isTransport && !isPriest && !isReturnGifts;
  // Service-type options the customer picks off whichever category grid is
  // showing (Portfolio styles, Decoration themes, Photography types, etc.) —
  // works the same way for every category since it's just a list of labels.
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const toggleOption = (title: string) => {
    setSelectedOptions((prev) => (prev.includes(title) ? prev.filter((x) => x !== title) : [...prev, title]));
  };

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

  const [selectedPkgId, setSelectedPkgId] = useState(vendor.packages[0]?.id);
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

  const [selectedImage, setSelectedImage] = useState(vendor.galleryImages[0]);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState('');

  const handleLocalUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadSuccess('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(`http://localhost:8002/api/v1/vendors/${vendor.id}/upload`, {
        method: 'POST',
        body: formData,
      });

      const json = await res.json();
      if (json.success && json.data?.fileUrl) {
        vendor.galleryImages.push(json.data.fileUrl);
        setSelectedImage(json.data.fileUrl);
        setUploadSuccess('File uploaded successfully to Local Storage (/uploads)!');
      } else {
        const localBlobUrl = URL.createObjectURL(file);
        vendor.galleryImages.push(localBlobUrl);
        setSelectedImage(localBlobUrl);
        setUploadSuccess('Uploaded to local disk storage session preview!');
      }
    } catch (err) {
      const localBlobUrl = URL.createObjectURL(file);
      vendor.galleryImages.push(localBlobUrl);
      setSelectedImage(localBlobUrl);
      setUploadSuccess('Uploaded to local disk storage session preview!');
    } finally {
      setUploading(false);
    }
  };

  const selectedPkg = vendor.packages.find((p) => p.id === selectedPkgId) || vendor.packages[0];

  // Vendors without packages set up yet still have a startingPrice — fall
  // back to that as the reference total so the advance isn't computed
  // against a nonexistent ₹0 package price.
  const referencePrice = selectedPkg?.price || vendor.startingPrice || 0;

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

          {isPhotography && (
            <button
              onClick={() => setActiveTab('portfolio')}
              className={`py-3 font-semibold text-xs border-b-2 transition-colors flex items-center gap-1 ${
                activeTab === 'portfolio' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <Camera className="w-3.5 h-3.5" /> Portfolio
            </button>
          )}

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

          <button
            onClick={() => setActiveTab('packages')}
            className={`py-3 font-semibold text-xs border-b-2 transition-colors ${
              activeTab === 'packages' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            Packages ({vendor.packages.length})
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

                {vendor.offeredOptions && vendor.offeredOptions.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-slate-800/80">
                    <span className="text-xs font-bold text-slate-400 uppercase block mb-2">Services Offered</span>
                    <div className="space-y-2.5">
                      {vendor.offeredOptions.map((o) => {
                        const price = vendor.offeredOptionPrices?.[o];
                        const items = vendor.offeredOptionItems?.[o] || [];
                        return (
                          <div key={o} className="rounded-xl bg-slate-900/50 border border-slate-800 p-2.5">
                            <div className="flex items-center gap-2">
                              <span className="text-xs px-3 py-1 rounded-full bg-indigo-600/15 border border-indigo-500/30 text-indigo-200 font-semibold">
                                {o}
                              </span>
                              {!!price && (
                                <span className="text-xs text-amber-400 font-semibold">from ₹{price.toLocaleString('en-IN')}</span>
                              )}
                            </div>
                            {items.length > 0 && (
                              <ul className="mt-2 space-y-1">
                                {items.map((item, i) => (
                                  <li key={i} className="flex items-center justify-between gap-3 text-xs">
                                    <span className="text-slate-300">
                                      {item.name}
                                      {item.note && <span className="text-slate-500"> · {item.note}</span>}
                                    </span>
                                    <span className="text-emerald-400 font-semibold shrink-0">₹{(item.price ?? 0).toLocaleString('en-IN')}</span>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'options' && <GenericCategoryGrid category={vendor.category} selected={selectedOptions} onToggle={toggleOption} optionItems={vendor.offeredOptionItems} />}

          {activeTab === 'portfolio' && <PortfolioGrid selected={selectedOptions} onToggle={toggleOption} />}

          {activeTab === 'themes' && <DecorationGrid selected={selectedOptions} onToggle={toggleOption} />}

          {activeTab === 'looks' && <MakeupGrid selected={selectedOptions} onToggle={toggleOption} />}

          {activeTab === 'fleet' && <TransportGrid selected={selectedOptions} onToggle={toggleOption} />}

          {activeTab === 'ceremonies' && <PriestGrid selected={selectedOptions} onToggle={toggleOption} />}

          {activeTab === 'gifts' && <GiftGrid selected={selectedOptions} onToggle={toggleOption} />}

          {activeTab === 'packages' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {vendor.packages.map((pkg) => (
                <div
                  key={pkg.id}
                  onClick={() => setSelectedPkgId(pkg.id)}
                  className={`p-5 rounded-2xl border cursor-pointer transition-all ${
                    selectedPkgId === pkg.id
                      ? 'bg-indigo-950/40 border-indigo-500 shadow-lg shadow-indigo-500/10'
                      : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-white text-base">{pkg.packageName}</h4>
                    <span className="font-display font-extrabold text-amber-400 text-lg">
                      ₹{pkg.price.toLocaleString('en-IN')}
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 mt-2">{pkg.description}</p>

                  <ul className="mt-4 space-y-2">
                    {pkg.includedServices.map((svc, i) => (
                      <li key={i} className="text-xs text-slate-300 flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-400" /> {svc}
                      </li>
                    ))}
                  </ul>
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
                    onClick={() => setSelectedImage(img)}
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
              <Upload className="w-12 h-12 text-indigo-400 mx-auto mb-4 animate-pulse" />
              <h4 className="font-bold text-lg text-white">Local Disk Storage Upload</h4>
              <p className="text-xs text-slate-400 mt-2 mb-6">
                Upload image assets directly to the local server disk drive at <code className="text-amber-400 font-mono">/uploads/vendor-{vendor.id}</code> using the <code className="text-indigo-400 font-mono">LocalStorageProvider</code> abstraction.
              </p>

              <label className="cursor-pointer inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-lg transition-all">
                <span>Select File to Upload</span>
                <input type="file" accept="image/*" onChange={handleLocalUpload} className="hidden" />
              </label>

              {uploading && <p className="text-xs text-indigo-400 mt-4">Uploading file to local disk...</p>}
              {uploadSuccess && <p className="text-xs text-emerald-400 mt-4 font-semibold">{uploadSuccess}</p>}
            </div>
          )}
        </div>

        {hasFixedAvailability && (
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
            </div>
          </div>
        )}

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

        {selectedOptions.length > 0 && (
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
            <span className="text-[11px] font-bold text-slate-400 uppercase">Selected Package</span>
            <div className="text-white font-bold text-sm">
              {selectedPkg?.packageName} — <span className="text-amber-400">₹{selectedPkg?.price.toLocaleString('en-IN')}</span>
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
                    <img
                      src={vendor.qrCodeImage}
                      alt={`${vendor.businessName} UPI QR code`}
                      className="w-40 h-40 rounded-xl object-cover border border-slate-800"
                    />
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
                    selectedPkg?.price,
                    customRequest || undefined,
                    selectedEventDate || undefined,
                    selectedOptions.length > 0 ? selectedOptions : undefined
                  );
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
    </div>
  );
};

