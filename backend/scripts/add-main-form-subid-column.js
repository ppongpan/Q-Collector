/**
 * Add main_form_subid Column to Sub-form Tables
 *
 * This column stores the ACTUAL parent main form submission ID
 * from the dynamic table (not the submissions table ID)
 */

const { Pool } = require('pg');
const { Submission } = require('../models');

async function addMainFormSubId() {
  const pool = new Pool({
    host: process.env.POSTGRES_HOST || 'localhost',
    port: process.env.POSTGRES_PORT || 5432,
    database: process.env.POSTGRES_DB || 'qcollector_db',
    user: process.env.POSTGRES_USER || 'qcollector',
    password: process.env.POSTGRES_PASSWORD || 'qcollector_dev_2025'
  });

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    console.log('🔧 Adding main_form_subid to Sub-form Tables\n');
    console.log('=' .repeat(80) + '\n');

    // Get sub-form table name
    const subFormTableQuery = `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name LIKE '%form%'
      AND table_name NOT LIKE '%technical%'
      AND table_name != 'forms'
      AND table_name != 'sub_forms'
      ORDER BY table_name;
    `;

    const subFormTables = await client.query(subFormTableQuery);

    console.log(`📊 Found ${subFormTables.rows.length} potential sub-form tables\n`);

    for (const table of subFormTables.rows) {
      const tableName = table.table_name;

      // Check if table has parent_id column (indicates it's a sub-form table)
      const checkParentIdQuery = `
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = $1
        AND column_name = 'parent_id';
      `;

      const hasParentId = await client.query(checkParentIdQuery, [tableName]);

      if (hasParentId.rows.length === 0) {
        console.log(`⏭️  Skipping ${tableName} (no parent_id column)\n`);
        continue;
      }

      console.log(`📋 Processing ${tableName}...\n`);

      // Step 1: Add main_form_subid column
      const addColumnQuery = `
        ALTER TABLE "${tableName}"
        ADD COLUMN IF NOT EXISTS main_form_subid UUID;
      `;

      await client.query(addColumnQuery);
      console.log(`✅ Added main_form_subid column to ${tableName}\n`);

      // Step 2: Get all sub-form submissions
      const getSubFormsQuery = `
        SELECT id, parent_id
        FROM "${tableName}"
        ORDER BY submitted_at DESC;
      `;

      const subForms = await client.query(getSubFormsQuery);
      console.log(`   Found ${subForms.rows.length} sub-form submissions\n`);

      // Step 3: For each sub-form, find the actual main form ID from dynamic table
      let updatedCount = 0;

      for (const subForm of subForms.rows) {
        // Get the submission record
        const submission = await Submission.findByPk(subForm.parent_id);

        if (!submission) {
          console.log(`   ⚠️  Sub-form ${subForm.id.substring(0, 8)}... parent not found in submissions table`);
          continue;
        }

        // Get the form and its table name
        const formQuery = `
          SELECT id, table_name, title
          FROM forms
          WHERE id = $1;
        `;

        const formResult = await client.query(formQuery, [submission.form_id]);

        if (formResult.rows.length === 0) {
          console.log(`   ⚠️  Form not found for submission ${submission.id}`);
          continue;
        }

        const form = formResult.rows[0];

        // Get the main form submission from dynamic table
        // The parent_id in submissions table matches the ID in dynamic table
        const getDynamicIdQuery = `
          SELECT id
          FROM "${form.table_name}"
          WHERE id = $1;
        `;

        const dynamicResult = await client.query(getDynamicIdQuery, [submission.id]);

        let mainFormSubId;

        if (dynamicResult.rows.length > 0) {
          // Use the ID from dynamic table
          mainFormSubId = dynamicResult.rows[0].id;
        } else {
          // Fallback: Check if parent_id exists in dynamic table
          const checkParentQuery = `
            SELECT id
            FROM "${form.table_name}"
            WHERE form_id = $1
            ORDER BY submitted_at DESC
            LIMIT 1;
          `;

          const parentCheck = await client.query(checkParentQuery, [form.id]);

          if (parentCheck.rows.length > 0) {
            mainFormSubId = parentCheck.rows[0].id;
          } else {
            console.log(`   ⚠️  Cannot find main form ID for sub-form ${subForm.id.substring(0, 8)}...`);
            continue;
          }
        }

        // Update the sub-form with main_form_subid
        const updateQuery = `
          UPDATE "${tableName}"
          SET main_form_subid = $1
          WHERE id = $2
          RETURNING id, parent_id, main_form_subid;
        `;

        const updateResult = await client.query(updateQuery, [mainFormSubId, subForm.id]);

        if (updateResult.rows.length > 0) {
          updatedCount++;
          const row = updateResult.rows[0];
          console.log(`   ✅ Updated sub-form ${row.id.substring(0, 8)}...`);
          console.log(`      parent_id: ${row.parent_id.substring(0, 8)}... (submissions table)`);
          console.log(`      main_form_subid: ${row.main_form_subid.substring(0, 8)}... (dynamic table)\n`);
        }
      }

      console.log(`   📊 Updated ${updatedCount}/${subForms.rows.length} records in ${tableName}\n`);
      console.log('   ' + '-'.repeat(76) + '\n');
    }

    console.log('=' .repeat(80));
    console.log('\n🎉 MIGRATION COMPLETE!\n');
    console.log('Summary:');
    console.log(`   - Processed ${subFormTables.rows.length} tables`);
    console.log('   - Added main_form_subid column to all sub-form tables');
    console.log('   - Updated existing records with correct main form IDs\n');

    console.log('💾 Committing changes...\n');
    await client.query('COMMIT');
    console.log('✅ Changes committed successfully!\n');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    client.release();
    await pool.end();
    process.exit(0);
  }
}

addMainFormSubId();
