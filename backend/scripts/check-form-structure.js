/**
 * Check Form Structure
 * Verify forms with fields and sub-forms
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: process.env.POSTGRES_PORT || 5432,
  database: process.env.POSTGRES_DB || 'qcollector_db',
  user: process.env.POSTGRES_USER || 'qcollector',
  password: process.env.POSTGRES_PASSWORD || 'qcollector_dev_2025'
});

async function checkFormStructure() {
  try {
    console.log('🔍 Checking form structure...\n');

    // Get recent 3 forms
    const formsResult = await pool.query(`
      SELECT id, title, table_name
      FROM forms
      ORDER BY "createdAt" DESC
      LIMIT 3
    `);

    console.log(`Found ${formsResult.rows.length} recent forms:\n`);

    for (const form of formsResult.rows) {
      console.log(`📋 Form: "${form.title}"`);
      console.log(`   ID: ${form.id}`);
      console.log(`   Table: ${form.table_name || 'N/A'}`);

      // Get fields
      const fieldsResult = await pool.query(`
        SELECT id, title, type, "order", order_index
        FROM fields
        WHERE form_id = $1
        ORDER BY COALESCE(order_index, "order", 0)
      `, [form.id]);

      console.log(`   Fields: ${fieldsResult.rows.length}`);
      fieldsResult.rows.forEach((f, idx) => {
        console.log(`     ${idx + 1}. ${f.title} (${f.type}) [order: ${f.order}, order_index: ${f.order_index}]`);
      });

      // Get sub-forms
      const subFormsResult = await pool.query(`
        SELECT id, title, "order", order_index, table_name
        FROM sub_forms
        WHERE form_id = $1
        ORDER BY COALESCE(order_index, "order", 0)
      `, [form.id]);

      console.log(`   Sub-forms: ${subFormsResult.rows.length}`);
      subFormsResult.rows.forEach((s, idx) => {
        console.log(`     ${idx + 1}. ${s.title} [order: ${s.order}, order_index: ${s.order_index}] table: ${s.table_name || 'N/A'}`);
      });

      console.log('');
    }

    console.log('✨ Check complete!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

checkFormStructure().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
