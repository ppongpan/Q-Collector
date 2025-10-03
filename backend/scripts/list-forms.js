/**
 * List All Forms in Database
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

async function listForms() {
  try {
    await sequelize.authenticate();

    const [forms] = await sequelize.query(`
      SELECT id, title, description, table_name, "createdAt"
      FROM forms
      ORDER BY "createdAt" DESC
    `);

    console.log('\n=== FORMS IN DATABASE ===\n');

    if (forms.length === 0) {
      console.log('No forms found.\n');
      return;
    }

    forms.forEach((form, index) => {
      console.log(`${index + 1}. "${form.title}"`);
      console.log(`   ID: ${form.id}`);
      console.log(`   Table: ${form.table_name || 'NULL'}`);
      console.log(`   Created: ${form.createdAt}\n`);
    });

    console.log(`Total forms: ${forms.length}\n`);

  } catch (error) {
    console.error('Error:', error.message);
    throw error;
  } finally {
    await sequelize.close();
  }
}

if (require.main === module) {
  listForms()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { listForms };
