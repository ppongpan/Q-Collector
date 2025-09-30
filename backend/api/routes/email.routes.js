/**
 * Email Routes
 * Email management and notification API endpoints
 */

const express = require('express');
const router = express.Router();
const { body, query, validationResult } = require('express-validator');
const emailService = require('../../services/EmailService');
const { authenticate, authorize } = require('../../middleware/auth.middleware');
const logger = require('../../utils/logger.util');

/**
 * @swagger
 * tags:
 *   name: Email
 *   description: Email notification and management API
 */

/**
 * @swagger
 * /email/status:
 *   get:
 *     summary: Get email service status
 *     tags: [Email]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Email service status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     initialized:
 *                       type: boolean
 *                     connected:
 *                       type: boolean
 *                     templates:
 *                       type: integer
 *                     config:
 *                       type: object
 */
router.get('/status',
  authenticate,
  authorize('admin', 'super_admin'),
  async (req, res) => {
    try {
      const status = await emailService.getStatus();

      res.json({
        success: true,
        data: status
      });
    } catch (error) {
      logger.error('Failed to get email service status:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'EMAIL_STATUS_ERROR',
          message: 'Failed to retrieve email service status',
          details: error.message
        }
      });
    }
  }
);

/**
 * @swagger
 * /email/health:
 *   get:
 *     summary: Email service health check
 *     tags: [Email]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Health check result
 */
router.get('/health',
  authenticate,
  authorize('admin', 'super_admin'),
  async (req, res) => {
    try {
      const health = await emailService.healthCheck();

      res.status(health.status === 'healthy' ? 200 : 503).json({
        success: health.status === 'healthy',
        data: health
      });
    } catch (error) {
      logger.error('Email health check failed:', error);
      res.status(503).json({
        success: false,
        error: {
          code: 'EMAIL_HEALTH_CHECK_FAILED',
          message: 'Email health check failed',
          details: error.message
        }
      });
    }
  }
);

/**
 * @swagger
 * /email/send:
 *   post:
 *     summary: Send single email
 *     tags: [Email]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - to
 *               - subject
 *             properties:
 *               to:
 *                 type: string
 *                 format: email
 *               subject:
 *                 type: string
 *               text:
 *                 type: string
 *               html:
 *                 type: string
 *               template:
 *                 type: string
 *               data:
 *                 type: object
 *               attachments:
 *                 type: array
 *     responses:
 *       200:
 *         description: Email sent successfully
 */
router.post('/send',
  authenticate,
  authorize('admin', 'super_admin', 'moderator'),
  [
    body('to').isEmail().withMessage('Valid email address required'),
    body('subject').notEmpty().withMessage('Subject is required'),
    body('text').optional().isString(),
    body('html').optional().isString(),
    body('template').optional().isString(),
    body('data').optional().isObject(),
    body('attachments').optional().isArray()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid email parameters',
            details: errors.array()
          }
        });
      }

      const { to, subject, text, html, template, data, attachments } = req.body;

      // Validate that either text/html or template is provided
      if (!text && !html && !template) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'CONTENT_REQUIRED',
            message: 'Either text, html, or template must be provided'
          }
        });
      }

      const result = await emailService.sendEmail({
        to,
        subject,
        text,
        html,
        template,
        data,
        attachments
      });

      logger.info(`Email sent via API by ${req.user.username}`, {
        to,
        subject,
        template,
        userId: req.user.id
      });

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Failed to send email via API:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'EMAIL_SEND_ERROR',
          message: 'Failed to send email',
          details: error.message
        }
      });
    }
  }
);

/**
 * @swagger
 * /email/send/batch:
 *   post:
 *     summary: Send batch emails
 *     tags: [Email]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - emails
 *             properties:
 *               emails:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     to:
 *                       type: string
 *                       format: email
 *                     subject:
 *                       type: string
 *                     text:
 *                       type: string
 *                     html:
 *                       type: string
 *                     template:
 *                       type: string
 *                     data:
 *                       type: object
 *               options:
 *                 type: object
 *                 properties:
 *                   batchSize:
 *                     type: integer
 *                     default: 10
 *                   delay:
 *                     type: integer
 *                     default: 1000
 *     responses:
 *       200:
 *         description: Batch emails queued successfully
 */
router.post('/send/batch',
  authenticate,
  authorize('admin', 'super_admin'),
  [
    body('emails').isArray({ min: 1 }).withMessage('Emails array is required'),
    body('emails.*.to').isEmail().withMessage('Valid email address required for each email'),
    body('emails.*.subject').notEmpty().withMessage('Subject is required for each email'),
    body('options.batchSize').optional().isInt({ min: 1, max: 100 }),
    body('options.delay').optional().isInt({ min: 0 })
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid batch email parameters',
            details: errors.array()
          }
        });
      }

      const { emails, options = {} } = req.body;

      // Validate each email has content
      for (let i = 0; i < emails.length; i++) {
        const email = emails[i];
        if (!email.text && !email.html && !email.template) {
          return res.status(400).json({
            success: false,
            error: {
              code: 'CONTENT_REQUIRED',
              message: `Email ${i + 1}: Either text, html, or template must be provided`
            }
          });
        }
      }

      const result = await emailService.sendBatchEmails(emails, options);

      logger.info(`Batch email sent via API by ${req.user.username}`, {
        emailCount: emails.length,
        batchSize: options.batchSize || 10,
        userId: req.user.id
      });

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Failed to send batch emails via API:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'BATCH_EMAIL_ERROR',
          message: 'Failed to send batch emails',
          details: error.message
        }
      });
    }
  }
);

