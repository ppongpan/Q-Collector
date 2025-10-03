/**
 * Check actual field values in database
 */

const { sequelize } = require('../models');

async function checkFieldValues() {
  try {
    console.log('🔍 Checking field values in database...\n');

    // Query recent fields
    const [fields] = await sequelize.query(`
      SELECT
        f.id,
        f.title,
        f.show_in_table,
        f.send_telegram,
        f.telegram_order,
        f.telegram_prefix,
        fm.title as form_title,
        f."updatedAt"
      FROM fields f
      JOIN forms fm ON f.form_id = fm.id
      ORDER BY f."updatedAt" DESC
      LIMIT 20;
    `);

    if (fields.length === 0) {
      console.log('❌ No fields found in database\n');
    } else {
      console.log(`✅ Found ${fields.length} fields:\n`);

      let hasShowInTable = 0;
      let hasSendTelegram = 0;

      fields.forEach((field, idx) => {
        console.log(`${idx + 1}. "${field.title}" (Form: "${field.form_title}")`);
        console.log(`   show_in_table: ${field.show_in_table}`);
        console.log(`   send_telegram: ${field.send_telegram}`);
        console.log(`   telegram_order: ${field.telegram_order}`);
        console.log(`   telegram_prefix: "${field.telegram_prefix}"`);
        console.log(`   Updated: ${field.updatedAt}`);
        console.log('');

        if (field.show_in_table) hasShowInTable++;
        if (field.send_telegram) hasSendTelegram++;
      });

      console.log('📊 Summary:');
      console.log(`   Total fields: ${fields.length}`);
      console.log(`   With show_in_table=true: ${hasShowInTable}`);
      console.log(`   With send_telegram=true: ${hasSendTelegram}`);
      console.log('');

      if (hasShowInTable === 0 && hasSendTelegram === 0) {
        console.log('⚠️  WARNING: All fields have default values (false)');
        console.log('   This means settings are not being saved properly.');
      }
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  } finally {
    await sequelize.close();
  }
}

checkFieldValues();
