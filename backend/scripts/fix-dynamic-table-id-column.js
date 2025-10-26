/**
 * Fix Dynamic Table ID Column
 *
 * This script checks if dynamic tables have the 'id' column and adds it if missing.
 * This is needed for tables created before the submissionId fix was implemented.
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

async function fixDynamicTableIdColumn(tableName) {
  const client = await pool.connect();

  try {
    console.log(`\n📋 Checking table: ${tableName}`);

    // Check if 'id' column exists
    const checkColumnQuery = `
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = $1
      AND column_name = 'id';
    `;

    const result = await client.query(checkColumnQuery, [tableName]);

    if (result.rows.length > 0) {
      console.log(`✅ Table already has 'id' column (${result.rows[0].data_type})`);
      return { fixed: false, reason: 'already_exists' };
    }

    console.log(`⚠️  Table missing 'id' column - adding it now...`);

    // Begin transaction
    await client.query('BEGIN');

    // Add 'id' column as UUID with default value
    const addColumnQuery = `
      ALTER TABLE ${tableName}
      ADD COLUMN id UUID DEFAULT gen_random_uuid();
    `;
    await client.query(addColumnQuery);
    console.log(`✅ Added 'id' column with UUID type`);

    // Make it primary key (need to drop existing constraint first if any)
    try {
      // Check if there's an existing primary key
      const checkPkQuery = `
        SELECT constraint_name
        FROM information_schema.table_constraints
        WHERE table_schema = 'public'
        AND table_name = $1
        AND constraint_type = 'PRIMARY KEY';
      `;
      const pkResult = await client.query(checkPkQuery, [tableName]);

      if (pkResult.rows.length > 0) {
        const pkName = pkResult.rows[0].constraint_name;
        await client.query(`ALTER TABLE ${tableName} DROP CONSTRAINT ${pkName};`);
        console.log(`✅ Dropped existing primary key: ${pkName}`);
      }

      // Add new primary key on 'id'
      await client.query(`ALTER TABLE ${tableName} ADD PRIMARY KEY (id);`);
      console.log(`✅ Set 'id' as primary key`);

    } catch (error) {
      console.log(`⚠️  Could not set as primary key: ${error.message}`);
      // Continue anyway - column is added
    }

    // Commit transaction
    await client.query('COMMIT');

    console.log(`✅ Successfully fixed table: ${tableName}`);
    return { fixed: true };

  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`❌ Error fixing table ${tableName}:`, error.message);
    return { fixed: false, error: error.message };
  } finally {
    client.release();
  }
}

async function main() {
  try {
    console.log('🔍 Finding all dynamic tables...\n');

    // Get all tables with naming pattern form_*
    const tablesQuery = `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name LIKE 'form_%'
      OR table_name LIKE '%demo%'
      ORDER BY table_name;
    `;

    const result = await pool.query(tablesQuery);
    const tables = result.rows.map(r => r.table_name);

    console.log(`Found ${tables.length} dynamic tables:\n`);
    tables.forEach(t => console.log(`  - ${t}`));

    if (tables.length === 0) {
      console.log('\n⚠️  No dynamic tables found.');
      return;
    }

    console.log('\n' + '='.repeat(60));
    console.log('Starting ID column fix...');
    console.log('='.repeat(60));

    const results = {
      fixed: [],
      alreadyExists: [],
      errors: []
    };

    for (const tableName of tables) {
      const result = await fixDynamicTableIdColumn(tableName);

      if (result.fixed) {
        results.fixed.push(tableName);
      } else if (result.reason === 'already_exists') {
        results.alreadyExists.push(tableName);
      } else if (result.error) {
        results.errors.push({ tableName, error: result.error });
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Fixed: ${results.fixed.length} tables`);
    results.fixed.forEach(t => console.log(`   - ${t}`));

    console.log(`\n✓  Already OK: ${results.alreadyExists.length} tables`);
    results.alreadyExists.forEach(t => console.log(`   - ${t}`));

    if (results.errors.length > 0) {
      console.log(`\n❌ Errors: ${results.errors.length} tables`);
      results.errors.forEach(({ tableName, error }) => {
        console.log(`   - ${tableName}: ${error}`);
      });
    }

    console.log('\n✅ Done!');

  } catch (error) {
    console.error('❌ Fatal error:', error);
  } finally {
    await pool.end();
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = { fixDynamicTableIdColumn };
