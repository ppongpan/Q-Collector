/**
 * Cleanup Orphaned Data
 *
 * This script checks for forms and submissions that don't have matching records
 * in their dynamic tables and provides options to clean them up.
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

async function cleanupOrphanedData() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║          Cleanup Orphaned Data in Database                ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  try {
    // Step 1: Get all forms
    console.log('📋 Step 1: Checking Forms...\n');
    const forms = await pool.query(`
      SELECT id, title, table_name, is_active, "createdAt"
      FROM forms
      ORDER BY "createdAt" DESC;
    `);

    console.log(`Found ${forms.rows.length} forms in database:\n`);

    const orphanedForms = [];
    const activeForms = [];

    for (const form of forms.rows) {
      console.log(`📝 "${form.title}" (${form.id})`);
      console.log(`   Table: ${form.table_name || 'NULL'}`);
      console.log(`   Active: ${form.is_active}`);
      console.log(`   Created: ${form.createdAt}`);

      // Check if dynamic table exists
      if (form.table_name) {
        const tableExists = await pool.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_name = $1
          );
        `, [form.table_name]);

        if (tableExists.rows[0].exists) {
          // Check how many records in dynamic table
          const count = await pool.query(`SELECT COUNT(*) as count FROM "${form.table_name}"`);
          console.log(`   ✅ Dynamic table exists with ${count.rows[0].count} records`);
          activeForms.push(form);
        } else {
          console.log(`   ❌ Dynamic table MISSING!`);
          orphanedForms.push(form);
        }
      } else {
        console.log(`   ⚠️  No table_name assigned`);
        orphanedForms.push(form);
      }
      console.log('');
    }

    // Step 2: Get all submissions
    console.log('\n📦 Step 2: Checking Submissions...\n');
    const submissions = await pool.query(`
      SELECT s.id, s.form_id, s.parent_id, s.submitted_by, s.submitted_at,
             f.title as form_title, f.table_name as form_table_name
      FROM submissions s
      LEFT JOIN forms f ON s.form_id = f.id
      ORDER BY s.submitted_at DESC
      LIMIT 50;
    `);

    console.log(`Found ${submissions.rows.length} recent submissions:\n`);

    const orphanedSubmissions = [];
    const validSubmissions = [];

    for (const sub of submissions.rows) {
      const isSubForm = sub.parent_id !== null;
      const typeLabel = isSubForm ? 'SUB-FORM' : 'MAIN FORM';

      console.log(`${typeLabel} Submission ${sub.id.substring(0, 8)}...`);
      console.log(`   Form: ${sub.form_title || 'UNKNOWN'}`);
      console.log(`   Table: ${sub.form_table_name || 'NULL'}`);
      console.log(`   Submitted: ${sub.submitted_at}`);

      // Check if form exists
      if (!sub.form_title) {
        console.log(`   ❌ ORPHANED: Form not found in database`);
        orphanedSubmissions.push(sub);
        console.log('');
        continue;
      }

      // Check if record exists in dynamic table
      if (sub.form_table_name) {
        const tableExists = await pool.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_name = $1
          );
        `, [sub.form_table_name]);

        if (tableExists.rows[0].exists) {
          const recordExists = await pool.query(`
            SELECT EXISTS (
              SELECT FROM "${sub.form_table_name}"
              WHERE id = $1
            );
          `, [sub.id]);

          if (recordExists.rows[0].exists) {
            console.log(`   ✅ Valid: Record exists in dynamic table`);
            validSubmissions.push(sub);
          } else {
            console.log(`   ❌ ORPHANED: Record missing from dynamic table`);
            orphanedSubmissions.push(sub);
          }
        } else {
          console.log(`   ❌ ORPHANED: Dynamic table does not exist`);
          orphanedSubmissions.push(sub);
        }
      } else {
        console.log(`   ⚠️  No table_name for form`);
        orphanedSubmissions.push(sub);
      }
      console.log('');
    }

    // Step 3: Summary
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('                         SUMMARY                            ');
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log(`📊 Forms:`);
    console.log(`   Total: ${forms.rows.length}`);
    console.log(`   Active (with valid tables): ${activeForms.length}`);
    console.log(`   Orphaned (missing tables): ${orphanedForms.length}\n`);

    console.log(`📦 Submissions (recent 50):`);
    console.log(`   Valid: ${validSubmissions.length}`);
    console.log(`   Orphaned: ${orphanedSubmissions.length}\n`);

    // Step 4: List orphaned items
    if (orphanedForms.length > 0) {
      console.log('⚠️  Orphaned Forms:\n');
      for (const form of orphanedForms) {
        console.log(`   - "${form.title}" (${form.id.substring(0, 8)}...)`);
      }
      console.log('');
    }

    if (orphanedSubmissions.length > 0) {
      console.log('⚠️  Orphaned Submissions:\n');
      for (const sub of orphanedSubmissions.slice(0, 10)) {
        console.log(`   - ${sub.id.substring(0, 8)}... (Form: ${sub.form_title || 'UNKNOWN'})`);
      }
      if (orphanedSubmissions.length > 10) {
        console.log(`   ... and ${orphanedSubmissions.length - 10} more\n`);
      }
      console.log('');
    }

    // Step 5: Recommendations
    console.log('═══════════════════════════════════════════════════════════');
    console.log('                     RECOMMENDATIONS                        ');
    console.log('═══════════════════════════════════════════════════════════\n');

    if (orphanedForms.length > 0) {
      console.log('🔧 To delete orphaned forms, run:\n');
      console.log('   DELETE FROM forms WHERE id IN (');
      orphanedForms.forEach((form, i) => {
        console.log(`     '${form.id}'${i < orphanedForms.length - 1 ? ',' : ''}`);
      });
      console.log('   );\n');
    }

    if (orphanedSubmissions.length > 0) {
      console.log('🔧 To delete orphaned submissions, run:\n');
      console.log('   DELETE FROM submissions WHERE id IN (');
      orphanedSubmissions.slice(0, 20).forEach((sub, i) => {
        const isLast = i === Math.min(19, orphanedSubmissions.length - 1);
        console.log(`     '${sub.id}'${!isLast ? ',' : ''}`);
      });
      if (orphanedSubmissions.length > 20) {
        console.log(`     -- ... and ${orphanedSubmissions.length - 20} more`);
      }
      console.log('   );\n');
    }

    if (orphanedForms.length === 0 && orphanedSubmissions.length === 0) {
      console.log('✅ No orphaned data found! Database is clean.\n');
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

cleanupOrphanedData().catch(console.error);
