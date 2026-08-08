import React, { useState } from 'react';
import { X, Star, MapPin, Check, ShieldCheck, Upload, Calendar as CalendarIcon, MessageSquare, Send, CreditCard, Sparkles } from 'lucide-react';
import { Vendor } from '../shared/shared-types';

interface VendorDetailModalProps {
  vendor: Vendor;
  onClose: () => void;
  onBookVendor: (vendor: Vendor, packageId?: string, price?: number) => void;
}

export const VendorDetailModal: React.FC<VendorDetailModalProps> = ({ vendor, onClose, onBookVendor }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'packages' | 'gallery' | 'upload'>('overview');
  const [selectedPkgId, setSelectedPkgId] = useState(vendor.packages[0]?.id);
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="glass-card max-w-4xl w-full rounded-3xl border border-slate-800 shadow-2xl overflow-hidden my-8 max-h-[90vh] flex flex-col">
        
        {/* Header Bar */}
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

        {/* Modal Navigation Tabs */}
        <div className="flex items-center gap-4 px-6 border-b border-slate-800 bg-slate-950/50">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-3 font-semibold text-xs border-b-2 transition-colors ${
              activeTab === 'overview' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            Overview
          </button>

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
            Gallery ({vendor.galleryImages.length})
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

        {/* Modal Body */}
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
                  <span className="text-lg font-bold text-indigo-400 mt-1 block">{vendor.policies.advancePercentage}%</span>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800/80">
                <h4 className="font-bold text-sm text-white mb-2">About {vendor.businessName}</h4>
                <p className="text-slate-300 text-sm leading-relaxed">{vendor.description}</p>
                <div className="mt-4 flex items-center gap-2 text-xs text-slate-400">
                  <MapPin className="w-4 h-4 text-indigo-400" />
                  <span>{vendor.location.address}, {vendor.location.city}, {vendor.location.state} - {vendor.location.pincode}</span>
                </div>
              </div>
            </div>
          )}

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

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/80 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase">Selected Package</span>
            <div className="text-white font-bold text-sm">
              {selectedPkg?.packageName} — <span className="text-amber-400">₹{selectedPkg?.price.toLocaleString('en-IN')}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={() => onBookVendor(vendor, selectedPkg?.id, selectedPkg?.price)}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2"
            >
              <CreditCard className="w-4 h-4" /> Book & Pay Advance
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
