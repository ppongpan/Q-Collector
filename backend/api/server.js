/**
 * Q-Collector Backend Server
 * Main server entry point
 *
 * This file starts the Express server and handles graceful shutdown
 */

const app = require('./app');
const logger = require('../utils/logger.util');
const { testDatabaseConnection } = require('../config/database.config');
const { testRedisConnection } = require('../config/redis.config');
const { testMinIOConnection } = require('../config/minio.config');

// Import WebSocket services
const webSocketService = require('../services/WebSocketService');
const notificationService = require('../services/NotificationService');
const realtimeEventHandlers = require('../services/RealtimeEventHandlers');
const webSocketIntegration = require('../utils/websocket-integration.util');

// Get port from environment variable or default to 5000
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Store server instance for graceful shutdown
let server;

/**
 * Test all service connections before starting server
 */
async function testConnections() {
  logger.info('Testing service connections...');

  try {
    // Test PostgreSQL connection
    await testDatabaseConnection();
    logger.info('PostgreSQL connection successful');

    // Test Redis connection
    await testRedisConnection();
    logger.info('Redis connection successful');

    // Test MinIO connection
    await testMinIOConnection();
    logger.info('MinIO connection successful');

    logger.info('All service connections successful!');
    return true;
  } catch (error) {
    logger.error('Service connection test failed:', error);
    return false;
  }
}

/**
 * Start the Express server
 */
async function startServer() {
  try {
    // Test connections first
    const connectionsOk = await testConnections();

    if (!connectionsOk) {
      logger.error('Cannot start server - service connections failed');
      process.exit(1);
    }

    // Start listening
    server = app.listen(PORT, async () => {
      logger.info('='.repeat(60));
      logger.info(`Q-Collector API Server v${process.env.npm_package_version || '0.4.0'}`);
      logger.info('='.repeat(60));
      logger.info(`Environment: ${NODE_ENV}`);
      logger.info(`Server running on port: ${PORT}`);
      logger.info(`API URL: http://localhost:${PORT}/api/v1`);
      logger.info(`Health check: http://localhost:${PORT}/health`);

      // Initialize WebSocket services
      try {
        await webSocketService.initialize(server);
        notificationService.initialize(webSocketService);
        realtimeEventHandlers.initialize(webSocketService, notificationService);
        webSocketIntegration.initialize(webSocketService, notificationService, realtimeEventHandlers);
        logger.info(`WebSocket server running on port: ${PORT}`);
        logger.info(`Real-time features: Enabled`);
      } catch (error) {
        logger.error('Failed to initialize WebSocket services:', error);
      }

      logger.info('='.repeat(60));
    });

    // Handle server errors
    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        logger.error(`Port ${PORT} is already in use`);
      } else {
        logger.error('Server error:', error);
      }
      process.exit(1);
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

/**
 * Graceful shutdown handler
 */
async function gracefulShutdown(signal) {
  logger.info(`${signal} received. Starting graceful shutdown...`);

  if (server) {
    server.close(async () => {
      logger.info('HTTP server closed');

      try {
        // Shutdown WebSocket services
        await webSocketService.shutdown();
        await notificationService.shutdown();
        logger.info('WebSocket services closed');

        // Close database connection
        const { sequelize } = require('../config/database.config');
        await sequelize.close();
        logger.info('Database connection closed');

        // Close Redis connection
        const { redisClient } = require('../config/redis.config');
        await redisClient.quit();
        logger.info('Redis connection closed');

        logger.info('Graceful shutdown completed');
        process.exit(0);
      } catch (error) {
        logger.error('Error during graceful shutdown:', error);
        process.exit(1);
      }
    });

    // Force shutdown after 30 seconds
    setTimeout(() => {
      logger.error('Forcing shutdown after 30 seconds...');
      process.exit(1);
    }, 30000);
  } else {
    process.exit(0);
  }
}

/**
 * Handle unhandled promise rejections
 */
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Promise Rejection:', reason);
  // In production, you might want to gracefully shutdown here
  if (NODE_ENV === 'production') {
    gracefulShutdown('UNHANDLED_REJECTION');
  }
});

/**
 * Handle uncaught exceptions
 */
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  // Always exit on uncaught exceptions
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

/**
 * Handle termination signals
 */
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

/**
 * Start the server
 */
startServer();

// Export server for testing
module.exports = server;