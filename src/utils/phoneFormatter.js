/**
 * Phone Number Formatting Utilities
 * Handles Thai phone number formatting and clickable tel: links
 */

/**
 * Clean phone number to digits only
 * @param {string|number} phoneValue - Raw phone number
 * @returns {string} - Digits only
 */
export const cleanPhoneNumber = (phoneValue) => {
  if (!phoneValue) return '';
  return String(phoneValue).replace(/\D/g, '');
};

/**
 * Validate if phone number is valid Thai format
 * @param {string} phoneValue - Phone number to validate
 * @returns {boolean} - Whether phone number is valid
 */
export const isValidThaiPhone = (phoneValue) => {
  const digits = cleanPhoneNumber(phoneValue);

  // Thai mobile numbers: 10 digits starting with 0
  // Examples: 081-234-5678, 062-345-6789, 095-123-4567
  if (digits.length === 10 && digits.startsWith('0')) {
    const prefix = digits.substring(0, 3);
    // Common Thai mobile prefixes
    const validPrefixes = [
      '081', '082', '083', '084', '085', '086', '087', '088', '089',
      '061', '062', '063', '064', '065', '066', '067', '068', '069',
      '090', '091', '092', '093', '094', '095', '096', '097', '098', '099'
    ];
    return validPrefixes.includes(prefix);
  }

  // International format: +66 followed by 9 digits
  if (digits.length === 11 && digits.startsWith('66')) {
    const localPart = '0' + digits.substring(2);
    return isValidThaiPhone(localPart);
  }

  // Also accept any 10-digit number for flexibility
  return digits.length === 10;
};

/**
 * Format phone number for display with Thai pattern
 * @param {string|number} phoneValue - Raw phone number
 * @returns {string} - Formatted phone number (XXX-XXX-XXXX)
 */
export const formatPhoneDisplay = (phoneValue) => {
  if (!phoneValue) return phoneValue;

  const digits = cleanPhoneNumber(phoneValue);

  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
  }

  if (digits.length === 11 && digits.startsWith('66')) {
    // International format: +66 XX-XXX-XXXX
    const localDigits = digits.substring(2);
    return `+66 ${localDigits.slice(0, 2)}-${localDigits.slice(2, 5)}-${localDigits.slice(5, 9)}`;
  }

  // Return original if can't format
  return phoneValue;
};

/**
 * Create tel: link from phone number
 * @param {string|number} phoneValue - Raw phone number
 * @returns {string} - Clean phone number for tel: protocol
 */
export const createTelLink = (phoneValue) => {
  if (!phoneValue) return '';

  const digits = cleanPhoneNumber(phoneValue);

  if (digits.length === 10 && digits.startsWith('0')) {
    // Convert to international format for better compatibility
    return `+66${digits.substring(1)}`;
  }

  if (digits.length === 11 && digits.startsWith('66')) {
    return `+${digits}`;
  }

  // Fallback to original digits with +66 prefix if it looks Thai
  if (digits.length === 10) {
    return `+66${digits.substring(1)}`;
  }

  return digits;
};

/**
 * Determine if a value should be treated as a phone number
 * @param {any} value - Value to check
 * @param {string} fieldType - Field type hint
 * @returns {boolean} - Whether to treat as phone number
 */
export const shouldFormatAsPhone = (value, fieldType) => {
  if (fieldType === 'phone') return true;

  if (!value) return false;

  const digits = cleanPhoneNumber(value);

  // Auto-detect phone numbers
  return (
    (digits.length === 10 && digits.startsWith('0')) ||
    (digits.length === 11 && digits.startsWith('66')) ||
    (digits.length === 9 && /^[1-9]/.test(digits)) // 9 digits without leading 0
  );
};

/**
 * Get phone icon SVG properties
 * @returns {object} - SVG phone icon properties
 */
export const getPhoneIconProps = () => ({
  className: "w-3 h-3 text-primary flex-shrink-0",
  fill: "none",
  stroke: "currentColor",
  viewBox: "0 0 24 24",
  "aria-hidden": "true",
  path: "M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21L8.027 10.71a11.486 11.486 0 006.262 6.262l1.323-2.197a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
});

/**
 * Create complete phone link component properties
 * @param {string|number} phoneValue - Raw phone number
 * @param {object} options - Formatting options
 * @returns {object} - Phone link properties
 */
export const createPhoneLink = (phoneValue, options = {}) => {
  const {
    includeIcon = true,
    className = '',
    size = 'sm',
    showTooltip = true
  } = options;

  if (!phoneValue) {
    return {
      display: '-',
      isClickable: false
    };
  }

  const displayText = formatPhoneDisplay(phoneValue);
  const telLink = createTelLink(phoneValue);
  const isValid = isValidThaiPhone(phoneValue);

  const sizeClasses = {
    xs: 'text-[11px]',
    sm: 'text-[12px]',
    md: 'text-sm',
    lg: 'text-base'
  };

  const baseClasses = `
    ${sizeClasses[size] || sizeClasses.sm}
    text-primary hover:text-primary/80 hover:underline
    transition-all duration-200 cursor-pointer font-medium
    touch-manipulation focus:outline-none focus:ring-2
    focus:ring-primary/50 focus:ring-offset-1 rounded-sm
    underline decoration-primary/30 hover:decoration-primary
    ${className}
  `;

  return {
    display: displayText,
    telLink: `tel:${telLink}`,
    isClickable: isValid,
    className: baseClasses,
    title: showTooltip ? `แตะเพื่อโทรออก: ${displayText}` : displayText,
    ariaLabel: `โทรหา ${displayText}`,
    iconProps: includeIcon ? getPhoneIconProps() : null,
    originalValue: phoneValue
  };
};