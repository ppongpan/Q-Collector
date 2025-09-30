/**
 * API Helper Utilities
 * Utility functions for API operations
 * @version 0.4.1
 */

/**
 * Build query string from parameters object
 * @param {Object} params - Parameters object
 * @returns {string} Query string
 *
 * @example
 * buildQueryString({ page: 1, limit: 10, search: 'test' })
 * // Returns: "page=1&limit=10&search=test"
 */
export const buildQueryString = (params) => {
  if (!params || typeof params !== 'object') {
    return '';
  }

  const queryParts = [];

  Object.keys(params).forEach((key) => {
    const value = params[key];

    // Skip null, undefined, or empty string values
    if (value === null || value === undefined || value === '') {
      return;
    }

    // Handle arrays
    if (Array.isArray(value)) {
      value.forEach((item) => {
        queryParts.push(
          `${encodeURIComponent(key)}[]=${encodeURIComponent(item)}`
        );
      });
    }
    // Handle objects (convert to JSON)
    else if (typeof value === 'object') {
      queryParts.push(
        `${encodeURIComponent(key)}=${encodeURIComponent(JSON.stringify(value))}`
      );
    }
    // Handle primitives
    else {
      queryParts.push(
        `${encodeURIComponent(key)}=${encodeURIComponent(value)}`
      );
    }
  });

  return queryParts.join('&');
};

/**
 * Parse API error to user-friendly message
 * @param {Error} error - Axios error object
 * @returns {string} User-friendly error message
 */
export const parseApiError = (error) => {
  // Network error
  if (!error.response) {
    if (error.code === 'ECONNABORTED') {
      return 'การเชื่อมต่อหมดเวลา กรุณาลองใหม่อีกครั้ง';
    }
    return 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต';
  }

  const { status, data } = error.response;

  // Server provided error message
  if (data?.message) {
    return data.message;
  }

  // Server provided error array
  if (data?.errors && Array.isArray(data.errors)) {
    return data.errors.map((err) => err.message || err).join(', ');
  }

  // Status code based messages (Thai language)
  const statusMessages = {
    400: 'ข้อมูลที่ส่งมาไม่ถูกต้อง',
    401: 'กรุณาเข้าสู่ระบบใหม่',
    403: 'คุณไม่มีสิทธิ์เข้าถึงข้อมูลนี้',
    404: 'ไม่พบข้อมูลที่ต้องการ',
    409: 'ข้อมูลซ้ำกับที่มีอยู่แล้ว',
    422: 'ข้อมูลไม่ถูกต้องตามรูปแบบที่กำหนด',
    429: 'มีการร้องขอมากเกินไป กรุณารอสักครู่',
    500: 'เกิดข้อผิดพลาดที่เซิร์ฟเวอร์',
    502: 'เซิร์ฟเวอร์ไม่สามารถตอบสนองได้',
    503: 'เซิร์ฟเวอร์ไม่พร้อมให้บริการ',
    504: 'เซิร์ฟเวอร์ตอบสนองช้าเกินไป',
  };

  return statusMessages[status] || 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ';
};

/**
 * Check if error is network-related
 * @param {Error} error - Axios error object
 * @returns {boolean} True if network error
 */
export const isNetworkError = (error) => {
  return !error.response || error.code === 'ECONNABORTED' || error.code === 'ENOTFOUND';
};

/**
 * Check if error is authentication-related
 * @param {Error} error - Axios error object
 * @returns {boolean} True if auth error
 */
export const isAuthError = (error) => {
  return error.response?.status === 401 || error.response?.status === 403;
};

/**
 * Check if error is validation-related
 * @param {Error} error - Axios error object
 * @returns {boolean} True if validation error
 */
export const isValidationError = (error) => {
  return error.response?.status === 400 || error.response?.status === 422;
};

/**
 * Format date for API (ISO 8601 format)
 * @param {Date|string} date - Date to format
 * @returns {string} Formatted date string
 *
 * @example
 * formatApiDate(new Date('2025-01-21'))
 * // Returns: "2025-01-21T00:00:00.000Z"
 */
export const formatApiDate = (date) => {
  if (!date) {
    return null;
  }

  const dateObj = date instanceof Date ? date : new Date(date);

  if (isNaN(dateObj.getTime())) {
    return null;
  }

  return dateObj.toISOString();
};

/**
 * Parse API date response to Date object
 * @param {string} dateString - ISO date string from API
 * @returns {Date|null} Date object or null if invalid
 *
 * @example
 * parseApiDate("2025-01-21T00:00:00.000Z")
 * // Returns: Date object
 */
