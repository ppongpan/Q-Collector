/**
 * Token Manager - JWT Token Management Utilities
 *
 * Handles:
 * - Token storage/retrieval
 * - Token validation
 * - JWT parsing
 * - Token expiration checking
 *
 * CRITICAL: Uses same storage keys as API_CONFIG to prevent token mismatch
 */

// ✅ FIX: Use same keys as API_CONFIG (api.config.js)
// This prevents the bug where tokens are saved but ApiClient can't find them
const ACCESS_TOKEN_KEY = 'q-collector-auth-token';
const REFRESH_TOKEN_KEY = 'q-collector-refresh-token';
const USER_KEY = 'user';

/**
 * Store access token in localStorage
 * @param {string} token - JWT access token
 */
export function setAccessToken(token) {
  if (token) {
    localStorage.setItem(ACCESS_TOKEN_KEY, token);
  } else {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
  }
}

/**
 * Get access token from localStorage
 * @returns {string|null}
 */
export function getAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

/**
 * Store refresh token in localStorage
 * @param {string} token - JWT refresh token
 */
export function setRefreshToken(token) {
  if (token) {
    localStorage.setItem(REFRESH_TOKEN_KEY, token);
  } else {
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  }
}

/**
 * Get refresh token from localStorage
 * @returns {string|null}
 */
export function getRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

/**
 * Store both access and refresh tokens
 * @param {string} accessToken - JWT access token
 * @param {string} refreshToken - JWT refresh token
 */
export function setTokens(accessToken, refreshToken) {
  setAccessToken(accessToken);
  setRefreshToken(refreshToken);
}

/**
 * Clear all tokens and user data
 */
export function clearTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

/**
 * Store user data in localStorage
 * @param {Object} user - User data
 */
export function setUser(user) {
  if (user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(USER_KEY);
  }
}

/**
 * Get user data from localStorage
 * @returns {Object|null}
 */
export function getUser() {
  const userStr = localStorage.getItem(USER_KEY);
  if (!userStr) return null;

  try {
    return JSON.parse(userStr);
  } catch (error) {
    console.error('Error parsing user data:', error);
    return null;
  }
}

/**
 * Parse JWT token to extract payload
 * @param {string} token - JWT token
 * @returns {Object|null} - Decoded payload or null if invalid
 */
export function parseJWT(token) {
  if (!token) return null;

  try {
    // JWT format: header.payload.signature
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    // Decode base64 payload
    const payload = parts[1];
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decoded);
  } catch (error) {
    console.error('Error parsing JWT:', error);
    return null;
  }
}

/**
 * Check if token is expired
 * @param {string} token - JWT token
 * @returns {boolean} - True if expired
 */
export function isTokenExpired(token) {
  const payload = parseJWT(token);
  if (!payload || !payload.exp) return true;

  // JWT exp is in seconds, Date.now() is in milliseconds
  const expirationTime = payload.exp * 1000;
  const currentTime = Date.now();

  // Add 30 second buffer to refresh before actual expiration
  return currentTime >= (expirationTime - 30000);
}

/**
 * Check if token is valid (exists and not expired)
 * @param {string} token - JWT token
 * @returns {boolean}
 */
export function isTokenValid(token) {
  if (!token) return false;
  return !isTokenExpired(token);
}

/**
 * Get time until token expires (in seconds)
 * @param {string} token - JWT token
 * @returns {number} - Seconds until expiration, or 0 if expired
 */
export function getTokenExpiresIn(token) {
  const payload = parseJWT(token);
  if (!payload || !payload.exp) return 0;

  const expirationTime = payload.exp * 1000;
  const currentTime = Date.now();
  const timeLeft = expirationTime - currentTime;

  return timeLeft > 0 ? Math.floor(timeLeft / 1000) : 0;
}

/**
 * Check if user is authenticated (has valid access token)
 * @returns {boolean}
 */
export function isAuthenticated() {
  const token = getAccessToken();
  return isTokenValid(token);
}

/**
 * Get user role from stored user data
 * @returns {string|null}
 */
export function getUserRole() {
  const user = getUser();
  return user?.role || null;
}

/**
 * Get user ID from stored user data
 * @returns {string|null}
 */
export function getUserId() {
  const user = getUser();
  return user?.id || null;
}

/**
 * Get user email from stored user data
 * @returns {string|null}
 */
export function getUserEmail() {
  const user = getUser();
  return user?.email || null;
}

/**
 * Get user display name
 * @returns {string}
 */
export function getUserDisplayName() {
  const user = getUser();
  return user?.name || user?.email || 'ผู้ใช้งาน';
}

/**
 * Update user data in localStorage
 * @param {Object} updates - Partial user data to update
 */
export function updateUser(updates) {
  const currentUser = getUser();
  if (currentUser) {
    const updatedUser = { ...currentUser, ...updates };
    setUser(updatedUser);
  }
}

/**
 * Check if refresh is needed (token expires in less than 10 minutes)
 * @returns {boolean}
 *
 * ✅ FIX v0.7.9-dev: Expanded from 5 to 10 minutes
 * - Provides more time for retry attempts (10 min vs 5 min)
 * - Reduces risk of token expiring during retry
 * - With 60-second interval: ~10 retry opportunities instead of ~5
 */
export function shouldRefreshToken() {
  const token = getAccessToken();
  if (!token) return false;

  const expiresIn = getTokenExpiresIn(token);
  return expiresIn > 0 && expiresIn < 600; // ✅ Less than 10 minutes (was 300 = 5 min)
}

/**
 * Get authentication headers for API requests
 * @returns {Object}
 */
export function getAuthHeaders() {
  const token = getAccessToken();
  if (!token) return {};

  return {
    'Authorization': `Bearer ${token}`
  };
}

/**
 * Debug: Get token information (for development)
 * @returns {Object}
 */
export function getTokenInfo() {
  const accessToken = getAccessToken();
  const refreshToken = getRefreshToken();
  const user = getUser();

  return {
    hasAccessToken: !!accessToken,
    hasRefreshToken: !!refreshToken,
    isAuthenticated: isAuthenticated(),
    accessTokenValid: accessToken ? isTokenValid(accessToken) : false,
    accessTokenExpiresIn: accessToken ? getTokenExpiresIn(accessToken) : 0,
    user: user,
    role: getUserRole(),
    userId: getUserId()
  };
}

export default {
  setAccessToken,
  getAccessToken,
  setRefreshToken,
  getRefreshToken,
  setTokens,
  clearTokens,
  setUser,
  getUser,
  parseJWT,
  isTokenExpired,
  isTokenValid,
  getTokenExpiresIn,
  isAuthenticated,
  getUserRole,
  getUserId,
  getUserEmail,
  getUserDisplayName,
  updateUser,
  shouldRefreshToken,
  getAuthHeaders,
  getTokenInfo
};