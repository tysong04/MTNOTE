import React, { useState } from 'react';
import { Search as SearchIcon, Filter, Info } from 'lucide-react';

interface SearchPlaceholderViewProps {
  onOpenImport: () => void;
}

export const SearchPlaceholderView: React.FC<SearchPlaceholderViewProps> = ({ onOpenImport }) => {
  const [query, setQuery] = useState('');

  return (
    <div className="max-w-4xl mx-auto py-4 space-y-6">
      {/* Search Bar Input */}
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
          <SearchIcon className="h-5 w-5 text-slate-400" />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search conversations, shared links, topics, or senders..."
          className="w-full rounded-2xl border border-slate-200 bg-white py-3.5 pl-11 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-sm"
        />
      </div>

      {/* Filter Chips Placeholder */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-slate-500 flex items-center gap-1 font-medium">
          <Filter className="h-3.5 w-3.5" /> Scope:
        </span>
        <span className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 font-medium border border-indigo-100">
          All Entities
        </span>
        <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-500">
          Messages
        </span>
        <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-500">
          URLs &amp; Links
        </span>
        <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-500">
          Decisions &amp; Tasks
        </span>
      </div>

      {/* Search State Notice */}
      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center space-y-3">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
          <Info className="h-6 w-6" />
        </div>
        <h3 className="text-base font-semibold text-slate-900">
          Search index is currently unpopulated
        </h3>
        <p className="text-sm text-slate-500 max-w-md mx-auto">
          MiniSearch full-text indexing operates in-memory over your local IndexedDB database. Once conversations are imported, instant fuzzy and prefix searching will be available here.
        </p>
        <div className="pt-2">
          <button
            type="button"
            onClick={onOpenImport}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 underline underline-offset-4"
          >
            Import a WhatsApp chat export to populate index &rarr;
          </button>
        </div>
      </div>
    </div>
  );
};
