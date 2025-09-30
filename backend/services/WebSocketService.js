/**
 * WebSocket Service
 * Real-time communication service for Q-Collector
 *
 * Features:
 * - Connection management with authentication
 * - Room-based messaging for forms and users
 * - Real-time form collaboration
 * - User presence tracking
 * - Event broadcasting with namespacing
 */

const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger.util');
const { redisClient } = require('../config/redis.config');

class WebSocketService {
  constructor() {
    this.io = null;
    this.connectedUsers = new Map(); // userId -> { socketId, userData, rooms }
    this.formCollaborators = new Map(); // formId -> Set of userIds
    this.userPresence = new Map(); // userId -> { status, lastSeen, currentForm }
    this.rateLimitMap = new Map(); // socketId -> { count, resetTime }

    // Rate limiting configuration
    this.rateLimitConfig = {
      maxEvents: 50, // Maximum events per window
      windowMs: 60000, // 1 minute window
    };
  }

  /**
   * Initialize WebSocket server
   * @param {Object} server - HTTP server instance
   */
  async initialize(server) {
    try {
      // Create Socket.IO server with CORS configuration
      this.io = new Server(server, {
        cors: {
          origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
          credentials: true,
          methods: ['GET', 'POST']
        },
        transports: ['websocket', 'polling'],
        allowEIO3: true,
        pingTimeout: 60000,
        pingInterval: 25000,
      });

      // Set up Redis adapter for scaling across multiple instances
      const pubClient = redisClient.duplicate();
      const subClient = redisClient.duplicate();

      await pubClient.connect();
      await subClient.connect();

      this.io.adapter(createAdapter(pubClient, subClient));
      logger.info('WebSocket Redis adapter configured');

      // Set up authentication middleware
      this.setupAuthenticationMiddleware();

      // Set up connection handlers
      this.setupConnectionHandlers();

      // Set up error handlers
      this.setupErrorHandlers();

      // Set up cleanup routines
      this.setupCleanupRoutines();

      logger.info('WebSocket service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize WebSocket service:', error);
      throw error;
    }
  }

