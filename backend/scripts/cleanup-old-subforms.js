/**
 * Cleanup Old Sub-Forms
 *
 * This script deletes old sub-forms that belong to inactive forms
 */

require('dotenv').config();
const { Pool } = require('pg');
const readline = require('readline');

const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: process.env.POSTGRES_PORT || 5432,
  database: process.env.POSTGRES_DB || 'qcollector_db',
  user: process.env.POSTGRES_USER || 'qcollector',
  password: process.env.POSTGRES_PASSWORD || 'qcollector_dev_2025'
});

// Sub-forms to delete (from inactive forms)
const OLD_SUBFORMS = [
  {
    id: '667a789c-faf4-4ef9-8cea-9eead69985db',
    title: 'บันทึกรายการติดตามลูกค้า',
    table: 'save_customer_track_list_9eead69985db',
    form_id: 'bbde9946-d555-4acc-8596-5cd5d92d8ff0'
  },
  {
    id: '57c986a7-deb1-4d47-a432-cda188aa8cac',
    title: 'บันทึกเพิ่มเติม',
    table: 'order_notes_cda188aa8cac',
    form_id: 'db8926aa-303c-457a-bb9a-d7c06a934b38'
  },
  {
    id: '54412481-feb9-4937-b3c9-180a4bbf5f6d',
    title: 'บันทึกการเข้าบริการ',
    table: 'service_log_180a4bbf5f6d',
    form_id: 'b376bdb1-1471-4546-a871-8c8a7cc7221d'
  }
];

// Keep this sub-form (belongs to active form)
const KEEP_SUBFORM = {
  id: 'a3b5824a-d954-4f4e-9eae-a71d473fd421',
  title: 'รายการติดตามงานขาย',
  table: 'sales_task_tracker_a71d473fd421',
  form_id: '2930365a-1734-48ec-9b58-c72bd400d0be'
};

