import { ChatSummary } from '../intelligence/summary-service';
import { ExtractedResource } from '../extractor/types';

/**
 * Triggers a client-side file download in the browser.
 */
export function triggerFileDownload(content: string | Blob, filename: string, mimeType: string): void {
  const blob = typeof content === 'string' ? new Blob([content], { type: mimeType }) : content;
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

/**
 * Exports a ChatSummary to structured GitHub-flavored Markdown.
 */
export function exportSummaryToMarkdown(summary: ChatSummary): string {
  const lines: string[] = [];

  lines.push(`# Octonote Summary: ${summary.chatName}`);
  lines.push(`*Generated on ${new Date(summary.generatedAt).toLocaleString()}*\n`);
  lines.push(`> ${summary.disclaimer}\n`);

  lines.push(`## Overview`);
  lines.push(`- **Total Messages Analyzed:** ${summary.totalMessagesAnalyzed}`);
  lines.push(`- **Date Range:** ${summary.dateStart ? new Date(summary.dateStart).toLocaleDateString() : 'N/A'} - ${summary.dateEnd ? new Date(summary.dateEnd).toLocaleDateString() : 'N/A'}`);
  lines.push(`\n### Participants`);
  for (const p of summary.participants) {
    lines.push(`- **${p.sender}**: ${p.count} messages (${p.percentage}%)`);
  }

  lines.push(`\n## Decisions & Agreements (${summary.decisions.length})`);
  if (summary.decisions.length === 0) {
    lines.push(`*No explicit decisions detected in this conversation window.*`);
  } else {
    for (const d of summary.decisions) {
      lines.push(`- **${d.statement}**`);
      lines.push(`  - *Source: ${d.sender} (Line ${d.sourceLineStart}, ${new Date(d.timestamp).toLocaleTimeString()})*`);
    }
  }

  lines.push(`\n## Action Items & Next Steps (${summary.actionItems.length})`);
  if (summary.actionItems.length === 0) {
    lines.push(`*No explicit action items detected in this conversation window.*`);
  } else {
    for (const a of summary.actionItems) {
      const assigneeStr = a.assignee ? ` [Assigned: ${a.assignee}]` : '';
      lines.push(`- [ ] **${a.task}**${assigneeStr}`);
      lines.push(`  - *Source: ${a.sender} (Line ${a.sourceLineStart})*`);
    }
  }

  lines.push(`\n## Key Topics Discussed`);
  if (summary.keyTopics.length === 0) {
    lines.push(`*No recurrent topic clusters identified.*`);
  } else {
    for (const t of summary.keyTopics) {
      lines.push(`- **${t.topic}** (${t.occurrences} mentions)`);
      for (const q of t.sampleQuotes) {
        lines.push(`  > "${q.quote}" — *${q.sender} (Line ${q.line})*`);
      }
    }
  }

  lines.push(`\n---\n*Exported locally from Octonote — Zero external cloud transmission.*`);
  return lines.join('\n');
}

/**
 * Exports extracted resources to structured Markdown.
 */
export function exportResourcesToMarkdown(resources: ExtractedResource[], title = 'Knowledge Resources'): string {
  const lines: string[] = [];

  lines.push(`# Octonote: ${title}`);
  lines.push(`*Exported on ${new Date().toLocaleString()}*\n`);
  lines.push(`Total Resources: ${resources.length}\n`);

  for (const res of resources) {
    lines.push(`### [${res.displayLabel}](${res.rawUrl})`);
    lines.push(`- **Domain:** \`${res.domain}\``);
    lines.push(`- **Shared By:** ${res.sender || 'Unknown'} on ${new Date(res.timestamp).toLocaleDateString()} (Line ${res.sourceLineStart})`);
    if (res.context) {
      lines.push(`- **Context:** *"${res.context.trim()}"*`);
    }
    lines.push('');
  }

  lines.push(`---\n*Exported locally from Octonote.*`);
  return lines.join('\n');
}

/**
 * Exports a ChatSummary to a standalone, printable HTML document.
 */
export function exportSummaryToHtml(summary: ChatSummary): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Octonote Summary - ${escapeHtml(summary.chatName)}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1e293b; max-width: 800px; margin: 40px auto; padding: 0 20px; }
    h1 { color: #0f172a; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 4px; }
    .subtitle { color: #64748b; font-size: 0.875rem; margin-bottom: 24px; }
    .disclaimer { background: #f8fafc; border-left: 4px solid #6366f1; padding: 12px 16px; font-size: 0.8125rem; color: #475569; border-radius: 4px; margin-bottom: 24px; }
    h2 { color: #1e293b; margin-top: 28px; border-bottom: 1px solid #f1f5f9; padding-bottom: 6px; font-size: 1.25rem; }
    .badge { display: inline-block; background: #e0e7ff; color: #4338ca; padding: 2px 8px; border-radius: 12px; font-size: 0.75rem; font-weight: 600; }
    ul { padding-left: 20px; }
    li { margin-bottom: 10px; }
    .meta { font-size: 0.75rem; color: #64748b; margin-top: 2px; }
    blockquote { margin: 6px 0; padding: 6px 12px; background: #f8fafc; border-left: 3px solid #cbd5e1; font-style: italic; font-size: 0.8125rem; }
    @media print { body { max-width: 100%; margin: 0; padding: 10mm; } }
  </style>
</head>
<body>
  <h1>Octonote Summary: ${escapeHtml(summary.chatName)}</h1>
  <div class="subtitle">Generated on ${new Date(summary.generatedAt).toLocaleString()} &middot; ${summary.totalMessagesAnalyzed} messages analyzed</div>
  
  <div class="disclaimer">${escapeHtml(summary.disclaimer)}</div>

  <h2>Decisions & Agreements <span class="badge">${summary.decisions.length}</span></h2>
  ${summary.decisions.length === 0 ? '<p><em>No explicit decisions detected.</em></p>' : `
  <ul>
    ${summary.decisions.map(d => `
      <li>
        <strong>${escapeHtml(d.statement)}</strong>
        <div class="meta">Source: ${escapeHtml(d.sender)} (Line ${d.sourceLineStart}, ${new Date(d.timestamp).toLocaleTimeString()})</div>
      </li>
    `).join('')}
  </ul>`}

  <h2>Action Items & Tasks <span class="badge">${summary.actionItems.length}</span></h2>
  ${summary.actionItems.length === 0 ? '<p><em>No explicit action items detected.</em></p>' : `
  <ul>
    ${summary.actionItems.map(a => `
      <li>
        <strong>${escapeHtml(a.task)}</strong> ${a.assignee ? `<span class="badge">Assigned: ${escapeHtml(a.assignee)}</span>` : ''}
        <div class="meta">Source: ${escapeHtml(a.sender)} (Line ${a.sourceLineStart})</div>
      </li>
    `).join('')}
  </ul>`}

  <h2>Key Topics Discussed</h2>
  <ul>
    ${summary.keyTopics.map(t => `
      <li>
        <strong>${escapeHtml(t.topic)}</strong> (${t.occurrences} mentions)
        ${t.sampleQuotes.map(q => `<blockquote>"${escapeHtml(q.quote)}" &mdash; ${escapeHtml(q.sender)}</blockquote>`).join('')}
      </li>
    `).join('')}
  </ul>

  <hr style="margin-top: 40px; border: 0; border-top: 1px solid #e2e8f0;">
  <div class="meta" style="text-align: center;">Exported locally from Octonote &middot; Local-first & Private</div>
</body>
</html>`;
}

/**
 * Pure TypeScript generation of a valid PDF 1.4 binary file client-side.
 */
export function generatePdfBlob(title: string, sections: { heading: string; lines: string[] }[]): Blob {
  // Simple PDF page renderer
  const pageHeight = 842; // A4 pt
  const pageWidth = 595;
  const margin = 50;
  const lineHeight = 16;
  const startY = pageHeight - margin;

  const streamLines: string[] = [
    'BT',
    '/F1 18 Tf',
    `${margin} ${startY} Td`,
    `(${escapePdfString(title)}) Tj`,
    'ET',
  ];

  let currentY = startY - 30;

  for (const section of sections) {
    if (currentY < margin + 60) break; // Basic single page boundary for MVP

    streamLines.push(
      'BT',
      '/F1 13 Tf',
      `${margin} ${currentY} Td`,
      `(${escapePdfString(section.heading)}) Tj`,
      'ET'
    );
    currentY -= 20;

    for (const line of section.lines) {
      if (currentY < margin + 20) break;
      // Truncate long lines to avoid margin overflow
      const truncated = line.length > 75 ? line.slice(0, 72) + '...' : line;
      streamLines.push(
        'BT',
        '/F2 9 Tf',
        `${margin + 10} ${currentY} Td`,
        `(${escapePdfString(truncated)}) Tj`,
        'ET'
      );
      currentY -= lineHeight;
    }
    currentY -= 10;
  }

  // Footer
  streamLines.push(
    'BT',
    '/F2 8 Tf',
    `${margin} 35 Td`,
    `(${escapePdfString(`Octonote Export - ${new Date().toLocaleDateString()} - Local-first & Private`)}) Tj`,
    'ET'
  );

  const streamContent = streamLines.join('\n');
  const streamLength = streamContent.length;

  const objects: string[] = [
    // 1: Catalog
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj',
    // 2: Pages
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj',
    // 3: Page
    `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>\nendobj`,
    // 4: Bold Font
    '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj',
    // 5: Normal Font
    '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj',
    // 6: Stream Contents
    `6 0 obj\n<< /Length ${streamLength} >>\nstream\n${streamContent}\nendstream\nendobj`,
  ];

  let offset = 9; // length of "%PDF-1.4\n"
  const xrefEntries = ['0000000000 65535 f '];
  let body = '%PDF-1.4\n';

  for (const obj of objects) {
    xrefEntries.push(String(offset).padStart(10, '0') + ' 00000 n ');
    body += obj + '\n';
    offset += obj.length + 1;
  }

  const startxref = offset;
  let xref = `xref\n0 ${objects.length + 1}\n`;
  for (const entry of xrefEntries) {
    xref += entry + '\n';
  }

  const trailer = `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${startxref}\n%%EOF\n`;
  const pdfString = body + xref + trailer;

  return new Blob([pdfString], { type: 'application/pdf' });
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function escapePdfString(str: string): string {
  return str.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}
