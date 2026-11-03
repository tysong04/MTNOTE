import { describe, it, expect, beforeEach } from 'vitest';
import { OctonoteSearchEngine } from './search-service';
import { PersistedChat, PersistedMessage } from '../storage/types';
import { ExtractedResource } from '../extractor/types';

describe('OctonoteSearchEngine', () => {
  let engine: OctonoteSearchEngine;

  const mockChats: PersistedChat[] = [
    {
      id: 'chat_1',
      chatName: 'Engineering Sync',
      sourceFileName: 'sync.txt',
      sourceFileSize: 1024,
      contentHash: 'hash1',
      totalMessages: 3,
      userMessagesCount: 3,
      systemMessagesCount: 0,
      participants: ['Alice', 'Bob'],
      dateStart: '2026-01-01T10:00:00.000Z',
      dateEnd: '2026-01-01T11:00:00.000Z',
      detectedDateFormat: 'M/D/YY',
      warnings: [],
      importedAt: '2026-01-01T12:00:00.000Z',
      updatedAt: '2026-01-01T12:00:00.000Z',
    },
    {
      id: 'chat_2',
      chatName: 'Design Critique',
      sourceFileName: 'design.txt',
      sourceFileSize: 2048,
      contentHash: 'hash2',
      totalMessages: 2,
      userMessagesCount: 2,
      systemMessagesCount: 0,
      participants: ['Charlie', 'Dana'],
      dateStart: '2026-01-02T10:00:00.000Z',
      dateEnd: '2026-01-02T11:00:00.000Z',
      detectedDateFormat: 'M/D/YY',
      warnings: [],
      importedAt: '2026-01-02T12:00:00.000Z',
      updatedAt: '2026-01-02T12:00:00.000Z',
    },
  ];

  const mockMessages: PersistedMessage[] = [
    {
      id: 'msg_1',
      chatId: 'chat_1',
      sequenceIndex: 0,
      rawTimestamp: '1/1/26, 10:00 AM',
      timestamp: '2026-01-01T10:00:00.000Z',
      sender: 'Alice',
      isSystem: false,
      content: 'Hey team, we agreed to launch the API on Friday afternoon.',
      sourceLineStart: 1,
      sourceLineEnd: 1,
    },
    {
      id: 'msg_2',
      chatId: 'chat_1',
      sequenceIndex: 1,
      rawTimestamp: '1/1/26, 10:05 AM',
      timestamp: '2026-01-01T10:05:00.000Z',
      sender: 'Bob',
      isSystem: false,
      content: 'Great! Please check the documentation at https://github.com/octonote/api before release.',
      sourceLineStart: 2,
      sourceLineEnd: 2,
    },
    {
      id: 'msg_3',
      chatId: 'chat_2',
      sequenceIndex: 0,
      rawTimestamp: '1/2/26, 10:00 AM',
      timestamp: '2026-01-02T10:00:00.000Z',
      sender: 'Charlie',
      isSystem: false,
      content: 'The new design layout looks crisp with dark mode accents.',
      sourceLineStart: 1,
      sourceLineEnd: 1,
    },
  ];

  const mockResources: ExtractedResource[] = [
    {
      id: 'res_1',
      chatId: 'chat_1',
      messageId: 'msg_2',
      type: 'url',
      rawUrl: 'https://github.com/octonote/api',
      domain: 'github.com',
      displayLabel: 'GitHub link',
      context: 'Great! Please check the documentation at https://github.com/octonote/api before release.',
      sender: 'Bob',
      timestamp: '2026-01-01T10:05:00.000Z',
      sourceLineStart: 2,
      sourceLineEnd: 2,
      createdAt: '2026-01-01T12:00:00.000Z',
    },
  ];

  beforeEach(() => {
    engine = new OctonoteSearchEngine();
    engine.buildIndex(mockChats, mockMessages, mockResources);
  });

  it('returns empty array when query is empty or blank', () => {
    expect(engine.search('')).toEqual([]);
    expect(engine.search('   ')).toEqual([]);
  });

  it('searches messages by keyword with fuzzy matching and excerpts', () => {
    const results = engine.search('documentation');
    expect(results.length).toBeGreaterThan(0);
    const msgResult = results.find((r) => r.type === 'message');
    expect(msgResult).toBeDefined();
    expect(msgResult?.chatName).toBe('Engineering Sync');
    expect(msgResult?.sender).toBe('Bob');
    expect(msgResult?.excerpt).toContain('documentation');
    expect(msgResult?.sourceLineStart).toBe(2);
  });

  it('searches resources by URL and domain', () => {
    const results = engine.search('github.com');
    expect(results.length).toBeGreaterThan(0);
    const resResult = results.find((r) => r.type === 'resource');
    expect(resResult).toBeDefined();
    expect(resResult?.domain).toBe('github.com');
    expect(resResult?.rawUrl).toBe('https://github.com/octonote/api');
  });

  it('respects scope filtering (messages only or resources only)', () => {
    const messageResults = engine.search('github', { scope: 'messages' });
    expect(messageResults.every((r) => r.type === 'message')).toBe(true);

    const resourceResults = engine.search('github', { scope: 'resources' });
    expect(resourceResults.every((r) => r.type === 'resource')).toBe(true);
  });

  it('respects chat filtering (chatId)', () => {
    const resultsChat1 = engine.search('design', { chatId: 'chat_1' });
    expect(resultsChat1.length).toBe(0);

    const resultsChat2 = engine.search('design', { chatId: 'chat_2' });
    expect(resultsChat2.length).toBeGreaterThan(0);
    expect(resultsChat2[0].chatId).toBe('chat_2');
  });

  it('returns empty array when no results match', () => {
    const results = engine.search('supercalifragilisticnonexistent');
    expect(results).toEqual([]);
  });
});
