/**
 * PDPA & Privacy Compliance Utility
 * Sanitizes and masks all Personally Identifiable Information (PII) before sending to External LLMs.
 * Complies with Thailand Personal Data Protection Act (PDPA) B.E. 2562.
 */

// Regex for Thai employee IDs (typically 6-8 digits, or ADM/EMP prefix)
const EMPLOYEE_ID_REGEX = /\b(?:[0-9]{6,8}|(?:EMP|ADM|SEC|OFF)-?[0-9]{3,8})\b/gi;

// Regex for Thai Phone numbers
const PHONE_REGEX = /\b(?:0[2-9]\d{1,2}[-\s]?\d{3}[-\s]?\d{4}|0[689]\d[-\s]?\d{3}[-\s]?\d{4})\b/g;

// Regex for Email addresses
const EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;

// Regex for Thai vehicle license plates (e.g., 1กก 1234, กข 5678, 9กฮ 999)
const LICENSE_PLATE_REGEX = /\b(?:\d{1,2}[ก-ฮ]{1,2}|[ก-ฮ]{2})\s*[-]?\s*\d{1,4}\b/g;

// Common Thai name prefixes
const THAI_TITLE_REGEX = /(?:นาย|นาง|นางสาว|จนท\.|รปภ\.|พนักงาน|ผู้ตรวจ|นายร้อย|ส\.ต\.ต\.|ส\.ต\.ท\.)\s*([ก-๙]{2,})\s+([ก-๙]{2,})/g;

// Thai Two-word full name pattern
const THAI_FULLNAME_REGEX = /([ก-๙]{2,})\s+([ก-๙]{2,})/g;

/**
 * Redacts Personally Identifiable Information (PII) from strings or objects.
 */
export function maskPdpaData(input: string): string {
  if (!input || typeof input !== 'string') return '';

  let sanitized = input;

  // 1. Mask Phone Numbers & Emails
  sanitized = sanitized.replace(PHONE_REGEX, '[PHONE_REDACTED]');
  sanitized = sanitized.replace(EMAIL_REGEX, '[EMAIL_REDACTED]');

  // 2. Mask Employee IDs
  sanitized = sanitized.replace(EMPLOYEE_ID_REGEX, 'EMP_[REDACTED]');

  // 3. Mask Thai Titled Names
  sanitized = sanitized.replace(THAI_TITLE_REGEX, '[OFFICER_REDACTED]');

  // 4. Mask Thai License Plates
  sanitized = sanitized.replace(LICENSE_PLATE_REGEX, '[PLATE_REDACTED]');

  return sanitized;
}

/**
 * Recursively masks PII in arbitrary JSON objects or arrays.
 */
export function sanitizeObject<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;

  if (typeof obj === 'string') {
    return maskPdpaData(obj) as unknown as T;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeObject(item)) as unknown as T;
  }

  if (typeof obj === 'object') {
    const sanitizedObj: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      // Sensitive field names explicitly masked
      const lowerKey = key.toLowerCase();
      if (
        lowerKey.includes('inspector') ||
        lowerKey.includes('guardname') ||
        lowerKey.includes('officername') ||
        lowerKey.includes('drivername') ||
        lowerKey.includes('fullname') ||
        lowerKey.includes('reportername')
      ) {
        sanitizedObj[key] = '[OFFICER_REDACTED]';
      } else if (
        lowerKey.includes('employeeid') ||
        lowerKey.includes('inspectrcode') ||
        lowerKey.includes('inspectorcode')
      ) {
        sanitizedObj[key] = 'EMP_[REDACTED]';
      } else if (
        lowerKey.includes('licenseplate') ||
        lowerKey.includes('carlicense')
      ) {
        sanitizedObj[key] = '[PLATE_REDACTED]';
      } else {
        sanitizedObj[key] = sanitizeObject(value);
      }
    }
    return sanitizedObj as T;
  }

  return obj;
}

/**
 * Sanitizes and validates dates to eliminate `(INVALID DATE)` or `Invalid Date` bugs.
 */
export function sanitizeDate(rawDate: any, fallbackDate: Date = new Date()): string {
  if (!rawDate) return fallbackDate.toISOString().split('T')[0];

  const str = String(rawDate).trim();
  if (
    str.toUpperCase().includes('INVALID') ||
    str === 'null' ||
    str === 'undefined' ||
    str === '' ||
    str === 'NaN'
  ) {
    return fallbackDate.toISOString().split('T')[0];
  }

  const d = new Date(rawDate);
  if (isNaN(d.getTime())) {
    return fallbackDate.toISOString().split('T')[0];
  }

  return d.toISOString().split('T')[0];
}

/**
 * Format date nicely in Thai locale with safe error-handling.
 */
export function formatSafeThaiDate(rawDate: any): string {
  if (!rawDate) return 'ยังไม่มีข้อมูลวันที่';

  const str = String(rawDate).trim();
  if (str.toUpperCase().includes('INVALID') || str === 'null' || str === 'undefined') {
    return 'ยังไม่มีข้อมูลวันที่';
  }

  const d = new Date(rawDate);
  if (isNaN(d.getTime())) return 'ยังไม่มีข้อมูลวันที่';

  return d.toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
