/**
 * Q-Collector Backend Application
 * Express app configuration and middleware setup
 */

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const compression = require('compression');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Import utilities and middleware
const logger = require('../utils/logger.util');
const errorMiddleware = require('../middleware/error.middleware');
const { requestLogger } = require('../middleware/logging.middleware');
const { cacheMiddleware, cacheBypassMiddleware, cacheWarmupMiddleware } = require('../middleware/cache.middleware');
const { globalRateLimiter } = require('../middleware/rateLimit.middleware');

// Import routes
const routes = require('./routes');

// Import Swagger configuration
const { setupSwagger } = require('../config/swagger');

// Import services
const queueService = require('../services/QueueService');
const emailService = require('../services/EmailService');
const processorService = require('../services/ProcessorService');

// Create Express application
const app = express();

// ============================================
// Trust Proxy
// ============================================
// Enable if behind a reverse proxy (nginx, load balancer)
if (process.env.TRUST_PROXY === 'true') {
  app.set('trust proxy', 1);
}

// ============================================
// Security Middleware
// ============================================

// Helmet for security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      frameSrc: ["'self'"],
      frameAncestors: ["'self'"], // ✅ Replaces X-Frame-Options
    },
  },
  crossOriginEmbedderPolicy: false,
  xssFilter: false, // ✅ Disable deprecated X-XSS-Protection
}));

// CORS configuration
const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = process.env.CORS_ORIGIN.split(',').map(o => o.trim());

    // Allow requests with no origin (mobile apps, curl, Postman, React proxy)
    if (!origin) {
      logger.debug('CORS: Request with no origin - ALLOWED');
      return callback(null, true);
    }

    // Remove trailing slash from origin for comparison
    const normalizedOrigin = origin.endsWith('/') ? origin.slice(0, -1) : origin;
    const normalizedAllowed = allowedOrigins.map(o => o.endsWith('/') ? o.slice(0, -1) : o);

    // Check if origin is in allowed list (with or without trailing slash)
    if (normalizedAllowed.indexOf(normalizedOrigin) !== -1 || allowedOrigins.includes('*')) {
      logger.debug(`CORS: Origin ${origin} - ALLOWED`);
      callback(null, true);
    } else {
      logger.error(`CORS: Origin ${origin} - BLOCKED (allowed: ${allowedOrigins.join(', ')})`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: process.env.CORS_CREDENTIALS === 'true',
  methods: process.env.CORS_METHODS || 'GET,POST,PUT,DELETE,PATCH,OPTIONS',
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 86400 // 24 hours
};

app.use(cors(corsOptions));

// ============================================
// Body Parsing Middleware
// ============================================

// Parse JSON bodies
app.use(express.json({ limit: '10mb' }));

// Parse URL-encoded bodies
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ============================================
// Compression Middleware
// ============================================

// Compress all responses
app.use(compression());

// ============================================
// Cache Control Middleware
// ============================================

// Set Cache-Control headers (replaces deprecated Expires header)
app.use((req, res, next) => {
  // Static assets - cache 1 year with immutable flag
  if (req.url.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/)) {
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  }
  // HTML - no cache
  else if (req.url.match(/\.html$/)) {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  }
  // API responses - no cache by default
  else if (req.url.startsWith('/api/')) {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  }
  next();
});

// ============================================
// Logging Middleware
// ============================================

// Morgan HTTP request logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', {
    stream: {
      write: (message) => logger.http(message.trim()),
    },
  }));
}

// Custom request logging middleware
if (process.env.ENABLE_REQUEST_LOG === 'true') {
  app.use(requestLogger);
}

// ============================================
// Cache Middleware
// ============================================

// Cache bypass middleware (check for bypass headers)
app.use(cacheBypassMiddleware());

// Cache warmup tracking middleware
if (process.env.CACHE_WARMUP_ENABLED === 'true') {
  app.use(cacheWarmupMiddleware({ enabled: true }));
}

// ============================================
// Health Check Endpoint
// ============================================

