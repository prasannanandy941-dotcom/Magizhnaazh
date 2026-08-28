import React, { useState, useEffect } from 'react';
import { X, Sparkles, LogIn, UserPlus, Loader2, Eye, EyeOff, Check } from 'lucide-react';
import { User } from '../../../../packages/shared-types';
import { checkPassword, isPasswordStrong } from '../../../../packages/shared-utils';
import { login, register, sendOtp, forgotPassword, resetPassword, googleLogin } from '../api';
import { GoogleSignInButton } from './GoogleSignInButton';

interface AuthModalProps {
  onClose: () => void;
  onAuthSuccess: (user: User, token: string) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onClose, onAuthSuccess }) => {
  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot'>('signin');
  const [name, setName] = useState('');
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

  // Lock background scroll while the modal is open so scroll gestures move the
  // (tall) form itself, not the page behind it.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

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
      const res = await googleLogin(credential, 'customer');
      if (!res.success || !res.data) {
        throw new Error(res.message || 'Google sign-in failed.');
      }
      onAuthSuccess(res.data.user, res.data.token);
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

      if (mode === 'signup' && !otp) {
        throw new Error('Please enter the OTP verification code sent to your email.');
      }
      const res =
        mode === 'signin'
          ? await login(email, password)
          : await register({ name, email, phone, password, role: 'customer', otp });

      if (!res.success || !res.data) {
        throw new Error(res.message || 'Something went wrong.');
      }
      onAuthSuccess(res.data.user, res.data.token);
    } catch (err: any) {
      setError(err.message || 'Unable to reach the server. Is the gateway running?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto bg-slate-900/40 backdrop-blur-md">
      <div className="bg-white max-w-md w-full rounded-3xl border border-slate-200 shadow-2xl overflow-hidden my-auto">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <span className="font-bold text-sm text-slate-900">
              {mode === 'signin' ? 'Sign In' : mode === 'signup' ? 'Create Your Account' : 'Reset Your Password'}
            </span>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:text-slate-900 flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>

        {mode === 'forgot' ? (
          <div className="mx-6 mt-6 p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
            <span className="font-bold text-xs text-amber-600">Reset Your Password</span>
            <button
              type="button"
              onClick={() => {
                setError('');
                setSuccess('');
                setOtpNotice('');
                setMode('signin');
              }}
              className="text-[10px] text-slate-500 hover:text-slate-900 font-bold"
            >
              Back to Sign In
            </button>
          </div>
        ) : (
          <div className="flex p-1.5 mx-6 mt-6 bg-slate-100 rounded-2xl border border-slate-200">
            <button
              type="button"
              onClick={() => {
                setError('');
                setSuccess('');
                setOtpNotice('');
                setMode('signin');
              }}
              className={`flex-1 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 ${
                mode === 'signin' ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md' : 'text-slate-500'
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
                mode === 'signup' ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md' : 'text-slate-500'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" /> Sign Up
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {mode === 'signup' && (
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">Full Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Felix Kumar"
                className="w-full p-3 rounded-xl bg-white border-2 border-slate-800 text-slate-900 placeholder:text-slate-500 text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1.5">Email</label>
            <div className="flex gap-2">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="flex-1 p-3 rounded-xl bg-white border-2 border-slate-800 text-slate-900 placeholder:text-slate-500 text-sm focus:outline-none focus:border-indigo-500"
              />
              {(mode === 'signup' || mode === 'forgot') && (
                <button
                  type="button"
                  onClick={mode === 'forgot' ? handleForgotSendOtp : handleSendOtp}
                  disabled={otpSending}
                  className="px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-amber-600 border border-slate-300 font-bold text-xs transition-colors shrink-0 flex items-center justify-center min-w-[90px]"
                >
                  {otpSending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Send OTP'}
                </button>
              )}
            </div>
            {otpNotice && (
              <p className="text-[10px] text-emerald-600 mt-1 font-semibold">{otpNotice}</p>
            )}
          </div>

          {(mode === 'signup' || mode === 'forgot') && (
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">Verification Code (OTP)</label>
              <input
                type="text"
                required
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="Enter 6-digit OTP"
                maxLength={6}
                className="w-full p-3 rounded-xl bg-white border-2 border-slate-800 text-slate-900 placeholder:text-slate-500 text-sm focus:outline-none focus:border-indigo-500 tracking-[0.25em] text-center font-mono font-bold"
              />
              <p className="text-[9px] text-slate-500 mt-1">Verification is required to proceed.</p>
            </div>
          )}

          {mode === 'signup' && (
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">Phone (optional)</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 9840112233"
                className="w-full p-3 rounded-xl bg-white border-2 border-slate-800 text-slate-900 placeholder:text-slate-500 text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-800">
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
                  className="text-[10px] text-amber-600 hover:text-amber-700 font-bold transition-colors font-sans"
                >
                  Forgot Password?
                </button>
              )}
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full p-3 pr-11 rounded-xl bg-white border-2 border-slate-800 text-slate-900 placeholder:text-slate-500 text-sm focus:outline-none focus:border-indigo-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute inset-y-0 right-0 px-3 flex items-center text-slate-500 hover:text-indigo-600 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {(mode === 'signup' || mode === 'forgot') && (
              <ul className="mt-2 grid grid-cols-1 gap-1">
                {checkPassword(password).map((r) => (
                  <li key={r.key} className={`flex items-center gap-1.5 text-[11px] ${r.met ? 'text-emerald-600' : 'text-slate-400'}`}>
                    <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 ${r.met ? 'bg-emerald-500/20' : 'bg-slate-200'}`}>
                      {r.met && <Check className="w-2.5 h-2.5" />}
                    </span>
                    {r.label}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {success && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
              {success}
            </div>
          )}

          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || ((mode === 'signup' || mode === 'forgot') && !isPasswordStrong(password))}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold text-sm shadow-md hover:scale-[1.01] transition-all disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {mode === 'signin' ? 'Sign In' : mode === 'signup' ? 'Create Account' : 'Reset Password'}
          </button>

          {mode !== 'forgot' && (
            <GoogleSignInButton
              onCredential={handleGoogleCredential}
              text={mode === 'signup' ? 'signup_with' : 'signin_with'}
            />
          )}

          <p className="text-center text-[11px] text-slate-500">
            {mode === 'signin' ? (
              <>Demo login: customer@magizhnaazh.com / Passw0rd!</>
            ) : mode === 'signup' ? (
              <>Vendors: register on the Vendor Portal instead.</>
            ) : (
              <></>
            )}
          </p>
        </form>
      </div>
    </div>
  );
};
