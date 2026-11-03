import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Upload,
  ArrowRight,
  Trash2,
  Calendar,
  Users,
  Layers,
  ShieldCheck,
  ChevronLeft,
  Search,
  AlertTriangle,
  Clock,
  Save,
  Check
} from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { ParseResult } from '@/core/parser/types';
import {
  getAllChats,
  getChatMessages,
  deleteChat,
  saveChat,
} from '@/core/storage/chat-repository';
import { PersistedChat, PersistedMessage } from '@/core/storage/types';

interface ChatsViewProps {
  onOpenImport: () => void;
  previewChat?: ParseResult | null;
  onDiscardPreview?: () => void;
  onSavePreview?: (chat: PersistedChat) => void;
  initialSelectedChatId?: string | null;
  initialHighlightedMessageId?: string | null;
}

export const ChatsPlaceholderView: React.FC<ChatsViewProps> = ({
  onOpenImport,
  previewChat,
  onDiscardPreview,
  onSavePreview,
  initialSelectedChatId,
  initialHighlightedMessageId,
}) => {
  const persistedChats = useLiveQuery(() => getAllChats(), []);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(initialSelectedChatId || null);
  const [selectedChatMessages, setSelectedChatMessages] = useState<PersistedMessage[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [messageSearchQuery, setMessageSearchQuery] = useState('');
  const [chatToDelete, setChatToDelete] = useState<PersistedChat | null>(null);
  const [isSavingPreview, setIsSavingPreview] = useState(false);
  const [previewSaved, setPreviewSaved] = useState(false);

  useEffect(() => {
    if (initialSelectedChatId) {
      setSelectedChatId(initialSelectedChatId);
    }
  }, [initialSelectedChatId]);

  // When messages load, auto-scroll to highlighted message if present
  useEffect(() => {
    if (initialHighlightedMessageId && selectedChatMessages.length > 0) {
      const timer = setTimeout(() => {
        const el = document.getElementById(`msg-${initialHighlightedMessageId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [initialHighlightedMessageId, selectedChatMessages]);

  // When a chat is selected, fetch its messages from IndexedDB
  useEffect(() => {
    if (!selectedChatId) {
      setSelectedChatMessages([]);
      return;
    }

    let isMounted = true;
    setIsLoadingMessages(true);

    getChatMessages(selectedChatId)
      .then((msgs) => {
        if (isMounted) {
          setSelectedChatMessages(msgs);
          setIsLoadingMessages(false);
        }
      })
      .catch((err) => {
        console.error('Failed to load chat messages:', err);
        if (isMounted) setIsLoadingMessages(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedChatId]);

  const selectedChat = persistedChats?.find((c) => c.id === selectedChatId);

  const handleDeleteChat = async (chatId: string) => {
    try {
      await deleteChat(chatId);
      if (selectedChatId === chatId) {
        setSelectedChatId(null);
      }
      setChatToDelete(null);
    } catch (err) {
      console.error('Failed to delete chat:', err);
      alert('Could not delete chat. Please try again.');
    }
  };

  const handleSavePreview = async () => {
    if (!previewChat) return;
    try {
      setIsSavingPreview(true);
      const saved = await saveChat(previewChat, undefined, { force: true });
      setPreviewSaved(true);
      onSavePreview?.(saved);
      setTimeout(() => {
        onDiscardPreview?.();
        setPreviewSaved(false);
      }, 1500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      alert(`Could not save preview: ${msg}`);
    } finally {
      setIsSavingPreview(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (isoString: string) => {
    try {
      return new Date(isoString).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  // Filter messages in selected chat
  const filteredMessages = selectedChatMessages.filter((msg) => {
    if (!messageSearchQuery.trim()) return true;
    const q = messageSearchQuery.toLowerCase();
    return (
      msg.content.toLowerCase().includes(q) ||
      (msg.sender && msg.sender.toLowerCase().includes(q))
    );
  });

  // 1. DETAIL VIEW: If a chat is selected
  if (selectedChat) {
    return (
      <div className="max-w-5xl mx-auto py-4 space-y-5">
        {/* Navigation back and actions */}
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-4">
          <button
            type="button"
            onClick={() => {
              setSelectedChatId(null);
              setMessageSearchQuery('');
            }}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-2xs hover:bg-slate-50 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>All Conversations</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setChatToDelete(selectedChat)}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-3 py-1.5 rounded-lg transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Delete Chat</span>
            </button>
          </div>
        </div>

        {/* Chat Overview Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-slate-900">{selectedChat.chatName}</h2>
              <p className="text-xs text-slate-500">
                Source: {selectedChat.sourceFileName} &middot; Imported:{' '}
                {new Date(selectedChat.importedAt).toLocaleString()}
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full shrink-0">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
              <span>IndexedDB Verified</span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-slate-400 block mb-0.5 flex items-center gap-1">
                <Layers className="h-3.5 w-3.5 text-indigo-500" /> Total Messages
              </span>
              <span className="text-base font-bold text-slate-800">
                {selectedChat.totalMessages}
              </span>
              <span className="text-[10px] text-slate-400 block">
                {selectedChat.userMessagesCount} user &middot; {selectedChat.systemMessagesCount} system
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-slate-400 block mb-0.5 flex items-center gap-1">
                <Users className="h-3.5 w-3.5 text-indigo-500" /> Participants
              </span>
              <span className="text-base font-bold text-slate-800">
                {selectedChat.participants.length}
              </span>
              <span
                className="text-[10px] text-slate-400 truncate block"
                title={selectedChat.participants.join(', ')}
              >
                {selectedChat.participants.slice(0, 2).join(', ') || 'System only'}
                {selectedChat.participants.length > 2 ? '...' : ''}
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-slate-400 block mb-0.5 flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-indigo-500" /> Date Span
              </span>
              <span className="text-xs font-semibold text-slate-800 truncate block">
                {formatDate(selectedChat.dateStart)}
              </span>
              <span className="text-[10px] text-slate-400 block truncate">
                to {formatDate(selectedChat.dateEnd)}
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-slate-400 block mb-0.5 flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-indigo-500" /> Format
              </span>
              <span className="text-xs font-semibold text-slate-800 truncate block">
                {selectedChat.detectedDateFormat}
              </span>
              <span className="text-[10px] text-emerald-600 block font-medium">
                Normalized
              </span>
            </div>
          </div>
        </div>

        {/* Message Search Filter */}
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
            <Search className="h-4 w-4 text-slate-400" />
          </div>
          <input
            type="text"
            value={messageSearchQuery}
            onChange={(e) => setMessageSearchQuery(e.target.value)}
            placeholder={`Filter through ${selectedChat.totalMessages} messages...`}
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-2xs"
          />
        </div>

        {/* Message Feed Stream */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-500 px-1 font-medium">
            <span>
              Showing {filteredMessages.length} of {selectedChatMessages.length} messages
            </span>
          </div>

          {isLoadingMessages ? (
            <div className="p-12 text-center text-xs text-slate-400">
              Loading conversation from local storage...
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[600px] overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
              {filteredMessages.map((msg) => {
                const isHighlighted = initialHighlightedMessageId === msg.id;
                return (
                  <div
                    key={msg.id}
                    id={`msg-${msg.id}`}
                    className={`p-3.5 rounded-xl text-xs transition-all shadow-2xs ${
                      isHighlighted
                        ? 'ring-2 ring-indigo-500 bg-indigo-50/80 border-indigo-300'
                        : msg.isSystem
                        ? 'bg-amber-50/70 border border-amber-200/60 text-slate-700 italic'
                        : 'bg-white border border-slate-200 text-slate-900'
                    }`}
                  >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-1.5">
                      {msg.isSystem ? (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-200/60 text-amber-900">
                          System
                        </span>
                      ) : (
                        <span className="font-semibold text-indigo-700">{msg.sender}</span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400">
                      {formatTime(msg.timestamp)} &middot; Line {msg.sourceLineStart}
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap break-words text-slate-800 leading-relaxed font-sans">
                    {msg.content}
                  </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Delete Confirmation Modal */}
        {chatToDelete && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
            role="dialog"
            aria-modal="true"
          >
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100 text-rose-600 shrink-0">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Delete Conversation?</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Permanently delete "<strong>{chatToDelete.chatName}</strong>" and all{' '}
                    <strong>{chatToDelete.totalMessages}</strong> associated messages from local storage.
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setChatToDelete(null)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteChat(chatToDelete.id)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-2xs"
                >
                  Confirm Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // 2. CHATS LIST VIEW: Main view displaying all saved conversations
  const hasSavedChats = persistedChats && persistedChats.length > 0;
  const hasPreview = previewChat && previewChat.success;

  if (hasSavedChats || hasPreview) {
    return (
      <div className="max-w-5xl mx-auto py-6 space-y-6">
        {/* Active In-Memory Preview Banner (if any) */}
        {hasPreview && (
          <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-blue-600 shrink-0" />
              <span>
                <strong>Unsaved Preview:</strong> "{previewChat.metadata.chatName}" (
                {previewChat.metadata.totalMessages} messages) is parsed in memory.
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {previewSaved ? (
                <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                  <Check className="h-4 w-4" /> Saved!
                </span>
              ) : (
                <button
                  type="button"
                  disabled={isSavingPreview}
                  onClick={handleSavePreview}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 font-medium shadow-2xs"
                >
                  <Save className="h-3.5 w-3.5" />
                  <span>{isSavingPreview ? 'Saving...' : 'Save to Workspace'}</span>
                </button>
              )}
              {onDiscardPreview && (
                <button
                  type="button"
                  onClick={onDiscardPreview}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-blue-200 text-rose-600 hover:bg-rose-50 font-medium"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Discard</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Section header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Imported WhatsApp Conversations</h2>
            <p className="text-xs text-slate-500">
              {persistedChats?.length ?? 0} conversations permanently persisted in local IndexedDB.
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenImport}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-2xs self-start sm:self-auto"
          >
            <Upload className="h-3.5 w-3.5" />
            <span>Import New Chat</span>
          </button>
        </div>

        {/* Conversations Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {persistedChats?.map((chat) => (
            <div
              key={chat.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:border-indigo-300 transition-all flex flex-col justify-between space-y-4"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3
                      onClick={() => setSelectedChatId(chat.id)}
                      className="text-base font-bold text-slate-900 hover:text-indigo-600 cursor-pointer truncate"
                      title={chat.chatName}
                    >
                      {chat.chatName}
                    </h3>
                    <p className="text-[11px] text-slate-400 truncate">
                      {chat.sourceFileName} &middot; Imported {new Date(chat.importedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setChatToDelete(chat)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                    title="Delete chat"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-1 text-xs">
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="text-slate-400 block text-[10px]">Messages</span>
                    <span className="font-bold text-slate-800">{chat.totalMessages}</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="text-slate-400 block text-[10px]">Participants</span>
                    <span className="font-bold text-slate-800">{chat.participants.length}</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="text-slate-400 block text-[10px]">Span</span>
                    <span className="font-semibold text-slate-800 text-[11px] truncate block">
                      {formatDate(chat.dateStart)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-[11px] text-slate-400">
                  {chat.detectedDateFormat}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedChatId(chat.id)}
                  className="inline-flex items-center gap-1 font-semibold text-indigo-600 hover:text-indigo-700"
                >
                  <span>View Messages</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Delete Confirmation Modal */}
        {chatToDelete && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
            role="dialog"
            aria-modal="true"
          >
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100 text-rose-600 shrink-0">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Delete Conversation?</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Permanently delete "<strong>{chatToDelete.chatName}</strong>" and all{' '}
                    <strong>{chatToDelete.totalMessages}</strong> associated messages from local storage.
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setChatToDelete(null)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteChat(chatToDelete.id)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-2xs"
                >
                  Confirm Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // 3. ZERO-STATE VIEW: When neither saved chats nor preview exist
  return (
    <div className="max-w-4xl mx-auto py-8">
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 mb-4">
          <MessageSquare className="h-7 w-7" />
        </div>
        <h3 className="text-lg font-semibold text-slate-900 mb-1">
          No conversations imported yet
        </h3>
        <p className="text-sm text-slate-500 max-w-md mx-auto mb-6">
          Import your exported WhatsApp chat (.txt or .zip) to browse message history, senders, and conversation timelines.
        </p>
        <button
          type="button"
          onClick={onOpenImport}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <Upload className="h-4 w-4" />
          <span>Import Chat Archive</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