  /**
   * Set up authentication middleware for socket connections
   */
  setupAuthenticationMiddleware() {
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');

        if (!token) {
          return next(new Error('Authentication token required'));
        }

        // Verify JWT token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Get user data from database if needed
        const User = require('../models/User');
        const user = await User.findByPk(decoded.userId, {
          attributes: ['id', 'username', 'email', 'firstName', 'lastName', 'role', 'department', 'isActive']
        });

        if (!user || !user.isActive) {
          return next(new Error('User not found or inactive'));
        }

        // Attach user data to socket
        socket.userId = user.id;
        socket.userData = user;

        logger.debug(`Socket authenticated for user: ${user.username} (${user.id})`);
        next();
      } catch (error) {
        logger.warn(`Socket authentication failed: ${error.message}`);
        next(new Error('Authentication failed'));
      }
    });
  }

  /**
   * Set up connection handlers
   */
  setupConnectionHandlers() {
    this.io.on('connection', (socket) => {
      this.handleConnection(socket);
    });
  }

  /**
   * Handle new socket connection
   * @param {Object} socket - Socket instance
   */
  async handleConnection(socket) {
    const { userId, userData } = socket;

    try {
      // Add user to connected users
      this.connectedUsers.set(userId, {
        socketId: socket.id,
        userData,
        rooms: new Set(),
        connectedAt: new Date(),
      });

      // Update user presence
      this.updateUserPresence(userId, 'online', null);

      // Join user-specific room for direct notifications
      const userRoom = `user:${userId}`;
      socket.join(userRoom);

      // Join department room if user has department
      if (userData.department) {
        const deptRoom = `dept:${userData.department}`;
        socket.join(deptRoom);
      }

      // Join role-based room
      const roleRoom = `role:${userData.role}`;
      socket.join(roleRoom);

      logger.info(`User ${userData.username} connected via WebSocket (${socket.id})`);

      // Send welcome message with current status
      socket.emit('connection:established', {
        userId,
        connectedAt: new Date(),
        activeUsers: this.getActiveUsersCount(),
        userPresence: this.getUserPresenceStatus(userId),
      });

      // Broadcast user online status to relevant rooms
      this.broadcastUserPresence(userId, 'online');

      // Set up event handlers for this socket
      this.setupSocketEventHandlers(socket);

    } catch (error) {
      logger.error(`Error handling socket connection for user ${userId}:`, error);
      socket.emit('error', { message: 'Connection setup failed' });
    }
  }

  /**
   * Set up event handlers for a socket
   * @param {Object} socket - Socket instance
   */
  setupSocketEventHandlers(socket) {
    const { userId } = socket;

    // Form collaboration events
    socket.on('form:join', (data) => this.handleFormJoin(socket, data));
    socket.on('form:leave', (data) => this.handleFormLeave(socket, data));
    socket.on('form:update', (data) => this.handleFormUpdate(socket, data));
    socket.on('form:field:update', (data) => this.handleFormFieldUpdate(socket, data));
    socket.on('form:structure:update', (data) => this.handleFormStructureUpdate(socket, data));

    // User presence events
    socket.on('user:presence', (data) => this.handleUserPresenceUpdate(socket, data));
    socket.on('user:typing', (data) => this.handleUserTyping(socket, data));

    // Submission events
    socket.on('submission:create', (data) => this.handleSubmissionCreate(socket, data));
    socket.on('submission:update', (data) => this.handleSubmissionUpdate(socket, data));

    // Notification events
    socket.on('notification:read', (data) => this.handleNotificationRead(socket, data));
    socket.on('notification:dismiss', (data) => this.handleNotificationDismiss(socket, data));

    // Ping/Pong for connection health
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: Date.now() });
    });

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      this.handleDisconnection(socket, reason);
    });

    // Handle errors
    socket.on('error', (error) => {
      logger.error(`Socket error for user ${userId}:`, error);
    });
  }

  /**
   * Handle user joining a form collaboration
   */
  async handleFormJoin(socket, data) {
    if (!this.checkRateLimit(socket)) return;

    const { formId } = data;
    const { userId, userData } = socket;

    try {
      // Validate form access permissions
      const hasAccess = await this.validateFormAccess(userId, formId);
      if (!hasAccess) {
        socket.emit('error', { message: 'Access denied to form' });
        return;
      }

      // Join form room
      const formRoom = `form:${formId}`;
      socket.join(formRoom);

      // Add to form collaborators
      if (!this.formCollaborators.has(formId)) {
        this.formCollaborators.set(formId, new Set());
      }
      this.formCollaborators.get(formId).add(userId);

      // Update user rooms
      const userConnection = this.connectedUsers.get(userId);
      if (userConnection) {
        userConnection.rooms.add(formRoom);
      }

      // Update user presence
      this.updateUserPresence(userId, 'online', formId);

      // Notify other collaborators
      socket.to(formRoom).emit('form:user:joined', {
        formId,
        user: {
          id: userId,
          username: userData.username,
          firstName: userData.firstName,
          lastName: userData.lastName,
        },
        timestamp: new Date(),
      });

      // Send current collaborators list to new joiner
      const collaborators = await this.getFormCollaborators(formId);
      socket.emit('form:collaborators', {
        formId,
        collaborators,
        joinedAt: new Date(),
      });

      logger.debug(`User ${userData.username} joined form ${formId} collaboration`);

    } catch (error) {
      logger.error(`Error handling form join for user ${userId}:`, error);
      socket.emit('error', { message: 'Failed to join form collaboration' });
    }
  }

  /**
   * Handle user leaving a form collaboration
   */
  async handleFormLeave(socket, data) {
    const { formId } = data;
    const { userId, userData } = socket;

    try {
      const formRoom = `form:${formId}`;
      socket.leave(formRoom);

      // Remove from form collaborators
      if (this.formCollaborators.has(formId)) {
        this.formCollaborators.get(formId).delete(userId);
        if (this.formCollaborators.get(formId).size === 0) {
          this.formCollaborators.delete(formId);
        }
      }

      // Update user rooms
      const userConnection = this.connectedUsers.get(userId);
      if (userConnection) {
        userConnection.rooms.delete(formRoom);
      }

      // Update user presence
      this.updateUserPresence(userId, 'online', null);

      // Notify other collaborators
      socket.to(formRoom).emit('form:user:left', {
        formId,
        user: {
          id: userId,
          username: userData.username,
        },
        timestamp: new Date(),
      });

      logger.debug(`User ${userData.username} left form ${formId} collaboration`);

    } catch (error) {
      logger.error(`Error handling form leave for user ${userId}:`, error);
    }
  }

  /**
   * Handle form update events
   */
  async handleFormUpdate(socket, data) {
    if (!this.checkRateLimit(socket)) return;

    const { formId, updateType, changes, version } = data;
    const { userId, userData } = socket;

    try {
      // Validate form access permissions
      const hasAccess = await this.validateFormAccess(userId, formId, 'edit');
      if (!hasAccess) {
        socket.emit('error', { message: 'No edit permissions for form' });
        return;
      }

      const formRoom = `form:${formId}`;
      const updateData = {
        formId,
        updateType,
        changes,
        version,
        user: {
          id: userId,
          username: userData.username,
          firstName: userData.firstName,
          lastName: userData.lastName,
        },
        timestamp: new Date(),
      };

      // Broadcast update to other collaborators
      socket.to(formRoom).emit('form:updated', updateData);

      // Log the update
      logger.debug(`Form ${formId} updated by ${userData.username}: ${updateType}`);

    } catch (error) {
      logger.error(`Error handling form update for user ${userId}:`, error);
      socket.emit('error', { message: 'Failed to process form update' });
    }
  }

  /**
   * Handle form field updates
   */
  async handleFormFieldUpdate(socket, data) {
    if (!this.checkRateLimit(socket)) return;

    const { formId, fieldId, changes, position } = data;
    const { userId, userData } = socket;

    try {
      const hasAccess = await this.validateFormAccess(userId, formId, 'edit');
      if (!hasAccess) return;

      const formRoom = `form:${formId}`;
      const updateData = {
        formId,
        fieldId,
        changes,
        position,
        user: {
          id: userId,
          username: userData.username,
        },
        timestamp: new Date(),
      };

      socket.to(formRoom).emit('form:field:updated', updateData);

    } catch (error) {
      logger.error(`Error handling form field update:`, error);
    }
  }

  /**
   * Handle form structure updates
   */
  async handleFormStructureUpdate(socket, data) {
    if (!this.checkRateLimit(socket)) return;

    const { formId, structureChanges, version } = data;
    const { userId, userData } = socket;

    try {
      const hasAccess = await this.validateFormAccess(userId, formId, 'edit');
      if (!hasAccess) return;

      const formRoom = `form:${formId}`;
      const updateData = {
        formId,
        structureChanges,
        version,
        user: {
          id: userId,
          username: userData.username,
        },
        timestamp: new Date(),
      };

      socket.to(formRoom).emit('form:structure:updated', updateData);

    } catch (error) {
      logger.error(`Error handling form structure update:`, error);
    }
  }

  /**
   * Handle user presence updates
   */
  handleUserPresenceUpdate(socket, data) {
    const { status, currentForm } = data;
    const { userId } = socket;

    this.updateUserPresence(userId, status, currentForm);
    this.broadcastUserPresence(userId, status, currentForm);
  }

  /**
   * Handle user typing indicators
   */
  handleUserTyping(socket, data) {
    if (!this.checkRateLimit(socket, 20, 10000)) return; // More lenient for typing

    const { formId, fieldId, isTyping } = data;
    const { userId, userData } = socket;

    const formRoom = `form:${formId}`;
    socket.to(formRoom).emit('user:typing', {
      formId,
      fieldId,
      isTyping,
      user: {
        id: userId,
        username: userData.username,
      },
      timestamp: new Date(),
    });
  }

  /**
   * Handle submission creation
   */
  async handleSubmissionCreate(socket, data) {
    const { formId, submissionId } = data;
    const { userId, userData } = socket;

    try {
      // Broadcast to form watchers
      const formRoom = `form:${formId}`;
      this.io.to(formRoom).emit('submission:created', {
        formId,
        submissionId,
        creator: {
          id: userId,
          username: userData.username,
        },
        timestamp: new Date(),
      });

      // Broadcast to admin users
      this.io.to('role:admin').emit('submission:new', {
        formId,
        submissionId,
        creator: userData,
        timestamp: new Date(),
      });

    } catch (error) {
      logger.error(`Error handling submission create:`, error);
    }
  }

  /**
   * Handle disconnection
   */
  handleDisconnection(socket, reason) {
    const { userId, userData } = socket;

    try {
      // Remove from connected users
      this.connectedUsers.delete(userId);

      // Update user presence to offline
      this.updateUserPresence(userId, 'offline');

      // Remove from all form collaborations
      for (const [formId, collaborators] of this.formCollaborators.entries()) {
        if (collaborators.has(userId)) {
          collaborators.delete(userId);

          // Notify other collaborators
          socket.to(`form:${formId}`).emit('form:user:left', {
            formId,
            user: {
              id: userId,
              username: userData.username,
            },
            timestamp: new Date(),
          });

          if (collaborators.size === 0) {
            this.formCollaborators.delete(formId);
          }
        }
      }

      // Broadcast user offline status
      this.broadcastUserPresence(userId, 'offline');

      logger.info(`User ${userData.username} disconnected (${reason})`);

    } catch (error) {
      logger.error(`Error handling disconnection for user ${userId}:`, error);
    }
  }

  /**
   * Update user presence status
   */
  updateUserPresence(userId, status, currentForm = null) {
    this.userPresence.set(userId, {
      status,
      currentForm,
      lastSeen: new Date(),
    });
  }

  /**
   * Broadcast user presence to relevant rooms
   */
  broadcastUserPresence(userId, status, currentForm = null) {
    const userData = this.connectedUsers.get(userId)?.userData;
    if (!userData) return;

    const presenceData = {
      userId,
      username: userData.username,
      status,
      currentForm,
      timestamp: new Date(),
    };

    // Broadcast to department room
    if (userData.department) {
      this.io.to(`dept:${userData.department}`).emit('user:presence', presenceData);
    }

    // Broadcast to role room
    this.io.to(`role:${userData.role}`).emit('user:presence', presenceData);

    // Broadcast to all form rooms the user is in
    if (currentForm) {
      this.io.to(`form:${currentForm}`).emit('user:presence', presenceData);
    }
  }

  /**
   * Get active users count
   */
  getActiveUsersCount() {
    return this.connectedUsers.size;
  }

  /**
   * Get user presence status
   */
  getUserPresenceStatus(userId) {
    return this.userPresence.get(userId) || { status: 'offline', lastSeen: null };
  }

  /**
   * Get form collaborators
   */
  async getFormCollaborators(formId) {
    const collaboratorIds = this.formCollaborators.get(formId) || new Set();
    const collaborators = [];

    for (const userId of collaboratorIds) {
      const userConnection = this.connectedUsers.get(userId);
      if (userConnection) {
        collaborators.push({
          id: userId,
          username: userConnection.userData.username,
          firstName: userConnection.userData.firstName,
          lastName: userConnection.userData.lastName,
          status: this.getUserPresenceStatus(userId).status,
        });
      }
    }

    return collaborators;
  }

  /**
   * Validate form access permissions
   */
  async validateFormAccess(userId, formId, permission = 'view') {
    try {
      const Form = require('../models/Form');
      const User = require('../models/User');

      const form = await Form.findByPk(formId);
      if (!form) return false;

      const user = await User.findByPk(userId);
      if (!user) return false;

      // Super admin has access to everything
      if (user.role === 'super_admin') return true;

      // Admin has access to all forms
      if (user.role === 'admin') return true;

      // Form owner has full access
      if (form.createdBy === userId) return true;

      // Check if form is public and permission is just view
      if (permission === 'view' && form.isPublic) return true;

      // Department-based access
      if (form.department === user.department) {
        // Department manager has full access
        if (user.role === 'department_manager') return true;

        // Regular users can view department forms
        if (permission === 'view') return true;
      }

      return false;
    } catch (error) {
      logger.error(`Error validating form access:`, error);
      return false;
    }
  }

  /**
   * Rate limiting check
   */
  checkRateLimit(socket, maxEvents = null, windowMs = null) {
    const { rateLimitConfig } = this;
    const limit = maxEvents || rateLimitConfig.maxEvents;
    const window = windowMs || rateLimitConfig.windowMs;

    const now = Date.now();
    const socketId = socket.id;

    if (!this.rateLimitMap.has(socketId)) {
      this.rateLimitMap.set(socketId, { count: 1, resetTime: now + window });
      return true;
    }

    const rateData = this.rateLimitMap.get(socketId);

    if (now > rateData.resetTime) {
      rateData.count = 1;
      rateData.resetTime = now + window;
      return true;
    }

    if (rateData.count >= limit) {
      socket.emit('error', {
        message: 'Rate limit exceeded',
        retryAfter: Math.ceil((rateData.resetTime - now) / 1000)
      });
      return false;
    }

    rateData.count++;
    return true;
  }

  /**
   * Set up error handlers
   */
  setupErrorHandlers() {
    this.io.engine.on('connection_error', (error) => {
      logger.error('WebSocket connection error:', error);
    });
  }

  /**
   * Set up cleanup routines
   */
  setupCleanupRoutines() {
    // Clean up stale connections every 5 minutes
    setInterval(() => {
      this.cleanupStaleConnections();
    }, 5 * 60 * 1000);

    // Clean up rate limit data every hour
    setInterval(() => {
      this.cleanupRateLimitData();
    }, 60 * 60 * 1000);
  }

  /**
   * Clean up stale connections and presence data
   */
  cleanupStaleConnections() {
    const now = Date.now();
    const staleThreshold = 30 * 60 * 1000; // 30 minutes

    for (const [userId, presence] of this.userPresence.entries()) {
      if (now - presence.lastSeen.getTime() > staleThreshold) {
        this.userPresence.delete(userId);
        logger.debug(`Cleaned up stale presence for user ${userId}`);
      }
    }
  }

  /**
   * Clean up old rate limit data
   */
  cleanupRateLimitData() {
    const now = Date.now();

    for (const [socketId, rateData] of this.rateLimitMap.entries()) {
      if (now > rateData.resetTime) {
        this.rateLimitMap.delete(socketId);
      }
    }
  }

  /**
   * Broadcast message to specific room
   */
  broadcastToRoom(room, event, data) {
    this.io.to(room).emit(event, data);
  }

  /**
   * Send message to specific user
   */
  sendToUser(userId, event, data) {
    this.io.to(`user:${userId}`).emit(event, data);
  }

  /**
   * Broadcast to all users with specific role
   */
  broadcastToRole(role, event, data) {
    this.io.to(`role:${role}`).emit(event, data);
  }

  /**
   * Broadcast to all users in specific department
   */
  broadcastToDepartment(department, event, data) {
    this.io.to(`dept:${department}`).emit(event, data);
  }

  /**
   * Get WebSocket server statistics
   */
  getStats() {
    return {
      connectedUsers: this.connectedUsers.size,
      activeCollaborations: this.formCollaborators.size,
      totalRooms: this.io.sockets.adapter.rooms.size,
      userPresence: Object.fromEntries(this.userPresence),
    };
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    try {
      logger.info('Shutting down WebSocket service...');

      // Notify all connected users about shutdown
      this.io.emit('server:shutdown', {
        message: 'Server is shutting down for maintenance',
        timestamp: new Date(),
      });

      // Close all connections
      this.io.close();

      // Clear all maps
      this.connectedUsers.clear();
      this.formCollaborators.clear();
      this.userPresence.clear();
      this.rateLimitMap.clear();

      logger.info('WebSocket service shutdown completed');
    } catch (error) {
      logger.error('Error during WebSocket service shutdown:', error);
    }
  }
}

// Export singleton instance
const webSocketService = new WebSocketService();
module.exports = webSocketService;