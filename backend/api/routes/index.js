/**
 * API Routes Index
 * Central router configuration for all API endpoints
 */

const express = require('express');
const authRoutes = require('./auth.routes');
const twoFactorRoutes = require('./2fa.routes');
const formRoutes = require('./form.routes');
const submissionRoutes = require('./submission.routes');
const subformRoutes = require('./subform.routes');
const fileRoutes = require('./file.routes');
const userRoutes = require('./user.routes');
const adminRoutes = require('./admin.routes');
const cacheRoutes = require('./cache.routes');
const websocketRoutes = require('./websocket.routes');
const queueRoutes = require('./queue.routes');
const analyticsRoutes = require('./analytics.routes');
const emailRoutes = require('./email.routes');
const telegramRoutes = require('./telegram.routes');
const telegramSettingsRoutes = require('./telegram-settings.routes');
const migrationRoutes = require('./migration.routes');
const { requireCompletedSetup } = require('../../middleware/auth.middleware');

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
// Auth and 2FA routes - no 2FA setup check required
router.use('/auth', authRoutes);
router.use('/2fa', twoFactorRoutes);

// Apply authentication to all protected routes
// This middleware verifies JWT and sets req.user
const { authenticate } = require('../../middleware/auth.middleware');
router.use(authenticate);

// Apply 2FA setup check to all other protected routes
// This middleware blocks access if user has requires_2fa_setup = true
router.use(requireCompletedSetup);

// Protected routes - require completed 2FA setup and authentication
router.use('/forms', formRoutes);
router.use('/forms', submissionRoutes); // Nested under forms
router.use('/submissions', submissionRoutes); // Also available at root level
router.use('/subforms', subformRoutes); // Sub-form submissions
router.use('/files', fileRoutes);
router.use('/users', userRoutes);
router.use('/admin', adminRoutes);
router.use('/cache', cacheRoutes);
router.use('/websocket', websocketRoutes);
router.use('/queue', queueRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/email', emailRoutes);
router.use('/telegram', telegramRoutes);
router.use('/telegram-settings', telegramSettingsRoutes);
router.use('/migrations', migrationRoutes);

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