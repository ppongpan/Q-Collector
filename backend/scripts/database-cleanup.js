/**
 * Database Cleanup and Synchronization
 * Identifies and removes orphaned/duplicate data
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

async function cleanupDatabase() {
  console.log('\n=================================================');
  console.log('🧹 DATABASE CLEANUP & SYNCHRONIZATION');
  console.log('=================================================\n');

  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established\n');

    // 1. Find duplicate forms (same title and table_name)
    const [duplicateForms] = await sequelize.query(`
      SELECT
        title,
        table_name,
        COUNT(*) as count,
        array_agg(id ORDER BY "createdAt" ASC) as form_ids,
        array_agg("createdAt" ORDER BY "createdAt" ASC) as created_dates
      FROM forms
      WHERE table_name IS NOT NULL
      GROUP BY title, table_name
      HAVING COUNT(*) > 1
    `);

    console.log('🔍 DUPLICATE FORMS FOUND:\n');
    if (duplicateForms.length === 0) {
      console.log('  No duplicates found.\n');
    } else {
      duplicateForms.forEach((dup, i) => {
        console.log(`${i + 1}. "${dup.title}" (table: ${dup.table_name})`);
        console.log(`   Count: ${dup.count} duplicates`);
        console.log(`   IDs: ${dup.form_ids.join(', ')}`);
        console.log(`   Oldest: ${dup.created_dates[0]}`);
        console.log(`   Newest: ${dup.created_dates[dup.count - 1]}\n`);
      });

      // Ask for cleanup
      console.log('⚠️  Action: Will keep OLDEST form and delete duplicates\n');

      for (const dup of duplicateForms) {
        const [keepId, ...deleteIds] = dup.form_ids;

        console.log(`  Keeping: ${keepId} (oldest)`);
        console.log(`  Deleting: ${deleteIds.join(', ')}`);

        // Delete duplicate forms
        for (const deleteId of deleteIds) {
          // First, delete related fields
          await sequelize.query(`DELETE FROM fields WHERE form_id = '${deleteId}'`);
          // Then delete the form
          await sequelize.query(`DELETE FROM forms WHERE id = '${deleteId}'`);
          console.log(`    ✅ Deleted form: ${deleteId}`);
        }
        console.log();
      }
    }

    // 2. Find orphaned fields (no form or sub-form)
    const [orphanedFields] = await sequelize.query(`
      SELECT f.id, f.title, f.type, f."createdAt"
      FROM fields f
      WHERE NOT EXISTS (SELECT 1 FROM forms WHERE id = f.form_id)
        AND NOT EXISTS (SELECT 1 FROM sub_forms WHERE id = f.sub_form_id)
    `);

    console.log('🗑️  ORPHANED FIELDS:\n');
    if (orphanedFields.length === 0) {
      console.log('  No orphaned fields found.\n');
    } else {
      console.log(`  Found ${orphanedFields.length} orphaned fields:\n`);
      orphanedFields.forEach((f, i) => {
        console.log(`  ${i + 1}. "${f.title}" (${f.type}) - ${f.id}`);
      });

      // Delete orphaned fields
      await sequelize.query(`
        DELETE FROM fields
        WHERE NOT EXISTS (SELECT 1 FROM forms WHERE id = form_id)
          AND NOT EXISTS (SELECT 1 FROM sub_forms WHERE id = sub_form_id)
      `);
      console.log(`\n  ✅ Deleted ${orphanedFields.length} orphaned fields\n`);
    }

    // 3. Find orphaned dynamic tables
    const [dynamicTables] = await sequelize.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name LIKE 'form_%'
      AND table_name != 'forms'
      ORDER BY table_name
    `);

    const [allForms] = await sequelize.query(`SELECT id, title, table_name FROM forms`);
    const [allSubForms] = await sequelize.query(`SELECT id, title, table_name FROM sub_forms`);

    const orphanedTables = [];
    for (const table of dynamicTables) {
      const linkedForm = allForms.find(f => f.table_name === table.table_name);
      const linkedSubForm = allSubForms.find(sf => sf.table_name === table.table_name);

      if (!linkedForm && !linkedSubForm) {
        orphanedTables.push(table.table_name);
      }
    }

    console.log('🗑️  ORPHANED DYNAMIC TABLES:\n');
    if (orphanedTables.length === 0) {
      console.log('  No orphaned tables found.\n');
    } else {
      console.log(`  Found ${orphanedTables.length} orphaned tables:\n`);
      orphanedTables.forEach((t, i) => {
        console.log(`  ${i + 1}. ${t}`);
      });

      // Drop orphaned tables
      for (const tableName of orphanedTables) {
        await sequelize.query(`DROP TABLE IF EXISTS "${tableName}" CASCADE`);
        console.log(`  ✅ Dropped table: ${tableName}`);
      }
      console.log();
    }

    // 4. Check forms without dynamic tables
    const formsWithoutTables = allForms.filter(f => !f.table_name);

    console.log('⚠️  FORMS WITHOUT DYNAMIC TABLES:\n');
    if (formsWithoutTables.length === 0) {
      console.log('  All forms have dynamic tables.\n');
    } else {
      console.log(`  Found ${formsWithoutTables.length} forms without tables:\n`);
      formsWithoutTables.forEach((f, i) => {
        console.log(`  ${i + 1}. "${f.title}" (ID: ${f.id})`);
      });
      console.log('\n  ℹ️  These forms need table creation via SchemaGenerator\n');
    }

    // 5. Final summary
    const [finalForms] = await sequelize.query(`SELECT COUNT(*) as count FROM forms`);
    const [finalFields] = await sequelize.query(`SELECT COUNT(*) as count FROM fields`);
    const [finalTables] = await sequelize.query(`
      SELECT COUNT(*) as count
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name LIKE 'form_%'
      AND table_name != 'forms'
    `);

    console.log('=================================================');
    console.log('📊 CLEANUP SUMMARY:\n');
    console.log(`✅ Deleted duplicate forms: ${duplicateForms.length > 0 ? duplicateForms.reduce((sum, d) => sum + (d.count - 1), 0) : 0}`);
    console.log(`✅ Deleted orphaned fields: ${orphanedFields.length}`);
    console.log(`✅ Dropped orphaned tables: ${orphanedTables.length}`);
    console.log('\n📈 FINAL DATABASE STATE:\n');
    console.log(`  Total Forms: ${finalForms[0].count}`);
    console.log(`  Total Fields: ${finalFields[0].count}`);
    console.log(`  Total Dynamic Tables: ${finalTables[0].count}`);
    console.log('\n=================================================\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    throw error;
  } finally {
    await sequelize.close();
  }
}

if (require.main === module) {
  cleanupDatabase()
    .then(() => {
      console.log('✅ Cleanup completed\n');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Cleanup failed:', error);
      process.exit(1);
    });
}

module.exports = { cleanupDatabase };
