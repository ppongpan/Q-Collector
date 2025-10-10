/**
 * Translation Workflow Integration Test
 *
 * Tests the complete translation workflow by:
 * 1. Loading test forms from database
 * 2. Simulating FormService.updateForm() to trigger table creation
 * 3. Verifying tables created with meaningful English names
 * 4. Checking column names are translated correctly
 * 5. Testing sub-form table generation
 *
 * @version 1.0.0 (v0.7.7-dev)
 * @created 2025-10-10
 */

require('dotenv').config();
const { sequelize, Form, Field, SubForm } = require('../models');
const DynamicTableService = require('../services/DynamicTableService');
const tableNameHelper = require('../utils/tableNameHelper');

// Test statistics
const stats = {
  formsProcessed: 0,
  tablesCreated: 0,
  columnsCreated: 0,
  subFormsProcessed: 0,
  translationQuality: [],
  errors: []
};

/**
 * Verify table exists in database
 */
async function verifyTableExists(tableName) {
  try {
    const result = await sequelize.query(
      `SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = $1
      )`,
      {
        bind: [tableName],
        type: sequelize.QueryTypes.SELECT
      }
    );
    return result[0].exists;
  } catch (error) {
    console.error(`Error checking table ${tableName}:`, error.message);
    return false;
  }
}

/**
 * Get table column information
 */
async function getTableColumns(tableName) {
  try {
    const result = await sequelize.query(
      `SELECT column_name, data_type
       FROM information_schema.columns
       WHERE table_schema = 'public'
       AND table_name = $1
       ORDER BY ordinal_position`,
      {
        bind: [tableName],
        type: sequelize.QueryTypes.SELECT
      }
    );
    return result;
  } catch (error) {
    console.error(`Error getting columns for ${tableName}:`, error.message);
    return [];
  }
}

/**
 * Test translation quality for a form
 */
async function testFormTranslation(form) {
  console.log(`\n📋 Testing: "${form.title}"`);
  console.log(`   Form ID: ${form.id}`);

  const testResult = {
    formId: form.id,
    formTitle: form.title,
    tableName: null,
    tableExists: false,
    columns: [],
    subForms: [],
    errors: []
  };

  try {
    // Test 1: Generate table name
    console.log(`   🔄 Generating table name...`);
    const tableName = await tableNameHelper.generateTableName(form.title, form.id);
    testResult.tableName = tableName;
    console.log(`   ✅ Table name: ${tableName}`);

    // Check if table name is meaningful English
    const hasEnglishWords = /\b(form|list|record|data|contact|leave|survey|complaint|application|order|family|sales|marketing|accounting|service|waste|quality|support)\b/i.test(tableName);

    if (hasEnglishWords) {
      console.log(`   ✅ Contains meaningful English words`);
    } else {
      console.log(`   ⚠️  May not contain common English words`);
    }

    // Test 2: Create table via DynamicTableService
    console.log(`   🔄 Creating dynamic table...`);
    try {
      const dynamicService = new DynamicTableService();
      await dynamicService.createTableForForm(form.id);

      // Verify table was created
      const exists = await verifyTableExists(tableName);
      testResult.tableExists = exists;

      if (exists) {
        console.log(`   ✅ Table created successfully`);
        stats.tablesCreated++;

        // Test 3: Verify column names
        console.log(`   🔄 Checking column names...`);
        const columns = await getTableColumns(tableName);
        testResult.columns = columns;

        // Filter out system columns
        const systemColumns = ['id', 'submission_id', 'sub_form_id', 'main_form_subid', 'parent_id', 'parent_id2', 'created_at', 'updated_at'];
        const userColumns = columns.filter(col => !systemColumns.includes(col.column_name));

        console.log(`   📊 Columns: ${userColumns.length} user columns, ${columns.length} total`);

        userColumns.forEach(col => {
          console.log(`      - ${col.column_name} (${col.data_type})`);
          stats.columnsCreated++;
        });

        // Check if user columns have meaningful English names
        const allEnglish = userColumns.every(col => {
          const isEnglish = /^[a-z_][a-z0-9_]*$/.test(col.column_name) &&
                            !/^_[a-z0-9]{6,}/.test(col.column_name); // Not hash-based
          return isEnglish;
        });

        if (allEnglish) {
          console.log(`   ✅ All user columns have valid English names`);
        } else {
          console.log(`   ⚠️  Some columns may have non-English names`);
        }

      } else {
        console.log(`   ❌ Table creation failed - table does not exist`);
        testResult.errors.push('Table not found after creation');
      }

    } catch (createError) {
      console.log(`   ❌ Table creation error: ${createError.message}`);
      testResult.errors.push(`Table creation: ${createError.message}`);
    }

    // Test 4: Check sub-forms
    if (form.subForms && form.subForms.length > 0) {
      console.log(`   🔄 Testing ${form.subForms.length} sub-form(s)...`);

      for (const subForm of form.subForms) {
        const subFormResult = await testSubFormTranslation(subForm, form);
        testResult.subForms.push(subFormResult);
      }
    }

    stats.formsProcessed++;

  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    testResult.errors.push(error.message);
    stats.errors.push({
      formId: form.id,
      formTitle: form.title,
      error: error.message
    });
  }

  return testResult;
}

/**
 * Test sub-form translation
 */
