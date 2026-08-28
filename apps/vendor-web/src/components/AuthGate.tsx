import React, { useState } from 'react';
import { Store, LogIn, UserPlus, Loader2, Eye, EyeOff, Check } from 'lucide-react';
import { User, VENDOR_CATEGORIES, VendorCategory } from '../../../../packages/shared-types';
import { STATIC_CITY_GROUPS, checkPassword, isPasswordStrong } from '../../../../packages/shared-utils';
import { login, register, createVendor, sendOtp, forgotPassword, resetPassword, googleLogin } from '../api';
import { FloralGoldBackground } from './FloralGoldBackground';
import { GoogleSignInButton } from './GoogleSignInButton';

interface AuthGateProps {
  onAuthSuccess: (user: User, token: string) => void;
}

export const AuthGate: React.FC<AuthGateProps> = ({ onAuthSuccess }) => {
  // 'google-setup' is a new-vendor step shown after their first Google sign-in:
  // the account already exists, but a marketplace listing needs a category/city,
  // so we collect those before letting them into the dashboard.
  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot' | 'google-setup'>('signin');
  // Holds the freshly-created Google vendor's user + token while they finish the
  // business-details step above.
  const [pendingGoogleAuth, setPendingGoogleAuth] = useState<{ user: User; token: string } | null>(null);
  const [name, setName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [category, setCategory] = useState<VendorCategory>('Catering');
  const [city, setCity] = useState('Chennai');
  const [description, setDescription] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [otp, setOtp] = useState('');
  const [otpSending, setOtpSending] = useState(false);
  const [otpNotice, setOtpNotice] = useState('');

  const handleSendOtp = async () => {
    if (!email) {
      setError('Please enter your email first.');
      return;
    }
    setError('');
    setOtpNotice('');
    setOtpSending(true);
    try {
      const res = await sendOtp(email);
      setOtpNotice(res.message || 'OTP sent successfully!');
      if (res._devOtp) {
        console.log(`[Dev Mode] Generated OTP: ${res._devOtp}`);
        setOtpNotice(`Email delivery isn't set up yet — use this code to continue: ${res._devOtp}`);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to send OTP. Please try again.');
    } finally {
      setOtpSending(false);
    }
  };

  const handleForgotSendOtp = async () => {
    if (!email) {
      setError('Please enter your email address first.');
      return;
    }
    setError('');
    setOtpNotice('');
    setOtpSending(true);
    try {
      const res = await forgotPassword(email);
      setOtpNotice(res.message || 'Verification OTP sent to your email.');
      if (res._devOtp) {
        console.log(`[Dev Mode] Reset OTP: ${res._devOtp}`);
        setOtpNotice(`Email delivery isn't set up yet — use this code to continue: ${res._devOtp}`);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to send OTP. Please try again.');
    } finally {
      setOtpSending(false);
    }
  };

  const handleGoogleCredential = async (credential: string) => {
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const res = await googleLogin(credential);
      if (!res.success || !res.data) {
        throw new Error(res.message || 'Google sign-in failed.');
      }
      if (res.data.user.role !== 'vendor' && res.data.user.role !== 'admin') {
        throw new Error('This account is not registered as a vendor. Use the customer portal instead.');
      }
      if (res.data.isNewUser) {
        // Brand-new vendor — capture their token and collect business details
        // before creating the marketplace listing and entering the dashboard.
        setPendingGoogleAuth({ user: res.data.user, token: res.data.token });
        setBusinessName(res.data.user.name || '');
        setName(res.data.user.name || '');
        setMode('google-setup');
      } else {
        onAuthSuccess(res.data.user, res.data.token);
      }
    } catch (err: any) {
      setError(err.message || 'Google sign-in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      if (mode === 'google-setup') {
        if (!pendingGoogleAuth) {
          throw new Error('Your session expired. Please sign in with Google again.');
        }
        if (!businessName.trim()) {
          throw new Error('Please enter your business name.');
        }
        await createVendor(pendingGoogleAuth.token, {
          businessName,
          category,
          city,
          description,
          contactEmail: pendingGoogleAuth.user.email,
        } as any);
        onAuthSuccess(pendingGoogleAuth.user, pendingGoogleAuth.token);
        return;
      }

      if (mode === 'forgot') {
        if (!otp) {
          throw new Error('Please enter the OTP verification code.');
        }
        if (!password) {
          throw new Error('Please enter your new password.');
        }
        const res = await resetPassword(email, otp, password);
        setOtp('');
        setPassword('');
        setSuccess(res.message || 'Password reset successfully. Please sign in.');
        setMode('signin');
        return;
      }

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

      if (!otp) {
        throw new Error('Please enter the OTP verification code sent to your email.');
      }

      // Sign-up creates the account and the marketplace listing together, in
      // one step, instead of registering first and then landing on a
      // separate "Create Your Vendor Listing" screen.
      const res = await register({ name, email, phone, password, businessName, otp });
      if (!res.success || !res.data) {
        throw new Error(res.message || 'Something went wrong.');
      }

      // Starting price is no longer collected here — the vendor sets it later
      // in Business Profile settings. It defaults to 0 until then.
      await createVendor(res.data.token, {
        businessName,
        category,
        city,
        description,
        // Carry the phone captured at signup onto the marketplace listing so
        // it shows in Business Profile (and to customers) instead of the
        // service's default placeholder number.
        contactPhone: phone || undefined,
      } as any);

      onAuthSuccess(res.data.user, res.data.token);
    } catch (err: any) {
      setError(err.message || 'Unable to reach the server. Is the gateway running?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-light relative min-h-screen text-slate-100 flex items-center justify-center p-4 font-sans">
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

        {mode === 'google-setup' ? (
          <div className="mx-6 mt-6 p-3 bg-slate-900/60 rounded-2xl border border-slate-800">
            <span className="font-bold text-xs text-amber-400 block">Almost there — tell us about your business</span>
            <span className="text-[10px] text-slate-400">Signed in with Google. Add a few details to list on the marketplace.</span>
          </div>
        ) : mode === 'forgot' ? (
          <div className="mx-6 mt-6 p-3 bg-slate-900/60 rounded-2xl border border-slate-800 flex items-center justify-between">
            <span className="font-bold text-xs text-amber-400">Reset Your Password</span>
            <button
              type="button"
              onClick={() => {
                setError('');
                setSuccess('');
                setOtpNotice('');
                setMode('signin');
              }}
              className="text-[10px] text-slate-400 hover:text-white font-bold"
            >
              Back to Sign In
            </button>
          </div>
        ) : (
          <div className="flex p-1.5 mx-6 mt-6 bg-slate-900/60 rounded-2xl border border-slate-800">
            <button
              type="button"
              onClick={() => {
                setError('');
                setSuccess('');
                setOtpNotice('');
                setMode('signin');
              }}
              className={`flex-1 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 ${
                mode === 'signin' ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-slate-950 shadow-md' : 'text-slate-400'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" /> Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setError('');
                setSuccess('');
                setOtpNotice('');
                setMode('signup');
              }}
              className={`flex-1 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 ${
                mode === 'signup' ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-slate-950 shadow-md' : 'text-slate-400'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" /> Register Business
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {(mode === 'signup' || mode === 'google-setup') && (
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
                <p className="text-[10px] text-slate-500 mt-1">You'll set your starting price later in Business Profile.</p>
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

          {mode !== 'google-setup' && (
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1.5">Email</label>
            <div className="flex gap-2">
              <input
                type="email"
                name="email"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@business.com"
                className="flex-1 p-3 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm focus:outline-none focus:border-amber-500"
              />
              {(mode === 'signup' || mode === 'forgot') && (
                <button
                  type="button"
                  onClick={mode === 'forgot' ? handleForgotSendOtp : handleSendOtp}
                  disabled={otpSending}
                  className="px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 font-bold text-xs transition-colors shrink-0 flex items-center justify-center min-w-[90px]"
                >
                  {otpSending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Send OTP'}
                </button>
              )}
            </div>
            {otpNotice && (
              <p className="text-[10px] text-emerald-400 mt-1 font-semibold">{otpNotice}</p>
            )}
          </div>
          )}

          {(mode === 'signup' || mode === 'forgot') && (
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1.5">Verification Code (OTP)</label>
              <input
                type="text"
                name="otp"
                required
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="Enter 6-digit OTP"
                maxLength={6}
                className="w-full p-3 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm focus:outline-none focus:border-amber-500 tracking-[0.25em] text-center font-mono font-bold"
              />
              <p className="text-[9px] text-slate-500 mt-1">Verification is required to proceed.</p>
            </div>
          )}

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

          {mode !== 'google-setup' && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-400">
                {mode === 'forgot' ? 'New Password' : 'Password'}
              </label>
              {mode === 'signin' && (
                <button
                  type="button"
                  onClick={() => {
                    setError('');
                    setSuccess('');
                    setOtpNotice('');
                    setMode('forgot');
                  }}
                  className="text-[10px] text-amber-500 hover:text-amber-400 font-bold transition-colors font-sans"
                >
                  Forgot Password?
                </button>
              )}
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full p-3 pr-11 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm focus:outline-none focus:border-amber-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute inset-y-0 right-0 px-3 flex items-center text-slate-400 hover:text-amber-400 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {(mode === 'signup' || mode === 'forgot') && (
              <ul className="mt-2 grid grid-cols-1 gap-1">
                {checkPassword(password).map((r) => (
                  <li key={r.key} className={`flex items-center gap-1.5 text-[11px] ${r.met ? 'text-emerald-400' : 'text-slate-500'}`}>
                    <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 ${r.met ? 'bg-emerald-500/20' : 'bg-slate-800'}`}>
                      {r.met && <Check className="w-2.5 h-2.5" />}
                    </span>
                    {r.label}
                  </li>
                ))}
              </ul>
            )}
          </div>
          )}

          {success && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
              {success}
            </div>
          )}

          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || ((mode === 'signup' || mode === 'forgot') && !isPasswordStrong(password))}
            className="shine-sweep w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-slate-950 font-bold text-sm shadow-md hover:scale-[1.01] transition-all disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {mode === 'signin' ? 'Sign In' : mode === 'signup' ? 'Register Business' : mode === 'google-setup' ? 'Finish Setup' : 'Reset Password'}
          </button>

          {(mode === 'signin' || mode === 'signup') && (
            <GoogleSignInButton
              onCredential={handleGoogleCredential}
              text={mode === 'signup' ? 'signup_with' : 'signin_with'}
            />
          )}

          {mode !== 'google-setup' && (
            <p className="text-center text-[11px] text-slate-500">
              Demo login: vendor@magizhnaazh.com / Passw0rd!
            </p>
          )}
        </form>
      </div>
    </div>
  );
};
