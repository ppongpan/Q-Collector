/**
 * Check All Dynamic Tables
 */

require('dotenv').config();
const { Sequelize } = require('sequelize');

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

function isTransliterated(tableName) {
  if (!tableName) return false;
  const patterns = [
    /raykarn?/i,     // รายการ
    /tidtam/i,       // ติดตาม
    /khamrong/i,     // คำร้อง
    /bamrung/i,      // บำรุง
    /kh[aeiou]/i,    // ข, ค
    /ph[aeiou]/i,    // พ, ผ, ภ
    /th[aeiou]/i,    // ท, ธ, ถ
    /[aeiou]{3,}/i,  // Multiple vowels (Thai transliteration)
  ];
  return patterns.some(pattern => pattern.test(tableName));
}

async function checkAllTables() {
  console.log('\n=================================================');
  console.log('📊 All Dynamic Tables Analysis');
  console.log('=================================================\n');

  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established\n');

    // Get all tables with 'form_' prefix
    const [tables] = await sequelize.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name LIKE 'form_%'
      ORDER BY table_name
    `);

    if (tables.length === 0) {
      console.log('ℹ️  No dynamic tables found.\n');
      return;
    }

    console.log(`Found ${tables.length} dynamic tables\n`);

    // Get all forms and sub-forms
    const [forms] = await sequelize.query(`
      SELECT id, title, table_name FROM forms
    `);

    const [subForms] = await sequelize.query(`
      SELECT id, title, table_name FROM sub_forms
    `);

    // Categorize tables
    const transliteratedTables = [];
    const englishTables = [];
    const orphanedTables = [];

    tables.forEach(t => {
      const tableName = t.table_name;
      const linkedForm = forms.find(f => f.table_name === tableName);
      const linkedSubForm = subForms.find(sf => sf.table_name === tableName);

      const tableInfo = {
        name: tableName,
        linkedForm: linkedForm?.title,
        linkedSubForm: linkedSubForm?.title,
        isTransliterated: isTransliterated(tableName)
      };

      if (isTransliterated(tableName)) {
        transliteratedTables.push(tableInfo);
      } else {
        englishTables.push(tableInfo);
      }

      if (!linkedForm && !linkedSubForm) {
        orphanedTables.push(tableInfo);
      }
    });

    // Display results
    console.log('✅ ENGLISH TABLE NAMES:\n');
    englishTables.forEach((t, i) => {
      const link = t.linkedForm ? `Form: "${t.linkedForm}"` :
                   t.linkedSubForm ? `Sub-Form: "${t.linkedSubForm}"` :
                   '⚠️  Orphaned';
      console.log(`  ${i + 1}. ${t.name}`);
      console.log(`     ${link}\n`);
    });

    if (transliteratedTables.length > 0) {
      console.log('⚠️  TRANSLITERATED TABLE NAMES (NEED RETRANSLATION):\n');
      transliteratedTables.forEach((t, i) => {
        const link = t.linkedForm ? `Form: "${t.linkedForm}"` :
                     t.linkedSubForm ? `Sub-Form: "${t.linkedSubForm}"` :
                     '⚠️  Orphaned';
        console.log(`  ${i + 1}. ${t.name}`);
        console.log(`     ${link}`);
        console.log(`     ⚠️  Should be proper English translation\n`);
      });
    }

    if (orphanedTables.length > 0) {
      console.log('⚠️  ORPHANED TABLES (No Form/Sub-Form Link):\n');
      orphanedTables.forEach((t, i) => {
        console.log(`  ${i + 1}. ${t.name}\n`);
      });
    }

    console.log('📈 Summary:');
    console.log(`  Total Tables:              ${tables.length}`);
    console.log(`  English Names:             ${englishTables.length}`);
    console.log(`  Transliterated Names:      ${transliteratedTables.length}`);
    console.log(`  Orphaned Tables:           ${orphanedTables.length}`);

    console.log('\n=================================================\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    throw error;
  } finally {
    await sequelize.close();
  }
}

if (require.main === module) {
  checkAllTables()
    .then(() => {
      console.log('✅ Check completed\n');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Check failed:', error);
      process.exit(1);
    });
}

module.exports = { checkAllTables };
