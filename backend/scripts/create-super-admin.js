/**
 * Create Super Admin Account
 * Creates the initial super admin user for the system
 */

const { User } = require('../models');
const bcrypt = require('bcryptjs');
const { encrypt } = require('../utils/encryption.util');

async function createSuperAdmin() {
  try {
    console.log('Creating Super Admin account...');

    // Check if super admin already exists
    const existingSuperAdmin = await User.findOne({
      where: { username: 'pongpanp' }
    });

    if (existingSuperAdmin) {
      console.log('⚠️  Super Admin account already exists. Deleting old account...');
      console.log('Old Username:', existingSuperAdmin.username);
      console.log('Old Email:', existingSuperAdmin.email);
    }

    // Delete existing super admin if exists
    await User.destroy({
      where: { username: 'pongpanp' }
    });

    // Create super admin
    const superAdmin = await User.create({
      username: 'pongpanp',
      email: 'pongpanp@qcon.co.th',
      password_hash: 'Gfvtmiu613', // Will be hashed by beforeCreate hook
      full_name: 'Pongpan Peerawanichkul',
      role: 'super_admin',
      is_active: true
    });

    console.log('\n✅ Super Admin account created successfully!');
    console.log('═══════════════════════════════════════');
    console.log('Username:', superAdmin.username);
    console.log('Email:', superAdmin.email);
    console.log('Full Name:', superAdmin.getFullName());
    console.log('Department: Technic');
    console.log('Role:', superAdmin.role);
    console.log('Password: Gfvtmiu613');
    console.log('═══════════════════════════════════════');
    console.log('\n💾 Account Details:');
    console.log('   This is your Super Admin account with full system access.');
    console.log('   Keep your password secure!');

  } catch (error) {
    console.error('❌ Error creating Super Admin:', error);
    throw error;
  }
}

// Run the script
createSuperAdmin()
  .then(() => {
    console.log('\nScript completed.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\nScript failed:', error);
    process.exit(1);
  });