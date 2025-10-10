/**
 * Check Sub-Form Table and Submissions
 */

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: process.env.POSTGRES_PORT || 5432,
  database: process.env.POSTGRES_DB || 'qcollector_db',
  user: process.env.POSTGRES_USER || 'qcollector',
  password: process.env.POSTGRES_PASSWORD || 'qcollector_dev_2025'
});

async function checkSubFormTable() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║       Check Sub-Form Table & Submissions                  ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  try {
    // Get sub-form info
    const subFormId = 'a3b5824a-d954-4f4e-9eae-a71d473fd421';

    const subForm = await pool.query(`
      SELECT sf.id, sf.title, sf.table_name, sf.form_id,
             f.title as main_form_title, f.table_name as main_table_name
      FROM sub_forms sf
      JOIN forms f ON sf.form_id = f.id
      WHERE sf.id = $1;
    `, [subFormId]);

    if (subForm.rows.length === 0) {
      console.log('❌ Sub-form not found\n');
      return;
    }

    const sf = subForm.rows[0];
    console.log(`📋 Sub-Form: "${sf.title}"`);
    console.log(`   ID: ${sf.id}`);
    console.log(`   Table Name: ${sf.table_name || 'NULL ❌'}`);
    console.log(`   Main Form: "${sf.main_form_title}"`);
    console.log(`   Main Table: ${sf.main_table_name}\n`);

    // Check if table exists
    if (sf.table_name) {
      const tableExists = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'public'
          AND table_name = $1
        );
      `, [sf.table_name]);

      console.log(`🗃️  Table Exists: ${tableExists.rows[0].exists ? '✅ Yes' : '❌ No'}\n`);

      if (tableExists.rows[0].exists) {
        // Check table structure
        const columns = await pool.query(`
          SELECT column_name, data_type
          FROM information_schema.columns
          WHERE table_name = $1
          ORDER BY ordinal_position;
        `, [sf.table_name]);

        console.log(`📊 Table Structure (${columns.rows.length} columns):`);
        for (const col of columns.rows) {
          console.log(`   - ${col.column_name} (${col.data_type})`);
        }
        console.log('');

        // Check records count
        const count = await pool.query(`
          SELECT COUNT(*) as count FROM "${sf.table_name}";
        `);
        console.log(`📝 Records in table: ${count.rows[0].count}\n`);

        if (count.rows[0].count > 0) {
          const sample = await pool.query(`
            SELECT * FROM "${sf.table_name}" LIMIT 3;
          `);
          console.log(`📄 Sample data:`);
          for (const row of sample.rows) {
            console.log(`   ${JSON.stringify(row, null, 2)}`);
          }
        }
      }
    } else {
      console.log('⚠️  Sub-form does not have a table_name!\n');
      console.log('💡 Solution: Table should be created automatically when form is created.');
      console.log('   If this is an old sub-form, you may need to create the table manually.\n');
    }

    // Check submissions
    console.log('═══════════════════════════════════════════════════════════');
    console.log('Submissions Check\n');

    const submissions = await pool.query(`
      SELECT id, form_id, parent_id, submitted_by, submitted_at, status
      FROM submissions
      WHERE form_id = $1
      ORDER BY submitted_at DESC
      LIMIT 5;
    `, [subFormId]);

    console.log(`📬 Submissions in 'submissions' table: ${submissions.rows.length}\n`);

    if (submissions.rows.length > 0) {
      for (const sub of submissions.rows) {
        console.log(`   Submission ID: ${sub.id}`);
        console.log(`   Parent ID: ${sub.parent_id || 'NULL'}`);
        console.log(`   Submitted: ${sub.submitted_at}`);
        console.log(`   Status: ${sub.status}\n`);
      }
    }

    // Check fields
    console.log('═══════════════════════════════════════════════════════════');
    console.log('Fields Check\n');

    const fields = await pool.query(`
      SELECT id, title, type, form_id, sub_form_id
      FROM fields
      WHERE form_id = $1
      ORDER BY "order";
    `, [subFormId]);

    console.log(`📝 Fields in database: ${fields.rows.length}\n`);

    for (const field of fields.rows) {
      console.log(`   - "${field.title}" (${field.type})`);
      console.log(`     form_id: ${field.form_id}`);
      console.log(`     sub_form_id: ${field.sub_form_id || 'NULL'}\n`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
  } finally {
    await pool.end();
  }
}

checkSubFormTable().catch(console.error);
