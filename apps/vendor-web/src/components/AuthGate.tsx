import React, { useState } from 'react';
import { Store, LogIn, UserPlus, Loader2 } from 'lucide-react';
import { User, VENDOR_CATEGORIES, VendorCategory } from '../../../../packages/shared-types';
import { STATIC_CITY_GROUPS } from '../../../../packages/shared-utils';
import { login, register, createVendor } from '../api';
import { FloralGoldBackground } from './FloralGoldBackground';

interface AuthGateProps {
  onAuthSuccess: (user: User, token: string) => void;
}

export const AuthGate: React.FC<AuthGateProps> = ({ onAuthSuccess }) => {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [name, setName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [category, setCategory] = useState<VendorCategory>('Catering');
  const [city, setCity] = useState('Chennai');
  const [startingPrice, setStartingPrice] = useState('');
  const [description, setDescription] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'signin') {
        const res = await login(email, password);
        if (!res.success || !res.data) {
          throw new Error(res.message || 'Something went wrong.');
        }
        if (res.data.user.role !== 'vendor' && res.data.user.role !== 'admin') {
          throw new Error('This account is not registered as a vendor. Use the customer portal instead.');
        }
        onAuthSuccess(res.data.user, res.data.token);
        return;
      }

      // Sign-up creates the account and the marketplace listing together, in
      // one step, instead of registering first and then landing on a
      // separate "Create Your Vendor Listing" screen.
      const res = await register({ name, email, phone, password, businessName });
      if (!res.success || !res.data) {
        throw new Error(res.message || 'Something went wrong.');
      }

      await createVendor(res.data.token, {
        businessName,
        category,
        city,
        description,
        startingPrice: Number(startingPrice) || 0,
      } as any);

      onAuthSuccess(res.data.user, res.data.token);
    } catch (err: any) {
      setError(err.message || 'Unable to reach the server. Is the gateway running?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen text-slate-100 flex items-center justify-center p-4 font-sans">
      <div className="fixed inset-0 -z-10">
        <FloralGoldBackground />
      </div>
      <div className="glass-card max-w-md w-full rounded-3xl border border-slate-800 shadow-2xl overflow-hidden">
        <div className="px-6 py-6 border-b border-slate-800 bg-slate-900/60 flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center font-bold text-slate-950">
            <Store className="w-6 h-6" />
          </div>
          <div>
            <span className="font-display font-extrabold text-xl text-white block">Vendor Portal</span>
            <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">Business Partner Workspace</span>
          </div>
        </div>

        <div className="flex p-1.5 mx-6 mt-6 bg-slate-900/60 rounded-2xl border border-slate-800">
          <button
            type="button"
            onClick={() => setMode('signin')}
            className={`flex-1 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 ${
              mode === 'signin' ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-slate-950 shadow-md' : 'text-slate-400'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" /> Sign In
          </button>
          <button
            type="button"
            onClick={() => setMode('signup')}
            className={`flex-1 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 ${
              mode === 'signup' ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-slate-950 shadow-md' : 'text-slate-400'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" /> Register Business
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {mode === 'signup' && (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5">Your Name</label>
                <input
                  type="text"
                  name="ownerName"
                  autoComplete="name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Business owner name"
                  className="w-full p-3 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5">Business Name</label>
                <input
                  type="text"
                  name="businessName"
                  autoComplete="organization"
                  required
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="e.g. The Leela Palace Grand Ballroom"
                  className="w-full p-3 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm focus:outline-none focus:border-amber-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as VendorCategory)}
                    className="w-full p-3 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm focus:outline-none focus:border-amber-500"
                  >
                    {VENDOR_CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5">Starting Price (₹)</label>
                  <input
                    type="number"
                    required
                    value={startingPrice}
                    onChange={(e) => setStartingPrice(e.target.value)}
                    placeholder="e.g. 50000"
                    className="w-full p-3 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5">City / Locality</label>
                <select
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full p-3 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm focus:outline-none focus:border-amber-500"
                >
                  {STATIC_CITY_GROUPS.map(([state, cities]) => (
                    <optgroup key={state} label={state} className="bg-slate-900">
                      {cities.map((c) => (
                        <option key={`${state}-${c}`} value={c} className="bg-slate-900">{c}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                <p className="text-[10px] text-slate-500 mt-1">Customers filter vendors by city — pick where you operate.</p>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5">Description (optional)</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="A short description customers will see on your listing."
                  className="w-full p-3 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm focus:outline-none focus:border-amber-500"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1.5">Email</label>
            <input
              type="email"
              name="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@business.com"
              className="w-full p-3 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm focus:outline-none focus:border-amber-500"
            />
          </div>

          {mode === 'signup' && (
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1.5">Phone (optional)</label>
              <input
                type="tel"
                name="phone"
                autoComplete="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 9840112233"
                className="w-full p-3 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm focus:outline-none focus:border-amber-500"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1.5">Password</label>
            <input
              type="password"
              name="password"
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              required
              minLength={mode === 'signup' ? 6 : undefined}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full p-3 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm focus:outline-none focus:border-amber-500"
            />
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="shine-sweep w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-slate-950 font-bold text-sm shadow-md hover:scale-[1.01] transition-all disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {mode === 'signin' ? 'Sign In' : 'Register Business'}
          </button>

          <p className="text-center text-[11px] text-slate-500">
            Demo login: vendor@magizhnaazh.com / Passw0rd!
          </p>
        </form>
      </div>
    </div>
  );
};
