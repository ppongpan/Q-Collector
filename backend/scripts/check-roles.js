/**
 * Check roles_allowed in database
 */

const { sequelize } = require('../models');

async function checkRoles() {
  try {
    const [results] = await sequelize.query(`
      SELECT id, title, roles_allowed
      FROM forms
      WHERE id = '8f82046a-9dce-4a1c-9f53-7a8921c78b8e'
    `);

    console.log('=== Form Roles Check ===');
    console.log(JSON.stringify(results, null, 2));

    await sequelize.close();
  } catch (error) {
    console.error('Error:', error);
    await sequelize.close();
    process.exit(1);
  }
}

checkRoles();
