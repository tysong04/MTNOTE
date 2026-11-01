import { unzip, strFromU8 } from 'fflate';
import { ZipValidationLimits, UnzippedChatFile } from './types';

export const DEFAULT_ZIP_LIMITS: ZipValidationLimits = {
  maxCompressedSize: 30 * 1024 * 1024, // 30 MB compressed limit
  maxUncompressedSize: 50 * 1024 * 1024, // 50 MB per file limit
  maxTotalUncompressedSize: 100 * 1024 * 1024, // 100 MB total uncompressed limit
  maxCompressionRatio: 100, // 100:1 maximum compression ratio
  maxEntries: 100, // Maximum archive entries allowed
};

/**
 * Checks whether an entry name contains directory traversal or forbidden characters
 */
export function isPathTraversalAttempt(entryName: string): boolean {
  if (!entryName) return true;

  // Normalized path check for ../ or ..\
  if (entryName.includes('../') || entryName.includes('..\\') || entryName.includes('/../') || entryName.includes('\\..\\')) {
    return true;
  }

  // Absolute path checks
  if (entryName.startsWith('/') || entryName.startsWith('\\')) {
    return true;
  }

  // Windows drive letter checks e.g. "C:\" or "C:/"
  if (/^[a-zA-Z]:[/\\]/.test(entryName)) {
    return true;
  }

  // Null byte injection check
  if (entryName.includes('\0')) {
    return true;
  }

  return false;
}

/**
 * Safely validates and decompresses WhatsApp chat .txt files from a ZIP archive in memory
 */
export async function extractWhatsAppZip(
  zipBytes: Uint8Array,
  customLimits: Partial<ZipValidationLimits> = {}
): Promise<UnzippedChatFile[]> {
  const limits: ZipValidationLimits = { ...DEFAULT_ZIP_LIMITS, ...customLimits };

  // 1. Validate raw archive compressed byte length
  if (zipBytes.length === 0) {
    throw new Error('The uploaded ZIP archive is empty (0 bytes).');
  }

  if (zipBytes.length > limits.maxCompressedSize) {
    const sizeMb = (zipBytes.length / (1024 * 1024)).toFixed(1);
    const limitMb = (limits.maxCompressedSize / (1024 * 1024)).toFixed(1);
    throw new Error(
      `ZIP file size (${sizeMb} MB) exceeds maximum allowed size of ${limitMb} MB.`
    );
  }

  return new Promise((resolve, reject) => {
    let entryCount = 0;
    let totalUncompressedSize = 0;
    let securityViolation: string | null = null;
    let bombDetected: string | null = null;

    unzip(
      zipBytes,
      {
        filter(file) {
          entryCount++;

          // Limit entry count to prevent resource exhaustion
          if (entryCount > limits.maxEntries) {
            securityViolation = `ZIP archive contains more than ${limits.maxEntries} entries, exceeding safety threshold.`;
            return false;
          }

          // Check for path traversal / Zip Slip
          if (isPathTraversalAttempt(file.name)) {
            securityViolation = `Security violation in ZIP: Traversal or absolute path detected in entry "${file.name}".`;
            return false;
          }

          // Only extract .txt files (WhatsApp conversation text exports)
          // Silently skip non-txt attachments (photos, videos, audio, etc.)
          const isTxt = /\.txt$/i.test(file.name);
          if (!isTxt) {
            return false;
          }

          // Check single file uncompressed size
          if (file.originalSize > limits.maxUncompressedSize) {
            const fileMb = (file.originalSize / (1024 * 1024)).toFixed(1);
            const maxMb = (limits.maxUncompressedSize / (1024 * 1024)).toFixed(1);
            bombDetected = `Uncompressed size of "${file.name}" (${fileMb} MB) exceeds limit of ${maxMb} MB.`;
            return false;
          }

          // Check compression ratio (Zip bomb guard)
          if (file.size > 0 && file.originalSize / file.size > limits.maxCompressionRatio) {
            const ratio = (file.originalSize / file.size).toFixed(1);
            bombDetected = `Zip bomb protection: compression ratio for "${file.name}" (${ratio}:1) exceeds safety limit of ${limits.maxCompressionRatio}:1.`;
            return false;
          }

          // Track cumulative uncompressed size
          totalUncompressedSize += file.originalSize;
          if (totalUncompressedSize > limits.maxTotalUncompressedSize) {
            const totalMb = (totalUncompressedSize / (1024 * 1024)).toFixed(1);
            const maxTotalMb = (limits.maxTotalUncompressedSize / (1024 * 1024)).toFixed(1);
            bombDetected = `Total uncompressed size (${totalMb} MB) exceeds safety threshold of ${maxTotalMb} MB.`;
            return false;
          }

          return true;
        },
      },
      (err, unzipped) => {
        if (err) {
          reject(new Error(`Failed to decompress ZIP archive: ${err.message || 'Corrupt or malformed archive format.'}`));
          return;
        }

        if (securityViolation) {
          reject(new Error(securityViolation));
          return;
        }

        if (bombDetected) {
          reject(new Error(bombDetected));
          return;
        }

        const entries: UnzippedChatFile[] = [];

        for (const [name, data] of Object.entries(unzipped)) {
          if (/\.txt$/i.test(name)) {
            try {
              const textContent = strFromU8(data);
              entries.push({
                name,
                content: textContent,
                size: data.length,
              });
            } catch (decodeErr) {
              reject(new Error(`Failed to decode text in "${name}" using UTF-8: ${String(decodeErr)}`));
              return;
            }
          }
        }

        if (entries.length === 0) {
          reject(
            new Error(
              'No exported WhatsApp .txt chat files were found in this ZIP archive. Note that media-only archives without conversation logs are not supported.'
            )
          );
          return;
        }

        resolve(entries);
      }
    );
  });
}
