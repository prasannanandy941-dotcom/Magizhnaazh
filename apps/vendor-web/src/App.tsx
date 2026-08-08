import React, { useState } from 'react';
import { Store, Calendar, CreditCard, Star, Upload, Package, Check, MessageSquare, IndianRupee, MapPin, Plus, ShieldCheck } from 'lucide-react';

interface VendorPackage {
  id: string;
  packageName: string;
  price: number;
  description: string;
  includedServices: string[];
}

interface Booking {
  id: string;
  bookingNumber: string;
  customerName: string;
  eventDate: string;
  packageName: string;
  agreedPrice: number;
  advancePaid: number;
  status: 'confirmed' | 'quote_requested';
  specialNotes?: string;
}

export function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'packages' | 'portfolio' | 'profile'>('dashboard');

  const [businessName, setBusinessName] = useState('The Leela Palace Grand Ballroom');
  const [category, setCategory] = useState('Venue');
  const [city, setCity] = useState('Chennai');
  const [startingPrice, setStartingPrice] = useState(150000);
  const [description, setDescription] = useState('Luxury sea-facing banquets and grand ballroom in Chennai for royal weddings, grand receptions, and corporate galas.');
  
  const [galleryImages, setGalleryImages] = useState<string[]>([
    'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=800',
    'https://images.unsplash.com/photo-1545232979-fbf34fe37722?w=800',
  ]);

  const [uploading, setUploading] = useState(false);
  const [uploadNotice, setUploadNotice] = useState('');

  const [packages, setPackages] = useState<VendorPackage[]>([
    { id: 'pkg-1', packageName: 'Royal Ballroom Package', price: 150000, description: 'AC Ballroom hall for 600 guests, stage setup, basic lighting.', includedServices: ['Hall Rent', 'Stage Decor', 'Centralized AC', 'VIP Suite'] },
    { id: 'pkg-2', packageName: 'Luxury Ocean View Deck', price: 250000, description: 'Outdoor seaside lawn + grand indoor hall for 1200 guests.', includedServices: ['Ocean Lawn', 'Valet Parking', 'Power Backup', '2 Executive Rooms'] },
  ]);

  const [bookings, setBookings] = useState<Booking[]>([
    { id: 'bk-1', bookingNumber: 'BK-20260808-9481', customerName: 'Felix & Family', eventDate: '2026-12-15', packageName: 'Royal Ballroom Package', agreedPrice: 150000, advancePaid: 45000, status: 'confirmed', specialNotes: 'Need red carpet entry and stage microphone setup.' },
    { id: 'bk-2', bookingNumber: 'BK-20260808-9482', customerName: 'Anitha & Karthik', eventDate: '2026-11-20', packageName: 'Luxury Ocean View Deck', agreedPrice: 250000, advancePaid: 0, status: 'quote_requested', specialNotes: 'Requesting discount for 1000 guests.' },
  ]);

  const handleLocalUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadNotice('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(`http://localhost:8002/api/v1/vendors/vnd-1/upload`, {
        method: 'POST',
        body: formData,
      });
      const json = await res.json();
      if (json.success && json.data?.fileUrl) {
        setGalleryImages((prev) => [...prev, json.data.fileUrl]);
        setUploadNotice('Portfolio image saved to local disk storage (/uploads)!');
      } else {
        const previewUrl = URL.createObjectURL(file);
        setGalleryImages((prev) => [...prev, previewUrl]);
        setUploadNotice('Uploaded file preview saved to local storage session!');
      }
    } catch (err) {
      const previewUrl = URL.createObjectURL(file);
      setGalleryImages((prev) => [...prev, previewUrl]);
      setUploadNotice('Uploaded file preview saved to local storage session!');
    } finally {
      setUploading(false);
    }
  };

  const handleAcceptQuote = (id: string) => {
    setBookings((prev) =>
      prev.map((b) => (b.id === id ? { ...b, status: 'confirmed', advancePaid: Math.round(b.agreedPrice * 0.3) } : b))
    );
  };

  const confirmedBookings = bookings.filter((b) => b.status === 'confirmed');
  const totalEarnings = confirmedBookings.reduce((acc, b) => acc + b.advancePaid, 0);

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

          <div className="flex items-center gap-6 text-xs font-semibold">
            <span>Server: <strong className="text-emerald-400">Local Disk Storage Active</strong></span>
            <span className="text-slate-400">Port :3001</span>
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 max-w-7xl mx-auto px-4 py-10 w-full space-y-8">
        
        {/* Vendor Header Summary */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="font-display font-bold text-3xl text-white">{businessName}</h1>
            <p className="text-slate-400 text-sm mt-1">{category} • {city}</p>
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
                  {bookings.filter((b) => b.status === 'quote_requested').length}
                </div>
              </div>

              <div className="glass-card p-5 rounded-2xl border border-slate-800">
                <span className="text-xs font-bold text-slate-400 uppercase">Partner Rating</span>
                <div className="font-display font-extrabold text-2xl text-amber-400 mt-1 flex items-center gap-1">
                  <Star className="w-5 h-5 fill-amber-400" /> 4.9 (142 Reviews)
                </div>
              </div>
            </div>

            <div className="glass-card rounded-3xl border border-slate-800 overflow-hidden">
              <div className="p-6 border-b border-slate-800">
                <h3 className="font-bold text-lg text-white">Client Bookings & Quote Requests</h3>
              </div>

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
                        Client: <strong className="text-slate-200">{b.customerName}</strong> • Date: <strong className="text-amber-400">{b.eventDate}</strong>
                      </p>

                      {b.specialNotes && <p className="text-xs text-slate-300 mt-2 italic">"{b.specialNotes}"</p>}
                    </div>

                    <div className="text-right">
                      <span className="font-display font-extrabold text-xl text-emerald-400 block">
                        ₹{b.agreedPrice.toLocaleString('en-IN')}
                      </span>
                      <span className="text-[11px] text-slate-400 block">
                        Advance Paid: ₹{b.advancePaid.toLocaleString('en-IN')}
                      </span>

                      {b.status === 'quote_requested' && (
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
                Upload business images directly to local disk directory <code className="text-amber-400 font-mono">/uploads/vendor-vnd-1</code> using <code className="text-indigo-400 font-mono">LocalStorageProvider</code>.
              </p>

              <label className="cursor-pointer inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold text-xs shadow-lg transition-all hover:scale-105">
                <span>Choose Image to Upload</span>
                <input type="file" accept="image/*" onChange={handleLocalUpload} className="hidden" />
              </label>

              {uploading && <p className="text-xs text-indigo-400 mt-4">Saving file to local disk...</p>}
              {uploadNotice && <p className="text-xs text-emerald-400 mt-4 font-semibold">{uploadNotice}</p>}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {galleryImages.map((img, idx) => (
                <div key={idx} className="h-44 rounded-2xl overflow-hidden bg-slate-900 border border-slate-800">
                  <img src={img} alt={`Portfolio ${idx}`} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Service Packages Tab */}
        {activeTab === 'packages' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {packages.map((pkg) => (
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
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full p-3 rounded-xl bg-slate-900 border border-slate-800 text-white font-semibold text-xs"
                />
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
              <label className="block text-xs text-slate-400 mb-1">Business Description</label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full p-3 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs"
              />
            </div>

            <button className="px-6 py-3 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs shadow-md">
              Save Profile Changes
            </button>
          </div>
        )}

      </main>

      <footer className="border-t border-slate-800 py-6 text-center text-xs text-slate-500">
        © 2026 Magizhnaazh Vendor Management Portal — Port 3001
      </footer>
    </div>
  );
}
