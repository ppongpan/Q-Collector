/**
 * Add Missing Sub-form Columns
 * เพิ่ม columns ที่ขาดหายไปใน sub-form table
 */

const { Pool } = require('pg');
const { generateColumnName, getPostgreSQLType } = require('../utils/tableNameHelper');

const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: process.env.POSTGRES_PORT || 5432,
  database: process.env.POSTGRES_DB || 'qcollector_db',
  user: process.env.POSTGRES_USER || 'qcollector',
  password: process.env.POSTGRES_PASSWORD || 'qcollector_dev_2025'
});

async function addMissingColumns() {
  const client = await pool.connect();

  try {
    const tableName = 'tracked_items_for_sale_1d005727e18e';
    const subFormId = '42990b15-f2da-4a2c-bd52-1d005727e18e';

    console.log(`\n🔧 Adding missing columns to: ${tableName}\n`);

    // 1. Get existing columns
    const existingQuery = `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = $1;
    `;
    const existingResult = await client.query(existingQuery, [tableName]);
    const existingColumns = new Set(existingResult.rows.map(row => row.column_name));

    console.log(`📋 Existing columns (${existingColumns.size}):`);
    existingColumns.forEach(col => console.log(`   - ${col}`));

    // 2. Get sub-form fields
    const fieldsQuery = `
      SELECT id, title, type
      FROM fields
      WHERE sub_form_id = $1
      ORDER BY "order";
    `;
    const fieldsResult = await client.query(fieldsQuery, [subFormId]);

    console.log(`\n📝 Sub-form fields (${fieldsResult.rows.length}):`);

    let addedCount = 0;

    for (const field of fieldsResult.rows) {
      const columnName = await generateColumnName(field.title, field.id);
      const dataType = getPostgreSQLType(field.type);

      console.log(`\n   Field: ${field.title}`);
      console.log(`   Column: "${columnName}" (${dataType})`);

      if (existingColumns.has(columnName)) {
        console.log(`   ✅ Already exists`);
      } else {
        console.log(`   ➕ Adding column...`);

        const alterQuery = `ALTER TABLE "${tableName}" ADD COLUMN "${columnName}" ${dataType};`;
        await client.query(alterQuery);

        console.log(`   ✅ Added successfully`);
        addedCount++;
      }
    }

    console.log(`\n✅ Added ${addedCount} missing columns`);

    // 3. Verify final structure
    const finalStructure = await client.query(existingQuery, [tableName]);
    console.log(`\n📊 Final table structure (${finalStructure.rows.length} columns):`);
    finalStructure.rows.forEach(row => console.log(`   - ${row.column_name}`));

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    client.release();
    await pool.end();
  }
}

addMissingColumns()
  .then(() => {
    console.log('\n✅ Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error.message);
    process.exit(1);
  });
