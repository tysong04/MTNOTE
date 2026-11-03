import React, { useState, useMemo } from 'react';
import {
  BookmarkCheck,
  Filter,
  ExternalLink,
  Search,
  MessageSquare,
  Globe,
  Upload,
  Calendar,
  Download,
  Printer,
  ArrowRight
} from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { getAllResources } from '@/core/storage/resource-repository';
import { getAllChats } from '@/core/storage/chat-repository';
import {
  exportResourcesToMarkdown,
  generatePdfBlob,
  triggerFileDownload
} from '@/core/export/export-service';

interface ResourcesViewProps {
  onOpenImport: () => void;
  onNavigateToMessage?: (chatId: string, messageId?: string) => void;
}

export const ResourcesPlaceholderView: React.FC<ResourcesViewProps> = ({
  onOpenImport,
  onNavigateToMessage,
}) => {
  const resources = useLiveQuery(() => getAllResources(), []);
  const chats = useLiveQuery(() => getAllChats(), []);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDomain, setSelectedDomain] = useState<string>('all');
  const [selectedChatId, setSelectedChatId] = useState<string>('all');

  // Export handlers
  const handleExportMarkdown = () => {
    if (filteredResources.length === 0) return;
    const md = exportResourcesToMarkdown(filteredResources);
    triggerFileDownload(md, `octonote-resources-${Date.now()}.md`, 'text/markdown');
  };

  const handleExportPdf = () => {
    if (filteredResources.length === 0) return;
    const sections = [
      {
        heading: `Extracted Resources (${filteredResources.length})`,
        lines: filteredResources.map(
          (r) => `- [${r.displayLabel}] ${r.rawUrl} (${r.domain}) [${r.sender || 'Unknown'}, Line ${r.sourceLineStart}]`
        ),
      },
    ];
    const blob = generatePdfBlob('Octonote: Extracted Resources', sections);
    triggerFileDownload(blob, `octonote-resources-${Date.now()}.pdf`, 'application/pdf');
  };

  // Build a fast lookup for chat names by chatId
  const chatNameMap = useMemo(() => {
    const map = new Map<string, string>();
    if (chats) {
      for (const chat of chats) {
        map.set(chat.id, chat.chatName);
      }
    }
    return map;
  }, [chats]);

  // Extract unique domains for the filter dropdown
  const uniqueDomains = useMemo(() => {
    if (!resources) return [];
    const domainSet = new Set<string>();
    for (const r of resources) {
      if (r.domain) domainSet.add(r.domain);
    }
    return Array.from(domainSet).sort();
  }, [resources]);

  // Filtered resources based on query, domain, and chat
  const filteredResources = useMemo(() => {
    if (!resources) return [];

    return resources.filter((res) => {
      // Domain filter
      if (selectedDomain !== 'all' && res.domain !== selectedDomain) {
        return false;
      }

      // Chat filter
      if (selectedChatId !== 'all' && res.chatId !== selectedChatId) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchUrl = res.rawUrl.toLowerCase().includes(q);
        const matchDomain = res.domain.toLowerCase().includes(q);
        const matchContext = res.context.toLowerCase().includes(q);
        const matchLabel = res.displayLabel.toLowerCase().includes(q);
        const matchSender = res.sender ? res.sender.toLowerCase().includes(q) : false;
        return matchUrl || matchDomain || matchContext || matchLabel || matchSender;
      }

      return true;
    });
  }, [resources, selectedDomain, selectedChatId, searchQuery]);

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return 'N/A';
    }
  };

  const formatTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const totalResourceCount = resources?.length ?? 0;
  const hasChats = (chats?.length ?? 0) > 0;

  // 1. EMPTY STATE: When no resources exist yet
  if (totalResourceCount === 0) {
    return (
      <div className="max-w-4xl mx-auto py-8 space-y-6">
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 mb-4 shadow-xs">
            <BookmarkCheck className="h-7 w-7" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-1">
            {hasChats ? 'No web resources detected in imported chats' : 'No knowledge resources extracted'}
          </h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto mb-6">
            {hasChats
              ? 'Your imported conversations currently do not contain explicit http:// or https:// links. Once you import chats with shared links, they will be automatically indexed here.'
              : 'Shared URLs, articles, and references will be automatically extracted and indexed with full source attribution once a conversation is imported.'}
          </p>
          <div className="inline-flex justify-center">
            <button
              type="button"
              onClick={onOpenImport}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <Upload className="h-4 w-4" />
              <span>Import Chat to Extract Links</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-slate-600">
          <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-1">
            <span className="font-semibold text-slate-800 flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5 text-indigo-600" />
              Safe URL Inspection
            </span>
            <p className="text-slate-500 text-[11px] leading-relaxed">
              Resources are indexed locally. Arbitrary URLs are never visited, downloaded, or scraped automatically.
            </p>
          </div>
          <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-1">
            <span className="font-semibold text-slate-800 flex items-center gap-1.5">
              <MessageSquare className="h-3.5 w-3.5 text-indigo-600" />
              Source Message Trace
            </span>
            <p className="text-slate-500 text-[11px] leading-relaxed">
              Every extracted resource links back directly to the surrounding conversation and sender.
            </p>
          </div>
          <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-1">
            <span className="font-semibold text-slate-800 flex items-center gap-1.5">
              <Filter className="h-3.5 w-3.5 text-indigo-600" />
              Domain &amp; Source Filters
            </span>
            <p className="text-slate-500 text-[11px] leading-relaxed">
              Filter through your personal knowledge base by domain, sender, or source chat.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // 2. ACTIVE RESOURCE BROWSER
  return (
    <div className="max-w-5xl mx-auto py-4 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Knowledge Resources</h2>
          <p className="text-xs text-slate-500">
            {totalResourceCount} {totalResourceCount === 1 ? 'link' : 'links'} extracted across{' '}
            {uniqueDomains.length} unique {uniqueDomains.length === 1 ? 'domain' : 'domains'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportPdf}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-2xs transition-colors"
          >
            <Printer className="h-3.5 w-3.5 text-indigo-600" />
            <span>PDF Export</span>
          </button>
          <button
            type="button"
            onClick={handleExportMarkdown}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-2xs transition-colors"
          >
            <Download className="h-3.5 w-3.5 text-indigo-600" />
            <span>Markdown</span>
          </button>
          <button
            type="button"
            onClick={onOpenImport}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors"
          >
            <Upload className="h-3.5 w-3.5" />
            <span>Import More Chats</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-3">
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
            <Search className="h-4 w-4 text-slate-400" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search links by URL, domain, sender, or conversation context..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-10 pr-4 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-1 text-xs">
          <div className="flex items-center gap-1.5 text-slate-500">
            <Filter className="h-3.5 w-3.5 text-slate-400" />
            <span className="font-medium">Filter by:</span>
          </div>

          {/* Domain Filter Dropdown */}
          <div className="flex items-center gap-1.5">
            <label htmlFor="domain-filter-select" className="text-slate-500 sr-only">
              Filter by Domain
            </label>
            <select
              id="domain-filter-select"
              aria-label="Filter by Domain"
              value={selectedDomain}
              onChange={(e) => setSelectedDomain(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="all">All Domains ({uniqueDomains.length})</option>
              {uniqueDomains.map((dom) => (
                <option key={dom} value={dom}>
                  {dom}
                </option>
              ))}
            </select>
          </div>

          {/* Chat Filter Dropdown */}
          {chats && chats.length > 1 && (
            <div className="flex items-center gap-1.5">
              <label htmlFor="chat-filter-select" className="text-slate-500 sr-only">
                Filter by Conversation
              </label>
              <select
                id="chat-filter-select"
                aria-label="Filter by Conversation"
                value={selectedChatId}
                onChange={(e) => setSelectedChatId(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="all">All Conversations ({chats.length})</option>
                {chats.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.chatName}
                  </option>
                ))}
              </select>
            </div>
          )}

          {(searchQuery || selectedDomain !== 'all' || selectedChatId !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedDomain('all');
                setSelectedChatId('all');
              }}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-medium underline"
            >
              Reset Filters
            </button>
          )}

          <div className="ml-auto text-slate-400 text-[11px]">
            Showing {filteredResources.length} of {totalResourceCount}
          </div>
        </div>
      </div>

      {/* Resource Cards Feed */}
      <div className="space-y-3.5">
        {filteredResources.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-xs text-slate-500">
            No resources match your current filter criteria.
          </div>
        ) : (
          filteredResources.map((res) => {
            const chatTitle = chatNameMap.get(res.chatId) || 'WhatsApp Chat';

            return (
              <div
                key={res.id}
                className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-indigo-300 shadow-xs transition-all space-y-3"
              >
                {/* Top Row: Link and Labels */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100 flex items-center gap-1">
                        <Globe className="h-3 w-3" />
                        {res.domain}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700">
                        {res.displayLabel}
                      </span>
                    </div>

                    <div className="pt-1">
                      <a
                        href={res.rawUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-semibold text-indigo-600 hover:text-indigo-800 break-all inline-flex items-center gap-1 group"
                        title={res.rawUrl}
                      >
                        <span className="group-hover:underline">{res.rawUrl}</span>
                        <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-70 group-hover:opacity-100" />
                      </a>
                    </div>
                  </div>
                </div>

                {/* Surrounding Context Message Box */}
                <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/60 text-xs text-slate-800 font-sans leading-relaxed">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1">
                    Conversation Context
                  </span>
                  <p className="whitespace-pre-wrap break-words">{res.context}</p>
                </div>

                {/* Source Trace Attribution Bar */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100 text-[11px] text-slate-500">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-700">
                      {res.sender || 'System notice'}
                    </span>
                    <span>&middot;</span>
                    <span className="flex items-center gap-1">
                      <MessageSquare className="h-3 w-3 text-slate-400" />
                      {chatTitle}
                    </span>
                    <span>&middot;</span>
                    <span>Line {res.sourceLineStart}</span>
                    {onNavigateToMessage && (
                      <>
                        <span>&middot;</span>
                        <button
                          type="button"
                          onClick={() => onNavigateToMessage(res.chatId, res.messageId)}
                          className="inline-flex items-center gap-1 font-semibold text-indigo-600 hover:underline"
                        >
                          <span>Open in Chat</span>
                          <ArrowRight className="h-3 w-3" />
                        </button>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-1 text-slate-400">
                    <Calendar className="h-3 w-3" />
                    <span>
                      {formatDate(res.timestamp)} {formatTime(res.timestamp)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
