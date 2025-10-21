/**
 * Seed File: Sample Notification Rules
 *
 * Creates sample notification rules for testing Q-Collector v0.8.0 Telegram Notification System
 *
 * Usage:
 *   node backend/seeds/notification-rules-seed.js
 *
 * Prerequisites:
 *   - Database migrations completed
 *   - At least one form and user exists in the database
 *   - TELEGRAM_BOT_TOKEN and TELEGRAM_GROUP_ID in .env (optional, can use test values)
 */

const { sequelize } = require('../config/database.config');
const { NotificationRule, Form, User } = require('../models');
const logger = require('../utils/logger.util');

/**
 * Sample notification rules to be seeded
 */
const sampleRules = [
  {
    name: 'แจ้งเตือนปิดการขาย - สำเร็จ',
    description: 'แจ้งเตือนทันทีเมื่อมีการปิดการขายสำเร็จ (ใช้สำหรับทดสอบ field_update trigger)',
    trigger_type: 'field_update',
    condition_formula: '[สถานะการขาย] = "ปิดการขายได้"',
    message_template: '🎉 **ปิดการขายสำเร็จ!**\n\n' +
                      '👤 ลูกค้า: {ชื่อลูกค้า}\n' +
                      '💰 ยอดขาย: {ยอดขาย} บาท\n' +
                      '📅 วันที่: {วันที่บันทึก}\n\n' +
                      '✨ ยินดีด้วย!',
    is_enabled: true,
    send_once: true,
    priority: 'high',
    target_field_id: null, // Watch all fields
    schedule: null,
  },
  {
    name: 'แจ้งเตือนยอดขายสูง - มากกว่า 100,000 บาท',
    description: 'แจ้งเตือนเมื่อมียอดขายมากกว่า 100,000 บาท (ใช้สำหรับทดสอบเงื่อนไขเชิงตัวเลข)',
    trigger_type: 'field_update',
    condition_formula: 'AND([ยอดขาย] > 100000, [สถานะการขาย] = "ปิดการขายได้")',
    message_template: '💰 **แจ้งเตือนยอดขายสูง!**\n\n' +
                      '👤 ลูกค้า: {ชื่อลูกค้า}\n' +
                      '💵 ยอดขาย: {ยอดขาย} บาท\n' +
                      '📊 สถานะ: {สถานะการขาย}\n\n' +
                      '🚀 ยอดขายสูงมาก!',
    is_enabled: true,
    send_once: true,
    priority: 'high',
    target_field_id: null,
    schedule: null,
  },
  {
    name: 'แจ้งเตือนลูกค้า VIP',
    description: 'แจ้งเตือนเมื่อมีลูกค้า VIP ติดต่อเข้ามา (ทดสอบ CONTAINS function)',
    trigger_type: 'field_update',
    condition_formula: 'CONTAINS([ชื่อลูกค้า], "VIP")',
    message_template: '👑 **ลูกค้า VIP**\n\n' +
                      '👤 ชื่อ: {ชื่อลูกค้า}\n' +
                      '📞 เบอร์: {เบอร์โทร}\n' +
                      '✉️ อีเมล: {อีเมล}\n\n' +
                      '⚠️ กรุณาให้บริการพิเศษ!',
    is_enabled: false, // Disabled by default for testing
    send_once: true,
    priority: 'high',
    target_field_id: null,
    schedule: null,
  },
  {
    name: 'ตรวจสอบงานค้าง - ทุกเช้า 9 โมง',
    description: 'ตรวจสอบงานที่ค้างเกิน 7 วันทุกวันเวลา 9:00 น. (ทดสอบ scheduled trigger)',
    trigger_type: 'scheduled',
    condition_formula: 'AND([วันที่ติดตาม] + 7 < TODAY(), NOT(OR([สถานะการขาย] = "ปิดการขายแล้ว", [สถานะการขาย] = "ปิดการขายไม่ได้")))',
    message_template: '⚠️ **รายงานงานค้าง**\n\n' +
                      '📋 งาน: {ชื่อลูกค้า}\n' +
                      '📅 นัดล่าสุด: {วันที่ติดตาม}\n' +
                      '⏰ ค้างมาแล้ว: 7+ วัน\n\n' +
                      '👉 กรุณาติดตามด่วน!',
    is_enabled: false, // Disabled by default (requires proper form fields)
    send_once: false, // Can send multiple times for scheduled notifications
    priority: 'medium',
    target_field_id: null,
    schedule: '0 9 * * *', // Every day at 9:00 AM
  },
  {
    name: 'สรุปยอดขายรายสัปดาห์ - ทุกวันจันทร์',
    description: 'สรุปยอดขายทุกวันจันทร์เวลา 8:00 น. (ทดสอบ weekly schedule)',
    trigger_type: 'scheduled',
    condition_formula: '[สถานะการขาย] = "ปิดการขายได้"',
    message_template: '📊 **สรุปยอดขายประจำสัปดาห์**\n\n' +
                      '💰 ยอดรวม: {ยอดขาย} บาท\n' +
                      '📈 จำนวนดีล: {จำนวนดีล}\n' +
                      '🎯 เป้าหมาย: {เป้าหมาย} บาท\n\n' +
                      '✨ สัปดาห์นี้ทำได้ดี!',
    is_enabled: false,
    send_once: false,
    priority: 'low',
    target_field_id: null,
    schedule: '0 8 * * 1', // Every Monday at 8:00 AM
  },
  {
    name: 'แจ้งเตือนคะแนนลูกค้า - สูง (4-5 ดาว)',
    description: 'แจ้งเตือนเมื่อลูกค้าให้คะแนน 4-5 ดาว (ทดสอบ range check)',
    trigger_type: 'field_update',
    condition_formula: 'AND([คะแนน] >= 4, [คะแนน] <= 5)',
    message_template: '⭐⭐⭐⭐⭐ **ลูกค้าพึงพอใจ!**\n\n' +
                      '👤 ลูกค้า: {ชื่อลูกค้า}\n' +
                      '⭐ คะแนน: {คะแนน} ดาว\n' +
                      '💬 ความคิดเห็น: {ความคิดเห็น}\n\n' +
                      '👏 ทำได้ดีมาก!',
    is_enabled: false,
    send_once: true,
    priority: 'medium',
    target_field_id: null,
    schedule: null,
  },
  {
    name: 'แจ้งเตือนข้อมูลไม่ครบ',
    description: 'แจ้งเตือนเมื่อข้อมูลลูกค้าไม่ครบถ้วน (ทดสอบ ISBLANK)',
    trigger_type: 'field_update',
    condition_formula: 'OR(ISBLANK([ชื่อลูกค้า]), ISBLANK([เบอร์โทร]), ISBLANK([อีเมล]))',
    message_template: '⚠️ **ข้อมูลไม่ครบถ้วน**\n\n' +
                      '👤 ลูกค้า: {ชื่อลูกค้า}\n' +
                      '📋 ข้อมูลที่หายไป:\n' +
                      '- ชื่อ: {ชื่อลูกค้า}\n' +
                      '- เบอร์: {เบอร์โทร}\n' +
                      '- อีเมล: {อีเมล}\n\n' +
                      '👉 กรุณาเพิ่มข้อมูลให้ครบ',
    is_enabled: false,
    send_once: false, // Can notify multiple times until data is complete
    priority: 'low',
    target_field_id: null,
    schedule: null,
  },
];

