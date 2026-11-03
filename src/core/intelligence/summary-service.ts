import { PersistedChat, PersistedMessage } from '../storage/types';

export interface ExtractedDecision {
  id: string;
  messageId: string;
  sender: string;
  timestamp: string;
  sourceLineStart: number;
  statement: string;
  context: string;
}

export interface ExtractedActionItem {
  id: string;
  messageId: string;
  sender: string;
  timestamp: string;
  sourceLineStart: number;
  task: string;
  context: string;
  assignee?: string;
}

export interface TopicHighlight {
  topic: string;
  occurrences: number;
  sampleQuotes: { quote: string; sender: string; line: number }[];
}

export interface ParticipantContribution {
  sender: string;
  count: number;
  percentage: number;
}

export interface ChatSummary {
  chatId: string;
  chatName: string;
  dateStart: string | null;
  dateEnd: string | null;
  totalMessagesAnalyzed: number;
  participants: ParticipantContribution[];
  decisions: ExtractedDecision[];
  actionItems: ExtractedActionItem[];
  keyTopics: TopicHighlight[];
  generatedAt: string;
  isExtractiveRuleBased: boolean;
  disclaimer: string;
}

export interface SummaryFilterOptions {
  dateStart?: string | null;
  dateEnd?: string | null;
}

