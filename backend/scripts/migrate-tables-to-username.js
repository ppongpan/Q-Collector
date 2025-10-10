/**
 * Migrate Existing Tables to Username
 *
 * Changes:
 * 1. Add 'username' column
 * 2. Populate username from user_id using users table
 * 3. Drop unnecessary columns (user_id, status, created_at, updated_at)
 * 4. Update indexes
 */

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: process.env.POSTGRES_PORT || 5432,
  database: process.env.POSTGRES_DB || 'qcollector_db',
  user: process.env.POSTGRES_USER || 'qcollector',
  password: process.env.POSTGRES_PASSWORD || 'qcollector_dev_2025'
});

// Protected system tables - DO NOT MODIFY
const PROTECTED_TABLES = [
  'forms', 'users', 'sub_forms', 'fields', 'submissions',
  'audit_logs', 'SequelizeMeta', 'sessions',
  'submission_data', 'system_settings', 'translation_cache'
];

async function migrateTable(tableName, isSubForm = false) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    console.log(`\n🔧 Migrating: ${tableName}`);

    // Step 1: Check if username column already exists
    const columnCheck = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = $1 AND column_name = 'username';
    `, [tableName]);

    if (columnCheck.rows.length > 0) {
      console.log(`   ⚠️  Username column already exists, skipping...`);
      await client.query('ROLLBACK');
      return;
    }

    // Step 2: Add username column
    await client.query(`ALTER TABLE "${tableName}" ADD COLUMN username VARCHAR(100);`);
    console.log(`   ✅ Added username column`);

    // Step 3: Populate username from user_id
    const updateResult = await client.query(`
      UPDATE "${tableName}" t
      SET username = u.username
      FROM users u
      WHERE t.user_id = u.id;
    `);
    console.log(`   ✅ Populated username (${updateResult.rowCount} rows)`);

    // Step 4: Drop user_id column and its index
    try {
      await client.query(`DROP INDEX IF EXISTS idx_${tableName}_user_id;`);
      await client.query(`ALTER TABLE "${tableName}" DROP COLUMN IF EXISTS user_id;`);
      console.log(`   ✅ Dropped user_id column and index`);
    } catch (error) {
      console.log(`   ⚠️  Could not drop user_id: ${error.message}`);
    }

    // Step 5: Drop unnecessary columns
    const columnsToDrop = ['status', 'created_at', 'updated_at'];
    for (const col of columnsToDrop) {
      try {
        await client.query(`ALTER TABLE "${tableName}" DROP COLUMN IF EXISTS ${col};`);
        console.log(`   ✅ Dropped ${col} column`);
      } catch (error) {
        console.log(`   ⚠️  Could not drop ${col}: ${error.message}`);
      }
    }

    // Step 6: Create new indexes
    try {
      await client.query(`CREATE INDEX IF NOT EXISTS idx_${tableName}_username ON "${tableName}"(username);`);
      console.log(`   ✅ Created username index`);
    } catch (error) {
      console.log(`   ⚠️  Could not create username index: ${error.message}`);
    }

    await client.query('COMMIT');
    console.log(`   ✅ Migration complete for ${tableName}\n`);

  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`   ❌ Migration failed for ${tableName}:`, error.message);
  } finally {
    client.release();
  }
}

async function migrateTables() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║       Migrate Tables: user_id → username                  ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  try {
    // Get all forms with their table names
    const formsResult = await pool.query(`
      SELECT id, title, table_name
      FROM forms
      WHERE table_name IS NOT NULL
      ORDER BY "createdAt" DESC;
    `);

    console.log(`📋 Found ${formsResult.rows.length} main forms with tables\n`);

    let mainFormsProcessed = 0;

    // Migrate main form tables
    for (const form of formsResult.rows) {
      if (PROTECTED_TABLES.includes(form.table_name)) {
        console.log(`⚠️  Skipping protected table: ${form.table_name}`);
        continue;
      }

      console.log(`📋 Main Form: "${form.title}"`);
      console.log(`   Table: ${form.table_name}`);
      await migrateTable(form.table_name, false);
      mainFormsProcessed++;
    }

    // Get all sub-forms with their table names
    const subFormsResult = await pool.query(`
      SELECT sf.id, sf.title, sf.table_name, f.title as form_title
      FROM sub_forms sf
      JOIN forms f ON sf.form_id = f.id
      WHERE sf.table_name IS NOT NULL
      ORDER BY sf."createdAt" DESC;
    `);

    console.log(`\n📋 Found ${subFormsResult.rows.length} sub-forms with tables\n`);

    let subFormsProcessed = 0;

    // Migrate sub-form tables
    for (const subForm of subFormsResult.rows) {
      if (PROTECTED_TABLES.includes(subForm.table_name)) {
        console.log(`⚠️  Skipping protected table: ${subForm.table_name}`);
        continue;
      }

      console.log(`📋 Sub-Form: "${subForm.title}" (${subForm.form_title})`);
      console.log(`   Table: ${subForm.table_name}`);
      await migrateTable(subForm.table_name, true);
      subFormsProcessed++;
    }

    // Summary
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║                    Complete                                ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
    console.log(`   Main Forms Migrated: ${mainFormsProcessed}`);
    console.log(`   Sub-Forms Migrated: ${subFormsProcessed}`);
    console.log(`\n✅ All tables migrated to use username instead of user_id`);
    console.log(`✅ Removed unnecessary columns (status, created_at, updated_at)`);
    console.log(`✅ Updated indexes\n`);

  } catch (error) {
    console.error('❌ Migration error:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
  } finally {
    await pool.end();
  }
}

console.log('Starting table migration...\n');
migrateTables().catch(console.error);
