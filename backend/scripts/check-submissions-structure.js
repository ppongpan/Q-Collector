/**
 * Check Submissions Table Structure
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

async function checkStructure() {
  try {
    await sequelize.authenticate();

    const [columns] = await sequelize.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'submissions'
      ORDER BY ordinal_position;
    `);

    console.log('\n=== SUBMISSIONS TABLE STRUCTURE ===\n');
    columns.forEach(col => {
      console.log(`${col.column_name.padEnd(20)} ${col.data_type.padEnd(30)} ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });
    console.log();

    const [count] = await sequelize.query(`SELECT COUNT(*) as count FROM submissions`);
    console.log(`Total submissions: ${count[0].count}\n`);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await sequelize.close();
  }
}

checkStructure();
