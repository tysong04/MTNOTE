import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MTNoteDatabase } from './db';
import {
  saveChat,
  getChat,
  getAllChats,
  getChatMessages,
  deleteChat,
  purgeAllData,
  getStorageStats,
  DuplicateChatError,
} from './chat-repository';
import {
  getAllResources,
  getResourcesByChat,
  getResourceStats,
} from './resource-repository';
import { parseWhatsAppText } from '../parser/whatsapp-parser';

describe('Local Persistence Layer (IndexedDB / Dexie)', () => {
  let testDb: MTNoteDatabase;
  const testDbName = `mtnote_test_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  beforeEach(() => {
    testDb = new MTNoteDatabase(testDbName);
  });

  afterEach(async () => {
    await testDb.delete();
  });

  const sampleChatText = `15/01/2024, 10:30 - Messages and calls are end-to-end encrypted.
15/01/2024, 10:31 - Alice: Hey Bob, check this out: https://github.com/mtnote/app.
15/01/2024, 10:32 - Bob: Sounds great! Testing multiline message with doc:
Here is the spec: https://example.com/spec.pdf.
Line 3 of Bob's message
15/01/2024, 10:33 - Alice: Perfect, confirming receipt.`;

  it('persists a parsed chat and its messages transactionally', async () => {
    const parseResult = parseWhatsAppText(sampleChatText, {
      fileName: 'WhatsApp Chat with Alice.txt',
    });

    const saved = await saveChat(parseResult, sampleChatText, {}, testDb);

    expect(saved.id).toBeDefined();
    expect(saved.chatName).toBe('Alice');
    expect(saved.totalMessages).toBe(4);
    expect(saved.userMessagesCount).toBe(3);
    expect(saved.systemMessagesCount).toBe(1);
    expect(saved.participants).toEqual(['Alice', 'Bob']);

    // Verify chat record in DB
    const fetchedChat = await getChat(saved.id, testDb);
    expect(fetchedChat).toBeDefined();
    expect(fetchedChat?.id).toBe(saved.id);

    // Verify messages in DB
    const messages = await getChatMessages(saved.id, testDb);
    expect(messages.length).toBe(4);
    expect(messages[0].isSystem).toBe(true);
    expect(messages[1].sender).toBe('Alice');
    expect(messages[1].content).toContain('https://github.com/mtnote/app');
    expect(messages[2].sender).toBe('Bob');
    expect(messages[2].content).toContain('https://example.com/spec.pdf');
    expect(messages[3].sender).toBe('Alice');

    // Sequence index checks
    expect(messages.map((m) => m.sequenceIndex)).toEqual([0, 1, 2, 3]);
  });

  it('automatically extracts and persists resources transactionally during saveChat', async () => {
    const parseResult = parseWhatsAppText(sampleChatText, {
      fileName: 'WhatsApp Chat with Alice.txt',
    });

    const saved = await saveChat(parseResult, sampleChatText, {}, testDb);

    // Check resources
    const resources = await getAllResources(testDb);
    expect(resources.length).toBe(2);

    expect(resources[0].rawUrl).toBe('https://example.com/spec.pdf');
    expect(resources[0].displayLabel).toBe('PDF document link');
    expect(resources[0].domain).toBe('example.com');
    expect(resources[0].chatId).toBe(saved.id);

    expect(resources[1].rawUrl).toBe('https://github.com/mtnote/app');
    expect(resources[1].displayLabel).toBe('GitHub link');
    expect(resources[1].domain).toBe('github.com');
    expect(resources[1].chatId).toBe(saved.id);

    const stats = await getResourceStats(testDb);
    expect(stats.total).toBe(2);
    expect(stats.uniqueDomains).toBe(2);

    const chatResources = await getResourcesByChat(saved.id, testDb);
    expect(chatResources.length).toBe(2);
  });

  it('detects duplicate imports based on content hash and rejects unless forced', async () => {
    const parseResult = parseWhatsAppText(sampleChatText, {
      fileName: 'WhatsApp Chat with Alice.txt',
    });

    // Initial save
    const firstSave = await saveChat(parseResult, sampleChatText, {}, testDb);
    expect(firstSave.id).toBeDefined();

    // Duplicate save attempt
    await expect(saveChat(parseResult, sampleChatText, {}, testDb)).rejects.toThrow(
      DuplicateChatError
    );

    // Forced duplicate save attempt succeeds with new unique ID
    const secondSave = await saveChat(parseResult, sampleChatText, { force: true }, testDb);
    expect(secondSave.id).toBeDefined();
    expect(secondSave.id).not.toBe(firstSave.id);

    const allChats = await getAllChats(testDb);
    expect(allChats.length).toBe(2);
  });

  it('retrieves all chats ordered by import date descending', async () => {
    const chat1Text = `15/01/2024, 10:00 - Alice: Chat 1`;
    const chat2Text = `15/01/2024, 11:00 - Bob: Chat 2`;

    const res1 = parseWhatsAppText(chat1Text, { fileName: 'chat1.txt' });
    const res2 = parseWhatsAppText(chat2Text, { fileName: 'chat2.txt' });

    await saveChat(res1, chat1Text, {}, testDb);
    await new Promise((r) => setTimeout(r, 10));
    await saveChat(res2, chat2Text, {}, testDb);

    const allChats = await getAllChats(testDb);
    expect(allChats.length).toBe(2);
    expect(allChats[0].sourceFileName).toBe('chat2.txt');
    expect(allChats[1].sourceFileName).toBe('chat1.txt');
  });

  it('performs cascading deletion when a single chat is deleted including messages and resources', async () => {
    const chat1Text = `15/01/2024, 10:00 - Alice: Check https://example.com/a in Chat 1`;
    const chat2Text = `15/01/2024, 11:00 - Bob: Check https://example.com/b in Chat 2`;

    const res1 = parseWhatsAppText(chat1Text, { fileName: 'chat1.txt' });
    const res2 = parseWhatsAppText(chat2Text, { fileName: 'chat2.txt' });

    const saved1 = await saveChat(res1, chat1Text, {}, testDb);
    const saved2 = await saveChat(res2, chat2Text, {}, testDb);

    // Initial counts
    const statsBefore = await getStorageStats(testDb);
    expect(statsBefore.chatCount).toBe(2);
    expect(statsBefore.messageCount).toBe(2);
    expect(statsBefore.resourceCount).toBe(2);

    // Delete chat 1
    await deleteChat(saved1.id, testDb);

    // Chat 1 and its messages & resources should be gone
    const fetched1 = await getChat(saved1.id, testDb);
    expect(fetched1).toBeUndefined();
    const messages1 = await getChatMessages(saved1.id, testDb);
    expect(messages1.length).toBe(0);
    const resList1 = await getResourcesByChat(saved1.id, testDb);
    expect(resList1.length).toBe(0);

    // Chat 2 and its messages & resources must remain intact
    const fetched2 = await getChat(saved2.id, testDb);
    expect(fetched2).toBeDefined();
    const messages2 = await getChatMessages(saved2.id, testDb);
    expect(messages2.length).toBe(1);
    const resList2 = await getResourcesByChat(saved2.id, testDb);
    expect(resList2.length).toBe(1);

    const statsAfter = await getStorageStats(testDb);
    expect(statsAfter.chatCount).toBe(1);
    expect(statsAfter.messageCount).toBe(1);
    expect(statsAfter.resourceCount).toBe(1);
  });

  it('purges all data cleanly across chats, messages, and resources tables', async () => {
    const chat1Text = `15/01/2024, 10:00 - Alice: Msg with https://example.com/link1`;
    const chat2Text = `15/01/2024, 11:00 - Bob: Msg with https://example.com/link2`;

    await saveChat(parseWhatsAppText(chat1Text), chat1Text, {}, testDb);
    await saveChat(parseWhatsAppText(chat2Text), chat2Text, {}, testDb);

    expect((await getAllResources(testDb)).length).toBe(2);

    await purgeAllData(testDb);

    const stats = await getStorageStats(testDb);
    expect(stats.chatCount).toBe(0);
    expect(stats.messageCount).toBe(0);
    expect(stats.resourceCount).toBe(0);
    expect((await getAllResources(testDb)).length).toBe(0);
  });

  it('restores stored data across multiple database connections', async () => {
    const chatText = `15/01/2024, 10:00 - Alice: Persistent data test https://example.com/restore`;
    const parsed = parseWhatsAppText(chatText, { fileName: 'persisted.txt' });
    const saved = await saveChat(parsed, chatText, {}, testDb);

    // Close original connection
    testDb.close();

    // Reopen using another instance targeting same db name
    const reopenedDb = new MTNoteDatabase(testDbName);
    const retrievedChat = await getChat(saved.id, reopenedDb);
    expect(retrievedChat).toBeDefined();
    expect(retrievedChat?.chatName).toBe(saved.chatName);

    const retrievedMessages = await getChatMessages(saved.id, reopenedDb);
    expect(retrievedMessages.length).toBe(1);
    expect(retrievedMessages[0].content).toContain('https://example.com/restore');

    const retrievedResources = await getAllResources(reopenedDb);
    expect(retrievedResources.length).toBe(1);
    expect(retrievedResources[0].rawUrl).toBe('https://example.com/restore');

    await reopenedDb.delete();
  });

  it('rejects saving an invalid or empty parse result', async () => {
    const invalidResult = {
      success: false,
      metadata: {
        chatName: 'Bad',
        sourceFileName: 'bad.txt',
        sourceFileSize: 0,
        totalMessages: 0,
        userMessagesCount: 0,
        systemMessagesCount: 0,
        participants: [],
        dateStart: null,
        dateEnd: null,
        detectedDateFormat: 'None',
        warnings: [],
      },
      messages: [],
      errors: ['Invalid chat'],
    };

    await expect(saveChat(invalidResult, '', {}, testDb)).rejects.toThrow(
      /Cannot persist an invalid or empty chat/i
    );
  });
});
