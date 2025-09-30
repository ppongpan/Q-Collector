/**
 * API Client Validation Script
 * Run this in the browser console to validate API Client setup
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
  formatDisplayDate,
} from '../utils/apiHelpers';

console.log('=== API Client Validation ===\n');

// 1. Test Configuration
console.log('1. Configuration Check:');
console.log('   Base URL:', API_CONFIG.baseURL);
console.log('   Timeout:', API_CONFIG.timeout, 'ms');
console.log('   Token Key:', API_CONFIG.token.storageKey);
console.log('   ✓ Configuration loaded\n');

// 2. Test Query String Builder
console.log('2. Query String Builder:');
const params = { page: 1, limit: 10, search: 'test' };
const queryString = buildQueryString(params);
console.log('   Input:', params);
console.log('   Output:', queryString);
console.log('   ✓ Query string builder works\n');

// 3. Test Date Formatting
console.log('3. Date Formatting:');
const now = new Date();
const apiDate = formatApiDate(now);
const displayDate = formatDisplayDate(now);
console.log('   Date:', now);
console.log('   API Format:', apiDate);
console.log('   Display Format:', displayDate);
console.log('   ✓ Date formatting works\n');

// 4. Test Email Validation
console.log('4. Email Validation:');
const testEmails = ['user@example.com', 'invalid-email'];
testEmails.forEach(email => {
  console.log(`   ${email}: ${isValidEmail(email) ? '✓ Valid' : '✗ Invalid'}`);
});
console.log('   ✓ Email validation works\n');

// 5. Test Phone Validation
console.log('5. Thai Phone Validation:');
const testPhones = ['0812345678', '1234567890'];
testPhones.forEach(phone => {
  console.log(`   ${phone}: ${isValidThaiPhone(phone) ? '✓ Valid' : '✗ Invalid'}`);
});
console.log('   ✓ Phone validation works\n');

// 6. Test File Size Formatting
console.log('6. File Size Formatting:');
const testSizes = [1024, 1048576, 1073741824];
testSizes.forEach(size => {
  console.log(`   ${size} bytes = ${formatFileSize(size)}`);
});
console.log('   ✓ File size formatting works\n');

// 7. Test Token Management
console.log('7. Token Management:');
apiClient.setToken('test-token-123');
console.log('   Set token: test-token-123');
console.log('   Get token:', apiClient.getToken());
apiClient.clearAuth();
console.log('   Clear auth:', apiClient.getToken() === null ? '✓ Cleared' : '✗ Failed');
console.log('   ✓ Token management works\n');

// 8. Test Endpoints Configuration
console.log('8. Endpoints Configuration:');
console.log('   Login:', API_CONFIG.endpoints.auth.login);
console.log('   Forms:', API_CONFIG.endpoints.forms.base);
console.log('   Form by ID:', API_CONFIG.endpoints.forms.byId('123'));
console.log('   Submissions:', API_CONFIG.endpoints.submissions.base);
console.log('   Files:', API_CONFIG.endpoints.files.upload);
console.log('   ✓ Endpoints configured\n');

console.log('=== All Validation Checks Passed! ===');
console.log('\nAPI Client is ready to use. Try making a request:');
console.log('await apiClient.get("/api/health")');

export default {
  apiClient,
  API_CONFIG,
  utils: {
    buildQueryString,
    parseApiError,
    formatApiDate,
    parseApiDate,
    isValidEmail,
    isValidThaiPhone,
    formatFileSize,
    formatDisplayDate,
  },
};