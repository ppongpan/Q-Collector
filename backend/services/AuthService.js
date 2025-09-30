/**
 * Authentication Service
 * Handles user authentication, JWT tokens, and session management
 */

const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const { User, Session, AuditLog } = require('../models');
const logger = require('../utils/logger.util');
const { ApiError } = require('../middleware/error.middleware');
const { encrypt, decrypt } = require('../utils/encryption.util');

// JWT configuration
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET must be set in environment variables');
}

class AuthService {
  /**
   * Register new user
   * @param {Object} userData - User registration data
   * @param {Object} metadata - Request metadata (ip, userAgent)
   * @returns {Promise<Object>} User and tokens
   */
  static async register(userData, metadata = {}) {
    try {
      const { username, email, password, full_name, phone, role = 'user' } = userData;

      // Check if user already exists
      const existingUser = await User.findOne({
        where: {
          [Op.or]: [{ email }, { username }],
        },
      });

      if (existingUser) {
        if (existingUser.email === email) {
          throw new ApiError(409, 'Email already registered', 'DUPLICATE_EMAIL');
        }
        if (existingUser.username === username) {
          throw new ApiError(409, 'Username already taken', 'DUPLICATE_USERNAME');
        }
      }

      // Create user (password hashing handled by model hook)
      const user = await User.create({
        username,
        email,
        password_hash: password, // Will be hashed by beforeCreate hook
        full_name,
        phone,
        role,
        is_active: true,
      });

      // Create audit log
      await AuditLog.logAction({
        userId: user.id,
        action: 'create',
        entityType: 'user',
        entityId: user.id,
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent,
      });

      // Generate tokens
      const tokens = await this.generateTokens(user, metadata);

      logger.info(`New user registered: ${user.username} (${user.email})`);

      return {
        user: user.toJSON(),
        tokens,
      };
    } catch (error) {
      logger.error('Registration failed:', error);
      throw error;
    }
  }

  /**
   * Login user with email/username and password
   * @param {string} identifier - Email or username
   * @param {string} password - Plain text password
   * @param {Object} metadata - Request metadata (ip, userAgent)
   * @returns {Promise<Object>} User and tokens
   */
  static async login(identifier, password, metadata = {}) {
    try {
      // Find user by email or username
      const user = await User.findByIdentifier(identifier);

      if (!user) {
        throw new ApiError(401, 'Invalid credentials', 'INVALID_CREDENTIALS');
      }

      // Check if user is active
      if (!user.is_active) {
        throw new ApiError(403, 'Account is inactive', 'ACCOUNT_INACTIVE');
      }

      // Validate password
      const isPasswordValid = await user.validatePassword(password);
      if (!isPasswordValid) {
        throw new ApiError(401, 'Invalid credentials', 'INVALID_CREDENTIALS');
      }

      // Update last login time
      user.last_login_at = new Date();
      await user.save();

      // Create audit log
      await AuditLog.logAction({
        userId: user.id,
        action: 'login',
        entityType: 'session',
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent,
      });

      // Generate tokens
      const tokens = await this.generateTokens(user, metadata);

      logger.info(`User logged in: ${user.username}`);

      return {
        user: user.toJSON(),
        tokens,
      };
    } catch (error) {
      logger.error('Login failed:', error);
      throw error;
    }
  }

  /**
   * Generate JWT access and refresh tokens
   * @param {User} user - User instance
   * @param {Object} metadata - Request metadata
   * @returns {Promise<Object>} Tokens and session
   */
  static async generateTokens(user, metadata = {}) {
    try {
      const payload = user.getTokenPayload();

      // Generate access token
      const accessToken = jwt.sign(payload, JWT_SECRET, {
        expiresIn: JWT_EXPIRES_IN,
      });

      // Generate refresh token
      const refreshToken = jwt.sign(
        { id: user.id, type: 'refresh' },
        JWT_SECRET,
        { expiresIn: JWT_REFRESH_EXPIRES_IN }
      );

      // Calculate expiration time
      const expiresAt = new Date();
      const expiresInMs = this.parseJWTExpiry(JWT_EXPIRES_IN);
      expiresAt.setTime(expiresAt.getTime() + expiresInMs);

      // Create session record
      const session = await Session.createSession({
        userId: user.id,
        token: accessToken,
        refreshToken,
        expiresAt,
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent,
      });

      return {
        accessToken,
        refreshToken,
        expiresIn: JWT_EXPIRES_IN,
        tokenType: 'Bearer',
        sessionId: session.id,
      };
    } catch (error) {
      logger.error('Token generation failed:', error);
      throw error;
    }
  }

