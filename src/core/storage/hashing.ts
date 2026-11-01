import { ParsedMessage } from '../parser/types';

/**
 * Computes a deterministic SHA-256 hash of a string using Web Crypto API,
 * with a fast 64-bit pure JS fallback if SubtleCrypto is unavailable.
 */
export async function computeContentHash(content: string): Promise<string> {
  const normalized = content.trim().replace(/\r\n/g, '\n');

  if (typeof crypto !== 'undefined' && crypto.subtle && typeof TextEncoder !== 'undefined') {
    try {
      const buffer = new TextEncoder().encode(normalized);
      const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    } catch {
      // Fall through to JS fallback
    }
  }

  // Pure JavaScript 64-bit FNV-1a hash fallback
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < normalized.length; i++) {
    const ch = normalized.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const part1 = (h1 >>> 0).toString(16).padStart(8, '0');
  const part2 = (h2 >>> 0).toString(16).padStart(8, '0');
  return `fallback_${part1}${part2}`;
}

/**
 * Computes a hash from parsed messages to detect duplicates based on
 * conversation content (senders, timestamps, and messages).
 */
export async function computeMessagesContentHash(messages: ParsedMessage[]): Promise<string> {
  if (messages.length === 0) {
    return 'empty_conversation';
  }

  // Create a normalized representation from messages
  const fingerprint = messages
    .map((m) => `${m.rawTimestamp}|${m.sender ?? ''}|${m.content}`)
    .join('\n');

  return computeContentHash(fingerprint);
}
