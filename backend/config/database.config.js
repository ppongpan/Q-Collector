/**
 * Database Configuration
 * Sequelize ORM setup for PostgreSQL
 */

// Load environment variables
require('dotenv').config();

const { Sequelize } = require('sequelize');
const logger = require('../utils/logger.util');

// Get database configuration from environment variables
const config = {
  database: process.env.POSTGRES_DB || 'qcollector_db',
  username: process.env.POSTGRES_USER || 'qcollector',
  password: process.env.POSTGRES_PASSWORD || 'your_secure_password_here',
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
  dialect: 'postgres',

  // Connection pool settings
  pool: {
    min: parseInt(process.env.DB_POOL_MIN || '2', 10),
    max: parseInt(process.env.DB_POOL_MAX || '10', 10),
    idle: parseInt(process.env.DB_POOL_IDLE || '10000', 10),
    acquire: 30000,
    evict: 10000,
  },

  // Logging
  logging: process.env.DEBUG_SQL === 'true' ? (msg) => logger.debug(msg) : false,

  // Timezone
  timezone: '+00:00', // UTC

  // Additional options
  define: {
    timestamps: true,
    underscored: false,
    freezeTableName: true,
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci',
  },

  // Disable deprecation warnings
  dialectOptions: {
    ssl: process.env.DB_SSL === 'true' ? {
      require: true,
      rejectUnauthorized: false,
    } : false,
  },
};

// Create Sequelize instance
const sequelize = new Sequelize(
  config.database,
  config.username,
  config.password,
  {
    host: config.host,
    port: config.port,
    dialect: config.dialect,
    pool: config.pool,
    logging: config.logging,
    timezone: config.timezone,
    define: config.define,
    dialectOptions: config.dialectOptions,
  }
);

/**
 * Test database connection
 */
async function testDatabaseConnection() {
  try {
    await sequelize.authenticate();
    logger.info('Database connection established successfully');
    return true;
  } catch (error) {
    logger.error('Unable to connect to database:', error.message);
    throw error;
  }
}

/**
 * Initialize database (run migrations)
 * This should be called when the application starts
 */
async function initializeDatabase() {
  try {
    // Test connection first
    await testDatabaseConnection();

    // Sync models (only in development, use migrations in production)
    if (process.env.NODE_ENV === 'development' && process.env.DB_AUTO_SYNC === 'true') {
      await sequelize.sync({ alter: true });
      logger.info('Database models synchronized');
    }

    return true;
  } catch (error) {
    logger.error('Database initialization failed:', error);
    throw error;
  }
}

/**
 * Close database connection
 */
async function closeDatabaseConnection() {
  try {
    await sequelize.close();
    logger.info('Database connection closed');
  } catch (error) {
    logger.error('Error closing database connection:', error);
    throw error;
  }
}

// Export sequelize instance and utility functions
module.exports = {
  sequelize,
  Sequelize,
  testDatabaseConnection,
  initializeDatabase,
  closeDatabaseConnection,
  config,

  // Sequelize CLI compatibility
  development: config,
  test: config,
  production: config,
};