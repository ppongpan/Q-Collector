/**
 * Create Test Admin User
 * Quick script to create admin user for testing
 */

require('dotenv').config();
const bcrypt = require('bcryptjs'); // Use bcryptjs instead
const { sequelize } = require('../config/database.config');

async function createTestAdmin() {
  try {
    console.log('🔐 Creating test admin user...\n');

    await sequelize.authenticate();
    console.log('✅ Database connected\n');

    // Check if admin exists
    const [existing] = await sequelize.query(
      "SELECT username FROM users WHERE username = 'testadmin'"
    );

    if (existing.length > 0) {
      console.log('⚠️  Test admin already exists. Deleting...');
      await sequelize.query("DELETE FROM users WHERE username = 'testadmin'");
    }

    // Hash password
    const password = 'TestAdmin123!';
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create admin user
    await sequelize.query(`
      INSERT INTO users (
        id,
        username,
        email,
        password_hash,
        "firstName",
        "lastName",
        role,
        is_active,
        requires_2fa_setup,
        "twoFactorEnabled",
        "createdAt",
        "updatedAt"
      ) VALUES (
        gen_random_uuid(),
        'testadmin',
        'testadmin@example.com',
        '${hashedPassword}',
        'Test',
        'Admin',
        'super_admin',
        true,
        false,
        false,
        NOW(),
        NOW()
      )
    `);

    console.log('✅ Test admin user created successfully!');
    console.log('\n📋 Login Credentials:');
    console.log('   Username: testadmin');
    console.log('   Password: TestAdmin123!');
    console.log('   Email: testadmin@example.com');
    console.log('   Role: super_admin');
    console.log('\n🔒 2FA: Disabled (for easy testing)');

    // Verify
    const [result] = await sequelize.query(
      'SELECT username, email, role, is_active, "twoFactorEnabled" FROM users WHERE username = \'testadmin\''
    );

    console.log('\n✅ Verification:');
    console.table(result);

    process.exit(0);

  } catch (error) {
    console.error('❌ Error creating test admin:', error.message);
    console.error(error);
    process.exit(1);
  }
}

createTestAdmin();
