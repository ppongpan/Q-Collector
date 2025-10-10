/**
 * Check parent_id constraint in submissions table
 */

const { Sequelize } = require('sequelize');
const config = require('../config/database.config');

const env = process.env.NODE_ENV || 'development';
const dbConfig = config[env];

const sequelize = new Sequelize(
  dbConfig.database,
  dbConfig.username,
  dbConfig.password,
  dbConfig
);

async function checkConstraint() {
  try {
    console.log('🔍 Checking parent_id constraint...\n');

    // Query to get foreign key constraints
    const [constraints] = await sequelize.query(`
      SELECT
        con.conname AS constraint_name,
        con.confdeltype AS on_delete_action,
        CASE con.confdeltype
          WHEN 'a' THEN 'NO ACTION'
          WHEN 'r' THEN 'RESTRICT'
          WHEN 'c' THEN 'CASCADE'
          WHEN 'n' THEN 'SET NULL'
          WHEN 'd' THEN 'SET DEFAULT'
        END AS on_delete_readable
      FROM pg_constraint con
      JOIN pg_class rel ON rel.oid = con.conrelid
      WHERE rel.relname = 'submissions'
        AND con.contype = 'f'
        AND con.conname LIKE '%parent_id%';
    `);

    if (constraints.length === 0) {
      console.log('❌ No parent_id constraint found!');
    } else {
      console.log('✅ Found parent_id constraint:\n');
      constraints.forEach(c => {
        console.log(`Constraint: ${c.constraint_name}`);
        console.log(`On Delete: ${c.on_delete_readable} (${c.on_delete_action})\n`);

        if (c.on_delete_action === 'n') {
          console.log('✅ CORRECT: On Delete SET NULL');
          console.log('   → Deleting child will NOT delete parent');
        } else if (c.on_delete_action === 'c') {
          console.log('❌ WRONG: On Delete CASCADE');
          console.log('   → Deleting child WILL delete parent (incorrect!)');
          console.log('\n🔧 Run migration to fix:');
          console.log('   npx sequelize-cli db:migrate');
        }
      });
    }

    // Also check actual parent_id column
    const [columns] = await sequelize.query(`
      SELECT
        column_name,
        data_type,
        is_nullable
      FROM information_schema.columns
      WHERE table_name = 'submissions'
        AND column_name = 'parent_id';
    `);

    console.log('\n📊 parent_id column details:');
    console.table(columns);

    await sequelize.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
    await sequelize.close();
    process.exit(1);
  }
}

checkConstraint();