// Patterns that typically signal a team or personal decision in chat
const DECISION_PATTERNS = [
  /\b(?:we\s+)?(?:agreed|decided|settled)\s+(?:to|on|that)\b/i,
  /\b(?:the\s+)?decision\s+is\b/i,
  /\bconfirmed\s+that\b/i,
  /\b(?:let's|lets)\s+go\s+with\b/i,
  /\bfinal\s+plan\s+is\b/i,
  /\b(?:approved|signed\s+off\s+on)\b/i,
  /\bwe\s+will\s+(?:proceed\s+with|use|adopt)\b/i,
];

// Patterns that typically signal tasks, todos, or responsibilities
const ACTION_PATTERNS = [
  /\b(?:todo|action\s+item|task):\s*(.+)/i,
  /\b(?:please|pls)\s+(?:remember\s+to\s+)?([a-z].{4,})/i,
  /\b(?:i\s+will|i'll|ill)\s+([a-z].{4,})/i,
  /\b(?:can\s+you|could\s+you)\s+([a-z].{4,})/i,
  /\b(?:need\s+to|needs\s+to|have\s+to)\s+([a-z].{4,})/i,
  /\bdeadline(?:\s+is)?\s+([a-z0-9].{3,})/i,
  /\bby\s+(?:tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday|eod|tonight)\b/i,
];

const STOP_WORDS = new Set([
  'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i', 'it', 'for', 'not', 'on', 'with', 'he',
  'as', 'you', 'do', 'at', 'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she', 'or',
  'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their', 'what', 'so', 'up', 'out', 'if', 'about',
  'who', 'get', 'which', 'go', 'me', 'when', 'make', 'can', 'like', 'time', 'no', 'just', 'him', 'know',
  'take', 'people', 'into', 'year', 'your', 'good', 'some', 'could', 'them', 'see', 'other', 'than', 'then',
  'now', 'look', 'only', 'come', 'its', 'over', 'think', 'also', 'back', 'after', 'use', 'two', 'how', 'our',
  'work', 'first', 'well', 'way', 'even', 'new', 'want', 'because', 'any', 'these', 'give', 'day', 'most',
  'us', 'is', 'are', 'was', 'were', 'been', 'being', 'am', 'has', 'had', 'did', 'does', 'yes', 'yeah', 'ok',
  'okay', 'sure', 'hey', 'hello', 'hi', 'thanks', 'thank', 'great', 'cool', 'fine', 'lol', 'haha'
]);

/**
 * Deterministically generates an extractive, fully grounded chat summary without AI hallucination.
 */
export function generateChatSummary(
  chat: PersistedChat,
  messages: PersistedMessage[],
  options: SummaryFilterOptions = {}
): ChatSummary {
  // 1. Filter messages by date if requested
  const filtered = messages.filter((msg) => {
    if (msg.isSystem) return false;
    if (options.dateStart && msg.timestamp < options.dateStart) return false;
    if (options.dateEnd && msg.timestamp > options.dateEnd) return false;
    return true;
  });

  // 2. Participant contribution breakdown
  const senderCounts: Record<string, number> = {};
  for (const m of filtered) {
    const sender = m.sender || 'Unknown';
    senderCounts[sender] = (senderCounts[sender] || 0) + 1;
  }

  const participants: ParticipantContribution[] = Object.entries(senderCounts)
    .map(([sender, count]) => ({
      sender,
      count,
      percentage: filtered.length > 0 ? Math.round((count / filtered.length) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count);

  // 3. Extract Decisions
  const decisions: ExtractedDecision[] = [];
  const seenDecisions = new Set<string>();

  for (const msg of filtered) {
    const lines = msg.content.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.length < 10) continue;

      for (const pattern of DECISION_PATTERNS) {
        if (pattern.test(trimmed)) {
          const key = trimmed.toLowerCase();
          if (!seenDecisions.has(key)) {
            seenDecisions.add(key);
            decisions.push({
              id: `dec_${msg.id}_${decisions.length}`,
              messageId: msg.id,
              sender: msg.sender || 'Unknown',
              timestamp: msg.timestamp,
              sourceLineStart: msg.sourceLineStart,
              statement: trimmed,
              context: msg.content,
            });
          }
          break;
        }
      }
    }
  }

  // 4. Extract Action Items & Tasks
  const actionItems: ExtractedActionItem[] = [];
  const seenTasks = new Set<string>();

  for (const msg of filtered) {
    const lines = msg.content.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.length < 8) continue;

      for (const pattern of ACTION_PATTERNS) {
        const match = pattern.exec(trimmed);
        if (match) {
          const key = trimmed.toLowerCase();
          if (!seenTasks.has(key)) {
            seenTasks.add(key);

            // Infer assignee if "Alice can you..." or "I will..."
            let assignee: string | undefined = undefined;
            if (/\b(?:i\s+will|i'll|ill)\b/i.test(trimmed)) {
              assignee = msg.sender || undefined;
            }

            actionItems.push({
              id: `act_${msg.id}_${actionItems.length}`,
              messageId: msg.id,
              sender: msg.sender || 'Unknown',
              timestamp: msg.timestamp,
              sourceLineStart: msg.sourceLineStart,
              task: trimmed,
              context: msg.content,
              assignee,
            });
          }
          break;
        }
      }
    }
  }

  // 5. Extract Key Topics via keyword frequency & significant phrases
  const wordFreq: Record<string, { count: number; sampleQuotes: { quote: string; sender: string; line: number }[] }> = {};

  for (const msg of filtered) {
    // Look for meaningful tokens (length >= 4, not stop words, letters only)
    const tokens = msg.content
      .toLowerCase()
      .replace(/https?:\/\/[^\s]+/g, '') // remove URLs
      .replace(/[^a-z0-9\s_-]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length >= 4 && !STOP_WORDS.has(w) && !/^\d+$/.test(w));

    const uniqueTokensInMsg = new Set(tokens);
    for (const token of uniqueTokensInMsg) {
      if (!wordFreq[token]) {
        wordFreq[token] = { count: 0, sampleQuotes: [] };
      }
      wordFreq[token].count += 1;
      if (wordFreq[token].sampleQuotes.length < 2 && msg.content.trim().length < 200) {
        wordFreq[token].sampleQuotes.push({
          quote: msg.content.trim(),
          sender: msg.sender || 'Unknown',
          line: msg.sourceLineStart,
        });
      }
    }
  }

  const keyTopics: TopicHighlight[] = Object.entries(wordFreq)
    .filter(([_, data]) => data.count >= 2) // at least mentioned in 2 messages
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 6)
    .map(([topic, data]) => ({
      topic: topic.charAt(0).toUpperCase() + topic.slice(1),
      occurrences: data.count,
      sampleQuotes: data.sampleQuotes,
    }));

  return {
    chatId: chat.id,
    chatName: chat.chatName,
    dateStart: filtered.length > 0 ? filtered[0].timestamp : chat.dateStart,
    dateEnd: filtered.length > 0 ? filtered[filtered.length - 1].timestamp : chat.dateEnd,
    totalMessagesAnalyzed: filtered.length,
    participants,
    decisions,
    actionItems,
    keyTopics,
    generatedAt: new Date().toISOString(),
    isExtractiveRuleBased: true,
    disclaimer:
      'Deterministic Extractive Summary: Generated offline using deterministic linguistic and pattern extraction. Not produced by an external generative model; all items cite verifiable message lines.',
  };
}
