import { ParseWarning } from '../parser/types';

export interface PersistedChat {
  id: string; // Unique chat ID e.g. "chat_1730000000000_abc12"
  chatName: string;
  sourceFileName: string;
  sourceFileSize: number;
  contentHash: string; // SHA-256 or robust checksum of conversation content for duplicate detection
  totalMessages: number;
  userMessagesCount: number;
  systemMessagesCount: number;
  participants: string[];
  dateStart: string | null; // ISO 8601
  dateEnd: string | null;   // ISO 8601
  detectedDateFormat: string;
  warnings: ParseWarning[];
  importedAt: string; // ISO 8601
  updatedAt: string;  // ISO 8601
}

export interface PersistedMessage {
  id: string; // Unique message ID e.g. "${chatId}_0", "${chatId}_1"
  chatId: string; // Foreign key referencing PersistedChat.id (indexed)
  sequenceIndex: number;
  rawTimestamp: string;
  timestamp: string; // ISO 8601
  sender: string | null; // null for system messages
  isSystem: boolean;
  content: string;
  sourceLineStart: number;
  sourceLineEnd: number;
}

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  existingChat?: PersistedChat;
}

export interface SaveChatOptions {
  force?: boolean; // If true, saves even if duplicate content hash exists (generates new chat id)
}

export interface StorageStats {
  chatCount: number;
  messageCount: number;
  resourceCount: number;
}
