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

// Import routes (will be created in Phase 2)
// const routes = require('./routes');

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
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// CORS configuration
const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = process.env.CORS_ORIGIN.split(',');

    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.includes('*')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: process.env.CORS_CREDENTIALS === 'true',
  methods: process.env.CORS_METHODS || 'GET,POST,PUT,DELETE,PATCH,OPTIONS',
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 86400, // 24 hours
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
// Health Check Endpoint
// ============================================

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    version: process.env.npm_package_version || '0.4.0',
    services: {
      api: 'operational',
      // These will be checked in a more comprehensive health check
      // database: 'operational',
      // redis: 'operational',
      // minio: 'operational',
    },
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    message: 'Q-Collector API Server',
    version: process.env.npm_package_version || '0.4.0',
    documentation: '/api/v1/docs',
    health: '/health',
  });
});

// ============================================
// API Routes
// ============================================

// API version prefix
const API_PREFIX = `/api/${process.env.API_VERSION || 'v1'}`;

// Placeholder for routes (will be implemented in Phase 2)
app.get(API_PREFIX, (req, res) => {
  res.status(200).json({
    message: 'Q-Collector API v1',
    endpoints: {
      auth: `${API_PREFIX}/auth`,
      users: `${API_PREFIX}/users`,
      forms: `${API_PREFIX}/forms`,
      submissions: `${API_PREFIX}/submissions`,
      files: `${API_PREFIX}/files`,
      audit: `${API_PREFIX}/audit`,
    },
  });
});

// Mount API routes (uncomment when routes are created)
// app.use(API_PREFIX, routes);

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
// Error Handling Middleware
// ============================================

// Must be last middleware
app.use(errorMiddleware);

// ============================================
// Export App
// ============================================

module.exports = app;