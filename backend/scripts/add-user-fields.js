/**
 * User Fields Migration Script
 * Adds missing fields to the users table for Priority 3 features
 */

const { Sequelize } = require('sequelize');
const config = require('../config/database.config');

async function addUserFields() {
  const env = process.env.NODE_ENV || 'development';
  const dbConfig = config[env];

  console.log(`🚀 Adding user fields in ${env} environment...`);

  // Create Sequelize instance
  const sequelize = new Sequelize(
    dbConfig.database,
    dbConfig.username,
    dbConfig.password,
    {
      host: dbConfig.host,
      port: dbConfig.port,
      dialect: dbConfig.dialect,
      logging: false, // Reduce logging for cleaner output
    }
  );

  try {
    // Test connection
    await sequelize.authenticate();
    console.log('✅ Database connection established');

    // Define fields to add
    const fieldsToAdd = [
      // Two-Factor Authentication fields
      {
        name: 'twoFactorSecret',
        sql: 'ALTER TABLE users ADD COLUMN IF NOT EXISTS "twoFactorSecret" TEXT NULL'
      },
      {
        name: 'twoFactorEnabled',
        sql: 'ALTER TABLE users ADD COLUMN IF NOT EXISTS "twoFactorEnabled" BOOLEAN DEFAULT FALSE NOT NULL'
      },
      {
        name: 'twoFactorBackupCodes',
        sql: 'ALTER TABLE users ADD COLUMN IF NOT EXISTS "twoFactorBackupCodes" TEXT NULL'
      },
      {
        name: 'twoFactorEnabledAt',
        sql: 'ALTER TABLE users ADD COLUMN IF NOT EXISTS "twoFactorEnabledAt" TIMESTAMP NULL'
      },
      // Telegram Integration fields
      {
        name: 'telegramUserId',
        sql: 'ALTER TABLE users ADD COLUMN IF NOT EXISTS "telegramUserId" VARCHAR(50) NULL'
      },
      {
        name: 'telegramUsername',
        sql: 'ALTER TABLE users ADD COLUMN IF NOT EXISTS "telegramUsername" VARCHAR(50) NULL'
      },
      // Enhanced User Information fields
      {
        name: 'firstName',
        sql: 'ALTER TABLE users ADD COLUMN IF NOT EXISTS "firstName" VARCHAR(100) NULL'
      },
      {
        name: 'lastName',
        sql: 'ALTER TABLE users ADD COLUMN IF NOT EXISTS "lastName" VARCHAR(100) NULL'
      },
      {
        name: 'department',
        sql: 'ALTER TABLE users ADD COLUMN IF NOT EXISTS "department" VARCHAR(100) NULL'
      },
      {
        name: 'notificationPreferences',
        sql: 'ALTER TABLE users ADD COLUMN IF NOT EXISTS "notificationPreferences" TEXT NULL'
      }
    ];

    console.log(`📋 Adding ${fieldsToAdd.length} fields to users table...`);

    // Add each field
    for (const field of fieldsToAdd) {
      try {
        await sequelize.query(field.sql);
        console.log(`✅ Added field: ${field.name}`);
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log(`ℹ️  Field already exists: ${field.name}`);
        } else {
          console.error(`❌ Failed to add field ${field.name}:`, error.message);
          throw error;
        }
      }
    }

    // Add indexes for performance
    const indexesToAdd = [
      {
        name: 'idx_users_telegram_user_id',
        sql: 'CREATE INDEX IF NOT EXISTS idx_users_telegram_user_id ON users("telegramUserId")'
      },
      {
        name: 'idx_users_two_factor_enabled',
        sql: 'CREATE INDEX IF NOT EXISTS idx_users_two_factor_enabled ON users("twoFactorEnabled")'
      },
      {
        name: 'idx_users_department',
        sql: 'CREATE INDEX IF NOT EXISTS idx_users_department ON users("department")'
      }
    ];

    console.log(`📊 Adding ${indexesToAdd.length} indexes...`);

    for (const index of indexesToAdd) {
      try {
        await sequelize.query(index.sql);
        console.log(`✅ Added index: ${index.name}`);
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log(`ℹ️  Index already exists: ${index.name}`);
        } else {
          console.error(`❌ Failed to add index ${index.name}:`, error.message);
        }
      }
    }

    // Verify the table structure
    console.log('\n🔍 Verifying users table structure...');
    const [columns] = await sequelize.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'users'
      AND column_name IN (
        'twoFactorSecret', 'twoFactorEnabled', 'twoFactorBackupCodes', 'twoFactorEnabledAt',
        'telegramUserId', 'telegramUsername',
        'firstName', 'lastName', 'department', 'notificationPreferences'
      )
      ORDER BY column_name
    `);

    console.log('\n📋 New user fields:');
    console.table(columns);

    console.log('\n🎉 User fields migration completed successfully!');

  } catch (error) {
    console.error('💥 Migration failed:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

// Run migration
addUserFields()
  .then(() => {
    console.log('\n✅ Migration script finished successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration script failed:', error);
    process.exit(1);
  });