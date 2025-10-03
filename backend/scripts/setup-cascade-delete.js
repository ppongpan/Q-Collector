/**
 * Setup CASCADE DELETE Policies
 * Ensures data consistency across related tables
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

async function setupCascadeDelete() {
  console.log('\n=================================================');
  console.log('🔗 SETUP CASCADE DELETE POLICIES');
  console.log('=================================================\n');

  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established\n');

    // Check existing foreign keys
    const [existingFKs] = await sequelize.query(`
      SELECT
        tc.constraint_name,
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name,
        rc.delete_rule
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      JOIN information_schema.referential_constraints AS rc
        ON rc.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
      ORDER BY tc.table_name
    `);

    console.log('📋 EXISTING FOREIGN KEY CONSTRAINTS:\n');
    existingFKs.forEach((fk, i) => {
      const status = fk.delete_rule === 'CASCADE' ? '✅' : '⚠️ ';
      console.log(`${status} ${i + 1}. ${fk.table_name}.${fk.column_name} → ${fk.foreign_table_name}.${fk.foreign_column_name}`);
      console.log(`     Delete Rule: ${fk.delete_rule}`);
      console.log(`     Constraint: ${fk.constraint_name}\n`);
    });

    // Define required CASCADE relationships
    const requiredCascades = [
      {
        table: 'fields',
        column: 'form_id',
        references: 'forms',
        ref_column: 'id',
        description: 'When form is deleted, delete all its fields'
      },
      {
        table: 'fields',
        column: 'sub_form_id',
        references: 'sub_forms',
        ref_column: 'id',
        description: 'When sub-form is deleted, delete all its fields'
      },
      {
        table: 'sub_forms',
        column: 'form_id',
        references: 'forms',
        ref_column: 'id',
        description: 'When form is deleted, delete all its sub-forms'
      },
      {
        table: 'submissions',
        column: 'form_id',
        references: 'forms',
        ref_column: 'id',
        description: 'When form is deleted, delete all its submissions'
      },
      {
        table: 'submission_data',
        column: 'submission_id',
        references: 'submissions',
        ref_column: 'id',
        description: 'When submission is deleted, delete all its data'
      }
    ];

    console.log('🔧 SETTING UP CASCADE DELETE POLICIES:\n');

    for (const cascade of requiredCascades) {
      console.log(`  Setting up: ${cascade.table}.${cascade.column} → ${cascade.references}.${cascade.ref_column}`);
      console.log(`  Description: ${cascade.description}`);

      // Check if constraint exists
      const existingFK = existingFKs.find(fk =>
        fk.table_name === cascade.table &&
        fk.column_name === cascade.column &&
        fk.foreign_table_name === cascade.references
      );

      if (existingFK) {
        if (existingFK.delete_rule === 'CASCADE') {
          console.log(`  ✅ Already has CASCADE delete\n`);
          continue;
        }

        // Drop existing constraint
        console.log(`  🔄 Updating constraint: ${existingFK.constraint_name}`);
        await sequelize.query(`
          ALTER TABLE "${cascade.table}"
          DROP CONSTRAINT "${existingFK.constraint_name}"
        `);
        console.log(`  ✅ Dropped old constraint`);
      }

      // Create new constraint with CASCADE
      const constraintName = `fk_${cascade.table}_${cascade.column}`;
      try {
        await sequelize.query(`
          ALTER TABLE "${cascade.table}"
          ADD CONSTRAINT "${constraintName}"
          FOREIGN KEY ("${cascade.column}")
          REFERENCES "${cascade.references}"("${cascade.ref_column}")
          ON DELETE CASCADE
        `);
        console.log(`  ✅ Created CASCADE constraint: ${constraintName}\n`);
      } catch (err) {
        // Constraint might already exist with this name
        if (err.message.includes('already exists')) {
          console.log(`  ℹ️  Constraint ${constraintName} already exists\n`);
        } else {
          throw err;
        }
      }
    }

    // Verify final state
    const [finalFKs] = await sequelize.query(`
      SELECT
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        rc.delete_rule
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      JOIN information_schema.referential_constraints AS rc
        ON rc.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
        AND tc.table_name IN ('fields', 'sub_forms', 'submissions', 'submission_data')
      ORDER BY tc.table_name
    `);

    console.log('=================================================');
    console.log('📊 FINAL CASCADE DELETE STATUS:\n');

    const cascadeCount = finalFKs.filter(fk => fk.delete_rule === 'CASCADE').length;
    const totalCount = finalFKs.length;

    finalFKs.forEach((fk, i) => {
      const status = fk.delete_rule === 'CASCADE' ? '✅' : '⚠️ ';
      console.log(`${status} ${fk.table_name}.${fk.column_name} → ${fk.foreign_table_name} (${fk.delete_rule})`);
    });

    console.log(`\nCASCADE constraints: ${cascadeCount}/${totalCount}\n`);
    console.log('=================================================\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    throw error;
  } finally {
    await sequelize.close();
  }
}

if (require.main === module) {
  setupCascadeDelete()
    .then(() => {
      console.log('✅ CASCADE DELETE setup completed\n');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Setup failed:', error);
      process.exit(1);
    });
}

module.exports = { setupCascadeDelete };
