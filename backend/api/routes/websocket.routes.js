/**
 * WebSocket API Routes
 * REST endpoints for WebSocket management and real-time features
 *
 * Features:
 * - WebSocket connection management
 * - Real-time system status
 * - Broadcasting endpoints
 * - Analytics and monitoring
 */

const express = require('express');
const { authenticate, requireSuperAdmin } = require('../../middleware/auth.middleware');
const logger = require('../../utils/logger.util');
const webSocketService = require('../../services/WebSocketService');
const notificationService = require('../../services/NotificationService');
const realtimeEventHandlers = require('../../services/RealtimeEventHandlers');

const router = express.Router();

/**
 * Get WebSocket server status
 * GET /api/v1/websocket/status
 */
router.get('/status', authenticate, async (req, res) => {
  try {
    const stats = webSocketService.getStats();

    res.status(200).json({
      success: true,
      data: {
        status: 'operational',
        ...stats,
        timestamp: new Date(),
      },
    });
  } catch (error) {
    logger.error('Error getting WebSocket status:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'WEBSOCKET_STATUS_ERROR',
        message: 'Failed to get WebSocket status',
      },
    });
  }
});

/**
 * Get connected users
 * GET /api/v1/websocket/users
 */
router.get('/users', authenticate, requireSuperAdmin, async (req, res) => {
  try {
    const stats = webSocketService.getStats();

    res.status(200).json({
      success: true,
      data: {
        connectedUsers: stats.connectedUsers,
        activeCollaborations: stats.activeCollaborations,
        userPresence: stats.userPresence,
        timestamp: new Date(),
      },
    });
  } catch (error) {
    logger.error('Error getting connected users:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'WEBSOCKET_USERS_ERROR',
        message: 'Failed to get connected users',
      },
    });
  }
});

/**
 * Send system announcement
 * POST /api/v1/websocket/broadcast/announcement
 */
router.post('/broadcast/announcement', authenticate, requireSuperAdmin, async (req, res) => {
  try {
    const { title, body, priority = 'medium', targetRoles, targetDepartments } = req.body;

    if (!title || !body) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'Title and body are required',
        },
      });
    }

    // Send system message
    await realtimeEventHandlers.handleSystemMessage({
      type: 'announcement',
      message: body,
      priority,
      targetRoles,
      targetDepartments,
    }, req.user);

    res.status(200).json({
      success: true,
      message: 'System announcement sent successfully',
      data: {
        title,
        priority,
        targetRoles: targetRoles || ['all'],
        targetDepartments: targetDepartments || ['all'],
        sentAt: new Date(),
      },
    });

  } catch (error) {
    logger.error('Error sending system announcement:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'BROADCAST_ERROR',
        message: 'Failed to send system announcement',
      },
    });
  }
});

/**
 * Send department announcement
 * POST /api/v1/websocket/broadcast/department
 */
router.post('/broadcast/department', authenticate, requireSuperAdmin, async (req, res) => {
  try {
    const { department, message, priority = 'medium' } = req.body;

    if (!department || !message) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'Department and message are required',
        },
      });
    }

    // Check if user has permission for this department
    if (req.user.role === 'department_manager' && req.user.department !== department) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'Cannot send announcement to other departments',
        },
      });
    }

    // Send department announcement
    await notificationService.sendDepartmentAnnouncement({
      department,
      announcement: message,
      priority,
      metadata: {
        sender: req.user.username,
      },
    });

    res.status(200).json({
      success: true,
      message: 'Department announcement sent successfully',
      data: {
        department,
        priority,
        sentAt: new Date(),
      },
    });

  } catch (error) {
    logger.error('Error sending department announcement:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'BROADCAST_ERROR',
        message: 'Failed to send department announcement',
      },
    });
  }
});

/**
 * Send notification to specific users
 * POST /api/v1/websocket/notify/users
 */
router.post('/notify/users', authenticate, requireSuperAdmin, async (req, res) => {
  try {
    const { userIds, title, body, priority = 'medium', channels = ['websocket'] } = req.body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'User IDs array is required',
        },
      });
    }

    if (!title || !body) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'Title and body are required',
        },
      });
    }

    // Send notification
    const notificationId = await notificationService.sendNotification({
      recipients: userIds,
      data: { title, body, priority },
      priority,
      channels,
      metadata: {
        sender: req.user.username,
        type: 'manual_notification',
      },
    });

    res.status(200).json({
      success: true,
      message: 'Notification sent successfully',
      data: {
        notificationId,
        recipientCount: userIds.length,
        channels,
        sentAt: new Date(),
      },
    });

  } catch (error) {
    logger.error('Error sending user notification:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'NOTIFICATION_ERROR',
        message: 'Failed to send notification',
      },
    });
  }
});

