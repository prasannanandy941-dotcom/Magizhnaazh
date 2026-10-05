import React, { useEffect, useState } from 'react';
import { Loader2, Ban, CheckCircle2, Trash2 } from 'lucide-react';
import { AdminUser, fetchAllUsers, toggleUserSuspension, deleteUser, fetchVendors, fetchBookings, fetchEvents } from '../api';
import { useCachedList } from '../useCachedList';
import { CrudListPanel } from './CrudListPanel';

const ROLE_STYLES: Record<string, string> = {
  customer: 'bg-indigo-500/20 text-indigo-300',
  vendor: 'bg-amber-500/20 text-amber-300',
  admin: 'bg-rose-500/20 text-rose-300',
  event_manager: 'bg-teal-500/20 text-teal-300',
  guest: 'bg-slate-500/20 text-slate-300',
};

// Role filters shown as tabs above the user table, so an admin can view
// customers and vendors separately instead of one mixed list.
const ROLE_FILTERS: { key: string; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'customer', label: 'Customers' },
  { key: 'vendor', label: 'Vendors' },
  { key: 'admin', label: 'Admins' },
];

export const UsersTab: React.FC<{ token: string; currentUserId: string }> = ({ token, currentUserId }) => {
  const { items: users, setItems: setUsers, loading, refreshing, reload: load } = useCachedList<AdminUser>('users', async () => (await fetchAllUsers(token)).data?.users || []);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState('all');

  // Activity per account: a customer's events / bookings / money paid, a vendor's business,
  // verification, Razorpay link, bookings and earnings. Joined here from the other services.
  type Activity = { events: number; bookings: number; paid: number; vendor?: any };
  const [activity, setActivity] = useState<Record<string, Activity>>({});
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [v, b, e] = await Promise.all([
        fetchVendors().catch(() => null),
        fetchBookings(token).catch(() => null),
        fetchEvents(token).catch(() => null),
      ]);
      if (cancelled) return;
      const map: Record<string, Activity> = {};
      const get = (id: string) => (map[id] ||= { events: 0, bookings: 0, paid: 0 });
      for (const ev of e?.data?.events || []) get(ev.userId).events++;
      const vendorByVendorId: Record<string, any> = {};
      for (const vd of v?.data?.vendors || []) { vendorByVendorId[vd.id] = vd; get(vd.userId).vendor = vd; }
      for (const bk of b?.data?.bookings || []) {
        if (bk.status === 'cancelled' || bk.status === 'refunded') continue;
        const c = get(bk.customerId);
        c.bookings++;
        c.paid += bk.advanceAmountPaid || 0;
        const owner = vendorByVendorId[bk.vendorId]?.userId;
        if (owner) { const o = get(owner); o.bookings++; o.paid += bk.advanceAmountPaid || 0; }
      }
      setActivity(map);
    })();
    return () => { cancelled = true; };
  }, [token, users.length]);
  const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;


  const toggleSuspend = async (id: string) => {
    setBusyId(id);
    await toggleUserSuspension(token, id);
    await load();
    setBusyId(null);
  };

  // Permanently delete an account (and a vendor's listing). Asks first; the server refuses
  // admins and accounts with upcoming bookings and says why.
  const removeUser = async (u: AdminUser) => {
    const extra = u.role === 'vendor' ? ' Their business listing will be deleted too.' : '';
    if (!window.confirm(`Delete ${u.name} (${u.email}) permanently?${extra} This cannot be undone.`)) return;
    setBusyId(u.id);
    try {
      let res: any = await deleteUser(token, u.id);
      if (res?.success === false && res.code === 'HAS_UPCOMING_BOOKINGS') {
        // Offer to cancel the upcoming bookings and delete anyway.
        const n = res.upcoming || 'its';
        if (!window.confirm(`${u.name} still has ${n} upcoming active booking${res.upcoming === 1 ? '' : 's'}.

Delete anyway? This CANCELS those bookings first (customers will see them as cancelled). Any money already paid must still be refunded by hand.`)) return;
        res = await deleteUser(token, u.id, true);
      }
      if (res?.success === false) throw new Error(res.message || 'Could not delete this user.');
      setUsers((prev) => prev.filter((x) => x.id !== u.id));
    } catch (err: any) {
      window.alert(err?.message || 'Could not delete this user.');
    } finally {
      setBusyId(null);
    }
  };

  const countFor = (key: string) => (key === 'all' ? users.length : users.filter((u) => u.role === key).length);
  const visibleUsers = roleFilter === 'all' ? users : users.filter((u) => u.role === roleFilter);

  const filterTabs = (
    <div className="flex flex-wrap gap-2">
      {ROLE_FILTERS.map((f) => {
        const active = roleFilter === f.key;
        return (
          <button
            key={f.key}
            type="button"
            onClick={() => setRoleFilter(f.key)}
            className={`px-4 py-2 rounded-xl font-bold text-xs transition-colors border ${
              active
                ? 'bg-gradient-to-r from-[#e85d8a] via-[#d4af37] to-[#b8336a] text-white border-transparent shadow-md'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            {f.label} <span className={active ? 'text-white/80' : 'text-slate-500'}>({countFor(f.key)})</span>
          </button>
        );
      })}
    </div>
  );

  return (
    <CrudListPanel
      itemLabel="users"
      title="Platform Users"
      subtitle="Every registered account — customers, vendors, and admins."
      toolbar={filterTabs}
      items={visibleUsers}
      loading={loading}
      refreshing={refreshing}
      rowKey={(u) => u.id}
      columns={[
        { label: 'Name', render: (u) => <span className="font-bold text-white">{u.name}</span> },
        { label: 'Email', render: (u) => u.email },
        { label: 'Phone', render: (u) => u.phone || <span className="text-slate-500">—</span> },
        { label: 'Role', render: (u) => <span className={`px-2.5 py-1 rounded-full font-bold uppercase text-[10px] ${ROLE_STYLES[u.role] || ''}`}>{u.role}</span> },
        { label: 'Sign-in', render: (u) => (u.authProvider === 'google' ? 'Google' : 'Email') },
        { label: 'Joined', render: (u) => (u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—') },
        {
          label: 'Details',
          render: (u) => {
            const a = activity[u.id];
            if (u.role === 'admin') return <span className="text-slate-500">—</span>;
            if (!a) return <span className="text-slate-500">No activity</span>;
            if (u.role === 'vendor') {
              const vd = a.vendor;
              const kyc = vd?.verification?.status || (vd?.isVerified ? 'verified' : 'not submitted');
              const rz = vd?.razorpay?.productStatus === 'activated' ? 'Razorpay connected' : 'Razorpay not connected';
              return (
                <div className="text-[11px] leading-snug space-y-0.5">
                  <p className="font-bold text-white">{vd?.businessName || 'No business listing yet'}{vd?.category ? ` · ${vd.category}` : ''}</p>
                  {vd?.location?.city && <p className="text-slate-400">{vd.location.city}</p>}
                  <p className={kyc === 'verified' ? 'text-emerald-400' : 'text-amber-300'}>KYC: {kyc}</p>
                  <p className={vd?.razorpay?.productStatus === 'activated' ? 'text-emerald-400' : 'text-slate-400'}>{rz}</p>
                  <p className="text-slate-300">{a.bookings} booking{a.bookings === 1 ? '' : 's'} · {inr(a.paid)} received</p>
                </div>
              );
            }
            return (
              <p className="text-[11px] text-slate-300">{a.events} event{a.events === 1 ? '' : 's'} · {a.bookings} booking{a.bookings === 1 ? '' : 's'} · {inr(a.paid)} paid</p>
            );
          },
        },
        {
          label: 'Status',
          render: (u) =>
            u.isSuspended ? (
              <span className="text-rose-400 font-bold">Suspended</span>
            ) : (
              <span className="text-emerald-400 font-bold">Active</span>
            ),
        },
      ]}
      rowAction={(u) =>
        u.id === currentUserId ? (
          <span className="text-[10px] text-slate-500">You</span>
        ) : (
          <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => toggleSuspend(u.id)}
            disabled={busyId === u.id}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs shadow-md disabled:opacity-60 inline-flex items-center gap-1.5 ${
              u.isSuspended ? 'bg-emerald-500 text-slate-950' : 'bg-rose-500/20 border border-rose-500/30 text-rose-300'
            }`}
          >
            {busyId === u.id ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : u.isSuspended ? (
              <CheckCircle2 className="w-3 h-3" />
            ) : (
              <Ban className="w-3 h-3" />
            )}
            {u.isSuspended ? 'Reinstate' : 'Suspend'}
          </button>
          {u.role !== 'admin' && (
            <button
              onClick={() => removeUser(u)}
              disabled={busyId === u.id}
              className="px-3 py-1.5 rounded-xl font-bold text-xs shadow-md disabled:opacity-60 inline-flex items-center gap-1.5 bg-rose-600 text-white hover:bg-rose-500"
            >
              <Trash2 className="w-3 h-3" /> Delete
            </button>
          )}
          </div>
        )
      }
      emptyText={roleFilter === 'all' ? 'No users yet.' : `No ${roleFilter}s yet.`}
    />
  );
};
