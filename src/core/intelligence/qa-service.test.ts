import { describe, it, expect } from 'vitest';
import { answerQuestionLocally } from './qa-service';
import { PersistedChat, PersistedMessage } from '../storage/types';

describe('answerQuestionLocally', () => {
  const mockChats: PersistedChat[] = [
    {
      id: 'c1',
      chatName: 'Product Strategy',
      sourceFileName: 'strategy.txt',
      sourceFileSize: 1024,
      contentHash: 'h1',
      totalMessages: 3,
      userMessagesCount: 3,
      systemMessagesCount: 0,
      participants: ['Sarah', 'David'],
      dateStart: '2026-02-10T10:00:00.000Z',
      dateEnd: '2026-02-10T11:00:00.000Z',
      detectedDateFormat: 'M/D/YY',
      warnings: [],
      importedAt: '2026-02-10T12:00:00.000Z',
      updatedAt: '2026-02-10T12:00:00.000Z',
    },
  ];

  const mockMessages: PersistedMessage[] = [
    {
      id: 'm1',
      chatId: 'c1',
      sequenceIndex: 0,
      rawTimestamp: '2/10/26, 10:00 AM',
      timestamp: '2026-02-10T10:00:00.000Z',
      sender: 'Sarah',
      isSystem: false,
      content: 'We must deliver the v1 prototype before the investor meeting on Friday at 3 PM.',
      sourceLineStart: 1,
      sourceLineEnd: 1,
    },
    {
      id: 'm2',
      chatId: 'c1',
      sequenceIndex: 1,
      rawTimestamp: '2/10/26, 10:15 AM',
      timestamp: '2026-02-10T10:15:00.000Z',
      sender: 'David',
      isSystem: false,
      content: 'Understood. The subscription price will be set to $19 per month.',
      sourceLineStart: 2,
      sourceLineEnd: 2,
    },
    {
      id: 'm3',
      chatId: 'c1',
      sequenceIndex: 2,
      rawTimestamp: '2/10/26, 10:30 AM',
      timestamp: '2026-02-10T10:30:00.000Z',
      sender: 'Sarah',
      isSystem: false,
      content: 'All frontend components should use React and Tailwind CSS.',
      sourceLineStart: 3,
      sourceLineEnd: 3,
    },
  ];

  it('answers when a question has confident matching evidence in messages', () => {
    const res = answerQuestionLocally('When is the investor meeting deadline?', mockChats, mockMessages);
    expect(res.hasAnswer).toBe(true);
    expect(res.answerText).toContain('Sarah');
    expect(res.answerText).toContain('Friday at 3 PM');
    expect(res.sources.length).toBeGreaterThan(0);
    expect(res.sources[0].sourceLineStart).toBe(1);
    expect(res.sources[0].sender).toBe('Sarah');
  });

  it('answers pricing questions with source attribution', () => {
    const res = answerQuestionLocally('What is the subscription price?', mockChats, mockMessages);
    expect(res.hasAnswer).toBe(true);
    expect(res.sources[0].sender).toBe('David');
    expect(res.sources[0].content).toContain('$19 per month');
    expect(res.sources[0].sourceLineStart).toBe(2);
  });

  it('honestly states when messages do not support an answer', () => {
    const res = answerQuestionLocally('What is the weather in Tokyo next week?', mockChats, mockMessages);
    expect(res.hasAnswer).toBe(false);
    expect(res.answerText).toContain('do not appear to contain messages answering this question');
    expect(res.sources.length).toBe(0);
  });

  it('handles empty questions gracefully', () => {
    const res = answerQuestionLocally('', mockChats, mockMessages);
    expect(res.hasAnswer).toBe(false);
    expect(res.answerText).toContain('Please enter a question');
  });

  it('includes clear transparency disclaimer', () => {
    const res = answerQuestionLocally('investor meeting', mockChats, mockMessages);
    expect(res.disclaimer).toContain('Local Retrieval Q&A');
    expect(res.disclaimer).toContain('Not an LLM');
  });
});
