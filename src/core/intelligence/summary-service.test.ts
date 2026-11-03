import { describe, it, expect } from 'vitest';
import { generateChatSummary } from './summary-service';
import { PersistedChat, PersistedMessage } from '../storage/types';

describe('generateChatSummary', () => {
  const mockChat: PersistedChat = {
    id: 'chat_123',
    chatName: 'Sprint Planning',
    sourceFileName: 'sprint.txt',
    sourceFileSize: 2048,
    contentHash: 'hash123',
    totalMessages: 5,
    userMessagesCount: 5,
    systemMessagesCount: 0,
    participants: ['Alice', 'Bob', 'Charlie'],
    dateStart: '2026-03-01T09:00:00.000Z',
    dateEnd: '2026-03-01T12:00:00.000Z',
    detectedDateFormat: 'M/D/YY',
    warnings: [],
    importedAt: '2026-03-01T13:00:00.000Z',
    updatedAt: '2026-03-01T13:00:00.000Z',
  };

  const mockMessages: PersistedMessage[] = [
    {
      id: 'm1',
      chatId: 'chat_123',
      sequenceIndex: 0,
      rawTimestamp: '3/1/26, 9:00 AM',
      timestamp: '2026-03-01T09:00:00.000Z',
      sender: 'Alice',
      isSystem: false,
      content: 'Good morning! For our sprint planning, we decided to migrate the database to PostgreSQL.',
      sourceLineStart: 1,
      sourceLineEnd: 1,
    },
    {
      id: 'm2',
      chatId: 'chat_123',
      sequenceIndex: 1,
      rawTimestamp: '3/1/26, 9:15 AM',
      timestamp: '2026-03-01T09:15:00.000Z',
      sender: 'Bob',
      isSystem: false,
      content: 'Awesome. I will write the database schema migration scripts by Friday.',
      sourceLineStart: 2,
      sourceLineEnd: 2,
    },
    {
      id: 'm3',
      chatId: 'chat_123',
      sequenceIndex: 2,
      rawTimestamp: '3/1/26, 9:30 AM',
      timestamp: '2026-03-01T09:30:00.000Z',
      sender: 'Charlie',
      isSystem: false,
      content: 'TODO: review the security audit checklist before testing.',
      sourceLineStart: 3,
      sourceLineEnd: 3,
    },
    {
      id: 'm4',
      chatId: 'chat_123',
      sequenceIndex: 3,
      rawTimestamp: '3/1/26, 10:00 AM',
      timestamp: '2026-03-01T10:00:00.000Z',
      sender: 'Alice',
      isSystem: false,
      content: 'We agreed on adopting Tailwind for the frontend styling.',
      sourceLineStart: 4,
      sourceLineEnd: 4,
    },
    {
      id: 'm5',
      chatId: 'chat_123',
      sequenceIndex: 4,
      rawTimestamp: '3/1/26, 10:30 AM',
      timestamp: '2026-03-01T10:30:00.000Z',
      sender: 'Bob',
      isSystem: false,
      content: 'Please remember to update the database connection strings in staging.',
      sourceLineStart: 5,
      sourceLineEnd: 5,
    },
  ];

  it('generates an extractive summary with participant percentages', () => {
    const summary = generateChatSummary(mockChat, mockMessages);
    expect(summary.chatId).toBe('chat_123');
    expect(summary.totalMessagesAnalyzed).toBe(5);
    expect(summary.participants.length).toBe(3);

    const alice = summary.participants.find((p) => p.sender === 'Alice');
    expect(alice?.count).toBe(2);
    expect(alice?.percentage).toBe(40);
  });

  it('extracts decisions with source references and line numbers', () => {
    const summary = generateChatSummary(mockChat, mockMessages);
    expect(summary.decisions.length).toBeGreaterThanOrEqual(2);

    const postgresDecision = summary.decisions.find((d) => d.statement.includes('PostgreSQL'));
    expect(postgresDecision).toBeDefined();
    expect(postgresDecision?.sender).toBe('Alice');
    expect(postgresDecision?.sourceLineStart).toBe(1);

    const tailwindDecision = summary.decisions.find((d) => d.statement.includes('Tailwind'));
    expect(tailwindDecision).toBeDefined();
    expect(tailwindDecision?.sourceLineStart).toBe(4);
  });

  it('extracts action items with inferable assignees', () => {
    const summary = generateChatSummary(mockChat, mockMessages);
    expect(summary.actionItems.length).toBeGreaterThanOrEqual(2);

    const bobTask = summary.actionItems.find((a) => a.task.includes('migration scripts'));
    expect(bobTask).toBeDefined();
    expect(bobTask?.assignee).toBe('Bob');
    expect(bobTask?.sourceLineStart).toBe(2);

    const todoTask = summary.actionItems.find((a) => a.task.includes('security audit'));
    expect(todoTask).toBeDefined();
    expect(todoTask?.sourceLineStart).toBe(3);
  });

  it('extracts recurring topics like "database"', () => {
    const summary = generateChatSummary(mockChat, mockMessages);
    const dbTopic = summary.keyTopics.find((t) => t.topic.toLowerCase() === 'database');
    expect(dbTopic).toBeDefined();
    expect(dbTopic?.occurrences).toBeGreaterThanOrEqual(2);
  });

  it('filters summary by date range when provided', () => {
    const summary = generateChatSummary(mockChat, mockMessages, {
      dateStart: '2026-03-01T09:10:00.000Z',
      dateEnd: '2026-03-01T09:40:00.000Z',
    });

    expect(summary.totalMessagesAnalyzed).toBe(2); // m2 and m3
    expect(summary.decisions.length).toBe(0);
    expect(summary.actionItems.length).toBe(2);
  });

  it('includes clear transparency disclaimer that it is rule-based and not generative AI', () => {
    const summary = generateChatSummary(mockChat, mockMessages);
    expect(summary.isExtractiveRuleBased).toBe(true);
    expect(summary.disclaimer).toContain('Deterministic Extractive Summary');
  });
});
