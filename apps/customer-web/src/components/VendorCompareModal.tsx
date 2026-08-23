import React from 'react';
import { X, Star, CheckCircle, Sparkles, Check, ArrowRight } from 'lucide-react';
import { Vendor } from '../../../../packages/shared-types';
import { getVendorCoverImage } from './vendorUtils';

interface VendorCompareModalProps {
  vendors: Vendor[];
  onClose: () => void;
  onSelectVendor: (vendor: Vendor) => void;
}

export const VendorCompareModal: React.FC<VendorCompareModalProps> = ({ vendors, onClose, onSelectVendor }) => {
  if (vendors.length === 0) return null;

  const bestMatch = [...vendors].sort(
    (a, b) => b.ratingAverage * b.yearsOfExperience - a.ratingAverage * a.yearsOfExperience
  )[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="glass-card max-w-6xl w-full rounded-3xl border border-slate-800 shadow-2xl overflow-hidden my-8 max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <h2 className="font-display font-bold text-xl text-white">Vendor Comparison Matrix</h2>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-x-auto overflow-y-auto flex-1">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="p-4 w-48 text-xs font-bold uppercase text-slate-400 bg-slate-900/40">Feature</th>
                {vendors.map((v) => (
                  <th key={v.id} className="p-4 text-center bg-slate-900/20 relative border-l border-slate-800/60">
                    {v.id === bestMatch?.id && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-amber-500 text-slate-950 font-bold text-[10px] uppercase tracking-wider shadow-md">
                        ★ Best Match
                      </span>
                    )}

                    <div className="w-20 h-20 mx-auto rounded-2xl overflow-hidden mb-3 border border-slate-700">
                      <img src={getVendorCoverImage(v)} alt={v.businessName} className="w-full h-full object-cover" />
                    </div>

                    <h4 className="font-bold text-sm text-white">{v.businessName}</h4>
                    <span className="text-[11px] text-slate-400">{v.category}</span>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800/60 text-xs">
              <tr>
                <td className="p-4 font-bold text-slate-300 bg-slate-900/40">Starting Price</td>
                {vendors.map((v) => (
                  <td key={v.id} className="p-4 text-center font-bold text-amber-400 text-sm border-l border-slate-800/60">
                    ₹{v.startingPrice.toLocaleString('en-IN')}
                  </td>
                ))}
              </tr>

              <tr>
                <td className="p-4 font-bold text-slate-300 bg-slate-900/40">Customer Rating</td>
                {vendors.map((v) => (
                  <td key={v.id} className="p-4 text-center text-slate-200 border-l border-slate-800/60">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 font-bold">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" /> {v.ratingAverage} ({v.reviewCount})
                    </span>
                  </td>
                ))}
              </tr>

              <tr>
                <td className="p-4 font-bold text-slate-300 bg-slate-900/40">Experience</td>
                {vendors.map((v) => (
                  <td key={v.id} className="p-4 text-center text-slate-300 border-l border-slate-800/60">
                    {v.yearsOfExperience} Years
                  </td>
                ))}
              </tr>

              <tr>
                <td className="p-4 font-bold text-slate-300 bg-slate-900/40">Location</td>
                {vendors.map((v) => (
                  <td key={v.id} className="p-4 text-center text-slate-300 border-l border-slate-800/60">
                    {v.location.city}
                  </td>
                ))}
              </tr>

              <tr>
                <td className="p-4 font-bold text-slate-300 bg-slate-900/40">Packages Offered</td>
                {vendors.map((v) => (
                  <td key={v.id} className="p-4 text-center text-slate-300 border-l border-slate-800/60">
                    {v.packages.length} Packages available
                  </td>
                ))}
              </tr>

              <tr>
                <td className="p-4 font-bold text-slate-300 bg-slate-900/40">Verified Partner</td>
                {vendors.map((v) => (
                  <td key={v.id} className="p-4 text-center border-l border-slate-800/60">
                    {v.isVerified ? (
                      <Check className="w-5 h-5 text-emerald-400 mx-auto" />
                    ) : (
                      <span className="text-slate-500">-</span>
                    )}
                  </td>
                ))}
              </tr>

              <tr>
                <td className="p-4 bg-slate-900/40"></td>
                {vendors.map((v) => (
                  <td key={v.id} className="p-4 text-center border-l border-slate-800/60">
                    <button
                      onClick={() => {
                        onClose();
                        onSelectVendor(v);
                      }}
                      className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-xs shadow-md transition-all"
                    >
                      Select Vendor
                    </button>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
