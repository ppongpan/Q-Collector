/**
 * WebSocket Integration Example
 * Example showing how to integrate WebSocket events with existing API routes
 */

const express = require('express');
const { authenticate } = require('../middleware/auth.middleware');
const webSocketIntegration = require('../utils/websocket-integration.util');

const router = express.Router();

// Add WebSocket integration middleware
router.use(webSocketIntegration.middleware());

/**
 * Example: Form Creation with WebSocket Integration
 * POST /api/v1/forms
 */
router.post('/forms', authenticate, async (req, res) => {
  try {
    const { title, description, department, isPublic } = req.body;

    // Create form in database
    const Form = require('../models/Form');
    const form = await Form.create({
      title,
      description,
      department,
      isPublic,
      createdBy: req.user.id,
    });

    // Emit WebSocket event for real-time updates
    await req.websocket.emit.formCreated({
      id: form.id,
      title: form.title,
      description: form.description,
      department: form.department,
      isPublic: form.isPublic,
    });

    // Send instant notification to department members
    await req.websocket.notify.instant({
      templateKey: 'form.created',
      recipients: await getDepartmentMembers(department),
      data: {
        formTitle: title,
        creatorName: `${req.user.firstName} ${req.user.lastName}`,
      },
      channels: ['websocket', 'telegram'],
    });

    res.status(201).json({
      success: true,
      data: form,
      message: 'Form created successfully',
    });

  } catch (error) {
    console.error('Error creating form:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create form',
    });
  }
});

/**
 * Example: Form Update with Real-time Collaboration
 * PUT /api/v1/forms/:id
 */
router.put('/forms/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Update form in database
    const Form = require('../models/Form');
    const form = await Form.findByPk(id);

    if (!form) {
      return res.status(404).json({
        success: false,
        error: 'Form not found',
      });
    }

    // Check permissions
    if (form.createdBy !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'No permission to update this form',
      });
    }

    await form.update(updates);

    // Emit real-time update to collaborators
    await req.websocket.emit.formUpdated(id, updates, 'metadata');

    // Broadcast to form room for live collaboration
    req.websocket.broadcast.toRoom(`form:${id}`, 'form:metadata:updated', {
      formId: id,
      changes: updates,
      updater: {
        id: req.user.id,
        username: req.user.username,
        firstName: req.user.firstName,
        lastName: req.user.lastName,
      },
      timestamp: new Date(),
    });

    res.json({
      success: true,
      data: form,
      message: 'Form updated successfully',
    });

  } catch (error) {
    console.error('Error updating form:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update form',
    });
  }
});

/**
 * Example: Form Deletion with Notifications
 * DELETE /api/v1/forms/:id
 */
router.delete('/forms/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const Form = require('../models/Form');
    const form = await Form.findByPk(id);

    if (!form) {
      return res.status(404).json({
        success: false,
        error: 'Form not found',
      });
    }

    // Check permissions
    if (form.createdBy !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'No permission to delete this form',
      });
    }

    // Store form data before deletion
    const formData = {
      id: form.id,
      title: form.title,
      department: form.department,
    };

    await form.destroy();

    // Emit deletion event
    await req.websocket.emit.formDeleted(formData);

    // Notify all collaborators about deletion
    const collaborators = await req.websocket.getFormCollaborationStatus(id);
    if (collaborators && collaborators.length > 0) {
      req.websocket.broadcast.toRoom(`form:${id}`, 'form:deleted', {
        formId: id,
        formTitle: formData.title,
        deletedBy: req.user.username,
        timestamp: new Date(),
      });
    }

    res.json({
      success: true,
      message: 'Form deleted successfully',
    });

  } catch (error) {
    console.error('Error deleting form:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete form',
    });
  }
});

/**
 * Example: Submission Creation with Real-time Updates
 * POST /api/v1/forms/:formId/submissions
 */
