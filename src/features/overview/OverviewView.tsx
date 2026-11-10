import React from 'react';
import {
  Upload,
  ShieldCheck,
  Search,
  BookmarkCheck,
  Sparkles,
  FileText,
  Lock,
  HardDrive,
  MessageSquare
} from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { getStorageStats } from '@/core/storage/chat-repository';

interface OverviewViewProps {
  onOpenImport: () => void;
  onNavigateToChats?: () => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  onOpenImport,
  onNavigateToChats,
}) => {
  const stats = useLiveQuery(
    () => getStorageStats(),
    [],
    { chatCount: 0, messageCount: 0 }
  );

  return (
    <div className="max-w-5xl mx-auto space-y-8 py-2">
      {/* Hero Welcome / Overview Card */}
      <section className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 border border-emerald-100">
            <span className="flex h-2 w-2 rounded-full bg-emerald-600 animate-pulse" />
            Milestone 3 — Local Persistence Active
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Convert WhatsApp conversations into a structured personal knowledge base.
          </h2>

          <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
            MTNOTE extracts shared links, decisions, and conversation context from exported WhatsApp chats — securely stored and processed strictly within your local browser.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onOpenImport}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 active:bg-indigo-800 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              <Upload className="h-4 w-4" />
              <span>Import Chats</span>
            </button>

            {stats.chatCount > 0 && onNavigateToChats && (
              <button
                type="button"
                onClick={onNavigateToChats}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-100 hover:bg-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-800 transition-all"
              >
                <MessageSquare className="h-4 w-4 text-indigo-600" />
                <span>View {stats.chatCount} Imported {stats.chatCount === 1 ? 'Chat' : 'Chats'}</span>
              </button>
            )}

            <div className="inline-flex items-center gap-2 text-xs text-slate-500 px-3 py-2 rounded-lg bg-slate-50 border border-slate-200/60">
              <HardDrive className="h-4 w-4 text-emerald-600" />
              <span>IndexedDB: <strong>{stats.messageCount}</strong> messages</span>
            </div>
          </div>
        </div>

        {/* Decorative subtle background pattern */}
        <div
          aria-hidden="true"
          className="absolute -right-12 -top-12 h-64 w-64 rounded-full bg-indigo-50/60 blur-3xl pointer-events-none"
        />
      </section>

      {/* Local-First Privacy Notice Banner */}
      <section className="rounded-xl border border-emerald-200/80 bg-emerald-50/50 p-4 sm:p-5">
        <div className="flex items-start gap-3.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
            <Lock className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-emerald-950">
              Local-First &amp; Zero-Knowledge by Architecture
            </h3>
            <p className="text-xs text-emerald-800/90 leading-relaxed">
              Your conversations are never uploaded to any remote server or third-party service. All text parsing, indexing, and resource extraction happens entirely inside your browser memory and IndexedDB.
            </p>
          </div>
        </div>
      </section>

      {/* Feature Capabilities Grid */}
      <section className="space-y-4">
        <div className="border-b border-slate-200 pb-2">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">
            Platform Capabilities
          </h3>
          <p className="text-xs text-slate-500">
            Modular architecture progressing in verified milestones
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2 shadow-xs">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <FileText className="h-4 w-4" />
            </div>
            <h4 className="text-sm font-semibold text-slate-900">Chat Ingestion</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Parses standard .txt and .zip exports from Android &amp; iOS with full multiline and timestamp resilience.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2 shadow-xs">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
              <BookmarkCheck className="h-4 w-4" />
            </div>
            <h4 className="text-sm font-semibold text-slate-900">Resource Extraction</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Discovers URLs and documents while preserving original surrounding conversation context.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2 shadow-xs">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
              <Search className="h-4 w-4" />
            </div>
            <h4 className="text-sm font-semibold text-slate-900">Local Search</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Instant in-memory fuzzy search across messages and extracted topics with faceted filtering.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2 shadow-xs">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <Sparkles className="h-4 w-4" />
            </div>
            <h4 className="text-sm font-semibold text-slate-900">Grounded Intelligence</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Offline rule-based insights and optional privacy-gated AI providers for conversation analysis.
            </p>
          </div>
        </div>
      </section>

      {/* System Status Footprint */}
      <section className="rounded-xl border border-slate-200 bg-white p-4 text-xs text-slate-600 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-emerald-600" />
          <span>Storage Engine: <strong>IndexedDB (Dexie.js)</strong></span>
        </div>
        <div className="flex items-center gap-4 text-slate-500">
          <span>Active Chats: <strong>{stats.chatCount}</strong></span>
          <span>Stored Messages: <strong>{stats.messageCount}</strong></span>
          <span>Sandbox: <strong>Strict Local</strong></span>
        </div>
      </section>
    </div>
  );
};
