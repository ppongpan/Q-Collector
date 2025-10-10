/**
 * Reorder main_form_subid Column to 3rd Position
 *
 * In PostgreSQL, we can't directly reorder columns.
 * We need to:
 * 1. Create new table with correct column order
 * 2. Copy data from old table
 * 3. Drop old table
 * 4. Rename new table
 */

const { Pool } = require('pg');

async function reorderMainFormSubIdColumn() {
  const pool = new Pool({
    host: process.env.POSTGRES_HOST || 'localhost',
    port: process.env.POSTGRES_PORT || 5432,
    database: process.env.POSTGRES_DB || 'qcollector_db',
    user: process.env.POSTGRES_USER || 'qcollector',
    password: process.env.POSTGRES_PASSWORD || 'qcollector_dev_2025'
  });

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    console.log('🔧 Reordering main_form_subid Column to 3rd Position\n');
    console.log('=' .repeat(80) + '\n');

    // Get all sub-form tables (tables with parent_id column)
    const getTablesQuery = `
      SELECT DISTINCT table_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name LIKE '%form%'
      AND table_name NOT IN ('forms', 'sub_forms', 'field_migrations', 'field_data_backups')
      AND column_name = 'parent_id'
      ORDER BY table_name;
    `;

    const tables = await client.query(getTablesQuery);

    console.log(`📊 Found ${tables.rows.length} sub-form tables\n`);

    for (const table of tables.rows) {
      const tableName = table.table_name;
      const tempTableName = `${tableName}_temp`;

      console.log(`📋 Processing ${tableName}...\n`);

      // Step 1: Get current table structure
      const getColumnsQuery = `
        SELECT
          column_name,
          data_type,
          character_maximum_length,
          is_nullable,
          column_default
        FROM information_schema.columns
        WHERE table_name = $1
        AND table_schema = 'public'
        ORDER BY ordinal_position;
      `;

      const columns = await client.query(getColumnsQuery, [tableName]);

      // Check if main_form_subid exists
      const hasMainFormSubId = columns.rows.some(col => col.column_name === 'main_form_subid');

      if (!hasMainFormSubId) {
        console.log(`⏭️  Skipping ${tableName} (no main_form_subid column)\n`);
        continue;
      }

      console.log(`   Current columns: ${columns.rows.map(c => c.column_name).join(', ')}\n`);

      // Step 2: Get all constraints
      const getConstraintsQuery = `
        SELECT
          con.conname AS constraint_name,
          con.contype AS constraint_type,
          pg_get_constraintdef(con.oid) AS definition
        FROM pg_constraint con
        JOIN pg_class rel ON rel.oid = con.conrelid
        WHERE rel.relname = $1
        AND rel.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
      `;

      const constraints = await client.query(getConstraintsQuery, [tableName]);

      // Step 3: Get all indexes
      const getIndexesQuery = `
        SELECT
          indexname,
          indexdef
        FROM pg_indexes
        WHERE tablename = $1
        AND schemaname = 'public';
      `;

      const indexes = await client.query(getIndexesQuery, [tableName]);

      // Step 4: Build CREATE TABLE statement with correct column order
      let createTableSQL = `CREATE TABLE "${tempTableName}" (\n`;

      // Define desired column order
      const orderedColumns = ['id', 'parent_id', 'main_form_subid', 'parent_id2', 'username', 'order', 'submitted_at'];
      const remainingColumns = columns.rows
        .map(c => c.column_name)
        .filter(name => !orderedColumns.includes(name));

      const finalColumnOrder = [...orderedColumns.filter(name =>
        columns.rows.some(c => c.column_name === name)
      ), ...remainingColumns];

      const columnDefs = finalColumnOrder.map(colName => {
        const col = columns.rows.find(c => c.column_name === colName);
        let def = `  "${col.column_name}" `;

        // Data type
        if (col.character_maximum_length) {
          def += `${col.data_type.toUpperCase()}(${col.character_maximum_length})`;
        } else {
          def += col.data_type.toUpperCase();
        }

        // Nullable
        if (col.is_nullable === 'NO') {
          def += ' NOT NULL';
        }

        // Default
        if (col.column_default) {
          def += ` DEFAULT ${col.column_default}`;
        }

        return def;
      });

      createTableSQL += columnDefs.join(',\n');

      // Add constraints
      const pkConstraint = constraints.rows.find(c => c.constraint_type === 'p');
      if (pkConstraint) {
        createTableSQL += `,\n  CONSTRAINT ${pkConstraint.constraint_name}_temp ${pkConstraint.definition}`;
      }

      const fkConstraints = constraints.rows.filter(c => c.constraint_type === 'f');
      for (const fk of fkConstraints) {
        createTableSQL += `,\n  CONSTRAINT ${fk.constraint_name}_temp ${fk.definition}`;
      }

      createTableSQL += '\n);';

      // Step 5: Create temp table
      console.log(`   Creating temporary table ${tempTableName}...\n`);
      await client.query(createTableSQL);

      // Step 6: Copy data
      const columnList = finalColumnOrder.map(c => `"${c}"`).join(', ');
      const copyDataSQL = `INSERT INTO "${tempTableName}" (${columnList}) SELECT ${columnList} FROM "${tableName}";`;

      console.log(`   Copying data...\n`);
      const copyResult = await client.query(copyDataSQL);
      console.log(`   ✅ Copied ${copyResult.rowCount} rows\n`);

      // Step 7: Drop old table
      console.log(`   Dropping old table ${tableName}...\n`);
      await client.query(`DROP TABLE "${tableName}" CASCADE;`);

      // Step 8: Rename temp table
      console.log(`   Renaming ${tempTableName} to ${tableName}...\n`);
      await client.query(`ALTER TABLE "${tempTableName}" RENAME TO "${tableName}";`);

      // Rename constraints
      if (pkConstraint) {
        await client.query(`ALTER TABLE "${tableName}" RENAME CONSTRAINT ${pkConstraint.constraint_name}_temp TO ${pkConstraint.constraint_name};`);
      }

      for (const fk of fkConstraints) {
        await client.query(`ALTER TABLE "${tableName}" RENAME CONSTRAINT ${fk.constraint_name}_temp TO ${fk.constraint_name};`);
      }

      // Step 9: Recreate indexes (skip primary key index as it's auto-created)
      console.log(`   Recreating ${indexes.rows.length} indexes...\n`);
      for (const index of indexes.rows) {
        // Skip primary key index (already created by PRIMARY KEY constraint)
        if (index.indexname.endsWith('_pkey')) {
          console.log(`   ⏭️  Skipping primary key index ${index.indexname} (auto-created)\n`);
          continue;
        }

        const newIndexDef = index.indexdef.replace(tempTableName, tableName);
        try {
          await client.query(newIndexDef);
          console.log(`   ✅ Created index ${index.indexname}\n`);
        } catch (error) {
          console.log(`   ⚠️  Index ${index.indexname} error: ${error.message}\n`);
        }
      }

      // Verify new column order
      const verifyQuery = await client.query(getColumnsQuery, [tableName]);
      console.log(`   ✅ New column order: ${verifyQuery.rows.map(c => c.column_name).join(', ')}\n`);
      console.log('   ' + '-'.repeat(76) + '\n');
    }

    console.log('=' .repeat(80));
    console.log('\n🎉 COLUMN REORDERING COMPLETE!\n');
    console.log('Summary:');
    console.log(`   - Processed ${tables.rows.length} sub-form tables`);
    console.log('   - main_form_subid is now the 3rd column (after id and parent_id)\n');

    console.log('💾 Committing changes...\n');
    await client.query('COMMIT');
    console.log('✅ Changes committed successfully!\n');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    client.release();
    await pool.end();
    process.exit(0);
  }
}

reorderMainFormSubIdColumn();
