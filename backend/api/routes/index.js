/**
 * API Routes Index
 * Central router configuration for all API endpoints
 */

const express = require('express');
const authRoutes = require('./auth.routes');
const formRoutes = require('./form.routes');
const submissionRoutes = require('./submission.routes');
const fileRoutes = require('./file.routes');

const router = express.Router();

/**
 * API Health Check
 */
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API is healthy',
    timestamp: new Date().toISOString(),
  });
});

/**
 * API Documentation Placeholder
 */
router.get('/docs', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API Documentation',
    version: 'v1',
    endpoints: {
      auth: {
        base: '/api/v1/auth',
        endpoints: [
          'POST /register - Register new user',
          'POST /login - User login',
          'POST /refresh - Refresh access token',
          'POST /logout - User logout',
          'GET /me - Get current user',
          'PUT /profile - Update profile',
          'PUT /password - Change password',
          'GET /sessions - List active sessions',
          'DELETE /sessions - Revoke all sessions',
        ],
      },
      forms: {
        base: '/api/v1/forms',
        endpoints: [
          'GET / - List all forms',
          'POST / - Create new form',
          'GET /:id - Get form details',
          'PUT /:id - Update form',
          'DELETE /:id - Delete form',
          'POST /:id/duplicate - Duplicate form',
          'PATCH /:id/toggle-status - Toggle form status',
        ],
      },
      submissions: {
        base: '/api/v1/forms/:formId/submissions',
        endpoints: [
          'POST /:formId/submissions - Submit form',
          'GET /:formId/submissions - List submissions',
          'GET /submissions/:id - Get submission details',
          'PUT /submissions/:id - Update submission',
          'DELETE /submissions/:id - Delete submission',
          'GET /:formId/submissions/export - Export submissions',
          'PATCH /submissions/:id/status - Update submission status',
        ],
      },
      files: {
        base: '/api/v1/files',
        endpoints: [
          'POST /upload - Upload single file',
          'POST /upload-multiple - Upload multiple files',
          'GET /:id - Get file metadata',
          'GET /:id/download - Download file',
          'DELETE /:id - Delete file',
          'GET / - List files',
          'GET /stats/summary - Get file statistics',
        ],
      },
    },
  });
});

/**
 * Mount route modules
 */
router.use('/auth', authRoutes);
router.use('/forms', formRoutes);
router.use('/forms', submissionRoutes); // Nested under forms
router.use('/submissions', submissionRoutes); // Also available at root level
router.use('/files', fileRoutes);

/**
 * 404 handler for API routes
 */
router.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `API endpoint ${req.method} ${req.path} not found`,
      timestamp: new Date().toISOString(),
    },
  });
});

module.exports = router;