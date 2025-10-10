/**
 * Migrate Sub-Form Table Names
 * Re-translate old sub-form table names using MyMemory API
 */

require('dotenv').config();
const { Pool } = require('pg');
const { generateTableName } = require('../utils/tableNameHelper');

const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: process.env.POSTGRES_PORT || 5432,
  database: process.env.POSTGRES_DB || 'qcollector_db',
  user: process.env.POSTGRES_USER || 'qcollector',
  password: process.env.POSTGRES_PASSWORD || 'qcollector_dev_2025'
});

async function migrateSubFormTableNames() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║        Migrate Sub-Form Table Names                       ║');
  console.log('║        Old Transliteration → MyMemory API                 ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  try {
    // Get all sub-forms with their current table names
    const result = await pool.query(`
      SELECT id, title, table_name, form_id
      FROM sub_forms
      WHERE table_name IS NOT NULL
      ORDER BY "createdAt" DESC;
    `);

    if (result.rows.length === 0) {
      console.log('✅ No sub-forms to migrate.\n');
      await pool.end();
      return;
    }

    console.log(`Found ${result.rows.length} sub-forms to check:\n`);

    let migrated = 0;
    let skipped = 0;

    for (const subForm of result.rows) {
      console.log(`📋 Sub-Form: "${subForm.title}"`);
      console.log(`   Current Table: ${subForm.table_name}`);

      // Generate new table name using MyMemory API
      const newTableName = await generateTableName(subForm.title, subForm.id);
      console.log(`   New Table: ${newTableName}`);

      // Check if names are different
      if (subForm.table_name === newTableName) {
        console.log(`   ✅ Already using correct name (skipped)\n`);
        skipped++;
        continue;
      }

      // Check if old table exists
      const tableExistsResult = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'public'
          AND table_name = $1
        );
      `, [subForm.table_name]);

      if (!tableExistsResult.rows[0].exists) {
        console.log(`   ⚠️  Old table doesn't exist (updating record only)\n`);
        // Update sub_forms record
        await pool.query(`
          UPDATE sub_forms
          SET table_name = $1
          WHERE id = $2;
        `, [newTableName, subForm.id]);
        migrated++;
        continue;
      }

      // Rename table
      try {
        await pool.query(`ALTER TABLE "${subForm.table_name}" RENAME TO "${newTableName}";`);
        console.log(`   ✅ Table renamed successfully`);

        // Update sub_forms record
        await pool.query(`
          UPDATE sub_forms
          SET table_name = $1
          WHERE id = $2;
        `, [newTableName, subForm.id]);

        console.log(`   ✅ Database record updated\n`);
        migrated++;
      } catch (error) {
        console.error(`   ❌ Error renaming table: ${error.message}\n`);
      }
    }

    // Summary
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║                  Migration Complete                        ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
    console.log(`   Total Sub-Forms: ${result.rows.length}`);
    console.log(`   Migrated: ${migrated}`);
    console.log(`   Skipped: ${skipped}\n`);

    if (migrated > 0) {
      console.log('✅ Sub-form table names updated to use MyMemory API translations!');
    } else {
      console.log('ℹ️  No sub-forms needed migration.');
    }
    console.log('');

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
  } finally {
    await pool.end();
  }
}

migrateSubFormTableNames().catch(console.error);