/**
 * @swagger
 * /email/test:
 *   post:
 *     summary: Send test email
 *     tags: [Email]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - to
 *             properties:
 *               to:
 *                 type: string
 *                 format: email
 *               template:
 *                 type: string
 *                 default: welcome
 *     responses:
 *       200:
 *         description: Test email sent successfully
 */
router.post('/test',
  authenticate,
  authorize('super_admin'),
  [
    body('to').isEmail().withMessage('Valid email address required'),
    body('template').optional().isString()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid test email parameters',
            details: errors.array()
          }
        });
      }

      const { to, template = 'welcome' } = req.body;

      const result = await emailService.sendEmail({
        to,
        subject: `Q-Collector Email Test - ${new Date().toLocaleString()}`,
        template,
        data: {
          name: 'Test User',
          username: 'test',
          email: to,
          department: 'Testing',
          role: 'Test User'
        }
      });

      logger.info(`Test email sent via API by ${req.user.username}`, {
        to,
        template,
        userId: req.user.id
      });

      res.json({
        success: true,
        data: {
          ...result,
          message: 'Test email sent successfully'
        }
      });
    } catch (error) {
      logger.error('Failed to send test email:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'TEST_EMAIL_ERROR',
          message: 'Failed to send test email',
          details: error.message
        }
      });
    }
  }
);

/**
 * @swagger
 * /email/templates:
 *   get:
 *     summary: List available email templates
 *     tags: [Email]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of available templates
 */
router.get('/templates',
  authenticate,
  authorize('admin', 'super_admin', 'moderator'),
  async (req, res) => {
    try {
      const templates = Array.from(emailService.templates.keys());

      res.json({
        success: true,
        data: {
          templates,
          count: templates.length
        }
      });
    } catch (error) {
      logger.error('Failed to get email templates:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'TEMPLATES_ERROR',
          message: 'Failed to retrieve email templates',
          details: error.message
        }
      });
    }
  }
);

/**
 * @swagger
 * /email/templates/preview:
 *   post:
 *     summary: Preview email template with data
 *     tags: [Email]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - template
 *             properties:
 *               template:
 *                 type: string
 *               data:
 *                 type: object
 *     responses:
 *       200:
 *         description: Template preview rendered
 */
router.post('/templates/preview',
  authenticate,
  authorize('admin', 'super_admin', 'moderator'),
  [
    body('template').notEmpty().withMessage('Template name is required'),
    body('data').optional().isObject()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid preview parameters',
            details: errors.array()
          }
        });
      }

      const { template, data = {} } = req.body;

      // Add sample data if not provided
      const sampleData = {
        name: 'John Doe',
        username: 'johndoe',
        email: 'john@example.com',
        department: 'Sample Department',
        role: 'Sample Role',
        formTitle: 'Sample Form',
        submissionId: 'SUB-12345',
        submittedBy: 'Sample User',
        submittedAt: new Date().toISOString(),
        resetToken: 'SAMPLE-TOKEN-123',
        expiresAt: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
        ...data
      };

      const rendered = await emailService.renderTemplate(template, sampleData);

      res.json({
        success: true,
        data: {
          template,
          rendered,
          sampleData
        }
      });
    } catch (error) {
      logger.error('Failed to preview email template:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'TEMPLATE_PREVIEW_ERROR',
          message: 'Failed to preview email template',
          details: error.message
        }
      });
    }
  }
);

/**
 * @swagger
 * /email/notifications/form-submission:
 *   post:
 *     summary: Send form submission notification
 *     tags: [Email]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - formId
 *               - submissionId
 *               - recipients
 *             properties:
 *               formId:
 *                 type: string
 *               submissionId:
 *                 type: string
 *               recipients:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: email
 *     responses:
 *       200:
 *         description: Notification sent successfully
 */
router.post('/notifications/form-submission',
  authenticate,
  authorize('admin', 'super_admin', 'moderator'),
  [
    body('formId').notEmpty().withMessage('Form ID is required'),
    body('submissionId').notEmpty().withMessage('Submission ID is required'),
    body('recipients').isArray({ min: 1 }).withMessage('At least one recipient is required'),
    body('recipients.*').isEmail().withMessage('All recipients must be valid email addresses')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid notification parameters',
            details: errors.array()
          }
        });
      }

      const { formId, submissionId, recipients } = req.body;

      // Here you would typically fetch form and submission data
      // For now, we'll use placeholder data
      const emailPromises = recipients.map(to =>
        emailService.sendEmail({
          to,
          template: 'form-submission',
          data: {
            formTitle: `Form ${formId}`,
            submissionId,
            submittedBy: req.user.username,
            submittedAt: new Date().toISOString(),
            formVersion: '1.0',
            hasAttachments: false
          }
        })
      );

      const results = await Promise.allSettled(emailPromises);
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      logger.info(`Form submission notification sent by ${req.user.username}`, {
        formId,
        submissionId,
        recipients: recipients.length,
        successful,
        failed,
        userId: req.user.id
      });

      res.json({
        success: true,
        data: {
          total: recipients.length,
          successful,
          failed,
          message: 'Form submission notifications processed'
        }
      });
    } catch (error) {
      logger.error('Failed to send form submission notification:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'NOTIFICATION_ERROR',
          message: 'Failed to send form submission notification',
          details: error.message
        }
      });
    }
  }
);

module.exports = router;