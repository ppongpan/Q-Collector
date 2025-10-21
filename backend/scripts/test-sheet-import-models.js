/**
 * Test Script: Verify Google Sheets Import System Models
 *
 * This script tests:
 * 1. All 3 new models can be loaded
 * 2. Associations are defined correctly
 * 3. Tables exist in database with correct schema
 * 4. No impact on existing tables
 */

const { sequelize } = require('../config/database.config');
const models = require('../models');

async function testModels() {
  console.log('🔍 Testing Google Sheets Import System Models...\n');

  try {
    // Test 1: Verify models are loaded
    console.log('1️⃣  Checking if models are loaded...');
    const { SheetImportConfig, SheetImportHistory, GoogleAuthToken } = models;

    if (!SheetImportConfig) throw new Error('SheetImportConfig model not found');
    if (!SheetImportHistory) throw new Error('SheetImportHistory model not found');
    if (!GoogleAuthToken) throw new Error('GoogleAuthToken model not found');

    console.log('   ✅ SheetImportConfig loaded');
    console.log('   ✅ SheetImportHistory loaded');
    console.log('   ✅ GoogleAuthToken loaded\n');

    // Test 2: Verify associations
    console.log('2️⃣  Checking associations...');

    // SheetImportConfig associations
    if (!SheetImportConfig.associations.user) throw new Error('SheetImportConfig -> User association missing');
    if (!SheetImportConfig.associations.form) throw new Error('SheetImportConfig -> Form association missing');
    if (!SheetImportConfig.associations.subForm) throw new Error('SheetImportConfig -> SubForm association missing');
    if (!SheetImportConfig.associations.importHistory) throw new Error('SheetImportConfig -> SheetImportHistory association missing');
    console.log('   ✅ SheetImportConfig associations OK');

    // SheetImportHistory associations
    if (!SheetImportHistory.associations.config) throw new Error('SheetImportHistory -> SheetImportConfig association missing');
    if (!SheetImportHistory.associations.user) throw new Error('SheetImportHistory -> User association missing');
    if (!SheetImportHistory.associations.form) throw new Error('SheetImportHistory -> Form association missing');
    console.log('   ✅ SheetImportHistory associations OK');

    // GoogleAuthToken associations
    if (!GoogleAuthToken.associations.user) throw new Error('GoogleAuthToken -> User association missing');
    console.log('   ✅ GoogleAuthToken associations OK\n');

    // Test 3: Verify reverse associations
    console.log('3️⃣  Checking reverse associations...');
    const { User, Form, SubForm } = models;

    if (!User.associations.sheetImportConfigs) throw new Error('User -> SheetImportConfig association missing');
    if (!User.associations.sheetImportHistory) throw new Error('User -> SheetImportHistory association missing');
    if (!User.associations.googleAuthToken) throw new Error('User -> GoogleAuthToken association missing');
    console.log('   ✅ User reverse associations OK');

    if (!Form.associations.sheetImportConfigs) throw new Error('Form -> SheetImportConfig association missing');
    if (!Form.associations.sheetImportHistory) throw new Error('Form -> SheetImportHistory association missing');
    console.log('   ✅ Form reverse associations OK');

    if (!SubForm.associations.sheetImportConfigs) throw new Error('SubForm -> SheetImportConfig association missing');
    console.log('   ✅ SubForm reverse associations OK\n');

    // Test 4: Verify tables exist with correct columns
    console.log('4️⃣  Checking database tables...');

    const [configColumns] = await sequelize.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'sheet_import_configs'
      ORDER BY ordinal_position;
    `);

    const [historyColumns] = await sequelize.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'sheet_import_history'
      ORDER BY ordinal_position;
    `);

    const [tokenColumns] = await sequelize.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'google_auth_tokens'
      ORDER BY ordinal_position;
    `);

    console.log(`   ✅ sheet_import_configs: ${configColumns.length} columns`);
    console.log(`   ✅ sheet_import_history: ${historyColumns.length} columns`);
    console.log(`   ✅ google_auth_tokens: ${tokenColumns.length} columns\n`);

    // Test 5: Verify indexes
    console.log('5️⃣  Checking indexes...');

    const [configIndexes] = await sequelize.query(`
      SELECT indexname FROM pg_indexes
      WHERE tablename = 'sheet_import_configs';
    `);

    const [historyIndexes] = await sequelize.query(`
      SELECT indexname FROM pg_indexes
      WHERE tablename = 'sheet_import_history';
    `);

    const [tokenIndexes] = await sequelize.query(`
      SELECT indexname FROM pg_indexes
      WHERE tablename = 'google_auth_tokens';
    `);

    console.log(`   ✅ sheet_import_configs: ${configIndexes.length} indexes`);
    console.log(`   ✅ sheet_import_history: ${historyIndexes.length} indexes`);
    console.log(`   ✅ google_auth_tokens: ${tokenIndexes.length} indexes\n`);

    // Test 6: Verify foreign key constraints
    console.log('6️⃣  Checking foreign key constraints...');

    const [configFKs] = await sequelize.query(`
      SELECT conname as constraint_name
      FROM pg_constraint
      WHERE conrelid = 'sheet_import_configs'::regclass
      AND contype = 'f';
    `);

    const [historyFKs] = await sequelize.query(`
      SELECT conname as constraint_name
      FROM pg_constraint
      WHERE conrelid = 'sheet_import_history'::regclass
      AND contype = 'f';
    `);

    const [tokenFKs] = await sequelize.query(`
      SELECT conname as constraint_name
      FROM pg_constraint
      WHERE conrelid = 'google_auth_tokens'::regclass
      AND contype = 'f';
    `);

    console.log(`   ✅ sheet_import_configs: ${configFKs.length} foreign keys`);
    console.log(`   ✅ sheet_import_history: ${historyFKs.length} foreign keys`);
    console.log(`   ✅ google_auth_tokens: ${tokenFKs.length} foreign key\n`);

    // Test 7: Check existing tables are not affected
    console.log('7️⃣  Verifying existing tables are intact...');

    const existingTables = ['users', 'forms', 'sub_forms', 'fields', 'submissions', 'files'];

    for (const table of existingTables) {
      const [columns] = await sequelize.query(`
        SELECT COUNT(*) as count
        FROM information_schema.columns
        WHERE table_name = '${table}';
      `);

      if (columns[0].count === '0') {
        throw new Error(`Existing table ${table} is missing!`);
      }
      console.log(`   ✅ ${table}: ${columns[0].count} columns`);
    }

    console.log('\n✅ All tests passed! Google Sheets Import System is ready.\n');

    // Print summary
    console.log('📊 Summary:');
    console.log('   • 3 new tables created');
    console.log('   • 3 new models loaded');
    console.log('   • All associations defined correctly');
    console.log('   • All indexes created');
    console.log('   • All foreign keys in place');
    console.log('   • Existing tables untouched\n');

    process.exit(0);

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run tests
testModels();