/**
 * Get form collaboration status
 * GET /api/v1/websocket/forms/:formId/collaboration
 */
router.get('/forms/:formId/collaboration', authenticate, async (req, res) => {
  try {
    const { formId } = req.params;

    // Validate form access
    const Form = require('../../models/Form');
    const form = await Form.findByPk(formId);

    if (!form) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'FORM_NOT_FOUND',
          message: 'Form not found',
        },
      });
    }

    // Check permissions (simplified check)
    const hasAccess = req.user.role === 'super_admin' ||
                     req.user.role === 'admin' ||
                     form.createdBy === req.user.id ||
                     (form.department === req.user.department);

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: 'No access to this form',
        },
      });
    }

    // Get collaboration data
    const collaborators = await webSocketService.getFormCollaborators(formId);

    res.status(200).json({
      success: true,
      data: {
        formId,
        formTitle: form.title,
        collaborators,
        totalCollaborators: collaborators.length,
        lastActivity: new Date(),
      },
    });

  } catch (error) {
    logger.error('Error getting form collaboration status:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'COLLABORATION_ERROR',
        message: 'Failed to get collaboration status',
      },
    });
  }
});

/**
 * Get notification statistics
 * GET /api/v1/websocket/notifications/stats
 */
router.get('/notifications/stats', authenticate, requireSuperAdmin, async (req, res) => {
  try {
    const stats = await notificationService.getStats();

    res.status(200).json({
      success: true,
      data: {
        ...stats,
        timestamp: new Date(),
      },
    });

  } catch (error) {
    logger.error('Error getting notification stats:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'STATS_ERROR',
        message: 'Failed to get notification statistics',
      },
    });
  }
});

/**
 * Send test notification
 * POST /api/v1/websocket/test/notification
 */
router.post('/test/notification', authenticate, async (req, res) => {
  try {
    const { type = 'test' } = req.body;

    // Send test notification to current user
    const notificationId = await notificationService.sendNotification({
      recipients: [req.user.id],
      data: {
        title: 'Test Notification',
        body: `This is a test notification sent at ${new Date().toLocaleString()}`,
        priority: 'low',
      },
      priority: 'low',
      channels: ['websocket'],
      immediate: true,
      metadata: {
        type: 'test',
        sender: req.user.username,
      },
    });

    res.status(200).json({
      success: true,
      message: 'Test notification sent',
      data: {
        notificationId,
        sentAt: new Date(),
      },
    });

  } catch (error) {
    logger.error('Error sending test notification:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'TEST_ERROR',
        message: 'Failed to send test notification',
      },
    });
  }
});

/**
 * Force disconnect user (admin only)
 * POST /api/v1/websocket/admin/disconnect/:userId
 */
router.post('/admin/disconnect/:userId', authenticate, requireSuperAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason = 'Administrative action' } = req.body;

    // Send disconnect command to user
    webSocketService.sendToUser(userId, 'admin:disconnect', {
      reason,
      message: 'Your connection has been terminated by an administrator',
      timestamp: new Date(),
    });

    res.status(200).json({
      success: true,
      message: 'User disconnect command sent',
      data: {
        userId,
        reason,
        timestamp: new Date(),
      },
    });

  } catch (error) {
    logger.error('Error disconnecting user:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'DISCONNECT_ERROR',
        message: 'Failed to disconnect user',
      },
    });
  }
});

/**
 * Get WebSocket analytics
 * GET /api/v1/websocket/analytics
 */
router.get('/analytics', authenticate, requireSuperAdmin, async (req, res) => {
  try {
    const { period = '24h' } = req.query;

    // This would integrate with analytics service
    // For now, return basic stats
    const stats = webSocketService.getStats();

    res.status(200).json({
      success: true,
      data: {
        period,
        connectionStats: stats,
        // TODO: Add more detailed analytics
        summary: {
          totalConnections: stats.connectedUsers,
          activeCollaborations: stats.activeCollaborations,
          peakConnections: stats.connectedUsers, // Would track this over time
        },
        timestamp: new Date(),
      },
    });

  } catch (error) {
    logger.error('Error getting WebSocket analytics:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'ANALYTICS_ERROR',
        message: 'Failed to get analytics data',
      },
    });
  }
});

module.exports = router;