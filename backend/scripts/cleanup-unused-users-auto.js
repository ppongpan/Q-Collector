/**
 * Automatic User Cleanup Script
 *
 * Deletes users that have never logged in (no sessions)
 * Keeps only users who have active sessions
 *
 * Runs automatically without confirmation
 */

const { sequelize } = require('../config/database.config');
const { QueryTypes } = require('sequelize');

(async () => {
  try {
    console.log('=== User Cleanup Script (Auto) ===\n');

    // Find users with no sessions (never logged in)
    const unusedUsers = await sequelize.query(`
      SELECT u.id, u.username, u.email, u.role
      FROM users u
      WHERE u.id NOT IN (SELECT DISTINCT user_id FROM sessions)
      ORDER BY u.username ASC
    `, { type: QueryTypes.SELECT });

    if (unusedUsers.length === 0) {
      console.log('✅ No unused users found. All users have at least one session.');
      await sequelize.close();
      process.exit(0);
    }

    console.log(`Found ${unusedUsers.length} users with no sessions (never logged in):\n`);
    unusedUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.username} (${user.email}) - Role: ${user.role}`);
    });

    console.log('\n🗑️  Deleting unused users...\n');

    // Delete users with no sessions
    const userIds = unusedUsers.map(u => u.id);

    const deleteQuery = `
      DELETE FROM users
      WHERE id = ANY($1::uuid[])
    `;

    await sequelize.query(deleteQuery, {
      bind: [userIds],
      type: QueryTypes.DELETE
    });

    console.log(`✅ Successfully deleted ${unusedUsers.length} users.\n`);

    // Show remaining users
    const remainingUsers = await sequelize.query(`
      SELECT username, email, role
      FROM users
      ORDER BY username ASC
    `, { type: QueryTypes.SELECT });

    console.log('=== Remaining Users ===\n');
    remainingUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.username} (${user.email}) - Role: ${user.role}`);
    });

    console.log(`\nTotal remaining users: ${remainingUsers.length}`);

    // Verify counts after cleanup
    console.log('\n=== Verification ===\n');
    const usersCount = await sequelize.query('SELECT COUNT(*) as count FROM users', { type: QueryTypes.SELECT });
    const sessionsCount = await sequelize.query('SELECT COUNT(DISTINCT user_id) as count FROM sessions', { type: QueryTypes.SELECT });
    console.log('Users in database:', usersCount[0].count);
    console.log('Users with sessions:', sessionsCount[0].count);
    console.log('Match:', usersCount[0].count === sessionsCount[0].count ? '✅ YES' : '❌ NO');

    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    await sequelize.close();
    process.exit(1);
  }
})();
