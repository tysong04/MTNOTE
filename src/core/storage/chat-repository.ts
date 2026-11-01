import { db as defaultDb, OctonoteDatabase } from './db';
import {
  PersistedChat,
  PersistedMessage,
  DuplicateCheckResult,
  SaveChatOptions,
  StorageStats,
} from './types';
import { ParseResult } from '../parser/types';
import { computeContentHash, computeMessagesContentHash } from './hashing';
import { extractResourcesFromMessages } from '../extractor/url-extractor';

export class DuplicateChatError extends Error {
  public readonly existingChat: PersistedChat;

  constructor(message: string, existingChat: PersistedChat) {
    super(message);
    this.name = 'DuplicateChatError';
    this.existingChat = existingChat;
  }
}

/**
 * Checks whether a conversation with the given content hash has already been imported
 */
export async function checkDuplicateChat(
  contentHash: string,
  targetDb: OctonoteDatabase = defaultDb
): Promise<DuplicateCheckResult> {
  const existingChat = await targetDb.chats.where('contentHash').equals(contentHash).first();
  return {
    isDuplicate: !!existingChat,
    existingChat,
  };
}

/**
 * Persists a parsed WhatsApp conversation, its messages, and extracted resources into IndexedDB within an ACID transaction
 */
export async function saveChat(
  parseResult: ParseResult,
  rawText?: string,
  options: SaveChatOptions = {},
  targetDb: OctonoteDatabase = defaultDb
): Promise<PersistedChat> {
  if (!parseResult.success || parseResult.messages.length === 0) {
    throw new Error('Cannot persist an invalid or empty chat parse result.');
  }

  // 1. Compute deterministic hash for duplicate detection
  const contentHash = rawText
    ? await computeContentHash(rawText)
    : await computeMessagesContentHash(parseResult.messages);

  // 2. Check for duplicate unless explicitly forced
  if (!options.force) {
    const duplicateCheck = await checkDuplicateChat(contentHash, targetDb);
    if (duplicateCheck.isDuplicate && duplicateCheck.existingChat) {
      throw new DuplicateChatError(
        `This conversation has already been imported on ${new Date(duplicateCheck.existingChat.importedAt).toLocaleDateString()}.`,
        duplicateCheck.existingChat
      );
    }
  }

  // 3. Prepare records
  const now = new Date().toISOString();
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  const chatId = `chat_${Date.now()}_${randomSuffix}`;

  const persistedChat: PersistedChat = {
    id: chatId,
    chatName: parseResult.metadata.chatName,
    sourceFileName: parseResult.metadata.sourceFileName,
    sourceFileSize: parseResult.metadata.sourceFileSize,
    contentHash,
    totalMessages: parseResult.metadata.totalMessages,
    userMessagesCount: parseResult.metadata.userMessagesCount,
    systemMessagesCount: parseResult.metadata.systemMessagesCount,
    participants: [...parseResult.metadata.participants],
    dateStart: parseResult.metadata.dateStart ? parseResult.metadata.dateStart.toISOString() : null,
    dateEnd: parseResult.metadata.dateEnd ? parseResult.metadata.dateEnd.toISOString() : null,
    detectedDateFormat: parseResult.metadata.detectedDateFormat,
    warnings: [...parseResult.metadata.warnings],
    importedAt: now,
    updatedAt: now,
  };

  const persistedMessages: PersistedMessage[] = parseResult.messages.map((msg, index) => ({
    id: `${chatId}_${index}`,
    chatId,
    sequenceIndex: index,
    rawTimestamp: msg.rawTimestamp,
    timestamp: msg.timestamp,
    sender: msg.sender,
    isSystem: msg.isSystem,
    content: msg.content,
    sourceLineStart: msg.sourceLineStart,
    sourceLineEnd: msg.sourceLineEnd,
  }));

  // 4. Deterministically extract URL resources from messages
  const extractedResources = extractResourcesFromMessages(persistedMessages);

  // 5. Atomically persist chat, all messages, and extracted resources in a single transaction
  await targetDb.transaction('rw', [targetDb.chats, targetDb.messages, targetDb.resources], async () => {
    await targetDb.chats.add(persistedChat);
    await targetDb.messages.bulkAdd(persistedMessages);
    if (extractedResources.length > 0) {
      await targetDb.resources.bulkAdd(extractedResources);
    }
  });

  return persistedChat;
}

/**
 * Retrieves a single chat by its unique ID
 */
export async function getChat(
  chatId: string,
  targetDb: OctonoteDatabase = defaultDb
): Promise<PersistedChat | undefined> {
  return targetDb.chats.get(chatId);
}

/**
 * Retrieves all saved chats ordered by import date descending
 */
export async function getAllChats(
  targetDb: OctonoteDatabase = defaultDb
): Promise<PersistedChat[]> {
  const chats = await targetDb.chats.toArray();
  // Sort descending by importedAt
  return chats.sort((a, b) => new Date(b.importedAt).getTime() - new Date(a.importedAt).getTime());
}

/**
 * Retrieves all messages for a specific chat ordered by message sequence index
 */
export async function getChatMessages(
  chatId: string,
  targetDb: OctonoteDatabase = defaultDb
): Promise<PersistedMessage[]> {
  return targetDb.messages.where('chatId').equals(chatId).sortBy('sequenceIndex');
}

/**
 * Permanently deletes a single chat and performs cascading deletion of all associated messages and resources
 */
export async function deleteChat(
  chatId: string,
  targetDb: OctonoteDatabase = defaultDb
): Promise<void> {
  await targetDb.transaction('rw', [targetDb.chats, targetDb.messages, targetDb.resources], async () => {
    await targetDb.resources.where('chatId').equals(chatId).delete();
    await targetDb.messages.where('chatId').equals(chatId).delete();
    await targetDb.chats.delete(chatId);
  });
}

/**
 * Bulk deletion: purges all stored chats, messages, and resources from the local database
 */
export async function purgeAllData(
  targetDb: OctonoteDatabase = defaultDb
): Promise<void> {
  await targetDb.transaction('rw', [targetDb.chats, targetDb.messages, targetDb.resources], async () => {
    await targetDb.resources.clear();
    await targetDb.messages.clear();
    await targetDb.chats.clear();
  });
}

/**
 * Returns overall storage counts
 */
export async function getStorageStats(
  targetDb: OctonoteDatabase = defaultDb
): Promise<StorageStats> {
  const [chatCount, messageCount, resourceCount] = await Promise.all([
    targetDb.chats.count(),
    targetDb.messages.count(),
    targetDb.resources.count(),
  ]);
  return { chatCount, messageCount, resourceCount };
}
