/**
 * Check Recent Users Script
 * ตรวจสอบ user ที่ลงทะเบียนล่าสุดในฐานข้อมูล
 */

const { sequelize, User } = require('../models');

async function checkRecentUsers() {
  try {
    console.log('🔍 Checking recent users in database...\n');

    // Get all users, including inactive ones
    const users = await User.findAll({
      order: [['createdAt', 'DESC']],
      limit: 15,
      attributes: [
        'id',
        'username',
        'email',
        'role',
        'is_active',
        'twoFactorEnabled',
        'requires_2fa_setup',
        'createdAt',
        'updatedAt'
      ]
    });

    if (users.length === 0) {
      console.log('❌ No users found in database!');
      return;
    }

    console.log(`✅ Found ${users.length} users:\n`);
    console.log('═'.repeat(120));
    console.log(
      'Username'.padEnd(20),
      'Email'.padEnd(30),
      'Role'.padEnd(20),
      'Active'.padEnd(10),
      '2FA'.padEnd(8),
      'Created'
    );
    console.log('═'.repeat(120));

    users.forEach(user => {
      console.log(
        user.username.padEnd(20),
        user.email.padEnd(30),
        user.role.padEnd(20),
        (user.is_active ? '✅ Yes' : '❌ No').padEnd(10),
        (user.twoFactorEnabled ? '✅' : '❌').padEnd(8),
        new Date(user.createdAt).toLocaleString('th-TH')
      );
    });

    console.log('═'.repeat(120));

    // Count by status
    const activeCount = users.filter(u => u.is_active).length;
    const inactiveCount = users.filter(u => !u.is_active).length;
    const with2FA = users.filter(u => u.twoFactorEnabled).length;
    const requires2FA = users.filter(u => u.requires_2fa_setup).length;

    console.log('\n📊 Statistics:');
    console.log(`   Active users: ${activeCount}`);
    console.log(`   Inactive users: ${inactiveCount}`);
    console.log(`   Users with 2FA enabled: ${with2FA}`);
    console.log(`   Users requiring 2FA setup: ${requires2FA}`);

    // Check total count
    const totalCount = await User.count();
    console.log(`\n📈 Total users in database: ${totalCount}`);

    // Check active users count
    const activeUsersCount = await User.count({ where: { is_active: true } });
    console.log(`   Active users: ${activeUsersCount}`);
    console.log(`   Inactive/Deleted users: ${totalCount - activeUsersCount}`);

  } catch (error) {
    console.error('❌ Error checking users:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

// Run the script
checkRecentUsers()
  .then(() => {
    console.log('\n✅ Check completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Check failed:', error);
    process.exit(1);
  });