router.post('/forms/:formId/submissions', authenticate, async (req, res) => {
  try {
    const { formId } = req.params;
    const submissionData = req.body;

    // Create submission in database
    const Submission = require('../models/Submission');
    const submission = await Submission.create({
      formId,
      data: submissionData,
      submittedBy: req.user.id,
      status: 'submitted',
    });

    // Emit real-time submission event
    await req.websocket.emit.submissionCreated({
      id: submission.id,
      formId,
      data: submissionData,
      status: 'submitted',
    });

    // Broadcast to form watchers
    req.websocket.broadcast.toRoom(`form:${formId}`, 'submission:new', {
      submissionId: submission.id,
      formId,
      submitter: {
        id: req.user.id,
        username: req.user.username,
        firstName: req.user.firstName,
        lastName: req.user.lastName,
      },
      timestamp: new Date(),
    });

    // Notify admins and form creator
    const Form = require('../models/Form');
    const form = await Form.findByPk(formId);

    if (form) {
      await req.websocket.notify.instant({
        templateKey: 'submission.created',
        recipients: [form.createdBy], // Notify form creator
        data: {
          formTitle: form.title,
          submitterName: `${req.user.firstName} ${req.user.lastName}`,
        },
        channels: ['websocket', 'telegram'],
      });
    }

    res.status(201).json({
      success: true,
      data: submission,
      message: 'Submission created successfully',
    });

  } catch (error) {
    console.error('Error creating submission:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create submission',
    });
  }
});

/**
 * Example: User Presence Update
 * POST /api/v1/users/presence
 */
router.post('/users/presence', authenticate, async (req, res) => {
  try {
    const { status, currentForm, activity } = req.body;

    // Update user presence in WebSocket service
    await req.websocket.emit.userPresenceUpdate({
      status,
      currentForm,
      activity,
    });

    res.json({
      success: true,
      message: 'Presence updated successfully',
      data: {
        userId: req.user.id,
        status,
        currentForm,
        updatedAt: new Date(),
      },
    });

  } catch (error) {
    console.error('Error updating presence:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update presence',
    });
  }
});

/**
 * Example: Admin Broadcast Message
 * POST /api/v1/admin/broadcast
 */
router.post('/admin/broadcast', authenticate, async (req, res) => {
  try {
    // Check admin permissions
    if (!['admin', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Admin permissions required',
      });
    }

    const { message, priority = 'medium', targetRoles, targetDepartments } = req.body;

    // Broadcast to specified targets
    if (targetRoles && targetRoles.length > 0) {
      targetRoles.forEach(role => {
        req.websocket.broadcast.toRole(role, 'admin:broadcast', {
          message,
          priority,
          sender: req.user.username,
          timestamp: new Date(),
        });
      });
    }

    if (targetDepartments && targetDepartments.length > 0) {
      targetDepartments.forEach(department => {
        req.websocket.broadcast.toDepartment(department, 'admin:broadcast', {
          message,
          priority,
          sender: req.user.username,
          timestamp: new Date(),
        });
      });
    }

    // Also send notification
    await req.websocket.notify.instant({
      templateKey: null,
      recipients: await getTargetUsers(targetRoles, targetDepartments),
      data: {
        title: 'Admin Announcement',
        body: message,
        priority,
      },
      channels: ['websocket', 'telegram'],
    });

    res.json({
      success: true,
      message: 'Broadcast sent successfully',
      data: {
        targetRoles: targetRoles || [],
        targetDepartments: targetDepartments || [],
        sentAt: new Date(),
      },
    });

  } catch (error) {
    console.error('Error sending broadcast:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send broadcast',
    });
  }
});

/**
 * Helper function to get department members
 */
async function getDepartmentMembers(department) {
  try {
    const User = require('../models/User');
    const users = await User.findAll({
      where: { department, isActive: true },
      attributes: ['id'],
    });
    return users.map(user => user.id);
  } catch (error) {
    console.error('Error getting department members:', error);
    return [];
  }
}

/**
 * Helper function to get target users for broadcast
 */
async function getTargetUsers(targetRoles = [], targetDepartments = []) {
  try {
    const User = require('../models/User');
    const where = { isActive: true };

    if (targetRoles.length > 0) {
      where.role = targetRoles;
    }

    if (targetDepartments.length > 0) {
      where.department = targetDepartments;
    }

    const users = await User.findAll({
      where,
      attributes: ['id'],
    });

    return users.map(user => user.id);
  } catch (error) {
    console.error('Error getting target users:', error);
    return [];
  }
}

module.exports = router;

/**
 * Usage Instructions:
 *
 * 1. Add to your main routes file:
 *    ```javascript
 *    const exampleRoutes = require('./examples/websocket-integration-example');
 *    app.use('/api/v1', exampleRoutes);
 *    ```
 *
 * 2. The middleware automatically adds WebSocket capabilities to req.websocket
 *
 * 3. Available methods:
 *    - req.websocket.emit.*         // Emit events
 *    - req.websocket.notify.*       // Send notifications
 *    - req.websocket.broadcast.*    // Broadcast messages
 *
 * 4. Events are automatically handled by RealtimeEventHandlers
 *
 * 5. All WebSocket operations are non-blocking and handle errors gracefully
 */