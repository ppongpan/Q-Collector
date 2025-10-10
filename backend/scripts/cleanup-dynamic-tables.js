const { sequelize } = require('../models');

async function cleanupDynamicTables() {
  console.log('\n🧹 CLEANUP DYNAMIC TABLES\n');
  console.log('='.repeat(80));

  try {
    // Step 1: List all tables in public schema
    const result = await sequelize.query(`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
      AND tablename NOT IN (
        'users',
        'forms',
        'sub_forms',
        'fields',
        'submissions',
        'submission_data',
        'files',
        'telegram_notifications',
        'audit_logs',
        'translation_cache',
        'api_usage',
        'SequelizeMeta'
      )
      ORDER BY tablename;
    `, { type: sequelize.QueryTypes.SELECT });

    console.log(`\n📋 Found ${result.length} dynamic tables:\n`);

    if (result.length === 0) {
      console.log('  ✅ No dynamic tables found (all clean)\n');
      process.exit(0);
    }

    result.forEach((row, idx) => {
      console.log(`  ${idx + 1}. ${row.tablename}`);
    });

    console.log('\n' + '='.repeat(80));
    console.log('⚠️  WARNING: This will DROP ALL dynamic form tables!');
    console.log('='.repeat(80));

    console.log('\n🔍 Checking table contents...\n');

    // Step 2: Check each table for data
    for (const row of result) {
      const tableName = row.tablename;
      const countResult = await sequelize.query(
        `SELECT COUNT(*) as count FROM public."${tableName}"`,
        { type: sequelize.QueryTypes.SELECT }
      );

      const count = parseInt(countResult[0].count);
      console.log(`  ${tableName}: ${count} rows`);
    }

    console.log('\n' + '='.repeat(80));
    console.log('🗑️  To delete these tables, run:');
    console.log('    node scripts/cleanup-dynamic-tables.js --confirm');
    console.log('='.repeat(80) + '\n');

    // Step 3: Actually delete if --confirm flag is provided
    if (process.argv.includes('--confirm')) {
      console.log('\n⚠️  DELETING TABLES...\n');

      for (const row of result) {
        const tableName = row.tablename;
        try {
          await sequelize.query(`DROP TABLE IF EXISTS public."${tableName}" CASCADE`);
          console.log(`  ✅ Dropped table: ${tableName}`);
        } catch (error) {
          console.error(`  ❌ Failed to drop ${tableName}:`, error.message);
        }
      }

      console.log('\n✅ Cleanup complete!\n');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

cleanupDynamicTables();
