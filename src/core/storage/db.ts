import Dexie, { Table } from 'dexie';
import { PersistedChat, PersistedMessage } from './types';
import { ExtractedResource } from '../extractor/types';

export class MTNoteDatabase extends Dexie {
  chats!: Table<PersistedChat, string>;
  messages!: Table<PersistedMessage, string>;
  resources!: Table<ExtractedResource, string>;

  constructor(dbName = 'mtnote_db') {
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

// Backwards-compatibility alias
export { MTNoteDatabase as OctonoteDatabase };

// Default application database instance
export const db = new MTNoteDatabase();

/**
 * Automatically migrates existing data from legacy 'octonote_db' to 'mtnote_db' if present.
 * Ensures zero data loss and uninterrupted persistence across the rebrand.
 */
export async function migrateLegacyOctonoteData(targetDb: MTNoteDatabase): Promise<void> {
  if (typeof window === 'undefined' || typeof indexedDB === 'undefined') return;
  try {
    const migrationFlag = 'mtnote_legacy_db_migrated';
    if (localStorage.getItem(migrationFlag)) return;

    const legacyExists = await Dexie.exists('octonote_db');
    if (!legacyExists) {
      localStorage.setItem(migrationFlag, 'true');
      return;
    }

    const legacyDb = new Dexie('octonote_db');
    legacyDb.version(1).stores({
      chats: 'id, chatName, contentHash, sourceFileName, importedAt, totalMessages',
      messages: 'id, chatId, timestamp, sender, sequenceIndex, isSystem, [chatId+sequenceIndex]',
    });
    legacyDb.version(2).stores({
      resources: 'id, chatId, messageId, type, domain, timestamp, rawUrl, [chatId+type]',
    });

    await legacyDb.open();
    const legacyChats = await legacyDb.table('chats').toArray();
    const legacyMessages = await legacyDb.table('messages').toArray();
    const legacyResources = await legacyDb.table('resources').toArray();

    if (legacyChats.length > 0 || legacyMessages.length > 0 || legacyResources.length > 0) {
      await targetDb.transaction('rw', [targetDb.chats, targetDb.messages, targetDb.resources], async () => {
        if (legacyChats.length > 0) await targetDb.chats.bulkPut(legacyChats);
        if (legacyMessages.length > 0) await targetDb.messages.bulkPut(legacyMessages);
        if (legacyResources.length > 0) await targetDb.resources.bulkPut(legacyResources);
      });
    }

    legacyDb.close();
    localStorage.setItem(migrationFlag, 'true');
  } catch (err) {
    console.warn('Legacy database migration skipped or failed:', err);
  }
}

// Run non-blocking migration check in browser runtime
if (typeof window !== 'undefined' && typeof indexedDB !== 'undefined') {
  migrateLegacyOctonoteData(db).catch(() => {});
}
