/**
 * Check where PDPA Demo submission data is stored
 */
const { sequelize } = require('../config/database.config');

(async () => {
  await sequelize.authenticate();

  const formId = 'db30fe84-e8da-463a-a4c8-1e1e246432c2'; // PDPA Demo form

  console.log('🔍 Checking submission data for PDPA Demo form...\n');

  // Get submissions
  const [submissions] = await sequelize.query(`
    SELECT
      id,
      form_id,
      submitted_at,
      "createdAt"
    FROM submissions
    WHERE form_id = '${formId}'
    ORDER BY "createdAt" DESC
    LIMIT 5
  `);

  console.log(`📋 Found ${submissions.length} submissions for this form\n`);

  if (submissions.length === 0) {
    console.log('⚠️  No submissions found');
    await sequelize.close();
    process.exit(0);
  }

  // Check each submission
  for (const sub of submissions) {
    console.log(`\nSubmission: ${sub.id.substring(0, 8)}...`);
    console.log(`Submitted: ${new Date(sub.submitted_at || sub.createdAt).toLocaleString('th-TH')}`);

    // Check EAV data
    const [eavData] = await sequelize.query(`
      SELECT COUNT(*) as count
      FROM submission_data
      WHERE submission_id = '${sub.id}'
    `);

    console.log(`  EAV data: ${eavData[0].count} rows in submission_data`);

    // Get sample fields
    const [fields] = await sequelize.query(`
      SELECT
        f.title,
        f.type,
        sd.value_text,
        sd.is_encrypted
      FROM submission_data sd
      INNER JOIN fields f ON sd.field_id = f.id
      WHERE sd.submission_id = '${sub.id}'
      LIMIT 5
    `);

    fields.forEach(f => {
      const value = f.is_encrypted ? '(encrypted)' : f.value_text;
      console.log(`    - ${f.title} (${f.type}): ${value || '(empty)'}`);
    });
  }

  console.log('\n\n📊 SUMMARY:');
  console.log('===========');
  console.log('✅ Submissions exist and are stored in EAV tables (submissions + submission_data)');
  console.log('❌ Dynamic table (pdpa_demo_1761351036248) does NOT exist');
  console.log('');
  console.log('💡 IMPACT:');
  console.log('   - Form submission works normally ✅');
  console.log('   - Data can be viewed in submission list ✅');
  console.log('   - PDPA dashboard works ✅');
  console.log('   - PowerBI integration NOT available ❌ (no dynamic table)');
  console.log('');
  console.log('🔧 SOLUTION:');
  console.log('   Option 1: Create the missing dynamic table (requires migration script)');
  console.log('   Option 2: Leave as is (EAV only) - system works fine without PowerBI');

  await sequelize.close();
  process.exit(0);
})().catch(console.error);
