/**
 * End-to-End Test: Create Form with Thai Name
 * Tests MyMemory API integration with actual database
 */

require('dotenv').config();
const { Sequelize } = require('sequelize');
const DynamicTableService = require('../services/DynamicTableService');
const { v4: uuidv4 } = require('uuid');

// Database connection
const sequelize = new Sequelize({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: process.env.POSTGRES_PORT || 5432,
  database: process.env.POSTGRES_DB || 'qcollector_db',
  username: process.env.POSTGRES_USER || 'qcollector',
  password: process.env.POSTGRES_PASSWORD || 'qcollector_dev_2025',
  dialect: 'postgres',
  logging: false
});

// Create PG pool directly
const { Pool } = require('pg');
const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: process.env.POSTGRES_PORT || 5432,
  database: process.env.POSTGRES_DB || 'qcollector_db',
  user: process.env.POSTGRES_USER || 'qcollector',
  password: process.env.POSTGRES_PASSWORD || 'qcollector_dev_2025'
});

const dynamicTableService = new DynamicTableService(pool);

// Test form with Thai title and fields
const testForm = {
  id: uuidv4(),
  title: 'แบบฟอร์มทดสอบ MyMemory API',
  description: 'ทดสอบระบบแปลภาษาไทยเป็นอังกฤษ',
  fields: [
    {
      id: uuidv4(),
      label: 'ชื่อผู้ใช้งาน',
      title: 'ชื่อผู้ใช้งาน',
      type: 'short_answer',
      required: true
    },
    {
      id: uuidv4(),
      label: 'อีเมลติดต่อ',
      title: 'อีเมลติดต่อ',
      type: 'email',
      required: true
    },
    {
      id: uuidv4(),
      label: 'เบอร์โทรศัพท์',
      title: 'เบอร์โทรศัพท์',
      type: 'phone',
      required: false
    },
    {
      id: uuidv4(),
      label: 'ที่อยู่ปัจจุบัน',
      title: 'ที่อยู่ปัจจุบัน',
      type: 'paragraph',
      required: false
    },
    {
      id: uuidv4(),
      label: 'วันเกิด',
      title: 'วันเกิด',
      type: 'date',
      required: false
    }
  ]
};

async function testFormCreation() {
  console.log('=== E2E Test: Create Form with Thai Name ===\n');

  try {
    // Test database connection
    console.log('1️⃣  Testing database connection...');
    await sequelize.authenticate();
    console.log('   ✅ Connected to PostgreSQL\n');

    // Create form in Forms table first
    console.log('2️⃣  Creating form record...');
    console.log(`   Form ID: ${testForm.id}`);
    console.log(`   Thai Title: "${testForm.title}"`);

    await sequelize.query(`
      INSERT INTO forms (id, title, description, is_active, "createdAt", "updatedAt", roles_allowed, version)
      VALUES (
        '${testForm.id}',
        '${testForm.title}',
        '${testForm.description}',
        true,
        NOW(),
        NOW(),
        '["super_admin", "admin", ]'::jsonb,
        1
      )
      ON CONFLICT (id) DO NOTHING;
    `);
    console.log('   ✅ Form record created\n');

    // Create dynamic table with MyMemory translation
    console.log('3️⃣  Creating dynamic table with MyMemory translation...');
    console.log('   (This will call MyMemory API for Thai→English translation)\n');

    const tableName = await dynamicTableService.createFormTable(testForm);

    console.log('   ✅ Dynamic table created successfully!');
    console.log(`   📊 Table Name: ${tableName}\n`);

    // Verify table exists
    console.log('4️⃣  Verifying table structure...');
    const tableInfoQuery = `
      SELECT
        column_name,
        data_type,
        character_maximum_length
      FROM information_schema.columns
      WHERE table_name = '${tableName}'
      ORDER BY ordinal_position;
    `;

    const [columns] = await sequelize.query(tableInfoQuery);

    console.log(`   Table: ${tableName}`);
    console.log('   Columns:');
    columns.forEach(col => {
      const maxLength = col.character_maximum_length ? ` (${col.character_maximum_length})` : '';
      console.log(`     - ${col.column_name}: ${col.data_type}${maxLength}`);
    });
    console.log('');

    // Update form with table_name
    console.log('5️⃣  Updating form with table_name...');
    await sequelize.query(`
      UPDATE forms
      SET table_name = '${tableName}'
      WHERE id = '${testForm.id}';
    `);
    console.log('   ✅ Form updated\n');

    // Show translation summary
    console.log('6️⃣  Translation Summary:');
    console.log(`   Original: "${testForm.title}"`);
    console.log(`   Table: ${tableName}`);
    console.log('   Field Translations:');

    const fieldColumns = columns.filter(col =>
      !['id', 'form_id', 'user_id', 'submission_number', 'status', 'submitted_at', 'created_at', 'updated_at'].includes(col.column_name)
    );

    testForm.fields.forEach((field, index) => {
      if (fieldColumns[index]) {
        console.log(`     - "${field.label}" → ${fieldColumns[index].column_name}`);
      }
    });

    console.log('\n=== ✅ Test Complete! ===\n');
    console.log('📋 Summary:');
    console.log(`   - Form ID: ${testForm.id}`);
    console.log(`   - Thai Title: ${testForm.title}`);
    console.log(`   - Table Name: ${tableName}`);
    console.log(`   - Total Columns: ${columns.length}`);
    console.log(`   - Field Columns: ${fieldColumns.length}`);
    console.log('');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

// Run test
console.log('Starting E2E test...\n');
testFormCreation().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
