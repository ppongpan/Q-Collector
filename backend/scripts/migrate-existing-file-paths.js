/**
 * Migrate existing file paths to full_path column
 * Part of Progressive Image Loading System v0.7.30
 */

const { Sequelize } = require('sequelize');
require('dotenv').config({ path: '../.env' });

const sequelize = new Sequelize(
  process.env.POSTGRES_DB || 'qcollector_db',
  process.env.POSTGRES_USER || 'qcollector',
  process.env.POSTGRES_PASSWORD || 'qcollector_dev_2025',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.POSTGRES_PORT || 5432,
    dialect: 'postgres',
    logging: false
  }
);

async function migrateFilePaths() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection successful\n');

    console.log('📦 [Migration] Migrating existing file paths to full_path column...');

    const [result] = await sequelize.query(`
      UPDATE files
      SET full_path = minio_path
      WHERE minio_path IS NOT NULL
      AND full_path IS NULL
    `);

    console.log(`✅ Updated ${result.rowCount || 0} rows`);
    console.log('🎉 Migration complete!\n');

    await sequelize.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

migrateFilePaths();
