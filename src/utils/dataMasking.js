/**
 * Data Masking Utilities
 *
 * Provides functions to mask sensitive personal information
 * such as phone numbers and email addresses for privacy protection.
 *
 * Features:
 * - Phone masking: 091-291-1234 → 091-29x-xxxx
 * - Email masking: example@domain.com → exa***@domain.com
 * - Supports Thai phone formats (10 digits)
 * - Preserves domain for email visibility
 */

/**
 * Mask a phone number
 * Shows first 6 digits, masks remaining 4 digits
 *
 * @param {string} phone - Phone number to mask
 * @returns {string} Masked phone number
 *
 * Examples:
 * - "0912911234" → "091-29x-xxxx"
 * - "091-291-1234" → "091-29x-xxxx"
 * - "091 291 1234" → "091-29x-xxxx"
 */
export function maskPhone(phone) {
  if (!phone) return '';

  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');

  // Must be 10 digits for Thai phone numbers
  if (digits.length !== 10) return phone;

  // Extract first 6 digits and mask last 4
  const prefix = digits.substring(0, 5); // 091-29
  const masked = 'x-xxxx';

  return `${prefix.substring(0, 3)}-${prefix.substring(3)}${masked}`;
}

/**
 * Mask an email address
 * Shows first 3 characters of local part, masks middle, shows domain
 *
 * @param {string} email - Email address to mask
 * @returns {string} Masked email address
 *
 * Examples:
 * - "example@domain.com" → "exa***@domain.com"
 * - "test@gmail.com" → "tes***@gmail.com"
 * - "a@b.com" → "a***@b.com"
 */
export function maskEmail(email) {
  if (!email || !email.includes('@')) return email;

  const [localPart, domain] = email.split('@');

  // Show first 3 characters (or less if shorter)
  const visibleChars = Math.min(3, localPart.length);
  const prefix = localPart.substring(0, visibleChars);

  return `${prefix}***@${domain}`;
}

/**
 * Detect field type based on field title or type
 *
 * @param {string} fieldTitle - Field title
 * @param {string} fieldType - Field type
 * @returns {'phone'|'email'|null} Detected sensitive field type
 */
export function detectSensitiveFieldType(fieldTitle, fieldType) {
  if (!fieldTitle && !fieldType) return null;

  const title = (fieldTitle || '').toLowerCase();
  const type = (fieldType || '').toLowerCase();

  // Email detection
  if (type === 'email' || title.includes('email') || title.includes('อีเมล') || title.includes('อีเมล์')) {
    return 'email';
  }

  // Phone detection
  if (
    type === 'phone' ||
    title.includes('phone') ||
    title.includes('tel') ||
    title.includes('เบอร์') ||
    title.includes('โทร') ||
    title.includes('มือถือ')
  ) {
    return 'phone';
  }

  return null;
}

/**
 * Mask a value based on field type
 *
 * @param {string} value - Value to mask
 * @param {string} fieldTitle - Field title
 * @param {string} fieldType - Field type
 * @returns {string} Masked value
 */
export function maskValue(value, fieldTitle, fieldType) {
  if (!value) return '';

  const sensitiveType = detectSensitiveFieldType(fieldTitle, fieldType);

  switch (sensitiveType) {
    case 'phone':
      return maskPhone(value);
    case 'email':
      return maskEmail(value);
    default:
      return value;
  }
}

/**
 * Check if a field should be masked
 *
 * @param {string} fieldTitle - Field title
 * @param {string} fieldType - Field type
 * @returns {boolean} True if field should be masked
 */
export function shouldMaskField(fieldTitle, fieldType) {
  return detectSensitiveFieldType(fieldTitle, fieldType) !== null;
}
