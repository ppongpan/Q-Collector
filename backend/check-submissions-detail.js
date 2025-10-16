/**
 * Check detailed information about submissions
 */

const { Sequelize } = require('sequelize');
require('dotenv').config({ path: '../.env' });

const sequelize = new Sequelize(
  process.env.POSTGRES_DB || 'qcollector_db',
  process.env.POSTGRES_USER || 'qcollector',
  process.env.POSTGRES_PASSWORD || 'qcollector_dev_2025',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.POSTGRES_PORT || 5432,
    dialect: 'postgres',
    logging: false
  }
);

async function checkSubmissions() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection successful\n');

    // Get all submissions with related data
    const [submissions] = await sequelize.query(`
      SELECT
        s.id,
        s.form_id,
        f.title as form_title,
        f.table_name as form_table,
        s.sub_form_id,
        sf.title as sub_form_title,
        sf.table_name as sub_form_table,
        s.submitted_by,
        u.username,
        s.status,
        s.submitted_at,
        s.parent_id,
        s."createdAt",
        s."updatedAt"
      FROM public.submissions s
      LEFT JOIN public.forms f ON s.form_id = f.id
      LEFT JOIN public.sub_forms sf ON s.sub_form_id = sf.id
      LEFT JOIN public.users u ON s.submitted_by = u.id
      ORDER BY s."createdAt" DESC;
    `);

    console.log('='.repeat(80));
    console.log(`📋 SUBMISSIONS TABLE - Total: ${submissions.length} rows`);
    console.log('='.repeat(80));

    if (submissions.length === 0) {
      console.log('❌ No submissions found!');
      await sequelize.close();
      return;
    }

    submissions.forEach((sub, index) => {
      console.log(`\n${'─'.repeat(80)}`);
      console.log(`Submission ${index + 1}:`);
      console.log(`${'─'.repeat(80)}`);
      console.log(`ID: ${sub.id}`);
      console.log(`Form: ${sub.form_title || 'UNKNOWN'} (ID: ${sub.form_id})`);
      console.log(`Form Table: ${sub.form_table || 'N/A'}`);
      console.log(`Sub-Form: ${sub.sub_form_title || 'N/A'} (ID: ${sub.sub_form_id || 'N/A'})`);
      console.log(`Sub-Form Table: ${sub.sub_form_table || 'N/A'}`);
      console.log(`Submitted By: ${sub.username || 'UNKNOWN'} (ID: ${sub.submitted_by || 'N/A'})`);
      console.log(`Status: ${sub.status}`);
      console.log(`Submitted At: ${sub.submitted_at}`);
      console.log(`Parent ID: ${sub.parent_id || 'N/A (Main Form)'}`);
      console.log(`Created: ${sub.createdAt}`);
      console.log(`Updated: ${sub.updatedAt}`);
    });

    // Check submission_data for these submissions
    console.log('\n\n' + '='.repeat(80));
    console.log('📊 SUBMISSION DATA (EAV Structure)');
    console.log('='.repeat(80));

    for (const sub of submissions) {
      const [data] = await sequelize.query(`
        SELECT
          sd.id,
          sd.field_id,
          f.title as field_title,
          f.type as field_type,
          sd.value_text,
          sd.value_type,
          sd.is_encrypted
        FROM public.submission_data sd
        LEFT JOIN public.fields f ON sd.field_id = f.id
        WHERE sd.submission_id = '${sub.id}'
        ORDER BY f.order;
      `);

      console.log(`\n${'─'.repeat(80)}`);
      console.log(`Data for Submission: ${sub.id}`);
      console.log(`Form: ${sub.form_title || 'UNKNOWN'}`);
      console.log(`${'─'.repeat(80)}`);

      if (data.length === 0) {
        console.log('  ❌ No submission data found!');
      } else {
        data.forEach((item, idx) => {
          console.log(`  ${idx + 1}. ${item.field_title || 'UNKNOWN FIELD'} (${item.field_type})`);
          console.log(`     Value: ${item.value_text || '(empty)'}`);
          console.log(`     Type: ${item.value_type}, Encrypted: ${item.is_encrypted}`);
        });
      }
    }

    // Check if forms still exist
    console.log('\n\n' + '='.repeat(80));
    console.log('🔍 CHECKING IF PARENT FORMS EXIST');
    console.log('='.repeat(80));

    const [forms] = await sequelize.query(`
      SELECT id, title, is_active, table_name
      FROM public.forms
      ORDER BY "createdAt" DESC;
    `);

    console.log(`\nTotal Forms in Database: ${forms.length}`);
    forms.forEach((form, idx) => {
      const hasSubmissions = submissions.some(s => s.form_id === form.id);
      console.log(`  ${idx + 1}. ${form.title} (${form.is_active ? '✅ Active' : '❌ Inactive'})`);
      console.log(`     ID: ${form.id}`);
      console.log(`     Table: ${form.table_name || 'N/A'}`);
      console.log(`     Has Submissions: ${hasSubmissions ? 'YES' : 'NO'}`);
    });

    // Check orphaned submissions
    console.log('\n\n' + '='.repeat(80));
    console.log('⚠️  ORPHANED SUBMISSIONS CHECK');
    console.log('='.repeat(80));

    const orphanedSubmissions = submissions.filter(s => !s.form_title);
    if (orphanedSubmissions.length > 0) {
      console.log(`\n❌ Found ${orphanedSubmissions.length} orphaned submissions (form was deleted):`);
      orphanedSubmissions.forEach((sub, idx) => {
        console.log(`  ${idx + 1}. Submission ID: ${sub.id}`);
        console.log(`     Form ID: ${sub.form_id} (DELETED)`);
        console.log(`     Created: ${sub.createdAt}`);
      });
      console.log('\n💡 These submissions should be cleaned up.');
    } else {
      console.log('\n✅ No orphaned submissions found.');
    }

    // Check if sub_form_id is set but shouldn't be
    console.log('\n\n' + '='.repeat(80));
    console.log('🔍 CHECKING SUB-FORM RELATIONSHIPS');
    console.log('='.repeat(80));

    const mainFormSubmissions = submissions.filter(s => !s.parent_id);
    const subFormSubmissions = submissions.filter(s => s.parent_id);

    console.log(`\nMain Form Submissions (parent_id IS NULL): ${mainFormSubmissions.length}`);
    mainFormSubmissions.forEach((sub, idx) => {
      console.log(`  ${idx + 1}. ${sub.form_title || 'UNKNOWN'}`);
      console.log(`     Has sub_form_id: ${sub.sub_form_id ? 'YES (⚠️  SUSPICIOUS!)' : 'NO (✅ Correct)'}`);
    });

    console.log(`\nSub-Form Submissions (parent_id IS NOT NULL): ${subFormSubmissions.length}`);
    subFormSubmissions.forEach((sub, idx) => {
      console.log(`  ${idx + 1}. ${sub.sub_form_title || 'UNKNOWN'}`);
      console.log(`     Parent: ${sub.parent_id}`);
      console.log(`     Has sub_form_id: ${sub.sub_form_id ? 'YES (✅ Correct)' : 'NO (⚠️  SHOULD HAVE!)'}`);
    });

    console.log('\n');
    await sequelize.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

checkSubmissions();
