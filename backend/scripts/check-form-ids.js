/**
 * Check Form IDs Script
 * Validates all form IDs in database are proper UUIDs
 */

const { Sequelize } = require('sequelize');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

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

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUUID(str) {
  return UUID_REGEX.test(str);
}

async function checkFormIDs() {
  try {
    console.log('🔍 Checking Form IDs in Database...\n');

    // Connect to database
    await sequelize.authenticate();
    console.log('✅ Database connection established\n');

    // Get all forms
    const [forms] = await sequelize.query('SELECT id, title, table_name, "createdAt" FROM forms ORDER BY "createdAt" DESC');

    console.log(`📊 Total Forms: ${forms.length}\n`);
    console.log('═'.repeat(80));

    let validCount = 0;
    let invalidCount = 0;
    const invalidForms = [];

    forms.forEach((form, index) => {
      const isValid = isValidUUID(form.id);

      if (isValid) {
        validCount++;
        console.log(`✅ Form ${index + 1}: ${form.title}`);
        console.log(`   ID: ${form.id}`);
        console.log(`   Table: ${form.table_name || 'N/A'}`);
        console.log(`   Created: ${form.createdAt}`);
      } else {
        invalidCount++;
        invalidForms.push(form);
        console.log(`❌ Form ${index + 1}: ${form.title}`);
        console.log(`   INVALID ID: ${form.id}`);
        console.log(`   Table: ${form.table_name || 'N/A'}`);
        console.log(`   Created: ${form.createdAt}`);
      }
      console.log('─'.repeat(80));
    });

    // Summary
    console.log('\n📋 SUMMARY:');
    console.log('═'.repeat(80));
    console.log(`✅ Valid UUIDs:   ${validCount} (${((validCount/forms.length)*100).toFixed(1)}%)`);
    console.log(`❌ Invalid IDs:   ${invalidCount} (${((invalidCount/forms.length)*100).toFixed(1)}%)`);
    console.log(`📊 Total Forms:   ${forms.length}`);
    console.log('═'.repeat(80));

    if (invalidForms.length > 0) {
      console.log('\n⚠️  INVALID FORMS FOUND:');
      console.log('These forms have non-UUID IDs and may cause submission errors.\n');

      invalidForms.forEach((form, index) => {
        console.log(`${index + 1}. "${form.title}"`);
        console.log(`   ID: ${form.id}`);
        console.log(`   Table: ${form.table_name || 'N/A'}`);
      });

      console.log('\n💡 RECOMMENDATION:');
      console.log('   These forms were likely created in LocalStorage before API migration.');
      console.log('   Consider running migration script to convert them to database forms.');
      console.log('   Or delete and recreate them through the API.\n');
    } else {
      console.log('\n✅ All forms have valid UUID IDs!');
      console.log('   Form submissions should work correctly.\n');
    }

    await sequelize.close();

  } catch (error) {
    console.error('❌ Error checking form IDs:', error);
    process.exit(1);
  }
}

// Run the check
checkFormIDs();
