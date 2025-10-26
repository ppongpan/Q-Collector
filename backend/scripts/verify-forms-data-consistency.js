/**
 * Verify Forms Data Consistency
 * Check all forms and submission counts across EAV and dynamic tables
 * Focus on demo testing forms
 *
 * Run: node backend/scripts/verify-forms-data-consistency.js
 *
 * @version v0.8.5-dev
 * @date 2025-10-25
 */

const { sequelize } = require('../config/database.config');
const { Form, Submission } = require('../models');
const { Op } = require('sequelize');

async function verifyFormsDataConsistency() {
  console.log('🔍 Verifying Forms Data Consistency...\n');
  console.log('='.repeat(80));
  console.log('\n');

  try {
    await sequelize.authenticate();
    console.log('✅ Database connected\n');

    // Get all forms with submission counts
    const forms = await Form.findAll({
      attributes: [
        'id',
        'title',
        'table_name',
        'createdAt',
        'updatedAt'
      ],
      include: [
        {
          model: Submission,
          as: 'submissions',
          attributes: [],
          required: false
        }
      ],
      group: ['Form.id'],
      order: [['createdAt', 'DESC']],
      raw: false
    });

    console.log(`📋 Found ${forms.length} forms in database\n`);
    console.log('='.repeat(80));
    console.log('\n');

    const results = [];
    let totalIssues = 0;

    for (const form of forms) {
      const formData = {
        id: form.id,
        title: form.title,
        table_name: form.table_name,
        createdAt: form.createdAt,
        issues: []
      };

      console.log(`📝 Form: ${form.title}`);
      console.log(`   ID: ${form.id}`);
      console.log(`   Table Name: ${form.table_name || 'NULL ⚠️'}`);
      console.log(`   Created: ${form.createdAt?.toISOString() || 'Unknown'}`);

      // Check if table_name is null
      if (!form.table_name) {
        formData.issues.push('⚠️ Missing table_name in form metadata');
        totalIssues++;
      }

      // Count submissions in EAV (submissions table)
      const eavCount = await Submission.count({
        where: { form_id: form.id }
      });

      console.log(`   📊 EAV Submissions: ${eavCount}`);
      formData.eav_count = eavCount;

      // Check if dynamic table exists
      if (form.table_name) {
        try {
          const tableCheckQuery = `
            SELECT EXISTS (
              SELECT FROM information_schema.tables
              WHERE table_schema = 'public'
              AND table_name = $1
            ) as table_exists;
          `;

          const [tableCheck] = await sequelize.query(tableCheckQuery, {
            bind: [form.table_name],
            type: sequelize.QueryTypes.SELECT
          });

          if (tableCheck.table_exists) {
            console.log(`   ✅ Dynamic Table: EXISTS`);
            formData.dynamic_table_exists = true;

            // Count rows in dynamic table
            try {
              const countQuery = `SELECT COUNT(*) as count FROM "${form.table_name}"`;
              const [countResult] = await sequelize.query(countQuery, {
                type: sequelize.QueryTypes.SELECT
              });

              const dynamicCount = parseInt(countResult.count) || 0;
              console.log(`   📊 Dynamic Table Rows: ${dynamicCount}`);
              formData.dynamic_table_count = dynamicCount;

              // Compare counts
              if (eavCount !== dynamicCount) {
                const diff = Math.abs(eavCount - dynamicCount);
                const issue = `❌ MISMATCH: EAV has ${eavCount}, Dynamic table has ${dynamicCount} (diff: ${diff})`;
                console.log(`   ${issue}`);
                formData.issues.push(issue);
                totalIssues++;
              } else {
                console.log(`   ✅ Data Consistent: ${eavCount} = ${dynamicCount}`);
                formData.data_consistent = true;
              }
            } catch (countError) {
              const issue = `❌ Error counting rows in dynamic table: ${countError.message}`;
              console.log(`   ${issue}`);
              formData.issues.push(issue);
              totalIssues++;
            }
          } else {
            const issue = `❌ Dynamic Table DOES NOT EXIST (but table_name is set)`;
            console.log(`   ${issue}`);
            formData.dynamic_table_exists = false;
            formData.issues.push(issue);
            totalIssues++;
          }
        } catch (error) {
          const issue = `❌ Error checking dynamic table: ${error.message}`;
          console.log(`   ${issue}`);
          formData.issues.push(issue);
          totalIssues++;
        }
      } else {
        console.log(`   ⚠️ No dynamic table configured (table_name is NULL)`);
        formData.dynamic_table_exists = false;
      }

      console.log('');
      results.push(formData);
    }

    // Summary Report
    console.log('='.repeat(80));
    console.log('📊 SUMMARY REPORT');
    console.log('='.repeat(80));
    console.log('');

    // Total forms
    console.log(`Total Forms: ${forms.length}`);

    // Forms with dynamic tables
    const formsWithTables = results.filter(r => r.table_name !== null);
    console.log(`Forms with table_name: ${formsWithTables.length}`);

    // Forms with existing dynamic tables
    const formsWithExistingTables = results.filter(r => r.dynamic_table_exists === true);
    console.log(`Forms with existing dynamic tables: ${formsWithExistingTables.length}`);

    // Forms with data consistency
    const formsWithConsistentData = results.filter(r => r.data_consistent === true);
    console.log(`Forms with consistent data: ${formsWithConsistentData.length}`);

    // Total submissions
    const totalSubmissions = results.reduce((sum, r) => sum + (r.eav_count || 0), 0);
    console.log(`Total Submissions (EAV): ${totalSubmissions}`);

    // Total issues
    console.log(`\nTotal Issues Found: ${totalIssues}`);
    console.log('');

    // List forms with issues
    const formsWithIssues = results.filter(r => r.issues.length > 0);
    if (formsWithIssues.length > 0) {
      console.log('='.repeat(80));
      console.log('⚠️ FORMS WITH ISSUES');
      console.log('='.repeat(80));
      console.log('');

      formsWithIssues.forEach((form, index) => {
        console.log(`${index + 1}. ${form.title}`);
        console.log(`   ID: ${form.id}`);
        console.log(`   Table: ${form.table_name || 'NULL'}`);
        console.log(`   Issues:`);
        form.issues.forEach(issue => {
          console.log(`   - ${issue}`);
        });
        console.log('');
      });
    } else {
      console.log('✅ No issues found! All forms have consistent data.\n');
    }

    // Demo/Testing Forms Report
    console.log('='.repeat(80));
    console.log('🧪 DEMO & TESTING FORMS');
    console.log('='.repeat(80));
    console.log('');

    const demoForms = results.filter(r =>
      r.title.toLowerCase().includes('demo') ||
      r.title.toLowerCase().includes('test') ||
      r.title.toLowerCase().includes('ทดสอบ') ||
      r.title.toLowerCase().includes('pdpa')
    );

    if (demoForms.length > 0) {
      console.log(`Found ${demoForms.length} demo/testing forms:\n`);

      demoForms.forEach((form, index) => {
        console.log(`${index + 1}. ${form.title}`);
        console.log(`   ID: ${form.id}`);
        console.log(`   Created: ${form.createdAt?.toISOString() || 'Unknown'}`);
        console.log(`   Table: ${form.table_name || 'NULL'}`);
        console.log(`   EAV Count: ${form.eav_count || 0}`);

        if (form.dynamic_table_exists) {
          console.log(`   Dynamic Table: ✅ EXISTS`);
          console.log(`   Dynamic Count: ${form.dynamic_table_count || 0}`);

          if (form.data_consistent) {
            console.log(`   Status: ✅ CONSISTENT`);
          } else {
            console.log(`   Status: ❌ INCONSISTENT`);
          }
        } else {
          console.log(`   Dynamic Table: ❌ MISSING`);
        }

        if (form.issues.length > 0) {
          console.log(`   Issues: ${form.issues.length}`);
          form.issues.forEach(issue => {
            console.log(`   - ${issue}`);
          });
        }
        console.log('');
      });
    } else {
      console.log('No demo/testing forms found.\n');
    }

    // Recommendations
    console.log('='.repeat(80));
    console.log('💡 RECOMMENDATIONS');
    console.log('='.repeat(80));
    console.log('');

    if (totalIssues === 0) {
      console.log('✅ All forms are consistent. No action needed.\n');
    } else {
      console.log('Actions needed:\n');

      const missingTables = results.filter(r =>
        r.table_name !== null && r.dynamic_table_exists === false
      );

      if (missingTables.length > 0) {
        console.log(`1. ${missingTables.length} form(s) have table_name but table doesn't exist`);
        console.log('   → Run create-missing-dynamic-table.js for each form\n');
      }

      const inconsistentData = results.filter(r =>
        r.dynamic_table_exists === true && r.data_consistent === false
      );

      if (inconsistentData.length > 0) {
        console.log(`2. ${inconsistentData.length} form(s) have data mismatch between EAV and dynamic table`);
        console.log('   → Run backfill script to sync data\n');
      }

      const nullTableNames = results.filter(r => !r.table_name);

      if (nullTableNames.length > 0) {
        console.log(`3. ${nullTableNames.length} form(s) have NULL table_name`);
        console.log('   → These are old forms created before v0.8.5');
        console.log('   → If submissions exist, consider creating tables and backfilling\n');
      }
    }

    console.log('='.repeat(80));
    console.log('\n✅ Verification complete\n');

    await sequelize.close();
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    await sequelize.close();
    process.exit(1);
  }
}

verifyFormsDataConsistency();
