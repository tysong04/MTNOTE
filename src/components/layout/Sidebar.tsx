import React from 'react';
import {
  LayoutDashboard,
  MessageSquare,
  BookmarkCheck,
  Search,
  Sparkles,
  Settings,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Upload
} from 'lucide-react';
import { NavTab } from '@/types/navigation';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  onOpenImport: () => void;
}

interface NavLinkConfig {
  id: NavTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

const NAV_ITEMS: NavLinkConfig[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'chats', label: 'Chats', icon: MessageSquare },
  { id: 'resources', label: 'Resources', icon: BookmarkCheck },
  { id: 'search', label: 'Search', icon: Search },
  { id: 'insights', label: 'Insights', icon: Sparkles },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onCloseMobile,
  onOpenImport,
}) => {
  return (
    <>
      {/* Mobile backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={onCloseMobile}
          aria-label="Close sidebar overlay"
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col bg-white border-r border-slate-200 transition-all duration-200 ease-in-out lg:static
          ${isCollapsed ? 'lg:w-20' : 'lg:w-64'}
          ${isMobileOpen ? 'translate-x-0 w-72 shadow-2xl' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Brand header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-slate-100">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white font-bold shadow-sm shadow-indigo-200">
              <span className="text-lg">O</span>
            </div>
            {!isCollapsed && (
              <div className="flex flex-col min-w-0">
                <span className="text-base font-semibold tracking-tight text-slate-900 truncate">
                  Octonote
                </span>
                <span className="text-xs text-slate-500 font-medium truncate">
                  Knowledge Base
                </span>
              </div>
            )}
          </div>

          {/* Desktop collapse button */}
          <button
            type="button"
            onClick={onToggleCollapse}
            className="hidden lg:flex items-center justify-center h-7 w-7 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        {/* Primary Action Button */}
        <div className="p-3">
          <button
            type="button"
            onClick={() => {
              onOpenImport();
              onCloseMobile();
            }}
            className={`w-full flex items-center justify-center gap-2 rounded-lg bg-indigo-600 text-white font-medium text-sm hover:bg-indigo-700 active:bg-indigo-800 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2
              ${isCollapsed ? 'p-2.5' : 'px-3.5 py-2.5'}
            `}
            title="Import WhatsApp Chats"
          >
            <Upload className="h-4 w-4 shrink-0" />
            {!isCollapsed && <span className="truncate">Import Chats</span>}
          </button>
        </div>

        {/* Navigation list */}
        <nav aria-label="Main Navigation" className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                aria-label={`View ${item.label}`}
                aria-current={isActive ? 'page' : undefined}
                onClick={() => {
                  onSelectTab(item.id);
                  onCloseMobile();
                }}
                className={`w-full flex items-center gap-3 rounded-lg text-sm font-medium transition-all text-left focus:outline-none focus:ring-2 focus:ring-indigo-500
                  ${isCollapsed ? 'justify-center p-2.5' : 'px-3 py-2.5'}
                  ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-700 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }
                `}
                title={isCollapsed ? item.label : undefined}
              >
                <Icon
                  className={`h-4 w-4 shrink-0 ${
                    isActive ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'
                  }`}
                />
                {!isCollapsed && <span className="truncate">{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* Bottom privacy badge */}
        <div className="p-3 border-t border-slate-100">
          <div
            className={`flex items-center gap-2.5 rounded-lg bg-slate-50 border border-slate-200/70 text-slate-600 text-xs
              ${isCollapsed ? 'justify-center p-2' : 'px-3 py-2.5'}
            `}
            title="Local-First Privacy: Data remains on your device"
          >
            <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
            {!isCollapsed && (
              <div className="flex flex-col min-w-0">
                <span className="font-semibold text-slate-800">Local-First</span>
                <span className="text-[11px] text-slate-500">100% on device</span>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};
