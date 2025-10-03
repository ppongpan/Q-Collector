/**
 * Check Forms Table Structure
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

async function checkTableStructure() {
  try {
    await sequelize.authenticate();

    const [columns] = await sequelize.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'forms'
      ORDER BY ordinal_position;
    `);

    console.log('\n=== FORMS TABLE STRUCTURE ===\n');
    columns.forEach(col => {
      console.log(`${col.column_name.padEnd(20)} ${col.data_type.padEnd(30)} ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });
    console.log();

  } catch (error) {
    console.error('Error:', error.message);
    throw error;
  } finally {
    await sequelize.close();
  }
}

if (require.main === module) {
  checkTableStructure()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { checkTableStructure };
