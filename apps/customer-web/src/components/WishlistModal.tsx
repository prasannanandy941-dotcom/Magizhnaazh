import React from 'react';
import { X, Heart, Star, MapPin, Trash2 } from 'lucide-react';
import { Vendor } from '../../../../packages/shared-types';
import { getVendorCoverImage } from './vendorUtils';

interface WishlistModalProps {
  vendors: Vendor[];
  onClose: () => void;
  onRemove: (id: string) => void;
  onSelectVendor: (vendor: Vendor) => void;
}

export const WishlistModal: React.FC<WishlistModalProps> = ({ vendors, onClose, onRemove, onSelectVendor }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="glass-card max-w-2xl w-full rounded-3xl border border-slate-800 shadow-2xl overflow-hidden max-h-[85vh] flex flex-col">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <h2 className="font-display font-bold text-xl text-white flex items-center gap-2">
            <Heart className="w-5 h-5 text-amber-400 fill-amber-400" /> Your Wishlist
            <span className="text-xs font-bold text-slate-400">({vendors.length})</span>
          </h2>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {vendors.length === 0 ? (
            <div className="text-center py-16">
              <Heart className="w-10 h-10 text-slate-700 mx-auto mb-3" />
              <p className="text-slate-400 text-sm">
                Nothing saved yet — tap the heart icon on any vendor card to add it here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {vendors.map((v) => (
                <div
                  key={v.id}
                  className="flex items-center gap-4 p-3 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-indigo-500/50 transition-colors"
                >
                  <img
                    src={getVendorCoverImage(v)}
                    alt={v.businessName}
                    className="w-16 h-16 rounded-xl object-cover flex-shrink-0"
                  />

                  <div
                    onClick={() => onSelectVendor(v)}
                    className="flex-1 min-w-0 cursor-pointer"
                  >
                    <span className="text-[11px] font-semibold text-indigo-400 uppercase tracking-wide">{v.category}</span>
                    <h4 className="font-bold text-sm text-white truncate">{v.businessName}</h4>
                    <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-400">
                      <span className="flex items-center gap-1">
                        <Star className="w-3 h-3 text-amber-400 fill-amber-400" /> {v.ratingAverage}
                      </span>
                      <span className="flex items-center gap-1 truncate">
                        <MapPin className="w-3 h-3" /> {v.location.city}
                      </span>
                      <span className="font-bold text-emerald-400">₹{v.startingPrice.toLocaleString('en-IN')}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => onRemove(v.id)}
                    title="Remove from wishlist"
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors flex-shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};