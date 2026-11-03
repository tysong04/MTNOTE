import React, { useState, useMemo } from 'react';
import {
  FileText,
  HelpCircle,
  Users,
  CheckCircle2,
  ListTodo,
  Sparkles,
  Download,
  ArrowRight,
  ShieldCheck,
  Send,
  Printer
} from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { getAllChats } from '@/core/storage/chat-repository';
import { db } from '@/core/storage/db';
import { PersistedChat } from '@/core/storage/types';
import {
  generateChatSummary,
  ChatSummary
} from '@/core/intelligence/summary-service';
import { answerQuestionLocally, QAResponse } from '@/core/intelligence/qa-service';
import {
  exportSummaryToMarkdown,
  exportSummaryToHtml,
  generatePdfBlob,
  triggerFileDownload,
} from '@/core/export/export-service';

interface IntelligenceViewProps {
  onOpenImport: () => void;
  onNavigateToMessage?: (chatId: string, messageId?: string) => void;
}

export const IntelligenceView: React.FC<IntelligenceViewProps> = ({
  onOpenImport,
  onNavigateToMessage,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'summaries' | 'qa'>('summaries');

  // Summary State
  const [selectedChatId, setSelectedChatId] = useState<string>('');
  const [dateStart, setDateStart] = useState<string>('');
  const [dateEnd, setDateEnd] = useState<string>('');

  // Q&A State
  const [qaChatId, setQaChatId] = useState<string>('all');
  const [questionInput, setQuestionInput] = useState<string>('');
  const [qaResult, setQaResult] = useState<QAResponse | null>(null);

  const chats = useLiveQuery(() => getAllChats(), []);
  const allMessages = useLiveQuery(() => db.messages.toArray(), []);

  // Default select first chat once loaded
  const currentChat: PersistedChat | undefined = useMemo(() => {
    if (!chats || chats.length === 0) return undefined;
    if (selectedChatId) {
      return chats.find((c) => c.id === selectedChatId) || chats[0];
    }
    return chats[0];
  }, [chats, selectedChatId]);

  // Compute summary for selected chat
  const summary: ChatSummary | null = useMemo(() => {
    if (!currentChat || !allMessages) return null;
    const chatMessages = allMessages.filter((m) => m.chatId === currentChat.id);
    return generateChatSummary(currentChat, chatMessages, {
      dateStart: dateStart ? new Date(dateStart).toISOString() : undefined,
      dateEnd: dateEnd ? new Date(dateEnd).toISOString() : undefined,
    });
  }, [currentChat, allMessages, dateStart, dateEnd]);

  // Handle Q&A Ask
  const handleAskQuestion = (q?: string) => {
    const query = q || questionInput;
    if (!query.trim() || !chats || !allMessages) return;
    const res = answerQuestionLocally(query, chats, allMessages, {
      chatId: qaChatId === 'all' ? undefined : qaChatId,
    });
    setQaResult(res);
  };

  // Export handlers
  const handleExportMarkdown = () => {
    if (!summary) return;
    const md = exportSummaryToMarkdown(summary);
    triggerFileDownload(md, `summary-${summary.chatName.replace(/\s+/g, '_')}.md`, 'text/markdown');
  };

  const handleExportHtml = () => {
    if (!summary) return;
    const html = exportSummaryToHtml(summary);
    triggerFileDownload(html, `summary-${summary.chatName.replace(/\s+/g, '_')}.html`, 'text/html');
  };

  const handleExportPdf = () => {
    if (!summary) return;
    const sections = [
      {
        heading: `Decisions & Agreements (${summary.decisions.length})`,
        lines: summary.decisions.map(
          (d) => `- ${d.statement} [${d.sender}, Line ${d.sourceLineStart}]`
        ),
      },
      {
        heading: `Action Items & Tasks (${summary.actionItems.length})`,
        lines: summary.actionItems.map(
          (a) => `- [ ] ${a.task} [${a.sender}, Line ${a.sourceLineStart}]`
        ),
      },
      {
        heading: 'Key Topics Discussed',
        lines: summary.keyTopics.map((t) => `- ${t.topic} (${t.occurrences} mentions)`),
      },
    ];

    const pdfBlob = generatePdfBlob(`Octonote Summary: ${summary.chatName}`, sections);
    triggerFileDownload(pdfBlob, `summary-${summary.chatName.replace(/\s+/g, '_')}.pdf`, 'application/pdf');
  };

  const hasData = (chats?.length || 0) > 0;

  if (!hasData) {
    return (
      <div className="max-w-4xl mx-auto py-8">
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
            <Sparkles className="h-6 w-6" />
          </div>
          <h3 className="text-base font-semibold text-slate-900">No conversation data available</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            Import a WhatsApp chat export (.txt or .zip) to generate deterministic summaries and ask grounded questions.
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={onOpenImport}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-xs transition-colors"
            >
              Import a WhatsApp chat &rarr;
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-4 space-y-6">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Conversation Insights</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Local, extractive summaries and grounded Q&amp;A referencing verifiable message lines.
          </p>
        </div>

        {/* Sub-tab Switcher */}
        <div className="flex items-center p-1 bg-slate-100 rounded-xl text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveSubTab('summaries')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
              activeSubTab === 'summaries'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            <span>Extractive Summaries</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('qa')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
              activeSubTab === 'qa'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <HelpCircle className="h-3.5 w-3.5" />
            <span>Grounded Q&amp;A</span>
          </button>
        </div>
      </div>

      {/* TAB 1: EXTRACTIVE SUMMARIES */}
      {activeSubTab === 'summaries' && summary && (
        <div className="space-y-6">
          {/* Controls Bar: Chat selector, Date filters, Export buttons */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <label htmlFor="summary-chat-select" className="text-slate-500 font-medium">
                    Conversation:
                  </label>
                  <select
                    id="summary-chat-select"
                    value={currentChat?.id}
                    onChange={(e) => setSelectedChatId(e.target.value)}
                    className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 font-medium focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    {chats?.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.chatName} ({c.totalMessages} msgs)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Optional Date Filters */}
                <div className="flex items-center gap-2">
                  <label htmlFor="summary-date-start" className="text-slate-500 font-medium">
                    From:
                  </label>
                  <input
                    id="summary-date-start"
                    type="date"
                    value={dateStart}
                    onChange={(e) => setDateStart(e.target.value)}
                    className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-700 focus:outline-none"
                  />
                  <label htmlFor="summary-date-end" className="text-slate-500 font-medium">
                    To:
                  </label>
                  <input
                    id="summary-date-end"
                    type="date"
                    value={dateEnd}
                    onChange={(e) => setDateEnd(e.target.value)}
                    className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-700 focus:outline-none"
                  />
                  {(dateStart || dateEnd) && (
                    <button
                      type="button"
                      onClick={() => {
                        setDateStart('');
                        setDateEnd('');
                      }}
                      className="text-xs text-indigo-600 hover:underline"
                    >
                      Clear dates
                    </button>
                  )}
                </div>
              </div>

              {/* Export Dropdown / Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportPdf}
                  className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors"
                  title="Download binary PDF report"
                >
                  <Printer className="h-3.5 w-3.5 text-indigo-600" />
                  <span>PDF Export</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportMarkdown}
                  className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors"
                  title="Download Markdown report"
                >
                  <Download className="h-3.5 w-3.5 text-indigo-600" />
                  <span>Markdown</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportHtml}
                  className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors"
                  title="Download HTML Document"
                >
                  <Download className="h-3.5 w-3.5 text-indigo-600" />
                  <span>HTML</span>
                </button>
              </div>
            </div>
          </div>

          {/* Privacy & Architecture Disclaimer */}
          <div className="rounded-xl bg-indigo-50/60 border border-indigo-100 p-3.5 flex items-start gap-2.5 text-xs text-indigo-900">
            <ShieldCheck className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong>100% Local &amp; Verifiable:</strong> {summary.disclaimer}
            </p>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-slate-400 block mb-0.5">Analyzed Messages</span>
              <span className="text-lg font-bold text-slate-800">
                {summary.totalMessagesAnalyzed}
              </span>
            </div>
            <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-slate-400 block mb-0.5">Decisions Found</span>
              <span className="text-lg font-bold text-slate-800">
                {summary.decisions.length}
              </span>
            </div>
            <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-slate-400 block mb-0.5">Action Items</span>
              <span className="text-lg font-bold text-slate-800">
                {summary.actionItems.length}
              </span>
            </div>
            <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-slate-400 block mb-0.5">Active Participants</span>
              <span className="text-lg font-bold text-slate-800">
                {summary.participants.length}
              </span>
            </div>
          </div>

          {/* Participants Breakdown */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
              <Users className="h-4 w-4 text-indigo-600" />
              <span>Participant Contributions</span>
            </div>
            <div className="space-y-2">
              {summary.participants.map((p) => (
                <div key={p.sender} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700">{p.sender}</span>
                    <span className="text-slate-500">
                      {p.count} messages ({p.percentage}%)
                    </span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 rounded-full transition-all"
                      style={{ width: `${p.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Decisions & Agreements */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>Decisions &amp; Agreements</span>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                {summary.decisions.length} identified
              </span>
            </div>

            {summary.decisions.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-2">
                No explicit decisions detected in this conversation window.
              </p>
            ) : (
              <div className="space-y-2.5">
                {summary.decisions.map((d) => (
                  <div
                    key={d.id}
                    className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5"
                  >
                    <p className="font-medium text-slate-800 leading-relaxed">"{d.statement}"</p>
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>
                        Stated by <strong>{d.sender}</strong> &middot; Line {d.sourceLineStart}
                      </span>
                      {onNavigateToMessage && (
                        <button
                          type="button"
                          onClick={() => onNavigateToMessage(summary.chatId, d.messageId)}
                          className="inline-flex items-center gap-1 font-semibold text-indigo-600 hover:underline"
                        >
                          <span>View in Chat</span>
                          <ArrowRight className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action Items & Tasks */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                <ListTodo className="h-4 w-4 text-amber-600" />
                <span>Action Items &amp; Responsibilities</span>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                {summary.actionItems.length} tasks
              </span>
            </div>

            {summary.actionItems.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-2">
                No action items or todos detected in this conversation window.
              </p>
            ) : (
              <div className="space-y-2.5">
                {summary.actionItems.map((a) => (
                  <div
                    key={a.id}
                    className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5"
                  >
                    <div className="flex items-start gap-2">
                      <div className="mt-0.5 h-3.5 w-3.5 rounded border border-slate-400 shrink-0" />
                      <p className="font-medium text-slate-800 leading-relaxed flex-1">{a.task}</p>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 pl-5">
                      <span>
                        Assigned to: <strong>{a.assignee || 'Unspecified'}</strong> &middot; Line {a.sourceLineStart}
                      </span>
                      {onNavigateToMessage && (
                        <button
                          type="button"
                          onClick={() => onNavigateToMessage(summary.chatId, a.messageId)}
                          className="inline-flex items-center gap-1 font-semibold text-indigo-600 hover:underline"
                        >
                          <span>View in Chat</span>
                          <ArrowRight className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Key Discussion Topics */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
              <Sparkles className="h-4 w-4 text-indigo-600" />
              <span>Key Topics Discussed</span>
            </div>

            {summary.keyTopics.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-2">
                No recurrent topic clusters identified.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {summary.keyTopics.map((t) => (
                  <div
                    key={t.topic}
                    className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-800">{t.topic}</span>
                      <span className="text-[10px] text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                        {t.occurrences} mentions
                      </span>
                    </div>
                    {t.sampleQuotes.map((q, idx) => (
                      <p
                        key={idx}
                        className="text-[11px] text-slate-600 italic border-l-2 border-indigo-300 pl-2 py-0.5 truncate"
                        title={q.quote}
                      >
                        "{q.quote}" &mdash; {q.sender}
                      </p>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: GROUNDED Q&A */}
      {activeSubTab === 'qa' && (
        <div className="space-y-6">
          {/* Question Input Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700">Ask a Question</span>
              <div className="flex items-center gap-1.5">
                <label htmlFor="qa-chat-select" className="text-slate-500 font-medium">
                  Search In:
                </label>
                <select
                  id="qa-chat-select"
                  value={qaChatId}
                  onChange={(e) => setQaChatId(e.target.value)}
                  className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700"
                >
                  <option value="all">All Conversations</option>
                  {chats?.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.chatName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={questionInput}
                onChange={(e) => setQuestionInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAskQuestion();
                }}
                placeholder="e.g. When is the deadline? Who agreed to launch? What was the price?"
                className="flex-1 rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <button
                type="button"
                onClick={() => handleAskQuestion()}
                className="inline-flex items-center gap-1 px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-xs"
              >
                <Send className="h-3.5 w-3.5" />
                <span>Ask</span>
              </button>
            </div>

            {/* Suggested Question Chips */}
            <div className="flex flex-wrap items-center gap-1.5 text-[11px] pt-1">
              <span className="text-slate-400">Try asking:</span>
              {[
                'When is the deadline?',
                'What was decided?',
                'Who was assigned tasks?',
                'What links were shared?',
              ].map((sug) => (
                <button
                  key={sug}
                  type="button"
                  onClick={() => {
                    setQuestionInput(sug);
                    handleAskQuestion(sug);
                  }}
                  className="px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-800 transition-colors"
                >
                  {sug}
                </button>
              ))}
            </div>
          </div>

          {/* Q&A Response Display */}
          {qaResult && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                  <HelpCircle className="h-4 w-4 text-indigo-600" />
                  <span>Question: "{qaResult.question}"</span>
                </div>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                    qaResult.hasAnswer
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}
                >
                  {qaResult.hasAnswer ? 'Grounded Answer Found' : 'No Supported Answer'}
                </span>
              </div>

              {/* Answer Text */}
              <div
                className={`p-4 rounded-xl text-xs leading-relaxed ${
                  qaResult.hasAnswer
                    ? 'bg-indigo-50/50 border border-indigo-100 text-slate-800'
                    : 'bg-slate-50 border border-slate-200 text-slate-600 italic'
                }`}
              >
                <p className="whitespace-pre-wrap">{qaResult.answerText}</p>
              </div>

              {/* Supporting Citations */}
              {qaResult.sources.length > 0 && (
                <div className="space-y-2 pt-2">
                  <h4 className="text-xs font-semibold text-slate-700">Verifiable Source Messages</h4>
                  <div className="space-y-2">
                    {qaResult.sources.map((src) => (
                      <div
                        key={src.messageId}
                        className="p-3 rounded-xl border border-slate-200 bg-white shadow-2xs text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between text-[11px] text-slate-500">
                          <span>
                            <strong>{src.sender}</strong> in <em>{src.chatName}</em> &middot; Line {src.sourceLineStart}
                          </span>
                          {onNavigateToMessage && (
                            <button
                              type="button"
                              onClick={() => onNavigateToMessage(src.chatId, src.messageId)}
                              className="inline-flex items-center gap-1 font-semibold text-indigo-600 hover:underline"
                            >
                              <span>Open in Chat</span>
                              <ArrowRight className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                        <p className="text-slate-800 font-sans">{src.content}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Disclaimer */}
              <p className="text-[10px] text-slate-400 italic pt-1">
                {qaResult.disclaimer}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
