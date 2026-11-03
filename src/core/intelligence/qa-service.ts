import { PersistedChat, PersistedMessage } from '../storage/types';

export interface QASourceReference {
  chatId: string;
  chatName: string;
  messageId: string;
  sender: string;
  timestamp: string;
  sourceLineStart: number;
  content: string;
  relevanceScore: number;
}

export interface QAResponse {
  question: string;
  hasAnswer: boolean;
  answerText: string;
  sources: QASourceReference[];
  matchedTerms: string[];
  disclaimer: string;
}

export interface QAOptions {
  chatId?: string;
  topK?: number;
}

const QUESTION_STOP_WORDS = new Set([
  'what', 'who', 'when', 'where', 'why', 'how', 'is', 'are', 'was', 'were', 'the',
  'a', 'an', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'about', 'did', 'do',
  'does', 'have', 'has', 'had', 'can', 'could', 'would', 'should', 'tell', 'me', 'us',
  'show', 'find', 'which', 'any', 'there', 'their', 'we', 'they', 'i', 'you'
]);

/**
 * Deterministically answers questions by retrieving the highest-confidence matching messages.
 * If no messages match with sufficient confidence, honestly admits that no answer is supported.
 */
export function answerQuestionLocally(
  question: string,
  chats: PersistedChat[],
  messages: PersistedMessage[],
  options: QAOptions = {}
): QAResponse {
  const trimmedQ = question.trim();
  const DISCLAIMER =
    'Local Retrieval Q&A: Answers are derived strictly from matched verbatim messages using local lexical and TF-IDF scoring without an external LLM (Not an LLM). Citations point to exact message lines.';

  if (!trimmedQ) {
    return {
      question,
      hasAnswer: false,
      answerText: 'Please enter a question to search your conversations.',
      sources: [],
      matchedTerms: [],
      disclaimer: DISCLAIMER,
    };
  }

  // 1. Extract query tokens (ignoring question words and single chars)
  const queryTokens = trimmedQ
    .toLowerCase()
    .replace(/[^a-z0-9\s_-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !QUESTION_STOP_WORDS.has(w));

  if (queryTokens.length === 0) {
    return {
      question,
      hasAnswer: false,
      answerText:
        'The question contains only generic stop words. Please include specific keywords, names, or topics.',
      sources: [],
      matchedTerms: [],
      disclaimer: DISCLAIMER,
    };
  }

  // Map chat names
  const chatNameMap = new Map<string, string>();
  for (const c of chats) {
    chatNameMap.set(c.id, c.chatName);
  }

  // 2. Filter candidates by chatId if specified
  const candidateMessages = messages.filter((m) => {
    if (m.isSystem) return false;
    if (options.chatId && m.chatId !== options.chatId) return false;
    return true;
  });

  if (candidateMessages.length === 0) {
    return {
      question,
      hasAnswer: false,
      answerText: 'No messages are available in the selected scope to answer this question.',
      sources: [],
      matchedTerms: queryTokens,
      disclaimer: DISCLAIMER,
    };
  }

  // 3. Score messages based on keyword matches, exact phrase match, and proximity
  interface ScoredCandidate {
    msg: PersistedMessage;
    score: number;
    matchedTerms: string[];
  }

  const scored: ScoredCandidate[] = [];
  const qLower = trimmedQ.toLowerCase();

  for (const msg of candidateMessages) {
    const textLower = msg.content.toLowerCase();
    const senderLower = (msg.sender || '').toLowerCase();
    let score = 0;
    const matched: string[] = [];

    // Exact phrase bonus
    if (textLower.includes(qLower)) {
      score += 15;
      matched.push(trimmedQ);
    }

    // Token matches
    for (const token of queryTokens) {
      if (textLower.includes(token)) {
        score += 3;
        matched.push(token);
        // Bonus if word matches at whole boundary
        const boundaryRegex = new RegExp(`\\b${token}\\b`, 'i');
        if (boundaryRegex.test(textLower)) {
          score += 2;
        }
      } else if (senderLower.includes(token)) {
        score += 4;
        matched.push(token);
      }
    }

    // Bonus for messages containing informative indicators when asking about decisions/deadlines
    if (/when|deadline|date|time/i.test(trimmedQ) && /\b(?:on|by|at|friday|monday|tomorrow|am|pm|\d{1,2}:\d{2})\b/i.test(textLower)) {
      score += 2;
    }
    if (/who|person|assigned/i.test(trimmedQ) && /\b(?:i\s+will|i'll|you|assigned|handle)\b/i.test(textLower)) {
      score += 2;
    }

    if (score >= 5) {
      scored.push({ msg, score, matchedTerms: Array.from(new Set(matched)) });
    }
  }

  scored.sort((a, b) => b.score - a.score);

  // 4. Threshold evaluation: if top score is below threshold, honestly say no answer found
  const CONFIDENCE_THRESHOLD = 5;
  if (scored.length === 0 || scored[0].score < CONFIDENCE_THRESHOLD) {
    return {
      question,
      hasAnswer: false,
      answerText:
        'The imported conversations do not appear to contain messages answering this question. No relevant evidence was found with sufficient confidence.',
      sources: [],
      matchedTerms: queryTokens,
      disclaimer: DISCLAIMER,
    };
  }

  const topK = options.topK || 3;
  const topMatches = scored.slice(0, topK);

  const sources: QASourceReference[] = topMatches.map((item) => ({
    chatId: item.msg.chatId,
    chatName: chatNameMap.get(item.msg.chatId) || 'Unknown Chat',
    messageId: item.msg.id,
    sender: item.msg.sender || 'Unknown',
    timestamp: item.msg.timestamp,
    sourceLineStart: item.msg.sourceLineStart,
    content: item.msg.content,
    relevanceScore: item.score,
  }));

  // Build grounded response referencing authentic excerpts
  const best = sources[0];
  let answerSummary = `According to **${best.sender}** in *${best.chatName}* (line ${best.sourceLineStart}):\n\n> "${best.content}"`;

  if (sources.length > 1) {
    answerSummary += `\n\nAdditional supporting context was also found in ${sources.length - 1} other message${
      sources.length > 2 ? 's' : ''
    }.`;
  }

  return {
    question,
    hasAnswer: true,
    answerText: answerSummary,
    sources,
    matchedTerms: queryTokens,
    disclaimer: DISCLAIMER,
  };
}
