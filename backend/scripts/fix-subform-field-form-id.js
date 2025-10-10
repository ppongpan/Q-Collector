/**
 * Fix SubForm Field form_id
 *
 * Problem: Sub-form fields have form_id pointing to main form instead of sub-form
 * This causes sub-form fields to be included in main form table columns
 *
 * Fix: Update fields where sub_form_id IS NOT NULL to have form_id = sub_form_id
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

async function fixSubFormFieldFormId() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║       Fix SubForm Field form_id                            ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  try {
    // Find all fields with sub_form_id that have wrong form_id
    const wrongFields = await pool.query(`
      SELECT
        f.id as field_id,
        f.form_id as current_form_id,
        f.sub_form_id,
        f.title as field_title,
        sf.title as subform_title,
        mf.title as main_form_title
      FROM fields f
      JOIN sub_forms sf ON f.sub_form_id = sf.id
      JOIN forms mf ON sf.form_id = mf.id
      WHERE f.sub_form_id IS NOT NULL
        AND f.form_id != f.sub_form_id
      ORDER BY mf.title, sf.title, f.order;
    `);

    if (wrongFields.rows.length === 0) {
      console.log('✅ No fields need fixing. All sub-form fields have correct form_id.\n');
      return;
    }

    console.log(`Found ${wrongFields.rows.length} fields with incorrect form_id:\n`);

    // Group by main form and sub-form
    const grouped = {};
    for (const row of wrongFields.rows) {
      const key = `${row.main_form_title} > ${row.subform_title}`;
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(row);
    }

    for (const [groupKey, fields] of Object.entries(grouped)) {
      console.log(`📋 ${groupKey}:`);
      for (const field of fields) {
        console.log(`   - Field: "${field.field_title}"`);
        console.log(`     Current form_id: ${field.current_form_id}`);
        console.log(`     Should be: ${field.sub_form_id}\n`);
      }
    }

    // Fix the fields
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const updateResult = await client.query(`
        UPDATE fields
        SET form_id = sub_form_id
        WHERE sub_form_id IS NOT NULL
          AND form_id != sub_form_id
        RETURNING id, title, form_id, sub_form_id;
      `);

      await client.query('COMMIT');

      console.log('\n╔════════════════════════════════════════════════════════════╗');
      console.log('║                    Results                                 ║');
      console.log('╚════════════════════════════════════════════════════════════╝\n');

      console.log(`✅ Fixed ${updateResult.rows.length} fields\n`);

      for (const row of updateResult.rows) {
        console.log(`   ✅ "${row.title}" → form_id now = ${row.form_id}`);
      }

      console.log('\n📝 Note: You may need to recreate form tables to remove incorrect columns.');
      console.log('   Use the form edit page to trigger table recreation.\n');

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
  } finally {
    await pool.end();
  }
}

fixSubFormFieldFormId().catch(console.error);
