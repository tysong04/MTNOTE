import MiniSearch, { SearchResult as MiniSearchResult } from 'minisearch';
import { PersistedChat, PersistedMessage } from '../storage/types';
import { ExtractedResource } from '../extractor/types';

export type SearchItemType = 'message' | 'resource';

export interface IndexedSearchDocument {
  id: string; // Unique document ID
  type: SearchItemType;
  chatId: string;
  chatName: string;
  content: string;
  sender: string;
  timestamp: string;
  sourceLineStart: number;
  messageId?: string;
  displayLabel?: string;
  domain?: string;
  rawUrl?: string;
}

export interface SearchResultItem {
  id: string;
  type: SearchItemType;
  chatId: string;
  chatName: string;
  sender: string;
  timestamp: string;
  sourceLineStart: number;
  excerpt: string;
  score: number;
  messageId?: string;
  displayLabel?: string;
  domain?: string;
  rawUrl?: string;
  matchedTerms: string[];
}

export interface SearchOptions {
  scope?: 'all' | 'messages' | 'resources';
  chatId?: string;
  limit?: number;
}

export class MTNoteSearchEngine {
  private miniSearch: MiniSearch<IndexedSearchDocument>;
  private documentsMap: Map<string, IndexedSearchDocument> = new Map();

  constructor() {
    this.miniSearch = new MiniSearch<IndexedSearchDocument>({
      fields: ['content', 'sender', 'chatName', 'displayLabel', 'domain', 'rawUrl'],
      storeFields: [
        'id',
        'type',
        'chatId',
        'chatName',
        'content',
        'sender',
        'timestamp',
        'sourceLineStart',
        'messageId',
        'displayLabel',
        'domain',
        'rawUrl',
      ],
      searchOptions: {
        boost: { content: 2, displayLabel: 1.5, rawUrl: 1.2 },
        fuzzy: 0.2,
        prefix: true,
      },
    });
  }

  /**
   * Clears and builds the in-memory search index with given chats, messages, and resources.
   */
  public buildIndex(
    chats: PersistedChat[],
    messages: PersistedMessage[],
    resources: ExtractedResource[]
  ): void {
    this.miniSearch.removeAll();
    this.documentsMap.clear();

    const chatNameMap = new Map<string, string>();
    for (const c of chats) {
      chatNameMap.set(c.id, c.chatName);
    }

    const docs: IndexedSearchDocument[] = [];

    // 1. Index messages
    for (const msg of messages) {
      const doc: IndexedSearchDocument = {
        id: `msg_${msg.id}`,
        type: 'message',
        chatId: msg.chatId,
        chatName: chatNameMap.get(msg.chatId) || 'Unknown Chat',
        content: msg.content,
        sender: msg.sender || (msg.isSystem ? 'System' : 'Unknown'),
        timestamp: msg.timestamp,
        sourceLineStart: msg.sourceLineStart,
        messageId: msg.id,
      };
      docs.push(doc);
      this.documentsMap.set(doc.id, doc);
    }

    // 2. Index resources
    for (const res of resources) {
      const doc: IndexedSearchDocument = {
        id: `res_${res.id}`,
        type: 'resource',
        chatId: res.chatId,
        chatName: chatNameMap.get(res.chatId) || 'Unknown Chat',
        content: `${res.displayLabel} ${res.rawUrl} ${res.context}`,
        sender: res.sender || 'Unknown',
        timestamp: res.timestamp,
        sourceLineStart: res.sourceLineStart,
        messageId: res.messageId,
        displayLabel: res.displayLabel,
        domain: res.domain,
        rawUrl: res.rawUrl,
      };
      docs.push(doc);
      this.documentsMap.set(doc.id, doc);
    }

    if (docs.length > 0) {
      this.miniSearch.addAll(docs);
    }
  }

