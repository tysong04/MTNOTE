import React, { useState } from 'react';
import {
  Shield,
  Save,
  LogOut,
  Trash2,
  CheckCircle2,
  Database,
  Layers,
  Sparkles,
  AlertTriangle
} from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/core/storage/db';
import { getAllChats, purgeAllData } from '@/core/storage/chat-repository';
import { getAllResources } from '@/core/storage/resource-repository';
import {
  saveLocalProfile,
  signOutLocalSession,
  resetLocalProfile
} from '@/core/profile/profile-service';
import { UserProfile, UserPreferences } from '@/core/profile/types';
import { NavTab } from '@/types/navigation';

interface ProfileViewProps {
  user: UserProfile;
  onProfileUpdated: (updated: UserProfile) => void;
  onSignOut: () => void;
  onNavigateToTab?: (tab: NavTab) => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  user,
  onProfileUpdated,
  onSignOut,
}) => {
  // Form state
  const [displayName, setDisplayName] = useState(user.displayName);
  const [email, setEmail] = useState(user.email);
  const [bio, setBio] = useState(user.bio || '');
  const [role, setRole] = useState(user.role || 'Workspace Owner');
  const [passcode, setPasscode] = useState(user.passcode || '');

  // Preferences
  const [compactView, setCompactView] = useState(user.preferences?.compactView ?? false);
  const [autoExtractLinks, setAutoExtractLinks] = useState(user.preferences?.autoExtractLinks ?? true);
  const [defaultTab, setDefaultTab] = useState<NavTab>((user.preferences?.defaultTab as NavTab) || 'overview');

  const [savedSuccess, setSavedSuccess] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [purgeChatsOnReset, setPurgeChatsOnReset] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // Live workspace stats
  const chats = useLiveQuery(() => getAllChats(), []);
  const messagesCount = useLiveQuery(() => db.messages.count(), []);
  const resources = useLiveQuery(() => getAllResources(), []);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedPreferences: UserPreferences = {
      compactView,
      autoExtractLinks,
      defaultTab,
    };

    const updated = saveLocalProfile({
      displayName: displayName.trim() || user.displayName,
      email: email.trim() || user.email,
      bio: bio.trim(),
      role: role.trim(),
      passcode: passcode.trim() || undefined,
      preferences: updatedPreferences,
    });

    onProfileUpdated(updated);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleSignOutClick = () => {
    signOutLocalSession();
    onSignOut();
  };

  const handleConfirmReset = async () => {
    setIsResetting(true);
    try {
      if (purgeChatsOnReset) {
        await purgeAllData();
      }
      resetLocalProfile();
      onSignOut();
    } catch (err) {
      console.error('Reset failed:', err);
    } finally {
      setIsResetting(false);
      setShowResetModal(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-4 space-y-6">
      {/* Header Profile Hero Card */}
      <div className="rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row items-center sm:items-start gap-6">
        {/* Avatar */}
        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl bg-linear-to-tr from-indigo-600 to-indigo-500 text-white font-extrabold text-2xl shadow-lg shadow-indigo-500/20 ring-4 ring-indigo-50">
          {user.avatarInitial}
        </div>

        {/* Hero Info */}
        <div className="space-y-1.5 text-center sm:text-left flex-1 min-w-0">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
            <h1 className="text-xl font-bold text-slate-900 truncate">
              {user.displayName}
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
              {user.role || 'Workspace Owner'}
            </span>
          </div>
          <p className="text-xs text-slate-500">{user.email}</p>
          {user.bio && (
            <p className="text-xs text-slate-600 italic pt-1 max-w-xl">
              "{user.bio}"
            </p>
          )}

          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 pt-2 text-[11px] text-slate-400">
            <span>Profile Created: {new Date(user.createdAt).toLocaleDateString()}</span>
            <span>&bull;</span>
            <span className="flex items-center gap-1 text-emerald-600 font-medium">
              <Shield className="h-3.5 w-3.5" />
              Local Device Profile
            </span>
          </div>
        </div>

        {/* Sign Out Button */}
        <div className="shrink-0 pt-1">
          <button
            type="button"
            onClick={handleSignOutClick}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors shadow-2xs"
            title="Lock session and return to sign-in"
          >
            <LogOut className="h-3.5 w-3.5 text-slate-500" />
            <span>Lock Session</span>
          </button>
        </div>
      </div>

      {/* Workspace Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-1">
          <span className="text-xs text-slate-500 flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5 text-indigo-600" />
            Imported Conversations
          </span>
          <p className="text-2xl font-bold text-slate-900">{chats?.length || 0}</p>
          <span className="text-[11px] text-slate-400">Stored in IndexedDB</span>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-1">
          <span className="text-xs text-slate-500 flex items-center gap-1.5">
            <Database className="h-3.5 w-3.5 text-indigo-600" />
            Indexed Messages
          </span>
          <p className="text-2xl font-bold text-slate-900">{messagesCount || 0}</p>
          <span className="text-[11px] text-slate-400">Local full-text index</span>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-1">
          <span className="text-xs text-slate-500 flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
            Extracted Resources
          </span>
          <p className="text-2xl font-bold text-slate-900">{resources?.length || 0}</p>
          <span className="text-[11px] text-slate-400">Verifiable links</span>
        </div>
      </div>

      {/* Profile Edit Form */}
      <form onSubmit={handleSaveProfile} className="space-y-6">
        <div className="rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Personal Information</h2>
              <p className="text-xs text-slate-500">Update your on-device display identity and role.</p>
            </div>
            {savedSuccess && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold animate-in fade-in">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                <span>Changes Saved Locally!</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 block">Display Name</label>
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 block">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 block">Role / Title</label>
              <input
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="e.g. Researcher, Engineering Lead"
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 block">Device Passcode / PIN</label>
              <input
                type="password"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder="Optional device lock"
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div className="sm:col-span-2 space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 block">Bio / Notes</label>
              <textarea
                rows={2}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Personal notes or archive purpose..."
                className="w-full rounded-xl border border-slate-200 p-3 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>

          {/* Preferences Section */}
          <div className="pt-4 border-t border-slate-100 space-y-4">
            <div>
              <h3 className="text-xs font-bold text-slate-900">Application Preferences</h3>
              <p className="text-[11px] text-slate-500">Configure how conversations and resources appear.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50/50">
                <div className="space-y-0.5">
                  <span className="text-xs font-semibold text-slate-800 block">Compact Message Cards</span>
                  <span className="text-[11px] text-slate-500 block">Reduce padding in chat viewers</span>
                </div>
                <input
                  type="checkbox"
                  checked={compactView}
                  onChange={(e) => setCompactView(e.target.checked)}
                  className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50/50">
                <div className="space-y-0.5">
                  <span className="text-xs font-semibold text-slate-800 block">Auto-Extract Links</span>
                  <span className="text-[11px] text-slate-500 block">Scan for URLs automatically on import</span>
                </div>
                <input
                  type="checkbox"
                  checked={autoExtractLinks}
                  onChange={(e) => setAutoExtractLinks(e.target.checked)}
                  className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500"
                />
              </div>

              <div className="sm:col-span-2 flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50/50">
                <div className="space-y-0.5">
                  <span className="text-xs font-semibold text-slate-800 block">Default Landing Tab</span>
                  <span className="text-[11px] text-slate-500 block">Initial screen when opening Octonote</span>
                </div>
                <select
                  value={defaultTab}
                  onChange={(e) => setDefaultTab(e.target.value as NavTab)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700"
                >
                  <option value="overview">Overview</option>
                  <option value="chats">Chats</option>
                  <option value="resources">Resources</option>
                  <option value="search">Search</option>
                  <option value="insights">Insights</option>
                </select>
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/20 transition-colors"
            >
              <Save className="h-4 w-4" />
              <span>Save Profile Preferences</span>
            </button>
          </div>
        </div>
      </form>

      {/* Danger Zone: Reset Profile */}
      <div className="rounded-3xl border border-rose-200/80 bg-rose-50/30 p-6 shadow-2xs space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-xs font-bold text-rose-900">Reset Local Profile</h3>
            <p className="text-[11px] text-slate-600 mt-0.5">
              Clear your profile details from this browser. Your imported chat conversations remain safely preserved by default unless you choose to delete them.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowResetModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors shrink-0"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Reset Profile</span>
          </button>
        </div>
      </div>

      {/* Reset Confirmation Modal */}
      {showResetModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-3xl bg-white p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900">Reset Local Profile?</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  This will sign you out and clear your local profile details from this device's browser storage.
                </p>
              </div>
            </div>

            {/* Checkbox option to delete chats */}
            <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-start gap-2.5">
              <input
                id="purge-chats-checkbox"
                type="checkbox"
                checked={purgeChatsOnReset}
                onChange={(e) => setPurgeChatsOnReset(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded text-rose-600 focus:ring-rose-500"
              />
              <label htmlFor="purge-chats-checkbox" className="text-xs text-slate-700 leading-relaxed">
                <strong>Also delete all imported chats ({chats?.length || 0})</strong> and purge local IndexedDB storage completely.
              </label>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isResetting}
                onClick={handleConfirmReset}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-sm transition-colors"
              >
                {isResetting ? 'Resetting...' : 'Confirm Reset'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