/**
 * Seed notification rules into database
 */
async function seedNotificationRules() {
  try {
    logger.info('🌱 Starting notification rules seeding...');

    // Test database connection
    await sequelize.authenticate();
    logger.info('✅ Database connection established');

    // Find first form (for testing)
    const form = await Form.findOne({
      order: [['createdAt', 'ASC']],
    });

    if (!form) {
      logger.warn('⚠️ No forms found in database. Please create at least one form first.');
      logger.info('You can create a form using the Q-Collector UI at http://localhost:3000');
      process.exit(1);
    }

    logger.info(`📋 Found form: ${form.title} (ID: ${form.id})`);

    // Find first user (for created_by)
    const user = await User.findOne({
      order: [['createdAt', 'ASC']],
    });

    if (!user) {
      logger.warn('⚠️ No users found in database. Please create at least one user first.');
      process.exit(1);
    }

    logger.info(`👤 Found user: ${user.username} (ID: ${user.id})`);

    // Check if notification rules already exist
    const existingRules = await NotificationRule.count();
    if (existingRules > 0) {
      logger.warn(`⚠️ Database already contains ${existingRules} notification rule(s).`);
      const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      const answer = await new Promise((resolve) => {
        readline.question('Do you want to delete existing rules and reseed? (yes/no): ', resolve);
      });
      readline.close();

      if (answer.toLowerCase() !== 'yes') {
        logger.info('❌ Seeding cancelled by user');
        process.exit(0);
      }

      // Delete existing rules
      await NotificationRule.destroy({ where: {}, truncate: true });
      logger.info('🗑️ Deleted existing notification rules');
    }

    // Create sample rules
    logger.info(`📝 Creating ${sampleRules.length} sample notification rules...`);

    const createdRules = [];
    for (const ruleData of sampleRules) {
      const rule = await NotificationRule.create({
        ...ruleData,
        form_id: form.id, // Link to first form
        created_by: user.id,
        updated_by: user.id,
        // Use default bot_token and group_id from .env
        bot_token: null,
        group_id: null,
      });

      createdRules.push(rule);
      logger.info(`  ✅ Created: ${rule.name} (${rule.trigger_type})`);
    }

    logger.info('');
    logger.info('🎉 Notification rules seeded successfully!');
    logger.info('');
    logger.info('📊 Summary:');
    logger.info(`  - Total rules created: ${createdRules.length}`);
    logger.info(`  - Enabled rules: ${createdRules.filter(r => r.is_enabled).length}`);
    logger.info(`  - Disabled rules: ${createdRules.filter(r => !r.is_enabled).length}`);
    logger.info(`  - Field update triggers: ${createdRules.filter(r => r.trigger_type === 'field_update').length}`);
    logger.info(`  - Scheduled triggers: ${createdRules.filter(r => r.trigger_type === 'scheduled').length}`);
    logger.info('');
    logger.info('💡 Tips:');
    logger.info('  1. Enable rules in the Q-Collector UI to start receiving notifications');
    logger.info('  2. Update message templates to match your form field names');
    logger.info('  3. Set TELEGRAM_BOT_TOKEN and TELEGRAM_GROUP_ID in .env file');
    logger.info('  4. Test rules using the "Test Notification" button in the UI');
    logger.info('');

    process.exit(0);
  } catch (error) {
    logger.error('❌ Error seeding notification rules:', error);
    process.exit(1);
  }
}

// Run seeding if executed directly
if (require.main === module) {
  seedNotificationRules();
}

module.exports = { seedNotificationRules, sampleRules };
