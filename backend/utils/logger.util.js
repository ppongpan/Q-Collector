/**
 * Logger Utility
 * Winston logger configuration for application logging
 */

const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Get configuration from environment
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const LOG_FILE = process.env.LOG_FILE || 'logs/app.log';
const LOG_ERROR_FILE = process.env.LOG_ERROR_FILE || 'logs/error.log';
const LOG_MAX_SIZE = parseInt(process.env.LOG_MAX_SIZE || '10485760', 10); // 10MB
const LOG_MAX_FILES = parseInt(process.env.LOG_MAX_FILES || '10', 10);
const LOG_CONSOLE = process.env.LOG_CONSOLE !== 'false';
const NODE_ENV = process.env.NODE_ENV || 'development';

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Define console format (prettier for development)
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let msg = `${timestamp} [${level}]: ${message}`;

    // Add metadata if present
    if (Object.keys(meta).length > 0) {
      msg += `\n${JSON.stringify(meta, null, 2)}`;
    }

    return msg;
  })
);

// Define transports
const transports = [];

// Console transport
if (LOG_CONSOLE) {
  transports.push(
    new winston.transports.Console({
      format: NODE_ENV === 'development' ? consoleFormat : logFormat,
    })
  );
}

// File transport for all logs
transports.push(
  new winston.transports.File({
    filename: LOG_FILE,
    format: logFormat,
    maxsize: LOG_MAX_SIZE,
    maxFiles: LOG_MAX_FILES,
    tailable: true,
  })
);

// File transport for error logs only
transports.push(
  new winston.transports.File({
    filename: LOG_ERROR_FILE,
    level: 'error',
    format: logFormat,
    maxsize: LOG_MAX_SIZE,
    maxFiles: LOG_MAX_FILES,
    tailable: true,
  })
);

// Create Winston logger
const logger = winston.createLogger({
  level: LOG_LEVEL,
  format: logFormat,
  transports,
  exitOnError: false,
});

// Add stream for Morgan HTTP logging
logger.stream = {
  write: (message) => {
    logger.http(message.trim());
  },
};

// Helper methods for common logging patterns
logger.logRequest = (req, statusCode, responseTime) => {
  logger.http({
    method: req.method,
    url: req.originalUrl,
    statusCode,
    responseTime: `${responseTime}ms`,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });
};

logger.logError = (error, req = null) => {
  const errorLog = {
    message: error.message,
    stack: error.stack,
    code: error.code,
  };

  if (req) {
    errorLog.request = {
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      userId: req.user?.id,
    };
  }

  logger.error(errorLog);
};

logger.logAudit = (action, userId, entityType, entityId, oldValue = null, newValue = null) => {
  logger.info({
    type: 'audit',
    action,
    userId,
    entityType,
    entityId,
    oldValue,
    newValue,
    timestamp: new Date().toISOString(),
  });
};

logger.logPerformance = (operation, duration, metadata = {}) => {
  logger.info({
    type: 'performance',
    operation,
    duration: `${duration}ms`,
    ...metadata,
  });
};

// Log unhandled errors
if (NODE_ENV !== 'test') {
  logger.info('Logger initialized', {
    level: LOG_LEVEL,
    environment: NODE_ENV,
    logFile: LOG_FILE,
    errorFile: LOG_ERROR_FILE,
  });
}

module.exports = logger;