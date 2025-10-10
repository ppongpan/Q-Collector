/**
 * Verify main_form_subid Column Position
 */

const { Pool } = require('pg');

async function verifyColumnPosition() {
  const pool = new Pool({
    host: process.env.POSTGRES_HOST || 'localhost',
    port: process.env.POSTGRES_PORT || 5432,
    database: process.env.POSTGRES_DB || 'qcollector_db',
    user: process.env.POSTGRES_USER || 'qcollector',
    password: process.env.POSTGRES_PASSWORD || 'qcollector_dev_2025'
  });

  try {
    console.log('🔍 Verifying main_form_subid Column Position\n');
    console.log('=' .repeat(80) + '\n');

    // Get all sub-form tables
    const getTablesQuery = `
      SELECT DISTINCT table_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name LIKE '%form%'
      AND table_name NOT IN ('forms', 'sub_forms', 'field_migrations', 'field_data_backups')
      AND column_name = 'parent_id'
      ORDER BY table_name;
    `;

    const tables = await pool.query(getTablesQuery);

    console.log(`📊 Found ${tables.rows.length} sub-form tables\n`);

    for (const table of tables.rows) {
      const tableName = table.table_name;

      // Get column order
      const getColumnsQuery = `
        SELECT
          ordinal_position,
          column_name,
          data_type
        FROM information_schema.columns
        WHERE table_name = $1
        AND table_schema = 'public'
        ORDER BY ordinal_position;
      `;

      const columns = await pool.query(getColumnsQuery, [tableName]);

      console.log(`📋 Table: ${tableName}\n`);
      console.log('   Position | Column Name          | Data Type');
      console.log('   ' + '-'.repeat(70));

      columns.rows.forEach(col => {
        const highlight = col.column_name === 'main_form_subid' ? '✅' : '  ';
        console.log(`   ${highlight} ${String(col.ordinal_position).padEnd(8)} | ${col.column_name.padEnd(20)} | ${col.data_type}`);
      });

      // Verify main_form_subid is at position 3
      const mainFormSubIdCol = columns.rows.find(c => c.column_name === 'main_form_subid');
      if (mainFormSubIdCol) {
        if (mainFormSubIdCol.ordinal_position === 3) {
          console.log(`\n   ✅ main_form_subid is at position 3 (CORRECT)\n`);
        } else {
          console.log(`\n   ❌ main_form_subid is at position ${mainFormSubIdCol.ordinal_position} (SHOULD BE 3)\n`);
        }
      } else {
        console.log(`\n   ⚠️  main_form_subid column not found\n`);
      }

      // Get sample data
      const sampleQuery = `
        SELECT id, parent_id, main_form_subid
        FROM "${tableName}"
        ORDER BY submitted_at DESC
        LIMIT 2;
      `;

      const samples = await pool.query(sampleQuery);

      if (samples.rows.length > 0) {
        console.log('   Sample Data:');
        samples.rows.forEach((row, i) => {
          console.log(`   ${i + 1}. ID: ${row.id ? row.id.substring(0, 8) + '...' : 'NULL'}`);
          console.log(`      parent_id: ${row.parent_id ? row.parent_id.substring(0, 8) + '...' : 'NULL'}`);
          console.log(`      main_form_subid: ${row.main_form_subid ? row.main_form_subid.substring(0, 8) + '...' : 'NULL'}`);
        });
      }

      console.log('\n   ' + '-'.repeat(76) + '\n');
    }

    console.log('=' .repeat(80));
    console.log('\n✅ VERIFICATION COMPLETE!\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

verifyColumnPosition();
