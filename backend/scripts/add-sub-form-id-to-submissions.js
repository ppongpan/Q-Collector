/**
 * Add sub_form_id column to submissions table
 * และ update ข้อมูลที่มีอยู่แล้วให้มี sub_form_id
 */

const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: process.env.POSTGRES_PORT || 5432,
  database: process.env.POSTGRES_DB || 'qcollector_db',
  user: process.env.POSTGRES_USER || 'qcollector',
  password: process.env.POSTGRES_PASSWORD || 'qcollector_dev_2025'
});

async function addSubFormIdColumn() {
  const client = await pool.connect();

  try {
    console.log('\n🔧 Adding sub_form_id column to submissions table...\n');

    await client.query('BEGIN');

    // 1. Check if column already exists
    const checkQuery = `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'submissions'
      AND column_name = 'sub_form_id';
    `;
    const checkResult = await client.query(checkQuery);

    if (checkResult.rows.length > 0) {
      console.log('✅ sub_form_id column already exists');
    } else {
      // 2. Add sub_form_id column
      const alterQuery = `
        ALTER TABLE submissions
        ADD COLUMN sub_form_id UUID REFERENCES sub_forms(id) ON DELETE CASCADE;
      `;
      await client.query(alterQuery);
      console.log('✅ Added sub_form_id column to submissions table');

      // 3. Create index
      await client.query('CREATE INDEX idx_submissions_sub_form_id ON submissions(sub_form_id);');
      console.log('✅ Created index on sub_form_id');
    }

    // 4. Check for submissions that should have sub_form_id
    // These are submissions with parent_id (child submissions)
    const orphanQuery = `
      SELECT s.id, s.form_id, s.parent_id
      FROM submissions s
      WHERE s.parent_id IS NOT NULL
      AND s.sub_form_id IS NULL
      LIMIT 10;
    `;
    const orphanResult = await client.query(orphanQuery);

    console.log(`\n📊 Found ${orphanResult.rows.length} submissions with parent_id but no sub_form_id`);

    if (orphanResult.rows.length > 0) {
      console.log('\n🔍 Analyzing submissions to find correct sub_form_id...\n');

      // For each orphan submission, try to find the sub_form_id
      for (const submission of orphanResult.rows) {
        // Get parent submission to find its form_id
        const parentQuery = `
          SELECT form_id
          FROM submissions
          WHERE id = $1;
        `;
        const parentResult = await client.query(parentQuery, [submission.parent_id]);

        if (parentResult.rows.length === 0) {
          console.log(`   ⚠️  Submission ${submission.id}: Parent not found`);
          continue;
        }

        const parentFormId = parentResult.rows[0].form_id;

        // Find sub_forms that belong to this parent form
        const subFormsQuery = `
          SELECT id, title
          FROM sub_forms
          WHERE form_id = $1;
        `;
        const subFormsResult = await client.query(subFormsQuery, [parentFormId]);

        if (subFormsResult.rows.length === 0) {
          console.log(`   ⚠️  Submission ${submission.id}: No sub-forms found for parent form ${parentFormId}`);
          continue;
        }

        if (subFormsResult.rows.length === 1) {
          // Only one sub-form, safe to assume this is the one
          const subFormId = subFormsResult.rows[0].id;
          const updateQuery = `
            UPDATE submissions
            SET sub_form_id = $1
            WHERE id = $2;
          `;
          await client.query(updateQuery, [subFormId, submission.id]);
          console.log(`   ✅ Submission ${submission.id}: Updated sub_form_id to ${subFormId} (${subFormsResult.rows[0].title})`);
        } else {
          console.log(`   ⚠️  Submission ${submission.id}: Multiple sub-forms found (${subFormsResult.rows.length}), cannot auto-update`);
          subFormsResult.rows.forEach(sf => {
            console.log(`      - ${sf.id}: ${sf.title}`);
          });
        }
      }
    }

    await client.query('COMMIT');

    // 5. Show final status
    console.log('\n📊 Final status:');
    const statusQuery = `
      SELECT
        COUNT(*) FILTER (WHERE parent_id IS NOT NULL AND sub_form_id IS NOT NULL) as with_sub_form_id,
        COUNT(*) FILTER (WHERE parent_id IS NOT NULL AND sub_form_id IS NULL) as without_sub_form_id,
        COUNT(*) FILTER (WHERE parent_id IS NULL) as main_form_submissions
      FROM submissions;
    `;
    const statusResult = await client.query(statusQuery);
    const stats = statusResult.rows[0];

    console.log(`   - Main form submissions: ${stats.main_form_submissions}`);
    console.log(`   - Sub-form submissions with sub_form_id: ${stats.with_sub_form_id}`);
    console.log(`   - Sub-form submissions WITHOUT sub_form_id: ${stats.without_sub_form_id}`);

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    client.release();
    await pool.end();
  }
}

addSubFormIdColumn()
  .then(() => {
    console.log('\n✅ Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error.message);
    process.exit(1);
  });