export const parseApiDate = (dateString) => {
  if (!dateString) {
    return null;
  }

  const date = new Date(dateString);

  if (isNaN(date.getTime())) {
    return null;
  }

  return date;
};

/**
 * Format date for display (Thai format)
 * @param {Date|string} date - Date to format
 * @returns {string} Formatted date string
 *
 * @example
 * formatDisplayDate(new Date('2025-01-21'))
 * // Returns: "21 ม.ค. 2568"
 */
export const formatDisplayDate = (date) => {
  if (!date) {
    return '-';
  }

  const dateObj = date instanceof Date ? date : new Date(date);

  if (isNaN(dateObj.getTime())) {
    return '-';
  }

  const thaiMonths = [
    'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
    'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
  ];

  const day = dateObj.getDate();
  const month = thaiMonths[dateObj.getMonth()];
  const year = dateObj.getFullYear() + 543; // Convert to Buddhist year

  return `${day} ${month} ${year}`;
};

/**
 * Format datetime for display (Thai format with time)
 * @param {Date|string} date - Date to format
 * @returns {string} Formatted datetime string
 *
 * @example
 * formatDisplayDateTime(new Date('2025-01-21T14:30:00'))
 * // Returns: "21 ม.ค. 2568 14:30"
 */
export const formatDisplayDateTime = (date) => {
  if (!date) {
    return '-';
  }

  const dateObj = date instanceof Date ? date : new Date(date);

  if (isNaN(dateObj.getTime())) {
    return '-';
  }

  const dateStr = formatDisplayDate(dateObj);
  const hours = String(dateObj.getHours()).padStart(2, '0');
  const minutes = String(dateObj.getMinutes()).padStart(2, '0');

  return `${dateStr} ${hours}:${minutes}`;
};

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid email
 */
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate Thai phone number format
 * @param {string} phone - Phone number to validate
 * @returns {boolean} True if valid phone
 */
export const isValidThaiPhone = (phone) => {
  const phoneRegex = /^(06|08|09)\d{8}$/;
  return phoneRegex.test(phone.replace(/[-\s]/g, ''));
};

/**
 * Format file size for display
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted file size
 *
 * @example
 * formatFileSize(1024)
 * // Returns: "1 KB"
 */
export const formatFileSize = (bytes) => {
  if (!bytes || bytes === 0) {
    return '0 Bytes';
  }

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

/**
 * Debounce function for API calls
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
export const debounce = (func, wait = 300) => {
  let timeout;

  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };

    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

/**
 * Throttle function for API calls
 * @param {Function} func - Function to throttle
 * @param {number} limit - Time limit in milliseconds
 * @returns {Function} Throttled function
 */
export const throttle = (func, limit = 1000) => {
  let inThrottle;

  return function executedFunction(...args) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
};

/**
 * Sanitize user input for API
 * @param {string} input - User input to sanitize
 * @returns {string} Sanitized input
 */
export const sanitizeInput = (input) => {
  if (typeof input !== 'string') {
    return input;
  }

  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, ''); // Remove event handlers
};

/**
 * Deep clone object (for request body manipulation)
 * @param {Object} obj - Object to clone
 * @returns {Object} Cloned object
 */
export const deepClone = (obj) => {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (obj instanceof Date) {
    return new Date(obj.getTime());
  }

  if (obj instanceof Array) {
    return obj.map((item) => deepClone(item));
  }

  if (obj instanceof Object) {
    const clonedObj = {};
    Object.keys(obj).forEach((key) => {
      clonedObj[key] = deepClone(obj[key]);
    });
    return clonedObj;
  }
};

/**
 * Create form data from object (for file uploads)
 * @param {Object} data - Data object
 * @returns {FormData} FormData object
 */
export const createFormData = (data) => {
  const formData = new FormData();

  Object.keys(data).forEach((key) => {
    const value = data[key];

    if (value instanceof File || value instanceof Blob) {
      formData.append(key, value);
    } else if (Array.isArray(value)) {
      value.forEach((item) => {
        if (item instanceof File || item instanceof Blob) {
          formData.append(key, item);
        } else {
          formData.append(key, JSON.stringify(item));
        }
      });
    } else if (typeof value === 'object' && value !== null) {
      formData.append(key, JSON.stringify(value));
    } else {
      formData.append(key, value);
    }
  });

  return formData;
};

export default {
  buildQueryString,
  parseApiError,
  isNetworkError,
  isAuthError,
  isValidationError,
  formatApiDate,
  parseApiDate,
  formatDisplayDate,
  formatDisplayDateTime,
  isValidEmail,
  isValidThaiPhone,
  formatFileSize,
  debounce,
  throttle,
  sanitizeInput,
  deepClone,
  createFormData,
};