/**
 * Check Form Table Creation Status
 * ตรวจสอบว่าฟอร์มมี table_name หรือไม่
 */

const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: process.env.POSTGRES_PORT || 5432,
  database: process.env.POSTGRES_DB || 'qcollector_db',
  user: process.env.POSTGRES_USER || 'qcollector',
  password: process.env.POSTGRES_PASSWORD || 'qcollector_dev_2025'
});

async function checkFormTableCreation() {
  const client = await pool.connect();

  try {
    console.log('\n📊 === FORM TABLE CREATION STATUS ===\n');

    // 1. Check all forms
    const formsQuery = `
      SELECT
        id,
        title,
        table_name,
        is_active,
        "createdAt"
      FROM forms
      ORDER BY "createdAt" DESC
      LIMIT 10;
    `;
    const forms = await client.query(formsQuery);

    console.log(`Found ${forms.rows.length} recent forms:\n`);

    for (const form of forms.rows) {
      console.log(`📋 Form: ${form.title}`);
      console.log(`   ID: ${form.id}`);
      console.log(`   Table Name: ${form.table_name || '❌ NOT SET'}`);
      console.log(`   Active: ${form.is_active}`);
      console.log(`   Created: ${form.createdAt}`);

      // Check if table exists
      if (form.table_name) {
        const tableExistsQuery = `
          SELECT EXISTS (
            SELECT FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_name = $1
          );
        `;
        const tableExists = await client.query(tableExistsQuery, [form.table_name]);
        console.log(`   Table Exists: ${tableExists.rows[0].exists ? '✅ YES' : '❌ NO'}`);

        if (tableExists.rows[0].exists) {
          // Count records
          const countQuery = `SELECT COUNT(*) FROM "${form.table_name}"`;
          const count = await client.query(countQuery);
          console.log(`   Records: ${count.rows[0].count}`);
        }
      } else {
        console.log(`   ⚠️  WARNING: table_name is NULL - table was never created!`);
      }

      // Check sub-forms
      const subFormsQuery = `
        SELECT id, title, table_name
        FROM sub_forms
        WHERE form_id = $1;
      `;
      const subForms = await client.query(subFormsQuery, [form.id]);

      if (subForms.rows.length > 0) {
        console.log(`   📁 Sub-forms (${subForms.rows.length}):`);
        for (const subForm of subForms.rows) {
          console.log(`      - ${subForm.title}: ${subForm.table_name || '❌ NOT SET'}`);

          if (subForm.table_name) {
            const subTableExists = await client.query(
              `SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_schema = 'public'
                AND table_name = $1
              );`,
              [subForm.table_name]
            );
            console.log(`        Table Exists: ${subTableExists.rows[0].exists ? '✅ YES' : '❌ NO'}`);
          }
        }
      }
      console.log('');
    }

    // 2. Check for forms without table_name
    console.log('='.repeat(80));
    const missingTablesQuery = `
      SELECT COUNT(*) as count
      FROM forms
      WHERE table_name IS NULL;
    `;
    const missingTables = await client.query(missingTablesQuery);
    console.log(`\n⚠️  Forms without table_name: ${missingTables.rows[0].count}`);

    // 3. Check for sub-forms without table_name
    const missingSubFormTablesQuery = `
      SELECT COUNT(*) as count
      FROM sub_forms
      WHERE table_name IS NULL;
    `;
    const missingSubFormTables = await client.query(missingSubFormTablesQuery);
    console.log(`⚠️  Sub-forms without table_name: ${missingSubFormTables.rows[0].count}`);

    console.log('\n✅ Check completed\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    client.release();
    await pool.end();
  }
}

checkFormTableCreation()
  .then(() => {
    console.log('✅ Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error.message);
    process.exit(1);
  });
