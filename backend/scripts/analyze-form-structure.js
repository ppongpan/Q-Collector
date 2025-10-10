/**
 * Analyze Form Structure and Data Flow
 * ตรวจสอบ structure ของ form, sub-form, tables และ submissions
 */

const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: process.env.POSTGRES_PORT || 5432,
  database: process.env.POSTGRES_DB || 'qcollector_db',
  user: process.env.POSTGRES_USER || 'qcollector',
  password: process.env.POSTGRES_PASSWORD || 'qcollector_dev_2025'
});

async function analyzeFormStructure() {
  const client = await pool.connect();

  try {
    console.log('\n📊 === FORM STRUCTURE ANALYSIS ===\n');

    // 1. Check forms table
    console.log('1️⃣ MAIN FORMS:');
    console.log('─'.repeat(80));
    const formsQuery = `
      SELECT
        id,
        title,
        table_name,
        is_active,
        "createdAt"
      FROM forms
      ORDER BY "createdAt" DESC;
    `;
    const forms = await client.query(formsQuery);

    for (const form of forms.rows) {
      console.log(`\n📋 Form: ${form.title}`);
      console.log(`   ID: ${form.id}`);
      console.log(`   Table: ${form.table_name}`);
      console.log(`   Active: ${form.is_active}`);
      console.log(`   Created: ${form.createdAt}`);

      // Check if main form table exists
      const tableExistsQuery = `
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'public'
          AND table_name = $1
        );
      `;
      const tableExists = await client.query(tableExistsQuery, [form.table_name]);
      console.log(`   ✅ Main table exists: ${tableExists.rows[0].exists}`);

      if (tableExists.rows[0].exists) {
        // Count records in main form table
        const countQuery = `SELECT COUNT(*) FROM "${form.table_name}"`;
        const count = await client.query(countQuery);
        console.log(`   📊 Records in main table: ${count.rows[0].count}`);
      }

      // Check submissions in submissions table
      const submissionsQuery = `
        SELECT COUNT(*)
        FROM submissions
        WHERE form_id = $1 AND parent_id IS NULL;
      `;
      const submissions = await client.query(submissionsQuery, [form.id]);
      console.log(`   📊 Main submissions (parent_id IS NULL): ${submissions.rows[0].count}`);

      // 2. Check sub-forms
      console.log('\n   📁 SUB-FORMS:');
      const subFormsQuery = `
        SELECT
          id,
          title,
          table_name
        FROM sub_forms
        WHERE form_id = $1
        ORDER BY "createdAt";
      `;
      const subForms = await client.query(subFormsQuery, [form.id]);

      if (subForms.rows.length === 0) {
        console.log('   ℹ️  No sub-forms found');
      } else {
        for (const subForm of subForms.rows) {
          console.log(`\n   📂 Sub-form: ${subForm.title}`);
          console.log(`      ID: ${subForm.id}`);
          console.log(`      Table: ${subForm.table_name}`);

          // Check if sub-form table exists
          const subTableExists = await client.query(tableExistsQuery, [subForm.table_name]);
          console.log(`      ✅ Sub-form table exists: ${subTableExists.rows[0].exists}`);

          if (subTableExists.rows[0].exists) {
            // Get sub-form table structure
            const structureQuery = `
              SELECT column_name, data_type
              FROM information_schema.columns
              WHERE table_schema = 'public'
              AND table_name = $1
              ORDER BY ordinal_position;
            `;
            const structure = await client.query(structureQuery, [subForm.table_name]);
            console.log(`      📋 Columns (${structure.rows.length}):`);
            structure.rows.forEach(col => {
              console.log(`         - ${col.column_name} (${col.data_type})`);
            });

            // Count records in sub-form table
            const subCountQuery = `SELECT COUNT(*) FROM "${subForm.table_name}"`;
            const subCount = await client.query(subCountQuery);
            console.log(`      📊 Records in sub-form table: ${subCount.rows[0].count}`);
          }

          // Check submissions in submissions table for this sub-form
          const subSubmissionsQuery = `
            SELECT COUNT(*)
            FROM submissions
            WHERE sub_form_id = $1;
          `;
          const subSubmissions = await client.query(subSubmissionsQuery, [subForm.id]);
          console.log(`      📊 Sub-form submissions (sub_form_id): ${subSubmissions.rows[0].count}`);

          // Check submissions with parent_id (old method)
          const parentSubmissionsQuery = `
            SELECT COUNT(*)
            FROM submissions
            WHERE form_id = $1 AND parent_id IS NOT NULL;
          `;
          const parentSubmissions = await client.query(parentSubmissionsQuery, [subForm.id]);
          console.log(`      📊 Submissions with parent_id: ${parentSubmissions.rows[0].count}`);
        }
      }
    }

    console.log('\n');
    console.log('='.repeat(80));
    console.log('2️⃣ SUBMISSIONS TABLE ANALYSIS:');
    console.log('='.repeat(80));

    // Check submissions table structure
    const submissionsStructure = `
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'submissions'
      ORDER BY ordinal_position;
    `;
    const subStructure = await client.query(submissionsStructure);
    console.log('\n📋 Submissions table columns:');
    subStructure.rows.forEach(col => {
      console.log(`   - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });

    // Check data distribution
    console.log('\n📊 Data distribution:');
    const distributionQuery = `
      SELECT
        COUNT(*) FILTER (WHERE parent_id IS NULL) as main_submissions,
        COUNT(*) FILTER (WHERE parent_id IS NOT NULL) as child_submissions,
        COUNT(*) FILTER (WHERE sub_form_id IS NOT NULL) as with_subform_id,
        COUNT(*) as total
      FROM submissions;
    `;
    const distribution = await client.query(distributionQuery);
    console.log(`   - Main submissions (parent_id IS NULL): ${distribution.rows[0].main_submissions}`);
    console.log(`   - Child submissions (parent_id IS NOT NULL): ${distribution.rows[0].child_submissions}`);
    console.log(`   - With sub_form_id: ${distribution.rows[0].with_subform_id}`);
    console.log(`   - Total submissions: ${distribution.rows[0].total}`);

    console.log('\n');
    console.log('='.repeat(80));
    console.log('3️⃣ DYNAMIC TABLES:');
    console.log('='.repeat(80));

    // List all dynamic tables (starting with specific patterns)
    const dynamicTablesQuery = `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND (
        table_name LIKE 'q_%'
        OR table_name LIKE 'tracked_%'
        OR table_name LIKE '%_for_sale_%'
      )
      ORDER BY table_name;
    `;
    const dynamicTables = await client.query(dynamicTablesQuery);
    console.log(`\n📋 Found ${dynamicTables.rows.length} dynamic tables:\n`);

    for (const table of dynamicTables.rows) {
      const countQuery = `SELECT COUNT(*) FROM "${table.table_name}"`;
      const count = await client.query(countQuery);
      console.log(`   - ${table.table_name}: ${count.rows[0].count} records`);
    }

    console.log('\n✅ Analysis completed\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    client.release();
    await pool.end();
  }
}

analyzeFormStructure()
  .then(() => {
    console.log('✅ Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error.message);
    process.exit(1);
  });
