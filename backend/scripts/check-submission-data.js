/**
 * Check Submission Data in Database
 * Verifies if submissions are being saved correctly
 */

require('dotenv').config();
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  process.env.POSTGRES_DB || 'qcollector_db',
  process.env.POSTGRES_USER || 'qcollector',
  process.env.POSTGRES_PASSWORD || 'qcollector_dev_2025',
  {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: process.env.POSTGRES_PORT || 5432,
    dialect: 'postgres',
    logging: false,
  }
);

async function checkSubmissionData() {
  console.log('\n=================================================');
  console.log('📊 CHECKING SUBMISSION DATA IN DATABASE');
  console.log('=================================================\n');

  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established\n');

    // 1. Check submissions table
    const [submissions] = await sequelize.query(`
      SELECT
        s.id,
        s.form_id,
        s.submitted_by,
        s.status,
        s.submitted_at,
        f.title as form_title,
        f.table_name as form_table,
        u.username as submitter_name
      FROM submissions s
      LEFT JOIN forms f ON s.form_id = f.id
      LEFT JOIN users u ON s.submitted_by = u.id
      ORDER BY s.submitted_at DESC
      LIMIT 20
    `);

    console.log('📝 SUBMISSIONS TABLE:\n');
    console.log(`Total submissions: ${submissions.length}\n`);

    if (submissions.length === 0) {
      console.log('⚠️  No submissions found in database!\n');
    } else {
      submissions.forEach((sub, i) => {
        console.log(`${i + 1}. Submission ${sub.id.substring(0, 8)}...`);
        console.log(`   Form: ${sub.form_title || 'Unknown'} (${sub.form_id})`);
        console.log(`   Dynamic Table: ${sub.form_table || 'NULL'}`);
        console.log(`   Submitted by: ${sub.submitter_name || 'Unknown'}`);
        console.log(`   Status: ${sub.status}`);
        console.log(`   Date: ${sub.submitted_at}\n`);
      });
    }

    // 2. Check submission_data table
    const [submissionData] = await sequelize.query(`
      SELECT COUNT(*) as count
      FROM submission_data
    `);

    console.log(`📋 SUBMISSION DATA RECORDS: ${submissionData[0].count}\n`);

    // 3. Check all dynamic form tables
    const [dynamicTables] = await sequelize.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name LIKE 'form_%'
      AND table_name != 'forms'
      ORDER BY table_name
    `);

    console.log('📊 DYNAMIC FORM TABLES:\n');
    console.log(`Total dynamic tables: ${dynamicTables.length}\n`);

    for (const table of dynamicTables) {
      const [count] = await sequelize.query(`
        SELECT COUNT(*) as count FROM "${table.table_name}"
      `);

      const [sample] = await sequelize.query(`
        SELECT * FROM "${table.table_name}" LIMIT 3
      `);

      console.log(`Table: ${table.table_name}`);
      console.log(`  Records: ${count[0].count}`);

      if (sample.length > 0) {
        console.log(`  Sample data:`);
        sample.forEach((row, i) => {
          console.log(`    ${i + 1}. ID: ${row.id ? row.id.substring(0, 8) : 'N/A'}... Status: ${row.status || 'N/A'}`);
        });
      }
      console.log();
    }

    // 4. Check forms table
    const [forms] = await sequelize.query(`
      SELECT id, title, table_name, is_active, "createdAt"
      FROM forms
      ORDER BY "createdAt" DESC
    `);

    console.log('📝 FORMS TABLE:\n');
    forms.forEach((form, i) => {
      console.log(`${i + 1}. ${form.title}`);
      console.log(`   ID: ${form.id}`);
      console.log(`   Table: ${form.table_name || 'NULL ⚠️'}`);
      console.log(`   Active: ${form.is_active}`);
      console.log(`   Created: ${form.createdAt}\n`);
    });

    console.log('=================================================\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    throw error;
  } finally {
    await sequelize.close();
  }
}

checkSubmissionData()
  .then(() => {
    console.log('✅ Check completed\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Check failed:', error);
    process.exit(1);
  });
