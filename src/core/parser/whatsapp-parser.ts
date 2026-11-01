import {
  ParsedMessage,
  ParseResult,
  ParseWarning,
} from './types';
import {
  detectDateOrder,
  parseWhatsAppTimestamp,
  sanitizeUnicodeMarkers,
  DateOrder,
} from './date-utils';

export interface ParseOptions {
  fileName?: string;
  fileSize?: number;
  maxLines?: number;
}

// Regex for Android WhatsApp line: "DD/MM/YYYY, HH:mm - Sender: Message" or "M/D/YY, h:mm a - System"
const ANDROID_LINE_REGEX = /^([\d]{1,4}[/\.-][\d]{1,2}[/\.-][\d]{1,4},\s*[\d]{1,2}:[\d]{2}(?::[\d]{2})?(?:[\s\u202F\u00A0]*(?:AM|PM|am|pm))?)\s*-\s*(.*)$/;

// Regex for iOS WhatsApp line: "[DD/MM/YYYY, HH:mm:ss] Sender: Message" or "[M/D/YY, h:mm:ss a] System"
const IOS_LINE_REGEX = /^\[([\d]{1,4}[/\.-][\d]{1,2}[/\.-][\d]{1,4},\s*[\d]{1,2}:[\d]{2}(?::[\d]{2})?(?:[\s\u202F\u00A0]*(?:AM|PM|am|pm))?)\]\s*(.*)$/;

// Indicators that strongly signal a system message when there is no sender or in the sender position
const SYSTEM_PREFIXES = [
  'messages and calls are end-to-end encrypted',
  'messages to this chat and calls are now secured with end-to-end encryption',
  'you were added',
  'created group',
  'changed the subject to',
  'changed the group description',
  'changed the group icon',
  'changed this group\'s icon',
  'changed their phone number',
  'security code changed',
  'waiting for this message',
  'disappearing messages',
];

/**
 * Derives a human-friendly chat title from the exported filename
 * Examples:
 *  "WhatsApp Chat with Alice Smith.txt" -> "Alice Smith"
 *  "WhatsApp Chat - Octonote Dev.txt" -> "Octonote Dev"
 *  "chat_export_2024.txt" -> "chat_export_2024"
 */
export function deriveChatNameFromFileName(fileName: string): string {
  const base = fileName.replace(/\.[^/.]+$/, '').trim();
  const withMatch = base.match(/WhatsApp Chat with (.+)$/i);
  if (withMatch && withMatch[1]) {
    return withMatch[1].trim();
  }
  const dashMatch = base.match(/WhatsApp Chat\s*-\s*(.+)$/i);
  if (dashMatch && dashMatch[1]) {
    return dashMatch[1].trim();
  }
  return base || 'WhatsApp Conversation';
}

function containsSystemPrefix(text: string): boolean {
  const lower = text.toLowerCase();
  for (const prefix of SYSTEM_PREFIXES) {
    if (lower.includes(prefix)) {
      return true;
    }
  }
  return false;
}

/**
 * Main streaming line-by-line WhatsApp chat text parser
 */
