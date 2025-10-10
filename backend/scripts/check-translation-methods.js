/**
 * Check Translation Methods
 * ตรวจสอบว่า main form และ sub-form ใช้วิธีการแปลอะไร
 */

const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: process.env.POSTGRES_PORT || 5432,
  database: process.env.POSTGRES_DB || 'qcollector_db',
  user: process.env.POSTGRES_USER || 'qcollector',
  password: process.env.POSTGRES_PASSWORD || 'qcollector_dev_2025'
});

async function checkTranslationMethods() {
  const client = await pool.connect();

  try {
    console.log('\n🔍 === TRANSLATION METHOD ANALYSIS ===\n');

    // Get all forms with their table names
    const formsQuery = `
      SELECT id, title, table_name
      FROM forms
      ORDER BY "createdAt" DESC;
    `;
    const forms = await client.query(formsQuery);

    console.log('📋 MAIN FORMS:\n');
    for (const form of forms.rows) {
      console.log(`Form: ${form.title}`);
      console.log(`  Table Name: ${form.table_name}`);

      // Analyze table name pattern
      if (form.table_name) {
        const parts = form.table_name.split('_');
        const suffix = parts[parts.length - 1];
        const nameWithoutSuffix = parts.slice(0, -1).join('_');

        console.log(`  Without suffix: ${nameWithoutSuffix}`);
        console.log(`  Suffix: ${suffix}`);

        // Check if it looks like transliteration (Thai phonetic)
        const hasThaiPhonetic = /[aeiou]{2,}|[^aeiou]{3,}/i.test(nameWithoutSuffix);
        if (hasThaiPhonetic) {
          console.log(`  Method: ⚠️  Transliteration (Thai phonetic)`);
        } else {
          console.log(`  Method: ✅ Translation (English words)`);
        }
      } else {
        console.log(`  Method: ❌ No table`);
      }
      console.log('');

      // Get sub-forms
      const subFormsQuery = `
        SELECT id, title, table_name
        FROM sub_forms
        WHERE form_id = $1
        ORDER BY "createdAt";
      `;
      const subForms = await client.query(subFormsQuery, [form.id]);

      if (subForms.rows.length > 0) {
        console.log('  📁 SUB-FORMS:');
        for (const subForm of subForms.rows) {
          console.log(`    Sub-form: ${subForm.title}`);
          console.log(`      Table Name: ${subForm.table_name}`);

          if (subForm.table_name) {
            const parts = subForm.table_name.split('_');
            const suffix = parts[parts.length - 1];
            const nameWithoutSuffix = parts.slice(0, -1).join('_');

            console.log(`      Without suffix: ${nameWithoutSuffix}`);
            console.log(`      Suffix: ${suffix}`);

            // Check if it looks like transliteration
            const hasThaiPhonetic = /[aeiou]{2,}|[^aeiou]{3,}/i.test(nameWithoutSuffix);
            if (hasThaiPhonetic) {
              console.log(`      Method: ⚠️  Transliteration (Thai phonetic)`);
            } else {
              console.log(`      Method: ✅ Translation (English words)`);
            }
          } else {
            console.log(`      Method: ❌ No table`);
          }
          console.log('');
        }
      }
    }

    console.log('='.repeat(80));
    console.log('\n📊 COMPARISON:\n');

    // Get specific examples
    const exampleQuery = `
      SELECT
        f.title as form_title,
        f.table_name as form_table,
        sf.title as subform_title,
        sf.table_name as subform_table
      FROM forms f
      LEFT JOIN sub_forms sf ON sf.form_id = f.id
      WHERE f.table_name IS NOT NULL
      ORDER BY f."createdAt" DESC;
    `;
    const examples = await client.query(exampleQuery);

    for (const ex of examples.rows) {
      console.log(`Main Form: "${ex.form_title}"`);
      console.log(`  Table: ${ex.form_table}`);
      if (ex.subform_title) {
        console.log(`  Sub-form: "${ex.subform_title}"`);
        console.log(`    Table: ${ex.subform_table}`);

        // Compare translation methods
        const mainMethod = ex.form_table.includes('_') && /[aeiou]{2,}/i.test(ex.form_table) ? 'Transliteration' : 'Translation';
        const subMethod = ex.subform_table && (ex.subform_table.includes('_') && /[aeiou]{2,}/i.test(ex.subform_table) ? 'Transliteration' : 'Translation');

        if (mainMethod === subMethod) {
          console.log(`    Status: ✅ Same method (${mainMethod})`);
        } else {
          console.log(`    Status: ⚠️  Different methods (Main: ${mainMethod}, Sub: ${subMethod})`);
        }
      }
      console.log('');
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    client.release();
    await pool.end();
  }
}

checkTranslationMethods()
  .then(() => {
    console.log('✅ Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error.message);
    process.exit(1);
  });
