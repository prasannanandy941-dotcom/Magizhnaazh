import React, { useState } from 'react';
import { Guest } from '../../../../packages/shared-types';
import { Users, UserPlus, CheckCircle2, XCircle, Clock, Share2, Utensils } from 'lucide-react';

interface GuestManagementProps {
  guests: Guest[];
  onAddGuest: (guest: Partial<Guest>) => void;
  onShareInviteLink: () => void;
}

export const GuestManagement: React.FC<GuestManagementProps> = ({
  guests,
  onAddGuest,
  onShareInviteLink,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [group, setGroup] = useState('Family');
  const [adultsCount, setAdultsCount] = useState(2);
  const [dietary, setDietary] = useState<'Veg' | 'Non-Veg'>('Veg');

  const acceptedGuests = guests.filter((g) => g.status === 'accepted');
  const pendingGuests = guests.filter((g) => g.status === 'invited');
  const totalHeadcount = acceptedGuests.reduce((acc, g) => acc + g.adultsCount + g.childrenCount, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    onAddGuest({
      name,
      email,
      phone,
      group,
      adultsCount: adultsCount || 1,
      childrenCount: 0,
      dietaryPreference: dietary,
      status: 'invited',
    });

    setName('');
    setEmail('');
    setPhone('');
    setShowAddModal(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-display font-bold text-3xl text-gradient-gold">Guest Management & RSVP Tracker</h2>
          <p className="text-slate-400 text-sm mt-1">Organize guest groups, food preferences, and track real-time RSVP responses.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={onShareInviteLink}
            className="px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-indigo-400 font-bold text-xs flex items-center gap-2"
          >
            <Share2 className="w-4 h-4" /> Share Web RSVP Link
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold text-xs shadow-lg flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4" /> + Add Guest
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="glass-card p-5 rounded-2xl border border-slate-800">
          <span className="text-xs font-bold text-slate-400 uppercase">Total Guests Invited</span>
          <div className="font-display font-extrabold text-2xl text-white mt-1">{guests.length}</div>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-slate-800">
          <span className="text-xs font-bold text-emerald-400 uppercase flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Accepted RSVPs
          </span>
          <div className="font-display font-extrabold text-2xl text-emerald-400 mt-1">{acceptedGuests.length}</div>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-slate-800">
          <span className="text-xs font-bold text-amber-400 uppercase flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" /> Pending Response
          </span>
          <div className="font-display font-extrabold text-2xl text-amber-400 mt-1">{pendingGuests.length}</div>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-slate-800">
          <span className="text-xs font-bold text-indigo-400 uppercase flex items-center gap-1">
            <Utensils className="w-3.5 h-3.5" /> Total Confirmed Plates
          </span>
          <div className="font-display font-extrabold text-2xl text-white mt-1">{totalHeadcount}</div>
        </div>
      </div>

      <div className="glass-card rounded-3xl border border-slate-800 overflow-hidden">
        <div className="p-6 border-b border-slate-800">
          <h3 className="font-bold text-lg text-white">Guest Roster ({guests.length})</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/60 text-slate-400 font-bold uppercase">
                <th className="p-4">Guest Name</th>
                <th className="p-4">Group</th>
                <th className="p-4">RSVP Status</th>
                <th className="p-4">Attendees</th>
                <th className="p-4">Food Preference</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {guests.map((g) => (
                <tr key={g.id} className="hover:bg-slate-900/40">
                  <td className="p-4 font-bold text-white">
                    {g.name}
                    {g.phone && <span className="block text-[11px] font-normal text-slate-400">{g.phone}</span>}
                  </td>
                  <td className="p-4">
                    <span className="px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 font-semibold text-slate-300">
                      {g.group || 'General'}
                    </span>
                  </td>
                  <td className="p-4">
                    {g.status === 'accepted' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-bold">
                        <CheckCircle2 className="w-3 h-3" /> Accepted
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 font-bold">
                        <Clock className="w-3 h-3" /> Invited
                      </span>
                    )}
                  </td>
                  <td className="p-4 font-semibold text-white">{g.adultsCount} Adults</td>
                  <td className="p-4 font-semibold text-emerald-400">{g.dietaryPreference || 'Veg'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="glass-card max-w-md w-full p-6 rounded-3xl border border-slate-800 space-y-4">
            <h3 className="font-bold text-lg text-white">Add New Guest to Event</h3>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Dr. R. Venkatraman"
                  className="w-full p-3 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Group</label>
                  <select
                    value={group}
                    onChange={(e) => setGroup(e.target.value)}
                    className="w-full p-3 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs font-semibold"
                  >
                    <option value="Bride Family">Bride Family</option>
                    <option value="Groom Family">Groom Family</option>
                    <option value="College Friends">College Friends</option>
                    <option value="VIP Guests">VIP Guests</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">Adults</label>
                  <input
                    type="number"
                    min={1}
                    value={adultsCount === 0 ? '' : adultsCount}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/^0+(?=\d)/, '');
                      e.target.value = raw;
                      setAdultsCount(raw === '' ? 0 : Number(raw));
                    }}
                    className="w-full p-3 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs font-semibold"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-800 text-slate-400 text-xs font-bold"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-bold shadow-md"
                >
                  Save Guest
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
