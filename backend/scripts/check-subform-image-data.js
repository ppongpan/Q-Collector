/**
 * Check Sub-form Image Data
 * Debug script to check if image data exists in sub-form table
 */

const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: process.env.POSTGRES_PORT || 5432,
  database: process.env.POSTGRES_DB || 'qcollector_db',
  user: process.env.POSTGRES_USER || 'qcollector',
  password: process.env.POSTGRES_PASSWORD || 'qcollector_dev_2025'
});

async function checkSubFormData() {
  try {
    console.log('🔍 Finding sub-forms...\n');

    // Find sub-forms
    const subForms = await pool.query(`
      SELECT id, title, table_name, form_id
      FROM sub_forms
      ORDER BY id DESC
      LIMIT 10
    `);

    console.log(`Found ${subForms.rows.length} sub-forms:\n`);
    subForms.rows.forEach((sf, i) => {
      console.log(`${i + 1}. ${sf.title}`);
      console.log(`   ID: ${sf.id}`);
      console.log(`   Table: ${sf.table_name}`);
      console.log('');
    });

    // Query each sub-form table
    for (const subForm of subForms.rows) {
      if (!subForm.table_name) continue;

      try {
        console.log(`\n${'='.repeat(80)}`);
        console.log(`📋 Checking table: ${subForm.table_name}`);
        console.log(`   Sub-form: ${subForm.title}`);
        console.log(`${'='.repeat(80)}\n`);

        const data = await pool.query(`SELECT * FROM "${subForm.table_name}" LIMIT 3`);

        if (data.rows.length === 0) {
          console.log('⚠️  No data in this table\n');
          continue;
        }

        console.log(`Found ${data.rows.length} rows\n`);
        console.log('Columns:', Object.keys(data.rows[0]).join(', '));
        console.log('');

        data.rows.forEach((row, i) => {
          console.log(`Row ${i + 1}:`);

          // Show all columns
          Object.entries(row).forEach(([key, value]) => {
            // Highlight image/file columns
            const isFileColumn = key.includes('phap') || key.includes('image') || key.includes('file');
            const prefix = isFileColumn ? '🖼️ ' : '   ';

            if (value === null) {
              console.log(`${prefix}${key}: NULL`);
            } else if (value === '') {
              console.log(`${prefix}${key}: "" (empty string)`);
            } else if (typeof value === 'string' && value.length > 50) {
              console.log(`${prefix}${key}: "${value.substring(0, 50)}..." (${value.length} chars)`);
            } else {
              console.log(`${prefix}${key}: "${value}"`);
            }
          });
          console.log('');
        });

      } catch (tableError) {
        console.error(`❌ Error querying table ${subForm.table_name}:`, tableError.message);
      }
    }

    await pool.end();
    console.log('\n✅ Check complete');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    await pool.end();
    process.exit(1);
  }
}

checkSubFormData();
