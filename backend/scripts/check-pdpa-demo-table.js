/**
 * Check PDPA Demo Form and Dynamic Table
 * Verify table configuration and existence
 *
 * Run: node backend/scripts/check-pdpa-demo-table.js
 *
 * @version v0.8.5-dev
 * @date 2025-10-25
 */

const { sequelize } = require('../config/database.config');

async function checkPdpaDemoTable() {
  console.log('🔍 Checking PDPA Demo form and table...\n');

  try {
    await sequelize.authenticate();
    console.log('✅ Database connected\n');

    // Step 1: Find the PDPA Demo form
    const [forms] = await sequelize.query(`
      SELECT *
      FROM forms
      WHERE title LIKE '%PDPA-Demo 2025-10-25%'
      ORDER BY "createdAt" DESC
    `);

    if (forms.length === 0) {
      console.log('❌ Form not found');
      await sequelize.close();
      process.exit(1);
    }

    const form = forms[0];
    console.log('📋 FORM DETAILS:');
    console.log('================');
    console.log(`Form ID: ${form.id}`);
    console.log(`Title: ${form.title}`);
    console.log(`Table Name: ${form.table_name || '(none)'}`);
    console.log(`Created At: ${new Date(form.createdAt).toLocaleString('th-TH')}`);
    console.log('');

    // Step 2: Check if the table exists
    if (form.table_name) {
      console.log(`🔍 Checking if table "${form.table_name}" exists...\n`);

      const [tables] = await sequelize.query(`
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
          AND tablename = '${form.table_name}'
      `);

      if (tables.length > 0) {
        console.log(`✅ Table "${form.table_name}" EXISTS\n`);

        // Get table structure
        const [columns] = await sequelize.query(`
          SELECT
            column_name,
            data_type,
            is_nullable
          FROM information_schema.columns
          WHERE table_name = '${form.table_name}'
          ORDER BY ordinal_position
        `);

        console.log('📊 TABLE STRUCTURE:');
        console.log('==================');
        columns.forEach(col => {
          console.log(`  ${col.column_name} (${col.data_type}) ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
        });
        console.log('');

        // Get row count
        const [countResult] = await sequelize.query(`
          SELECT COUNT(*) as total FROM ${form.table_name}
        `);
        console.log(`📈 Total rows in table: ${countResult[0].total}\n`);

        // Get sample data
        if (countResult[0].total > 0) {
          const [sampleData] = await sequelize.query(`
            SELECT * FROM ${form.table_name} LIMIT 5
          `);
          console.log('📝 Sample data (first 5 rows):');
          console.log(JSON.stringify(sampleData, null, 2));
        }
      } else {
        console.log(`❌ Table "${form.table_name}" DOES NOT EXIST\n`);

        // Check if there are similar table names
        const [similarTables] = await sequelize.query(`
          SELECT tablename
          FROM pg_tables
          WHERE schemaname = 'public'
            AND tablename LIKE 'pdpa_demo%'
          ORDER BY tablename
        `);

        if (similarTables.length > 0) {
          console.log('📋 Similar tables found:');
          similarTables.forEach(t => console.log(`  - ${t.tablename}`));
          console.log('');
        }
      }
    } else {
      console.log('⚠️  Form has no table_name configured (using EAV only)\n');
    }

    // Step 3: Check submissions
    const [submissions] = await sequelize.query(`
      SELECT
        id,
        submitted_at,
        "createdAt"
      FROM submissions
      WHERE form_id = '${form.id}'
      ORDER BY "createdAt" DESC
      LIMIT 10
    `);

    console.log(`\n📊 SUBMISSIONS: ${submissions.length} submissions found\n`);
    submissions.forEach((s, idx) => {
      console.log(`${idx + 1}. ${s.id.substring(0, 8)}... at ${new Date(s.submitted_at || s.createdAt).toLocaleString('th-TH')}`);
    });

    // Step 4: Check if data is in EAV tables
    if (submissions.length > 0) {
      const [eavCount] = await sequelize.query(`
        SELECT COUNT(*) as total
        FROM submission_data
        WHERE submission_id IN (
          SELECT id FROM submissions WHERE form_id = '${form.id}'
        )
      `);
      console.log(`\n📋 EAV Data: ${eavCount[0].total} rows in submission_data\n`);
    }

    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    await sequelize.close();
    process.exit(1);
  }
}

checkPdpaDemoTable();
