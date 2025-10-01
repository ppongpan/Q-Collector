/**
 * Create Technic User Script
 *
 * Creates the technicuser account that should exist in the system
 */

const { sequelize } = require('../config/database.config');
const { QueryTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

(async () => {
  try {
    console.log('=== Creating Technic User ===\n');

    // Check if user already exists
    const existingUser = await sequelize.query(`
      SELECT id, username, email FROM users WHERE username = 'technicuser'
    `, { type: QueryTypes.SELECT });

    if (existingUser.length > 0) {
      console.log('❌ User technicuser already exists!');
      console.log(`   ID: ${existingUser[0].id}`);
      console.log(`   Email: ${existingUser[0].email}`);
      await sequelize.close();
      process.exit(0);
    }

    // Create new technicuser
    const userId = uuidv4();
    const password = 'technic123'; // Default password
    const hashedPassword = await bcrypt.hash(password, 10);

    const insertQuery = `
      INSERT INTO users (
        id,
        username,
        email,
        password_hash,
        role,
        is_active,
        "twoFactorEnabled",
        "createdAt",
        "updatedAt"
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, NOW(), NOW()
      )
      RETURNING id, username, email, role
    `;

    const result = await sequelize.query(insertQuery, {
      bind: [
        userId,
        'technicuser',
        'technic@qcon.co.th',
        hashedPassword,
        'technic',
        true,
        false
      ],
      type: QueryTypes.INSERT
    });

    console.log('✅ Successfully created technicuser!\n');
    console.log('User Details:');
    console.log(`  Username: technicuser`);
    console.log(`  Email: technic@qcon.co.th`);
    console.log(`  Password: ${password}`);
    console.log(`  Role: technic`);
    console.log(`  ID: ${userId}`);
    console.log(`  2FA Enabled: false`);

    console.log('\n⚠️  IMPORTANT: Please change the password after first login!');

    // Show all users
    console.log('\n=== All Users in Database ===\n');
    const allUsers = await sequelize.query(`
      SELECT username, email, role, "twoFactorEnabled"
      FROM users
      ORDER BY username ASC
    `, { type: QueryTypes.SELECT });

    allUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.username} (${user.email}) - Role: ${user.role} - 2FA: ${user.twoFactorEnabled ? 'Yes' : 'No'}`);
    });

    console.log(`\nTotal users: ${allUsers.length}`);

    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    await sequelize.close();
    process.exit(1);
  }
})();
