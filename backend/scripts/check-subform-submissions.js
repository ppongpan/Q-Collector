/**
 * Script to check subform submissions in the database
 * Verify if parent_id is set correctly for subform imports
 */

const { Submission, Form, SubmissionData, Field } = require('../models');
const { sequelize } = require('../config/database.config');

async function checkSubmissions() {
  try {
    console.log('🔍 Checking submissions for parent_id...\n');

    // Get all submissions
    const submissions = await Submission.findAll({
      attributes: ['id', 'form_id', 'parent_id', 'submitted_at', 'metadata'],
      order: [['submitted_at', 'DESC']],
      limit: 50,
      include: [
        {
          model: Form,
          as: 'form',
          attributes: ['id', 'title']
        }
      ]
    });

    console.log(`Total submissions found: ${submissions.length}\n`);

    const mainFormSubmissions = submissions.filter(s => !s.parent_id);
    const subFormSubmissions = submissions.filter(s => s.parent_id);

    console.log(`📊 Breakdown:`);
    console.log(`  - Main form submissions (parent_id = NULL): ${mainFormSubmissions.length}`);
    console.log(`  - Sub-form submissions (parent_id SET): ${subFormSubmissions.length}\n`);

    console.log('📋 Recent Main Form Submissions (parent_id = NULL):');
    console.log('='.repeat(100));
    mainFormSubmissions.slice(0, 10).forEach(s => {
      const isSubform = s.metadata?.is_subform || false;
      const subformId = s.metadata?.subform_id || 'N/A';
      console.log(`ID: ${s.id.substring(0, 8)}... | Form: ${s.form.title.substring(0, 30)} | parent_id: ${s.parent_id || 'NULL'} | is_subform: ${isSubform} | subform_id: ${subformId}`);
    });

    console.log('\n📋 Recent Sub-Form Submissions (parent_id SET):');
    console.log('='.repeat(100));
    subFormSubmissions.slice(0, 10).forEach(s => {
      const isSubform = s.metadata?.is_subform || false;
      const subformId = s.metadata?.subform_id || 'N/A';
      console.log(`ID: ${s.id.substring(0, 8)}... | Form: ${s.form.title.substring(0, 30)} | parent_id: ${s.parent_id.substring(0, 8)}... | is_subform: ${isSubform} | subform_id: ${subformId}`);
    });

    // Check for mismatched submissions (metadata says is_subform but parent_id is NULL)
    console.log('\n⚠️  Checking for MISMATCHED submissions (is_subform=true but parent_id=NULL):');
    console.log('='.repeat(100));
    const mismatched = mainFormSubmissions.filter(s => s.metadata?.is_subform === true);

    if (mismatched.length > 0) {
      console.log(`❌ FOUND ${mismatched.length} MISMATCHED SUBMISSIONS!`);
      mismatched.forEach(s => {
        const subformId = s.metadata?.subform_id || 'N/A';
        console.log(`  - ID: ${s.id} | Form: ${s.form.title} | subform_id: ${subformId}`);
        console.log(`    Metadata: ${JSON.stringify(s.metadata)}`);
      });
    } else {
      console.log('✅ No mismatched submissions found.');
    }

    await sequelize.close();
  } catch (error) {
    console.error('Error checking submissions:', error);
    process.exit(1);
  }
}

checkSubmissions();
