import React, { useState } from 'react';
import {
  ShieldCheck,
  User,
  Mail,
  Lock,
  ArrowRight,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import {
  registerLocalProfile,
  loginLocalProfile,
  getLocalProfile,
} from '@/core/profile/profile-service';
import { UserProfile } from '@/core/profile/types';

interface AuthScreenProps {
  onAuthenticated: (profile: UserProfile) => void;
  onContinueAsGuest?: () => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthenticated, onContinueAsGuest }) => {
  const existingProfile = getLocalProfile();
  const [mode, setMode] = useState<'login' | 'register'>(existingProfile ? 'login' : 'register');

  // Form Fields
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState(existingProfile?.email || '');
  const [passcode, setPasscode] = useState('');
  const [bio, setBio] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (mode === 'register') {
      const res = registerLocalProfile(displayName, email, bio, passcode);
      if (res.success && res.profile) {
        onAuthenticated(res.profile);
      } else {
        setErrorMessage(res.error || 'Failed to create local profile.');
      }
    } else {
      const res = loginLocalProfile(email, passcode);
      if (res.success && res.profile) {
        onAuthenticated(res.profile);
      } else {
        setErrorMessage(res.error || 'Failed to sign in.');
      }
    }
  };

  const handleQuickDemo = () => {
    const res = registerLocalProfile('Local Explorer', 'explorer@mtnote.local', 'Personal Knowledge Base');
    if (res.success && res.profile) {
      onAuthenticated(res.profile);
    } else if (existingProfile) {
      onAuthenticated(existingProfile);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-radial from-indigo-50/50 via-slate-50 to-slate-100 p-4 sm:p-6 font-sans">
      <div className="w-full max-w-md space-y-6">
        {/* Branding header */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-white font-bold text-2xl shadow-lg shadow-indigo-500/25 ring-4 ring-indigo-50">
            M
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">
            MTNOTE
          </h1>
          <p className="text-xs text-slate-500 max-w-xs mx-auto">
            Your private, offline-first personal knowledge base for WhatsApp conversations.
          </p>
        </div>

        {/* Card */}
        <div className="rounded-3xl border border-slate-200/80 bg-white/95 p-6 sm:p-8 shadow-xl shadow-slate-200/50 backdrop-blur-sm space-y-6">
          {/* Mode Tabs */}
          <div className="flex p-1 bg-slate-100/90 rounded-2xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setErrorMessage(null);
              }}
              className={`flex-1 py-2 rounded-xl transition-all ${
                mode === 'login'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setErrorMessage(null);
              }}
              className={`flex-1 py-2 rounded-xl transition-all ${
                mode === 'register'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              New Profile
            </button>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 block">
                  Display Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                    <User className="h-4 w-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="e.g. Alex Morgan"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-10 pr-3.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 block">
                Email Address <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-10 pr-3.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700 block">
                  Passcode / PIN <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
              </div>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type="password"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  placeholder={mode === 'register' ? 'Optional device lock code' : 'Enter passcode if configured'}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-10 pr-3.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                />
              </div>
            </div>

            {mode === 'register' && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 block">
                  Bio / Purpose <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="e.g. Research, Project Archiving, Personal Notes"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 px-3.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                />
              </div>
            )}

            <button
              type="submit"
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-xs font-bold text-white shadow-md shadow-indigo-600/25 hover:bg-indigo-700 active:bg-indigo-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all"
            >
              <span>{mode === 'register' ? 'Create Local Profile' : 'Unlock Workspace'}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          {/* Quick Start / Demo Button */}
          <div className="relative pt-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-[11px] uppercase tracking-wider">
              <span className="bg-white px-3 text-slate-400 font-medium">Or instant access</span>
            </div>
          </div>

          <button
            type="button"
            onClick={onContinueAsGuest || handleQuickDemo}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50/70 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
            <span>Continue as Guest / Instant Demo</span>
          </button>

          {/* Privacy Disclaimer */}
          <div className="rounded-2xl bg-indigo-50/50 border border-indigo-100 p-3.5 text-xs text-indigo-950 flex items-start gap-2.5">
            <ShieldCheck className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-semibold text-[11px] text-indigo-900">
                100% Local-First &amp; Device Scoped
              </p>
              <p className="text-[11px] text-indigo-700/90 leading-relaxed">
                MTNOTE runs completely in your browser. Profile settings and chat files are never uploaded to any remote server or external authentication provider.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
