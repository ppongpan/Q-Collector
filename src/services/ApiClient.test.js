/**
 * API Client Tests
 * Basic tests to verify API Client functionality
 * @version 0.4.1
 */

import apiClient from './ApiClient';
import API_CONFIG from '../config/api.config';
import {
  buildQueryString,
  parseApiError,
  formatApiDate,
  parseApiDate,
  isValidEmail,
  isValidThaiPhone,
  formatFileSize,
} from '../utils/apiHelpers';

describe('API Client', () => {
  describe('Configuration', () => {
    it('should have correct base URL', () => {
      expect(API_CONFIG.baseURL).toBeDefined();
      expect(typeof API_CONFIG.baseURL).toBe('string');
    });

    it('should have correct timeout', () => {
      expect(API_CONFIG.timeout).toBe(30000);
    });

    it('should have token configuration', () => {
      expect(API_CONFIG.token.storageKey).toBe('q-collector-auth-token');
      expect(API_CONFIG.token.headerName).toBe('Authorization');
    });
  });

  describe('Token Management', () => {
    beforeEach(() => {
      localStorage.clear();
    });

    it('should store and retrieve token', () => {
      const testToken = 'test-token-123';
      apiClient.setToken(testToken);
      expect(apiClient.getToken()).toBe(testToken);
    });

    it('should store and retrieve refresh token', () => {
      const testRefreshToken = 'test-refresh-token-123';
      apiClient.setRefreshToken(testRefreshToken);
      expect(apiClient.getRefreshToken()).toBe(testRefreshToken);
    });

    it('should clear all tokens', () => {
      apiClient.setToken('test-token');
      apiClient.setRefreshToken('test-refresh-token');
      apiClient.clearAuth();
      expect(apiClient.getToken()).toBeNull();
      expect(apiClient.getRefreshToken()).toBeNull();
    });
  });

  describe('Query String Builder', () => {
    it('should build simple query string', () => {
      const params = { page: 1, limit: 10 };
      const result = buildQueryString(params);
      expect(result).toBe('page=1&limit=10');
    });

    it('should handle arrays', () => {
      const params = { roles: ['admin', 'user'] };
      const result = buildQueryString(params);
      expect(result).toBe('roles%5B%5D=admin&roles%5B%5D=user');
    });

    it('should skip null and undefined values', () => {
      const params = { page: 1, search: null, filter: undefined };
      const result = buildQueryString(params);
      expect(result).toBe('page=1');
    });

    it('should handle empty object', () => {
      const result = buildQueryString({});
      expect(result).toBe('');
    });
  });

  describe('Date Formatting', () => {
    it('should format date to ISO string', () => {
      const date = new Date('2025-01-21T10:30:00.000Z');
      const result = formatApiDate(date);
      expect(result).toBe('2025-01-21T10:30:00.000Z');
    });

    it('should parse ISO date string', () => {
      const dateString = '2025-01-21T10:30:00.000Z';
      const result = parseApiDate(dateString);
      expect(result).toBeInstanceOf(Date);
      expect(result.toISOString()).toBe(dateString);
    });

    it('should handle null dates', () => {
      expect(formatApiDate(null)).toBeNull();
      expect(parseApiDate(null)).toBeNull();
    });

    it('should handle invalid dates', () => {
      expect(formatApiDate('invalid')).toBeNull();
      expect(parseApiDate('invalid')).toBeNull();
    });
  });

  describe('Validation Helpers', () => {
    it('should validate email correctly', () => {
      expect(isValidEmail('user@example.com')).toBe(true);
      expect(isValidEmail('user@domain.co.th')).toBe(true);
      expect(isValidEmail('invalid-email')).toBe(false);
      expect(isValidEmail('user@')).toBe(false);
      expect(isValidEmail('@example.com')).toBe(false);
    });

    it('should validate Thai phone number correctly', () => {
      expect(isValidThaiPhone('0812345678')).toBe(true);
      expect(isValidThaiPhone('0912345678')).toBe(true);
      expect(isValidThaiPhone('0612345678')).toBe(true);
      expect(isValidThaiPhone('08-1234-5678')).toBe(true);
      expect(isValidThaiPhone('08 1234 5678')).toBe(true);
      expect(isValidThaiPhone('1234567890')).toBe(false);
      expect(isValidThaiPhone('012345678')).toBe(false);
    });
  });

  describe('File Size Formatting', () => {
    it('should format bytes correctly', () => {
      expect(formatFileSize(0)).toBe('0 Bytes');
      expect(formatFileSize(1024)).toBe('1 KB');
      expect(formatFileSize(1048576)).toBe('1 MB');
      expect(formatFileSize(1073741824)).toBe('1 GB');
      expect(formatFileSize(1536)).toBe('1.5 KB');
    });
  });

  describe('Error Parsing', () => {
    it('should parse network error', () => {
      const error = { code: 'ECONNABORTED' };
      const message = parseApiError(error);
      expect(message).toContain('หมดเวลา');
    });

    it('should parse 401 error', () => {
      const error = { response: { status: 401 } };
      const message = parseApiError(error);
      expect(message).toContain('เข้าสู่ระบบ');
    });

    it('should parse 404 error', () => {
      const error = { response: { status: 404 } };
      const message = parseApiError(error);
      expect(message).toContain('ไม่พบ');
    });

    it('should parse custom error message', () => {
      const error = {
        response: {
          status: 400,
          data: { message: 'Custom error message' },
        },
      };
      const message = parseApiError(error);
      expect(message).toBe('Custom error message');
    });
  });
});

describe('API Endpoints Configuration', () => {
  it('should have auth endpoints', () => {
    expect(API_CONFIG.endpoints.auth.login).toBe('/api/auth/login');
    expect(API_CONFIG.endpoints.auth.register).toBe('/api/auth/register');
    expect(API_CONFIG.endpoints.auth.logout).toBe('/api/auth/logout');
  });

  it('should have forms endpoints', () => {
    expect(API_CONFIG.endpoints.forms.base).toBe('/api/forms');
    expect(API_CONFIG.endpoints.forms.byId('123')).toBe('/api/forms/123');
    expect(API_CONFIG.endpoints.forms.publish('456')).toBe('/api/forms/456/publish');
  });

  it('should have submissions endpoints', () => {
    expect(API_CONFIG.endpoints.submissions.base).toBe('/api/submissions');
    expect(API_CONFIG.endpoints.submissions.byId('123')).toBe('/api/submissions/123');
    expect(API_CONFIG.endpoints.submissions.byForm('456')).toBe('/api/submissions/form/456');
  });

  it('should have files endpoints', () => {
    expect(API_CONFIG.endpoints.files.upload).toBe('/api/files/upload');
    expect(API_CONFIG.endpoints.files.byId('123')).toBe('/api/files/123');
  });
});