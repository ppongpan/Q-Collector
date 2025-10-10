/**
 * Check Sub-Forms Detail
 *
 * This script checks all sub-forms in the database and identifies duplicates
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

async function checkSubFormsDetail() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║            Check Sub-Forms Detail                          ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  try {
    // Step 1: Get all sub-forms from sub_forms table
    console.log('📋 Step 1: Querying sub_forms table...\n');

    const subForms = await pool.query(`
      SELECT id, title, title_en, form_id, table_name, "order", "createdAt", "updatedAt"
      FROM sub_forms
      ORDER BY "createdAt" DESC;
    `);

    console.log(`Found ${subForms.rows.length} sub-forms in database:\n`);

    if (subForms.rows.length === 0) {
      console.log('⚠️  No sub-forms found in sub_forms table!\n');

      // Check fields table for sub-form references
      console.log('📊 Step 2: Checking fields table for sub_form_id references...\n');

      const fieldsWithSubFormId = await pool.query(`
        SELECT id, title, type, form_id, sub_form_id, "order"
        FROM fields
        WHERE sub_form_id IS NOT NULL
        ORDER BY "order";
      `);

      console.log(`Found ${fieldsWithSubFormId.rows.length} fields with sub_form_id:\n`);

      for (const field of fieldsWithSubFormId.rows) {
        console.log(`📝 Field: "${field.title}"`);
        console.log(`   ID: ${field.id}`);
        console.log(`   Type: ${field.type}`);
        console.log(`   Form ID: ${field.form_id}`);
        console.log(`   Sub-Form ID: ${field.sub_form_id}`);
        console.log(`   Order: ${field.order}\n`);
      }

      // Get the main form
      const mainForm = await pool.query(`
        SELECT id, title, table_name
        FROM forms
        WHERE is_active = true
        LIMIT 1;
      `);

      if (mainForm.rows.length > 0) {
        console.log(`📋 Main Form: "${mainForm.rows[0].title}"`);
        console.log(`   ID: ${mainForm.rows[0].id}`);
        console.log(`   Table: ${mainForm.rows[0].table_name}\n`);

        // Get all fields for this form
        const allFields = await pool.query(`
          SELECT id, title, type, sub_form_id, "order"
          FROM fields
          WHERE form_id = $1
          ORDER BY "order";
        `, [mainForm.rows[0].id]);

        console.log(`📊 All fields for this form (${allFields.rows.length}):\n`);
        for (const field of allFields.rows) {
          console.log(`   ${field.order}. ${field.title} (${field.type})${field.sub_form_id ? ' - SUB-FORM FIELD' : ''}`);
        }
      }

      return;
    }

    // Display sub-forms
    for (const subForm of subForms.rows) {
      console.log(`📦 Sub-Form ${subForm.order || 'N/A'}: "${subForm.title}"`);
      console.log(`   ID: ${subForm.id}`);
      console.log(`   Title EN: ${subForm.title_en || 'NULL'}`);
      console.log(`   Form ID: ${subForm.form_id}`);
      console.log(`   Table: ${subForm.table_name}`);
      console.log(`   Created: ${subForm.createdAt}`);
      console.log(`   Updated: ${subForm.updatedAt}`);

      // Check if table exists
      const tableExists = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'public'
          AND table_name = $1
        );
      `, [subForm.table_name]);

      if (tableExists.rows[0].exists) {
        const count = await pool.query(`SELECT COUNT(*) as count FROM "${subForm.table_name}"`);
        console.log(`   ✅ Table exists with ${count.rows[0].count} records`);
      } else {
        console.log(`   ❌ Table DOES NOT exist!`);
      }

      // Get fields for this sub-form
      const fields = await pool.query(`
        SELECT id, title, type, "order"
        FROM fields
        WHERE sub_form_id = $1
        ORDER BY "order";
      `, [subForm.id]);

      console.log(`   📝 Fields: ${fields.rows.length}`);
      for (const field of fields.rows) {
        console.log(`      ${field.order}. ${field.title} (${field.type})`);
      }

      console.log('');
    }

    // Step 2: Check for duplicates
    console.log('\n📊 Step 2: Checking for duplicates...\n');

    const duplicateCheck = await pool.query(`
      SELECT title, COUNT(*) as count
      FROM sub_forms
      GROUP BY title
      HAVING COUNT(*) > 1;
    `);

    if (duplicateCheck.rows.length > 0) {
      console.log(`⚠️  Found ${duplicateCheck.rows.length} duplicate sub-form titles:\n`);
      for (const dup of duplicateCheck.rows) {
        console.log(`   - "${dup.title}" appears ${dup.count} times`);
      }
    } else {
      console.log('✅ No duplicate sub-form titles found\n');
    }

    // Step 3: Recommendations
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('                     RECOMMENDATIONS                        ');
    console.log('═══════════════════════════════════════════════════════════\n');

    if (subForms.rows.length > 1) {
      console.log('⚠️  Multiple sub-forms found. If only 1 should exist:\n');
      console.log('1. Identify which sub-form to keep (usually the most recent)\n');
      console.log('2. Delete the old sub-forms and their tables\n');
      console.log('3. Update fields table to reference the correct sub_form_id\n');
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

checkSubFormsDetail().catch(console.error);
