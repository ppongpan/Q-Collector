/**
 * Test New Table Structure
 * Verify that new tables use username instead of user_id
 * and don't have unnecessary columns
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

async function testTableStructure() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║           Test New Table Structure                        ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  try {
    // Get all forms with their table names
    const formsResult = await pool.query(`
      SELECT id, title, table_name
      FROM forms
      WHERE table_name IS NOT NULL
      ORDER BY "createdAt" DESC
      LIMIT 3;
    `);

    console.log(`Testing ${formsResult.rows.length} main form tables:\n`);

    for (const form of formsResult.rows) {
      console.log(`📋 Form: "${form.title}"`);
      console.log(`   Table: ${form.table_name}`);

      // Get column names
      const columnsResult = await pool.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = $1
        ORDER BY ordinal_position;
      `, [form.table_name]);

      const columns = columnsResult.rows.map(c => c.column_name);

      // Check required columns
      const hasUsername = columns.includes('username');
      const hasUserId = columns.includes('user_id');
      const hasStatus = columns.includes('status');
      const hasCreatedAt = columns.includes('created_at');
      const hasUpdatedAt = columns.includes('updated_at');

      console.log(`\n   Required columns:`);
      console.log(`   ${hasUsername ? '✅' : '❌'} username (VARCHAR)`);
      console.log(`   ${columns.includes('id') ? '✅' : '❌'} id (UUID)`);
      console.log(`   ${columns.includes('form_id') ? '✅' : '❌'} form_id (UUID)`);
      console.log(`   ${columns.includes('submission_number') ? '✅' : '❌'} submission_number (INTEGER)`);
      console.log(`   ${columns.includes('submitted_at') ? '✅' : '❌'} submitted_at (TIMESTAMP)`);

      console.log(`\n   Removed columns:`);
      console.log(`   ${!hasUserId ? '✅' : '❌'} user_id removed`);
      console.log(`   ${!hasStatus ? '✅' : '❌'} status removed`);
      console.log(`   ${!hasCreatedAt ? '✅' : '❌'} created_at removed`);
      console.log(`   ${!hasUpdatedAt ? '✅' : '❌'} updated_at removed`);

      // Check indexes
      const indexesResult = await pool.query(`
        SELECT indexname, indexdef
        FROM pg_indexes
        WHERE tablename = $1
        AND indexname LIKE 'idx_%';
      `, [form.table_name]);

      console.log(`\n   Indexes (${indexesResult.rows.length}):`);
      for (const idx of indexesResult.rows) {
        console.log(`   - ${idx.indexname}`);
      }

      // Overall status
      const isValid = hasUsername && !hasUserId && !hasStatus && !hasCreatedAt && !hasUpdatedAt;
      console.log(`\n   ${isValid ? '✅ PASSED' : '❌ FAILED'}\n`);
    }

    // Test sub-form tables
    const subFormsResult = await pool.query(`
      SELECT sf.id, sf.title, sf.table_name, f.title as form_title
      FROM sub_forms sf
      JOIN forms f ON sf.form_id = f.id
      WHERE sf.table_name IS NOT NULL
      ORDER BY sf."createdAt" DESC
      LIMIT 3;
    `);

    console.log(`\nTesting ${subFormsResult.rows.length} sub-form tables:\n`);

    for (const subForm of subFormsResult.rows) {
      console.log(`📋 Sub-Form: "${subForm.title}" (${subForm.form_title})`);
      console.log(`   Table: ${subForm.table_name}`);

      // Get column names
      const columnsResult = await pool.query(`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = $1
        ORDER BY ordinal_position;
      `, [subForm.table_name]);

      const columns = columnsResult.rows.map(c => c.column_name);

      // Check required columns
      const hasUsername = columns.includes('username');
      const hasUserId = columns.includes('user_id');
      const hasStatus = columns.includes('status');
      const hasCreatedAt = columns.includes('created_at');
      const hasUpdatedAt = columns.includes('updated_at');

      console.log(`\n   Required columns:`);
      console.log(`   ${hasUsername ? '✅' : '❌'} username (VARCHAR)`);
      console.log(`   ${columns.includes('id') ? '✅' : '❌'} id (UUID)`);
      console.log(`   ${columns.includes('parent_id') ? '✅' : '❌'} parent_id (UUID)`);
      console.log(`   ${columns.includes('form_id') ? '✅' : '❌'} form_id (UUID)`);
      console.log(`   ${columns.includes('sub_form_id') ? '✅' : '❌'} sub_form_id (UUID)`);
      console.log(`   ${columns.includes('submission_number') ? '✅' : '❌'} submission_number (INTEGER)`);
      console.log(`   ${columns.includes('order_index') ? '✅' : '❌'} order_index (INTEGER)`);
      console.log(`   ${columns.includes('submitted_at') ? '✅' : '❌'} submitted_at (TIMESTAMP)`);

      console.log(`\n   Removed columns:`);
      console.log(`   ${!hasUserId ? '✅' : '❌'} user_id removed`);
      console.log(`   ${!hasStatus ? '✅' : '❌'} status removed`);
      console.log(`   ${!hasCreatedAt ? '✅' : '❌'} created_at removed`);
      console.log(`   ${!hasUpdatedAt ? '✅' : '❌'} updated_at removed`);

      // Overall status
      const isValid = hasUsername && !hasUserId && !hasStatus && !hasCreatedAt && !hasUpdatedAt;
      console.log(`\n   ${isValid ? '✅ PASSED' : '❌ FAILED'}\n`);
    }

    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║                    Complete                                ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
  } finally {
    await pool.end();
  }
}

testTableStructure().catch(console.error);
