/**
 * Script to verify subform submissions have correct parent_id linkage
 * Run after implementing FK resolution fix
 */

const { Submission, Form, SubForm, SubmissionData, Field } = require('../models');
const { sequelize } = require('../config/database.config');

async function checkSubformLinkage() {
  try {
    console.log('🔍 Checking subform submission parent linkage...\\n');

    // Get all submissions with statistics
    const allSubmissions = await Submission.findAll({
      attributes: ['id', 'form_id', 'parent_id', 'submitted_at', 'metadata'],
      include: [
        {
          model: Form,
          as: 'form',
          attributes: ['id', 'title']
        }
      ],
      order: [['submitted_at', 'DESC']],
      limit: 100
    });

    console.log(`Total submissions found: ${allSubmissions.length}\\n`);

    // Categorize submissions
    const mainFormSubmissions = allSubmissions.filter(s => !s.parent_id);
    const subFormSubmissions = allSubmissions.filter(s => s.parent_id);
    const orphanSubForms = allSubmissions.filter(s =>
      !s.parent_id && s.metadata?.is_subform === true
    );

    console.log(`📊 Breakdown:`);
    console.log(`  ✅ Main form submissions (parent_id = NULL, is_subform = false): ${mainFormSubmissions.filter(s => !s.metadata?.is_subform).length}`);
    console.log(`  ✅ Linked sub-form submissions (parent_id SET): ${subFormSubmissions.length}`);
    console.log(`  ❌ ORPHAN sub-form submissions (parent_id = NULL but is_subform = true): ${orphanSubForms.length}\\n`);

    // Show recent linked subform submissions
    if (subFormSubmissions.length > 0) {
      console.log('\\n✅ Recent LINKED Sub-Form Submissions:');
      console.log('='.repeat(100));
      subFormSubmissions.slice(0, 10).forEach(s => {
        const subformId = s.metadata?.subform_id || 'N/A';
        const parentIdShort = s.parent_id ? s.parent_id.substring(0, 8) + '...' : 'NULL';
        console.log(`  ID: ${s.id.substring(0, 8)}... | Form: ${s.form.title.substring(0, 30).padEnd(30)} | parent_id: ${parentIdShort} | subform_id: ${subformId}`);
      });
    } else {
      console.log('\\n⚠️  No linked subform submissions found yet.');
    }

    // Show orphan subform submissions (should be ZERO after fix)
    if (orphanSubForms.length > 0) {
      console.log('\\n❌ ORPHAN Sub-Form Submissions (THESE SHOULD NOT EXIST AFTER FIX):');
      console.log('='.repeat(100));
      orphanSubForms.forEach(s => {
        const subformId = s.metadata?.subform_id || 'N/A';
        console.log(`  ❌ ID: ${s.id} | Form: ${s.form.title} | subform_id: ${subformId}`);
        console.log(`     Metadata: ${JSON.stringify(s.metadata)}`);
        console.log(`     Submitted: ${s.submitted_at}`);
        console.log('');
      });
      console.log(`\\n🚨 ALERT: ${orphanSubForms.length} orphan subform submissions detected!`);
      console.log(`These were likely created before the FK resolution fix was implemented.`);
    }

    // Check specific subform table for data
    console.log('\\n📋 Checking specific subform tables...');

    const subforms = await SubForm.findAll({
      attributes: ['id', 'title', 'table_name', 'form_id'],
      include: [
        {
          model: Form,
          as: 'parentForm',
          attributes: ['id', 'title']
        }
      ]
    });

    console.log(`\\nFound ${subforms.length} subforms in database:\\n`);

    for (const subform of subforms) {
      console.log(`📑 Subform: ${subform.title}`);
      console.log(`   Parent Form: ${subform.parentForm.title}`);
      console.log(`   Table: ${subform.table_name || 'NOT SET'}`);

      if (subform.table_name) {
        try {
          // Count rows in subform dynamic table
          const [results] = await sequelize.query(
            `SELECT COUNT(*) as row_count FROM ${subform.table_name}`
          );
          const rowCount = results[0]?.row_count || 0;
          console.log(`   Dynamic Table Rows: ${rowCount}`);

          // Count linked submissions
          const linkedCount = await Submission.count({
            where: {
              form_id: subform.form_id,
              parent_id: { [sequelize.Sequelize.Op.ne]: null }
            }
          });
          console.log(`   Linked Submissions: ${linkedCount}`);

          if (rowCount !== linkedCount) {
            console.log(`   ⚠️  MISMATCH: Dynamic table has ${rowCount} rows but only ${linkedCount} submissions have parent_id`);
          } else if (rowCount > 0) {
            console.log(`   ✅ MATCH: All ${rowCount} rows are properly linked`);
          }
        } catch (tableError) {
          console.log(`   ❌ Error checking table: ${tableError.message}`);
        }
      }
      console.log('');
    }

    // Summary
    console.log('\\n' + '='.repeat(100));
    console.log('SUMMARY:');
    console.log('='.repeat(100));

    if (subFormSubmissions.length > 0 && orphanSubForms.length === 0) {
      console.log('✅ SUCCESS: FK resolution is working correctly!');
      console.log(`   - ${subFormSubmissions.length} subform submissions are properly linked with parent_id`);
      console.log('   - No orphan subform submissions detected');
    } else if (orphanSubForms.length > 0) {
      console.log('⚠️  ORPHAN SUBMISSIONS DETECTED:');
      console.log(`   - ${orphanSubForms.length} subform submissions without parent_id`);
      console.log('   - These were likely created before the fix was implemented');
      console.log('   - Delete these and re-import to verify the fix works');
    } else {
      console.log('ℹ️  No subform submissions found yet. Test by importing a subform with FK mappings.');
    }

    await sequelize.close();
  } catch (error) {
    console.error('Error checking subform linkage:', error);
    process.exit(1);
  }
}

checkSubformLinkage();
