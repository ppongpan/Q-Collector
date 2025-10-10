const { Sequelize } = require('sequelize');
const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

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

async function activateOldForms() {
  try {
    console.log('\n📋 Checking inactive forms...');
    console.log('═'.repeat(80));

    // Find all inactive forms
    const [inactiveForms] = await sequelize.query(
      'SELECT id, title, is_active, "createdAt" FROM forms WHERE is_active = false ORDER BY "createdAt" DESC'
    );

    if (inactiveForms.length === 0) {
      console.log('✅ No inactive forms found. All forms are already active.');
      return;
    }

    console.log(`Found ${inactiveForms.length} inactive form(s):\n`);
    inactiveForms.forEach((form, index) => {
      console.log(`${index + 1}. ${form.title}`);
      console.log(`   ID: ${form.id}`);
      console.log(`   Created: ${form.createdAt}`);
      console.log('─'.repeat(80));
    });

    // Activate all inactive forms
    console.log('\n🔄 Activating all inactive forms...');
    const [result] = await sequelize.query(
      'UPDATE forms SET is_active = true WHERE is_active = false'
    );

    console.log(`\n✅ Successfully activated ${inactiveForms.length} form(s)!`);
    console.log('═'.repeat(80));

    // Verify the specific form
    const [specificForm] = await sequelize.query(
      "SELECT id, title, is_active FROM forms WHERE id = '360a9a87-37de-4741-bb69-c74a761680e6'"
    );

    if (specificForm.length > 0) {
      console.log('\n🎯 Verified specific form:');
      console.log(`   Title: ${specificForm[0].title}`);
      console.log(`   ID: ${specificForm[0].id}`);
      console.log(`   Active: ${specificForm[0].is_active} ✅`);
    }

  } catch (error) {
    console.error('❌ Error activating forms:', error.message);
    throw error;
  } finally {
    await sequelize.close();
  }
}

activateOldForms().catch(console.error);
