/**
 * Logging Middleware
 * Request/response logging for debugging and monitoring
 */

const logger = require('../utils/logger.util');

/**
 * Request logging middleware
 * Logs all incoming requests with timing information
 */
function requestLogger(req, res, next) {
  const startTime = Date.now();

  // Log request
  logger.http({
    type: 'request',
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    userId: req.user?.id,
  });

  // Capture response finish
  res.on('finish', () => {
    const duration = Date.now() - startTime;

    logger.http({
      type: 'response',
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userId: req.user?.id,
    });

    // Log slow requests (> 1 second)
    if (duration > 1000) {
      logger.warn({
        type: 'slow_request',
        method: req.method,
        url: req.originalUrl,
        duration: `${duration}ms`,
        threshold: '1000ms',
      });
    }
  });

  next();
}

/**
 * Audit logging middleware
 * Logs specific actions for audit trail
 */
function auditLogger(action, entityType) {
  return (req, res, next) => {
    const originalSend = res.send;

    res.send = function (data) {
      // Only log successful operations (2xx status codes)
      if (res.statusCode >= 200 && res.statusCode < 300) {
        logger.logAudit(
          action,
          req.user?.id,
          entityType,
          req.params.id || res.locals.entityId,
          res.locals.oldValue,
          res.locals.newValue
        );
      }

      originalSend.call(this, data);
    };

    next();
  };
}

module.exports = {
  requestLogger,
  auditLogger,
};