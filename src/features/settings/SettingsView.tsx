import React, { useState } from 'react';
import {
  ShieldCheck,
  Trash2,
  HardDrive,
  Moon,
  Sun,
  AlertTriangle,
  Info,
  CheckCircle2
} from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { getStorageStats, purgeAllData } from '@/core/storage/chat-repository';

export const SettingsView: React.FC = () => {
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [purgeSuccess, setPurgeSuccess] = useState(false);
  const [isPurging, setIsPurging] = useState(false);

  const stats = useLiveQuery(
    () => getStorageStats(),
    [],
    { chatCount: 0, messageCount: 0 }
  );

  const handlePurgeAll = async () => {
    try {
      setIsPurging(true);
      await purgeAllData();
      localStorage.clear();
      sessionStorage.clear();
      setPurgeSuccess(true);
      setDeleteConfirmOpen(false);
      setTimeout(() => setPurgeSuccess(false), 4000);
    } catch (err) {
      console.error('Failed to purge local data:', err);
      alert('Error clearing data. Please try again.');
    } finally {
      setIsPurging(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-6 space-y-6">
      {/* Purge Notification */}
      {purgeSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>Local IndexedDB and browser storage purged successfully.</span>
        </div>
      )}

      {/* Privacy & Architecture Section */}
      <section className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="h-5 w-5 text-indigo-600" />
          <h3 className="text-base font-semibold text-slate-900">Privacy &amp; Data Control</h3>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed">
          MTNOTE operates strictly on a <strong>local-first</strong> security model. WhatsApp conversations are parsed client-side in memory and stored locally in browser IndexedDB.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
            <span className="text-xs font-semibold text-slate-800">Remote Egress: Zero</span>
            <p className="text-[11px] text-slate-500">
              No chat logs, extracted URLs, or messages are ever transmitted to MTNOTE servers.
            </p>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
            <span className="text-xs font-semibold text-slate-800">WhatsApp Credentials: None</span>
            <p className="text-[11px] text-slate-500">
              The application never connects directly to WhatsApp or requests user credentials.
            </p>
          </div>
        </div>
      </section>

      {/* Storage & Durability Section */}
      <section className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
        <div className="flex items-center gap-2.5">
          <HardDrive className="h-5 w-5 text-indigo-600" />
          <h3 className="text-base font-semibold text-slate-900">Local Storage Engine</h3>
        </div>
        <p className="text-xs text-slate-600">
          Database: <strong>IndexedDB (Dexie.js)</strong> — High capacity structured client storage.
        </p>

        <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div>
            <span className="font-semibold text-slate-800 block">Database Status</span>
            <span className="text-emerald-700 font-medium">Active &amp; Persisting Locally</span>
          </div>
          <div className="text-slate-600 text-right space-x-3">
            <span>Imported Chats: <strong>{stats.chatCount}</strong></span>
            <span>Messages: <strong>{stats.messageCount}</strong></span>
          </div>
        </div>
      </section>

      {/* Appearance Section */}
      <section className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
        <div className="flex items-center gap-2.5">
          <Sun className="h-5 w-5 text-amber-500" />
          <h3 className="text-base font-semibold text-slate-900">Appearance &amp; Theme</h3>
        </div>
        <p className="text-xs text-slate-600">
          Tailwind CSS color architecture is configured with dark theme class hooks ready for activation.
        </p>

        <div className="flex items-center gap-3">
          <button
            type="button"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium bg-slate-100 text-slate-900 border border-slate-300"
            disabled
          >
            <Sun className="h-4 w-4 text-amber-500" />
            <span>Light Theme (Active)</span>
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium text-slate-400 bg-slate-50 border border-slate-200 cursor-not-allowed"
            title="Dark theme toggle will be enabled in release polish milestone"
          >
            <Moon className="h-4 w-4" />
            <span>Dark Theme (Upcoming)</span>
          </button>
        </div>
      </section>

      {/* Danger Zone: Data Deletion */}
      <section className="bg-white rounded-2xl border border-rose-200 p-6 space-y-4">
        <div className="flex items-center gap-2.5 text-rose-700">
          <Trash2 className="h-5 w-5" />
          <h3 className="text-base font-semibold">Danger Zone</h3>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed">
          Permanently delete all locally stored chats, messages, and knowledge from this browser. This operation cannot be undone.
        </p>

        {!deleteConfirmOpen ? (
          <button
            type="button"
            onClick={() => setDeleteConfirmOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl border border-rose-200 transition-colors focus:outline-none focus:ring-2 focus:ring-rose-500"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Purge All Local Data</span>
          </button>
        ) : (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 space-y-3">
            <div className="flex items-start gap-2.5 text-rose-900 text-xs">
              <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
              <span>
                Are you sure? This will wipe all {stats.chatCount} chats and {stats.messageCount} messages currently stored in your browser's IndexedDB.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={isPurging}
                onClick={handlePurgeAll}
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors"
              >
                {isPurging ? 'Purging...' : 'Yes, Purge Everything'}
              </button>
              <button
                type="button"
                onClick={() => setDeleteConfirmOpen(false)}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Storage Quota Disclaimer */}
      <div className="flex items-start gap-2.5 text-slate-400 text-xs px-2">
        <Info className="h-4 w-4 shrink-0 mt-0.5" />
        <p>
          Browser storage capacity depends on your local device disk space and browser quota policy. IndexedDB typically permits gigabytes of local storage.
        </p>
      </div>
    </div>
  );
};