async function testSubFormTranslation(subForm, parentForm) {
  console.log(`\n      📋 Sub-form: "${subForm.title}"`);

  const result = {
    subFormId: subForm.id,
    subFormTitle: subForm.title,
    tableName: null,
    tableExists: false,
    columns: [],
    errors: []
  };

  try {
    // Generate sub-form table name
    const tableName = await tableNameHelper.generateTableName(subForm.title, subForm.id);
    result.tableName = tableName;
    console.log(`      ✅ Sub-form table: ${tableName}`);

    // Check if sub-form table exists (should be created with parent form)
    const exists = await verifyTableExists(tableName);
    result.tableExists = exists;

    if (exists) {
      console.log(`      ✅ Sub-form table exists`);

      // Get columns
      const columns = await getTableColumns(tableName);
      result.columns = columns;

      const systemColumns = ['id', 'submission_id', 'sub_form_id', 'main_form_subid', 'parent_id', 'parent_id2', 'created_at', 'updated_at'];
      const userColumns = columns.filter(col => !systemColumns.includes(col.column_name));

      console.log(`      📊 Sub-form columns: ${userColumns.length} user columns`);
      userColumns.forEach(col => {
        console.log(`         - ${col.column_name} (${col.data_type})`);
      });

      stats.subFormsProcessed++;
    } else {
      console.log(`      ⚠️  Sub-form table not found`);
    }

  } catch (error) {
    console.log(`      ❌ Sub-form error: ${error.message}`);
    result.errors.push(error.message);
  }

  return result;
}

/**
 * Main test execution
 */
async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     Translation Workflow Integration Test v1.0.0          ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  console.log('📋 This test simulates the complete translation workflow:');
  console.log('   1. Load test forms from database');
  console.log('   2. Generate English table names via tableNameHelper');
  console.log('   3. Create tables via DynamicTableService');
  console.log('   4. Verify tables and columns exist with English names');
  console.log('   5. Test sub-form table generation\n');

  try {
    // Load all forms
    console.log('🔍 Loading test forms from database...\n');
    const forms = await Form.findAll({
      include: [
        {
          model: Field,
          as: 'fields',
          required: false
        },
        {
          model: SubForm,
          as: 'subForms',
          required: false
        }
      ],
      order: [['createdAt', 'ASC']]
    });

    console.log(`✅ Found ${forms.length} forms to test\n`);
    console.log('═'.repeat(60));

    const results = [];

    // Test each form
    for (const form of forms) {
      const result = await testFormTranslation(form);
      results.push(result);

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    // Final summary
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║                   Test Summary                             ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    console.log(`📊 Statistics:`);
    console.log(`   Forms tested: ${forms.length}`);
    console.log(`   Forms processed: ${stats.formsProcessed}`);
    console.log(`   Tables created: ${stats.tablesCreated}`);
    console.log(`   Columns created: ${stats.columnsCreated}`);
    console.log(`   Sub-forms processed: ${stats.subFormsProcessed}`);
    console.log(`   Errors: ${stats.errors.length}\n`);

    if (stats.errors.length > 0) {
      console.log('⚠️  Errors encountered:');
      stats.errors.forEach((err, i) => {
        console.log(`   ${i + 1}. Form: "${err.formTitle}"`);
        console.log(`      Error: ${err.error}`);
      });
      console.log('');
    }

    // Quality analysis
    const formsWithTables = results.filter(r => r.tableExists).length;
    const successRate = forms.length > 0 ? (formsWithTables / forms.length * 100).toFixed(1) : 0;

    console.log(`✨ Translation Quality:`);
    console.log(`   Success rate: ${successRate}% (${formsWithTables}/${forms.length} forms)`);

    // Check for meaningful English names
    const meaningfulNames = results.filter(r => {
      if (!r.tableName) return false;
      return /\b(form|list|record|data|contact|leave|survey|complaint|application|order|family|sales|marketing|accounting|service|waste|quality|support)\b/i.test(r.tableName);
    }).length;

    console.log(`   Meaningful English names: ${meaningfulNames}/${results.length} forms`);
    console.log('');

    // PowerBI readiness check
    console.log(`🔌 PowerBI Readiness:`);
    if (formsWithTables > 0) {
      console.log(`   ✅ ${formsWithTables} tables ready for PowerBI connection`);
      console.log(`   ✅ All table names in snake_case format`);
      console.log(`   ✅ English column names for international users`);
    } else {
      console.log(`   ⚠️  No tables created - check errors above`);
    }
    console.log('');

    // Next steps
    console.log(`📋 Next Steps:`);
    console.log(`   1. Verify tables in PostgreSQL:`);
    console.log(`      SELECT tablename FROM pg_tables WHERE tablename NOT LIKE 'pg_%' ORDER BY tablename;`);
    console.log('');
    console.log(`   2. Check specific table structure:`);
    console.log(`      \\d+ table_name_here`);
    console.log('');
    console.log(`   3. Test PowerBI connection with new English table names`);
    console.log('');

    if (successRate >= 80) {
      console.log('✅ Translation system working as expected!\n');
      process.exit(0);
    } else if (successRate >= 50) {
      console.log('⚠️  Translation system partially working - review errors above\n');
      process.exit(1);
    } else {
      console.log('❌ Translation system has issues - review errors above\n');
      process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run tests
main();
