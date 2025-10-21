/**
 * Test script for notification models
 * Verifies tables exist and models work correctly
 */

const models = require('../models');

async function testNotificationModels() {
  try {
    console.log('🧪 Testing Notification Models...\n');

    // Test 1: Verify tables exist
    console.log('1️⃣ Checking if tables exist...');
    const [rulesTable] = await models.sequelize.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notification_rules'"
    );
    const [historyTable] = await models.sequelize.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notification_history'"
    );

    if (rulesTable.length > 0) {
      console.log('✅ notification_rules table exists');
    } else {
      console.log('❌ notification_rules table NOT found');
    }

    if (historyTable.length > 0) {
      console.log('✅ notification_history table exists');
    } else {
      console.log('❌ notification_history table NOT found');
    }

    // Test 2: Check models are loaded
    console.log('\n2️⃣ Checking if models are loaded...');
    if (models.NotificationRule) {
      console.log('✅ NotificationRule model loaded');
    } else {
      console.log('❌ NotificationRule model NOT loaded');
    }

    if (models.NotificationHistory) {
      console.log('✅ NotificationHistory model loaded');
    } else {
      console.log('❌ NotificationHistory model NOT loaded');
    }

    // Test 3: Check associations
    console.log('\n3️⃣ Checking model associations...');
    const ruleAssociations = Object.keys(models.NotificationRule.associations);
    const historyAssociations = Object.keys(models.NotificationHistory.associations);

    console.log('NotificationRule associations:', ruleAssociations);
    console.log('NotificationHistory associations:', historyAssociations);

    // Test 4: Test basic operations
    console.log('\n4️⃣ Testing basic operations...');

    // Create a test notification rule
    const testRule = await models.NotificationRule.create({
      name: 'Test Rule',
      description: 'Test notification rule',
      trigger_type: 'field_update',
      condition_formula: '[status] = "completed"',
      message_template: 'Status changed to {status}',
      is_enabled: false, // Disabled for testing
      send_once: false,
      priority: 'low',
    });
    console.log('✅ Created test notification rule:', testRule.id);

    // Create test history entry
    const testHistory = await models.NotificationHistory.create({
      notification_rule_id: testRule.id,
      condition_met: true,
      status: 'pending',
    });
    console.log('✅ Created test notification history:', testHistory.id);

    // Test instance methods
    console.log('\n5️⃣ Testing instance methods...');

    // Test evaluateCondition
    const conditionResult = await testRule.evaluateCondition({ status: 'completed' });
    console.log('evaluateCondition result:', conditionResult.result ? '✅ TRUE' : '❌ FALSE');

    // Test formatMessage
    const formattedMessage = testRule.formatMessage({ status: 'completed' });
    console.log('formatMessage result:', formattedMessage);

    // Test canSendNotification (use a real UUID)
    const testSubmissionId = '00000000-0000-0000-0000-000000000001';
    const canSend = await testRule.canSendNotification(testSubmissionId);
    console.log('canSendNotification result:', canSend ? '✅ CAN SEND' : '❌ CANNOT SEND');

    // Test markAsSent
    await testHistory.markAsSent({ message_id: 123, chat: { id: 456 } });
    console.log('✅ markAsSent completed');

    // Test class methods
    console.log('\n6️⃣ Testing class methods...');

    const activeRules = await models.NotificationRule.findActiveRules('field_update');
    console.log(`findActiveRules found: ${activeRules.length} rule(s)`);

    const stats = await models.NotificationRule.getStatistics(testRule.id);
    console.log('getStatistics:', stats);

    // Test NotificationHistory class methods
    const hasBeenSent = await models.NotificationHistory.hasBeenSent(testRule.id, testSubmissionId);
    console.log('hasBeenSent:', hasBeenSent ? '✅ YES' : '❌ NO');

    const failureRate = await models.NotificationHistory.getFailureRate(testRule.id);
    console.log('getFailureRate:', failureRate);

    // Cleanup
    console.log('\n🧹 Cleaning up test data...');
    await testHistory.destroy();
    console.log('✅ Deleted test history');

    await testRule.destroy();
    console.log('✅ Deleted test rule');

    console.log('\n🎉 All tests passed!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run tests
testNotificationModels();
