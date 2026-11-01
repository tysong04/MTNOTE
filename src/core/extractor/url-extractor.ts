import { ExtractedResource, ExtractableMessage } from './types';

// Regex strictly matching explicit http:// and https:// URLs
const URL_REGEX = /https?:\/\/[^\s<>"'{}|\\^`]+/gi;

/**
 * Trims trailing punctuation often appended at the end of URLs in natural language text.
 * Preserves balanced parentheses for URLs like https://en.wikipedia.org/wiki/Function_(mathematics)
 */
export function cleanTrailingPunctuation(candidate: string): string {
  let url = candidate;

  // Characters that should not appear at the very end of a URL in conversation text
  const trailingCharsToStrip = /[.,;:!?'"’`>\]}]$/;

  while (trailingCharsToStrip.test(url)) {
    url = url.slice(0, -1);
  }

  // Handle unbalanced trailing closing parentheses (e.g. "(https://example.com)")
  const openParens = (url.match(/\(/g) || []).length;
  const closeParens = (url.match(/\)/g) || []).length;
  if (closeParens > openParens && url.endsWith(')')) {
    url = url.slice(0, -1);
    // After trimming parenthesis, re-check for trailing punctuation like periods
    while (trailingCharsToStrip.test(url)) {
      url = url.slice(0, -1);
    }
  }

  return url;
}

/**
 * Infers an informative display label based solely on hostname and file extension in the URL path.
 * Note: Does NOT fetch or verify remote content.
 */
export function inferUrlDisplayLabel(parsedUrl: URL): string {
  const host = parsedUrl.hostname.toLowerCase();
  const path = parsedUrl.pathname.toLowerCase();

  // Document file extensions
  if (/\.pdf$/i.test(path)) {
    return 'PDF document link';
  }
  if (/\.(docx?|xlsx?|pptx?)$/i.test(path)) {
    return 'Office document link';
  }
  if (/\.(zip|tar|gz|rar|7z)$/i.test(path)) {
    return 'Archive download link';
  }

  // Common platform domains
  if (host === 'github.com' || host.endsWith('.github.com')) {
    return 'GitHub link';
  }
  if (host === 'gitlab.com' || host.endsWith('.gitlab.com')) {
    return 'GitLab link';
  }
  if (host === 'arxiv.org' || host.endsWith('.arxiv.org')) {
    return 'arXiv paper link';
  }
  if (
    host.includes('google.com') &&
    (path.includes('/document/') || path.includes('/spreadsheets/') || path.includes('/presentation/') || path.includes('/drive/'))
  ) {
    return 'Google Drive / Docs link';
  }
  if (host === 'youtube.com' || host === 'youtu.be' || host.endsWith('.youtube.com')) {
    return 'YouTube link';
  }
  if (host === 'en.wikipedia.org' || host.endsWith('.wikipedia.org')) {
    return 'Wikipedia article link';
  }

  return 'Web link';
}

/**
 * Extracts and validates explicit HTTP and HTTPS URLs from a single message.
 * Strictly local processing — no network calls or remote checks.
 */
export function extractUrlsFromMessage(message: ExtractableMessage): ExtractedResource[] {
  if (!message.content || typeof message.content !== 'string') {
    return [];
  }

  const rawMatches = message.content.match(URL_REGEX);
  if (!rawMatches || rawMatches.length === 0) {
    return [];
  }

  const resources: ExtractedResource[] = [];
  const seenUrlsInMessage = new Set<string>();
  const now = new Date().toISOString();

  let urlIndex = 0;
  for (const rawMatch of rawMatches) {
    const cleaned = cleanTrailingPunctuation(rawMatch);

    // Validate using standard URL constructor
    let parsed: URL;
    try {
      parsed = new URL(cleaned);
    } catch {
      // Invalid URL format
      continue;
    }

    // Require http or https protocol
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      continue;
    }

    // Require a non-empty hostname with at least one dot or localhost
    const hostname = parsed.hostname.toLowerCase();
    if (!hostname || (!hostname.includes('.') && hostname !== 'localhost')) {
      continue;
    }

    // Deduplicate within the same message
    if (seenUrlsInMessage.has(cleaned)) {
      continue;
    }
    seenUrlsInMessage.add(cleaned);

    const displayDomain = hostname.replace(/^www\./, '');
    const displayLabel = inferUrlDisplayLabel(parsed);

    resources.push({
      id: `res_${message.chatId}_${message.sequenceIndex}_${urlIndex}`,
      chatId: message.chatId,
      messageId: message.id,
      type: 'url',
      rawUrl: cleaned,
      domain: displayDomain,
      displayLabel,
      context: message.content,
      sender: message.sender,
      timestamp: message.timestamp,
      sourceLineStart: message.sourceLineStart,
      sourceLineEnd: message.sourceLineEnd,
      createdAt: now,
    });

    urlIndex++;
  }

  return resources;
}

/**
 * Extracts resources from a collection of messages.
 */
export function extractResourcesFromMessages(messages: ExtractableMessage[]): ExtractedResource[] {
  const allResources: ExtractedResource[] = [];
  for (const msg of messages) {
    const extracted = extractUrlsFromMessage(msg);
    allResources.push(...extracted);
  }
  return allResources;
}