  /**
   * Searches the index and returns ranked, highlighted results.
   */
  public search(query: string, options: SearchOptions = {}): SearchResultItem[] {
    const trimmed = query.trim();
    if (!trimmed) {
      return [];
    }

    const { scope = 'all', chatId, limit = 50 } = options;

    try {
      const rawResults: MiniSearchResult[] = this.miniSearch.search(trimmed, {
        filter: (doc: any) => {
          if (chatId && doc.chatId !== chatId) {
            return false;
          }
          if (scope === 'messages' && doc.type !== 'message') {
            return false;
          }
          if (scope === 'resources' && doc.type !== 'resource') {
            return false;
          }
          return true;
        },
      });

      const results: SearchResultItem[] = [];

      for (const res of rawResults.slice(0, limit)) {
        const doc = this.documentsMap.get(res.id);
        if (!doc) continue;

        const excerpt = this.createExcerpt(doc.content, res.terms || [trimmed]);

        results.push({
          id: doc.id,
          type: doc.type,
          chatId: doc.chatId,
          chatName: doc.chatName,
          sender: doc.sender,
          timestamp: doc.timestamp,
          sourceLineStart: doc.sourceLineStart,
          excerpt,
          score: res.score,
          messageId: doc.messageId,
          displayLabel: doc.displayLabel,
          domain: doc.domain,
          rawUrl: doc.rawUrl,
          matchedTerms: res.terms || [],
        });
      }

      return results;
    } catch (err) {
      console.error('MiniSearch error executing search:', err);
      // Fallback to simple substring match if MiniSearch syntax error occurs
      return this.fallbackSubstringSearch(trimmed, options);
    }
  }

  /**
   * Creates a highlighted/centered text snippet around the matched terms.
   */
  private createExcerpt(text: string, terms: string[], maxLen = 140): string {
    if (!text) return '';
    const lower = text.toLowerCase();
    let bestPos = -1;

    for (const term of terms) {
      const pos = lower.indexOf(term.toLowerCase());
      if (pos !== -1) {
        bestPos = pos;
        break;
      }
    }

    if (bestPos === -1) {
      return text.length > maxLen ? text.slice(0, maxLen).trim() + '...' : text;
    }

    const start = Math.max(0, bestPos - Math.floor(maxLen / 3));
    const end = Math.min(text.length, start + maxLen);
    let excerpt = text.slice(start, end);

    if (start > 0) excerpt = '...' + excerpt;
    if (end < text.length) excerpt = excerpt + '...';

    return excerpt;
  }

  /**
   * Simple substring matching fallback if query contains unusual symbols.
   */
  private fallbackSubstringSearch(query: string, options: SearchOptions): SearchResultItem[] {
    const qLower = query.toLowerCase();
    const results: SearchResultItem[] = [];

    for (const doc of this.documentsMap.values()) {
      if (options.chatId && doc.chatId !== options.chatId) continue;
      if (options.scope === 'messages' && doc.type !== 'message') continue;
      if (options.scope === 'resources' && doc.type !== 'resource') continue;

      if (
        doc.content.toLowerCase().includes(qLower) ||
        doc.sender.toLowerCase().includes(qLower) ||
        (doc.displayLabel && doc.displayLabel.toLowerCase().includes(qLower)) ||
        (doc.rawUrl && doc.rawUrl.toLowerCase().includes(qLower))
      ) {
        results.push({
          id: doc.id,
          type: doc.type,
          chatId: doc.chatId,
          chatName: doc.chatName,
          sender: doc.sender,
          timestamp: doc.timestamp,
          sourceLineStart: doc.sourceLineStart,
          excerpt: this.createExcerpt(doc.content, [query]),
          score: 1,
          messageId: doc.messageId,
          displayLabel: doc.displayLabel,
          domain: doc.domain,
          rawUrl: doc.rawUrl,
          matchedTerms: [query],
        });
      }
    }

    return results;
  }
}

// Backwards-compatibility alias
export { MTNoteSearchEngine as OctonoteSearchEngine };

// Global search engine instance
export const searchEngine = new MTNoteSearchEngine();
