/**
 * WhatsApp date parsing and format detection utilities
 */

export type DateOrder = 'DMY' | 'MDY' | 'YMD';

export interface ParsedDateComponents {
  year: number;
  month: number; // 1-12
  day: number; // 1-31
  hours: number; // 0-23
  minutes: number; // 0-59
  seconds: number; // 0-59
}

export interface DateDetectionResult {
  order: DateOrder;
  separator: string;
  isAmbiguous: boolean;
  confidenceReason: string;
}

// Cleans invisible Unicode directional marks (often inserted by WhatsApp iOS)
export function sanitizeUnicodeMarkers(str: string): string {
  // \u200E (LTR), \u200F (RTL), \u202A-\u202E (embeddings/overrides), \u202F (narrow no-break space), \u00A0 (no-break space)
  return str
    .replace(/[\u200E\u200F\u202A-\u202E]/g, '')
    .replace(/[\u202F\u00A0]/g, ' ')
    .trim();
}

/**
 * Scans timestamp strings from the conversation to identify whether dates follow
 * DMY (Day/Month/Year), MDY (Month/Day/Year), or YMD (Year/Month/Day).
 */
export function detectDateOrder(rawDateStrings: string[]): DateDetectionResult {
  let sawDayGreaterThan12InPart1 = false;
  let sawDayGreaterThan12InPart2 = false;
  let sawYearFirst = false;
  let separator = '/';

  for (const raw of rawDateStrings) {
    const cleaned = sanitizeUnicodeMarkers(raw);
    // Find separator: '/', '.', or '-'
    const sepMatch = cleaned.match(/[/\.-]/);
    if (sepMatch) {
      separator = sepMatch[0];
    }

    const parts = cleaned.split(/[/\.-]/).map((p) => parseInt(p.trim(), 10));
    if (parts.length >= 3 && !parts.some(isNaN)) {
      const [p1, p2] = parts;

      if (p1 > 31 || (p1 > 1900 && p1 < 2100)) {
        sawYearFirst = true;
        break; // YMD is unambiguous
      }

      if (p1 > 12 && p1 <= 31) {
        sawDayGreaterThan12InPart1 = true;
      }
      if (p2 > 12 && p2 <= 31) {
        sawDayGreaterThan12InPart2 = true;
      }

      // If we found conclusive proof, no need to check further
      if (sawDayGreaterThan12InPart1 || sawDayGreaterThan12InPart2) {
        break;
      }
    }
  }

  if (sawYearFirst) {
    return {
      order: 'YMD',
      separator,
      isAmbiguous: false,
      confidenceReason: 'Year component positioned first (YYYY-MM-DD or YYYY/MM/DD)',
    };
  }

  if (sawDayGreaterThan12InPart1) {
    return {
      order: 'DMY',
      separator,
      isAmbiguous: false,
      confidenceReason: 'Detected day value greater than 12 in first position (DD/MM/YYYY)',
    };
  }

  if (sawDayGreaterThan12InPart2) {
    return {
      order: 'MDY',
      separator,
      isAmbiguous: false,
      confidenceReason: 'Detected day value greater than 12 in second position (MM/DD/YYYY)',
    };
  }

  // Ambiguous: all observed dates have parts <= 12
  if (separator === '.') {
    return {
      order: 'DMY',
      separator: '.',
      isAmbiguous: true,
      confidenceReason: 'Dot separator standard in European/German formats; inferred DD.MM.YYYY',
    };
  }

  // Conservative worldwide WhatsApp standard fallback: DMY (DD/MM/YYYY)
  return {
    order: 'DMY',
    separator,
    isAmbiguous: true,
    confidenceReason: 'Ambiguous dates (all day numbers <= 12); inferred standard DD/MM/YYYY',
  };
}

/**
 * Parses a raw timestamp string into normalized Date and ISO string.
 * Example inputs:
 *  "15/01/2024, 10:30"
 *  "1/15/24, 10:30:15 AM"
 *  "2024-01-15, 14:30"
 *  "[15/01/2024, 10:30:15]"
 */
export function parseWhatsAppTimestamp(
  rawTimestamp: string,
  preferredOrder: DateOrder = 'DMY'
): { date: Date; iso: string } | null {
  const sanitized = sanitizeUnicodeMarkers(rawTimestamp)
    .replace(/^\[/, '')
    .replace(/\]$/, '')
    .trim();

  // Split into date section and time section:
  // e.g. "15/01/2024, 10:30:15 AM" -> datePart="15/01/2024", timePart="10:30:15 AM"
  // Some exports use comma, some use hyphen, or space
  const parts = sanitized.split(/,\s+|\s+-\s+|\s+/);
  if (parts.length < 2) {
    return null;
  }

  const datePart = parts[0];
  // Recombine remaining parts for time (which may include "10:30" and "AM")
  const timePart = parts.slice(1).join(' ').trim();

  // 1. Parse Date section
  const dateComponents = datePart.split(/[/\.-]/).map((p) => parseInt(p.trim(), 10));
  if (dateComponents.length !== 3 || dateComponents.some(isNaN)) {
    return null;
  }

  let year: number;
  let month: number;
  let day: number;

  const [c1, c2, c3] = dateComponents;

  if (c1 > 31 || c1 > 1000) {
    // YMD
    year = c1;
    month = c2;
    day = c3;
  } else if (c3 > 1000 || c3 < 100) {
    // 2-digit or 4-digit year at the end
    year = c3 < 100 ? (c3 < 70 ? 2000 + c3 : 1900 + c3) : c3;

    if (preferredOrder === 'MDY') {
      month = c1;
      day = c2;
    } else {
      // Default DMY
      day = c1;
      month = c2;
    }
  } else {
    // Unclear year position fallback
    year = c3 < 100 ? 2000 + c3 : c3;
    day = c1;
    month = c2;
  }

  // Validate date calendar ranges
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }

  // 2. Parse Time section
  // e.g. "10:30", "10:30:45", "10:30 AM", "10:30:15 pm", "14:30"
  const timeMatch = timePart.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\s*(AM|PM|am|pm))?/i);
  if (!timeMatch) {
    return null;
  }

  let hours = parseInt(timeMatch[1], 10);
  const minutes = parseInt(timeMatch[2], 10);
  const seconds = timeMatch[3] ? parseInt(timeMatch[3], 10) : 0;
  const meridian = timeMatch[4] ? timeMatch[4].toUpperCase() : null;

  if (meridian === 'PM' && hours < 12) {
    hours += 12;
  } else if (meridian === 'AM' && hours === 12) {
    hours = 0;
  }

  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59 || seconds < 0 || seconds > 59) {
    return null;
  }

  // Construct Date object safely
  // Note: We use local time construction to preserve user's exported timezone representation
  const dateObj = new Date(year, month - 1, day, hours, minutes, seconds);
  if (isNaN(dateObj.getTime())) {
    return null;
  }

  return {
    date: dateObj,
    iso: dateObj.toISOString(),
  };
}
