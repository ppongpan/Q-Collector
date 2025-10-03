/**
 * Test form retrieval and toJSON conversion
 */

const { sequelize, Form, Field } = require('../models');

async function testFormRetrieval() {
  try {
    console.log('🔍 Testing Form Retrieval...\n');

    // Get the form with fields
    const form = await Form.findOne({
      where: { title: 'Q-CON Service Center' },
      include: [{
        model: Field,
        as: 'fields',
        required: false
      }]
    });

    if (!form) {
      console.log('❌ Form not found\n');
      return;
    }

    console.log(`✅ Found form: "${form.title}"\n`);
    console.log(`📋 Fields (${form.fields.length}):\n`);

    form.fields.forEach((field, idx) => {
      console.log(`${idx + 1}. "${field.title}"`);
      console.log(`   Raw database values:`);
      console.log(`      show_in_table: ${field.show_in_table}`);
      console.log(`      send_telegram: ${field.send_telegram}`);
      console.log(`      telegram_order: ${field.telegram_order}`);
      console.log(`      telegram_prefix: ${field.telegram_prefix}`);

      const json = field.toJSON();
      console.log(`   After toJSON():`);
      console.log(`      showInTable: ${json.showInTable}`);
      console.log(`      sendTelegram: ${json.sendTelegram}`);
      console.log(`      telegramOrder: ${json.telegramOrder}`);
      console.log(`      telegramPrefix: ${json.telegramPrefix}`);
      console.log(`      Has show_in_table: ${json.show_in_table !== undefined ? 'YES ❌' : 'NO ✅'}`);
      console.log(`      Has send_telegram: ${json.send_telegram !== undefined ? 'YES ❌' : 'NO ✅'}`);
      console.log('');
    });

    // Simulate API response
    console.log('🔄 Simulating API response (as JSON):\n');
    const apiResponse = {
      ...form.toJSON(),
      fields: form.fields.map(f => f.toJSON())
    };

    console.log('Sample field from API:');
    if (apiResponse.fields.length > 0) {
      const sampleField = apiResponse.fields[0];
      console.log(JSON.stringify({
        title: sampleField.title,
        showInTable: sampleField.showInTable,
        sendTelegram: sampleField.sendTelegram,
        telegramOrder: sampleField.telegramOrder,
        telegramPrefix: sampleField.telegramPrefix
      }, null, 2));
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await sequelize.close();
  }
}

testFormRetrieval();
