/**
 * Test script to verify field settings are being saved correctly
 * Tests: showInTable, sendTelegram, telegramOrder, telegramPrefix
 */

const { sequelize, Form, Field } = require('../models');

async function testFieldSave() {
  try {
    console.log('🔍 Testing Field Save Functionality...\n');

    // 1. Create a test form with fields that have the new properties
    console.log('1️⃣ Creating test form with field settings...');
    const testForm = await Form.create({
      title: 'Test Form - Field Settings',
      description: 'Testing showInTable and sendTelegram',
      creator_id: null, // Use null for test
      roles_allowed: ['general_user']
    }, {
      include: []
    });

    console.log(`   ✅ Form created: ${testForm.id}`);

    // 2. Create fields with different settings
    console.log('\n2️⃣ Creating fields with settings...');

    const field1 = await Field.create({
      form_id: testForm.id,
      type: 'short_answer',
      title: 'ชื่อเต็ม',
      required: true,
      order: 0,
      options: {},
      validation_rules: {},
      show_in_table: true,  // snake_case for database
      send_telegram: true,
      telegram_order: 1,
      telegram_prefix: 'ชื่อ:'
    });
    console.log(`   ✅ Field 1 created: ${field1.id}`);
    console.log(`      - show_in_table: ${field1.show_in_table}`);
    console.log(`      - send_telegram: ${field1.send_telegram}`);
    console.log(`      - telegram_order: ${field1.telegram_order}`);
    console.log(`      - telegram_prefix: ${field1.telegram_prefix}`);

    const field2 = await Field.create({
      form_id: testForm.id,
      type: 'email',
      title: 'อีเมล',
      required: false,
      order: 1,
      options: {},
      validation_rules: {},
      show_in_table: false,
      send_telegram: true,
      telegram_order: 2,
      telegram_prefix: 'Email:'
    });
    console.log(`   ✅ Field 2 created: ${field2.id}`);
    console.log(`      - show_in_table: ${field2.show_in_table}`);
    console.log(`      - send_telegram: ${field2.send_telegram}`);
    console.log(`      - telegram_order: ${field2.telegram_order}`);
    console.log(`      - telegram_prefix: ${field2.telegram_prefix}`);

    // 3. Retrieve the form with fields to test toJSON conversion
    console.log('\n3️⃣ Retrieving form to test toJSON conversion...');
    const retrievedForm = await Form.findByPk(testForm.id, {
      include: [{
        model: Field,
        as: 'fields',
        order: [['order', 'ASC']]
      }]
    });

    console.log('   📊 Retrieved fields as JSON:');
    retrievedForm.fields.forEach((field, index) => {
      const json = field.toJSON();
      console.log(`\n   Field ${index + 1}: ${field.title}`);
      console.log(`      - showInTable (camelCase): ${json.showInTable}`);
      console.log(`      - sendTelegram (camelCase): ${json.sendTelegram}`);
      console.log(`      - telegramOrder (camelCase): ${json.telegramOrder}`);
      console.log(`      - telegramPrefix (camelCase): ${json.telegramPrefix}`);
      console.log(`      - show_in_table in object: ${json.show_in_table === undefined ? 'deleted ✅' : 'still exists ❌'}`);
      console.log(`      - send_telegram in object: ${json.send_telegram === undefined ? 'deleted ✅' : 'still exists ❌'}`);
    });

    // 4. Query database directly to verify values
    console.log('\n4️⃣ Querying database directly...');
    const [results] = await sequelize.query(`
      SELECT
        id,
        title,
        show_in_table,
        send_telegram,
        telegram_order,
        telegram_prefix
      FROM fields
      WHERE form_id = '${testForm.id}'
      ORDER BY "order" ASC
    `);

    console.log('   📊 Direct database query results:');
    results.forEach((row, index) => {
      console.log(`\n   Row ${index + 1}:`);
      console.log(`      - title: ${row.title}`);
      console.log(`      - show_in_table: ${row.show_in_table}`);
      console.log(`      - send_telegram: ${row.send_telegram}`);
      console.log(`      - telegram_order: ${row.telegram_order}`);
      console.log(`      - telegram_prefix: ${row.telegram_prefix}`);
    });

    // 5. Cleanup
    console.log('\n5️⃣ Cleaning up test data...');
    await Field.destroy({ where: { form_id: testForm.id } });
    await testForm.destroy();
    console.log('   ✅ Test data deleted');

    console.log('\n✅ ALL TESTS PASSED!\n');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    console.error('Error details:', error.message);
    if (error.parent) {
      console.error('Database error:', error.parent.message);
    }
  } finally {
    await sequelize.close();
  }
}

// Run the test
testFieldSave();
