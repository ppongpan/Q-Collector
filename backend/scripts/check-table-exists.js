/**
 * Check if pdpa_demo_1761351036248 table exists
 */
const { sequelize } = require('../config/database.config');

(async () => {
  await sequelize.authenticate();

  const tableName = 'pdpa_demo_1761351036248';

  // Check if table exists
  const [tables] = await sequelize.query(`
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename = '${tableName}'
  `);

  if (tables.length > 0) {
    console.log(`✅ Table "${tableName}" EXISTS\n`);

    // Get table structure
    const [columns] = await sequelize.query(`
      SELECT
        column_name,
        data_type,
        is_nullable
      FROM information_schema.columns
      WHERE table_name = '${tableName}'
      ORDER BY ordinal_position
    `);

    console.log('📊 TABLE STRUCTURE:');
    console.log('==================');
    columns.forEach(col => {
      console.log(`  ${col.column_name.padEnd(30)} ${col.data_type.padEnd(20)} ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });
    console.log('');

    // Get row count
    const [countResult] = await sequelize.query(`
      SELECT COUNT(*) as total FROM ${tableName}
    `);
    console.log(`📈 Total rows: ${countResult[0].total}\n`);

    // Get sample data
    if (countResult[0].total > 0) {
      const [sampleData] = await sequelize.query(`
        SELECT * FROM ${tableName} ORDER BY submission_id DESC LIMIT 3
      `);
      console.log('📝 Sample data (latest 3 rows):');
      sampleData.forEach((row, i) => {
        console.log(`\n${i + 1}. Submission ID: ${row.submission_id}`);
        console.log(`   Submitted At: ${row.submitted_at}`);
        // Show a few other fields
        const keys = Object.keys(row).filter(k => !['submission_id', 'submitted_at', 'created_at', 'updated_at'].includes(k));
        keys.slice(0, 5).forEach(k => {
          console.log(`   ${k}: ${row[k]}`);
        });
      });
    }
  } else {
    console.log(`❌ Table "${tableName}" DOES NOT EXIST\n`);

    // Check for similar tables
    const [similarTables] = await sequelize.query(`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
        AND tablename LIKE 'pdpa_demo%'
      ORDER BY tablename
    `);

    if (similarTables.length > 0) {
      console.log('📋 Similar tables found:');
      similarTables.forEach(t => console.log(`  - ${t.tablename}`));
      console.log('');
    } else {
      console.log('⚠️  No similar tables found\n');
    }
  }

  await sequelize.close();
  process.exit(0);
})().catch(console.error);
