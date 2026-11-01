import Dexie, { Table } from 'dexie';
import { PersistedChat, PersistedMessage } from './types';
import { ExtractedResource } from '../extractor/types';

export class OctonoteDatabase extends Dexie {
  chats!: Table<PersistedChat, string>;
  messages!: Table<PersistedMessage, string>;
  resources!: Table<ExtractedResource, string>;

  constructor(dbName = 'octonote_db') {
    super(dbName);
    this.version(1).stores({
      chats: 'id, chatName, contentHash, sourceFileName, importedAt, totalMessages',
      messages: 'id, chatId, timestamp, sender, sequenceIndex, isSystem, [chatId+sequenceIndex]',
    });
    this.version(2).stores({
      resources: 'id, chatId, messageId, type, domain, timestamp, rawUrl, [chatId+type]',
    });
  }
}

// Default application database instance
export const db = new OctonoteDatabase();
