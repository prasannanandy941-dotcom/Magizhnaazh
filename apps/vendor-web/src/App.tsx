import React, { useState, useEffect } from 'react';
import { Store, Star, Upload, Check, LogOut, Loader2, Plus } from 'lucide-react';
import { User, Vendor, VendorPackage, Booking, VENDOR_CATEGORIES } from '../../../packages/shared-types';
import { AuthGate } from './components/AuthGate';
import { fetchMyVendor, createVendor, updateVendor, fetchVendorBookings, confirmBooking } from './api';

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

  const [activeTab, setActiveTab] = useState<'dashboard' | 'packages' | 'portfolio' | 'profile'>('dashboard');

  const [myVendor, setMyVendor] = useState<Vendor | null>(null);
  const [vendorLoading, setVendorLoading] = useState(true);
  const [vendorNotFound, setVendorNotFound] = useState(false);

  const [businessName, setBusinessName] = useState('');
  const [category, setCategory] = useState('Venue');
  const [city, setCity] = useState('Chennai');
  const [startingPrice, setStartingPrice] = useState(50000);
  const [description, setDescription] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileNotice, setProfileNotice] = useState('');

  const [uploading, setUploading] = useState(false);
  const [uploadNotice, setUploadNotice] = useState('');

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);

  const [newPkgName, setNewPkgName] = useState('');
  const [newPkgPrice, setNewPkgPrice] = useState(50000);
  const [newPkgDesc, setNewPkgDesc] = useState('');
  const [savingPackage, setSavingPackage] = useState(false);

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
        setDescription(v.description);

        setBookingsLoading(true);
        const bkRes = await fetchVendorBookings(token, v.id);
        setBookings(bkRes.data?.bookings || []);
        setBookingsLoading(false);
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

  const handleCreateListing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSavingProfile(true);
    try {
      await createVendor(token, { businessName, category, description, startingPrice } as any);
      await loadVendorAndBookings();
    } catch (err: any) {
      setProfileNotice(err.message || 'Could not create your listing.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!token || !myVendor) return;
    setSavingProfile(true);
    setProfileNotice('');
    try {
      const res = await updateVendor(token, myVendor.id, { businessName, category, description, city, startingPrice } as any);
      if (res.data?.vendor) setMyVendor(res.data.vendor);
      setProfileNotice('Profile changes saved.');
    } catch (err: any) {
      setProfileNotice(err.message || 'Could not save changes.');
    } finally {
      setSavingProfile(false);
      setTimeout(() => setProfileNotice(''), 4000);
    }
  };

  const handleAddPackage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !myVendor || !newPkgName.trim()) return;
    setSavingPackage(true);
    try {
      const newPackage: VendorPackage = {
        id: `pkg-${Date.now()}`,
        packageName: newPkgName,
        price: newPkgPrice,
        description: newPkgDesc,
        includedServices: [],
      };
      const res = await updateVendor(token, myVendor.id, { packages: [...myVendor.packages, newPackage] } as any);
      if (res.data?.vendor) setMyVendor(res.data.vendor);
      setNewPkgName('');
      setNewPkgPrice(50000);
      setNewPkgDesc('');
    } finally {
      setSavingPackage(false);
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

      const res = await fetch(`http://localhost:8000/api/v1/vendors/${myVendor.id}/upload`, {
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

  const handleAcceptQuote = async (id: string) => {
    if (!token) return;
    await confirmBooking(token, id);
    if (myVendor) {
      const bkRes = await fetchVendorBookings(token, myVendor.id);
      setBookings(bkRes.data?.bookings || []);
    }
  };

  const confirmedBookings = bookings.filter((b) => b.status === 'confirmed' || b.status === 'completed');
  const totalEarnings = confirmedBookings.reduce((acc, b) => acc + b.advanceAmountPaid, 0);

  if (!user) {
    return <AuthGate onAuthSuccess={handleAuthSuccess} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">

      {/* Header */}
      <header className="sticky top-0 z-50 glass-card border-b border-slate-800 bg-slate-950/80 backdrop-blur-xl">
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
          <div className="glass-card p-8 rounded-3xl border border-slate-800 space-y-4">
            <h2 className="font-display font-bold text-2xl text-white">Create Your Vendor Listing</h2>
            <p className="text-xs text-slate-400">
              Your account doesn't have a marketplace listing yet. Set up the basics — you can add packages and photos after.
            </p>
            <form onSubmit={handleCreateListing} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Business Name</label>
                <input required value={businessName} onChange={(e) => setBusinessName(e.target.value)} className="w-full p-3 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full p-3 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm"
                  >
                    {VENDOR_CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Starting Price (₹)</label>
                  <input type="number" value={startingPrice} onChange={(e) => setStartingPrice(Number(e.target.value))} className="w-full p-3 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Description</label>
                <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} className="w-full p-3 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm" />
              </div>
              {profileNotice && <p className="text-xs text-rose-400">{profileNotice}</p>}
              <button disabled={savingProfile} type="submit" className="w-full py-3 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs shadow-md disabled:opacity-60 flex items-center justify-center gap-2">
                {savingProfile && <Loader2 className="w-4 h-4 animate-spin" />} Create Listing
              </button>
            </form>
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

          <div className="p-4 rounded-2xl glass-card border border-emerald-500/30 flex items-center gap-6">
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-400 block">Total Earnings</span>
              <span className="font-display font-extrabold text-2xl text-emerald-400">
                ₹{totalEarnings.toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-4 border-b border-slate-800">
          {[
            { key: 'dashboard', label: 'Bookings & Quotes' },
            { key: 'packages', label: 'Service Packages' },
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
                          <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-bold text-xs">
                            {b.status}
                          </span>
                        </div>

                        <p className="text-xs text-slate-400 mt-1">
                          Package: <strong className="text-slate-200">{b.packageName}</strong> • Date: <strong className="text-amber-400">{b.eventDate}</strong>
                        </p>

                        {b.specialInstructions && <p className="text-xs text-slate-300 mt-2 italic">"{b.specialInstructions}"</p>}
                      </div>

                      <div className="text-right">
                        <span className="font-display font-extrabold text-xl text-emerald-400 block">
                          ₹{b.agreedPrice.toLocaleString('en-IN')}
                        </span>
                        <span className="text-[11px] text-slate-400 block">
                          Advance Paid: ₹{b.advanceAmountPaid.toLocaleString('en-IN')}
                        </span>

                        {(b.status === 'quote_requested' || b.status === 'enquiry') && (
                          <button
                            onClick={() => handleAcceptQuote(b.id)}
                            className="mt-3 px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs shadow-md"
                          >
                            Accept Booking Quote
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
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

        {/* Service Packages Tab */}
        {activeTab === 'packages' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {myVendor.packages.map((pkg) => (
                <div key={pkg.id} className="glass-card p-6 rounded-2xl border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-white text-lg">{pkg.packageName}</h4>
                    <span className="font-display font-extrabold text-amber-400 text-lg">
                      ₹{pkg.price.toLocaleString('en-IN')}
                    </span>
                  </div>

                  <p className="text-xs text-slate-400">{pkg.description}</p>

                  <ul className="space-y-1.5 pt-2">
                    {pkg.includedServices.map((s, i) => (
                      <li key={i} className="text-xs text-slate-300 flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-400" /> {s}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <form onSubmit={handleAddPackage} className="glass-card p-6 rounded-2xl border border-slate-800 space-y-3 max-w-xl">
              <h4 className="font-bold text-white text-sm flex items-center gap-2"><Plus className="w-4 h-4 text-amber-400" /> Add a New Package</h4>
              <input required placeholder="Package name" value={newPkgName} onChange={(e) => setNewPkgName(e.target.value)} className="w-full p-3 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm" />
              <input type="number" placeholder="Price" value={newPkgPrice} onChange={(e) => setNewPkgPrice(Number(e.target.value))} className="w-full p-3 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm" />
              <textarea rows={2} placeholder="Description" value={newPkgDesc} onChange={(e) => setNewPkgDesc(e.target.value)} className="w-full p-3 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm" />
              <button disabled={savingPackage} type="submit" className="px-5 py-2.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs shadow-md disabled:opacity-60 flex items-center gap-2">
                {savingPackage && <Loader2 className="w-4 h-4 animate-spin" />} Add Package
              </button>
            </form>
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
                <label className="block text-xs text-slate-400 mb-1">City</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full p-3 rounded-xl bg-slate-900 border border-slate-800 text-white font-semibold text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Starting Price (₹)</label>
              <input
                type="number"
                value={startingPrice}
                onChange={(e) => setStartingPrice(Number(e.target.value))}
                className="w-full p-3 rounded-xl bg-slate-900 border border-slate-800 text-white font-semibold text-xs"
              />
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
