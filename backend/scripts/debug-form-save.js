/**
 * Debug script to trace form save operation
 * Add logging to FormService to see what data is being received and saved
 */

const { sequelize, Form, Field } = require('../models');

async function debugFormSave() {
  try {
    console.log('🔍 Debugging Form Save...\n');

    // 1. Check if columns exist in database
    console.log('1️⃣ Checking if columns exist in fields table...');
    const [columns] = await sequelize.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'fields'
      AND column_name IN ('show_in_table', 'send_telegram', 'telegram_order', 'telegram_prefix')
      ORDER BY column_name;
    `);

    if (columns.length === 0) {
      console.log('   ❌ COLUMNS DO NOT EXIST! Need to run migration.');
      console.log('   Run: npx sequelize-cli db:migrate');
      return;
    }

    console.log('   ✅ All columns exist:');
    columns.forEach(col => {
      console.log(`      - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable}, default: ${col.column_default})`);
    });

    // 2. Check existing forms and their fields
    console.log('\n2️⃣ Checking existing forms and field settings...');
    const forms = await Form.findAll({
      include: [{
        model: Field,
        as: 'fields',
        required: false
      }],
      limit: 5,
      order: [['created_at', 'DESC']]
    });

    if (forms.length === 0) {
      console.log('   ℹ️  No forms found in database');
    } else {
      console.log(`   Found ${forms.length} recent forms:\n`);
      for (const form of forms) {
        console.log(`   Form: "${form.title}" (${form.id})`);
        console.log(`   Fields: ${form.fields.length}`);

        if (form.fields.length > 0) {
          console.log('   Field settings:');
          form.fields.forEach((field, idx) => {
            const json = field.toJSON();
            console.log(`      ${idx + 1}. "${field.title}"`);
            console.log(`         - showInTable: ${json.showInTable} (DB: ${field.show_in_table})`);
            console.log(`         - sendTelegram: ${json.sendTelegram} (DB: ${field.send_telegram})`);
            console.log(`         - telegramOrder: ${json.telegramOrder} (DB: ${field.telegram_order})`);
            console.log(`         - telegramPrefix: "${json.telegramPrefix}" (DB: "${field.telegram_prefix}")`);
          });
        }
        console.log('');
      }
    }

    // 3. Check Field model definition
    console.log('3️⃣ Checking Field model has columns defined...');
    const fieldAttributes = Field.rawAttributes;
    const requiredColumns = ['show_in_table', 'send_telegram', 'telegram_order', 'telegram_prefix'];

    console.log('   Field model attributes:');
    requiredColumns.forEach(col => {
      if (fieldAttributes[col]) {
        console.log(`   ✅ ${col}: ${fieldAttributes[col].type.key} (allowNull: ${fieldAttributes[col].allowNull})`);
      } else {
        console.log(`   ❌ ${col}: NOT DEFINED IN MODEL`);
      }
    });

    // 4. Direct database query to verify actual values
    console.log('\n4️⃣ Direct database query for recent fields...');
    const [recentFields] = await sequelize.query(`
      SELECT
        f.id,
        f.title,
        f.show_in_table,
        f.send_telegram,
        f.telegram_order,
        f.telegram_prefix,
        fm.title as form_title
      FROM fields f
      JOIN forms fm ON f.form_id = fm.id
      ORDER BY f.created_at DESC
      LIMIT 10;
    `);

    if (recentFields.length === 0) {
      console.log('   ℹ️  No fields found');
    } else {
      console.log(`   Found ${recentFields.length} recent fields:\n`);
      recentFields.forEach((field, idx) => {
        console.log(`   ${idx + 1}. "${field.title}" (Form: "${field.form_title}")`);
        console.log(`      show_in_table: ${field.show_in_table}`);
        console.log(`      send_telegram: ${field.send_telegram}`);
        console.log(`      telegram_order: ${field.telegram_order}`);
        console.log(`      telegram_prefix: "${field.telegram_prefix}"`);
      });
    }

    console.log('\n✅ Debug complete!\n');

  } catch (error) {
    console.error('\n❌ Debug failed:', error);
    console.error('Error details:', error.message);
    if (error.parent) {
      console.error('Database error:', error.parent.message);
    }
  } finally {
    await sequelize.close();
  }
}

// Run the debug
debugFormSave();
