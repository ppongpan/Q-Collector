/**
 * Check user_consents table schema
 * Run with: node check-schema.js
 */

const { Sequelize } = require('sequelize');
require('dotenv').config({ path: './backend/.env' });

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: false
  }
);

async function checkSchema() {
  try {
    console.log('🔍 Connecting to database...');
    await sequelize.authenticate();
    console.log('✅ Connected to database:', process.env.DB_NAME);

    // Query to get all columns from user_consents table
    const [results] = await sequelize.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'user_consents'
      ORDER BY ordinal_position;
    `);

    console.log('\n📋 user_consents table structure:');
    console.log('=====================================');
    results.forEach((col, index) => {
      console.log(`${index + 1}. ${col.column_name} (${col.data_type}) - NULL: ${col.is_nullable} - DEFAULT: ${col.column_default || 'none'}`);
    });

    console.log('\n🔍 Checking for withdrawn_by and withdrawn_at...');
    const hasWithdrawnBy = results.some(col => col.column_name === 'withdrawn_by');
    const hasWithdrawnAt = results.some(col => col.column_name === 'withdrawn_at');

    if (hasWithdrawnBy) {
      console.log('❌ ERROR: withdrawn_by column EXISTS in database but NOT in model!');
    } else {
      console.log('✅ withdrawn_by column does NOT exist (correct)');
    }

    if (hasWithdrawnAt) {
      console.log('❌ ERROR: withdrawn_at column EXISTS in database but NOT in model!');
    } else {
      console.log('✅ withdrawn_at column does NOT exist (correct)');
    }

    // Check for any extra columns not in our migration
    const expectedColumns = [
      'id', 'submission_id', 'form_id', 'user_id', 'consent_item_id',
      'consent_given', 'signature_data', 'full_name', 'ip_address',
      'user_agent', 'consented_at', 'privacy_notice_accepted',
      'privacy_notice_version', 'created_at', 'updated_at'
    ];

    const extraColumns = results
      .map(col => col.column_name)
      .filter(name => !expectedColumns.includes(name));

    if (extraColumns.length > 0) {
      console.log('\n⚠️  Extra columns found in database:');
      extraColumns.forEach(col => console.log(`   - ${col}`));
    } else {
      console.log('\n✅ No extra columns in database');
    }

    await sequelize.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkSchema();
