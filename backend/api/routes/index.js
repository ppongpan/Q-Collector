/**
 * API Routes Index
 * Central router configuration for all API endpoints
 */

const express = require('express');
const authRoutes = require('./auth.routes');
const twoFactorRoutes = require('./2fa.routes');
const formRoutes = require('./form.routes');
const submissionRoutes = require('./submission.routes');
const fileRoutes = require('./file.routes');
const userRoutes = require('./user.routes');
const adminRoutes = require('./admin.routes');
const cacheRoutes = require('./cache.routes');
const websocketRoutes = require('./websocket.routes');
const queueRoutes = require('./queue.routes');
const analyticsRoutes = require('./analytics.routes');
const emailRoutes = require('./email.routes');
const telegramRoutes = require('./telegram.routes');

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
 * API Documentation - Redirects to Swagger UI
 */
router.get('/docs', (req, res) => {
  res.redirect('/api/v1/docs');
});

/**
 * Mount route modules
 */
router.use('/auth', authRoutes);
router.use('/2fa', twoFactorRoutes);
router.use('/forms', formRoutes);
router.use('/forms', submissionRoutes); // Nested under forms
router.use('/submissions', submissionRoutes); // Also available at root level
router.use('/files', fileRoutes);
router.use('/users', userRoutes);
router.use('/admin', adminRoutes);
router.use('/cache', cacheRoutes);
router.use('/websocket', websocketRoutes);
router.use('/queue', queueRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/email', emailRoutes);
router.use('/telegram', telegramRoutes);

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