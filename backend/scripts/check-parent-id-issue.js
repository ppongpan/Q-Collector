/**
 * Check parent_id issue in sub-form submissions
 * Verify correct parent_id references
 */

const { Submission, SubForm, Form } = require('../models');

async function checkParentIdIssue() {
  try {
    console.log('🔍 Checking parent_id issue in sub-form submissions...\n');

    // Get the specific submission the user mentioned
    const targetSubmissionId = '456e7c86-63e4-4b51-a823-81b471d31254';
    const wrongSubmissionId = '486294c8-aef8-40ff-b5c0-7a9cf76555e9';

    // Get both submissions
    const targetSubmission = await Submission.findByPk(targetSubmissionId, {
      include: [
        { model: Form, as: 'form', attributes: ['id', 'title', 'table_name'] }
      ]
    });

    const wrongSubmission = await Submission.findByPk(wrongSubmissionId, {
      include: [
        { model: Form, as: 'form', attributes: ['id', 'title', 'table_name'] }
      ]
    });

    if (!targetSubmission) {
      console.log(`❌ Target submission ${targetSubmissionId} not found`);
    } else {
      console.log('✅ Target submission (expected parent):');
      console.log(`   ID: ${targetSubmission.id}`);
      console.log(`   Form: ${targetSubmission.form?.title || 'N/A'} (${targetSubmission.form_id})`);
      console.log(`   Sub-form ID: ${targetSubmission.sub_form_id || 'NULL (main form)'}`);
      console.log(`   Parent ID: ${targetSubmission.parent_id || 'NULL (main form)'}`);
      console.log(`   Status: ${targetSubmission.status}`);
      console.log(`   Created: ${targetSubmission.createdAt}\n`);
    }

    if (!wrongSubmission) {
      console.log(`❌ Wrong submission ${wrongSubmissionId} not found`);
    } else {
      console.log('⚠️  Wrong submission (incorrect parent):');
      console.log(`   ID: ${wrongSubmission.id}`);
      console.log(`   Form: ${wrongSubmission.form?.title || 'N/A'} (${wrongSubmission.form_id})`);
      console.log(`   Sub-form ID: ${wrongSubmission.sub_form_id || 'NULL (main form)'}`);
      console.log(`   Parent ID: ${wrongSubmission.parent_id || 'NULL (main form)'}`);
      console.log(`   Status: ${wrongSubmission.status}`);
      console.log(`   Created: ${wrongSubmission.createdAt}\n`);
    }

    // Get all submissions for this form
    if (targetSubmission) {
      const formId = targetSubmission.form_id;
      const allMainSubmissions = await Submission.findAll({
        where: {
          form_id: formId,
          parent_id: null
        },
        order: [['createdAt', 'DESC']],
        limit: 10
      });

      console.log(`📋 Recent main form submissions (${allMainSubmissions.length}):`)
      allMainSubmissions.forEach((sub, index) => {
        const marker = sub.id === targetSubmissionId ? '✅' :
                       sub.id === wrongSubmissionId ? '⚠️ ' : '  ';
        console.log(`   ${marker} ${index + 1}. ${sub.id} (${sub.status}, ${sub.createdAt})`);
      });
      console.log();

      // Get sub-form submissions
      const subFormSubmissions = await Submission.findAll({
        where: {
          form_id: formId,
          parent_id: [targetSubmissionId, wrongSubmissionId]
        },
        include: [
          { model: SubForm, as: 'subForm', attributes: ['id', 'title', 'table_name'] }
        ],
        order: [['createdAt', 'DESC']]
      });

      console.log(`📄 Sub-form submissions (${subFormSubmissions.length}):`);
      subFormSubmissions.forEach((sub, index) => {
        const parentMarker = sub.parent_id === targetSubmissionId ? '✅ Correct parent' :
                            sub.parent_id === wrongSubmissionId ? '❌ Wrong parent' : '❓ Unknown';
        console.log(`   ${index + 1}. ${sub.id}`);
        console.log(`      Sub-form: ${sub.subForm?.title || 'N/A'}`);
        console.log(`      Parent: ${sub.parent_id} (${parentMarker})`);
        console.log(`      Table: ${sub.subForm?.table_name || 'N/A'}`);
        console.log(`      Created: ${sub.createdAt}`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

checkParentIdIssue();
