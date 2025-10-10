/**
 * Test API Users Endpoints
 * ทดสอบดึงข้อมูล users จาก API
 */

const { sequelize } = require('../models');
const { QueryTypes } = require('sequelize');

async function testAPIs() {
  try {
    console.log('🔍 Testing /admin/users/2fa-status query...\n');

    const query = `
      SELECT
        id,
        username,
        email,
        role,
        is_active,
        "twoFactorEnabled",
        "twoFactorEnabledAt",
        requires_2fa_setup
      FROM users
      WHERE is_active = true
      ORDER BY username ASC
    `;

    const users = await sequelize.query(query, {
      type: QueryTypes.SELECT
    });

    console.log(`✅ Found ${users.length} active users:\n`);
    console.log('═'.repeat(120));
    console.log(
      'Username'.padEnd(20),
      'Email'.padEnd(30),
      'Role'.padEnd(20),
      'Active'.padEnd(10),
      '2FA'
    );
    console.log('═'.repeat(120));

    users.forEach(user => {
      console.log(
        user.username.padEnd(20),
        user.email.padEnd(30),
        user.role.padEnd(20),
        (user.is_active ? '✅ Yes' : '❌ No').padEnd(10),
        user.twoFactorEnabled ? '✅' : '❌'
      );
    });

    console.log('═'.repeat(120));

    // Check if momotoru is in the list
    const momotoru = users.find(u => u.username === 'momotoru');
    if (momotoru) {
      console.log('\n✅ "momotoru" FOUND in API query result!');
      console.log('   ID:', momotoru.id);
      console.log('   Email:', momotoru.email);
      console.log('   Role:', momotoru.role);
      console.log('   Active:', momotoru.is_active);
    } else {
      console.log('\n❌ "momotoru" NOT FOUND in API query result!');
      console.log('   This means the API will not return this user to frontend.');
    }

  } catch (error) {
    console.error('❌ Error testing APIs:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

// Run the script
testAPIs()
  .then(() => {
    console.log('\n✅ Test completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });
