/**
 * Migration Runner Script
 * Runs SQL migration files directly on the database
 */

const fs = require('fs');
const path = require('path');
const { Sequelize } = require('sequelize');
const config = require('../config/database.config');

async function runMigration() {
  const env = process.env.NODE_ENV || 'development';
  const dbConfig = config[env];

  console.log(`Running migration in ${env} environment...`);

  // Create Sequelize instance
  const sequelize = new Sequelize(
    dbConfig.database,
    dbConfig.username,
    dbConfig.password,
    {
      host: dbConfig.host,
      port: dbConfig.port,
      dialect: dbConfig.dialect,
      logging: console.log,
    }
  );

  try {
    // Test connection
    await sequelize.authenticate();
    console.log('Database connection established successfully.');

    // Read migration file
    const migrationPath = path.join(__dirname, '..', 'migrations', 'update-user-roles.sql');
    const sqlContent = fs.readFileSync(migrationPath, 'utf8');

    console.log('Executing migration SQL...');

    // Define new roles to add
    const newRoles = [
      'super_admin',
      'moderator',
      'customer_service',
      'sales',
      'marketing',
      'technic',
      'general_user'
    ];

    // Check existing roles
    const [existingRoles] = await sequelize.query(`
      SELECT enumlabel
      FROM pg_enum
      WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'enum_users_role')
    `);

    const existingRoleLabels = existingRoles.map(r => r.enumlabel);
    console.log('Existing roles:', existingRoleLabels);

    // Add new roles
    for (const role of newRoles) {
      if (!existingRoleLabels.includes(role)) {
        console.log(`Adding role: ${role}`);
        await sequelize.query(`ALTER TYPE enum_users_role ADD VALUE '${role}'`);
      } else {
        console.log(`Role already exists: ${role}`);
      }
    }

    // Verify migration
    console.log('\nVerifying migration...');
    const [finalRoles] = await sequelize.query(`
      SELECT enumlabel, enumsortorder
      FROM pg_enum
      WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'enum_users_role')
      ORDER BY enumsortorder
    `);
    console.log('Current role ENUMs:');
    console.table(finalRoles);

    console.log('\n✅ Migration completed successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

// Run migration
runMigration()
  .then(() => {
    console.log('Migration script finished.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration script failed:', error);
    process.exit(1);
  });