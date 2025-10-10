/**
 * Check Sub-Form Field Settings in Database
 *
 * This script checks if showInTable (show_in_table) and required settings
 * are properly saved in the database for sub-form fields.
 */

const { Sequelize } = require('sequelize');
const config = require('../config/database.config');

// Initialize database connection
const env = process.env.NODE_ENV || 'development';
const dbConfig = config[env];
const sequelize = new Sequelize(dbConfig.database, dbConfig.username, dbConfig.password, dbConfig);

async function checkSubFormFieldSettings() {
  try {
    console.log('🔍 Checking Sub-Form Field Settings...\n');

    // Get forms with sub-forms using raw query
    const [forms] = await sequelize.query(`
      SELECT
        f.id as form_id,
        f.title as form_title,
        f."updatedAt"
      FROM forms f
      WHERE EXISTS (
        SELECT 1 FROM sub_forms sf WHERE sf.form_id = f.id
      )
      ORDER BY f."updatedAt" DESC
      LIMIT 5
    `);

    if (forms.length === 0) {
      console.log('❌ No forms with sub-forms found');
      return;
    }

    console.log(`Found ${forms.length} forms with sub-forms:\n`);

    let totalFields = 0;
    let requiredCount = 0;
    let showInTableCount = 0;

    for (const form of forms) {
      console.log(`\n${'='.repeat(80)}`);
      console.log(`Form: ${form.form_title} (ID: ${form.form_id})`);
      console.log(`${'='.repeat(80)}`);

      // Get sub-forms for this form
      const [subForms] = await sequelize.query(`
        SELECT id, title FROM sub_forms WHERE form_id = ?
      `, { replacements: [form.form_id] });

      if (subForms.length === 0) {
        console.log('  No sub-forms');
        continue;
      }

      for (const [sfIndex, subForm] of subForms.entries()) {
        console.log(`\n  Sub-Form ${sfIndex + 1}: ${subForm.title}`);
        console.log(`  ${'─'.repeat(70)}`);

        // Get fields for this sub-form
        const [fields] = await sequelize.query(`
          SELECT
            id,
            title,
            type,
            required,
            show_in_table,
            send_telegram
          FROM fields
          WHERE sub_form_id = ?
          ORDER BY "order"
        `, { replacements: [subForm.id] });

        if (fields.length === 0) {
          console.log('    No fields');
          continue;
        }

        for (const [fIndex, field] of fields.entries()) {
          console.log(`\n    Field ${fIndex + 1}: ${field.title || '(No title)'}`);
          console.log(`    Type: ${field.type}`);
          console.log(`    Required: ${field.required ? '✅ YES' : '❌ NO'}`);
          console.log(`    Show in Table: ${field.show_in_table ? '✅ YES' : '❌ NO'}`);
          console.log(`    Send Telegram: ${field.send_telegram ? '✅ YES' : '❌ NO'}`);

          totalFields++;
          if (field.required) requiredCount++;
          if (field.show_in_table) showInTableCount++;
        }
      }
    }

    console.log(`\n${'='.repeat(80)}\n`);

    // Summary
    console.log('📊 Summary:');
    console.log(`  Total sub-form fields: ${totalFields}`);
    if (totalFields > 0) {
      console.log(`  Fields with required=true: ${requiredCount} (${Math.round(requiredCount/totalFields*100)}%)`);
      console.log(`  Fields with show_in_table=true: ${showInTableCount} (${Math.round(showInTableCount/totalFields*100)}%)`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await sequelize.close();
  }
}

// Run the script
checkSubFormFieldSettings();
