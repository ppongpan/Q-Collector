/**
 * Check Existing Forms and Tables Script
 *
 * Analyzes all forms in the database and their current table names
 * to prepare for LibreTranslate migration.
 *
 * Usage: node backend/scripts/check-existing-forms.js
 *
 * @version 1.0.0
 * @since 2025-10-02
 */

require('dotenv').config();
const { Sequelize } = require('sequelize');

// Database connection
const sequelize = new Sequelize(
  process.env.POSTGRES_DB || 'qcollector_db',
  process.env.POSTGRES_USER || 'qcollector',
  process.env.POSTGRES_PASSWORD || 'qcollector_dev_2025',
  {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: process.env.POSTGRES_PORT || 5432,
    dialect: 'postgres',
    logging: false,
  }
);

/**
 * Main check function
 */
async function checkExistingForms() {
  console.log('\n=================================================');
  console.log('📊 Existing Forms and Tables Analysis');
  console.log('=================================================\n');

  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established\n');

    // Query all forms
    const [forms] = await sequelize.query(`
      SELECT
        id,
        title,
        table_name,
        description,
        "createdAt" as created_at,
        "updatedAt" as updated_at
      FROM forms
      ORDER BY "createdAt" DESC
    `);

    console.log(`Found ${forms.length} forms in database\n`);

    if (forms.length === 0) {
      console.log('ℹ️  No forms found. Database is empty.\n');
      return;
    }

    console.log('─'.repeat(120));
    console.log(formatRow(['#', 'Form Title', 'Current Table Name', 'Created At']));
    console.log('─'.repeat(120));

    // Display each form
    forms.forEach((form, index) => {
      console.log(formatRow([
        (index + 1).toString(),
        truncate(form.title, 35),
        truncate(form.table_name || 'NULL', 35),
        formatDate(form.created_at),
      ]));
    });

    console.log('─'.repeat(120));

    // Check for forms without table_name
    const formsWithoutTable = forms.filter(f => !f.table_name);
    const formsWithTable = forms.filter(f => f.table_name);

    console.log('\n📈 Statistics:');
    console.log(`  Total Forms:           ${forms.length}`);
    console.log(`  With Table Name:       ${formsWithTable.length}`);
    console.log(`  Without Table Name:    ${formsWithoutTable.length}`);

    // Check which tables actually exist in PostgreSQL
    if (formsWithTable.length > 0) {
      console.log('\n🔍 Checking if tables exist in PostgreSQL...\n');

      for (const form of formsWithTable) {
        const [tables] = await sequelize.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_name = '${form.table_name}'
          ) as exists;
        `);

        const exists = tables[0].exists;
        const status = exists ? '✅ EXISTS' : '❌ NOT FOUND';
        console.log(`  ${status}: ${form.table_name} (Form: "${truncate(form.title, 30)}")`);
      }
    }

    // Check sub-forms
    const [subForms] = await sequelize.query(`
      SELECT
        sf.id,
        sf.title,
        sf.table_name,
        f.title as form_title,
        sf."createdAt" as created_at
      FROM sub_forms sf
      JOIN forms f ON sf.form_id = f.id
      ORDER BY sf."createdAt" DESC
    `);

    if (subForms.length > 0) {
      console.log('\n📋 Sub-Forms:');
      console.log(`  Total Sub-Forms: ${subForms.length}\n`);

      console.log('─'.repeat(120));
      console.log(formatRow(['#', 'Sub-Form Title', 'Table Name', 'Parent Form']));
      console.log('─'.repeat(120));

      subForms.forEach((subForm, index) => {
        console.log(formatRow([
          (index + 1).toString(),
          truncate(subForm.title, 30),
          truncate(subForm.table_name || 'NULL', 30),
          truncate(subForm.form_title, 25),
        ]));
      });

      console.log('─'.repeat(120));
    }

    // List all tables with 'form_' prefix
    const [dynamicTables] = await sequelize.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name LIKE 'form_%'
      ORDER BY table_name;
    `);

    if (dynamicTables.length > 0) {
      console.log(`\n📊 Dynamic Tables in PostgreSQL (${dynamicTables.length} tables):\n`);

      dynamicTables.forEach((table, index) => {
        // Check if table is linked to a form
        const linkedForm = forms.find(f => f.table_name === table.table_name);
        const linkedSubForm = subForms.find(sf => sf.table_name === table.table_name);

        let status = '⚠️  ORPHANED';
        let linkedTo = 'No form reference';

        if (linkedForm) {
          status = '✅ LINKED';
          linkedTo = `Form: "${truncate(linkedForm.title, 30)}"`;
        } else if (linkedSubForm) {
          status = '✅ LINKED';
          linkedTo = `Sub-Form: "${truncate(linkedSubForm.title, 25)}"`;
        }

        console.log(`  ${(index + 1).toString().padStart(3)}. ${table.table_name.padEnd(40)} ${status} ${linkedTo}`);
      });
    }

    // Check for translation readiness
    console.log('\n🔄 Translation Readiness:\n');

    const thaiFormsCount = forms.filter(f => containsThai(f.title)).length;
    const englishFormsCount = forms.filter(f => !containsThai(f.title)).length;

    console.log(`  Forms with Thai Names:     ${thaiFormsCount} (need retranslation)`);
    console.log(`  Forms with English Names:  ${englishFormsCount} (already OK)`);

    if (thaiFormsCount > 0) {
      console.log('\n  📝 Forms that need retranslation:\n');
      forms
        .filter(f => containsThai(f.title))
        .forEach((form, index) => {
          console.log(`     ${index + 1}. "${form.title}"`);
          console.log(`        Current table: ${form.table_name || 'NULL'}`);
        });
    }

    console.log('\n=================================================\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await sequelize.close();
  }
}

/**
 * Helper: Check if text contains Thai characters
 */
function containsThai(text) {
  if (!text || typeof text !== 'string') return false;
  return /[\u0E00-\u0E7F]/.test(text);
}

/**
 * Helper: Format table row
 */
function formatRow(columns) {
  const widths = [5, 40, 40, 25];
  return columns
    .map((col, i) => (col || '').toString().padEnd(widths[i]))
    .join(' | ');
}

/**
 * Helper: Truncate text
 */
function truncate(text, maxLength) {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * Helper: Format date
 */
function formatDate(date) {
  if (!date) return '';
  const d = new Date(date);
  return d.toISOString().split('T')[0];
}

// Run check
if (require.main === module) {
  checkExistingForms()
    .then(() => {
      console.log('✅ Check completed\n');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Check failed:', error);
      process.exit(1);
    });
}

module.exports = { checkExistingForms };
