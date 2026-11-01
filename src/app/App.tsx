import React, { useState } from 'react';
import { NavTab } from '@/types/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { ImportModal } from '@/components/modals/ImportModal';
import { OverviewView } from '@/features/overview/OverviewView';
import { ChatsPlaceholderView } from '@/features/chats/ChatsPlaceholderView';
import { ResourcesPlaceholderView } from '@/features/resources/ResourcesPlaceholderView';
import { SearchPlaceholderView } from '@/features/search/SearchPlaceholderView';
import { IntelligencePlaceholderView } from '@/features/intelligence/IntelligencePlaceholderView';
import { SettingsView } from '@/features/settings/SettingsView';
import { ParseResult } from '@/core/parser/types';
import { PersistedChat } from '@/core/storage/types';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<NavTab>('overview');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [previewChat, setPreviewChat] = useState<ParseResult | null>(null);

  const handlePreviewLoaded = (result: ParseResult) => {
    setPreviewChat(result);
  };

  const handleDiscardPreview = () => {
    setPreviewChat(null);
  };

  const handleChatSaved = (_chat: PersistedChat) => {
    setPreviewChat(null);
  };

  const renderActiveView = () => {
    switch (currentTab) {
      case 'overview':
        return (
          <OverviewView
            onOpenImport={() => setIsImportModalOpen(true)}
            onNavigateToChats={() => setCurrentTab('chats')}
          />
        );
      case 'chats':
        return (
          <ChatsPlaceholderView
            onOpenImport={() => setIsImportModalOpen(true)}
            previewChat={previewChat}
            onDiscardPreview={handleDiscardPreview}
            onSavePreview={handleChatSaved}
          />
        );
      case 'resources':
        return <ResourcesPlaceholderView onOpenImport={() => setIsImportModalOpen(true)} />;
      case 'search':
        return <SearchPlaceholderView onOpenImport={() => setIsImportModalOpen(true)} />;
      case 'insights':
        return <IntelligencePlaceholderView onOpenImport={() => setIsImportModalOpen(true)} />;
      case 'settings':
        return <SettingsView />;
      default:
        return (
          <OverviewView
            onOpenImport={() => setIsImportModalOpen(true)}
            onNavigateToChats={() => setCurrentTab('chats')}
          />
        );
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 font-sans text-slate-900 antialiased">
      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        onOpenImport={() => setIsImportModalOpen(true)}
      />

      {/* Main Content Workspace */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        <Header
          currentTab={currentTab}
          onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
          onOpenImport={() => setIsImportModalOpen(true)}
        />

        <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
          {renderActiveView()}
        </main>
      </div>

      {/* Real Local Import Modal */}
      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onPreviewLoaded={handlePreviewLoaded}
        onChatSaved={handleChatSaved}
      />
    </div>
  );
};

export default App;