app.get('/health', async (req, res) => {
  try {
    const healthData = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
      version: process.env.npm_package_version || '0.4.0',
      services: {
        api: 'operational',
      },
    };

    // Check Redis/Cache health if available
    try {
      const cacheService = require('../services/CacheService');
      const cacheHealth = await cacheService.healthCheck();
      healthData.services.redis = cacheHealth.status === 'healthy' ? 'operational' : 'degraded';
      healthData.services.cache = cacheHealth.status === 'healthy' ? 'operational' : 'degraded';
    } catch (error) {
      healthData.services.redis = 'unavailable';
      healthData.services.cache = 'unavailable';
    }

    // Check Queue health if available
    try {
      const queueHealth = await queueService.healthCheck();
      healthData.services.queue = queueHealth.status === 'healthy' ? 'operational' : 'degraded';
    } catch (error) {
      healthData.services.queue = 'unavailable';
    }

    // Check Email service health if available
    try {
      const emailHealth = await emailService.healthCheck();
      healthData.services.email = emailHealth.status === 'healthy' ? 'operational' : 'degraded';
    } catch (error) {
      healthData.services.email = 'unavailable';
    }

    // Overall status based on critical services
    const criticalServices = ['api'];
    const allOperational = criticalServices.every(
      service => healthData.services[service] === 'operational'
    );

    if (!allOperational) {
      healthData.status = 'degraded';
    }

    const statusCode = healthData.status === 'ok' ? 200 : 503;
    res.status(statusCode).json(healthData);
  } catch (error) {
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error.message,
      services: {
        api: 'error',
      },
    });
  }
});

// Root endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    message: 'Q-Collector API Server',
    version: process.env.npm_package_version || '0.4.1',
    documentation: '/api/v1/docs',
    openapi: '/api/v1/docs.json',
    postman: '/api/v1/docs/postman',
    health: '/health',
  });
});

// ============================================
// API Routes
// ============================================

// API version prefix
const API_PREFIX = `/api/${process.env.API_VERSION || 'v1'}`;

// ============================================
// API Cache Configuration
// ============================================

// Apply caching to specific API routes
if (process.env.CACHE_ENABLED === 'true') {
  // Cache GET requests with default settings
  app.use(API_PREFIX, cacheMiddleware({
    includeUser: false, // Don't include user ID in cache key for public endpoints
    cacheAllMethods: false, // Only cache GET requests
  }));

  logger.info('API response caching enabled');
} else {
  logger.info('API response caching disabled');
}

// ============================================
// API Documentation (Swagger)
// ============================================

// Setup Swagger UI documentation (must be before API routes)
if (process.env.NODE_ENV !== 'production' || process.env.ENABLE_DOCS === 'true') {
  setupSwagger(app);
  logger.info('API documentation enabled at /api/v1/docs');
} else {
  logger.info('API documentation disabled in production');
}

// ============================================
// Rate Limiting
// ============================================

// Apply global rate limiter to all API routes
app.use(API_PREFIX, globalRateLimiter);
logger.info('Global rate limiting enabled (100 requests per 15 minutes per IP)');

// Mount API routes
app.use(API_PREFIX, routes);

logger.info(`API routes mounted at ${API_PREFIX}`);

// ============================================
// 404 Handler
// ============================================

app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
      timestamp: new Date().toISOString(),
    },
  });
});

// ============================================
// Background Services Initialization
// ============================================

// Initialize background services (async)
const initializeServices = async () => {
  try {
    logger.info('Initializing background services...');

    // Initialize email service
    if (process.env.ENABLE_EMAIL_SERVICE !== 'false') {
      try {
        await emailService.initialize();
        logger.info('Email service initialized successfully');
      } catch (error) {
        logger.warn('Email service initialization failed:', error.message);
        // Continue without email service
      }
    }

    // Initialize queue service
    if (process.env.ENABLE_QUEUE_SERVICE !== 'false') {
      try {
        await queueService.initialize();
        logger.info('Queue service initialized successfully');

        // Initialize processors
        await processorService.initialize();
        logger.info('Processor service initialized successfully');
      } catch (error) {
        logger.warn('Queue/Processor service initialization failed:', error.message);
        // Continue without queue service
      }
    }

    logger.info('Background services initialization completed');
  } catch (error) {
    logger.error('Critical error during service initialization:', error);
    // Don't exit process, continue with degraded functionality
  }
};

// Initialize services when app starts
if (process.env.NODE_ENV !== 'test') {
  // Use setImmediate to ensure this runs after the module exports
  setImmediate(() => {
    initializeServices().catch(error => {
      logger.error('Service initialization failed:', error);
    });
  });
}

// Export initialization function for manual use
app.initializeServices = initializeServices;

// ============================================
// Error Handling Middleware
// ============================================

// Must be last middleware
app.use(errorMiddleware);

// ============================================
// Export App
// ============================================

module.exports = app;
