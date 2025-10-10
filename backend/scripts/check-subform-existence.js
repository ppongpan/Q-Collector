/**
 * Check if SubForm exists in database
 */

const { Sequelize } = require('sequelize');
const config = require('../config/database.config');

const env = process.env.NODE_ENV || 'development';
const dbConfig = config[env];

const sequelize = new Sequelize(
  dbConfig.database,
  dbConfig.username,
  dbConfig.password,
  dbConfig
);

async function checkSubForm() {
  try {
    console.log('🔍 Checking SubForm existence...\n');

    const [subforms] = await sequelize.query(`
      SELECT id, form_id, title, "createdAt"
      FROM sub_forms
      WHERE id = 'b30cdf3b-1d0c-47c8-b68c-46bccb8805ba'
      OR form_id = '573e1f37-4cc4-4f3c-b303-ab877066fdc9'
      ORDER BY "createdAt" DESC;
    `);

    console.log(`📦 SubForms found: ${subforms.length}\n`);
    console.table(subforms);

    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    await sequelize.close();
    process.exit(1);
  }
}

checkSubForm();
