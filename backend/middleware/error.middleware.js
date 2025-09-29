/**
 * Error Handling Middleware
 * Global error handler for Express application
 */

const logger = require('../utils/logger.util');

/**
 * Custom API Error class
 */
class ApiError extends Error {
  constructor(statusCode, message, code = null, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Error response formatter
 */
function formatErrorResponse(error, req) {
  const response = {
    success: false,
    error: {
      message: error.message || 'Internal server error',
      code: error.code || 'INTERNAL_ERROR',
      timestamp: new Date().toISOString(),
    },
  };

  // Add details if available
  if (error.details) {
    response.error.details = error.details;
  }

  // Add stack trace in development mode
  if (process.env.VERBOSE_ERRORS === 'true' && error.stack) {
    response.error.stack = error.stack;
  }

  // Add request information in debug mode
  if (process.env.DEBUG === 'true') {
    response.error.request = {
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
    };
  }

  return response;
}

/**
 * Main error handling middleware
 */
function errorMiddleware(error, req, res, next) {
  // Log error
  logger.logError(error, req);

  // Default error status code
  let statusCode = error.statusCode || 500;

  // Handle specific error types
  if (error.name === 'ValidationError') {
    statusCode = 400;
    error.code = 'VALIDATION_ERROR';
  } else if (error.name === 'UnauthorizedError' || error.name === 'JsonWebTokenError') {
    statusCode = 401;
    error.code = 'UNAUTHORIZED';
    error.message = 'Invalid or expired authentication token';
  } else if (error.name === 'TokenExpiredError') {
    statusCode = 401;
    error.code = 'TOKEN_EXPIRED';
    error.message = 'Authentication token has expired';
  } else if (error.name === 'SequelizeValidationError') {
    statusCode = 400;
    error.code = 'DATABASE_VALIDATION_ERROR';
    error.details = error.errors.map((e) => ({
      field: e.path,
      message: e.message,
      value: e.value,
    }));
  } else if (error.name === 'SequelizeUniqueConstraintError') {
    statusCode = 409;
    error.code = 'DUPLICATE_ENTRY';
    error.details = error.errors.map((e) => ({
      field: e.path,
      message: `${e.path} already exists`,
      value: e.value,
    }));
  } else if (error.name === 'SequelizeForeignKeyConstraintError') {
    statusCode = 400;
    error.code = 'FOREIGN_KEY_CONSTRAINT';
    error.message = 'Referenced record does not exist';
  } else if (error.code === 'ECONNREFUSED') {
    statusCode = 503;
    error.code = 'SERVICE_UNAVAILABLE';
    error.message = 'Database connection failed';
  } else if (error.type === 'entity.too.large') {
    statusCode = 413;
    error.code = 'PAYLOAD_TOO_LARGE';
    error.message = 'Request payload is too large';
  } else if (error.name === 'MulterError') {
    statusCode = 400;
    error.code = 'FILE_UPLOAD_ERROR';
    if (error.code === 'LIMIT_FILE_SIZE') {
      error.message = 'File size exceeds maximum allowed size';
    } else if (error.code === 'LIMIT_FILE_COUNT') {
      error.message = 'Too many files uploaded';
    } else if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      error.message = 'Unexpected file field';
    }
  }

  // Format and send error response
  const errorResponse = formatErrorResponse(error, req);
  res.status(statusCode).json(errorResponse);
}

/**
 * 404 Not Found handler
 */
function notFoundHandler(req, res, next) {
  const error = new ApiError(404, `Route ${req.method} ${req.path} not found`, 'NOT_FOUND');
  next(error);
}

/**
 * Async error wrapper
 * Wraps async route handlers to catch errors
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// Export middleware and utilities
module.exports = errorMiddleware;
module.exports.ApiError = ApiError;
module.exports.notFoundHandler = notFoundHandler;
module.exports.asyncHandler = asyncHandler;