async function cleanupOldSubForms() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║            Cleanup Old Sub-Forms                           ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  try {
    // Step 1: Verify active form
    console.log('📋 Step 1: Verifying active form...\n');

    const activeForm = await pool.query(`
      SELECT id, title, table_name
      FROM forms
      WHERE is_active = true
      LIMIT 1;
    `);

    if (activeForm.rows.length === 0) {
      console.log('❌ No active form found!\n');
      return;
    }

    console.log(`✅ Active Form: "${activeForm.rows[0].title}"`);
    console.log(`   ID: ${activeForm.rows[0].id}`);
    console.log(`   Table: ${activeForm.rows[0].table_name}\n`);

    // Verify the sub-form to keep belongs to active form
    if (KEEP_SUBFORM.form_id !== activeForm.rows[0].id) {
      console.log('⚠️  Warning: Sub-form to keep does not belong to active form!\n');
      console.log(`   Expected form_id: ${activeForm.rows[0].id}`);
      console.log(`   Actual form_id: ${KEEP_SUBFORM.form_id}\n`);
    }

    // Step 2: Display sub-forms to delete
    console.log('🗑️  Step 2: Sub-forms to DELETE:\n');

    for (const subForm of OLD_SUBFORMS) {
      console.log(`   ❌ "${subForm.title}"`);
      console.log(`      ID: ${subForm.id}`);
      console.log(`      Table: ${subForm.table}`);
      console.log(`      Form ID: ${subForm.form_id}`);

      // Check if table exists
      const tableExists = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'public'
          AND table_name = $1
        );
      `, [subForm.table]);

      if (tableExists.rows[0].exists) {
        const count = await pool.query(`SELECT COUNT(*) as count FROM "${subForm.table}"`);
        console.log(`      Status: Table exists with ${count.rows[0].count} records`);
      } else {
        console.log(`      Status: Table does not exist`);
      }

      // Check fields
      const fields = await pool.query(`
        SELECT COUNT(*) as count FROM fields WHERE sub_form_id = $1
      `, [subForm.id]);

      console.log(`      Fields: ${fields.rows[0].count}\n`);
    }

    // Step 3: Display sub-form to keep
    console.log('✅ Step 3: Sub-form to KEEP:\n');
    console.log(`   ✅ "${KEEP_SUBFORM.title}"`);
    console.log(`      ID: ${KEEP_SUBFORM.id}`);
    console.log(`      Table: ${KEEP_SUBFORM.table}`);
    console.log(`      Form ID: ${KEEP_SUBFORM.form_id}\n`);

    // Step 4: Ask for confirmation
    console.log('═══════════════════════════════════════════════════════════');
    console.log('                    ⚠️  WARNING ⚠️');
    console.log('═══════════════════════════════════════════════════════════\n');
    console.log(`This will DELETE ${OLD_SUBFORMS.length} sub-forms and their data permanently!\n`);
    console.log('Actions:');
    console.log('  1. Delete sub-form records from sub_forms table');
    console.log('  2. Delete associated fields from fields table');
    console.log('  3. Drop dynamic tables\n');
    console.log('This action CANNOT be undone.\n');

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const answer = await new Promise(resolve => {
      rl.question('Type "DELETE" to confirm deletion, or anything else to cancel: ', resolve);
    });

    rl.close();

    if (answer.trim() !== 'DELETE') {
      console.log('\n❌ Deletion cancelled. No changes were made.\n');
      return;
    }

    // Step 5: Delete old sub-forms
    console.log('\n🗑️  Deleting old sub-forms...\n');

    let deletedSubForms = 0;
    let deletedFields = 0;
    let droppedTables = 0;

    for (const subForm of OLD_SUBFORMS) {
      console.log(`Processing "${subForm.title}"...\n`);

      try {
        // Delete fields first
        const fieldsResult = await pool.query(`
          DELETE FROM fields WHERE sub_form_id = $1 RETURNING id
        `, [subForm.id]);

        console.log(`   ✅ Deleted ${fieldsResult.rows.length} fields`);
        deletedFields += fieldsResult.rows.length;

        // Drop table if exists
        const tableExists = await pool.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_name = $1
          );
        `, [subForm.table]);

        if (tableExists.rows[0].exists) {
          await pool.query(`DROP TABLE IF EXISTS "${subForm.table}" CASCADE`);
          console.log(`   ✅ Dropped table: ${subForm.table}`);
          droppedTables++;
        } else {
          console.log(`   ℹ️  Table does not exist: ${subForm.table}`);
        }

        // Delete sub-form
        await pool.query(`
          DELETE FROM sub_forms WHERE id = $1
        `, [subForm.id]);

        console.log(`   ✅ Deleted sub-form: ${subForm.title}\n`);
        deletedSubForms++;

      } catch (error) {
        console.log(`   ❌ Error: ${error.message}\n`);
      }
    }

    // Step 6: Verify remaining sub-forms
    console.log('═══════════════════════════════════════════════════════════');
    console.log('                         SUMMARY                            ');
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log(`✅ Deleted ${deletedSubForms} sub-forms`);
    console.log(`✅ Deleted ${deletedFields} fields`);
    console.log(`✅ Dropped ${droppedTables} tables\n`);

    const remainingSubForms = await pool.query(`
      SELECT id, title, table_name
      FROM sub_forms
      ORDER BY "createdAt" DESC;
    `);

    console.log(`📊 Remaining sub-forms: ${remainingSubForms.rows.length}\n`);

    for (const subForm of remainingSubForms.rows) {
      console.log(`   ✅ "${subForm.title}"`);
      console.log(`      ID: ${subForm.id}`);
      console.log(`      Table: ${subForm.table_name}\n`);
    }

    if (remainingSubForms.rows.length === 1) {
      console.log('✅ Database cleanup completed successfully!\n');
      console.log('   Only 1 sub-form remains (as expected)\n');
    } else {
      console.log(`⚠️  Warning: Expected 1 sub-form but found ${remainingSubForms.rows.length}\n`);
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

cleanupOldSubForms().catch(console.error);
