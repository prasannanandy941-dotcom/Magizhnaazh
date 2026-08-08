import React, { useState } from 'react';
import { X, Calendar as CalendarIcon, Clock, MapPin, CheckCircle, Heart, Sparkles, Send } from 'lucide-react';
import { Invitation } from '../shared/shared-types';

interface PublicInvitationViewProps {
  invitation: Invitation;
  onClose: () => void;
  onSubmitRSVP: (rsvpData: { name: string; status: 'accepted' | 'declined'; adults: number; dietary: string }) => void;
}

export const PublicInvitationView: React.FC<PublicInvitationViewProps> = ({
  invitation,
  onClose,
  onSubmitRSVP,
}) => {
  const [showRsvpForm, setShowRsvpForm] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [status, setStatus] = useState<'accepted' | 'declined'>('accepted');
  const [adults, setAdults] = useState(2);
  const [dietary, setDietary] = useState('Veg');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName) return;

    onSubmitRSVP({ name: guestName, status, adults, dietary });
    setSubmitted(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-xl overflow-y-auto">
      <div className="glass-card max-w-2xl w-full rounded-3xl border border-slate-800 shadow-2xl overflow-hidden my-8 relative">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-slate-950/80 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Decorative Top Banner */}
        <div className="h-48 w-full bg-gradient-to-r from-indigo-900 via-purple-900 to-slate-900 flex items-center justify-center relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-400/20 via-transparent to-transparent" />
          
          <div className="text-center relative z-10 p-6">
            <span className="text-amber-400 font-bold uppercase tracking-widest text-xs">Digital Web Invitation</span>
            <h2 className="font-script text-4xl sm:text-5xl text-white mt-1">{invitation.hostName}</h2>
          </div>
        </div>

        {/* Invitation Card Body */}
        <div className="p-8 sm:p-10 text-center space-y-6">
          <div>
            <h1 className="font-display font-extrabold text-3xl sm:text-4xl text-white tracking-tight">
              {invitation.eventTitle}
            </h1>
            <p className="text-slate-300 text-sm mt-3 leading-relaxed max-w-lg mx-auto">
              "{invitation.message}"
            </p>
          </div>

          {/* Event Metadata Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-800">
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 text-center">
              <CalendarIcon className="w-5 h-5 text-indigo-400 mx-auto mb-1" />
              <span className="text-xs text-slate-400 block">Date</span>
              <span className="font-bold text-sm text-white">{invitation.date}</span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 text-center">
              <Clock className="w-5 h-5 text-amber-400 mx-auto mb-1" />
              <span className="text-xs text-slate-400 block">Time</span>
              <span className="font-bold text-sm text-white">{invitation.time}</span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 text-center">
              <MapPin className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
              <span className="text-xs text-slate-400 block">Venue</span>
              <span className="font-bold text-xs text-white truncate block">{invitation.venueName}</span>
            </div>
          </div>

          {/* Map Link */}
          {invitation.mapLocationUrl && (
            <a
              href={invitation.mapLocationUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-bold underline"
            >
              <MapPin className="w-3.5 h-3.5" /> View Venue Map Location
            </a>
          )}

          {/* RSVP Actions */}
          <div className="pt-6">
            {!showRsvpForm && !submitted && (
              <button
                onClick={() => setShowRsvpForm(true)}
                className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold text-sm shadow-xl shadow-emerald-500/20 transition-all hover:scale-105"
              >
                Respond to RSVP Now
              </button>
            )}

            {submitted && (
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm font-bold flex items-center justify-center gap-2">
                <CheckCircle className="w-5 h-5" /> Your RSVP response has been submitted! Thank you.
              </div>
            )}

            {showRsvpForm && !submitted && (
              <form onSubmit={handleSubmit} className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 text-left space-y-4 max-w-md mx-auto">
                <h4 className="font-bold text-white text-base">Submit Your RSVP</h4>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">Your Full Name</label>
                  <input
                    type="text"
                    required
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    placeholder="e.g. Suresh Kumar"
                    className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-white font-semibold text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Attending Status</label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as any)}
                      className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-white font-semibold text-xs focus:outline-none"
                    >
                      <option value="accepted">Joyfully Accept</option>
                      <option value="declined">Regretfully Decline</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Adults Count</label>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={adults}
                      onChange={(e) => setAdults(Number(e.target.value))}
                      className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-white font-semibold text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">Food Preference</label>
                  <select
                    value={dietary}
                    onChange={(e) => setDietary(e.target.value)}
                    className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-white font-semibold text-xs"
                  >
                    <option value="Veg">Traditional Pure Veg Feast</option>
                    <option value="Non-Veg">Non-Veg Buffet</option>
                    <option value="Jain">Jain Meals</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5"
                >
                  <Send className="w-4 h-4" /> Submit RSVP Response
                </button>
              </form>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};