export function parseWhatsAppText(
  rawText: string,
  options: ParseOptions = {}
): ParseResult {
  const fileName = options.fileName || 'exported_chat.txt';
  const fileSize = options.fileSize || rawText.length;
  const warnings: ParseWarning[] = [];
  const errors: string[] = [];

  if (!rawText || rawText.trim().length === 0) {
    errors.push('The provided WhatsApp export file is empty.');
    return {
      success: false,
      metadata: {
        chatName: deriveChatNameFromFileName(fileName),
        sourceFileName: fileName,
        sourceFileSize: fileSize,
        totalMessages: 0,
        userMessagesCount: 0,
        systemMessagesCount: 0,
        participants: [],
        dateStart: null,
        dateEnd: null,
        detectedDateFormat: 'None',
        warnings,
      },
      messages: [],
      errors,
    };
  }

  // Strip UTF-8 Byte Order Mark (BOM) if present
  let cleanText = rawText;
  if (cleanText.charCodeAt(0) === 0xfeff) {
    cleanText = cleanText.slice(1);
  }

  // Split lines (supporting both \r\n and \n)
  const rawLines = cleanText.split(/\r?\n/);
  const totalLines = rawLines.length;

  // Pass 1: Quick date sampling to detect date order (DMY vs MDY vs YMD)
  const sampledDateStrings: string[] = [];
  const maxSampleLines = Math.min(totalLines, 500);

  for (let i = 0; i < maxSampleLines; i++) {
    const line = sanitizeUnicodeMarkers(rawLines[i]);
    const androidMatch = line.match(ANDROID_LINE_REGEX);
    if (androidMatch) {
      sampledDateStrings.push(androidMatch[1].split(',')[0]);
      continue;
    }
    const iosMatch = line.match(IOS_LINE_REGEX);
    if (iosMatch) {
      sampledDateStrings.push(iosMatch[1].split(',')[0]);
    }
  }

  const detectionResult = detectDateOrder(sampledDateStrings);
  if (detectionResult.isAmbiguous) {
    warnings.push({
      code: 'AMBIGUOUS_DATE_FORMAT',
      message: `${detectionResult.confidenceReason}. Dates normalized using ${detectionResult.order} order.`,
    });
  }

  // Pass 2: Line-by-line parsing with multiline continuation buffering
  const messages: ParsedMessage[] = [];
  const participantsSet = new Set<string>();
  let inferredGroupName: string | null = null;
  let currentMessage: ParsedMessage | null = null;

  for (let lineIndex = 0; lineIndex < totalLines; lineIndex++) {
    const rawLine = rawLines[lineIndex];
    const lineNumber = lineIndex + 1;
    const sanitizedLine = sanitizeUnicodeMarkers(rawLine);

    // Skip empty lines if there's no active message
    if (!sanitizedLine.trim() && !currentMessage) {
      continue;
    }

    // Attempt Android match
    let timestampStr: string | null = null;
    let remainder: string | null = null;

    const androidMatch = sanitizedLine.match(ANDROID_LINE_REGEX);
    if (androidMatch) {
      timestampStr = androidMatch[1];
      remainder = androidMatch[2];
    } else {
      // Attempt iOS match
      const iosMatch = sanitizedLine.match(IOS_LINE_REGEX);
      if (iosMatch) {
        timestampStr = iosMatch[1];
        remainder = iosMatch[2];
      }
    }

    if (timestampStr !== null && remainder !== null) {
      // Found a new message header!
      // Commit previous message if any
      if (currentMessage) {
        messages.push(currentMessage);
        currentMessage = null;
      }

      const parsedTimestamp = parseWhatsAppTimestamp(
        timestampStr,
        detectionResult.order as DateOrder
      );

      if (!parsedTimestamp) {
        warnings.push({
          line: lineNumber,
          code: 'UNPARSEABLE_TIMESTAMP',
          message: `Could not parse date timestamp: "${timestampStr}"`,
        });
        // Treat as continuation line if previous message exists, else skip
        if (messages.length > 0) {
          messages[messages.length - 1].content += '\n' + rawLine;
          messages[messages.length - 1].sourceLineEnd = lineNumber;
        }
        continue;
      }

      // Determine sender and content
      let sender: string | null = null;
      let content = remainder;
      let isSystem = false;

      // In WhatsApp, the sender is separated from message by ": "
      const colonIndex = remainder.indexOf(': ');
      if (colonIndex !== -1) {
        const potentialSender = remainder.slice(0, colonIndex).trim();
        const potentialContent = remainder.slice(colonIndex + 2);

        // Check if the potential sender is actually an encrypted/system notice containing a colon
        if (containsSystemPrefix(potentialSender)) {
          isSystem = true;
          sender = null;
          content = remainder;
        } else {
          sender = potentialSender;
          content = potentialContent;
          isSystem = false;
          participantsSet.add(potentialSender);
        }
      } else {
        // No colon separator -> WhatsApp System notification
        isSystem = true;
        sender = null;
        content = remainder;

        // Try detecting group subject change for chatName
        const subjectMatch = content.match(/changed the subject to "([^"]+)"/i);
        if (subjectMatch && subjectMatch[1]) {
          inferredGroupName = subjectMatch[1].trim();
        }
      }

      currentMessage = {
        id: `msg_${messages.length + 1}`,
        sequenceIndex: messages.length,
        rawTimestamp: timestampStr,
        timestamp: parsedTimestamp.iso,
        date: parsedTimestamp.date,
        sender,
        isSystem,
        content,
        sourceLineStart: lineNumber,
        sourceLineEnd: lineNumber,
      };
    } else {
      // Not a new message start -> Multiline continuation
      if (currentMessage) {
        currentMessage.content += '\n' + rawLine;
        currentMessage.sourceLineEnd = lineNumber;
      } else if (rawLine.trim().length > 0) {
        // Preamble line before first message
        warnings.push({
          line: lineNumber,
          code: 'PREAMBLE_LINE_SKIPPED',
          message: `Line before first recognized timestamp: "${rawLine.slice(0, 80)}"`,
        });
      }
    }
  }

  // Push final in-flight message
  if (currentMessage) {
    messages.push(currentMessage);
  }

  if (messages.length === 0) {
    errors.push('No recognized WhatsApp message timestamps found in the file.');
    return {
      success: false,
      metadata: {
        chatName: deriveChatNameFromFileName(fileName),
        sourceFileName: fileName,
        sourceFileSize: fileSize,
        totalMessages: 0,
        userMessagesCount: 0,
        systemMessagesCount: 0,
        participants: [],
        dateStart: null,
        dateEnd: null,
        detectedDateFormat: detectionResult.order,
        warnings,
      },
      messages: [],
      errors,
    };
  }

  // Calculate metadata statistics
  const userMessagesCount = messages.filter((m) => !m.isSystem).length;
  const systemMessagesCount = messages.length - userMessagesCount;
  const sortedDates = messages.map((m) => m.date.getTime()).sort((a, b) => a - b);
  const dateStart = new Date(sortedDates[0]);
  const dateEnd = new Date(sortedDates[sortedDates.length - 1]);

  const finalChatName = inferredGroupName || deriveChatNameFromFileName(fileName);

  return {
    success: true,
    metadata: {
      chatName: finalChatName,
      sourceFileName: fileName,
      sourceFileSize: fileSize,
      totalMessages: messages.length,
      userMessagesCount,
      systemMessagesCount,
      participants: Array.from(participantsSet).sort(),
      dateStart,
      dateEnd,
      detectedDateFormat: `${detectionResult.order} (${detectionResult.separator})`,
      warnings,
    },
    messages,
    errors,
  };
}
