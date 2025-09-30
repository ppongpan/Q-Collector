/**
 * Test Mocks Index
 * Export all mock services
 */

module.exports = {
  database: require('./database.mock'),
  redis: require('./redis.mock'),
  minio: require('./minio.mock'),
};