import React, { useState } from 'react';
import { Star, MapPin, Heart, CheckCircle2, SlidersHorizontal, ArrowUpDown, Layers, Phone, Eye } from 'lucide-react';
import { Vendor, VendorCategory } from '../shared/shared-types';

interface VendorMarketplaceProps {
  vendors: Vendor[];
  onSelectVendor: (vendor: Vendor) => void;
  wishlist: string[];
  toggleWishlist: (vendorId: string) => void;
  selectedCompareIds: string[];
  toggleCompare: (vendorId: string) => void;
  openCompareModal: () => void;
}

const CATEGORIES: (VendorCategory | 'All')[] = [
  'All',
  'Venue',
  'Catering',
  'Photography',
  'Decoration',
  'Makeup & Beauty',
  'Transport',
  'Pujari/Priest',
  'Return Gifts',
  'Music/DJ',
];

export const VendorMarketplace: React.FC<VendorMarketplaceProps> = ({
  vendors,
  onSelectVendor,
  wishlist,
  toggleWishlist,
  selectedCompareIds,
  toggleCompare,
  openCompareModal,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState('All');
  const [sortBy, setSortBy] = useState<'rating' | 'price_low' | 'price_high'>('rating');

  const filteredVendors = vendors
    .filter((v) => {
      const matchCat = selectedCategory === 'All' || v.category === selectedCategory;
      const matchSearch =
        v.businessName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchCity = selectedCity === 'All' || v.location.city.toLowerCase() === selectedCity.toLowerCase();
      return matchCat && matchSearch && matchCity;
    })
    .sort((a, b) => {
      if (sortBy === 'rating') return b.ratingAverage - a.ratingAverage;
      if (sortBy === 'price_low') return a.startingPrice - b.startingPrice;
      if (sortBy === 'price_high') return b.startingPrice - a.startingPrice;
      return 0;
    });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="font-display font-bold text-2xl sm:text-3xl text-white tracking-tight">
            Explore Verified Vendors
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Showing {filteredVendors.length} premium event partners in Tamil Nadu
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs">
            <MapPin className="w-3.5 h-3.5 text-indigo-400" />
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="bg-transparent text-slate-200 font-semibold focus:outline-none cursor-pointer"
            >
              <option value="All" className="bg-slate-900">All Cities</option>
              <option value="Chennai" className="bg-slate-900">Chennai</option>
              <option value="Coimbatore" className="bg-slate-900">Coimbatore</option>
            </select>
          </div>

          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs">
            <ArrowUpDown className="w-3.5 h-3.5 text-amber-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-transparent text-slate-200 font-semibold focus:outline-none cursor-pointer"
            >
              <option value="rating" className="bg-slate-900">Top Rated First</option>
              <option value="price_low" className="bg-slate-900">Price: Low to High</option>
              <option value="price_high" className="bg-slate-900">Price: High to Low</option>
            </select>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-8 no-scrollbar">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-5 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all ${
              selectedCategory === cat
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 scale-105'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredVendors.map((vendor) => {
          const isWishlisted = wishlist.includes(vendor.id);
          const isCompared = selectedCompareIds.includes(vendor.id);

          return (
            <div
              key={vendor.id}
              className="glass-card glass-card-hover rounded-3xl overflow-hidden border border-slate-800 flex flex-col group"
            >
              <div className="relative h-56 w-full overflow-hidden bg-slate-900">
                <img
                  src={vendor.galleryImages[0]}
                  alt={vendor.businessName}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-80" />

                <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
                  <span className="px-3 py-1 rounded-full bg-slate-950/80 backdrop-blur-md text-slate-200 text-xs font-semibold border border-slate-700/50">
                    {vendor.category}
                  </span>

                  <button
                    onClick={() => toggleWishlist(vendor.id)}
                    className="w-9 h-9 rounded-full bg-slate-950/80 backdrop-blur-md flex items-center justify-center text-slate-300 hover:text-pink-500 transition-colors border border-slate-700/50"
                  >
                    <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-pink-500 text-pink-500' : ''}`} />
                  </button>
                </div>

                <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/90 text-slate-950 text-xs font-bold shadow-md">
                    <Star className="w-3.5 h-3.5 fill-slate-950" />
                    <span>{vendor.ratingAverage}</span>
                    <span className="text-[11px] font-normal text-slate-900">({vendor.reviewCount})</span>
                  </div>

                  {vendor.isVerified && (
                    <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-slate-950/80 px-2.5 py-1 rounded-lg border border-emerald-500/30">
                      <CheckCircle2 className="w-3 h-3" /> Verified
                    </span>
                  )}
                </div>
              </div>

              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="font-display font-bold text-lg text-white group-hover:text-indigo-400 transition-colors">
                    {vendor.businessName}
                  </h3>

                  <p className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                    <MapPin className="w-3.5 h-3.5 text-indigo-400" />
                    {vendor.location.address}, {vendor.location.city}
                  </p>

                  <p className="text-xs text-slate-300 mt-3 line-clamp-2 leading-relaxed">
                    {vendor.description}
                  </p>

                  <div className="mt-4 pt-4 border-t border-slate-800/80 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Starting From</span>
                      <span className="font-display font-extrabold text-xl text-amber-400">
                        ₹{vendor.startingPrice.toLocaleString('en-IN')}
                        {vendor.category === 'Catering' ? <span className="text-xs text-slate-400 font-normal"> / plate</span> : ''}
                      </span>
                    </div>

                    <span className="text-xs text-slate-400 font-medium">
                      {vendor.packages.length} Packages
                    </span>
                  </div>
                </div>

                <div className="mt-5 pt-4 flex items-center gap-2">
                  <button
                    onClick={() => onSelectVendor(vendor)}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5"
                  >
                    <Eye className="w-4 h-4" /> View Details
                  </button>

                  <button
                    onClick={() => toggleCompare(vendor.id)}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-semibold transition-all flex items-center gap-1 ${
                      isCompared
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                    title="Compare Vendor"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    {isCompared ? 'Added' : 'Compare'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {selectedCompareIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900/95 border border-indigo-500/40 backdrop-blur-xl px-6 py-3.5 rounded-2xl shadow-2xl flex items-center gap-6 animate-bounce">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-amber-400" />
            <span className="text-sm font-bold text-white">
              {selectedCompareIds.length} Vendors Selected for Comparison
            </span>
          </div>

          <button
            onClick={openCompareModal}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold text-xs shadow-md hover:scale-105 transition-all"
          >
            Launch Comparison Table
          </button>
        </div>
      )}
    </div>
  );
};
