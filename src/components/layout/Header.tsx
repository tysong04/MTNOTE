import React from 'react';
import { Menu, Shield, Upload } from 'lucide-react';
import { NavTab } from '@/types/navigation';

interface HeaderProps {
  currentTab: NavTab;
  onOpenMobileSidebar: () => void;
  onOpenImport: () => void;
}

const TAB_TITLES: Record<NavTab, { title: string; subtitle: string }> = {
  overview: {
    title: 'Workspace Overview',
    subtitle: 'Personal knowledge base derived from WhatsApp conversations',
  },
  chats: {
    title: 'Imported Chats',
    subtitle: 'All indexed WhatsApp conversations and export archives',
  },
  resources: {
    title: 'Knowledge Resources',
    subtitle: 'Extracted links, references, and shared content',
  },
  search: {
    title: 'Search & Discovery',
    subtitle: 'Find messages, extracted topics, and references',
  },
  insights: {
    title: 'Conversation Intelligence',
    subtitle: 'Key decisions, action items, and topic summaries',
  },
  settings: {
    title: 'Settings & Data Control',
    subtitle: 'Manage local storage, data deletion, and privacy options',
  },
};

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onOpenMobileSidebar,
  onOpenImport,
}) => {
  const info = TAB_TITLES[currentTab];

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white/95 px-4 sm:px-6 backdrop-blur">
      <div className="flex items-center gap-3">
        {/* Mobile menu trigger */}
        <button
          type="button"
          onClick={onOpenMobileSidebar}
          className="lg:hidden flex items-center justify-center h-9 w-9 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div>
          <h1 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
            {info.title}
          </h1>
          <p className="hidden sm:block text-xs text-slate-500 leading-tight">
            {info.subtitle}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Local-first status indicator */}
        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium">
          <Shield className="h-3.5 w-3.5 text-emerald-600" />
          <span>Local Storage Only</span>
        </div>

        {/* Quick import action */}
        <button
          type="button"
          onClick={onOpenImport}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-indigo-700 bg-indigo-50 hover:bg-indigo-100 active:bg-indigo-200 border border-indigo-200 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <Upload className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Import Chat</span>
        </button>
      </div>
    </header>
  );
};
