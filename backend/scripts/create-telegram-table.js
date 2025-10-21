/**
 * Create telegram_settings table
 * Run this script to create the table if migration failed
 */

const { sequelize } = require('../models');

async function createTable() {
  try {
    console.log('Creating telegram_settings table...');

    const sql = `
      CREATE TABLE IF NOT EXISTS telegram_settings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        bot_token VARCHAR(255),
        group_id VARCHAR(255),
        enabled BOOLEAN DEFAULT false,
        updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );

      CREATE INDEX IF NOT EXISTS telegram_settings_enabled_idx ON telegram_settings(enabled);

      INSERT INTO telegram_settings (id, bot_token, group_id, enabled, created_at, updated_at)
      SELECT gen_random_uuid(), '', '', false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      WHERE NOT EXISTS (SELECT 1 FROM telegram_settings LIMIT 1);
    `;

    await sequelize.query(sql);

    console.log('✅ Table telegram_settings created successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

createTable();
