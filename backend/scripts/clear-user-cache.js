/**
 * Clear User Cache Script
 * Manually clears all cached user data to force refresh
 */

const Redis = require('ioredis');
const config = require('../config/database.config');

async function clearUserCache() {
  const redis = new Redis(config.redis);

  try {
    console.log('🔄 Clearing user cache...\n');

    // Clear all db:users:* keys (user list cache)
    const userKeys = await redis.keys('db:users:*');
    console.log(`Found ${userKeys.length} db:users:* keys`);
    if (userKeys.length > 0) {
      await redis.del(...userKeys);
      console.log(`✅ Deleted ${userKeys.length} db:users:* keys`);
    }

    // Clear all user:* keys (individual user cache)
    const individualKeys = await redis.keys('user:*');
    console.log(`Found ${individualKeys.length} user:* keys`);
    if (individualKeys.length > 0) {
      await redis.del(...individualKeys);
      console.log(`✅ Deleted ${individualKeys.length} user:* keys`);
    }

    // Clear all tag sets
    const tagKeys = await redis.keys('tag:*');
    console.log(`Found ${tagKeys.length} tag:* keys`);
    if (tagKeys.length > 0) {
      await redis.del(...tagKeys);
      console.log(`✅ Deleted ${tagKeys.length} tag:* keys`);
    }

    console.log('\n✅ User cache cleared successfully!');
    console.log('📋 Next user list request will fetch fresh data from database');

  } catch (error) {
    console.error('❌ Error clearing cache:', error);
    throw error;
  } finally {
    await redis.quit();
    process.exit(0);
  }
}

// Run the script
clearUserCache()
  .catch(error => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
