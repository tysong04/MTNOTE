import { describe, it, expect } from 'vitest';
import {
  exportSummaryToMarkdown,
  exportResourcesToMarkdown,
  exportSummaryToHtml,
  generatePdfBlob,
} from './export-service';
import { ChatSummary } from '../intelligence/summary-service';
import { ExtractedResource } from '../extractor/types';

describe('export-service', () => {
  const mockSummary: ChatSummary = {
    chatId: 'c1',
    chatName: 'Team Standup',
    dateStart: '2026-04-01T10:00:00.000Z',
    dateEnd: '2026-04-01T11:00:00.000Z',
    totalMessagesAnalyzed: 10,
    participants: [{ sender: 'Eve', count: 6, percentage: 60 }],
    decisions: [
      {
        id: 'd1',
        messageId: 'm1',
        sender: 'Eve',
        timestamp: '2026-04-01T10:05:00.000Z',
        sourceLineStart: 3,
        statement: 'We agreed to ship beta on Friday.',
        context: 'Full context',
      },
    ],
    actionItems: [
      {
        id: 'a1',
        messageId: 'm2',
        sender: 'Eve',
        timestamp: '2026-04-01T10:10:00.000Z',
        sourceLineStart: 5,
        task: 'TODO: verify end-to-end tests',
        context: 'Full context',
        assignee: 'Eve',
      },
    ],
    keyTopics: [{ topic: 'Beta', occurrences: 4, sampleQuotes: [] }],
    generatedAt: '2026-04-01T12:00:00.000Z',
    isExtractiveRuleBased: true,
    disclaimer: 'Deterministic extractive summary disclaimer.',
  };

  const mockResources: ExtractedResource[] = [
    {
      id: 'r1',
      chatId: 'c1',
      messageId: 'm3',
      type: 'url',
      rawUrl: 'https://github.com/octonote/app',
      domain: 'github.com',
      displayLabel: 'GitHub link',
      context: 'Check repository',
      sender: 'Eve',
      timestamp: '2026-04-01T10:15:00.000Z',
      sourceLineStart: 8,
      sourceLineEnd: 8,
      createdAt: '2026-04-01T12:00:00.000Z',
    },
  ];

  it('exports summary to readable markdown with source citations', () => {
    const md = exportSummaryToMarkdown(mockSummary);
    expect(md).toContain('# Octonote Summary: Team Standup');
    expect(md).toContain('We agreed to ship beta on Friday.');
    expect(md).toContain('Line 3');
    expect(md).toContain('TODO: verify end-to-end tests');
    expect(md).toContain('Line 5');
    expect(md).toContain('Zero external cloud transmission');
  });

  it('exports resources to readable markdown', () => {
    const md = exportResourcesToMarkdown(mockResources);
    expect(md).toContain('# Octonote: Knowledge Resources');
    expect(md).toContain('https://github.com/octonote/app');
    expect(md).toContain('`github.com`');
    expect(md).toContain('Line 8');
  });

  it('exports summary to self-contained HTML document with style and disclaimer', () => {
    const html = exportSummaryToHtml(mockSummary);
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('Octonote Summary: Team Standup');
    expect(html).toContain('We agreed to ship beta on Friday.');
    expect(html).toContain('Deterministic extractive summary disclaimer');
  });

  it('generates a valid binary PDF Blob', async () => {
    const pdfBlob = generatePdfBlob('Octonote Summary: Team Standup', [
      { heading: 'Decisions', lines: ['- We agreed to ship beta on Friday. (Line 3)'] },
      { heading: 'Action Items', lines: ['- TODO: verify tests (Line 5)'] },
    ]);

    expect(pdfBlob).toBeInstanceOf(Blob);
    expect(pdfBlob.type).toBe('application/pdf');
    expect(pdfBlob.size).toBeGreaterThan(100);

    const text = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsText(pdfBlob);
    });

    expect(text.startsWith('%PDF-1.4')).toBe(true);
    expect(text).toContain('trailer');
    expect(text.trim().endsWith('%%EOF')).toBe(true);
  });
});
