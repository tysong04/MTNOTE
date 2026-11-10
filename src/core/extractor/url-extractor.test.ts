import { describe, it, expect } from 'vitest';
import {
  extractUrlsFromMessage,
  extractResourcesFromMessages,
  cleanTrailingPunctuation,
} from './url-extractor';
import { ExtractableMessage } from './types';

describe('Deterministic URL Extractor', () => {
  const baseMessage: ExtractableMessage = {
    id: 'chat_123_0',
    chatId: 'chat_123',
    sequenceIndex: 0,
    content: 'Check out https://github.com/mtnote/core for the latest commit.',
    sender: 'Alice',
    timestamp: '2024-01-15T10:30:00.000Z',
    sourceLineStart: 12,
    sourceLineEnd: 12,
  };

  it('extracts standard HTTPS URL with correct metadata and source references', () => {
    const resources = extractUrlsFromMessage(baseMessage);

    expect(resources.length).toBe(1);
    const res = resources[0];
    expect(res.id).toBe('res_chat_123_0_0');
    expect(res.chatId).toBe('chat_123');
    expect(res.messageId).toBe('chat_123_0');
    expect(res.type).toBe('url');
    expect(res.rawUrl).toBe('https://github.com/mtnote/core');
    expect(res.domain).toBe('github.com');
    expect(res.displayLabel).toBe('GitHub link');
    expect(res.sender).toBe('Alice');
    expect(res.timestamp).toBe('2024-01-15T10:30:00.000Z');
    expect(res.sourceLineStart).toBe(12);
    expect(res.sourceLineEnd).toBe(12);
    expect(res.context).toBe(baseMessage.content);
  });

  it('correctly trims trailing punctuation commonly found in conversation text', () => {
    expect(cleanTrailingPunctuation('https://example.com/page.')).toBe('https://example.com/page');
    expect(cleanTrailingPunctuation('https://example.com/page,')).toBe('https://example.com/page');
    expect(cleanTrailingPunctuation('https://example.com/page!?!')).toBe('https://example.com/page');
    expect(cleanTrailingPunctuation('https://example.com/page:')).toBe('https://example.com/page');
    expect(cleanTrailingPunctuation('https://example.com/page;')).toBe('https://example.com/page');
    expect(cleanTrailingPunctuation('https://example.com/page"')).toBe('https://example.com/page');
    expect(cleanTrailingPunctuation('https://example.com/page\'')).toBe('https://example.com/page');
  });

  it('handles parentheses properly: strips enclosing parens but preserves balanced query parens', () => {
    // Regex matches from "http...", so candidate has trailing paren: "https://example.com/test)"
    expect(cleanTrailingPunctuation('https://example.com/test)')).toBe('https://example.com/test');
    const msgEnclosed: ExtractableMessage = {
      ...baseMessage,
      content: 'Please see (https://example.com/docs).',
    };
    const resEnclosed = extractUrlsFromMessage(msgEnclosed);
    expect(resEnclosed[0].rawUrl).toBe('https://example.com/docs');

    // Balanced Wikipedia parenthesis URL
    const msgWiki: ExtractableMessage = {
      ...baseMessage,
      content: 'Reference: https://en.wikipedia.org/wiki/Function_(mathematics).',
    };
    const resWiki = extractUrlsFromMessage(msgWiki);
    expect(resWiki[0].rawUrl).toBe('https://en.wikipedia.org/wiki/Function_(mathematics)');
  });

  it('infers display labels without making remote network calls', () => {
    const testCases: [string, string][] = [
      ['https://example.com/files/spec.pdf', 'PDF document link'],
      ['https://example.com/files/report.docx', 'Office document link'],
      ['https://example.com/data.zip', 'Archive download link'],
      ['https://github.com/facebook/react', 'GitHub link'],
      ['https://gitlab.com/group/project', 'GitLab link'],
      ['https://arxiv.org/abs/2301.00001', 'arXiv paper link'],
      ['https://docs.google.com/document/d/123/edit', 'Google Drive / Docs link'],
      ['https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'YouTube link'],
      ['https://en.wikipedia.org/wiki/Knowledge_base', 'Wikipedia article link'],
      ['https://news.ycombinator.com', 'Web link'],
    ];

    for (const [url, expectedLabel] of testCases) {
      const msg: ExtractableMessage = {
        ...baseMessage,
        content: `Link: ${url}`,
      };
      const res = extractUrlsFromMessage(msg);
      expect(res.length).toBe(1);
      expect(res[0].displayLabel).toBe(expectedLabel);
    }
  });

  it('extracts multiple distinct URLs from a single multiline message', () => {
    const multiMsg: ExtractableMessage = {
      ...baseMessage,
      content: `Here are two resources:
1. https://arxiv.org/abs/2301.00001
2. https://github.com/mtnote/app/releases.
Let me know which you prefer.`,
    };

    const resources = extractUrlsFromMessage(multiMsg);
    expect(resources.length).toBe(2);
    expect(resources[0].rawUrl).toBe('https://arxiv.org/abs/2301.00001');
    expect(resources[0].id).toBe('res_chat_123_0_0');
    expect(resources[1].rawUrl).toBe('https://github.com/mtnote/app/releases');
    expect(resources[1].id).toBe('res_chat_123_0_1');
  });

  it('deduplicates identical URLs within the same message', () => {
    const dupMsg: ExtractableMessage = {
      ...baseMessage,
      content: 'Visit https://example.com and again https://example.com please.',
    };

    const resources = extractUrlsFromMessage(dupMsg);
    expect(resources.length).toBe(1);
    expect(resources[0].rawUrl).toBe('https://example.com');
  });

  it('handles Unicode, emojis and non-Latin text surrounding links', () => {
    const unicodeMsg: ExtractableMessage = {
      ...baseMessage,
      content: '🚀 नमस्ते! यह लेख देखें: https://example.org/hindi-guide/ और यह भी: https://example.org/japanese-guide/ 🎉',
    };

    const resources = extractUrlsFromMessage(unicodeMsg);
    expect(resources.length).toBe(2);
    expect(resources[0].rawUrl).toBe('https://example.org/hindi-guide/');
    expect(resources[1].rawUrl).toBe('https://example.org/japanese-guide/');
  });

  it('extracts only explicit http:// and https:// URLs and ignores bare www links or invalid protocols', () => {
    const bareMsg: ExtractableMessage = {
      ...baseMessage,
      content: 'Do not extract www.example.com or ftp://files.example.com/test or javascript:alert(1). Only https://secure.example.com.',
    };

    const resources = extractUrlsFromMessage(bareMsg);
    expect(resources.length).toBe(1);
    expect(resources[0].rawUrl).toBe('https://secure.example.com');
  });

  it('gracefully handles malformed URLs without throwing', () => {
    const brokenMsg: ExtractableMessage = {
      ...baseMessage,
      content: 'Broken http:// or https:/// without valid domain, http://localhost:3000/api',
    };

    const resources = extractUrlsFromMessage(brokenMsg);
    // localhost is valid, broken http:// is safely skipped
    expect(resources.length).toBe(1);
    expect(resources[0].rawUrl).toBe('http://localhost:3000/api');
    expect(resources[0].domain).toBe('localhost');
  });

  it('extracts resources across a collection of messages preserving source references', () => {
    const messages: ExtractableMessage[] = [
      {
        id: 'msg_1',
        chatId: 'chat_A',
        sequenceIndex: 0,
        content: 'System notice with no links',
        sender: null,
        timestamp: '2024-01-15T10:00:00.000Z',
        sourceLineStart: 1,
        sourceLineEnd: 1,
      },
      {
        id: 'msg_2',
        chatId: 'chat_A',
        sequenceIndex: 1,
        content: 'Alice shared https://example.com/one',
        sender: 'Alice',
        timestamp: '2024-01-15T10:01:00.000Z',
        sourceLineStart: 2,
        sourceLineEnd: 2,
      },
      {
        id: 'msg_3',
        chatId: 'chat_A',
        sequenceIndex: 2,
        content: 'Bob shared https://example.com/two',
        sender: 'Bob',
        timestamp: '2024-01-15T10:02:00.000Z',
        sourceLineStart: 3,
        sourceLineEnd: 3,
      },
    ];

    const all = extractResourcesFromMessages(messages);
    expect(all.length).toBe(2);
    expect(all[0].sender).toBe('Alice');
    expect(all[0].rawUrl).toBe('https://example.com/one');
    expect(all[1].sender).toBe('Bob');
    expect(all[1].rawUrl).toBe('https://example.com/two');
  });
});
