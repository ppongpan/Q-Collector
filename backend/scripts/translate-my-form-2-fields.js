/**
 * Translate My Form 2 Field Names to English
 *
 * Uses DictionaryTranslationService to translate Thai field names
 * Updates both the fields table and my_form_2_ab877066fdc9 dynamic table columns
 *
 * @version 0.7.3-dev
 * @date 2025-10-06
 */

const { Client } = require('pg');
require('dotenv').config();
const translationService = require('../services/DictionaryTranslationService');

// My Form 2 ID
const MY_FORM_2_ID = '573e1f37-4cc4-4f3c-b303-ab877066fdc9';
const DYNAMIC_TABLE = 'my_form_2_ab877066fdc9';

async function translateFields() {
  const client = new Client({
    host: process.env.POSTGRES_HOST || 'localhost',
    port: process.env.POSTGRES_PORT || 5432,
    database: process.env.POSTGRES_DB || 'qcollector_db',
    user: process.env.POSTGRES_USER || 'qcollector',
    password: process.env.POSTGRES_PASSWORD || 'qcollector_dev_2025'
  });

  try {
    await client.connect();
    console.log('\n🌏 Translating My Form 2 Field Names...\n');

    // Step 1: Get all fields for My Form 2
    console.log('📋 Step 1: Fetching fields...');
    const fieldsQuery = `
      SELECT id, title, type, sub_form_id
      FROM fields
      WHERE form_id = $1
      ORDER BY "order";
    `;
    const fieldsResult = await client.query(fieldsQuery, [MY_FORM_2_ID]);

    console.log(`   Found ${fieldsResult.rows.length} fields to translate:`);
    fieldsResult.rows.forEach((field, index) => {
      const subFormLabel = field.sub_form_id ? ' [SUB-FORM FIELD]' : '';
      console.log(`   ${index + 1}. ${field.title} (${field.type})${subFormLabel}`);
    });

    // Step 2: Translate each field
    console.log('\n🔄 Step 2: Translating field names...');
    const translations = [];

    for (const field of fieldsResult.rows) {
      // Skip sub-form fields (they belong to sub-form tables)
      if (field.sub_form_id) {
        console.log(`   ⏭️  Skipped: ${field.title} (sub-form field)`);
        continue;
      }

      const thaiName = field.title;
      const englishName = translationService.generateColumnName(thaiName);

      // Generate old field name from Thai title (transliterated)
      const oldFieldName = translationService.transliterate(thaiName).toLowerCase().replace(/\s+/g, '_');

      translations.push({
        id: field.id,
        thaiName,
        englishName,
        oldFieldName
      });

      console.log(`   ✅ ${thaiName} → ${englishName}`);
    }

    // Step 3: Check dynamic table structure
    console.log('\n📊 Step 3: Checking dynamic table structure...');
    const columnsQuery = `
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = $1
      AND table_schema = 'public'
      ORDER BY ordinal_position;
    `;
    const columnsResult = await client.query(columnsQuery, [DYNAMIC_TABLE]);

    console.log(`   ${DYNAMIC_TABLE} has ${columnsResult.rows.length} columns:`);
    columnsResult.rows.forEach(col => {
      console.log(`   - ${col.column_name} (${col.data_type})`);
    });

    // Step 4: Show what will be changed
    console.log('\n📝 Step 4: Translation Summary:');
    console.log(`\nMain Form Fields (${translations.length}):`);
    translations.forEach((t, index) => {
      console.log(`   ${index + 1}. "${t.thaiName}" → "${t.englishName}"`);
      if (t.oldFieldName && t.oldFieldName !== t.englishName) {
        console.log(`      (was: ${t.oldFieldName})`);
      }
    });

    // Step 5: Ask for confirmation
    console.log('\n⚠️  CONFIRMATION REQUIRED ⚠️');
    console.log('This will:');
    console.log(`   1. Rename ${translations.length} columns in ${DYNAMIC_TABLE} table`);
    console.log('\nTo proceed, run: node translate-my-form-2-fields.js --confirm');

    if (!process.argv.includes('--confirm')) {
      console.log('\n❌ Aborted (no --confirm flag)');
      await client.end();
      process.exit(0);
    }

    // Step 6: Rename dynamic table columns
    console.log('\n🔄 Step 5: Renaming dynamic table columns...');

    for (const translation of translations) {
      // Check if old column exists
      const oldColumn = translation.oldFieldName || translation.englishName;
      const columnExists = columnsResult.rows.some(col => col.column_name === oldColumn);

      if (!columnExists) {
        console.log(`   ⏭️  Column ${oldColumn} doesn't exist, skipping...`);
        continue;
      }

      // Skip if already has correct name
      if (oldColumn === translation.englishName) {
        console.log(`   ✓  Column ${translation.englishName} already correct`);
        continue;
      }

      try {
        await client.query(`
          ALTER TABLE ${DYNAMIC_TABLE}
          RENAME COLUMN "${oldColumn}" TO "${translation.englishName}";
        `);
        console.log(`   ✅ Renamed: ${oldColumn} → ${translation.englishName}`);
      } catch (error) {
        console.error(`   ❌ Failed to rename ${oldColumn}:`, error.message);
      }
    }

    // Step 7: Verify final structure
    console.log('\n📊 Step 6: Verifying final structure...');
    const finalColumns = await client.query(columnsQuery, [DYNAMIC_TABLE]);

    console.log(`   ${DYNAMIC_TABLE} final columns:`);
    finalColumns.rows.forEach(col => {
      console.log(`   - ${col.column_name} (${col.data_type})`);
    });

    console.log('\n✅ Translation completed successfully!');
    console.log('\nSummary:');
    console.log(`   ✅ Translated ${translations.length} field names`);
    console.log(`   ✅ Renamed columns in ${DYNAMIC_TABLE}`);

  } catch (error) {
    console.error('\n❌ Translation failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Run translation
translateFields();
