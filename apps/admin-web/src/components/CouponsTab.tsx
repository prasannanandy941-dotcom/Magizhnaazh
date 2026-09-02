import React, { useEffect, useState, useMemo } from 'react';
import { 
  Ticket, 
  Tag, 
  Store, 
  Percent, 
  Plus, 
  Trash2, 
  Power, 
  CalendarDays, 
  Search, 
  Filter, 
  CheckCircle2, 
  Clock, 
  Loader2,
  Sparkles,
  X
} from 'lucide-react';
import { Vendor, VendorDeal, Coupon, VENDOR_CATEGORIES, isDealLive } from '../../../../packages/shared-types';
import { fetchVendors, updateVendorDeals, fetchCoupons, addCoupon, deleteCoupon } from '../api';

interface FlattenedVendorDeal {
  vendorId: string;
  vendorName: string;
  vendorCategory: string;
  vendorCity: string;
  deal: VendorDeal;
}

export const CouponsTab: React.FC<{ token: string }> = ({ token }) => {
  const [activeSubTab, setActiveSubTab] = useState<'vendor-offers' | 'platform-coupons'>('vendor-offers');
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Search & Filters for Vendor Offers
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'live' | 'paused' | 'expired'>('all');

  // Modal / Form state for Admin creating an offer on behalf of a vendor
  const [showAddDealModal, setShowAddDealModal] = useState(false);
  const [selectedVendorId, setSelectedVendorId] = useState('');
  const [dealForm, setDealForm] = useState({
    title: '',
    description: '',
    discountType: 'percent' as 'percent' | 'flat',
    discountValue: '',
    minOrderAmount: '',
    expiresAt: '',
  });
  const [dealSaving, setDealSaving] = useState(false);
  const [dealError, setDealError] = useState('');

  // Platform coupon form state
  const [couponForm, setCouponForm] = useState({
    code: '',
    discountPercent: '',
    expiresAt: '',
  });
  const [couponSaving, setCouponSaving] = useState(false);
  const [couponError, setCouponError] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [vRes, cRes] = await Promise.all([
        fetchVendors(),
        fetchCoupons(token).catch(() => ({ data: { coupons: [] } })),
      ]);
      setVendors(vRes.data?.vendors || []);
      setCoupons(cRes.data?.coupons || []);
    } catch (err) {
      console.error('Failed to load offers/coupons:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [token]);

  // Aggregate all vendor deals across all vendors
  const allVendorDeals: FlattenedVendorDeal[] = useMemo(() => {
    const list: FlattenedVendorDeal[] = [];
    vendors.forEach((v) => {
      (v.deals || []).forEach((d) => {
        list.push({
          vendorId: v.id,
          vendorName: v.businessName,
          vendorCategory: v.category,
          vendorCity: v.location?.city || 'India',
          deal: d,
        });
      });
    });
    return list;
  }, [vendors]);

  // Filtered vendor deals
  const filteredDeals = useMemo(() => {
    const now = new Date();
    return allVendorDeals.filter((item) => {
      const { deal, vendorName, vendorCategory } = item;
      const live = isDealLive(deal, now);
      const isExpired = deal.expiresAt && new Date(deal.expiresAt) < now;

      // Status filter
      if (statusFilter === 'live' && !live) return false;
      if (statusFilter === 'paused' && deal.isActive) return false;
      if (statusFilter === 'expired' && !isExpired) return false;

      // Category filter
      if (categoryFilter !== 'all' && vendorCategory !== categoryFilter) return false;

      // Search term
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesTitle = deal.title.toLowerCase().includes(q);
        const matchesVendor = vendorName.toLowerCase().includes(q);
        const matchesDesc = (deal.description || '').toLowerCase().includes(q);
        if (!matchesTitle && !matchesVendor && !matchesDesc) return false;
      }

      return true;
    });
  }, [allVendorDeals, statusFilter, categoryFilter, searchTerm]);

  // Stats
  const totalOffersCount = allVendorDeals.length;
  const liveOffersCount = allVendorDeals.filter((i) => isDealLive(i.deal)).length;
  const vendorsWithOffersCount = new Set(allVendorDeals.map((i) => i.vendorId)).size;

  // Toggle Vendor Deal Active Status
  const handleToggleDeal = async (vendorId: string, dealId: string) => {
    const vendor = vendors.find((v) => v.id === vendorId);
    if (!vendor) return;

    setBusyId(dealId);
    try {
      const updatedDeals = (vendor.deals || []).map((d) =>
        d.id === dealId ? { ...d, isActive: !d.isActive } : d
      );
      await updateVendorDeals(token, vendorId, updatedDeals);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to update offer status.');
    } finally {
      setBusyId(null);
    }
  };

  // Delete Vendor Deal
  const handleDeleteDeal = async (vendorId: string, dealId: string) => {
    if (!window.confirm('Are you sure you want to remove this vendor offer? Customers will no longer receive this discount.')) {
      return;
    }

    const vendor = vendors.find((v) => v.id === vendorId);
    if (!vendor) return;

    setBusyId(dealId);
    try {
      const updatedDeals = (vendor.deals || []).filter((d) => d.id !== dealId);
      await updateVendorDeals(token, vendorId, updatedDeals);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete offer.');
    } finally {
      setBusyId(null);
    }
  };

  // Admin add offer on behalf of a vendor
  const handleCreateVendorDeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVendorId) {
      setDealError('Please select a vendor.');
      return;
    }
    if (!dealForm.title.trim()) {
      setDealError('Please provide an offer title.');
      return;
    }
    const val = Number(dealForm.discountValue);
    if (!val || val <= 0) {
      setDealError('Discount value must be greater than 0.');
      return;
    }
    if (dealForm.discountType === 'percent' && val > 100) {
      setDealError('Percentage discount cannot exceed 100%.');
      return;
    }

    const vendor = vendors.find((v) => v.id === selectedVendorId);
    if (!vendor) return;

    setDealSaving(true);
    setDealError('');
    try {
      const newDeal: VendorDeal = {
        id: `deal-${Date.now()}`,
        title: dealForm.title.trim(),
        description: dealForm.description.trim() || undefined,
        discountType: dealForm.discountType,
        discountValue: val,
        minOrderAmount: dealForm.minOrderAmount ? Number(dealForm.minOrderAmount) : undefined,
        expiresAt: dealForm.expiresAt ? new Date(dealForm.expiresAt).toISOString() : undefined,
        isActive: true,
        createdAt: new Date().toISOString(),
      };

      const updatedDeals = [...(vendor.deals || []), newDeal];
      await updateVendorDeals(token, selectedVendorId, updatedDeals);
      await loadData();
      setShowAddDealModal(false);
      setDealForm({
        title: '',
        description: '',
        discountType: 'percent',
        discountValue: '',
        minOrderAmount: '',
        expiresAt: '',
      });
      setSelectedVendorId('');
    } catch (err: any) {
      setDealError(err.message || 'Failed to publish offer.');
    } finally {
      setDealSaving(false);
    }
  };

  // Add platform coupon
  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponForm.code.trim()) {
      setCouponError('Please enter a coupon code.');
      return;
    }
    const val = Number(couponForm.discountPercent);
    if (!val || val <= 0 || val > 100) {
      setCouponError('Discount must be between 1% and 100%.');
      return;
    }

    setCouponSaving(true);
    setCouponError('');
    try {
      await addCoupon(token, {
        code: couponForm.code.toUpperCase().trim(),
        discountPercent: val,
        expiresAt: couponForm.expiresAt || undefined,
      });
      await loadData();
      setCouponForm({ code: '', discountPercent: '', expiresAt: '' });
    } catch (err: any) {
      setCouponError(err.message || 'Failed to create coupon.');
    } finally {
      setCouponSaving(false);
    }
  };

  // Delete platform coupon
  const handleDeleteCoupon = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this coupon?')) return;
    setBusyId(id);
    try {
      await deleteCoupon(token, id);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete coupon.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-3xl text-white flex items-center gap-3">
            <Ticket className="w-8 h-8 text-rose-400" />
            Offers & Coupons Management
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Monitor and govern promotional offers published by vendors for customers, as well as platform discount codes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeSubTab === 'vendor-offers' && (
            <button
              onClick={() => setShowAddDealModal(true)}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 text-white font-bold text-xs shadow-lg transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Publish Offer for Vendor
            </button>
          )}
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card p-4 rounded-2xl border border-slate-800 bg-slate-900/60">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
            <span>Vendor Offers</span>
            <Tag className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-display font-extrabold text-white">{totalOffersCount}</div>
          <div className="text-[11px] text-slate-400 mt-1">Total recorded vendor deals</div>
        </div>

        <div className="glass-card p-4 rounded-2xl border border-slate-800 bg-slate-900/60">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
            <span>Live Offers</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-display font-extrabold text-emerald-400">{liveOffersCount}</div>
          <div className="text-[11px] text-slate-400 mt-1">Active on customer checkout</div>
        </div>

        <div className="glass-card p-4 rounded-2xl border border-slate-800 bg-slate-900/60">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
            <span>Participating Vendors</span>
            <Store className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-display font-extrabold text-white">{vendorsWithOffersCount}</div>
          <div className="text-[11px] text-slate-400 mt-1">Vendors with active offers</div>
        </div>

        <div className="glass-card p-4 rounded-2xl border border-slate-800 bg-slate-900/60">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
            <span>Platform Coupons</span>
            <Ticket className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-display font-extrabold text-indigo-300">{coupons.length}</div>
          <div className="text-[11px] text-slate-400 mt-1">Global promo codes</div>
        </div>
      </div>

      {/* Sub-tab switcher */}
      <div className="flex border-b border-slate-800 gap-6">
        <button
          onClick={() => setActiveSubTab('vendor-offers')}
          className={`pb-3 font-bold text-sm transition-colors border-b-2 flex items-center gap-2 ${
            activeSubTab === 'vendor-offers'
              ? 'border-rose-500 text-rose-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          Vendor Offers to Customers ({totalOffersCount})
        </button>

        <button
          onClick={() => setActiveSubTab('platform-coupons')}
          className={`pb-3 font-bold text-sm transition-colors border-b-2 flex items-center gap-2 ${
            activeSubTab === 'platform-coupons'
              ? 'border-rose-500 text-rose-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Percent className="w-4 h-4" />
          Platform Discount Coupons ({coupons.length})
        </button>
      </div>

      {/* SUB-TAB 1: VENDOR OFFERS */}
      {activeSubTab === 'vendor-offers' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="glass-card p-4 rounded-2xl border border-slate-800 bg-slate-900/60 flex flex-wrap gap-3 items-center justify-between">
            <div className="flex items-center gap-2 flex-1 min-w-[260px]">
              <div className="relative w-full">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by offer title, vendor name..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-rose-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1 text-xs text-slate-400">
                <Filter className="w-3.5 h-3.5" />
                <span>Category:</span>
              </div>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="py-2 px-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-semibold focus:outline-none"
              >
                <option value="all">All Categories</option>
                {VENDOR_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="py-2 px-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-semibold focus:outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="live">Live Only</option>
                <option value="paused">Paused</option>
                <option value="expired">Expired</option>
              </select>
            </div>
          </div>

          {/* Offers Table */}
          {loading ? (
            <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-rose-500" />
              <span className="text-xs font-semibold">Loading vendor offers...</span>
            </div>
          ) : filteredDeals.length === 0 ? (
            <div className="glass-card p-12 rounded-3xl border border-slate-800 text-center space-y-3">
              <Ticket className="w-12 h-12 text-slate-600 mx-auto" />
              <h3 className="font-bold text-white text-base">No Vendor Offers Found</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                {searchTerm || categoryFilter !== 'all' || statusFilter !== 'all'
                  ? 'No offers match your search/filter criteria.'
                  : 'Vendors haven\'t published any deals yet. You can publish one on their behalf using the button above.'}
              </p>
            </div>
          ) : (
            <div className="glass-card rounded-3xl border border-slate-800 overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3.5 px-4">Vendor Partner</th>
                      <th className="py-3.5 px-4">Offer Title & Details</th>
                      <th className="py-3.5 px-4">Discount</th>
                      <th className="py-3.5 px-4">Min. Booking</th>
                      <th className="py-3.5 px-4">Validity</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-medium">
                    {filteredDeals.map(({ vendorId, vendorName, vendorCategory, vendorCity, deal }) => {
                      const live = isDealLive(deal);
                      const isBusy = busyId === deal.id;

                      return (
                        <tr key={deal.id} className="hover:bg-slate-800/30 transition-colors">
                          {/* Vendor Info */}
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-white text-sm">{vendorName}</div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="px-2 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-300 text-[10px] font-semibold">
                                {vendorCategory}
                              </span>
                              <span className="text-slate-500 text-[10px]">{vendorCity}</span>
                            </div>
                          </td>

                          {/* Offer Title & Details */}
                          <td className="py-3.5 px-4 max-w-xs">
                            <div className="font-bold text-white text-sm flex items-center gap-1.5">
                              <span>{deal.title}</span>
                            </div>
                            {deal.description && (
                              <p className="text-[11px] text-slate-400 line-clamp-2 mt-0.5">
                                {deal.description}
                              </p>
                            )}
                            <div className="text-[9px] text-slate-500 mt-1">
                              Created: {new Date(deal.createdAt || Date.now()).toLocaleDateString()}
                            </div>
                          </td>

                          {/* Discount Value */}
                          <td className="py-3.5 px-4">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 font-extrabold text-xs font-mono">
                              {deal.discountType === 'percent'
                                ? `${deal.discountValue}% OFF`
                                : `₹${deal.discountValue.toLocaleString('en-IN')} FLAT OFF`}
                            </span>
                          </td>

                          {/* Min Booking */}
                          <td className="py-3.5 px-4 text-slate-300">
                            {deal.minOrderAmount ? (
                              <span>₹{deal.minOrderAmount.toLocaleString('en-IN')}</span>
                            ) : (
                              <span className="text-slate-500 italic">No minimum</span>
                            )}
                          </td>

                          {/* Validity */}
                          <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                            {deal.expiresAt ? (
                              <div className="flex items-center gap-1">
                                <CalendarDays className="w-3.5 h-3.5 text-slate-500" />
                                <span>Until {new Date(deal.expiresAt).toLocaleDateString()}</span>
                              </div>
                            ) : (
                              <span className="text-emerald-400/80">Ongoing / No expiry</span>
                            )}
                          </td>

                          {/* Status Badge */}
                          <td className="py-3.5 px-4">
                            {live ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-bold text-[10px]">
                                <CheckCircle2 className="w-3 h-3" /> Live
                              </span>
                            ) : !deal.isActive ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-700/50 text-slate-400 font-bold text-[10px]">
                                <Power className="w-3 h-3" /> Paused
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-300 font-bold text-[10px]">
                                <Clock className="w-3 h-3" /> Expired
                              </span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleToggleDeal(vendorId, deal.id)}
                                disabled={isBusy}
                                title={deal.isActive ? 'Pause offer' : 'Activate offer'}
                                className={`p-1.5 rounded-lg border transition-colors ${
                                  deal.isActive
                                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                                    : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border-emerald-500/40'
                                }`}
                              >
                                {isBusy ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Power className="w-3.5 h-3.5" />
                                )}
                              </button>

                              <button
                                onClick={() => handleDeleteDeal(vendorId, deal.id)}
                                disabled={isBusy}
                                title="Delete offer"
                                className="p-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 2: PLATFORM COUPONS */}
      {activeSubTab === 'platform-coupons' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Create Coupon Card */}
          <div className="glass-card p-6 rounded-3xl border border-slate-800 bg-slate-900/60 h-fit space-y-4">
            <div>
              <h3 className="font-bold text-lg text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-rose-400" />
                Create Platform Coupon
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Generate site-wide promo codes that customers can apply at checkout.
              </p>
            </div>

            <form onSubmit={handleCreateCoupon} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Coupon Code *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. WEDDING10"
                  value={couponForm.code}
                  onChange={(e) => setCouponForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono uppercase focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Discount % *</label>
                <input
                  type="number"
                  required
                  min="1"
                  max="100"
                  placeholder="e.g. 10"
                  value={couponForm.discountPercent}
                  onChange={(e) => setCouponForm((f) => ({ ...f, discountPercent: e.target.value }))}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Expiry Date (Optional)</label>
                <input
                  type="date"
                  value={couponForm.expiresAt}
                  onChange={(e) => setCouponForm((f) => ({ ...f, expiresAt: e.target.value }))}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-rose-500"
                />
              </div>

              {couponError && (
                <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
                  {couponError}
                </div>
              )}

              <button
                type="submit"
                disabled={couponSaving}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 text-white font-bold text-xs shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {couponSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Create Coupon Code
              </button>
            </form>
          </div>

          {/* List of Platform Coupons */}
          <div className="lg:col-span-2 space-y-3">
            <h3 className="font-bold text-base text-white">Active Platform Coupons</h3>

            {coupons.length === 0 ? (
              <div className="glass-card p-8 rounded-3xl border border-slate-800 text-center text-slate-400 text-xs">
                No platform coupons created yet. Use the form on the left to add your first code.
              </div>
            ) : (
              <div className="glass-card rounded-3xl border border-slate-800 overflow-hidden shadow-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Coupon Code</th>
                      <th className="py-3 px-4">Discount</th>
                      <th className="py-3 px-4">Expires</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-medium">
                    {coupons.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-white text-sm">{c.code}</td>
                        <td className="py-3 px-4 text-amber-400 font-bold font-mono">{c.discountPercent}% OFF</td>
                        <td className="py-3 px-4 text-slate-400 text-[11px]">{c.expiresAt || 'Never'}</td>
                        <td className="py-3 px-4">
                          {c.isActive ? (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-bold text-[10px]">
                              Active
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-slate-700 text-slate-400 font-bold text-[10px]">
                              Inactive
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleDeleteCoupon(c.id)}
                            disabled={busyId === c.id}
                            className="p-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: Publish Offer for Vendor */}
      {showAddDealModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card bg-slate-900 border border-slate-700 max-w-lg w-full rounded-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 font-bold text-white text-lg">
                <Store className="w-5 h-5 text-rose-400" />
                <span>Publish Offer for Vendor</span>
              </div>
              <button
                onClick={() => setShowAddDealModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateVendorDeal} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Select Vendor *</label>
                <select
                  required
                  value={selectedVendorId}
                  onChange={(e) => setSelectedVendorId(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-semibold focus:outline-none"
                >
                  <option value="">-- Choose a Vendor --</option>
                  {vendors.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.businessName} ({v.category} · {v.location?.city || 'India'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Offer Title *</label>
                <input
                  type="text"
                  required
                  maxLength={60}
                  placeholder="e.g. Wedding Season 15% OFF"
                  value={dealForm.title}
                  onChange={(e) => setDealForm((f) => ({ ...f, title: e.target.value }))}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Description (Optional)</label>
                <textarea
                  rows={2}
                  maxLength={140}
                  placeholder="Offer details / special conditions..."
                  value={dealForm.description}
                  onChange={(e) => setDealForm((f) => ({ ...f, description: e.target.value }))}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Discount Type</label>
                  <select
                    value={dealForm.discountType}
                    onChange={(e) => setDealForm((f) => ({ ...f, discountType: e.target.value as any }))}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-semibold"
                  >
                    <option value="percent">Percentage off (%)</option>
                    <option value="flat">Flat amount off (₹)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    {dealForm.discountType === 'percent' ? 'Percent (%) *' : 'Amount (₹) *'}
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder={dealForm.discountType === 'percent' ? '15' : '2000'}
                    value={dealForm.discountValue}
                    onChange={(e) => setDealForm((f) => ({ ...f, discountValue: e.target.value }))}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Min Order Amount (₹)</label>
                  <input
                    type="number"
                    placeholder="No minimum"
                    value={dealForm.minOrderAmount}
                    onChange={(e) => setDealForm((f) => ({ ...f, minOrderAmount: e.target.value }))}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Valid Until (Optional)</label>
                  <input
                    type="date"
                    value={dealForm.expiresAt}
                    onChange={(e) => setDealForm((f) => ({ ...f, expiresAt: e.target.value }))}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs"
                  />
                </div>
              </div>

              {dealError && (
                <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
                  {dealError}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddDealModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={dealSaving}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 text-white font-bold text-xs shadow-md disabled:opacity-50 flex items-center gap-2"
                >
                  {dealSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Publish Offer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

