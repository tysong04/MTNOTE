import { describe, it, expect } from 'vitest';
import { zipSync, strToU8 } from 'fflate';
import {
  extractWhatsAppZip,
  isPathTraversalAttempt,
} from './zip-handler';

describe('ZIP Handler & Security Guard', () => {
  it('detects directory traversal and malicious paths', () => {
    expect(isPathTraversalAttempt('../evil.txt')).toBe(true);
    expect(isPathTraversalAttempt('..\\evil.txt')).toBe(true);
    expect(isPathTraversalAttempt('sub/../../evil.txt')).toBe(true);
    expect(isPathTraversalAttempt('/etc/passwd')).toBe(true);
    expect(isPathTraversalAttempt('\\windows\\system32')).toBe(true);
    expect(isPathTraversalAttempt('C:\\boot.ini')).toBe(true);
    expect(isPathTraversalAttempt('legit_file\0.txt')).toBe(true);
    expect(isPathTraversalAttempt('')).toBe(true);

    expect(isPathTraversalAttempt('WhatsApp Chat.txt')).toBe(false);
    expect(isPathTraversalAttempt('exports/chat_2024.txt')).toBe(false);
  });

  it('extracts valid WhatsApp .txt file from a ZIP archive in memory', async () => {
    const chatContent = '15/01/2024, 10:00 - Alice: Hello from inside ZIP!';
    const zipBytes = zipSync({
      '_chat.txt': strToU8(chatContent),
    });

    const entries = await extractWhatsAppZip(zipBytes);
    expect(entries.length).toBe(1);
    expect(entries[0].name).toBe('_chat.txt');
    expect(entries[0].content).toBe(chatContent);
  });

  it('filters out non-txt attachments and only extracts .txt files', async () => {
    const chatContent = '15/01/2024, 10:00 - Alice: Photo shared';
    const zipBytes = zipSync({
      'chat.txt': strToU8(chatContent),
      'IMG-20240115-WA0001.jpg': strToU8('fake_image_bytes_here'),
      'audio.opus': strToU8('fake_audio_bytes'),
    });

    const entries = await extractWhatsAppZip(zipBytes);
    expect(entries.length).toBe(1);
    expect(entries[0].name).toBe('chat.txt');
    expect(entries[0].content).toBe(chatContent);
  });

  it('supports ZIP archives containing multiple .txt files', async () => {
    const zipBytes = zipSync({
      'chat1.txt': strToU8('15/01/2024, 10:00 - Alice: Chat 1'),
      'chat2.txt': strToU8('15/01/2024, 10:00 - Bob: Chat 2'),
    });

    const entries = await extractWhatsAppZip(zipBytes);
    expect(entries.length).toBe(2);
    const names = entries.map((e) => e.name);
    expect(names).toContain('chat1.txt');
    expect(names).toContain('chat2.txt');
  });

  it('rejects ZIP archives with path traversal attempts', async () => {
    const zipBytes = zipSync({
      '../outside.txt': strToU8('malicious content'),
    });

    await expect(extractWhatsAppZip(zipBytes)).rejects.toThrow(
      /Security violation in ZIP: Traversal or absolute path detected/i
    );
  });

  it('rejects empty ZIP archives (0 bytes)', async () => {
    const emptyBytes = new Uint8Array(0);
    await expect(extractWhatsAppZip(emptyBytes)).rejects.toThrow(
      /uploaded ZIP archive is empty/i
    );
  });

  it('rejects archives containing no .txt files', async () => {
    const zipBytes = zipSync({
      'image.jpg': strToU8('binary data'),
      'notes.pdf': strToU8('binary pdf data'),
    });

    await expect(extractWhatsAppZip(zipBytes)).rejects.toThrow(
      /No exported WhatsApp \.txt chat files were found/i
    );
  });

  it('rejects files exceeding compressed size limit', async () => {
    const zipBytes = zipSync({
      'chat.txt': strToU8('content'),
    });

    // Enforce tiny limit of 5 bytes
    await expect(
      extractWhatsAppZip(zipBytes, { maxCompressedSize: 5 })
    ).rejects.toThrow(/exceeds maximum allowed size/i);
  });

  it('rejects zip bombs with excessive compression ratios', async () => {
    // Generate a repetitive string that compresses heavily
    const repeated = 'A'.repeat(50000);
    const zipBytes = zipSync({
      'bomb.txt': strToU8(repeated),
    });

    // Enforce an artificially low compression ratio limit to verify protection
    await expect(
      extractWhatsAppZip(zipBytes, { maxCompressionRatio: 5 })
    ).rejects.toThrow(/Zip bomb protection: compression ratio/i);
  });

  it('rejects archives that exceed the maximum allowed entry count', async () => {
    const files: Record<string, Uint8Array> = {};
    for (let i = 0; i < 10; i++) {
      files[`file_${i}.txt`] = strToU8(`Content ${i}`);
    }
    const zipBytes = zipSync(files);

    // Limit to max 5 entries
    await expect(
      extractWhatsAppZip(zipBytes, { maxEntries: 5 })
    ).rejects.toThrow(/exceeding safety threshold/i);
  });
});
