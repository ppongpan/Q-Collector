/**
 * Cleanup Sub-form Table Columns
 *
 * This script removes unnecessary columns from sub-form tables:
 * - Removes: form_id, sub_form_id (redundant)
 * - Renames: order_index → order (if exists)
 * - Keeps: id, parent_id, username, order, submitted_at, and field columns
 */

const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: process.env.POSTGRES_PORT || 5432,
  database: process.env.POSTGRES_DB || 'qcollector_db',
  user: process.env.POSTGRES_USER || 'qcollector',
  password: process.env.POSTGRES_PASSWORD || 'qcollector_dev_2025'
});

async function cleanupSubFormColumns() {
  const client = await pool.connect();

  try {
    console.log('🔍 Finding all sub-form tables...\n');

    // Get all sub-form table names from sub_forms table
    const subFormsQuery = `
      SELECT id, title, table_name
      FROM sub_forms
      WHERE table_name IS NOT NULL
      ORDER BY title;
    `;

    const result = await client.query(subFormsQuery);
    const subForms = result.rows;

    console.log(`Found ${subForms.length} sub-form(s) with tables:\n`);

    if (subForms.length === 0) {
      console.log('✅ No sub-form tables found.');
      return;
    }

    // Display sub-forms
    subForms.forEach((sf, index) => {
      console.log(`  ${index + 1}. ${sf.title} → ${sf.table_name}`);
    });

    console.log('\n📝 Starting cleanup process...\n');

    let totalChanges = 0;

    for (const subForm of subForms) {
      const tableName = subForm.table_name;
      console.log(`\n🔧 Processing: ${tableName}`);

      // Check what columns exist
      const columnsQuery = `
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = $1
        ORDER BY ordinal_position;
      `;

      const columnsResult = await client.query(columnsQuery, [tableName]);
      const columns = columnsResult.rows.map(r => r.column_name);

      console.log(`   Current columns: ${columns.join(', ')}`);

      // 1. Drop form_id if exists
      if (columns.includes('form_id')) {
        try {
          await client.query(`ALTER TABLE "${tableName}" DROP COLUMN IF EXISTS form_id CASCADE;`);
          console.log(`   ✅ Dropped column: form_id`);
          totalChanges++;
        } catch (error) {
          console.error(`   ❌ Failed to drop form_id:`, error.message);
        }
      }

      // 2. Drop sub_form_id if exists
      if (columns.includes('sub_form_id')) {
        try {
          await client.query(`ALTER TABLE "${tableName}" DROP COLUMN IF EXISTS sub_form_id CASCADE;`);
          console.log(`   ✅ Dropped column: sub_form_id`);
          totalChanges++;
        } catch (error) {
          console.error(`   ❌ Failed to drop sub_form_id:`, error.message);
        }
      }

      // 3. Rename order_index to order if exists (and order doesn't exist)
      if (columns.includes('order_index') && !columns.includes('order')) {
        try {
          await client.query(`ALTER TABLE "${tableName}" RENAME COLUMN order_index TO "order";`);
          console.log(`   ✅ Renamed column: order_index → order`);
          totalChanges++;
        } catch (error) {
          console.error(`   ❌ Failed to rename order_index:`, error.message);
        }
      } else if (columns.includes('order_index') && columns.includes('order')) {
        // Both exist, drop order_index
        try {
          await client.query(`ALTER TABLE "${tableName}" DROP COLUMN IF EXISTS order_index;`);
          console.log(`   ✅ Dropped duplicate column: order_index (order already exists)`);
          totalChanges++;
        } catch (error) {
          console.error(`   ❌ Failed to drop order_index:`, error.message);
        }
      }

      // Drop indexes for removed columns
      const dropIndexQueries = [
        `DROP INDEX IF EXISTS idx_${tableName}_form_id;`,
        `DROP INDEX IF EXISTS idx_${tableName}_sub_form_id;`
      ];

      for (const query of dropIndexQueries) {
        try {
          await client.query(query);
        } catch (error) {
          // Ignore errors - index might not exist
        }
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('Summary:');
    console.log('='.repeat(60));
    console.log(`✅ Processed: ${subForms.length} sub-form table(s)`);
    console.log(`✅ Total changes: ${totalChanges} column(s) modified`);
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the script
cleanupSubFormColumns()
  .then(() => {
    console.log('\n✅ Cleanup completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Cleanup failed:', error.message);
    process.exit(1);
  });
