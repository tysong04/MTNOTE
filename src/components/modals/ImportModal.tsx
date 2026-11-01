import React, { useState, useRef, DragEvent, ChangeEvent } from 'react';
import {
  X,
  Upload,
  FileText,
  Archive,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Users,
  ShieldCheck,
  Calendar,
  Layers,
  RotateCcw,
  Save,
  Check
} from 'lucide-react';
import { parseWhatsAppText } from '@/core/parser/whatsapp-parser';
import { extractWhatsAppZip } from '@/core/parser/zip-handler';
import { ParseResult, UnzippedChatFile } from '@/core/parser/types';
import { saveChat, checkDuplicateChat } from '@/core/storage/chat-repository';
import { computeContentHash } from '@/core/storage/hashing';
import { PersistedChat } from '@/core/storage/types';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPreviewLoaded?: (result: ParseResult) => void;
  onChatSaved?: (chat: PersistedChat) => void;
}

type ImportStep = 'select' | 'parsing' | 'multi_txt_select' | 'preview' | 'error';

export const ImportModal: React.FC<ImportModalProps> = ({
  isOpen,
  onClose,
  onPreviewLoaded,
  onChatSaved,
}) => {
  const [step, setStep] = useState<ImportStep>('select');
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState<string>('');
  const [selectedFileSize, setSelectedFileSize] = useState<number>(0);
  const [rawTextContent, setRawTextContent] = useState<string>('');
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [errorDetails, setErrorDetails] = useState<string>('');
  const [zipTxtFiles, setZipTxtFiles] = useState<UnzippedChatFile[]>([]);
  const [parsingProgressText, setParsingProgressText] = useState('Processing file...');
  const [duplicateChat, setDuplicateChat] = useState<PersistedChat | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [savedChat, setSavedChat] = useState<PersistedChat | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const resetState = () => {
    setStep('select');
    setSelectedFileName('');
    setSelectedFileSize(0);
    setRawTextContent('');
    setParseResult(null);
    setErrorMessage('');
    setErrorDetails('');
    setZipTxtFiles([]);
    setIsDragging(false);
    setDuplicateChat(null);
    setIsSaving(false);
    setSavedChat(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const checkDuplicate = async (text: string) => {
    try {
      const hash = await computeContentHash(text);
      const check = await checkDuplicateChat(hash);
      if (check.isDuplicate && check.existingChat) {
        setDuplicateChat(check.existingChat);
      } else {
        setDuplicateChat(null);
      }
    } catch {
      setDuplicateChat(null);
    }
  };

  const processFile = async (file: File) => {
    setSelectedFileName(file.name);
    setSelectedFileSize(file.size);
    setStep('parsing');
    setSavedChat(null);
    setDuplicateChat(null);
    setParsingProgressText('Reading file into local memory...');

    const isZip = /\.zip$/i.test(file.name);
    const isTxt = /\.txt$/i.test(file.name);

    if (!isZip && !isTxt) {
      setStep('error');
      setErrorMessage('Unsupported file format.');
      setErrorDetails(
        'Please upload an exported WhatsApp conversation file (.txt) or a compressed export archive (.zip).'
      );
      return;
    }

    try {
      if (isTxt) {
        setParsingProgressText('Decoding UTF-8 text...');
        let text = '';
        if (typeof file.text === 'function') {
          text = await file.text();
        } else {
          text = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = () => reject(reader.error);
            reader.readAsText(file);
          });
        }
        
        setRawTextContent(text);
        setParsingProgressText('Parsing conversation messages and timestamps...');
        await new Promise((resolve) => setTimeout(resolve, 50));
        
        const result = parseWhatsAppText(text, {
          fileName: file.name,
          fileSize: file.size,
        });

        if (!result.success || result.messages.length === 0) {
          setStep('error');
          setErrorMessage('Could not recognize WhatsApp conversation data in this file.');
          setErrorDetails(
            result.errors.join(' ') ||
              'Ensure this file is an authentic, unmodified WhatsApp export (Export Chat > Without Media).'
          );
          return;
        }

        // Check duplicate
        await checkDuplicate(text);

        setParseResult(result);
        setStep('preview');
        onPreviewLoaded?.(result);
      } else if (isZip) {
        setParsingProgressText('Inspecting ZIP archive entries safely...');
        let bytes: Uint8Array;
        if (typeof file.arrayBuffer === 'function') {
          const buffer = await file.arrayBuffer();
          bytes = new Uint8Array(buffer);
        } else {
          const buffer = await new Promise<ArrayBuffer>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as ArrayBuffer);
            reader.onerror = () => reject(reader.error);
            reader.readAsArrayBuffer(file);
          });
          bytes = new Uint8Array(buffer);
        }

        const txtEntries = await extractWhatsAppZip(bytes);

        if (txtEntries.length === 1) {
          setParsingProgressText(`Parsing messages from ${txtEntries[0].name}...`);
          await new Promise((resolve) => setTimeout(resolve, 50));

          const singleTxt = txtEntries[0];
          setRawTextContent(singleTxt.content);

          const result = parseWhatsAppText(singleTxt.content, {
            fileName: singleTxt.name,
            fileSize: singleTxt.size,
          });

          if (!result.success || result.messages.length === 0) {
            setStep('error');
            setErrorMessage('Could not parse conversation from archive entry.');
            setErrorDetails(result.errors.join(' '));
            return;
          }

          await checkDuplicate(singleTxt.content);

          setParseResult(result);
          setStep('preview');
          onPreviewLoaded?.(result);
        } else {
          setZipTxtFiles(txtEntries);
          setStep('multi_txt_select');
        }
      }
    } catch (err: unknown) {
      setStep('error');
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage('Validation / Decompression Error');
      setErrorDetails(msg);
    }
  };

  const handleSelectTxtFromZip = async (entry: UnzippedChatFile) => {
    setStep('parsing');
    setParsingProgressText(`Parsing ${entry.name}...`);
    setRawTextContent(entry.content);

    setTimeout(async () => {
      const result = parseWhatsAppText(entry.content, {
        fileName: entry.name,
        fileSize: entry.size,
      });

      if (!result.success || result.messages.length === 0) {
        setStep('error');
        setErrorMessage('Failed to parse chosen chat file from archive.');
        setErrorDetails(result.errors.join(' '));
        return;
      }

      await checkDuplicate(entry.content);

      setParseResult(result);
      setStep('preview');
      onPreviewLoaded?.(result);
    }, 50);
  };

  const handleSaveToDatabase = async (force = false) => {
    if (!parseResult) return;
    try {
      setIsSaving(true);
      const persisted = await saveChat(parseResult, rawTextContent, { force });
      setSavedChat(persisted);
      setDuplicateChat(null);
      onChatSaved?.(persisted);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      alert(`Could not save chat: ${msg}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      processFile(droppedFile);
    }
  };

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      processFile(file);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const formatDate = (date: Date | null) => {
    if (!date) return 'Unknown';
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatMessageTime = (date: Date) => {
    return date.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="import-dialog-title"
    >
      <div className="relative w-full max-w-3xl max-h-[92vh] flex flex-col rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
              <Upload className="h-5 w-5" />
            </div>
            <div>
              <h2 id="import-dialog-title" className="text-sm sm:text-base font-bold text-slate-900">
                {step === 'preview' ? 'Conversation Preview & Save' : 'Import WhatsApp Conversation'}
              </h2>
              <p className="text-xs text-slate-500">
                {step === 'preview'
                  ? `${parseResult?.metadata.chatName} — IndexedDB Local Persistence`
                  : 'Local parsing & extraction engine (Strictly on-device)'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body content based on step */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === 'select' && (
            <div className="space-y-6">
              {/* Dropzone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`flex flex-col items-center justify-center p-8 sm:p-12 border-2 border-dashed rounded-2xl cursor-pointer transition-all text-center
                  ${
                    isDragging
                      ? 'border-indigo-500 bg-indigo-50/60 scale-[0.99]'
                      : 'border-slate-300 hover:border-indigo-400 hover:bg-slate-50/80 bg-slate-50/30'
                  }
                `}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,.zip"
                  onChange={handleFileInputChange}
                  className="hidden"
                  data-testid="file-upload-input"
                />

                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 mb-4 shadow-xs">
                  <Upload className="h-7 w-7" />
                </div>

                <p className="text-sm font-semibold text-slate-800 mb-1">
                  Click to select or drag and drop WhatsApp export
                </p>
                <p className="text-xs text-slate-500 max-w-sm mb-4">
                  Supports plain text (<strong>.txt</strong>) exports and compressed archives (<strong>.zip</strong>).
                </p>

                <div className="inline-flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-xl bg-white border border-slate-200 text-indigo-700 shadow-xs hover:bg-slate-50">
                  <FileText className="h-3.5 w-3.5" />
                  <span>Browse File</span>
                </div>
              </div>

              {/* Security & Local Processing Callout */}
              <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/50 p-4 flex items-start gap-3">
                <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="space-y-1 text-xs">
                  <span className="font-semibold text-emerald-950 block">
                    Zero-Server Local Verification
                  </span>
                  <p className="text-emerald-800/90 leading-relaxed">
                    All archive inspection, path-traversal validation, and message parsing occurs strictly within your browser's local JavaScript memory.
                  </p>
                </div>
              </div>

              {/* Format Guide */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-1">
                  <div className="flex items-center gap-2 font-semibold text-slate-800">
                    <FileText className="h-4 w-4 text-indigo-600" />
                    Standard .txt Export
                  </div>
                  <p className="text-[11px] text-slate-500 leading-normal">
                    Exported directly from WhatsApp Android or iOS chat settings via "Export Chat without Media".
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-1">
                  <div className="flex items-center gap-2 font-semibold text-slate-800">
                    <Archive className="h-4 w-4 text-indigo-600" />
                    Export .zip Archive
                  </div>
                  <p className="text-[11px] text-slate-500 leading-normal">
                    Verified with Zip Slip path-traversal rejection and decompression bomb guards (max 30 MB compressed).
                  </p>
                </div>
              </div>
            </div>
          )}

          {step === 'parsing' && (
            <div className="py-16 flex flex-col items-center justify-center text-center space-y-4">
              <div className="h-12 w-12 rounded-full border-3 border-indigo-600 border-t-transparent animate-spin" />
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900">{parsingProgressText}</h3>
                <p className="text-xs text-slate-500">
                  {selectedFileName} ({formatFileSize(selectedFileSize)})
                </p>
              </div>
            </div>
          )}

          {step === 'multi_txt_select' && (
            <div className="space-y-4">
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900">
                  Multiple Chat Files Detected in Archive
                </h3>
                <p className="text-xs text-slate-500">
                  Select which conversation export you would like to inspect:
                </p>
              </div>

              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white">
                {zipTxtFiles.map((entry) => (
                  <button
                    key={entry.name}
                    type="button"
                    onClick={() => handleSelectTxtFromZip(entry)}
                    className="w-full flex items-center justify-between p-3.5 text-left hover:bg-indigo-50/50 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="h-4 w-4 text-indigo-600 group-hover:scale-110 transition-transform" />
                      <div>
                        <span className="text-xs font-semibold text-slate-800 block">
                          {entry.name}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {formatFileSize(entry.size)}
                        </span>
                      </div>
                    </div>
                    <span className="text-xs font-medium text-indigo-600">Select &rarr;</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 'error' && (
            <div className="py-8 space-y-5">
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-rose-900">{errorMessage}</h3>
                  <p className="text-xs text-rose-800 leading-relaxed">{errorDetails}</p>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-2 text-xs text-slate-600">
                <span className="font-semibold text-slate-800 block">Recovery Instructions:</span>
                <ul className="list-disc list-inside space-y-1 text-slate-500">
                  <li>In WhatsApp, navigate to the specific chat.</li>
                  <li>Tap the three dots (Android) or contact name (iOS) &gt; More &gt; <strong>Export Chat</strong>.</li>
                  <li>Choose <strong>Without Media</strong> to generate a clean text export.</li>
                  <li>Ensure the file is not empty or corrupted.</li>
                </ul>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={resetState}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Try Another File</span>
                </button>
              </div>
            </div>
          )}

          {step === 'preview' && parseResult && (
            <div className="space-y-6">
              {/* Duplicate Detection Warning Banner */}
              {duplicateChat && !savedChat && (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <span className="font-semibold block">Duplicate Conversation Detected</span>
                    <p className="text-amber-800/90 leading-relaxed">
                      This chat has already been imported on{' '}
                      <strong>{new Date(duplicateChat.importedAt).toLocaleDateString()}</strong> as "
                      <strong>{duplicateChat.chatName}</strong>" ({duplicateChat.totalMessages} messages).
                      You can keep your existing record or save another copy.
                    </p>
                  </div>
                </div>
              )}

              {/* Saved Success Banner */}
              {savedChat && (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                    <div>
                      <span className="font-semibold block">Saved to Local Workspace!</span>
                      <span className="text-emerald-700">
                        {savedChat.totalMessages} messages permanently stored in IndexedDB.
                      </span>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-semibold text-[11px]">
                    Persisted
                  </span>
                </div>
              )}

              {/* Metadata Statistics Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-0.5">
                  <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-medium">
                    <Layers className="h-3.5 w-3.5 text-indigo-600" />
                    Messages
                  </div>
                  <span className="text-base font-bold text-slate-900 block">
                    {parseResult.metadata.totalMessages}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {parseResult.metadata.userMessagesCount} user &middot; {parseResult.metadata.systemMessagesCount} system
                  </span>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-0.5">
                  <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-medium">
                    <Users className="h-3.5 w-3.5 text-indigo-600" />
                    Participants
                  </div>
                  <span className="text-base font-bold text-slate-900 block truncate">
                    {parseResult.metadata.participants.length}
                  </span>
                  <span className="text-[10px] text-slate-400 truncate block" title={parseResult.metadata.participants.join(', ')}>
                    {parseResult.metadata.participants.slice(0, 2).join(', ') || 'System only'}
                    {parseResult.metadata.participants.length > 2 ? '...' : ''}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-0.5">
                  <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-medium">
                    <Calendar className="h-3.5 w-3.5 text-indigo-600" />
                    Timespan
                  </div>
                  <span className="text-xs font-semibold text-slate-900 block truncate">
                    {formatDate(parseResult.metadata.dateStart)}
                  </span>
                  <span className="text-[10px] text-slate-400 block truncate">
                    to {formatDate(parseResult.metadata.dateEnd)}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-0.5">
                  <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-medium">
                    <Clock className="h-3.5 w-3.5 text-indigo-600" />
                    Date Format
                  </div>
                  <span className="text-xs font-semibold text-slate-900 block truncate">
                    {parseResult.metadata.detectedDateFormat}
                  </span>
                  <span className="text-[10px] text-emerald-600 font-medium block">
                    Validated
                  </span>
                </div>
              </div>

              {/* Warnings (if any) */}
              {parseResult.metadata.warnings.length > 0 && (
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <span>Parsing Notice ({parseResult.metadata.warnings.length}):</span>
                  </div>
                  <ul className="list-disc list-inside space-y-0.5 text-[11px] text-amber-800/90 pl-1">
                    {parseResult.metadata.warnings.map((w, idx) => (
                      <li key={idx}>{w.message}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Message Feed Preview */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-600 font-semibold px-1">
                  <span>Message Stream (First {Math.min(parseResult.messages.length, 50)} messages)</span>
                  <span className="text-[11px] text-slate-400 font-normal">
                    {selectedFileName} ({formatFileSize(selectedFileSize)})
                  </span>
                </div>

                <div className="h-72 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50/50 p-3 space-y-2.5">
                  {parseResult.messages.slice(0, 50).map((msg) => (
                    <div
                      key={msg.id}
                      className={`p-3 rounded-lg text-xs transition-colors
                        ${
                          msg.isSystem
                            ? 'bg-amber-50/60 border border-amber-200/60 text-slate-700 italic'
                            : 'bg-white border border-slate-200 text-slate-900 shadow-2xs'
                        }
                      `}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          {msg.isSystem ? (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-200/60 text-amber-900">
                              System
                            </span>
                          ) : (
                            <span className="font-semibold text-indigo-700 truncate">
                              {msg.sender}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 shrink-0">
                          {formatMessageTime(msg.date)} &middot; Lines {msg.sourceLineStart}{msg.sourceLineEnd !== msg.sourceLineStart ? `-${msg.sourceLineEnd}` : ''}
                        </span>
                      </div>
                      <p className="whitespace-pre-wrap break-words text-slate-800 leading-relaxed font-sans">
                        {msg.content}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-100 bg-slate-50/60">
          {step === 'preview' ? (
            <>
              <button
                type="button"
                onClick={resetState}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
              >
                Import Different File
              </button>

              <div className="flex items-center gap-2">
                {savedChat ? (
                  <button
                    type="button"
                    onClick={handleClose}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-xs"
                  >
                    <Check className="h-4 w-4" />
                    <span>Done</span>
                  </button>
                ) : duplicateChat ? (
                  <>
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => handleSaveToDatabase(true)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-amber-800 bg-amber-100 hover:bg-amber-200 rounded-lg border border-amber-300 transition-colors shadow-xs"
                    >
                      <Save className="h-3.5 w-3.5" />
                      <span>{isSaving ? 'Saving...' : 'Save as New Copy'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleClose}
                      className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
                    >
                      Keep Existing
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => handleSaveToDatabase(false)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-xs"
                  >
                    <Save className="h-3.5 w-3.5" />
                    <span>{isSaving ? 'Saving...' : 'Save to Workspace'}</span>
                  </button>
                )}
              </div>
            </>
          ) : (
            <>
              <span className="text-[11px] text-slate-400">
                Encrypted &amp; private: No remote transmission
              </span>
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                Cancel
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