  /**
   * Refresh access token using refresh token
   * @param {string} refreshToken - Refresh token
   * @param {Object} metadata - Request metadata
   * @returns {Promise<Object>} New tokens
   */
  static async refreshToken(refreshToken, metadata = {}) {
    try {
      // Verify refresh token
      const decoded = jwt.verify(refreshToken, JWT_SECRET);

      if (decoded.type !== 'refresh') {
        throw new ApiError(401, 'Invalid token type', 'INVALID_TOKEN_TYPE');
      }

      // Find session
      const session = await Session.findByRefreshToken(refreshToken);
      if (!session) {
        throw new ApiError(401, 'Session not found', 'SESSION_NOT_FOUND');
      }

      // Check if session is expired
      if (session.isExpired()) {
        await session.destroy();
        throw new ApiError(401, 'Session expired', 'SESSION_EXPIRED');
      }

      // Get user
      const user = await User.findByPk(decoded.id);
      if (!user || !user.is_active) {
        throw new ApiError(401, 'User not found or inactive', 'USER_INACTIVE');
      }

      // Generate new tokens
      const newTokens = await this.generateTokens(user, metadata);

      // Delete old session
      await session.destroy();

      logger.info(`Token refreshed for user: ${user.username}`);

      return newTokens;
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new ApiError(401, 'Refresh token expired', 'TOKEN_EXPIRED');
      }
      if (error.name === 'JsonWebTokenError') {
        throw new ApiError(401, 'Invalid refresh token', 'INVALID_TOKEN');
      }
      logger.error('Token refresh failed:', error);
      throw error;
    }
  }

  /**
   * Logout user by revoking session
   * @param {string} sessionId - Session ID
   * @param {string} userId - User ID
   * @returns {Promise<boolean>}
   */
  static async logout(sessionId, userId) {
    try {
      const session = await Session.findOne({
        where: {
          id: sessionId,
          user_id: userId,
        },
      });

      if (session) {
        await session.destroy();

        // Create audit log
        await AuditLog.logAction({
          userId,
          action: 'logout',
          entityType: 'session',
          entityId: sessionId,
        });

        logger.info(`User logged out: session ${sessionId}`);
      }

      return true;
    } catch (error) {
      logger.error('Logout failed:', error);
      throw error;
    }
  }

  /**
   * Verify JWT token and return payload
   * @param {string} token - JWT token
   * @returns {Promise<Object>} Decoded payload
   */
  static async verifyToken(token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);

      // Check if session exists
      const session = await Session.findByToken(token);
      if (!session) {
        throw new ApiError(401, 'Session not found', 'SESSION_NOT_FOUND');
      }

      // Check if session is expired
      if (session.isExpired()) {
        await session.destroy();
        throw new ApiError(401, 'Session expired', 'SESSION_EXPIRED');
      }

      // Update last used timestamp
      await session.updateLastUsed();

      return decoded;
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new ApiError(401, 'Token expired', 'TOKEN_EXPIRED');
      }
      if (error.name === 'JsonWebTokenError') {
        throw new ApiError(401, 'Invalid token', 'INVALID_TOKEN');
      }
      throw error;
    }
  }

  /**
   * Get current user by ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>} User object
   */
  static async getCurrentUser(userId) {
    try {
      const user = await User.findByPk(userId, {
        attributes: { exclude: ['password_hash'] },
      });

      if (!user) {
        throw new ApiError(404, 'User not found', 'USER_NOT_FOUND');
      }

      return user.toJSON();
    } catch (error) {
      logger.error('Get current user failed:', error);
      throw error;
    }
  }

  /**
   * Update user profile
   * @param {string} userId - User ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Updated user
   */
  static async updateProfile(userId, updates) {
    try {
      const user = await User.findByPk(userId);

      if (!user) {
        throw new ApiError(404, 'User not found', 'USER_NOT_FOUND');
      }

      // Allowed fields for profile update
      const allowedFields = ['full_name', 'phone'];
      const oldValue = {};

      // Update allowed fields
      for (const field of allowedFields) {
        if (updates[field] !== undefined) {
          oldValue[field] = user[field];
          user[field] = updates[field];
        }
      }

      await user.save();

      // Create audit log
      await AuditLog.logAction({
        userId,
        action: 'update',
        entityType: 'user',
        entityId: userId,
        oldValue,
        newValue: updates,
      });

      logger.info(`Profile updated for user: ${user.username}`);

      return user.toJSON();
    } catch (error) {
      logger.error('Profile update failed:', error);
      throw error;
    }
  }

  /**
   * Change user password
   * @param {string} userId - User ID
   * @param {string} oldPassword - Current password
   * @param {string} newPassword - New password
   * @returns {Promise<boolean>}
   */
  static async changePassword(userId, oldPassword, newPassword) {
    try {
      const user = await User.findByPk(userId);

      if (!user) {
        throw new ApiError(404, 'User not found', 'USER_NOT_FOUND');
      }

      // Verify old password
      const isPasswordValid = await user.validatePassword(oldPassword);
      if (!isPasswordValid) {
        throw new ApiError(401, 'Current password is incorrect', 'INVALID_PASSWORD');
      }

      // Validate new password
      if (newPassword.length < 8) {
        throw new ApiError(400, 'Password must be at least 8 characters', 'WEAK_PASSWORD');
      }

      // Update password (will be hashed by beforeUpdate hook)
      user.password_hash = newPassword;
      await user.save();

      // Revoke all existing sessions except current
      await Session.revokeAllByUser(userId);

      // Create audit log
      await AuditLog.logAction({
        userId,
        action: 'update',
        entityType: 'user',
        entityId: userId,
        newValue: { password_changed: true },
      });

      logger.info(`Password changed for user: ${user.username}`);

      return true;
    } catch (error) {
      logger.error('Password change failed:', error);
      throw error;
    }
  }

  /**
   * Get all active sessions for a user
   * @param {string} userId - User ID
   * @returns {Promise<Array>} Array of sessions
   */
  static async getUserSessions(userId) {
    try {
      const sessions = await Session.findActiveByUser(userId);
      return sessions.map((session) => ({
        id: session.id,
        createdAt: session.createdAt,
        lastUsedAt: session.last_used_at,
        expiresAt: session.expires_at,
        ipAddress: session.ip_address,
        browserInfo: session.getBrowserInfo(),
      }));
    } catch (error) {
      logger.error('Get user sessions failed:', error);
      throw error;
    }
  }

  /**
   * Revoke all sessions for a user
   * @param {string} userId - User ID
   * @returns {Promise<number>} Number of sessions revoked
   */
  static async revokeAllSessions(userId) {
    try {
      const count = await Session.revokeAllByUser(userId);

      // Create audit log
      await AuditLog.logAction({
        userId,
        action: 'delete',
        entityType: 'session',
        newValue: { all_sessions_revoked: true, count },
      });

      logger.info(`All sessions revoked for user: ${userId}`);

      return count;
    } catch (error) {
      logger.error('Revoke all sessions failed:', error);
      throw error;
    }
  }

  /**
   * Parse JWT expiry string to milliseconds
   * @param {string} expiryString - Expiry string (e.g., '15m', '7d')
   * @returns {number} Milliseconds
   */
  static parseJWTExpiry(expiryString) {
    const match = expiryString.match(/^(\d+)([smhd])$/);
    if (!match) return 900000; // Default 15 minutes

    const value = parseInt(match[1]);
    const unit = match[2];

    const multipliers = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };

    return value * multipliers[unit];
  }
}

module.exports = AuthService;