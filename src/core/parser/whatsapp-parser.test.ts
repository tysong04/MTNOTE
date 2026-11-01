import { describe, it, expect } from 'vitest';
import { parseWhatsAppText, deriveChatNameFromFileName } from './whatsapp-parser';

describe('WhatsApp Text Parser', () => {
  it('correctly derives chat title from filenames', () => {
    expect(deriveChatNameFromFileName('WhatsApp Chat with Alice Smith.txt')).toBe('Alice Smith');
    expect(deriveChatNameFromFileName('WhatsApp Chat - Octonote Core.txt')).toBe('Octonote Core');
    expect(deriveChatNameFromFileName('family_group.txt')).toBe('family_group');
    expect(deriveChatNameFromFileName('')).toBe('WhatsApp Conversation');
  });

  it('parses standard Android 24-hour format with single and multiline messages', () => {
    const raw = `15/01/2024, 10:30 - Messages and calls are end-to-end encrypted. No one outside of this chat, not even WhatsApp, can read or listen to them.
15/01/2024, 10:31 - Alice: Hello everyone! Welcome to the Octonote development group.
15/01/2024, 10:32 - Bob: Thanks Alice!
Here is the initial requirements outline:
1. Local-first parser
2. Safe ZIP handling
3. Fast search
Please let me know your thoughts.
15/01/2024, 10:35 - Alice: Looking great. Let's proceed.`;

    const result = parseWhatsAppText(raw, { fileName: 'WhatsApp Chat with Project.txt' });

    expect(result.success).toBe(true);
    expect(result.errors.length).toBe(0);
    expect(result.metadata.totalMessages).toBe(4);
    expect(result.metadata.systemMessagesCount).toBe(1);
    expect(result.metadata.userMessagesCount).toBe(3);
    expect(result.metadata.participants).toEqual(['Alice', 'Bob']);

    // Check system message
    expect(result.messages[0].isSystem).toBe(true);
    expect(result.messages[0].sender).toBeNull();
    expect(result.messages[0].content).toContain('end-to-end encrypted');

    // Check single-line message
    expect(result.messages[1].sender).toBe('Alice');
    expect(result.messages[1].content).toBe('Hello everyone! Welcome to the Octonote development group.');
    expect(result.messages[1].sourceLineStart).toBe(2);
    expect(result.messages[1].sourceLineEnd).toBe(2);

    // Check multiline message
    expect(result.messages[2].sender).toBe('Bob');
    expect(result.messages[2].content).toContain('Thanks Alice!\nHere is the initial requirements outline:');
    expect(result.messages[2].content).toContain('Please let me know your thoughts.');
    expect(result.messages[2].sourceLineStart).toBe(3);
    expect(result.messages[2].sourceLineEnd).toBe(8);

    // Check preservation of message order
    expect(result.messages[3].sender).toBe('Alice');
    expect(result.messages[3].content).toBe("Looking great. Let's proceed.");
  });

  it('parses iOS bracketed timestamp format with 12-hour AM/PM and seconds', () => {
    const raw = `[15/01/24, 10:30:15 AM] Alice: Good morning!
[15/01/24, 10:31:00 AM] Dr. John [Lead Architect] 💻: Morning Alice. Check this doc: https://example.com/spec.pdf
[15/01/24, 02:45:20 PM] Alice: Reviewed and approved.
[15/01/24, 02:46:00 PM] Alice changed the subject to "Octonote 2.0"`;

    const result = parseWhatsAppText(raw, { fileName: 'ios_export.txt' });

    expect(result.success).toBe(true);
    expect(result.metadata.totalMessages).toBe(4);
    expect(result.metadata.participants).toEqual(['Alice', 'Dr. John [Lead Architect] 💻']);
    expect(result.metadata.chatName).toBe('Octonote 2.0'); // Inferred from subject change

    // PM conversion verification: 2:45 PM -> hour 14
    expect(result.messages[2].date.getHours()).toBe(14);
    expect(result.messages[2].date.getMinutes()).toBe(45);

    // Check sender with spaces, brackets, emoji
    expect(result.messages[1].sender).toBe('Dr. John [Lead Architect] 💻');
    expect(result.messages[1].content).toBe('Morning Alice. Check this doc: https://example.com/spec.pdf');

    // Check iOS system message
    expect(result.messages[3].isSystem).toBe(true);
    expect(result.messages[3].content).toContain('changed the subject to "Octonote 2.0"');
  });

  it('handles Unicode, emojis, non-Latin alphabets and narrow no-break spaces', () => {
    // \u202F is narrow no-break space often used by WhatsApp before AM/PM
    const raw = `15/01/2024, 9:00\u202Fpm - Priya: नमस्ते! यहाँ लिंक देखें: https://example.org/test?q=hello&lang=hi
15/01/2024, 9:05\u202Fpm - 👨‍💻 Alex 🚀: Awesome! 🎉✨ Here are some Japanese characters: こんにちは
15/01/2024, 9:10\u202Fpm - Elena: Привет! Отличная работа.`;

    const result = parseWhatsAppText(raw);

    expect(result.success).toBe(true);
    expect(result.metadata.totalMessages).toBe(3);
    expect(result.metadata.participants).toContain('Priya');
    expect(result.metadata.participants).toContain('👨‍💻 Alex 🚀');
    expect(result.metadata.participants).toContain('Elena');
    expect(result.messages[0].content).toContain('नमस्ते!');
    expect(result.messages[1].content).toContain('こんにちは');
    expect(result.messages[2].content).toContain('Привет!');
  });

  it('handles UTF-8 Byte Order Mark (BOM) cleanly', () => {
    const rawWithBOM = '\uFEFF15/01/2024, 10:00 - Alice: Message after BOM';
    const result = parseWhatsAppText(rawWithBOM);

    expect(result.success).toBe(true);
    expect(result.messages.length).toBe(1);
    expect(result.messages[0].sender).toBe('Alice');
    expect(result.messages[0].content).toBe('Message after BOM');
  });

  it('detects and handles ambiguous dates conservatively with warnings', () => {
    // Both day and month <= 12
    const raw = `04/05/2024, 10:00 - Alice: Is this May 4th or April 5th?
04/05/2024, 10:01 - Bob: Ambiguous date format test.`;

    const result = parseWhatsAppText(raw);

    expect(result.success).toBe(true);
    expect(result.metadata.warnings.some((w) => w.code === 'AMBIGUOUS_DATE_FORMAT')).toBe(true);
    expect(result.metadata.detectedDateFormat).toContain('DMY');
  });

  it('handles messages containing colons, commas and brackets inside the message body', () => {
    const raw = `15/01/2024, 10:00 - Alice: Meeting at 10:30: please bring notes, (drafts), and ideas: [urgent]!
15/01/2024, 10:05 - Bob: Roger that: will do.`;

    const result = parseWhatsAppText(raw);

    expect(result.success).toBe(true);
    expect(result.messages[0].sender).toBe('Alice');
    expect(result.messages[0].content).toBe('Meeting at 10:30: please bring notes, (drafts), and ideas: [urgent]!');
    expect(result.messages[1].sender).toBe('Bob');
    expect(result.messages[1].content).toBe('Roger that: will do.');
  });

  it('handles media omission and deleted message notices as normal content', () => {
    const raw = `15/01/2024, 10:00 - Alice: <Media omitted>
15/01/2024, 10:01 - Bob: This message was deleted
15/01/2024, 10:02 - Charlie: You deleted this message`;

    const result = parseWhatsAppText(raw);

    expect(result.success).toBe(true);
    expect(result.messages.length).toBe(3);
    expect(result.messages[0].content).toBe('<Media omitted>');
    expect(result.messages[1].content).toBe('This message was deleted');
  });

  it('returns appropriate error for empty files', () => {
    const result = parseWhatsAppText('   \n  \n');

    expect(result.success).toBe(false);
    expect(result.errors).toContain('The provided WhatsApp export file is empty.');
    expect(result.messages.length).toBe(0);
  });

  it('returns error when text has no recognized message timestamps', () => {
    const result = parseWhatsAppText('This is just a random text file.\nNo whatsapp timestamps here.\nAnother line.');

    expect(result.success).toBe(false);
    expect(result.errors).toContain('No recognized WhatsApp message timestamps found in the file.');
  });

  it('handles skipped preambles without discarding following messages', () => {
    const raw = `Exported from WhatsApp
Additional header info
15/01/2024, 10:00 - Alice: Real first message`;

    const result = parseWhatsAppText(raw);

    expect(result.success).toBe(true);
    expect(result.messages.length).toBe(1);
    expect(result.messages[0].sender).toBe('Alice');
    expect(result.metadata.warnings.some((w) => w.code === 'PREAMBLE_LINE_SKIPPED')).toBe(true);
  });
});
