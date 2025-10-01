/**
 * Cleanup Unused Users Script
 *
 * Deletes users that have never logged in (no sessions)
 * Keeps only users who have active sessions
 *
 * Safe to run - prompts for confirmation before deletion
 */

const { sequelize } = require('../config/database.config');
const { QueryTypes } = require('sequelize');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

(async () => {
  try {
    console.log('=== User Cleanup Script ===\n');

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
      rl.close();
      process.exit(0);
    }

    console.log(`Found ${unusedUsers.length} users with no sessions (never logged in):\n`);
    unusedUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.username} (${user.email}) - Role: ${user.role}`);
    });

    console.log('\n⚠️  WARNING: This will permanently delete these users!');
    console.log('This action CANNOT be undone.\n');

    const answer = await question('Do you want to delete these users? (yes/no): ');

    if (answer.toLowerCase() !== 'yes') {
      console.log('\n❌ Cleanup cancelled.');
      await sequelize.close();
      rl.close();
      process.exit(0);
    }

    console.log('\n🗑️  Deleting unused users...\n');

    // Delete users with no sessions
    const userIds = unusedUsers.map(u => u.id);

    const deleteQuery = `
      DELETE FROM users
      WHERE id = ANY($1::uuid[])
    `;

    const result = await sequelize.query(deleteQuery, {
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

    await sequelize.close();
    rl.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    await sequelize.close();
    rl.close();
    process.exit(1);
  }
})();
