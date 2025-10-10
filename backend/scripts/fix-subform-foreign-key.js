const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.POSTGRES_DB || 'qcollector_db',
  process.env.POSTGRES_USER || 'qcollector',
  process.env.POSTGRES_PASSWORD || 'qcollector_dev_2025',
  {
    host: process.env.POSTGRES_HOST || 'localhost',
    dialect: 'postgres',
    logging: console.log
  }
);

async function fixSubFormForeignKey() {
  try {
    const subFormTableName = 'call_records_333a357b0cb2';

    console.log(`\n=== Fixing Foreign Key Constraint ===`);
    console.log(`Table: ${subFormTableName}`);

    // Check current foreign key constraints
    const [constraints] = await sequelize.query(`
      SELECT
        tc.constraint_name,
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_name = '${subFormTableName}'
        AND kcu.column_name = 'parent_id';
    `);

    console.log('\n=== Current Foreign Key Constraints on parent_id ===');
    if (constraints.length > 0) {
      constraints.forEach(c => {
        console.log(`Constraint: ${c.constraint_name}`);
        console.log(`  Column: ${c.column_name}`);
        console.log(`  References: ${c.foreign_table_name}.${c.foreign_column_name}`);
      });

      // Drop the old foreign key
      const constraintName = constraints[0].constraint_name;
      console.log(`\nDropping old constraint: ${constraintName}`);
      await sequelize.query(`
        ALTER TABLE ${subFormTableName}
        DROP CONSTRAINT ${constraintName};
      `);
      console.log('✅ Old constraint dropped');
    } else {
      console.log('No existing foreign key constraint on parent_id');
    }

    // Add new foreign key pointing to submissions table
    console.log('\n=== Adding New Foreign Key ===');
    console.log(`parent_id should reference submissions.id`);

    await sequelize.query(`
      ALTER TABLE ${subFormTableName}
      ADD CONSTRAINT ${subFormTableName}_parent_id_fkey
      FOREIGN KEY (parent_id)
      REFERENCES submissions(id)
      ON DELETE CASCADE;
    `);

    console.log('✅ New foreign key constraint added');

    // Verify the new constraint
    const [newConstraints] = await sequelize.query(`
      SELECT
        tc.constraint_name,
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_name = '${subFormTableName}'
        AND kcu.column_name = 'parent_id';
    `);

    console.log('\n=== VERIFICATION: New Foreign Key Constraints ===');
    newConstraints.forEach(c => {
      console.log(`Constraint: ${c.constraint_name}`);
      console.log(`  Column: ${c.column_name}`);
      console.log(`  References: ${c.foreign_table_name}.${c.foreign_column_name}`);
    });

    await sequelize.close();
    console.log('\n✅ Done!');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

fixSubFormForeignKey();
