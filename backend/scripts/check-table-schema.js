/**
 * Check Table Schema
 * Query column names and types for a specific table
 *
 * Run: node backend/scripts/check-table-schema.js <table_name>
 *
 * @version v0.8.5-dev
 * @date 2025-10-25
 */

const { sequelize } = require('../config/database.config');

async function checkTableSchema() {
  const tableName = process.argv[2] || 'test_12775fdda039';

  console.log(`\n🔍 Checking schema for table: ${tableName}\n`);

  try {
    await sequelize.authenticate();
    console.log('✅ Database connected\n');

    const query = `
      SELECT
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = $1
      ORDER BY ordinal_position;
    `;

    const columns = await sequelize.query(query, {
      bind: [tableName],
      type: sequelize.QueryTypes.SELECT
    });

    if (columns.length === 0) {
      console.log(`❌ Table "${tableName}" not found or has no columns\n`);
    } else {
      console.log('📋 Table Columns:\n');
      console.log('Column Name'.padEnd(30), 'Data Type'.padEnd(20), 'Nullable'.padEnd(10), 'Default');
      console.log('='.repeat(80));

      columns.forEach(col => {
        console.log(
          col.column_name.padEnd(30),
          col.data_type.padEnd(20),
          col.is_nullable.padEnd(10),
          col.column_default || 'NULL'
        );
      });

      console.log('\n✅ Found', columns.length, 'columns\n');
    }

    await sequelize.close();
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error.message);
    await sequelize.close();
    process.exit(1);
  }
}

checkTableSchema();
