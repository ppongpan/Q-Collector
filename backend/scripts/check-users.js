const { sequelize } = require('../config/database.config');
const { QueryTypes } = require('sequelize');

(async () => {
  try {
    console.log('=== Checking User Counts ===\n');

    // Users table
    const usersCount = await sequelize.query('SELECT COUNT(*) as count FROM users', { type: QueryTypes.SELECT });
    console.log('Users table:', usersCount[0].count);

    // Users with sessions
    const sessionsCount = await sequelize.query('SELECT COUNT(DISTINCT user_id) as count FROM sessions', { type: QueryTypes.SELECT });
    console.log('Distinct users in sessions:', sessionsCount[0].count);

    // Check if trusted_devices table exists
    try {
      const trustedDevicesCount = await sequelize.query('SELECT COUNT(DISTINCT user_id) as count FROM trusted_devices', { type: QueryTypes.SELECT });
      console.log('Distinct users in trusted_devices:', trustedDevicesCount[0].count);
    } catch (err) {
      console.log('Trusted devices table: N/A');
    }

    console.log('\n=== Active vs Inactive Users ===\n');
    const activeUsers = await sequelize.query('SELECT COUNT(*) as count FROM users WHERE is_active = true', { type: QueryTypes.SELECT });
    const inactiveUsers = await sequelize.query('SELECT COUNT(*) as count FROM users WHERE is_active = false', { type: QueryTypes.SELECT });
    console.log('Active users:', activeUsers[0].count);
    console.log('Inactive users:', inactiveUsers[0].count);

    console.log('\n=== Detailed User List ===\n');

    // Get all users with basic info
    const users = await sequelize.query(`
      SELECT
        u.id,
        u.username,
        u.email,
        u.role,
        u.is_active,
        u."twoFactorEnabled"
      FROM users u
      ORDER BY u.username ASC
    `, { type: QueryTypes.SELECT });

    console.log('Total users found:', users.length);
    console.log('');

    for (const user of users) {
      console.log(`User: ${user.username} (${user.email})`);
      console.log(`  ID: ${user.id}`);
      console.log(`  Role: ${user.role}`);
      console.log(`  Active: ${user.is_active}`);
      console.log(`  2FA Enabled: ${user.twoFactorEnabled || false}`);

      // Count sessions
      const sessions = await sequelize.query('SELECT COUNT(*) as count FROM sessions WHERE user_id = $1', {
        bind: [user.id],
        type: QueryTypes.SELECT
      });
      console.log(`  Sessions: ${sessions[0].count}`);
      console.log('');
    }

    // Find users with no sessions (potential orphaned users)
    console.log('\n=== Users with No Sessions ===\n');
    const usersNoSessions = await sequelize.query(`
      SELECT u.id, u.username, u.email, u.is_active
      FROM users u
      WHERE u.id NOT IN (SELECT DISTINCT user_id FROM sessions)
      ORDER BY u.username ASC
    `, { type: QueryTypes.SELECT });

    if (usersNoSessions.length > 0) {
      console.log(`Found ${usersNoSessions.length} users with no sessions:`);
      usersNoSessions.forEach(user => {
        console.log(`- ${user.username} (${user.email}) - Active: ${user.is_active}`);
      });
    } else {
      console.log('All users have at least one session.');
    }

    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    await sequelize.close();
    process.exit(1);
  }
})();
