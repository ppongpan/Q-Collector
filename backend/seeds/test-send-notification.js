/**
 * Test Send Telegram Notification
 * Directly sends a test message to Telegram group
 */

const axios = require('axios');

const BOT_TOKEN = '7794493324:AAHlxtpYenok1kwyo88ns5R4rivWWXcqmE0';
const GROUP_ID = '-4847325737';

async function sendTestMessage() {
  try {
    console.log('🚀 Sending test notification to Telegram...\n');
    console.log(`Bot Token: ${BOT_TOKEN.substring(0, 20)}...`);
    console.log(`Group ID: ${GROUP_ID}\n`);

    const message = `🧪 *ทดสอบระบบแจ้งเตือน Q-Collector*

✅ ระบบแจ้งเตือนทำงานปกติ!

📋 *ข้อมูลทดสอบ:*
• ฟอร์ม: ฟอร์มทดสอบระบบ
• ผู้บันทึก: pongpanp (Super Admin)
• วันที่: ${new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}

🔗 *การเชื่อมต่อ:*
• Backend: http://localhost:5000
• Frontend: http://localhost:3000
• Bot: @QKnowledgebot

🎯 *สถานะ:*
✅ Bull Queue: Ready
✅ Redis: Connected
✅ PostgreSQL: Connected
✅ Telegram Bot: Active

_ส่งจาก Q-Collector v0.8.0 Advanced Telegram Notification System_`;

    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;

    const response = await axios.post(url, {
      chat_id: GROUP_ID,
      text: message,
      parse_mode: 'Markdown',
    });

    if (response.data.ok) {
      console.log('✅ Message sent successfully!\n');
      console.log('Message Details:');
      console.log(`  Message ID: ${response.data.result.message_id}`);
      console.log(`  Chat ID: ${response.data.result.chat.id}`);
      console.log(`  Chat Type: ${response.data.result.chat.type}`);
      console.log(`  Date: ${new Date(response.data.result.date * 1000).toLocaleString('th-TH')}\n`);
      console.log('🎉 Check your Telegram group to see the message!');
    } else {
      console.log('❌ Failed to send message');
      console.log('Response:', response.data);
    }

    process.exit(0);

  } catch (error) {
    console.error('❌ Error sending notification:');
    console.error(`   ${error.message}`);
    if (error.response) {
      console.error('   Response:', error.response.data);
    }
    process.exit(1);
  }
}

sendTestMessage();
