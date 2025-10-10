const { sequelize } = require('../config/database.config');

async function verifySchema() {
  try {
    await sequelize.authenticate();
    console.log('Connected to database\n');

    // Check tables exist
    const [tables] = await sequelize.query(`
      SELECT table_name,
        (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
      FROM information_schema.tables t
      WHERE table_schema = 'public'
      AND table_name IN ('field_migrations', 'field_data_backups')
      ORDER BY table_name;
    `);

    console.log('=== Migration System Tables ===');
    tables.forEach(t => console.log(`  ${t.table_name}: ${t.column_count} columns`));

    // Check columns
    const [columns] = await sequelize.query(`
      SELECT table_name, column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name IN ('field_migrations', 'field_data_backups')
      ORDER BY table_name, ordinal_position;
    `);

    console.log('\n=== Columns ===');
    let currentTable = '';
    columns.forEach(c => {
      if (c.table_name !== currentTable) {
        console.log(`\n  ${c.table_name}:`);
        currentTable = c.table_name;
      }
      console.log(`    - ${c.column_name} (${c.data_type}, nullable: ${c.is_nullable})`);
    });

    // Check indexes
    const [indexes] = await sequelize.query(`
      SELECT tablename, indexname
      FROM pg_indexes
      WHERE schemaname = 'public'
      AND tablename IN ('field_migrations', 'field_data_backups')
      ORDER BY tablename, indexname;
    `);

    console.log('\n=== Indexes ===');
    currentTable = '';
    indexes.forEach(i => {
      if (i.tablename !== currentTable) {
        console.log(`\n  ${i.tablename}:`);
        currentTable = i.tablename;
      }
      console.log(`    - ${i.indexname}`);
    });

    // Check foreign keys
    const [fkeys] = await sequelize.query(`
      SELECT
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name,
        rc.delete_rule
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      JOIN information_schema.referential_constraints AS rc
        ON tc.constraint_name = rc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_name IN ('field_migrations', 'field_data_backups')
      ORDER BY tc.table_name, kcu.column_name;
    `);

    console.log('\n=== Foreign Keys ===');
    currentTable = '';
    fkeys.forEach(fk => {
      if (fk.table_name !== currentTable) {
        console.log(`\n  ${fk.table_name}:`);
        currentTable = fk.table_name;
      }
      console.log(`    - ${fk.column_name} → ${fk.foreign_table_name}.${fk.foreign_column_name} (ON DELETE ${fk.delete_rule})`);
    });

    await sequelize.close();
    console.log('\n✅ Database schema verified successfully!\n');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

verifySchema();
