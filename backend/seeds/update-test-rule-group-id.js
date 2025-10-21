/**
 * Update Test Notification Rule Group ID
 */

const { NotificationRule } = require('../models');

async function updateGroupId() {
  try {
    console.log('🔄 Updating test notification rule group_id...\n');

    const result = await NotificationRule.update(
      { group_id: '-4847325737' },
      {
        where: { name: '🧪 กฎทดสอบระบบแจ้งเตือน (Test Rule)' }
      }
    );

    if (result[0] > 0) {
      console.log('✅ Group ID updated successfully!\n');

      const rule = await NotificationRule.findOne({
        where: { name: '🧪 กฎทดสอบระบบแจ้งเตือน (Test Rule)' }
      });

      console.log('Updated Rule:');
      console.log(`  ID: ${rule.id}`);
      console.log(`  Name: ${rule.name}`);
      console.log(`  Bot Token: ${rule.bot_token.substring(0, 20)}...`);
      console.log(`  Group ID: ${rule.group_id}\n`);
    } else {
      console.log('⚠️  No rule found to update\n');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

updateGroupId();
