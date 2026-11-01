import React from 'react';
import { X, FileText, Archive, ShieldCheck, ArrowRight } from 'lucide-react';

interface ImportModalPlaceholderProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ImportModalPlaceholder: React.FC<ImportModalPlaceholderProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="import-modal-title"
    >
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
              <FileText className="h-4 w-4" />
            </div>
            <div>
              <h2 id="import-modal-title" className="text-sm font-semibold text-slate-900">
                Import WhatsApp Conversation
              </h2>
              <p className="text-xs text-slate-500">Upcoming in Milestone 2</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
            aria-label="Close modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-900 text-xs leading-relaxed">
            <span className="font-semibold block mb-1">Milestone 1 Active: Application Foundation</span>
            The file selection and streaming parser engine is being built in <strong>Milestone 2</strong>. In accordance with project milestones, mock imports are strictly disabled so all data in your knowledge base remains genuine.
          </div>

          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Supported formats planned for Milestone 2:
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/50 flex items-start gap-3">
                <FileText className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-semibold text-slate-800">Standard .txt Export</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Android & iOS WhatsApp chat text logs with multiline messages & timestamps.
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/50 flex items-start gap-3">
                <Archive className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-semibold text-slate-800">Export .zip Archives</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Compressed archives parsed locally with zip-bomb & path traversal protection.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs">
            <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>Files are parsed purely in-memory on your device. Nothing leaves your browser.</span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-3.5 border-t border-slate-100 bg-slate-50/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            Close
          </button>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <span>Understood</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
