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
import { ProfileView } from '@/features/profile/ProfileView';
import { AuthScreen } from '@/features/auth/AuthScreen';
import { ParseResult } from '@/core/parser/types';
import { PersistedChat } from '@/core/storage/types';
import { UserProfile } from '@/core/profile/types';
import {
  getLocalProfile,
  isSessionActive,
  registerLocalProfile,
  signOutLocalSession
} from '@/core/profile/profile-service';

export const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => getLocalProfile());
  const [isSessionUnlocked, setIsSessionUnlocked] = useState<boolean>(() => {
    const profile = getLocalProfile();
    if (!profile) return false;
    return isSessionActive();
  });

  const [currentTab, setCurrentTab] = useState<NavTab>('overview');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [previewChat, setPreviewChat] = useState<ParseResult | null>(null);
  const [targetChatId, setTargetChatId] = useState<string | null>(null);
  const [targetMessageId, setTargetMessageId] = useState<string | null>(null);

  const handleAuthenticated = (profile: UserProfile) => {
    setCurrentUser(profile);
    setIsSessionUnlocked(true);
    if (profile.preferences?.defaultTab) {
      setCurrentTab(profile.preferences.defaultTab);
    }
  };

  const handleSignOut = () => {
    signOutLocalSession();
    setIsSessionUnlocked(false);
  };

  const handleContinueAsGuest = () => {
    const res = registerLocalProfile('Local Explorer', 'explorer@mtnote.local', 'Personal WhatsApp Archive');
    if (res.success && res.profile) {
      handleAuthenticated(res.profile);
    }
  };

  const handleProfileUpdated = (updated: UserProfile) => {
    setCurrentUser(updated);
  };

  const handlePreviewLoaded = (result: ParseResult) => {
    setPreviewChat(result);
  };

  const handleDiscardPreview = () => {
    setPreviewChat(null);
  };

  const handleChatSaved = (_chat: PersistedChat) => {
    setPreviewChat(null);
  };

  const handleNavigateToMessage = (chatId: string, messageId?: string) => {
    setTargetChatId(chatId);
    setTargetMessageId(messageId || null);
    setCurrentTab('chats');
  };

  // If not logged in or session is locked, show the clean AuthScreen
  if (!currentUser || !isSessionUnlocked) {
    return (
      <AuthScreen
        onAuthenticated={handleAuthenticated}
        onContinueAsGuest={handleContinueAsGuest}
      />
    );
  }

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
            initialSelectedChatId={targetChatId}
            initialHighlightedMessageId={targetMessageId}
          />
        );
      case 'resources':
        return (
          <ResourcesPlaceholderView
            onOpenImport={() => setIsImportModalOpen(true)}
            onNavigateToMessage={handleNavigateToMessage}
          />
        );
      case 'search':
        return (
          <SearchPlaceholderView
            onOpenImport={() => setIsImportModalOpen(true)}
            onNavigateToMessage={handleNavigateToMessage}
          />
        );
      case 'insights':
        return (
          <IntelligencePlaceholderView
            onOpenImport={() => setIsImportModalOpen(true)}
            onNavigateToMessage={handleNavigateToMessage}
          />
        );
      case 'settings':
        return <SettingsView />;
      case 'profile':
        return (
          <ProfileView
            user={currentUser}
            onProfileUpdated={handleProfileUpdated}
            onSignOut={handleSignOut}
            onNavigateToTab={setCurrentTab}
          />
        );
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
        user={currentUser}
        onSignOut={handleSignOut}
      />

      {/* Main Content Workspace */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        <Header
          currentTab={currentTab}
          onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
          onOpenImport={() => setIsImportModalOpen(true)}
          user={currentUser}
          onSelectTab={setCurrentTab}
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
