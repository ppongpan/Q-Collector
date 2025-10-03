const { Sequelize } = require('sequelize');
const path = require('path');

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

async function checkLastForm() {
  const [forms] = await sequelize.query('SELECT id, title, is_active, "createdAt" FROM forms ORDER BY "createdAt" DESC LIMIT 3');
  console.log('\nLast 3 forms created:');
  console.log('═'.repeat(80));
  forms.forEach((form, index) => {
    console.log(`${index + 1}. ${form.title}`);
    console.log(`   ID: ${form.id}`);
    console.log(`   Active: ${form.is_active}`);
    console.log(`   Created: ${form.createdAt}`);
    console.log('─'.repeat(80));
  });
  await sequelize.close();
}

checkLastForm().catch(console.error);
