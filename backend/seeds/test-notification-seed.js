/**
 * Test Notification Rule Seed
 * Creates a test notification rule for Q-Collector v0.8.0
 * Sends notifications to Telegram Group ID: -4847325737
 */

const { NotificationRule, User } = require('../models');
const logger = require('../utils/logger.util');

async function createTestNotificationRule() {
  try {
    console.log('🚀 Creating test notification rule...\n');

    // Find super_admin user (pongpanp)
    const superAdmin = await User.findOne({
      where: { username: 'pongpanp' }
    });

    if (!superAdmin) {
      console.error('❌ Super admin user "pongpanp" not found!');
      console.log('Please run: npm run seed:users first\n');
      process.exit(1);
    }

    console.log(`✅ Found super admin: ${superAdmin.username} (${superAdmin.id})\n`);

    // Check if test rule already exists
    const existingRule = await NotificationRule.findOne({
      where: { name: '🧪 กฎทดสอบระบบแจ้งเตือน (Test Rule)' }
    });

    if (existingRule) {
      console.log('⚠️  Test notification rule already exists!');
      console.log(`Rule ID: ${existingRule.id}`);
      console.log(`Rule Name: ${existingRule.name}`);
      console.log(`Status: ${existingRule.is_enabled ? '✅ Enabled' : '❌ Disabled'}\n`);

      console.log('Do you want to:');
      console.log('1. Keep existing rule (press Ctrl+C)');
      console.log('2. Delete and recreate (delete manually first)\n');
      process.exit(0);
    }

    // Create test notification rule
    const testRule = await NotificationRule.create({
      name: '🧪 กฎทดสอบระบบแจ้งเตือน (Test Rule)',
      description: 'กฎทดสอบสำหรับส่งการแจ้งเตือนไปยัง Telegram เมื่อมีการบันทึกข้อมูลใหม่',

      // Trigger when any field is updated (no specific form)
      trigger_type: 'field_update',
      form_id: null,
      sub_form_id: null,
      target_field_id: null,

      // Simple condition: always trigger (TRUE)
      condition_formula: 'TRUE',

      // Message template with placeholders
      message_template: `🔔 *การแจ้งเตือนจากระบบ Q-Collector*

📋 *ฟอร์ม:* [form_title]
👤 *ผู้บันทึก:* [user_name]
📅 *วันที่:* [submitted_at]

✅ บันทึกข้อมูลสำเร็จแล้ว

🔗 ดูรายละเอียด: [submission_link]`,

      // Telegram configuration
      bot_token: '7794493324:AAHlxtpYenok1kwyo88ns5R4rivWWXcqmE0',
      group_id: '-4847325737',

      // Settings
      is_enabled: true,
      send_once: false,
      priority: 'high',

      // Creator
      created_by: superAdmin.id,
    });

    console.log('✅ Test notification rule created successfully!\n');
    console.log('═══════════════════════════════════════════════');
    console.log('📋 Rule Details:');
    console.log('═══════════════════════════════════════════════');
    console.log(`ID:           ${testRule.id}`);
    console.log(`Name:         ${testRule.name}`);
    console.log(`Type:         ${testRule.trigger_type}`);
    console.log(`Status:       ${testRule.is_enabled ? '✅ Enabled' : '❌ Disabled'}`);
    console.log(`Priority:     ${testRule.priority}`);
    console.log(`Bot Token:    ${testRule.bot_token.substring(0, 20)}...`);
    console.log(`Group ID:     ${testRule.group_id}`);
    console.log('═══════════════════════════════════════════════\n');

    console.log('🧪 Testing Telegram connection...\n');

    // Test Telegram API connection
    const axios = require('axios');
    const telegramUrl = `https://api.telegram.org/bot${testRule.bot_token}/getMe`;

    try {
      const response = await axios.get(telegramUrl);
      if (response.data.ok) {
        console.log('✅ Telegram Bot Connection: SUCCESS');
        console.log(`   Bot Name: ${response.data.result.first_name}`);
        console.log(`   Bot Username: @${response.data.result.username}\n`);
      }
    } catch (error) {
      console.log('❌ Telegram Bot Connection: FAILED');
      console.log(`   Error: ${error.message}\n`);
    }

    console.log('🎯 Next Steps:');
    console.log('═══════════════════════════════════════════════');
    console.log('1. Refresh the Notification Rules page in browser');
    console.log('2. You should see the test rule in the list');
    console.log('3. Create or update any form submission to trigger notification');
    console.log('4. Check your Telegram group for the notification message');
    console.log('═══════════════════════════════════════════════\n');

    process.exit(0);

  } catch (error) {
    console.error('❌ Error creating test notification rule:', error);
    logger.error('[TestNotificationSeed] Error:', error);
    process.exit(1);
  }
}

// Run the seed
createTestNotificationRule();
