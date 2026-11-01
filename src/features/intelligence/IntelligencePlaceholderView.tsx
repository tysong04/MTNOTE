import React from 'react';
import { Sparkles, CheckSquare, Compass, ShieldAlert, Cpu } from 'lucide-react';

interface IntelligencePlaceholderViewProps {
  onOpenImport: () => void;
}

export const IntelligencePlaceholderView: React.FC<IntelligencePlaceholderViewProps> = ({ onOpenImport }) => {
  return (
    <div className="max-w-4xl mx-auto py-6 space-y-6">
      {/* Privacy Architecture Notice */}
      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-3">
        <Cpu className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h3 className="text-xs font-semibold text-slate-800">
            Provider Architecture: Offline Rule-Based Extraction Default
          </h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            By default, task extraction, decision recognition, and topic summarization run using purely deterministic offline algorithms. External AI integrations are disabled and strictly opt-in.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-slate-200 space-y-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <CheckSquare className="h-4 w-4" />
          </div>
          <h4 className="text-sm font-semibold text-slate-900">Decisions &amp; Tasks</h4>
          <p className="text-xs text-slate-500 leading-relaxed">
            Identifies action items, agreement points, and assigned responsibilities grounded directly in message text.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 space-y-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
            <Sparkles className="h-4 w-4" />
          </div>
          <h4 className="text-sm font-semibold text-slate-900">Conversation Summaries</h4>
          <p className="text-xs text-slate-500 leading-relaxed">
            Concise breakdowns of discussions across defined time periods without hallucinated facts.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 space-y-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <Compass className="h-4 w-4" />
          </div>
          <h4 className="text-sm font-semibold text-slate-900">Grounded Q&amp;A</h4>
          <p className="text-xs text-slate-500 leading-relaxed">
            Answers inquiries strictly citing authentic message lines. Never invents evidence.
          </p>
        </div>
      </div>

      {/* Empty State Card */}
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center space-y-3">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
          <ShieldAlert className="h-6 w-6" />
        </div>
        <h3 className="text-base font-semibold text-slate-900">
          Awaiting conversation data
        </h3>
        <p className="text-sm text-slate-500 max-w-md mx-auto">
          Insights will be extracted from real conversations once imported in Milestone 2. No synthetic or fabricated analysis is displayed.
        </p>
        <div className="pt-2">
          <button
            type="button"
            onClick={onOpenImport}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 underline underline-offset-4"
          >
            Import a WhatsApp chat &rarr;
          </button>
        </div>
      </div>
    </div>
  );
};
