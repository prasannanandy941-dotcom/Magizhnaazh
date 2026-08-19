import React, { useState } from 'react';
import { ShieldCheck, LogIn, Loader2, Eye, EyeOff } from 'lucide-react';
import { User } from '../../../../packages/shared-types';
import { login } from '../api';
import { FloralGoldBackground } from './FloralGoldBackground';

interface AuthGateProps {
  onAuthSuccess: (user: User, token: string) => void;
}

export const AuthGate: React.FC<AuthGateProps> = ({ onAuthSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await login(email, password);
      if (!res.success || !res.data) {
        throw new Error(res.message || 'Something went wrong.');
      }
      if (res.data.user.role !== 'admin') {
        throw new Error('This account does not have admin access.');
      }
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
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#e85d8a] via-[#d4af37] to-[#b8336a] flex items-center justify-center font-bold text-white shadow-lg">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <span className="font-display font-extrabold text-xl text-white block">Super Admin</span>
            <span className="text-[10px] text-rose-400 font-bold uppercase tracking-wider">Governance & Microservices Portal</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1.5">Admin Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@magizhnaazh.com"
              className="w-full p-3 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm focus:outline-none focus:border-rose-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1.5">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full p-3 pr-11 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm focus:outline-none focus:border-rose-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute inset-y-0 right-0 px-3 flex items-center text-slate-400 hover:text-rose-400 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="shine-sweep w-full py-3 rounded-xl bg-gradient-to-r from-[#e85d8a] via-[#d4af37] to-[#b8336a] text-white font-bold text-sm shadow-md hover:scale-[1.01] transition-all disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
            Sign In
          </button>

          <p className="text-center text-[11px] text-slate-500">
            Demo login: admin@magizhnaazh.com / Passw0rd!
          </p>
          <p className="text-center text-[10px] text-slate-600">
            Admin accounts are provisioned by the platform team — there's no self-registration here.
          </p>
        </form>
      </div>
    </div>
  );
};
