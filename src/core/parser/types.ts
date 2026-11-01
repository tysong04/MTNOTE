export interface ParsedMessage {
  id: string;
  sequenceIndex: number;
  rawTimestamp: string;
  timestamp: string; // ISO 8601 string
  date: Date;
  sender: string | null; // null for system messages
  isSystem: boolean;
  content: string;
  sourceLineStart: number;
  sourceLineEnd: number;
}

export interface ParseWarning {
  line?: number;
  code: string;
  message: string;
  details?: string;
}

export interface ChatMetadata {
  chatName: string;
  sourceFileName: string;
  sourceFileSize: number;
  totalMessages: number;
  userMessagesCount: number;
  systemMessagesCount: number;
  participants: string[];
  dateStart: Date | null;
  dateEnd: Date | null;
  detectedDateFormat: string;
  warnings: ParseWarning[];
}

export interface ParseResult {
  success: boolean;
  metadata: ChatMetadata;
  messages: ParsedMessage[];
  errors: string[];
}

export interface ZipEntryInfo {
  name: string;
  originalSize: number;
  compressedSize: number;
}

export interface ZipValidationLimits {
  maxCompressedSize: number;
  maxUncompressedSize: number;
  maxTotalUncompressedSize: number;
  maxCompressionRatio: number;
  maxEntries: number;
}

export interface UnzippedChatFile {
  name: string;
  content: string;
  size: number;
}
