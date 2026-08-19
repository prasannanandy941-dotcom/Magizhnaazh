import React, { useEffect, useState } from 'react';
import { Loader2, Ban, CheckCircle2 } from 'lucide-react';
import { AdminUser, fetchAllUsers, toggleUserSuspension } from '../api';
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
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState('all');

  const load = async () => {
    setLoading(true);
    const res = await fetchAllUsers(token);
    setUsers(res.data?.users || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const toggleSuspend = async (id: string) => {
    setBusyId(id);
    await toggleUserSuspension(token, id);
    await load();
    setBusyId(null);
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
      title="Platform Users"
      subtitle="Every registered account — customers, vendors, and admins."
      toolbar={filterTabs}
      items={visibleUsers}
      loading={loading}
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
        )
      }
      emptyText={roleFilter === 'all' ? 'No users yet.' : `No ${roleFilter}s yet.`}
    />
  );
};
