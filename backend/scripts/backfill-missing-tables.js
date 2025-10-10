/**
 * Backfill Missing Tables
 * สร้าง dynamic tables สำหรับ forms และ sub-forms ที่ยังไม่มี table_name
 *
 * Use Case:
 * - Forms ที่ถูกสร้างก่อน v0.7.5 และ table creation ล้มเหลว
 * - Forms ที่ table creation timeout หรือ API ล้มเหลว
 *
 * @version 0.7.5-dev
 * @date 2025-10-09
 */

const { Form, SubForm, Field, sequelize } = require('../models');
const DynamicTableService = require('../services/DynamicTableService');
const logger = require('../utils/logger.util');

async function backfillMissingTables() {
  console.log('\n🔧 === BACKFILL MISSING TABLES ===\n');

  try {
    const dynamicTableService = new DynamicTableService();
    let totalFormsFixed = 0;
    let totalSubFormsFixed = 0;
    let totalFormsFailed = 0;
    let totalSubFormsFailed = 0;

    // 1. Find forms without table_name
    console.log('📋 Step 1: Finding forms without table_name...\n');
    const forms = await Form.findAll({
      where: { table_name: null },
      include: [
        {
          model: Field,
          as: 'fields',
          separate: true,
          order: [['order', 'ASC']]
        }
      ]
    });

    console.log(`Found ${forms.length} forms without tables\n`);

    for (const form of forms) {
      try {
        console.log(`Processing form: ${form.title} (${form.id})`);

        // Filter to only main form fields (exclude sub-form fields)
        const mainFields = form.fields.filter(f => f.sub_form_id === null || f.sub_form_id === undefined);
        console.log(`  Main form has ${mainFields.length} fields (filtered from ${form.fields.length} total)`);

        const tableName = await dynamicTableService.createFormTable({
          id: form.id,
          title: form.title,
          fields: mainFields
        });

        console.log(`  ✅ Created table: ${tableName}`);
        totalFormsFixed++;
      } catch (error) {
        console.error(`  ❌ Failed to create table for form ${form.id}:`, error.message);
        totalFormsFailed++;
      }
      console.log('');
    }

    // 2. Find sub-forms without table_name
    console.log('📁 Step 2: Finding sub-forms without table_name...\n');
    const subForms = await SubForm.findAll({
      where: { table_name: null },
      include: [
        {
          model: Field,
          as: 'fields',
          separate: true,
          order: [['order', 'ASC']]
        },
        {
          model: Form,
          as: 'form',
          attributes: ['id', 'title', 'table_name']
        }
      ]
    });

    console.log(`Found ${subForms.length} sub-forms without tables\n`);

    for (const subForm of subForms) {
      try {
        console.log(`Processing sub-form: ${subForm.title} (${subForm.id})`);
        console.log(`  Parent form: ${subForm.form.title}`);
        console.log(`  Parent form table: ${subForm.form.table_name || 'NOT SET'}`);

        // Check if parent form has table_name
        if (!subForm.form.table_name) {
          console.log(`  ⚠️  Parent form doesn't have table_name, skipping sub-form`);
          console.log(`     Run this script again after fixing parent forms\n`);
          continue;
        }

        const tableName = await dynamicTableService.createSubFormTable(
          {
            id: subForm.id,
            title: subForm.title,
            fields: subForm.fields || []
          },
          subForm.form.table_name,
          subForm.form_id
        );

        console.log(`  ✅ Created sub-form table: ${tableName}`);
        totalSubFormsFixed++;
      } catch (error) {
        console.error(`  ❌ Failed to create sub-form table for ${subForm.id}:`, error.message);
        totalSubFormsFailed++;
      }
      console.log('');
    }

    // 3. Summary
    console.log('='.repeat(80));
    console.log('\n📊 SUMMARY:\n');
    console.log(`Forms:`);
    console.log(`  - Total found without table_name: ${forms.length}`);
    console.log(`  - Successfully created: ${totalFormsFixed}`);
    console.log(`  - Failed: ${totalFormsFailed}`);
    console.log('');
    console.log(`Sub-forms:`);
    console.log(`  - Total found without table_name: ${subForms.length}`);
    console.log(`  - Successfully created: ${totalSubFormsFixed}`);
    console.log(`  - Failed: ${totalSubFormsFailed}`);
    console.log('');

    if (totalFormsFailed > 0 || totalSubFormsFailed > 0) {
      console.log('⚠️  Some tables failed to create. Check logs above for details.');
    }

    if (totalFormsFixed === 0 && totalSubFormsFixed === 0) {
      console.log('✅ All forms and sub-forms already have tables!');
    } else {
      console.log(`✅ Successfully backfilled ${totalFormsFixed} forms and ${totalSubFormsFixed} sub-forms`);
    }

    // 4. Verification
    console.log('\n🔍 VERIFICATION:\n');
    const formsStillMissing = await Form.count({ where: { table_name: null } });
    const subFormsStillMissing = await SubForm.count({ where: { table_name: null } });

    console.log(`Forms still without table_name: ${formsStillMissing}`);
    console.log(`Sub-forms still without table_name: ${subFormsStillMissing}`);

    if (formsStillMissing > 0 || subFormsStillMissing > 0) {
      console.log('\n⚠️  Some forms still don\'t have tables. Reasons could be:');
      console.log('   1. Translation API failed (rate limited)');
      console.log('   2. Database connection issues');
      console.log('   3. Invalid field definitions');
      console.log('\nYou can run this script again to retry.');
    } else {
      console.log('\n✅ All forms and sub-forms now have tables!');
    }

    console.log('\n');

  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

// Run the script
backfillMissingTables()
  .then(() => {
    console.log('✅ Script completed');
  })
  .catch((error) => {
    console.error('❌ Script failed:', error.message);
    process.exit(1);
  });
