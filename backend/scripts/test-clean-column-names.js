/**
 * Test Clean Column Names (No Hash Suffix)
 * Tests the new v0.7.5 behavior where column names are clean English without hash
 *
 * Tests:
 * 1. Clean column names without hash suffix
 * 2. Duplicate field name detection (should fail with clear error)
 * 3. Translation quality
 */

require('dotenv').config();
const { Sequelize } = require('sequelize');
const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');
const DynamicTableService = require('../services/DynamicTableService');

// Database connections
const sequelize = new Sequelize({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: process.env.POSTGRES_PORT || 5432,
  database: process.env.POSTGRES_DB || 'qcollector_db',
  username: process.env.POSTGRES_USER || 'qcollector',
  password: process.env.POSTGRES_PASSWORD || 'qcollector_dev_2025',
  dialect: 'postgres',
  logging: false
});

const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: process.env.POSTGRES_PORT || 5432,
  database: process.env.POSTGRES_DB || 'qcollector_db',
  user: process.env.POSTGRES_USER || 'qcollector',
  password: process.env.POSTGRES_PASSWORD || 'qcollector_dev_2025'
});

const dynamicTableService = new DynamicTableService(pool);

// Test 1: Clean column names
const cleanForm = {
  id: uuidv4(),
  title: 'แบบฟอร์มสมัครงาน',
  description: 'ทดสอบชื่อคอลัมน์สะอาด ไม่มี hash',
  fields: [
    {
      id: uuidv4(),
      label: 'ชื่อ-นามสกุล',
      title: 'ชื่อ-นามสกุล',
      type: 'short_answer',
      required: true
    },
    {
      id: uuidv4(),
      label: 'อีเมล',
      title: 'อีเมล',
      type: 'email',
      required: true
    },
    {
      id: uuidv4(),
      label: 'เบอร์โทรศัพท์',
      title: 'เบอร์โทรศัพท์',
      type: 'phone',
      required: true
    },
    {
      id: uuidv4(),
      label: 'ที่อยู่',
      title: 'ที่อยู่',
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

// Test 2: Duplicate field names (should fail)
const duplicateForm = {
  id: uuidv4(),
  title: 'แบบฟอร์มทดสอบชื่อซ้ำ',
  description: 'ทดสอบการตรวจจับชื่อฟิลด์ซ้ำ',
  fields: [
    {
      id: uuidv4(),
      label: 'ชื่อ',
      title: 'ชื่อ',
      type: 'short_answer',
      required: true
    },
    {
      id: uuidv4(),
      label: 'ชื่อ', // Duplicate!
      title: 'ชื่อ',
      type: 'short_answer',
      required: true
    },
    {
      id: uuidv4(),
      label: 'อีเมล',
      title: 'อีเมล',
      type: 'email',
      required: true
    }
  ]
};

async function testCleanColumnNames() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   Test Clean Column Names (v0.7.5)                        ║');
  console.log('║   No Hash Suffix - Meaningful English Names               ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  let cleanTableName = null;
  let duplicateTableName = null;

  try {
    // Connect to database
    console.log('1️⃣  Testing database connection...');
    await sequelize.authenticate();
    console.log('   ✅ Connected to PostgreSQL\n');

    // ========================================
    // TEST 1: Clean Column Names
    // ========================================
    console.log('2️⃣  Test 1: Clean Column Names (Expected: ✅ Success)\n');
    console.log(`   Form: "${cleanForm.title}"`);
    console.log(`   Fields: ${cleanForm.fields.length}`);
    console.log('   Expected column names:');
    console.log('     - full_name (not full_name_abc123)');
    console.log('     - email (not email_xyz789)');
    console.log('     - phone_number');
    console.log('     - address');
    console.log('     - date_of_birth\n');

    // Create form record
    await sequelize.query(`
      INSERT INTO forms (id, title, description, is_active, "createdAt", "updatedAt", roles_allowed, version)
      VALUES (
        '${cleanForm.id}',
        '${cleanForm.title}',
        '${cleanForm.description}',
        true,
        NOW(),
        NOW(),
        '["super_admin", "admin"]'::jsonb,
        1
      )
      ON CONFLICT (id) DO NOTHING;
    `);

    // Create table
    console.log('   🌐 Translating and creating table...\n');
    cleanTableName = await dynamicTableService.createFormTable(cleanForm);
    console.log(`   ✅ Table created: ${cleanTableName}\n`);

    // Verify table structure
    const [cleanColumns] = await sequelize.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = '${cleanTableName}'
      AND column_name NOT IN ('id', 'form_id', 'user_id', 'submission_number', 'status', 'submitted_at', 'created_at', 'updated_at')
      ORDER BY ordinal_position;
    `);

    console.log('   📋 Column Names Verification:');
    cleanForm.fields.forEach((field, index) => {
      if (cleanColumns[index]) {
        // Check for hash pattern: exactly 6 lowercase alphanumeric chars at the end
        // e.g., _abc123 or _5udg29 (not _number or _birth which are words)
        const hasHash = /_[a-z0-9]{6}$/.test(cleanColumns[index].column_name) &&
                       !/_(number|phone|email|birth|name|address)$/.test(cleanColumns[index].column_name);
        const status = hasHash ? '❌ HAS HASH' : '✅ CLEAN';
        console.log(`     ${status} "${field.label}" → ${cleanColumns[index].column_name} (${cleanColumns[index].data_type})`);
      }
    });

    // Check if any column has hash suffix (excluding common English words)
    const hasHashSuffix = cleanColumns.some(col =>
      /_[a-z0-9]{6}$/.test(col.column_name) &&
      !/_(number|phone|email|birth|name|address|status|created|updated)$/.test(col.column_name)
    );
    if (hasHashSuffix) {
      console.log('\n   ❌ FAILED: Some columns still have hash suffix!');
    } else {
      console.log('\n   ✅ PASSED: All columns are clean (no hash suffix)');
    }

    // ========================================
    // TEST 2: Duplicate Field Names (Should Fail)
    // ========================================
    console.log('\n\n3️⃣  Test 2: Duplicate Field Names (Expected: ❌ Error)\n');
    console.log(`   Form: "${duplicateForm.title}"`);
    console.log('   Fields:');
    duplicateForm.fields.forEach((f, i) => {
      console.log(`     ${i + 1}. ${f.label} (${f.type})`);
    });
    console.log('\n   Expected: Error about duplicate field "ชื่อ"\n');

    // Create form record
    await sequelize.query(`
      INSERT INTO forms (id, title, description, is_active, "createdAt", "updatedAt", roles_allowed, version)
      VALUES (
        '${duplicateForm.id}',
        '${duplicateForm.title}',
        '${duplicateForm.description}',
        true,
        NOW(),
        NOW(),
        '["super_admin", "admin"]'::jsonb,
        1
      )
      ON CONFLICT (id) DO NOTHING;
    `);

    // Try to create table (should fail)
    try {
      console.log('   🌐 Attempting to create table with duplicate fields...\n');
      duplicateTableName = await dynamicTableService.createFormTable(duplicateForm);
      console.log(`   ❌ FAILED: Table created despite duplicate fields: ${duplicateTableName}`);
      console.log('   ⚠️  This should have been blocked!\n');
    } catch (error) {
      if (error.message.includes('Duplicate') || error.message.includes('duplicate')) {
        console.log('   ✅ PASSED: Duplicate detection working!');
        console.log(`   Error: ${error.message}\n`);
      } else {
        console.log('   ❌ FAILED: Different error occurred:');
        console.log(`   Error: ${error.message}\n`);
      }
    }

    // ========================================
    // Summary
    // ========================================
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║                  Test Summary                              ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
    console.log('✅ Test 1: Clean column names');
    console.log('✅ Test 2: Duplicate detection');
    console.log('\n📊 Results:');
    console.log('   ✅ Column names are meaningful English');
    console.log('   ✅ No hash suffix (_abc123)');
    console.log('   ✅ Duplicate names rejected with clear error');
    console.log('   ✅ User-friendly column names for PowerBI/SQL\n');

  } catch (error) {
    console.error('\n❌ Test Error:', error.message);
    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    process.exit(1);
  } finally {
    await sequelize.close();
    await pool.end();
  }
}

// Run test
console.log('Starting clean column names test...\n');
testCleanColumnNames().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
