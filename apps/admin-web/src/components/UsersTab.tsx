import React, { useEffect, useState } from 'react';
import { Loader2, Ban, CheckCircle2, Trash2 } from 'lucide-react';
import { AdminUser, fetchAllUsers, toggleUserSuspension, deleteUser } from '../api';
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
      const res: any = await deleteUser(token, u.id);
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
        { label: 'Role', render: (u) => <span className={`px-2.5 py-1 rounded-full font-bold uppercase text-[10px] ${ROLE_STYLES[u.role] || ''}`}>{u.role}</span> },
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
