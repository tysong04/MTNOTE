export type ResourceType = 'url';

export interface ExtractedResource {
  id: string; // Unique ID: `res_${chatId}_${messageSequenceIndex}_${urlIndex}`
  chatId: string;
  messageId: string; // References PersistedMessage.id
  type: ResourceType;
  rawUrl: string;
  domain: string;
  displayLabel: string; // Inferred solely from URL structure (e.g. "GitHub link", "PDF link", "Web link")
  context: string; // Full message content containing the link
  sender: string | null;
  timestamp: string; // ISO 8601 string from source message
  sourceLineStart: number;
  sourceLineEnd: number;
  createdAt: string; // ISO 8601 string of when extraction occurred
}

export interface ExtractableMessage {
  id: string;
  chatId: string;
  sequenceIndex: number;
  content: string;
  sender: string | null;
  timestamp: string;
  sourceLineStart: number;
  sourceLineEnd: number;
}
