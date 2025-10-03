/**
 * Check Sub-Forms and Their Table Names
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

function containsThai(text) {
  if (!text || typeof text !== 'string') return false;
  return /[\u0E00-\u0E7F]/.test(text);
}

async function checkSubForms() {
  console.log('\n=================================================');
  console.log('📊 Sub-Forms Analysis');
  console.log('=================================================\n');

  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established\n');

    // Get all sub-forms with their parent forms
    const [subForms] = await sequelize.query(`
      SELECT
        sf.id,
        sf.title as subform_title,
        sf.table_name as subform_table,
        f.title as form_title,
        f.table_name as form_table,
        sf."createdAt"
      FROM sub_forms sf
      JOIN forms f ON sf.form_id = f.id
      ORDER BY sf."createdAt" DESC
    `);

    if (subForms.length === 0) {
      console.log('ℹ️  No sub-forms found.\n');
      return;
    }

    console.log(`Found ${subForms.length} sub-forms\n`);
    console.log('─'.repeat(120));
    console.log('| # | Sub-Form Title                    | Table Name                            | Parent Form                   |');
    console.log('─'.repeat(120));

    subForms.forEach((sf, index) => {
      const num = (index + 1).toString().padStart(2);
      const title = (sf.subform_title || '').padEnd(35).substring(0, 35);
      const table = (sf.subform_table || 'NULL').padEnd(40).substring(0, 40);
      const parent = (sf.form_title || '').padEnd(30).substring(0, 30);
      console.log(`| ${num} | ${title} | ${table} | ${parent} |`);
    });

    console.log('─'.repeat(120));

    // Check for Thai names
    const thaiSubForms = subForms.filter(sf => containsThai(sf.subform_title));

    console.log('\n📈 Statistics:');
    console.log(`  Total Sub-Forms:           ${subForms.length}`);
    console.log(`  With Thai Names:           ${thaiSubForms.length}`);
    console.log(`  With English Names:        ${subForms.length - thaiSubForms.length}`);
    console.log(`  With Table Name:           ${subForms.filter(sf => sf.subform_table).length}`);
    console.log(`  Without Table Name:        ${subForms.filter(sf => !sf.subform_table).length}`);

    if (thaiSubForms.length > 0) {
      console.log('\n⚠️  Sub-Forms with Thai Names (Need Translation):\n');
      thaiSubForms.forEach((sf, index) => {
        console.log(`  ${index + 1}. "${sf.subform_title}"`);
        console.log(`     ID: ${sf.id}`);
        console.log(`     Current Table: ${sf.subform_table || 'NULL'}`);
        console.log(`     Parent Form: "${sf.form_title}"`);
        console.log(`     Parent Table: ${sf.form_table || 'NULL'}\n`);
      });
    }

    // Check for transliterated table names (contain Thai phonetic patterns)
    const transliteratedTables = subForms.filter(sf => {
      if (!sf.subform_table) return false;
      // Check for common Thai transliteration patterns
      const patterns = [
        /raykarn?/i,  // รายการ
        /tidtam/i,    // ติดตาม
        /kh[aeiou]/i, // ข
        /ph[aeiou]/i, // พ, ผ, ภ
        /th[aeiou]/i, // ท, ธ, ถ
      ];
      return patterns.some(pattern => pattern.test(sf.subform_table));
    });

    if (transliteratedTables.length > 0) {
      console.log('⚠️  Sub-Forms with Transliterated Table Names (Should be English):\n');
      transliteratedTables.forEach((sf, index) => {
        console.log(`  ${index + 1}. "${sf.subform_title}"`);
        console.log(`     Table: ${sf.subform_table}`);
        console.log(`     Should be: English translation (e.g., "follow_up_list")\n`);
      });
    }

    // Check for sub-forms without tables
    const noTableSubForms = subForms.filter(sf => !sf.subform_table);
    if (noTableSubForms.length > 0) {
      console.log('⚠️  Sub-Forms Without Dynamic Tables:\n');
      noTableSubForms.forEach((sf, index) => {
        console.log(`  ${index + 1}. "${sf.subform_title}"`);
        console.log(`     Parent Form: "${sf.form_title}"\n`);
      });
    }

    console.log('=================================================\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    throw error;
  } finally {
    await sequelize.close();
  }
}

if (require.main === module) {
  checkSubForms()
    .then(() => {
      console.log('✅ Check completed\n');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Check failed:', error);
      process.exit(1);
    });
}

module.exports = { checkSubForms };
