import React, { useState, useEffect, useMemo } from 'react';
import {
  Search as SearchIcon,
  Filter,
  MessageSquare,
  Globe,
  ExternalLink,
  ArrowRight,
  Download,
  X,
  FileText,
  Clock,
  Sparkles
} from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { getAllChats } from '@/core/storage/chat-repository';
import { getAllResources } from '@/core/storage/resource-repository';
import { db } from '@/core/storage/db';
import { searchEngine, SearchResultItem } from '@/core/search/search-service';
import { triggerFileDownload } from '@/core/export/export-service';

interface SearchViewProps {
  onOpenImport: () => void;
  onNavigateToMessage?: (chatId: string, messageId?: string) => void;
}

export const SearchView: React.FC<SearchViewProps> = ({ onOpenImport, onNavigateToMessage }) => {
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState<'all' | 'messages' | 'resources'>('all');
  const [selectedChatId, setSelectedChatId] = useState<string>('all');
  const [indexVersion, setIndexVersion] = useState(0);

  const chats = useLiveQuery(() => getAllChats(), []);
  const messages = useLiveQuery(() => db.messages.toArray(), []);
  const resources = useLiveQuery(() => getAllResources(), []);

  // Rebuild the in-memory MiniSearch index whenever persisted data updates
  useEffect(() => {
    if (chats && messages && resources) {
      searchEngine.buildIndex(chats, messages, resources);
      setIndexVersion((v) => v + 1);
    }
  }, [chats, messages, resources]);

  // Execute search whenever query, scope, selectedChatId, or indexVersion changes
  const results = useMemo<SearchResultItem[]>(() => {
    if (!query.trim()) return [];
    return searchEngine.search(query, {
      scope,
      chatId: selectedChatId === 'all' ? undefined : selectedChatId,
    });
  }, [query, scope, selectedChatId, indexVersion]);

  const hasData = (chats?.length || 0) > 0;

  const handleExportResults = () => {
    if (results.length === 0) return;
    const lines: string[] = [
      `# Octonote Search Results for "${query}"`,
      `Exported: ${new Date().toLocaleString()}`,
      `Total Matches: ${results.length}\n`,
    ];

    for (const r of results) {
      lines.push(`### ${r.type === 'resource' ? `[Resource] ${r.displayLabel || r.rawUrl}` : `[Message] ${r.sender} in ${r.chatName}`}`);
      lines.push(`- **Chat:** ${r.chatName}`);
      lines.push(`- **Time:** ${new Date(r.timestamp).toLocaleString()} (Line ${r.sourceLineStart})`);
      if (r.rawUrl) lines.push(`- **URL:** ${r.rawUrl}`);
      lines.push(`- **Excerpt:** *"${r.excerpt}"*\n`);
    }

    triggerFileDownload(lines.join('\n'), `octonote-search-${Date.now()}.md`, 'text/markdown');
  };

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return iso;
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-4 space-y-6">
      {/* Header & Title */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Full-Text Search</h1>
        <p className="text-xs text-slate-500 mt-1">
          Instant, local fuzzy search across all imported WhatsApp conversations and extracted links.
        </p>
      </div>

      {/* Search Input Bar */}
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
          <SearchIcon className="h-5 w-5 text-slate-400" />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search conversations, links, names, decisions..."
          className="w-full rounded-2xl border border-slate-200 bg-white py-3.5 pl-11 pr-10 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-xs"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-600"
            title="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Filter Row: Scope Pills and Chat Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-slate-500 flex items-center gap-1 font-medium">
            <Filter className="h-3.5 w-3.5 text-slate-400" /> Scope:
          </span>
          <button
            type="button"
            onClick={() => setScope('all')}
            className={`px-3 py-1 rounded-lg font-medium transition-colors ${
              scope === 'all'
                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            All Entities
          </button>
          <button
            type="button"
            onClick={() => setScope('messages')}
            className={`px-3 py-1 rounded-lg font-medium transition-colors ${
              scope === 'messages'
                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            Messages Only
          </button>
          <button
            type="button"
            onClick={() => setScope('resources')}
            className={`px-3 py-1 rounded-lg font-medium transition-colors ${
              scope === 'resources'
                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            Resources Only
          </button>
        </div>

        {/* Chat Dropdown Filter */}
        <div className="flex items-center gap-2">
          <label htmlFor="chat-scope" className="text-slate-500 font-medium">
            Chat:
          </label>
          <select
            id="chat-scope"
            value={selectedChatId}
            onChange={(e) => setSelectedChatId(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="all">All Conversations ({chats?.length || 0})</option>
            {chats?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.chatName}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Content Area */}
      {!hasData ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
            <MessageSquare className="h-6 w-6" />
          </div>
          <h3 className="text-base font-semibold text-slate-900">Workspace is empty</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            Import a WhatsApp conversation (.txt or .zip) to populate the in-memory search index.
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={onOpenImport}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-xs transition-colors"
            >
              Import WhatsApp Chat &rarr;
            </button>
          </div>
        </div>
      ) : !query.trim() ? (
        /* Empty Query State */
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center space-y-4">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Search Ready</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
              Indexed {messages?.length || 0} messages and {resources?.length || 0} extracted resources across {chats?.length || 0} conversation{chats?.length === 1 ? '' : 's'}. Type any keyword above.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1 text-xs">
            <span className="text-slate-400">Suggestions:</span>
            {['meeting', 'agree', 'friday', 'http', 'deadline'].map((word) => (
              <button
                key={word}
                type="button"
                onClick={() => setQuery(word)}
                className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
              >
                {word}
              </button>
            ))}
          </div>
        </div>
      ) : results.length === 0 ? (
        /* No Results State */
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center space-y-3">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
            <FileText className="h-5 w-5" />
          </div>
          <h3 className="text-sm font-semibold text-slate-900">
            No matches found for "{query}"
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            We couldn't find any messages or resources matching your query. Check for typos or try broader keywords.
          </p>
        </div>
      ) : (
        /* Results List */
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-500 px-1">
            <span>
              Found <strong>{results.length}</strong> result{results.length === 1 ? '' : 's'}
            </span>
            <button
              type="button"
              onClick={handleExportResults}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:underline"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export Results (.md)</span>
            </button>
          </div>

          <div className="space-y-3">
            {results.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs hover:border-slate-300 transition-all space-y-2.5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    {item.type === 'message' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold text-[11px]">
                        <MessageSquare className="h-3 w-3 text-slate-500" />
                        {item.sender}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-semibold text-[11px]">
                        <Globe className="h-3 w-3 text-indigo-500" />
                        {item.displayLabel || 'Link'}
                      </span>
                    )}

                    <span className="text-slate-400">&bull;</span>
                    <span className="text-slate-600 font-medium">{item.chatName}</span>
                  </div>

                  <div className="flex items-center gap-2 text-[11px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDate(item.timestamp)}
                    </span>
                    <span>&bull;</span>
                    <span>Line {item.sourceLineStart}</span>
                  </div>
                </div>

                {/* Excerpt */}
                <p className="text-xs text-slate-700 leading-relaxed font-sans bg-slate-50/70 p-3 rounded-xl border border-slate-100">
                  {item.excerpt}
                </p>

                {/* Action buttons */}
                <div className="flex items-center justify-between pt-1">
                  {item.rawUrl ? (
                    <a
                      href={item.rawUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 underline underline-offset-2 truncate max-w-md"
                    >
                      <span>{item.rawUrl}</span>
                      <ExternalLink className="h-3 w-3 shrink-0" />
                    </a>
                  ) : <div />}

                  {onNavigateToMessage && (
                    <button
                      type="button"
                      onClick={() => onNavigateToMessage(item.chatId, item.messageId)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-indigo-600 transition-colors ml-auto"
                    >
                      <span>Open in Conversation</span>
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
