/**
 * Manual Test Script - Migration Integration
 *
 * Tests the complete migration workflow:
 * 1. Create form with fields
 * 2. Update form (add/delete/rename fields)
 * 3. Verify migrations are queued and executed
 * 4. Check dynamic table structure
 *
 * Usage: node backend/scripts/test-migration-integration.js
 */

const { sequelize, Form, Field, User, FieldMigration } = require('../models');
const FormService = require('../services/FormService');
const MigrationQueue = require('../services/MigrationQueue');

// Helper to wait for queue processing
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
  console.log('🚀 Starting Migration Integration Test\n');

  try {
    // Step 1: Find or create test user
    console.log('1️⃣ Creating test user...');
    let testUser = await User.findOne({ where: { username: 'migrationtest' } });

    if (!testUser) {
      testUser = await User.create({
        username: 'migrationtest',
        email: 'migrationtest@test.com',
        password_hash: 'Test123!@#', // Will be hashed by beforeCreate hook
        role: 'admin'
      });
      console.log(`   ✅ Created user: ${testUser.username} (${testUser.id})`);
    } else {
      console.log(`   ✅ Found existing user: ${testUser.username} (${testUser.id})`);
    }

    // Step 2: Create form with initial fields
    console.log('\n2️⃣ Creating form with 2 fields...');
    const formData = {
      title: `Migration Test Form ${Date.now()}`,
      description: 'Testing automatic field migrations',
      roles_allowed: ['admin'],
      fields: [
        {
          type: 'short_answer',
          title: 'Full Name',
          required: true,
          order: 0
        },
        {
          type: 'email',
          title: 'Email Address',
          required: false,
          order: 1
        }
      ]
    };

    const form = await FormService.createForm(testUser.id, formData);
    console.log(`   ✅ Created form: ${form.title} (${form.id})`);
    console.log(`   📋 Table name: ${form.table_name}`);
    console.log(`   📄 Fields: ${form.fields.length}`);
    form.fields.forEach(f => {
      console.log(`      - ${f.title} (${f.column_name}, ${f.data_type})`);
    });

    // Step 3: Update form - Add new field
    console.log('\n3️⃣ Updating form - Adding "Phone" field...');
    const updatedFields = [
      ...form.fields,
      {
        type: 'phone',
        title: 'Phone Number',
        required: false,
        order: 2
      }
    ];

    const updatedForm = await FormService.updateForm(form.id, testUser.id, {
      fields: updatedFields
    });

    console.log(`   ✅ Form updated successfully`);
    console.log(`   📄 Fields: ${updatedForm.fields.length}`);

    // Step 4: Check queue status
    console.log('\n4️⃣ Checking migration queue status...');
    const queueStatus = await MigrationQueue.getStatus(form.id);
    console.log(`   📊 Queue Status:`, queueStatus);

    // Step 5: Wait for migrations to process
    console.log('\n5️⃣ Waiting for migrations to process (5 seconds)...');
    await wait(5000);

    // Step 6: Check migration records
    console.log('\n6️⃣ Checking migration records...');
    const migrations = await FieldMigration.findAll({
      where: { form_id: form.id },
      order: [['createdAt', 'ASC']]
    });

    console.log(`   📋 Total migrations: ${migrations.length}`);
    migrations.forEach((m, idx) => {
      console.log(`   ${idx + 1}. ${m.migration_type}: ${m.column_name || m.new_value?.columnName}`);
      console.log(`      Success: ${m.success}, Table: ${m.table_name}`);
      if (m.error_message) {
        console.log(`      Error: ${m.error_message}`);
      }
    });

    // Step 7: Update form again - Delete a field
    console.log('\n7️⃣ Updating form - Removing "Email Address" field...');
    const fieldsWithoutEmail = updatedForm.fields.filter(f => f.type !== 'email');

    await FormService.updateForm(form.id, testUser.id, {
      fields: fieldsWithoutEmail
    });

    console.log(`   ✅ Form updated successfully (deleted email field)`);

    // Wait and check migrations again
    console.log('\n8️⃣ Waiting for delete migration (5 seconds)...');
    await wait(5000);

    const allMigrations = await FieldMigration.findAll({
      where: { form_id: form.id },
      order: [['createdAt', 'ASC']]
    });

    console.log(`   📋 Total migrations after delete: ${allMigrations.length}`);
    const deleteMigrations = allMigrations.filter(m => m.migration_type === 'DROP_COLUMN');
    console.log(`   🗑️ Delete migrations: ${deleteMigrations.length}`);

    deleteMigrations.forEach(m => {
      console.log(`      - Column: ${m.column_name}, Success: ${m.success}, Backup ID: ${m.backup_id}`);
    });

    // Step 9: Final summary
    console.log('\n✅ Migration Integration Test Complete!');
    console.log('\n📊 Summary:');
    console.log(`   - Form ID: ${form.id}`);
    console.log(`   - Table: ${form.table_name}`);
    console.log(`   - Total migrations: ${allMigrations.length}`);
    console.log(`   - Successful: ${allMigrations.filter(m => m.success).length}`);
    console.log(`   - Failed: ${allMigrations.filter(m => !m.success).length}`);

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    console.error('Stack:', error.stack);
  } finally {
    // Close connections
    console.log('\n🔌 Closing connections...');
    await MigrationQueue.close();
    await sequelize.close();
    console.log('✅ Done!');
  }
}

main();
