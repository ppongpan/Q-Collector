/**
 * Test Thai Translation System (Complete E2E Test)
 *
 * Tests:
 * 1. Translation Service (Dictionary + API fallback)
 * 2. Schema Generation (Thai → English table/column names)
 * 3. Dynamic Table Creation
 * 4. Submission to Dynamic Tables
 *
 * Usage: node backend/scripts/test-thai-translation-system.js
 */

require('dotenv').config();
const TranslationService = require('../services/TranslationService');
const SchemaGenerator = require('../services/SchemaGenerator');
const SQLNameNormalizer = require('../services/SQLNameNormalizer');
const DynamicTableService = require('../services/DynamicTableService');
const { sequelize } = require('../models');

// Test data
const testFormName = 'แบบฟอร์มติดต่อลูกค้า'; // Thai form name
const testFields = [
  { label: 'ชื่อเต็ม', type: 'short_answer', required: true },
  { label: 'อีเมล', type: 'email', required: true },
  { label: 'เบอร์โทรศัพท์', type: 'phone', required: false },
  { label: 'ข้อความ', type: 'paragraph', required: false },
];

async function testTranslationSystem() {
  console.log('\n=================================================');
  console.log('🧪 Thai Translation System E2E Test');
  console.log('=================================================\n');

  try {
    // Connect to database
    await sequelize.authenticate();
    console.log('✅ Database connected\n');

    // ============================================
    // Test 1: Translation Service
    // ============================================
    console.log('📋 Test 1: Translation Service\n');

    const formTranslation = await TranslationService.translate(testFormName, {
      useAPI: false, // Don't use API for now (LibreTranslate may not be ready)
      lowercase: true
    });

    console.log(`   Input:  "${testFormName}"`);
    console.log(`   Output: "${formTranslation.english}"`);
    console.log(`   Source: ${formTranslation.source}`);
    console.log(`   Confidence: ${(formTranslation.confidence * 100).toFixed(0)}%\n`);

    // Test field translations
    console.log('   Field Translations:');
    for (const field of testFields) {
      const fieldTranslation = await TranslationService.translate(field.label, {
        useAPI: false,
        lowercase: true
      });
      console.log(`     "${field.label}" → "${fieldTranslation.english}" (${fieldTranslation.source})`);
    }
    console.log('');

    // ============================================
    // Test 2: Schema Generation
    // ============================================
    console.log('📋 Test 2: Schema Generation\n');

    const formDefinition = {
      id: '10192ce0-6f3b-47ec-9fb0-ce2056d7640e', // Use real form ID from database
      name: testFormName,
      fields: testFields
    };

    const schema = await SchemaGenerator.generateSchema(formDefinition, {
      tablePrefix: 'form_',
      includeMetadata: true,
      includeIndexes: true
    });

    console.log(`   Table Name: ${schema.mainTable.tableName}`);
    console.log(`   Columns (${schema.mainTable.columns.length}):`);
    schema.mainTable.columns.forEach(col => {
      console.log(`     - ${col.name} (${col.type})${col.originalLabel ? ` <- "${col.originalLabel}"` : ''}`);
    });
    console.log('');

    console.log('   CREATE TABLE Statement:');
    console.log('   ' + schema.mainTable.createStatement.split('\n').join('\n   '));
    console.log('');

    // ============================================
    // Test 3: Dynamic Table Creation
    // ============================================
    console.log('📋 Test 3: Dynamic Table Creation\n');

    const dynamicTableService = new DynamicTableService();

    // Check if table already exists
    const [existsResult] = await sequelize.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = '${schema.mainTable.tableName}'
      ) as exists;
    `);
    const tableExists = existsResult[0].exists;

    if (tableExists) {
      console.log(`   ⚠️  Table ${schema.mainTable.tableName} already exists`);
      const dropConfirm = await askConfirmation('   Drop existing table?');

      if (dropConfirm) {
        await sequelize.query(`DROP TABLE IF EXISTS ${schema.mainTable.tableName} CASCADE;`);
        console.log(`   ✅ Dropped table ${schema.mainTable.tableName}\n`);
      } else {
        console.log('   ℹ️  Using existing table\n');
      }
    }

    if (!tableExists) {
      await sequelize.query(schema.mainTable.createStatement);
      console.log(`   ✅ Created table: ${schema.mainTable.tableName}`);

      // Create indexes
      for (const indexStatement of schema.mainTable.indexes) {
        await sequelize.query(indexStatement);
        console.log(`   ✅ Created index`);
      }
      console.log('');
    }

    // ============================================
    // Test 4: Insert Test Data
    // ============================================
    console.log('📋 Test 4: Insert Test Submission\n');

    const testSubmissionData = {
      full_name: 'ทดสอบ ระบบแปล',
      email: 'test@example.com',
      phone_number: '0812345678',
      message: 'ทดสอบการบันทึกข้อมูลภาษาไทย'
    };

    console.log('   Test Data:');
    Object.entries(testSubmissionData).forEach(([key, value]) => {
      console.log(`     ${key}: ${value}`);
    });
    console.log('');

    const insertResult = await dynamicTableService.insertSubmission(
      formDefinition.id,
      schema.mainTable.tableName,
      null, // user_id can be null for test
      testSubmissionData
    );

    console.log(`   ✅ Inserted submission ID: ${insertResult.id}\n`);

    // ============================================
    // Test 5: Retrieve Data
    // ============================================
    console.log('📋 Test 5: Retrieve Submission\n');

    const [submissions] = await sequelize.query(`
      SELECT * FROM ${schema.mainTable.tableName}
      ORDER BY created_at DESC
      LIMIT 5;
    `);

    console.log(`   Retrieved ${submissions.length} submission(s):\n`);
    submissions.forEach((sub, index) => {
      console.log(`   Submission ${index + 1}:`);
      Object.entries(sub).forEach(([key, value]) => {
        console.log(`     ${key}: ${value}`);
      });
      console.log('');
    });

    // ============================================
    // Test 6: Translation Stats
    // ============================================
    console.log('📋 Test 6: Translation Statistics\n');

    const stats = TranslationService.getStats();
    console.log('   Statistics:');
    console.log(`     Dictionary hits:  ${stats.dictionaryHits}`);
    console.log(`     Cache hits:       ${stats.cacheHits}`);
    console.log(`     API calls:        ${stats.apiCalls}`);
    console.log(`     API success:      ${stats.apiSuccess}`);
    console.log(`     API errors:       ${stats.apiErrors}`);
    console.log(`     Total:            ${stats.totalTranslations}`);
    console.log(`     API success rate: ${stats.apiSuccessRate}%\n`);

    // ============================================
    // Summary
    // ============================================
    console.log('=================================================');
    console.log('✅ All Tests Passed!');
    console.log('=================================================\n');

    console.log('Summary:');
    console.log(`  ✅ Translation: Thai → English (${formTranslation.source})`);
    console.log(`  ✅ Schema: Generated with ${schema.mainTable.columns.length} columns`);
    console.log(`  ✅ Table: ${schema.mainTable.tableName} created`);
    console.log(`  ✅ Data: Inserted successfully`);
    console.log(`  ✅ Retrieval: ${submissions.length} record(s) found\n`);

    console.log('Next Steps:');
    console.log('  1. Start LibreTranslate: docker-compose up libretranslate');
    console.log('  2. Run migration: node backend/scripts/migrate-retranslate-forms.js --dry-run');
    console.log('  3. Test frontend form creation with Thai names\n');

  } catch (error) {
    console.error('\n❌ Test Failed:', error.message);
    console.error(error.stack);
    throw error;
  } finally {
    await sequelize.close();
  }
}

// Helper: Ask confirmation
function askConfirmation(question) {
  return new Promise((resolve) => {
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    rl.question(`${question} (y/N): `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y');
    });
  });
}

// Run test
if (require.main === module) {
  testTranslationSystem()
    .then(() => {
      console.log('✅ Test script completed\n');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Test script failed:', error);
      process.exit(1);
    });
}

module.exports = { testTranslationSystem };
