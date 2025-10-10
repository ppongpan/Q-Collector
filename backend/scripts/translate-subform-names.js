/**
 * Translate Sub-Form Names to English
 *
 * Translate Thai sub-form names to English
 * Update both sub_forms table and dynamic table names
 *
 * @version 0.7.3-dev
 * @date 2025-10-06
 */

const { Client } = require('pg');
require('dotenv').config();
const translationService = require('../services/DictionaryTranslationService');

// My Form 2 ID
const MY_FORM_2_ID = '573e1f37-4cc4-4f3c-b303-ab877066fdc9';

async function translateSubFormNames() {
  const client = new Client({
    host: process.env.POSTGRES_HOST || 'localhost',
    port: process.env.POSTGRES_PORT || 5432,
    database: process.env.POSTGRES_DB || 'qcollector_db',
    user: process.env.POSTGRES_USER || 'qcollector',
    password: process.env.POSTGRES_PASSWORD || 'qcollector_dev_2025'
  });

  try {
    await client.connect();
    console.log('\n🌏 Translating Sub-Form Names...\n');

    // Step 1: Get all sub-forms for My Form 2
    console.log('📋 Step 1: Fetching sub-forms...');
    const subFormsQuery = `
      SELECT id, title, table_name, form_id
      FROM sub_forms
      WHERE form_id = $1
      ORDER BY "order";
    `;
    const subFormsResult = await client.query(subFormsQuery, [MY_FORM_2_ID]);

    console.log(`   Found ${subFormsResult.rows.length} sub-form(s):`);
    subFormsResult.rows.forEach((subForm, index) => {
      console.log(`   ${index + 1}. ${subForm.title}`);
      console.log(`      - Table: ${subForm.table_name || 'N/A'}`);
    });

    if (subFormsResult.rows.length === 0) {
      console.log('\n   ✓  No sub-forms found for My Form 2');
      await client.end();
      process.exit(0);
    }

    // Step 2: Translate sub-form names
    console.log('\n🔄 Step 2: Translating sub-form names...');
    const translations = [];

    for (const subForm of subFormsResult.rows) {
      const thaiName = subForm.title;
      const englishName = translationService.translate(thaiName, 'general');
      const tableName = translationService.generateTableName(thaiName);

      translations.push({
        id: subForm.id,
        thaiName,
        englishName,
        oldTableName: subForm.table_name,
        newTableName: tableName
      });

      console.log(`   ✅ ${thaiName} → ${englishName}`);
      console.log(`      Table: ${subForm.table_name || 'N/A'} → ${tableName}_[suffix]`);
    }

    // Step 3: Show translation summary
    console.log('\n📝 Step 3: Translation Summary:');
    translations.forEach((t, index) => {
      console.log(`\n   ${index + 1}. "${t.thaiName}"`);
      console.log(`      → English: "${t.englishName}"`);
      console.log(`      → Table: ${t.oldTableName || 'N/A'}`);
    });

    // Step 4: Check if dynamic tables exist
    console.log('\n📊 Step 4: Checking dynamic tables...');
    for (const translation of translations) {
      if (translation.oldTableName) {
        const tableExistsQuery = `
          SELECT EXISTS (
            SELECT FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_name = $1
          );
        `;
        const tableResult = await client.query(tableExistsQuery, [translation.oldTableName]);
        const exists = tableResult.rows[0].exists;

        console.log(`   ${exists ? '✓' : '✗'} Table: ${translation.oldTableName} ${exists ? 'exists' : 'does not exist'}`);
      }
    }

    // Step 5: Ask for confirmation
    console.log('\n⚠️  CONFIRMATION REQUIRED ⚠️');
    console.log('This will:');
    console.log(`   1. Update title in sub_forms table for ${translations.length} sub-form(s)`);
    console.log('   2. Note: Table renaming requires manual verification');
    console.log('\nTo proceed, run: node translate-subform-names.js --confirm');

    if (!process.argv.includes('--confirm')) {
      console.log('\n❌ Aborted (no --confirm flag)');
      await client.end();
      process.exit(0);
    }

    // Step 6: Update sub_forms table (title_en column if exists, or just show translation)
    console.log('\n🔄 Step 5: Updating sub-form translations...');
    await client.query('BEGIN');

    try {
      for (const translation of translations) {
        // Check if title_en column exists
        const columnExistsQuery = `
          SELECT EXISTS (
            SELECT FROM information_schema.columns
            WHERE table_name = 'sub_forms'
            AND column_name = 'title_en'
          );
        `;
        const columnResult = await client.query(columnExistsQuery);
        const hasEnglishColumn = columnResult.rows[0].exists;

        if (hasEnglishColumn) {
          // Update title_en column
          await client.query(
            'UPDATE sub_forms SET title_en = $1, "updatedAt" = NOW() WHERE id = $2',
            [translation.englishName, translation.id]
          );
          console.log(`   ✅ Updated: ${translation.thaiName} (title_en = ${translation.englishName})`);
        } else {
          // Just log the translation (no title_en column)
          console.log(`   ℹ️  Translation: ${translation.thaiName} → ${translation.englishName}`);
          console.log(`      (title_en column does not exist, only showing translation)`);
        }
      }

      await client.query('COMMIT');
      console.log('\n✅ Sub-form translations updated successfully');

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ Error updating sub-forms:', error.message);
      throw error;
    }

    // Step 7: Show recommendations for table renaming
    console.log('\n📋 Step 6: Table Renaming Recommendations:');
    console.log('\nFor manual table renaming, use these SQL commands:');
    console.log('(⚠️  WARNING: Backup data before renaming tables!)');

    for (const translation of translations) {
      if (translation.oldTableName) {
        const newSuffix = translation.oldTableName.split('_').pop();
        const newTableName = `${translation.newTableName}_${newSuffix}`;
        console.log(`\n-- Rename: ${translation.thaiName}`);
        console.log(`ALTER TABLE "${translation.oldTableName}" RENAME TO "${newTableName}";`);
      }
    }

    console.log('\n✅ Translation completed successfully!');
    console.log('\nSummary:');
    console.log(`   ✅ Translated ${translations.length} sub-form name(s)`);
    console.log('   ℹ️  Table renaming requires manual verification');

  } catch (error) {
    console.error('\n❌ Translation failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Run translation
translateSubFormNames();
